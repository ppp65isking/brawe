// Pitch regression — new brawler, Anthony's spec 2026-11-20.
// Locked design (his words): Pitch, the pig hex-caster. Main attack: she
// throws — a throw attack that explodes in a plus shape, but her throws
// go FARTHER than the plus-throw reference. Gadget 1: the main attack
// explodes in an X AND a plus, so eight directions. Gadget 2: at the end
// of the main attack it fires another one in a plus shape. Super: she
// spawns four pigs — the knockback pigs (the chick-pig ramming pigs),
// but with LESSER health. Hypercharge: spawns MORE pigs, and her main
// attack explodes in a plus AND an X. Specialty (innate): every kill she
// gets spawns a pig. Star Power 1 (Anthony): her main-attack projectiles
// curve clockwise as they travel. Star Power 2 (Anthony): when she uses
// her Super, the spawned pigs get +50% movement speed for the first 3s.
// In-game text says 'hex-caster' so the deleted-brawler zero-proof stays
// clean (delete-disabled §7 precedent: surviving uses get reworded).
// Builder picks (flagged for his correction): Epic (170 souls); 5200 HP /
// 270 speed, reload 1.6s, Super charge 7 hits; throw 1100 px/s, 800px
// range, 700 center splash in 100px, 300-damage shards at 540 px/s for
// 0.35s; pig health 2000 at Power 11 (chickpig pig: 3690), pig speed 330,
// ram 600 + 70px knockback (reused chickpig-pig mechanic); Hyper Super
// 6 pigs; pig cap 6 per owner (oldest evicted); G2 echo 300ms after
// landing; SP1 curve 1.6 rad/s; bot Super gate 650px; kit names (Hex Toss
// / Pig Parade / Hex Cross / Echo Hex / Curveball / Stampede); voice lines
// are flavor-only (RULE ONE) and silent until Anthony picks a voice.
// Roster: Pitch makes 105 ids / 105 selectable. Spritz (2026-11-22) now makes 106 ids / 106 selectable. Pigs damage/knock back
// brawlers only, never structures — and towers can NEVER gain HP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/pitch-voicelines.js', import.meta.url), 'utf8');
const hcModule = fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const pitchBlock = game.slice(game.indexOf('// ===== Pitch systems'), game.indexOf('// ===== Christmas Showdown buffs'));

// ---------------------------------------------------------- 1. source pins
check('roster includes pitch (106 ids)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon', 'driller', 'gravy', 'pitch'"));
check('selectable is 106 (106 ids, none disabled, pitch not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [...game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  return all.length === 106 && all.filter(id => !disabled.includes(id)).length === 106 && !disabled.includes('pitch');
})());
check('rarity Epic (170 souls)', game.includes("pitch: 'Epic',") && game.includes('Epic: 170'));
check('role Thrower (primary Artillery, like every Thrower)', game.includes("name: 'Pitch', role: 'Thrower'") && game.includes("pitch:'Artillery',"));
check('portrait icon present (pig)', game.includes("pitch: '🐷',"));
check('color purple hex-caster', game.includes("name: 'Pitch', role: 'Thrower', rarity: 'Epic', color: '#a855f7'"));
check('stats branch 5200/700/270', game.includes("if (brawlerId === 'pitch') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(700 * scale), speed: 270'));
check('reload 1600ms', game.includes('pitch: 1600,'));
check('fire delay 300ms', game.includes('pitch: 300,'));
check('super charge 7 hits', game.includes('pitch: 7') && game.includes('const PITCH_SUPER_CHARGE_HITS = 7;'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'pitch': {") && game.includes("name: 'Pitch'") && game.includes("attack: 'Hex Toss'") && game.includes("super: 'Pig Parade'") && game.includes("g1: 'Hex Cross") && game.includes("g2: 'Echo Hex") && game.includes("sp1: 'Curveball") && game.includes("sp2: 'Stampede") && !game.slice(game.indexOf("'pitch': {"), game.indexOf("'pitch': {") + 2600).includes('coming soon'));
check('card text matches the kit (farther throw, plus shards, 4 pigs, hyper 6 pigs + 8 shards, kill-spawns-pig)', game.includes('Pitch lobs a hex pot in an arc over walls, farther than most throws. On landing it splashes for damage, then bursts into a plus-shaped spray of 4 shards.') && game.includes('Pitch calls in 4 pigs that charge the nearest enemies, ramming them for damage and knocking them back.') && game.includes('Hex Toss bursts in a plus AND an X — 8 shards — and Pig Parade calls in 6 pigs instead of 4.') && game.includes('every takedown she scores spawns a pig'));
check('card text carries both star powers (curve clockwise; pigs +50% for 3s)', game.includes('Curveball (Her main-attack shards curve clockwise as they fly)') && game.includes('Stampede (Pigs from her Super run 50% faster for the first 3 seconds)'));
check('gadget cooldown map entry', game.includes('pitch: { g1: 14000, g2: 16000 },'));
check('gadget icons (8-way asterisk + plus)', game.includes("'pitch:g1': '✳️',") && game.includes("'pitch:g2': '➕',"));
check('fire branch exists', game.includes("} else if (brawler === 'pitch') {") && game.includes('firePitchMain(fromEntity, targetX, targetY, isBot);'));
check('player super dispatch', game.includes("if (combatBrawler === 'pitch') { castPitchSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'pitch') { castPitchSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2)', game.includes("curBrawler === 'pitch' && curGadget === 'g1'") && game.includes("curBrawler === 'pitch' && curGadget === 'g2'") && game.includes("executePitchGadget(player, 'g2', false);"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'pitch' && g === 'g1'") && game.includes("bot.brawler === 'pitch' && g === 'g2'"));
check('bot super range gate: Pig Parade inside 650px', game.includes("if (bot.brawler === 'pitch') return distance < PITCH_BOT_SUPER_RANGE;"));
check('kill specialty hook in the death-drops loop (once per death)', game.includes('pitchHandleKill(e); // Pitch specialty: every takedown spawns a pig.'));
check('pig AI: SP2 Stampede speed boost in the ram loop', game.includes('PITCH_SP2_PIG_SPEED_MULT:1'));
check('pig AI: ram credits pitch (not chickpig) for her pigs', game.includes("ownerBrawler:t.isPitchPig?'pitch':'chickpig'"));
check('bullet loop: SP1 curve hook on pitch shards', game.includes('if (b.isPitchShard && b.pitchCurve)'));
check('shard render branch exists', game.includes('} else if (b.isPitchShard) {'));
check('update loop calls updatePitchSystems', game.includes('if (playing && !gameOver) updatePitchSystems(dt);'));
check('render calls renderPitchEffects', game.includes('    renderPitchEffects();'));
check('voice watcher is called', game.includes('        updatePitchVoiceState();'));
check('reset sites clear the Pitch arrays (.length = 0 site)', game.includes('pitchThrownHexes.length = 0; pitchPendingEchoes.length = 0;'));
check('reset sites clear the Pitch arrays (all 3 = [] sites)', (game.match(/pitchThrownHexes = \[\]; pitchPendingEchoes = \[\];/g) || []).length === 3);
check('portrait body-art branch (pointed hat + pig ears + hex pot)', game.includes("if (brawlerId === 'pitch') {") && game.includes("ctx.fillStyle = '#7e22ce';") && game.includes("ctx.fillStyle = '#f9a8d4';") && game.includes("ctx.fillStyle = '#a855f7';"));
check('constants: throw 1100/800/80, splash 100/700, shard 300/540/0.35', game.includes('const PITCH_THROW_SPEED = 1100;') && game.includes('const PITCH_THROW_RANGE = 800;') && game.includes('const PITCH_THROW_ARC_HEIGHT = 80;') && game.includes('const PITCH_SPLASH_RADIUS = 100;') && game.includes('const PITCH_SPLASH_DMG = 700;') && game.includes('const PITCH_SHARD_DMG = 300;') && game.includes('const PITCH_SHARD_SPEED = 540;') && game.includes('const PITCH_SHARD_MAX_LIFE = 0.35;'));
check('constants: super 4/6 pigs, pig 2000 HP / 330 speed, cap 6, bot gate 650', game.includes('const PITCH_SUPER_PIG_COUNT = 4;') && game.includes('const PITCH_SUPER_PIG_COUNT_HYPER = 6;') && game.includes('const PITCH_PIG_HP = 2000;') && game.includes('const PITCH_PIG_SPEED = 330;') && game.includes('const PITCH_MAX_PIGS_PER_OWNER = 6;') && game.includes('const PITCH_BOT_SUPER_RANGE = 650;'));
check('constants: G2 echo 300ms, SP1 curve 1.6 rad/s, SP2 +50% / 3000ms', game.includes('const PITCH_G2_ECHO_DELAY_MS = 300;') && game.includes('const PITCH_SP1_CURVE_RAD_PER_S = 1.6;') && game.includes('const PITCH_SP2_PIG_SPEED_MULT = 1.5;') && game.includes('const PITCH_SP2_PIG_SPEED_DURATION_MS = 3000;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function pitchHasSP1(entity) { return pitchStarChoice(entity) === 'slow'; }") && game.includes("function pitchHasSP2(entity) { return pitchStarChoice(entity) === 'long'; }"));
check('no Brawl Stars wording or Grom in the Pitch block', !pitchBlock.includes('Brawl Stars') && !pitchBlock.includes('Grom') && !pitchBlock.includes('Supercell'));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/pitch-voicelines.js'"));
check('voice module registered in the audio module list', game.includes("'BrawePitchVoice'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BrawePitchVoice?.play('attack')") && game.includes("BrawePitchVoice?.play('kill')") && game.includes("BrawePitchVoice?.play('super')") && game.includes('updatePitchVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('voice module is a silent no-op until Anthony picks a voice', voiceModule.includes('No voice selected yet: silent no-op') && voiceModule.includes('window.BrawePitchVoiceClip'));
check('hypercharge sting: pitch mapped in the HC module', hcModule.includes("'pitch': 'pitch.mp3',"));
check('hypercharge sting: pitch.mp3 exists, real MP3, 5-15KB, distinct from gravy/chickpig', (() => {
  const repo = new URL('..', import.meta.url).pathname;
  const p = path.join(repo, 'assets/sfx/hc/pitch.mp3');
  if (!fs.existsSync(p)) return false;
  const buf = fs.readFileSync(p);
  const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const other = ['gravy', 'chickpig'].map(id => crypto.createHash('md5').update(fs.readFileSync(path.join(repo, 'assets/sfx/hc', id + '.mp3'))).digest('hex'));
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
    isHypercharged: !!opts.isHypercharged, vx: opts.vx ?? 0, vy: opts.vy ?? 0,
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
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'pitch', x: 0, y: 0, hp: 5200, maxHp: 5200 });
  sandbox.player = playerEnt;
  sandbox.bots = bots;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.pitchThrownHexes = pitchThrownHexes;
  sandbox.pitchPendingEchoes = pitchPendingEchoes;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'pitch';
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.pitchVoicePrevPlaying = false;
  sandbox.pitchVoicePrevGameOver = false;
  sandbox.pitchVoiceMatchEndPlayed = false;
  sandbox.pitchVoiceLastHp = null;
  sandbox.pitchVoiceLastActionAt = 0;
  sandbox.pitchVoiceLastIdleAt = 0;
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
function syncPitchArrays() {
  pitchThrownHexes = sandbox.pitchThrownHexes;
  pitchPendingEchoes = sandbox.pitchPendingEchoes;
  bullets = sandbox.bullets;
  bots = sandbox.bots;
}
const shardAngles = () => bullets.filter(b => b.isPitchShard).map(b => ((Math.round(Math.atan2(b.vy, b.vx) * 180 / Math.PI) + 360) % 360));

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getScaledStats: (id, lvl) => id === 'pitch' ? { hp: 5200, dmg: 700, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getLevelDamageScale: (level) => 0.55 + (level - 1) * 0.045,
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler, isPitchHexSplash: !!synth.isPitchHexSplash });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  isFusedEntity: (e) => !!e && Array.isArray(e.fusedParts) && e.fusedParts.length === 2,
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
  playing: false,
  gameOver: false,
  pitchVoicePrevPlaying: false,
  pitchVoicePrevGameOver: false,
  pitchVoiceMatchEndPlayed: false,
  pitchVoiceLastHp: null,
  pitchVoiceLastActionAt: 0,
  pitchVoiceLastIdleAt: 0,
  nextId: 9000,
  window: { BrawePitchVoice: { play: (kind) => { voicePlays.push(kind); } } },
  ctx: null,
};
// Pull every PITCH_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (PITCH_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'pitchLevelScale', 'pitchStarChoice', 'pitchHasSP1', 'pitchHasSP2', 'isPitch',
    'pitchFindOwner', 'pitchSpawnPig', 'pitchHandleKill', 'firePitchMain',
    'pitchFireBurst', 'pitchLandHex', 'pitchCurveShardVelocity',
    'castPitchSuper', 'executePitchGadget', 'updatePitchSystems',
    'renderPitchEffects', 'updatePitchVoiceState',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + level scale + isPitch + owner lookup ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.pitchHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.pitchHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.pitchHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.pitchHasSP2({ selectedStar: 'slow' }) === false);
  check('level scale: P11 = 1.0', near(sandbox.pitchLevelScale({ level: 11 }), 1.0));
  check('level scale: L1 = 0.55', near(sandbox.pitchLevelScale({ level: 1 }), 0.55));
  check('isPitch: brawler id matches', sandbox.isPitch({ id: 'x', brawler: 'pitch' }) === true);
  check('isPitch: player with pitch selected matches', sandbox.isPitch(playerEnt) === true);
  check('isPitch: other brawler does not match', sandbox.isPitch({ id: 'y', brawler: 'outlit' }) === false);
  check('owner lookup: player by id', sandbox.pitchFindOwner('p1') === playerEnt);
  const bot = mkBot('e1', { x: 100, y: 0 });
  check('owner lookup: bot by id', sandbox.pitchFindOwner('e1') === bot);
  check('owner lookup: unknown id is null', sandbox.pitchFindOwner('nope') === null);
} catch (e) { failures.push('SP gates/level scale/isPitch threw: ' + e.message); }

// --- executed: main attack (lobbed hex pot 1100 px/s, 800px throw range) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.firePitchMain(playerEnt, 900, 500, false);
  check('main: one lobbed hex pot in flight (not a bullet)', pitchThrownHexes.length === 1 && bullets.length === 0);
  const hex = pitchThrownHexes[0];
  check('main: hex targets the aimed point', hex.targetX === 900 && hex.targetY === 500);
  check('main: hex flight time is 400px / 1100px/s (~364ms)', near(hex.impactAt - hex.createdAt, 400 / 1100 * 1000, 1));
  check('main: hex is not Hyper, not Cross, not Echo by default', hex.hyper === false && hex.crossArmed === false && hex.echoArmed === false);
  check('main: hex is not curved without SP1', hex.curve === false);
  check('main: hex starts at the owner', hex.startX === 500 && hex.startY === 500);
  // Throw range clamps at 800px — FARTHER than a gravy glob (620px).
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.firePitchMain(playerEnt, 2000, 500, false);
  check('main: aim past 800px clamps to the 800px throw range', pitchThrownHexes[0].targetX === 1300 && pitchThrownHexes[0].targetY === 500 && near(pitchThrownHexes[0].impactAt - pitchThrownHexes[0].createdAt, 800 / 1100 * 1000, 1));
  // Hyper: the pot carries Hyper (burst goes 8-way on landing).
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.isHypercharged = true;
  sandbox.firePitchMain(playerEnt, 900, 500, false);
  check('main (Hyper): hex carries the real Hyper state', pitchThrownHexes.length === 1 && pitchThrownHexes[0].hyper === true);
  // G1 arming is consumed on fire and rides the pot.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.pitchCrossArmed = true;
  sandbox.firePitchMain(playerEnt, 900, 500, false);
  check('main (G1): armed pot carries Hex Cross, flag consumed', pitchThrownHexes[0].crossArmed === true && playerEnt.pitchCrossArmed === false);
  // G2 arming is consumed on fire and rides the pot.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.pitchEchoArmed = true;
  sandbox.firePitchMain(playerEnt, 900, 500, false);
  check('main (G2): armed pot carries Echo Hex, flag consumed', pitchThrownHexes[0].echoArmed === true && playerEnt.pitchEchoArmed === false);
  // SP1 rides the pot as the curve flag.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.selectedStar = 'slow';
  sandbox.firePitchMain(playerEnt, 900, 500, false);
  check('main (SP1): pot carries the curve flag', pitchThrownHexes[0].curve === true);
  // Bot Hyper uses the bot's own hyper flag.
  resetWorld();
  const botOwner = mkBot('b1', { team: 'enemy', brawler: 'pitch', x: 0, y: 0, isHypercharged: true });
  sandbox.firePitchMain(botOwner, 400, 0, true);
  check('main (bot Hyper): bot pot carries Hyper', pitchThrownHexes.length === 1 && pitchThrownHexes[0].hyper === true);
} catch (e) { failures.push('main attack threw: ' + e.message); }

// --- executed: hex landing (splash 700 + plus burst of 4 shards, brawlers only) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 200, y: 100 });
  const far = mkBot('e2', { x: 400, y: 100 });
  const structure = mkBot('s1', { x: 200, y: 100, isStructure: true });
  const ally = mkAlly('a1', { x: 200, y: 100 });
  sandbox.pitchLandHex({ targetX: 200, targetY: 100, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false });
  syncPitchArrays();
  check('landing: enemy in the 100px splash takes 700', enemy.hp === 5000 - 700 && checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 700 && c.isPitchHexSplash));
  check('landing: enemy 200px past the splash is untouched', far.hp === 5000);
  check('landing: structures are never splashed', structure.hp === 5000);
  check('landing: allies are never splashed', ally.hp === 5000);
  check('landing: plus burst fires 4 shards (N/E/S/W) at 540 px/s', bullets.length === 4 && bullets.every((b) => b.isPitchShard && Math.round(Math.hypot(b.vx, b.vy)) === 540 && b.maxLife === 0.35 && b.damage === 300));
  check('landing: plus shard angles are 0/90/180/270', JSON.stringify(shardAngles().sort((a, b) => a - b)) === JSON.stringify([0, 90, 180, 270]));
  check('landing: shards are not curved without SP1', bullets.every((b) => b.pitchCurve === false));
  check('landing: burst explosion carries the real Hyper state (not Hyper)', (() => { const ex = explosions.find((e) => e.fxKind === 'pitchHexBurst'); return ex && ex.hyper === false && ex.radius === 100; })());
  check('landing: HEX BURST! floating text', floatingTexts.some((t) => t.text === '🐷 HEX BURST!'));
  // Hyper landing: plus AND X = 8 shards.
  resetWorld();
  mkBot('e1', { x: 200, y: 0 });
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: true, crossArmed: false, echoArmed: false, curve: false });
  syncPitchArrays();
  check('landing (Hyper): 8 shards — plus AND X', bullets.length === 8 && JSON.stringify(shardAngles().sort((a, b) => a - b)) === JSON.stringify([0, 45, 90, 135, 180, 225, 270, 315]));
  check('landing (Hyper): burst explosion + text carry the real Hyper state', (() => { const ex = explosions.find((e) => e.fxKind === 'pitchHexBurst'); return ex && ex.hyper === true; })() && floatingTexts.some((t) => t.text === '🐷 HEX STORM!'));
  // G1 landing: X + plus = 8 shards without Hyper.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: true, echoArmed: false, curve: false });
  syncPitchArrays();
  check('landing (G1 Hex Cross): 8 shards — X AND plus', bullets.length === 8 && JSON.stringify(shardAngles().sort((a, b) => a - b)) === JSON.stringify([0, 45, 90, 135, 180, 225, 270, 315]));
  // Hyper + G1: still 8, never 16.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: true, crossArmed: true, echoArmed: false, curve: false });
  syncPitchArrays();
  check('landing (Hyper+G1): still 8 shards, never 16', bullets.length === 8);
  // SP1: shards carry the curve flag.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: true });
  syncPitchArrays();
  check('landing (SP1): all shards carry the curve flag', bullets.length === 4 && bullets.every((b) => b.pitchCurve === true));
  // Dead owner mid-flight: no damage, no shards — but the burst still shows.
  resetWorld();
  playerEnt.hp = 0;
  mkBot('e1', { x: 200, y: 0 });
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false });
  syncPitchArrays();
  check('landing (owner dead): no damage, no shards, burst still shows', checkHitCalls.length === 0 && bullets.length === 0 && explosions.some((e) => e.fxKind === 'pitchHexBurst'));
} catch (e) { failures.push('hex landing threw: ' + e.message); }

// --- executed: G2 Echo Hex (second plus burst at the end of the main attack) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: true, curve: false });
  syncPitchArrays();
  check('echo: first burst fires on landing (4 shards)', bullets.length === 4 && enemy.hp === 5000 - 700);
  check('echo: a second burst is scheduled 300ms later', pitchPendingEchoes.length === 1 && pitchPendingEchoes[0].fireAt === nowMs + 300 && pitchPendingEchoes[0].x === 200 && pitchPendingEchoes[0].y === 0);
  nowMs += 100; // not yet
  sandbox.updatePitchSystems(0.016);
  syncPitchArrays();
  check('echo: nothing fires before the 300ms delay', pitchPendingEchoes.length === 1 && bullets.length === 4 && enemy.hp === 5000 - 700);
  nowMs += 200; // due
  sandbox.updatePitchSystems(0.016);
  syncPitchArrays();
  check('echo: second plus burst fires (4 more shards)', pitchPendingEchoes.length === 0 && bullets.length === 8);
  check('echo: second burst splashes again (700 more)', enemy.hp === 5000 - 1400);
  check('echo: second burst is plus-only, never X', JSON.stringify(shardAngles().sort((a, b) => a - b)) === JSON.stringify([0, 0, 90, 90, 180, 180, 270, 270]));
  // No echo without G2.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false });
  syncPitchArrays();
  check('echo: no pending echo without G2', pitchPendingEchoes.length === 0);
  // Dead owner cancels the echo.
  resetWorld();
  sandbox.pitchLandHex({ targetX: 200, targetY: 0, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: true, curve: false });
  playerEnt.hp = 0;
  nowMs += 300;
  sandbox.updatePitchSystems(0.016);
  syncPitchArrays();
  check('echo: dead owner cancels the second burst', pitchPendingEchoes.length === 0 && bullets.length === 4);
} catch (e) { failures.push('G2 echo threw: ' + e.message); }

// --- executed: SP1 Curveball (shards curve clockwise) ---
try {
  resetWorld();
  const straight = sandbox.pitchCurveShardVelocity(540, 0, 0);
  check('curve: zero dt leaves velocity unchanged', straight.vx === 540 && straight.vy === 0);
  const curved = sandbox.pitchCurveShardVelocity(540, 0, 0.1);
  check('curve: velocity rotates clockwise (vy turns positive, vx shrinks)', curved.vy > 0 && curved.vx < 540 && curved.vx > 0);
  check('curve: speed is preserved (rotation only)', near(Math.hypot(curved.vx, curved.vy), 540, 0.001));
  check('curve: 0.1s at 1.6 rad/s turns the shard ~9.2 degrees', near(Math.atan2(curved.vy, curved.vx) * 180 / Math.PI, 1.6 * 0.1 * 180 / Math.PI, 0.01));
  const up = sandbox.pitchCurveShardVelocity(0, -540, 0.1);
  check('curve: an upward shard curves toward the right (clockwise)', up.vx > 0 && up.vy < 0);
  const full = sandbox.pitchCurveShardVelocity(540, 0, Math.PI * 2 / 1.6);
  check('curve: one full turn (2PI / 1.6s) returns to the start heading', near(full.vx, 540, 0.01) && near(full.vy, 0, 0.01));
} catch (e) { failures.push('SP1 curve threw: ' + e.message); }

// --- executed: Super Pig Parade (4 knockback pigs, lesser health) ---
try {
  resetWorld();
  check('super: no pigs before cast', bots.length === 0);
  check('super: cast returns true and spawns 4 pigs', sandbox.castPitchSuper(playerEnt, false, 500, 0) === true && bots.length === 4);
  syncPitchArrays();
  check('super: pigs are knockback pigs (chickpig-pig entity + pitch mark)', bots.every((p) => p.isChickpigPig === true && p.isPitchPig === true && p.brawler === 'chickpig_pig'));
  check('super: pigs have LESSER health — 2000 HP at Power 11 (chickpig pig: 3690)', bots.every((p) => p.hp === 2000 && p.maxHp === 2000));
  check('super: pigs chase at 330 and belong to the owner', bots.every((p) => p.speed === 330 && p.ownerId === 'p1' && p.team === 'player'));
  check('super: pigs are pets, not Hyper', bots.every((p) => p.isPet === true && p.chickpigPigHyper === false));
  check('super: pigs have unique ids', new Set(bots.map((p) => p.id)).size === 4);
  check('super: PIG PARADE! floating text', floatingTexts.some((t) => t.text === '🐷 PIG PARADE!'));
  // No SP2: no speed boost on the pigs.
  check('super (no SP2): pigs have no Stampede boost', bots.every((p) => p.pitchPigBoostUntil === 0));
  // SP2 Stampede: pigs run 50% faster for the first 3 seconds.
  resetWorld();
  playerEnt.selectedStar = 'long';
  sandbox.castPitchSuper(playerEnt, false, 500, 0);
  syncPitchArrays();
  check('super (SP2 Stampede): pigs get a speed boost until now + 3000ms', bots.length === 4 && bots.every((p) => p.pitchPigBoostUntil === nowMs + 3000));
  // Hyper: MORE pigs — 6.
  resetWorld();
  sandbox.castPitchSuper(playerEnt, true, 500, 0);
  syncPitchArrays();
  check('super (Hyper): 6 pigs instead of 4', bots.length === 6 && bots.every((p) => p.hp === 2000));
  // Dead entity cannot cast.
  resetWorld();
  playerEnt.hp = 0;
  check('super: dead entity cannot cast', sandbox.castPitchSuper(playerEnt, false, 500, 0) === false && bots.length === 0);
  // Pig cap: 6 per owner, oldest evicted.
  resetWorld();
  sandbox.castPitchSuper(playerEnt, false, 500, 0);
  syncPitchArrays();
  const firstPigId = bots[0].id;
  sandbox.pitchSpawnPig(playerEnt, 100, 100, false);
  sandbox.pitchSpawnPig(playerEnt, 200, 100, false);
  syncPitchArrays();
  check('pigs: 6 pigs fit under the cap (no eviction yet)', bots.length === 6 && bots.some((p) => p.id === firstPigId));
  sandbox.pitchSpawnPig(playerEnt, 300, 100, false);
  syncPitchArrays();
  check('pigs: cap is 6 per owner (oldest evicted on the 7th)', bots.length === 6 && !bots.some((p) => p.id === firstPigId));
  sandbox.pitchSpawnPig(playerEnt, 400, 100, false);
  syncPitchArrays();
  check('pigs: cap holds at 6 on further spawns', bots.length === 6);
} catch (e) { failures.push('super threw: ' + e.message); }

// --- executed: kill specialty (every takedown spawns a pig) ---
try {
  resetWorld();
  const victim = mkBot('e1', { x: 300, y: 200, lastDamagerId: 'p1' });
  check('kill: Pitch takedown spawns a pig at the victim', sandbox.pitchHandleKill(victim) === true && bots.some((p) => p.isPitchPig && p.x === 300 && p.y === 200));
  syncPitchArrays();
  check('kill: the spawned pig is a lesser-health pig (2000 HP)', bots.filter((p) => p.isPitchPig).every((p) => p.hp === 2000));
  check('kill: kill-spawned pigs get no Stampede boost', bots.filter((p) => p.isPitchPig).every((p) => p.pitchPigBoostUntil === 0));
  // Killer is not Pitch: no pig.
  resetWorld();
  const outlit = mkEntity('o1', { team: 'player', brawler: 'outlit' });
  const v2 = mkBot('e1', { x: 300, y: 200, lastDamagerId: 'o1' });
  check('kill: non-Pitch killer spawns no pig', sandbox.pitchHandleKill(v2) === false && bots.filter((p) => p.isPitchPig).length === 0);
  // Bot Pitch killer: also spawns.
  resetWorld();
  const pitchBot = mkBot('b1', { team: 'enemy', brawler: 'pitch', x: 0, y: 0 });
  const v3 = mkBot('e2', { x: 100, y: 100, lastDamagerId: 'b1', team: 'player' });
  void pitchBot;
  check('kill: bot Pitch takedown spawns a pig', sandbox.pitchHandleKill(v3) === true && bots.some((p) => p.isPitchPig && p.ownerId === 'b1'));
  // Victim is a structure / pet / pig: no pig.
  resetWorld();
  const st = mkBot('s1', { x: 100, y: 0, isStructure: true, lastDamagerId: 'p1' });
  const pet = mkBot('pt1', { x: 100, y: 0, isPet: true, lastDamagerId: 'p1' });
  const pigVictim = mkBot('pg1', { x: 100, y: 0, lastDamagerId: 'p1' });
  pigVictim.isPitchPig = true;
  check('kill: structures, pets, and pigs never spawn a pig', sandbox.pitchHandleKill(st) === false && sandbox.pitchHandleKill(pet) === false && sandbox.pitchHandleKill(pigVictim) === false && bots.filter((p) => p.isPitchPig && p.ownerId === 'p1').length === 0);
  // Allied victim: no pig.
  resetWorld();
  const allyVictim = mkAlly('a1', { x: 100, y: 0, lastDamagerId: 'p1' });
  check('kill: allied victim spawns no pig', sandbox.pitchHandleKill(allyVictim) === false && bots.filter((p) => p.isPitchPig).length === 0);
  // Unknown killer: no pig.
  resetWorld();
  const v4 = mkBot('e1', { x: 100, y: 0, lastDamagerId: 'nope' });
  check('kill: unknown killer spawns no pig', sandbox.pitchHandleKill(v4) === false);
  // No killer at all: no pig.
  resetWorld();
  const v5 = mkBot('e1', { x: 100, y: 0, lastDamagerId: null });
  check('kill: no killer spawns no pig', sandbox.pitchHandleKill(v5) === false);
} catch (e) { failures.push('kill specialty threw: ' + e.message); }

// --- executed: gadgets (G1 Hex Cross arm, G2 Echo Hex arm) ---
try {
  resetWorld();
  const owner = playerEnt;
  check('gadget G1: arms Hex Cross', sandbox.executePitchGadget(owner, 'g1', false) === true && owner.pitchCrossArmed === true);
  check('gadget G1: floating text', floatingTexts.some((t) => t.text === '✳️ HEX CROSS!'));
  sandbox.firePitchMain(owner, 400, 0, false);
  check('gadget G1: armed pot carries Cross, then the flag is gone', pitchThrownHexes[0].crossArmed === true && owner.pitchCrossArmed === false);
  // G2: arms the echo on the next pot.
  resetWorld();
  check('gadget G2: arms Echo Hex', sandbox.executePitchGadget(playerEnt, 'g2', false) === true && playerEnt.pitchEchoArmed === true);
  check('gadget G2: floating text', floatingTexts.some((t) => t.text === '➕ ECHO HEX!'));
  sandbox.firePitchMain(playerEnt, 400, 0, false);
  check('gadget G2: armed pot carries Echo, then the flag is gone', pitchThrownHexes[0].echoArmed === true && playerEnt.pitchEchoArmed === false);
  check('gadget: unknown gadget returns false', sandbox.executePitchGadget(playerEnt, 'g3', false) === false);
  check('gadget: null entity returns false', sandbox.executePitchGadget(null, 'g1', false) === false);
  // Armed flags clear when the owner dies.
  resetWorld();
  playerEnt.pitchCrossArmed = true;
  playerEnt.pitchEchoArmed = true;
  playerEnt.hp = 0;
  sandbox.updatePitchSystems(0.016);
  check('gadget: armed flags clear when the owner dies', playerEnt.pitchCrossArmed === false && playerEnt.pitchEchoArmed === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: hex flight (thrown pots land via updatePitchSystems) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 400, y: 0 });
  sandbox.firePitchMain(playerEnt, 400, 0, false);
  const hex = pitchThrownHexes[0];
  nowMs += 100; // still flying (impact at ~364ms)
  sandbox.updatePitchSystems(0.016);
  syncPitchArrays();
  check('flight: pot still flying before impact, no damage yet', pitchThrownHexes.length === 1 && checkHitCalls.length === 0 && bullets.length === 0);
  nowMs = hex.impactAt; // land
  sandbox.updatePitchSystems(0.016);
  syncPitchArrays();
  check('flight: pot lands on impact (splash + plus burst)', pitchThrownHexes.length === 0 && enemy.hp === 5000 - 700 && bullets.length === 4);
} catch (e) { failures.push('hex flight threw: ' + e.message); }

// --- executed: render with REAL state (never a faked flag) ---
try {
  resetWorld();
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.firePitchMain(playerEnt, 400, 0, false);
  sandbox.castPitchSuper(playerEnt, false, 700, 0);
  sandbox.renderPitchEffects();
  check('render: draws without throwing (pot + pigs, no hyper)', s1.calls.length > 0);
  check('render: landing marker uses the real purple color (not Hyper)', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#a855f7'));
  // Hyper state: hypercharged owner -> purple aura ring.
  resetWorld();
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.isHypercharged = true;
  playerEnt.isHypercharged = true;
  sandbox.firePitchMain(playerEnt, 400, 0, false);
  sandbox.renderPitchEffects();
  check('render (Hyper): aura ring draws around the hypercharged owner', s2.calls.some((c) => c.m === 'arc'));
  check('render (Hyper): landing marker uses the Hyper purple', s2.sets.some((s) => s.p === 'strokeStyle' && s.v === '#c084fc'));
  // Non-Hyper owner: no Hyper purple anywhere.
  resetWorld();
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.renderPitchEffects();
  check('render (no state): no Hyper purple when nothing is Hyper', !s3.sets.some((s) => s.v === '#c084fc'));
  // SP1: curved pot gets the wobble path (render still draws).
  resetWorld();
  const s4 = stubCtx();
  sandbox.ctx = s4.proxy;
  playerEnt.selectedStar = 'slow';
  sandbox.firePitchMain(playerEnt, 400, 0, false);
  sandbox.renderPitchEffects();
  check('render (SP1): curved pot draws without throwing', s4.calls.length > 0);
} catch (e) { failures.push('render threw: ' + e.message); }

// --- executed: voice watcher (spawn / hurt / win / death / idle) ---
try {
  resetWorld();
  sandbox.playing = true;
  sandbox.updatePitchVoiceState();
  check('voice: spawn line on match start', voicePlays.includes('spawn'));
  nowMs += 1000;
  playerEnt.hp = 4000; // hurt
  sandbox.updatePitchVoiceState();
  check('voice: hurt line on HP drop', voicePlays.includes('hurt'));
  // Win: game over with HP left.
  sandbox.gameOver = true;
  sandbox.updatePitchVoiceState();
  check('voice: win line on game over with HP left', voicePlays.includes('win'));
  // Death: game over with no HP.
  resetWorld();
  sandbox.playing = true;
  sandbox.updatePitchVoiceState();
  playerEnt.hp = 0;
  sandbox.gameOver = true;
  sandbox.updatePitchVoiceState();
  check('voice: death line + CURSED! text on game over with no HP', voicePlays.includes('death') && floatingTexts.some((t) => t.text === '🐷 CURSED!'));
  // Idle: 20s without moving or attacking.
  resetWorld();
  sandbox.playing = true;
  sandbox.updatePitchVoiceState();
  nowMs += 21000;
  sandbox.updatePitchVoiceState();
  check('voice: idle line after 20s of no action', voicePlays.includes('idle'));
  // Non-Pitch selected: no lines at all.
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  sandbox.playing = true;
  sandbox.updatePitchVoiceState();
  sandbox.gameOver = true;
  sandbox.updatePitchVoiceState();
  check('voice: nothing plays when Pitch is not selected', voicePlays.length === 0);
} catch (e) { failures.push('voice watcher threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-pitch-brawler-regression.mjs (${passed} checks)`);
