// Bookworm regression — ordered 2026-11-14 (builder picks, flagged for
// his correction). Anthony's core kit is authoritative; everything else
// below is a builder pick.
// Locked design: Epic Controller (170 souls), 5000 HP / 270 speed, 800 base
// main damage. Main "Bookmark Toss": 1 ammo, Bookworm moves while attacking
// (never rooted by his own attack). Step 1: a piercing book (660 px/s,
// 375px range, slowed −40% / cut −21% 2026-11-16 per Anthony, round 2 —
// worm range stays 650px)
// flies; while it flies the CAMERA FOCUSES ON THE BOOK so the
// player can aim it again. Step 2: pressing attack again redirects the book
// ONCE to the current aim (attack-button trigger; 250ms minimum book age so
// a mash cannot steer it instantly). Book flight ends at max range or on a
// wall (piercing is vs enemies, not walls) — then the camera returns to
// Bookworm and the worm comes out in the book's final flight direction at
// 1400 px/s for 650px, 350 damage, hitting ONE enemy. Worm hit = +1 worm
// stack, shown as a 3-segment bar above the enemy; 3 worm hits on the same
// enemy = ROOTED for 1s. Stacks decay after 4s without a new stack and reset
// to 0 on root. Stacks apply to brawlers AND training dummies (so the root
// is testable in training), NEVER to structures. Super "Worm Leap":
// activating the Super transforms Bookworm — the main attack is REPLACED by
// a jump attack with 2 charges, and the normal main attack does NOT come
// back until BOTH charges are spent (form lasts max 8s). Each jump: 4 worms
// jump out of the book, then go back in when they come back, SMASHING DOWN
// — the smash is AoE DAMAGE with a radius (jump 1: 400px, 600 dmg, 150px
// radius; jump 2: 600px, 900 dmg, 180px radius; enemies within 70px of the
// landing point take 1200). NO regular explosion animation — a slam draws a
// dust/impact ring, never an explosion. Enemies hit by a slam also gain +1
// worm stack. The jump itself deals no damage on the way — damage is only
// the slam. Hyper: main attack while hypercharged also fires 2 side worms
// that HOME IN on enemies (1200 px/s, 4 rad/s turn, 300 dmg each, 800px
// range, +250px range when the book is redirected); the normal worm STILL
// comes out after. Super while hypercharged: an EXTRA charge (3 total) and
// the jump mirrors itself 1s later in the SAME direction as a SHADOW CLONE
// (round 1, 2026-11-14: the clone does the jump, not Bookworm — he stays
// put; the clone spawns at his current position, jumps the same direction
// and distance with the same slam, then vanishes; visual only, not
// targetable, no HP; mirrors never consume charges and fire on schedule
// while the form lasts — no re-queue when he is mid-air; dropped if the
// form expired). G1 Speed Read
// (14s): next book flies 50% faster and +30% range. G2 Wormhole (16s):
// teleport to the flying book (the book ends and the worm fires as normal;
// fizzles with NO BOOK! when no book is live). SP1 Voracious Reader: worm
// stacks last 50% longer (4s -> 6s). SP2 Cliffhanger: root 1s -> 1.75s.
// Voice lines are flavor-only (RULE ONE) and silent until Anthony picks a
// voice. Roster: Bookworm made 109 ids / 101 selectable (108/100 + 1);
// FreeZeon (2026-11-15) now makes 110 ids / 102 selectable.
// Driller (2026-11-16) now makes 111 ids / 103 selectable.
// Gravy (2026-11-16) now makes 112 ids / 104 selectable.
// Delete-disabled (2026-11-16) now makes 104 ids / 104 selectable.
// Known limitation (flagged, not a spec deviation): in Fused mode the
// redirect and the jumps are skipped — the fused component fires the normal
// main attack instead.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/bookworm-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('roster includes bookworm (104 ids with Gravy)', game.includes("'pandy', 'snipa', 'bookworm'"));
check('selectable is 104 (104 ids, none disabled, bookworm not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [];
  return all.length === 104 && all.filter(id => !disabled.includes(id)).length === 104;
})());
check('rarity Epic (170 souls)', game.includes("bookworm: 'Epic',") && game.includes('Epic: 170'));
check('role Controller', game.includes("bookworm:'Controller',"));
check('portrait icon present', game.includes("bookworm: '🐛',"));
check('stats branch 5000/800/270', game.includes("if (brawlerId === 'bookworm') {") && game.includes('hp: Math.round(5000 * hpScale), dmg: Math.round(800 * scale), speed: 270'));
check('1 ammo', game.includes("brawlerId==='bookworm')return 1;"));
check('reload 1700ms', game.includes('bookworm: 1700,'));
check('fire delay 300ms', game.includes('bookworm: 300,'));
check('super charge 7 hits', game.includes('bookworm: 7'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'bookworm': {") && game.includes("name: 'Bookworm'") && game.includes("attack: 'Bookmark Toss'") && game.includes("super: 'Worm Leap'") && game.includes("g1: 'Speed Read") && game.includes("g2: 'Wormhole") && game.includes("sp1: 'Voracious Reader") && game.includes("sp2: 'Cliffhanger") && !game.slice(game.indexOf("'bookworm': {"), game.indexOf("'bookworm': {") + 2600).includes('coming soon'));
check('card text matches the kit (redirect once, worm root, 2 jumps, hyper side worms + shadow clone)', game.includes("Bookworm hurls a piercing book he can redirect once, then a worm bursts out to stack up a root.") && game.includes('Two jumps, second one hits harder.') && game.includes('side worms home in, and a shadow clone echoes every jump a second later.'));
check('gadget cooldown map entry', game.includes('bookworm: { g1: 14000, g2: 16000 },'));
check('fire pre-check: form jumps, live book redirects, never a second book', game.includes("if (brawler === 'bookworm' && !fromEntity.fusedPartCall) {") && game.includes("if (isBookwormFormActive(fromEntity)) { bookwormDoJump(fromEntity, targetX, targetY); return; }") && game.includes('tryBookwormRedirect(fromEntity, targetX, targetY);'));
check('fire branch exists with primary-charge book', game.includes("} else if (brawler === 'bookworm') {") && game.includes('fireBookwormMain(fromEntity, targetX, targetY, isBot);') && game.includes('isBookwormBook: true,') && game.includes('isPrimaryChargeProjectile: true'));
check('book + worm branches sit BEFORE the universal skin call (no interception)', game.indexOf('if (b.isBookwormBook) {') > 0 && game.indexOf('if (b.isBookwormBook) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') && game.indexOf('if (b.isBookwormWorm || b.isBookwormSideWorm) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branches draw dedicated art then continue', game.includes('drawBookwormBook(ctx, b);') && game.includes('drawBookwormWorm(ctx, b);'));
check('player super dispatch', game.includes("if (combatBrawler === 'bookworm') { castBookwormSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'bookworm') { castBookwormSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, per-brawler cooldowns)', game.includes("curBrawler === 'bookworm' && curGadget === 'g1'") && game.includes("curBrawler === 'bookworm' && curGadget === 'g2'"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'bookworm' && g === 'g1'") && game.includes("bot.brawler === 'bookworm' && g === 'g2'"));
check('bot super range gate is jump-2 range (550 < 600)', game.includes("if (bot.brawler === 'bookworm') return distance < 550;"));
check('checkHit hook: worm + side-worm hits stack the root', game.includes("if (b && (b.isBookwormWorm || b.isBookwormSideWorm) && target && target.hp > 0) {") && game.includes('bookwormApplyWormStack(bookwormOwner, target);'));
check('bullet expiry hook: book ends at max range -> worm comes out', game.includes('if (b.isBookwormBook && b.life >= b.maxLife) {') && game.includes('bookwormEndBook(b);'));
check('bullet wall hook: book ends on a wall -> worm comes out', game.includes('if (b.isBookwormBook) {') && game.includes('bookwormEndBook(b);'));
check('side worm steering hook in the bullet loop', game.includes('if (b.isBookwormSideWorm) bookwormSteerSideWorm(b, dt);'));
check('update loop calls updateBookwormSystems', game.includes('if (playing && !gameOver) updateBookwormSystems(dt);'));
check('render calls renderBookwormEffects', game.includes('    renderBookwormEffects();'));
check('camera follows the flying book (BlinkEye precedent)', game.includes("if (player && selectedBrawler === 'bookworm' && player.bookwormBook && bullets.includes(player.bookwormBook)) {") && game.includes('cameraTargetX = player.bookwormBook.x;') && game.includes('cameraTargetY = player.bookwormBook.y;'));
check('portrait body-art branch (lime book + worm)', game.includes("if (brawlerId === 'bookworm') {") && game.includes("ctx.fillStyle = '#a3e635';"));
check('jump landing branch slams (dust ring, no explosion)', game.includes('if (e.isBookwormSuperJump) {') && game.includes('bookwormApplySlam(e, e.x, e.y, slam);'));
check('slam never pushes an explosion (dust ring only)', (() => {
  const start = game.indexOf('function bookwormApplySlam(');
  const end = game.indexOf('function bookwormSteerSideWorm(');
  const body = game.slice(start, end);
  return body.includes('bookwormSlamFx.push(') && !body.includes('explosions.push');
})());
check('constants: book 660/375/800, worm 1400/650/350', game.includes('const BOOKWORM_BOOK_SPEED = 660;') && game.includes('const BOOKWORM_BOOK_RANGE = 375;') && game.includes('const BOOKWORM_BOOK_DMG = 800;') && game.includes('const BOOKWORM_WORM_SPEED = 1400;') && game.includes('const BOOKWORM_WORM_RANGE = 650;') && game.includes('const BOOKWORM_WORM_DMG = 350;'));
check('constants: 3 stacks / 4s decay / 1s root / 250ms redirect age', game.includes('const BOOKWORM_WORM_STACKS_TO_ROOT = 3;') && game.includes('const BOOKWORM_WORM_STACK_DECAY_MS = 4000;') && game.includes('const BOOKWORM_ROOT_DURATION_MS = 1000;') && game.includes('const BOOKWORM_REDIRECT_MIN_AGE_MS = 250;'));
check('constants: jumps 400/600, slams 600/900, radii 150/180, direct 70/1200', game.includes('const BOOKWORM_SUPER_JUMP1_DIST = 400;') && game.includes('const BOOKWORM_SUPER_JUMP2_DIST = 600;') && game.includes('const BOOKWORM_SUPER_JUMP1_SLAM_DMG = 600;') && game.includes('const BOOKWORM_SUPER_JUMP2_SLAM_DMG = 900;') && game.includes('const BOOKWORM_SUPER_JUMP1_SLAM_RADIUS = 150;') && game.includes('const BOOKWORM_SUPER_JUMP2_SLAM_RADIUS = 180;') && game.includes('const BOOKWORM_SUPER_JUMP_DIRECT_RADIUS = 70;') && game.includes('const BOOKWORM_SUPER_JUMP_DIRECT_DMG = 1200;'));
check('constants: form 8s / charge 7 / side worms 1200/300/800/+250/4 rad/s / mirror 1s', game.includes('const BOOKWORM_SUPER_FORM_DURATION_MS = 8000;') && game.includes('const BOOKWORM_SUPER_CHARGE_HITS = 7;') && game.includes('const BOOKWORM_SIDE_WORM_SPEED = 1200;') && game.includes('const BOOKWORM_SIDE_WORM_DMG = 300;') && game.includes('const BOOKWORM_SIDE_WORM_RANGE = 800;') && game.includes('const BOOKWORM_SIDE_WORM_REDIRECT_BONUS_RANGE = 250;') && game.includes('const BOOKWORM_SIDE_WORM_TURN_RATE = 4;') && game.includes('const BOOKWORM_MIRROR_DELAY_MS = 1000;'));
check('constants: G1 +50%/+30% / SP1 x1.5 decay / SP2 1.75s root', game.includes('const BOOKWORM_G1_SPEED_MULT = 1.5;') && game.includes('const BOOKWORM_G1_RANGE_MULT = 1.3;') && game.includes('const BOOKWORM_SP1_STACK_DECAY_MULT = 1.5;') && game.includes('const BOOKWORM_SP2_ROOT_DURATION_MS = 1750;'));
check('constants: hyper aura mirrors Pandy/Snipa (radius +20, line 5, alpha 0.9)', game.includes('const BOOKWORM_HYPER_AURA_RADIUS_BONUS = 20;') && game.includes('const BOOKWORM_HYPER_AURA_LINE_WIDTH = 5;') && game.includes('const BOOKWORM_HYPER_AURA_STROKE_ALPHA = 0.9;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function bookwormHasSP1(entity) { return bookwormStarChoice(entity) === 'slow'; }") && game.includes("function bookwormHasSP2(entity) { return bookwormStarChoice(entity) === 'long'; }"));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/bookworm-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweBookwormVoice?.play('attack')") && game.includes("BraweBookwormVoice?.play('kill')") && game.includes("BraweBookwormVoice?.play('super')") && game.includes('updateBookwormVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('G2 fizzles with NO BOOK! when no book is live', game.includes("spawnFloatingText(entity.x, entity.y - 40, 'NO BOOK!', '#fca5a5');"));
check('mirror is a shadow clone (visual only, slams, not targetable)', game.includes('function bookwormSpawnShadowClone(owner, m) {') && game.includes('let bookwormShadowClones = [];') && game.includes('return bookwormSpawnShadowClone(entity, m);') && !game.slice(game.indexOf('function bookwormDoJumpMirror('), game.indexOf('function bookwormSpawnShadowClone(')).includes('bookwormStartJump(entity,'));
check('mirror queue: no re-queue when airborne (clone fires on schedule)', (() => {
  const start = game.indexOf('// Hyper mirror jumps: 1s after the real jump, a shadow clone');
  const end = game.indexOf('// Hyper trail particles');
  const body = game.slice(start, end);
  return body.includes('bookwormDoJumpMirror(e, m);') && !body.includes('at: now + 150');
})());
check('worm bar is a 3-segment bar above the enemy', game.includes('const w = 36, h = 6;') && game.includes("for (let s = 0; s < 3; s++) {") && game.includes("ctx.fillStyle = s < stacks ? '#a3e635' : 'rgba(163,230,53,0.25)';"));

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
    isHypercharged: !!opts.isHypercharged,
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
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'bookworm', x: 0, y: 0 });
  botEnts = [];
  sandbox.player = playerEnt;
  sandbox.bots = botEnts;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.bookwormSlamFx = [];
  sandbox.bookwormShadowClones = [];
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'bookworm';
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

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getScaledStats: (id, lvl) => id === 'bookworm' ? { hp: 5000, dmg: 800, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getSelectedBrawlerLevel: () => 11,
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
  bookwormSlamFx: [],
  bookwormShadowClones: [],
  isHypercharged: false,
  selectedBrawler: 'bookworm',
  ctx: null,
};
// Pull every BOOKWORM_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (BOOKWORM_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
vm.createContext(sandbox);
vm.runInContext(
  [
    'bookwormStarChoice', 'bookwormHasSP1', 'bookwormHasSP2', 'isBookworm',
    'isBookwormFormActive', 'bookwormRootDurationMs', 'bookwormStackDecayMs',
    'bookwormApplyWormStack', 'fireBookwormMain', 'tryBookwormRedirect',
    'bookwormEndBook', 'castBookwormSuper', 'bookwormPointInWall',
    'bookwormJumpLanding', 'bookwormStartJump', 'bookwormDoJump',
    'bookwormDoJumpMirror', 'bookwormSpawnShadowClone',
    'bookwormApplySlam', 'bookwormSteerSideWorm', 'updateBookwormSystems',
    'executeBookwormGadget', 'drawBookwormBook', 'drawBookwormWorm',
    'drawBookwormShadowClone', 'renderBookwormEffects',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + root/decay durations ---
try {
  check('SP1 gate: stored slow is true', sandbox.bookwormHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.bookwormHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.bookwormHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.bookwormHasSP2({ selectedStar: 'slow' }) === false);
  check('root duration: base 1000ms', sandbox.bookwormRootDurationMs({ selectedStar: 'none' }) === 1000);
  check('root duration: SP2 Cliffhanger 1750ms', sandbox.bookwormRootDurationMs({ selectedStar: 'long' }) === 1750);
  check('stack decay: base 4000ms', sandbox.bookwormStackDecayMs({ selectedStar: 'none' }) === 4000);
  check('stack decay: SP1 Voracious Reader 6000ms', sandbox.bookwormStackDecayMs({ selectedStar: 'slow' }) === 6000);
} catch (e) { failures.push('SP gates/durations threw: ' + e.message); }

// --- executed: worm stacks + root ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0 });
  sandbox.bookwormApplyWormStack(owner, enemy);
  check('stack: 1 hit = 1 stack', enemy.bookwormWormStacks === 1 && !enemy.rootUntil);
  sandbox.bookwormApplyWormStack(owner, enemy);
  check('stack: 2 hits = 2 stacks, still no root', enemy.bookwormWormStacks === 2 && !enemy.rootUntil);
  sandbox.bookwormApplyWormStack(owner, enemy);
  check('stack: 3 hits root for 1s and reset to 0', enemy.bookwormWormStacks === 0 && enemy.rootUntil === nowMs + 1000);
  check('stack: ROOTED! text shown', floatingTexts.some((f) => f.text === '🪱 ROOTED!'));
  sandbox.bookwormApplyWormStack(owner, enemy);
  check('stack: hit after a root starts a fresh stack', enemy.bookwormWormStacks === 1);
  const sp2Owner = mkBot('sp2', { team: 'player', brawler: 'bookworm', selectedStar: 'long' });
  const enemy2 = mkBot('e2', { x: 400, y: 0 });
  sandbox.bookwormApplyWormStack(sp2Owner, enemy2);
  sandbox.bookwormApplyWormStack(sp2Owner, enemy2);
  sandbox.bookwormApplyWormStack(sp2Owner, enemy2);
  check('stack: SP2 root lasts 1750ms', enemy2.rootUntil === nowMs + 1750);
  const dummy = mkBot('d1', { x: 500, y: 0, isDummy: true });
  sandbox.bookwormApplyWormStack(owner, dummy);
  check('stack: training dummies DO take stacks', dummy.bookwormWormStacks === 1);
  const structure = mkBot('s1', { x: 600, y: 0, isStructure: true, brawler: 'tower_core' });
  sandbox.bookwormApplyWormStack(owner, structure);
  check('stack: structures NEVER take stacks', !structure.bookwormWormStacks);
  const pet = mkBot('pet1', { x: 700, y: 0, isPet: true });
  sandbox.bookwormApplyWormStack(owner, pet);
  check('stack: pets NEVER take stacks', !pet.bookwormWormStacks);
  const ally = mkAlly('a1', { x: 800, y: 0 });
  sandbox.bookwormApplyWormStack(owner, ally);
  check('stack: allies NEVER take stacks', !ally.bookwormWormStacks);
  const dead = mkBot('dead1', { x: 900, y: 0, hp: 0 });
  sandbox.bookwormApplyWormStack(owner, dead);
  check('stack: dead targets NEVER take stacks', !dead.bookwormWormStacks);
} catch (e) { failures.push('worm stacks threw: ' + e.message); }

// --- executed: stack decay (4s base, 6s with the owner's SP1) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0 });
  sandbox.bookwormApplyWormStack(owner, enemy);
  sandbox.bookwormApplyWormStack(owner, enemy);
  nowMs += 3999;
  sandbox.updateBookwormSystems(0.016);
  check('decay: stacks survive at 3.999s', enemy.bookwormWormStacks === 2);
  nowMs += 2;
  sandbox.updateBookwormSystems(0.016);
  check('decay: stacks fade after 4s without a new stack', enemy.bookwormWormStacks === 0);
  const sp1Owner = mkBot('sp1', { team: 'player', brawler: 'bookworm', selectedStar: 'slow' });
  const enemy2 = mkBot('e2', { x: 400, y: 0 });
  sandbox.bookwormApplyWormStack(sp1Owner, enemy2);
  sandbox.bookwormApplyWormStack(sp1Owner, enemy2);
  nowMs += 5000;
  sandbox.updateBookwormSystems(0.016);
  check('decay: SP1 stacks survive at 5s', enemy2.bookwormWormStacks === 2);
  nowMs += 1001;
  sandbox.updateBookwormSystems(0.016);
  check('decay: SP1 stacks fade after 6s', enemy2.bookwormWormStacks === 0);
} catch (e) { failures.push('stack decay threw: ' + e.message); }

// --- executed: main attack (book) + redirect + worm ---
try {
  resetWorld();
  const owner = playerEnt;
  const book = sandbox.fireBookwormMain(owner, 1000, 0, false);
  check('main: one piercing book spawns', bullets.length === 1 && book.isBookwormBook === true && book.pierce === true);
  check('main: book speed 660, range 375 (maxLife 375/660)', near(book.vx, 660) && near(book.maxLife, 375 / 660));
  check('main: book damage 800 at P11, primary-charge projectile', book.damage === 800 && book.isPrimaryChargeProjectile === true);
  check('main: owner tracks the live book', owner.bookwormBook === book);
  check('main: no side worms without Hyper', bullets.filter((b) => b.isBookwormSideWorm).length === 0);
  // Redirect: too young to steer, then steers once, then never again.
  // (The book spawns at (30, 0); aim (30, 500) is straight above it.)
  nowMs += 100;
  check('redirect: book under 250ms refuses to steer', sandbox.tryBookwormRedirect(owner, 30, 500) === false && near(book.vx, 660));
  nowMs += 200;
  check('redirect: book at 300ms steers to the aim', sandbox.tryBookwormRedirect(owner, 30, 500) === true && near(book.vx, 0, 1) && near(book.vy, 660, 1) && book.redirected === true);
  check('redirect: second steer refused (once only)', sandbox.tryBookwormRedirect(owner, 1000, 0) === false && near(book.vy, 660, 1));
  // Book ends -> worm comes out in the book's final direction.
  const wormCountBefore = bullets.filter((b) => b.isBookwormWorm).length;
  sandbox.bookwormEndBook(book);
  const worm = bullets.find((b) => b.isBookwormWorm);
  check('book end: worm fires in the book direction (1400 px/s, 650px, 350 dmg)', !!worm && near(worm.vx, 0, 1) && near(worm.vy, 1400, 1) && worm.damage === 350 && near(worm.maxLife, 650 / 1400) && worm.pierce === false);
  check('book end: worm fires from the book position', worm && worm.x === book.x && worm.y === book.y);
  check('book end: camera ref cleared', owner.bookwormBook === null);
  sandbox.bookwormEndBook(book);
  check('book end: ending twice fires only one worm', bullets.filter((b) => b.isBookwormWorm).length === wormCountBefore + 1);
  // Book ends at 375px (round 2): the book flies 375px from its spawn,
  // then the worm comes out from exactly there. Worm range unchanged (650).
  // Slower book = longer flight (~568ms vs ~432ms), so the redirect window
  // is more forgiving: the book is still steerable at 500ms.
  resetWorld();
  const lateOwner = playerEnt;
  const lateBook = sandbox.fireBookwormMain(lateOwner, 1000, 0, false);
  nowMs += 500;
  check('redirect: book still steerable at 500ms (flight now ~568ms)', sandbox.tryBookwormRedirect(lateOwner, 30, 500) === true && near(lateBook.vy, 660, 1));
  resetWorld();
  const rangeOwner = playerEnt;
  const rangeBook = sandbox.fireBookwormMain(rangeOwner, 1000, 0, false);
  check('range: book flight lasts 375/660s (book ends at 375px)', near(rangeBook.maxLife, 375 / 660));
  rangeBook.x += rangeBook.vx * rangeBook.maxLife;
  check('range: book ends 375px from its spawn point', near(rangeBook.x, 30 + 375));
  sandbox.bookwormEndBook(rangeBook);
  const rangeWorm = bullets.find((b) => b.isBookwormWorm);
  check('range: worm comes out from the 375px book-end point, worm range still 650', !!rangeWorm && rangeWorm.x === rangeBook.x && rangeWorm.y === rangeBook.y && near(rangeWorm.maxLife, 650 / 1400));
  // Dead owner: no worm.
  resetWorld();
  const deadOwner = playerEnt;
  const book2 = sandbox.fireBookwormMain(deadOwner, 1000, 0, false);
  deadOwner.hp = 0;
  sandbox.bookwormEndBook(book2);
  check('book end: dead owner fires no worm', bullets.filter((b) => b.isBookwormWorm).length === 0);
} catch (e) { failures.push('main/redirect/worm threw: ' + e.message); }

// --- executed: Hyper main (side worms) + G1 Speed Read ---
try {
  resetWorld();
  sandbox.isHypercharged = true;
  const owner = playerEnt;
  sandbox.fireBookwormMain(owner, 1000, 0, false);
  const sideWorms = bullets.filter((b) => b.isBookwormSideWorm);
  check('hyper main: 2 side worms fire with the book', sideWorms.length === 2);
  check('hyper main: side worms 1200 px/s, 300 dmg, 800px range, non-piercing', sideWorms.every((w) => near(Math.hypot(w.vx, w.vy), 1200) && w.damage === 300 && near(w.maxLife, 800 / 1200) && w.pierce === false));
  check('hyper main: side worms fire perpendicular to the book', near(Math.abs(sideWorms[0].vx), 0, 1) && near(Math.abs(sideWorms[0].vy), 1200, 1));
  check('hyper main: normal worm still comes out after (book end)', (() => {
    sandbox.bookwormEndBook(owner.bookwormBook);
    return bullets.some((b) => b.isBookwormWorm);
  })());
  // Redirect extends side-worm range by +250px.
  resetWorld();
  sandbox.isHypercharged = true;
  const owner2 = playerEnt;
  sandbox.fireBookwormMain(owner2, 1000, 0, false);
  const sw = bullets.find((b) => b.isBookwormSideWorm);
  const maxLifeBefore = sw.maxLife;
  nowMs += 300;
  sandbox.tryBookwormRedirect(owner2, 0, 500);
  check('hyper main: redirect adds +250px range to side worms', near(sw.maxLife, maxLifeBefore + 250 / 1200));
  // G1 Speed Read: next book +50% speed, +30% range, flag consumed.
  resetWorld();
  const owner3 = playerEnt;
  owner3.bookwormSpeedReadArmed = true;
  const fastBook = sandbox.fireBookwormMain(owner3, 1000, 0, false);
  check('G1: next book flies 50% faster (990) and +30% range (maxLife 487.5/990)', near(fastBook.vx, 990) && near(fastBook.maxLife, 487.5 / 990));
  check('G1: armed flag consumed on fire', owner3.bookwormSpeedReadArmed === false);
  const slowBook = sandbox.fireBookwormMain(owner3, 1000, 0, false);
  check('G1: the book after is back to base speed', near(slowBook.vx, 660));
} catch (e) { failures.push('hyper main / G1 threw: ' + e.message); }

// --- executed: Super form + jumps + mirror ---
try {
  resetWorld();
  const owner = playerEnt;
  check('super: cast returns true, form active, 2 charges, 8s timer', sandbox.castBookwormSuper(owner, false, 1000, 0) === true && owner.bookwormFormActive === true && owner.bookwormJumpCharges === 2 && owner.bookwormFormUntil === nowMs + 8000);
  check('super: WORM LEAP! text shown', floatingTexts.some((f) => f.text === '🪱 WORM LEAP!'));
  check('super: form is active while charges remain', sandbox.isBookwormFormActive(owner) === true);
  check('jump 1: 400px, slam 600/150, one charge spent', sandbox.bookwormDoJump(owner, 1000, 0) === true && near(owner.jumpTargetX, 400) && owner.bookwormJumpSlam.dmg === 600 && owner.bookwormJumpSlam.radius === 150 && owner.bookwormJumpCharges === 1 && owner.bookwormJumpsUsed === 1);
  check('jump: entity is jumping with the slam stored', owner.isJumping === true && owner.isBookwormSuperJump === true && owner.isSuperJump === true);
  check('jump: cannot jump again mid-air', sandbox.bookwormDoJump(owner, 1000, 0) === false);
  owner.isJumping = false; // landed
  owner.x = 400; // landed at the jump-1 target
  check('jump 2: 600px, slam 900/180, direct 1200, last charge spent', sandbox.bookwormDoJump(owner, 1000, 0) === true && near(owner.jumpTargetX, 1000) && owner.bookwormJumpSlam.dmg === 900 && owner.bookwormJumpSlam.radius === 180 && owner.bookwormJumpSlam.directDmg === 1200 && owner.bookwormJumpCharges === 0);
  check('jump: no third jump (both charges spent)', sandbox.bookwormDoJump(owner, 1000, 0) === false);
  // Hyper: 3 charges + mirror queued on each jump.
  resetWorld();
  const hyperOwner = playerEnt;
  sandbox.castBookwormSuper(hyperOwner, true, 1000, 0);
  check('hyper super: 3 charges (extra charge)', hyperOwner.bookwormJumpCharges === 3);
  sandbox.bookwormDoJump(hyperOwner, 1000, 0);
  check('hyper super: jump queues a mirror 1s later, same direction', hyperOwner.bookwormMirrorQueue.length === 1 && hyperOwner.bookwormMirrorQueue[0].at === nowMs + 1000 && near(hyperOwner.bookwormMirrorQueue[0].ang, 0) && hyperOwner.bookwormMirrorQueue[0].dist === 400 && hyperOwner.bookwormMirrorQueue[0].slamDmg === 600);
  const mirror = hyperOwner.bookwormMirrorQueue[0];
  const chargesBefore = hyperOwner.bookwormJumpCharges;
  const ownerXBefore = hyperOwner.x;
  const ownerYBefore = hyperOwner.y;
  hyperOwner.isJumping = false;
  check('mirror: a shadow clone echoes the jump (400px, 600/150) without spending a charge', sandbox.bookwormDoJumpMirror(hyperOwner, mirror) === true && sandbox.bookwormShadowClones.length === 1 && hyperOwner.bookwormJumpCharges === chargesBefore);
  const clone = sandbox.bookwormShadowClones[0];
  check('mirror: clone spawns at Bookworm\'s CURRENT position, same direction/distance/slam', clone.startX === ownerXBefore && clone.startY === ownerYBefore && near(clone.targetX, 400) && clone.slam.dmg === 600 && clone.slam.radius === 150 && clone.duration === 300);
  check('mirror: Bookworm himself does NOT move or jump (his own jump-1 flag stays as it was)', hyperOwner.x === ownerXBefore && hyperOwner.y === ownerYBefore && hyperOwner.isJumping === false);
  check('mirror: clone is visual only (no hp, no id, not a registered entity)', !('hp' in clone) && !('id' in clone) && sandbox.getEntityById(clone.ownerId) === hyperOwner);
  // Jump 2 mirror keeps jump-2 slam values.
  hyperOwner.isJumping = false;
  hyperOwner.x = 400; // landed at the jump-1 target
  sandbox.bookwormDoJump(hyperOwner, 1000, 0); // jump 2 (charges 2 -> 1)
  const mirror2 = hyperOwner.bookwormMirrorQueue[hyperOwner.bookwormMirrorQueue.length - 1];
  check('mirror: jump-2 mirror keeps 600px / 900 dmg / 180 radius', mirror2.dist === 600 && mirror2.slamDmg === 900 && mirror2.slamRadius === 180 && mirror2.isJump2 === true);
  // Form expiry: timer out ends the form.
  resetWorld();
  const timed = playerEnt;
  sandbox.castBookwormSuper(timed, false, 1000, 0);
  nowMs += 8001;
  sandbox.updateBookwormSystems(0.016);
  check('form: timer expiry ends the form', timed.bookwormFormActive === false && sandbox.isBookwormFormActive(timed) === false);
} catch (e) { failures.push('super/jumps/mirror threw: ' + e.message); }

// --- executed: slam damage + stacks + no explosion ---
try {
  resetWorld();
  const owner = playerEnt;
  const center = mkBot('c1', { x: 400, y: 0, hp: 5000 });
  const edge = mkBot('e1', { x: 400, y: 100, hp: 5000 });
  const outside = mkBot('o1', { x: 400, y: 200, hp: 5000 });
  const ally = mkAlly('a1', { x: 400, y: 0, hp: 5000 });
  const slam1 = { dmg: 600, radius: 150, directRadius: 70, directDmg: 1200, isJump2: false };
  sandbox.bookwormApplySlam(owner, 400, 0, slam1);
  check('slam: direct hit within 70px takes 1200', center.hp === 5000 - 1200);
  check('slam: enemy inside the radius takes slam damage', edge.hp === 5000 - 600);
  check('slam: enemy outside the radius takes nothing', outside.hp === 5000);
  check('slam: allies take nothing', ally.hp === 5000);
  check('slam: enemies hit gain +1 worm stack', center.bookwormWormStacks === 1 && edge.bookwormWormStacks === 1 && !outside.bookwormWormStacks);
  check('slam: registers a dust-ring FX (no explosion)', sandbox.bookwormSlamFx.length === 1 && sandbox.bookwormSlamFx[0].radius === 150 && explosions.length === 0);
  check('slam: checkHit was called with the bookworm super flag', checkHitCalls.every((c) => c.ownerBrawler === 'bookworm'));
  // Jump-2 slam numbers.
  resetWorld();
  const owner2 = playerEnt;
  const far = mkBot('f1', { x: 400, y: 160, hp: 5000 });
  const slam2 = { dmg: 900, radius: 180, directRadius: 70, directDmg: 1200, isJump2: true };
  sandbox.bookwormApplySlam(owner2, 400, 0, slam2);
  check('slam 2: enemy at 160px (inside 180) takes 900', far.hp === 5000 - 900);
} catch (e) { failures.push('slam threw: ' + e.message); }

// --- executed: side-worm homing (4 rad/s turn, constant speed) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 0, y: 500, hp: 5000 });
  const worm = { x: 0, y: 0, vx: 1200, vy: 0, ownerId: owner.id, isBookwormSideWorm: true };
  sandbox.bookwormSteerSideWorm(worm, 0.016);
  check('homing: worm turns toward the enemy (up to 4 rad/s * dt)', worm.vy > 0 && near(Math.atan2(worm.vy, worm.vx), 4 * 0.016, 0.001));
  check('homing: worm speed stays constant while turning', near(Math.hypot(worm.vx, worm.vy), 1200));
  resetWorld();
  const ownerNoTarget = playerEnt;
  const noTarget = { x: 0, y: 0, vx: 1200, vy: 0, ownerId: ownerNoTarget.id, isBookwormSideWorm: true };
  sandbox.bookwormSteerSideWorm(noTarget, 0.016);
  check('homing: no enemy, no turn', near(noTarget.vx, 1200) && near(noTarget.vy, 0));
  // An ally is not a homing target.
  resetWorld();
  const owner2 = playerEnt;
  mkAlly('a1', { x: 0, y: 500 });
  const worm2 = { x: 0, y: 0, vx: 1200, vy: 0, ownerId: owner2.id, isBookwormSideWorm: true };
  sandbox.bookwormSteerSideWorm(worm2, 0.016);
  check('homing: allies are not homing targets', near(worm2.vx, 1200) && near(worm2.vy, 0));
} catch (e) { failures.push('side-worm homing threw: ' + e.message); }

// --- executed: form lifecycle in updateBookwormSystems ---
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.castBookwormSuper(owner, false, 1000, 0);
  owner.bookwormJumpCharges = 0;
  owner.isJumping = false;
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: form ends once both charges are spent and the last jump landed', owner.bookwormFormActive === false);
  // A pending mirror keeps the form alive until it fires.
  resetWorld();
  const owner2 = playerEnt;
  sandbox.castBookwormSuper(owner2, true, 1000, 0);
  owner2.bookwormJumpCharges = 0;
  owner2.bookwormMirrorQueue = [{ at: nowMs + 500, ang: 0, dist: 400, slamDmg: 600, slamRadius: 150, isJump2: false }];
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: pending mirror keeps the form alive', owner2.bookwormFormActive === true);
  nowMs += 600;
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: mirror fires 1s after the real jump (queue drains, clone spawns, entity does NOT jump)', owner2.bookwormMirrorQueue.length === 0 && sandbox.bookwormShadowClones.length === 1 && owner2.isJumping !== true && owner2.x === 0 && owner2.y === 0);
  // The clone flies its arc and slams on landing, then vanishes.
  const cloneEnemy = mkBot('ce1', { x: 400, y: 0, hp: 5000 });
  const flyingClone = sandbox.bookwormShadowClones[0];
  flyingClone.elapsed = flyingClone.duration - 1; // almost landed
  sandbox.updateBookwormSystems(0.016);
  check('clone: lands at the mirrored jump target and slams (direct 1200 + stack), then vanishes', sandbox.bookwormShadowClones.length === 0 && cloneEnemy.hp === 5000 - 1200 && cloneEnemy.bookwormWormStacks === 1 && sandbox.bookwormSlamFx.length === 1);
  // The mirror fires on schedule even while the entity is mid-air (the
  // old +150ms re-queue is gone — the clone is independent).
  resetWorld();
  const owner3 = playerEnt;
  sandbox.castBookwormSuper(owner3, true, 1000, 0);
  owner3.isJumping = true;
  owner3.jumpTargetX = 400; // its own jump, still in flight
  owner3.bookwormMirrorQueue = [{ at: nowMs, ang: 0, dist: 400, slamDmg: 600, slamRadius: 150, isJump2: false }];
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: mirror fires on schedule even while the entity is airborne (no re-queue)', owner3.bookwormMirrorQueue.length === 0 && sandbox.bookwormShadowClones.length === 1 && owner3.isJumping === true && owner3.jumpTargetX === 400);
  // A mirror whose form expired before the 1s is up is dropped, not fired.
  resetWorld();
  const ownerExp = playerEnt;
  sandbox.castBookwormSuper(ownerExp, true, 1000, 0);
  ownerExp.bookwormJumpCharges = 0;
  ownerExp.bookwormMirrorQueue = [{ at: nowMs + 500, ang: 0, dist: 400, slamDmg: 600, slamRadius: 150, isJump2: false }];
  nowMs += 8001; // form timer (8s) ran out before the mirror came due
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: mirror dropped if the form expired (queue drains, no clone)', ownerExp.bookwormFormActive === false && ownerExp.bookwormMirrorQueue.length === 0 && sandbox.bookwormShadowClones.length === 0);
  // Death clears everything.
  resetWorld();
  const owner4 = playerEnt;
  sandbox.castBookwormSuper(owner4, true, 1000, 0);
  owner4.bookwormBook = { x: 1, y: 1 };
  owner4.hp = 0;
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: death clears the form, charges, mirror queue, and book ref', owner4.bookwormFormActive === false && owner4.bookwormJumpCharges === 0 && owner4.bookwormMirrorQueue.length === 0 && owner4.bookwormBook === null);
  // Stale book ref (book destroyed by a bubble/shield) clears without a worm.
  resetWorld();
  const owner5 = playerEnt;
  owner5.bookwormBook = { x: 1, y: 1, isBookwormBook: true };
  sandbox.updateBookwormSystems(0.016);
  check('lifecycle: stale book ref clears (no worm — the book was destroyed)', owner5.bookwormBook === null && bullets.filter((b) => b.isBookwormWorm).length === 0);
  // Hyper trail particles.
  resetWorld();
  const owner6 = playerEnt;
  owner6.isHypercharged = true;
  sandbox.updateBookwormSystems(0.016);
  check('hyper: trail particle spawns while hypercharged', explosions.some((x) => x.isParticle === true && String(x.color).includes('192,132,252') || String(x.color).includes('168,85,247')));
} catch (e) { failures.push('form lifecycle threw: ' + e.message); }

// --- executed: gadgets ---
try {
  resetWorld();
  const owner = playerEnt;
  check('gadget G1: Speed Read arms the next book', sandbox.executeBookwormGadget(owner, 'g1', false) === true && owner.bookwormSpeedReadArmed === true);
  check('gadget G1: SPEED READ! text shown', floatingTexts.some((f) => f.text === '📖 SPEED READ!'));
  check('gadget G2: no live book fizzles', sandbox.executeBookwormGadget(owner, 'g2', false) === false && floatingTexts.some((f) => f.text === 'NO BOOK!'));
  owner.x = 500; owner.y = 500; // away from the arena edge so the teleport lands exactly on the book
  sandbox.fireBookwormMain(owner, 1500, 500, false);
  const book = owner.bookwormBook;
  check('gadget G2: teleports to the flying book', sandbox.executeBookwormGadget(owner, 'g2', false) === true && owner.x === book.x && owner.y === book.y);
  check('gadget G2: the book ends and the worm fires as normal', bullets.some((b) => b.isBookwormWorm) && !bullets.includes(book));
  check('gadget G2: WORMHOLE! text shown', floatingTexts.some((f) => f.text === '🌀 WORMHOLE!'));
  check('gadget: unknown gadget returns false', sandbox.executeBookwormGadget(owner, 'g3', false) === false);
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: render helpers (recording stub canvas) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 300, y: 0 });
  enemy.bookwormWormStacks = 2;
  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.renderBookwormEffects();
  check('render: worm bar draws 2 filled lime segments + 1 empty', s1.sets.filter((s) => s.p === 'fillStyle' && s.v === '#a3e635').length >= 1 && s1.calls.some((c) => c.m === 'fillRect'));
  // Slam dust ring renders as an arc (no explosion).
  sandbox.bookwormSlamFx = [{ x: 400, y: 0, radius: 150, at: nowMs - 100, dur: 350 }];
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.renderBookwormEffects();
  check('render: slam dust ring draws an expanding arc', s2.calls.some((c) => c.m === 'arc' && c.args[2] > 60));
  // Hyper aura renders the purple ring.
  owner.isHypercharged = true;
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.renderBookwormEffects();
  check('render: hyper aura uses the purple ring (stroke alpha 0.9)', s3.sets.some((s) => s.p === 'strokeStyle' && String(s.v).includes('192,132,252,0.9')));
  // Form ring + jump pips render while the form is active.
  sandbox.castBookwormSuper(owner, false, 1000, 0);
  const s4 = stubCtx();
  sandbox.ctx = s4.proxy;
  sandbox.renderBookwormEffects();
  check('render: form ring draws while Worm Leap is active', s4.sets.some((s) => s.p === 'strokeStyle' && s.v === '#a3e635'));
  // Shadow clone draws translucent shadow-purple (body + book).
  sandbox.bookwormShadowClones = [{ x: 400, y: 0, z: 45, radius: 14, startX: 0, startY: 0, targetX: 400, targetY: 0, duration: 300, elapsed: 150, slam: { dmg: 600, radius: 150, directRadius: 70, directDmg: 1200, isJump2: false }, ownerId: owner.id }];
  const s7 = stubCtx();
  sandbox.ctx = s7.proxy;
  sandbox.renderBookwormEffects();
  check('render: shadow clone draws translucent purple (body + book)', s7.sets.some((s) => s.p === 'globalAlpha' && s.v === 0.55) && s7.sets.some((s) => s.p === 'fillStyle' && s.v === '#6b21a8') && s7.calls.some((c) => c.m === 'arc') && s7.calls.some((c) => c.m === 'rect'));
  // Dedicated bullet art draws without throwing.
  const s5 = stubCtx();
  sandbox.drawBookwormBook(s5.proxy, { x: 0, y: 0, vx: 660, vy: 0, hyperVisual: false });
  check('render: book draws (cover + page lines)', s5.calls.some((c) => c.m === 'rect') && s5.calls.some((c) => c.m === 'moveTo'));
  const s6 = stubCtx();
  sandbox.drawBookwormWorm(s6.proxy, { x: 0, y: 0, vx: 1400, vy: 0, hyperVisual: true });
  check('render: worm draws purple while hyper (3 segments + eyes)', s6.sets.some((s) => s.p === 'fillStyle' && s.v === '#c084fc') && s6.calls.filter((c) => c.m === 'arc').length >= 3);
} catch (e) { failures.push('render helpers threw: ' + e.message); }

// ---------------------------------------------------------- 3. report
if (failures.length) {
  console.error(`bookworm regression: ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.error('  FAIL ' + f);
  process.exit(1);
}
console.log(`bookworm regression: ${passed} passed, 0 failed`);
