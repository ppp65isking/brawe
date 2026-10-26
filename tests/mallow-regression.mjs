// Mallow regression — Anthony's marshmallow brawler, ordered 2026-10-26.
// Locked design: Epic Controller, 6800 HP / 270 speed, 8-marshmallow Pam fan
// (320 each, 4% slow per hit for 1s stacking to 32%), Overheated smooth
// dash with 6 trail puffs (burn 200/s, explode 1.32s after placement for
// 400), Hyper: end-of-flight burn + faster/further double dash + wider
// trail, NO slow zones (removed by the 2026-10-26 balance PR). Visuals are DEDICATED branches:
// marshmallow projectiles are drawn before the universal skin renderer
// call (PR #48 lesson), never through it, and never as dots.
// Helpers are EXECUTED in a vm with a recording stub canvas (PR #45
// pattern: tests do not run the frame loop, so render helpers must be
// executed directly).
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
check('kill switch MALLOW_ENABLED defaults on', game.includes('let MALLOW_ENABLED = true;'));
check('visuals switch MALLOW_VISUALS_ENABLED defaults on', game.includes('let MALLOW_VISUALS_ENABLED = true;'));
check('roster includes mallow', game.includes("'feathers', 'spikey', 'electrostien', 'mallow'"));
check('rarity Epic (count bumped 31 -> 32)', game.includes('// Epic (32)') && game.includes("mallow: 'Epic',"));
check('role Controller', game.includes("mallow:'Controller',"));
check('portrait icon present', game.includes("mallow: '🍡',"));
check('stats branch 6800/320/270', game.includes("if (brawlerId === 'mallow') {") && game.includes('hp: Math.round(6800 * scale), dmg: Math.round(320 * scale), speed: 270'));
check('super charge 12 hits', game.includes('mallow:12'));
check('reload 1500ms', game.includes('mallow: 1500,'));
check('fire delay 550ms', game.includes('mallow: 550,'));
check('brawlerData entry present', game.includes("'mallow': { name: 'Mallow'") && game.includes("attack: 'Marshmallow Spray'") && game.includes("super: 'Overheated'"));
check('brawlerData has one real gadget + one real star', game.includes("g1: 'Sticky Volley") && game.includes("sp1: 'Toasted Haste"));
check('gadget cooldown map entry', game.includes('mallow: { g1: 12000, g2: 14000 },'));
check('fire branch exists with 8-volley + per-hit charge + channel lock',
  game.includes("brawler === 'mallow'") && game.includes('MALLOW_VOLLEY_COUNT') &&
  game.includes('isPrimaryChargeProjectile: true') &&
  game.includes('lockMainAttackSequence(fromEntity, MALLOW_CHANNEL_MS, now);'));
check('channel is 500ms', game.includes('const MALLOW_CHANNEL_MS = 500;'));
check('bullet branch sits BEFORE the universal skin call (no interception)',
  game.indexOf('if (b.isMallow) {') > 0 &&
  game.indexOf('if (b.isMallow) {') < game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;'));
check('bullet branch draws dedicated art then continues',
  game.includes('drawMallowProjectile(ctx, b);'));
check('expiry hook bursts hyper bullets at end of flight',
  game.includes('if (b.isMallow) {') && game.includes('if (b.mallowHyper) mallowHyperEndBurst(b);'));
check('checkHit slow hook on landed hits',
  game.includes('if (b.isMallow && owner && target) applyMallowSlowHit(target, owner, b);'));
check('slow multiplier hooked into movement slow',
  game.includes('getMallowSlowMultiplier(entity, now)'));
check('slow constants 4%/1s/stack-8', game.includes('const MALLOW_SLOW_PER_HIT = 0.04;') && game.includes('const MALLOW_SLOW_DURATION_MS = 1000;') && game.includes('const MALLOW_SLOW_MAX_STACKS = 8;'));
check('gadget slow 6% per hit', game.includes('const MALLOW_SLOW_GADGET_PER_HIT = 0.06;'));
check('player super dispatch', game.includes("if (combatBrawler === 'mallow') { castMallowSuper(player, !!isHypercharged, wm.x, wm.y); updateSuperButton(); return; }"));
check('bot super dispatch', game.includes("if (botCombatBrawler === 'mallow') { castMallowSuper(bot, isHyper, targetX, targetY); return; }"));
check('player gadget dispatch', game.includes("curBrawler === 'mallow' && curGadget === 'g1'"));
check('bot gadget dispatch', game.includes("bot.brawler === 'mallow' && g === 'g1'"));
check('dash constants 480/640 over 220ms', game.includes('const MALLOW_DASH_DISTANCE = 480;') && game.includes('const MALLOW_DASH_DISTANCE_HYPER = 640;') && game.includes('const MALLOW_DASH_DURATION_MS = 220;'));
check('trail constants 6 puffs / 200 dps / 1.32s fuse / 400 dmg',
  game.includes('const MALLOW_TRAIL_PUFFS = 6;') && game.includes('const MALLOW_TRAIL_BURN_DPS = 200;') &&
  game.includes('const MALLOW_TRAIL_FUSE_MS = 1320;') && game.includes('const MALLOW_TRAIL_EXPLOSION_DAMAGE = 400;'));
check('hyper burn total 150 over 5 ticks', game.includes('const MALLOW_HYPER_BURN_TOTAL = 150;') && game.includes('const MALLOW_HYPER_BURN_TICKS = 5;'));
check('update loop calls updateMallowSystems', game.includes('if (playing && !gameOver) updateMallowSystems(dt);'));
check('render calls renderMallowEffects', game.includes('    renderMallowEffects();'));
check('portrait body-art branch', game.includes("if (brawlerId === 'mallow') {"));
check('SP1 speed hooks in both movement paths',
  game.includes('getMallowSp1SpeedMult(player, now)') && game.includes('getMallowSp1SpeedMult(t, now)'));
check('SP1 is +5%', game.includes('? 1.05 : 1.0;'));

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
const hasRoundRect = (calls, w, h) => calls.some((c) => c.m === 'roundRect' && near(c.args[2], w) && near(c.args[3], h));

// --- executed: marshmallow projectile art (real puff, never a dot) ---
try {
  const s = stubCtx();
  const sandbox = { Math, performance: { now: () => 100000 } };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'drawMallowProjectile'), sandbox);
  sandbox.drawMallowProjectile(s.proxy, { x: 100, y: 100, vx: 900, vy: 0, hyperVisual: false });
  check('projectile body is cream white', hasFill(s.sets, '#fff8ec'));
  check('projectile has toasted golden tips', hasFill(s.sets, '#d99a4e'));
  check('projectile body is a 22x14 capsule (not a dot)', hasRoundRect(s.calls, 22, 14));
  check('projectile tips are 4.5px arcs', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 4.5)));
  const sh = stubCtx();
  sandbox.drawMallowProjectile(sh.proxy, { x: 100, y: 100, vx: 900, vy: 0, hyperVisual: true });
  check('hyper projectile body is light purple-white', hasFill(sh.sets, '#f5e9ff'));
  check('hyper projectile tips are purple', hasFill(sh.sets, '#9333ea'));
} catch (e) { failures.push('projectile art vm block threw: ' + e.message); }

// --- executed: slow stacking math ---
try {
  let nowValue = 100000;
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    MALLOW_ENABLED: true,
    MALLOW_SLOW_PER_HIT: 0.04,
    MALLOW_SLOW_GADGET_PER_HIT: 0.06,
    MALLOW_SLOW_DURATION_MS: 1000,
    MALLOW_SLOW_DURATION_SP2_MS: 1500,
    MALLOW_SLOW_MAX_STACKS: 8,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'mallowStarChoice') + '\n' +
    extractFn(game, 'mallowHasSP1') + '\n' +
    extractFn(game, 'mallowHasSP2') + '\n' +
    extractFn(game, 'getMallowSlowMultiplier') + '\n' +
    extractFn(game, 'applyMallowSlowHit') + '\n' +
    extractFn(game, 'getMallowSp1SpeedMult'),
    sandbox);
  const target = { hp: 6800 };
  const owner = { hp: 6800, selectedStar: 'none' };
  sandbox.applyMallowSlowHit(target, owner, { mallowSlowPerHit: 0.04 });
  check('slow: 1 hit stacks to 1', target.mallowSlowStacks === 1);
  check('slow: 1 hit lasts 1000ms', target.mallowSlowUntil === 101000);
  check('slow: 1 hit is 4% (mult 0.96)', near(sandbox.getMallowSlowMultiplier(target, 100000), 0.96));
  for (let k = 0; k < 7; k++) sandbox.applyMallowSlowHit(target, owner, { mallowSlowPerHit: 0.04 });
  check('slow: 8 hits stack to 8', target.mallowSlowStacks === 8);
  check('slow: 8 hits is 32% (mult 0.68)', near(sandbox.getMallowSlowMultiplier(target, 100000), 0.68));
  sandbox.applyMallowSlowHit(target, owner, { mallowSlowPerHit: 0.04 });
  check('slow: 9th hit still capped at 8 stacks', target.mallowSlowStacks === 8);
  check('slow: expired slow is no slow (mult 1.0)', near(sandbox.getMallowSlowMultiplier(target, 101001), 1.0));
  nowValue = 200000;
  sandbox.applyMallowSlowHit(target, owner, { mallowSlowPerHit: 0.04 });
  check('slow: hit after expiry restarts at 1 stack', target.mallowSlowStacks === 1);
  const gTarget = { hp: 6800 };
  for (let k = 0; k < 8; k++) sandbox.applyMallowSlowHit(gTarget, owner, { mallowSlowPerHit: 0.06 });
  check('slow: gadget volley 8 hits is 48% (mult 0.52)', near(sandbox.getMallowSlowMultiplier(gTarget, 200000), 0.52));
  const spOwner = { hp: 6800, selectedStar: 'sp1' };
  sandbox.applyMallowSlowHit(target, spOwner, { mallowSlowPerHit: 0.04 });
  check('SP1: owner gains +5% speed window on slow hit', target && spOwner.mallowSp1SpeedUntil === 201000);
  check('SP1: speed mult is 1.05 inside window', near(sandbox.getMallowSp1SpeedMult(spOwner, 200500), 1.05));
  check('SP1: speed mult is 1.0 outside window', near(sandbox.getMallowSp1SpeedMult(spOwner, 201001), 1.0));
  check('SP1: non-SP1 owner gets no speed window', near(sandbox.getMallowSp1SpeedMult(owner, 200500), 1.0));
} catch (e) { failures.push('slow vm block threw: ' + e.message); }

// --- executed: dash state + trail puff placement ---
try {
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 4000, WORLD_H: 4000,
    mallowTrailPuffs: [], mallowSlowZones: [],
    MALLOW_DASH_DISTANCE: 480, MALLOW_DASH_DISTANCE_HYPER: 640,
    MALLOW_DASH_DURATION_MS: 220,
    MALLOW_TRAIL_FUSE_MS: 1320,
    MALLOW_TRAIL_PUFF_RADIUS: 26, MALLOW_TRAIL_PUFF_RADIUS_HYPER: 36,
    MALLOW_SLOW_ZONE_RADIUS: 120, MALLOW_SLOW_ZONE_DURATION_MS: 2000,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'createMallowDashState') + '\n' +
    extractFn(game, 'placeMallowTrailPuff'),
    sandbox);
  const e = { x: 100, y: 100, radius: 14 };
  const d = sandbox.createMallowDashState(e, 0, false);
  check('dash: base distance is 480px', near(d.targetX, 580) && near(d.targetY, 100));
  check('dash: base duration is 220ms', d.durationMs === 220);
  check('dash: no auto-chain field (each activation is one dash)', !('dashesLeft' in d));
  const dh = sandbox.createMallowDashState(e, 0, true);
  check('dash: hyper distance is 640px', near(dh.targetX, 740));
  const owner = { id: 7 };
  for (let k = 0; k < 6; k++) sandbox.placeMallowTrailPuff(owner, 100 + k * 80, 100, false, k);
  check('trail: 6 puffs placed for a dash', sandbox.mallowTrailPuffs.length === 6);
  check('trail: base puffs are radius 26', sandbox.mallowTrailPuffs.every((p) => p.radius === 26));
  check('trail: base puffs fuse at 1.32s', sandbox.mallowTrailPuffs.every((p) => p.explodeAt === 101320));
  sandbox.mallowTrailPuffs = [];
  sandbox.mallowSlowZones = [];
  for (let k = 0; k < 6; k++) sandbox.placeMallowTrailPuff(owner, 100 + k * 80, 100, true, k);
  check('trail: hyper puffs are wider (radius 36)', sandbox.mallowTrailPuffs.every((p) => p.radius === 36));
} catch (e) { failures.push('dash vm block threw: ' + e.message); }

// --- executed: renderMallowEffects draws telegraphs, puffs, zones, bursts ---
try {
  const nowValue = 100000;
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    MALLOW_VISUALS_ENABLED: true,
    MALLOW_TRAIL_FUSE_MS: 1320,
    MALLOW_TRAIL_EXPLOSION_RADIUS: 90,
    MALLOW_VOLLEY_FAN_ARC: 1.20,
    mallowMinis: [],
    mallowTelegraphs: [{ x: 50, y: 50, ang: 0, until: 100100 }],
    mallowTrailPuffs: [
      { x: 200, y: 200, radius: 26, explodeAt: 100200, hyper: false },
      { x: 260, y: 200, radius: 26, explodeAt: 101000, hyper: false },
    ],
    mallowSlowZones: [{ x: 300, y: 300, radius: 120 }],
    mallowExplosions: [{ x: 400, y: 400, startedAt: 99900, durationMs: 450, hyper: false }],
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'renderMallowEffects'), sandbox);
  const s = stubCtx();
  sandbox.ctx = s.proxy;
  sandbox.renderMallowEffects();
  check('render: cone telegraph arc radius 90', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 90)));
  check('render: late-fuse puff reddens (warning ring stroke)', s.sets.some((x) => x.p === 'strokeStyle' && x.v === '#ff5a2a'));
  check('render: late-fuse puff body warms', s.sets.some((x) => x.p === 'fillStyle' && x.v === '#ffd0a0'));
  check('render: early-fuse puff stays cream', s.sets.some((x) => x.p === 'fillStyle' && x.v === '#fff8ec'));
  check('render: custom explosion draws an expanding ring', hasArcIn(s.calls, 20, 90));
  check('render: explosion draws toasted shards (4px arcs)', s.calls.some((c) => c.m === 'arc' && near(c.args[2], 4)));
} catch (e) { failures.push('render vm block threw: ' + e.message); }

// --- pure draw code: projectile art writes no combat state ---
try {
  const src = extractFn(game, 'drawMallowProjectile');
  check('drawMallowProjectile is pure draw code', !/\.damage\s*=|\.hp\s*=/.test(src));
} catch (e) { failures.push('pure-draw vm block threw: ' + e.message); }

console.log(`mallow-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
