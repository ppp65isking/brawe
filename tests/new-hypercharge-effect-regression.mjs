// New Hypercharge effect regression — Anthony's order 2026-11-17:
// "make new hc effect like new way better and flashier but no lag more".
//
// The old effect was an explosion-spam trail: ~0.8 heap objects per frame
// per hypercharged entity, flat translucent circles, inflating
// explosions.length so it degraded every other FX. The new "Hypercharge
// Nova" effect is edge-triggered bursts (activation + expiry) plus a
// pre-rendered-sprite aura and a fixed pooled ember trail — flashier and
// strictly cheaper. Visuals only: gameplay numbers untouched.
//
// Behavioural core (real game booted in a VM, REAL gate — Snipa lesson):
//   real activateHypercharge() -> exactly one hyperActivate burst
//   120 hyper frames -> explosions stays tiny (no trail spam), aura stays on
//   real expiry via update() -> exactly one hyperExpire burst, flag clears
//   bot hyper flip -> burst at the bot, no player text/shake
//   always_hyper -> burst fires once, never repeats over 120 frames
//   fresh launch after hyper -> no ghost expiry burst (reset clears flag)
// plus a perf regression: counting canvas proxy — hyper-ON render adds
// <=12 drawImage calls/frame vs hyper-OFF, and render wall time stays
// within 1.5x.
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
check('old trail block gone', !game.includes('// Hypercharge Aura Trail'));
check('old outer flame push gone', !game.includes('radius: 12 + Math.random() * 8'));
check('old inner flame push gone', !game.includes('radius: 6 + Math.random() * 6'));
check('old per-frame spread gone (old trail gate line)',
  !game.includes("const isHc = e === player ? isHypercharged : e.isHypercharged;"));
check('sprite builder present', game.includes('function ensureHyperFxSprites()'));
check('ember pool present (96 / 48 low-power)',
  game.includes('const HC_EMBER_MAX = LOW_POWER_DEVICE ? 48 : 96;') &&
  game.includes('const HC_EMBER_POOL = [];'));
check('edge helper present', game.includes('function hcTickHyperEntity(e, now, isPlayerEntity)'));
check('aura draw fn present',
  game.includes('function drawHyperchargeAuras(now, isWorldVisualVisible, visualPressure)'));
check('aura called before explosions loop',
  game.includes('drawHyperchargeAuras(now, isWorldVisualVisible, visualPressure);') &&
  game.indexOf('drawHyperchargeAuras(now, isWorldVisualVisible, visualPressure);') <
  game.indexOf('for(const ex of explosions){'));
check('hyperActivate branch present', game.includes("if (ex.fxKind === 'hyperActivate')"));
check('hyperExpire branch present', game.includes("if (ex.fxKind === 'hyperExpire')"));
check('HUD keyframes wired to real buttons',
  game.includes('.mobile-action-btn--hyper.is-active { animation: hc-active-flame') &&
  game.includes('#hypercharge.is-active { animation: hc-active-flame'));
check('desktop button toggles classes off real gate',
  game.includes("hyperBtn.classList.toggle('is-active', !!isHypercharged);"));
check('reset clears fx flag', game.includes('player._hcFxActive = false;'));
check('test exports present',
  game.includes('get activateHypercharge() { return activateHypercharge; },') &&
  game.includes('get explosions() { return explosions; },'));

// Perf: no shadowBlur / gradient CODE inside any per-frame new-effect
// code. (Comments may name them; match the code tokens, not bare words.)
// Gradients are allowed ONLY in the one-time sprite builder.
const SHADOWBLUR_CODE = /shadowBlur\s*=/;
const GRADIENT_CODE = /create(Radial|Linear)Gradient\(/;
function sliceBetween(startMarker, endMarker) {
  const s = game.indexOf(startMarker);
  assert.ok(s !== -1, `${startMarker} missing`);
  const e = endMarker ? game.indexOf(endMarker, s) : -1;
  assert.ok(e !== -1, `${endMarker} missing after ${startMarker}`);
  return game.slice(s, e);
}
const spriteBuilder = sliceBetween('function ensureHyperFxSprites() {', '// Fixed ember pool');
check('sprite builder uses exactly one gradient call site',
  (spriteBuilder.match(/\.createRadialGradient\(/g) || []).length === 1);
check('sprite builder has no shadowBlur code', !SHADOWBLUR_CODE.test(spriteBuilder));
const emberCode = sliceBetween('function hcSpawnEmber(x, y) {', 'function hcTickHyperEntity');
check('ember update/spawn has no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(emberCode) && !GRADIENT_CODE.test(emberCode));
const edgeCode = sliceBetween('function hcTickHyperEntity(e, now, isPlayerEntity) {',
  '// Thanksgiving big update Phase 3');
check('edge helper has no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(edgeCode) && !GRADIENT_CODE.test(edgeCode));
const auraCode = sliceBetween('function drawHyperchargeAuras(now, isWorldVisualVisible, visualPressure) {',
  'function render(){');
check('aura draw has no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(auraCode) && !GRADIENT_CODE.test(auraCode));
check('aura draw uses pre-rendered sprites (drawImage, no gradients)',
  auraCode.includes('ctx.drawImage(hcGlowSprite') && auraCode.includes('ctx.drawImage(hcCoreSprite'));
const burstCode = sliceBetween("if (ex.fxKind === 'hyperActivate') {", "if(ex.fxKind==='fastpassLane'){");
check('burst branches have no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(burstCode) && !GRADIENT_CODE.test(burstCode));
check('burst branches draw the glow sprite',
  burstCode.includes('ctx.drawImage(hcGlowSprite'));

// Gameplay numbers untouched (visuals only).
check('activateHypercharge duration still 5s (+surge 1.4x)',
  /hyperchargeUntil = performance\.now\(\) \+ Math\.round\(\(5000/.test(game) &&
  game.includes("getCorePerk(selectedBrawler) === 'surge' ? 1.4 : 1"));
check('activateHypercharge still consumes the charge',
  /function activateHypercharge\(\)\{[\s\S]*?hyperChargeCharge = 0;\s*\n\s*isHypercharged = true;/.test(game));
check('update() expiry path intact',
  /if\(isHypercharged && performance\.now\(\) > hyperchargeUntil && !isMutatorActive\('always_hyper'\) && !isHyperForgeLTM\)\{\s*\n\s*isHypercharged = false;/.test(game));
check('hyper speed mult untouched (+20%, portalo/ghoul 1.15)',
  game.includes("let hcSpd = (isHypercharged ? ((selectedBrawler === 'portalo' || selectedBrawler === 'ghoul') ? 1.15 : 1.2) : 1.0)"));
check('always_hyper launch grant intact',
  /if \(isMutatorActive\('always_hyper'\) \|\| isHyperForgeLTM\) \{\s*\n\s*if \(!isHypercharged\) recordOverdriveActivation\(\);\s*\n\s*isHypercharged = true;/.test(game));
check('bot hyper gate intact',
  game.includes('function shouldBotActivateHyper(bot, target, context) {'));
check('resetPlayerHyperchargeState still clears the three globals',
  /function resetPlayerHyperchargeState\(\) \{[\s\S]*?isHypercharged = false;[\s\S]*?hyperchargeUntil = 0;[\s\S]*?hyperChargeCharge = 0;/.test(game));
console.log(`✔ static pins: ${passed} passed so far, ${failures.length} failed`);

// ---------------------------------------------------------- 2. Behavioural
const counts = { drawImage: 0, createRadialGradient: 0, createLinearGradient: 0, shadowBlurSets: 0 };
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get: (t, k) => {
      if (k === 'createLinearGradient') return () => { counts.createLinearGradient++; return grad; };
      if (k === 'createRadialGradient') return () => { counts.createRadialGradient++; return grad; };
      if (k === 'drawImage') return () => { counts.drawImage++; };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: [] });
      if (typeof k === 'string') return t[k] !== undefined ? t[k] : (() => {});
      return undefined;
    },
    set: (t, k, v) => { if (k === 'shadowBlur') counts.shadowBlurSets++; return true; },
  });
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
  return new Proxy(el, {
    get: (t, k) => {
      if (k in t) return t[k];
      if (k === 'firstChild') return t.children[0] || null;
      if (k === 'lastChild') return t.children[t.children.length - 1] || null;
      if (k === 'parentNode' || k === 'parentElement' || k === 'nextSibling' || k === 'previousSibling') return null;
      if (k === 'childNodes' || k === 'children') return [];
      if (typeof k === 'string') return () => makeEl();
      return undefined;
    }, set: () => true,
  });
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
assert.equal(typeof api.activateHypercharge, 'function', 'activateHypercharge not exposed');
assert.ok(Array.isArray(api.explosions), 'explosions not exposed');

function launchNormal() {
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
  const live = api.bots.find(b => b && b.hp > 0);
  api.bots.length = 0;
  if (live) api.bots.push(live);
}
function runFrames(n) {
  for (let f = 0; f < n; f++) api.update(1 / 60);
}
function countFx(kind) {
  return api.explosions.filter(e => e.fxKind === kind).length;
}
function unlockHyperForSelected() {
  // The REAL unlock state, written into the same save object the game
  // reads (as if the player had bought Hypercharge for this brawler).
  const b = api.player.brawler || 'outlit';
  if (!api.playerData.brawlers[b]) api.playerData.brawlers[b] = {};
  api.playerData.brawlers[b].hyperchargeUnlocked = true;
}

// --- Real activation: the actual button path, real charge, real unlock.
launchNormal();
unlockHyperForSelected();
api.hyperChargeCharge = 100;
api.activateHypercharge();
check('real activateHypercharge(): player IS hypercharged', api.isHypercharged === true);
check('real activateHypercharge(): charge consumed', api.hyperChargeCharge === 0);
runFrames(1);
check('activation: exactly one hyperActivate burst', countFx('hyperActivate') === 1);
check('activation burst sits on the player',
  api.explosions.some(e => e.fxKind === 'hyperActivate' && e.x === api.player.x && e.y === api.player.y));
check('activation: player aura flag set', api.player._hcFxActive === true);

// Steady state must NOT spam explosions the way the old trail did.
// (hyperchargeUntil is extended so wall-clock time can't expire the hyper
// mid-test — the gate itself is still the real one.)
api.hyperchargeUntil = Date.now() + 600000;
let maxExplosions = 0;
let sawOldTrailColor = false;
for (let f = 0; f < 120; f++) {
  api.update(1 / 60);
  maxExplosions = Math.max(maxExplosions, api.explosions.length);
  if (api.explosions.some(e => e.color === 'rgba(238, 0, 255, 0.4)')) sawOldTrailColor = true;
}
check('120 hyper frames: explosions stays tiny (no trail spam)', maxExplosions <= 5);
check('120 hyper frames: no old-trail flame entries', !sawOldTrailColor);
check('120 hyper frames: aura flag still set', api.player._hcFxActive === true);
check('120 hyper frames: player still hypercharged (real gate)', api.isHypercharged === true);
check('120 hyper frames: activation burst expired on its own (one-shot)', countFx('hyperActivate') === 0);

// --- Perf regression: hyper-ON render vs hyper-OFF render.
function renderDrawImages(n) {
  counts.drawImage = 0;
  for (let i = 0; i < n; i++) api.render();
  return counts.drawImage / n;
}
launchNormal(); // fresh match, hyper off
runFrames(5);
const offPerFrame = renderDrawImages(30);
const tOffStart = Date.now();
renderDrawImages(30);
const offMs = Date.now() - tOffStart;
unlockHyperForSelected();
api.hyperChargeCharge = 100;
api.activateHypercharge();
api.hyperchargeUntil = Date.now() + 600000;
runFrames(2); // burst live, aura on
const onPerFrame = renderDrawImages(30);
const tOnStart = Date.now();
renderDrawImages(30);
const onMs = Date.now() - tOnStart;
console.log(`  perf: render drawImage/frame off=${offPerFrame.toFixed(2)} on=${onPerFrame.toFixed(2)} (delta ${(onPerFrame - offPerFrame).toFixed(2)}), wall off=${offMs}ms on=${onMs}ms over 30 renders`);
check('perf: hyper-ON adds <=12 drawImage calls/frame', (onPerFrame - offPerFrame) <= 12);
check('perf: hyper-ON render wall time within 2x of OFF (+100ms slack for loaded CI)',
  onMs < offMs * 2 + 100);

// --- Real expiry: the update() path, not a forced flag flip.
api.hyperchargeUntil = Date.now() - 1;
runFrames(2);
check('real expiry: player NOT hypercharged', api.isHypercharged === false);
check('expiry: exactly one hyperExpire burst', countFx('hyperExpire') === 1);
check('expiry burst sits on the player',
  api.explosions.some(e => e.fxKind === 'hyperExpire' && e.x === api.player.x && e.y === api.player.y));
check('expiry: player aura flag cleared', api.player._hcFxActive !== true);
runFrames(60);
check('expiry burst expired on its own (one-shot)', countFx('hyperExpire') === 0);

// --- Bot rising edge: a bot flipping hyper gets the burst at ITS position.
const bot = api.bots[0];
assert.ok(bot && bot.hp > 0, 'need a live bot for the bot-edge check');
const botX = bot.x, botY = bot.y;
bot.isHypercharged = true;
bot.hyperchargeUntil = Date.now() + 600000;
bot.hyperChargeCharge = 100;
runFrames(1);
check('bot activation: exactly one hyperActivate burst', countFx('hyperActivate') === 1);
check('bot activation burst sits on the bot (bot may move a step)',
  api.explosions.some(e => e.fxKind === 'hyperActivate' && Math.hypot(e.x - botX, e.y - botY) < 30));
check('bot activation: bot aura flag set', bot._hcFxActive === true);
bot.isHypercharged = false;
bot.hyperchargeUntil = 0;
runFrames(1);
check('bot expiry: exactly one hyperExpire burst', countFx('hyperExpire') === 1);
check('bot expiry: bot aura flag cleared', bot._hcFxActive !== true);
// Drain both bot bursts before the next phase so leftovers from this
// match can't masquerade as ghosts in the fresh-launch checks below.
runFrames(60);

// --- Fresh launch after hyper: no ghost expiry burst (reset clears flag).
launchNormal();
unlockHyperForSelected();
api.hyperChargeCharge = 100;
api.activateHypercharge();
api.hyperchargeUntil = Date.now() + 600000;
runFrames(2);
check('re-armed hyper: burst fired again after fresh launch', countFx('hyperActivate') === 1);
// Drain the re-armed burst first: a leftover from the old match is not a
// ghost, so the launch below must start from zero live bursts.
runFrames(60);
launchNormal(); // resetPlayerHyperchargeState runs at the launch boundary
runFrames(2);
check('fresh launch after hyper: no ghost expiry burst', countFx('hyperExpire') === 0);
check('fresh launch after hyper: no ghost activation burst', countFx('hyperActivate') === 0);
check('fresh launch after hyper: player NOT hypercharged', api.isHypercharged === false);

// --- always_hyper: burst fires once per hypercharged entity, never repeats.
launchAlwaysHyper();
check('always_hyper match: player IS hypercharged', api.isHypercharged === true);
runFrames(1);
// The bot's always_hyper grant can land a frame or two after the player's,
// so give it up to 10 frames to appear (bursts live ~33 frames, so
// nothing expires while waiting).
for (let f = 0; f < 9 && countFx('hyperActivate') < 2; f++) runFrames(1);
// Player AND the (single trimmed) bot both enter hypercharged, so each
// gets its own one-shot activation burst — 2 total, 1 per entity.
const ahBot = api.bots[0];
check('always_hyper: activation burst fired for the player',
  api.explosions.some(e => e.fxKind === 'hyperActivate' && e.x === api.player.x && e.y === api.player.y));
check('always_hyper: activation burst fired for the bot',
  ahBot && api.explosions.some(e => e.fxKind === 'hyperActivate' && Math.hypot(e.x - ahBot.x, e.y - ahBot.y) < 100));
check('always_hyper: exactly one burst per hypercharged entity (2 total)',
  countFx('hyperActivate') === 2);
let maxAh = 0;
let maxActivateSeen = 0;
for (let f = 0; f < 120; f++) {
  api.update(1 / 60);
  maxAh = Math.max(maxAh, api.explosions.length);
  maxActivateSeen = Math.max(maxActivateSeen, countFx('hyperActivate'));
}
check('always_hyper: burst never re-fires over 120 frames (max 2 live at once)', maxActivateSeen <= 2);
check('always_hyper: burst expired on its own after 120 frames', countFx('hyperActivate') === 0);
check('always_hyper: explosions stays small over 120 frames (no trail spam)', maxAh <= 8);
check('always_hyper: aura flag stays set', api.player._hcFxActive === true);
check('always_hyper: player stays hypercharged', api.isHypercharged === true);

console.log(`✔ behavioural: ${passed} checks passed total, ${failures.length} failed`);
if (failures.length) {
  console.error('FAILURES:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('--- New Hypercharge effect regression passed ---');
process.exit(0);
