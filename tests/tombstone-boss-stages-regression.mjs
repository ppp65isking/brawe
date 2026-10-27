// Tombstone Tycoon boss difficulty stages regression — Anthony-ordered rework
// 2026-10-27: merged PR #55 was "way too easy and not unique enough".
// Normal / Hard / Extreme / Impossible, picked at fight entry. Each tier adds
// a genuinely new mechanic (telegraph + dodge/positioning counterplay):
//   Hard: Grave Eruption (telegraphed exploding zones at your feet).
//   Extreme: + Coin Rain (telegraphed area, falling coins tick damage).
//   Impossible: + Ledger Slam (expanding ring with a safe gap sector) and
//   the phase-3 frenzy starts at 50% HP instead of 33%.
// Same vm pattern as tombstone-boss-regression.mjs: helpers are EXECUTED.
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
check('difficulty map exists', game.includes('const TOMBSTONE_BOSS_DIFFICULTIES = Object.freeze({'));
check('Normal: 90k HP, no new attacks, +60', game.includes("normal: Object.freeze({id:'normal',name:'Normal',order:0,maxHp:TOMBSTONE_BOSS_HP,availableAttacks:Object.freeze([]),minionIntervalMs:TOMBSTONE_MINION_SUMMON_INTERVAL_MS,minionCap:TOMBSTONE_MINION_CAP,rewardCoins:TOMBSTONE_BOSS_REWARD_COINS})"));
check('Hard: 135k HP, eruption only, +120', game.includes("hard: Object.freeze({id:'hard',name:'Hard',order:1,maxHp:135000,availableAttacks:Object.freeze(['eruption'])") && game.includes('rewardCoins:120'));
check('Extreme: 200k HP, eruption+rain, faster minions, +200', game.includes("extreme: Object.freeze({id:'extreme',name:'Extreme',order:2,maxHp:200000,availableAttacks:Object.freeze(['eruption','rain']),minionIntervalMs:5000,minionCap:8,rewardCoins:200}"));
check('Impossible: 300k HP, all three attacks, +350', game.includes("impossible: Object.freeze({id:'impossible',name:'Impossible',order:3,maxHp:300000,availableAttacks:Object.freeze(['eruption','rain','slam'])") && game.includes('rewardCoins:350'));
check('getter with Normal fallback', game.includes("function getTombstoneBossDifficulty(id=activeTombstoneBossDifficulty){return TOMBSTONE_BOSS_DIFFICULTIES[id]||TOMBSTONE_BOSS_DIFFICULTIES.normal;}"));
check('active difficulty defaults to normal', game.includes("let activeTombstoneBossDifficulty = 'normal';"));
check('eruption consts', game.includes('const TOMBSTONE_ERUPTION_RADIUS = 90;') && game.includes('const TOMBSTONE_ERUPTION_WARN_MS = 900;') && game.includes('const TOMBSTONE_ERUPTION_DAMAGE = 800;') && game.includes('const TOMBSTONE_ERUPTION_INTERVAL_MS = 9000;'));
check('rain consts', game.includes('const TOMBSTONE_RAIN_RADIUS = 170;') && game.includes('const TOMBSTONE_RAIN_WARN_MS = 900;') && game.includes('const TOMBSTONE_RAIN_DURATION_MS = 1500;') && game.includes('const TOMBSTONE_RAIN_TICK_MS = 250;') && game.includes('const TOMBSTONE_RAIN_TICK_DAMAGE = 150;') && game.includes('const TOMBSTONE_RAIN_INTERVAL_MS = 13000;'));
check('slam consts', game.includes('const TOMBSTONE_SLAM_WARN_MS = 900;') && game.includes('const TOMBSTONE_SLAM_MAX_RADIUS = 420;') && game.includes('const TOMBSTONE_SLAM_SPEED = 470;') && game.includes('const TOMBSTONE_SLAM_BAND = 40;') && game.includes('const TOMBSTONE_SLAM_SAFE_GAP = 0.5;') && game.includes('const TOMBSTONE_SLAM_DAMAGE = 1000;') && game.includes('const TOMBSTONE_SLAM_INTERVAL_MS = 16000;'));
check('picker exists, all tiers open (no gating)', game.includes('function openTombstoneBossEvent(){') && !game.includes('isTombstoneBossDifficultyUnlocked'));
check('picker row starts the fight at the picked tier', game.includes("activeTombstoneBossDifficulty=cfg.id;overlay.remove();showdownMode='tombstone_boss';launchShowdownMatch();"));
check('home card opens the picker', game.includes("if (id === 'tombstone_boss') {") && game.includes('openTombstoneBossEvent();'));
check('init uses picked HP', game.includes('hp:cfg.maxHp,maxHp:cfg.maxHp'));
check('init stores difficulty + attack timers', game.includes('difficulty:cfg.id,') && game.includes('nextEruptionAt:now+5000,nextRainAt:now+9000,nextSlamAt:now+13000'));
check('updater runs the attack engine', game.includes('updateTombstoneBossAttacks(rt,boss,cfg,now);'));
check('updater effective stage honors early frenzy', game.includes('const stage=Math.max(boss.bossStage||1,rt.frenzyEarly?3:1);'));
check('updater minion pace follows tier', game.includes('rt.nextMinionAt=now+cfg.minionIntervalMs;'));
check('frenzy triggers at 50% on Impossible', game.includes("cfg.id==='impossible'&&!rt.frenzyEarly&&boss.hp<=boss.maxHp*.50"));
check('frenzy applies speed + wave once', game.includes('rt.frenzyEarly=true;boss.speed*=1.25;'));
check('eruption telegraph kind', game.includes("kind:'eruption'"));
check('rain telegraph kind', game.includes("kind:'rain'"));
check('slam telegraph kind + safe angle', game.includes("kind:'slam'") && game.includes('safeAngle:Math.random()*Math.PI*2'));
check('slam ring damage respects the safe gap', game.includes('gap>TOMBSTONE_SLAM_SAFE_GAP'));
check('renderer draws the slam ring with its gap', game.includes('r.safeAngle+TOMBSTONE_SLAM_SAFE_GAP'));
check('single kill switch still gates the fight', game.includes('let TOMBSTONE_BOSS_ENABLED = true;') && !game.includes('TOMBSTONE_STAGES_ENABLED'));
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
const CONST_NAMES = ['TOMBSTONE_BOSS_HP', 'TOMBSTONE_BOSS_REWARD_COINS', 'TOMBSTONE_MINION_CAP', 'TOMBSTONE_MINION_HP', 'TOMBSTONE_MINION_SUMMON_INTERVAL_MS', 'TOMBSTONE_MINION_SUMMON_COUNT', 'TOMBSTONE_MODE_FLIP_INTERVAL_MS', 'TOMBSTONE_SHIELD_RING_COUNT', 'TOMBSTONE_SHIELD_RING_RADIUS', 'TOMBSTONE_SHIELD_WALL_HP', 'TOMBSTONE_ERUPTION_RADIUS', 'TOMBSTONE_ERUPTION_WARN_MS', 'TOMBSTONE_ERUPTION_DAMAGE', 'TOMBSTONE_ERUPTION_INTERVAL_MS', 'TOMBSTONE_RAIN_RADIUS', 'TOMBSTONE_RAIN_WARN_MS', 'TOMBSTONE_RAIN_DURATION_MS', 'TOMBSTONE_RAIN_TICK_MS', 'TOMBSTONE_RAIN_TICK_DAMAGE', 'TOMBSTONE_RAIN_INTERVAL_MS', 'TOMBSTONE_SLAM_WARN_MS', 'TOMBSTONE_SLAM_MAX_RADIUS', 'TOMBSTONE_SLAM_SPEED', 'TOMBSTONE_SLAM_BAND', 'TOMBSTONE_SLAM_SAFE_GAP', 'TOMBSTONE_SLAM_DAMAGE', 'TOMBSTONE_SLAM_INTERVAL_MS'];
function loadConsts(sandbox) {
  for (const name of CONST_NAMES) {
    const m = game.match(new RegExp('const ' + name + ' = ([^;]+);'));
    assert.ok(m, name + ' const not found');
    sandbox[name] = eval(m[1]);
  }
}
function makeAttacksSandbox(boss, rt) {
  const aoeCalls = [];
  const hitCalls = [];
  const floatTexts = [];
  const sandbox = {
    Math, performance,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200,
    player: { id: 0, hp: 7000, x: 1200, y: 1900, radius: 20, team: 'player' },
    bots: [boss],
    explosions: [],
    tombstoneBossRuntime: rt,
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
    extractFn(game, 'updateTombstoneBossAttacks'),
    sandbox);
  return { sandbox, aoeCalls, hitCalls, floatTexts };
}
function baseRt(difficulty) {
  return { bossId: 5, difficulty, telegraphs: [], rainZones: [], slamRings: [], frenzyEarly: false, nextEruptionAt: 999999, nextRainAt: 999999, nextSlamAt: 999999 };
}

// --- executed: Normal adds nothing new ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 90000, maxHp: 90000, bossStage: 1, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('normal');
  rt.nextEruptionAt = 1000; rt.nextRainAt = 1000; rt.nextSlamAt = 1000;
  const { sandbox } = makeAttacksSandbox(boss, rt);
  sandbox.updateTombstoneBossAttacks(rt, boss, sandbox.getTombstoneBossDifficulty('normal'), 1000);
  check('normal: no eruption telegraphs', rt.telegraphs.length === 0);
  check('normal: no rain zones or slam rings', rt.rainZones.length === 0 && rt.slamRings.length === 0);
  check('normal: no early frenzy', rt.frenzyEarly === false);
} catch (e) { failures.push('normal vm block threw: ' + e.message); }

// --- executed: Hard eruption, telegraph then damage ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 135000, maxHp: 135000, bossStage: 1, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('hard');
  rt.nextEruptionAt = 1000;
  const { sandbox, aoeCalls } = makeAttacksSandbox(boss, rt);
  const cfg = sandbox.getTombstoneBossDifficulty('hard');
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1000);
  check('hard: 2 eruption telegraphs at phase 1', rt.telegraphs.length === 2 && rt.telegraphs.every((t) => t.kind === 'eruption' && t.radius === 90 && t.explodeAt === 1900));
  check('hard: no rain or slam', rt.rainZones.length === 0 && rt.slamRings.length === 0);
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1900);
  check('hard: eruption explodes for 800 via AOE', aoeCalls.length === 2 && aoeCalls.every((c) => c.damage === 800 && c.radius === 90));
  check('hard: telegraphs cleared after exploding', rt.telegraphs.length === 0);
  check('hard: eruption timer rescheduled +9s', rt.nextEruptionAt === 10000);
  // phase 3 escalates to 3 zones
  boss.bossStage = 3; rt.nextEruptionAt = 2000;
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 2000);
  check('hard: 3 eruption zones at phase 3', rt.telegraphs.length === 3);
} catch (e) { failures.push('hard vm block threw: ' + e.message); }

// --- executed: Extreme coin rain, warn then ticks then expiry ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 200000, maxHp: 200000, bossStage: 2, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('extreme');
  rt.nextRainAt = 1000;
  const { sandbox, aoeCalls, floatTexts } = makeAttacksSandbox(boss, rt);
  const cfg = sandbox.getTombstoneBossDifficulty('extreme');
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1000);
  check('extreme: rain telegraphed + announced', rt.telegraphs.length === 1 && rt.telegraphs[0].kind === 'rain' && rt.telegraphs[0].radius === 170 && floatTexts.some((f) => f.text === 'COIN RAIN!'));
  check('extreme: no zone before the warning ends', rt.rainZones.length === 0);
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1900);
  check('extreme: rain zone starts after warn', rt.rainZones.length === 1 && rt.rainZones[0].until === 3400);
  check('extreme: rain ticks 150 on start', aoeCalls.some((c) => c.damage === 150 && c.radius === 170));
  const ticksAfterStart = aoeCalls.length;
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 2150);
  check('extreme: rain ticks again +250ms', aoeCalls.length === ticksAfterStart + 1);
  sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 3400);
  check('extreme: rain zone expires', rt.rainZones.length === 0);
  check('extreme: no slam rings', rt.slamRings.length === 0);
} catch (e) { failures.push('extreme vm block threw: ' + e.message); }

// --- executed: Impossible slam ring, safe gap dodges, others get hit once ---
try {
  const mk = (px) => {
    const boss = { id: 5, x: 1200, y: 400, hp: 300000, maxHp: 300000, bossStage: 2, speed: 140, team: 'tombstone_enemy' };
    const rt = baseRt('impossible');
    rt.frenzyEarly = true;
    rt.telegraphs = [{ kind: 'slam', x: 1200, y: 400, radius: 60, explodeAt: 1000, safeAngle: 0 }];
    const s = makeAttacksSandbox(boss, rt);
    s.sandbox.player.x = px; s.sandbox.player.y = 400;
    return { boss, rt, ...s };
  };
  // safe sector (angle 0 = east): ring passes over, no hit
  const safe = mk(1435);
  safe.sandbox.updateTombstoneBossAttacks(safe.rt, safe.boss, safe.sandbox.getTombstoneBossDifficulty('impossible'), 1000);
  check('slam: telegraph becomes a ring', safe.rt.slamRings.length === 1 && safe.rt.slamRings[0].startedAt === 1000);
  safe.sandbox.updateTombstoneBossAttacks(safe.rt, safe.boss, safe.sandbox.getTombstoneBossDifficulty('impossible'), 1500);
  check('slam: ring expands at 470px/s', Math.abs(safe.rt.slamRings[0].radius - 235) < 0.01);
  check('slam: safe-gap sector takes no damage', safe.hitCalls.length === 0);
  // opposite sector: hit once, then never again
  const hit = mk(965);
  hit.sandbox.updateTombstoneBossAttacks(hit.rt, hit.boss, hit.sandbox.getTombstoneBossDifficulty('impossible'), 1000);
  hit.sandbox.updateTombstoneBossAttacks(hit.rt, hit.boss, hit.sandbox.getTombstoneBossDifficulty('impossible'), 1500);
  check('slam: outside-gap target takes 1000', hit.hitCalls.length === 1 && hit.hitCalls[0].info.damage === 1000);
  hit.sandbox.updateTombstoneBossAttacks(hit.rt, hit.boss, hit.sandbox.getTombstoneBossDifficulty('impossible'), 1600);
  check('slam: same target is not hit twice', hit.hitCalls.length === 1);
  hit.sandbox.updateTombstoneBossAttacks(hit.rt, hit.boss, hit.sandbox.getTombstoneBossDifficulty('impossible'), 2000);
  check('slam: ring expires past 420px', hit.rt.slamRings.length === 0);
} catch (e) { failures.push('slam vm block threw: ' + e.message); }

// --- executed: Impossible frenzy at 50%, not at 60% ---
try {
  const mk = (hp) => {
    const boss = { id: 5, x: 1200, y: 800, hp, maxHp: 300000, bossStage: 2, speed: 140, team: 'tombstone_enemy' };
    const rt = baseRt('impossible');
    const s = makeAttacksSandbox(boss, rt);
    return { boss, rt, ...s };
  };
  const low = mk(147000);
  low.sandbox.updateTombstoneBossAttacks(low.rt, low.boss, low.sandbox.getTombstoneBossDifficulty('impossible'), 1000);
  check('frenzy: triggers at 49% on Impossible', low.rt.frenzyEarly === true);
  check('frenzy: speed jumps 1.25x once', low.boss.speed === 175);
  check('frenzy: 4-minion wave spawns', low.sandbox.bots.filter((b) => b.isTombstoneMinion).length === 4);
  check('frenzy: announced + wave flagged', low.floatTexts.some((f) => f.text === 'GRAVEYARD FRENZY!') && low.rt.minionWaveSpawned === true);
  const high = mk(180000);
  high.sandbox.updateTombstoneBossAttacks(high.rt, high.boss, high.sandbox.getTombstoneBossDifficulty('impossible'), 1000);
  check('frenzy: does not trigger at 60%', high.rt.frenzyEarly === false && high.boss.speed === 140 && high.sandbox.bots.filter((b) => b.isTombstoneMinion).length === 0);
} catch (e) { failures.push('frenzy vm block threw: ' + e.message); }

// --- executed: renderer draws telegraphs, rain, slam gap, difficulty label ---
try {
  const calls = [];
  const sets = [];
  const proxy = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'canvas') return undefined;
      return (...args) => { calls.push({ m: String(prop), args }); };
    },
    set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
  });
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    isTombstoneBossEvent: true,
    activeTombstoneBossDifficulty: 'normal',
    tombstoneBossRuntime: { bossId: 5, difficulty: 'impossible', telegraphs: [{ kind: 'eruption', x: 500, y: 500, radius: 90, explodeAt: 100900 }], rainZones: [{ x: 600, y: 600, radius: 170 }], slamRings: [{ x: 400, y: 400, radius: 100, safeAngle: 0 }], frenzyEarly: false },
    bots: [{ id: 5, x: 400, y: 400, radius: 40, bossStage: 2 }],
    ctx: proxy,
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(extractConstBlock(game, 'TOMBSTONE_BOSS_DIFFICULTIES') + '\n' + extractFn(game, 'getTombstoneBossDifficulty'), sandbox);
  vm.runInContext(extractFn(game, 'renderTombstoneBossEvent'), sandbox);
  sandbox.renderTombstoneBossEvent();
  check('render: difficulty phase label', calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('TOMBSTONE TYCOON • Impossible • PHASE 2')));
  check('render: eruption telegraph circle', calls.some((c) => c.m === 'arc' && c.args[2] === 90));
  check('render: rain zone circle', calls.some((c) => c.m === 'arc' && c.args[2] === 170));
  check('render: slam ring arc keeps its gap', calls.some((c) => c.m === 'arc' && c.args[2] === 100 && Math.abs(c.args[3] - 0.5) < 0.01));
} catch (e) { failures.push('render vm block threw: ' + e.message); }

console.log(`tombstone-boss-stages-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
