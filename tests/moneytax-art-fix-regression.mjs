// Money & Tax art-fix regression — Anthony's order 2026-10-26 ("Fix it").
// PR #47 playtest verdict: ALL Money & Tax skins still read as dots.
// Cause 1 (code path): renderUniversalSkinProjectile() ran BEFORE the
// detailed coin branches and returned true for any skin with an
// attackEffect/superEffect, drawing a generic glowing dot and skipping
// the detailed art. Cause 2 (legibility): the detailed coin is real but
// fine-grained at ~7.4px radius, so in motion on a phone it reads as a
// dot — worst for tombstone, whose bone skull sat on a near-matching
// pale-mint disc. Helpers are EXECUTED in a vm with a recording stub
// canvas, same pattern as moneytax-skins-rework-regression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source pins
check('universal skips money_and_tax special bullets',
  game.includes("if (b.ownerBrawler === 'money_and_tax' && (b.isCoin || b.isBoomerang || b.isTaxNote || b.isStickySuper)) return false;"));
check('universal exclusion sits before the generic dot draw',
  game.indexOf("if (b.ownerBrawler === 'money_and_tax' && (b.isCoin || b.isBoomerang || b.isTaxNote || b.isStickySuper)) return false;") <
  game.indexOf("// Core", game.indexOf('function renderUniversalSkinProjectile')));
check('coin rim is bolder', game.includes('ctx.lineWidth = Math.max(2, r * 0.26);'));
check('small-coin medallion exists', game.includes('if (r < 10) {') && game.includes('ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);'));
check('medallion uses accent, tombstone uses dark backing',
  game.includes("ctx.fillStyle = skinKey === 'tombstone' ? pal.discDark : pal.accent;"));
check('$ emblem is bolder', game.includes("ctx.font = 'bold ' + Math.max(8, r * 1.0) + 'px sans-serif';"));
check('star sparkles are filled dots', game.includes('const starR = Math.max(1.1, r * 0.08);'));
check('tombstone skull face bigger', game.includes('ctx.arc(0, -r * 0.05, r * 0.50, 0, Math.PI * 2);'));
check('tombstone sockets bigger', game.includes('r * 0.17, 0, Math.PI * 2);') && game.includes('ctx.arc(-r * 0.19, -r * 0.15, r * 0.17, 0, Math.PI * 2);'));
check('tombstone pupils have a 1px floor', game.includes('Math.max(1, r * 0.09), 0, Math.PI * 2);'));
// Combat/size/spread untouched.
check('regular coin size const still 1.12', /const MONEY_TAX_REGULAR_COIN_SIZE_MULT = 1\.12;/.test(game));
check('regular spread const still 1.12', /const MONEY_TAX_REGULAR_SPREAD_MULT = 1\.12;/.test(game));
check('base spread untouched (0.105)', game.includes('const MONEY_TAX_BASE_SPREAD = 0.105;'));
check('tax spread untouched (0.056)', game.includes('const MONEY_TAX_TAX_SPREAD = 0.056;'));
check('coin base radius untouched (6.6)', game.includes('let r = boom ? 16 : (b.moneyEmpoweredCenter ? 14 : 6.6);'));
check('detailed branches still wired', game.includes("if (activeSkinId === 'gold-silver-moneytax' && b.ownerBrawler === 'money_and_tax' && !b.hyperVisual)") &&
  game.includes("if (b.ownerBrawler === 'money_and_tax' && (b.isCoin || b.isBoomerang || b.isTaxNote || b.isStickySuper))"));

// ---------------------------------------------------------- 2. vm execution
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

function stubCtx() {
  const calls = [];
  const sets = [];
  return {
    calls, sets,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const near = (a, b) => Math.abs(a - b) < 0.01;
const hasFill = (sets, color) => sets.some((s) => s.p === 'fillStyle' && String(s.v).includes(color));
const hasArcR = (calls, r) => calls.some((c) => c.m === 'arc' && near(c.args[2], r));
const maxArcR = (calls) => Math.max(-1, ...calls.filter((c) => c.m === 'arc').map((c) => c.args[2]));

const sandbox = { performance: { now: () => 100000 }, Math, player: { id: 0 }, selectedBrawler: 'money_and_tax' };
vm.createContext(sandbox);
vm.runInContext(
  'const MONEY_TAX_REGULAR_COIN_SIZE_MULT = 1.12;\nconst MONEY_TAX_REGULAR_SPREAD_MULT = 1.12;\n' +
  extractFn(game, 'moneyTaxArtPalette') + '\n' +
  extractFn(game, 'drawDetailedMoneyTaxCoin') + '\n' +
  extractFn(game, 'renderUniversalSkinProjectile') + '\n' +
  'this.__fns = { moneyTaxArtPalette, drawDetailedMoneyTaxCoin, renderUniversalSkinProjectile };',
  sandbox,
);
const fns = sandbox.__fns;

const goldsilverSkin = {
  brawler: 'money_and_tax',
  attackEffect: { type: 'goldSilverCoin', color: '#f1c40f', glow: true },
  superEffect: { type: 'goldSilverSuper', color: '#bdc3c7', glow: true },
};
const mnt = (extra) => ({ x: 100, y: 100, vx: 100, vy: 0, ownerBrawler: 'money_and_tax', radius: 6.6, hitboxMod: 1, ...extra });

// Universal renderer: Money & Tax specials must NEVER be swallowed.
// (NEGATIVE CONTROL: on pre-fix code the first four return true.)
for (const [label, b] of [
  ['coin', mnt({ isCoin: true })],
  ['boomerang', mnt({ isBoomerang: true, super: true })],
  ['tax note', mnt({ isTaxNote: true })],
  ['sticky super', mnt({ isStickySuper: true, super: true })],
]) {
  const s = stubCtx();
  sandbox.ctx = s.proxy;
  const out = fns.renderUniversalSkinProjectile(b, goldsilverSkin);
  check(`universal returns false for gold-silver money ${label} (was: dot)`, out === false && s.calls.length === 0);
}
{
  // Control: the universal renderer still works for other brawlers.
  const s = stubCtx();
  sandbox.ctx = s.proxy;
  const otherSkin = { brawler: 'outlit', attackEffect: { color: '#00d2d3' } };
  const out = fns.renderUniversalSkinProjectile({ x: 1, y: 1, vx: 1, vy: 0, ownerBrawler: 'outlit', radius: 6 }, otherSkin);
  check('universal still draws generic dots for other brawlers', out === true && s.calls.some((c) => c.m === 'arc'));
  // Control: no skin at all still returns false (default path untouched).
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  check('universal still returns false with no skin', fns.renderUniversalSkinProjectile(mnt({ isCoin: true }), null) === false);
}

// Legibility, executed: small regular coin.
{
  const s = stubCtx();
  fns.drawDetailedMoneyTaxCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, 'regular', false);
  const r = 6.6 * 1.12;
  check('regular small coin keeps disc radius 7.392 (no size change)', near(maxArcR(s.calls), r));
  check('regular small coin has contrast medallion at 0.58r', hasArcR(s.calls, 0.58 * r) && hasFill(s.sets, '#fff3c4'));
  check('regular small coin $ emblem is 8px bold', s.sets.some((x) => x.p === 'font' && String(x.v).includes('8px')));
  check('regular small coin rim hits width 2', s.sets.some((x) => x.p === 'lineWidth' && x.v === 2));
  check('regular small coin has filled star dots at 1.1px', hasArcR(s.calls, 1.1));
}
// Legibility, executed: small tombstone coin.
{
  const s = stubCtx();
  fns.drawDetailedMoneyTaxCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, 'tombstone', false);
  check('tombstone small coin medallion is dark purple backing', hasFill(s.sets, '#5b2a86'));
  check('tombstone small coin skull face is 0.50r (was 0.42r)', hasArcR(s.calls, 0.50 * 7));
  check('tombstone small coin pupils have 1px floor (was 0.35px)', hasArcR(s.calls, 1));
  check('tombstone small coin keeps bone skull', hasFill(s.sets, '#f5ecd7'));
}
// Legibility, executed: small gold-silver coin + boomerang unchanged by medallion.
{
  const s = stubCtx();
  fns.drawDetailedMoneyTaxCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, 'goldsilver', false);
  check('goldsilver small coin has white contrast medallion', hasArcR(s.calls, 0.58 * 7) && hasFill(s.sets, '#ffffff'));
  const b = stubCtx();
  fns.drawDetailedMoneyTaxCoin(b.proxy, { x: 100, y: 100, vx: 100, vy: 0, isBoomerang: true }, 'regular', false);
  check('regular boomerang keeps radius 16 and gets no small-coin medallion', near(maxArcR(b.calls), 16) && !hasFill(b.sets, '#fff3c4'));
}
// Pure draw code: no combat writes in the touched helpers. (The universal
// renderer legitimately declares a local `const speed`, so the speed clause
// of the generic pin does not apply to it — damage/hp writes are the check.)
for (const [name, src] of [['renderUniversalSkinProjectile', extractFn(game, 'renderUniversalSkinProjectile')], ['drawDetailedMoneyTaxCoin', extractFn(game, 'drawDetailedMoneyTaxCoin')]]) {
  check(name + ' is pure draw code', !/\.damage\s*=|\.hp\s*=/.test(src));
}

console.log(`moneytax-art-fix-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
