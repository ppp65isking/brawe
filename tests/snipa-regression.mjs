// Snipa regression — Pandy's sister, ordered 2026-11-12 (builder picks,
// flagged for his correction).
// Locked design: Epic Marksman (170 souls), 5200 HP / 260 speed, 900 base
// main damage. Main Longshot: one wide blue bullet at Pandy's basic range
// (729.6px); every hit on an enemy brawler stretches range +0.5 tiles
// (24px), stacking to +3 tiles (144px), reset on death. Super Headshot:
// roots Snipa and sweeps a big blue aura (~600px) that steadily marks
// enemies inside it (~2s to full) — the aura never marks through walls
// (line of sight per enemy) or into bushes; at ~2.5s she auto-fires a
// rapid volley (3 bullets per marked enemy) at every marked enemy, fully
// marked enemies taking +50% (scaled by mark progress). Camera zooms out
// while the Super channels. Hyper Deadeye Surge: the Super marks through
// walls AND bushes, and aiming the main attack marks enemies in the
// reticle (~1s to full) for +25% damage from Snipa. G1 Deadeye (14s):
// next main attack +50% damage and double range bonus on hit. G2 Long
// Lens (16s): main range +3 tiles for 5s. SP1 Eagle Eye: +0.75 tiles per
// hit. SP2 Hair Trigger: volley fires 4 bullets per marked enemy.
// Visuals are DEDICATED branches: longshots and volley bullets are drawn
// before the universal skin renderer call (PR #48 lesson), never through
// it, and never as dots. Star gates use the STORED keys 'slow' (SP1) /
// 'long' (SP2) — never 'sp1'/'sp2' alone (the Aegis/Nightshade bug).
// Mark circles are EXECUTED in a vm with a recording stub canvas
// (PR #45 pattern: tests do not run the frame loop, so render helpers
// must be executed directly).
// Also pinned here: the Pandy Focus-bar HUD move (2026-11-12) — the
// player's bar now draws in the HUD stack above the ammo bar and below
// the HP bar; bots keep the overhead bar.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/snipa-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source pins
check('kill switch SNIPA_ENABLED defaults on', game.includes('let SNIPA_ENABLED = true;'));
check('visuals switch SNIPA_VISUALS_ENABLED defaults on', game.includes('let SNIPA_VISUALS_ENABLED = true;'));
check('roster includes snipa (108 ids)', game.includes("'pandy', 'snipa'"));
check('selectable is 100 (108 minus the 8 disabled, snipa not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];
  return all.length === 108 && all.filter(id => !disabled.includes(id)).length === 100;
})());
check('rarity Epic (170 souls)', game.includes("snipa: 'Epic',") && game.includes('Epic: 170'));
check('role Marksman', game.includes("snipa:'Marksman',"));
check('portrait icon present', game.includes("snipa: '🎯',"));
check('stats branch 5200/900/260', game.includes("if (brawlerId === 'snipa') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(900 * scale), speed: 260'));
check('super charge 6 hits', game.includes('snipa: 6'));
check('reload 1600ms', game.includes('snipa: 1600,'));
check('fire delay 300ms', game.includes('snipa: 300,'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'snipa': {") && game.includes("name: 'Snipa'") && game.includes("attack: 'Longshot'") && game.includes("super: 'Headshot'") && game.includes("g1: 'Deadeye") && game.includes("g2: 'Long Lens") && game.includes("sp1: 'Eagle Eye") && game.includes("sp2: 'Hair Trigger") && !game.slice(game.indexOf("'snipa': {"), game.indexOf("'snipa': {") + 2600).includes('coming soon'));
check('gadget cooldown map entry', game.includes('snipa: { g1: 14000, g2: 16000 },'));
check('fire branch exists with per-hit charge', game.includes("} else if (brawler === 'snipa') {") && game.includes('fireSnipaMain(fromEntity, ang, targetX, targetY, { isBot, now, damageMult: 1, hitboxMult: 1, donorMode: false })') && game.includes('isSnipaLongshot: true, isPrimaryChargeProjectile: true'));
check('longshot + volley branches sit BEFORE the universal skin call (no interception)',
  game.indexOf('if (b.isSnipaLongshot) {') > 0 &&
  game.indexOf('if (b.isSnipaLongshot) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') &&
  game.indexOf('if (b.isSnipaVolley) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branches draw dedicated art then continue',
  game.includes('drawSnipaLongshot(ctx, b);') && game.includes('drawSnipaVolleyBullet(ctx, b);'));
check('volley bullets steer toward their assigned marked target', game.includes('if (b.isSnipaVolley && b.snipaVolleyTargetId) {'));
check('player super dispatch', game.includes("if (combatBrawler === 'snipa') { castSnipaSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'snipa') { castSnipaSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, per-brawler cooldowns)', game.includes("curBrawler === 'snipa' && curGadget === 'g1'") && game.includes("curBrawler === 'snipa' && curGadget === 'g2'") && game.includes('getGadgetCooldownMsForBrawler(curBrawler, curGadget)'));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'snipa' && g === 'g1'") && game.includes("bot.brawler === 'snipa' && g === 'g2'"));
check('bot super range gate is headshot aura range', game.includes("if (bot.brawler === 'snipa') return distance < SNIPA_SUPER_AURA_RADIUS;"));
check('channel blocks main attack / super / gadget re-cast', game.includes("if (brawler === 'snipa' && isSnipaChanneling(fromEntity, now)) return;") && game.includes('if (isSnipaChanneling(player, performance.now())) {') && game.includes('if (isSnipaChanneling(bot, performance.now())) return;'));
check('update loop calls updateSnipaSystems', game.includes('if (playing && !gameOver) updateSnipaSystems(dt);'));
check('render calls renderSnipaEffects', game.includes('    renderSnipaEffects();'));
check('portrait body-art branch (scope)', game.includes("if (brawlerId === 'snipa') {"));
check('constants: tile 48 / +0.5 per hit / +3 cap / 729.6 base', game.includes('const SNIPA_TILE_PX = 48;') && game.includes('const SNIPA_RANGE_BONUS_PER_HIT_TILES = 0.5;') && game.includes('const SNIPA_RANGE_BONUS_MAX_TILES = 3;') && game.includes('const SNIPA_MAIN_BASE_RANGE = 729.6;'));
check('constants: aura 600 / mark 2s / volley 2.5s / 3 bullets', game.includes('const SNIPA_SUPER_AURA_RADIUS = 600;') && game.includes('const SNIPA_MARK_TIME_MS = 2000;') && game.includes('const SNIPA_VOLLEY_DELAY_MS = 2500;') && game.includes('const SNIPA_VOLLEY_BULLETS_PER_TARGET = 3;'));
check('constants: volley 0.6x damage / +50% full mark / 2400 speed', game.includes('const SNIPA_VOLLEY_DAMAGE_RATIO = 0.6;') && game.includes('const SNIPA_VOLLEY_FULL_MARK_BONUS = 0.5;') && game.includes('const SNIPA_VOLLEY_SPEED = 2400;'));
check('constants: hyper mark 1s / +25% / 4s duration / 12deg cone', game.includes('const SNIPA_HYPER_MARK_TIME_MS = 1000;') && game.includes('const SNIPA_HYPER_MARK_DMG_MULT = 1.25;') && game.includes('const SNIPA_HYPER_MARK_DURATION_MS = 4000;') && game.includes('const SNIPA_HYPER_MARK_CONE_HALF_ANGLE = 0.21;'));
check('constants: G2 +3 tiles 5s / SP1 +0.75 / SP2 +1 bullet / G1 +50%', game.includes('const SNIPA_G2_RANGE_BONUS_TILES = 3;') && game.includes('const SNIPA_SP1_BONUS_PER_HIT_TILES = 0.75;') && game.includes('const SNIPA_SP2_VOLLEY_BONUS_BULLETS = 1;') && game.includes('const SNIPA_G1_DAMAGE_MULT = 1.5;'));
check('constants: super camera zoom 0.72', game.includes('const SNIPA_SUPER_CAMERA_ZOOM = 0.72;'));
check('camera zoom targets snipa channel in render()', game.includes('const snipaSuperZoomed = !!player && player.hp > 0 && selectedBrawler ===') && game.includes('snipaSuperZoomed ? SNIPA_SUPER_CAMERA_ZOOM : CAMERA_ZOOM_BASE'));
check('volley trigger gated on channel pending (not isSnipaChanneling — false at volley time)', game.includes('if (entity.snipaChannelUntil > 0) {') && game.includes('if ((entity.snipaChannelVolleyAt || 0) > 0 && now >= entity.snipaChannelVolleyAt) {'));
check('checkHit hooks: hyper-mark damage + longshot range bonus', game.includes('snipaApplyHyperMarkDamage(target, b);') && game.includes('snipaApplyHitBonus(snipaOwner, b);'));
check('wall occlusion uses line-of-sight helper', game.includes('if (!hasBlinkEyeSight(entity.x, entity.y, target.x, target.y)) continue;'));
check('bush check blocks normal-channel marking', game.includes('if (isEntityInsideBush(target)) continue;'));
check('root applied for the channel (isEntityRooted reads rootUntil)', game.includes('entity.rootUntil = Math.max(entity.rootUntil || 0, now + SNIPA_VOLLEY_DELAY_MS);'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)',
  game.includes("function snipaHasSP1(entity) { const c = snipaStarChoice(entity); return c === 'slow' || c === 'sp1'; }") &&
  game.includes("function snipaHasSP2(entity) { const c = snipaStarChoice(entity); return c === 'long' || c === 'sp2'; }"));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/snipa-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BraweSnipaVoice?.play('attack')") && game.includes("BraweSnipaVoice?.play('kill')") && game.includes("BraweSnipaVoice?.play('super')") && game.includes('updateSnipaVoiceState();'));
// Pandy Focus-bar HUD move (2026-11-12, Anthony's order, same build).
check('pandy focus bar: player bar drawn in HUD stack above ammo', game.includes("if (selectedBrawler === 'pandy' && player.hp > 0) drawPandyFocusHudBar(ctx, player, drawY);"));
check('pandy focus bar: overhead loop skips the player', game.includes("if (e.id === player.id) continue; // the player's bar lives in the HUD stack now"));
check('pandy focus bar: HUD helper exists (drawY-27, 48 wide)', game.includes('function drawPandyFocusHudBar(ctx, entity, drawY) {') && game.includes('const bx = entity.x - w / 2, by = drawY - 27;'));

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

// --- executed: range math + SP gates (stored keys slow/long) ---
try {
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    SNIPA_TILE_PX: 48,
    SNIPA_MAIN_BASE_RANGE: 729.6,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_G2_RANGE_BONUS_TILES: 3,
    SNIPA_G2_DURATION_MS: 5000,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaEffectiveRange'),
    sandbox);
  check('range: 0 bonus is 729.6', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 0 }), 729.6));
  check('range: +24 (1 hit) is 753.6', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 24 }), 753.6));
  check('range: +144 (6 hits, cap) is 873.6', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 144 }), 873.6));
  check('range: G2 +3 tiles is 729.6 + 144 = 873.6', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 0, snipaG2Until: 200000 }), 873.6));
  check('range: G2 expired adds nothing', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 0, snipaG2Until: 50000 }), 729.6));
  check('range: cap + G2 stacks (144 + 144 = 1017.6)', near(sandbox.snipaEffectiveRange({ snipaRangeBonusPx: 144, snipaG2Until: 200000 }), 1017.6));
  check('per-hit: base +0.5 tile is 24px', sandbox.snipaRangeBonusPerHitPx({ selectedStar: 'none' }) === 24);
  check('per-hit: SP1 +0.75 tile is 36px', sandbox.snipaRangeBonusPerHitPx({ selectedStar: 'slow' }) === 36);
  check('SP1 gate: stored slow is true', sandbox.snipaHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.snipaHasSP1({ selectedStar: 'long' }) === false);
  check('SP2 gate: stored long is true', sandbox.snipaHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.snipaHasSP2({ selectedStar: 'slow' }) === false);
} catch (e) { failures.push('range vm block threw: ' + e.message); }

// --- executed: hit bonus helper + hyper-mark damage helper ---
try {
  let nowValue = 100000;
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    SNIPA_TILE_PX: 48,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_HYPER_MARK_DMG_MULT: 1.25,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaApplyHitBonus') + '\n' +
    extractFn(game, 'snipaApplyHyperMarkDamage'),
    sandbox);
  const owner = { id: 1, hp: 5200, snipaRangeBonusPx: 0, selectedStar: 'none' };
  sandbox.snipaApplyHitBonus(owner, { snipaDeadeye: false });
  check('hit bonus: 1 hit is +24px', owner.snipaRangeBonusPx === 24);
  for (let i = 0; i < 10; i++) sandbox.snipaApplyHitBonus(owner, { snipaDeadeye: false });
  check('hit bonus: caps at +144px (6 hits)', owner.snipaRangeBonusPx === 144);
  const deadeyeOwner = { id: 1, hp: 5200, snipaRangeBonusPx: 0, selectedStar: 'none' };
  sandbox.snipaApplyHitBonus(deadeyeOwner, { snipaDeadeye: true });
  check('hit bonus: Deadeye doubles to +48px', deadeyeOwner.snipaRangeBonusPx === 48);
  const sp1Owner = { id: 1, hp: 5200, snipaRangeBonusPx: 0, selectedStar: 'slow' };
  sandbox.snipaApplyHitBonus(sp1Owner, { snipaDeadeye: false });
  check('hit bonus: SP1 is +36px per hit', sp1Owner.snipaRangeBonusPx === 36);
  for (let i = 0; i < 10; i++) sandbox.snipaApplyHitBonus(sp1Owner, { snipaDeadeye: false });
  check('hit bonus: SP1 still caps at +144px (4 hits)', sp1Owner.snipaRangeBonusPx === 144);
  const deadOwner = { id: 1, hp: 0, snipaRangeBonusPx: 0, selectedStar: 'none' };
  sandbox.snipaApplyHitBonus(deadOwner, { snipaDeadeye: false });
  check('hit bonus: dead owner gains nothing', deadOwner.snipaRangeBonusPx === 0);
  const marked = { id: 2, hp: 5000, snipaHyperMarkedById: 1, snipaHyperMarkUntil: 104000 };
  const bullet = { ownerId: 1, damage: 1000 };
  sandbox.snipaApplyHyperMarkDamage(marked, bullet);
  check('hyper mark: +25% damage from the marking Snipa (1000 -> 1250)', bullet.damage === 1250);
  const wrongOwner = { ownerId: 2, damage: 1000 };
  sandbox.snipaApplyHyperMarkDamage(marked, wrongOwner);
  check('hyper mark: no bonus from a different Snipa', wrongOwner.damage === 1000);
  const expired = { id: 2, hp: 5000, snipaHyperMarkedById: 1, snipaHyperMarkUntil: 99000 };
  const stale = { ownerId: 1, damage: 1000 };
  sandbox.snipaApplyHyperMarkDamage(expired, stale);
  check('hyper mark: no bonus once expired', stale.damage === 1000);
} catch (e) { failures.push('hit-bonus vm block threw: ' + e.message); }

// --- executed: G1/G2 + main fire + death reset ---
try {
  let nowValue = 100000;
  const floating = [];
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getScaledStats: () => ({ dmg: 900, hp: 5200, speed: 260 }),
    getSelectedBrawlerLevel: () => 11,
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    staticsteinDonorTag: () => ({}),
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    bullets: [],
    player: null,
    bots: [],
    SNIPA_ENABLED: true,
    SNIPA_TILE_PX: 48,
    SNIPA_MAIN_SPEED: 1500,
    SNIPA_MAIN_BASE_RANGE: 729.6,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_G2_RANGE_BONUS_TILES: 3,
    SNIPA_G2_DURATION_MS: 5000,
    SNIPA_G1_DAMAGE_MULT: 1.5,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaLevelFor') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaEffectiveRange') + '\n' +
    extractFn(game, 'fireSnipaMain') + '\n' +
    extractFn(game, 'executeSnipaG1') + '\n' +
    extractFn(game, 'executeSnipaG2'),
    sandbox);
  const shooter = { id: 1, hp: 5200, snipaRangeBonusPx: 0, selectedStar: 'none', x: 0, y: 0, radius: 14 };
  sandbox.player = shooter;
  sandbox.fireSnipaMain(shooter, 0, 500, 0, { isBot: false, now: 100000 });
  check('main: fires a wide blue Longshot (charge projectile)', sandbox.bullets.length === 1 && sandbox.bullets[0].isSnipaLongshot === true && sandbox.bullets[0].isPrimaryChargeProjectile === true);
  check('main: 900 damage at P11, speed 1500, wide hitbox 1.6', sandbox.bullets[0].damage === 900 && sandbox.bullets[0].vx === 1500 && sandbox.bullets[0].hitboxMod === 1.6);
  check('main: maxLife matches range (729.6 / 1500)', near(sandbox.bullets[0].maxLife, 729.6 / 1500));
  sandbox.executeSnipaG1(shooter);
  check('G1: Deadeye arms', shooter.snipaDeadeyeArmed === true);
  sandbox.bullets.length = 0;
  sandbox.fireSnipaMain(shooter, 0, 500, 0, { isBot: false, now: 100000 });
  check('G1: Deadeye shot deals +50% (1350) and is flagged', sandbox.bullets[0].damage === 1350 && sandbox.bullets[0].snipaDeadeye === true);
  check('G1: flag consumed on fire', shooter.snipaDeadeyeArmed === false);
  sandbox.bullets.length = 0;
  sandbox.fireSnipaMain(shooter, 0, 500, 0, { isBot: false, now: 100000 });
  check('main: next shot back to 900', sandbox.bullets[0].damage === 900);
  sandbox.executeSnipaG2(shooter);
  check('G2: Long Lens sets 5s window', shooter.snipaG2Until === 105000);
  check('G2: shows LONG LENS', floating.some((t) => t.includes('LONG LENS')));
} catch (e) { failures.push('gadgets/main vm block threw: ' + e.message); }

// --- executed: Super — mark timing, wall/bush occlusion, volley, fizzle ---
try {
  let nowValue = 100000;
  const floating = [];
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getScaledStats: () => ({ dmg: 900, hp: 5200, speed: 260 }),
    getSelectedBrawlerLevel: () => 11,
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    areAlliedEntities: () => false,
    hasBlinkEyeSight: () => true,
    isEntityInsideBush: () => false,
    getMouseWorld: () => ({ x: 500, y: 0 }),
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    bullets: [],
    player: null,
    bots: [],
    window: {},
    SNIPA_ENABLED: true,
    SNIPA_TILE_PX: 48,
    SNIPA_MAIN_BASE_RANGE: 729.6,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_G2_RANGE_BONUS_TILES: 3,
    SNIPA_G2_DURATION_MS: 5000,
    SNIPA_SUPER_AURA_RADIUS: 600,
    SNIPA_MARK_TIME_MS: 2000,
    SNIPA_VOLLEY_DELAY_MS: 2500,
    SNIPA_VOLLEY_BULLETS_PER_TARGET: 3,
    SNIPA_VOLLEY_SPEED: 2400,
    SNIPA_VOLLEY_DAMAGE_RATIO: 0.6,
    SNIPA_VOLLEY_FULL_MARK_BONUS: 0.5,
    SNIPA_SP2_VOLLEY_BONUS_BULLETS: 1,
    SNIPA_HYPER_MARK_TIME_MS: 1000,
    SNIPA_HYPER_MARK_DMG_MULT: 1.25,
    SNIPA_HYPER_MARK_DURATION_MS: 4000,
    SNIPA_HYPER_MARK_DECAY_PER_S: 0.5,
    SNIPA_HYPER_MARK_CONE_HALF_ANGLE: 0.21,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaLevelFor') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaEffectiveRange') + '\n' +
    extractFn(game, 'isSnipaChanneling') + '\n' +
    extractFn(game, 'snipaClearMarksBy') + '\n' +
    extractFn(game, 'castSnipaSuper') + '\n' +
    extractFn(game, 'fireSnipaVolley') + '\n' +
    extractFn(game, 'updateSnipaSystems'),
    sandbox);
  const snipa = { id: 1, hp: 5200, snipaRangeBonusPx: 48, selectedStar: 'none', x: 0, y: 0, radius: 14, brawler: 'snipa' };
  const enemy = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  const farEnemy = { id: 3, hp: 5000, x: 900, y: 0, radius: 14 };
  sandbox.player = snipa;
  sandbox.bots = [enemy, farEnemy];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  check('super: channel starts, rooted for 2.5s', snipa.snipaChannelUntil === 102500 && snipa.rootUntil === 102500 && sandbox.isSnipaChanneling(snipa, 100000) === true);
  check('super: shows HEADSHOT!', floating.some((t) => t.includes('HEADSHOT!')));
  check('super: re-cast while channeling is ignored', (() => { sandbox.castSnipaSuper(snipa, false, 500, 0); return snipa.snipaChannelUntil === 102500; })());
  sandbox.updateSnipaSystems(1.0);
  check('super: 1s in aura is half marked (0.5)', near(enemy.snipaMarkProgress, 0.5) && enemy.snipaMarkById === 1);
  check('super: enemy outside the 600 aura is not marked', (farEnemy.snipaMarkProgress || 0) === 0);
  nowValue = 101000;
  sandbox.updateSnipaSystems(1.0);
  check('super: 2s in aura is fully marked (1.0)', enemy.snipaMarkProgress === 1);
  nowValue = 102500;
  sandbox.updateSnipaSystems(0.016);
  check('super: volley fires at 2.5s (3 bullets at the marked enemy)', sandbox.bullets.length === 3 && sandbox.bullets.every((b) => b.isSnipaVolley === true && b.snipaVolleyTargetId === 2));
  check('super: fully marked volley bullet is 810 (900 x 0.6 x 1.5)', sandbox.bullets.every((b) => b.damage === 810));
  check('super: volley bullets home at 2400 speed', sandbox.bullets.every((b) => b.homing === true && b.vx > 0 && Math.hypot(b.vx, b.vy) >= 2400 - 1));
  check('super: channel ends after the volley', sandbox.isSnipaChanneling(snipa, 102500) === false);
  check('super: marks clear after the volley', (enemy.snipaMarkProgress || 0) === 0 && enemy.snipaMarkById == null);
  // Partial mark: 1s of marking then volley -> 675 per bullet (900 x 0.6 x 1.25).
  sandbox.bullets.length = 0;
  nowValue = 200000;
  const enemy2 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy2];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  sandbox.updateSnipaSystems(1.0);
  nowValue = 202500;
  sandbox.updateSnipaSystems(0.016);
  check('super: half-marked volley bullet is 675 (900 x 0.6 x 1.25)', sandbox.bullets.length === 3 && sandbox.bullets.every((b) => b.damage === 675));
  // SP2: 4 bullets per marked enemy.
  sandbox.bullets.length = 0;
  nowValue = 300000;
  snipa.selectedStar = 'long';
  const enemy3 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy3];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  sandbox.updateSnipaSystems(2.0);
  nowValue = 302500;
  sandbox.updateSnipaSystems(0.016);
  check('super: SP2 fires 4 bullets per marked enemy', sandbox.bullets.length === 4);
  snipa.selectedStar = 'none';
  // Wall occlusion: no line of sight -> no mark.
  sandbox.hasBlinkEyeSight = () => false;
  sandbox.bullets.length = 0;
  nowValue = 400000;
  const enemy4 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy4];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  sandbox.updateSnipaSystems(2.0);
  check('super: wall blocks marking (no line of sight)', (enemy4.snipaMarkProgress || 0) === 0);
  sandbox.bullets.length = 0;
  nowValue = 402500;
  sandbox.updateSnipaSystems(0.016);
  check('super: no volley when nobody is marked', sandbox.bullets.length === 0);
  // Bush: hidden in a bush -> no mark on a normal channel.
  sandbox.hasBlinkEyeSight = () => true;
  sandbox.isEntityInsideBush = () => true;
  nowValue = 500000;
  const enemy5 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy5];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  sandbox.updateSnipaSystems(2.0);
  check('super: bush hides the enemy from a normal channel', (enemy5.snipaMarkProgress || 0) === 0);
  // Hyper channel: marks through the wall AND the bush.
  nowValue = 600000;
  const enemy6 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy6];
  sandbox.hasBlinkEyeSight = () => false;
  sandbox.castSnipaSuper(snipa, true, 500, 0);
  check('super: hyper channel flagged', snipa.snipaChannelHyper === true);
  sandbox.updateSnipaSystems(2.0);
  check('super: hyper marks through wall + bush', enemy6.snipaMarkProgress === 1);
  sandbox.hasBlinkEyeSight = () => true;
  sandbox.isEntityInsideBush = () => false;
  // Death mid-channel fizzles: marks clear, range bonus resets.
  nowValue = 700000;
  snipa.snipaRangeBonusPx = 48;
  const enemy7 = { id: 2, hp: 5000, x: 300, y: 0, radius: 14 };
  sandbox.bots = [enemy7];
  sandbox.castSnipaSuper(snipa, false, 500, 0);
  sandbox.updateSnipaSystems(1.0);
  check('super: mark building before death', near(enemy7.snipaMarkProgress, 0.5));
  snipa.hp = 0;
  sandbox.updateSnipaSystems(0.016);
  check('super: death fizzles the channel', sandbox.isSnipaChanneling(snipa, 700000) === false);
  check('super: death clears the marks', (enemy7.snipaMarkProgress || 0) === 0 && enemy7.snipaMarkById == null);
  check('super: death resets the range bonus', snipa.snipaRangeBonusPx === 0);
  snipa.hp = 5200;
} catch (e) { failures.push('super vm block threw: ' + e.message); }

// --- executed: Hyper reticle marking ---
try {
  let nowValue = 100000;
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getScaledStats: () => ({ dmg: 900, hp: 5200, speed: 260 }),
    getSelectedBrawlerLevel: () => 11,
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    areAlliedEntities: () => false,
    hasBlinkEyeSight: () => true,
    isEntityInsideBush: () => false,
    getMouseWorld: () => ({ x: 500, y: 0 }),
    spawnFloatingText: () => {},
    bullets: [],
    player: null,
    bots: [],
    window: {},
    selectedBrawler: 'snipa',
    SNIPA_ENABLED: true,
    SNIPA_TILE_PX: 48,
    SNIPA_MAIN_BASE_RANGE: 729.6,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_G2_RANGE_BONUS_TILES: 3,
    SNIPA_G2_DURATION_MS: 5000,
    SNIPA_SUPER_AURA_RADIUS: 600,
    SNIPA_MARK_TIME_MS: 2000,
    SNIPA_VOLLEY_DELAY_MS: 2500,
    SNIPA_VOLLEY_BULLETS_PER_TARGET: 3,
    SNIPA_VOLLEY_SPEED: 2400,
    SNIPA_VOLLEY_DAMAGE_RATIO: 0.6,
    SNIPA_VOLLEY_FULL_MARK_BONUS: 0.5,
    SNIPA_SP2_VOLLEY_BONUS_BULLETS: 1,
    SNIPA_HYPER_MARK_TIME_MS: 1000,
    SNIPA_HYPER_MARK_DMG_MULT: 1.25,
    SNIPA_HYPER_MARK_DURATION_MS: 4000,
    SNIPA_HYPER_MARK_DECAY_PER_S: 0.5,
    SNIPA_HYPER_MARK_CONE_HALF_ANGLE: 0.21,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaLevelFor') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaEffectiveRange') + '\n' +
    extractFn(game, 'isSnipaChanneling') + '\n' +
    extractFn(game, 'snipaClearMarksBy') + '\n' +
    extractFn(game, 'updateSnipaSystems'),
    sandbox);
  const snipa = { id: 1, hp: 5200, snipaRangeBonusPx: 0, selectedStar: 'none', x: 0, y: 0, radius: 14, brawler: 'snipa', _hyperTest: true };
  const ahead = { id: 2, hp: 5000, x: 400, y: 0, radius: 14 };
  const aside = { id: 3, hp: 5000, x: 0, y: 400, radius: 14 };
  const tooFar = { id: 4, hp: 5000, x: 900, y: 0, radius: 14 };
  sandbox.player = snipa;
  sandbox.bots = [ahead, aside, tooFar];
  sandbox.updateSnipaSystems(1.0);
  check('hyper reticle: 1s aimed is fully marked (1.0)', ahead.snipaHyperMarkProgress === 1 && ahead.snipaHyperMarkedById === 1);
  check('hyper reticle: mark lasts 4s from the aim', ahead.snipaHyperMarkUntil === 104000);
  check('hyper reticle: enemy off to the side is not marked', (aside.snipaHyperMarkProgress || 0) === 0);
  check('hyper reticle: enemy beyond range is not marked', (tooFar.snipaHyperMarkProgress || 0) === 0);
  // Aim away: the mark decays 0.5/s.
  sandbox.getMouseWorld = () => ({ x: 0, y: 500 });
  sandbox.updateSnipaSystems(1.0);
  check('hyper reticle: looking away decays the mark (1.0 -> 0.5)', near(ahead.snipaHyperMarkProgress, 0.5));
  // Mark expires 4s after the last aim refresh.
  nowValue = 108001;
  sandbox.updateSnipaSystems(0.016);
  check('hyper reticle: mark expires after 4s', (ahead.snipaHyperMarkProgress || 0) === 0 && ahead.snipaHyperMarkedById == null);
  // Not hypercharged: no reticle marking at all.
  snipa._hyperTest = false;
  nowValue = 200000;
  sandbox.getMouseWorld = () => ({ x: 500, y: 0 });
  const ahead2 = { id: 2, hp: 5000, x: 400, y: 0, radius: 14 };
  sandbox.bots = [ahead2];
  sandbox.updateSnipaSystems(2.0);
  check('hyper reticle: no marking when not Hypercharged', (ahead2.snipaHyperMarkProgress || 0) === 0);
} catch (e) { failures.push('hyper reticle vm block threw: ' + e.message); }

// --- executed: projectile + aura + mark-circle + telegraph art (stub canvas) ---
try {
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getMouseWorld: () => ({ x: 500, y: 100 }),
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    player: { id: 1, brawler: 'snipa', hp: 5200, snipaRangeBonusPx: 0, x: 100, y: 100, radius: 14 },
    bots: [],
    selectedBrawler: 'snipa',
    cubes: [],
    destructibleWalls: [],
    SNIPA_VISUALS_ENABLED: true,
    SNIPA_TILE_PX: 48,
    SNIPA_MAIN_BASE_RANGE: 729.6,
    SNIPA_RANGE_BONUS_PER_HIT_TILES: 0.5,
    SNIPA_RANGE_BONUS_MAX_TILES: 3,
    SNIPA_RANGE_BONUS_PER_HIT_PX: 24,
    SNIPA_RANGE_BONUS_MAX_PX: 144,
    SNIPA_SP1_BONUS_PER_HIT_TILES: 0.75,
    SNIPA_G2_RANGE_BONUS_TILES: 3,
    SNIPA_G2_DURATION_MS: 5000,
    SNIPA_SUPER_AURA_RADIUS: 600,
    SNIPA_HYPER_MARK_CONE_HALF_ANGLE: 0.21,
    PANDY_FOCUS_MAX: 100,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'snipaStarChoice') + '\n' +
    extractFn(game, 'snipaHasSP1') + '\n' +
    extractFn(game, 'snipaHasSP2') + '\n' +
    extractFn(game, 'snipaRangeBonusPerHitPx') + '\n' +
    extractFn(game, 'snipaEffectiveRange') + '\n' +
    extractFn(game, 'isSnipaChanneling') + '\n' +
    extractFn(game, 'snipaPointInWall') + '\n' +
    extractFn(game, 'drawSnipaLongshot') + '\n' +
    extractFn(game, 'drawSnipaVolleyBullet') + '\n' +
    extractFn(game, 'renderSnipaEffects') + '\n' +
    extractFn(game, 'drawPandyFocusHudBar'),
    sandbox);
  const s1 = stubCtx();
  sandbox.drawSnipaLongshot(s1.proxy, { vx: 1500, vy: 0, x: 0, y: 0 });
  check('longshot art: blue bullet body', hasFill(s1.sets, '#60a5fa'));
  check('longshot art: wide ellipse (not a dot)', s1.calls.some((c) => c.m === 'ellipse' && c.args[2] === 18 && c.args[3] === 8));
  const s2 = stubCtx();
  sandbox.drawSnipaVolleyBullet(s2.proxy, { vx: 2400, vy: 0, x: 0, y: 0 });
  check('volley art: bright blue dart', hasFill(s2.sets, '#bfdbfe'));
  // Aura: channeling Snipa at (100,100), no walls -> full 600px blue polygon.
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.player = { id: 1, brawler: 'snipa', hp: 5200, snipaRangeBonusPx: 0, x: 100, y: 100, radius: 14, snipaChannelUntil: 102500 };
  sandbox.renderSnipaEffects();
  check('render effects: headshot aura drawn blue', hasFill(s3.sets, 'rgba(59,130,246'));
  check('render effects: aura reaches the full 600 radius with no walls', s3.calls.some((c) => (c.m === 'lineTo' || c.m === 'moveTo') && near(c.args[0], 700) && near(c.args[1], 100, 60)));
  // Mark circle: half-marked enemy shows a half arc.
  const s4 = stubCtx();
  sandbox.ctx = s4.proxy;
  sandbox.player = { id: 1, brawler: 'snipa', hp: 5200, snipaRangeBonusPx: 0, x: 100, y: 100, radius: 14 };
  sandbox.bots = [{ id: 2, hp: 5000, x: 400, y: 100, radius: 14, snipaMarkProgress: 0.5 }];
  sandbox.renderSnipaEffects();
  check('render effects: mark circle drawn blue', s4.sets.some((s) => (s.p === 'strokeStyle' || s.p === 'fillStyle') && String(s.v).includes('#60a5fa')) || hasFill(s4.sets, 'rgba(59,130,246'));
  check('render effects: half mark is a half arc (ends at PI/2)', s4.calls.some((c) => c.m === 'arc' && near(c.args[3], -Math.PI / 2) && near(c.args[4], Math.PI / 2)));
  // Telegraph: player at (100,100), mouse at (500,100) -> aim 0, range 729.6 -> ends (829.6, 100).
  const s5 = stubCtx();
  sandbox.ctx = s5.proxy;
  sandbox.bots = [];
  sandbox.renderSnipaEffects();
  check('render effects: telegraph dashed line drawn', s5.calls.some((c) => c.m === 'setLineDash'));
  check('render effects: telegraph ends at current effective range', s5.calls.some((c) => c.m === 'lineTo' && near(c.args[0], 829.6) && near(c.args[1], 100)));
  // Hyper telegraph: cyan side segments + wedge fill.
  const s6 = stubCtx();
  sandbox.ctx = s6.proxy;
  sandbox.player = { id: 1, brawler: 'snipa', hp: 5200, snipaRangeBonusPx: 0, x: 100, y: 100, radius: 14, _hyperTest: true };
  sandbox.renderSnipaEffects();
  check('render effects: hyper wedge drawn cyan', hasFill(s6.sets, 'rgba(34,211,238') || s6.sets.some((s) => s.p === 'strokeStyle' && String(s.v).includes('#22d3ee')));
  // Pandy Focus HUD bar: gold at max, pink while building, track at 0, label kept.
  const s7 = stubCtx();
  sandbox.drawPandyFocusHudBar(s7.proxy, { hp: 5200, pandyFocus: 100, pandyFocusOn: true, x: 100 }, 200);
  check('focus HUD bar: gold at max', hasFill(s7.sets, '#fbbf24'));
  check('focus HUD bar: sits above ammo (drawY-27, 5 tall)', s7.calls.some((c) => c.m === 'fillRect' && c.args[1] === 173 && c.args[3] === 5));
  check('focus HUD bar: FOCUS MAX label kept', s7.calls.some((c) => c.m === 'fillText' && String(c.args[0]).includes('FOCUS MAX')));
  const s8 = stubCtx();
  sandbox.drawPandyFocusHudBar(s8.proxy, { hp: 5200, pandyFocus: 0, x: 100 }, 200);
  check('focus HUD bar: track visible at 0 Focus (50 x 7)', s8.calls.some((c) => c.m === 'fillRect' && c.args[2] === 50 && c.args[3] === 7));
  const s9 = stubCtx();
  sandbox.drawPandyFocusHudBar(s9.proxy, { hp: 5200, pandyFocus: 50, x: 100 }, 200);
  check('focus HUD bar: pink while building', hasFill(s9.sets, '#f472b6'));
} catch (e) { failures.push('art vm block threw: ' + e.message); }

// --- executed: voice module (silent without audio + RULE ONE scan) ---
try {
  const sandbox = { Math, performance: { now: () => 100000 } };
  vm.createContext(sandbox);
  vm.runInContext(voiceModule, sandbox);
  check('voice: module registers BraweSnipaVoice', !!sandbox.BraweSnipaVoice);
  check('voice: 12 clips across 8 triggers', sandbox.BraweSnipaVoice.fileCount() === 12);
  check('voice: voice TBD (Anthony picks)', sandbox.BraweSnipaVoice.voiceId === 'TBD');
  check('voice: play() degrades silent without Audio (no throw)', sandbox.BraweSnipaVoice.play('attack') === false);
  // RULE ONE: no counts, ranges, damage, or mechanics in any spoken line.
  const banned = ['damage', 'range', 'second', 'meter', 'tile', 'percent', '%', 'focus', 'pierce', 'slow', 'trap', 'gadget', 'star power', 'super', 'hyper', 'cooldown', 'hp', 'speed', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const lines = Object.values(sandbox.BraweSnipaVoice.text);
  check('voice RULE ONE: 12 flavor-only lines, no mechanics words or numbers',
    lines.length === 12 && lines.every((t) => !banned.some((w) => t.toLowerCase().includes(w))));
} catch (e) { failures.push('voice vm block threw: ' + e.message); }

if (failures.length) {
  console.error(`SNIPA FAIL (${passed} passed, ${failures.length} failed):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`SNIPA PASS (${passed} passed, 0 failed)`);
