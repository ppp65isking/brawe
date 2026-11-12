// Pandy regression — Anthony's Piper + Mandy fusion brawler, ordered 2026-11-11
// (builder picks, flagged for his correction).
// Locked design: Epic Damage Dealer (170 souls), 5200 HP / 270 speed, 900
// base main damage. Main Sugarshot: one long-range candy shot whose damage
// grows with distance travelled (1.0x point blank -> 1.8x at max range) and
// with Focus — a 0-100 meter that builds while standing still (40/s, ~2.5s
// to full) and decays while moving (120/s); Focus adds +0.5% damage per
// point (max +50%) and +0.15% range per point (max +15%). Firing does NOT
// consume Focus. Base range 729.6 (balance 2026-11-12: -23.2% from 950).
// Super Candy Cannon: giant piercing shell (+25% size), base = main dmg
// x1.8 (1620 at P11), damage also scales with distance + Focus. Hyper
// Sugar Surge: shots pierce, Focus LOCKS at 100, Super fires 6 radial
// shells with unlimited range, main range +12%, purple visuals, camera
// zooms out (balance 2026-11-12). G1 Sweet Spot
// (14s): Focus instantly to 100. G2 Candy Trap (16s): drop a trap (120px,
// 8s) — first enemy to step on it takes 45% of main damage and is slowed
// 40% for 2s. SP1 Steady Aim: Focus builds 50% faster. SP2 Long Game:
// +20% range and Focus damage bonus is +0.7% per point (max +70%).
// Visuals are DEDICATED branches: sugarshots and candy shells are drawn
// before the universal skin renderer call (PR #48 lesson), never through
// it, and never as dots. Star gates use the STORED keys 'slow' (SP1) /
// 'long' (SP2) — never 'sp1'/'sp2' alone (the Aegis/Nightshade bug).
// Focus bar + trap art are EXECUTED in a vm with a recording stub canvas
// (PR #45 pattern: tests do not run the frame loop, so render helpers
// must be executed directly).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
const voiceModule = fs.readFileSync(new URL('../modules/audio/pandy-voicelines.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source pins
check('kill switch PANDY_ENABLED defaults on', game.includes('let PANDY_ENABLED = true;'));
check('visuals switch PANDY_VISUALS_ENABLED defaults on', game.includes('let PANDY_VISUALS_ENABLED = true;'));
check('roster includes pandy (107 ids)', game.includes("'voodoyou', 'pandy'"));
check('rarity Epic (170 souls)', game.includes("pandy: 'Epic',") && game.includes('Epic: 170'));
check('role Damage Dealer', game.includes("pandy:'Damage Dealer',"));
check('portrait icon present', game.includes("pandy: '🍬',"));
check('stats branch 5200/900/270', game.includes("if (brawlerId === 'pandy') {") && game.includes('hp: Math.round(5200 * hpScale), dmg: Math.round(900 * scale), speed: 270'));
check('super charge 6 hits', game.includes('pandy: 6'));
check('reload 1900ms', game.includes('pandy: 1900,'));
check('fire delay 350ms', game.includes('pandy: 350,'));
check('brawlerData entry present (no coming-soon placeholders)', game.includes("'pandy': {") && game.includes("name: 'Pandy'") && game.includes("attack: 'Sugarshot'") && game.includes("super: 'Candy Cannon'") && game.includes("g1: 'Sweet Spot") && game.includes("g2: 'Candy Trap") && game.includes("sp1: 'Steady Aim") && game.includes("sp2: 'Long Game") && !game.slice(game.indexOf("'pandy': {"), game.indexOf("'pandy': {") + 2600).includes('coming soon'));
check('gadget cooldown map entry', game.includes('pandy: { g1: 14000, g2: 16000 },'));
check('fire branch exists with per-hit charge', game.includes("} else if (brawler === 'pandy') {") && game.includes('firePandyMain(fromEntity, ang, targetX, targetY, { isBot, now, damageMult: 1, hitboxMult: 1, donorMode: false })') && game.includes('isPandySugarshot: true, isPrimaryChargeProjectile: true'));
check('sugarshot + shell branches sit BEFORE the universal skin call (no interception)',
  game.indexOf('if (b.isPandySugarshot) {') > 0 &&
  game.indexOf('if (b.isPandySugarshot) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;') &&
  game.indexOf('if (b.isPandyCandyShell) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branches draw dedicated art then continue',
  game.includes('drawPandySugarshot(ctx, b);') && game.includes('drawPandyCandyShell(ctx, b);'));
check('bullet update recomputes damage from distance travelled', game.includes('if (b.isPandySugarshot || b.isPandyCandyShell) {') && game.includes('pandyDistanceDamageMult(dist, b.pandyRange'));
check('player super dispatch', game.includes("if (combatBrawler === 'pandy') { castPandySuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'pandy') { castPandySuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch (G1 + G2, per-brawler cooldowns)', game.includes("curBrawler === 'pandy' && curGadget === 'g1'") && game.includes("curBrawler === 'pandy' && curGadget === 'g2'") && game.includes('getGadgetCooldownMsForBrawler(curBrawler, curGadget)'));
check('bot gadget dispatch (G1 + G2)', game.includes("bot.brawler === 'pandy' && g === 'g1'") && game.includes("bot.brawler === 'pandy' && g === 'g2'"));
check('bot super range gate is candy shell range', game.includes("if (bot.brawler === 'pandy') return distance < PANDY_SUPER_RANGE;"));
check('update loop calls updatePandySystems', game.includes('if (playing && !gameOver) updatePandySystems(dt);'));
check('render calls renderPandyEffects', game.includes('    renderPandyEffects();'));
check('portrait body-art branch (candy)', game.includes("if (brawlerId === 'pandy') {"));
check('slow hook for G2 candy trap', game.includes('if (now < (entity.pandyTrapSlowUntil || 0)) baseSlow = Math.min(baseSlow, PANDY_TRAP_SLOW_MULT);'));
check('constants: focus 40/s build / 120/s decay / +0.5% per point / 1.8x distance', game.includes('const PANDY_FOCUS_BUILD_PER_S = 40;') && game.includes('const PANDY_FOCUS_DECAY_PER_S = 120;') && game.includes('const PANDY_FOCUS_DAMAGE_PER_POINT = 0.005;') && game.includes('const PANDY_DISTANCE_DAMAGE_MAX_MULT = 1.8;'));
check('SP constants: SP1 1.5x build / SP2 1.2x range / +0.7% per point', game.includes('const PANDY_SP1_BUILD_MULT = 1.5;') && game.includes('const PANDY_SP2_RANGE_MULT = 1.2;') && game.includes('const PANDY_FOCUS_DAMAGE_PER_POINT_SP2 = 0.007;'));
check('super constants: 1000 speed / 1100 range / x1.8 damage', game.includes('const PANDY_SUPER_SPEED = 1000;') && game.includes('const PANDY_SUPER_RANGE = 1100;') && game.includes('const PANDY_SUPER_DAMAGE_MULT = 1.8;'));
check('trap constants: 120 radius / 8s / 45% damage / 40% slow 2s', game.includes('const PANDY_TRAP_RADIUS = 120;') && game.includes('const PANDY_TRAP_DURATION_MS = 8000;') && game.includes('const PANDY_TRAP_DAMAGE_RATIO = 0.45;') && game.includes('const PANDY_TRAP_SLOW_MULT = 0.60;'));
check('hyper: pierce + focus locked at 100 (2x build retired)', game.includes('pierce: pandyHyper, ownerId: fromEntity.id') && game.includes('// Balance 2026-11-12: Hyper LOCKS Focus at 100 for the whole Hyper'));
check('balance 2026-11-12: base range 729.6 (-23.2%)', game.includes('const PANDY_SUGARSHOT_BASE_RANGE = 729.6;'));
check('balance: super size +25% constant', game.includes('const PANDY_SUPER_SIZE_MULT = 1.25;'));
check('balance: hyper super fires 6 radial shells', game.includes('const PANDY_HYPER_SUPER_COUNT = 6;') && game.includes('for (let i = 0; i < PANDY_HYPER_SUPER_COUNT; i++) fireShell((i * Math.PI * 2) / PANDY_HYPER_SUPER_COUNT);'));
check('balance: hyper radial shells +30% size', game.includes('const PANDY_HYPER_SUPER_SIZE_MULT = 1.3;'));
check('balance: hyper super unlimited maxLife', game.includes('const PANDY_HYPER_SUPER_MAX_LIFE = 120;'));
check('balance: hyper main range +12%', game.includes('const PANDY_HYPER_RANGE_MULT = 1.12;') && game.includes('PANDY_HYPER_RANGE_MULT : 1'));
check('balance: hyper camera zoom 0.72', game.includes('const PANDY_HYPER_CAMERA_ZOOM = 0.72;'));
check('balance: off-map kill for unlimited shells', game.includes('if (b.pandyUnlimitedRange && (b.x < -60 || b.x > WORLD_W + 60 || b.y < -60 || b.y > WORLD_H + 60))'));
check('balance: telegraph in renderPandyEffects', game.includes('const teleRange = pandyEffectiveRange(player);') && game.includes("ctx.setLineDash([14, 10]);"));
check('balance: purple hyper aura in renderPandyEffects', game.includes('// Balance 2026-11-12: Hyper purple aura') && game.includes("ctx.fillStyle = '#a855f7';"));
check('balance: camera zoom lerps in render()', game.includes('const pandyHyperZoomed = !!player && player.hp > 0 && selectedBrawler ===') && game.includes('CAMERA_ZOOM += (targetZoom - CAMERA_ZOOM) * Math.min(1, zoomDt * 5);'));
check('balance: camera zoom is mutable (base 0.90)', game.includes('const CAMERA_ZOOM_BASE = 0.90;') && game.includes('let CAMERA_ZOOM = CAMERA_ZOOM_BASE;'));
check('SP gates use stored keys slow/long (never sp1/sp2 alone)',
  game.includes("function pandyHasSP1(entity) { const c = pandyStarChoice(entity); return c === 'slow' || c === 'sp1'; }") &&
  game.includes("function pandyHasSP2(entity) { const c = pandyStarChoice(entity); return c === 'long' || c === 'sp2'; }"));
check('voice module registered in bootstrap', bootstrap.includes("'./modules/audio/pandy-voicelines.js'"));
check('voice hooks: attack + kill + super + watcher', game.includes("BrawePandyVoice?.play('attack')") && game.includes("BrawePandyVoice?.play('kill')") && game.includes("BrawePandyVoice?.play('super')") && game.includes('updatePandyVoiceState();'));

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

// --- executed: distance + focus math + SP gates (stored keys slow/long) ---
try {
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    isEntityHyperchargedNow: () => false,
    PANDY_SUGARSHOT_BASE_RANGE: 729.6,
    PANDY_DISTANCE_DAMAGE_MAX_MULT: 1.8,
    PANDY_FOCUS_MAX: 100,
    PANDY_FOCUS_DAMAGE_PER_POINT: 0.005,
    PANDY_FOCUS_DAMAGE_PER_POINT_SP2: 0.007,
    PANDY_FOCUS_RANGE_PER_POINT: 0.0015,
    PANDY_SP2_RANGE_MULT: 1.2,
    PANDY_HYPER_RANGE_MULT: 1.12,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'pandyStarChoice') + '\n' +
    extractFn(game, 'pandyHasSP1') + '\n' +
    extractFn(game, 'pandyHasSP2') + '\n' +
    extractFn(game, 'pandyFocusDamagePerPoint') + '\n' +
    extractFn(game, 'pandyRangeMult') + '\n' +
    extractFn(game, 'pandyFocusDamageMult') + '\n' +
    extractFn(game, 'pandyEffectiveRange') + '\n' +
    extractFn(game, 'pandyDistanceDamageMult'),
    sandbox);
  check('distance: 0px travelled is 1.0x', near(sandbox.pandyDistanceDamageMult(0, 729.6), 1.0));
  check('distance: half range is 1.4x', near(sandbox.pandyDistanceDamageMult(364.8, 729.6), 1.4));
  check('distance: full range is 1.8x', near(sandbox.pandyDistanceDamageMult(729.6, 729.6), 1.8));
  check('distance: beyond range clamps at 1.8x', near(sandbox.pandyDistanceDamageMult(2000, 729.6), 1.8));
  check('focus: 0 focus is +0% (mult 1.0)', near(sandbox.pandyFocusDamageMult({ pandyFocus: 0 }), 1.0));
  check('focus: 50 focus is +25% (mult 1.25)', near(sandbox.pandyFocusDamageMult({ pandyFocus: 50 }), 1.25));
  check('focus: 100 focus is +50% (mult 1.5)', near(sandbox.pandyFocusDamageMult({ pandyFocus: 100 }), 1.5));
  check('focus: SP2 100 focus is +70% (mult 1.7)', near(sandbox.pandyFocusDamageMult({ pandyFocus: 100, selectedStar: 'long' }), 1.7));
  check('focus: SP1 does not change damage bonus', near(sandbox.pandyFocusDamageMult({ pandyFocus: 100, selectedStar: 'slow' }), 1.5));
  check('range: 0 focus is 729.6', near(sandbox.pandyEffectiveRange({ pandyFocus: 0 }), 729.6));
  check('range: 100 focus is 729.6 x 1.15 = 839.04', near(sandbox.pandyEffectiveRange({ pandyFocus: 100 }), 839.04));
  check('range: SP2 0 focus is 729.6 x 1.2 = 875.52', near(sandbox.pandyEffectiveRange({ pandyFocus: 0, selectedStar: 'long' }), 875.52));
  check('range: SP2 100 focus is 875.52 x 1.15 = 1006.848', near(sandbox.pandyEffectiveRange({ pandyFocus: 100, selectedStar: 'long' }), 1006.848));
  check('combined max: 900 x 1.8 x 1.5 = 2430 at max range + full focus', Math.round(900 * sandbox.pandyDistanceDamageMult(729.6, 729.6) * sandbox.pandyFocusDamageMult({ pandyFocus: 100 })) === 2430);
  check('SP1 gate: stored slow is true', sandbox.pandyHasSP1({ selectedStar: 'slow' }) === true);
  check('SP1 gate: stored long is false', sandbox.pandyHasSP1({ selectedStar: 'long' }) === false);
  check('SP1 gate: no star is false', sandbox.pandyHasSP1({ selectedStar: 'none' }) === false);
  check('SP2 gate: stored long is true', sandbox.pandyHasSP2({ selectedStar: 'long' }) === true);
  check('SP2 gate: stored slow is false', sandbox.pandyHasSP2({ selectedStar: 'slow' }) === false);
  check('SP2 gate: no star is false', sandbox.pandyHasSP2({ selectedStar: 'none' }) === false);
} catch (e) { failures.push('distance/focus vm block threw: ' + e.message); }

// --- executed: Hyper +12% main range (balance 2026-11-12) ---
try {
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    isEntityHyperchargedNow: () => true,
    PANDY_SUGARSHOT_BASE_RANGE: 729.6,
    PANDY_DISTANCE_DAMAGE_MAX_MULT: 1.8,
    PANDY_FOCUS_MAX: 100,
    PANDY_FOCUS_DAMAGE_PER_POINT: 0.005,
    PANDY_FOCUS_DAMAGE_PER_POINT_SP2: 0.007,
    PANDY_FOCUS_RANGE_PER_POINT: 0.0015,
    PANDY_SP2_RANGE_MULT: 1.2,
    PANDY_HYPER_RANGE_MULT: 1.12,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'pandyStarChoice') + '\n' +
    extractFn(game, 'pandyHasSP1') + '\n' +
    extractFn(game, 'pandyHasSP2') + '\n' +
    extractFn(game, 'pandyFocusDamagePerPoint') + '\n' +
    extractFn(game, 'pandyRangeMult') + '\n' +
    extractFn(game, 'pandyFocusDamageMult') + '\n' +
    extractFn(game, 'pandyEffectiveRange') + '\n' +
    extractFn(game, 'pandyDistanceDamageMult'),
    sandbox);
  check('hyper range: 0 focus is 729.6 x 1.12 = 817.152', near(sandbox.pandyEffectiveRange({ pandyFocus: 0 }), 817.152));
  check('hyper range: 100 focus is 729.6 x 1.15 x 1.12 = 939.7248', near(sandbox.pandyEffectiveRange({ pandyFocus: 100 }), 939.7248));
  check('hyper range: SP2 100 focus is 729.6 x 1.2 x 1.15 x 1.12 = 1127.66976', near(sandbox.pandyEffectiveRange({ pandyFocus: 100, selectedStar: 'long' }), 1127.66976));
} catch (e) { failures.push('hyper range vm block threw: ' + e.message); }

// --- executed: G1 + G2 + focus build/decay + trap trigger ---
try {
  let nowValue = 100000;
  const floating = [];
  const hits = [];
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getScaledStats: () => ({ dmg: 900, hp: 5200, speed: 270 }),
    getSelectedBrawlerLevel: () => 11,
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    areAlliedEntities: (a, t) => a.id === 1 && t.id === 5, // id 5 is the owner's ally
    checkHit: (target, b) => { hits.push({ id: target.id, dmg: b.damage }); return true; },
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    explosions: [],
    pandyTraps: [],
    player: null,
    bots: [],
    PANDY_ENABLED: true,
    PANDY_FOCUS_MAX: 100,
    PANDY_FOCUS_BUILD_PER_S: 40,
    PANDY_FOCUS_DECAY_PER_S: 120,
    PANDY_FOCUS_DAMAGE_PER_POINT: 0.005,
    PANDY_FOCUS_DAMAGE_PER_POINT_SP2: 0.007,
    PANDY_FOCUS_RANGE_PER_POINT: 0.0015,
    PANDY_SP1_BUILD_MULT: 1.5,
    PANDY_SP2_RANGE_MULT: 1.2,
    PANDY_HYPER_FOCUS_BUILD_MULT: 2,
    PANDY_TRAP_RADIUS: 120,
    PANDY_TRAP_DURATION_MS: 8000,
    PANDY_TRAP_DAMAGE_RATIO: 0.45,
    PANDY_TRAP_SLOW_DURATION_MS: 2000,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'pandyStarChoice') + '\n' +
    extractFn(game, 'pandyHasSP1') + '\n' +
    extractFn(game, 'pandyHasSP2') + '\n' +
    extractFn(game, 'pandyFocusDamagePerPoint') + '\n' +
    extractFn(game, 'pandyRangeMult') + '\n' +
    extractFn(game, 'pandyLevelFor') + '\n' +
    extractFn(game, 'executePandyG1') + '\n' +
    extractFn(game, 'executePandyG2') + '\n' +
    extractFn(game, 'updatePandySystems'),
    sandbox);
  const owner = { id: 1, hp: 5200, pandyFocus: 30, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy' };
  sandbox.player = owner;
  sandbox.bots = [];
  sandbox.executePandyG1(owner);
  check('G1: Sweet Spot sets Focus to 100', owner.pandyFocus === 100);
  check('G1: shows SWEET SPOT', floating.some((t) => t.includes('SWEET SPOT')));
  sandbox.executePandyG2(owner);
  check('G2: Candy Trap drops at owner feet', sandbox.pandyTraps.length === 1 && sandbox.pandyTraps[0].x === 0 && sandbox.pandyTraps[0].y === 0 && sandbox.pandyTraps[0].until === 108000);
  check('G2: shows CANDY TRAP SET', floating.some((t) => t.includes('CANDY TRAP SET')));
  // Focus: standing still 1s builds +40 (SP1 would be +60).
  const still = { id: 1, hp: 5200, pandyFocus: 10, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: 0, pandyLastY: 0 };
  sandbox.player = still;
  sandbox.pandyTraps = [];
  sandbox.updatePandySystems(1.0);
  check('focus: standing still 1s builds +40', near(still.pandyFocus, 50));
  // Focus: moving 1s decays -120 (clamped at 0).
  const mover = { id: 1, hp: 5200, pandyFocus: 50, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: -100, pandyLastY: 0 };
  sandbox.player = mover;
  sandbox.updatePandySystems(1.0);
  check('focus: moving 1s decays to 0 (50 - 120 clamped)', mover.pandyFocus === 0);
  // Focus: SP1 builds 50% faster (+60/s).
  const sp1 = { id: 1, hp: 5200, pandyFocus: 0, selectedStar: 'slow', x: 0, y: 0, brawler: 'pandy', pandyLastX: 0, pandyLastY: 0 };
  sandbox.player = sp1;
  sandbox.updatePandySystems(1.0);
  check('focus: SP1 standing still 1s builds +60', near(sp1.pandyFocus, 60));
  // Focus: death resets to 0.
  const dead = { id: 1, hp: 0, pandyFocus: 80, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: 0, pandyLastY: 0 };
  sandbox.player = dead;
  sandbox.updatePandySystems(0.5);
  check('focus: death resets Focus to 0', dead.pandyFocus === 0);
  // Hyper: Focus LOCKS at 100 even while moving (balance 2026-11-12).
  const hyperMover = { id: 1, hp: 5200, pandyFocus: 50, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: -100, pandyLastY: 0, _hyperTest: true };
  sandbox.player = hyperMover;
  sandbox.updatePandySystems(1.0);
  check('hyper: moving 1s keeps Focus locked at 100', hyperMover.pandyFocus === 100 && hyperMover.pandyFocusOn === true);
  // Hyper: purple trail particle spawns while Hyper.
  check('hyper: purple trail particle spawns', sandbox.explosions.some((p) => p.isParticle && (p.color === '#c084fc' || p.color === '#a855f7')));
  // Focus ON/OFF: reaching 100 turns ON, draining to 0 turns OFF.
  const toMax = { id: 1, hp: 5200, pandyFocus: 60, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: 0, pandyLastY: 0 };
  sandbox.player = toMax;
  sandbox.updatePandySystems(1.0);
  check('focus: reaching 100 turns Focus ON', toMax.pandyFocus === 100 && toMax.pandyFocusOn === true);
  const toZero = { id: 1, hp: 5200, pandyFocus: 50, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: -100, pandyLastY: 0, pandyFocusOn: true };
  sandbox.player = toZero;
  sandbox.updatePandySystems(1.0);
  check('focus: draining to 0 turns Focus OFF', toZero.pandyFocus === 0 && toZero.pandyFocusOn === false);
  // G1 sets the ON flag too.
  const g1ent = { id: 1, hp: 5200, pandyFocus: 0, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy' };
  sandbox.executePandyG1(g1ent);
  check('G1: Focus ON flag set', g1ent.pandyFocusOn === true);
  // Death clears the ON flag.
  const deadHyper = { id: 1, hp: 0, pandyFocus: 100, pandyFocusOn: true, selectedStar: 'none', x: 0, y: 0, brawler: 'pandy', pandyLastX: 0, pandyLastY: 0, _hyperTest: true };
  sandbox.player = deadHyper;
  sandbox.updatePandySystems(0.5);
  check('focus: death clears Focus ON flag', deadHyper.pandyFocus === 0 && deadHyper.pandyFocusOn === false);
  // Trap: enemy steps on it -> 405 damage (45% of 900) + slow, trap consumed.
  sandbox.executePandyG2(owner);
  const enemy = { id: 2, hp: 5000, x: 50, y: 0 };
  sandbox.player = owner;
  sandbox.bots = [enemy];
  nowValue = 100000;
  sandbox.updatePandySystems(0.016);
  check('trap: enemy in radius takes 405 damage', hits.some((h) => h.id === 2 && h.dmg === 405));
  check('trap: victim slowed 40% for 2s', enemy.pandyTrapSlowUntil === 102000);
  check('trap: consumed after triggering', sandbox.pandyTraps.length === 0);
  check('trap: shows CANDY TRAP!', floating.some((t) => t.includes('CANDY TRAP!')));
  // Trap: ally never triggers it.
  sandbox.executePandyG2(owner);
  const ally = { id: 5, hp: 5000, x: 50, y: 0 };
  sandbox.bots = [ally];
  hits.length = 0;
  sandbox.updatePandySystems(0.016);
  check('trap: ally does not trigger it', hits.length === 0 && sandbox.pandyTraps.length === 1);
  // Trap: dummy never triggers it.
  const dummy = { id: 6, hp: 5000, isDummy: true, x: 50, y: 0 };
  sandbox.bots = [dummy];
  sandbox.updatePandySystems(0.016);
  check('trap: dummy does not trigger it', hits.length === 0 && sandbox.pandyTraps.length === 1);
  // Trap: expires after 8s without triggering.
  nowValue = 109000;
  sandbox.updatePandySystems(0.016);
  check('trap: expires after 8s', sandbox.pandyTraps.length === 0);
} catch (e) { failures.push('gadgets/trap vm block threw: ' + e.message); }

// --- executed: projectile + focus-bar art (stub canvas) ---
try {
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getMouseWorld: () => ({ x: 500, y: 100 }),
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    player: { id: 1, brawler: 'pandy', hp: 5200, pandyFocus: 100, x: 100, y: 100, radius: 14 },
    bots: [],
    selectedBrawler: 'pandy',
    pandyTraps: [{ x: 200, y: 200, radius: 120, until: 200000 }],
    PANDY_VISUALS_ENABLED: true,
    PANDY_FOCUS_MAX: 100,
    PANDY_SUGARSHOT_BASE_RANGE: 729.6,
    PANDY_FOCUS_RANGE_PER_POINT: 0.0015,
    PANDY_SP2_RANGE_MULT: 1.2,
    PANDY_HYPER_RANGE_MULT: 1.12,
    PANDY_SUPER_SIZE_MULT: 1.25,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'pandyStarChoice') + '\n' +
    extractFn(game, 'pandyHasSP1') + '\n' +
    extractFn(game, 'pandyHasSP2') + '\n' +
    extractFn(game, 'pandyRangeMult') + '\n' +
    extractFn(game, 'pandyEffectiveRange') + '\n' +
    extractFn(game, 'drawPandySugarshot') + '\n' +
    extractFn(game, 'drawPandyCandyShell') + '\n' +
    extractFn(game, 'renderPandyEffects'),
    sandbox);
  const s1 = stubCtx();
  sandbox.drawPandySugarshot(s1.proxy, { vx: 1400, vy: 0, x: 0, y: 0 });
  check('sugarshot art: pink candy body', hasFill(s1.sets, '#f472b6'));
  check('sugarshot art: round candy (arc ~10)', hasArcIn(s1.calls, 9, 11));
  const s2 = stubCtx();
  sandbox.drawPandyCandyShell(s2.proxy, { vx: 1000, vy: 0, x: 0, y: 0 });
  check('candy shell art: gold shell body', hasFill(s2.sets, '#fbbf24'));
  check('candy shell art: +25% size (arc ~21.25)', hasArcIn(s2.calls, 20, 23));
  const s2h = stubCtx();
  sandbox.drawPandyCandyShell(s2h.proxy, { vx: 1000, vy: 0, x: 0, y: 0, hyperVisual: true, pandyShellScale: 1.625 });
  check('hyper shell art: +30% again (arc ~27.6) and purple', hasArcIn(s2h.calls, 26, 29) && hasFill(s2h.sets, '#c084fc'));
  const s3 = stubCtx();
  sandbox.ctx = s3.proxy;
  sandbox.renderPandyEffects();
  check('render effects: trap drawn pink', hasFill(s3.sets, '#f472b6'));
  check('render effects: focus bar drawn gold at max', hasFill(s3.sets, '#fbbf24'));
  // Telegraph: player at (100,100), focus 100, mouse at (500,100) -> aim 0°,
  // range 729.6 x 1.15 = 839.04 -> line ends at (939.04, 100).
  check('render effects: telegraph dashed line drawn', s3.calls.some((c) => c.m === 'setLineDash'));
  check('render effects: telegraph ends at current effective range', s3.calls.some((c) => c.m === 'lineTo' && near(c.args[0], 939.04) && near(c.args[1], 100)));
  // Focus bar track is drawn even at 0 Focus (empty track, 46 wide).
  const s3b = stubCtx();
  sandbox.ctx = s3b.proxy;
  sandbox.player = { id: 1, brawler: 'pandy', hp: 5200, pandyFocus: 0, x: 100, y: 100, radius: 14 };
  sandbox.renderPandyEffects();
  check('render effects: focus bar track visible at 0 Focus', s3b.calls.some((c) => c.m === 'fillRect' && c.args[2] === 46 && c.args[3] === 7));
  // Purple hyper aura around a hypercharged Pandy.
  const s3h = stubCtx();
  sandbox.ctx = s3h.proxy;
  sandbox.player = { id: 1, brawler: 'pandy', hp: 5200, pandyFocus: 100, x: 100, y: 100, radius: 14, _hyperTest: true };
  sandbox.renderPandyEffects();
  check('render effects: hyper purple aura drawn', hasFill(s3h.sets, '#a855f7'));
} catch (e) { failures.push('art vm block threw: ' + e.message); }

// --- executed: super — normal shell vs Hyper radial x6 (balance 2026-11-12) ---
try {
  const floating = [];
  const sandbox = {
    Math,
    clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
    performance: { now: () => 100000 },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    getScaledStats: () => ({ dmg: 900, hp: 5200, speed: 270 }),
    getSelectedBrawlerLevel: () => 11,
    isEntityHyperchargedNow: (e) => !!e._hyperTest,
    spawnFloatingText: (x, y, t) => { floating.push(t); },
    bullets: [],
    player: { id: 1, brawler: 'pandy', hp: 5200, pandyFocus: 0, x: 0, y: 0, radius: 14 },
    window: {},
    PANDY_ENABLED: true,
    PANDY_FOCUS_MAX: 100,
    PANDY_FOCUS_DAMAGE_PER_POINT: 0.005,
    PANDY_FOCUS_DAMAGE_PER_POINT_SP2: 0.007,
    PANDY_FOCUS_RANGE_PER_POINT: 0.0015,
    PANDY_SP2_RANGE_MULT: 1.2,
    PANDY_SUPER_SPEED: 1000,
    PANDY_SUPER_RANGE: 1100,
    PANDY_SUPER_DAMAGE_MULT: 1.8,
    PANDY_SUPER_SIZE_MULT: 1.25,
    PANDY_HYPER_SUPER_COUNT: 6,
    PANDY_HYPER_SUPER_SIZE_MULT: 1.3,
    PANDY_HYPER_SUPER_MAX_LIFE: 120,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'pandyStarChoice') + '\n' +
    extractFn(game, 'pandyHasSP1') + '\n' +
    extractFn(game, 'pandyHasSP2') + '\n' +
    extractFn(game, 'pandyFocusDamagePerPoint') + '\n' +
    extractFn(game, 'pandyRangeMult') + '\n' +
    extractFn(game, 'pandyFocusDamageMult') + '\n' +
    extractFn(game, 'pandyLevelFor') + '\n' +
    extractFn(game, 'castPandySuper'),
    sandbox);
  // Normal super: one shell, +25% size (hitboxMod 2.0), 1620 damage at P11.
  const solo = { id: 1, hp: 5200, pandyFocus: 0, selectedStar: 'none', x: 0, y: 0, radius: 14 };
  sandbox.castPandySuper(solo, false, 100, 0);
  check('super: normal fires exactly 1 shell', sandbox.bullets.length === 1);
  const shell = sandbox.bullets[0];
  check('super: normal shell +25% size (hitboxMod 2.0, scale 1.25)', shell.hitboxMod === 2.0 && shell.pandyShellScale === 1.25);
  check('super: normal shell damage 1620 at P11', shell.damage === 1620);
  check('super: normal shell has capped range (maxLife 1.1)', near(shell.maxLife, 1.1) && shell.pandyUnlimitedRange === false);
  // Hyper super: 6 radial shells, +30% bigger again, unlimited range.
  sandbox.bullets.length = 0;
  const hyperEnt = { id: 1, hp: 5200, pandyFocus: 100, selectedStar: 'none', x: 0, y: 0, radius: 14, _hyperTest: true };
  sandbox.castPandySuper(hyperEnt, false, 100, 0);
  check('super: hyper fires exactly 6 radial shells (no single shell too)', sandbox.bullets.length === 6);
  check('super: radial shells 30% bigger (hitboxMod 2.6, scale 1.625)', sandbox.bullets.every((b) => b.hitboxMod === 2.6 && b.pandyShellScale === 1.625));
  check('super: radial shells unlimited range (maxLife 120, flagged)', sandbox.bullets.every((b) => b.maxLife === 120 && b.pandyUnlimitedRange === true));
  check('super: radial shells every 60 degrees', near(sandbox.bullets[0].vx, 1000) && near(sandbox.bullets[0].vy, 0) && near(sandbox.bullets[1].vx, 500) && near(sandbox.bullets[1].vy, 866.03, 0.1));
  check('super: radial shells deal super damage (2430 at full focus)', sandbox.bullets.every((b) => b.damage === 2430));
  check('super: hyper shows SUGAR SURGE text', floating.some((t) => t.includes('SUGAR SURGE')));
} catch (e) { failures.push('super vm block threw: ' + e.message); }

// --- executed: voice module (silent without audio + RULE ONE scan) ---
try {
  const sandbox = { Math, performance: { now: () => 100000 } };
  vm.createContext(sandbox);
  vm.runInContext(voiceModule, sandbox);
  check('voice: module registers BrawePandyVoice', !!sandbox.BrawePandyVoice);
  check('voice: 12 clips across 8 triggers', sandbox.BrawePandyVoice.fileCount() === 12);
  check('voice: voice TBD (Anthony picks)', sandbox.BrawePandyVoice.voiceId === 'TBD');
  check('voice: play() degrades silent without Audio (no throw)', sandbox.BrawePandyVoice.play('attack') === false);
  // RULE ONE: no counts, ranges, damage, or mechanics in any spoken line.
  const banned = ['damage', 'range', 'second', 'meter', 'tile', 'percent', '%', 'focus', 'pierce', 'slow', 'trap', 'gadget', 'star power', 'super', 'hyper', 'cooldown', 'hp', 'speed', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const lines = Object.values(sandbox.BrawePandyVoice.text);
  check('voice RULE ONE: 12 flavor-only lines, no mechanics words or numbers',
    lines.length === 12 && lines.every((t) => !banned.some((w) => t.toLowerCase().includes(w))));
} catch (e) { failures.push('voice vm block threw: ' + e.message); }

if (failures.length) {
  console.error(`PANDY FAIL (${passed} passed, ${failures.length} failed):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`PANDY PASS (${passed} passed, 0 failed)`);
