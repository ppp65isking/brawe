// Magnatar SP2 "Kinetic Induction" loop nerf regression (2026-10-23, Anthony's order:
// "nerf the loop, not the orbs").
//
// Before: every projectile drawn into the Polarity Beacon vortex extended it by
// 0.35s (+350ms) and refunded 4% Super, uncapped — fed by multi-projectile
// brawlers the beacon became near-permanent and refunded the next Super.
// After: refund 2% per drawn projectile; per-beacon caps of +2.0s total duration
// extension and 25% total Super refund, so one cast cannot snowball.
// Orb damage/counts, beacon base duration/radius, SP1, gadgets and Hypercharge
// are untouched (static anchors below pin that).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Static anchors: the exact nerf constants and their single grant site ---
assert.match(game, /const sp2ExtGrant = Math\.min\(350, 2000 - v\.sp2ExtMs\);/,
  'SP2 extension grant must be min(350ms, 2000ms - granted-so-far)');
assert.match(game, /const sp2RefundGrant = Math\.min\(2, 25 - v\.sp2RefundPct\);/,
  'SP2 refund grant must be min(2%, 25% - granted-so-far)');
assert.match(game, /superCharge = clamp\(superCharge \+ sp2RefundGrant, 0, 100\);/,
  'player Super refund must use the capped grant');
assert.match(game, /owner\.superCharge = clamp\(\(owner\.superCharge \|\| 0\) \+ sp2RefundGrant, 0, 100\);/,
  'bot Super refund must use the capped grant');
assert.match(game, /sp2: 'Kinetic Induction \(Every projectile drawn into the magnetic vortex extends its duration by 0\.35s \(up to \+2\.0s per beacon\) and charges Magnatar\\'s Super by 2% \(up to 25% per beacon\)\)'/,
  'kit-screen SP2 text must describe the nerfed numbers');
// The old uncapped grants must be gone:
assert.doesNotMatch(game, /superCharge = clamp\(superCharge \+ 4, 0, 100\);/,
  'old uncapped 4% player refund must be gone');
assert.doesNotMatch(game, /\(owner\.superCharge \|\| 0\) \+ 4, 0, 100\)/,
  'old uncapped 4% bot refund must be gone');
// Untouched: beacon base duration, radius, SP1:
assert.match(game, /expiresAt: now \+ \(isPersonalAura \? 6000 : 5500\)/,
  'beacon base duration must stay 5500ms (6000ms personal aura)');
assert.match(game, /const baseRadius = isPersonalAura \? 180 : \(isHyper \? 308 : 220\);/,
  'beacon radius must stay 220 (308 hyper, 180 personal aura)');
assert.match(game, /sp1: 'Ferrous Drag \(Enemies caught within the magnetic beacon are slowed by 30% by intense magnetic drag\)'/,
  'SP1 Ferrous Drag text must be untouched');
console.log('✔ static anchors: nerf constants in place, old 4% grants gone, SP1/duration/radius untouched');

// --- Behavioral: boot the real game, deploy an SP2 beacon, feed it projectiles ---
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
store.set('brawl_arena_save', JSON.stringify({ persistent: { selectedBrawler: 'magnatar' } }));
// Virtual clock: the vortex loop runs on performance.now(), so time is fully deterministic.
let fakeNow = Date.now();
const sandbox = {
  console, Math, JSON, Date, Promise, Set, Map, Array, Object, Number, String, Boolean, RegExp, Error, TypeError, RangeError, Symbol, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  performance: { now: () => fakeNow },
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
assert.ok(api && api.deployMagnatarBeacon && api.magnatarVortices && api.bullets && api.update,
  'test API unavailable after boot');

api.launchShowdownMatch();
api.playing = true;
const owner = api.bots.find(b => b && b.hp > 0);
assert.ok(owner, 'no bot to own the beacon');
// Trim to the single owner so each update() frame stays cheap and deterministic.
api.bots.length = 0;
api.bots.push(owner);
owner.hp = owner.maxHp = 100000;
owner.selectedStar = 'sp2'; // Kinetic Induction
owner.superCharge = 0;

// Ground beacon 400px from the owner so the owner's own fire can never feed it.
const bx = owner.x + 400, by = owner.y;
api.deployMagnatarBeacon(owner, bx, by, null, false, false);
const v = api.magnatarVortices[api.magnatarVortices.length - 1];
assert.ok(v && v.sp2 === true && v.sp1 === false, 'beacon must be SP2-only');
assert.strictEqual(v.radius, 220, 'beacon radius must stay 220');
const baseExpires = v.expiresAt;
assert.ok(Math.abs(baseExpires - (fakeNow + 5500)) < 50,
  `beacon base duration must stay 5500ms (got ${baseExpires - fakeNow}ms)`);

function feedOneProjectile() {
  api.bullets.length = 0; // clear strays (e.g. owner bot fire) so only the test projectile feeds
  api.bullets.push({
    ownerBrawler: 'magnatar', x: v.x, y: v.y, vx: 0, vy: 0,
    life: 0, maxLife: 120, damage: 0, pierce: true, pierceWalls: false,
    ownerId: owner.id, hitIds: {}, radius: 8, ang: 0,
  });
  fakeNow += 16;
  api.update(1 / 60);
}

// 1) Per-projectile refund is now 2% (was 4%), extension +350ms per projectile.
feedOneProjectile();
assert.strictEqual(v.sp2RefundPct, 2, 'one drawn projectile must grant exactly 2% refund');
assert.strictEqual(owner.superCharge, 2, 'owner Super charge must rise by exactly 2%');
assert.strictEqual(v.sp2ExtMs, 350, 'one drawn projectile must grant exactly 350ms extension');
assert.strictEqual(v.expiresAt, baseExpires + 350, 'expiresAt must extend by exactly 350ms');
console.log('✔ behavioral: 2% refund and +350ms per drawn projectile');

// 2) Heavy feed (20 projectiles, like a multi-projectile brawler barrage): caps hold.
for (let i = 0; i < 19; i++) feedOneProjectile();
assert.strictEqual(v.sp2ExtMs, 2000, 'total extension must cap at +2000ms under heavy feed');
assert.strictEqual(v.sp2RefundPct, 25, 'total refund must cap at 25% under heavy feed');
assert.strictEqual(owner.superCharge, 25, 'owner Super charge must cap at +25% under heavy feed');
assert.ok(v.expiresAt <= baseExpires + 2000,
  `beacon lifetime extension must cap at +2.0s (got ${v.expiresAt - baseExpires}ms)`);
console.log('✔ behavioral: +2.0s extension cap and 25% refund cap hold under 20-projectile feed');

// 3) Past the caps, further projectiles grant nothing — the next Super comes slower.
for (let i = 0; i < 5; i++) feedOneProjectile();
assert.strictEqual(v.sp2RefundPct, 25, 'refund must stay capped at 25%');
assert.strictEqual(owner.superCharge, 25, 'Super charge must not grow past the cap');
assert.strictEqual(v.sp2ExtMs, 2000, 'extension must stay capped at 2000ms');
console.log('✔ behavioral: post-cap projectiles grant nothing');

// 4) The beacon actually expires — no near-permanent vortex from the loop.
fakeNow = v.expiresAt + 1;
api.update(1 / 60);
assert.ok(!api.magnatarVortices.includes(v), 'beacon must expire once its (capped) lifetime ends');
console.log('✔ behavioral: beacon expires after its capped lifetime — loop cannot snowball');

console.log('magnatar-sp2-nerf-regression: ALL PASS');
process.exit(0); // game.js boot arms real timers in the sandbox; exit explicitly.
