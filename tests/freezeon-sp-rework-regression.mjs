// FreeZeon SP rework regression — ordered 2026-11-18 (Anthony, in class).
// SP1 Supercool REWORKED: the active Ice Rink patch shoots snowballs —
// 300 damage + 12 freeze each, one per 0.8s, at the nearest enemy within
// patch radius + 150px. Normal projectiles (dodgeable, blocked by walls).
// Old SP1 (rink-frozen enemies stay frozen 0.5s longer) is gone entirely.
// SP2 Hypothermia REWORKED: main-attack slip zones build freeze — +8 per
// second standing in a zone, capped at +8 total per enemy per zone. Zones
// alone can never freeze anyone (8 < 100). Old SP2 (enemies in the rink
// deal 25% less damage) is gone entirely.
// Main tuning in the same PR: cone spread 0.07 -> 0.045 rad (a little
// narrower); cone freeze build 25 -> 15 per hit (-40%: 4 hits to freeze
// becomes ~7 hits).
// Builder picks (flagged): snowball 1/0.8s, range patch radius + 150px,
// speed 650 px/s; zone rate +8/s capped at +8 per zone; spread 0.045 rad.
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
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('SP1 constants: snowball 300 dmg / +12 freeze / 800ms / 650 px/s / +150px range', game.includes('const FREEZEON_SP1_SNOWBALL_DMG = 300;') && game.includes('const FREEZEON_SP1_SNOWBALL_FREEZE = 12;') && game.includes('const FREEZEON_SP1_SNOWBALL_INTERVAL_MS = 800;') && game.includes('const FREEZEON_SP1_SNOWBALL_SPEED = 650;') && game.includes('const FREEZEON_SP1_SNOWBALL_RANGE_BONUS = 150;'));
check('SP2 constants: +8/s in zones, capped at +8 per enemy per zone', game.includes('const FREEZEON_SP2_ZONE_FREEZE_PER_S = 8;') && game.includes('const FREEZEON_SP2_ZONE_FREEZE_CAP = 8;'));
check('main tuning: spread 0.045 rad, cone freeze build 15 (-40%)', game.includes('const FREEZEON_CONE_SPREAD_RAD = 0.045;') && game.includes('const FREEZEON_CONE_FREEZE_BUILD = 15;'));
check('old SP1 (1.5s freeze) is gone: no duration const, no duration helper', !game.includes('FREEZEON_SP1_FREEZE_DURATION_MS') && !game.includes('freezeonFreezeDurationMs'));
check('old SP2 (Hypothermia damage mark) is gone entirely', !game.includes('freezeonHypothermiaUntil'));
check('card text: new SP1/SP2 descriptions', game.includes("sp1: 'Supercool (Your Ice Rink shoots snowballs at enemies: 300 damage + 12 freeze each)'") && game.includes("sp2: 'Hypothermia (Enemies standing in your slip zones build up to 8 freeze each)'"));
check('SP1: patch carries a snowball timer', game.includes('nextSnowballAt: 0, ownerId: thrown.ownerId'));
check('SP1: patch loop fires snowballs on the 0.8s cadence', game.includes("if (freezeonHasSP1(owner) && now >= (p.nextSnowballAt || 0)) {") && game.includes('p.nextSnowballAt = now + FREEZEON_SP1_SNOWBALL_INTERVAL_MS;') && game.includes('freezeonFirePatchSnowball(owner, p);'));
check('SP1: snowball bullet is a normal non-piercing projectile', game.includes("isFreezeonSp1Snowball: true") && game.includes('damage: FREEZEON_SP1_SNOWBALL_DMG, pierce: false'));
check('SP1: snowball hit builds +12 freeze (checkHit hook)', game.includes("if (b && b.ownerBrawler === 'freezeon' && b.isFreezeonSp1Snowball && target && target.hp > 0) {") && game.includes('freezeonApplyFreezeBuild(freezeonOwner, target, FREEZEON_SP1_SNOWBALL_FREEZE);'));
check('SP1: snowball has its own render branch + draw function', game.includes("if (b.isFreezeonSp1Snowball) {") && game.includes('drawFreezeonSnowball(ctx, b);') && game.includes('function drawFreezeonSnowball(ctx, b) {'));
check('SP2: zone loop iterates slip zones only (never patches)', (() => {
  const start = game.indexOf('// SP2 Hypothermia rework: enemies standing in a MAIN-attack slip');
  const end = game.indexOf('// Render FreeZeon effects:');
  const body = game.slice(start, end);
  return start !== -1 && body.includes('for (const z of freezeonSlipZones) {') && body.includes('z.freezeBuilt = z.freezeBuilt || {};') && body.includes('if (built >= FREEZEON_SP2_ZONE_FREEZE_CAP) continue;') && !body.includes('freezeonPatches');
})());

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
        if (prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}

let nowMs = 100000;
const floatingTexts = [];
const checkHitCalls = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let playerEnt = null;
let botEnts = [];
function mkEntity(id, opts = {}) {
  const e = {
    id, x: opts.x ?? 0, y: opts.y ?? 0, hp: opts.hp ?? 5000, maxHp: opts.maxHp ?? 5000,
    radius: opts.radius ?? 14, team: opts.team ?? 'enemy', brawler: opts.brawler ?? 'outlit',
    level: opts.level ?? 11, selectedStar: opts.selectedStar ?? 'none',
    isDummy: !!opts.isDummy, isPet: !!opts.isPet, isStructure: !!opts.isStructure,
    isHypercharged: !!opts.isHypercharged, vx: opts.vx ?? 0, vy: opts.vy ?? 0,
  };
  entitiesById.set(id, e);
  return e;
}
function resetWorld() {
  entitiesById.clear();
  bullets = [];
  explosions = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  nowMs = 100000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'freezeon', x: 0, y: 0 });
  botEnts = [];
  sandbox.player = playerEnt;
  sandbox.bots = botEnts;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.freezeonPatches = [];
  sandbox.freezeonSlipZones = [];
  sandbox.freezeonShatters = [];
  sandbox.freezeonThrownRinks = [];
  sandbox.freezeonPendingCones = [];
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'freezeon';
}
function mkBot(id, opts = {}) {
  const b = mkEntity(id, { team: 'enemy', ...opts });
  botEnts.push(b);
  return b;
}
function mkAlly(id, opts = {}) {
  const b = mkEntity(id, { team: 'player', ...opts });
  botEnts.push(b);
  return b;
}
function landRinks() {
  const rinks = sandbox.freezeonThrownRinks;
  if (rinks.length) nowMs = Math.ceil(Math.max(...rinks.map((r) => r.impactAt)));
  sandbox.updateFreezeonSystems(0.016);
}

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getScaledStats: (id, lvl) => id === 'freezeon' ? { hp: 5200, dmg: 500, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getSelectedBrawlerLevel: () => 11,
  getActiveSkinForBrawler: () => null,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  isEntityHyperchargedNow: (e) => !!e && !!e.isHypercharged,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  pointInWall: () => false,
  destructibleWalls: [],
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  freezeonPatches: [],
  freezeonSlipZones: [],
  freezeonShatters: [],
  freezeonThrownRinks: [],
  freezeonPendingCones: [],
  isHypercharged: false,
  selectedBrawler: 'freezeon',
  isRankedMatch: false,
  isCustomMutatorMatch: false,
  activeRankedModifier: '',
  activeRankedModifierSecondary: '',
  activeRankedModifierTertiary: '',
  window: {},
  ctx: null,
};
const MUTATOR_ALIAS_SHIM = { super_rate_plus: 'super_rate_90', projectiles_150: 'giant_projectiles' };
sandbox.isMutatorActive = (id) => {
  if (!sandbox.isRankedMatch && !sandbox.isCustomMutatorMatch) return false;
  const canon = (x) => (!x || typeof x !== 'string') ? null : (MUTATOR_ALIAS_SHIM[x] || x);
  const c = canon(id);
  if (!c || c === 'classic') return false;
  return [sandbox.activeRankedModifier, sandbox.activeRankedModifierSecondary, sandbox.activeRankedModifierTertiary]
    .some((slot) => canon(slot) === c);
};
for (const m of game.matchAll(/const (FREEZEON_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'freezeonStarChoice', 'freezeonHasSP1', 'freezeonHasSP2', 'isFreezeon',
    'freezeonFindOwner', 'freezeonFreezeTarget', 'freezeonFirePatchSnowball',
    'freezeonApplyFreezeBuild', 'freezeonSpawnSlipZone', 'freezeonConeLanded',
    'fireFreezeonMain', 'freezeonFirePendingCone', 'castFreezeonSuper', 'freezeonLandRink', 'freezeonScheduleShatter',
    'freezeonDetonateShatter', 'executeFreezeonGadget', 'updateFreezeonSystems',
    'renderFreezeonEffects', 'drawFreezeonCone', 'drawFreezeonSnowball',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP1 snowballs (rate, range, gating, expiry, +12 freeze) ---
try {
  const sp1Owner = () => mkBot('sp1', { team: 'player', brawler: 'freezeon', selectedStar: 'slow', x: 0, y: 0 });
  // Fires from the active patch at the nearest enemy in range.
  resetWorld();
  const owner = sp1Owner();
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner, false, 300, 0);
  landRinks(); // patch lands + first tick fires; snowball timer starts at 0, so one fires now
  const balls = bullets.filter((b) => b.isFreezeonSp1Snowball);
  check('SP1: one snowball fires when the patch lands with an enemy in range', balls.length === 1);
  check('SP1: snowball is 300 dmg, 650 px/s, non-piercing, aimed at the enemy', balls.length === 1 && balls[0].damage === 300 && near(Math.hypot(balls[0].vx, balls[0].vy), 650) && balls[0].pierce === false && near(balls[0].vx, 0, 1) && balls[0].vy < 0); // enemy (300,0) sits directly above the patch center (300,40) — the rink target clamps to y=40
  check('SP1: snowball spawns at the patch center', balls.length === 1 && balls[0].x === 300 && balls[0].y === 40);
  // Rate: one per 0.8s, not before.
  nowMs += 799;
  sandbox.updateFreezeonSystems(0.016);
  check('SP1: no second snowball before 0.8s', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 1);
  nowMs += 1;
  sandbox.updateFreezeonSystems(0.016);
  check('SP1: second snowball fires at +0.8s', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 2);
  // No SP1, no snowballs.
  resetWorld();
  const ownerNoSp = mkBot('fz', { team: 'player', brawler: 'freezeon', selectedStar: 'none', x: 0, y: 0 });
  mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(ownerNoSp, false, 300, 0);
  landRinks();
  nowMs += 1600;
  sandbox.updateFreezeonSystems(0.016);
  check('SP1: no snowballs without the star power', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 0);
  // Range: patch radius (260) + 150 = 410 from center.
  resetWorld();
  const owner2 = sp1Owner();
  const farEnemy = mkBot('e1', { x: 730, y: 0, hp: 5000 }); // 430 from patch center, out of range
  sandbox.castFreezeonSuper(owner2, false, 300, 0);
  landRinks();
  check('SP1: no snowball when the only enemy is out of range (430 > 410)', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 0);
  farEnemy.x = 700; // 400 from center, in range
  nowMs += 800;
  sandbox.updateFreezeonSystems(0.016);
  check('SP1: snowball fires once the enemy steps into range', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 1);
  // Nearest-enemy targeting: two enemies in range, the closer one is aimed at.
  resetWorld();
  const owner3 = sp1Owner();
  mkBot('e1', { x: 500, y: 0, hp: 5000 });
  const nearEnemy = mkBot('e2', { x: 350, y: 100, hp: 5000 });
  sandbox.castFreezeonSuper(owner3, false, 300, 0);
  landRinks();
  const aimed = bullets.filter((b) => b.isFreezeonSp1Snowball)[0];
  const aimAng = Math.atan2(aimed.vy, aimed.vx);
  const wantAng = Math.atan2(nearEnemy.y - 40, nearEnemy.x - 300); // angles are from the patch center (300, 40), not the aim point
  check('SP1: snowball aims at the NEAREST enemy in range', !!aimed && near(aimAng, wantAng, 0.01));
  // Patch expiry stops the snowballs.
  resetWorld();
  const owner4 = sp1Owner();
  mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner4, false, 300, 0);
  landRinks();
  check('SP1: snowball fired while the patch is live', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 1);
  nowMs += 6001; // patch expired
  sandbox.updateFreezeonSystems(0.016);
  check('SP1: no more snowballs after the patch expires', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 1);
  // +12 freeze per snowball hit (via the real buildup path).
  resetWorld();
  const owner5 = sp1Owner();
  const enemy5 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonApplyFreezeBuild(owner5, enemy5, sandbox.FREEZEON_SP1_SNOWBALL_FREEZE);
  check('SP1: one snowball hit builds +12 freeze', enemy5.freezeonFreeze === 12);
  // Allies and structures are never targeted.
  resetWorld();
  const owner6 = sp1Owner();
  mkAlly('a1', { x: 300, y: 0, hp: 5000 });
  mkBot('s1', { x: 320, y: 0, hp: 5000, isStructure: true, brawler: 'tower_core' });
  sandbox.castFreezeonSuper(owner6, false, 300, 0);
  landRinks();
  check('SP1: allies and structures are never targeted', bullets.filter((b) => b.isFreezeonSp1Snowball).length === 0);
  // Render: the snowball draws a white ball.
  const s1 = stubCtx();
  sandbox.drawFreezeonSnowball(s1.proxy, { x: 0, y: 0, vx: 650, vy: 0, hyperVisual: false });
  check('SP1: snowball draws a white ball with a pale-blue rim', s1.sets.some((s) => s.p === 'fillStyle' && s.v === '#f8fafc') && s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#bae6fd'));
} catch (e) { failures.push('SP1 snowballs threw: ' + e.message); }

// --- executed: SP2 zone freeze (rate, per-zone cap, never freezes alone) ---
try {
  const sp2Owner = () => mkBot('sp2', { team: 'player', brawler: 'freezeon', selectedStar: 'long', x: 0, y: 0 });
  // +8/s, capped at +8 per zone.
  resetWorld();
  const owner = sp2Owner();
  sandbox.freezeonSpawnSlipZone(owner, 500, 500);
  const enemy = mkBot('e1', { x: 500, y: 500, hp: 5000 });
  for (let i = 0; i < 4; i++) sandbox.updateFreezeonSystems(0.25); // 1s standing
  check('SP2: 1s standing in a slip zone builds +8 freeze', enemy.freezeonFreeze === 8);
  for (let i = 0; i < 4; i++) sandbox.updateFreezeonSystems(0.25); // another 1s
  check('SP2: capped at +8 per enemy per zone (no more after the cap)', enemy.freezeonFreeze === 8);
  check('SP2: zones alone never freeze anyone', !enemy.stunUntil && enemy.freezeonFreeze === 8);
  // A second zone on the same enemy adds up to 8 more (cap is per zone).
  sandbox.freezeonSpawnSlipZone(owner, 510, 500);
  for (let i = 0; i < 4; i++) sandbox.updateFreezeonSystems(0.25);
  check('SP2: a second zone builds up to +8 more (per-zone cap, not per-enemy)', enemy.freezeonFreeze === 16);
  // No SP2, no zone freeze.
  resetWorld();
  const ownerNoSp = mkBot('fz', { team: 'player', brawler: 'freezeon', selectedStar: 'none', x: 0, y: 0 });
  sandbox.freezeonSpawnSlipZone(ownerNoSp, 500, 500);
  const enemy2 = mkBot('e1', { x: 500, y: 500, hp: 5000 });
  for (let i = 0; i < 4; i++) sandbox.updateFreezeonSystems(0.25);
  check('SP2: no zone freeze without the star power', (enemy2.freezeonFreeze || 0) === 0);
  // Allies, structures and the owner never build zone freeze.
  resetWorld();
  const owner3 = sp2Owner();
  sandbox.freezeonSpawnSlipZone(owner3, 500, 500);
  const ally = mkAlly('a1', { x: 500, y: 500, hp: 5000 });
  const structure = mkBot('s1', { x: 500, y: 500, hp: 5000, isStructure: true, brawler: 'tower_core' });
  for (let i = 0; i < 4; i++) sandbox.updateFreezeonSystems(0.25);
  check('SP2: allies and structures build no zone freeze', (ally.freezeonFreeze || 0) === 0 && (structure.freezeonFreeze || 0) === 0);
  // Patches do NOT build freeze via the SP2 path (only their own ticks do).
  resetWorld();
  const owner4 = sp2Owner();
  const enemy4 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner4, false, 300, 0);
  landRinks(); // first patch tick: +12.5
  check('SP2: patch tick builds 12.5 (its own path)', enemy4.freezeonFreeze === 12.5);
  sandbox.updateFreezeonSystems(0.25); // no new tick yet (250ms not passed), no zone build from the patch
  check('SP2: standing in the patch adds nothing extra via the zone path', enemy4.freezeonFreeze === 12.5);
} catch (e) { failures.push('SP2 zone freeze threw: ' + e.message); }

// --- executed: main tuning (spread 0.045, cone freeze 15 = 7 hits) ---
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.fireFreezeonMain(owner, 1000, 0, false);
  nowMs += 270;
  sandbox.updateFreezeonSystems(0.016);
  const cones = bullets.filter((b) => b.isFreezeonCone);
  check('main: cones alternate left/right at the narrower 0.045 rad spread', cones.length === 4 && (() => { const angs = cones.map((c) => Math.atan2(c.vy, c.vx)); return new Set(angs.map((a) => a.toFixed(3))).size === 2 && angs.every((a) => near(Math.abs(a), 0.045, 0.001)); })());
  check('main: cone speed still 720, range still 700', cones.every((c) => near(Math.hypot(c.vx, c.vy), 720) && near(c.maxLife, 700 / 720)));
  // 7 cone hits freeze (15 each).
  resetWorld();
  const owner2 = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  for (let i = 0; i < 6; i++) sandbox.freezeonApplyFreezeBuild(owner2, enemy, sandbox.FREEZEON_CONE_FREEZE_BUILD);
  check('main: six cone hits build 90, not yet frozen (was 4 hits)', enemy.freezeonFreeze === 90 && !enemy.stunUntil);
  sandbox.freezeonApplyFreezeBuild(owner2, enemy, sandbox.FREEZEON_CONE_FREEZE_BUILD);
  check('main: the seventh cone hit freezes solid for 1s', enemy.freezeonFreeze === 0 && enemy.stunUntil === nowMs + 1000);
} catch (e) { failures.push('main tuning threw: ' + e.message); }

// ---------------------------------------------------------- 3. report
if (failures.length) {
  console.error(`freezeon SP rework regression: ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.error('  FAIL ' + f);
  process.exit(1);
}
console.log(`freezeon SP rework regression: ${passed} passed, 0 failed`);
