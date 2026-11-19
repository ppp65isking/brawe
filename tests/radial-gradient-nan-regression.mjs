// Radial-gradient NaN crash — regression test (2026-11-19).
// Anthony's crash: TypeError: Failed to execute 'createRadialGradient' on
// 'CanvasRenderingContext2D': The provided double value is non-finite.
// It happened in a match while playing Outlit. Outlit's own kit is
// gradient-free, so the throw came from a generic/bot visual. Audit found
// no single provably-NaN push site; the four unguarded explosion-loop
// branches (rankedRocketeerBurst, jackTradeHealing, fastpassLane,
// emperor-overlord core) pass ex.radius / clamp() progress raw, and clamp()
// passes NaN straight through. Fix: (1) a radial twin of the existing
// linear-gradient guard on the main ctx, (2) a loop-top repair of corrupt
// explosion entries, (3) a zombie splice in the explosion update loop.
// This test drives the REAL guard + repair code extracted from game.js
// with the exact bad inputs, against a strict browser-like canvas stub
// that throws on any non-finite gradient argument.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const THIS_FILE = fs.readFileSync(new URL(import.meta.url), 'utf8');

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  PASS ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// --- Strict browser-like createRadialGradient ----------------------------
// A real browser throws TypeError on any non-finite double and throws on a
// negative radius. The stub records the args it was actually given.
function makeStrictCtx() {
  const received = [];
  const ctx = {
    calls: received,
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      for (const v of [x0, y0, r0, x1, y1, r1]) {
        if (!Number.isFinite(Number(v))) {
          throw new TypeError("Failed to execute 'createRadialGradient' on 'CanvasRenderingContext2D': The provided double value is non-finite");
        }
      }
      if (r0 < 0 || r1 < 0) throw new Error('NotSupportedError: negative radius');
      received.push([x0, y0, r0, x1, y1, r1]);
      return { addColorStop() {} };
    },
  };
  return ctx;
}

// --- Extract the REAL radial guard from game.js --------------------------
const guardStart = SRC.indexOf('const nativeCreateRadialGradient');
const guardEnd = SRC.indexOf('\n  };', guardStart) + '\n  };'.length;
const guardCode = SRC.slice(guardStart, guardEnd);
check('radial guard block extracts from game.js', guardCode.includes('safeCreateRadialGradient') && guardCode.includes('[GradientGuard] Repaired non-finite radial-gradient arguments.'));
check('linear guard still present (no regression to it)', SRC.includes('safeCreateLinearGradient'));

function patchedCtx() {
  const warnings = [];
  const ctx = makeStrictCtx();
  const sandbox = { ctx, console: { warn: (...a) => warnings.push(a), log: () => {}, error: () => {} } };
  vm.createContext(sandbox);
  new vm.Script(guardCode).runInContext(sandbox);
  return { ctx, warnings };
}

// --- 1. Repro: without the guard, the exact bad input throws -------------
{
  const ctx = makeStrictCtx();
  let threw = null;
  try { ctx.createRadialGradient(0, 0, 0, 0, 0, NaN); } catch (e) { threw = e; }
  check('repro: strict canvas throws TypeError on NaN radius', threw instanceof TypeError && /non-finite/.test(threw.message));
}

// --- 2. Guard: poisoned inputs render, native gets finite args ----------
const poisoned = [
  ['NaN radius (rankedRocketeerBurst shape)', [0, 0, 0, 0, 0, NaN], true],
  ['NaN x coordinate', [NaN, 100, 0, 100, 100, 42], true],
  ['undefined radius', [0, 0, 0, 0, 0, undefined], true],
  ['Infinity radius', [0, 0, 0, 0, 0, Infinity], true],
  ['NaN in every slot', [NaN, NaN, NaN, NaN, NaN, NaN], true],
  // Negative radii are finite, so the guard repairs them silently (no warn):
  ['negative radii', [10, 10, -5, 10, 10, -3], false],
];
for (const [label, args, expectWarn] of poisoned) {
  const { ctx, warnings } = patchedCtx();
  let threw = null;
  let grad = null;
  try { grad = ctx.createRadialGradient(...args); } catch (e) { threw = e; }
  const got = ctx.calls[0];
  check(`guard: no throw on ${label}`, threw === null, threw ? String(threw) : '');
  check(`guard: returns a gradient on ${label}`, grad !== null && typeof grad.addColorStop === 'function');
  check(`guard: native receives finite args on ${label}`, !!got && got.every((v) => Number.isFinite(v)), got ? JSON.stringify(got) : 'no call recorded');
  check(`guard: radii repaired to r0>=0, r1>=1 on ${label}`, !!got && got[2] >= 0 && got[5] >= 1, got ? JSON.stringify(got) : 'no call recorded');
  check(`guard: ${expectWarn ? 'warns once' : 'warns nothing'} on ${label}`, expectWarn
    ? (warnings.length === 1 && String(warnings[0][0]).includes('[GradientGuard]') && String(warnings[0][0]).includes('radial'))
    : warnings.length === 0, `warnings=${warnings.length}`);
}

// --- 3. Warn-once across repeated bad calls ------------------------------
{
  const { ctx, warnings } = patchedCtx();
  ctx.createRadialGradient(0, 0, 0, 0, 0, NaN);
  ctx.createRadialGradient(NaN, 0, 0, 0, 0, 10);
  ctx.createRadialGradient(0, 0, 0, 0, 0, Infinity);
  check('guard: warns exactly once across repeated bad calls', warnings.length === 1, `got ${warnings.length}`);
}

// --- 4. Passthrough: healthy calls are untouched, no warning -------------
{
  const { ctx, warnings } = patchedCtx();
  const grad = ctx.createRadialGradient(5, 6, 0, 5, 6, 42);
  check('guard: healthy call passes args through unchanged', JSON.stringify(ctx.calls[0]) === JSON.stringify([5, 6, 0, 5, 6, 42]), JSON.stringify(ctx.calls[0]));
  check('guard: healthy call warns nothing', warnings.length === 0);
  check('guard: healthy call returns gradient', grad !== null && typeof grad.addColorStop === 'function');
}

// --- 5. Explosion loop-top repair: real code, poisoned entries -----------
const repairStart = SRC.indexOf('// Gradient-crash repair (2026-11-19): a corrupt explosion entry');
const repairEndMarker = 'if (!Number.isFinite(Number(ex.life))) ex.life = ex.maxLife;';
const repairEnd = SRC.indexOf(repairEndMarker, repairStart) + repairEndMarker.length;
const repairCode = SRC.slice(repairStart, repairEnd);
check('loop-top repair block extracts from game.js', repairCode.includes('ex.radius = 18') && repairCode.includes('ex.maxLife = 0.2'));

function runRepair(entry) {
  const sandbox = { ex: entry };
  vm.createContext(sandbox);
  new vm.Script(repairCode).runInContext(sandbox);
  return sandbox.ex;
}
// Expected outcomes: only a non-finite life is forced to maxLife (alpha 0,
// expires next tick). A finite life is left alone so the entry plays out
// normally with its repaired radius/maxLife.
const repairedCases = [
  ['NaN radius', { x: 100, y: 100, radius: NaN, life: 0, maxLife: 0.2 }, { radius: 18, life: 0, maxLife: 0.2 }],
  ['undefined radius/life/maxLife', { x: 100, y: 100, radius: undefined, life: undefined, maxLife: undefined }, { radius: 18, life: 0.2, maxLife: 0.2 }],
  ['NaN life', { x: 100, y: 100, radius: 60, life: NaN, maxLife: 0.2 }, { radius: 60, life: 0.2, maxLife: 0.2 }],
  ['NaN maxLife', { x: 100, y: 100, radius: 60, life: 0, maxLife: NaN }, { radius: 60, life: 0, maxLife: 0.2 }],
  ['NaN radius + NaN life + NaN maxLife', { x: 100, y: 100, radius: NaN, life: NaN, maxLife: NaN }, { radius: 18, life: 0.2, maxLife: 0.2 }],
];
for (const [label, entry, expected] of repairedCases) {
  const out = runRepair({ ...entry });
  const finite = Number.isFinite(out.radius) && Number.isFinite(out.life) && Number.isFinite(out.maxLife);
  check(`repair: ${label} -> all finite`, finite, JSON.stringify(out));
  check(`repair: ${label} -> exact expected state`, out.radius === expected.radius && out.life === expected.life && out.maxLife === expected.maxLife, `got ${JSON.stringify(out)} want ${JSON.stringify(expected)}`);
}
{
  const healthy = runRepair({ x: 100, y: 100, radius: 60, life: 0, maxLife: 0.2 });
  check('repair: healthy entry untouched', healthy.radius === 60 && healthy.life === 0 && healthy.maxLife === 0.2, JSON.stringify(healthy));
}

// --- 6. Source pins -------------------------------------------------------
check('pin: update-loop zombie splice exists', SRC.includes("if (!Number.isFinite(Number(explosions[i].life)) || !Number.isFinite(Number(explosions[i].maxLife))) { explosions.splice(i, 1); continue; }"));
check('pin: rankedRocketeerBurst branch still draws from ex.radius (guard + repair cover it, no branch rewrite)', SRC.includes('ex.radius * 0.45 * (1 - progress)'));
check('pin: jackTradeHealing branch still draws from ex.radius', SRC.includes('ex.radius*(.25+.75*open)'));
check('pin: fastpassLane branch still draws from ex.radius', SRC.includes('ex.radius*.58'));
check('pin: emperor-overlord core branch still draws from ex.radius', SRC.includes('ex.radius * 0.32'));
// The bare forbidden word must never appear in game.js or any test file,
// so it is built by concatenation here and never written out literally.
const FORBIDDEN_WORD = 'clust' + 'er';
const forbiddenRe = new RegExp('\\b' + FORBIDDEN_WORD + '\\b', 'i');
check('pin: forbidden word absent from game.js', !forbiddenRe.test(SRC));
check('pin: forbidden word absent from this test file', !forbiddenRe.test(THIS_FILE));

console.log(`\nradial-gradient-nan: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
