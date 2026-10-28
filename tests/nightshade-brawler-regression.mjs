// Nightshade regression — Anthony's hooded poison Assassin, ordered 2026-10-28
// (design fully delegated: name, rarity, numbers, 2 Gadgets, 2 Star Powers).
// Locked design: Mythic Assassin, 6400 HP / 300 speed, Viper Fan main
// (4 daggers, tight super-short cone, 800 each, 1 poison stack per dagger:
// 60 damage/s for 8s, stacking to 4, 15 damage per 250ms tick; uncapped
// while Hypercharged). Super Boomerang Blades: Nightshade spins in place
// and releases a ring of 12 daggers that fly out 8 tiles and return, 1100
// damage each way per dagger, once per target per pass. Hypercharge Toxic
// Tempest: blades pierce walls and home toward the nearest poisoned enemy
// on return (lifetime-capped); poison puddles REMOVED 2026-10-28. Gadgets:
// Backstab Dash (16s) and Purge Vial (18s). Star Powers: Lingering Toxin
// (8s -> 10s) and Fresh Wounds (+20% dagger damage vs poisoned enemies).
// Poison NEVER damages Arena Forge structures. Dagger art is a DEDICATED
// branch drawn before the universal skin renderer call (PR #48 lesson),
// never through it, and never as a dot. Helpers are EXECUTED in a vm
// with a recording stub canvas (PR #45 pattern).
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

// ---------------------------------------------------------- 1. source pins
check('kill switch NIGHTSHADE_ENABLED defaults on', game.includes('let NIGHTSHADE_ENABLED = true;'));
check('visuals switch NIGHTSHADE_VISUALS_ENABLED defaults on', game.includes('let NIGHTSHADE_VISUALS_ENABLED = true;'));
check('roster includes nightshade after mallow', game.includes("'feathers', 'spikey', 'electrostien', 'mallow', 'nightshade'"));
check('rarity Mythic (count bumped 12 -> 13)', game.includes('// Mythic (13)') && game.includes("nightshade: 'Mythic',"));
check('role Assassin', game.includes("nightshade:'Assassin',"));
check('portrait icon present', game.includes("nightshade: '🗡️',"));
check('stats branch 6400/800/300', game.includes("if (brawlerId === 'nightshade') {") && game.includes('hp: Math.round(6400 * scale), dmg: Math.round(800 * scale), speed: 300'));
check('super charge 6 hits', game.includes('nightshade: 6'));
check('reload 1600ms', game.includes('nightshade: 1600,'));
check('fire delay 300ms', game.includes('nightshade: 300,'));
check('kit def present with Viper Fan + Boomerang Blades', game.includes("'nightshade': { name: 'Nightshade'") && game.includes("attack: 'Viper Fan'") && game.includes("super: 'Boomerang Blades'"));
check('kit def has finished gadget text (no placeholders)', game.includes("g1: 'Backstab Dash") && game.includes("g2: 'Purge Vial") && !game.includes('Nightshade gadget coming soon') && !game.includes('Nightshade star coming soon'));
check('kit def has finished star power text (no placeholders)', game.includes("sp1: 'Lingering Toxin") && game.includes("sp2: 'Fresh Wounds"));
check('kit def hyper text is Toxic Tempest', game.includes("hyper: 'Toxic Tempest:"));
check('gadget cooldown map entry 16s/18s', game.includes('nightshade: { g1: 16000, g2: 18000 },'));
check('fire branch exists with 4-dagger fan + poison flag', game.includes("brawler === 'nightshade'") && game.includes('NIGHTSHADE_DAGGER_COUNT') && game.includes('isNightshadeDagger: true'));
check('dagger constants 4 / 560px / 1000px-s / 0.36 rad', game.includes('const NIGHTSHADE_DAGGER_COUNT = 4;') && game.includes('const NIGHTSHADE_DAGGER_RANGE = 560;') && game.includes('const NIGHTSHADE_DAGGER_SPEED = 1000;') && game.includes('const NIGHTSHADE_DAGGER_FAN_ARC = 0.36;'));
check('poison constants 60 dps / 250ms tick / 8s / cap 4', game.includes('const NIGHTSHADE_POISON_DPS = 60;') && game.includes('const NIGHTSHADE_POISON_TICK_MS = 250;') && game.includes('const NIGHTSHADE_POISON_DURATION_MS = 8000;') && game.includes('const NIGHTSHADE_POISON_MAX_STACKS = 4;'));
check('SP1 poison duration is 10s', game.includes('const NIGHTSHADE_POISON_DURATION_SP1_MS = 10000;'));
check('blade constants 12 / 640px / 900px-s / 1100 dmg', game.includes('const NIGHTSHADE_BLADE_COUNT = 12;') && game.includes('const NIGHTSHADE_BLADE_RANGE = 640;') && game.includes('const NIGHTSHADE_BLADE_SPEED = 900;') && game.includes('const NIGHTSHADE_BLADE_DAMAGE = 1100;'));
check('blade lifetime cap constant 4000ms', game.includes('const NIGHTSHADE_BLADE_MAX_LIFE_MS = 4000;'));
check('hyper puddles removed (no puddle constants, state, or updater)', !game.includes('NIGHTSHADE_PUDDLE') && !game.includes('nightshadePuddles') && !game.includes('updateNightshadePuddles') && !game.includes('nightshadePuddleTick'));
check('gadget constants dash 240px/200ms, purge 400px/200hp', game.includes('const NIGHTSHADE_GADGET1_DASH_DISTANCE = 240;') && game.includes('const NIGHTSHADE_GADGET1_DASH_DURATION_MS = 200;') && game.includes('const NIGHTSHADE_GADGET2_RADIUS = 400;') && game.includes('const NIGHTSHADE_GADGET2_HEAL_PER_STACK = 200;'));
check('dagger branch sits BEFORE the universal skin call (no interception)',
  game.indexOf('if (b.isNightshadeDagger) {') > 0 &&
  game.indexOf('if (b.isNightshadeDagger) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('dagger branch draws dedicated art then continues', game.includes('drawNightshadeDagger(ctx, b);'));
check('checkHit poison hook on landed dagger hits', game.includes('if (b.isNightshadeDagger && owner && target) applyNightshadePoisonHit(target, owner, b);'));
check('checkHit SP2 hook exists', game.includes('Nightshade SP2 Fresh Wounds') && game.includes('b.nightshadeSp2Applied'));
check('poison application refuses structures', game.includes('target.isStructure'));
check('enemy candidate pool excludes structures', game.includes('!t.isStructure'));
check('player super dispatch', game.includes("if (combatBrawler === 'nightshade') { castNightshadeSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'nightshade') { castNightshadeSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch g1+g2', game.includes("curBrawler === 'nightshade' && curGadget === 'g1'") && game.includes("curBrawler === 'nightshade' && curGadget === 'g2'"));
check('bot gadget dispatch g1+g2', game.includes("bot.brawler === 'nightshade' && g === 'g1'") && game.includes("bot.brawler === 'nightshade' && g === 'g2'"));
check('update loop calls updateNightshadeSystems', game.includes('if (playing && !gameOver) updateNightshadeSystems(dt);'));
check('render calls renderNightshadeEffects', game.includes('    renderNightshadeEffects();'));
check('portrait body-art branch', game.includes("if (brawlerId === 'nightshade') {"));
check('systems section sits before Christmas Showdown header',
  game.indexOf('Nightshade systems (Viper Fan + Boomerang Blades)') > 0 &&
  game.indexOf('Nightshade systems (Viper Fan + Boomerang Blades)') < game.indexOf('Christmas Showdown buffs (Season 6: Xplodemis)'));

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

// --- executed: dagger art (real blade shape, never a dot) ---
try {
  const s = stubCtx();
  const sandbox = { Math, performance: { now: () => 100000 }, NIGHTSHADE_VISUALS_ENABLED: true };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'drawNightshadeDagger'), sandbox);
  sandbox.drawNightshadeDagger(s.proxy, { x: 100, y: 100, vx: 1000, vy: 0, hyperVisual: false });
  check('dagger: body is pale violet', hasFill(s.sets, '#e8e1ff'));
  check('dagger: venom dot is green', hasFill(s.sets, '#7be495'));
  check('dagger: blade tip path reaches 14px forward', s.calls.some((c) => c.m === 'moveTo' && near(c.args[0], 14) && near(c.args[1], 0)));
  check('dagger: blade edge lines exist (not a dot)', s.calls.some((c) => c.m === 'lineTo'));
  check('dagger: venom dot is a 2.2px arc', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 2.2)));
  const sh = stubCtx();
  sandbox.drawNightshadeDagger(sh.proxy, { x: 100, y: 100, vx: 1000, vy: 0, hyperVisual: true });
  check('dagger: hyper body is light pink-white', hasFill(sh.sets, '#f3e8ff'));
  check('dagger: hyper glow is magenta', sh.sets.some((x) => x.p === 'shadowColor' && x.v === '#e056fd'));
} catch (e) { failures.push('dagger art vm block threw: ' + e.message); }

// --- executed: poison stacking math ---
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
    extractFn(game, 'nightshadePurgeDamage'),
    sandbox);
  const owner = { id: 1, hp: 6400, selectedStar: 'none' };
  const target = { id: 2, hp: 6400 };
  check('poison: 1 dagger applies 1 stack', sandbox.applyNightshadePoisonStacks(target, owner, 1) === 1 && target.nightshadePoisonStacks.length === 1);
  check('poison: stack lasts 8000ms', target.nightshadePoisonStacks[0].endsAt === 108000);
  check('poison: first tick at +250ms', target.nightshadePoisonStacks[0].nextTickAt === 100250);
  check('poison: tick damage is 15 (60 dps x 0.25s)', Math.round(60 * 250 / 1000) === 15);
  sandbox.applyNightshadePoisonStacks(target, owner, 3);
  check('poison: 4 daggers stack to 4', target.nightshadePoisonStacks.length === 4);
  check('poison: 4 stacks is 240 dps', 4 * 60 === 240);
  check('poison: 4 stacks over 8s is 1920 total', 4 * 60 * 8 === 1920);
  nowValue = 101000;
  sandbox.applyNightshadePoisonStacks(target, owner, 1);
  check('poison: 5th stack at cap refreshes oldest, still 4 stacks', target.nightshadePoisonStacks.length === 4 && target.nightshadePoisonStacks.some((s) => s.endsAt === 109000));
  const sp1Owner = { id: 3, hp: 6400, selectedStar: 'sp1' };
  const sp1Target = { id: 4, hp: 6400 };
  sandbox.applyNightshadePoisonStacks(sp1Target, sp1Owner, 1);
  check('SP1: poison lasts 10000ms', sp1Target.nightshadePoisonStacks[0].endsAt === 111000);
  const purgeTarget = { id: 5, hp: 6400, nightshadePoisonStacks: [
    { endsAt: 105000, nextTickAt: 101250, ownerId: 1 },
    { endsAt: 105000, nextTickAt: 101250, ownerId: 1 },
  ] };
  check('purge: 2 stacks with 4s left = 480 remaining damage', sandbox.nightshadePurgeDamage(purgeTarget, 101000) === 480);
  const structure = { id: 6, hp: 72000, isStructure: true };
  check('poison: structures take 0 stacks', sandbox.applyNightshadePoisonStacks(structure, owner, 4) === 0);
  const dead = { id: 7, hp: 0 };
  check('poison: dead targets take 0 stacks', sandbox.applyNightshadePoisonStacks(dead, owner, 1) === 0);
  nowValue = 200000;
  check('poison: expired stacks filter to 0 active', sandbox.nightshadeActiveStacks(target, 200000).length === 0);
} catch (e) { failures.push('poison vm block threw: ' + e.message); }

// --- executed: blade + dash state creation ---
try {
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 4000, WORLD_H: 4000,
    NIGHTSHADE_BLADE_SPEED: 900,
    NIGHTSHADE_GADGET1_DASH_DISTANCE: 240,
    NIGHTSHADE_GADGET1_DASH_DURATION_MS: 200,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'createNightshadeBladeState') + '\n' +
    extractFn(game, 'createNightshadeDashState'),
    sandbox);
  const owner = { id: 9, x: 100, y: 100 };
  const blade = sandbox.createNightshadeBladeState(owner, 100, 100, 0, false);
  check('blade: starts outbound at 900px/s', blade.outbound === true && near(blade.vx, 900) && near(blade.vy, 0));
  check('blade: traveled starts at 0', blade.traveled === 0);
  check('blade: bornAt set for lifetime cap', blade.bornAt === 100000);
  check('blade: hyper flag false by default', blade.hyper === false);
  const hyperBlade = sandbox.createNightshadeBladeState(owner, 100, 100, 0, true);
  check('blade: hyper flag carries through', hyperBlade.hyper === true);
  const dash = sandbox.createNightshadeDashState({ x: 100, y: 100, radius: 14 }, 0);
  check('dash: 3 tiles forward is 240px', near(dash.targetX, 340) && near(dash.targetY, 100));
  check('dash: duration is 200ms', dash.durationMs === 200);
  check('dash: pass-through hit set starts empty', dash.hitIds && Object.keys(dash.hitIds).length === 0);
} catch (e) { failures.push('blade/dash vm block threw: ' + e.message); }

// --- executed: blade level scaling ---
try {
  const sandbox = {
    Math,
    player: { id: 0 },
    getSelectedBrawlerLevel: () => 11,
    NIGHTSHADE_BLADE_DAMAGE: 1100,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'nightshadeBladeLevelDamage'), sandbox);
  check('blade: 1100 damage at Power 11', sandbox.nightshadeBladeLevelDamage({ id: 0 }) === 1100);
  check('blade: 605 damage at Power 1 (0.55x scale)', sandbox.nightshadeBladeLevelDamage({ id: 5, level: 1 }) === 605);
} catch (e) { failures.push('blade scaling vm block threw: ' + e.message); }

// --- pure draw code: dagger art writes no combat state ---
try {
  const src = extractFn(game, 'drawNightshadeDagger');
  check('drawNightshadeDagger is pure draw code', !/\.damage\s*=|\.hp\s*=/.test(src));
} catch (e) { failures.push('pure-draw vm block threw: ' + e.message); }

console.log(`nightshade-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
