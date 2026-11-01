// Nightshade balance + roster-fix regression — follow-up to PR #58,
// built 2026-10-28 from Anthony's playtest verdict + correction:
//  * Viper Fan STAYS A CONE, tightened 0.72 -> 0.36 rad (spread 0 rejected).
//  * Poison nerfed 120/s -> 60/s per stack (tick 30 -> 15 per 250ms).
//    4-stack cap stays for normal attacks; Hypercharged main attacks
//    stack poison WITHOUT limit.
//  * Super reworked: grounded spin, NO jump, ring of 12 daggers 30 deg
//    apart, 640px out + return, 1100 damage each way, at most once per
//    target per pass. Name 'Boomerang Blades' kept (blades still return).
//  * Hyper REWORKED 2026-10-28: homing REMOVED, replaced by a shield zone
//    around Nightshade that blocks enemy projectiles while a Hypercharged
//    Super's blades are out (until they return). Blades still expire on a
//    4000ms lifetime cap; per-pass hit maps cap damage at once per target
//    per pass. Hyper poison puddles REMOVED entirely.
//  * Roster bug: the HUD brawler dropdown shipped as static HTML with
//    only 29 options and was only rebuilt on a Soul Summoner auto-unlock,
//    so the newest brawlers never appeared. Fixed by rebuilding once at
//    startup (after loadProgress) AND by fixing the static markup to the
//    full live roster (91 = allBrawlers 99 minus 8 disabled). The two
//    dead static options (dr0ne, unhitabble — not in allBrawlers) were
//    removed. The FIGHTERS gallery, training picker, bot pool, and
//    summoner already derive from allBrawlers and needed no change.
//  * Gadgets and Star Powers UNCHANGED (Purge Vial math follows the new
//    60/s automatically). Mallow untouched (PR #54 owns its g2/sp2 text).
//  * Poison NEVER damages Arena Forge structures — guards re-verified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
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
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. balance pins
check('fan arc tightened 0.72 -> 0.36', game.includes('const NIGHTSHADE_DAGGER_FAN_ARC = 0.36;') && !game.includes('NIGHTSHADE_DAGGER_FAN_ARC = 0.72'));
check('fan uses the arc constant (no zero-spread single line)', game.includes('NIGHTSHADE_DAGGER_FAN_ARC / (NIGHTSHADE_DAGGER_COUNT - 1)'));
check('fan half-spread is now 0.18 rad (was 0.36)', near(0.36 / 2, 0.18));
check('poison dps halved 120 -> 60', game.includes('const NIGHTSHADE_POISON_DPS = 60;') && !game.includes('NIGHTSHADE_POISON_DPS = 120'));
check('poison cap 4 kept for non-hyper attacks', game.includes('const NIGHTSHADE_POISON_MAX_STACKS = 4;'));
check('blade count 2 -> 12', game.includes('const NIGHTSHADE_BLADE_COUNT = 12;') && !game.includes('NIGHTSHADE_BLADE_COUNT = 2;'));
check('blade range/damage kept 640/1100, speed nerfed 900 -> 630 (-30%)', game.includes('const NIGHTSHADE_BLADE_RANGE = 640;') && game.includes('const NIGHTSHADE_BLADE_SPEED = 630;') && game.includes('const NIGHTSHADE_BLADE_DAMAGE = 1100;'));
check('blade lifetime cap 4000ms exists', game.includes('const NIGHTSHADE_BLADE_MAX_LIFE_MS = 4000;'));
check('blade lifetime cap enforced in update loop', game.includes('if (now - blade.bornAt > NIGHTSHADE_BLADE_MAX_LIFE_MS) { nightshadeBlades.splice(i, 1); continue; }'));
check('lifetime budget covers legit flights (640 out + 640 back = 1280px at 630px/s ~ 2.1s < 4.0s)', 4000 > (640 + 640) / 630 * 1000);
check('blade state carries bornAt (no distSincePuddle)', game.includes('bornAt: performance.now(), hitOut: {}, hitBack: {},') && !game.includes('distSincePuddle'));
check('per-pass damage caps kept (hitOut/hitBack)', game.includes('if (blade.hitOut[target.id]) continue;') && game.includes('if (blade.hitBack[target.id]) continue;'));
check('hyper uncapped stacks: apply fn takes uncapped flag', game.includes('function applyNightshadePoisonStacks(target, owner, count, uncapped)') && game.includes('if (!uncapped && target.nightshadePoisonStacks.length >= NIGHTSHADE_POISON_MAX_STACKS)'));
check('hyper uncapped stacks: dagger hit passes hyperVisual', game.includes('applyNightshadePoisonStacks(target, owner, 1, !!(b && b.hyperVisual))'));
check('hyper homing REMOVED (no HOME_RANGE, no hyper homing branch)', !game.includes('NIGHTSHADE_BLADE_HOME_RANGE') && !game.includes('home toward the nearest poisoned') && game.includes('const NIGHTSHADE_SHIELD_RADIUS = 120;') && game.includes('function nightshadeHyperShieldBlocks(b)'));
check('hyper wall-pierce kept (non-hyper blades stop on walls)', game.includes('if (!blade.hyper && nightshadeHitsWall(blade.x, blade.y, NIGHTSHADE_BLADE_RADIUS))'));
check('puddles fully removed (constants, state, updater, tick flag, render)', !game.includes('NIGHTSHADE_PUDDLE') && !game.includes('nightshadePuddles') && !game.includes('updateNightshadePuddles') && !game.includes('nightshadePuddleTick'));
check('super ring: 30-degree steps, no aim', extractFn(game, 'castNightshadeSuper').includes('k * (Math.PI * 2 / NIGHTSHADE_BLADE_COUNT)') && !extractFn(game, 'castNightshadeSuper').includes('atan2'));
check('super ring: spin FX pushed on cast', game.includes('nightshadeSpinFx.push({ x: entity.x, y: entity.y, until: performance.now() + 350 })'));
check('super ring: spin FX rendered', game.includes('nightshadeSpinFx = nightshadeSpinFx.filter((fx) => now < fx.until);'));
check('super keeps name Boomerang Blades + spin floating text', game.includes("super: 'Boomerang Blades'") && game.includes('🌀 BOOMERANG BLADES!'));

// ---------------------------------------------------------- 2. kit-def text
// Kit entries are multi-line in brawlerData now (moved out of the stray
// SPECIAL_ABILITY_DEFS lines 2026-10-28), so pin against a window of the
// nightshade entry inside the brawlerData block instead of one line.
const brawlerDataIdx = game.indexOf('const brawlerData = {');
const nightshadeIdx = game.indexOf("'nightshade': {", brawlerDataIdx);
const kitLine = nightshadeIdx > 0 ? game.slice(nightshadeIdx, nightshadeIdx + 2500) : '';
check('kit def entry found in brawlerData', !!kitLine);
if (kitLine) {
  check('attackDesc: tight cone, 640 each (-20%), 60/s, cap 4, hyper uncapped note', kitLine.includes('Throws 4 daggers in a tight super-short cone (640 damage each)') && kitLine.includes('60 damage per second for 8 seconds, stacking up to 4 times (no limit while Hypercharged)'));
  check('superDesc: spin in place, ring of 12, out + return, 1100 each way, once per target each way', kitLine.includes('spins in place and releases a ring of 12 daggers in all directions') && kitLine.includes('flies out 8 tiles and returns to her, dealing 1,100 damage on the way out and 1,100 on the way back, at most once per target each way'));
  check('hyper text: pierce + shield zone + infinite stacks, NO homing/puddle mention', kitLine.includes('Super blades pierce walls') && kitLine.includes('shield zone around Nightshade blocks enemy projectiles until the daggers return') && kitLine.includes('stack poison without limit') && !kitLine.toLowerCase().includes('puddle') && !kitLine.includes('home toward'));
  check('gadgets unchanged (Backstab Dash / Purge Vial, 200 HP per stack)', kitLine.includes("g1: 'Backstab Dash") && kitLine.includes("g2: 'Purge Vial") && kitLine.includes('heal 200 HP per stack detonated'));
  check('star powers unchanged (Lingering Toxin 10s / Fresh Wounds +20%)', kitLine.includes("sp1: 'Lingering Toxin (Poison lasts 10 seconds instead of 8 seconds.)") && kitLine.includes("sp2: 'Fresh Wounds (Daggers deal +20% damage to enemies that are already poisoned.)"));
  check('no stale 120/s or 2-blade text in nightshade kit line', !kitLine.includes('120 damage per second') && !kitLine.includes('Throws 2 spinning'));
}
check('mallow kit untouched (attack text still 8 x 320 Pam fan)', game.includes("attackDesc: 'Fires 8 marshmallows in a wide Pam-style fan (320 damage each)"));
check('no stale 120/s nightshade text anywhere', !game.includes('120 damage per second for 8 seconds, stacking'));

// ---------------------------------------------------------- 3. structure guards (2026-10-28 order: Nightshade poison is the
// one exception — it DOES affect structures; blades still never hit them)
check('poison application accepts structures (Nightshade-only exception)', !extractFn(game, 'applyNightshadePoisonStacks').includes('target.isStructure'));
check('poison ticks damage structures (Nightshade-only exception)', !extractFn(game, 'updateNightshadePoisonTicks').includes('target.isStructure'));
check('enemy candidate pool excludes structures', extractFn(game, 'nightshadeEnemyCandidates').includes('!t.isStructure'));

// ---------------------------------------------------------- 4. roster fix
const loadIdx = game.indexOf('loadProgress();');
check('startup rebuild call sits right after loadProgress()', loadIdx > 0 && game.slice(loadIdx, loadIdx + 800).includes("if (typeof Option === 'function' && typeof rebuildBrawlerSelectOptions === 'function') rebuildBrawlerSelectOptions();"));
check('startup rebuild guarded by Option (vm sandboxes lack it)', game.includes("typeof Option === 'function' && typeof rebuildBrawlerSelectOptions"));
check('roster array ends mallow, nightshade', game.includes("'feathers', 'spikey', 'electrostien', 'mallow', 'nightshade'"));
check('disabled set excludes mallow + nightshade', !/const disabledBrawlers = new Set\(\[[\s\S]*?\]\)/.exec(game)[0].includes('mallow') && !/const disabledBrawlers = new Set\(\[[\s\S]*?\]\)/.exec(game)[0].includes('nightshade'));
const sel = html.match(/<select id="brawlerSelect"[^>]*>([\s\S]*?)<\/select>/);
check('brawlerSelect block found in index.html', !!sel);
if (sel) {
  const opts = [...sel[1].matchAll(/<option value="([^"]+)"/g)].map((x) => x[1]);
  check('static roster is exactly 92 (91 + Runner)', opts.length === 92);
  check('static roster includes mallow + nightshade', opts.includes('mallow') && opts.includes('nightshade'));
  check('static roster ends looma, feathers, spikey, electrostien, mallow, nightshade, runner', opts.slice(-7).join(',') === 'looma,feathers,spikey,electrostien,mallow,nightshade,runner');
  check('dead static options removed (dr0ne, unhitabble not in allBrawlers)', !opts.includes('dr0ne') && !opts.includes('unhitabble'));
  check('no disabled brawler in static roster', !opts.some((id) => ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'].includes(id)));
}

// ---------------------------------------------------------- 5. vm: poison math
try {
  let nowValue = 100000;
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    NIGHTSHADE_ENABLED: true,
    NIGHTSHADE_POISON_DPS: 60,
    NIGHTSHADE_POISON_TICK_MS: 250,
    NIGHTSHADE_POISON_DURATION_MS: 8000,
    NIGHTSHADE_POISON_DURATION_SP1_MS: 10000,
    NIGHTSHADE_POISON_MAX_STACKS: 4,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'nightshadeStarChoice') + '\n' +
    extractFn(game, 'nightshadeHasSP1') + '\n' +
    extractFn(game, 'nightshadeHasSP2') + '\n' +
    extractFn(game, 'nightshadePoisonDurationMs') + '\n' +
    extractFn(game, 'nightshadeActiveStacks') + '\n' +
    extractFn(game, 'applyNightshadePoisonStacks') + '\n' +
    extractFn(game, 'applyNightshadePoisonHit') + '\n' +
    extractFn(game, 'nightshadePurgeDamage'),
    sandbox);
  const owner = { id: 1, hp: 6400, selectedStar: 'none' };
  const target = { id: 2, hp: 6400 };
  sandbox.applyNightshadePoisonStacks(target, owner, 1);
  check('poison vm: 1 stack, 8s duration, tick at +250ms', target.nightshadePoisonStacks.length === 1 && target.nightshadePoisonStacks[0].endsAt === 108000 && target.nightshadePoisonStacks[0].nextTickAt === 100250);
  check('poison vm: tick damage is 15 (60 dps x 0.25s)', Math.round(60 * 250 / 1000) === 15);
  sandbox.applyNightshadePoisonStacks(target, owner, 5);
  check('poison vm: capped path still holds 4 after 6 total applies', target.nightshadePoisonStacks.length === 4);
  const hyperTarget = { id: 3, hp: 6400 };
  sandbox.applyNightshadePoisonStacks(hyperTarget, owner, 6, true);
  check('poison vm: uncapped hyper path holds 6 stacks', hyperTarget.nightshadePoisonStacks.length === 6);
  check('poison vm: 6 uncapped stacks is 360 dps', 6 * 60 === 360);
  const hitTarget = { id: 4, hp: 6400 };
  for (let k = 0; k < 6; k++) sandbox.applyNightshadePoisonHit(hitTarget, owner, { hyperVisual: true });
  check('poison vm: hyper dagger hits stack past 4 (6 stacks)', hitTarget.nightshadePoisonStacks.length === 6);
  const normalTarget = { id: 5, hp: 6400 };
  for (let k = 0; k < 6; k++) sandbox.applyNightshadePoisonHit(normalTarget, owner, { hyperVisual: false });
  check('poison vm: normal dagger hits stay capped at 4', normalTarget.nightshadePoisonStacks.length === 4);
  const purgeTarget = { id: 6, hp: 6400, nightshadePoisonStacks: [
    { endsAt: 105000, nextTickAt: 101250, ownerId: 1 },
    { endsAt: 105000, nextTickAt: 101250, ownerId: 1 },
  ] };
  check('poison vm: purge 2 stacks with 4s left = 480 (60/s math)', sandbox.nightshadePurgeDamage(purgeTarget, 101000) === 480);
  const structure = { id: 7, hp: 72000, isStructure: true };
  check('poison vm: structures take stacks even uncapped (6 stacks)', sandbox.applyNightshadePoisonStacks(structure, owner, 6, true) === 6);
} catch (e) { failures.push('poison vm block threw: ' + e.message); }

// ---------------------------------------------------------- 6. vm: super ring
try {
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    NIGHTSHADE_ENABLED: true,
    NIGHTSHADE_BLADE_COUNT: 12,
    NIGHTSHADE_BLADE_SPEED: 630,
    nightshadeBlades: [],
    nightshadeSpinFx: [],
    spawnFloatingText: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'createNightshadeBladeState') + '\n' +
    extractFn(game, 'castNightshadeSuper'),
    sandbox);
  // Aim is deliberately diagonal; a ring must ignore it (blade 0 goes east).
  const caster = { id: 9, x: 100, y: 100, hp: 6400 };
  const ok = sandbox.castNightshadeSuper(caster, false, 999, 999);
  check('ring vm: cast succeeds', ok === true);
  check('ring vm: exactly 12 blades', sandbox.nightshadeBlades.length === 12);
  let anglesOk = true;
  let originsOk = true;
  for (let k = 0; k < 12; k++) {
    const b = sandbox.nightshadeBlades[k];
    const ang = Math.atan2(b.vy, b.vx);
    if (!near(ang, k * Math.PI / 6, 0.001) && !near(Math.abs(ang - k * Math.PI / 6), Math.PI * 2, 0.001)) anglesOk = false;
    if (b.x !== 100 || b.y !== 100 || b.outbound !== true || b.hyper !== false) originsOk = false;
  }
  check('ring vm: blades 30 deg apart (k x 30 deg), ignoring aim', anglesOk);
  check('ring vm: all blades start at caster, outbound, non-hyper', originsOk);
  check('ring vm: blade speed is 630px/s (-30%)', sandbox.nightshadeBlades.every((b) => near(Math.hypot(b.vx, b.vy), 630)));
  check('ring vm: spin FX pushed at caster for 350ms', sandbox.nightshadeSpinFx.length === 1 && sandbox.nightshadeSpinFx[0].x === 100 && sandbox.nightshadeSpinFx[0].until === 100350);
  sandbox.nightshadeBlades.length = 0;
  sandbox.nightshadeSpinFx.length = 0;
  sandbox.castNightshadeSuper(caster, true, 0, 0);
  check('ring vm: hyper cast keeps hyper flag on all 12 blades', sandbox.nightshadeBlades.length === 12 && sandbox.nightshadeBlades.every((b) => b.hyper === true));
  check('ring vm: per-pass hit maps start empty', sandbox.nightshadeBlades.every((b) => b.hitOut && b.hitBack && Object.keys(b.hitOut).length === 0 && Object.keys(b.hitBack).length === 0));
  check('ring vm: dead caster casts nothing', sandbox.castNightshadeSuper({ id: 10, x: 0, y: 0, hp: 0 }, false, 0, 0) === false);
} catch (e) { failures.push('ring vm block threw: ' + e.message); }

console.log(`nightshade-balance-roster-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
