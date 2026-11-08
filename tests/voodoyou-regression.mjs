// Voodoyou regression — Anthony's voodoo-doll brawler, ordered 2026-11-08
// (builder picks, flagged for his correction).
// Locked design: Mythic Controller, 6600 HP / 280 speed, Yarn Bomb main
// (700 direct, explosion 350 in 130px, also on wall hit), Super Voodoo You
// (needle POSSESSES an enemy brawler for 3s — their AI retargets to the
// nearest brawler, any side — and collects 1 voodoo, cap 3, resets on
// death; while controlling, Voodoyou's body stands still and cannot move
// or attack; any damage to the body breaks control early), +10% main
// damage per voodoo (max +30%), Hyper Shadow Helpers (one per voodoo,
// min 1, max 3, 8s, yarn balls at 50% damage), G1 Big Yarn (2x radius,
// +50% damage), G2 Doll Snatch (steal 1 voodoo from nearest enemy in
// 600px), SP1 Hexed Yarn (explosions leave a 150px patch slowing 25%
// for 2s), SP2 Puppet Master (cap 3->4, control 3s->4.5s, +1 helper).
// Visuals are DEDICATED branches: yarn balls and needles are drawn before
// the universal skin renderer call (PR #48 lesson), never through it, and
// never as dots. Star gates use the STORED keys 'slow' (SP1) / 'long'
// (SP2) — never 'sp1'/'sp2' alone (the Aegis/Nightshade bug).
// Helpers are EXECUTED in a vm with a recording stub canvas (PR #45
// pattern: tests do not run the frame loop, so render helpers must be
// executed directly).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/voodoyou-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source pins
check('kill switch VOODOOYOU_ENABLED defaults on', game.includes('let VOODOOYOU_ENABLED = true;'));
check('visuals switch VOODOOYOU_VISUALS_ENABLED defaults on', game.includes('let VOODOOYOU_VISUALS_ENABLED = true;'));
check('roster includes voodoyou (106 ids)', game.includes("'healnstein', 'voodoyou'"));
check('rarity Mythic (270 souls)', game.includes("voodoyou: 'Mythic',") && game.includes('Mythic: 270'));
check('role Controller', game.includes("voodoyou:'Controller',"));
check('portrait icon present', game.includes("voodoyou: '🧶',"));
check('stats branch 6600/700/280', game.includes("if (brawlerId === 'voodoyou') {") && game.includes('hp: Math.round(6600 * hpScale), dmg: Math.round(700 * scale), speed: 280'));
check('super charge 6 hits', game.includes('voodoyou: 6'));
check('reload 1400ms', game.includes('voodoyou: 1400,'));
check('fire delay 300ms', game.includes('voodoyou: 300,'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'voodoyou': {") && game.includes("name: 'Voodoyou'") && game.includes("attack: 'Yarn Bomb'") && game.includes("super: 'Voodoo You'") && game.includes("g1: 'Big Yarn") && game.includes("g2: 'Doll Snatch") && game.includes("sp1: 'Hexed Yarn") && game.includes("sp2: 'Puppet Master") && !game.slice(game.indexOf("'voodoyou': {"), game.indexOf("'voodoyou': {") + 2600).includes('coming soon'));
check('gadget cooldown map entry', game.includes('voodoyou: { g1: 14000, g2: 16000 },'));
check('fire branch exists with per-hit charge', game.includes("} else if (brawler === 'voodoyou') {") && game.includes('fireVoodoyouMain(fromEntity, ang, targetX, targetY, { isBot, now, damageMult: 1, hitboxMult: 1, donorMode: false })') && game.includes('isPrimaryChargeProjectile: true'));
check('yarn + needle branches sit BEFORE the universal skin call (no interception)',
  game.indexOf('if (b.isVoodoyouYarn) {') > 0 &&
  game.indexOf('if (b.isVoodoyouYarn) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') &&
  game.indexOf('if (b.isVoodoyouNeedle) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branches draw dedicated art then continue',
  game.includes('drawVoodoyouYarn(ctx, b);') && game.includes('drawVoodoyouNeedle(ctx, b);'));
check('expiry hook detonates yarn at max range', game.includes('if (b.isVoodoyouYarn && b.life >= b.maxLife && !b._voodoyouExploded) {'));
check('wall hit detonates yarn', game.includes('if (b.isVoodoyouYarn) {') && game.includes('triggerVoodoyouYarnExplosion(b, null);'));
check('checkHit hooks: yarn explosion + needle possession', game.includes('if (b.isVoodoyouYarn && owner && target) triggerVoodoyouYarnExplosion(b, target);') && game.includes('if (b.isVoodoyouNeedle && owner && target) applyVoodoyouPossession(target, owner, b);'));
check('possession breaks alliance (areAlliedEntities)', game.includes('if ((a.voodoyouPossessedUntil || 0) > now) return false;') && game.includes('if ((b.voodoyouPossessedUntil || 0) > now) return false;'));
check('possessed bot retargets to nearest brawler', game.includes('if (isVoodoyouPossessed(t, nowTarget)) {') && game.includes('findNearestVoodoyouPossessTarget(t)'));
check('controlling body cannot fire (fire gate)', game.includes("if (brawler === 'voodoyou' && isVoodoyouControlling(fromEntity, now)) return;"));
check('controlling body cannot move (player + bot gates)', game.includes('isVoodoyouControlling(player, now)') && game.includes('!isVoodoyouControlling(t, nowTarget)'));
check('slow hook for SP1 yarn patch', game.includes('if (now < (entity.voodoyouPatchSlowUntil || 0)) baseSlow = Math.min(baseSlow, VOODOOYOU_PATCH_SLOW_MULT);'));
check('constants: voodoo +10%/cap 3/control 3s/needle 800/helpers 8s', game.includes('const VOODOOYOU_VOODOO_DAMAGE_PER = 0.10;') && game.includes('const VOODOOYOU_VOODOO_CAP = 3;') && game.includes('const VOODOOYOU_CONTROL_DURATION_MS = 3000;') && game.includes('const VOODOOYOU_NEEDLE_RANGE = 800;') && game.includes('const VOODOOYOU_HELPER_DURATION_MS = 8000;'));
check('SP2 constants: cap 4 / control 4.5s / +1 helper', game.includes('const VOODOOYOU_VOODOO_CAP_SP2 = 4;') && game.includes('const VOODOOYOU_CONTROL_DURATION_SP2_MS = 4500;') && game.includes('const VOODOOYOU_HELPER_MAX_SP2 = 4;'));
check('yarn constants: 950 speed / 700 range / 130 radius / 350 = 50% of direct', game.includes('const VOODOOYOU_YARN_SPEED = 950;') && game.includes('const VOODOOYOU_YARN_RANGE = 700;') && game.includes('const VOODOOYOU_YARN_EXPLOSION_RADIUS = 130;') && game.includes('const VOODOOYOU_YARN_EXPLOSION_DAMAGE_RATIO = 0.5;'));
check('helper yarns never grant super charge (super: true)', game.includes('isVoodoyouHelperYarn: true') && game.includes('super: true, ownerId: owner.id, hitIds: {}, hitboxMod: 1.1, hyperVisual: true'));
check('player super dispatch', game.includes("if (combatBrawler === 'voodoyou') { castVoodoyouSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'voodoyou') { castVoodoyouSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, per-brawler cooldowns)', game.includes("curBrawler === 'voodoyou' && curGadget === 'g1'") && game.includes("curBrawler === 'voodoyou' && curGadget === 'g2'") && game.includes('getGadgetCooldownMsForBrawler(curBrawler, curGadget)'));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'voodoyou' && g === 'g1'") && game.includes("bot.brawler === 'voodoyou' && g === 'g2'"));
check('bot super range gate is needle range', game.includes("if (bot.brawler === 'voodoyou') return distance < VOODOOYOU_NEEDLE_RANGE;"));
check('update loop calls updateVoodoyouSystems', game.includes('if (playing && !gameOver) updateVoodoyouSystems(dt);'));
check('render calls renderVoodoyouEffects', game.includes('    renderVoodoyouEffects();'));
check('portrait body-art branch (yarn ball)', game.includes("if (brawlerId === 'voodoyou') {"));
check('hyper hooks spawn helpers (player + bot)', game.includes("if (selectedBrawler === 'voodoyou') spawnVoodoyouHelpers(player, performance.now());") && game.includes("if (t.brawler === 'voodoyou') spawnVoodoyouHelpers(t, nowTarget);"));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)',
  game.includes("function voodoyouHasSP1(entity) { const c = voodoyouStarChoice(entity); return c === 'slow' || c === 'sp1'; }") &&
  game.includes("function voodoyouHasSP2(entity) { const c = voodoyouStarChoice(entity); return c === 'long' || c === 'sp2'; }"));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/voodoyou-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweVoodoyouVoice?.play('attack')") && game.includes("BraweVoodoyouVoice?.play('kill')") && game.includes("BraweVoodoyouVoice?.play('super')") && game.includes('updateVoodoyouVoiceState();'));

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
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const hasFill = (sets, color) => sets.some((s) => s.p === 'fillStyle' && String(s.v).includes(color));
const hasArcIn = (calls, lo, hi) => calls.some((c) => c.m === 'arc' && c.args[2] >= lo && c.args[2] <= hi);

// --- executed: voodoo math + SP gates (stored keys slow/long) ---
try {
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    VOODOOYOU_VOODOO_DAMAGE_PER: 0.10,
    VOODOOYOU_VOODOO_CAP: 3,
    VOODOOYOU_VOODOO_CAP_SP2: 4,
    VOODOOYOU_CONTROL_DURATION_MS: 3000,
    VOODOOYOU_CONTROL_DURATION_SP2_MS: 4500,
    VOODOOYOU_HELPER_MAX: 3,
    VOODOOYOU_HELPER_MAX_SP2: 4,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'voodoyouStarChoice') + '\n' +
    extractFn(game, 'voodoyouHasSP1') + '\n' +
    extractFn(game, 'voodoyouHasSP2') + '\n' +
    extractFn(game, 'voodoyouVoodooCap') + '\n' +
    extractFn(game, 'voodoyouControlDurationMs') + '\n' +
    extractFn(game, 'voodoyouMaxHelpers') + '\n' +
    extractFn(game, 'voodoyouDamageMult'),
    sandbox);
  check('voodoo: 0 stored is +0% (mult 1.0)', near(sandbox.voodoyouDamageMult({ voodoyouCount: 0 }), 1.0));
  check('voodoo: 1 stored is +10% (mult 1.1)', near(sandbox.voodoyouDamageMult({ voodoyouCount: 1 }), 1.1));
  check('voodoo: 3 stored is +30% (mult 1.3)', near(sandbox.voodoyouDamageMult({ voodoyouCount: 3 }), 1.3));
  check('cap: base 3', sandbox.voodoyouVoodooCap({ selectedStar: 'none' }) === 3);
  check('cap: SP2 (stored long) is 4', sandbox.voodoyouVoodooCap({ selectedStar: 'long' }) === 4);
  check('cap: SP1 (stored slow) does not raise cap', sandbox.voodoyouVoodooCap({ selectedStar: 'slow' }) === 3);
  check('control: base 3000ms', sandbox.voodoyouControlDurationMs({ selectedStar: 'none' }) === 3000);
  check('control: SP2 (stored long) is 4500ms', sandbox.voodoyouControlDurationMs({ selectedStar: 'long' }) === 4500);
  check('helpers: base max 3', sandbox.voodoyouMaxHelpers({ selectedStar: 'none' }) === 3);
  check('helpers: SP2 (stored long) max 4', sandbox.voodoyouMaxHelpers({ selectedStar: 'long' }) === 4);
  check('SP1 gate: stored slow is true', sandbox.voodoyouHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.voodoyouHasSP1({ selectedStar: 'long' }) === false);
  check('SP1 gate: no star is false', sandbox.voodoyouHasSP1({ selectedStar: 'none' }) === false);
  check('SP2 gate: stored long is true', sandbox.voodoyouHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.voodoyouHasSP2({ selectedStar: 'slow' }) === false);
  check('SP2 gate: no star is false', sandbox.voodoyouHasSP2({ selectedStar: 'none' }) === false);
} catch (e) { failures.push('voodoo-math vm block threw: ' + e.message); }

// --- executed: possession + release ---
try {
  let nowValue = 100000;
  const floating = [];
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    VOODOOYOU_ENABLED: true,
    VOODOOYOU_VOODOO_CAP: 3,
    VOODOOYOU_VOODOO_CAP_SP2: 4,
    VOODOOYOU_CONTROL_DURATION_MS: 3000,
    VOODOOYOU_CONTROL_DURATION_SP2_MS: 4500,
    player: null,
    bots: [],
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    areAlliedEntities: (a, t) => a.id === 1 && t.id === 5, // id 5 is the owner's ally
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'voodoyouStarChoice') + '\n' +
    extractFn(game, 'voodoyouHasSP2') + '\n' +
    extractFn(game, 'voodoyouVoodooCap') + '\n' +
    extractFn(game, 'voodoyouControlDurationMs') + '\n' +
    extractFn(game, 'findVoodoyouEntityById') + '\n' +
    extractFn(game, 'applyVoodoyouPossession') + '\n' +
    extractFn(game, 'releaseVoodoyouControl'),
    sandbox);
  const owner = { id: 1, hp: 6600, voodoyouCount: 0, selectedStar: 'none', x: 0, y: 0 };
  const enemy = { id: 2, hp: 5000, x: 100, y: 0 };
  sandbox.player = owner;
  sandbox.bots = [enemy];
  sandbox.applyVoodoyouPossession(enemy, owner, { ownerId: 1 });
  check('possess: victim flagged until +3000ms', enemy.voodoyouPossessedUntil === 103000);
  check('possess: victim records possessor', enemy.voodoyouPossessedBy === 1);
  check('possess: owner is controlling', owner.voodoyouControllingId === 2 && owner.voodoyouControllingUntil === 103000);
  check('possess: collects 1 voodoo', owner.voodoyouCount === 1);
  check('possess: shows VOODOO 1/3', floating.some((t) => t.includes('VOODOO 1/3')));
  check('possess: shows POSSESSED!', floating.some((t) => t === 'POSSESSED!'));
  sandbox.applyVoodoyouPossession(enemy, owner, { ownerId: 1 });
  check('possess: re-possessing the same victim does not double-collect', owner.voodoyouCount === 1);
  const ally = { id: 5, hp: 5000, x: 50, y: 0 };
  sandbox.bots = [enemy, ally];
  sandbox.applyVoodoyouPossession(ally, owner, { ownerId: 1 });
  check('possess: ally is never possessed', !ally.voodoyouPossessedUntil);
  const dummy = { id: 6, hp: 5000, isDummy: true, x: 60, y: 0 };
  sandbox.applyVoodoyouPossession(dummy, owner, { ownerId: 1 });
  check('possess: dummy is never possessed', !dummy.voodoyouPossessedUntil);
  const tower = { id: 7, hp: 5000, isStructure: true, x: 70, y: 0 };
  sandbox.applyVoodoyouPossession(tower, owner, { ownerId: 1 });
  check('possess: structure is never possessed', !tower.voodoyouPossessedUntil);
  owner.voodoyouCount = 3;
  const enemy2 = { id: 8, hp: 5000, x: 120, y: 0 };
  sandbox.bots = [enemy, ally, enemy2];
  sandbox.applyVoodoyouPossession(enemy2, owner, { ownerId: 1 });
  check('possess: at cap, control still works but no 4th voodoo', enemy2.voodoyouPossessedUntil === 103000 && owner.voodoyouCount === 3);
  check('possess: at cap shows VOODOO FULL', floating.some((t) => t === '🧶 VOODOO FULL'));
  sandbox.releaseVoodoyouControl(owner, 'expired');
  check('release: owner control cleared', !owner.voodoyouControllingId && !owner.voodoyouControllingUntil);
  check('release: latest victim flag cleared', !enemy2.voodoyouPossessedUntil && !enemy2.voodoyouPossessedBy);
  const sp2Owner = { id: 9, hp: 6600, voodoyouCount: 0, selectedStar: 'long', x: 0, y: 0 };
  const enemy3 = { id: 10, hp: 5000, x: 100, y: 0 };
  sandbox.player = sp2Owner;
  sandbox.bots = [enemy3];
  sandbox.applyVoodoyouPossession(enemy3, sp2Owner, { ownerId: 9 });
  check('possess: SP2 control is 4500ms', enemy3.voodoyouPossessedUntil === 104500);
  check('possess: SP2 voodoo shows 1/4', floating.some((t) => t.includes('VOODOO 1/4')));
} catch (e) { failures.push('possession vm block threw: ' + e.message); }

// --- executed: yarn explosion math ---
try {
  const hits = [];
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    VOODOOYOU_ENABLED: true,
    VOODOOYOU_YARN_EXPLOSION_RADIUS: 130,
    VOODOOYOU_YARN_RADIUS_MULT_GADGET: 2,
    VOODOOYOU_YARN_EXPLOSION_DAMAGE_RATIO: 0.5,
    VOODOOYOU_PATCH_RADIUS: 150,
    VOODOOYOU_PATCH_DURATION_MS: 2000,
    player: null,
    bots: [],
    explosions: [],
    voodoyouYarnPatches: [],
    areAlliedEntities: (a, t) => a.id === 1 && t.id === 5,
    checkHit: (target, b) => { hits.push({ id: target.id, dmg: b.damage }); return true; },
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'voodoyouStarChoice') + '\n' +
    extractFn(game, 'voodoyouHasSP1') + '\n' +
    extractFn(game, 'findVoodoyouEntityById') + '\n' +
    extractFn(game, 'triggerVoodoyouYarnExplosion'),
    sandbox);
  const owner = { id: 1, hp: 6600, selectedStar: 'none', x: 0, y: 0 };
  const direct = { id: 2, hp: 5000, x: 100, y: 100, radius: 14 };
  const nearEnemy = { id: 3, hp: 5000, x: 150, y: 100, radius: 14 };
  const midEnemy = { id: 9, hp: 5000, x: 300, y: 100, radius: 14 };
  const farEnemy = { id: 4, hp: 5000, x: 400, y: 100, radius: 14 };
  const ally = { id: 5, hp: 5000, x: 120, y: 100, radius: 14 };
  const tower = { id: 6, hp: 5000, isStructure: true, x: 110, y: 100, radius: 14 };
  sandbox.player = owner;
  sandbox.bots = [direct, nearEnemy, midEnemy, farEnemy, ally, tower];
  const ball = { x: 100, y: 100, damage: 700, ownerId: 1, voodoyouBigYarn: false };
  sandbox.triggerVoodoyouYarnExplosion(ball, direct);
  check('explosion: direct target excluded from AoE (already took 700)', !hits.some((h) => h.id === 2));
  check('explosion: nearby enemy takes 350 (50% of 700)', hits.some((h) => h.id === 3 && h.dmg === 350));
  check('explosion: far enemy untouched', !hits.some((h) => h.id === 4));
  check('explosion: ally untouched', !hits.some((h) => h.id === 5));
  check('explosion: structure untouched', !hits.some((h) => h.id === 6));
  check('explosion: exactly one AoE hit', hits.length === 1);
  check('explosion: visual pushed', sandbox.explosions.length === 1 && sandbox.explosions[0].radius === 130);
  check('explosion: no SP1 patch without SP1', sandbox.voodoyouYarnPatches.length === 0);
  sandbox.triggerVoodoyouYarnExplosion(ball, direct);
  check('explosion: double-trigger guard (second call is a no-op)', hits.length === 1 && sandbox.explosions.length === 1);
  // G1 Big Yarn: 2x radius, +50% damage on the ball -> 525 blast, 260 radius.
  hits.length = 0;
  sandbox.explosions = [];
  const bigBall = { x: 100, y: 100, damage: 1050, ownerId: 1, voodoyouBigYarn: true };
  sandbox.triggerVoodoyouYarnExplosion(bigBall, direct);
  check('explosion: G1 blast is 525 (50% of 1050)', hits.some((h) => h.id === 3 && h.dmg === 525));
  check('explosion: G1 reaches 260px (mid enemy at 200px in radius)', hits.some((h) => h.id === 9 && h.dmg === 525));
  check('explosion: G1 still stops at 274px (far enemy at 300px untouched)', !hits.some((h) => h.id === 4));
  check('explosion: G1 visual radius is 260', sandbox.explosions[0].radius === 260);
  // SP1 Hexed Yarn: explosion leaves a 150px patch.
  hits.length = 0;
  sandbox.explosions = [];
  const sp1Owner = { id: 1, hp: 6600, selectedStar: 'slow', x: 0, y: 0 };
  sandbox.player = sp1Owner;
  const sp1Ball = { x: 100, y: 100, damage: 700, ownerId: 1, voodoyouBigYarn: false };
  sandbox.triggerVoodoyouYarnExplosion(sp1Ball, direct);
  check('explosion: SP1 leaves a 150px yarn patch', sandbox.voodoyouYarnPatches.length === 1 && sandbox.voodoyouYarnPatches[0].radius === 150);
} catch (e) { failures.push('explosion vm block threw: ' + e.message); }

// --- executed: helpers (count, cap, duration) ---
try {
  const floating = [];
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    VOODOOYOU_ENABLED: true,
    VOODOOYOU_HELPER_DURATION_MS: 8000,
    VOODOOYOU_HELPER_MAX: 3,
    VOODOOYOU_HELPER_MAX_SP2: 4,
    voodoyouHelpers: [],
    spawnFloatingText: (x, y, t) => { floating.push(t); },
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'voodoyouStarChoice') + '\n' +
    extractFn(game, 'voodoyouHasSP2') + '\n' +
    extractFn(game, 'voodoyouMaxHelpers') + '\n' +
    extractFn(game, 'spawnVoodoyouHelpers'),
    sandbox);
  sandbox.spawnVoodoyouHelpers({ id: 1, hp: 6600, voodoyouCount: 0, selectedStar: 'none', x: 0, y: 0 }, 100000);
  check('helpers: 0 voodoo still spawns 1 (minimum)', sandbox.voodoyouHelpers.length === 1);
  check('helpers: last 8s', sandbox.voodoyouHelpers[0].until === 108000);
  sandbox.voodoyouHelpers = [];
  sandbox.spawnVoodoyouHelpers({ id: 1, hp: 6600, voodoyouCount: 2, selectedStar: 'none', x: 0, y: 0 }, 100000);
  check('helpers: 2 voodoo spawns 2', sandbox.voodoyouHelpers.length === 2);
  sandbox.voodoyouHelpers = [];
  sandbox.spawnVoodoyouHelpers({ id: 1, hp: 6600, voodoyouCount: 3, selectedStar: 'none', x: 0, y: 0 }, 100000);
  check('helpers: 3 voodoo spawns 3 (max)', sandbox.voodoyouHelpers.length === 3);
  sandbox.voodoyouHelpers = [];
  sandbox.spawnVoodoyouHelpers({ id: 1, hp: 6600, voodoyouCount: 4, selectedStar: 'long', x: 0, y: 0 }, 100000);
  check('helpers: SP2 + 4 voodoo spawns 4', sandbox.voodoyouHelpers.length === 4);
  check('helpers: announces count', floating.some((t) => t.includes('SHADOW HELPERS x4')));
} catch (e) { failures.push('helpers vm block threw: ' + e.message); }

// --- executed: per-frame systems (damage-break, death reset, helper shot) ---
try {
  let nowValue = 100000;
  const floating = [];
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getSelectedBrawlerLevel: () => 11,
    getScaledStats: () => ({ hp: 6600, dmg: 700, speed: 280 }),
    staticsteinDonorTag: () => ({}),
    VOODOOYOU_ENABLED: true,
    VOODOOYOU_VOODOO_CAP: 3,
    VOODOOYOU_VOODOO_CAP_SP2: 4,
    VOODOOYOU_CONTROL_DURATION_MS: 3000,
    VOODOOYOU_CONTROL_DURATION_SP2_MS: 4500,
    VOODOOYOU_HELPER_SHOT_INTERVAL_MS: 900,
    VOODOOYOU_HELPER_SHOT_RANGE: 700,
    VOODOOYOU_YARN_SPEED: 950,
    VOODOOYOU_YARN_RANGE: 700,
    VOODOOYOU_HELPER_DAMAGE_MULT: 0.5,
    selectedBrawler: 'voodoyou',
    player: null,
    bots: [],
    bullets: [],
    voodoyouHelpers: [],
    voodoyouYarnPatches: [],
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    areAlliedEntities: (a, t) => a.id === 1 && t.id === 5,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'voodoyouStarChoice') + '\n' +
    extractFn(game, 'voodoyouHasSP2') + '\n' +
    extractFn(game, 'voodoyouVoodooCap') + '\n' +
    extractFn(game, 'voodoyouControlDurationMs') + '\n' +
    extractFn(game, 'findVoodoyouEntityById') + '\n' +
    extractFn(game, 'voodoyouLevelFor') + '\n' +
    extractFn(game, 'releaseVoodoyouControl') + '\n' +
    extractFn(game, 'updateVoodoyouSystems'),
    sandbox);
  const owner = { id: 1, brawler: 'voodoyou', hp: 6600, voodoyouCount: 2, voodoyouControllingId: 2, voodoyouControllingUntil: 103000, voodoyouLastHp: 6600, selectedStar: 'none', x: 0, y: 0, radius: 14 };
  const victim = { id: 2, brawler: 'shelly', hp: 5000, voodoyouPossessedUntil: 103000, voodoyouPossessedBy: 1, x: 100, y: 0, radius: 14 };
  sandbox.player = owner;
  sandbox.bots = [victim];
  // Damage-break: body takes 100 damage -> control releases.
  owner.hp = 6500;
  sandbox.updateVoodoyouSystems(0.016);
  check('systems: body damage breaks control early', !owner.voodoyouControllingId && !victim.voodoyouPossessedUntil);
  check('systems: damage-break announces CONTROL BROKEN!', floating.some((t) => t === 'CONTROL BROKEN!'));
  // Death reset: voodoo clears when Voodoyou dies.
  owner.hp = 0;
  owner.voodoyouCount = 2;
  sandbox.updateVoodoyouSystems(0.016);
  check('systems: voodoo resets on death', owner.voodoyouCount === 0);
  // Helper expiry + helper shot at 50% damage.
  owner.hp = 6600;
  owner.voodoyouCount = 1;
  const enemy = { id: 3, brawler: 'colt', hp: 5000, x: 200, y: 0, radius: 14 };
  sandbox.bots = [enemy];
  sandbox.voodoyouHelpers = [
    { ownerId: 1, x: 10, y: 0, until: 99999, lastShotAt: 0, seed: 0 }, // expired
    { ownerId: 1, x: 10, y: 0, until: 108000, lastShotAt: 0, seed: 0 }, // live, shoots
  ];
  sandbox.updateVoodoyouSystems(0.016);
  check('systems: expired helper is removed', sandbox.voodoyouHelpers.length === 1);
  check('systems: live helper shoots the nearest enemy', sandbox.bullets.length === 1);
  check('systems: helper yarn deals 50% damage (350)', sandbox.bullets[0].damage === 350);
  check('systems: helper yarn is flagged helper yarn', sandbox.bullets[0].isVoodoyouHelperYarn === true && sandbox.bullets[0].isVoodoyouYarn === true);
  check('systems: helper yarn never grants super charge', sandbox.bullets[0].super === true);
  // Possession expiry cleanup on the victim side.
  const victim2 = { id: 4, brawler: 'bull', hp: 5000, voodoyouPossessedUntil: 99999, voodoyouPossessedBy: 99, x: 300, y: 0, radius: 14 };
  sandbox.bots = [victim2];
  sandbox.updateVoodoyouSystems(0.016);
  check('systems: expired possession flag clears on victim', !victim2.voodoyouPossessedUntil && !victim2.voodoyouPossessedBy);
} catch (e) { failures.push('systems vm block threw: ' + e.message); }

// --- executed: projectile art (yarn ball + needle, real shapes, never dots) ---
try {
  const sandbox = { Math, performance: { now: () => 100000 } };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'drawVoodoyouYarn') + '\n' + extractFn(game, 'drawVoodoyouNeedle'), sandbox);
  const s = stubCtx();
  sandbox.drawVoodoyouYarn(s.proxy, { x: 100, y: 100, vx: 950, vy: 0, hyperVisual: false });
  check('yarn art: purple ball body', hasFill(s.sets, '#a78bfa'));
  check('yarn art: 9px ball (not a dot)', hasArcIn(s.calls, 8, 10));
  check('yarn art: cross-stitch lines drawn', s.calls.some((c) => c.m === 'moveTo'));
  const sh = stubCtx();
  sandbox.drawVoodoyouYarn(sh.proxy, { x: 100, y: 100, vx: 950, vy: 0, hyperVisual: true, isVoodoyouHelperYarn: true });
  check('yarn art: helper yarn is dark shadow purple', hasFill(sh.sets, '#2e1065'));
  const sn = stubCtx();
  sandbox.drawVoodoyouNeedle(sn.proxy, { x: 100, y: 100, vx: 1100, vy: 0, hyperVisual: false });
  check('needle art: pale thread line', sn.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('#e9d5ff')));
  check('needle art: purple tip', sn.sets.some((x) => x.p === 'fillStyle' && String(x.v).includes('#a855f7')));
} catch (e) { failures.push('projectile art vm block threw: ' + e.message); }

// --- executed: renderVoodoyouEffects (patches, helpers, possession ring, pips) ---
try {
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    VOODOOYOU_VISUALS_ENABLED: true,
    VOODOOYOU_PATCH_DURATION_MS: 2000,
    voodoyouYarnPatches: [{ x: 200, y: 200, radius: 150, until: 102000, ownerId: 1 }],
    voodoyouHelpers: [{ ownerId: 1, x: 50, y: 50, until: 108000 }],
    player: { id: 1, brawler: 'voodoyou', hp: 6600, x: 0, y: 0, radius: 14, voodoyouCount: 2 },
    bots: [{ id: 2, brawler: 'shelly', hp: 5000, x: 300, y: 300, radius: 14, voodoyouPossessedUntil: 103000 }],
    selectedBrawler: 'voodoyou',
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'isVoodoyouPossessed') + '\n' +
    extractFn(game, 'renderVoodoyouEffects'),
    sandbox);
  const s = stubCtx();
  sandbox.ctx = s.proxy;
  sandbox.renderVoodoyouEffects();
  check('render: SP1 patch draws a 150px ground circle', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 150)));
  check('render: helper draws an 11px shadow orb', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 11)));
  check('render: possessed victim gets a purple ring', s.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('#c084fc')));
  check('render: voodoo pips show over Voodoyou', s.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('🧶')));
} catch (e) { failures.push('render vm block threw: ' + e.message); }

// --- executed: voice module (12 clips, RULE ONE — flavor only) ---
try {
  const played = [];
  const voiceSandbox = {
    globalThis: {},
    document: { hidden: false, baseURI: 'https://example.com/' },
    Audio: class { constructor() { this.volume = 0; } addEventListener() {} play() { played.push(true); return Promise.resolve(); } },
    performance: { now: () => 100000 },
    Math,
  };
  voiceSandbox.globalThis = voiceSandbox;
  vm.createContext(voiceSandbox);
  vm.runInContext(voiceModule, voiceSandbox);
  const V = voiceSandbox.BraweVoodoyouVoice;
  check('voice: module exposes BraweVoodoyouVoice', !!V);
  check('voice: 12 clips total', V.fileCount() === 12);
  check('voice: all 8 triggers present', ['spawn', 'attack', 'super', 'kill', 'hurt', 'death', 'win', 'idle'].every((t) => Array.isArray(V.lines[t]) && V.lines[t].length > 0));
  const ruleOneBad = /[0-9]|damage|range|radius|second|percent|%|tile|cooldown|reload|ammo|hit[s]? for|deals /i;
  const badLines = Object.entries(V.text).filter(([, t]) => ruleOneBad.test(t));
  check('voice: RULE ONE — no line explains mechanics (no numbers/damage/ranges)', badLines.length === 0);
  check('voice: super line is the battle cry', Object.values(V.text).includes('Voodoo you!'));
  check('voice: play(super) starts playback', V.play('super') === true && played.length === 1);
  check('voice: unknown trigger is a silent no-op', V.play('nope') === false);
  V.setEnabled(false);
  check('voice: disabled is a silent no-op', V.play('super') === false);
  V.setEnabled(true);
} catch (e) { failures.push('voice vm block threw: ' + e.message); }

// --- pure draw code: projectile art writes no combat state ---
try {
  const yarnSrc = extractFn(game, 'drawVoodoyouYarn');
  const needleSrc = extractFn(game, 'drawVoodoyouNeedle');
  check('drawVoodoyouYarn is pure draw code', !/\.damage\s*=|\.hp\s*=/.test(yarnSrc));
  check('drawVoodoyouNeedle is pure draw code', !/\.damage\s*=|\.hp\s*=/.test(needleSrc));
} catch (e) { failures.push('pure-draw block threw: ' + e.message); }

console.log(`voodoyou-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
