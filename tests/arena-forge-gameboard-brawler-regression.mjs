// Gameboard regression — new brawler, Anthony's spec 2026-11-24.
// Locked design (his words): a queen-head projectile that bursts into
// rook shots to the sides on impact — 1 left, 1 right at tier 0. The
// Super is THROWN to place a board zone AND upgrades the main attack by
// one tier per Super: T1 2 rooks/side in a symmetrical spread (one
// up-diagonal, one down-diagonal, NOT a line); T2 3/side; T3 (max) shots
// bounce off walls, and each queen bounce releases small pawns outward
// while the queen keeps going. The zone lasts 4s and deals 16% of an
// enemy's MAX HP per second, with rooks circling the edge that deal
// contact damage and shoot at nearby enemies. Death drops the tier by 1
// (floor 0), NOT a full reset. A 4th+ Super (already maxed) still throws
// the zone AND gives +15% reload speed for 3s. Hypercharge: the main
// attack fires at max tier and the impact burst ALSO fires 2 fore + 2
// aft; the Super zone is 30% larger; any enemy hit by a rook gets rooks
// circling THEM for 6s, spreading to other enemies those rooks hit.
// SP1 Castling (Anthony): dying KEEPS the tier instead of dropping one.
// SP2 Diagonal Death (Anthony's idea): enemies damaged by the Super zone
// launch 4 bishop projectiles diagonally that damage other enemies.
// G1 Checkmate (Anthony): the next attack stuns the enemy it hits for 1s
// but deals 50% less damage. G2 Rook Swap (Anthony): the next attack
// fires 3 rooks that push enemies back, dealing 800 damage in total.
// Voice lines are flavor-only (RULE ONE) and silent until Anthony picks
// a voice. Builder picks (flagged for his correction): Gameboard /
// Anomaly Controller (850 souls) / #f5c542 / ♟️ (class is Cosmo's pick —
// he said "idk what class"); 5600 HP / 700 dmg / 270 speed, reload 1.6s,
// fire delay 300ms; queen 900 px/s / 750 range; rook 800 px/s / 500
// range / 450 dmg; T1 spread ±35 deg, T2 -40/0/+40 deg; bounce-release
// 6 pawns (600 px/s / 300 range / 250 dmg); Super throw range 800;
// zone radius 200 (hyper 260) / 250ms ticks of 4% max HP; 4 circling
// rooks (1.8 rad/s, contact 300 dmg / 500ms per enemy, shots 350 dmg /
// 340 range / 800ms per rook); curse 6s / 2 rooks / 900ms shots / 380
// range / 300 dmg; bishops 700 px/s / 450 range / 350 dmg; G2 rooks
// 800 px/s / 550 range / 130 pushback / ±20 deg spread, 267 dmg each
// (800 total / 3); bot Super gate 800px; max 2 zones per owner; Super
// charge hits 12; hyper "top and bottom" read as fore + aft along the
// queen's travel axis (the sides already cover the perpendicular);
// SP2 bishops fire once per enemy per zone; a zone still lands if the
// owner died mid-flight, but no tier upgrade is granted then; curse
// spread needs the owner hypercharged at hit time or a hyper-fired rook.
// Roster: Gameboard makes 107 ids / 107 selectable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/gameboard-voicelines.js', import.meta.url), 'utf8');
const hcModule = fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const gameboardBlock = game.slice(game.indexOf('// ===== Gameboard systems'), game.indexOf('// ===== Christmas Showdown buffs'));

// ---------------------------------------------------------- 1. source pins
check('roster includes gameboard (107 ids)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon', 'driller', 'gravy', 'pitch', 'spritz', 'gameboard'"));
check('selectable is 107 (107 ids, none disabled, gameboard not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [...game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  return all.length === 107 && all.filter(id => !disabled.includes(id)).length === 107 && !disabled.includes('gameboard');
})());
check('rarity Anomaly (850 souls)', game.includes("gameboard: 'Anomaly',") && game.includes('Anomaly: 850'));
check('role Controller (primary Controller)', game.includes("name: 'Gameboard', role: 'Controller'") && game.includes("gameboard:'Controller',"));
check('portrait icon present (pawn)', game.includes("gameboard: '♟️',"));
check('color gold', game.includes("name: 'Gameboard', role: 'Controller', rarity: 'Anomaly', color: '#f5c542'"));
check('stats branch 5600/700/270', game.includes("if (brawlerId === 'gameboard') {") && game.includes('hp: Math.round(5600 * hpScale), dmg: Math.round(700 * scale), speed: 270'));
check('reload 1600ms', game.includes('gameboard: 1600,'));
check('fire delay 300ms', game.includes('gameboard: 300,'));
check('super charge hits entry: gameboard 12 (multi-projectile kits charge slower)', (() => {
  const map = game.slice(game.indexOf('const SUPER_CHARGE_HITS_BY_BRAWLER'), game.indexOf('});', game.indexOf('const SUPER_CHARGE_HITS_BY_BRAWLER')));
  return map.includes('gameboard: 12');
})());
check('super DOES charge from damage (no spritz-style exclusion for gameboard)', !game.includes("if (brawler !== 'gameboard') superCharge") && !game.includes("if (brawler !== 'gameboard') owner.superCharge"));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'gameboard': {") && game.includes("name: 'Gameboard'") && game.includes('attack: "Queen') && game.includes('super: "Grandmaster') && game.includes("g1: 'Checkmate") && game.includes("g2: 'Rook Swap") && game.includes("sp1: 'Castling") && game.includes("sp2: 'Diagonal Death") && !game.slice(game.indexOf("'gameboard': {"), game.indexOf("'gameboard': {") + 2600).includes('coming soon'));
check('card text matches the kit (queen burst + thrown zone + tier upgrade)', game.includes('Fire a queen head that bursts into rook shots to the sides on impact.') && game.includes('Throw a piece to place a board zone that drains enemies and rings them with circling rooks.'));
check('card text carries G1 (stun 1s, 50% less) + G2 (3 rooks, 800 total)', game.includes('Checkmate (Your next attack stuns the enemy it hits for 1 second, but deals 50% less damage)') && game.includes('Rook Swap (Your next attack fires 3 rooks that push enemies back, dealing 800 damage in total)'));
check('card text carries SP1 (Castling keeps tier) + SP2 (Diagonal Death bishops)', game.includes('Castling (When Gameboard is defeated, he keeps his main-attack upgrade tier instead of losing one)') && game.includes('Diagonal Death (Enemies damaged by your Super launch 4 bishop shots diagonally that damage other enemies)'));
check('gadget cooldown map entry', game.includes('gameboard: { g1: 14000, g2: 16000 },'));
check('gadget icons (knight + rook)', game.includes("'gameboard:g1': '♞',") && game.includes("'gameboard:g2': '♜',"));
check('fire branch exists', game.includes("} else if (brawler === 'gameboard') {") && game.includes('fireGameboardMain(fromEntity, targetX, targetY, isBot);'));
check('player super dispatch', game.includes("if (combatBrawler === 'gameboard') { castGameboardSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'gameboard') { castGameboardSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2)', game.includes("curBrawler === 'gameboard' && curGadget === 'g1'") && game.includes("curBrawler === 'gameboard' && curGadget === 'g2'") && game.includes("executeGameboardGadget(player, 'g2', false);"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'gameboard' && g === 'g1'") && game.includes("bot.brawler === 'gameboard' && g === 'g2'"));
check('bot super range gate: thrown zone inside 800px', game.includes("if (bot.brawler === 'gameboard') return distance < GAMEBOARD_BOT_SUPER_RANGE;"));
check('death tier drop hook in the respawn reset site', game.includes('gameboardApplyDeathTierDrop(entity)'));
check('maxed-Super reload buff hook in getReloadTime', game.includes("if (brawler === 'gameboard' && performance.now() < (player.gameboardReloadBuffUntil || 0)) base /= GAMEBOARD_RELOAD_BUFF_MULT;"));
check('checkHit hook: queen bursts on enemy hit', game.includes('if (b.isGameboardQueen && !b._gameboardBurstDone) {') && game.includes('gameboardQueenBurst(b, owner);'));
check('checkHit hook: rook hits curse while hypercharged', game.includes("if (b.isGameboardRook && owner && (b.gameboardHyper || isEntityHyperchargedNow(owner))) {") && game.includes('gameboardApplyCurse(target, owner);'));
check('checkHit hook: G1 stun + G2 pushback', game.includes("applyStatusEffect(target, 'stun', b.gameboardStunMs);") && game.includes('applyKnockback(target, owner.x, owner.y, b.gameboardSwapKnockback, performance.now());'));
check('queen burst hook appears in all three flight-end sites (hit, expiry, wall)', game.includes('gameboardQueenBurst(b, owner);') && game.includes('gameboardQueenBurst(b, gameboardOwner);') && game.includes('gameboardQueenBurst(b, gameboardWallOwner);'));
check('bullet loop: queen bursts at end of flight', game.includes("if (b.isGameboardQueen && b.life >= b.maxLife && !b._gameboardBurstDone) {"));
check('processBounce hook: tier-3 queen releases pawns on bounce', game.includes('if (b.isGameboardQueen) gameboardQueenBounceRelease(b);'));
check('update loop calls updateGameboardSystems', game.includes('if (playing && !gameOver) updateGameboardSystems(dt);'));
check('render calls renderGameboardEffects', game.includes('    renderGameboardEffects();'));
check('voice watcher is called', game.includes('        updateGameboardVoiceState();'));
check('reset sites clear the Gameboard arrays (.length = 0 site)', game.includes('gameboardThrownSupers.length = 0; gameboardZones.length = 0;'));
check('reset sites clear the Gameboard arrays (all 3 = [] sites)', (game.match(/gameboardThrownSupers = \[\]; gameboardZones = \[\]; player\.gameboardTier = 0;/g) || []).length === 3);
check('simplify gate whitelists all 4 Gameboard fxKinds', game.includes("const SPRITZ_PITCH_CUSTOM_FX = new Set(['spritzWaterBlast', 'spritzModeSwap', 'pitchHexBurst', 'pitchPigSpawn', 'gameboardZoneLand', 'gameboardQueenBurst', 'gameboardBounceRelease', 'gameboardBishopLaunch']);"));
check('portrait body-art branch (dark suit + gold queen crown + rook)', game.includes("if (brawlerId === 'gameboard') {") && game.includes("ctx.fillStyle = '#1e293b';") && game.includes("ctx.fillStyle = '#f5c542';"));
check('bullet render branches (queen/rook/pawn/bishop) hoisted to a top-level gameboard owner branch (not nested in kage)', game.includes("if (b.ownerBrawler === 'gameboard') {") && game.includes('if (b.isGameboardQueen) {') && game.includes('} else if (b.isGameboardRook) {') && game.includes('} else if (b.isGameboardPawn) {') && game.includes('} else if (b.isGameboardBishop) {'));
check('constants: queen 700/900/750, rook 450/800/500, spreads 35/40', game.includes('const GAMEBOARD_QUEEN_DMG = 700;') && game.includes('const GAMEBOARD_QUEEN_SPEED = 900;') && game.includes('const GAMEBOARD_QUEEN_RANGE = 750;') && game.includes('const GAMEBOARD_ROOK_DMG = 450;') && game.includes('const GAMEBOARD_ROOK_SPEED = 800;') && game.includes('const GAMEBOARD_ROOK_RANGE = 500;') && game.includes('const GAMEBOARD_T1_SPREAD_DEG = 35;') && game.includes('const GAMEBOARD_T2_SPREAD_DEG = 40;'));
check('constants: pawns 6x250/600/300, throw 800, zone 200/1.3/4000/250ms/16pct', game.includes('const GAMEBOARD_BOUNCE_RELEASE_COUNT = 6;') && game.includes('const GAMEBOARD_PAWN_DMG = 250;') && game.includes('const GAMEBOARD_PAWN_SPEED = 600;') && game.includes('const GAMEBOARD_PAWN_RANGE = 300;') && game.includes('const GAMEBOARD_SUPER_THROW_RANGE = 800;') && game.includes('const GAMEBOARD_ZONE_RADIUS = 200;') && game.includes('const GAMEBOARD_ZONE_RADIUS_HYPER_MULT = 1.3;') && game.includes('const GAMEBOARD_ZONE_DURATION_MS = 4000;') && game.includes('const GAMEBOARD_ZONE_TICK_MS = 250;') && game.includes('const GAMEBOARD_ZONE_DOT_PCT_PER_S = 0.16;'));
check('constants: zone rooks 4/1.8/300/350/340/800, curse 6s/2/900/380/300, bishops 700/450/350', game.includes('const GAMEBOARD_ZONE_ROOK_COUNT = 4;') && game.includes('const GAMEBOARD_ZONE_ROOK_ORBIT_RAD_S = 1.8;') && game.includes('const GAMEBOARD_ZONE_ROOK_CONTACT_DMG = 300;') && game.includes('const GAMEBOARD_ZONE_ROOK_SHOT_DMG = 350;') && game.includes('const GAMEBOARD_ZONE_ROOK_SHOT_RANGE = 340;') && game.includes('const GAMEBOARD_ZONE_ROOK_SHOT_COOLDOWN_MS = 800;') && game.includes('const GAMEBOARD_CURSE_DURATION_MS = 6000;') && game.includes('const GAMEBOARD_CURSE_ROOK_COUNT = 2;') && game.includes('const GAMEBOARD_CURSE_SHOT_COOLDOWN_MS = 900;') && game.includes('const GAMEBOARD_CURSE_SHOT_RANGE = 380;') && game.includes('const GAMEBOARD_CURSE_SHOT_DMG = 300;') && game.includes('const GAMEBOARD_BISHOP_SPEED = 700;') && game.includes('const GAMEBOARD_BISHOP_RANGE = 450;') && game.includes('const GAMEBOARD_BISHOP_DMG = 350;'));
check('constants: G1 stun 1000ms + half damage, G2 3x267/800/550/130, reload buff 1.15/3000, bot gate 800', game.includes('const GAMEBOARD_G1_STUN_MS = 1000;') && game.includes('const GAMEBOARD_G1_DMG_MULT = 0.5;') && game.includes('const GAMEBOARD_G2_ROOK_COUNT = 3;') && game.includes('const GAMEBOARD_G2_ROOK_DMG_EACH = 267;') && game.includes('const GAMEBOARD_G2_ROOK_RANGE = 550;') && game.includes('const GAMEBOARD_G2_ROOK_KNOCKBACK = 130;') && game.includes('const GAMEBOARD_RELOAD_BUFF_MULT = 1.15;') && game.includes('const GAMEBOARD_RELOAD_BUFF_DURATION_MS = 3000;') && game.includes('const GAMEBOARD_BOT_SUPER_RANGE = 800;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function gameboardHasSP1(entity) { return gameboardStarChoice(entity) === 'slow'; }") && game.includes("function gameboardHasSP2(entity) { return gameboardStarChoice(entity) === 'long'; }"));
check('no Brawl Stars wording in the Gameboard block', !gameboardBlock.includes('Brawl Stars') && !gameboardBlock.includes('Supercell'));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'w' + 'itch'}\\b`, 'i').test(game));
check('zero bare word-boundary deleted-name in this test file', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(fs.readFileSync(new URL(import.meta.url), 'utf8')));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/gameboard-voicelines.js'"));
check('voice module registered in the audio module list', game.includes("'BraweGameboardVoice'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweGameboardVoice?.play('attack')") && game.includes("BraweGameboardVoice?.play('kill')") && game.includes("BraweGameboardVoice?.play('super')") && game.includes('updateGameboardVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('voice module is a silent no-op until Anthony picks a voice', voiceModule.includes('No voice selected yet: silent no-op') && voiceModule.includes('window.BraweGameboardVoiceClip'));
check('hypercharge sting: gameboard mapped in the HC module', hcModule.includes("'gameboard': 'gameboard.mp3',"));
check('hypercharge sting: gameboard.mp3 exists, real MP3, 5-15KB, distinct from pitch/spritz/freezeon', (() => {
  const repo = new URL('..', import.meta.url).pathname;
  const p = path.join(repo, 'assets/sfx/hc/gameboard.mp3');
  if (!fs.existsSync(p)) return false;
  const buf = fs.readFileSync(p);
  const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const other = ['pitch', 'spritz', 'freezeon'].map(id => crypto.createHash('md5').update(fs.readFileSync(path.join(repo, 'assets/sfx/hc', id + '.mp3'))).digest('hex'));
  return isMp3 && buf.length >= 5000 && buf.length <= 15000 && !other.includes(md5);
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
const knockbacks = [];
const voicePlays = [];
const superButtonCalls = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let gameboardThrownSupers = [];
let gameboardZones = [];
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
    gameboardTier: opts.gameboardTier ?? 0,
    gameboardG1Armed: !!opts.gameboardG1Armed, gameboardG2Armed: !!opts.gameboardG2Armed,
    gameboardReloadBuffUntil: opts.gameboardReloadBuffUntil ?? 0,
    gameboardCurseUntil: opts.gameboardCurseUntil ?? 0,
    visualAimAngle: opts.visualAimAngle ?? 0, superCharge: opts.superCharge ?? 0,
    slowUntil: 0, rootUntil: 0, stunUntil: 0,
  };
  entitiesById.set(id, e);
  return e;
}
function resetWorld() {
  entitiesById.clear();
  bullets = [];
  explosions = [];
  gameboardThrownSupers = [];
  gameboardZones = [];
  bots = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  statusEffects.length = 0;
  knockbacks.length = 0;
  voicePlays.length = 0;
  superButtonCalls.length = 0;
  nowMs = 100000;
  nextId = 9000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'gameboard', x: 0, y: 0, hp: 5600, maxHp: 5600 });
  sandbox.player = playerEnt;
  sandbox.bots = bots;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.gameboardThrownSupers = gameboardThrownSupers;
  sandbox.gameboardZones = gameboardZones;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'gameboard';
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.superCharge = 0;
  sandbox.gameboardVoicePrevPlaying = false;
  sandbox.gameboardVoicePrevGameOver = false;
  sandbox.gameboardVoiceMatchEndPlayed = false;
  sandbox.gameboardVoiceLastHp = null;
  sandbox.gameboardVoiceLastActionAt = 0;
  sandbox.gameboardVoiceLastIdleAt = 0;
  sandbox.nextId = nextId;
}
function mkBot(id, opts = {}) {
  const b = mkEntity(id, { team: 'enemy', ...opts });
  bots.push(b);
  sandbox.bots = bots;
  return b;
}
function mkAlly(id, opts = {}) {
  const b = mkEntity(id, { team: 'player', ...opts });
  bots.push(b);
  sandbox.bots = bots;
  return b;
}
function syncGameboardArrays() {
  gameboardThrownSupers = sandbox.gameboardThrownSupers;
  gameboardZones = sandbox.gameboardZones;
  bullets = sandbox.bullets;
  bots = sandbox.bots;
}
const bulletAngles = () => bullets.map(b => ((Math.round(Math.atan2(b.vy, b.vx) * 180 / Math.PI) + 360) % 360));
const angleSet = (arr) => [...new Set(arr)].sort((a, b) => a - b);

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  isEntityHyperchargedNow: (e) => !!e && (e.id === 'p1' ? sandbox.isHypercharged : !!e.isHypercharged),
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler, isGameboardZoneDot: !!synth.isGameboardZoneDot, isGameboardRook: !!synth.isGameboardRook });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  applyStatusEffect: (e, effect, ms) => {
    statusEffects.push({ id: e.id, effect, ms });
    if (effect === 'slow') e.slowUntil = Math.max(e.slowUntil || 0, nowMs + ms);
    if (effect === 'root') e.rootUntil = Math.max(e.rootUntil || 0, nowMs + ms);
    if (effect === 'stun') e.stunUntil = Math.max(e.stunUntil || 0, nowMs + ms);
  },
  applyKnockback: (target, fromX, fromY, dist, at) => { knockbacks.push({ id: target.id, dist }); },
  updateSuperButton: () => { superButtonCalls.push(nowMs); },
  isFusedEntity: (e) => !!e && Array.isArray(e.fusedParts) && e.fusedParts.length === 2,
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  gameboardThrownSupers: [],
  gameboardZones: [],
  isHypercharged: false,
  selectedBrawler: 'gameboard',
  playing: false,
  gameOver: false,
  superCharge: 0,
  gameboardVoicePrevPlaying: false,
  gameboardVoicePrevGameOver: false,
  gameboardVoiceMatchEndPlayed: false,
  gameboardVoiceLastHp: null,
  gameboardVoiceLastActionAt: 0,
  gameboardVoiceLastIdleAt: 0,
  nextId: 9000,
  window: { BraweGameboardVoice: { play: (kind) => { voicePlays.push(kind); } } },
  ctx: null,
};
// Pull every GAMEBOARD_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (GAMEBOARD_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'gameboardLevelScale', 'gameboardStarChoice', 'gameboardHasSP1', 'gameboardHasSP2', 'isGameboard',
    'gameboardFindOwner', 'gameboardTierOf', 'gameboardScaledDmg', 'gameboardApplyDeathTierDrop',
    'fireGameboardMain', 'gameboardQueenBurst', 'gameboardQueenBounceRelease', 'gameboardFireBishops',
    'gameboardApplyCurse', 'castGameboardSuper', 'gameboardSpawnZone', 'gameboardLandSuper',
    'executeGameboardGadget', 'updateGameboardSystems', 'renderGameboardEffects', 'updateGameboardVoiceState',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + level scale + isGameboard + tier default + scaled damage ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.gameboardHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.gameboardHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.gameboardHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.gameboardHasSP2({ selectedStar: 'slow' }) === false);
  check('level scale: P11 = 1.0', near(sandbox.gameboardLevelScale({ level: 11 }), 1.0));
  check('level scale: L1 = 0.55', near(sandbox.gameboardLevelScale({ level: 1 }), 0.55));
  check('isGameboard: brawler id matches', sandbox.isGameboard({ id: 'x', brawler: 'gameboard' }) === true);
  check('isGameboard: player with gameboard selected matches', sandbox.isGameboard(playerEnt) === true);
  check('isGameboard: other brawler does not match', sandbox.isGameboard({ id: 'y', brawler: 'outlit' }) === false);
  check('owner lookup: player by id', sandbox.gameboardFindOwner('p1') === playerEnt);
  const bot = mkBot('e1', { x: 100, y: 0 });
  check('owner lookup: bot by id', sandbox.gameboardFindOwner('e1') === bot);
  check('owner lookup: unknown id is null', sandbox.gameboardFindOwner('nope') === null);
  check('tier default: no tier stored means tier 0', sandbox.gameboardTierOf({}) === 0);
  check('tier: stored tier is honored', sandbox.gameboardTierOf({ gameboardTier: 2 }) === 2);
  check('tier: hypercharged means effective tier 3 without changing stored tier', (() => { const e = { id: 'x', gameboardTier: 0, isHypercharged: true }; return sandbox.gameboardTierOf(e) === 3 && e.gameboardTier === 0; })());
  check('tier: G1-armed means effective tier 3', sandbox.gameboardTierOf({ gameboardTier: 1, gameboardG1Armed: true }) === 3);
  check('scaled damage: 700 at P11, 385 at L1', sandbox.gameboardScaledDmg({ level: 11 }, 700) === 700 && sandbox.gameboardScaledDmg({ level: 1 }, 700) === 385);
} catch (e) { failures.push('SP gates/level scale/isGameboard threw: ' + e.message); }

// --- executed: tiers upgrade ONLY via Super (firing never changes the tier) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('tier: fresh Gameboard starts at tier 0', sandbox.gameboardTierOf(playerEnt) === 0);
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  check('tier (fire): one queen bullet, no burst yet, tier still 0', bullets.length === 1 && bullets[0].isGameboardQueen === true && bullets[0].gameboardTier === 0 && bullets[0].canBounce === false && sandbox.gameboardTierOf(playerEnt) === 0);
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  check('tier: firing three times never upgrades the tier', bullets.length === 3 && sandbox.gameboardTierOf(playerEnt) === 0 && gameboardZones.length === 0);
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  check('super: one thrown piece, still tier 0 until it lands', gameboardThrownSupers.length === 1 && sandbox.gameboardTierOf(playerEnt) === 0);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('super: landing upgrades tier 0 -> 1 and drops a zone at the target', playerEnt.gameboardTier === 1 && gameboardThrownSupers.length === 0 && gameboardZones.length === 1 && gameboardZones[0].x === 1300 && gameboardZones[0].y === 500);
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('super: second landing upgrades tier 1 -> 2', playerEnt.gameboardTier === 2);
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('super: third landing upgrades tier 2 -> 3 (max)', playerEnt.gameboardTier === 3);
  check('tier 3: the queen can now bounce', (() => { sandbox.fireGameboardMain(playerEnt, 900, 500, false); syncGameboardArrays(); return bullets[bullets.length - 1].canBounce === true && bullets[bullets.length - 1].gameboardTier === 3; })());
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('super (maxed): 4th Super keeps tier 3 and grants the +15% reload buff for 3s', playerEnt.gameboardTier === 3 && playerEnt.gameboardReloadBuffUntil === nowMs + 3000 && floatingTexts.some((t) => t.text === '♟️ +15% RELOAD SPEED!'));
} catch (e) { failures.push('tier upgrades threw: ' + e.message); }

// --- executed: queen burst geometry per tier (+ hyper fore/aft) ---
try {
  resetWorld();
  const burstAt = (tier, hyper) => {
    bullets = [];
    sandbox.bullets = bullets;
    sandbox.gameboardQueenBurst({ x: 500, y: 500, vx: 900, vy: 0, gameboardTier: tier, gameboardHyper: hyper, gameboardStunMs: 0 }, playerEnt);
    bullets = sandbox.bullets;
    return bullets;
  };
  let b = burstAt(0, false);
  check('burst T0: 2 rooks, straight left + right of travel (90/270)', b.length === 2 && b.every((x) => x.isGameboardRook) && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([90, 270]));
  b = burstAt(1, false);
  check('burst T1: 4 rooks, symmetrical spread ±35 deg off the perpendicular', b.length === 4 && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([55, 125, 235, 305]));
  b = burstAt(2, false);
  check('burst T2: 6 rooks, -40/0/+40 deg per side', b.length === 6 && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([50, 90, 130, 230, 270, 310]));
  b = burstAt(3, false);
  check('burst T3: still 6 side rooks (bounce is the T3 gain, not more rooks)', b.length === 6 && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([50, 90, 130, 230, 270, 310]));
  b = burstAt(3, true);
  check('burst hyper: 6 side rooks + 2 fore + 2 aft (10 total)', b.length === 10 && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([25, 50, 90, 130, 155, 205, 230, 270, 310, 335]));
  check('burst: rook damage 450 at P11, hyper flag carried', b.every((x) => x.damage === 450) && b.every((x) => x.gameboardHyper === true) && b.every((x) => x.hyperVisual === true));
  b = burstAt(0, false);
  check('burst: T0 rooks do not bounce, T3 rooks do', (() => {
    const t0 = b.every((x) => x.canBounce === false);
    burstAt(3, false);
    return t0 && bullets.every((x) => x.canBounce === true);
  })());
} catch (e) { failures.push('burst geometry threw: ' + e.message); }

// --- executed: G1 Checkmate + G2 Rook Swap ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('G1: arming sets the flag + floating text', sandbox.executeGameboardGadget(playerEnt, 'g1', false) === true && playerEnt.gameboardG1Armed === true && floatingTexts.some((t) => t.text === '♟️ CHECKMATE ARMED!'));
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  check('G1: the armed queen deals half damage (350) and carries the 1s stun, flag consumed', bullets.length === 1 && bullets[0].damage === 350 && bullets[0].gameboardStunMs === 1000 && playerEnt.gameboardG1Armed === false);
  sandbox.gameboardQueenBurst(bullets[0], playerEnt);
  bullets = sandbox.bullets;
  check('G1: the burst rooks are halved too (225) and carry the stun', bullets.slice(1).every((x) => x.damage === 225 && x.gameboardStunMs === 1000));
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('G2: arming sets the flag + floating text', sandbox.executeGameboardGadget(playerEnt, 'g2', false) === true && playerEnt.gameboardG2Armed === true && floatingTexts.some((t) => t.text === '♜ ROOK SWAP ARMED!'));
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  check('G2: the armed attack fires 3 rooks and no queen (267 each = 800 total, 130 pushback)', bullets.length === 3 && bullets.every((x) => x.isGameboardRook && x.gameboardSwapRook && x.damage === 267 && x.gameboardSwapKnockback === 130) && !bullets.some((x) => x.isGameboardQueen) && playerEnt.gameboardG2Armed === false);
  check('G2: the 3 rooks spread ±20 deg around the aim', JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([0, 20, 340]));
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.executeGameboardGadget(playerEnt, 'g1', false);
  sandbox.executeGameboardGadget(playerEnt, 'g2', false);
  sandbox.fireGameboardMain(playerEnt, 900, 500, false);
  check('G1+G2: both flags consume on one fire — 3 swap rooks at half damage (134) with stun', bullets.length === 3 && bullets.every((x) => x.damage === 134 && x.gameboardStunMs === 1000) && playerEnt.gameboardG1Armed === false && playerEnt.gameboardG2Armed === false);
  check('gadget: unknown slot returns false', sandbox.executeGameboardGadget(playerEnt, 'g3', false) === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: death tier drop + SP1 Castling ---
try {
  resetWorld();
  check('death: tier 3 -> 2 without SP1', (() => { const e = { gameboardTier: 3, selectedStar: 'none' }; sandbox.gameboardApplyDeathTierDrop(e); return e.gameboardTier === 2; })());
  check('death: tier 1 -> 0 (floor, not negative)', (() => { const e = { gameboardTier: 1, selectedStar: 'none' }; sandbox.gameboardApplyDeathTierDrop(e); return e.gameboardTier === 0; })());
  check('death: tier 0 stays 0', (() => { const e = { gameboardTier: 0, selectedStar: 'none' }; sandbox.gameboardApplyDeathTierDrop(e); return e.gameboardTier === 0; })());
  check('death SP1 Castling: tier 3 stays 3', (() => { const e = { gameboardTier: 3, selectedStar: 'slow' }; sandbox.gameboardApplyDeathTierDrop(e); return e.gameboardTier === 3; })());
  check('death SP1 Castling: tier 1 stays 1', (() => { const e = { gameboardTier: 1, selectedStar: 'slow' }; sandbox.gameboardApplyDeathTierDrop(e); return e.gameboardTier === 1; })());
} catch (e) { failures.push('death tier drop threw: ' + e.message); }

// --- executed: zone DoT (16% max HP/s) + SP2 Diagonal Death bishops ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  const enemy = mkBot('e1', { x: 1300, y: 500, hp: 5000, maxHp: 5000 });
  const far = mkBot('e2', { x: 1700, y: 500, hp: 5000, maxHp: 5000 });
  const ally = mkAlly('a1', { x: 1300, y: 500, hp: 5000, maxHp: 5000 });
  const structure = mkBot('s1', { x: 1300, y: 500, hp: 5000, maxHp: 5000, isStructure: true });
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('zone: radius 200, lasts 4s', gameboardZones.length === 1 && gameboardZones[0].r === 200 && gameboardZones[0].until === nowMs + 4000);
  nowMs += 300;
  sandbox.updateGameboardSystems(0.3);
  syncGameboardArrays();
  check('zone: enemy inside takes 4% max HP per 250ms tick (200 of 5000)', enemy.hp === 4800 && checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 200 && c.isGameboardZoneDot));
  check('zone: enemy outside, allies, and structures take nothing', far.hp === 5000 && ally.hp === 5000 && structure.hp === 5000);
  check('zone: no bishops without SP2', bullets.filter((b) => b.isGameboardBishop).length === 0);
  // SP2: bishops once per enemy per zone.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.selectedStar = 'long';
  const sp2Enemy = mkBot('e1', { x: 1300, y: 500, hp: 5000, maxHp: 5000 });
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('zone SP2: duration is 6s, not 4s', gameboardZones.length === 1 && gameboardZones[0].until === nowMs + 6000);
  nowMs += 300;
  sandbox.updateGameboardSystems(0.3);
  syncGameboardArrays();
  const bishops = bullets.filter((b) => b.isGameboardBishop);
  check('zone SP2: the damaged enemy launches 4 bishops, one per diagonal', bishops.length === 4 && JSON.stringify(angleSet(bishops.map(b => ((Math.round(Math.atan2(b.vy, b.vx) * 180 / Math.PI) + 360) % 360)))) === JSON.stringify([45, 135, 225, 315]));
  check('zone SP2: bishops deal 350 and never target their launcher', bishops.every((b) => b.damage === 350 && b.hitIds && b.hitIds['e1'] === true));
  const bishopCount = bullets.filter((b) => b.isGameboardBishop).length;
  nowMs += 300;
  sandbox.updateGameboardSystems(0.3);
  syncGameboardArrays();
  check('zone SP2: no second bishop volley from the same enemy in the same zone', bullets.filter((b) => b.isGameboardBishop).length === bishopCount && sp2Enemy.hp === 4600);
  // Hyper zone is 30% larger.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.castGameboardSuper(playerEnt, true, 1300, 500);
  nowMs += 1000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('zone hyper: radius 260 (30% larger)', gameboardZones.length === 1 && gameboardZones[0].r === 260);
  // Expiry.
  nowMs += 5000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('zone: expired zones are removed', gameboardZones.length === 0);
} catch (e) { failures.push('zone DoT/bishops threw: ' + e.message); }

// --- executed: circling-rook contact + shots ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.gameboardSpawnZone(playerEnt, 500, 500, false);
  syncGameboardArrays();
  // Rook 0 starts at angle 0 -> (700, 500). Park an enemy 200px from it:
  // inside shot range (340), outside contact range (40).
  const shooterTarget = mkBot('e1', { x: 700, y: 300, hp: 5000, maxHp: 5000 });
  gameboardZones[0].nextTickAt = nowMs + 100000; // isolate the rook shot from the zone tick
  nowMs += 100;
  sandbox.updateGameboardSystems(0); // dt 0: the rooks hold position, so the shot origin is exact
  syncGameboardArrays();
  const rookShots = bullets.filter((b) => b.isGameboardRook && !b.gameboardSwapRook);
  check('zone rook: a circling rook shoots a nearby enemy (350 dmg, from the rook)', rookShots.length >= 1 && rookShots[0].damage === 350 && rookShots[0].x === 700 && rookShots[0].y === 500);
  // Contact: an enemy standing on a rook takes 300.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.gameboardSpawnZone(playerEnt, 500, 500, false);
  syncGameboardArrays();
  const contactTarget = mkBot('e1', { x: 700, y: 500, hp: 5000, maxHp: 5000 });
  gameboardZones[0].nextTickAt = nowMs + 100000;
  nowMs += 100;
  sandbox.updateGameboardSystems(0); // dt 0: the rooks hold position, so contact range holds across ticks
  syncGameboardArrays();
  check('zone rook: contact with a circling rook deals 300', contactTarget.hp === 4700);
  nowMs += 100;
  sandbox.updateGameboardSystems(0);
  syncGameboardArrays();
  check('zone rook: contact has a 500ms per-enemy cooldown (no second hit yet)', contactTarget.hp === 4700);
  nowMs += 500;
  sandbox.updateGameboardSystems(0);
  syncGameboardArrays();
  check('zone rook: contact hits again after the cooldown', contactTarget.hp === 4400);
} catch (e) { failures.push('zone rooks threw: ' + e.message); }

// --- executed: hyper contagion (curse) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.isHypercharged = true;
  const cursed = mkBot('e1', { x: 800, y: 500, hp: 5000, maxHp: 5000 });
  const other = mkBot('e2', { x: 1000, y: 500, hp: 5000, maxHp: 5000 });
  check('curse: applying rings the victim for 6s with 2 rooks', sandbox.gameboardApplyCurse(cursed, playerEnt) === true && cursed.gameboardCurseUntil === nowMs + 6000 && Array.isArray(cursed.gameboardCurseRooks) && cursed.gameboardCurseRooks.length === 2);
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  const curseShots = bullets.filter((b) => b.isGameboardRook && b.ownerId === 'p1');
  check('curse: the circling rooks shoot other enemies (300 dmg, hyper-fired)', curseShots.length >= 1 && curseShots.every((b) => b.damage === 300 && b.gameboardHyper === true));
  check('curse: the host itself is never the shot target', !curseShots.some((b) => Math.hypot(b.vx, b.vy) === 0));
  nowMs += 7000;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  const shotsAfterExpiry = bullets.filter((b) => b.isGameboardRook && b.ownerId === 'p1').length;
  check('curse: expired curses stop shooting', shotsAfterExpiry === curseShots.length);
  check('curse: dead targets are not cursed', sandbox.gameboardApplyCurse({ ...cursed, hp: 0 }, playerEnt) === false);
} catch (e) { failures.push('curse threw: ' + e.message); }

// --- executed: bounce release + thrown-super clamp ---
try {
  resetWorld();
  check('bounce release: 6 pawns radial (0/60/.../300), 250 dmg, no owner means false', (() => {
    sandbox.gameboardQueenBounceRelease({ x: 500, y: 500, ownerId: 'p1', gameboardHyper: false });
    bullets = sandbox.bullets;
    return bullets.length === 6 && bullets.every((b) => b.isGameboardPawn && b.damage === 250) && JSON.stringify(angleSet(bulletAngles())) === JSON.stringify([0, 60, 120, 180, 240, 300]);
  })());
  check('bounce release: unknown owner releases nothing', sandbox.gameboardQueenBounceRelease({ x: 500, y: 500, ownerId: 'nope', gameboardHyper: false }) === false);
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.castGameboardSuper(playerEnt, false, 2000, 500);
  check('thrown super: aim past 800px clamps to the 800px throw range', gameboardThrownSupers.length === 1 && gameboardThrownSupers[0].targetX === 1300 && gameboardThrownSupers[0].targetY === 500);
  check('thrown super: flight is ~800ms at max range', gameboardThrownSupers[0].impactAt - gameboardThrownSupers[0].createdAt === 800);
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('thrown super: nothing lands before impact', gameboardThrownSupers.length === 1 && sandbox.gameboardTierOf(playerEnt) === 0);
  nowMs += 900;
  sandbox.updateGameboardSystems(0.016);
  syncGameboardArrays();
  check('thrown super: landing upgrades the tier and drops the zone', gameboardThrownSupers.length === 0 && playerEnt.gameboardTier === 1 && gameboardZones.length === 1 && gameboardZones[0].x === 1300);
  check('thrown super: dead owner still lands the zone but gets no tier', (() => {
    resetWorld();
    playerEnt.x = 500; playerEnt.y = 500;
    sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
    playerEnt.hp = 0;
    nowMs += 900;
    sandbox.updateGameboardSystems(0.016);
    syncGameboardArrays();
    return gameboardZones.length === 1 && playerEnt.gameboardTier === 0;
  })());
} catch (e) { failures.push('bounce release / thrown super threw: ' + e.message); }

// --- executed: voice watcher ---
try {
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  check('voice: spawn line when the match starts', voicePlays.includes('spawn'));
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  playerEnt.hp = 5000;
  sandbox.gameOver = true;
  sandbox.updateGameboardVoiceState();
  check('voice: win line on game over with HP left', voicePlays.includes('win'));
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  playerEnt.hp = 0;
  sandbox.gameOver = true;
  sandbox.updateGameboardVoiceState();
  check('voice: death line + CHECKMATED! text on game over with no HP', voicePlays.includes('death') && floatingTexts.some((t) => t.text === '♟️ CHECKMATED!'));
  // Hurt: HP drops mid-match.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  playerEnt.hp = 4000;
  sandbox.updateGameboardVoiceState();
  check('voice: hurt line when HP drops', voicePlays.includes('hurt'));
  // Idle: 20s without moving or attacking.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  nowMs += 21000;
  sandbox.updateGameboardVoiceState();
  check('voice: idle line after 20s of no action', voicePlays.includes('idle'));
  // Non-Gameboard selected: no lines at all.
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  sandbox.playing = true;
  sandbox.updateGameboardVoiceState();
  sandbox.gameOver = true;
  sandbox.updateGameboardVoiceState();
  check('voice: nothing plays when Gameboard is not selected', voicePlays.length === 0);
} catch (e) { failures.push('voice watcher threw: ' + e.message); }

// --- executed: render does not throw with live zones + thrown pieces ---
try {
  resetWorld();
  const ctxStub = stubCtx();
  sandbox.ctx = ctxStub.proxy;
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.gameboardSpawnZone(playerEnt, 500, 500, false);
  sandbox.castGameboardSuper(playerEnt, false, 1300, 500);
  sandbox.gameboardApplyCurse(mkBot('e1', { x: 800, y: 500 }), playerEnt);
  sandbox.renderGameboardEffects();
  check('render: zones + thrown pieces + curses render without throwing', ctxStub.calls.some((c) => c.m === 'arc'));
} catch (e) { failures.push('render threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-gameboard-brawler-regression.mjs (${passed} checks)`);
