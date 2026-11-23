// Spritz + Pitch polish pass regression (2026-11-22, Anthony: "All visuals
// pls and correct throw etc and super spawns shells away from you too like
// so no auto collecting" — then "Same with pitch pls.").
// Spritz: every visual complete — stream/shell shots are teardrops stretched
// along their flight with a wake (not plain balls); shells are spiral shells
// tossed in a 300ms arc with a landing marker; the Super cycle has a visible
// Mode Swap ring burst; water blasts finally have their own render branch
// (spritzWaterBlast was pushed but fell through to the generic explosion
// render); G1 Water Circle has ripples so it reads as a pool.
// Spritz throw, corrected: shells are TOSSED out to 180px (builder pick —
// outside the 60px pickup radius + his ~14px body, so he must walk to them)
// and are not pickable mid-toss; a wall fallback keeps them at least 150px
// out (still outside pickup reach in a corner). No other kit change.
// Pitch: same treatment, NO kit/mechanics changes — Hex Toss pot is a real
// pot now (rim + handle, spinning as it flies, sparkle trail on the arc);
// the plus/X burst finally has its own render branch (pitchHexBurst was
// pushed but fell through to the generic render; the branch draws 4 rays
// for a plus, 8 for plus AND X, keyed off the burst's real Hyper/Cross
// state); pigs pop in with a spawn poof (visual only — pitchSpawnPig is the
// single spawn point for Super parade AND takedown pigs). Pig Parade still
// spawns pigs at 48px around her: pigs are summons, not pickups, so the
// spawn-away rule does not apply — flagged, not changed.
// Builder picks (flagged for his correction): shell distance 180px, toss
// 300ms, arc height 40px, wall floor 150px; Mode Swap burst radius 90;
// pig poof radius 40. Declined Spritz balance suggestions (longer super
// cooldown, heal cap, root breaks on damage, hyper once-per-charge) stay
// unapplied.
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
const spritzBlock = game.slice(game.indexOf('// ===== Spritz systems'), game.indexOf('// ===== Christmas Showdown buffs'));
const pitchBlock = game.slice(game.indexOf('// ===== Pitch systems'), game.indexOf('// ===== Christmas Showdown buffs'));

// ---------------------------------------------------------- 1. source pins
check('shells land 180px out (tossed, 300ms arc, 40px high, 150px wall floor)', game.includes('const SPRITZ_SUPER_SHELL_DISTANCE = 180;') && game.includes('const SPRITZ_SHELL_FLIGHT_MS = 300;') && game.includes('const SPRITZ_SHELL_ARC_HEIGHT = 40;') && game.includes('const SPRITZ_SHELL_MIN_DISTANCE = 150;'));
check('shell landing helper exists (wall fallback)', game.includes('function spritzShellLanding(entity, ang) {'));
check('shell flight-position helper exists (arc interpolation)', game.includes('function spritzShellFlightPos(s, now) {'));
check('Super tosses shells to the landing helper (no more 56px drop)', game.includes('const landing = spritzShellLanding(entity, ang);') && !spritzBlock.includes('* 56,'));
check('Super pushes a visible Mode Swap burst (radius 90)', game.includes("fxKind: 'spritzModeSwap'") && game.includes('radius: 90, life: 0, maxLife: .45'));
check('pickup loop skips shells still arcing in', game.includes('still arcing to its landing spot — not pickable mid-toss'));
check('water-blast explosion has its own render branch', game.includes("if (ex.fxKind === 'spritzWaterBlast') {"));
check('mode-swap explosion has its own render branch', game.includes("if (ex.fxKind === 'spritzModeSwap') {"));
check('hex-burst explosion has its own render branch (plus/X rays)', game.includes("if (ex.fxKind === 'pitchHexBurst') {") && game.includes("const rays = (ex.hyper || ex.eightWay) ? 8 : 4;"));
check('hex burst record carries the real 8-way state (Hyper OR Hex Cross)', game.includes('eightWay: eightWay'));
check('pig spawn poof exists (visual only, single spawn point)', game.includes("fxKind: 'pitchPigSpawn'") && game.includes("if (ex.fxKind === 'pitchPigSpawn') {"));
check('stream/shell shots render as teardrops along their flight (not plain balls)', game.includes('a teardrop stretched along its') && game.includes('ctx.rotate(spritzAng);') && game.includes('quadraticCurveTo(spritzSize * 0.9, -spritzSize, 0, -spritzSize * 0.8);'));
check('shells render as spiral shells (not plain orbs)', game.includes('a spiral shell, not a plain orb') && game.includes('ctx.arc(0, 0, 6.5, 0.5, Math.PI * 2 + 0.5);'));
check('shells show a landing marker while arcing in', game.includes('Landing marker while the shell is still arcing in.'));
check('G1 Water Circle has ripples (reads as a pool)', game.includes('Ripples on the water so it reads as a pool'));
check('hex pot is a pot (rim + handle), gentle tilt not 2 spins, leaves a sparkle trail', game.includes('Pot rim + handle so it reads as a pot') && game.includes('ctx.rotate(Math.sin(progress * Math.PI) * 0.35);') && !game.includes('ctx.rotate(progress * Math.PI * 4);') && game.includes('Hex sparkle trail along the arc behind the pot.'));
check('Pitch: NO kit change — pigs still spawn 48px around her (summons, not pickups)', game.includes('entity.x + Math.cos(ang) * 48, entity.y + Math.sin(ang) * 48'));
check('Pitch: kill-spawn pig still spawns at the victim (unchanged)', game.includes('pitchSpawnPig(killer, victim.x, victim.y, false)'));
check('no Brawl Stars wording in the Spritz/Pitch blocks', !spritzBlock.includes('Brawl Stars') && !pitchBlock.includes('Brawl Stars') && !spritzBlock.includes('Grom') && !pitchBlock.includes('Grom'));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'w' + 'itch'}\\b`, 'i').test(game));
check('declined balance suggestions stay unapplied: super still 8s', game.includes('const SPRITZ_SUPER_CHARGE_SECONDS = 8;'));

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
const statusEffects = [];
const voicePlays = [];
const superButtonCalls = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let spritzMists = [];
let spritzShells = [];
let spritzPendingVolleys = [];
let spritzPendingBlasts = [];
let spritzWaterCircles = [];
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
    isHypercharged: !!opts.isHypercharged, vx: opts.vx ?? 0, vy: opts.vy ?? 0,
    lastDamagerId: opts.lastDamagerId ?? null,
    spritzMode: opts.spritzMode, spritzBonusAmmo: opts.spritzBonusAmmo ?? 0,
    visualAimAngle: opts.visualAimAngle ?? 0, superCharge: opts.superCharge ?? 0,
    slowUntil: 0, rootUntil: 0,
  };
  entitiesById.set(id, e);
  return e;
}
function resetWorld(brawler = 'spritz') {
  entitiesById.clear();
  bullets = [];
  explosions = [];
  spritzMists = [];
  spritzShells = [];
  spritzPendingVolleys = [];
  spritzPendingBlasts = [];
  spritzWaterCircles = [];
  pitchThrownHexes = [];
  pitchPendingEchoes = [];
  bots = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  statusEffects.length = 0;
  voicePlays.length = 0;
  superButtonCalls.length = 0;
  nowMs = 100000;
  nextId = 9000;
  playerEnt = mkEntity('p1', { team: 'player', brawler, x: 0, y: 0, hp: 5200, maxHp: 5200 });
  sandbox.player = playerEnt;
  sandbox.bots = bots;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.spritzMists = spritzMists;
  sandbox.spritzShells = spritzShells;
  sandbox.spritzPendingVolleys = spritzPendingVolleys;
  sandbox.spritzPendingBlasts = spritzPendingBlasts;
  sandbox.spritzWaterCircles = spritzWaterCircles;
  sandbox.pitchThrownHexes = pitchThrownHexes;
  sandbox.pitchPendingEchoes = pitchPendingEchoes;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = brawler;
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.superCharge = 0;
  sandbox.nextId = nextId;
}
function mkBot(id, opts = {}) {
  const b = mkEntity(id, { team: 'enemy', ...opts });
  bots.push(b);
  sandbox.bots = bots;
  return b;
}
function syncArrays() {
  spritzMists = sandbox.spritzMists;
  spritzShells = sandbox.spritzShells;
  spritzPendingVolleys = sandbox.spritzPendingVolleys;
  spritzPendingBlasts = sandbox.spritzPendingBlasts;
  spritzWaterCircles = sandbox.spritzWaterCircles;
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
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  applyStatusEffect: (e, effect, ms) => {
    statusEffects.push({ id: e.id, effect, ms });
    if (effect === 'slow') e.slowUntil = Math.max(e.slowUntil || 0, nowMs + ms);
    if (effect === 'root') e.rootUntil = Math.max(e.rootUntil || 0, nowMs + ms);
  },
  updateSuperButton: () => { superButtonCalls.push(nowMs); },
  isFusedEntity: (e) => !!e && Array.isArray(e.fusedParts) && e.fusedParts.length === 2,
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  spritzMists: [],
  spritzShells: [],
  spritzPendingVolleys: [],
  spritzPendingBlasts: [],
  spritzWaterCircles: [],
  pitchThrownHexes: [],
  pitchPendingEchoes: [],
  isHypercharged: false,
  selectedBrawler: 'spritz',
  playing: false,
  gameOver: false,
  superCharge: 0,
  nextId: 9000,
  window: {
    BraweSpritzVoice: { play: (kind) => { voicePlays.push(kind); } },
    BrawePitchVoice: { play: (kind) => { voicePlays.push(kind); } },
  },
  ctx: null,
};
for (const m of game.matchAll(/const (SPRITZ_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
for (const m of game.matchAll(/const (PITCH_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
sandbox.SPRITZ_MODE_ORDER = ['mist', 'stream', 'hose'];
sandbox.SPRITZ_MODE_LABELS = { mist: 'MIST', stream: 'FOCUS STREAM', hose: 'HOSE BLAST' };
vm.createContext(sandbox);
vm.runInContext(
  [
    'spritzLevelScale', 'spritzStarChoice', 'spritzHasSP1', 'spritzHasSP2', 'isSpritz',
    'spritzFindOwner', 'spritzModeOf', 'spritzSpeedMult', 'spritzScaledDmg',
    'spritzShellLanding', 'spritzShellFlightPos', 'spritzFireShellShots',
    'spritzExplodeAt', 'castSpritzSuper', 'updateSpritzSystems', 'renderSpritzEffects',
    'pitchLevelScale', 'pitchStarChoice', 'pitchHasSP1', 'pitchHasSP2', 'isPitch',
    'pitchFindOwner', 'pitchSpawnPig', 'pitchFireBurst', 'castPitchSuper',
    'renderPitchEffects',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: shell landing (180px out, wall fallback, corner floor) ---
try {
  resetWorld();
  const owner = { x: 500, y: 500 };
  for (const ang of [0, 0.6, Math.PI / 2, Math.PI, -Math.PI / 3, 2.4]) {
    const spot = sandbox.spritzShellLanding(owner, ang);
    check(`landing (open arena, ${Math.round(ang * 100) / 100} rad): 180px out`, near(Math.hypot(spot.x - 500, spot.y - 500), 180, 0.5));
  }
  // Against the left wall: the throw into the wall falls back sideways.
  resetWorld();
  const wallOwner = { x: 40, y: 500 };
  const wallSpot = sandbox.spritzShellLanding(wallOwner, Math.PI);
  check('landing (wall): fallback keeps the shell 150px+ out', Math.hypot(wallSpot.x - 40, wallSpot.y - 500) >= 150);
  check('landing (wall): fallback goes sideways, not into the wall', near(wallSpot.x, 40, 0.5) && wallSpot.y !== 500);
  // In the corner: best effort is still outside the 74px pickup reach.
  resetWorld();
  const cornerOwner = { x: 28, y: 28 };
  const cornerSpot = sandbox.spritzShellLanding(cornerOwner, -Math.PI * 3 / 4);
  check('landing (corner): still outside the 74px pickup reach', Math.hypot(cornerSpot.x - 28, cornerSpot.y - 28) >= 74);
  // Spread: two shells from one cast land in different directions.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('landing (cast): the 2 shells land in spread directions', Math.hypot(spritzShells[0].x - spritzShells[1].x, spritzShells[0].y - spritzShells[1].y) > 200);
} catch (e) { failures.push('shell landing threw: ' + e.message); }

// --- executed: shell flight (arc from his feet to the landing spot) ---
try {
  resetWorld();
  const shell = { x: 680, y: 500, fromX: 500, fromY: 500, createdAt: 100000, landAt: 100300, ownerId: 'p1', hyper: false };
  const atStart = sandbox.spritzShellFlightPos(shell, 100000);
  check('flight: at cast the shell is at his feet (progress 0, no arc)', atStart.x === 500 && atStart.y === 500 && atStart.arc === 0 && atStart.progress === 0);
  const atMid = sandbox.spritzShellFlightPos(shell, 100150);
  check('flight: halfway it is mid-air (progress 0.5, 40px arc peak)', atMid.x === 590 && atMid.y === 500 && near(atMid.arc, 40, 0.5) && near(atMid.progress, 0.5, 0.01));
  const atLand = sandbox.spritzShellFlightPos(shell, 100300);
  check('flight: at 300ms it sits on its landing spot (progress 1, no arc)', atLand.x === 680 && atLand.y === 500 && near(atLand.arc, 0, 0.001) && atLand.progress === 1);
  const atLate = sandbox.spritzShellFlightPos(shell, 101000);
  check('flight: after landing it stays put', atLate.x === 680 && atLate.y === 500 && atLate.progress === 1);
  const legacy = sandbox.spritzShellFlightPos({ x: 200, y: 200, ownerId: 'p1', hyper: false, createdAt: 100000 }, 100000);
  check('flight: a shell without flight fields is already landed', legacy.x === 200 && legacy.y === 200 && legacy.progress === 1);
} catch (e) { failures.push('shell flight threw: ' + e.message); }

// --- executed: no auto-collect (walk to the shell, after it lands) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.visualAimAngle = 0;
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('no-collect: Mode Swap burst is visible on cast', explosions.some((e) => e.fxKind === 'spritzModeSwap' && e.radius === 90));
  // He sprints straight to a landing spot before it lands: nothing.
  playerEnt.x = spritzShells[0].x; playerEnt.y = spritzShells[0].y;
  sandbox.updateSpritzSystems(0.016);
  syncArrays();
  check('no-collect: standing on the spot mid-toss picks up nothing', spritzShells.length === 2 && (playerEnt.spritzBonusAmmo || 0) === 0 && bullets.length === 0);
  nowMs += 300; // landed now
  sandbox.updateSpritzSystems(0.016);
  syncArrays();
  check('no-collect: after landing, walking onto it picks it up (+1 ammo, 3 shots)', spritzShells.length === 1 && playerEnt.spritzBonusAmmo === 1 && bullets.length === 3);
} catch (e) { failures.push('no auto-collect threw: ' + e.message); }

// --- executed: Pitch burst record + pig spawn poof (visual only) ---
try {
  resetWorld('pitch');
  playerEnt.x = 500; playerEnt.y = 500;
  // Plain burst: plus only.
  sandbox.pitchFireBurst(700, 500, playerEnt, false, false, false);
  syncArrays();
  const plain = explosions.find((e) => e.fxKind === 'pitchHexBurst');
  check('burst: plain Hex Toss records plus-only (not 8-way)', plain && plain.eightWay === false && plain.hyper === false && plain.radius === 246);
  // G1 Hex Cross: plus AND X, without Hyper.
  resetWorld('pitch');
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.pitchFireBurst(700, 500, playerEnt, false, true, false);
  syncArrays();
  const cross = explosions.find((e) => e.fxKind === 'pitchHexBurst');
  check('burst: Hex Cross records 8-way even without Hyper', cross && cross.eightWay === true && cross.hyper === false);
  // Hyper burst: 8-way.
  resetWorld('pitch');
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.pitchFireBurst(700, 500, playerEnt, true, false, false);
  syncArrays();
  const hyper = explosions.find((e) => e.fxKind === 'pitchHexBurst');
  check('burst: Hyper records 8-way', hyper && hyper.eightWay === true && hyper.hyper === true);
  // Pig spawn poof: Super parade pigs pop in with a poof, kit untouched.
  resetWorld('pitch');
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.castPitchSuper(playerEnt, false, 500, 0);
  syncArrays();
  check('poof: Pig Parade still spawns 2 pigs at 48px (kit unchanged)', bots.length === 2 && bots.every((p) => near(Math.hypot(p.x - 500, p.y - 500), 48, 0.5) && p.hp === 2000 && p.isPitchPig));
  check('poof: one spawn poof per pig, at the pig', explosions.filter((e) => e.fxKind === 'pitchPigSpawn').length === 2 && explosions.filter((e) => e.fxKind === 'pitchPigSpawn').every((e) => e.radius === 40));
  // Kill-spawn pig gets the same poof.
  resetWorld('pitch');
  playerEnt.x = 500; playerEnt.y = 500;
  const pig = sandbox.pitchSpawnPig(playerEnt, 700, 500, false);
  syncArrays();
  check('poof: a single spawned pig pops with one poof', pig && pig.hp === 2000 && explosions.filter((e) => e.fxKind === 'pitchPigSpawn').length === 1);
} catch (e) { failures.push('pitch burst/poof threw: ' + e.message); }

// --- executed: render with REAL state (flying shell, hex pot in flight) ---
try {
  resetWorld();
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.spritzShells.push({ x: 680, y: 500, fromX: 500, fromY: 500, createdAt: nowMs, landAt: nowMs + 300, ownerId: 'p1', hyper: false });
  sandbox.spritzMists.push({ x: 100, y: 100, r: 150, vx: 0, vy: 0, until: nowMs + 2500, ownerId: 'p1', hyper: false });
  sandbox.spritzWaterCircles.push({ x: 300, y: 300, r: 160, ownerId: 'p1', until: nowMs + 4000, nextTickAt: 0 });
  sandbox.renderSpritzEffects();
  check('render (Spritz): draws without throwing (flying shell + mist + circle)', s1.calls.length > 0);
  check('render (Spritz): shell landing marker uses the real water-blue', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#38bdf8'));
  check('render (Spritz): shell has a white rim + high-contrast white spiral (not the old deep-blue-on-blue)', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#ffffff') && !s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#075985'));
  check('render (Spritz): circle ripple uses the pale water-blue', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#bae6fd'));
  // Pitch: hex pot mid-flight draws without throwing, rim + handle present.
  resetWorld('pitch');
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.pitchThrownHexes.push({ startX: 500, startY: 500, targetX: 900, targetY: 500, createdAt: nowMs - 100, impactAt: nowMs + 264, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false });
  sandbox.renderPitchEffects();
  check('render (Pitch): draws without throwing (pot in flight)', s2.calls.length > 0);
  check('render (Pitch): pot rim uses the deep purple', s2.sets.some((s) => s.p === 'strokeStyle' && s.v === '#7e22ce'));
  check('render (Pitch): landing marker uses the real purple', s2.sets.some((s) => s.p === 'strokeStyle' && s.v === '#a855f7'));
} catch (e) { failures.push('polish render threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-spritz-pitch-polish-regression.mjs (${passed} checks)`);
