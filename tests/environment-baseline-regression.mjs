import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// ENVIRONMENT REBUILD — Phase 0 baseline (2026-10-22).
// Pins TODAY's environment behavior before the rebuild touches anything:
//   - every Showdown theme builds bush zones (the terrain the hiding system uses)
//   - water zones per theme, exactly as today's center-lane carve leaves them
//   - isEntityInsideBush round-trips a point inside a placed bush
//   - findBotCoverPoint behavior, including the no-cover fallback (Phase 2
//     repointed it at bushZones; pinned below as no-throw)
// Behavioral: boots the real game.js in a vm (browser shims, same pattern as
// power12-load-order-regression.mjs) and probes in-scope internals at the
// test-export block. No game code is modified by this test.
const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const booted = source.replace(
  ANCHOR,
  '  globalThis.__envProbe = { buildNextShowdownMap, bushZones, waterZones, isEntityInsideBush, findBotCoverPoint, SHOWDOWN_MAP_THEMES };\n' + ANCHOR
);

const map = new Map();
const storage = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => { map.set(k, String(v)); },
  removeItem: (k) => { map.delete(k); },
  clear: () => map.clear(),
  key: (i) => [...map.keys()][i] ?? null,
  get length() { return map.size; },
};
const dummy = (() => {
  const fn = function () {};
  const d = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'length') return 0;
      if (p === Symbol.iterator) return [][Symbol.iterator].bind([]);
      return d;
    },
    set() { return true; },
    apply() { return d; },
    construct() { return d; },
  });
  return d;
})();
const styleStub = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => { t[p] = v; return true; } });
const elCache = new Map();
const el = (id) => {
  if (id && elCache.has(id)) return elCache.get(id);
  const e = {
    style: styleStub(), dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], firstElementChild: null, value: '', textContent: '', innerHTML: '',
    addEventListener() {}, removeEventListener() {}, appendChild(c) { return c; },
    append() {}, prepend() {}, before() {}, after() {}, replaceWith() {}, replaceChildren() {},
    insertAdjacentHTML() {}, insertAdjacentElement() { return el(); },
    removeChild(c) { return c; }, remove() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => el(), querySelectorAll: () => [], getContext: () => dummy,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
    cloneNode: () => el(), insertBefore(c) { return c; }, closest: () => null, focus() {}, click() {},
    width: 300, height: 150,
  };
  if (id) elCache.set(id, e);
  return e;
};
const sandbox = {
  console, JSON, Math, Date, Promise, Set, Map, Array, Object, Number, String, Boolean, RegExp, Error, TypeError, RangeError, SyntaxError, ReferenceError, Intl, URLSearchParams, ArrayBuffer, Uint8Array, Float32Array, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  localStorage: storage,
  document: {
    getElementById: (id) => el(id),
    querySelector: () => el(), querySelectorAll: () => [],
    createElement: () => el(), createElementNS: () => el(),
    addEventListener() {}, removeEventListener() {},
    body: el('body'), head: el('head'), documentElement: el('html'), readyState: 'complete',
    hidden: false, visibilityState: 'visible',
  },
  // bootstrap.js installs this before game.js loads in the real page.
  BrawePassTokens: { normalize() {}, earn() { return true; }, purchase() { return false; }, offers: [] },
  navigator: { userAgent: 'node-test', language: 'en-US' },
  location: { reload() {}, href: 'https://ppp65isking.github.io/brawe/', search: '', hash: '' },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  alert() {}, confirm: () => true, prompt: () => null,
  Image: class { constructor() { this.style = {}; } },
  Audio: class { constructor() { this.style = {}; } play() { return Promise.resolve(); } pause() {} },
  Blob: class {}, FileReader: class {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({}),
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  addEventListener() {}, removeEventListener() {},
  performance: { now: () => 0 },
  fetch: () => Promise.reject(new Error('no net in test')),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
try { vm.runInContext(booted, ctx, { filename: 'game.js' }); } catch { /* late DOM wiring is stub-limited; the probes below are what matter */ }

const P = ctx.__envProbe;
assert.ok(P, 'environment probe must be installed by the boot');

// --- Showdown themes build terrain -------------------------------------------
assert.equal(P.SHOWDOWN_MAP_THEMES.length, 10, 'there are 10 Showdown themes today');
for (let i = 0; i < P.SHOWDOWN_MAP_THEMES.length; i++) {
  P.buildNextShowdownMap(i);
  const name = P.SHOWDOWN_MAP_THEMES[i].name;
  assert.ok(P.bushZones.length > 0, `theme ${i} (${name}) must build bush zones (got ${P.bushZones.length})`);
  if (i === 7) {
    // Gearfall Foundry: its four canal rects originally sat exactly inside
    // the 240px center cross that carveWaterNavigationLanes() cuts after
    // every build, so the carve removed ALL of its water (Phase 0 pin).
    // Phase 4 rotated the canals into a pinwheel whose arms end at the
    // carve cross boundary, so all four canals now survive the carve.
    assert.equal(P.waterZones.length, 4, 'theme 7 (Gearfall Foundry) keeps its 4 pinwheel canals after the carve (Phase 4 fix)');
  } else {
    assert.ok(P.waterZones.length > 0, `theme ${i} (${name}) must build water zones (got ${P.waterZones.length})`);
  }
}

// --- isEntityInsideBush round-trip -------------------------------------------
P.buildNextShowdownMap(2); // Four Corners layout
const zone = P.bushZones[0];
assert.ok(zone, 'Four Corners must place bushes');
const centerEntity = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 14 };
assert.equal(P.isEntityInsideBush(centerEntity), true, 'center of a placed bush must read as inside');
// A point verified outside every placed bush by plain rect math (independent
// of the game's own collision helper) must read as outside.
let outsidePoint = null;
for (let gx = 10; gx < 4000 && !outsidePoint; gx += 37) {
  for (let gy = 10; gy < 4000 && !outsidePoint; gy += 37) {
    const inAny = P.bushZones.some((z) => gx > z.x - 20 && gx < z.x + z.w + 20 && gy > z.y - 20 && gy < z.y + z.h + 20);
    if (!inAny) outsidePoint = { x: gx, y: gy, radius: 14 };
  }
}
assert.ok(outsidePoint, 'test setup: must find a point outside all bushes');
assert.equal(P.isEntityInsideBush(outsidePoint), false, 'a point outside every bush must read as outside');
assert.equal(P.isEntityInsideBush(null), false, 'null entity must read as outside');

// --- findBotCoverPoint ---------------------------------------------------------
// Realistic cases never throw today:
assert.equal(P.findBotCoverPoint({ x: 2000, y: 2000, radius: 14 }, null), null, 'null threat must return null');
const cover = P.findBotCoverPoint({ x: 2000, y: 2000, radius: 14 }, { x: 2000, y: 500 });
assert.ok(cover && Number.isFinite(cover.x) && Number.isFinite(cover.y), 'bot near walls must get a cover point');
// FIXED by Phase 2 (2026-10-22): the no-cover fallback used to read the
// never-declared `bushes` array and throw ReferenceError. It now iterates
// bushZones, so the no-cover case must NOT throw — it returns a bush point
// when a bush center is within 400px and movable, otherwise null.
let noCoverResult;
assert.doesNotThrow(() => {
  noCoverResult = P.findBotCoverPoint({ x: 120, y: 120, radius: 14 }, { x: 2000, y: 2000 });
}, 'no-cover findBotCoverPoint must not throw after the Phase 2 repoint');
assert.ok(
  noCoverResult === null || (Number.isFinite(noCoverResult.x) && Number.isFinite(noCoverResult.y)),
  'no-cover findBotCoverPoint returns null or a finite bush point'
);

console.log('environment baseline regression: all checks passed');
