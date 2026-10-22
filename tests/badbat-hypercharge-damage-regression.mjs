// BadBat Hypercharge wave damage regression (2026-10-22, Anthony's live report:
// "bad bat hc attack doesn't do DMG").
//
// Root cause: the shockwave bullet never set hitboxMod, and the generic
// entity-hit tests (VS player / VS bots) measure hits as
//   target.radius + (hitboxMod || 1) * 4
// — a ~4px thread — while the wave's visible radius is 42px and GROWS to
// ~2.4x in Hypercharge (render: baseR * (1 + lifePct * 1.4)). The widening
// was render-only, so the Hyper wave washed over enemies and dealt nothing
// off dead-center.
//
// Fix: the wave spawns with hitboxMod = baseRadius / 4 and a per-frame sync
// in the bullet loop mirrors the render expansion into hitboxMod.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Static anchors ---
assert.match(game, /hitboxMod: baseRadius \/ 4,/, 'wave must spawn with hitboxMod = baseRadius / 4');
const sync = game.match(/if \(b\.isBadBatWave && b\.maxLife > 0\) \{[\s\S]*?\n      \}/);
assert.ok(sync, 'bullet-loop BadBat wave hitbox sync block missing');
assert.match(sync[0], /b\.isHyper \? \(1 \+ waveProgress \* 1\.4\)/, 'hyper growth must mirror the render expansion (1 + progress * 1.4)');
assert.match(sync[0], /b\.g1Active \? 1\.15 : 1/, 'G1 width factor must mirror the render (1.15)');
assert.match(sync[0], /b\.hitboxMod = waveRadius \/ 4;/, 'sync must write hitboxMod from the wave radius');
// The render formula the sync mirrors (must not drift):
assert.match(game, /const cr = b\.isHyper \? baseR \* \(1 \+ lifePct \* 1\.4\) : \(b\.g1Active \? baseR \* 1\.15 : baseR\);/, 'render expansion formula changed — update the hitbox sync to match');
console.log('✔ static anchors: wave hitbox = visible radius, hyper growth synced');

// --- Behavioral: boot the real game, fire waves at offset targets ---
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
const store = new Map();
store.set('brawl_arena_save', JSON.stringify({ persistent: { selectedBrawler: 'badbat' } }));
const sandbox = {
  console, Math, JSON, Date, Promise, Set, Map, Array, Object, Number, String, Boolean, RegExp, Error, TypeError, RangeError, Symbol, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  performance: { now: () => Date.now() },
  document: {
    createElement: () => makeEl(), createElementNS: () => makeEl(),
    getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(),
    documentElement: makeEl(), hidden: false, visibilityState: 'visible',
  },
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() },
  navigator: { userAgent: 'node', maxTouchPoints: 0 },
  location: { href: 'http://localhost/', reload() {} },
  Audio: class { play() { return Promise.resolve(); } pause() {} },
  Image: class {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  addEventListener() {}, removeEventListener() {},
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  getComputedStyle: () => ({}),
  alert() {}, confirm: () => true, prompt: () => null,
  fetch: () => Promise.reject(new Error('no net')),
  URL, Blob: class {}, FileReader: class {},
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(game, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
assert.ok(api && api.player && api.bots && api.bullets, 'test API unavailable after boot');

api.launchShowdownMatch();
api.playing = true;
const p = api.player;
const bot = api.bots.find(b => b && b.hp > 0);
assert.ok(bot, 'no bot to target');
// Keep only the target bot so each update() frame stays cheap (test-time).
api.bots.length = 0;
api.bots.push(bot);

function waveHits(isHyper, offsetY) {
  api.isHypercharged = !!isHyper;
  bot.hp = bot.maxHp = 100000; bot.shield = 0; bot.shieldMax = 0; bot.badbatMarkedUntil = 0;
  api.bullets.length = 0;
  const speed = 920, range = 440;
  api.bullets.push({
    ownerBrawler: 'badbat', isBadBatWave: true,
    x: p.x + (p.radius + 14), y: p.y, vx: speed, vy: 0,
    life: 0, maxLife: range / speed, damage: 1400, pierce: true, pierceWalls: false,
    ownerId: p.id, hitIds: {}, isHyper: !!isHyper, g1Active: false,
    baseRadius: 42, radius: 42, hitboxMod: 42 / 4, ang: 0,
  });
  // Marking (badbatMarkedUntil) is applied only when the wave itself connects
  // with dealtDamage > 0 — a clean hit signal, immune to minion-bite noise.
  for (let f = 0; f < 20; f++) {
    bot.x = p.x + 150; bot.y = p.y + offsetY; bot.stunUntil = Date.now() + 100000;
    api.update(1 / 60);
    if ((bot.badbatMarkedUntil || 0) > Date.now()) return true;
  }
  return false;
}

assert.equal(waveHits(false, 30), true, 'normal wave must hit a target 30px off-axis (inside its 42px visual radius)');
assert.equal(waveHits(true, 50), true, 'HYPER wave must hit a target 50px off-axis (its widened visual covers it)');
assert.equal(waveHits(true, 130), false, 'hyper wave must NOT hit a target 130px off-axis (no overreach)');
console.log('✔ behavioral: wave hits match its visible radius, normal + hyper');
console.log('--- BadBat hypercharge damage regression passed ---');
process.exit(0);
