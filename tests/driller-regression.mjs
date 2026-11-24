// Driller regression — ordered 2026-11-16 (builder picks, flagged for
// his correction). Anthony's core kit is authoritative; everything else
// below is a builder pick.
// Locked design: Epic Damage Dealer (170 souls), 5200 HP / 270 speed, 720
// base main damage (CHANGES ROUND 3: +80%, was 400 — the round-2 nerf made
// him awful). Main "Dirt Bomb": 700 px/s, 700px range; as it travels it
// spins dirt clods out in a spreading cone (up to 6 clods, 113 dmg each,
// shed every ~110px — Firecracker-style; Hyper bombs shed +3 extra, and
// SP1+Hyper sheds 13 at 50px spacing) but the bomb itself keeps going and
// still deals its 720 direct-hit damage — and on hitting an enemy/wall or
// reaching max range it bursts into a fan of 5 dirt clods that pierce
// through enemies (113 dmg each, 220px range; 7 clods when Hyper;
// CHANGES ROUND 2 — real Firecracker). Super "Drill Form" (CHANGES
// ROUND 1 — Moe-style driving): 8s form, one long ammo bar; Driller hops
// into his drill machine and drives around — contact damage that ramps on
// the SAME enemy: 50 > 100 > 150 > 250 > 500 > 1000 (unchanged in round 3;
// he didn't ask to change Super damage). Contact radius +25% in changes
// round 2, ANOTHER +35% in changes round 3 (x1.6875 total — FLAGGED).
// Ramp resets on a different enemy or after 1.5s without hitting that
// enemy; max one ramp step per enemy per 0.25s of contact. +35% move speed
// in form, invulnerable while in the drill (FLAGGED), walls in his path
// get smashed (Moe behavior). The attack button does nothing in form.
// CHANGES ROUND 3 — VISUAL FIX: the drill machine used to draw in
// renderDrillerEffects BEFORE entities, and the ~34px brawler portrait
// covered ~85% of the 24x16px machine — Anthony saw NO super visual.
// The machine now draws AFTER drawBrawlerPortrait (drawDrillerFormMachine),
// on top of the portrait, wider than it, with the bit clear out front;
// the contact ring is thicker/brighter with a filled aura, and the form
// bar is taller.
// Hyper main "Weakening Dirt": enemies hit by a Hyper dirt bomb or one of
// its spin clods deal 30% less damage per hit, stacking to 90%, for 0.7s.
// Hyper Super (CHANGES ROUND 1 rework): while driving in Hyper form the
// drill fires 3 small drill bits in a forward cone every 0.5s, 527px range
// (CHANGES ROUND 3: +35%, was 390px), each dealing 50% of the current
// ramp damage.
// G1 Mud Trap (14s): next dirt bomb slows enemies it hits (40%, 2s).
// G2 Wallbreaker Drill (16s): in drill mode, fire a big drill (1200 dmg)
// that breaks walls (Fuser/Runner pierceWalls + breakWallsInstantly).
// SP1 Spin Cycle: +4 extra spin projectiles in a wider cone (shed every
// 65px so all 10 fit inside the 700px flight — at 110px spacing only 6
// would ever shed). SP2 Jump Start: drill form heals 3400 HP on
// activation. Voice lines are flavor-only (RULE ONE) and silent until
// Anthony picks a voice. Roster: Driller makes 111 ids / 103 selectable.
// Gravy (2026-11-16) now makes 112 ids / 104 selectable.
// Delete-disabled (2026-11-16) now makes 104 ids / 104 selectable. Pitch (2026-11-20) now makes 105 ids / 105 selectable. Spritz (2026-11-22) now makes 106 ids / 106 selectable. Gameboard (2026-11-24) now makes 107 ids / 107 selectable.
// Dirt/slow/debuff effects affect brawlers only, never structures.
// Fused mode skips the drill form (the fused component fires the normal
// main attack instead — Bookworm pattern).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/driller-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('roster includes driller (107 ids)', game.includes("'pandy', 'snipa', 'bookworm', 'freezeon', 'driller'"));
check('selectable is 107 (107 ids, none disabled, driller not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = [];
  return all.length === 107 && all.filter(id => !disabled.includes(id)).length === 107;
})());
check('rarity Epic (170 souls)', game.includes("driller: 'Epic',") && game.includes('Epic: 170'));
check('role Damage Dealer', game.includes("driller:'Damage Dealer',"));
check('portrait icon present', game.includes("driller: '⛏️',"));
check('stats branch 5200/720/270 (CHANGES ROUND 3: +80%)', game.includes("if (brawlerId === 'driller') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(720 * scale), speed: 270'));
check('reload 1600ms', game.includes('driller: 1600,'));
check('fire delay 300ms', game.includes('driller: 300,'));
check('super charge 7 hits', game.includes('driller: 7'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'driller': {") && game.includes("name: 'Driller'") && game.includes("attack: 'Dirt Bomb'") && game.includes("super: 'Drill Form'") && game.includes("g1: 'Mud Trap") && game.includes("g2: 'Wallbreaker Drill") && game.includes("sp1: 'Spin Cycle") && game.includes("sp2: 'Jump Start") && !game.slice(game.indexOf("'driller': {"), game.indexOf("'driller': {") + 2600).includes('coming soon'));
check('card text matches the kit (cone spin-outs, driving drill form, weaken + hyper cone shots)', game.includes('Driller hurls a dirt bomb that spins dirt clods out in a cone as it travels') && game.includes('Driller hops into his drill machine for 8 seconds and drives around') && game.includes('Weakening Dirt: Hyper dirt bombs and their spin clods make enemies deal up to 90% less damage for 0.7 seconds') && game.includes('fires 3 drill bits in a forward cone every 0.5 seconds while driving'));
check('gadget cooldown map entry', game.includes('driller: { g1: 14000, g2: 16000 },'));
check('fire branch exists', game.includes("} else if (brawler === 'driller') {") && game.includes('fireDrillerMain(fromEntity, targetX, targetY, isBot);'));
check('drill-form intercept exists in fire() (Bookworm pattern, fused skips form) — attack does nothing in form', game.includes("if (brawler === 'driller' && !fromEntity.fusedPartCall && isDrillerFormActive(fromEntity)) {\n        return;\n    }") && !game.includes('function drillerDoDrillAttack('));
check('castDrillerSuper validates the entity (dead or missing entity refuses)', game.includes('function castDrillerSuper(entity, hyper, targetX, targetY) {') && game.includes('if (!entity || entity.hp <= 0) return false;'));
check('player speed hook: +35% while driving in form', game.includes("if (selectedBrawler === 'driller' && isDrillerFormActive(player)) activeSpeed *= DRILLER_FORM_SPEED_MULT;"));
check('bot speed hook: +35% while driving in form', game.includes("if (t.brawler === 'driller' && isDrillerFormActive(t)) activeBotSpeed *= DRILLER_FORM_SPEED_MULT;"));
check('updateDrillerSystems refreshes invulnerability while in form', game.includes('e.invulnerableUntil = Math.max(e.invulnerableUntil || 0, now + 120);'));
check('updateDrillerSystems drives the contact/wall/dust/hyper systems', game.includes('drillerContactHits(e, now);') && game.includes('drillerBreakWalls(e);') && game.includes('drillerSpawnDust(e, now);') && game.includes('if (e.drillerFormHyper) drillerHyperConeShots(e, now);'));
check('render: contact ring telegraph is dashed with the real Hyper state (early slot)', game.includes("ctx.strokeStyle = hyper ? '#c084fc' : '#d97706';") && game.includes('ctx.setLineDash([8, 6]);'));
check('visual fix (CHANGES ROUND 3): the hidden early-slot machine is GONE — no 24x16 ellipse left in game.js', !game.includes('ctx.ellipse(0, 0, 24, 16'));
check('visual fix: machine overlay draws AFTER the portrait (player + bots)', game.indexOf("if (isDrillerFormActive(player)) drawDrillerFormMachine(ctx, player, drawY);") > game.indexOf("drawBrawlerPortrait(player, drawY, true, '#9ef6d6', false);") && game.indexOf("if (isDrillerFormActive(t)) drawDrillerFormMachine(ctx, t, drawY);") > game.indexOf("drawBrawlerPortrait(t, drawY, false, botColor, !!t.isBoss);"));
check('visual fix: machine overlay geometry is wider than the portrait (half-W 30, bit at +36)', game.includes('const DRILLER_MACHINE_HALF_W = 30;') && game.includes('const DRILLER_MACHINE_HALF_H = 22;') && game.includes('const DRILLER_MACHINE_BIT_X = 36;'));
check('player super dispatch', game.includes("if (combatBrawler === 'driller') { castDrillerSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'driller') { castDrillerSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, G2 aims via gadgetWorld)', game.includes("curBrawler === 'driller' && curGadget === 'g1'") && game.includes("curBrawler === 'driller' && curGadget === 'g2'") && game.includes("executeDrillerGadget(player, 'g2', false, gadgetWorld.x, gadgetWorld.y);"));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'driller' && g === 'g1'") && game.includes("bot.brawler === 'driller' && g === 'g2'"));
check('bot super range gate: pop Drill Form when close (range + 60)', game.includes("if (bot.brawler === 'driller') return distance < DRILLER_DRILL_RANGE + 60;"));
check('checkHit hook: Hyper bomb/clod weakens + Mud-Trap bomb/clod slows (brawlers only)', game.includes("if (b && b.ownerBrawler === 'driller' && (b.isDrillerBomb || b.isDrillerClod) && target && target.hp > 0) {") && game.includes('if (b.hyperVisual) drillerApplyWeaken(drillerOwner, target);') && game.includes('if (b.drillerMudTrap) drillerApplyMudSlow(drillerOwner, target);') && game.includes('if (drillerOwner && !target.isStructure && !target.isPet && !areAlliedEntities(drillerOwner, target)) {'));
check('bullet update hook: bomb sheds clods as it flies', game.includes('if (b.isDrillerBomb) drillerShedClods(b, dt);'));
check('changes round 3: contact radius x1.6875 + burst constants (5 clods, Hyper 7, fan -0.4..0.4 / -0.5..0.5)', game.includes('const DRILLER_CONTACT_RADIUS_MULT = 1.6875;') && game.includes('const DRILLER_BURST_CLOD_COUNT = 5;') && game.includes('const DRILLER_BURST_CLOD_COUNT_HYPER = 7;') && game.includes('const DRILLER_BURST_CLOD_OFFSETS = [-0.4, -0.2, 0, 0.2, 0.4];') && game.includes('const DRILLER_BURST_CLOD_OFFSETS_HYPER = [-0.5, -0.33, -0.17, 0, 0.17, 0.33, 0.5];'));
check('contact radius uses the +25% multiplier', game.includes('const contactR = ((entity.radius || 14) + DRILLER_CONTACT_MARGIN) * DRILLER_CONTACT_RADIUS_MULT;'));
check('render: contact ring radius matches the +25% contact radius', game.includes("ctx.arc(e.x, e.y, ((e.radius || 14) + DRILLER_CONTACT_MARGIN) * DRILLER_CONTACT_RADIUS_MULT + 14, 0, Math.PI * 2);"));
check('burst hooks: checkHit (enemy) + wall hit + max-range expiry (Rocketeer pattern)', game.includes("if (b.isDrillerBomb) drillerBombBurst(b);") && game.includes("if (hitCube && b.isDrillerBomb) {") && game.includes("if (b.isDrillerBomb) {\n                drillerBombBurst(b);"));
check('burst render branch keys the fan flash off the real Hyper state (purple when Hyper)', (() => {
  const start = game.indexOf("if (ex.fxKind === 'drillerBurst') {");
  const end = game.indexOf("if (ex.fxKind === 'rankedRocketeerBurst') {", start);
  const branch = game.slice(start, end);
  return start !== -1 && branch.includes("ctx.strokeStyle = ex.hyper ? '#c084fc' : '#d97706';") && branch.includes('for (const off of [-0.4, -0.2, 0, 0.2, 0.4]) {') && branch.includes('continue;');
})());
check('update loop calls updateDrillerSystems', game.includes('if (playing && !gameOver) updateDrillerSystems(dt);'));
check('render calls renderDrillerEffects', game.includes('    renderDrillerEffects();'));
check('bullet draw branches sit BEFORE the universal skin call (no interception)', game.indexOf('drawDrillerBomb(ctx, b);') > 0 && game.indexOf('drawDrillerBomb(ctx, b);') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') && game.indexOf('drawDrillerClod(ctx, b);') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') && game.indexOf('drawDrillerBit(ctx, b);') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') && game.indexOf('drawDrillerWallbreaker(ctx, b);') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('portrait body-art branch (hard hat + overalls + drill bit)', game.includes("if (brawlerId === 'driller') {") && game.includes("ctx.fillStyle = '#facc15';") && game.includes("ctx.fillStyle = '#78350f';"));
check('constants: bomb 700/700/720, clod 113/520/220, shed 110px / SP1 65px / Hyper 50px, max 6 / SP1 10 / Hyper 9 (CHANGES ROUND 3: +80%/+50%)', game.includes('const DRILLER_BOMB_SPEED = 700;') && game.includes('const DRILLER_BOMB_RANGE = 700;') && game.includes('const DRILLER_CLOD_DMG = 113;') && game.includes('const DRILLER_CLOD_SPEED = 520;') && game.includes('const DRILLER_CLOD_RANGE = 220;') && game.includes('const DRILLER_SHED_EVERY_PX = 110;') && game.includes('const DRILLER_SHED_EVERY_PX_SP1 = 65;') && game.includes('const DRILLER_SHED_EVERY_PX_HYPER = 50;') && game.includes('const DRILLER_CLOD_MAX = 6;') && game.includes('const DRILLER_CLOD_MAX_SP1 = 10;') && game.includes('const DRILLER_CLOD_MAX_HYPER = 9;'));
check('constants: form 8s / drill range 260 / hyper cone 527 / contact gate 250ms / speed 1.35 / cone interval 500ms / wall margin 6 / dust 120ms / ramp reset 1.5s (CHANGES ROUND 3: cone 390->527)', game.includes('const DRILLER_SUPER_FORM_DURATION_MS = 8000;') && game.includes('const DRILLER_DRILL_RANGE = 260;') && game.includes('const DRILLER_HYPER_CONE_RANGE = 527;') && game.includes('const DRILLER_CONTACT_GATE_MS = 250;') && game.includes('const DRILLER_FORM_SPEED_MULT = 1.35;') && game.includes('const DRILLER_HYPER_CONE_INTERVAL_MS = 500;') && game.includes('const DRILLER_WALL_BREAK_MARGIN = 6;') && game.includes('const DRILLER_DUST_INTERVAL_MS = 120;') && game.includes('const DRILLER_RAMP_RESET_MS = 1500;'));
check('old forward-arc drill constants are gone (no DRILLER_DRILL_INTERVAL_MS / DRILLER_RAMP_ARC / DRILLER_DRILL_RANGE_HYPER)', !game.includes('DRILLER_DRILL_INTERVAL_MS') && !game.includes('DRILLER_RAMP_ARC') && !game.includes('DRILLER_DRILL_RANGE_HYPER'));
check('constants: ramp 50>100>150>250>500>1000 (Anthony x10, then -50% in CHANGES ROUND 2 — FLAGGED)', game.includes('const DRILLER_RAMP = [50, 100, 150, 250, 500, 1000];'));
check('constants: weaken 30%/hit, max 3 stacks (90%), 0.7s; G1 slow 0.60/2s; G2 1200/900/700; SP2 heal 3400', game.includes('const DRILLER_HYPER_WEAKEN_PER_HIT = 0.30;') && game.includes('const DRILLER_HYPER_WEAKEN_MAX_STACKS = 3;') && game.includes('const DRILLER_HYPER_WEAKEN_DURATION_MS = 700;') && game.includes('const DRILLER_G1_SLOW_MULT = 0.60;') && game.includes('const DRILLER_G1_SLOW_DURATION_MS = 2000;') && game.includes('const DRILLER_G2_DMG = 1200;') && game.includes('const DRILLER_G2_SPEED = 900;') && game.includes('const DRILLER_G2_RANGE = 700;') && game.includes('const DRILLER_SP2_HEAL = 3400;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)', game.includes("function drillerHasSP1(entity) { return drillerStarChoice(entity) === 'slow'; }") && game.includes("function drillerHasSP2(entity) { return drillerStarChoice(entity) === 'long'; }"));
check('Hyper weaken hook in getOutgoingDamageMultiplier (30%/stack, floored at 10%)', game.includes("if ((entity.drillerWeakenUntil || 0) > now) mult *= Math.max(0.10, 1 - DRILLER_HYPER_WEAKEN_PER_HIT * (entity.drillerWeakenStacks || 1));"));
check('G1 slow hook in getEntitySlowMultiplier (0.60)', game.includes("if (now < (entity.drillerSlowUntil || 0)) baseSlow = Math.min(baseSlow, DRILLER_G1_SLOW_MULT);"));
check('G2 wall-breaker uses Fuser/Runner flags (pierce + pierceWalls + breakWallsInstantly)', game.includes("pierce: true, pierceWalls: true, breakWallsInstantly: true, hitIds: {}, hitboxMod: 1.6, hyperVisual: !!entity.drillerFormHyper });") && game.includes("const wallDamage = b.breakWallsInstantly && dw.isArenaWall"));
check('swipe explosion render branch keys off the real hyper flag (purple ring when Hyper)', (() => {
  const start = game.indexOf("if (ex.fxKind === 'drillerSwipe') {");
  const end = game.indexOf("if (ex.fxKind === 'rankedRocketeerBurst') {", start);
  const branch = game.slice(start, end);
  return start !== -1 && branch.includes("ctx.strokeStyle = ex.hyper ? '#c084fc' : (ex.color || '#d97706');") && branch.includes('continue;');
})());
check('swipe explosion carries the real Hyper state at swipe time (never faked)', game.includes("fxKind: 'drillerSwipe', hyper: hyper, rampIndex: rampIndex });"));
check('no global Driller arrays (state lives on entities — no reset-site edits needed)', !game.includes('drillerPatches') && !game.includes('drillerSlipZones') && !game.includes('drillerShatters') && !game.includes('let drillerPending') && !game.match(/let driller\w+ = \[\];/));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/driller-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweDrillerVoice?.play('attack')") && game.includes("BraweDrillerVoice?.play('kill')") && game.includes("BraweDrillerVoice?.play('super')") && game.includes('updateDrillerVoiceState();'));
check('voice lines: exactly 12, flavor-only (RULE ONE — no mechanics words)', (() => {
  const block = voiceModule.slice(voiceModule.indexOf('const LINES = {'), voiceModule.indexOf('};', voiceModule.indexOf('const LINES = {')));
  const withoutKeys = block.replace(/^\s*'[a-z]+':\s*\[/gm, '');
  const spoken = [...withoutKeys.matchAll(/"([^"]+)"|'([^']+)'/g)].map(m => m[1] ?? m[2]);
  const forbidden = ['damage', 'range', 'root', 'stack', 'pierce', 'redirect', 'cooldown', 'charge', 'radius', 'homing', 'mirror', 'slam', 'tiles', 'seconds', 'hit', 'enemies', 'second', 'slide', 'slip'];
  const bad = spoken.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
  return spoken.length === 12 && bad.length === 0;
})());
check('weaken/slow never touch structures (both apply fns skip isStructure/isPet + allies)', (() => {
  const start = game.indexOf('// ===== Driller systems');
  const end = game.indexOf('// ===== Christmas Showdown buffs');
  const body = game.slice(start, end);
  return (body.match(/if \(target\.isStructure \|\| target\.isPet\) return;/g) || []).length >= 2 && body.includes('if (areAlliedEntities(owner, target)) return;');
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
const voicePlays = [];
const entitiesById = new Map();
let bullets = [];
let explosions = [];
let destructibleWalls = [];
let powerups = [];
let navDirtyCalls = [];
let fullOnDamageCalls = [];
let powerBoxRewards = [];
let questProgress = [];
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
  destructibleWalls = [];
  powerups = [];
  navDirtyCalls = [];
  fullOnDamageCalls = [];
  powerBoxRewards = [];
  questProgress = [];
  floatingTexts.length = 0;
  checkHitCalls.length = 0;
  voicePlays.length = 0;
  nowMs = 100000;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'driller', x: 0, y: 0, hp: 5200, maxHp: 5200 });
  botEnts = [];
  sandbox.player = playerEnt;
  sandbox.bots = botEnts;
  sandbox.bullets = bullets;
  sandbox.explosions = explosions;
  sandbox.destructibleWalls = destructibleWalls;
  sandbox.powerups = powerups;
  sandbox.isHypercharged = false;
  sandbox.selectedBrawler = 'driller';
  sandbox.playing = false;
  sandbox.gameOver = false;
  sandbox.drillerVoicePrevPlaying = false;
  sandbox.drillerVoicePrevGameOver = false;
  sandbox.drillerVoiceMatchEndPlayed = false;
  sandbox.drillerVoiceLastHp = null;
  sandbox.drillerVoiceLastActionAt = 0;
  sandbox.drillerVoiceLastIdleAt = 0;
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
const weakenMult = (stacks) => Math.max(0.10, 1 - 0.30 * stacks);

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
  getScaledStats: (id, lvl) => id === 'driller' ? { hp: 5200, dmg: 720, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: (x, y, text, color) => { floatingTexts.push({ x, y, text, color }); },
  checkHit: (target, synth) => {
    checkHitCalls.push({ targetId: target.id, damage: synth.damage, ownerBrawler: synth.ownerBrawler });
    if (target && target.hp > 0) target.hp = Math.max(0, target.hp - (synth.damage || 0));
    return true;
  },
  pointInWall: () => false,
  destructibleWalls: [],
  powerups: [],
  // Driving-mode stubs (faithful to the real helpers' contracts).
  isFusedEntity: (e) => !!e && Array.isArray(e.fusedParts) && e.fusedParts.length === 2,
  rectCircleCollides: (x, y, w, h, cx, cy, r) => {
    const nx = Math.max(x, Math.min(cx, x + w));
    const ny = Math.max(y, Math.min(cy, y + h));
    return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
  },
  isNavigationWall: (w) => !!w && !w.isPlatform && !w.isProp,
  markBotNavGridDirty: (w) => { navDirtyCalls.push(w); },
  recordFullOnDamageToTarget: (target, dmg) => { fullOnDamageCalls.push({ target, damage: dmg }); },
  spawnShowdownPowerBoxReward: (w) => { powerBoxRewards.push(w); },
  addEventQuestProgress: (k) => { questProgress.push(k); },
  progressSeasonPassQuest: (k) => { questProgress.push(k); },
  revealPropHuntHiderFromShell: () => {},
  applyPropHuntWrongGuessTax: () => {},
  isPropHuntMode: false,
  isWarperEvent: false,
  PROPS_V1_ENABLED: false,
  WORLD_W: 2000,
  WORLD_H: 2000,
  player: null,
  bots: [],
  bullets: [],
  explosions: [],
  isHypercharged: false,
  selectedBrawler: 'driller',
  playing: false,
  gameOver: false,
  drillerVoicePrevPlaying: false,
  drillerVoicePrevGameOver: false,
  drillerVoiceMatchEndPlayed: false,
  drillerVoiceLastHp: null,
  drillerVoiceLastActionAt: 0,
  drillerVoiceLastIdleAt: 0,
  window: { BraweDrillerVoice: { play: (kind) => { voicePlays.push(kind); } } },
  ctx: null,
};
// Pull every DRILLER_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (DRILLER_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  sandbox[m[1]] = Number(m[2]);
}
sandbox.DRILLER_RAMP = JSON.parse(game.match(/const DRILLER_RAMP = (\[[^\]]+\]);/)[1]);
sandbox.DRILLER_CLOD_OFFSETS = JSON.parse(game.match(/const DRILLER_CLOD_OFFSETS = (\[[^\]]+\]);/)[1]);
sandbox.DRILLER_BURST_CLOD_OFFSETS = JSON.parse(game.match(/const DRILLER_BURST_CLOD_OFFSETS = (\[[^\]]+\]);/)[1]);
sandbox.DRILLER_BURST_CLOD_OFFSETS_HYPER = JSON.parse(game.match(/const DRILLER_BURST_CLOD_OFFSETS_HYPER = (\[[^\]]+\]);/)[1]);
vm.createContext(sandbox);
vm.runInContext(
  [
    'drillerLevelScale', 'drillerStarChoice', 'drillerHasSP1', 'drillerHasSP2', 'isDrillerFormActive',
    'fireDrillerMain', 'drillerShedClods', 'drillerBombBurst', 'drillerApplyWeaken', 'drillerApplyMudSlow',
    'castDrillerSuper', 'drillerRampDamage', 'drillerCurrentRampDamage',
    'drillerContactHits', 'drillerBreakWall', 'drillerBreakWalls',
    'drillerHyperConeShots', 'drillerSpawnDust',
    'executeDrillerGadget', 'updateDrillerSystems',
    'renderDrillerEffects', 'drawDrillerFormMachine', 'drawDrillerBomb', 'drawDrillerClod', 'drawDrillerBit', 'drawDrillerWallbreaker',
    'updateDrillerVoiceState',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: SP gates + level scale + form-active helper ---
try {
  resetWorld();
  check('SP1 gate: stored slow is true', sandbox.drillerHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.drillerHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.drillerHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.drillerHasSP2({ selectedStar: 'slow' }) === false);
  check('level scale: P11 = 1.0', near(sandbox.drillerLevelScale({ level: 11 }), 1.0));
  check('level scale: L1 = 0.55', near(sandbox.drillerLevelScale({ level: 1 }), 0.55));
  check('level scale: L6 = 0.775', near(sandbox.drillerLevelScale({ level: 6 }), 0.775));
  const formEnt = mkEntity('f1', { team: 'player', brawler: 'driller' });
  formEnt.drillerFormActive = true; formEnt.drillerFormUntil = nowMs + 8000;
  check('form active: flag + future until is true', sandbox.isDrillerFormActive(formEnt) === true);
  formEnt.drillerFormUntil = nowMs - 1;
  check('form active: expired until is false', sandbox.isDrillerFormActive(formEnt) === false);
  formEnt.drillerFormActive = false; formEnt.drillerFormUntil = nowMs + 8000;
  check('form active: flag off is false', sandbox.isDrillerFormActive(formEnt) === false);
} catch (e) { failures.push('SP gates/level scale/form-active threw: ' + e.message); }

// --- executed: main attack (dirt bomb 700/700/800) + Mud Trap arming + SP1 shedMax ---
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.fireDrillerMain(owner, 1000, 0, false);
  check('main: one dirt bomb in flight', bullets.length === 1 && bullets[0].isDrillerBomb === true);
  const bomb = bullets[0];
  check('main: bomb flies 700 px/s straight at the aim', near(bomb.vx, 700) && near(bomb.vy, 0));
  check('main: bomb range 700px (maxLife 1.0s)', near(bomb.maxLife, 1.0));
  check('main: bomb deals its 720 direct-hit damage (CHANGES ROUND 3: +80%)', bomb.damage === 720);
  check('main: bomb is not Hyper (no hyperVisual)', bomb.hyperVisual === false);
  check('main: base shed max is 6 clods', bomb.drillerShedMax === 6);
  check('main: bomb is not Mud-Trapped by default', bomb.drillerMudTrap === false);
  // Hyper bomb.
  resetWorld();
  sandbox.isHypercharged = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  check('main (Hyper): bomb carries the real Hyper state', bullets[0].hyperVisual === true);
  check('main (Hyper): shed max is 9 clods (+3 extra shards)', bullets[0].drillerShedMax === 9);
  // Mud Trap arming is consumed on fire and rides the bomb.
  resetWorld();
  playerEnt.drillerMudTrapArmed = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  check('main (G1): armed bomb carries Mud Trap, flag consumed', bullets[0].drillerMudTrap === true && playerEnt.drillerMudTrapArmed === false);
  // SP1 raises the shed cap.
  resetWorld();
  playerEnt.selectedStar = 'slow';
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  check('main (SP1): shed max is 10 clods', bullets[0].drillerShedMax === 10);
  // SP1 + Hyper: 10 + 3 = 13.
  resetWorld();
  playerEnt.selectedStar = 'slow';
  sandbox.isHypercharged = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  check('main (SP1+Hyper): shed max is 13 clods', bullets[0].drillerShedMax === 13);
} catch (e) { failures.push('main attack threw: ' + e.message); }

// --- executed: shed (cone fans wider; SP1 fits all 10 in the flight) ---
try {
  resetWorld();
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const bomb = bullets[0];
  const clods = () => bullets.filter((b) => b.isDrillerClod);
  bomb.life = 0.2; // 140px traveled
  sandbox.drillerShedClods(bomb, 0.016);
  check('shed: 1 clod after 140px (first threshold 110px)', clods().length === 1);
  check('shed: first clod fans +0.18 rad off the bomb', near(Math.atan2(clods()[0].vy, clods()[0].vx), 0.18));
  check('shed: clod is 113 dmg / 520 px/s / 220px range (CHANGES ROUND 3: +50%)', clods()[0].damage === 113 && near(Math.hypot(clods()[0].vx, clods()[0].vy), 520) && near(clods()[0].maxLife, 220 / 520));
  check('shed: clod inherits Hyper + Mud Trap from the bomb', clods()[0].hyperVisual === false && clods()[0].drillerMudTrap === false);
  bomb.life = 0.35; // 245px traveled
  sandbox.drillerShedClods(bomb, 0.016);
  check('shed: 2 clods after 245px (second threshold 220px)', clods().length === 2);
  check('shed: second clod fans -0.18 rad (alternating sides)', near(Math.atan2(clods()[1].vy, clods()[1].vx), -0.18));
  bomb.life = 1.0; // 700px traveled — end of flight
  sandbox.drillerShedClods(bomb, 0.016);
  check('shed: 6 clods by end of flight (thresholds 110..660)', clods().length === 6);
  const offs = clods().map((c) => Math.abs(Math.atan2(c.vy, c.vx)));
  check('shed: cone fans wider as the bomb flies (0.18/0.18/0.38/0.38/0.55/0.55)', near(offs[0], 0.18) && near(offs[1], 0.18) && near(offs[2], 0.38) && near(offs[3], 0.38) && near(offs[4], 0.55) && near(offs[5], 0.55));
  check('shed: no 7th clod (770px threshold is past the 700px flight)', (() => { bomb.life = 1.0; sandbox.drillerShedClods(bomb, 0.016); return clods().length === 6; })());
  // SP1: all 10 shed inside the flight (65px spacing: 10th at 650px).
  resetWorld();
  playerEnt.selectedStar = 'slow';
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const sp1Bomb = bullets[0];
  sp1Bomb.life = 1.0;
  sandbox.drillerShedClods(sp1Bomb, 0.016);
  const sp1Clods = bullets.filter((b) => b.isDrillerClod);
  check('shed (SP1): all 10 clods shed by end of flight', sp1Clods.length === 10);
  const sp1Offs = sp1Clods.map((c) => Math.abs(Math.atan2(c.vy, c.vx)));
  check('shed (SP1): widest clods reach 0.85 rad', near(sp1Offs[8], 0.85) && near(sp1Offs[9], 0.85));
  // SP1+Hyper: all 13 shed inside the flight (50px spacing: 13th at 650px).
  resetWorld();
  playerEnt.selectedStar = 'slow';
  sandbox.isHypercharged = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const sp1HyperBomb = bullets[0];
  sp1HyperBomb.life = 1.0;
  sandbox.drillerShedClods(sp1HyperBomb, 0.016);
  const sp1HyperClods = bullets.filter((b) => b.isDrillerClod);
  check('shed (SP1+Hyper): all 13 clods shed by end of flight', sp1HyperClods.length === 13);
  const sp1HyperOffs = sp1HyperClods.map((c) => Math.abs(Math.atan2(c.vy, c.vx)));
  check('shed (SP1+Hyper): widest clods reach 1.15 rad', near(sp1HyperOffs[12], 1.15));
} catch (e) { failures.push('shed threw: ' + e.message); }

// --- executed: impact burst (real Firecracker — changes round 2) ---
// The dirt bomb bursts into a fan of 5 piercing dirt clods on hitting an
// enemy/wall or reaching max range. The vm harness can't run the bullet
// loop, so the three hooks are pinned in source (section 1) and the burst
// itself is executed directly here.
try {
  resetWorld();
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const bomb = bullets[0];
  const burstClods = () => bullets.filter((b) => b.isDrillerBurstClod);
  sandbox.drillerBombBurst(bomb);
  check('burst: 5 burst clods in a fan', burstClods().length === 5);
  check('burst: fan spreads -0.4/-0.2/0/+0.2/+0.4 rad off the flight angle', burstClods().every((c, i) => near(Math.atan2(c.vy, c.vx), [-0.4, -0.2, 0, 0.2, 0.4][i])));
  check('burst: clods are 113 dmg / 520 px/s / 220px range (like shed clods)', burstClods().every((c) => c.damage === 113 && near(Math.hypot(c.vx, c.vy), 520) && near(c.maxLife, 220 / 520)));
  check('burst: clods pierce through enemies but stop at walls', burstClods().every((c) => c.pierce === true && c.pierceWalls === false));
  check('burst: clods inherit the bomb Hyper state + Mud Trap', burstClods().every((c) => c.hyperVisual === false && c.drillerMudTrap === false));
  check('burst: fan-flash explosion carries the real Hyper state (not Hyper)', (() => { const ex = explosions.find((e) => e.fxKind === 'drillerBurst'); return ex && ex.hyper === false && ex.angle === 0; })());
  // A second burst call fires nothing (guard — one burst per bomb).
  sandbox.drillerBombBurst(bomb);
  check('burst: a second burst call fires nothing (guard)', burstClods().length === 5 && explosions.filter((e) => e.fxKind === 'drillerBurst').length === 1);
  // Burst clods can't re-hit the enemy the bomb just struck (hitIds inherited).
  resetWorld();
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const bomb2 = bullets[0];
  bomb2.hitIds = { e1: true };
  sandbox.drillerBombBurst(bomb2);
  check('burst: burst clods inherit the bomb hitIds (no re-hit on the struck enemy)', bullets.filter((b) => b.isDrillerBurstClod).every((c) => c.hitIds.e1 === true));
  // Hyper bomb: burst clods + flash carry the real Hyper state.
  resetWorld();
  sandbox.isHypercharged = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const hyperBomb = bullets[0];
  sandbox.drillerBombBurst(hyperBomb);
  check('burst (Hyper): clods + flash carry the real Hyper state', bullets.filter((b) => b.isDrillerBurstClod).every((c) => c.hyperVisual === true) && explosions.find((e) => e.fxKind === 'drillerBurst').hyper === true);
  check('burst (Hyper): 7 burst clods in a wider fan (CHANGES ROUND 3: more shards)', bullets.filter((b) => b.isDrillerBurstClod).length === 7 && bullets.filter((b) => b.isDrillerBurstClod).every((c, i) => near(Math.atan2(c.vy, c.vx), [-0.5, -0.33, -0.17, 0, 0.17, 0.33, 0.5][i])));
  // G1-armed bomb: burst clods carry Mud Trap.
  resetWorld();
  playerEnt.drillerMudTrapArmed = true;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  sandbox.drillerBombBurst(bullets[0]);
  check('burst (G1): burst clods carry Mud Trap', bullets.filter((b) => b.isDrillerBurstClod).every((c) => c.drillerMudTrap === true));
} catch (e) { failures.push('impact burst threw: ' + e.message); }

// --- executed: Hyper weaken (30%/hit, cap 90%, 0.7s, brawlers only) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.drillerApplyWeaken(owner, enemy);
  check('weaken: 1 hit = 1 stack, 0.7s window', enemy.drillerWeakenStacks === 1 && enemy.drillerWeakenUntil === nowMs + 700);
  check('weaken: 1 stack = 30% less damage (mult 0.70)', near(weakenMult(enemy.drillerWeakenStacks), 0.70));
  sandbox.drillerApplyWeaken(owner, enemy);
  sandbox.drillerApplyWeaken(owner, enemy);
  check('weaken: 3 hits = 3 stacks = 90% less damage (mult 0.10)', enemy.drillerWeakenStacks === 3 && near(weakenMult(enemy.drillerWeakenStacks), 0.10));
  nowMs += 100;
  sandbox.drillerApplyWeaken(owner, enemy);
  check('weaken: 4th hit caps at 3 stacks and refreshes the window', enemy.drillerWeakenStacks === 3 && enemy.drillerWeakenUntil === nowMs + 700);
  nowMs += 800; // past the 0.7s window
  sandbox.drillerApplyWeaken(owner, enemy);
  check('weaken: expired stacks reset to 1 on the next hit', enemy.drillerWeakenStacks === 1 && enemy.drillerWeakenUntil === nowMs + 700);
  const structure = mkBot('s1', { x: 300, y: 0, isStructure: true });
  sandbox.drillerApplyWeaken(owner, structure);
  check('weaken: structures are never weakened', structure.drillerWeakenStacks === undefined);
  const pet = mkBot('p1', { x: 300, y: 0, isPet: true });
  sandbox.drillerApplyWeaken(owner, pet);
  check('weaken: pets are never weakened', pet.drillerWeakenStacks === undefined);
  const ally = mkAlly('a1', { x: 300, y: 0 });
  sandbox.drillerApplyWeaken(owner, ally);
  check('weaken: allies are never weakened', ally.drillerWeakenStacks === undefined);
} catch (e) { failures.push('weaken threw: ' + e.message); }

// --- executed: G1 Mud Trap slow (40%, 2s, brawlers only) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.drillerApplyMudSlow(owner, enemy);
  check('mud slow: slow window is now + 2000ms', enemy.drillerSlowUntil === nowMs + 2000);
  const structure = mkBot('s1', { x: 300, y: 0, isStructure: true });
  sandbox.drillerApplyMudSlow(owner, structure);
  check('mud slow: structures are never slowed', structure.drillerSlowUntil === undefined);
  const pet = mkBot('p1', { x: 300, y: 0, isPet: true });
  sandbox.drillerApplyMudSlow(owner, pet);
  check('mud slow: pets are never slowed', pet.drillerSlowUntil === undefined);
  const ally = mkAlly('a1', { x: 300, y: 0 });
  sandbox.drillerApplyMudSlow(owner, ally);
  check('mud slow: allies are never slowed', ally.drillerSlowUntil === undefined);
} catch (e) { failures.push('mud slow threw: ' + e.message); }

// --- executed: Super Drill Form driving + damage ramp (100>200>300>500>1000>2000) ---
// Driving mode (changes round 1): contact damage runs through
// updateDrillerSystems — the attack button does nothing in form.
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 20, y: 0 }); // in contact (edge gap 6px <= 20px)
  check('super: form starts inactive', sandbox.isDrillerFormActive(owner) === false);
  sandbox.castDrillerSuper(owner, false, 200, 0);
  check('super: form active for 8s, not Hyper', sandbox.isDrillerFormActive(owner) === true && owner.drillerFormHyper === false && owner.drillerFormUntil === nowMs + 8000);
  const expected = [50, 100, 150, 250, 500, 1000, 1000];
  for (let i = 0; i < expected.length; i++) {
    nowMs += 300; // past the 250ms per-enemy contact gate
    const before = checkHitCalls.length;
    sandbox.updateDrillerSystems(0.016);
    check(`ramp: contact hit ${i + 1} on the same enemy deals ${expected[i]}`, checkHitCalls.length === before + 1 && checkHitCalls[checkHitCalls.length - 1].damage === expected[i]);
  }
  check('ramp: enemy took 50+100+150+250+500+1000+1000 = 3050 (CHANGES ROUND 2: -50%)', enemy.hp === 5000 - 3050);
  check('ramp: every contact hit pushes a drillerSwipe burst at the victim', explosions.filter((e) => e.fxKind === 'drillerSwipe').length === 7);
  check('ramp: contact burst color escalates with the ramp (brown -> purple)', explosions.filter((e) => e.fxKind === 'drillerSwipe')[0].color === '#d97706' && explosions.filter((e) => e.fxKind === 'drillerSwipe')[6].color === '#a855f7');
  // Different target resets the ramp.
  resetWorld();
  const owner2 = playerEnt;
  const e1 = mkBot('e1', { x: 20, y: 0 });
  const e2 = mkBot('e2', { x: 5000, y: 0 });
  sandbox.castDrillerSuper(owner2, false, 200, 0);
  nowMs += 300; sandbox.updateDrillerSystems(0.016);
  nowMs += 300; sandbox.updateDrillerSystems(0.016);
  check('ramp: two contact hits on e1 climb to 100', checkHitCalls[1].damage === 100);
  e1.x = 5000; e2.x = 20; // swap: e2 is now the one in contact
  nowMs += 300; sandbox.updateDrillerSystems(0.016);
  check('ramp: first contact hit on a different enemy resets to 50', checkHitCalls[2].damage === 50 && checkHitCalls[2].targetId === 'e2');
  // 1.5s without hitting that enemy resets the ramp.
  nowMs += 1600;
  sandbox.updateDrillerSystems(0.016);
  check('ramp: 1.5s gap resets to 50', checkHitCalls[3].damage === 50);
  // No enemy in contact — no damage, ramp unchanged.
  const rampBefore = owner2.drillerRampIndex;
  e2.x = 5000;
  nowMs += 300;
  const callsBefore = checkHitCalls.length;
  sandbox.updateDrillerSystems(0.016);
  check('ramp: driving with nobody in contact deals no damage and keeps the ramp', checkHitCalls.length === callsBefore && owner2.drillerRampIndex === rampBefore);
  // Range: contact reach is ~47px center-to-center ((14 + 6) * 1.6875 + 14).
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 300, 0);
  const far = mkBot('e1', { x: 300, y: 0 });
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  check('drill: enemy at 300px is out of contact range', checkHitCalls.length === 0);
  // Contact boundary at +35% compounding (x1.6875): (14 + 6) * 1.6875 =
  // 33.75px edge gap — an enemy 47px away (edge gap 33) is in contact;
  // 48px away (edge gap 34) is not.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 300, 0);
  mkBot('e1', { x: 47, y: 0 });
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  check('drill: enemy at 47px center-to-center is in contact (+35% compounding)', checkHitCalls.length === 1);
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 300, 0);
  mkBot('e1', { x: 48, y: 0 });
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  check('drill: enemy at 48px center-to-center is out of contact', checkHitCalls.length === 0);
  // Contact is omnidirectional (no forward arc anymore) — an enemy
  // behind the driver still gets hit.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  mkBot('e1', { x: -20, y: 0 });
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  check('drill: enemy behind the driver still takes contact damage', checkHitCalls.length === 1 && checkHitCalls[0].damage === 50);
  // 250ms gate: a second frame inside the window does nothing.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  mkBot('e1', { x: 20, y: 0 });
  nowMs += 300; sandbox.updateDrillerSystems(0.016);
  sandbox.updateDrillerSystems(0.016);
  check('drill: second frame inside 250ms is gated', checkHitCalls.length === 1);
  // Contact skips structures, pets, and allies (brawlers only).
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  mkBot('s1', { x: 20, y: 0, isStructure: true });
  mkBot('p1', { x: 20, y: 0, isPet: true });
  mkAlly('a1', { x: 20, y: 0 });
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  check('drill: contact never hits structures, pets, or allies', checkHitCalls.length === 0);
  // Invulnerable while in the drill machine (Moe-style — FLAGGED).
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.updateDrillerSystems(0.016);
  check('drill: invulnerability refreshes while in form', playerEnt.invulnerableUntil === nowMs + 120);
  nowMs += 8100;
  sandbox.updateDrillerSystems(0.016);
  check('drill: invulnerability is NOT refreshed once the form ends', playerEnt.invulnerableUntil < nowMs);
  // Form expiry.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  nowMs += 8100;
  check('super: form expires after 8s', sandbox.isDrillerFormActive(playerEnt) === false);
  // SP2 Jump Start: heals 3400 on activation (capped at max HP).
  resetWorld();
  playerEnt.selectedStar = 'long';
  playerEnt.hp = 1000;
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  check('SP2: drill form heals 3400 on start', playerEnt.hp === 4400);
  resetWorld();
  playerEnt.selectedStar = 'long';
  playerEnt.hp = 4000;
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  check('SP2: heal caps at max HP', playerEnt.hp === 5200);
  resetWorld();
  playerEnt.selectedStar = 'none';
  playerEnt.hp = 1000;
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  check('no SP2: drill form does not heal', playerEnt.hp === 1000);
} catch (e) { failures.push('super/ramp threw: ' + e.message); }

// --- executed: Hyper Super cone shots while driving (3 bits, 0.5s, +20% range, 50% dmg) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 20, y: 0 }); // in contact — drives into them
  sandbox.castDrillerSuper(owner, true, 200, 0);
  check('hyper super: form is Hyper', owner.drillerFormHyper === true);
  sandbox.updateDrillerSystems(0.016); // t=0: contact hit 100 + first cone volley
  const bits = bullets.filter((b) => b.isDrillerBit);
  check('hyper cone: 3 drill bits fire on form start (first 0.5s tick)', bits.length === 3);
  check('hyper cone: each bit deals 50% of the current ramp damage (50 -> 25)', bits.every((b) => b.damage === 25));
  check('hyper cone: bits fly 900 px/s in a forward cone (-0.3/0/+0.3 rad)', near(Math.atan2(bits[0].vy, bits[0].vx), -0.3) && near(Math.atan2(bits[1].vy, bits[1].vx), 0) && near(Math.atan2(bits[2].vy, bits[2].vx), 0.3) && bits.every((b) => near(Math.hypot(b.vx, b.vy), 900)));
  check('hyper cone: bits carry the real Hyper state', bits.every((b) => b.hyperVisual === true));
  check('hyper cone: bits reach the 527px Hyper range (CHANGES ROUND 3: +35%)', bits.every((b) => near(b.maxLife, 527 / 900)));
  check('hyper cone: contact hit used checkHit, bits are projectiles (no extra checkHit)', checkHitCalls.length === 1 && checkHitCalls[0].damage === 50);
  const swipe = explosions.find((e) => e.fxKind === 'drillerSwipe');
  check('hyper cone: contact burst carries the real Hyper state', swipe && swipe.hyper === true);
  // 400ms later: contact hits again (ramp 200) but the 0.5s cone interval hasn't fired.
  nowMs += 400;
  sandbox.updateDrillerSystems(0.016);
  check('hyper cone: no second volley inside the 0.5s interval', bullets.filter((b) => b.isDrillerBit).length === 3);
  check('hyper cone: contact ramp still climbs inside the interval (100)', checkHitCalls[1].damage === 100);
  // 700ms total: contact hit 300 + second volley at 50% of 300 = 150 each.
  nowMs += 300;
  sandbox.updateDrillerSystems(0.016);
  const bits2 = bullets.filter((b) => b.isDrillerBit).slice(3);
  check('hyper cone: second volley fires after 0.5s and scales with the ramp (150 -> 75)', bits2.length === 3 && bits2.every((b) => b.damage === 75));
  // Non-Hyper form: contact hits happen but no cone shots ever.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  mkBot('e1', { x: 20, y: 0 });
  sandbox.updateDrillerSystems(0.016);
  check('hyper cone: normal form fires no bits', bullets.filter((b) => b.isDrillerBit).length === 0 && checkHitCalls.length === 1);
} catch (e) { failures.push('hyper cone shots threw: ' + e.message); }

// --- executed: driving smashes walls (Moe) + dust trail ---
try {
  resetWorld();
  const owner = playerEnt;
  sandbox.castDrillerSuper(owner, false, 200, 0);
  sandbox.destructibleWalls = [{ x: 20, y: -10, w: 20, h: 20, hp: 100, isArenaWall: true }];
  sandbox.updateDrillerSystems(0.016);
  check('walls: driving into an arena wall destroys it', sandbox.destructibleWalls.length === 0);
  check('walls: WALL BREAK! text + wall-break explosion', floatingTexts.some((t) => t.text === 'WALL BREAK!') && explosions.some((e) => e.color === 'rgba(161,98,7,.58)'));
  check('walls: nav grid invalidated', navDirtyCalls.length === 1);
  check('walls: player wall-break counts toward quests', questProgress.filter((k) => k === 'destroy_walls').length === 2);
  // Vaults are never smashed by driving.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.destructibleWalls = [{ x: 20, y: -10, w: 20, h: 20, hp: 100, isVault: true, isArenaWall: true }];
  sandbox.updateDrillerSystems(0.016);
  check('walls: vaults are never smashed by driving', sandbox.destructibleWalls.length === 1);
  // Power boxes drop their reward when smashed.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.destructibleWalls = [{ x: 20, y: -10, w: 20, h: 20, hp: 100, isBox: true }];
  sandbox.updateDrillerSystems(0.016);
  check('walls: driving through a power box destroys it and drops its reward', sandbox.destructibleWalls.length === 0 && powerBoxRewards.length === 1);
  // Walls out of reach survive; walls don't break outside form.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.destructibleWalls = [{ x: 100, y: -10, w: 20, h: 20, hp: 100, isArenaWall: true }];
  sandbox.updateDrillerSystems(0.016);
  check('walls: a wall 100px away survives (reach is ~20px)', sandbox.destructibleWalls.length === 1);
  resetWorld();
  sandbox.destructibleWalls = [{ x: 20, y: -10, w: 20, h: 20, hp: 100, isArenaWall: true }];
  sandbox.updateDrillerSystems(0.016);
  check('walls: no form, no wall-break', sandbox.destructibleWalls.length === 1);
  // Dust trail: one puff per 120ms while driving.
  resetWorld();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.updateDrillerSystems(0.016);
  const dust = explosions.filter((e) => e.color === 'rgba(161,98,7,.45)');
  check('dust: one dust puff behind the drill machine', dust.length === 1 && dust[0].radius === 12);
  sandbox.updateDrillerSystems(0.016);
  check('dust: no second puff inside the 120ms interval', explosions.filter((e) => e.color === 'rgba(161,98,7,.45)').length === 1);
  nowMs += 130;
  sandbox.updateDrillerSystems(0.016);
  check('dust: second puff after 120ms', explosions.filter((e) => e.color === 'rgba(161,98,7,.45)').length === 2);
} catch (e) { failures.push('wall smash/dust threw: ' + e.message); }

// --- executed: gadgets (G1 Mud Trap arm, G2 Wallbreaker Drill) ---
try {
  resetWorld();
  const owner = playerEnt;
  check('G1: arming Mud Trap succeeds', sandbox.executeDrillerGadget(owner, 'g1', false) === true && owner.drillerMudTrapArmed === true);
  check('G2: outside drill form it does nothing (no drill fired)', sandbox.executeDrillerGadget(owner, 'g2', false, 500, 0) === false && bullets.filter((b) => b.isDrillerWallbreaker).length === 0);
  sandbox.castDrillerSuper(owner, false, 200, 0);
  check('G2: in drill form it fires the wallbreaker drill', sandbox.executeDrillerGadget(owner, 'g2', false, 500, 0) === true);
  const wb = bullets.find((b) => b.isDrillerWallbreaker);
  check('G2: wallbreaker is 1200 dmg / 900 px/s / 700px range', wb && wb.damage === 1200 && near(Math.hypot(wb.vx, wb.vy), 900) && near(wb.maxLife, 700 / 900));
  check('G2: wallbreaker aims at the target point', wb && near(wb.vx, 900) && near(wb.vy, 0));
  check('G2: wallbreaker breaks walls (Fuser flags)', wb && wb.pierce === true && wb.pierceWalls === true && wb.breakWallsInstantly === true);
  // Bot G2 aims at its target too.
  resetWorld();
  const bot = mkBot('b1', { team: 'enemy', brawler: 'driller', x: 0, y: 0 });
  sandbox.castDrillerSuper(bot, false, 200, 0);
  check('G2 (bot): fires with target coords', sandbox.executeDrillerGadget(bot, 'g2', true, 0, 500) === true && near(bullets.find((b) => b.isDrillerWallbreaker).vy, 900));
} catch (e) { failures.push('gadgets threw: ' + e.message); }

// --- executed: updateDrillerSystems (form expiry, ramp decay, weaken expiry, death) ---
try {
  resetWorld();
  const owner = playerEnt;
  const enemy = mkBot('e1', { x: 200, y: 0 });
  sandbox.castDrillerSuper(owner, false, 200, 0);
  owner.drillerRampTargetId = 'e1'; owner.drillerRampIndex = 3; owner.drillerRampLastHitAt = nowMs;
  enemy.drillerWeakenStacks = 2; enemy.drillerWeakenUntil = nowMs + 700;
  nowMs += 900;
  sandbox.updateDrillerSystems(0.016);
  check('systems: weaken expires after 0.7s (stacks cleared)', enemy.drillerWeakenStacks === 0 && enemy.drillerWeakenUntil === 0);
  check('systems: ramp survives a 0.9s gap (under 1.5s)', owner.drillerRampIndex === 3);
  check('systems: form survives 0.9s (8s form)', owner.drillerFormActive === true);
  check('systems: invulnerability refreshes while in form', owner.invulnerableUntil === nowMs + 120);
  nowMs += 800; // 1.7s since the last ramp hit
  sandbox.updateDrillerSystems(0.016);
  check('systems: ramp decays after 1.5s without a hit', owner.drillerRampIndex === 0 && owner.drillerRampTargetId === null);
  nowMs += 7000; // past the 8s form
  sandbox.updateDrillerSystems(0.016);
  check('systems: form clears when the 8s timer runs out', owner.drillerFormActive === false);
  check('systems: invulnerability is NOT refreshed once the form ends', owner.invulnerableUntil < nowMs);
  owner.drillerFormActive = true; owner.drillerFormUntil = nowMs + 8000; owner.drillerMudTrapArmed = true; owner.hp = 0;
  sandbox.updateDrillerSystems(0.016);
  check('systems: death clears the form and the armed Mud Trap', owner.drillerFormActive === false && owner.drillerMudTrapArmed === false);
} catch (e) { failures.push('updateDrillerSystems threw: ' + e.message); }

// --- executed: render (real-state telegraphs, weaken ring, form bar) + draw fns ---
try {
  resetWorld();
  const stub = stubCtx();
  sandbox.ctx = stub.proxy;
  sandbox.fireDrillerMain(playerEnt, 1000, 0, false);
  const enemy = mkBot('e1', { x: 200, y: 0 });
  enemy.drillerWeakenStacks = 2; enemy.drillerWeakenUntil = nowMs + 700;
  enemy.drillerSlowUntil = nowMs + 2000;
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.renderDrillerEffects();
  check('render: shed-cone telegraph draws at 0.18 alpha (real bomb state)', stub.sets.some((s) => s.p === 'globalAlpha' && s.v === 0.18));
  check('render: weakened enemy shows WEAK -60% (real stacks, never faked)', stub.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('WEAK -60%')));
  check('render: drill form draws the long ammo bar (fillRect)', stub.calls.some((c) => c.m === 'fillRect'));
  check('render: mud-slowed enemy draws a brown ring', stub.calls.some((c) => c.m === 'arc') && stub.sets.some((s) => s.p === 'strokeStyle' && s.v === '#92400e'));
  check('render: early slot no longer draws the machine (visual fix — it hid under the portrait)', !stub.calls.some((c) => c.m === 'ellipse'));
  check('render: contact ring is thicker now (lineWidth 4, alpha 0.85)', stub.sets.some((s) => s.p === 'lineWidth' && s.v === 4) && stub.sets.some((s) => s.p === 'globalAlpha' && s.v === 0.85));
  check('render: contact ring telegraph is dashed (real Hyper state)', stub.calls.some((c) => c.m === 'setLineDash') && stub.sets.some((s) => s.p === 'strokeStyle' && s.v === '#d97706'));
  const bomb = bullets.find((b) => b.isDrillerBomb);
  sandbox.drawDrillerBomb(stub.proxy, bomb);
  sandbox.drawDrillerClod(stub.proxy, { x: 10, y: 10, vx: 520, vy: 0, hyperVisual: false });
  sandbox.drawDrillerBit(stub.proxy, { x: 10, y: 10, vx: 900, vy: 0, hyperVisual: true });
  sandbox.drawDrillerWallbreaker(stub.proxy, { x: 10, y: 10, vx: 900, vy: 0, hyperVisual: false });
  // CHANGES ROUND 3 — visual fix: the machine overlay draws AFTER the
  // portrait, on top, with the REAL form state. This is the regression
  // test that would have caught the missing visual: the old code only
  // proved the early-slot ellipse calls happened, never that anything was
  // visible over the portrait.
  const overlay = stubCtx();
  sandbox.castDrillerSuper(playerEnt, false, 200, 0);
  sandbox.drawDrillerFormMachine(overlay.proxy, playerEnt, 0);
  check('visual fix: machine overlay draws the steel frame (ellipse 30x22, wider than the portrait)', overlay.calls.some((c) => c.m === 'ellipse' && c.args[2] === 30 && c.args[3] === 22));
  check('visual fix: machine overlay draws the spinning bit out front (translate +36, moveTo 16,0)', overlay.calls.some((c) => c.m === 'translate' && c.args[0] === 36) && overlay.calls.some((c) => c.m === 'moveTo' && c.args[0] === 16 && c.args[1] === 0));
  check('visual fix: machine frame is wider than the brawler portrait (30 > 16 x 2.1 / 2 = 16.8)', sandbox.DRILLER_MACHINE_HALF_W > (playerEnt.radius * 2.1) / 2);
  check('visual fix: machine overlay draws nothing when the form is not active', (() => { const o2 = stubCtx(); const p2 = mkEntity('p2', { team: 'player', brawler: 'driller', x: 0, y: 0 }); sandbox.drawDrillerFormMachine(o2.proxy, p2, 0); return o2.calls.length === 0; })());
  check('visual fix: machine overlay goes purple when Hyper (real form state)', (() => { const o3 = stubCtx(); sandbox.castDrillerSuper(playerEnt, true, 200, 0); sandbox.drawDrillerFormMachine(o3.proxy, playerEnt, 0); return o3.sets.some((s) => s.p === 'strokeStyle' && s.v === '#c084fc'); })());
  check('render: all four draw functions run without throwing', true);
} catch (e) { failures.push('render threw: ' + e.message); }

// --- executed: voice watcher (spawn / win / death / hurt / idle) ---
try {
  resetWorld();
  sandbox.playing = true;
  sandbox.updateDrillerVoiceState();
  check('voice: spawn line plays on match start (selected driller)', voicePlays.includes('spawn'));
  sandbox.gameOver = true;
  sandbox.updateDrillerVoiceState();
  check('voice: win line plays when the match ends alive', voicePlays.includes('win'));
  resetWorld();
  sandbox.playing = true;
  sandbox.updateDrillerVoiceState();
  playerEnt.hp = 0;
  sandbox.gameOver = true;
  sandbox.updateDrillerVoiceState();
  check('voice: death line plays when the match ends dead', voicePlays.includes('death'));
  check('voice: death pushes a dirt burst + BURIED! text', explosions.length === 1 && floatingTexts.some((t) => t.text === '⛏️ BURIED!'));
  resetWorld();
  sandbox.playing = true;
  sandbox.updateDrillerVoiceState();
  playerEnt.hp = 4000;
  sandbox.updateDrillerVoiceState();
  check('voice: hurt line plays on an HP drop', voicePlays.includes('hurt'));
  resetWorld();
  sandbox.playing = true;
  sandbox.updateDrillerVoiceState();
  nowMs += 21000;
  sandbox.updateDrillerVoiceState();
  check('voice: idle line plays after 20s without action', voicePlays.includes('idle'));
  resetWorld();
  sandbox.selectedBrawler = 'outlit';
  sandbox.playing = true;
  sandbox.updateDrillerVoiceState();
  check('voice: no spawn line when another brawler is selected', !voicePlays.includes('spawn'));
} catch (e) { failures.push('voice watcher threw: ' + e.message); }

// ---------------------------------------------------------- 3. summary
if (failures.length) {
  console.error(`FAIL ${failures.length}:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
}
console.log(`driller: ${passed} passed, ${failures.length} failed`);
