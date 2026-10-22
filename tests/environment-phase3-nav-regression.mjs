import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// ENVIRONMENT REBUILD - Phase 3 (2026-10-22): bot nav grid + bush-aware cover.
// Behavioral: boots the real game.js in a vm (browser shims, same harness as
// environment-baseline-regression.mjs) and probes in-scope internals at the
// test-export block. Pins:
//   - the nav grid builds for a Showdown theme, 100px cells, with blocked
//     cells where cubes/walls stand
//   - a BFS path exists between two open points on opposite sides of a wall
//     strip and crosses only through the strip's gap; a sealed strip has none
//   - findBotCoverPoint can return a point inside a bushZone when the bush
//     is the best (hiding) cover
//   - with BOT_NAV_GRID_ENABLED off, getBotSteeredStep never touches nav
//     state (the reactive stack is the whole behavior, as before Phase 3);
//     with it on, a steered bot acquires a nav path
const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE =
  '  globalThis.__navProbe = { buildNextShowdownMap, bushZones, waterZones, cubes, destructibleWalls, buildBotNavGrid, findBotNavPath, findBotCoverPoint, getBotSteeredStep, canBotMoveToPosition, isEntityInsideBush, SHOWDOWN_MAP_THEMES,\n' +
  '    navCellBlockedAt: (x, y) => { const i = botNavCellOf(x, y); return !!(botNavGrid && i >= 0 && botNavGrid.blocked[i] === 1); },\n' +
  '    navGridInfo: () => (botNavGrid ? { cols: botNavGrid.cols, rows: botNavGrid.rows, blockedCount: botNavGrid.blocked.reduce((a, b) => a + b, 0) } : null),\n' +
  '    setNavEnabled: (v) => { BOT_NAV_GRID_ENABLED = !!v; },\n' +
  '    getNavEnabled: () => BOT_NAV_GRID_ENABLED };\n' + ANCHOR;
const booted = source.replace(ANCHOR, PROBE);

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

const P = ctx.__navProbe;
assert.ok(P, 'nav probe must be installed by the boot');
assert.equal(P.getNavEnabled(), true, 'BOT_NAV_GRID_ENABLED defaults on');

// --- Grid builds for a Showdown theme ---------------------------------------
P.buildNextShowdownMap(0);
P.buildBotNavGrid();
const info = P.navGridInfo();
assert.ok(info, 'grid must exist after buildBotNavGrid');
assert.equal(info.cols, 40, 'default 4000px world at 100px cells = 40 cols');
assert.equal(info.rows, 40, 'default 4000px world at 100px cells = 40 rows');
assert.ok(info.blockedCount > 0, 'a built Showdown map must block some cells');
assert.ok(P.destructibleWalls.length > 0, 'theme 0 must place walls for this check');
// Find a wall tile that fully covers its cell's center point (plain rect
// math in the test): that cell must read blocked on the grid.
let coveredCell = null;
for (const w of P.destructibleWalls) {
  const cx = Math.floor((w.x + w.w / 2) / 100) * 100 + 50;
  const cy = Math.floor((w.y + w.h / 2) / 100) * 100 + 50;
  if (cx > w.x && cx < w.x + w.w && cy > w.y && cy < w.y + w.h) { coveredCell = { x: cx, y: cy }; break; }
}
assert.ok(coveredCell, 'test setup: some wall tile must cover a cell center');
assert.equal(
  P.navCellBlockedAt(coveredCell.x, coveredCell.y),
  true,
  'the cell whose center a wall tile covers must be blocked'
);

// --- Path around a wall strip, only through its gap -------------------------
P.cubes.length = 0;
P.destructibleWalls.length = 0;
P.waterZones.length = 0;
P.bushZones.length = 0;
const wallTop = { x: 1950, y: 0, w: 100, h: 1900, hp: 4200, maxHp: 4200, ownerId: null };
const wallBottom = { x: 1950, y: 2100, w: 100, h: 1900, hp: 4200, maxHp: 4200, ownerId: null };
P.destructibleWalls.push(wallTop, wallBottom);
P.buildBotNavGrid();
assert.equal(P.navCellBlockedAt(2000, 1000), true, 'wall strip cell must be blocked');
assert.equal(P.navCellBlockedAt(2000, 2000), false, 'gap cell must be open');
const crosser = { x: 1000, y: 1000, radius: 14, brawler: 'outlit' };
const path = P.findBotNavPath(crosser, 3000, 1000);
assert.ok(Array.isArray(path) && path.length >= 2, 'a path must exist around the strip');
const lastWp = path[path.length - 1];
assert.equal(lastWp.x, 3000, 'last waypoint is the exact goal x');
assert.equal(lastWp.y, 1000, 'last waypoint is the exact goal y');
for (const wp of path) {
  const inWall = (r) => wp.x > r.x + 4 && wp.x < r.x + r.w - 4 && wp.y > r.y + 4 && wp.y < r.y + r.h - 4;
  assert.ok(!inWall(wallTop) && !inWall(wallBottom), 'no waypoint may sit inside the wall strip');
}
// Every segment of the walked route (start -> waypoints in order) must
// stay out of the wall: the strip may only be crossed through the gap.
const routePts = [{ x: 1000, y: 1000 }, ...path];
for (let s = 0; s < routePts.length - 1; s++) {
  const a = routePts[s], b = routePts[s + 1];
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / 10));
  for (let k = 0; k <= steps; k++) {
    const px = a.x + (b.x - a.x) * (k / steps);
    const py = a.y + (b.y - a.y) * (k / steps);
    const inWall = (r) => px > r.x + 4 && px < r.x + r.w - 4 && py > r.y + 4 && py < r.y + r.h - 4;
    assert.ok(!inWall(wallTop) && !inWall(wallBottom), 'no path segment may cross the wall strip - it must use the gap');
  }
}
// Seal the gap: no route may exist.
P.destructibleWalls.push({ x: 1950, y: 1900, w: 100, h: 200, hp: 4200, maxHp: 4200, ownerId: null });
P.buildBotNavGrid();
assert.equal(P.findBotNavPath(crosser, 3000, 1000), null, 'a sealed strip must yield no path');

// --- Bush patches score as cover --------------------------------------------
P.destructibleWalls.length = 0;
P.bushZones.push({ x: 1080, y: 940, w: 160, h: 160 });
P.buildBotNavGrid();
const hidingBot = { x: 1000, y: 1000, radius: 14 };
const bushCover = P.findBotCoverPoint(hidingBot, { x: 3000, y: 1000 });
assert.ok(bushCover, 'with no wall cover, a hiding bush must be offered as cover');
assert.ok(
  bushCover.x >= 1080 && bushCover.x <= 1240 && bushCover.y >= 940 && bushCover.y <= 1100,
  'the cover point must be the bush patch center'
);
assert.equal(
  P.isEntityInsideBush({ x: bushCover.x, y: bushCover.y, radius: 14 }),
  true,
  'the offered cover point must actually be inside the bush'
);

// --- Steering integration: flag on acquires a path, flag off is untouched ---
P.buildNextShowdownMap(0);
P.buildBotNavGrid();
function findOpenPoint() {
  for (let gx = 300; gx < 3900; gx += 137) {
    for (let gy = 300; gy < 3900; gy += 137) {
      const probe = { x: gx, y: gy, radius: 14, brawler: 'outlit' };
      if (!P.navCellBlockedAt(gx, gy) && P.canBotMoveToPosition(probe, gx, gy)) return { x: gx, y: gy };
    }
  }
  return null;
}
const startPt = findOpenPoint();
assert.ok(startPt, 'test setup: an open start point must exist on theme 0');
let goalPt = null;
for (let gx = 3900; gx > 200 && !goalPt; gx -= 149) {
  for (let gy = 3900; gy > 200; gy -= 149) {
    const probe = { x: gx, y: gy, radius: 14, brawler: 'outlit' };
    if (Math.hypot(gx - startPt.x, gy - startPt.y) < 1500) continue;
    if (!P.navCellBlockedAt(gx, gy) && P.canBotMoveToPosition(probe, gx, gy)) { goalPt = { x: gx, y: gy }; break; }
  }
}
assert.ok(goalPt, 'test setup: an open far goal point must exist on theme 0');

const navBot = { x: startPt.x, y: startPt.y, radius: 14, brawler: 'outlit', id: 987001 };
P.getBotSteeredStep(navBot, goalPt.x - navBot.x, goalPt.y - navBot.y, 200, 0.016);
assert.ok(navBot.botNavPath, 'flag on: a steered bot must acquire a nav path toward a far goal');

P.setNavEnabled(false);
assert.equal(P.getNavEnabled(), false, 'flag must flip off for the fallback pin');
const reactiveBot = { x: startPt.x, y: startPt.y, radius: 14, brawler: 'outlit', id: 987002 };
P.getBotSteeredStep(reactiveBot, goalPt.x - reactiveBot.x, goalPt.y - reactiveBot.y, 200, 0.016);
assert.equal(reactiveBot.botNavPath, undefined, 'flag off: steering must never touch nav state (pre-Phase-3 behavior)');
P.setNavEnabled(true);

// Source pin: the steering hook is gated by the flag.
const steerStart = source.indexOf('function getBotSteeredStep');
const steerEnd = source.indexOf('function canDetectThroughBush', steerStart);
assert.ok(steerStart > 0 && steerEnd > steerStart, 'steering function must be locatable for the source pin');
assert.ok(
  source.slice(steerStart, steerEnd).includes('if (BOT_NAV_GRID_ENABLED)'),
  'the nav hook inside getBotSteeredStep must be gated behind BOT_NAV_GRID_ENABLED'
);

console.log('environment phase3 nav regression: all checks passed');
