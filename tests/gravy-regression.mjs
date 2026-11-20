// Gravy regression — Thanksgiving Surprise Update, item 4 of 4 (the surprise).
// Anthony delegated the design ("surprise me"), so everything below is a
// builder pick, flagged for his correction.
// Locked design: Epic Thrower (170 souls), 5200 HP / 270 speed, reload
// 1.6s, Super charge 7 hits. Main "Gravy Glob": lobbed glob in an arc
// (FreeZeon rink-can pattern — a thrown object, not a bullet, so it arcs
// OVER walls), 1100 px/s, 620px throw range, 650 dmg in a 110px splash
// radius on landing, then leaves a slowing gravy pool (95px, 4s, 35% slow,
// 0.75s linger, max 3 per owner). Super "Gravy Boat": a wave floods 700px
// forward at 800 px/s, 190px wide; each enemy it passes through takes 900
// dmg once, is slowed 50% for 1.5s, and is pushed 140px forward; the wave
// leaves trail pools (60px, 2.5s) every 120px traveled. Hyper: pools are
// bigger (+40% radius, 133px) and last longer (6s), AND the main lobs an
// extra glob (2nd glob lands 80px to the side); Hyper Super wave is wider
// (240px), hits harder (1125), trail pools bigger (85px). G1 Extra Thick
// (14s): next glob splashes a bigger pool (+60% radius, +2s). G2 Gravy
// Ladle (16s): instantly splash a pool at your feet + 300 dmg to enemies
// in it. SP1 Rich & Savory: enemies in your pools take 40 dmg/s. SP2
// Seconds, Please: standing in your own pool heals you 150 HP/s.
// Voice lines are flavor-only (RULE ONE) and silent until Anthony picks a
// voice. Roster: Gravy makes 112 ids / 104 selectable. Pitch (2026-11-20) now makes 105 ids / 105 selectable. Pools/waves/globs
// affect brawlers only, never structures — and towers can NEVER gain HP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/gravy-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('roster includes gravy (105 ids)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon', 'driller', 'gravy'"));
check('selectable is 105 (105 ids, none disabled, gravy not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [];
  return all.length === 105 && all.filter(id => !disabled.includes(id)).length === 105;
})());
check('rarity Epic (170 souls)', game.includes("gravy: 'Epic',") && game.includes('Epic: 170'));
check('role Thrower (primary Artillery, like every Thrower)', game.includes("name: 'Gravy', role: 'Thrower'") && game.includes("gravy:'Artillery',"));
check('portrait icon present (pot of food, picked over meat)', game.includes("gravy: '🫕',"));
check('color warm brown-gold', game.includes("name: 'Gravy', role: 'Thrower', rarity: 'Epic', color: '#b45309'"));
check('stats branch 5200/650/270', game.includes("if (brawlerId === 'gravy') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(650 * scale), speed: 270'));
check('reload 1600ms', game.includes('gravy: 1600,'));
check('fire delay 300ms', game.includes('gravy: 300,'));
check('super charge 7 hits', game.includes('gravy: 7'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'gravy': {") && game.includes("name: 'Gravy'") && game.includes("attack: 'Gravy Glob'") && game.includes("super: 'Gravy Boat'") && game.includes("g1: 'Extra Thick") && game.includes("g2: 'Gravy Ladle") && game.includes("sp1: 'Rich & Savory") && game.includes("sp2: 'Seconds, Please") && !game.slice(game.indexOf("'gravy': {"), game.indexOf("'gravy': {") + 2600).includes('coming soon'));
check('card text matches the kit (lobbed glob, slowing pool, wave + trail pools, hyper extra glob)', game.includes('Gravy lobs a glob in an arc over walls. On landing it splashes for damage and leaves a slowing gravy pool.') && game.includes('Gravy sends a big gravy wave flooding forward') && game.includes('Hyper globs splash bigger pools that last longer, and the main lobs an extra glob.'));
check('gadget cooldown map entry', game.includes('gravy: { g1: 14000, g2: 16000 },'));
check('fire branch exists', game.includes("} else if (brawler === 'gravy') {") && game.includes('fireGravyMain(fromEntity, targetX, targetY, isBot);'));
check('player super dispatch', game.includes("if (combatBrawler === 'gravy') { castGravySuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'gravy') { castGravySuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2)', game.includes("curBrawler === 'gravy' && curGadget === 'g1'") && game.includes("curBrawler === 'gravy' && curGadget === 'g2'") && game.includes("executeGravyGadget(player, 'g2', false);"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'gravy' && g === 'g1'") && game.includes("bot.brawler === 'gravy' && g === 'g2'"));
check('bot super range gate: fire the wave inside its 700px reach', game.includes("if (bot.brawler === 'gravy') return distance < GRAVY_SUPER_RANGE;"));
check('slow hooks in getEntitySlowMultiplier (pool 0.65, wave 0.50)', game.includes("if (now < (entity.gravySlowUntil || 0)) baseSlow = Math.min(baseSlow, GRAVY_POOL_SLOW_MULT);") && game.includes("if (now < (entity.gravySuperSlowUntil || 0)) baseSlow = Math.min(baseSlow, GRAVY_SUPER_SLOW_MULT);"));
check('update loop calls updateGravySystems', game.includes('if (playing && !gameOver) updateGravySystems(dt);'));
check('render calls renderGravyEffects', game.includes('    renderGravyEffects();'));
check('reset sites clear the Gravy arrays (.length = 0 site)', game.includes('gravyPools.length = 0; gravyWaves.length = 0; gravyThrownGlobs.length = 0;'));
check('reset sites clear the Gravy arrays (all 3 = [] sites)', (game.match(/gravyPools = \[\]; gravyWaves = \[\]; gravyThrownGlobs = \[\];/g) || []).length === 3);
check('splash render branch keys off the real Hyper state (purple when Hyper)', (() => {
  const start = game.indexOf("if (ex.fxKind === 'gravySplash') {");
  const end = game.indexOf("if (ex.fxKind === 'rankedRocketeerBurst') {", start);
  const branch = game.slice(start, end);
  return start !== -1 && branch.includes("ctx.strokeStyle = ex.hyper ? '#c084fc' : '#fbbf24';") && branch.includes('continue;');
})());
check('portrait body-art branch (chef hat + apron + gravy boat)', game.includes("if (brawlerId === 'gravy') {") && game.includes("ctx.fillStyle = '#92400e';") && game.includes("ctx.fillStyle = '#fff';") && game.includes("ctx.ellipse(entity.x + size * 0.26, drawY - size * 0.05, size * 0.09, size * 0.06, -0.4, 0, Math.PI * 2);"));
check('constants: glob 1100/620/110/650/80, pool 95/133/4000/6000/0.65/750, cap 3, tick 250', game.includes('const GRAVY_GLOB_SPEED = 1100;') && game.includes('const GRAVY_GLOB_THROW_RANGE = 620;') && game.includes('const GRAVY_GLOB_SPLASH_RADIUS = 110;') && game.includes('const GRAVY_GLOB_DMG = 650;') && game.includes('const GRAVY_GLOB_ARC_HEIGHT = 80;') && game.includes('const GRAVY_POOL_RADIUS = 95;') && game.includes('const GRAVY_POOL_RADIUS_HYPER = 133;') && game.includes('const GRAVY_POOL_DURATION_MS = 4000;') && game.includes('const GRAVY_POOL_DURATION_HYPER_MS = 6000;') && game.includes('const GRAVY_POOL_SLOW_MULT = 0.65;') && game.includes('const GRAVY_POOL_SLOW_LINGER_MS = 750;') && game.includes('const GRAVY_MAX_POOLS_PER_OWNER = 3;') && game.includes('const GRAVY_POOL_TICK_MS = 250;'));
check('constants: wave 700/800/190/240/900/1125, slow 0.50/1500, push 140, trail 120/60/85/2500', game.includes('const GRAVY_SUPER_RANGE = 700;') && game.includes('const GRAVY_SUPER_SPEED = 800;') && game.includes('const GRAVY_SUPER_WIDTH = 190;') && game.includes('const GRAVY_SUPER_WIDTH_HYPER = 240;') && game.includes('const GRAVY_SUPER_DMG = 900;') && game.includes('const GRAVY_SUPER_DMG_HYPER = 1125;') && game.includes('const GRAVY_SUPER_SLOW_MULT = 0.50;') && game.includes('const GRAVY_SUPER_SLOW_DURATION_MS = 1500;') && game.includes('const GRAVY_SUPER_PUSH = 140;') && game.includes('const GRAVY_SUPER_TRAIL_EVERY_PX = 120;') && game.includes('const GRAVY_SUPER_TRAIL_RADIUS = 60;') && game.includes('const GRAVY_SUPER_TRAIL_RADIUS_HYPER = 85;') && game.includes('const GRAVY_SUPER_TRAIL_DURATION_MS = 2500;'));
check('constants: G1 x1.6/+2000ms, G2 300, SP1 40/s, SP2 150/s, extra glob offset 80', game.includes('const GRAVY_G1_POOL_RADIUS_MULT = 1.6;') && game.includes('const GRAVY_G1_POOL_DURATION_BONUS_MS = 2000;') && game.includes('const GRAVY_G2_DMG = 300;') && game.includes('const GRAVY_SP1_POOL_DOT_PER_S = 40;') && game.includes('const GRAVY_SP2_POOL_HEAL_PER_S = 150;') && game.includes('const GRAVY_HYPER_EXTRA_GLOB_OFFSET = 80;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function gravyHasSP1(entity) { return gravyStarChoice(entity) === 'slow'; }") && game.includes("function gravyHasSP2(entity) { return gravyStarChoice(entity) === 'long'; }"));
check('pools/waves never touch structures (guards in the Gravy block)', (() => {
  const start = game.indexOf('// ===== Gravy systems');
  const end = game.indexOf('// ===== Christmas Showdown buffs');
  const body = game.slice(start, end);
  return (body.match(/if \(target\.isStructure \|\| target\.isPet\) continue;/g) || []).length >= 3 && body.includes('if (areAlliedEntities(owner, target)) continue;');
})());
check('SP2 heal is owner-only and capped at max HP (never structures/towers)', (() => {
  const start = game.indexOf('// ===== Gravy systems');
  const end = game.indexOf('// ===== Christmas Showdown buffs');
  const body = game.slice(start, end);
  return body.includes("if (target.id === owner.id) {") && body.includes('target.hp = Math.min(target.maxHp, target.hp + Math.round(GRAVY_SP2_POOL_HEAL_PER_S * GRAVY_POOL_TICK_MS / 1000));');
})());
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/gravy-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweGravyVoice?.play('attack')") && game.includes("BraweGravyVoice?.play('kill')") && game.includes("BraweGravyVoice?.play('super')") && game.includes('updateGravyVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('voice module is a silent no-op until Anthony picks a voice', voiceModule.includes('No voice selected yet: silent no-op') && voiceModule.includes('window.BraweGravyVoiceClip'));

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
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: (...args) => { calls.push({ m: String(prop) + '.addColorStop', args }); } });
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}

let nowMs = 100000;
const floatingTexts = [];
const checkHitCalls = [];
const voicePlays = [];
const knockbacks = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let gravyPools = [];
let gravyWaves = [];
let gravyThrownGlobs = [];
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
  gravyPools = [];
  gravyWaves = [];
  gravyThrownGlobs = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  voicePlays.length = 0;
  knockbacks.length = 0;
  nowMs = 100000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'gravy', x: 0, y: 0, hp: 5200, maxHp: 5200 });
  botEnts = [];
  sandbox.player = playerEnt;
  sandbox.bots = botEnts;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.gravyPools = gravyPools;
  sandbox.gravyWaves = gravyWaves;
  sandbox.gravyThrownGlobs = gravyThrownGlobs;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'gravy';
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.gravyVoicePrevPlaying = false;
  sandbox.gravyVoicePrevGameOver = false;
  sandbox.gravyVoiceMatchEndPlayed = false;
  sandbox.gravyVoiceLastHp = null;
  sandbox.gravyVoiceLastActionAt = 0;
  sandbox.gravyVoiceLastIdleAt = 0;
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
// updateGravySystems reassigns the pool array (filter) — re-sync the local refs.
function syncGravyArrays() {
  gravyPools = sandbox.gravyPools;
  gravyWaves = sandbox.gravyWaves;
  gravyThrownGlobs = sandbox.gravyThrownGlobs;
}

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getScaledStats: (id, lvl) => id === 'gravy' ? { hp: 5200, dmg: 650, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler, isGravyWave: !!synth.isGravyWave, isGravyPoolDot: !!synth.isGravyPoolDot });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  applyKnockback: (entity, sourceX, sourceY, distance) => {
    knockbacks.push({ targetId: entity.id, sourceX, sourceY, distance });
    const dx = entity.x - sourceX;
    const dy = entity.y - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    entity.x += (dx / len) * distance;
    entity.y += (dy / len) * distance;
    return true;
  },
  isFusedEntity: (e) => !!e && Array.isArray(e.fusedParts) && e.fusedParts.length === 2,
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  gravyPools: [],
  gravyWaves: [],
  gravyThrownGlobs: [],
  isHypercharged: false,
  selectedBrawler: 'gravy',
  playing: false,
  gameOver: false,
  gravyVoicePrevPlaying: false,
  gravyVoicePrevGameOver: false,
  gravyVoiceMatchEndPlayed: false,
  gravyVoiceLastHp: null,
  gravyVoiceLastActionAt: 0,
  gravyVoiceLastIdleAt: 0,
  window: { BraweGravyVoice: { play: (kind) => { voicePlays.push(kind); } } },
  ctx: null,
};
// Pull every GRAVY_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (GRAVY_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'gravyLevelScale', 'gravyStarChoice', 'gravyHasSP1', 'gravyHasSP2', 'isGravy',
    'gravyFindOwner', 'gravySpawnPool', 'fireGravyMain', 'gravyLandGlob',
    'castGravySuper', 'executeGravyGadget', 'updateGravySystems',
    'renderGravyEffects', 'updateGravyVoiceState',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + level scale + isGravy + owner lookup ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.gravyHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.gravyHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.gravyHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.gravyHasSP2({ selectedStar: 'slow' }) === false);
  check('level scale: P11 = 1.0', near(sandbox.gravyLevelScale({ level: 11 }), 1.0));
  check('level scale: L1 = 0.55', near(sandbox.gravyLevelScale({ level: 1 }), 0.55));
  check('isGravy: brawler id matches', sandbox.isGravy({ id: 'x', brawler: 'gravy' }) === true);
  check('isGravy: player with gravy selected matches', sandbox.isGravy(playerEnt) === true);
  check('isGravy: other brawler does not match', sandbox.isGravy({ id: 'y', brawler: 'outlit' }) === false);
  check('owner lookup: player by id', sandbox.gravyFindOwner('p1') === playerEnt);
  const bot = mkBot('e1', { x: 100, y: 0 });
  check('owner lookup: bot by id', sandbox.gravyFindOwner('e1') === bot);
  check('owner lookup: unknown id is null', sandbox.gravyFindOwner('nope') === null);
} catch (e) { failures.push('SP gates/level scale/isGravy threw: ' + e.message); }

// --- executed: main attack (lobbed glob 1100 px/s, 620px throw range) ---
try {
  resetWorld();
  // Stand mid-arena so no world clamp interferes with the aim.
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.fireGravyMain(playerEnt, 900, 500, false);
  check('main: one lobbed glob in flight (not a bullet)', gravyThrownGlobs.length === 1 && bullets.length === 0);
  const glob = gravyThrownGlobs[0];
  check('main: glob targets the aimed point', glob.targetX === 900 && glob.targetY === 500);
  check('main: glob flight time is 400px / 1100px/s (~364ms)', near(glob.impactAt - glob.createdAt, 400 / 1100 * 1000, 1));
  check('main: glob is not Hyper, not Thick by default', glob.hyper === false && glob.thickArmed === false);
  check('main: glob starts at the owner', glob.startX === 500 && glob.startY === 500);
  // Throw range clamps: aiming 1500px away lands at 620px.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.fireGravyMain(playerEnt, 2000, 500, false);
  check('main: aim past 620px clamps to the 620px throw range', gravyThrownGlobs[0].targetX === 1120 && gravyThrownGlobs[0].targetY === 500 && near(gravyThrownGlobs[0].impactAt - gravyThrownGlobs[0].createdAt, 620 / 1100 * 1000, 1));
  // Hyper: an extra glob lands 80px to the side (perpendicular).
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.isHypercharged = true;
  sandbox.fireGravyMain(playerEnt, 900, 500, false);
  check('main (Hyper): two globs in flight', gravyThrownGlobs.length === 2);
  check('main (Hyper): first glob lands on the aim point', gravyThrownGlobs[0].targetX === 900 && gravyThrownGlobs[0].targetY === 500);
  check('main (Hyper): extra glob lands 80px to the side', gravyThrownGlobs[1].targetX === 900 && gravyThrownGlobs[1].targetY === 580);
  check('main (Hyper): both globs carry the real Hyper state', gravyThrownGlobs.every((g) => g.hyper === true));
  check('main (Hyper): both globs land at the same time', gravyThrownGlobs[0].impactAt === gravyThrownGlobs[1].impactAt);
  // G1 arming is consumed on fire and rides the glob.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.gravyThickArmed = true;
  sandbox.fireGravyMain(playerEnt, 900, 500, false);
  check('main (G1): armed glob carries Extra Thick, flag consumed', gravyThrownGlobs[0].thickArmed === true && playerEnt.gravyThickArmed === false);
  // Bot Hyper uses the bot's own hyper flag.
  resetWorld();
  const botOwner = mkBot('b1', { team: 'enemy', brawler: 'gravy', x: 0, y: 0, isHypercharged: true });
  sandbox.fireGravyMain(botOwner, 400, 0, true);
  check('main (bot Hyper): bot glob carries Hyper + extra glob', gravyThrownGlobs.length === 2 && gravyThrownGlobs[0].hyper === true);
} catch (e) { failures.push('main attack threw: ' + e.message); }

// --- executed: glob landing (splash 650 + pool 95px/4s, brawlers only) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 200, y: 100 });
  const far = mkBot('e2', { x: 400, y: 100 });
  const structure = mkBot('s1', { x: 200, y: 100, isStructure: true });
  const ally = mkAlly('a1', { x: 200, y: 100 });
  sandbox.gravyLandGlob({ targetX: 200, targetY: 100, ownerId: 'p1', hyper: false, thickArmed: false });
  syncGravyArrays();
  check('landing: enemy in the 110px splash takes 650', enemy.hp === 5000 - 650 && checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 650));
  check('landing: enemy 200px past the splash is untouched', far.hp === 5000);
  check('landing: structures are never splashed', structure.hp === 5000);
  check('landing: allies are never splashed', ally.hp === 5000);
  check('landing: one pool forms at the landing spot (95px, 4s)', gravyPools.length === 1 && gravyPools[0].x === 200 && gravyPools[0].y === 100 && gravyPools[0].radius === 95 && gravyPools[0].until === nowMs + 4000);
  check('landing: splash explosion carries the real Hyper state (not Hyper)', (() => { const ex = explosions.find((e) => e.fxKind === 'gravySplash'); return ex && ex.hyper === false && ex.radius === 110; })());
  check('landing: GRAVY! floating text', floatingTexts.some((t) => t.text === '🫕 GRAVY!'));
  // Hyper glob: bigger pool, longer duration, purple splash.
  resetWorld();
  mkBot('e1', { x: 200, y: 0 });
  sandbox.gravyLandGlob({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: true, thickArmed: false });
  syncGravyArrays();
  check('landing (Hyper): pool is 133px and lasts 6s', gravyPools.length === 1 && gravyPools[0].radius === 133 && gravyPools[0].until === nowMs + 6000);
  check('landing (Hyper): splash explosion + text carry the real Hyper state', (() => { const ex = explosions.find((e) => e.fxKind === 'gravySplash'); return ex && ex.hyper === true; })() && floatingTexts.some((t) => t.text === '🫕 RICH GRAVY!'));
  // Thick glob: +60% radius, +2s duration.
  resetWorld();
  sandbox.gravyLandGlob({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, thickArmed: true });
  syncGravyArrays();
  check('landing (G1 Thick): pool is 152px (+60%) and lasts 6s (+2s)', gravyPools.length === 1 && gravyPools[0].radius === 152 && gravyPools[0].until === nowMs + 6000);
  // Hyper + Thick stack: 133 * 1.6 = 213px, 8s.
  resetWorld();
  sandbox.gravyLandGlob({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: true, thickArmed: true });
  syncGravyArrays();
  check('landing (Hyper+G1): pool is 213px and lasts 8s', gravyPools.length === 1 && gravyPools[0].radius === 213 && gravyPools[0].until === nowMs + 8000);
  // Dead owner mid-flight: no damage, no pool — but the splash still shows.
  resetWorld();
  playerEnt.hp = 0;
  mkBot('e1', { x: 200, y: 0 });
  sandbox.gravyLandGlob({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, thickArmed: false });
  syncGravyArrays();
  check('landing (owner dead): no damage, no pool, splash still shows', checkHitCalls.length === 0 && gravyPools.length === 0 && explosions.some((e) => e.fxKind === 'gravySplash'));
  // Pool cap: 4th pool evicts the oldest.
  resetWorld();
  for (let i = 0; i < 4; i++) sandbox.gravySpawnPool(playerEnt, 100 + i * 300, 0, 95, 4000, false);
  syncGravyArrays();
  check('pools: cap is 3 per owner (oldest expires)', gravyPools.length === 3 && gravyPools[0].x === 400 && gravyPools[2].x === 1000);
  // Pools expire after their duration.
  resetWorld();
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  nowMs += 4001;
  sandbox.updateGravySystems(0.016);
  syncGravyArrays();
  check('pools: expired pool is gone after 4s', gravyPools.length === 0);
} catch (e) { failures.push('glob landing threw: ' + e.message); }

// --- executed: pool ticks (slow 35% + linger, SP1 DoT, SP2 self-heal) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.updateGravySystems(0.016);
  syncGravyArrays();
  check('pool tick: enemy standing in the pool is slowed (until now + 750ms)', enemy.gravySlowUntil === nowMs + 750);
  check('pool tick: no SP1, no DoT damage', checkHitCalls.length === 0 && enemy.hp === 5000);
  // Next tick 250ms later refreshes the slow.
  nowMs += 300;
  sandbox.updateGravySystems(0.016);
  check('pool tick: slow refreshes on the next tick', enemy.gravySlowUntil === nowMs + 750);
  // Enemy steps out: slow lingers, then lapses (no refresh once outside).
  enemy.x = 1000;
  nowMs += 300;
  sandbox.updateGravySystems(0.016);
  check('pool tick: stepping out stops the refresh (linger runs out)', enemy.gravySlowUntil === nowMs - 300 + 750);
  // SP1: 40 dmg/s = 10 per 250ms tick.
  resetWorld();
  playerEnt.selectedStar = 'slow';
  const sp1Enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.updateGravySystems(0.016);
  check('pool tick (SP1): enemy takes 10 dmg per tick (40/s)', sp1Enemy.hp === 5000 - 10 && checkHitCalls.some((c) => c.isGravyPoolDot && c.damage === 10));
  nowMs += 300;
  sandbox.updateGravySystems(0.016);
  check('pool tick (SP1): second tick deals another 10', sp1Enemy.hp === 5000 - 20);
  // SP1 never burns structures, pets, or allies standing in the pool.
  resetWorld();
  playerEnt.selectedStar = 'slow';
  const st = mkBot('s1', { x: 200, y: 0, isStructure: true });
  const pet = mkBot('p1', { x: 200, y: 0, isPet: true });
  const al = mkAlly('a1', { x: 200, y: 0 });
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.updateGravySystems(0.016);
  check('pool tick (SP1): structures, pets, allies take no DoT and no slow', st.hp === 5000 && pet.hp === 5000 && al.hp === 5000 && st.gravySlowUntil === undefined && pet.gravySlowUntil === undefined && al.gravySlowUntil === undefined && checkHitCalls.length === 0);
  // SP2: owner heals 38 per tick (150/s) in his own pool, capped at max HP.
  resetWorld();
  playerEnt.selectedStar = 'long';
  playerEnt.hp = 4000;
  playerEnt.x = 200; playerEnt.y = 0;
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.updateGravySystems(0.016);
  check('pool tick (SP2): owner heals 38 per tick (150/s) in his own pool', playerEnt.hp === 4038);
  playerEnt.hp = 5190;
  nowMs += 300;
  sandbox.updateGravySystems(0.016);
  check('pool tick (SP2): heal caps at max HP', playerEnt.hp === 5200);
  // SP2 does not heal in someone else's pool, and no SP2 means no heal.
  resetWorld();
  playerEnt.selectedStar = 'none';
  playerEnt.hp = 4000;
  playerEnt.x = 200; playerEnt.y = 0;
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.updateGravySystems(0.016);
  check('pool tick (no SP2): owner does not heal in his own pool', playerEnt.hp === 4000);
} catch (e) { failures.push('pool ticks threw: ' + e.message); }

// --- executed: Super Gravy Boat (wave 700px, 900 dmg, 50% slow, 140px push, trail pools) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 100, y: 0 });
  const wide = mkBot('e2', { x: 100, y: 150 });
  check('super: no wave before cast', gravyWaves.length === 0);
  check('super: cast returns true and starts a wave at the owner', sandbox.castGravySuper(playerEnt, false, 500, 0) === true && gravyWaves.length === 1 && gravyWaves[0].x === 0 && gravyWaves[0].y === 0);
  check('super: wave aims at the target (angle 0)', near(gravyWaves[0].ang, 0));
  check('super: wave is not Hyper', gravyWaves[0].hyper === false);
  sandbox.updateGravySystems(0.016); // wave moves 12.8px; enemy at 100px is inside the 95+14 reach
  syncGravyArrays();
  check('wave: enemy in the wave path takes 900 once', checkHitCalls.length === 1 && checkHitCalls[0].damage === 900 && checkHitCalls[0].isGravyWave === true && enemy.hp === 5000 - 900);
  check('wave: enemy is slowed 50% for 1.5s', enemy.gravySuperSlowUntil === nowMs + 1500);
  check('wave: enemy is pushed 140px forward (along the wave)', knockbacks.length === 1 && knockbacks[0].distance === 140 && near(enemy.x, 100 + 140));
  check('wave: enemy 150px to the side is untouched (width 190 -> 95 + 14 reach)', wide.hp === 5000 && checkHitCalls.length === 1);
  // Second tick: no re-hit on the same enemy (hitIds).
  sandbox.updateGravySystems(0.016);
  check('wave: same enemy is not hit twice', checkHitCalls.length === 1);
  // Trail pools: one every 120px traveled.
  resetWorld();
  sandbox.castGravySuper(playerEnt, false, 700, 0);
  for (let i = 0; i < 10; i++) { sandbox.updateGravySystems(0.016); syncGravyArrays(); } // 128px traveled
  check('wave: first trail pool after 120px (60px, 2.5s)', gravyPools.length === 1 && gravyPools[0].radius === 60 && gravyPools[0].until === nowMs + 2500);
  for (let i = 0; i < 10; i++) { sandbox.updateGravySystems(0.016); syncGravyArrays(); } // 256px traveled
  check('wave: second trail pool after 240px', gravyPools.length === 2);
  // Wave expires at 700px.
  resetWorld();
  sandbox.castGravySuper(playerEnt, false, 700, 0);
  for (let i = 0; i < 60; i++) { nowMs += 16; sandbox.updateGravySystems(0.016); syncGravyArrays(); }
  check('wave: wave is gone after traveling 700px', gravyWaves.length === 0);
  // Hyper wave: wider, harder, bigger trail pools.
  resetWorld();
  const hyperEnemy = mkBot('e1', { x: 50, y: 110 }); // outside normal 95+14=109 (116px away), inside Hyper 120+14=134
  sandbox.castGravySuper(playerEnt, true, 700, 0);
  sandbox.updateGravySystems(0.016);
  syncGravyArrays();
  check('wave (Hyper): wider wave (240px) catches an enemy 110px to the side', checkHitCalls.length === 1 && checkHitCalls[0].damage === 1125);
  check('wave (Hyper): trail pools are 85px', (() => { for (let i = 0; i < 10; i++) { sandbox.updateGravySystems(0.016); syncGravyArrays(); } return gravyPools.length === 1 && gravyPools[0].radius === 85; })());
  // Dead entity cannot cast.
  resetWorld();
  playerEnt.hp = 0;
  check('super: dead entity cannot cast', sandbox.castGravySuper(playerEnt, false, 500, 0) === false && gravyWaves.length === 0);
  // Wave never hits structures, pets, or allies.
  resetWorld();
  sandbox.castGravySuper(playerEnt, false, 700, 0);
  mkBot('s1', { x: 100, y: 0, isStructure: true });
  mkBot('p1', { x: 100, y: 0, isPet: true });
  mkAlly('a1', { x: 100, y: 0 });
  sandbox.updateGravySystems(0.016);
  check('wave: structures, pets, allies are never hit or pushed', checkHitCalls.length === 0 && knockbacks.length === 0);
} catch (e) { failures.push('super wave threw: ' + e.message); }

// --- executed: gadgets (G1 Extra Thick arm, G2 Gravy Ladle) ---
try {
  resetWorld();
  const owner = playerEnt;
  check('gadget G1: arms Extra Thick', sandbox.executeGravyGadget(owner, 'g1', false) === true && owner.gravyThickArmed === true);
  check('gadget G1: floating text', floatingTexts.some((t) => t.text === '🍖 EXTRA THICK!'));
  sandbox.fireGravyMain(owner, 400, 0, false);
  check('gadget G1: armed glob carries Thick, then the flag is gone', gravyThrownGlobs[0].thickArmed === true && owner.gravyThickArmed === false);
  // G2: pool at your feet + 300 dmg to enemies in it.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  const near = mkBot('e1', { x: 550, y: 500 });
  const far = mkBot('e2', { x: 1000, y: 500 });
  check('gadget G2: ladle splashes a pool at your feet', sandbox.executeGravyGadget(playerEnt, 'g2', false) === true && gravyPools.length === 1 && gravyPools[0].x === 500 && gravyPools[0].y === 500 && gravyPools[0].radius === 95);
  check('gadget G2: nearby enemy takes 300', near.hp === 5000 - 300);
  check('gadget G2: far enemy is untouched', far.hp === 5000);
  check('gadget G2: splash explosion + text', explosions.some((e) => e.fxKind === 'gravySplash' && e.hyper === false) && floatingTexts.some((t) => t.text === '🥄 GRAVY LADLE!'));
  // G2 never damages structures or allies at your feet.
  resetWorld();
  const st = mkBot('s1', { x: 50, y: 0, isStructure: true });
  const al = mkAlly('a1', { x: 50, y: 0 });
  sandbox.executeGravyGadget(playerEnt, 'g2', false);
  check('gadget G2: structures and allies at your feet are untouched', st.hp === 5000 && al.hp === 5000 && checkHitCalls.length === 0);
  check('gadget: unknown gadget returns false', sandbox.executeGravyGadget(playerEnt, 'g3', false) === false);
  check('gadget: null entity returns false', sandbox.executeGravyGadget(null, 'g1', false) === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: glob flight (thrown globs land via updateGravySystems) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 400, y: 0 });
  sandbox.fireGravyMain(playerEnt, 400, 0, false);
  const glob = gravyThrownGlobs[0];
  nowMs += 100; // still flying (impact at ~364ms)
  sandbox.updateGravySystems(0.016);
  syncGravyArrays();
  check('flight: glob still flying before impact, no damage yet', gravyThrownGlobs.length === 1 && checkHitCalls.length === 0 && gravyPools.length === 0);
  nowMs = glob.impactAt; // land
  sandbox.updateGravySystems(0.016);
  syncGravyArrays();
  check('flight: glob lands on impact (splash + pool)', gravyThrownGlobs.length === 0 && enemy.hp === 5000 - 650 && gravyPools.length === 1);
  // Armed flag clears on death.
  resetWorld();
  playerEnt.gravyThickArmed = true;
  playerEnt.hp = 0;
  sandbox.updateGravySystems(0.016);
  check('flight: armed flag clears when the owner dies', playerEnt.gravyThickArmed === false);
} catch (e) { failures.push('glob flight threw: ' + e.message); }

// --- executed: render with REAL state (never a faked flag) ---
try {
  resetWorld();
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.gravySpawnPool(playerEnt, 200, 0, 95, 4000, false);
  sandbox.fireGravyMain(playerEnt, 400, 0, false);
  sandbox.castGravySuper(playerEnt, false, 700, 0);
  sandbox.renderGravyEffects();
  check('render: draws without throwing (pool + glob + wave)', s1.calls.length > 0);
  check('render: pool ring uses the real brown-gold color', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#b45309'));
  check('render: wave leading edge uses the real gold color (not Hyper)', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#fbbf24'));
  // Hyper state: hyper pool + hyper wave + hypercharged owner -> purple.
  resetWorld();
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.isHypercharged = true;
  playerEnt.isHypercharged = true;
  sandbox.gravySpawnPool(playerEnt, 200, 0, 133, 6000, true);
  sandbox.castGravySuper(playerEnt, true, 700, 0);
  sandbox.renderGravyEffects();
  check('render (Hyper): pool ring uses the real purple Hyper color', s2.sets.some((s) => s.p === 'strokeStyle' && s.v === '#c084fc'));
  check('render (Hyper): wave leading edge uses the real purple Hyper color', s2.sets.filter((s) => s.p === 'strokeStyle' && s.v === '#c084fc').length >= 2);
  check('render (Hyper): aura ring draws around the hypercharged owner', s2.calls.some((c) => c.m === 'arc'));
  // Non-Hyper owner: no purple anywhere.
  resetWorld();
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.renderGravyEffects();
  check('render (no state): no purple Hyper color when nothing is Hyper', !s3.sets.some((s) => s.v === '#c084fc'));
} catch (e) { failures.push('render threw: ' + e.message); }

// --- executed: voice watcher (spawn / hurt / win / death / idle) ---
try {
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGravyVoiceState();
  check('voice: spawn line on match start', voicePlays.includes('spawn'));
  nowMs += 1000;
  playerEnt.hp = 4000; // hurt
  sandbox.updateGravyVoiceState();
  check('voice: hurt line on HP drop', voicePlays.includes('hurt'));
  // Win: game over with HP left.
  sandbox.gameOver = true;
  sandbox.updateGravyVoiceState();
  check('voice: win line on game over with HP left', voicePlays.includes('win'));
  // Death: game over with no HP.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGravyVoiceState();
  playerEnt.hp = 0;
  sandbox.gameOver = true;
  sandbox.updateGravyVoiceState();
  check('voice: death line + SPILLED! text on game over with no HP', voicePlays.includes('death') && floatingTexts.some((t) => t.text === '🫕 SPILLED!'));
  // Idle: 20s without moving or attacking.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGravyVoiceState();
  nowMs += 21000;
  sandbox.updateGravyVoiceState();
  check('voice: idle line after 20s of no action', voicePlays.includes('idle'));
  // Non-Gravy selected: no lines at all.
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  sandbox.playing = true;
  sandbox.updateGravyVoiceState();
  sandbox.gameOver = true;
  sandbox.updateGravyVoiceState();
  check('voice: nothing plays when Gravy is not selected', voicePlays.length === 0);
} catch (e) { failures.push('voice watcher threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS gravy-regression.mjs (${passed} checks)`);
