import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// The real P12 bug: loadProgress() runs at boot BEFORE the late
// `const MAX_POWER_LEVEL` declaration initialized, so the first level clamp
// threw a TDZ ReferenceError, the load aborted, and no brawler progress was
// ever restored. Static pins first:
const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
assert.equal(source.split('const MAX_POWER_LEVEL').length - 1, 1, 'MAX_POWER_LEVEL must be declared exactly once');
assert.ok(
  source.indexOf('const MAX_POWER_LEVEL') < source.indexOf('function loadProgress()'),
  'MAX_POWER_LEVEL must be declared before loadProgress so the boot-time load can use it'
);
assert.match(source, /p12-fix-compensation/, 'the one-time P12 compensation claim must exist in the shop');
assert.match(source, /addCorePieces\(100\)/, 'compensation must grant 100 Core Pieces');

// Behavioral proof: boot the real game.js in a vm with browser shims and a
// seeded save holding a Power 12 brawler; probe playerData right after the
// boot-time loadProgress() call.
let booted = source;
const CALL = '  loadProgress();\n';
assert.ok(booted.includes(CALL), 'boot loadProgress() call site must exist');
booted = booted.replace(CALL, CALL + '  globalThis.__afterLoad = JSON.stringify({ coins: playerData.coins, orbo: playerData.brawlers?.orbo || null, ramage: playerData.brawlers?.ramage || null, brawlerCount: Object.keys(playerData.brawlers || {}).length });\n');

const PROG = { level: 12, bricks: 777, prestige: 0, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, hyperchargeDiscountPct: 0, corePerkUnlocked: true, corePerk: 'surge', selectedStar: 'slow', selectedGadget: 'g1', ownedTrinkets: [], equippedTrinkets: [] };
const seed = {
  brawl_arena_save: JSON.stringify({ persistent: { coins: 424242, gems: 50, souls: 900, corePieces: 321, brawlerProgress: { orbo: { ...PROG }, ramage: { ...PROG, level: 9, bricks: 55, corePerkUnlocked: false, corePerk: null } }, selectedBrawler: 'orbo' } }),
  brawlGameProgress: JSON.stringify({ coins: 424242, brawlers: { orbo: { ...PROG } }, selectedBrawler: 'orbo' }),
  super_granted: '1', super_granted2: '1',
};
const map = new Map(Object.entries(seed));
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
try { vm.runInContext(booted, ctx, { filename: 'game.js' }); } catch { /* later DOM wiring is stub-limited; the load probe is what matters */ }

assert.ok(ctx.__afterLoad, 'the boot load probe must run');
const after = JSON.parse(ctx.__afterLoad);
assert.equal(after.coins, 424242, 'coins must load');
assert.ok(after.brawlerCount >= 2, 'the load must populate brawler progress (normalization covers the full roster)');
assert.equal(after.orbo?.level, 12, 'Power 12 must survive a reload');
assert.equal(after.orbo?.bricks, 777, 'bricks must survive a reload');
assert.equal(after.orbo?.corePerkUnlocked, true, 'the Core Perk unlock must survive a reload');
assert.equal(after.ramage?.level, 9, 'mid-level progress must survive a reload');

console.log('Power 12 load-order regression checks passed.');
