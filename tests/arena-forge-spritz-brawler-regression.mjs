// Spritz regression — new brawler, Anthony's spec 2026-11-22.
// Locked design (his words): a spray-bottle / hose brawler with THREE
// firing modes — Mist (a wide slowing cloud, NOT a projectile), Focus
// Stream (a big water projectile that pushes enemies back, limited ammo
// until reload), Hose Blast (a three-cone water blast that explodes) —
// cycled ONLY by using the Super. The Super does NOT charge from damage:
// it auto-charges over ~8s (his number) and can be held once ready. On
// use it cycles the mode AND drops 2 water shells (3 while Hypercharged).
// Picking up a shell stores bonus ammo AND fires 3 pushback high-stream
// shots around him. Hypercharge: all three modes at once — the Hyper main
// attack is ONE projectile (damage middle, slowing mist sides, explodes
// in a water blast at the end whether it hits or misses); each shell's
// pushback shots fire twice, the second hit pushing only, no damage.
// SP1 (Anthony): shell-pickup shots root enemies for 1 second. SP2
// (Anthony): the water blast explodes one extra time; mist and stream
// projectiles fly 25% faster. G1 (Anthony): a circle of water around him
// he can walk on; it heals him while he stays in it; gone after 4s.
// G2 (Anthony): his next shot fires every projectile at once, like the
// Hyper main attack. Voice lines are flavor-only (RULE ONE) and silent
// until Anthony picks a voice. Declined balance suggestions (longer super
// cooldown, heal cap, root breaks on damage, hyper once-per-charge) are
// NOT applied — Anthony said "No, can you build him now?"
// Builder picks (flagged for his correction): Spritz / Mythic Controller
// (270 souls) / #38bdf8 / 💦 (his delegation, he can veto); 5200 HP /
// 270 speed, reload 1.6s, fire delay 300ms; mode order Mist → Focus
// Stream → Hose Blast; mist range 550 / radius 150 / 2.5s / drift 60
// px/s; stream 850 px/s / 700 range / 650 dmg / 120 pushback; hose cone
// 20 deg / 700 px/s / 450 range / 200 impact + 500 blast in 110px;
// Hyper main 750 px/s / 800 range / 800 middle + 600 blast in 130px;
// shell pickup radius 60; shell shots 500 dmg / 120 pushback / 500
// range; second volley 300ms later; SP2 second blast 250ms later; G1
// heal 400 HP/s / radius 160; bot Super gate 700px; kit names (Spray
// Cycle / Mode Swap / Water Circle / All-Out Spray / Rooted Spray /
// Double Splash); bonus ammo is a reserve spent only when the normal bar
// is empty; shells belong to their owner only; kill/cube super bonuses
// still apply (only the damage-charge path is blocked).
// Roster: Spritz makes 106 ids / 106 selectable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/spritz-voicelines.js', import.meta.url), 'utf8');
const hcModule = fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const spritzBlock = game.slice(game.indexOf('// ===== Spritz systems'), game.indexOf('// ===== Christmas Showdown buffs'));

// ---------------------------------------------------------- 1. source pins
check('roster includes spritz (106 ids)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon', 'driller', 'gravy', 'pitch', 'spritz'"));
check('selectable is 106 (106 ids, none disabled, spritz not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [...game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  return all.length === 106 && all.filter(id => !disabled.includes(id)).length === 106 && !disabled.includes('spritz');
})());
check('rarity Mythic (270 souls)', game.includes("spritz: 'Mythic',") && game.includes('Mythic: 270'));
check('role Controller (primary Controller)', game.includes("name: 'Spritz', role: 'Controller'") && game.includes("spritz:'Controller',"));
check('portrait icon present (droplet)', game.includes("spritz: '💦',"));
check('color water blue', game.includes("name: 'Spritz', role: 'Controller', rarity: 'Mythic', color: '#38bdf8'"));
check('stats branch 5200/650/270', game.includes("if (brawlerId === 'spritz') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(650 * scale), speed: 270'));
check('reload 1600ms', game.includes('spritz: 1600,'));
check('fire delay 300ms', game.includes('spritz: 300,'));
check('no super-charge-hits entry for Spritz (time-charged, not hit-charged)', (() => {
  const map = game.slice(game.indexOf('const SUPER_CHARGE_HITS_BY_BRAWLER'), game.indexOf('});', game.indexOf('const SUPER_CHARGE_HITS_BY_BRAWLER')));
  return !map.includes('spritz');
})());
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'spritz': {") && game.includes("name: 'Spritz'") && game.includes("attack: 'Spray Cycle'") && game.includes("super: 'Mode Swap'") && game.includes("g1: 'Water Circle") && game.includes("g2: 'All-Out Spray") && game.includes("sp1: 'Rooted Spray") && game.includes("sp2: 'Double Splash") && !game.slice(game.indexOf("'spritz': {"), game.indexOf("'spritz': {") + 2600).includes('coming soon'));
check('card text matches the kit (mode swap + 2 shells, bonus ammo + 3 pushback shots)', game.includes('Spritz swaps to his next spray mode and drops 2 water shells. Picking up a shell stores bonus ammo and fires 3 pushback stream shots around him.') && game.includes('his main attack fires one projectile that deals damage in the middle, trails slowing mist on the sides, and explodes in a water blast at the end. Mode Swap drops 3 shells instead of 2, and shell shots fire twice.'));
check('card text carries G1 (walk on water, heals, gone after 4s)', game.includes('Water Circle (Spawn a circle of water around you that heals you while you stand in it. It disappears after 4 seconds)'));
check('card text carries SP1 (root 1s) + SP2 (extra explosion, 25% faster)', game.includes('Rooted Spray (Shell-pickup shots root enemies for 1 second)') && game.includes('Double Splash (Your water blast explodes one extra time, and mist and stream projectiles fly 25% faster)'));
check('gadget cooldown map entry', game.includes('spritz: { g1: 14000, g2: 16000 },'));
check('gadget icons (droplet + wave)', game.includes("'spritz:g1': '💧',") && game.includes("'spritz:g2': '🌊',"));
check('fire branch exists', game.includes("} else if (brawler === 'spritz') {") && game.includes('fireSpritzMain(fromEntity, targetX, targetY, isBot);'));
check('player super dispatch', game.includes("if (combatBrawler === 'spritz') { castSpritzSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'spritz') { castSpritzSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2)', game.includes("curBrawler === 'spritz' && curGadget === 'g1'") && game.includes("curBrawler === 'spritz' && curGadget === 'g2'") && game.includes("executeSpritzGadget(player, 'g2', false);"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'spritz' && g === 'g1'") && game.includes("bot.brawler === 'spritz' && g === 'g2'"));
check('bot super range gate: Mode Swap inside 700px', game.includes("if (bot.brawler === 'spritz') return distance < SPRITZ_BOT_SUPER_RANGE;"));
check('super does NOT charge from damage: player gain skipped for Spritz', game.includes("if (brawler !== 'spritz') superCharge = clamp(superCharge + gain, 0, 100);"));
check('super does NOT charge from damage: bot gain skipped for Spritz', game.includes("if (brawler !== 'spritz') owner.superCharge = clamp((owner.superCharge || 0) + gain, 0, 100);"));
check('bonus ammo pays for the shot in fire() (gate + deduction)', game.includes('!spritzCanFireWithBonusAmmo(fromEntity, brawler, cost)') && game.includes('spritzSpendBonusAmmo(fromEntity, spritzShotCost)'));
check('checkHit hook: stream + shell shots push enemies back', game.includes('applyKnockback(target, owner.x, owner.y, b.isSpritzShellShot ? SPRITZ_SHELL_SHOT_KNOCKBACK : SPRITZ_STREAM_KNOCKBACK'));
check('checkHit hook: SP1 root on shell shots', game.includes("applyStatusEffect(target, 'root', b.spritzRootMs);"));
check('checkHit hook: hose + Hyper main explode on hit', game.includes("if ((b.isSpritzHoseBlast || b.isSpritzHyperMain) && !b._spritzExploded) {"));
check('bullet loop: hose + Hyper main explode at end of flight', game.includes("if ((b.isSpritzHoseBlast || b.isSpritzHyperMain) && b.life >= b.maxLife && !b._spritzExploded) {"));
check('update loop calls updateSpritzSystems', game.includes('if (playing && !gameOver) updateSpritzSystems(dt);'));
check('render calls renderSpritzEffects', game.includes('    renderSpritzEffects();'));
check('voice watcher is called', game.includes('        updateSpritzVoiceState();'));
check('reset sites clear the Spritz arrays (.length = 0 site)', game.includes('spritzMists.length = 0; spritzShells.length = 0; spritzPendingVolleys.length = 0; spritzPendingBlasts.length = 0; spritzWaterCircles.length = 0;'));
check('reset sites clear the Spritz arrays (all 3 = [] sites)', (game.match(/spritzMists = \[\]; spritzShells = \[\]; spritzPendingVolleys = \[\]; spritzPendingBlasts = \[\]; spritzWaterCircles = \[\];/g) || []).length === 3);
check('reset sites reset the mode to Mist (all 3 = [] sites)', (game.match(/player\.spritzMode = 'mist';/g) || []).length === 3);
check('portrait body-art branch (blue cap + spray bottle)', game.includes("if (brawlerId === 'spritz') {") && game.includes("ctx.fillStyle = '#0369a1';") && game.includes("ctx.fillStyle = '#0284c7';"));
check('bullet render branches (stream/shell + hose + hyper main)', game.includes('} else if (b.isSpritzStream || b.isSpritzShellShot) {') && game.includes('} else if (b.isSpritzHoseBlast) {') && game.includes('} else if (b.isSpritzHyperMain) {'));
check('constants: super 8s, mist 550/150/2500/60, stream 850/700/650/120', game.includes('const SPRITZ_SUPER_CHARGE_SECONDS = 8;') && game.includes('const SPRITZ_MIST_RANGE = 550;') && game.includes('const SPRITZ_MIST_RADIUS = 150;') && game.includes('const SPRITZ_MIST_DURATION_MS = 2500;') && game.includes('const SPRITZ_MIST_DRIFT_SPEED = 60;') && game.includes('const SPRITZ_STREAM_SPEED = 850;') && game.includes('const SPRITZ_STREAM_RANGE = 700;') && game.includes('const SPRITZ_STREAM_DMG = 650;') && game.includes('const SPRITZ_STREAM_KNOCKBACK = 120;'));
check('constants: hose 20deg/700/450/200/500/110, hyper 750/800/800/600/130', game.includes('const SPRITZ_HOSE_CONE_DEG = 20;') && game.includes('const SPRITZ_HOSE_SPEED = 700;') && game.includes('const SPRITZ_HOSE_RANGE = 450;') && game.includes('const SPRITZ_HOSE_IMPACT_DMG = 200;') && game.includes('const SPRITZ_HOSE_BLAST_DMG = 500;') && game.includes('const SPRITZ_HOSE_BLAST_RADIUS = 110;') && game.includes('const SPRITZ_HYPER_MAIN_SPEED = 750;') && game.includes('const SPRITZ_HYPER_MAIN_RANGE = 800;') && game.includes('const SPRITZ_HYPER_MAIN_DMG = 800;') && game.includes('const SPRITZ_HYPER_BLAST_DMG = 600;') && game.includes('const SPRITZ_HYPER_BLAST_RADIUS = 130;'));
check('constants: shells 2/3, pickup 60, shots 3x500/120/500, second volley 300ms', game.includes('const SPRITZ_SUPER_SHELL_COUNT = 2;') && game.includes('const SPRITZ_SUPER_SHELL_COUNT_HYPER = 3;') && game.includes('const SPRITZ_SHELL_PICKUP_RADIUS = 60;') && game.includes('const SPRITZ_SHELL_SHOT_COUNT = 3;') && game.includes('const SPRITZ_SHELL_SHOT_DMG = 500;') && game.includes('const SPRITZ_SHELL_SHOT_KNOCKBACK = 120;') && game.includes('const SPRITZ_SHELL_SECOND_VOLLEY_DELAY_MS = 300;'));
check('constants: SP1 root 1000ms, SP2 1.25x + second blast 250ms, G1 400/s/160/4000ms, bot gate 700', game.includes('const SPRITZ_SP1_ROOT_MS = 1000;') && game.includes('const SPRITZ_SP2_SPEED_MULT = 1.25;') && game.includes('const SPRITZ_SP2_SECOND_BLAST_DELAY_MS = 250;') && game.includes('const SPRITZ_G1_HEAL_PER_S = 400;') && game.includes('const SPRITZ_G1_RADIUS = 160;') && game.includes('const SPRITZ_G1_DURATION_MS = 4000;') && game.includes('const SPRITZ_BOT_SUPER_RANGE = 700;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function spritzHasSP1(entity) { return spritzStarChoice(entity) === 'slow'; }") && game.includes("function spritzHasSP2(entity) { return spritzStarChoice(entity) === 'long'; }"));
check('no Brawl Stars wording or Grom in the Spritz block', !spritzBlock.includes('Brawl Stars') && !spritzBlock.includes('Grom') && !spritzBlock.includes('Supercell'));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'w' + 'itch'}\\b`, 'i').test(game));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/spritz-voicelines.js'"));
check('voice module registered in the audio module list', game.includes("'BraweSpritzVoice'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweSpritzVoice?.play('attack')") && game.includes("BraweSpritzVoice?.play('kill')") && game.includes("BraweSpritzVoice?.play('super')") && game.includes('updateSpritzVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('voice module is a silent no-op until Anthony picks a voice', voiceModule.includes('No voice selected yet: silent no-op') && voiceModule.includes('window.BraweSpritzVoiceClip'));
check('hypercharge sting: spritz mapped in the HC module', hcModule.includes("'spritz': 'spritz.mp3',"));
check('hypercharge sting: spritz.mp3 exists, real MP3, 5-15KB, distinct from pitch/freezeon', (() => {
  const repo = new URL('..', import.meta.url).pathname;
  const p = path.join(repo, 'assets/sfx/hc/spritz.mp3');
  if (!fs.existsSync(p)) return false;
  const buf = fs.readFileSync(p);
  const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const other = ['pitch', 'freezeon'].map(id => crypto.createHash('md5').update(fs.readFileSync(path.join(repo, 'assets/sfx/hc', id + '.mp3'))).digest('hex'));
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
function resetWorld() {
  entitiesById.clear();
  bullets = [];
  explosions = [];
  spritzMists = [];
  spritzShells = [];
  spritzPendingVolleys = [];
  spritzPendingBlasts = [];
  spritzWaterCircles = [];
  bots = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  statusEffects.length = 0;
  voicePlays.length = 0;
  superButtonCalls.length = 0;
  nowMs = 100000;
  nextId = 9000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'spritz', x: 0, y: 0, hp: 5200, maxHp: 5200 });
  sandbox.player = playerEnt;
  sandbox.bots = bots;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.spritzMists = spritzMists;
  sandbox.spritzShells = spritzShells;
  sandbox.spritzPendingVolleys = spritzPendingVolleys;
  sandbox.spritzPendingBlasts = spritzPendingBlasts;
  sandbox.spritzWaterCircles = spritzWaterCircles;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'spritz';
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.superCharge = 0;
  sandbox.spritzVoicePrevPlaying = false;
  sandbox.spritzVoicePrevGameOver = false;
  sandbox.spritzVoiceMatchEndPlayed = false;
  sandbox.spritzVoiceLastHp = null;
  sandbox.spritzVoiceLastActionAt = 0;
  sandbox.spritzVoiceLastIdleAt = 0;
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
function syncSpritzArrays() {
  spritzMists = sandbox.spritzMists;
  spritzShells = sandbox.spritzShells;
  spritzPendingVolleys = sandbox.spritzPendingVolleys;
  spritzPendingBlasts = sandbox.spritzPendingBlasts;
  spritzWaterCircles = sandbox.spritzWaterCircles;
  bullets = sandbox.bullets;
  bots = sandbox.bots;
}
const bulletAngles = () => bullets.map(b => ((Math.round(Math.atan2(b.vy, b.vx) * 180 / Math.PI) + 360) % 360));

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler, isSpritzBlast: !!synth.isSpritzBlast });
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
  isHypercharged: false,
  selectedBrawler: 'spritz',
  playing: false,
  gameOver: false,
  superCharge: 0,
  spritzVoicePrevPlaying: false,
  spritzVoicePrevGameOver: false,
  spritzVoiceMatchEndPlayed: false,
  spritzVoiceLastHp: null,
  spritzVoiceLastActionAt: 0,
  spritzVoiceLastIdleAt: 0,
  nextId: 9000,
  window: { BraweSpritzVoice: { play: (kind) => { voicePlays.push(kind); } } },
  ctx: null,
};
// Pull every SPRITZ_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (SPRITZ_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
sandbox.SPRITZ_MODE_ORDER = ['mist', 'stream', 'hose'];
sandbox.SPRITZ_MODE_LABELS = { mist: 'MIST', stream: 'FOCUS STREAM', hose: 'HOSE BLAST' };
vm.createContext(sandbox);
vm.runInContext(
  [
    'spritzLevelScale', 'spritzStarChoice', 'spritzHasSP1', 'spritzHasSP2', 'isSpritz',
    'spritzFindOwner', 'spritzModeOf', 'spritzSpeedMult', 'spritzScaledDmg',
    'spritzCanFireWithBonusAmmo', 'spritzSpendBonusAmmo', 'fireSpritzMain',
    'spritzFireMist', 'spritzFireStream', 'spritzFireHoseBlast', 'spritzFireHyperMain',
    'spritzExplodeAt', 'spritzFireShellShots', 'castSpritzSuper', 'executeSpritzGadget',
    'updateSpritzSystems', 'renderSpritzEffects', 'updateSpritzVoiceState',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + level scale + isSpritz + mode default + bonus ammo helpers ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.spritzHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.spritzHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.spritzHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.spritzHasSP2({ selectedStar: 'slow' }) === false);
  check('level scale: P11 = 1.0', near(sandbox.spritzLevelScale({ level: 11 }), 1.0));
  check('level scale: L1 = 0.55', near(sandbox.spritzLevelScale({ level: 1 }), 0.55));
  check('isSpritz: brawler id matches', sandbox.isSpritz({ id: 'x', brawler: 'spritz' }) === true);
  check('isSpritz: player with spritz selected matches', sandbox.isSpritz(playerEnt) === true);
  check('isSpritz: other brawler does not match', sandbox.isSpritz({ id: 'y', brawler: 'outlit' }) === false);
  check('owner lookup: player by id', sandbox.spritzFindOwner('p1') === playerEnt);
  const bot = mkBot('e1', { x: 100, y: 0 });
  check('owner lookup: bot by id', sandbox.spritzFindOwner('e1') === bot);
  check('owner lookup: unknown id is null', sandbox.spritzFindOwner('nope') === null);
  check('mode default: no mode stored means Mist', sandbox.spritzModeOf({}) === 'mist');
  check('mode default: unknown mode means Mist', sandbox.spritzModeOf({ spritzMode: 'nope' }) === 'mist');
  check('mode: stored mode is honored', sandbox.spritzModeOf({ spritzMode: 'hose' }) === 'hose');
  check('SP2 speed mult: 1.25 with long, 1 without', sandbox.spritzSpeedMult({ selectedStar: 'long' }) === 1.25 && sandbox.spritzSpeedMult({ selectedStar: 'none' }) === 1);
  check('scaled damage: 650 at P11, 358 at L1', sandbox.spritzScaledDmg({ level: 11 }, 650) === 650 && sandbox.spritzScaledDmg({ level: 1 }, 650) === 358);
  check('bonus ammo: can fire with a stored shell when brawler is spritz', sandbox.spritzCanFireWithBonusAmmo({ spritzBonusAmmo: 1 }, 'spritz', 1) === true);
  check('bonus ammo: cannot fire with no stored shells', sandbox.spritzCanFireWithBonusAmmo({ spritzBonusAmmo: 0 }, 'spritz', 1) === false);
  check('bonus ammo: never pays for another brawler', sandbox.spritzCanFireWithBonusAmmo({ spritzBonusAmmo: 5 }, 'outlit', 1) === false);
  check('bonus ammo: spend decrements the reserve', (() => { const e = { spritzBonusAmmo: 2 }; const ok = sandbox.spritzSpendBonusAmmo(e, 1); return ok === true && e.spritzBonusAmmo === 1; })());
  check('bonus ammo: spend fails when the reserve is short', (() => { const e = { spritzBonusAmmo: 0 }; const ok = sandbox.spritzSpendBonusAmmo(e, 1); return ok === false && e.spritzBonusAmmo === 0; })());
} catch (e) { failures.push('SP gates/level scale/isSpritz threw: ' + e.message); }

// --- executed: modes cycle ONLY via Super (firing never changes the mode) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('mode: fresh Spritz starts in Mist', sandbox.spritzModeOf(playerEnt) === 'mist');
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mode (Mist fire): a cloud appears, no bullet, mode still Mist', spritzMists.length === 1 && bullets.length === 0 && playerEnt.spritzMode !== 'stream' && sandbox.spritzModeOf(playerEnt) === 'mist');
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mode: firing three times never cycles the mode', spritzMists.length === 3 && sandbox.spritzModeOf(playerEnt) === 'mist');
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('mode: Super cycles Mist -> Focus Stream', sandbox.spritzModeOf(playerEnt) === 'stream');
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mode (Stream fire): one stream bullet, mode still Focus Stream', bullets.length === 1 && bullets[0].isSpritzStream === true && sandbox.spritzModeOf(playerEnt) === 'stream');
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('mode: Super cycles Focus Stream -> Hose Blast', sandbox.spritzModeOf(playerEnt) === 'hose');
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mode (Hose fire): three hose bullets, mode still Hose Blast', bullets.length === 4 && bullets.slice(1).every((b) => b.isSpritzHoseBlast) && sandbox.spritzModeOf(playerEnt) === 'hose');
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('mode: Super cycles Hose Blast -> Mist (wraps)', sandbox.spritzModeOf(playerEnt) === 'mist');
} catch (e) { failures.push('mode cycling threw: ' + e.message); }

// --- executed: Mist (wide cloud, NOT a projectile) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mist: cloud lands at the aimed point (400px in range)', spritzMists.length === 1 && spritzMists[0].x === 900 && spritzMists[0].y === 500);
  check('mist: radius 150, drifts forward at 60 px/s', spritzMists[0].r === 150 && spritzMists[0].vx === 60 && spritzMists[0].vy === 0);
  check('mist: lasts 2.5s', spritzMists[0].until === nowMs + 2500);
  check('mist: is not a bullet', bullets.length === 0);
  // Range clamp at 550px.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.fireSpritzMain(playerEnt, 2000, 500, false);
  check('mist: aim past 550px clamps to the 550px range', spritzMists[0].x === 1050 && spritzMists[0].y === 500);
  // Slow: enemies inside are slowed; allies/structures are not.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  const enemy = mkBot('e1', { x: 900, y: 500 });
  const far = mkBot('e2', { x: 1200, y: 500 });
  const structure = mkBot('s1', { x: 900, y: 500, isStructure: true });
  const ally = mkAlly('a1', { x: 900, y: 500 });
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('mist: enemy inside is slowed (400ms linger)', enemy.slowUntil === nowMs + 400 && statusEffects.some((s) => s.id === 'e1' && s.effect === 'slow' && s.ms === 400));
  check('mist: enemy outside the cloud is not slowed', far.slowUntil === 0);
  check('mist: structures are never slowed', structure.slowUntil === 0);
  check('mist: allies are never slowed', ally.slowUntil === 0);
  // Drift + expiry.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  sandbox.updateSpritzSystems(1.0);
  syncSpritzArrays();
  check('mist: cloud drifts 60px in 1s', spritzMists.length === 1 && spritzMists[0].x === 960);
  nowMs += 2600;
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('mist: cloud expires after 2.5s', spritzMists.length === 0);
  // SP2: mist drifts 25% faster.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.selectedStar = 'long';
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('mist (SP2): drift is 25% faster (75 px/s)', spritzMists[0].vx === 75);
} catch (e) { failures.push('mist threw: ' + e.message); }

// --- executed: Focus Stream (big pushback projectile) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.spritzMode = 'stream';
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('stream: one big water projectile (not a cloud)', bullets.length === 1 && spritzMists.length === 0 && bullets[0].isSpritzStream === true);
  check('stream: 850 px/s toward the aim', bullets[0].vx === 850 && bullets[0].vy === 0);
  check('stream: 700 range (maxLife 700/850)', near(bullets[0].maxLife, 700 / 850, 0.001));
  check('stream: 650 damage at P11, non-piercing, wide hitbox', bullets[0].damage === 650 && bullets[0].pierce === false && bullets[0].hitboxMod === 1.5);
  // SP2: stream flies 25% faster.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.spritzMode = 'stream';
  playerEnt.selectedStar = 'long';
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('stream (SP2): 25% faster (1062.5 px/s), same 700 range', bullets[0].vx === 1062.5 && near(bullets[0].maxLife, 700 / 1062.5, 0.001));
} catch (e) { failures.push('focus stream threw: ' + e.message); }

// --- executed: Hose Blast (three-cone water blast) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.spritzMode = 'hose';
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('hose: three projectiles in a cone', bullets.length === 3 && bullets.every((b) => b.isSpritzHoseBlast));
  check('hose: cone angles are -20/0/+20 degrees', JSON.stringify(bulletAngles().sort((a, b) => a - b)) === JSON.stringify([0, 20, 340]));
  check('hose: 700 px/s, 450 range, 200 impact damage', bullets.every((b) => Math.round(Math.hypot(b.vx, b.vy)) === 700 && near(b.maxLife, 450 / 700, 0.001) && b.damage === 200 && b.pierce === false));
  // SP2: hose projectiles fly 25% faster.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.spritzMode = 'hose';
  playerEnt.selectedStar = 'long';
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('hose (SP2): 25% faster (875 px/s)', bullets.every((b) => Math.round(Math.hypot(b.vx, b.vy)) === 875));
} catch (e) { failures.push('hose blast threw: ' + e.message); }

// --- executed: water-blast explosion (hose + Hyper end) ---
try {
  resetWorld();
  const enemy = mkBot('e1', { x: 700, y: 500 });
  const far = mkBot('e2', { x: 950, y: 500 });
  const structure = mkBot('s1', { x: 700, y: 500, isStructure: true });
  const ally = mkAlly('a1', { x: 700, y: 500 });
  sandbox.spritzExplodeAt(700, 500, { isSpritzHoseBlast: true, hyperVisual: false }, playerEnt, false);
  syncSpritzArrays();
  check('blast (hose): enemy in the 110px blast takes 500', enemy.hp === 5000 - 500 && checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 500 && c.isSpritzBlast));
  check('blast (hose): enemy past the blast is untouched', far.hp === 5000);
  check('blast (hose): structures are never blasted', structure.hp === 5000);
  check('blast (hose): allies are never blasted', ally.hp === 5000);
  check('blast (hose): SPLASH! text + water-blast explosion', floatingTexts.some((t) => t.text === '💦 SPLASH!') && explosions.some((e) => e.fxKind === 'spritzWaterBlast' && e.radius === 110));
  check('blast (hose, no SP2): no second blast is scheduled', spritzPendingBlasts.length === 0);
  // Hyper end explosion: 600 in 130px.
  resetWorld();
  mkBot('e1', { x: 700, y: 500 });
  sandbox.spritzExplodeAt(700, 500, { isSpritzHyperMain: true, hyperVisual: true }, playerEnt, false);
  syncSpritzArrays();
  check('blast (Hyper): enemy in the 130px blast takes 600', checkHitCalls.some((c) => c.targetId === 'e1' && c.damage === 600 && c.isSpritzBlast));
  check('blast (Hyper): TIDAL BURST! text + Hyper explosion', floatingTexts.some((t) => t.text === '💦 TIDAL BURST!') && explosions.some((e) => e.fxKind === 'spritzWaterBlast' && e.radius === 130 && e.hyper === true));
  // SP2: one extra explosion, then no more.
  resetWorld();
  playerEnt.selectedStar = 'long';
  const sp2Enemy = mkBot('e1', { x: 700, y: 500 });
  sandbox.spritzExplodeAt(700, 500, { isSpritzHoseBlast: true, hyperVisual: false }, playerEnt, false);
  syncSpritzArrays();
  check('blast (SP2): a second explosion is scheduled 250ms later', spritzPendingBlasts.length === 1 && spritzPendingBlasts[0].fireAt === nowMs + 250 && spritzPendingBlasts[0].x === 700 && spritzPendingBlasts[0].y === 500);
  check('blast (SP2): first explosion deals 500', sp2Enemy.hp === 5000 - 500);
  nowMs += 100; // not yet
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('blast (SP2): nothing fires before the 250ms delay', spritzPendingBlasts.length === 1 && sp2Enemy.hp === 5000 - 500);
  nowMs += 150; // due
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('blast (SP2): second explosion fires (500 more)', spritzPendingBlasts.length === 0 && sp2Enemy.hp === 5000 - 1000);
  nowMs += 1000;
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('blast (SP2): no third explosion — exactly one extra', sp2Enemy.hp === 5000 - 1000 && spritzPendingBlasts.length === 0);
  // Dead owner: no damage, blast still shows.
  resetWorld();
  playerEnt.hp = 0;
  mkBot('e1', { x: 700, y: 500 });
  sandbox.spritzExplodeAt(700, 500, { isSpritzHoseBlast: true, hyperVisual: false }, null, false);
  syncSpritzArrays();
  check('blast (owner gone): no damage, blast still shows', checkHitCalls.length === 0 && explosions.some((e) => e.fxKind === 'spritzWaterBlast'));
} catch (e) { failures.push('water blast threw: ' + e.message); }

// --- executed: Hyper main attack (ONE projectile, all modes at once) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.isHypercharged = true;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('hyper main: exactly ONE projectile (not three)', bullets.length === 1 && bullets[0].isSpritzHyperMain === true);
  check('hyper main: 750 px/s toward the aim, 800 range', bullets[0].vx === 750 && near(bullets[0].maxLife, 800 / 750, 0.001));
  check('hyper main: 800 middle damage, non-piercing, wide hitbox', bullets[0].damage === 800 && bullets[0].pierce === false && bullets[0].hitboxMod === 1.5);
  check('hyper main: carries the Hyper visual + zero trail distance', bullets[0].hyperVisual === true && bullets[0].spritzTrailDist === 0);
  // Hyper main fires from ANY mode (all modes at once).
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.spritzMode = 'hose';
  sandbox.isHypercharged = true;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('hyper main (Hose mode): still one projectile, not a cone', bullets.length === 1 && bullets[0].isSpritzHyperMain === true);
  // Bot Hyper uses the bot's own hyper flag.
  resetWorld();
  const botOwner = mkBot('b1', { team: 'enemy', brawler: 'spritz', x: 0, y: 0, isHypercharged: true });
  sandbox.fireSpritzMain(botOwner, 400, 0, true);
  check('hyper main (bot Hyper): bot fires the one Hyper projectile', bullets.length === 1 && bullets[0].isSpritzHyperMain === true);
  // Trail: mist puffs every 60px of flight.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.isHypercharged = true;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  const hyperBullet = bullets[0];
  hyperBullet.x += 75; // 0.1s at 750 px/s
  sandbox.updateSpritzSystems(0.1);
  syncSpritzArrays();
  check('hyper trail: a slowing mist puff is left behind after 60px', spritzMists.length === 1 && spritzMists[0].r === 60 && spritzMists[0].x === 575);
  hyperBullet.x += 75;
  sandbox.updateSpritzSystems(0.1);
  syncSpritzArrays();
  check('hyper trail: a second puff after another 60px', spritzMists.length === 2);
  // SP2: Hyper main flies 25% faster.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.selectedStar = 'long';
  sandbox.isHypercharged = true;
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('hyper main (SP2): 25% faster (937.5 px/s)', bullets[0].vx === 937.5);
} catch (e) { failures.push('hyper main threw: ' + e.message); }

// --- executed: Super auto-charge (~8s, never from damage, holdable) ---
try {
  resetWorld();
  check('super charge: starts at 0', sandbox.superCharge === 0);
  sandbox.updateSpritzSystems(4.0);
  syncSpritzArrays();
  check('super charge: half full after 4s (12.5/s)', near(sandbox.superCharge, 50, 0.01));
  sandbox.updateSpritzSystems(4.0);
  syncSpritzArrays();
  check('super charge: full after ~8s', sandbox.superCharge === 100);
  check('super charge: holds at 100 — nothing auto-casts it', sandbox.superCharge === 100 && spritzShells.length === 0 && sandbox.spritzModeOf(playerEnt) === 'mist');
  sandbox.updateSpritzSystems(4.0);
  syncSpritzArrays();
  check('super charge: stays clamped at 100 past 8s', sandbox.superCharge === 100);
  check('super charge: the Super button is refreshed while charging', superButtonCalls.length > 0);
  // Bot Super charges on the same timer.
  resetWorld();
  const botSpritz = mkBot('b1', { brawler: 'spritz', superCharge: 0 });
  sandbox.updateSpritzSystems(8.0);
  check('super charge (bot): full after ~8s on the bot timer', botSpritz.superCharge === 100);
  // Not Spritz: no charge.
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  playerEnt.brawler = 'outlit';
  sandbox.updateSpritzSystems(8.0);
  check('super charge: no auto-charge when Spritz is not selected', sandbox.superCharge === 0);
  // Dead Spritz: no charge.
  resetWorld();
  playerEnt.hp = 0;
  sandbox.updateSpritzSystems(8.0);
  check('super charge: no auto-charge while dead', sandbox.superCharge === 0);
} catch (e) { failures.push('super auto-charge threw: ' + e.message); }

// --- executed: Super Mode Swap (cycle + shells) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('super: no shells before cast', spritzShells.length === 0);
  check('super: cast returns true and drops 2 shells', sandbox.castSpritzSuper(playerEnt, false, 500, 0) === true && spritzShells.length === 2);
  check('super: shells land 56px out around the owner', spritzShells.every((s) => near(Math.hypot(s.x - 500, s.y - 500), 56, 0.5) && s.ownerId === 'p1' && s.hyper === false));
  check('super: shells have unique spots', spritzShells[0].x !== spritzShells[1].x || spritzShells[0].y !== spritzShells[1].y);
  check('super: MODE SWAP floating text names the new mode', floatingTexts.some((t) => t.text === '💦 MODE SWAP: FOCUS STREAM!'));
  check('super: voice super line plays', voicePlays.includes('super'));
  // Hyper: 3 shells.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('super (Hyper): 3 shells instead of 2', sandbox.castSpritzSuper(playerEnt, true, 500, 0) === true && spritzShells.length === 3 && spritzShells.every((s) => s.hyper === true));
  check('super: dead entity cannot cast', (() => { resetWorld(); playerEnt.hp = 0; return sandbox.castSpritzSuper(playerEnt, false, 500, 0) === false && spritzShells.length === 0; })());
} catch (e) { failures.push('super threw: ' + e.message); }

// --- executed: shell pickup (bonus ammo + 3 pushback shots) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.visualAimAngle = 0;
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  check('shell: 2 shells waiting before the pickup tick', spritzShells.length === 2 && (playerEnt.spritzBonusAmmo || 0) === 0);
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell: both shells are picked up by the owner standing on them', spritzShells.length === 0);
  check('shell: each pickup stores 1 bonus ammo (2 total)', playerEnt.spritzBonusAmmo === 2);
  check('shell: each pickup fires 3 pushback shots (6 total)', bullets.length === 6 && bullets.every((b) => b.isSpritzShellShot));
  check('shell: shots fire 120 degrees apart around him', JSON.stringify(bulletAngles().sort((a, b) => a - b)) === JSON.stringify([0, 0, 120, 120, 240, 240]));
  check('shell: shots are 850 px/s, 500 range, 500 damage', bullets.every((b) => Math.round(Math.hypot(b.vx, b.vy)) === 850 && near(b.maxLife, 500 / 850, 0.001) && b.damage === 500));
  check('shell: shots carry no root without SP1', bullets.every((b) => b.spritzRootMs === 0));
  check('shell: SHELL! +1 AMMO floating text', floatingTexts.filter((t) => t.text === '💦 SHELL! +1 AMMO').length === 2);
  check('shell (no Hyper): no second volley is scheduled', spritzPendingVolleys.length === 0);
  // Only the owner picks up his own shells.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  const ally = mkAlly('a1', { x: 546, y: 532 });
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  playerEnt.x = 0; playerEnt.y = 0; // owner walks away; the ally stands on a shell
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell: an ally standing on a shell cannot pick it up', spritzShells.length === 2 && (ally.spritzBonusAmmo || 0) === 0 && bullets.length === 0);
  // Out of range: no pickup.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  playerEnt.x = 1000; playerEnt.y = 1000;
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell: no pickup when the owner is far away', spritzShells.length === 2 && (playerEnt.spritzBonusAmmo || 0) === 0);
  // SP1: shell shots root 1s.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.selectedStar = 'slow';
  sandbox.castSpritzSuper(playerEnt, false, 500, 0);
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell (SP1): shots carry the 1000ms root', bullets.length === 6 && bullets.every((b) => b.spritzRootMs === 1000));
  // Hyper: each shell's shots fire twice — second hit pushes only, no damage.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.visualAimAngle = 0;
  sandbox.isHypercharged = true;
  sandbox.castSpritzSuper(playerEnt, true, 500, 0);
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell (Hyper): 3 shells picked up, 9 first-volley shots', spritzShells.length === 0 && bullets.length === 9 && playerEnt.spritzBonusAmmo === 3);
  check('shell (Hyper): a second volley is scheduled per shell, 300ms later', spritzPendingVolleys.length === 3 && spritzPendingVolleys.every((v) => v.fireAt === nowMs + 300 && v.pushOnly === true));
  nowMs += 100; // not yet
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell (Hyper): nothing fires before the 300ms delay', spritzPendingVolleys.length === 3 && bullets.length === 9);
  nowMs += 200; // due
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('shell (Hyper): second volleys fire (9 more shots)', spritzPendingVolleys.length === 0 && bullets.length === 18);
  check('shell (Hyper): second volley pushes only — 0 damage', bullets.slice(9).every((b) => b.damage === 0 && b.isSpritzShellShot));
  check('shell (Hyper): second volley never roots, even with SP1', (() => { resetWorld(); playerEnt.x = 500; playerEnt.y = 500; playerEnt.selectedStar = 'slow'; sandbox.isHypercharged = true; sandbox.castSpritzSuper(playerEnt, true, 500, 0); sandbox.updateSpritzSystems(0.016); nowMs += 300; sandbox.updateSpritzSystems(0.016); syncSpritzArrays(); return bullets.slice(9).every((b) => b.spritzRootMs === 0); })());
} catch (e) { failures.push('shell pickup threw: ' + e.message); }

// --- executed: gadgets (G1 Water Circle, G2 All-Out Spray) ---
try {
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  playerEnt.hp = 4000;
  check('gadget G1: creates the Water Circle', sandbox.executeSpritzGadget(playerEnt, 'g1', false) === true && spritzWaterCircles.length === 1);
  check('gadget G1: circle is 160px at his feet, gone after 4s', spritzWaterCircles[0].x === 500 && spritzWaterCircles[0].y === 500 && spritzWaterCircles[0].r === 160 && spritzWaterCircles[0].until === nowMs + 4000);
  check('gadget G1: floating text', floatingTexts.some((t) => t.text === '💧 WATER CIRCLE!'));
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('gadget G1: heals 100 HP per 250ms tick inside (400 HP/s)', playerEnt.hp === 4100);
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('gadget G1: no second heal before the next tick', playerEnt.hp === 4100);
  nowMs += 250;
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('gadget G1: next tick heals again', playerEnt.hp === 4200);
  playerEnt.x = 1000; playerEnt.y = 1000; // walks out of the circle
  nowMs += 250;
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('gadget G1: no heal once he leaves the circle', playerEnt.hp === 4200);
  playerEnt.x = 500; playerEnt.y = 500;
  nowMs += 4000; // circle expires
  sandbox.updateSpritzSystems(0.016);
  syncSpritzArrays();
  check('gadget G1: circle is gone after 4s', spritzWaterCircles.length === 0);
  check('gadget G1: heal never exceeds max HP', (() => { resetWorld(); playerEnt.x = 500; playerEnt.y = 500; playerEnt.hp = 5190; sandbox.executeSpritzGadget(playerEnt, 'g1', false); sandbox.updateSpritzSystems(0.016); return playerEnt.hp === 5200; })());
  // G2: next shot fires every projectile at once.
  resetWorld();
  playerEnt.x = 500; playerEnt.y = 500;
  check('gadget G2: arms All-Out Spray', sandbox.executeSpritzGadget(playerEnt, 'g2', false) === true && playerEnt.spritzG2Armed === true);
  check('gadget G2: floating text', floatingTexts.some((t) => t.text === '🌊 ALL-OUT SPRAY!'));
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('gadget G2: the next shot is the Hyper main projectile (not a mist)', bullets.length === 1 && bullets[0].isSpritzHyperMain === true && spritzMists.length === 0);
  check('gadget G2: the flag is consumed on fire', playerEnt.spritzG2Armed === false);
  sandbox.fireSpritzMain(playerEnt, 900, 500, false);
  check('gadget G2: the shot after is a normal Mist again', spritzMists.length === 1 && bullets.length === 1);
  check('gadget: unknown gadget returns false', sandbox.executeSpritzGadget(playerEnt, 'g3', false) === false);
  check('gadget: null entity returns false', sandbox.executeSpritzGadget(null, 'g1', false) === false);
  // Armed flags clear when the owner dies.
  resetWorld();
  playerEnt.spritzG2Armed = true;
  playerEnt.hp = 0;
  sandbox.updateSpritzSystems(0.016);
  check('gadget: G2 flag clears when the owner dies', playerEnt.spritzG2Armed === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: render with REAL state (never a faked flag) ---
try {
  resetWorld();
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.spritzMists.push({ x: 100, y: 100, r: 150, vx: 0, vy: 0, until: nowMs + 2500, ownerId: 'p1', hyper: false });
  sandbox.spritzShells.push({ x: 200, y: 200, ownerId: 'p1', hyper: false, createdAt: nowMs });
  sandbox.spritzWaterCircles.push({ x: 300, y: 300, r: 160, ownerId: 'p1', until: nowMs + 4000, nextTickAt: 0 });
  sandbox.renderSpritzEffects();
  check('render: draws without throwing (mist + shell + circle)', s1.calls.length > 0);
  check('render: mist ring uses the real water-blue color', s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#38bdf8'));
  check('render: shell uses the real water-blue fill', s1.sets.some((s) => s.p === 'fillStyle' && s.v === '#38bdf8'));
  // Hyper aura ring around a Hypercharged Spritz.
  resetWorld();
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.isHypercharged = true;
  playerEnt.x = 100; playerEnt.y = 100;
  sandbox.renderSpritzEffects();
  check('render (Hyper): aura ring draws around the hypercharged owner', s2.calls.some((c) => c.m === 'arc'));
  check('render (Hyper): aura uses the Hyper water-blue', s2.sets.some((s) => s.v === 'rgba(125,211,252,0.9)'));
  // No state: no Hyper color.
  resetWorld();
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.renderSpritzEffects();
  check('render (no state): no Hyper water-blue when nothing is Hyper', !s3.sets.some((s) => s.v === 'rgba(125,211,252,0.9)'));
} catch (e) { failures.push('render threw: ' + e.message); }

// --- executed: voice watcher (spawn / hurt / win / death / idle) ---
try {
  resetWorld();
  sandbox.playing = true;
  sandbox.updateSpritzVoiceState();
  check('voice: spawn line on match start', voicePlays.includes('spawn'));
  playerEnt.hp = 4000;
  sandbox.updateSpritzVoiceState();
  check('voice: hurt line on HP drop', voicePlays.includes('hurt'));
  playerEnt.hp = 4000;
  sandbox.gameOver = true;
  sandbox.updateSpritzVoiceState();
  check('voice: win line on game over with HP left', voicePlays.includes('win'));
  // Death: game over with no HP.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateSpritzVoiceState();
  playerEnt.hp = 0;
  sandbox.gameOver = true;
  sandbox.updateSpritzVoiceState();
  check('voice: death line + SOAKED! text on game over with no HP', voicePlays.includes('death') && floatingTexts.some((t) => t.text === '💦 SOAKED!'));
  // Idle: 20s without moving or attacking.
  resetWorld();
  sandbox.playing = true;
  sandbox.updateSpritzVoiceState();
  nowMs += 21000;
  sandbox.updateSpritzVoiceState();
  check('voice: idle line after 20s of no action', voicePlays.includes('idle'));
  // Non-Spritz selected: no lines at all.
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  sandbox.playing = true;
  sandbox.updateSpritzVoiceState();
  sandbox.gameOver = true;
  sandbox.updateSpritzVoiceState();
  check('voice: nothing plays when Spritz is not selected', voicePlays.length === 0);
} catch (e) { failures.push('voice watcher threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-spritz-brawler-regression.mjs (${passed} checks)`);
