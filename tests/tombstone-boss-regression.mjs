// Tombstone Tycoon solo boss fight regression — Anthony-approved design 2026-10-27.
// Solo arena, 3 phases, coins-only win reward (Normal +60). Boss art reuses
// the existing Tombstone Tycoon skin; no new skin or currency. 4 difficulties
// were added by the stages PR (all open, no gating); pins updated for it.
// Same vm pattern as mallow-balance-regression.mjs: helpers are EXECUTED.
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
check('boss HP is 90000', game.includes('const TOMBSTONE_BOSS_HP = 90000;'));
check('win reward is 60 coins', game.includes('const TOMBSTONE_BOSS_REWARD_COINS = 60;'));
check('minion cap is 6', game.includes('const TOMBSTONE_MINION_CAP = 6;'));
check('minion HP is 900', game.includes('const TOMBSTONE_MINION_HP = 900;'));
check('minion interval 8s, 2 per tick', game.includes('const TOMBSTONE_MINION_SUMMON_INTERVAL_MS = 8000;') && game.includes('const TOMBSTONE_MINION_SUMMON_COUNT = 2;'));
check('mode flip every 5s', game.includes('const TOMBSTONE_MODE_FLIP_INTERVAL_MS = 5000;'));
check('ring is 8 walls at 130px, 2400 HP', game.includes('const TOMBSTONE_SHIELD_RING_COUNT = 8;') && game.includes('const TOMBSTONE_SHIELD_RING_RADIUS = 130;') && game.includes('const TOMBSTONE_SHIELD_WALL_HP = 2400;'));
check('kill switch declared default ON', game.includes('let TOMBSTONE_BOSS_ENABLED = true;'));
check('kill switch debug setter', game.includes('set TOMBSTONE_BOSS_ENABLED(v) { TOMBSTONE_BOSS_ENABLED = !!v; }'));
check('event flag + runtime declared', game.includes('let isTombstoneBossEvent = false;') && game.includes('let tombstoneBossRuntime = null;'));
check('mode card entry', game.includes("['tombstone_boss', '🪦', 'Boss Battle: Tombstone Tycoon'"));
check('mode card promises up to +350 on win', game.includes('up to +350 Coins'));
check('permanent mode list', game.includes("'headless_boss_s4', 'tombstone_boss', 'orbo_boss'"));
check('mode rules entry', game.includes("tombstone_boss: ['Solo Boss Battle: 1 vs Tombstone Tycoon!'"));
check('mode color grave-green', game.includes("tombstone_boss: '#7dffb0',"));
check('card tag SOLO', game.includes("|| id === 'tombstone_boss') tag = 'SOLO';"));
check('all-events filter respects kill switch', game.includes("&& (id !== 'tombstone_boss' || TOMBSTONE_BOSS_ENABLED));"));
check('match setup flag', game.includes("isTombstoneBossEvent = showdownMode === 'tombstone_boss';"));
check('boss-fight membership', game.includes('isHeadlessBossEvent || isTombstoneBossEvent;'));
check('kill-switch fallback to solo', game.includes("if (isTombstoneBossEvent && !TOMBSTONE_BOSS_ENABLED) { showdownMode = 'solo'; isTombstoneBossEvent = false; isBossFight = false; }"));
check('boss arena size shared with Headless', game.includes('if (isLavaBossEvent || isHeadlessBossEvent || isTombstoneBossEvent) {'));
check('init call', game.includes('if (isTombstoneBossEvent) initTombstoneBossMatch();'));
check('updater call', game.includes('updateTombstoneBossEvent(now,dt);'));
check('renderer call', game.includes('renderTombstoneBossEvent();'));
check('cleanup resets flag (3 sites)', (game.match(/isTombstoneBossEvent = false;/g) || []).length >= 3);
check('end screen win text', game.includes("matchText=won?'TOMBSTONE TYCOON DEFEATED!':'THE GRAVEYARD CLAIMS YOU — TRY AGAIN!';"));
check('end screen rank text', game.includes("rankText='Solo Boss Fight';"));
check('generic end text does not overwrite tombstone', game.includes('if(!isLavaBossEvent&&!isHeadlessBossEvent&&!isTombstoneBossEvent)matchText'));
check('reward branch uses per-difficulty coins', game.includes('(isTombstoneBossEvent ? getTombstoneBossDifficulty(tombstoneBossRuntime?.difficulty).rewardCoins : 100);'));
check('HUD banner color', game.includes("isTombstoneBossEvent ? '#7dffb0' : '#ff6bb2';"));
check('HUD banner text shows difficulty', game.includes('TOMBSTONE TYCOON • ${getTombstoneBossDifficulty(tombstoneBossRuntime?.difficulty).name} • SOLO BOSS'));
check('tombstone prop def', game.includes("tombstone:   { w: 48, h: 48, hp: 2400, blocksMove: true,  blocksShots: true  },"));
check('tombstone prop painter', game.includes("} else if (dw.propType === 'tombstone') {"));
check('body art: boss forces tombstone body', game.includes("(getActiveSkinForBrawler(t.brawler)?.id === 'tombstone-moneytax' || t.isTombstoneBoss)"));
check('body art: other skins excluded for boss', game.includes("=== 'battle-moneytax' && !t.isTombstoneBoss") && game.includes("=== 'gold-silver-moneytax' && !t.isTombstoneBoss") && game.includes('!getActiveSkinForBrawler(t.brawler) && !t.isTombstoneBoss'));
check('bullet push stamps boss flag', game.includes('if (owner?.isTombstoneBoss || owner?.isTombstoneMinion) entry.tombstoneBoss = true;'));
check('bullet art: boss bullets draw tombstone art', game.includes("(activeSkinId === 'tombstone-moneytax' || b.tombstoneBoss) && b.ownerBrawler === 'money_and_tax'"));
check('ring walls ignore boss fire', game.includes('&& !(dw.isTombstoneShield && b.tombstoneBoss))'));
check('super gate: phase 1 sticky-only', game.includes("&& !(bot.isTombstoneBoss && (bot.bossStage || 1) < 2)) {"));
check('super gate: radial boomerangs phase 2+', game.includes('(bot.isTombstoneBoss && (bot.bossStage || 1) < 2 ? 0 : 10)'));
check('boss functions exist', game.includes('function initTombstoneBossMatch(){') && game.includes('function spawnTombstoneMinion(boss, x, y){') && game.includes('function spawnTombstoneShieldRing(boss){') && game.includes('function updateTombstoneBossEvent(now, dt){') && game.includes('function renderTombstoneBossEvent(){'));
check('init places 8 tombstone covers', (game.match(/placeProp\('tombstone',/g) || []).length === 8);
check('init lose-on-death: bossLives 1', game.includes('player.bossLives=1;'));
check('normal money_and_tax kit untouched (bot coin dmg)', game.includes('empoweredCenter ? (isBot ? 150 : 338)'));
check('no new currency or token', !game.includes('tombstoneBossToken') && !game.includes('tombstoneToken'));

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

const CONST_NAMES = ['TOMBSTONE_BOSS_HP', 'TOMBSTONE_BOSS_REWARD_COINS', 'TOMBSTONE_MINION_CAP', 'TOMBSTONE_MINION_HP', 'TOMBSTONE_MINION_SUMMON_INTERVAL_MS', 'TOMBSTONE_MINION_SUMMON_COUNT', 'TOMBSTONE_MODE_FLIP_INTERVAL_MS', 'TOMBSTONE_SHIELD_RING_COUNT', 'TOMBSTONE_SHIELD_RING_RADIUS', 'TOMBSTONE_SHIELD_WALL_HP', 'TOMBSTONE_ERUPTION_RADIUS', 'TOMBSTONE_ERUPTION_WARN_MS', 'TOMBSTONE_ERUPTION_DAMAGE', 'TOMBSTONE_ERUPTION_INTERVAL_MS', 'TOMBSTONE_RAIN_RADIUS', 'TOMBSTONE_RAIN_WARN_MS', 'TOMBSTONE_RAIN_DURATION_MS', 'TOMBSTONE_RAIN_TICK_MS', 'TOMBSTONE_RAIN_TICK_DAMAGE', 'TOMBSTONE_RAIN_INTERVAL_MS', 'TOMBSTONE_SLAM_WARN_MS', 'TOMBSTONE_SLAM_MAX_RADIUS', 'TOMBSTONE_SLAM_SPEED', 'TOMBSTONE_SLAM_BAND', 'TOMBSTONE_SLAM_SAFE_GAP', 'TOMBSTONE_SLAM_DAMAGE', 'TOMBSTONE_SLAM_INTERVAL_MS', 'TOMBSTONE_LAST_STAND_HP_PCT', 'TOMBSTONE_LAST_STAND_SPEED_MULT', 'TOMBSTONE_LAST_STAND_RAIN_INTERVAL_MS', 'TOMBSTONE_LAST_STAND_RAIN_TICK_MULT', 'TOMBSTONE_LAST_STAND_BURST_SPEED', 'TOMBSTONE_LAST_STAND_BURST_LIFE', 'TOMBSTONE_LAST_STAND_BURST_HITBOX_MOD'];
function extractConstBlock(src, name) {
  const start = src.indexOf('const ' + name + ' = ');
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
    else if (ch === '}') { depth--; if (depth === 0) { let end = i + 1; while (src[end] === ')') end++; return src.slice(start, end) + ';'; } }
  }
  throw new Error('unbalanced braces in ' + name);
}
function loadConsts(sandbox) {
  for (const name of CONST_NAMES) {
    const m = game.match(new RegExp('const ' + name + ' = ([^;]+);'));
    assert.ok(m, name + ' const not found');
    sandbox[name] = eval(m[1]);
  }
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

// --- executed: init ---
try {
  const placeCalls = [];
  const floatTexts = [];
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200, nextId: 100,
    player: { hp: 7000 },
    bots: [{ brawler: 'junk', hp: 1 }],
    destructibleWalls: [{ hp: 1 }], waterZones: [1], bushZones: [1], powerups: [1], cubes: [1],
    tombstoneBossRuntime: null,
    activeTombstoneBossDifficulty: 'normal',
    placeProp: (type, x, y) => { placeCalls.push({ type, x, y }); return null; },
    spawnFloatingText: (x, y, text, color) => { floatTexts.push({ text, color }); },
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(extractConstBlock(game, 'TOMBSTONE_BOSS_DIFFICULTIES') + '\n' + extractFn(game, 'getTombstoneBossDifficulty'), sandbox);
  vm.runInContext(extractFn(game, 'initTombstoneBossMatch'), sandbox);
  sandbox.initTombstoneBossMatch();
  check('init: arena arrays cleared except the boss', sandbox.bots.length === 1 && sandbox.waterZones.length === 0 && sandbox.bushZones.length === 0 && sandbox.powerups.length === 0 && sandbox.cubes.length === 0);
  const boss = sandbox.bots[0];
  check('init: boss is money_and_tax', boss.brawler === 'money_and_tax');
  check('init: boss flags', boss.isBoss === true && boss.isTombstoneBoss === true);
  check('init: boss team + solo spawn', boss.team === 'tombstone_enemy' && boss.x === 1200 && boss.y === 360);
  check('init: boss HP 90000, radius 40, speed 140', boss.hp === 90000 && boss.maxHp === 90000 && boss.radius === 40 && boss.speed === 140);
  check('init: boss no-respawn, no drops', boss.noRespawn === true && boss.noPowerupDrop === true);
  check('init: player bottom-center, 1 life', sandbox.player.x === 1200 && sandbox.player.y === 1940 && sandbox.player.bossLives === 1);
  check('init: runtime points at boss', sandbox.tombstoneBossRuntime && sandbox.tombstoneBossRuntime.bossId === boss.id);
  check('init: 8 tombstone covers placed', placeCalls.length === 8 && placeCalls.every((c) => c.type === 'tombstone'));
  check('init: covers clear of spawns', placeCalls.every((c) => Math.hypot(c.x - 1200, c.y - 1940) > 235 && Math.hypot(c.x - 1200, c.y - 360) > 235));
  check('init: banner text shows Normal', floatTexts.some((f) => f.text === 'TOMBSTONE TYCOON • Normal • SOLO BOSS'));
} catch (e) { failures.push('init vm block threw: ' + e.message); }

function makeUpdaterSandbox(boss, runtime) {
  const floatTexts = [];
  const aoeCalls = [];
  const hitCalls = [];
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200,
    isTombstoneBossEvent: true, gameOver: false,
    player: { hp: 7000, x: 1200, y: 1900 },
    bots: [boss],
    destructibleWalls: [], explosions: [],
    tombstoneBossRuntime: runtime,
    activeTombstoneBossDifficulty: 'normal',
    AOEDamage: (x, y, radius, damage) => { aoeCalls.push({ x, y, radius, damage }); },
    checkHit: (entity, info) => { hitCalls.push({ entity, info }); },
    areAlliedEntities: (a, b) => a.team === b.team,
    spawnFloatingText: (x, y, text, color) => { floatTexts.push({ text, color }); },
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(
    extractConstBlock(game, 'TOMBSTONE_BOSS_DIFFICULTIES') + '\n' +
    extractFn(game, 'getTombstoneBossDifficulty') + '\n' +
    extractFn(game, 'spawnTombstoneMinion') + '\n' +
    extractFn(game, 'spawnTombstoneShieldRing') + '\n' +
    extractFn(game, 'updateTombstoneBossAttacks') + '\n' +
    extractFn(game, 'updateTombstoneBossEvent'),
    sandbox);
  return { sandbox, floatTexts, aoeCalls, hitCalls };
}

// --- executed: phase 2 ring + phase 3 wave + ring follow ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 45000, maxHp: 90000, bossStage: 2, moneyAndTaxMode: 'money' };
  const rt = { bossId: 5, shieldRingSpawned: false, minionWaveSpawned: false, ringWalls: [], nextMinionAt: 999999, nextModeFlipAt: 999999 };
  const { sandbox, floatTexts } = makeUpdaterSandbox(boss, rt);
  sandbox.updateTombstoneBossEvent(1000, 16);
  check('phase2: ring spawned once', rt.shieldRingSpawned === true && rt.ringWalls.length === 8 && sandbox.destructibleWalls.length === 8);
  check('phase2: ring walls are tombstone shields', rt.ringWalls.every((w) => w.isTombstoneShield === true && w.propType === 'tombstone' && w.hp === 2400 && w.blocksMove === false && w.blocksShots === true));
  check('phase2: ring geometry (wall 0 east of boss)', Math.abs(rt.ringWalls[0].x - (1200 + 130 - 24)) < 0.01 && Math.abs(rt.ringWalls[0].y - (800 - 24)) < 0.01);
  check('phase2: HOSTILE TAKEOVER announced', floatTexts.some((f) => f.text === 'HOSTILE TAKEOVER!'));
  check('phase2: no minion wave yet', !sandbox.bots.some((b) => b.isTombstoneMinion));
  // move the boss: the ring must follow
  boss.x = 1000; boss.y = 600;
  sandbox.updateTombstoneBossEvent(2000, 16);
  check('ring: follows the boss', Math.abs(rt.ringWalls[0].x - (1000 + 130 - 24)) < 0.01 && Math.abs(rt.ringWalls[0].y - (600 - 24)) < 0.01);
  check('ring: no duplicate ring on re-run', rt.ringWalls.length === 8 && sandbox.destructibleWalls.length === 8);
  // destroy one wall: it must stop tracking while the rest follow
  const dead = rt.ringWalls[2];
  sandbox.destructibleWalls.splice(sandbox.destructibleWalls.indexOf(dead), 1);
  const deadX = dead.x; const deadY = dead.y;
  boss.x = 900; boss.y = 500;
  sandbox.updateTombstoneBossEvent(3000, 16);
  check('ring: destroyed wall stops tracking', dead.x === deadX && dead.y === deadY);
  check('ring: live walls keep following', Math.abs(rt.ringWalls[0].x - (900 + 130 - 24)) < 0.01);
  // phase 3
  boss.bossStage = 3;
  sandbox.updateTombstoneBossEvent(4000, 16);
  const minions = sandbox.bots.filter((b) => b.isTombstoneMinion);
  check('phase3: minion wave of 4', minions.length === 4);
  check('phase3: minions are skeletrooper boss-team summons', minions.every((m) => m.brawler === 'skeletrooper' && m.team === 'tombstone_enemy' && m.hp === 900 && m.ownerId === 5 && m.noRespawn === true && m.noPowerupDrop === true));
  check('phase3: GRAVEYARD FRENZY announced', floatTexts.some((f) => f.text === 'GRAVEYARD FRENZY!'));
  check('phase3: wave fires once', (() => { const n = sandbox.bots.length; sandbox.updateTombstoneBossEvent(5000, 16); return sandbox.bots.length === n; })());
} catch (e) { failures.push('phase vm block threw: ' + e.message); }

// --- executed: minion cap, mode flip, periodic summons, win/lose ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 90000, maxHp: 90000, bossStage: 1, moneyAndTaxMode: 'money' };
  const rt = { bossId: 5, shieldRingSpawned: false, minionWaveSpawned: false, ringWalls: [], nextMinionAt: 1000, nextModeFlipAt: 1000 };
  const { sandbox } = makeUpdaterSandbox(boss, rt);
  sandbox.updateTombstoneBossEvent(1000, 16);
  check('periodic: 2 minions on timer', sandbox.bots.filter((b) => b.isTombstoneMinion).length === 2);
  check('periodic: timer rescheduled +8s', rt.nextMinionAt === 9000);
  check('mode flip: money -> tax', boss.moneyAndTaxMode === 'tax');
  check('mode flip: timer rescheduled +5s', rt.nextModeFlipAt === 6000);
  check('phase1: no ring, no wave', rt.shieldRingSpawned === false && rt.minionWaveSpawned === false);
  // cap: fill to 6, further spawns refuse
  while (sandbox.bots.filter((b) => b.isTombstoneMinion).length < 6) sandbox.spawnTombstoneMinion(boss, 1200, 800);
  const before = sandbox.bots.length;
  check('cap: spawn at cap returns false', sandbox.spawnTombstoneMinion(boss, 1200, 800) === false);
  check('cap: no push at cap', sandbox.bots.length === before);
  // win + lose
  const boss2 = { id: 5, x: 1200, y: 800, hp: 0, maxHp: 90000, bossStage: 3, moneyAndTaxMode: 'money' };
  const rt2 = { bossId: 5, shieldRingSpawned: true, minionWaveSpawned: true, ringWalls: [], nextMinionAt: 999999, nextModeFlipAt: 999999 };
  const s2 = makeUpdaterSandbox(boss2, rt2);
  s2.sandbox.updateTombstoneBossEvent(1000, 16);
  check('win: boss at 0 HP ends the match', s2.sandbox.gameOver === true);
  const boss3 = { id: 5, x: 1200, y: 800, hp: 50000, maxHp: 90000, bossStage: 2, moneyAndTaxMode: 'money' };
  const rt3 = { bossId: 5, shieldRingSpawned: true, minionWaveSpawned: false, ringWalls: [], nextMinionAt: 999999, nextModeFlipAt: 999999 };
  const s3 = makeUpdaterSandbox(boss3, rt3);
  s3.sandbox.player.hp = 0;
  s3.sandbox.updateTombstoneBossEvent(1000, 16);
  check('lose: player at 0 HP ends the match', s3.sandbox.gameOver === true);
} catch (e) { failures.push('cap/flip/win vm block threw: ' + e.message); }

// --- executed: renderer draws grave-green ring + phase label ---
try {
  const s = stubCtx();
  const sandbox = {
    Math, performance: { now: () => 100000 },
    isTombstoneBossEvent: true,
    activeTombstoneBossDifficulty: 'normal',
    tombstoneBossRuntime: { bossId: 5 },
    bots: [{ id: 5, x: 400, y: 400, radius: 40, bossStage: 2 }],
    ctx: s.proxy,
  };
  vm.createContext(sandbox);
  loadConsts(sandbox);
  vm.runInContext(extractConstBlock(game, 'TOMBSTONE_BOSS_DIFFICULTIES') + '\n' + extractFn(game, 'getTombstoneBossDifficulty'), sandbox);
  vm.runInContext(extractFn(game, 'renderTombstoneBossEvent'), sandbox);
  sandbox.renderTombstoneBossEvent();
  check('render: grave-green ring stroke', s.sets.some((x) => x.p === 'strokeStyle' && x.v === '#7dffb0'));
  check('render: ring radius is boss radius + 12', s.calls.some((c) => c.m === 'arc' && Math.abs(c.args[2] - 52) < 0.01));
  check('render: phase label shows difficulty', s.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('TOMBSTONE TYCOON • Normal • PHASE 2')));
} catch (e) { failures.push('render vm block threw: ' + e.message); }

console.log(`tombstone-boss-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
