// Hypercharge leak regression (pre-existing bug, found during the
// Thanksgiving surprise batch):
//
// An always_hyper match left the player hypercharged into the next launch.
// Root cause: the player's hyper state is three module-level globals
// (isHypercharged / hyperchargeUntil / hyperChargeCharge). The always_hyper
// grant sets hyperchargeUntil = now + 999999999 (~11.5 days), and NO launch
// boundary ever reset the globals — so the update() expiry check
// (now > hyperchargeUntil) could never fire in the next match, and the
// player started the next (normal) match hypercharged with a full meter.
//
// Fix: resetPlayerHyperchargeState() — clears all three globals plus the
// player-entity mirrors — called first at every launch boundary:
// launchShowdownMatch(), startDuelsRound(), launchTrainingSandbox(),
// launchTutorialMatch().
//
// Behavioural core (real game booted in a VM, real launches):
//   always_hyper match -> hypercharged (mutator still works)
//   -> normal match -> NOT hypercharged (the leak is gone)
//   -> always_hyper again -> hypercharged again (reset didn't break it)
//   -> normal match again -> clean again
// plus: a normal short hyper still expires via the untouched update() path.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. Static pins
const helper = game.match(/function resetPlayerHyperchargeState\(\) \{[\s\S]*?\n  \}/);
check('resetPlayerHyperchargeState helper exists', !!helper);
if (helper) {
  check('helper clears isHypercharged', /isHypercharged = false;/.test(helper[0]));
  check('helper clears hyperchargeUntil', /hyperchargeUntil = 0;/.test(helper[0]));
  check('helper clears hyperChargeCharge', /hyperChargeCharge = 0;/.test(helper[0]));
  check('helper clears player.isHypercharged mirror', /player\.isHypercharged = false;/.test(helper[0]));
  check('helper clears player.hyperChargeCharge mirror', /player\.hyperChargeCharge = 0;/.test(helper[0]));
  check('helper refreshes the hyper HUD (guarded)', /if \(typeof updateHyperButton === 'function'\) updateHyperButton\(\);/.test(helper[0]));
}

function fnBody(name) {
  const start = game.indexOf(`function ${name}(`);
  assert.ok(start !== -1, `${name} missing`);
  // Body runs to the next top-level-ish `function ` at the same indent is
  // unreliable in this file; slice a generous window — the call sites are all
  // within the first lines of each launcher.
  return game.slice(start, start + 4000);
}
const showdownStart = game.indexOf('function launchShowdownMatch()');
const showdownHead = game.slice(showdownStart, showdownStart + 1200);
const showdownToFused = game.slice(showdownStart, game.indexOf("showdownMode === 'fused'", showdownStart));
check('launchShowdownMatch resets hyper first (before friendly-config consumption)',
  /resetPlayerHyperchargeState\(\);\s*\n\s*\/\/ Friendly Battles/.test(showdownHead));
check('launchShowdownMatch reset precedes the fused early return',
  showdownToFused.includes('resetPlayerHyperchargeState()'));
check('startDuelsRound resets hyper at the top',
  /function startDuelsRound\(\) \{\s*\n\s*\/\/ Hypercharge leak fix[\s\S]{0,400}?resetPlayerHyperchargeState\(\);/.test(game));
check('startDuelsRound reset runs BEFORE the saved-charge restore (charge carryover kept)',
  game.indexOf('resetPlayerHyperchargeState();', game.indexOf('function startDuelsRound()')) <
  game.indexOf('hyperChargeCharge = savedPlayerHyper || 0;'));
check('launchTrainingSandbox resets hyper', /function launchTrainingSandbox\([^)]*\) \{\s*\n\s*\/\/ Hypercharge leak fix[\s\S]{0,300}?resetPlayerHyperchargeState\(\);/.test(game));
check('launchTutorialMatch resets hyper', /function launchTutorialMatch\(\) \{\s*\n\s*\/\/ Hypercharge leak fix[\s\S]{0,300}?resetPlayerHyperchargeState\(\);/.test(game));

// The fix must not have "fixed" the leak by deleting the mutator behaviour.
check('always_hyper launch grant intact (isHypercharged + ~11.5-day until + charge 100)',
  /if \(isMutatorActive\('always_hyper'\) \|\| isHyperForgeLTM\) \{\s*\n\s*if \(!isHypercharged\) recordOverdriveActivation\(\);\s*\n\s*isHypercharged = true;\s*\n\s*hyperchargeUntil = performance\.now\(\) \+ 999999999;\s*\n\s*hyperChargeCharge = 100;/.test(game));
check('per-frame always_hyper enforcer in update() intact',
  /if \(isMutatorActive\('always_hyper'\) \|\| isHyperForgeLTM\) \{\s*\n\s*if \(player\.hp > 0\) \{\s*\n\s*if \(!isHypercharged\) recordOverdriveActivation\(\);\s*\n\s*isHypercharged = true;/.test(game));
check('respawn re-grant intact (restoreRespawningEntity)',
  /if \(isMutatorActive\('always_hyper'\) \|\| isHyperForgeLTM\) \{\s*\n\s*setEntityHypercharged\(entity, now \+ 999999999, now\);/.test(game));
check('normal activateHypercharge() intact (short ~5s hyper, charge consumed)',
  /function activateHypercharge\(\)\{\s*\n\s*const prog = getSelectedProgress\(\);\s*\n\s*const hcAvailable = prog\.hyperchargeUnlocked[\s\S]*?hyperChargeCharge = 0;\s*\n\s*isHypercharged = true;[\s\S]*?hyperchargeUntil = performance\.now\(\) \+ Math\.round\(\(5000/.test(game));
check('update() expiry path intact (short hypers still expire when no mutator)',
  /if\(isHypercharged && performance\.now\(\) > hyperchargeUntil && !isMutatorActive\('always_hyper'\) && !isHyperForgeLTM\)\{\s*\n\s*isHypercharged = false;\s*\n\s*hyperChargeCharge = 0;/.test(game));
check('Duels round-to-round hyper CHARGE carryover intact',
  /hyperChargeCharge = savedPlayerHyper \|\| 0;/.test(game));
console.log(`✔ static pins: ${passed} passed so far, ${failures.length} failed`);

// ---------------------------------------------------------- 2. Behavioural
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
store.set('brawl_arena_save', JSON.stringify({ persistent: { selectedBrawler: 'outlit' } }));
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
assert.equal(typeof api.setActiveMutators, 'function', 'setActiveMutators not exposed');
assert.equal(typeof api.launchShowdownMatch, 'function', 'launchShowdownMatch not exposed');

function hyperState() {
  return {
    isHypercharged: api.isHypercharged,
    hyperchargeUntil: api.hyperchargeUntil,
    hyperChargeCharge: api.hyperChargeCharge,
    playerHyperChargeCharge: api.player.hyperChargeCharge,
    playerIsHypercharged: api.player.isHypercharged,
  };
}
function launchNormal() {
  // What the real PLAY button does before a normal launch: clear the ranked
  // session (mutators, friendly config) then launch.
  api.clearRankedSessionState();
  api.setActiveMutators('classic', null, null);
  api.launchShowdownMatch();
  trimBots();
}
function launchAlwaysHyper() {
  api.isRankedMatch = false;
  api.isCustomMutatorMatch = true;
  api.setActiveMutators('always_hyper', null, null);
  api.launchShowdownMatch();
  trimBots();
}
function trimBots() {
  // Keep one live bot so update() frames stay cheap (test-time only).
  const live = api.bots.find(b => b && b.hp > 0);
  api.bots.length = 0;
  if (live) api.bots.push(live);
}
function runFrames(n) {
  for (let f = 0; f < n; f++) api.update(1 / 60);
}

// --- Match 1: always_hyper — the mutator must still grant hyper.
launchAlwaysHyper();
check('always_hyper match: player IS hypercharged', api.isHypercharged === true);
check('always_hyper match: hyper charge is 100', api.hyperChargeCharge === 100);
check('always_hyper match: hyperchargeUntil is far-future (~11.5 days)',
  api.hyperchargeUntil - Date.now() > 900000000);
runFrames(5);
check('always_hyper match: per-frame enforcer keeps player hypercharged', api.isHypercharged === true);

// --- Match 2: normal launch right after — THE LEAK. Must start clean.
launchNormal();
let s = hyperState();
check('normal match after always_hyper: NOT hypercharged', s.isHypercharged === false);
check('normal match after always_hyper: hyperchargeUntil cleared to 0', s.hyperchargeUntil === 0);
check('normal match after always_hyper: hyper charge cleared to 0', s.hyperChargeCharge === 0);
check('normal match after always_hyper: player hyper-charge mirror cleared', s.playerHyperChargeCharge === 0);
check('normal match after always_hyper: player isHypercharged mirror cleared', s.playerIsHypercharged === false);
runFrames(30);
s = hyperState();
check('normal match: stays NOT hypercharged after 30 update frames', s.isHypercharged === false);
check('normal match: hyper charge stays 0 after 30 update frames', s.hyperChargeCharge === 0);

// --- Match 3: always_hyper again — the reset must not have broken the mutator.
launchAlwaysHyper();
check('always_hyper re-armed: player IS hypercharged again', api.isHypercharged === true);
check('always_hyper re-armed: hyper charge is 100 again', api.hyperChargeCharge === 100);

// --- Match 4: normal again — clean a second time (repeatability).
launchNormal();
s = hyperState();
check('second normal match after always_hyper: NOT hypercharged', s.isHypercharged === false);
check('second normal match after always_hyper: hyperchargeUntil cleared', s.hyperchargeUntil === 0);
check('second normal match after always_hyper: hyper charge cleared', s.hyperChargeCharge === 0);

// --- Normal short hyper still expires via the untouched update() path.
api.isHypercharged = true;
api.hyperchargeUntil = Date.now() + 30; // a normal ~5s hyper, nearly done
api.hyperChargeCharge = 0;
await new Promise(r => setTimeout(r, 90));
api.update(1 / 60);
check('normal short hyper expires once its until passes (expiry path intact)',
  api.isHypercharged === false && api.hyperChargeCharge === 0);

console.log(`✔ behavioural: ${passed} checks passed total, ${failures.length} failed`);
if (failures.length) {
  console.error('FAILURES:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('--- Hypercharge leak regression passed ---');
process.exit(0);
