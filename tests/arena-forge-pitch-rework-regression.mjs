// Pitch rework + Season Quests rework — Anthony's spec 2026-11-23.
// Pitch: Hex Toss no longer explodes and deals NO landing damage — the pot
// cracks open and releases 4 shards at 650 dmg each, +12% size, +30%
// range. SP1 Curveball keeps the clockwise curve and adds slower travel
// (0.7x speed) over more area (1.9x lifetime). Super spawns 2 pigs (was
// 4); cap 4 per owner (was 6). Pigs never count as brawlers remaining in
// Showdown and power cubes never affect them. Hyper: NO extra pigs — the
// 2 pigs fly with wings to the nearest enemy, land for 150 damage, then
// ram as normal. Hyper main still releases plus AND X (UNCHANGED —
// Anthony can veto). G1/G2 keep working on the release mechanic.
// Season quests: NO timer — sequential unlock only. Daily/weekly Pass XP
// fixed (daily +300, weekly +600) so the pass is actually completable:
// season Nov 20–Dec 31 = 42 days = 6 weeks; daily 2–3/day, weekly 4/week.
// Math asserted below from the real constants in game.js.
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
function extractConst(src, name) {
  const start = src.indexOf(`const ${name} =`);
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('=', start) + 1;
  while (src[i] === ' ' || src[i] === '\n') i++;
  const valStart = i;
  let dPar = 0, dBrk = 0, dBrc = 0, inS = null, esc = false, line = false, block = false;
  while (i < src.length) {
    const ch = src[i], nxt = src[i + 1];
    if (line) { if (ch === '\n') line = false; i++; continue; }
    if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      i++; continue;
    }
    if (ch === '/' && nxt === '/') { line = true; i++; continue; }
    if (ch === '/' && nxt === '*') { block = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') inS = ch;
    else if (ch === '(') dPar++;
    else if (ch === ')') dPar--;
    else if (ch === '[') dBrk++;
    else if (ch === ']') dBrk--;
    else if (ch === '{') dBrc++;
    else if (ch === '}') dBrc--;
    else if (ch === ';' && dPar === 0 && dBrk === 0 && dBrc === 0) return src.slice(valStart, i);
    i++;
  }
  throw new Error('unbalanced const ' + name);
}
const evalLiteral = (src) => vm.runInContext(`(${src})`, vm.createContext({}));

// ---------------------------------------------------------- 1. source pins
check('rework: splash damage + splash radius constants are GONE', !game.includes('PITCH_SPLASH_DMG') && !game.includes('PITCH_SPLASH_RADIUS'));
check('rework: no splash hit flag anywhere (isPitchHexSplash is gone)', !game.includes('isPitchHexSplash'));
check('rework: hyper pig count constant is GONE (no extra pigs)', !game.includes('PITCH_SUPER_PIG_COUNT_HYPER'));
check('rework: shard 650 dmg / 540 speed / 0.455s life / hitbox 1.40 / range 246px',
  game.includes('const PITCH_SHARD_DMG = 650;') && game.includes('const PITCH_SHARD_SPEED = 540;')
  && game.includes('const PITCH_SHARD_MAX_LIFE = 0.455;') && game.includes('const PITCH_SHARD_HITBOX_MOD = 1.40;')
  && game.includes('const PITCH_SHARD_RANGE_PX = 246;'));
check('rework: super 2 pigs, cap 4 per owner', game.includes('const PITCH_SUPER_PIG_COUNT = 2;') && game.includes('const PITCH_MAX_PIGS_PER_OWNER = 4;'));
check('rework: hyper flight consts (700 px/s, 60px height, 48px land radius, 150 land dmg)',
  game.includes('const PITCH_PIG_FLY_SPEED = 700;') && game.includes('const PITCH_PIG_FLY_HEIGHT = 60;')
  && game.includes('const PITCH_PIG_LAND_RADIUS = 48;') && game.includes('const PITCH_PIG_LAND_DMG = 150;'));
check('rework: SP1 slower + more area (0.7x speed, 1.9x lifetime)', game.includes('const PITCH_SP1_SHARD_SPEED_MULT = 0.7;') && game.includes('const PITCH_SP1_SHARD_LIFE_MULT = 1.9;'));
check('rework: release animation uses the whitelisted pitchHexBurst branch (never the generic dot)',
  game.includes("if (ex.fxKind === 'pitchHexBurst') {") && game.includes("const SPRITZ_PITCH_CUSTOM_FX = new Set(['spritzWaterBlast', 'spritzModeSwap', 'pitchHexBurst', 'pitchPigSpawn', 'gameboardZoneLand', 'gameboardQueenBurst', 'gameboardBounceRelease', 'gameboardBishopLaunch']);"));
check('rework: release branch draws the pot splitting (two halves spinning apart)',
  extractFn(game, 'pitchFireBurst').includes("fxKind: 'pitchHexBurst'")
  && game.includes('The pot itself, splitting: two halves rotate apart'));
check('rework: hyper main STILL releases plus AND X (unchanged — Anthony can veto)',
  game.includes('const eightWay = !!(hyper || cross);') && game.includes('Hex Storm: Hex Toss releases in a plus AND an X — 8 shards —'));
check('rework: pigs carry ZERO power cubes at spawn', game.includes('powerCubes: 0, isDead: false, shield: 0, shieldMax: 0, radius: 22, speed: PITCH_PIG_SPEED'));
check('rework: checkHit skips the cube multiplier for pig rams + pig landings',
  game.includes('if (b && (b.isPitchPigRam || b.isPitchPigLanding)) mult = 1.0;'));
check('rework: pigs cannot pick up power cubes (plain + charged + vitality + nova)',
  game.includes("if (e.isPitchPig && (p.kind === undefined || p.kind === 'charged_core' || p.kind === 'vitality_core' || p.kind === 'nova_core')) continue;"));
check('rework: Showdown remaining count filters pigs (solo + duo + trio branches)',
  game.includes('function showdownCountedBots(list) {')
  && game.includes('const countedBots = showdownCountedBots(aliveBots);')
  && game.includes('showdownCountedBots(aliveBots).filter(b => !b.isTeammate')
  && game.includes('for (const b of showdownCountedBots(aliveBots)) {'));
check('rework: winged flight steers at the nearest enemy over walls, then lands (pitchPigLand)',
  game.includes('if (t.isPitchPig && t.pitchPigFlying) {') && game.includes('const flyStep = Math.min(flyBest, PITCH_PIG_FLY_SPEED * dt);')
  && game.includes('if (flyRemaining <= PITCH_PIG_LAND_RADIUS + (flyTarget.radius || 14)) pitchPigLand(t, flyTarget);'));
check('rework: flying pigs get wings drawn in renderPitchEffects', game.includes('Hyper winged pigs: white flapping wings'));
check('rework: season quest timer is GONE (no step const, no timer functions, no countdown spans)',
  !game.includes('const SEASON_QUEST_UNLOCK_STEP_MS =') && !game.includes('function seasonQuestStageUnlockMs(')
  && !game.includes('function seasonQuestStageStartUtc(') && !game.includes('function isSeasonQuestStageTimeUnlocked(')
  && !game.includes('function formatSeasonQuestUnlockCountdown(') && !game.includes('data-season-quest-unlock-utc='));
check('rework: season gate is sequential only (previous stage, no clock)',
  extractFn(game, 'isSeasonQuestStageUnlocked').includes('previousStageQuest')
  && !extractFn(game, 'isSeasonQuestStageUnlocked').includes('TimeUnlocked'));
check('rework: daily/weekly Pass XP is +300/+600 (builder + backfill agree)',
  game.includes('passXP:600 } : { coins:150+index*40, questXP:20, passXP:300 }')
  && game.includes("for (const [bucketName, amount] of [['daily', 300], ['weekly', 600]])"));
check('rework: daily/weekly quest TIMERS untouched (daily by day key, weekly by week key)',
  game.includes('getLocalDayKey()') && game.includes('getLocalWeekKey()')
  && game.includes("playerData.questBoard.dailyKey !== nowDay") && game.includes("playerData.questBoard.weeklyKey !== nowWeek"));
check('rework: no Brawl Stars wording in the Pitch block',
  !game.slice(game.indexOf('// ===== Pitch systems'), game.indexOf('// ===== Spritz systems')).includes('Brawl Stars'));
check('rework: zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));

// ---------------------------------------------------------- 2. vm harness
let nowMs = 100000;
const floatingTexts = [];
const checkHitCalls = [];
const voicePlays = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let pitchThrownHexes = [];
let pitchPendingEchoes = [];
let bots = [];
let nextId = 9000;
let playerEnt = null;
function mkEntity(id, opts = {}) {
  const e = {
    id, x: opts.x ?? 0, y: opts.y ?? 0, hp: opts.hp ?? 5000, maxHp: opts.maxHp ?? 5000,
    radius: opts.radius ?? 14, team: opts.team ?? 'enemy', brawler: opts.brawler ?? 'outlit',
    level: opts.level ?? 11, selectedStar: opts.selectedStar ?? 'none',
    isDummy: !!opts.isDummy, isPet: !!opts.isPet, isStructure: !!opts.isStructure,
    isPitchPig: !!opts.isPitchPig, isChickpigPig: !!opts.isChickpigPig,
    isHypercharged: !!opts.isHypercharged, powerCubes: opts.powerCubes ?? 0,
    lastDamagerId: opts.lastDamagerId ?? null,
  };
  entitiesById.set(id, e);
  return e;
}
function resetWorld() {
  entitiesById.clear();
  bullets = [];
  explosions = [];
  pitchThrownHexes = [];
  pitchPendingEchoes = [];
  bots = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  voicePlays.length = 0;
  nowMs = 100000;
  nextId = 9000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'pitch', x: 0, y: 0, hp: 5200, maxHp: 5200, powerCubes: 0 });
  sandbox.player = playerEnt;
  sandbox.bots = bots;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.pitchThrownHexes = pitchThrownHexes;
  sandbox.pitchPendingEchoes = pitchPendingEchoes;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'pitch';
  sandbox.nextId = nextId;
}
function mkBot(id, opts = {}) {
  const b = mkEntity(id, { team: 'enemy', ...opts });
  bots.push(b);
  sandbox.bots = bots;
  return b;
}
function syncArrays() {
  pitchThrownHexes = sandbox.pitchThrownHexes;
  pitchPendingEchoes = sandbox.pitchPendingEchoes;
  bullets = sandbox.bullets;
  bots = sandbox.bots;
}
const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getLevelDamageScale: (level) => 0.55 + (level - 1) * 0.045,
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler, isPitchPigLanding: !!synth.isPitchPigLanding, isPitchPigRam: !!synth.isPitchPigRam });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  pitchThrownHexes: [],
  pitchPendingEchoes: [],
  isHypercharged: false,
  selectedBrawler: 'pitch',
  nextId: 9000,
  window: { BrawePitchVoice: { play: (kind) => { voicePlays.push(kind); } } },
  playerData: { seasonPass: { quests: {} } },
};
// Pull every PITCH_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (PITCH_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'pitchLevelScale', 'pitchStarChoice', 'pitchHasSP1', 'pitchHasSP2', 'isPitch',
    'pitchFindOwner', 'pitchSpawnPig', 'pitchPigLand', 'pitchHandleKill', 'firePitchMain',
    'pitchFireBurst', 'pitchLandHex', 'pitchCurveShardVelocity',
    'castPitchSuper', 'executePitchGadget', 'updatePitchSystems',
    'showdownCountedBots', 'isSeasonQuestStageUnlocked',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: main release — no landing damage, 650 shards, +12% size, +30% range ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 200, y: 100 });
  sandbox.pitchLandHex({ targetX: 200, targetY: 100, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false });
  syncArrays();
  check('main: enemy standing ON the landing spot takes NO damage', enemy.hp === 5000);
  check('main: landing calls checkHit ZERO times (no splash path at all)', checkHitCalls.length === 0);
  check('main: 4 shards at 650 damage each', bullets.length === 4 && bullets.every((b) => b.isPitchShard && b.damage === 650));
  check('main: shard size +12% (hitboxMod 1.40, was 1.25)', bullets.every((b) => b.hitboxMod === 1.40));
  check('main: shard range +30% (0.455s life x 540 px/s = 246px, was 189px)',
    bullets.every((b) => b.maxLife === 0.455 && Math.round(Math.hypot(b.vx, b.vy) * b.maxLife) === 246));
  check('main: release explosion radius equals the shard range (246)', (() => { const ex = explosions.find((e) => e.fxKind === 'pitchHexBurst'); return ex && ex.radius === 246; })());
  // SP1: slower + more area, curve kept.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: true });
  syncArrays();
  check('SP1: curve flag kept on every shard', bullets.every((b) => b.pitchCurve === true));
  check('SP1: shards travel SLOWER (378 px/s = 540 x 0.7)', bullets.every((b) => Math.round(Math.hypot(b.vx, b.vy)) === 378));
  check('SP1: shards cover MORE area (327px range = 378 x 0.8645, vs 246px base)', bullets.every((b) => Math.round(Math.hypot(b.vx, b.vy) * b.maxLife) === 327));
  check('SP1: shards still deal 650', bullets.every((b) => b.damage === 650));
  // G1 + G2 still work on the release mechanic.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: true, echoArmed: true, curve: false });
  syncArrays();
  check('G1: Hex Cross still releases 8 shards (plus AND X)', bullets.length === 8);
  check('G2: Echo Hex still schedules a second release 300ms later', pitchPendingEchoes.length === 1 && pitchPendingEchoes[0].fireAt === nowMs + 300);
  nowMs += 300;
  sandbox.updatePitchSystems(0.016);
  syncArrays();
  check('G2: second release fires 4 more shards, still no landing damage', bullets.length === 12 && checkHitCalls.length === 0);
  // Hyper main still 8 shards.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: true, crossArmed: false, echoArmed: false, curve: false });
  syncArrays();
  check('Hyper main: still 8 shards (plus AND X, unchanged)', bullets.length === 8);
} catch (e) { failures.push('main release threw: ' + e.message); }

// --- executed: Super — 2 pigs, cap 4, zero cubes, hyper flies ---
try {
  resetWorld();
  playerEnt.powerCubes = 5; // owner loaded with cubes: pigs must not inherit them
  sandbox.castPitchSuper(playerEnt, false, 500, 0);
  syncArrays();
  check('super: exactly 2 pigs (was 4)', bots.length === 2);
  check('super: pigs carry ZERO power cubes even when the owner has 5', bots.every((p) => p.powerCubes === 0));
  check('super: non-Hyper pigs are grounded', bots.every((p) => p.pitchPigFlying === false && p.z === 0));
  // Hyper: still 2, both flying.
  resetWorld();
  playerEnt.powerCubes = 5;
  sandbox.castPitchSuper(playerEnt, true, 500, 0);
  syncArrays();
  check('hyper super: NO extra pigs — still 2', bots.length === 2);
  check('hyper super: both pigs spawn FLYING at 60px height', bots.every((p) => p.pitchPigFlying === true && p.z === 60));
  check('hyper super: flying pigs still carry ZERO power cubes', bots.every((p) => p.powerCubes === 0));
  // Cap 4 across Super + takedown pigs.
  resetWorld();
  sandbox.castPitchSuper(playerEnt, false, 500, 0);
  const firstPigId = bots[0].id;
  sandbox.pitchSpawnPig(playerEnt, 100, 100, false);
  sandbox.pitchSpawnPig(playerEnt, 200, 100, false);
  syncArrays();
  check('cap: 4 pigs fit (2 Super + 2 takedown)', bots.length === 4 && bots.some((p) => p.id === firstPigId));
  sandbox.pitchSpawnPig(playerEnt, 300, 100, false);
  syncArrays();
  check('cap: 5th pig evicts the oldest — cap is 4, not 6', bots.length === 4 && !bots.some((p) => p.id === firstPigId));
  // Takedown pigs never fly, even from a Hyper owner.
  resetWorld();
  playerEnt.isHypercharged = true;
  const victim = mkBot('e1', { x: 300, y: 200, lastDamagerId: 'p1' });
  check('kill: takedown pig spawns grounded (only Super pigs fly)', sandbox.pitchHandleKill(victim) === true && bots.some((p) => p.isPitchPig && p.pitchPigFlying === false));
} catch (e) { failures.push('super threw: ' + e.message); }

// --- executed: Hyper pig landing — 150 damage, then a normal pig ---
try {
  resetWorld();
  sandbox.castPitchSuper(playerEnt, true, 500, 0);
  syncArrays();
  const pig = bots[0];
  const enemy = mkBot('e1', { x: pig.x + 30, y: pig.y, hp: 5000 });
  sandbox.pitchPigLand(pig, enemy);
  check('landing: pig stops flying and drops to the ground (z 0, flag cleared)', pig.pitchPigFlying === false && pig.z === 0);
  check('landing: enemy takes exactly 150 landing damage', enemy.hp === 5000 - 150 && checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 150 && c.isPitchPigLanding === true));
  check('landing: damage credits Pitch (ownerBrawler pitch, owner p1)', checkHitCalls.some((c) => c.ownerBrawler === 'pitch'));
  check('landing: a landing poof is recorded (whitelisted pitchPigSpawn FX)', explosions.some((e) => e.fxKind === 'pitchPigSpawn' && e.radius === 56));
  // No enemy: lands clean, no damage, no crash.
  resetWorld();
  sandbox.castPitchSuper(playerEnt, true, 500, 0);
  syncArrays();
  const pig2 = bots[0];
  sandbox.pitchPigLand(pig2, null);
  check('landing: no enemy in range — lands with no damage', pig2.pitchPigFlying === false && pig2.z === 0 && checkHitCalls.length === 0);
  // Structures and pets never take landing damage.
  resetWorld();
  sandbox.castPitchSuper(playerEnt, true, 500, 0);
  syncArrays();
  const pig3 = bots[0];
  const structure = mkBot('s1', { x: pig3.x, y: pig3.y, isStructure: true });
  sandbox.pitchPigLand(pig3, structure);
  check('landing: structures never take landing damage', structure.hp === 5000 && checkHitCalls.length === 0);
} catch (e) { failures.push('hyper landing threw: ' + e.message); }

// --- executed: Showdown remaining count ignores pigs ---
try {
  const realA = mkEntity('a', { brawler: 'outlit' });
  const realB = mkEntity('b', { brawler: 'gravy' });
  const pitchPig = mkEntity('pg', { brawler: 'chickpig_pig', isPitchPig: true, isPet: true });
  const chickPig = mkEntity('cp', { brawler: 'chickpig_pig', isChickpigPig: true, isPet: true });
  check('showdown count: pigs filtered out, real fighters kept',
    sandbox.showdownCountedBots([realA, realB, pitchPig]).length === 2);
  check('showdown count: ONLY Pitch pigs are filtered (a chickpig pig still counts)',
    sandbox.showdownCountedBots([realA, chickPig]).length === 2);
  check('showdown count: a lone pig counts as ZERO brawlers remaining (match can end)',
    sandbox.showdownCountedBots([pitchPig]).length === 0);
  check('showdown count: empty / null input is safe',
    sandbox.showdownCountedBots([]).length === 0 && sandbox.showdownCountedBots(null).length === 0);
  check('showdown count: null entries are skipped', sandbox.showdownCountedBots([null, realA]).length === 1);
} catch (e) { failures.push('showdown count threw: ' + e.message); }

// --- executed: sequential season-quest unlock (no timer) ---
try {
  const q = (stage, completed) => ({ id: `xplodemis_${stage}`, stage, completed: !!completed, progress: 0, target: 1 });
  sandbox.playerData = { seasonPass: { quests: {
    xplodemis_01: q(1, false), xplodemis_02: q(2, false), xplodemis_03: q(3, false),
  } } };
  check('season unlock: stage 1 always open', sandbox.isSeasonQuestStageUnlocked({ stage: 1 }) === true);
  check('season unlock: stage 2 locked while stage 1 is incomplete', sandbox.isSeasonQuestStageUnlocked({ stage: 2 }) === false);
  sandbox.playerData.seasonPass.quests.xplodemis_01.completed = true;
  check('season unlock: stage 2 opens the MOMENT stage 1 completes (no timer, no wait)',
    sandbox.isSeasonQuestStageUnlocked({ stage: 2 }) === true);
  check('season unlock: stage 3 still locked until stage 2 completes', sandbox.isSeasonQuestStageUnlocked({ stage: 3 }) === false);
  check('season unlock: the answer does not depend on the date (Nov 20 vs Dec 31)',
    sandbox.isSeasonQuestStageUnlocked({ stage: 3 }, Date.UTC(2026, 10, 20)) === false
    && sandbox.isSeasonQuestStageUnlocked({ stage: 3 }, Date.UTC(2026, 11, 31)) === false);
} catch (e) { failures.push('season unlock threw: ' + e.message); }

// ---------------------------------------------------------- 3. quest XP math
// Season: Nov 20 – Dec 31, 2026 = 42 days = 6 weeks (from the real consts).
// Daily: 2–3 quests/day at +300 Pass XP. Weekly: 4 quests/week at +600.
// Pass total: 38,950 XP.
try {
  const startUtc = evalLiteral(extractConst(game, 'XPLODEMIS_START_UTC'));
  const endUtc = evalLiteral(extractConst(game, 'XPLODEMIS_END_UTC'));
  const totalXp = evalLiteral(extractConst(game, 'SEASON_PASS_TOTAL_XP'));
  const seasonDays = Math.round((endUtc - startUtc) / 86400000);
  const seasonWeeks = Math.round(seasonDays / 7);
  const dailyCountFn = extractFn(game, 'getDailyQuestCountForDay');
  const dailyMin = 2, dailyMax = 3; // 2 + hash%2 — asserted from the function text below
  const weeklyCount = 4;
  const passXpMatch = game.match(/rewards: weekly \? \{[^}]*passXP:(\d+) \} : \{[^}]*passXP:(\d+) \}/);
  const weeklyXp = Number(passXpMatch[1]);
  const dailyXp = Number(passXpMatch[2]);
  check('math: season is 42 days / 6 weeks (Nov 20 – Dec 31)', seasonDays === 42 && seasonWeeks === 6);
  check('math: pass total is 38,950 XP', totalXp === 38950);
  check('math: daily quest count is 2–3/day (seeded)', dailyCountFn.includes('return 2 + (hashShopKey(dayKey || getLocalDayKey()) % 2);'));
  check('math: weekly quests are 4/week', game.includes('buildRandomContractBucket(WEEKLY_CONTRACT_POOL, 4,'));
  check('math: daily +300 / weekly +600 Pass XP', dailyXp === 300 && weeklyXp === 600);
  const dailyMinSeason = dailyMin * dailyXp * seasonDays; // 2 x 300 x 42
  const dailyAvgSeason = 2.5 * dailyXp * seasonDays; // 2.5 x 300 x 42
  const dailyMaxSeason = dailyMax * dailyXp * seasonDays; // 3 x 300 x 42
  const weeklySeason = weeklyCount * weeklyXp * seasonWeeks; // 4 x 600 x 6
  const totalMin = dailyMinSeason + weeklySeason;
  const totalAvg = dailyAvgSeason + weeklySeason;
  const totalMax = dailyMaxSeason + weeklySeason;
  check(`math: daily quests pay ${dailyMinSeason}–${dailyMaxSeason} XP over the season (avg ${dailyAvgSeason})`,
    dailyMinSeason === 25200 && dailyAvgSeason === 31500 && dailyMaxSeason === 37800);
  check(`math: weekly quests pay ${weeklySeason} XP over the season`, weeklySeason === 14400);
  check(`math: daily+weekly MINIMUM (${totalMin}) already clears the 38,950 pass total`,
    totalMin === 39600 && totalMin >= totalXp);
  check(`math: daily+weekly AVERAGE (${totalAvg}) clears the pass with ${totalAvg - totalXp} XP to spare`,
    totalAvg === 45900 && totalAvg - totalXp === 6950);
  check(`math: daily+weekly MAXIMUM (${totalMax}) clears the pass`, totalMax === 52200 && totalMax >= totalXp);
  const xplodemisDefs = evalLiteral(extractConst(game, 'XPLODEMIS_QUEST_DEFS'));
  const seasonQuestXp = xplodemisDefs.reduce((s, d) => s + d.xpReward, 0);
  check(`math: season quests alone sum to exactly the pass total (${seasonQuestXp})`, seasonQuestXp === 38950);
  check('math: doing ALL quests (daily+weekly+season, avg pace) reaches 84,850 XP — overflow pays tappers per the overflow rule',
    totalAvg + seasonQuestXp === 84850);
} catch (e) { failures.push('quest XP math threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-pitch-rework-regression.mjs (${passed} checks)`);
