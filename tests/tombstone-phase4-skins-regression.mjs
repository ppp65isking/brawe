// Tombstone Phase 4 LAST STAND + Money & Tax skins unification regression.
// PART A: Phase 4 triggers under 15% HP on ALL tiers — radial coin-spam bursts,
// intensified coin rain, 1.2x speed. PART B: every Money & Tax skin draws the
// regular standard (7.392 / 15.68 / 16) and fires the x1.12 fan, and spawn
// hitboxMods are set so hit radius == drawn radius on every skin.
// Same vm pattern as tombstone-boss-stages-regression.mjs: helpers EXECUTED.
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
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// ---------------------------------------------------------- 1. source pins
check('last stand consts', game.includes('const TOMBSTONE_LAST_STAND_HP_PCT = 0.15;') &&
  game.includes('const TOMBSTONE_LAST_STAND_SPEED_MULT = 1.2;') &&
  game.includes('const TOMBSTONE_LAST_STAND_RAIN_INTERVAL_MS = 8000;') &&
  game.includes('const TOMBSTONE_LAST_STAND_RAIN_TICK_MULT = 1.5;'));
check('burst table covers all tiers', game.includes("normal: Object.freeze({count:10,damage:300,intervalMs:8000})") &&
  game.includes("hard: Object.freeze({count:12,damage:375,intervalMs:7000})") &&
  game.includes("extreme: Object.freeze({count:14,damage:450,intervalMs:6000})") &&
  game.includes("impossible: Object.freeze({count:16,damage:550,intervalMs:5000})"));
check('last stand trigger under 15%', game.includes('if(!rt.lastStand&&boss.hp<=boss.maxHp*TOMBSTONE_LAST_STAND_HP_PCT){'));
check('burst spawner pushes skull coins', game.includes('function spawnTombstoneCoinBurst(boss, cfg){') &&
  game.includes("isCoin:true,tombstoneBoss:true") && game.includes('hitboxMod:TOMBSTONE_LAST_STAND_BURST_HITBOX_MOD'));
check('rain fires in last stand on any tier', game.includes("if((attacks.includes('rain')||rt.lastStand)&&now>=rt.nextRainAt){"));
check('rain ticks intensify in last stand', game.includes('rt.lastStand?Math.round(TOMBSTONE_RAIN_TICK_DAMAGE*TOMBSTONE_LAST_STAND_RAIN_TICK_MULT):TOMBSTONE_RAIN_TICK_DAMAGE'));
check('init stores last stand state', game.includes('frenzyEarly:false,lastStand:false') && game.includes('nextBurstAt:999999'));
check('stage label shows phase 4', game.includes('rt.lastStand?4:1'));
check('picker header mentions last stand', game.includes('LAST STAND under 15% HP'));
check('rules text says 4 phases', game.includes('Survive 4 phases:'));
check('rewards untouched per tier', game.includes('rewardCoins:TOMBSTONE_BOSS_REWARD_COINS') && game.includes('rewardCoins:120') && game.includes('rewardCoins:200') && game.includes('rewardCoins:350'));
check('no per-skin coin radius overrides remain', !game.includes("if (skinKey === 'battle') r = boom ? 13 : 8;") &&
  !game.includes("else if (skinKey === 'goldsilver') r = boom ? 14 : 7;") &&
  !game.includes("else if (skinKey === 'tombstone') r = boom ? 14 : (b.moneyEmpoweredCenter ? 10 : 7);"));
check('unified coin radius formula', game.includes('if (b.isCoin && !boom) r *= MONEY_TAX_REGULAR_COIN_SIZE_MULT;'));
check('no skin-conditional fan left', !game.includes('mntRegularFan') &&
  game.includes('const mntFanSpread = MONEY_TAX_BASE_SPREAD * MONEY_TAX_REGULAR_SPREAD_MULT;'));
check('unified hitbox consts', game.includes('const MONEY_TAX_MONEY_SIZE_MULT = 1.232;') &&
  game.includes('const MONEY_TAX_FULL_CENTER_SIZE_MULT = 1.5838;'));
check('empowered hitbox follows the empowered flag', game.includes('? 1.65 * MONEY_TAX_FULL_CENTER_SIZE_MULT * (1 + centerSize)') &&
  !game.includes('(firedAtFullAmmo ? MONEY_TAX_FULL_CENTER_SIZE_MULT : 1)'));
check('boomerang hitbox at all 5 super sites', (game.match(/hitboxMod: 2\.6667/g) || []).length === 5);
check('tax note hitbox const untouched', game.includes('const MONEY_TAX_TAX_SIZE_MULT = 2.30;'));
check('money coin damage untouched', game.includes('damage: empoweredCenter ? (isBot ? 150 : 338)'));
check('tax note damage untouched', game.includes('MONEY_TAX_TAX_DAMAGE_MULT'));

// ---------------------------------------------------------- 2. vm helpers
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0; let inS = null; let esc = false; let lineComment = false; let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i]; const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === inS) inS = null; continue; }
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
  let depth = 0; let inS = null; let esc = false; let lineComment = false; let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i]; const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === inS) inS = null; continue; }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { let end = i + 1; while (src[end] === ')') end++; return src.slice(start, end) + ';'; } }
  }
  throw new Error('unbalanced braces in ' + name);
}
const BOSS_CONSTS = ['TOMBSTONE_BOSS_HP', 'TOMBSTONE_BOSS_REWARD_COINS', 'TOMBSTONE_MINION_CAP', 'TOMBSTONE_MINION_HP', 'TOMBSTONE_MINION_SUMMON_INTERVAL_MS', 'TOMBSTONE_MINION_SUMMON_COUNT', 'TOMBSTONE_MODE_FLIP_INTERVAL_MS', 'TOMBSTONE_SHIELD_RING_COUNT', 'TOMBSTONE_SHIELD_RING_RADIUS', 'TOMBSTONE_SHIELD_WALL_HP', 'TOMBSTONE_ERUPTION_RADIUS', 'TOMBSTONE_ERUPTION_WARN_MS', 'TOMBSTONE_ERUPTION_DAMAGE', 'TOMBSTONE_ERUPTION_INTERVAL_MS', 'TOMBSTONE_RAIN_RADIUS', 'TOMBSTONE_RAIN_WARN_MS', 'TOMBSTONE_RAIN_DURATION_MS', 'TOMBSTONE_RAIN_TICK_MS', 'TOMBSTONE_RAIN_TICK_DAMAGE', 'TOMBSTONE_RAIN_INTERVAL_MS', 'TOMBSTONE_SLAM_WARN_MS', 'TOMBSTONE_SLAM_MAX_RADIUS', 'TOMBSTONE_SLAM_SPEED', 'TOMBSTONE_SLAM_BAND', 'TOMBSTONE_SLAM_SAFE_GAP', 'TOMBSTONE_SLAM_DAMAGE', 'TOMBSTONE_SLAM_INTERVAL_MS', 'TOMBSTONE_LAST_STAND_HP_PCT', 'TOMBSTONE_LAST_STAND_SPEED_MULT', 'TOMBSTONE_LAST_STAND_RAIN_INTERVAL_MS', 'TOMBSTONE_LAST_STAND_RAIN_TICK_MULT', 'TOMBSTONE_LAST_STAND_BURST_SPEED', 'TOMBSTONE_LAST_STAND_BURST_LIFE', 'TOMBSTONE_LAST_STAND_BURST_HITBOX_MOD'];
function loadBossConsts(sandbox) {
  for (const name of BOSS_CONSTS) {
    const m = game.match(new RegExp('const ' + name + ' = ([^;]+);'));
    assert.ok(m, name + ' const not found');
    sandbox[name] = eval(m[1]);
  }
}
function makeAttacksSandbox(boss, rt) {
  const aoeCalls = []; const hitCalls = []; const floatTexts = []; const bullets = [];
  const sandbox = {
    Math, performance,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200,
    player: { id: 0, hp: 7000, x: 1200, y: 1900, radius: 20, team: 'player' },
    bots: [boss], bullets,
    explosions: [],
    tombstoneBossRuntime: rt,
    activeTombstoneBossDifficulty: 'normal',
    AOEDamage: (x, y, radius, damage) => { aoeCalls.push({ x, y, radius, damage }); },
    checkHit: (entity, info) => { hitCalls.push({ entity, info }); },
    areAlliedEntities: (a, b) => a.team === b.team,
    spawnFloatingText: (x, y, text, color) => { floatTexts.push({ text, color }); },
  };
  loadBossConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(
    extractConstBlock(game, 'TOMBSTONE_BOSS_DIFFICULTIES') + '\n' +
    extractConstBlock(game, 'TOMBSTONE_LAST_STAND_BURST') + '\n' +
    extractFn(game, 'getTombstoneBossDifficulty') + '\n' +
    extractFn(game, 'spawnTombstoneMinion') + '\n' +
    extractFn(game, 'spawnTombstoneCoinBurst') + '\n' +
    extractFn(game, 'updateTombstoneBossAttacks'),
    sandbox);
  return { sandbox, aoeCalls, hitCalls, floatTexts, bullets };
}
function baseRt(difficulty) {
  return { bossId: 5, difficulty, telegraphs: [], rainZones: [], slamRings: [], frenzyEarly: false, lastStand: false, nextEruptionAt: 999999, nextRainAt: 999999, nextSlamAt: 999999, nextBurstAt: 999999 };
}

// --- executed: Last Stand triggers under 15% on Normal, fires once ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 12600, maxHp: 90000, bossStage: 3, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('normal');
  const s = makeAttacksSandbox(boss, rt);
  const cfg = s.sandbox.getTombstoneBossDifficulty('normal');
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1000);
  check('last stand: triggers at 14% on Normal', rt.lastStand === true);
  check('last stand: speed jumps 1.2x', boss.speed === 168);
  check('last stand: announced', s.floatTexts.some((f) => f.text === 'LAST STAND!'));
  check('last stand: burst scheduled +800ms', rt.nextBurstAt === 1800);
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1800);
  check('last stand: 10-coin radial burst on Normal', s.bullets.length === 10);
  check('last stand: burst bullets are skull coins', s.bullets.every((b) => b.isCoin && b.tombstoneBoss && b.ownerId === 5));
  check('last stand: burst damage 300 on Normal', s.bullets.every((b) => b.damage === 300));
  check('last stand: burst speed 540 radial', s.bullets.every((b) => Math.abs(Math.hypot(b.vx, b.vy) - 540) < 0.01));
  check('last stand: burst hitbox matches draw', s.bullets.every((b) => near(b.hitboxMod * 6, 7.392)));
  check('last stand: burst rescheduled +8s on Normal', rt.nextBurstAt === 9800);
  check('last stand: burst announced', s.floatTexts.some((f) => f.text === 'COIN SPAM!'));
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 5000);
  check('last stand: trigger fires only once', boss.speed === 168);
} catch (e) { failures.push('last stand normal vm block threw: ' + e.message); }

// --- executed: no trigger at 16% ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 14400, maxHp: 90000, bossStage: 3, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('normal');
  const s = makeAttacksSandbox(boss, rt);
  s.sandbox.updateTombstoneBossAttacks(rt, boss, s.sandbox.getTombstoneBossDifficulty('normal'), 1000);
  check('last stand: no trigger at 16%', rt.lastStand === false && boss.speed === 140 && s.bullets.length === 0);
} catch (e) { failures.push('no-trigger vm block threw: ' + e.message); }

// --- executed: Impossible burst scales + rain intensifies ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 42000, maxHp: 300000, bossStage: 3, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('impossible');
  const s = makeAttacksSandbox(boss, rt);
  const cfg = s.sandbox.getTombstoneBossDifficulty('impossible');
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1000);
  check('last stand: triggers at 14% on Impossible', rt.lastStand === true);
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 1800);
  check('last stand: 16-coin burst on Impossible', s.bullets.length === 16);
  check('last stand: burst damage 550 on Impossible', s.bullets.every((b) => b.damage === 550));
  check('last stand: burst rescheduled +5s on Impossible', rt.nextBurstAt === 6800);
  // rain intensifies: telegraph at the pulled-in timer, ticks at 225, interval 8s
  rt.nextRainAt = 2000;
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 2000);
  check('last stand: rain telegraphed in phase 4', rt.telegraphs.some((t) => t.kind === 'rain'));
  s.sandbox.updateTombstoneBossAttacks(rt, boss, cfg, 2900);
  check('last stand: rain zone starts after warn', rt.rainZones.length === 1);
  check('last stand: rain ticks 225 in phase 4', s.aoeCalls.some((c) => c.damage === 225 && c.radius === 170));
  check('last stand: rain rescheduled +8s in phase 4', rt.nextRainAt === 10000);
} catch (e) { failures.push('impossible vm block threw: ' + e.message); }

// --- executed: rain fires on Normal in Last Stand (new attack on that tier) ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 9000, maxHp: 90000, bossStage: 3, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('normal');
  rt.lastStand = true; rt.nextRainAt = 1000;
  const s = makeAttacksSandbox(boss, rt);
  s.sandbox.updateTombstoneBossAttacks(rt, boss, s.sandbox.getTombstoneBossDifficulty('normal'), 1000);
  check('last stand: rain telegraphs on Normal in phase 4', rt.telegraphs.some((t) => t.kind === 'rain'));
} catch (e) { failures.push('normal rain vm block threw: ' + e.message); }

// --- executed: phases 1-3 unchanged (no last stand, no new behavior) ---
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 90000, maxHp: 90000, bossStage: 1, speed: 140, team: 'tombstone_enemy' };
  const rt = baseRt('normal');
  const s = makeAttacksSandbox(boss, rt);
  s.sandbox.updateTombstoneBossAttacks(rt, boss, s.sandbox.getTombstoneBossDifficulty('normal'), 1000);
  check('phases 1-3: no telegraphs, no bursts at full HP', rt.telegraphs.length === 0 && s.bullets.length === 0 && rt.lastStand === false);
} catch (e) { failures.push('phases unchanged vm block threw: ' + e.message); }

// ---------------------------------------------------------- 3. vm: draw sizes
function makeDrawSandbox() {
  const arcCalls = []; const rectCalls = [];
  const calls = [];
  const proxy = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'canvas') return undefined;
      return (...args) => { calls.push({ m: String(prop), args }); if (prop === 'arc') arcCalls.push(args); if (prop === 'fillRect') rectCalls.push(args); };
    },
    set() { return true; },
  });
  const sandbox = { Math, ctx: proxy };
  const m = game.match(/const MONEY_TAX_REGULAR_COIN_SIZE_MULT = ([^;]+);/);
  assert.ok(m, 'regular coin size const not found');
  sandbox.MONEY_TAX_REGULAR_COIN_SIZE_MULT = eval(m[1]);
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'moneyTaxArtPalette') + '\n' + extractFn(game, 'drawDetailedMoneyTaxCoin') + '\n' + extractFn(game, 'drawDetailedMoneyTaxNote'), sandbox);
  return { sandbox, arcCalls, rectCalls };
}
function maxArcR(arcCalls) { return Math.max(...arcCalls.map((a) => a[2])); }
try {
  const skins = ['regular', 'battle', 'goldsilver', 'tombstone'];
  for (const skin of skins) {
    const d = makeDrawSandbox();
    d.sandbox.drawDetailedMoneyTaxCoin(d.sandbox.ctx, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, skin, false);
    check(`draw: normal coin radius 7.392 on ${skin}`, near(maxArcR(d.arcCalls), 7.392));
  }
  for (const skin of skins) {
    const d = makeDrawSandbox();
    d.sandbox.drawDetailedMoneyTaxCoin(d.sandbox.ctx, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true, moneyEmpoweredCenter: true }, skin, false);
    check(`draw: empowered coin radius 15.68 on ${skin}`, near(maxArcR(d.arcCalls), 15.68));
  }
  for (const skin of skins) {
    const d = makeDrawSandbox();
    d.sandbox.drawDetailedMoneyTaxCoin(d.sandbox.ctx, { x: 100, y: 100, vx: 100, vy: 0, isBoomerang: true }, skin, false);
    check(`draw: boomerang radius 16 on ${skin}`, near(maxArcR(d.arcCalls), 16));
  }
  for (const skin of skins) {
    const d = makeDrawSandbox();
    d.sandbox.drawDetailedMoneyTaxNote(d.sandbox.ctx, { x: 100, y: 100, vx: 100, vy: 0, isTaxNote: true, hitboxMod: 2.30 }, skin, false);
    const paper = d.rectCalls[0];
    check(`draw: tax note 32.2 x 18.4 on ${skin}`, paper && near(paper[2], 32.2) && near(paper[3], 18.4));
  }
} catch (e) { failures.push('draw vm block threw: ' + e.message); }

// ---------------------------------------------------------- 4. hitbox == draw
try {
  const sizeM = game.match(/const MONEY_TAX_MONEY_SIZE_MULT = ([^;]+);/);
  const centerM = game.match(/const MONEY_TAX_FULL_CENTER_SIZE_MULT = ([^;]+);/);
  assert.ok(sizeM && centerM, 'hitbox consts not found');
  const normalHit = parseFloat(sizeM[1]) * 6;
  const empoweredHit = 1.65 * parseFloat(centerM[1]) * 6;
  check('hitbox: normal coin hit radius == draw 7.392', near(normalHit, 7.392));
  check('hitbox: empowered coin hit radius == draw 15.68', near(empoweredHit, 15.68));
  check('hitbox: boomerang hit radius == draw 16', near(2.6667 * 6, 16));
  check('hitbox: burst hit radius == draw 7.392', near(1.232 * 6, 7.392));
} catch (e) { failures.push('hitbox math block threw: ' + e.message); }

console.log(`tombstone-phase4-skins-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
