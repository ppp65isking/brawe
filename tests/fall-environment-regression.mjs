import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Thanksgiving big update — combined Phase 2 (fall environment) + Phase 3
// (Power Box art/HP). Phase 2 is gated to Turkey Trouble (Nov 1-30, 2026)
// via isTurkeyTroubleSeasonActive; this harness boots the real game with a
// mocked Date so the gate can be exercised on Oct 31 / Nov 1 / Nov 30 /
// Dec 1 without waiting for the calendar.

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static pins: Phase 2 gate/resolver/decor ----
assert.match(source, /let FALL_ENVIRONMENT_ENABLED = true;/, 'fall environment kill switch must exist and default on');
assert.match(source, /function getSeasonalEnvironmentOverride/, 'seasonal override resolver must exist');
assert.match(source, /return seasonalOverride \? \{ \.\.\.baseTheme, \.\.\.seasonalOverride \} : baseTheme;/, 'getActiveShowdownTheme must merge base + seasonal override');
assert.equal([...source.matchAll(/fallBushFill: '#/g)].length, 10, 'every Showdown theme needs an explicit fallBushFill');
assert.equal([...source.matchAll(/fallBushDeep: '#/g)].length, 10, 'every Showdown theme needs an explicit fallBushDeep');
assert.match(source, /function buildSeasonalDecor/, 'seasonal decor builder must exist');
assert.match(source, /carveWaterNavigationLanes\(\);\n        buildSeasonalDecor\(\);/, 'decor must rebuild at the end of buildNextShowdownMap');
assert.match(source, /mapProps\.length = 0;\n    seasonalDecor = \[\];/, 'generateCubesLayout must clear stale decor for non-Showdown maps');
assert.match(source, /if \(envColors\.key === 'turkey'\) \{/, 'decor/leaves render must be gated on the merged theme season key');
assert.match(source, /decorativeFxStride > 1 && \(i % decorativeFxStride\) !== 0\) continue;/, 'falling leaves must shed under decorative pressure');
assert.match(source, /envColors\.bushHighlight \|\| 'rgba\(255, 255, 255, 0\.13\)'/, 'bush painter must consume the seasonal bush highlight when present');

// ---- Static pins: Phase 3 box art ----
assert.match(source, /function drawChunkyPowerBox/, 'unified chunky box painter must exist');
const typedBranchAt = source.indexOf('dw.isPowerBox && dw.powerBoxType');
assert.ok(typedBranchAt >= 0, 'typed box branch must exist');
assert.match(source.slice(typedBranchAt, typedBranchAt + 320), /drawChunkyPowerBox\(ctx, dw, spec\)/, 'typed box branch must use the unified painter');
const painterAt = source.indexOf('function drawChunkyPowerBox');
const painter = source.slice(painterAt, painterAt + 4200);
assert.match(painter, /age < 180/, 'box painter must have the ~180ms spawn pop');
assert.match(painter, /hpPct <= 0\.66/, 'box painter must crack at <=66% HP');
assert.match(painter, /hpPct <= 0\.33/, 'box painter must crack harder at <=33% HP');
assert.match(painter, /if \(hpPct < 1\)/, 'box HP bar must draw only while damaged');
assert.match(source, /if \(isTraining \|\| !dw\.powerBoxType\) \{/, 'numeric HP text must be Training-only for typed boxes (legacy untyped boxes keep it)');
assert.match(source, /ctx\.fillStyle = '#8a2be2'/, 'legacy flat branches must remain for untyped boxes');
assert.match(source, /spawnedAt: performance\.now\(\)/, 'createPowerBox must stamp spawnedAt for the spawn pop');
assert.match(source, /powerBoxShards\.push\(\{ x: cx, y: cy/, 'box breaks must spawn shards from the reward funnel');

// ---- Behavioral harness: real game in a vm with a mocked clock ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__fallProbe = (() => { let __tmp;
  return {
    getSeasonalEnvironmentOverride, getActiveShowdownTheme, SHOWDOWN_MAP_THEMES,
    buildNextShowdownMap, generatePowerBoxes, createPowerBox, POWER_BOX_TYPES,
    spawnShowdownPowerBoxReward, isTurkeyTroubleSeasonActive,
    get seasonalDecor() { return seasonalDecor; },
    get destructibleWalls() { return destructibleWalls; },
    get bushZones() { return bushZones; },
    get waterZones() { return waterZones; },
    get cubes() { return cubes; },
    get mapProps() { return mapProps; },
    get powerups() { return powerups; },
    get powerBoxShards() { return powerBoxShards; },
    setVar: (n, v) => { __tmp = v; eval(n + ' = __tmp'); },
  }; })();
` + ANCHOR;
const booted = source.replace(ANCHOR, PROBE);

let mockNow = Date.UTC(2026, 9, 31, 12, 0, 0); // Oct 31, 2026
class MockDate extends Date {
  constructor(...args) { super(...(args.length ? args : [mockNow])); }
  static now() { return mockNow; }
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(424242);
const seededMath = Object.create(Math);
seededMath.random = () => rng();
const reseed = (n) => { rng = mulberry32(n); };

const storage = new Map();
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: [] });
    if (typeof k === 'string') return t[k] !== undefined ? t[k] : (() => {});
    return undefined;
  }, set: () => true });
}
function makeEl() {
  const el = {
    style: new Proxy({}, { get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? (() => {}) : t[k]), set: () => true }),
    children: [], dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    width: 800, height: 600, textContent: '', innerHTML: '', value: '',
    appendChild(c) { this.children.push(c); return c; }, append(...c) { this.children.push(...c); }, prepend() {}, removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [], getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600, left: 0, top: 0 }),
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
  };
  return new Proxy(el, { get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'firstChild') return t.children[0] || null;
    if (k === 'lastChild') return t.children[t.children.length - 1] || null;
    if (k === 'parentNode' || k === 'parentElement' || k === 'nextSibling' || k === 'previousSibling') return null;
    if (k === 'childNodes' || k === 'children') return [];
    if (typeof k === 'string') return () => makeEl();
    return undefined;
  }, set: () => true });
}
const sandbox = {
  console, Math: seededMath, JSON, Date: MockDate, Map, Set, Array, Object, Number, String, Boolean, RegExp, Error, Promise, Uint8Array,
  performance: { now: () => mockNow }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  Image: class { constructor() { this.complete = true; } }, Audio: class { play() { return Promise.resolve(); } pause() {} },
  location: { href: 'http://localhost/', reload() {} }, alert() {}, addEventListener() {}, removeEventListener() {},
  getComputedStyle: () => ({}),
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(booted, sandbox, { filename: 'game.js' });
const P = sandbox.__fallProbe;
assert.ok(P, 'fall probe must boot');

const OCT31 = Date.UTC(2026, 9, 31, 12, 0, 0);
const NOV1 = Date.UTC(2026, 10, 1, 0, 0, 0);
const NOV15 = Date.UTC(2026, 10, 15, 12, 0, 0);
const NOV30 = Date.UTC(2026, 10, 30, 23, 0, 0);
const DEC1 = Date.UTC(2026, 11, 1, 0, 0, 0);

// ---- Season gate matrix ----
mockNow = OCT31;
assert.equal(P.isTurkeyTroubleSeasonActive(mockNow), false, 'Oct 31 is before Turkey Trouble');
assert.equal(P.getSeasonalEnvironmentOverride(), null, 'override must be null on Oct 31');
const baseBushSnapshot = P.SHOWDOWN_MAP_THEMES.map(t => t.bushFill);
for (let idx = 0; idx < 10; idx++) {
  P.setVar('currentMapOverride', idx);
  assert.equal(P.getActiveShowdownTheme(), P.SHOWDOWN_MAP_THEMES[idx], `Oct 31 theme ${idx} must be the base object itself`);
}
mockNow = NOV1;
assert.equal(P.isTurkeyTroubleSeasonActive(mockNow), true, 'Nov 1 starts Turkey Trouble');
for (let idx = 0; idx < 10; idx++) {
  P.setVar('currentMapOverride', idx);
  const base = P.SHOWDOWN_MAP_THEMES[idx];
  const override = P.getSeasonalEnvironmentOverride();
  assert.ok(override && override.key === 'turkey', `Nov 1 override must be the turkey override (theme ${idx})`);
  const merged = P.getActiveShowdownTheme();
  assert.notEqual(merged, base, `Nov 1 theme ${idx} must be a merged copy, not the base object`);
  assert.equal(merged.bushFill, base.fallBushFill, `theme ${idx} merged bushFill must be its fallBushFill`);
  assert.equal(merged.bushDeep, base.fallBushDeep, `theme ${idx} merged bushDeep must be its fallBushDeep`);
  assert.notEqual(merged.cubeFill, base.cubeFill, `theme ${idx} walls must warm-tint in season`);
  assert.notEqual(merged.wallBoxFill, base.wallBoxFill, `theme ${idx} wall boxes must warm-tint in season`);
  assert.notEqual(merged.bgInner, base.bgInner, `theme ${idx} ground must warm-tint in season`);
  assert.equal(merged.name, base.name, `theme ${idx} identity (name) must survive the merge`);
  assert.equal(base.key, undefined, 'base theme object must not be mutated by the merge');
  assert.equal(base.bushFill, baseBushSnapshot[idx], 'base theme bushFill must not be mutated');
}
mockNow = NOV30;
assert.ok(P.getSeasonalEnvironmentOverride(), 'override must still be active on Nov 30');
mockNow = DEC1;
assert.equal(P.getSeasonalEnvironmentOverride(), null, 'override must be null on Dec 1 (Xplodemis owns December)');
P.setVar('currentMapOverride', 0);
assert.equal(P.getActiveShowdownTheme(), P.SHOWDOWN_MAP_THEMES[0], 'Dec 1 theme must be the base object again');
// Kill switch
mockNow = NOV15;
assert.ok(P.getSeasonalEnvironmentOverride(), 'override active mid-season before kill-switch check');
P.setVar('FALL_ENVIRONMENT_ENABLED', false);
assert.equal(P.getSeasonalEnvironmentOverride(), null, 'kill switch off must disable the override mid-season');
assert.equal(P.getActiveShowdownTheme(), P.SHOWDOWN_MAP_THEMES[0], 'kill switch off must restore the base theme');
P.setVar('FALL_ENVIRONMENT_ENABLED', true);
assert.ok(P.getSeasonalEnvironmentOverride(), 'kill switch back on must restore the override');

// ---- Map builds: terrain identical in/out of season; decor placed safely ----
function terrainCounts() {
  return { walls: P.destructibleWalls.length, bushes: P.bushZones.length, water: P.waterZones.length, cubes: P.cubes.length, pads: P.mapProps.length };
}
function rectDistSq(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return dx * dx + dy * dy;
}
const PROTECTED = [
  { x: 2000, y: 2000, r: 300 },
  { x: 560, y: 560, r: 150 }, { x: 3440, y: 560, r: 150 },
  { x: 3440, y: 3440, r: 150 }, { x: 560, y: 3440, r: 150 },
  { x: 2000, y: 460, r: 150 }, { x: 2000, y: 3540, r: 150 },
  { x: 460, y: 2000, r: 150 }, { x: 3540, y: 2000, r: 150 },
];
P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000);
for (let idx = 0; idx < 10; idx++) {
  P.setVar('currentMapOverride', idx);
  mockNow = OCT31; reseed(1000 + idx);
  P.buildNextShowdownMap(idx);
  const outCounts = terrainCounts();
  assert.equal(P.seasonalDecor.length, 0, `map ${idx} must have no decor out of season`);
  mockNow = NOV15; reseed(1000 + idx);
  P.buildNextShowdownMap(idx);
  assert.deepEqual(terrainCounts(), outCounts, `map ${idx} terrain counts must be identical in season`);
  const piles = P.seasonalDecor;
  assert.ok(piles.length >= 10, `map ${idx} should place most of its 14 leaf piles (got ${piles.length})`);
  for (const pile of piles) {
    for (const z of P.waterZones) assert.ok(rectDistSq(pile.x, pile.y, z) >= pile.r * pile.r, `map ${idx} pile must not touch water`);
    for (const z of P.bushZones) assert.ok(rectDistSq(pile.x, pile.y, z) >= pile.r * pile.r, `map ${idx} pile must not touch bushes`);
    for (const w of P.destructibleWalls) assert.ok(rectDistSq(pile.x, pile.y, w) >= pile.r * pile.r, `map ${idx} pile must not touch walls/props`);
    for (const p of P.mapProps) assert.ok(rectDistSq(pile.x, pile.y, p) >= pile.r * pile.r, `map ${idx} pile must not touch floor pads`);
    for (const c of P.cubes) assert.ok(rectDistSq(pile.x, pile.y, c) >= pile.r * pile.r, `map ${idx} pile must not touch cubes`);
    for (const prot of PROTECTED) assert.ok(Math.hypot(pile.x - prot.x, pile.y - prot.y) >= prot.r + pile.r, `map ${idx} pile must respect spawn/centre clearance`);
  }
  // Deterministic: same seed + same map geometry -> identical piles.
  const firstRun = Array.from(piles, p => [p.x, p.y, p.r]);
  reseed(1000 + idx);
  P.buildNextShowdownMap(idx);
  assert.deepEqual(Array.from(P.seasonalDecor, p => [p.x, p.y, p.r]), firstRun, `map ${idx} decor must be deterministic`);
}

// ---- Power Boxes: HP table, spawn counts, rewards ----
assert.deepEqual(
  Object.fromEntries(Object.entries(P.POWER_BOX_TYPES).map(([k, v]) => [k, v.hp])),
  { standard: 3600, fortified: 7200, charged: 4800, vitality: 5400, nova: 8400 },
  'Power Box HP table must be the Phase 3 retune'
);
mockNow = NOV15;
P.setVar('currentMapOverride', 0);
reseed(777);
P.buildNextShowdownMap(0);
P.generatePowerBoxes();
const boxes = P.destructibleWalls.filter(w => w.isPowerBox);
assert.equal(boxes.length, 75, `fresh Solo Showdown must spawn 75 Power Boxes (got ${boxes.length})`);
for (const box of boxes) {
  const spec = P.POWER_BOX_TYPES[box.powerBoxType];
  assert.ok(spec, `spawned box must have a known type (got ${box.powerBoxType})`);
  assert.equal(box.hp, spec.hp, `${box.powerBoxType} box hp must equal spec hp`);
  assert.equal(box.maxHp, spec.hp, `${box.powerBoxType} box maxHp must equal spec hp`);
  assert.equal(typeof box.spawnedAt, 'number', 'spawned boxes must carry spawnedAt for the spawn pop');
}
const expectedRewards = {
  standard: [undefined],
  fortified: [undefined, undefined],
  charged: ['charged_core'],
  vitality: ['vitality_core'],
  nova: ['nova_core'],
};
for (const [type, kinds] of Object.entries(expectedRewards)) {
  const box = P.createPowerBox(2000, 2000, type);
  const powerupsBefore = P.powerups.length;
  const shardsBefore = P.powerBoxShards.length;
  P.spawnShowdownPowerBoxReward(box);
  const droppedKinds = Array.from(P.powerups.slice(powerupsBefore), p => p.kind);
  assert.deepEqual(droppedKinds, kinds, `${type} box must drop exactly its documented reward`);
  const shardDelta = P.powerBoxShards.length - shardsBefore;
  assert.ok(shardDelta >= 4 && shardDelta <= 6, `${type} break must spawn 4-6 shards (got ${shardDelta})`);
  P.spawnShowdownPowerBoxReward(box);
  assert.equal(P.powerups.length, powerupsBefore + kinds.length, `${type} reward must be duplicate-guarded`);
  assert.equal(P.powerBoxShards.length, shardsBefore + shardDelta, `${type} shards must be duplicate-guarded too`);
}

console.log('Fall environment + Power Box regression checks passed.');
process.exit(0);
