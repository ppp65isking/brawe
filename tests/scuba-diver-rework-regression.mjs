// Scuba Diver rework regression (ordered 2026-10-29):
//  * Volley delay +30% longer (22.5ms -> 29.25ms) — small nerf.
//  * Bubble damage now min 490 / max 800 (was 520 close -> 320 far);
//    bot bubbles scaled proportionally (477 close / 291 far).
//  * Hypercharge bubble floor 90% (was 75%); non-hyper floor stays 0.52.
//  * Super dash leaves water on the ground for 4s; Scuba Diver swims in
//    it (+40% speed, Inkling-style); walking through it spreads 1s water.
//  * Hypercharged water heals him while submerged and holds a shield.
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
  throw new Error('unbalanced ' + name);
}

// ---------- source checks ----------
check('volley delay 29.25ms', game.includes('const volleyDelayMs = 29.25;'));
check('player bubble damage 800 close / 490 far', game.includes('const closeDamage = isBot ? 477 : 800;') && game.includes('const farDamage = isBot ? 291 : 490;'));
check('hyper bubble floor 0.90, non-hyper floor stays 0.52', game.includes('scubaMinClosePct: isHyper ? 0.90 : 0.52,'));
check('dash water radius 60 / life 4000', game.includes('const SCUBA_WATER_DASH_RADIUS = 60;') && game.includes('const SCUBA_WATER_DASH_LIFE_MS = 4000;'));
check('spread water radius 30 / life 1000', game.includes('const SCUBA_WATER_SPREAD_RADIUS = 30;') && game.includes('const SCUBA_WATER_SPREAD_LIFE_MS = 1000;'));
check('swim speed mult 1.4', game.includes('const SCUBA_WATER_SWIM_SPEED_MULT = 1.4;'));
check('hyper water heal 400/s / shield 1500', game.includes('const SCUBA_WATER_HYPER_HEAL_PER_SEC = 400;') && game.includes('const SCUBA_WATER_HYPER_SHIELD = 1500;'));
check('entity loop hooks water update', game.includes('updateScubaWaterForEntity(e, dt, performance.now());'));
check('player swim mult applied to movement', game.includes('scubaSwimMult') && game.includes('cappedPlayerSpeed * playerSlowMult * scubaSwimMult * dt'));
check('bot swim mult in getBotSteeredStep', (() => {
  const fn = extractFn(game, 'getBotSteeredStep');
  return fn.includes('isScubaDiverEntity(entity)') && fn.includes('speed *= SCUBA_WATER_SWIM_SPEED_MULT');
})());
check('water render fn defined and called', game.includes('function drawScubaWaterPatches(ctx)') && game.includes('drawScubaWaterPatches(ctx);'));
check('kit text: 800 -> 490 + 90% floor', game.includes('800 close -> 490 far each; Hyper keeps at least 90% close damage'));
check('kit text: dash water 4s + spread 1s', game.includes('leaves water on the ground for 4s') && game.includes('spreads 1s water'));
check('kit text: hyper water heals + shields', game.includes('standing in own water heals and holds a shield while submerged'));
check('no placeholder text in scuba kit', !/coming soon|TBD/i.test(game.slice(game.indexOf("'scuba_diver': { name: 'Scuba Diver'"), game.indexOf("'scuba_diver': { name: 'Scuba Diver'") + 1500)));

// ---------- behavioral checks via vm ----------
const healCalls = [];
const shieldCalls = [];
const sandbox = {
  console,
  performance: globalThis.performance,
  player: { id: 0, brawler: 'scuba_diver' },
  selectedBrawler: 'scuba_diver',
  isHypercharged: false,
  scubaWaterPatches: [],
  SCUBA_WATER_DASH_RADIUS: 60,
  SCUBA_WATER_DASH_LIFE_MS: 4000,
  SCUBA_WATER_SPREAD_RADIUS: 30,
  SCUBA_WATER_SPREAD_LIFE_MS: 1000,
  SCUBA_WATER_SWIM_SPEED_MULT: 1.4,
  SCUBA_WATER_HYPER_HEAL_PER_SEC: 400,
  SCUBA_WATER_HYPER_SHIELD: 1500,
  doHeal: (e, amt) => { healCalls.push(amt); e.hp = Math.min(99999, e.hp + amt); },
  grantShield: (e, amt) => { shieldCalls.push(amt); e.shield = (e.shield || 0) + amt; },
};
vm.createContext(sandbox);
for (const fn of ['isScubaDiverEntity', 'scubaWaterPatchAt', 'spawnScubaWaterPatch', 'pruneScubaWaterPatches', 'updateScubaWaterForEntity']) {
  vm.runInContext(extractFn(game, fn), sandbox);
}
const P = sandbox.scubaWaterPatches;

// spawn / at / expiry
sandbox.spawnScubaWaterPatch(100, 100, 60, 4000, 7, false, 1000);
check('patch found inside radius for owner', !!sandbox.scubaWaterPatchAt(P, 120, 100, 7, 1000));
check('patch not found outside radius', !sandbox.scubaWaterPatchAt(P, 200, 100, 7, 1000));
check('patch not found for other owner', !sandbox.scubaWaterPatchAt(P, 120, 100, 8, 1000));
check('patch expired at until', !sandbox.scubaWaterPatchAt(P, 120, 100, 7, 5000));
check('patch live just before until', !!sandbox.scubaWaterPatchAt(P, 120, 100, 7, 4999));

// prune
sandbox.spawnScubaWaterPatch(0, 0, 30, 1000, 7, false, 5500);
sandbox.pruneScubaWaterPatches(6000);
check('prune removes expired, keeps live', P.length === 1 && P[0].x === 0 && P[0].y === 0);
sandbox.pruneScubaWaterPatches(6499);
check('prune keeps unexpired', P.length === 1);
P.length = 0;

// dash trail: patch every >=40px while dashing
const dasher = { id: 1, brawler: 'scuba_diver', hp: 5000, scubaDiverDash: true, isDashing: true, x: 0, y: 0 };
sandbox.updateScubaWaterForEntity(dasher, 0.016, 10000);
check('dash start leaves a patch', P.length === 1 && P[0].r === 60);
dasher.x = 50;
sandbox.updateScubaWaterForEntity(dasher, 0.016, 10100);
check('dash leaves second patch after 40px', P.length === 2);
dasher.x = 60;
sandbox.updateScubaWaterForEntity(dasher, 0.016, 10200);
check('no patch before 40px from last', P.length === 2);
P.length = 0;

// spread: walking on own water leaves 1s patches every >=24px
sandbox.spawnScubaWaterPatch(0, 0, 60, 4000, 1, false, 10000);
const walker = { id: 1, brawler: 'scuba_diver', hp: 5000, isDashing: false, x: 0, y: 0 };
sandbox.updateScubaWaterForEntity(walker, 0.016, 10100);
check('swimming flag set on own water', walker.scubaSwimming === true);
check('first contact only anchors, no spread yet', P.length === 1);
walker.x = 30;
sandbox.updateScubaWaterForEntity(walker, 0.016, 10200);
check('spread patch spawned after 24px', P.length === 2 && P[1].r === 30);
P.length = 0;

// hyper water: heal + shield while submerged
const hyperBot = { id: 2, brawler: 'scuba_diver', hp: 5000, isHypercharged: true, isDashing: false, x: 0, y: 0, shield: 0 };
sandbox.spawnScubaWaterPatch(0, 0, 60, 4000, 2, true, 10000);
healCalls.length = 0; shieldCalls.length = 0;
sandbox.updateScubaWaterForEntity(hyperBot, 0.5, 10100);
check('hyper water heals 400/s', healCalls.length === 1 && healCalls[0] === 200);
check('hyper water tops shield to 1500', shieldCalls.length === 1 && shieldCalls[0] === 1500 && hyperBot.shield === 1500);
P.length = 0;

// non-scuba / dead entities do nothing
const other = { id: 3, brawler: 'mallow', hp: 5000, x: 0, y: 0 };
sandbox.updateScubaWaterForEntity(other, 0.5, 10100);
const dead = { id: 1, brawler: 'scuba_diver', hp: 0, scubaDiverDash: true, isDashing: true, x: 0, y: 0 };
sandbox.updateScubaWaterForEntity(dead, 0.5, 10100);
check('non-scuba and dead entities leave no water', P.length === 0);

if (failures.length) {
  console.error('FAILURES:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log(`scuba-diver-rework: ${passed} checks passed`);
