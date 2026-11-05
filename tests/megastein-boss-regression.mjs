// Megastein — fused five-Stein one-week limited-event boss regression.
// Solo arena, single MEGA-HARD tier (500,000 HP), one signature attack per
// Stein, interruptible remedy channel, 7-day window then dormant.
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
const MEGASTEIN_CONSTS = ['MEGASTEIN_BOSS_HP', 'MEGASTEIN_BOSS_REWARD_COINS', 'MEGASTEIN_BOSS_REWARD_SOULS', 'MEGASTEIN_BOSS_FIRST_WIN_GEMS', 'MEGASTEIN_BOSS_FIRST_WIN_CORE_PIECES', 'MEGASTEIN_DURATION_MS', 'MEGASTEIN_SKY_STRIKE_DMG', 'MEGASTEIN_SKY_STRIKE_INTERVAL_MS', 'MEGASTEIN_SKY_STRIKE_COUNT', 'MEGASTEIN_CHAIN_INTERVAL_MS', 'MEGASTEIN_OUTAGE_INTERVAL_MS', 'MEGASTEIN_DONOR_INTERVAL_MS', 'MEGASTEIN_DONOR_BURST', 'MEGASTEIN_HEAL_CHANNEL_MS', 'MEGASTEIN_HEAL_INTERVAL_MS', 'MEGASTEIN_HEAL_PCT', 'MEGASTEIN_HEAL_INTERRUPT_DMG', 'MEGASTEIN_LAST_STAND_HP_PCT', 'MEGASTEIN_LAST_STAND_INTERVAL_MULT'];
function loadConsts(sandbox) {
  for (const name of MEGASTEIN_CONSTS) {
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

// ---------------------------------------------------------- 1. source pins
check('boss HP is 500000 (above Tombstone Impossible 300000)', game.includes('const MEGASTEIN_BOSS_HP = 500000;') && game.includes('maxHp:135000') && game.includes('maxHp:300000'));
check('win reward is 500 coins', game.includes('const MEGASTEIN_BOSS_REWARD_COINS = 500;'));
check('win reward is 150 souls', game.includes('const MEGASTEIN_BOSS_REWARD_SOULS = 150;'));
check('first win is 5 gems + 3 core pieces', game.includes('const MEGASTEIN_BOSS_FIRST_WIN_GEMS = 5;') && game.includes('const MEGASTEIN_BOSS_FIRST_WIN_CORE_PIECES = 3;'));
check('window is 7 days', game.includes('const MEGASTEIN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;'));
check('sky strike 500 dmg, 6s, 3 per volley', game.includes('const MEGASTEIN_SKY_STRIKE_DMG = 500;') && game.includes('const MEGASTEIN_SKY_STRIKE_INTERVAL_MS = 6000;') && game.includes('const MEGASTEIN_SKY_STRIKE_COUNT = 3;'));
check('chain every 8s', game.includes('const MEGASTEIN_CHAIN_INTERVAL_MS = 8000;'));
check('outage every 14s', game.includes('const MEGASTEIN_OUTAGE_INTERVAL_MS = 14000;'));
check('donor burst of 3 every 9s', game.includes('const MEGASTEIN_DONOR_INTERVAL_MS = 9000;') && game.includes('const MEGASTEIN_DONOR_BURST = 3;'));
check('heal channel 3s, every 25s, 8%, interrupt at 15000', game.includes('const MEGASTEIN_HEAL_CHANNEL_MS = 3000;') && game.includes('const MEGASTEIN_HEAL_INTERVAL_MS = 25000;') && game.includes('const MEGASTEIN_HEAL_PCT = 0.08;') && game.includes('const MEGASTEIN_HEAL_INTERRUPT_DMG = 15000;'));
check('last stand under 15%, intervals x0.7', game.includes('const MEGASTEIN_LAST_STAND_HP_PCT = 0.15;') && game.includes('const MEGASTEIN_LAST_STAND_INTERVAL_MULT = 0.7;'));
check('kill switch declared default ON', game.includes('let MEGASTEIN_BOSS_ENABLED = true;'));
check('kill switch debug setter', game.includes('set MEGASTEIN_BOSS_ENABLED(v) { MEGASTEIN_BOSS_ENABLED = !!v; }'));
check('event flag + runtime declared', game.includes('let isMegasteinBossEvent = false;') && game.includes('let megasteinBossRuntime = null;'));
check('mode card entry', game.includes("['megastein_boss', '🧬', 'Boss Battle: Megastein'"));
check('mode card promises +500 Coins & +150 Souls', game.includes('+500 Coins & +150 Souls'));
check('mode rules entry', game.includes("megastein_boss: ['Solo Boss Battle: 1 vs Megastein"));
check('mode color fusion purple', game.includes("megastein_boss: '#c084fc',"));
check('card tag SOLO', game.includes("|| id === 'megastein_boss' || id === 'tower_defense') tag = 'SOLO';"));
check('rotation unshifts megastein while active', game.includes("if (isMegasteinEventActive(now)) ids.unshift('megastein_boss');"));
check('cached rotation gains megastein mid-day', game.includes("if (isMegasteinEventActive(now) && !state.ids.includes('megastein_boss')) { state.ids.unshift('megastein_boss');"));
check('cached rotation drops megastein after expiry', game.includes("if (!isMegasteinEventActive(now) && state.ids.includes('megastein_boss')) { state.ids = state.ids.filter((id) => id !== 'megastein_boss');"));
check('card click opens megastein overlay', game.includes("if (id === 'megastein_boss') {\n                  openMegasteinBossEvent();"));
check('launch gate falls back to solo when dormant', game.includes("if (showdownMode === 'megastein_boss' && !isMegasteinEventActive()) {"));
check('launch gate alert names dormancy', game.includes('Megastein has gone dormant'));
check('overlay refuses when dormant', game.includes("if (!isMegasteinEventActive()) { alert('⚡🧬 Megastein has gone dormant"));
check('match setup flag', game.includes("isMegasteinBossEvent = showdownMode === 'megastein_boss';"));
check('boss-fight membership', game.includes('isTombstoneBossEvent || isMegasteinBossEvent || isBeastBossEvent;'));
check('kill-switch fallback to solo', game.includes("if (isMegasteinBossEvent && !MEGASTEIN_BOSS_ENABLED) { showdownMode = 'solo'; isMegasteinBossEvent = false; isBossFight = false; }"));
check('boss arena size shared with Tombstone', game.includes('isTombstoneBossEvent || isMegasteinBossEvent || isTowerDefenseEvent) {'));
check('init call', game.includes('if (isMegasteinBossEvent) initMegasteinBossMatch();'));
check('updater call', game.includes('updateMegasteinBossEvent(now,dt);'));
check('renderer call', game.includes('renderMegasteinBossEvent();'));
check('cleanup resets flag (3 sites)', (game.match(/isMegasteinBossEvent = false;\n/g) || []).length >= 3);
check('end screen win text', game.includes("matchText=won?'MEGASTEIN DEFEATED!':'THE FUSION OVERWHELMS YOU — TRY AGAIN!';"));
check('end screen rank text', game.includes("rankText='Solo Boss Fight • One-Week Event';"));
check('generic end text does not overwrite megastein', game.includes('if(!isLavaBossEvent&&!isHeadlessBossEvent&&!isTombstoneBossEvent&&!isMegasteinBossEvent)matchText'));
check('reward branch uses 500 coins', game.includes('(isMegasteinBossEvent ? MEGASTEIN_BOSS_REWARD_COINS : 100))'));
check('reward grant call on win', game.includes('if (isMegasteinBossEvent && won) {\n                const mgReward = grantMegasteinBossRewards();'));
check('HUD banner color', game.includes("isMegasteinBossEvent ? '#c084fc' : '#ff6bb2';"));
check('HUD banner text', game.includes('🧬 MEGASTEIN • MEGA-HARD • SOLO BOSS'));
check('boss functions exist', game.includes('function initMegasteinBossMatch(){') && game.includes('function updateMegasteinBossEvent(now, dt){') && game.includes('function renderMegasteinBossEvent(){') && game.includes('function openMegasteinBossEvent(){') && game.includes('function ensureMegasteinEventState(now = Date.now()) {') && game.includes('function isMegasteinEventActive(now = Date.now()) {') && game.includes('function grantMegasteinBossRewards() {'));
check('sky strikes reuse Bolznstien scheduler', game.includes('scheduleBolznstienStrikes(boss.id,clamp(player.x+Math.cos(a)*90,60,WORLD_W-60),clamp(player.y+Math.sin(a)*90,60,WORLD_H-60),MEGASTEIN_SKY_STRIKE_DMG,false,player.id);'));
check('chain reuses Electrostien stick', game.includes('if(stickElectrostienChain(boss,player))'));
check('outage reuses Voltastein super', game.includes('castVoltasteinSuper(boss,false,player.x,player.y);'));
check('donor shots reuse Staticstein registry call', game.includes('fireStaticsteinDonorShot(boss,player.x,player.y,11,true,false);'));
check('persistence: load restores megastein state', game.includes('if (data.persistent.megastein) playerData.megastein = data.persistent.megastein;'));
check('persistence: save stores megastein state', game.includes('megastein: playerData.megastein || null,'));
check('load normalization starts window (Overdrive pattern)', game.includes("if (typeof ensureMegasteinEventState === 'function') ensureMegasteinEventState();"));
check('window state shape', game.includes("playerData.megastein = { startAt: now, endAt: now + MEGASTEIN_DURATION_MS, wins: 0, firstWinClaimed: false };"));
check('no new currency or token', !game.includes('megasteinToken') && !game.includes('megasteinBossToken'));
check('no re-arm path', !game.includes('megasteinRearm') && !game.includes('extendMegastein'));

// ---------------------------------------------------------- 2. window (executed)
try {
  const sandbox = { playerData: {}, MEGASTEIN_BOSS_ENABLED: true };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'ensureMegasteinEventState') + '\n' +
    extractFn(game, 'isMegasteinEventActive') + '\n' +
    extractFn(game, 'getMegasteinDaysLeft'),
    sandbox);
  const t0 = 1794000000000;
  check('window: fresh state starts at first call', sandbox.ensureMegasteinEventState(t0).startAt === t0 && sandbox.playerData.megastein.endAt === t0 + 7 * 24 * 60 * 60 * 1000);
  check('window: active at start', sandbox.isMegasteinEventActive(t0) === true);
  check('window: active on day 6', sandbox.isMegasteinEventActive(t0 + 6 * 24 * 60 * 60 * 1000) === true);
  check('window: expired 1ms after day 7', sandbox.isMegasteinEventActive(t0 + 7 * 24 * 60 * 60 * 1000 + 1) === false);
  check('window: second call does NOT re-arm the window', sandbox.ensureMegasteinEventState(t0 + 3 * 24 * 60 * 60 * 1000).startAt === t0);
  check('window: 7 days left at start', sandbox.getMegasteinDaysLeft(t0) === 7);
  check('window: 1 day left on day 6', sandbox.getMegasteinDaysLeft(t0 + 6 * 24 * 60 * 60 * 1000) === 1);
  check('window: 0 days left after expiry', sandbox.getMegasteinDaysLeft(t0 + 8 * 24 * 60 * 60 * 1000) === 0);
  sandbox.MEGASTEIN_BOSS_ENABLED = false;
  check('window: kill switch closes the event even mid-window', sandbox.isMegasteinEventActive(t0 + 1000) === false);
} catch (e) { failures.push('window vm block threw: ' + e.message); }

// ---------------------------------------------------------- 3. rewards (executed)
try {
  let saves = 0;
  const sandbox = { playerData: { souls: 10, gems: 2, corePieces: 1 }, MEGASTEIN_BOSS_ENABLED: true, saveProgress: () => { saves++; } };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'ensureMegasteinEventState') + '\n' +
    extractFn(game, 'grantMegasteinBossRewards'),
    sandbox);
  const first = sandbox.grantMegasteinBossRewards();
  check('rewards: first win pays souls + gems + core pieces', first.firstWin === true && sandbox.playerData.souls === 160 && sandbox.playerData.gems === 7 && sandbox.playerData.corePieces === 4);
  check('rewards: first win records wins=1 + flag', first.wins === 1 && sandbox.playerData.megastein.firstWinClaimed === true && sandbox.playerData.megastein.wins === 1);
  const second = sandbox.grantMegasteinBossRewards();
  check('rewards: repeat win pays souls only, no double first-win bonus', second.firstWin === false && sandbox.playerData.souls === 310 && sandbox.playerData.gems === 7 && sandbox.playerData.corePieces === 4 && second.wins === 2);
  check('rewards: saves progress on each grant', saves === 2);
} catch (e) { failures.push('rewards vm block threw: ' + e.message); }

// ---------------------------------------------------------- 4. init (executed)
try {
  const floatTexts = [];
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200, nextId: 100,
    player: { hp: 7000 },
    bots: [], destructibleWalls: [{ hp: 1 }], waterZones: [1], bushZones: [1], powerups: [1], cubes: [1],
    megasteinBossRuntime: null,
    spawnFloatingText: (x, y, text, color) => { floatTexts.push({ text, color }); },
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'initMegasteinBossMatch'), sandbox);
  sandbox.initMegasteinBossMatch();
  check('init: arena arrays cleared except the boss', sandbox.bots.length === 1 && sandbox.waterZones.length === 0 && sandbox.bushZones.length === 0 && sandbox.powerups.length === 0 && sandbox.cubes.length === 0);
  const boss = sandbox.bots[0];
  check('init: boss base brawler is bolznstien', boss.brawler === 'bolznstien');
  check('init: boss flags', boss.isBoss === true && boss.isMegasteinBoss === true);
  check('init: boss team + spawn', boss.team === 'megastein_enemy' && boss.x === 1200 && boss.y === 360);
  check('init: boss HP 500000, radius 46, speed 150', boss.hp === 500000 && boss.maxHp === 500000 && boss.radius === 46 && boss.speed === 150);
  check('init: boss no-respawn, no drops', boss.noRespawn === true && boss.noPowerupDrop === true);
  check('init: player bottom-center, 1 life', sandbox.player.x === 1200 && sandbox.player.y === 1940 && sandbox.player.bossLives === 1);
  check('init: runtime points at boss', sandbox.megasteinBossRuntime && sandbox.megasteinBossRuntime.bossId === boss.id);
  check('init: attack schedule staged (sky 3s, chain 5s, donor 7s, outage 9s, heal 25s)', sandbox.megasteinBossRuntime.nextSkyStrikeAt === 103000 && sandbox.megasteinBossRuntime.nextChainAt === 105000 && sandbox.megasteinBossRuntime.nextDonorAt === 107000 && sandbox.megasteinBossRuntime.nextOutageAt === 109000 && sandbox.megasteinBossRuntime.nextHealAt === 125000);
  check('init: banner names Megastein', floatTexts.some((f) => f.text === '⚡🧬 MEGASTEIN • FIVE STEINS, ONE BOSS • SOLO'));
} catch (e) { failures.push('init vm block threw: ' + e.message); }

// ---------------------------------------------------------- 5. update (executed)
function makeUpdaterSandbox(boss, runtime) {
  const floatTexts = [];
  const skyCalls = [];
  const chainCalls = [];
  const outageCalls = [];
  const donorCalls = [];
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 2400, WORLD_H: 2200,
    isMegasteinBossEvent: true, gameOver: false,
    player: { id: 1, hp: 7000, x: 1200, y: 1900 },
    bots: [boss],
    explosions: [],
    megasteinBossRuntime: runtime,
    scheduleBolznstienStrikes: (ownerId, x, y, dmg, isHyper, targetId) => { skyCalls.push({ ownerId, x, y, dmg, isHyper, targetId }); },
    stickElectrostienChain: (owner, target) => { chainCalls.push({ owner, target }); return true; },
    castVoltasteinSuper: (entity, hyper, tx, ty) => { outageCalls.push({ entity, hyper, tx, ty }); },
    fireStaticsteinDonorShot: (entity, tx, ty, level, hyper, isInterference) => { donorCalls.push({ entity, tx, ty, level, hyper, isInterference }); },
    spawnFloatingText: (x, y, text, color) => { floatTexts.push({ text, color }); },
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'updateMegasteinBossEvent'), sandbox);
  return { sandbox, floatTexts, skyCalls, chainCalls, outageCalls, donorCalls };
}
function freshRuntime(over = {}) {
  return Object.assign({ bossId: 5, startedAt: 100000, lastStand: false, nextSkyStrikeAt: 999999, nextChainAt: 999999, nextOutageAt: 999999, nextDonorAt: 999999, nextHealAt: 999999, healChannelUntil: 0, healChannelHpAtStart: 0, healInterrupted: false }, over);
}
try {
  // (a) quiet before the first timers
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime();
    const { sandbox, skyCalls, chainCalls, outageCalls, donorCalls } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(2000, 16);
    check('update: no fused attack fires before its first timer', skyCalls.length === 0 && chainCalls.length === 0 && outageCalls.length === 0 && donorCalls.length === 0 && sandbox.gameOver === false);
  }
  // (b) sky strike volley
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextSkyStrikeAt: 3000 });
    const { sandbox, skyCalls, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(3000, 16);
    check('update: sky strike fires 3 strikes at 500 dmg on the player', skyCalls.length === 3 && skyCalls.every((c) => c.dmg === 500 && c.targetId === 1 && c.ownerId === 5 && c.isHyper === false));
    check('update: sky strike reschedules +6s', rt.nextSkyStrikeAt === 9000);
    check('update: sky strike banner', floatTexts.some((f) => f.text === 'SKY STRIKE BARRAGE!'));
  }
  // (c) chain tether
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextChainAt: 5000 });
    const { sandbox, chainCalls, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(5000, 16);
    check('update: Boltz Chain sticks boss->player', chainCalls.length === 1 && chainCalls[0].owner === boss && chainCalls[0].target === sandbox.player);
    check('update: chain reschedules +8s', rt.nextChainAt === 13000);
    check('update: chain banner', floatTexts.some((f) => f.text === 'BOLTZ CHAIN!'));
  }
  // (d) donor burst
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextDonorAt: 7000 });
    const { sandbox, donorCalls, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(7000, 16);
    check('update: donor burst fires 3 hypercharged donor shots', donorCalls.length === 3 && donorCalls.every((c) => c.level === 11 && c.hyper === true && c.isInterference === false && c.tx === 1200 && c.ty === 1900));
    check('update: donor reschedules +9s', rt.nextDonorAt === 16000);
    check('update: donor banner', floatTexts.some((f) => f.text === 'STATIC INTERFERENCE!'));
  }
  // (e) power outage
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextOutageAt: 9000 });
    const { sandbox, outageCalls } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(9000, 16);
    check('update: Power Outage casts on the player position', outageCalls.length === 1 && outageCalls[0].entity === boss && outageCalls[0].hyper === false && outageCalls[0].tx === 1200 && outageCalls[0].ty === 1900);
    check('update: outage reschedules +14s', rt.nextOutageAt === 23000);
  }
  // (f) heal channel starts
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextHealAt: 25000 });
    const { sandbox, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(25000, 16);
    check('update: remedy channel starts (3s) and records start HP', rt.healChannelUntil === 28000 && rt.healChannelHpAtStart === 500000 && rt.healInterrupted === false);
    check('update: remedy channel banner', floatTexts.some((f) => f.text === 'REMEDY CHANNEL — HIT HIM HARD!'));
  }
  // (g) heal completes uninterrupted
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 400000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ healChannelUntil: 28000, healChannelHpAtStart: 400000 });
    const { sandbox, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(28000, 16);
    check('update: uninterrupted channel heals 8% max HP (40000)', boss.hp === 440000 && rt.healChannelUntil === 0);
    check('update: heal banner shows +40,000 HP', floatTexts.some((f) => f.text === '+40,000 HP • REMEDY!'));
  }
  // (h) heal interrupted by >=15000 damage
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 384000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ healChannelUntil: 28000, healChannelHpAtStart: 400000 });
    const { sandbox, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(27000, 16);
    check('update: 16000 damage inside the channel interrupts it, no heal', rt.healChannelUntil === 0 && rt.healInterrupted === true && boss.hp === 384000);
    check('update: interrupt banner', floatTexts.some((f) => f.text === 'REMEDY INTERRUPTED!'));
  }
  // (h2) heal NOT interrupted by small damage
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 395000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ healChannelUntil: 28000, healChannelHpAtStart: 400000 });
    const { sandbox } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(27000, 16);
    check('update: 5000 damage does NOT interrupt the channel', rt.healChannelUntil === 28000 && rt.healInterrupted === false);
  }
  // (i) last stand
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 70000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime({ nextHealAt: 1000, nextSkyStrikeAt: 1000 });
    const { sandbox, floatTexts } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(5000, 16);
    check('update: last stand trips under 15% HP, speed x1.2', rt.lastStand === true && boss.speed === 180);
    check('update: last stand disables the heal channel', rt.healChannelUntil === 0);
    check('update: last stand speeds sky strikes x0.7 (6000->4200)', rt.nextSkyStrikeAt === 5000 + 4200);
    check('update: last stand banner', floatTexts.some((f) => f.text === 'LAST STAND! NO MORE HEALING!'));
  }
  // (j) deaths end the fight
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 0, maxHp: 500000, speed: 150 };
    const rt = freshRuntime();
    const { sandbox } = makeUpdaterSandbox(boss, rt);
    sandbox.updateMegasteinBossEvent(5000, 16);
    check('update: boss at 0 HP ends the fight', sandbox.gameOver === true);
  }
  {
    const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, speed: 150 };
    const rt = freshRuntime();
    const { sandbox } = makeUpdaterSandbox(boss, rt);
    sandbox.player.hp = 0;
    sandbox.updateMegasteinBossEvent(5000, 16);
    check('update: player at 0 HP ends the fight', sandbox.gameOver === true);
  }
} catch (e) { failures.push('update vm block threw: ' + e.message); }

// ---------------------------------------------------------- 6. render (executed)
try {
  const boss = { id: 5, x: 1200, y: 800, hp: 500000, maxHp: 500000, radius: 46, bossStage: 2 };
  const rt = { bossId: 5, lastStand: false, healChannelUntil: 0 };
  const ctxStub = stubCtx();
  const sandbox = {
    Math, performance: { now: () => 100000 },
    ctx: ctxStub.proxy,
    isMegasteinBossEvent: true,
    bots: [boss],
    megasteinBossRuntime: rt,
  };
  loadConsts(sandbox);
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'renderMegasteinBossEvent'), sandbox);
  sandbox.renderMegasteinBossEvent();
  check('render: banner shows MEGASTEIN • MEGA-HARD • PHASE 2', ctxStub.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('MEGASTEIN • MEGA-HARD • PHASE 2')));
  check('render: no channel ring when no channel is active', !ctxStub.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('REMEDY CHANNEL')));
  rt.healChannelUntil = 103000;
  ctxStub.calls.length = 0;
  sandbox.renderMegasteinBossEvent();
  check('render: active channel draws the interrupt telegraph', ctxStub.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('REMEDY CHANNEL — INTERRUPT IT!')));
  rt.lastStand = true;
  ctxStub.calls.length = 0;
  sandbox.renderMegasteinBossEvent();
  check('render: last stand shows in the banner', ctxStub.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('LAST STAND')));
} catch (e) { failures.push('render vm block threw: ' + e.message); }

console.log(`megastein-boss: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exitCode = 1;
}
