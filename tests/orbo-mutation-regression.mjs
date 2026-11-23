// Orbo Mutation — CANDY ORBIT (Anthony's spec 2026-11-23):
// Two effects in one mutation:
//  1) Alternating fast Super charge: Super #1 charges normally, Super #2
//     charges at 1.6x rate, Super #3 normal, Super #4 at 1.6x, and so on.
//     "60% faster" is read as a 1.6x rate (builder interpretation).
//  2) Automatic mini Cosmic Candy Cannons: when an enemy is near Orbo, one
//     mini fires automatically at EACH nearby enemy — same blisteringly fast
//     full-map bolt that pierces every enemy and wall, at 50% size and 50%
//     damage (1850 player / 1350 bot). Minis are based on the regular Super
//     only: Hyper does not change them, and mini hits do not grant the
//     Super-hit 20% recharge the real Super gets.
// Builder picks (flagged for Anthony, NOT his words): mutation name
// 'Candy Orbit', near radius 380, mini cooldown 3000ms (one global cooldown
// per owner between volleys), bot mini damage 1350 (50% of bot Super 2700).
// Static wiring checks + behavioral checks via vm (aegis pattern: extract
// the real functions, run them against stubbed globals).
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

// ---------- static: def ----------
const def = game.match(/orbo: \{\s*type: 'mutation',\s*name: 'Candy Orbit',[\s\S]*?\},/);
check('orbo mutation def exists (type mutation, name Candy Orbit)', !!def);
check('def icon CO, mutation color, piece name', !!def && /icon: 'CO'/.test(def[0]) && /color: '#ff4b55'/.test(def[0]) && /pieceName: 'Orbo Mutation Piece'/.test(def[0]));
check('def shortDesc carries both effects', !!def && /60% faster/.test(def[0]) && /mini Cosmic Candy Cannon/.test(def[0]));

// ---------- static: constants (builder picks) ----------
check('fast charge mult is 1.6', /const ORBO_MUTATION_FAST_CHARGE_MULT = 1\.6;/.test(game));
check('mini near radius is 380', /const ORBO_MUTATION_MINI_RADIUS = 380;/.test(game));
check('mini cooldown is 3000ms', /const ORBO_MUTATION_MINI_COOLDOWN_MS = 3000;/.test(game));
check('mini damage is 1850 player / 1350 bot', /const ORBO_MUTATION_MINI_DAMAGE = 1850;/.test(game) && /const ORBO_MUTATION_MINI_BOT_DAMAGE = 1350;/.test(game));

// ---------- static: helpers ----------
check('hasOrboMutation gate exists', /function hasOrboMutation\(entity\) \{ return isSpecialAbilityAvailableForEntity\(entity, 'orbo'\); \}/.test(game));
check('ensureOrboMutationState exists', /function ensureOrboMutationState\(entity\)/.test(game));
const fastCycle = extractFn(game, 'isOrboMutationFastChargeCycle');
check('fast cycle is parity-based (odd Super count)', /% 2 === 1/.test(fastCycle));
check('fast cycle requires the Orbo fighter', /fighterId !== 'orbo'/.test(fastCycle));
const recordSuper = extractFn(game, 'recordOrboMutationSuperUsed');
check('record increments the Super counter', /orboMutationSuperCount = Math\.max\(0, Math\.floor\(entity\.orboMutationSuperCount \|\| 0\)\) \+ 1/.test(recordSuper));

// ---------- static: effect 1 wiring ----------
const grantCharge = extractFn(game, 'grantMainAttackCharge');
check('damage charge applies the 1.6x mult on the fast cycle', /if \(isOrboMutationFastChargeCycle\(owner\)\) gain \*= ORBO_MUTATION_FAST_CHARGE_MULT;/.test(grantCharge));
const castSuper = extractFn(game, 'castOrboSuper');
check('Super casts count via the single Orbo Super entry (player + bot)', /recordOrboMutationSuperUsed\(owner\);/.test(castSuper));

// ---------- static: effect 2 wiring ----------
const spawnMini = extractFn(game, 'spawnOrboMutationMini');
check('mini spawn takes (owner, target) only — no Hyper input', /function spawnOrboMutationMini\(owner, target\) \{/.test(spawnMini));
check('mini damage is 1850 player / 1350 bot', /damage: owner\.id === player\.id \? ORBO_MUTATION_MINI_DAMAGE : ORBO_MUTATION_MINI_BOT_DAMAGE/.test(spawnMini));
check('mini hitbox is 6.3 (50% of the Super 12.6)', /hitboxMod: 6\.3,/.test(spawnMini));
check('mini is as fast as the Super (1480)', /const speed = 1480;/.test(spawnMini));
check('mini pierces enemies and walls', /pierce: true,\s*pierceWalls: true,/.test(spawnMini));
check('mini rides the Super render path (isOrboSuper + orboCandyRay)', /isOrboSuper: true,/.test(spawnMini) && /orboCandyRay: true,/.test(spawnMini));
check('mini is flagged orboMutationMini, never returns, never hyper-styled', /orboMutationMini: true,/.test(spawnMini) && /orboReturns: false,/.test(spawnMini) && /hyperVisual: false/.test(spawnMini));
check('mini travels full-map via the Super ray helper', /getRayDistanceToMapEdge\(owner\.x, owner\.y, angle, 28\)/.test(spawnMini) && /maxLife: \(edgeDistance \/ speed\)/.test(spawnMini));
const updateMini = extractFn(game, 'updateOrboMutation');
check('mini update gates on the per-owner cooldown', /if \(now < entity\.orboMutationMiniReadyAt\) continue;/.test(updateMini));
check('mini update only fires when an enemy is near', /if \(!near\.length\) continue;/.test(updateMini));
check('mini update fires one mini per nearby enemy', /for \(const target of near\) spawnOrboMutationMini\(entity, target\);/.test(updateMini));
check('mini update sets the cooldown after firing', /entity\.orboMutationMiniReadyAt = now \+ ORBO_MUTATION_MINI_COOLDOWN_MS;/.test(updateMini));
check('mini update skips allies', /areAlliedEntities\(entity, target\)/.test(updateMini));
check('mini update never reads Hyper state', !/hyper/i.test(updateMini));
check('main update loop calls updateOrboMutation after updateOrboStates', /updateOrboStates\(dt\);\s*\n\s*updateOrboMutation\(dt\);/.test(game));

// ---------- static: minis share the Super render + hit path, minus recharge ----------
check('minis render through the Super bolt at 50% size', /if\(b\.orboMutationMini\)ctx\.scale\(0\.5,0\.5\);/.test(game));
check('mini hits do NOT grant the Super-hit 20% recharge', /if \(b\.isOrboSuper && !b\.orboMutationMini && owner\) \{/.test(game));

// ---------- static: lifecycle + presentation ----------
check('match-start reset clears the Super counter and mini cooldown', /player\.orboMutationSuperCount = 0;\s*\n\s*player\.orboMutationMiniReadyAt = 0;/.test(game));
check('respawn reset clears the mini cooldown only (alternation survives death)', /entity\.orboMutationMiniReadyAt = 0;/.test(game));
check('mechanic HUD shows the charge cycle (1.6X vs 1X)', /MUTATION - 1\.6X CHARGE/.test(game) && /MUTATION - 1X CHARGE/.test(game));
check('aura ring shows while the fast cycle is live', /fighterId==='orbo'&&isSpecialAbilityAvailableForEntity\(entity,'orbo'\)&&isOrboMutationFastChargeCycle\(entity\)/.test(game));

// ---------- static: base kit untouched ----------
check('Orbo base Super still 3700 (2600 Hyper)', /damage:\s*owner\.id === player\.id \? \(hyper \? 2600 : 3700\)/.test(game));
check('Orbo main still 575', /damage:isBot\?412:575/.test(game));

// ---------- behavioral checks via vm ----------
let fakeNow = 100000;
let floatTexts = [];
const sandbox = {
  console,
  performance: { now: () => fakeNow },
  WORLD_W: 2000,
  WORLD_H: 2000,
  bullets: [],
  player: null,
  bots: [],
  selectedBrawler: 'orbo',
  isSpecialAbilityAvailableForEntity: (entity, fighterId) => !!entity && entity._mutationOwned === true && fighterId === 'orbo',
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text) => { floatTexts.push(text); },
};
// Pull the real tuning consts out of game.js so behavior is tested against the shipped values.
const constBlock = game.match(/const ORBO_MUTATION_FAST_CHARGE_MULT = 1\.6;[\s\S]*?const ORBO_MUTATION_MINI_BOT_DAMAGE = 1350;[^\n]*/);
assert.ok(constBlock, 'Orbo mutation const block missing');
vm.createContext(sandbox);
vm.runInContext(constBlock[0], sandbox);
for (const fn of ['hasOrboMutation', 'ensureOrboMutationState', 'isOrboMutationFastChargeCycle', 'recordOrboMutationSuperUsed', 'getRayDistanceToMapEdge', 'spawnOrboMutationMini', 'updateOrboMutation']) {
  vm.runInContext(extractFn(game, fn), sandbox);
}
function vmBool(code) {
  vm.runInContext('this.__r = (' + code + ');', sandbox);
  return sandbox.__r;
}
function vmCall(code) { vm.runInContext(code, sandbox); }

function makeOrbo(id, x, y, team = 'player') {
  return { id, team, brawler: 'orbo', _mutationOwned: true, hp: 5000, maxHp: 5000, x, y, radius: 24 };
}

// --- Effect 1: alternation, behaviorally ---
{
  const orbo = makeOrbo(1, 1000, 1000);
  sandbox.player = orbo; sandbox.bots = []; sandbox.selectedBrawler = 'orbo';
  sandbox.ent = orbo;
  check('Super #1 charges normally (count 0, not fast)', vmBool('isOrboMutationFastChargeCycle(this.ent)') === false);
  vmCall('recordOrboMutationSuperUsed(this.ent);');
  check('after Super #1, count is 1 and the #2 cycle is fast', orbo.orboMutationSuperCount === 1 && vmBool('isOrboMutationFastChargeCycle(this.ent)') === true);
  vmCall('recordOrboMutationSuperUsed(this.ent);');
  check('after Super #2, count is 2 and the #3 cycle is normal', orbo.orboMutationSuperCount === 2 && vmBool('isOrboMutationFastChargeCycle(this.ent)') === false);
  vmCall('recordOrboMutationSuperUsed(this.ent);');
  check('after Super #3, count is 3 and the #4 cycle is fast', orbo.orboMutationSuperCount === 3 && vmBool('isOrboMutationFastChargeCycle(this.ent)') === true);
  vmCall('recordOrboMutationSuperUsed(this.ent);');
  check('after Super #4, count is 4 and the #5 cycle is normal', orbo.orboMutationSuperCount === 4 && vmBool('isOrboMutationFastChargeCycle(this.ent)') === false);
  // Guards: no mutation, wrong brawler.
  const plain = makeOrbo(2, 1000, 1000); plain._mutationOwned = false;
  sandbox.ent2 = plain;
  vmCall('recordOrboMutationSuperUsed(this.ent2);');
  check('no record without the mutation owned', (plain.orboMutationSuperCount || 0) === 0 && vmBool('isOrboMutationFastChargeCycle(this.ent2)') === false);
  const homer = { id: 3, team: 'player', brawler: 'homer', _mutationOwned: true, hp: 5000, x: 1000, y: 1000, radius: 24 };
  sandbox.ent3 = homer; sandbox.selectedBrawler = 'homer';
  vmCall('recordOrboMutationSuperUsed(this.ent3);');
  check('no record for a non-Orbo fighter', (homer.orboMutationSuperCount || 0) === 0 && vmBool('isOrboMutationFastChargeCycle(this.ent3)') === false);
  sandbox.selectedBrawler = 'orbo';
}

// --- Effect 2: minis, behaviorally ---
{
  const orbo = makeOrbo(1, 1000, 1000);
  const east = { id: 2, team: 'enemy', hp: 5000, x: 1200, y: 1000, radius: 24 };
  const south = { id: 3, team: 'enemy', hp: 5000, x: 1000, y: 1250, radius: 24 };
  const far = { id: 4, team: 'enemy', hp: 5000, x: 1600, y: 1000, radius: 24 };
  const ally = { id: 5, team: 'player', hp: 5000, x: 1100, y: 1100, radius: 24 };
  sandbox.player = orbo;
  sandbox.bots = [east, south, far, ally];
  sandbox.bullets.length = 0; floatTexts = []; fakeNow = 200000;
  vmCall('updateOrboMutation(0.016);');
  check('one mini per nearby enemy (2 near, 1 far, 1 ally -> 2 minis)', sandbox.bullets.length === 2);
  const [b1, b2] = sandbox.bullets;
  check('minis deal 1850 (50% of 3700)', b1.damage === 1850 && b2.damage === 1850);
  check('minis are 50% size (hitboxMod 6.3 vs Super 12.6)', b1.hitboxMod === 6.3 && b2.hitboxMod === 6.3);
  check('minis pierce enemies and walls', b1.pierce === true && b1.pierceWalls === true);
  check('minis ride the Super flags (isOrboSuper, orboCandyRay, orboMutationMini)', b1.isOrboSuper === true && b1.orboCandyRay === true && b1.orboMutationMini === true);
  check('minis are Super-sourced, never returning, never hyper-styled', b1.super === true && b1.orboReturns === false && b1.hyperVisual === false);
  check('minis fly at Super speed (1480)', Math.abs(Math.hypot(b1.vx, b1.vy) - 1480) < 0.01 && Math.abs(Math.hypot(b2.vx, b2.vy) - 1480) < 0.01);
  check('minis aim at their own enemy (east + south)', b1.vx > 1400 && Math.abs(b1.vy) < 1 && b2.vy > 1400 && Math.abs(b2.vx) < 1);
  check('minis travel full-map (maxLife = edge distance / speed)', Math.abs(b1.maxLife - (2000 - 28 - 1000) / 1480) < 0.001);
  check('player sees a CANDY ORBIT callout on the volley', floatTexts.some((t) => /CANDY ORBIT/.test(t)));
  // Cooldown: per-frame spam is impossible.
  vmCall('updateOrboMutation(0.016);');
  check('cooldown blocks a second volley on the next frame', sandbox.bullets.length === 2);
  fakeNow += 2999;
  vmCall('updateOrboMutation(0.016);');
  check('still cooling down at 2999ms', sandbox.bullets.length === 2);
  fakeNow += 1;
  vmCall('updateOrboMutation(0.016);');
  check('volley fires again at 3000ms', sandbox.bullets.length === 4);
  // No enemy near: nothing fires and the cooldown is not consumed.
  sandbox.bots = [far, ally];
  orbo.orboMutationMiniReadyAt = 0;
  sandbox.bullets.length = 0; fakeNow += 10000;
  vmCall('updateOrboMutation(0.016);');
  check('no minis when no enemy is near', sandbox.bullets.length === 0);
  check('cooldown is not consumed when nothing fires', orbo.orboMutationMiniReadyAt === 0);
  // Allies alone never trigger minis.
  sandbox.bots = [ally];
  vmCall('updateOrboMutation(0.016);');
  check('allies alone never trigger minis', sandbox.bullets.length === 0);
  // Dead owner / dead enemy.
  orbo.hp = 0;
  sandbox.bots = [east];
  vmCall('updateOrboMutation(0.016);');
  check('dead Orbo fires nothing', sandbox.bullets.length === 0);
  orbo.hp = 5000; east.hp = 0;
  vmCall('updateOrboMutation(0.016);');
  check('dead enemies do not trigger minis', sandbox.bullets.length === 0);
  east.hp = 5000;
  // Bot owner: 1350 damage (50% of the bot Super's 2700).
  const botOrbo = makeOrbo(9, 500, 500, 'enemy');
  const botFoe = { id: 10, team: 'player', hp: 5000, x: 650, y: 500, radius: 24 };
  sandbox.player = { id: 1, team: 'player', brawler: 'outlit', _mutationOwned: false, hp: 5000, x: 100, y: 100, radius: 24 };
  sandbox.selectedBrawler = 'outlit';
  sandbox.bots = [botOrbo, botFoe];
  sandbox.bullets.length = 0; fakeNow += 10000;
  vmCall('updateOrboMutation(0.016);');
  check('bot Orbo fires exactly one mini at the nearby player', sandbox.bullets.length === 1);
  check('bot mini deals 1350 (50% of 2700)', sandbox.bullets.length === 1 && sandbox.bullets[0].damage === 1350);
}

console.log(`orbo-mutation-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
process.exit(0);
