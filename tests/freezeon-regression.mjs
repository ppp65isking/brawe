// FreeZeon regression — ordered 2026-11-15 (builder picks, flagged for
// his correction). Anthony's core kit is authoritative; everything else
// below is a builder pick.
// Locked design: Epic Controller (170 souls), 5200 HP / 270 speed, 500 base
// main damage. Main "Snow Cones": 4 cones alternating LEFT/RIGHT of the
// aim line (Tree Freeze nerf 2026-11-18 — Lou fires 3 in a line, FreeZeon
// fires 4 with a slight zigzag; changes round 1 had a straight line), fired
// SEQUENTIALLY one every 90ms (changes round 2 — Lou-style, so the volley
// reads cone-by-cone), 720 px/s (Tree Freeze nerf: was 780), 700px range;
// the volley origin is snapshotted at fire time, so the volley is identical
// whether the owner is moving or standing still. Every cone leaves a
// 1-second slip zone (72px after the round-1 -40%) where it lands (on
// enemy hit, on a wall, or at max range), and every cone hit builds the
// freeze meter (+15 per hit — ~7 hits freeze, was 25 / 4 hits).
// Enemies inside a slip zone keep sliding in the direction they were
// moving. Super "Ice Rink": LOBBED throwable (changes round 1 — the rink
// can arcs to the target, 560px throw range) that bursts on landing for
// 800 impact damage, then stays as a patch (radius 260px, lasts 6s,
// 30/s DoT) that freezes anyone standing in it — 2s standing freezes
// them solid for 1s (progress resets on freeze, 2.5s immunity after,
// buildup decays after 2s without a tick). The patch also slides enemies
// like the slip zones. Freeze completion fires a REAL ice-explosion
// visual (purple when the owner is Hypercharged — keyed off the real
// hyper state, never a faked flag). Hyper Super "Deep Freeze": the
// rink freezes twice as fast (1s standing) and melts enemies inside for
// 150/s. Hyper main: every cone hit schedules a brain-freeze shatter 0.6s
// later — 90px radius (changes round 2: -40%), 600 damage, REAL
// ice-crystal visual (purple when the owner is Hypercharged at
// detonation — keyed off the real hyper state, never a faked flag),
// centered on the hit enemy's CURRENT spot (up to 4 shatters per
// attack). G1 Cryo Syrup
// (14s): instantly freeze everyone standing in your rink. G2 Extra Scoop
// (16s): next main fires 6 cones instead of 4. SP1 Supercool (SP rework
// 2026-11-18): the active rink shoots snowballs — 300 damage + 12 freeze
// each, one per 0.8s. SP2 Hypothermia (SP rework 2026-11-18): enemies
// standing in a slip zone build up to 8 freeze each. Voice lines are
// flavor-only (RULE ONE) and
// silent until Anthony picks a voice. Roster: FreeZeon makes 110 ids / 102
// selectable (109/101 + 1). Driller (2026-11-16) now makes 111 ids / 103 selectable. Gravy (2026-11-16) now makes 112 ids / 104 selectable. Delete-disabled (2026-11-16) now makes 104 ids / 104 selectable. Pitch (2026-11-20) now makes 105 ids / 105 selectable. Spritz (2026-11-22) now makes 106 ids / 106 selectable. Slip/freeze affect brawlers only, never
// structures. Known limitation (flagged, not a spec deviation): in Fused
// mode the component fires the normal main attack instead (no fused
// override — the fire() branch runs for the fused part as normal).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/freezeon-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('roster includes freezeon (106 ids with Gravy + Pitch)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon'"));
check('selectable is 106 (106 ids, none disabled, freezeon not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [];
  return all.length === 106 && all.filter(id => !disabled.includes(id)).length === 106;
})());
check('rarity Epic (170 souls)', game.includes("freezeon: 'Epic',") && game.includes('Epic: 170'));
check('role Controller', game.includes("freezeon:'Controller',"));
check('portrait icon present', game.includes("freezeon: '⛄',"));
check('stats branch 5200/500/270', game.includes("if (brawlerId === 'freezeon') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(500 * scale), speed: 270'));
check('reload 1600ms', game.includes('freezeon: 1600,'));
check('fire delay 300ms', game.includes('freezeon: 300,'));
check('super charge 7 hits', game.includes('freezeon: 7'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'freezeon': {") && game.includes("name: 'FreeZeon'") && game.includes("attack: 'Snow Cones'") && game.includes("super: 'Ice Rink'") && game.includes("g1: 'Cryo Syrup") && game.includes("g2: 'Extra Scoop") && game.includes("sp1: 'Supercool") && game.includes("sp2: 'Hypothermia") && !game.slice(game.indexOf("'freezeon': {"), game.indexOf("'freezeon': {") + 2600).includes('coming soon'));
check('card text matches the kit (4 cones + slip zone, rink impact + freeze, hyper deep freeze + shatter)', game.includes("FreeZeon hurls 4 snow cones that leave a slippery patch where they land.") && game.includes('FreeZeon hurls a frozen rink that bursts on impact, leaving a slippery ice patch that freezes anyone standing in it.') && game.includes('Deep Freeze: the rink freezes twice as fast and melts enemies over time, and cone hits burst into a brain-freeze shatter.'));
check('gadget cooldown map entry', game.includes('freezeon: { g1: 14000, g2: 16000 },'));
check('fire branch exists', game.includes("} else if (brawler === 'freezeon') {") && game.includes('fireFreezeonMain(fromEntity, targetX, targetY, isBot);'));
check('cone branch sits BEFORE the universal skin call (no interception)', game.indexOf('drawFreezeonCone(ctx, b);') > 0 && game.indexOf('drawFreezeonCone(ctx, b);') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branch draws dedicated cone art then continues', game.includes('drawFreezeonCone(ctx, b);'));
check('player super dispatch', game.includes("if (combatBrawler === 'freezeon') { castFreezeonSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'freezeon') { castFreezeonSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, per-brawler cooldowns)', game.includes("curBrawler === 'freezeon' && curGadget === 'g1'") && game.includes("curBrawler === 'freezeon' && curGadget === 'g2'"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'freezeon' && g === 'g1'") && game.includes("bot.brawler === 'freezeon' && g === 'g2'"));
check('bot super range gate is the rink throw range (560)', game.includes("if (bot.brawler === 'freezeon') return distance < FREEZEON_SUPER_THROW_RANGE;"));
check('checkHit hook: cone lands on hit + builds freeze meter + Hyper cone hits schedule a shatter', game.includes("if (b && b.ownerBrawler === 'freezeon' && b.isFreezeonCone && target && target.hp > 0) {") && game.includes('freezeonConeLanded(b);') && game.includes('freezeonApplyFreezeBuild(freezeonOwner, target, FREEZEON_CONE_FREEZE_BUILD);') && game.includes('if (!target.isStructure && !target.isPet) freezeonApplyFreezeBuild') && game.includes('freezeonScheduleShatter(freezeonOwner, target);'));
check('bullet expiry hook: cone runs out of range -> slip zone', game.includes('if (b.isFreezeonCone && b.life >= b.maxLife) freezeonConeLanded(b);'));
check('bullet wall hook: cone hits a wall -> slip zone, then dies', game.includes('if (b.isFreezeonCone) {') && game.includes('freezeonConeLanded(b);\n               bullets.splice(i, 1);'));
check('update loop calls updateFreezeonSystems', game.includes('if (playing && !gameOver) updateFreezeonSystems(dt);'));
check('render calls renderFreezeonEffects', game.includes('    renderFreezeonEffects();'));
check('portrait body-art branch (snowman: white body + carrot nose)', game.includes("if (brawlerId === 'freezeon') {") && game.includes("ctx.fillStyle = '#e0f2fe';") && game.includes("ctx.fillStyle = '#f97316';"));
check('constants (SP rework): 4 cones / 720 / 700 / 500 dmg / sequential fire 90ms apart / L-R spread 0.045 rad', game.includes('const FREEZEON_CONE_COUNT = 4;') && game.includes('const FREEZEON_CONE_SPEED = 720;') && game.includes('const FREEZEON_CONE_SPREAD_RAD = 0.045;') && game.includes('const FREEZEON_CONE_RANGE = 700;') && game.includes('const FREEZEON_CONE_DMG = 500;') && game.includes('const FREEZEON_CONE_FIRE_DELAY_MS = 90;') && !game.includes('FREEZEON_CONE_STAGGER'));
check('constants: slip 72px (-40%) / 1s / drift 1.6', game.includes('const FREEZEON_SLIP_RADIUS = 72;') && game.includes('const FREEZEON_SLIP_DURATION_MS = 1000;') && game.includes('const FREEZEON_SLIP_DRIFT_MULT = 1.6;'));
check('constants: super 260px / 6s / throw 560 / impact 800 / charge 7', game.includes('const FREEZEON_SUPER_RADIUS = 260;') && game.includes('const FREEZEON_SUPER_DURATION_MS = 6000;') && game.includes('const FREEZEON_SUPER_THROW_RANGE = 560;') && game.includes('const FREEZEON_SUPER_IMPACT_DMG = 800;') && game.includes('const FREEZEON_SUPER_CHARGE_HITS = 7;'));
check('constants: freeze tick 250ms / 12.5 / hyper 25 / freeze 1s / immune 2.5s (old SP1 1.5s const gone)', game.includes('const FREEZEON_FREEZE_TICK_MS = 250;') && game.includes('const FREEZEON_FREEZE_PER_TICK = 12.5;') && game.includes('const FREEZEON_FREEZE_PER_TICK_HYPER = 25;') && game.includes('const FREEZEON_FREEZE_DURATION_MS = 1000;') && !game.includes('FREEZEON_SP1_FREEZE_DURATION_MS') && !game.includes('freezeonFreezeDurationMs') && game.includes('const FREEZEON_FREEZE_IMMUNE_MS = 2500;'));
check('constants: decay 2s delay / 24 per s / hyper DoT 150/s', game.includes('const FREEZEON_FREEZE_DECAY_DELAY_MS = 2000;') && game.includes('const FREEZEON_FREEZE_DECAY_PER_S = 24;') && game.includes('const FREEZEON_HYPER_DOT_PER_S = 150;'));
check('constants (changes round 1, SP rework): base DoT 30/s / cone freeze +15 (-40%) / throw 1100 px/s / arc 80', game.includes('const FREEZEON_SUPER_DOT_PER_S = 30;') && game.includes('const FREEZEON_CONE_FREEZE_BUILD = 15;') && game.includes('const FREEZEON_SUPER_THROW_SPEED = 1100;') && game.includes('const FREEZEON_SUPER_ARC_HEIGHT = 80;'));
check('lobbed super: thrown-rink array + land function + arc flight', game.includes('let freezeonThrownRinks = [];') && game.includes('function freezeonLandRink(thrown) {') && game.includes('freezeonThrownRinks.push({ startX: entity.x, startY: entity.y, targetX: x, targetY: y, createdAt: now, impactAt: now + flightMs, ownerId: entity.id, hyper: !!hyper, treeFreeze, holidayLights });'));
check('freeze explosion render branch keys off the real hyper flag', game.includes("if (ex.fxKind === 'freezeonFreeze') {") && game.includes("const shard = ex.hyper ? '#e9d5ff' : '#bae6fd';") && game.includes("const ringColor = ex.hyper ? '#a855f7' : '#7dd3fc';"));
check('freeze explosion carries the real hyper state at freeze time', game.includes('const freezeHyper = owner.id === player.id ? !!isHypercharged : !!owner.isHypercharged;') && game.includes("fxKind: 'freezeonFreeze', hyper: freezeHyper"));
check('constants (changes round 2): shatter 0.6s / 90px (-40%) / 600 dmg / caps 4 zones / 2 patches', game.includes('const FREEZEON_SHATTER_DELAY_MS = 600;') && game.includes('const FREEZEON_SHATTER_RADIUS = 90;') && game.includes('const FREEZEON_SHATTER_DMG = 600;') && game.includes('const FREEZEON_MAX_SLIP_ZONES_PER_OWNER = 4;') && game.includes('const FREEZEON_MAX_PATCHES_PER_OWNER = 2;'));
check('constants: hyper aura mirrors Pandy/Snipa (radius +20, line 5, alpha 0.9)', game.includes('const FREEZEON_HYPER_AURA_RADIUS_BONUS = 20;') && game.includes('const FREEZEON_HYPER_AURA_LINE_WIDTH = 5;') && game.includes('const FREEZEON_HYPER_AURA_STROKE_ALPHA = 0.9;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function freezeonHasSP1(entity) { return freezeonStarChoice(entity) === 'slow'; }") && game.includes("function freezeonHasSP2(entity) { return freezeonStarChoice(entity) === 'long'; }"));
check('changes round 2 + Tree Freeze: pending-cone queue declared, enqueued per volley with origin snapshot + spread angle, processed in the tick', game.includes('let freezeonPendingCones = [];') && game.includes('freezeonPendingCones.push({ at: now + i * FREEZEON_CONE_FIRE_DELAY_MS, ownerId: fromEntity.id, ang: coneAng, hyper, dmg: stats.dmg, ox, oy, spawnR, treeFreeze, holidayLights });') && game.includes('freezeonFirePendingCone(c);') && game.includes('function freezeonFirePendingCone(entry) {'));
check('changes round 2: shatter detonation reads the owner\'s real Hyper state (never faked)', game.includes('const shatterHyper = owner.id === player.id ? !!isHypercharged : !!owner.isHypercharged;') && game.includes("fxKind: 'freezeonShatter', hyper: shatterHyper"));
check('changes round 2: shatter render branch keys off the real hyper flag (purple vs ice-blue, 10 shards)', (() => {
  const start = game.indexOf("if (ex.fxKind === 'freezeonShatter') {");
  const end = game.indexOf("if (ex.fxKind === 'rankedRocketeerBurst') {", start);
  const branch = game.slice(start, end);
  return start !== -1 && branch.includes("const shard = ex.hyper ? '#e9d5ff' : '#bae6fd';") && branch.includes("const ringColor = ex.hyper ? '#a855f7' : '#7dd3fc';") && branch.includes('const shardCount = 10;');
})());
check('old SP2 Hypothermia (25% less damage mark) is gone entirely', !game.includes('freezeonHypothermiaUntil'));
check('reset sites clear the FreeZeon arrays (duels + 5 mode starts)', game.includes('freezeonPatches.length = 0; freezeonSlipZones.length = 0; freezeonShatters.length = 0; freezeonThrownRinks.length = 0; freezeonPendingCones.length = 0;') && game.includes('electricRealms = []; electrostienPendingStrikes = []; freezeonPatches = []; freezeonSlipZones = []; freezeonShatters = []; freezeonThrownRinks = []; freezeonPendingCones = [];'));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/freezeon-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweFreezeonVoice?.play('attack')") && game.includes("BraweFreezeonVoice?.play('kill')") && game.includes("BraweFreezeonVoice?.play('super')") && game.includes('updateFreezeonVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('freeze never touches structures (all damage paths skip isStructure/isPet)', (() => {
  const start = game.indexOf('// ===== FreeZeon systems');
  const end = game.indexOf('// ===== Christmas Showdown buffs');
  const body = game.slice(start, end);
  return (body.match(/isStructure/g) || []).length >= 4 && body.includes('if (target.isStructure || target.isPet) continue;');
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

// Controllable clock + entity registry shared by every vm block.
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
// Advance the clock to the furthest pending rink impact and run a tick,
// so the lobbed can lands (and its first patch tick fires) in one step.
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
  // Tree Freeze: fireFreezeonMain stamps the equipped skin onto each
  // queued cone. The shipped game resolves it from playerData; here the
  // default is "no skin" (the new tree-freeze suite overrides this stub).
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
// Phase 5 mutators rework: extracted freezeon code now calls the central
// isMutatorActive() instead of the raw three-slot OR chain. Mirror the real
// helper (incl. alias resolution) over this sandbox's live slot values.
const MUTATOR_ALIAS_SHIM = { super_rate_plus: 'super_rate_90', projectiles_150: 'giant_projectiles' };
sandbox.isMutatorActive = (id) => {
  if (!sandbox.isRankedMatch && !sandbox.isCustomMutatorMatch) return false;
  const canon = (x) => (!x || typeof x !== 'string') ? null : (MUTATOR_ALIAS_SHIM[x] || x);
  const c = canon(id);
  if (!c || c === 'classic') return false;
  return [sandbox.activeRankedModifier, sandbox.activeRankedModifierSecondary, sandbox.activeRankedModifierTertiary]
    .some((slot) => canon(slot) === c);
};
// Pull every FREEZEON_* numeric constant straight from game.js (no drift).
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

// --- executed: SP gates + freeze durations ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.freezeonHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.freezeonHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.freezeonHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.freezeonHasSP2({ selectedStar: 'slow' }) === false);
  check('freeze duration: SP1 no longer extends the freeze (always 1000ms)', (() => { const e = mkBot('e1', { x: 300, y: 0, hp: 5000 }); sandbox.freezeonFreezeTarget(mkBot('sp1', { team: 'player', brawler: 'freezeon', selectedStar: 'slow' }), e); return e.stunUntil === nowMs + 1000; })());
  check('isFreezeon: player with selectedBrawler freezeon', sandbox.isFreezeon(playerEnt) === true);
  check('isFreezeon: bot with brawler freezeon', sandbox.isFreezeon(mkBot('fz', { brawler: 'freezeon' })) === true);
  check('isFreezeon: other brawler is false', sandbox.isFreezeon(mkBot('o', { brawler: 'outlit' })) === false);
} catch (e) { failures.push('SP gates/durations threw: ' + e.message); }

// --- executed: main attack (4 cones, 780/700/500, sequential 90ms) + G2 Extra Scoop ---
// Changes round 2: the volley fires one cone every 90ms — firing queues
// the cones; each tick of updateFreezeonSystems spawns the ones due.
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.fireFreezeonMain(owner, 1000, 0, false);
  check('main (changes round 2): firing queues 4 cones, none in flight yet', sandbox.freezeonPendingCones.length === 4 && bullets.filter((b) => b.isFreezeonCone).length === 0);
  check('main (changes round 2): queued cones are 90ms apart (0/90/180/270)', sandbox.freezeonPendingCones.every((c, i) => c.at === nowMs + i * 90));
  sandbox.updateFreezeonSystems(0.016); // t+0: cone 1 fires
  check('main (changes round 2): first cone fires immediately', bullets.filter((b) => b.isFreezeonCone).length === 1);
  nowMs += 89;
  sandbox.updateFreezeonSystems(0.016);
  check('main (changes round 2): no second cone before 90ms', bullets.filter((b) => b.isFreezeonCone).length === 1);
  nowMs += 1;
  sandbox.updateFreezeonSystems(0.016); // t+90: cone 2 fires
  check('main (changes round 2): second cone fires at +90ms', bullets.filter((b) => b.isFreezeonCone).length === 2);
  nowMs += 180;
  sandbox.updateFreezeonSystems(0.016); // t+270: cones 3 and 4 fire
  const cones = bullets.filter((b) => b.isFreezeonCone);
  check('main (changes round 2): all 4 cones in flight by +270ms, queue empty', cones.length === 4 && sandbox.freezeonPendingCones.length === 0);
  check('main (Tree Freeze): cones 720 px/s, 700px range (maxLife 700/720), 500 dmg at P11', cones.every((c) => near(Math.hypot(c.vx, c.vy), 720) && near(c.maxLife, 700 / 720) && c.damage === 500));
  check('main: cones do not pierce, hitbox 1.4x', cones.every((c) => c.pierce === false && c.hitboxMod === 1.4));
  check('main (SP rework): cones alternate left/right — two angles, first cone left, second right, spread 0.045 rad', (() => { const angs = cones.map((c) => Math.atan2(c.vy, c.vx)); return new Set(angs.map((a) => a.toFixed(3))).size === 2 && angs[0] < 0 && angs[1] > 0 && angs.filter((a) => a < 0).length === 2 && angs.filter((a) => a > 0).length === 2 && angs.every((a) => near(Math.abs(a), 0.045, 0.001)); })());
  check('main (Tree Freeze): cones spawn from the snapshotted origin, 22px out along their own L/R angle', cones.length === 4 && cones.every((c) => near(Math.hypot(c.x, c.y), 22)) && cones.filter((c) => c.y < 0).length === 2 && cones.filter((c) => c.y > 0).length === 2);
  check('main: no hyper tint without Hyper', cones.every((c) => c.hyperVisual === false));
  // Dead owner mid-volley: remaining cones never fire.
  resetWorld();
  sandbox.fireFreezeonMain(playerEnt, 1000, 0, false);
  sandbox.updateFreezeonSystems(0.016); // cone 1 fires
  playerEnt.hp = 0;
  nowMs += 300;
  sandbox.updateFreezeonSystems(0.016);
  check('main (changes round 2): dead owner drops the rest of the volley', bullets.filter((b) => b.isFreezeonCone).length === 1 && sandbox.freezeonPendingCones.length === 0);
  // Hyper main: purple tint on the cones.
  resetWorld();
  sandbox.isHypercharged = true;
  sandbox.fireFreezeonMain(playerEnt, 1000, 0, false);
  nowMs += 270;
  sandbox.updateFreezeonSystems(0.016);
  check('hyper main: cones carry the hyper tint', bullets.filter((b) => b.isFreezeonCone).every((c) => c.hyperVisual === true));
  // G2 Extra Scoop: next main fires 6 cones, flag consumed.
  resetWorld();
  const owner3 = playerEnt;
  owner3.freezeonExtraScoopArmed = true;
  sandbox.fireFreezeonMain(owner3, 1000, 0, false);
  check('G2: armed main queues 6 cones', sandbox.freezeonPendingCones.length === 6);
  check('G2: armed flag consumed on fire', owner3.freezeonExtraScoopArmed === false);
  nowMs += 450;
  sandbox.updateFreezeonSystems(0.016);
  check('G2: all 6 cones in flight by +450ms', bullets.filter((b) => b.isFreezeonCone).length === 6);
  sandbox.fireFreezeonMain(owner3, 1000, 0, false);
  nowMs += 270;
  sandbox.updateFreezeonSystems(0.016);
  check('G2: the attack after is back to 4 cones', bullets.filter((b) => b.isFreezeonCone).length === 10);
} catch (e) { failures.push('main attack threw: ' + e.message); }

// --- executed: cone lands -> 1s slip zone (hit / expiry / wall paths share the guard) ---
try {
  resetWorld();
  const owner = playerEnt;
  const cone = { x: 500, y: 300, ownerId: owner.id, isFreezeonCone: true };
  sandbox.freezeonConeLanded(cone);
  check('slip: one cone leaves one slip zone at its landing point', sandbox.freezeonSlipZones.length === 1 && sandbox.freezeonSlipZones[0].x === 500 && sandbox.freezeonSlipZones[0].y === 300);
  check('slip: zone radius 72 (-40%), lasts 1s', sandbox.freezeonSlipZones[0].radius === 72 && sandbox.freezeonSlipZones[0].until === nowMs + 1000);
  sandbox.freezeonConeLanded(cone);
  check('slip: the same cone never leaves a second zone (guard)', sandbox.freezeonSlipZones.length === 1);
  // Cap: 5 cones -> 4 zones (oldest expires).
  for (let i = 0; i < 5; i++) sandbox.freezeonConeLanded({ x: 100 + i * 10, y: 100, ownerId: owner.id, isFreezeonCone: true });
  check('slip: capped at 4 zones per owner (oldest dropped)', sandbox.freezeonSlipZones.length === 4 && !sandbox.freezeonSlipZones.some((z) => z.x === 500));
  // Zones expire after 1s.
  nowMs += 1001;
  sandbox.updateFreezeonSystems(0.016);
  check('slip: zones expire after 1s', sandbox.freezeonSlipZones.length === 0);
} catch (e) { failures.push('slip zones threw: ' + e.message); }

// --- executed: slipping (enemies slide, allies/owner/structures do not) ---
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.freezeonSpawnSlipZone(owner, 500, 500);
  const enemy = mkBot('e1', { x: 500, y: 500, vx: 100, vy: 0 });
  const ally = mkAlly('a1', { x: 500, y: 500, vx: 100, vy: 0 });
  const structure = mkBot('s1', { x: 500, y: 500, vx: 100, vy: 0, isStructure: true, brawler: 'tower_core' });
  const enemyXBefore = enemy.x;
  const allyXBefore = ally.x;
  const ownerXBefore = owner.x;
  owner.vx = 100;
  sandbox.updateFreezeonSystems(0.1);
  check('slip: an enemy in the zone starts sliding (slip velocity builds, position moves)', (enemy._freezeonSlipVx || 0) > 0 && enemy.x > enemyXBefore);
  check('slip: the owner does NOT slide in his own slush', owner.x === ownerXBefore && !(owner._freezeonSlipVx || 0));
  check('slip: allies do NOT slide', ally.x === allyXBefore && !(ally._freezeonSlipVx || 0));
  check('slip: structures do NOT slide', structure.x === 500 && !(structure._freezeonSlipVx || 0));
  // Slip velocity decays once the enemy leaves the zone.
  enemy.x = 900; // far outside the 120px zone
  const slipVxBefore = enemy._freezeonSlipVx;
  sandbox.updateFreezeonSystems(0.1);
  check('slip: velocity decays outside the zone', (enemy._freezeonSlipVx || 0) < slipVxBefore);
} catch (e) { failures.push('slipping threw: ' + e.message); }

// --- executed: Super cast (lobbed throwable: in-flight, then lands) ---
try {
  resetWorld();
  const owner = playerEnt;
  owner.x = 500; owner.y = 500; // away from the arena edge so the patch lands exactly on the aim
  const enemy = mkBot('e1', { x: 800, y: 500, hp: 5000 });
  const farEnemy = mkBot('e2', { x: 1400, y: 500, hp: 5000 });
  const ally = mkAlly('a1', { x: 800, y: 500, hp: 5000 });
  const structure = mkBot('s1', { x: 800, y: 500, hp: 5000, isStructure: true, brawler: 'tower_core' });
  check('super (changes round 1): cast returns true and lobs a rink can — no patch yet, no damage yet', sandbox.castFreezeonSuper(owner, false, 800, 500) === true && sandbox.freezeonThrownRinks.length === 1 && sandbox.freezeonThrownRinks[0].targetX === 800 && sandbox.freezeonThrownRinks[0].targetY === 500 && sandbox.freezeonPatches.length === 0 && enemy.hp === 5000);
  landRinks();
  check('super: the can lands at the aim and forms the patch', sandbox.freezeonThrownRinks.length === 0 && sandbox.freezeonPatches.length === 1 && sandbox.freezeonPatches[0].x === 800 && sandbox.freezeonPatches[0].y === 500);
  check('super: patch radius 260, lasts 6s, not hyper', sandbox.freezeonPatches[0].radius === 260 && sandbox.freezeonPatches[0].until === nowMs + 6000 && sandbox.freezeonPatches[0].hyper === false);
  check('super: impact damage 800 on the enemy in the patch', checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 800));
  check('super: enemy hp is impact 800 + first base-DoT tick 8', enemy.hp === 5000 - 800 - 8);
  check('super: enemy outside the patch takes nothing', farEnemy.hp === 5000);
  check('super: allies take no impact damage', ally.hp === 5000);
  check('super: structures take no impact damage', structure.hp === 5000 && !checkHitCalls.some((c) => c.targetId === 's1'));
  check('super: ICE RINK! text shown on landing', floatingTexts.some((f) => f.text === '❄️ ICE RINK!'));
  // Throw clamps at 560px.
  resetWorld();
  sandbox.castFreezeonSuper(playerEnt, false, 2000, 0);
  check('super: throw clamps at 560px', sandbox.freezeonThrownRinks[0].targetX === 560);
  landRinks();
  check('super: clamped throw lands at 560px', sandbox.freezeonPatches[0].x === 560);
  // Hyper cast: DEEP FREEZE! text, hyper patch.
  resetWorld();
  sandbox.castFreezeonSuper(playerEnt, true, 300, 0);
  check('hyper super: the lobbed can is hyper', sandbox.freezeonThrownRinks[0].hyper === true);
  landRinks();
  check('hyper super: patch is hyper, DEEP FREEZE! text shown', sandbox.freezeonPatches[0].hyper === true && floatingTexts.some((f) => f.text === '❄️ DEEP FREEZE!'));
  // Cap: 3 casts -> 2 patches (oldest expires).
  sandbox.castFreezeonSuper(playerEnt, false, 100, 0);
  sandbox.castFreezeonSuper(playerEnt, false, 200, 0);
  landRinks();
  check('super: capped at 2 patches per owner (oldest dropped)', sandbox.freezeonPatches.length === 2 && !sandbox.freezeonPatches.some((p) => p.x === 300));
  // Patches expire after 6s.
  nowMs += 6001;
  sandbox.updateFreezeonSystems(0.016);
  check('super: patches expire after 6s', sandbox.freezeonPatches.length === 0);
} catch (e) { failures.push('super cast threw: ' + e.message); }

// --- executed: patch ticks (freeze buildup, 2s -> frozen 1s) + decay ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner, false, 300, 0);
  landRinks(); // the lobbed can flies, lands, and the first tick fires
  check('freeze: first tick builds 12.5', enemy.freezeonFreeze === 12.5);
  for (let t = 1; t < 7; t++) { nowMs += 250; sandbox.updateFreezeonSystems(0.016); }
  check('freeze: 7 ticks build 87.5, not yet frozen', enemy.freezeonFreeze === 87.5 && !enemy.stunUntil);
  nowMs += 250;
  sandbox.updateFreezeonSystems(0.016);
  check('freeze: 8th tick (2s standing) freezes solid for 1s', enemy.freezeonFreeze === 0 && enemy.stunUntil === nowMs + 1000);
  check('freeze: FROZEN! text shown', floatingTexts.some((f) => f.text === 'FROZEN!'));
  check('freeze: post-freeze immunity 2.5s set', enemy.freezeonFreezeImmuneUntil === nowMs + 2500);
  // Immunity blocks further buildup.
  nowMs += 250;
  sandbox.updateFreezeonSystems(0.016);
  check('freeze: immune targets build nothing', !enemy.freezeonFreeze);
  // Decay: partial buildup fades after 2s without a tick.
  resetWorld();
  const owner2 = playerEnt;
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner2, false, 300, 0);
  landRinks();
  nowMs += 250;
  sandbox.updateFreezeonSystems(0.016);
  check('decay: 2 ticks build 25', enemy2.freezeonFreeze === 25);
  nowMs += 6001; // patch expired too — no more ticks
  sandbox.updateFreezeonSystems(1);
  check('decay: buildup fades 24/s after 2s without a tick', enemy2.freezeonFreeze === 1);
  // SP1 (rework): frozen 1s — the old 1.5s extension is gone.
  resetWorld();
  const sp1Owner = mkBot('sp1', { team: 'player', brawler: 'freezeon', selectedStar: 'slow' });
  const enemy3 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(sp1Owner, false, 300, 0);
  landRinks();
  for (let t = 0; t < 8; t++) { sandbox.updateFreezeonSystems(0.016); nowMs += 250; }
  check('freeze: SP1 (rework) freezes for 1000ms, not 1500ms', enemy3.stunUntil === nowMs - 250 + 1000);
} catch (e) { failures.push('patch ticks / freeze threw: ' + e.message); }

// --- executed: Hyper Super (2x freeze speed + 150/s DoT) + SP2 mark ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner, true, 300, 0);
  landRinks();
  check('hyper: first tick builds 25 (2x)', enemy.freezeonFreeze === 25);
  check('hyper: DoT ticks 38 damage (150/s * 0.25s, on top of the 800 impact)', enemy.hp === 5000 - 800 - 38);
  for (let t = 1; t < 4; t++) { nowMs += 250; sandbox.updateFreezeonSystems(0.016); }
  check('hyper: frozen after 4 ticks (1s standing)', enemy.stunUntil === nowMs + 1000);
  check('hyper: DoT applied every tick (4 * 38)', enemy.hp === 5000 - 38 * 4 - 800);
  // SP2 (rework): no Hypothermia mark anymore — the rink only ticks
  // freeze + DoT, and the zone-freeze lives in slip zones (new suite).
  resetWorld();
  const sp2Owner = mkBot('sp2', { team: 'player', brawler: 'freezeon', selectedStar: 'long' });
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(sp2Owner, false, 300, 0);
  landRinks();
  check('SP2 (rework): enemy in the rink gets NO Hypothermia mark', !enemy2.freezeonHypothermiaUntil);
  const farEnemy = mkBot('e2', { x: 900, y: 0, hp: 5000 });
  sandbox.updateFreezeonSystems(0.016);
  check('SP2 (rework): enemy outside the rink gets no mark either', !farEnemy.freezeonHypothermiaUntil);
} catch (e) { failures.push('hyper super / SP2 threw: ' + e.message); }

// --- executed: brain-freeze shatter (0.6s delay, follows the target, 600 AoE) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  const near = mkBot('e2', { x: 380, y: 0, hp: 5000 });
  const edge = mkBot('e4', { x: 470, y: 0, hp: 5000 }); // 120px from the burst center
  const far = mkBot('e3', { x: 700, y: 0, hp: 5000 });
  const ally = mkAlly('a1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner, enemy);
  check('shatter: one pending shatter, due 0.6s after the hit', sandbox.freezeonShatters.length === 1 && sandbox.freezeonShatters[0].at === nowMs + 600);
  nowMs += 500;
  sandbox.updateFreezeonSystems(0.016);
  check('shatter: nothing detonates before 0.6s', sandbox.freezeonShatters.length === 1 && enemy.hp === 5000);
  enemy.x = 350; // the target moved — the shatter follows it
  nowMs += 100;
  sandbox.updateFreezeonSystems(0.016);
  check('shatter: detonates at the 0.6s mark', sandbox.freezeonShatters.length === 0);
  check('shatter: detonation centers on the target CURRENT spot', explosions.some((x) => x.fxKind === 'freezeonShatter' && x.x === 350 && x.y === 0));
  check('shatter: 600 damage on the hit enemy', enemy.hp === 5000 - 600);
  check('shatter: 600 damage on a nearby enemy (90px radius)', near.hp === 5000 - 600);
  check('shatter (changes round 2): enemy 120px out is safe now (was a hit at 150px)', edge.hp === 5000);
  check('shatter: enemy outside the radius takes nothing', far.hp === 5000);
  check('shatter: allies take nothing', ally.hp === 5000);
  check('shatter: BRAIN FREEZE! text shown', floatingTexts.some((f) => f.text === '❄️ BRAIN FREEZE!'));
  // Dead owner: pending shatter fizzles.
  resetWorld();
  const owner2 = playerEnt;
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner2, enemy2);
  owner2.hp = 0;
  nowMs += 700;
  sandbox.updateFreezeonSystems(0.016);
  check('shatter: dead owner fizzles the pending shatter', sandbox.freezeonShatters.length === 0 && enemy2.hp === 5000);
  // Dead target: shatter still pops at the recorded spot.
  resetWorld();
  const owner3 = playerEnt;
  const enemy3 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner3, enemy3);
  enemy3.hp = 0;
  nowMs += 700;
  sandbox.updateFreezeonSystems(0.016);
  check('shatter: dead target still pops at the recorded spot', explosions.some((x) => x.fxKind === 'freezeonShatter' && x.x === 300));
} catch (e) { failures.push('shatter threw: ' + e.message); }

// --- executed: gadgets ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner, false, 300, 0);
  landRinks();
  check('gadget G1: Cryo Syrup freezes everyone in your rink', sandbox.executeFreezeonGadget(owner, 'g1', false) === true && enemy.stunUntil === nowMs + 1000);
  check('gadget G1: CRYO SYRUP! text shown', floatingTexts.some((f) => f.text === '🧪 CRYO SYRUP!'));
  const farEnemy = mkBot('e2', { x: 900, y: 0, hp: 5000 });
  sandbox.executeFreezeonGadget(owner, 'g1', false);
  check('gadget G1: enemies outside the rink are NOT frozen', !farEnemy.stunUntil);
  // G1 with no patch: returns true, freezes nobody.
  resetWorld();
  const owner2 = playerEnt;
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.executeFreezeonGadget(owner2, 'g1', false);
  check('gadget G1: no rink, nobody frozen', !enemy2.stunUntil);
  // G2 Extra Scoop arms the next main.
  check('gadget G2: Extra Scoop arms the next attack', sandbox.executeFreezeonGadget(owner2, 'g2', false) === true && owner2.freezeonExtraScoopArmed === true);
  check('gadget G2: EXTRA SCOOP! text shown', floatingTexts.some((f) => f.text === '🍦 EXTRA SCOOP!'));
  check('gadget: unknown gadget returns false', sandbox.executeFreezeonGadget(owner2, 'g3', false) === false);
  // Death clears the armed scoop.
  owner2.hp = 0;
  sandbox.updateFreezeonSystems(0.016);
  check('gadget: death clears the armed Extra Scoop', owner2.freezeonExtraScoopArmed === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: render helpers (recording stub canvas) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0 });
  enemy.freezeonFreeze = 50;
  sandbox.freezeonSpawnSlipZone(owner, 500, 500);
  sandbox.castFreezeonSuper(owner, false, 300, 0);
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.renderFreezeonEffects();
  check('render: slip zone draws a pale ice circle (72px after -40%)', s1.calls.some((c) => c.m === 'arc' && c.args[2] === 72));
  check('render: patch draws a dashed ice ring', s1.calls.some((c) => c.m === 'setLineDash'));
  check('render: freeze bar draws above the enemy (ice-blue fill)', s1.sets.some((s) => s.p === 'fillStyle' && s.v === '#38bdf8') && s1.calls.some((c) => c.m === 'fillRect'));
  // Hyper aura renders the purple ring (player hyper is the global flag).
  sandbox.isHypercharged = true;
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.renderFreezeonEffects();
  check('render: hyper aura uses the purple ring (stroke alpha 0.9)', s2.sets.some((s) => s.p === 'strokeStyle' && String(s.v).includes('192,132,252,0.9')));
  // Dedicated cone art draws without throwing (tan cone + ice scoop).
  const s3 = stubCtx();
  sandbox.drawFreezeonCone(s3.proxy, { x: 0, y: 0, vx: 780, vy: 0, hyperVisual: false });
  check('render: cone draws (tan cone + blue scoop)', s3.sets.some((s) => s.p === 'fillStyle' && s.v === '#d97706') && s3.sets.some((s) => s.p === 'fillStyle' && s.v === '#7dd3fc'));
  const s4 = stubCtx();
  sandbox.drawFreezeonCone(s4.proxy, { x: 0, y: 0, vx: 780, vy: 0, hyperVisual: true });
  check('render: hyper cone draws a purple scoop', s4.sets.some((s) => s.p === 'fillStyle' && s.v === '#c084fc'));
} catch (e) { failures.push('render helpers threw: ' + e.message); }

// --- executed: changes round 1 (cone freeze meter / base DoT / real
// freeze visuals keyed off real state / lobbed rink render) ---
try {
  // Cone-hit freeze meter: 7 cone hits freeze (15 each, -40%), via the
  // real buildup path (same decay/immunity rules as the patch).
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonApplyFreezeBuild(owner, enemy, 15);
  check('cone freeze: one cone hit builds 15 (-40%)', enemy.freezeonFreeze === 15);
  for (let i = 0; i < 5; i++) sandbox.freezeonApplyFreezeBuild(owner, enemy, 15);
  check('cone freeze: six hits build 90, not yet frozen', enemy.freezeonFreeze === 90 && !enemy.stunUntil);
  sandbox.freezeonApplyFreezeBuild(owner, enemy, 15);
  check('cone freeze: the seventh hit freezes solid for 1s', enemy.freezeonFreeze === 0 && enemy.stunUntil === nowMs + 1000);
  check('cone freeze: FROZEN! text shown', floatingTexts.some((f) => f.text === 'FROZEN!'));
  // Base Super DoT: 30/s = 8 per 250ms tick (on top of the 800 impact).
  resetWorld();
  const owner4 = playerEnt;
  const enemy5 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.castFreezeonSuper(owner4, false, 300, 0);
  landRinks();
  check('base DoT: first tick melts 8 (30/s * 0.25s)', enemy5.hp === 5000 - 800 - 8);
  nowMs += 250;
  sandbox.updateFreezeonSystems(0.016);
  check('base DoT: second tick melts another 8', enemy5.hp === 5000 - 800 - 16);
  // Freeze explosion carries the REAL hyper state (Snipa lesson: the
  // visual must key off real state, never a faked flag).
  resetWorld();
  const owner2 = playerEnt;
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonFreezeTarget(owner2, enemy2);
  const fx = explosions.find((x) => x.fxKind === 'freezeonFreeze');
  check('freeze visual: a normal freeze pushes an ice-blue explosion, hyper flag false', !!fx && fx.hyper === false && fx.color === 'rgba(56,189,248,.82)');
  resetWorld();
  const owner3 = playerEnt;
  sandbox.isHypercharged = true;
  const enemy3 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonFreezeTarget(owner3, enemy3);
  const fxH = explosions.find((x) => x.fxKind === 'freezeonFreeze');
  check('freeze visual: a Hyper freeze pushes a purple explosion, hyper flag true', !!fxH && fxH.hyper === true && fxH.color === 'rgba(192,132,252,.82)');
  resetWorld();
  const botOwner = mkBot('fz', { brawler: 'freezeon', isHypercharged: true });
  const enemy4 = mkAlly('a1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonFreezeTarget(botOwner, enemy4);
  const fxB = explosions.find((x) => x.fxKind === 'freezeonFreeze');
  check('freeze visual: a Hypercharged bot freeze is purple too', !!fxB && fxB.hyper === true);
  // Lobbed rink render: dashed landing marker + spinning ice can on the arc.
  resetWorld();
  sandbox.castFreezeonSuper(playerEnt, false, 300, 0);
  const s5 = stubCtx();
  sandbox.ctx = s5.proxy;
  sandbox.renderFreezeonEffects();
  check('render: lobbed rink draws a dashed landing marker (radius 40)', s5.calls.some((c) => c.m === 'arc' && c.args[2] === 40) && s5.calls.some((c) => c.m === 'setLineDash'));
  check('render: lobbed rink draws the spinning ice can', s5.sets.some((s) => s.p === 'fillStyle' && s.v === '#7dd3fc'));
} catch (e) { failures.push('changes round 1 threw: ' + e.message); }

// --- executed: changes round 2 (shatter visual keyed off real Hyper
// state at detonation / normal shatter still fires) ---
try {
  // Hyper owner at detonation: purple explosion, hyper flag true.
  resetWorld();
  const owner = playerEnt;
  sandbox.isHypercharged = true;
  const enemy = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner, enemy);
  nowMs += 600;
  sandbox.updateFreezeonSystems(0.016);
  const fxH = explosions.find((x) => x.fxKind === 'freezeonShatter');
  check('shatter visual (changes round 2): Hyper detonation pushes a purple explosion, hyper flag true', !!fxH && fxH.hyper === true && fxH.color === 'rgba(192,132,252,.85)');
  check('shatter visual (changes round 2): Hyper shatter radius is 90 (-40%)', !!fxH && fxH.radius === 90);
  // Non-Hyper owner: ice-blue explosion, hyper flag false — the normal
  // shatter visual still fires.
  resetWorld();
  const owner2 = playerEnt;
  const enemy2 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner2, enemy2);
  nowMs += 600;
  sandbox.updateFreezeonSystems(0.016);
  const fxN = explosions.find((x) => x.fxKind === 'freezeonShatter');
  check('shatter visual (changes round 2): normal detonation pushes an ice-blue explosion, hyper flag false', !!fxN && fxN.hyper === false && fxN.color === 'rgba(186,230,253,.85)');
  check('shatter visual (changes round 2): normal shatter still deals 600', enemy2.hp === 5000 - 600);
  // Hyper lapsed during the 0.6s delay: the visual reads the REAL state
  // at detonation (ice-blue), never a faked flag.
  resetWorld();
  const owner3 = playerEnt;
  sandbox.isHypercharged = true;
  const enemy3 = mkBot('e1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(owner3, enemy3);
  sandbox.isHypercharged = false; // Hyper dropped before detonation
  nowMs += 600;
  sandbox.updateFreezeonSystems(0.016);
  const fxL = explosions.find((x) => x.fxKind === 'freezeonShatter');
  check('shatter visual (changes round 2): lapsed Hyper reads ice-blue at detonation (real state, not faked)', !!fxL && fxL.hyper === false && fxL.color === 'rgba(186,230,253,.85)');
  // Hypercharged bot owner: purple too (bot path, not the player global).
  resetWorld();
  const botOwner = mkBot('fz', { brawler: 'freezeon', isHypercharged: true });
  const enemy4 = mkAlly('a1', { x: 300, y: 0, hp: 5000 });
  sandbox.freezeonScheduleShatter(botOwner, enemy4);
  nowMs += 600;
  sandbox.updateFreezeonSystems(0.016);
  const fxB = explosions.find((x) => x.fxKind === 'freezeonShatter');
  check('shatter visual (changes round 2): a Hypercharged bot shatter is purple too', !!fxB && fxB.hyper === true);
} catch (e) { failures.push('changes round 2 threw: ' + e.message); }

// ---------------------------------------------------------- 3. report
if (failures.length) {
  console.error(`freezeon regression: ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.error('  FAIL ' + f);
  process.exit(1);
}
console.log(`freezeon regression: ${passed} passed, 0 failed`);
