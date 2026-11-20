// Hypercharge Nova PERF FIX regression — Anthony's playtest verdict
// 2026-11-17: "It's so laggy bruh" on his Pixel 9 Pro.
//
// The Nova effect (PR #123) cost scaled linearly with HC entity count: per
// HC entity per frame a glow + core sprite (additive, save/restore +
// 'lighter' each) plus dashed rotating rings, and activation bursts stacked
// without a ceiling. The in-suite perf numbers were meaningless (bots
// trimmed to 1, Proxy canvas stub measures zero GPU cost), so this suite
// checks the structure that actually bounds the cost, at N=10 HC entities,
// plus the training behaviour Anthony reported ("it makes everyone hc").
//
// The fix, per item:
//   1. aura tiered by count/distance: player full aura; bots get glow only
//      when <=3 HC, within 400px, not a phone under pressure; else ring-only.
//   2. dashed rotating ring killed: solid static rings, batched strokes.
//   3. one additive pass ('lighter' once), core sprite dropped for bots.
//   4. phone gate is the touchscreen check (isTouchInputEnvironment), NOT
//      LOW_POWER_DEVICE — that one is CPU-core based (hardwareConcurrency
//      <= 4) and is FALSE on Anthony's 8-core Pixel 9 Pro.
//   5. activation bursts capped at 3 concurrent live.
//   6. enraged-boss writes set hyperchargeUntil alongside isHypercharged.
//   7. ?fps=1 meter: frame time + live HC entity count, top-left.
//   8. gameplay numbers untouched (visuals only).
//
// Behavioural core (real game booted in a VM, REAL gate — Snipa lesson):
//   training free, grid AI off, 600 frames -> zero bots ever HC
//   training free, grid AI on + player in the grid, 600 frames -> zero HC
//   training player-only hyper -> exactly 1 burst, no bot flag set
//   plain Solo, 300 frames, player idle -> zero bots ever HC
//   plain Solo, 600 frames -> any bot that reads HC had charge >= 99
//   perf at N=10 HC entities -> render delta within budget (<=30)
//   10 simultaneous activations -> at most 3 live bursts
//   ?fps=1 -> meter text drawn with frame time + live HC count
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
const SHADOWBLUR_CODE = /shadowBlur\s*=/;
const GRADIENT_CODE = /create(Radial|Linear)Gradient\(/;
function sliceBetween(startMarker, endMarker) {
  const s = game.indexOf(startMarker);
  assert.ok(s !== -1, `${startMarker} missing`);
  const e = endMarker ? game.indexOf(endMarker, s) : -1;
  assert.ok(e !== -1, `${endMarker} missing after ${startMarker}`);
  return game.slice(s, e);
}
const auraCode = sliceBetween('function drawHyperchargeAuras(now, isWorldVisualVisible, visualPressure) {',
  'function render(){');
const edgeCode = sliceBetween('function hcTickHyperEntity(e, now, isPlayerEntity) {',
  '// Thanksgiving big update Phase 3');

// Item 4 — phone gate is the touchscreen check, not the core-count flag.
check('phone gate uses the touchscreen check (true on Anthony\'s phone)',
  game.includes('const HC_TOUCH_DEVICE = isTouchInputEnvironment();'));
check('LOW_POWER_DEVICE is CPU-core based (false on 8-core Pixel 9 Pro)',
  /LOW_POWER_DEVICE = \(navigator\.hardwareConcurrency \|\| 8\) <= 4/.test(game));
check('aura tiers on the touchscreen gate, not LOW_POWER_DEVICE',
  auraCode.includes('!HC_TOUCH_DEVICE') && !auraCode.includes('LOW_POWER_DEVICE'));

// Item 1 — aura tiered by count and distance.
check('glow-bots cap present (<=3)', game.includes('const HC_MAX_GLOW_BOTS = 3;'));
check('glow range present (400px)', game.includes('const HC_GLOW_RANGE_PX = 400;'));
check('aura counts HC entities before drawing', auraCode.includes('let hcCount = 0;'));
check('bots get glow only when few HC + near + not phone/pressure',
  auraCode.includes('const botsGetGlow = !HC_TOUCH_DEVICE && !visualPressure && hcCount <= HC_MAX_GLOW_BOTS;') &&
  auraCode.includes('Math.hypot(b.x - px, b.y - py) > HC_GLOW_RANGE_PX'));
check('dummies skipped in the aura (count, ring + glow loops)', auraCode.includes('!b.isDummy'));
check('dummies skipped in the tick helper', edgeCode.includes('e.isDummy'));

// Item 2 — dashed rotating ring killed.
check('no setLineDash in the aura draw', !auraCode.includes('setLineDash'));
check('no lineDashOffset in the aura draw', !auraCode.includes('lineDashOffset'));

// Item 3 — one additive pass, core dropped for bots.
check('exactly one lighter pass in the aura draw',
  (auraCode.match(/globalCompositeOperation = 'lighter'/g) || []).length === 1);
check('rings batched into two strokes (no per-entity save/restore in aura)',
  (auraCode.match(/ctx\.save\(\)/g) || []).length === 2);
check('ember draw capped per frame', game.includes('const HC_MAX_EMBERS_DRAWN = 24;') &&
  auraCode.includes('embersDrawn < HC_MAX_EMBERS_DRAWN'));

// Item 5 — burst cap.
check('burst cap constant present (3)', game.includes('const HC_BURST_MAX_LIVE = 3;'));
check('tick helper caps live bursts before pushing',
  edgeCode.includes('hcLiveBursts < HC_BURST_MAX_LIVE'));

// Item 6 — boss hygiene: DELETED with the boss modes (Megastein / BlinkEye
// boss enrage writes are gone; isMegaBossBlinkeye / megaBoss are 0 hits).

// Item 7 — FPS meter.
check('FPS meter flag parses ?fps=1',
  game.includes('const HC_FPS_METER =') && game.includes('fps=1'));
check('FPS meter draws frame time + HC count',
  game.includes('hcFpsMs.toFixed(1)') && game.includes('HC: ${hcLive}'));

// Item 4 (phone embers) + gameplay numbers untouched.
check('phone mode: embers are player-only',
  edgeCode.includes('!(HC_TOUCH_DEVICE && !isPlayerEntity)'));
check('aura draw has no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(auraCode) && !GRADIENT_CODE.test(auraCode));
check('edge helper still has no shadowBlur or gradient code',
  !SHADOWBLUR_CODE.test(edgeCode) && !GRADIENT_CODE.test(edgeCode));
check('activateHypercharge duration still 5s (+surge 1.4x)',
  /hyperchargeUntil = performance\.now\(\) \+ Math\.round\(\(5000/.test(game) &&
  game.includes("getCorePerk(selectedBrawler) === 'surge' ? 1.4 : 1"));
check('hyper speed mult untouched (+20%)',
  game.includes("let hcSpd = (isHypercharged ? ((selectedBrawler === 'portalo' || selectedBrawler === 'ghoul') ? 1.15 : 1.2) : 1.0)"));
check('training exports present for the behavioural checks',
  game.includes('get launchTrainingSandbox() { return launchTrainingSandbox; },') &&
  game.includes('get isTraining() { return isTraining; },') &&
  game.includes('get trainingGridBotsActiveAI() { return trainingGridBotsActiveAI; },') &&
  game.includes('get isEntityHyperchargedNow() { return isEntityHyperchargedNow; },'));
console.log(`✔ static pins: ${passed} passed so far, ${failures.length} failed`);

// ---------------------------------------------------------- 2. Behavioural
const counts = { drawImage: 0, fillText: [] };
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get: (t, k) => {
      if (k === 'createLinearGradient') return () => grad;
      if (k === 'createRadialGradient') return () => grad;
      if (k === 'drawImage') return () => { counts.drawImage++; };
      if (k === 'fillText') return (...a) => { counts.fillText.push(a.join(' ')); };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: [] });
      if (typeof k === 'string') return t[k] !== undefined ? t[k] : (() => {});
      return undefined;
    },
    set: () => true,
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
  navigator: { userAgent: 'node', maxTouchPoints: 0, hardwareConcurrency: 8 },
  location: { href: 'http://localhost/?fps=1', search: '?fps=1', reload() {} },
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
assert.equal(typeof api.launchTrainingSandbox, 'function', 'launchTrainingSandbox not exposed');
assert.equal(typeof api.isEntityHyperchargedNow, 'function', 'isEntityHyperchargedNow not exposed');
assert.equal(typeof api.setActiveMutators, 'function', 'setActiveMutators not exposed');
assert.equal(typeof api.launchShowdownMatch, 'function', 'launchShowdownMatch not exposed');
assert.equal(typeof api.activateHypercharge, 'function', 'activateHypercharge not exposed');
assert.ok(Array.isArray(api.explosions), 'explosions not exposed');

function runFrames(n) { for (let f = 0; f < n; f++) api.update(1 / 60); }
function countFx(kind) { return api.explosions.filter(e => e.fxKind === kind).length; }
function hcBots() {
  const now = Date.now();
  return api.bots.filter(b => b && b.hp > 0 && api.isEntityHyperchargedNow(b, now));
}
function launchNormal(keepBots = 9) {
  api.clearRankedSessionState();
  api.setActiveMutators('classic', null, null);
  api.launchShowdownMatch();
  const live = api.bots.filter(b => b && b.hp > 0).slice(0, keepBots);
  api.bots.length = 0; for (const b of live) api.bots.push(b);
}
function launchAndGrantHyper(keepBots = 10) {
  // Stand-in for the deleted always_hyper launch: normal launch, then
  // hypercharge the player + all kept bots directly with a far-future until.
  api.clearRankedSessionState();
  api.setActiveMutators('classic', null, null);
  api.launchShowdownMatch();
  const live = api.bots.filter(b => b && b.hp > 0).slice(0, keepBots);
  api.bots.length = 0; for (const b of live) api.bots.push(b);
  api.isHypercharged = true;
  api.hyperchargeUntil = Date.now() + 999999999;
  api.hyperChargeCharge = 100;
  if (api.player) { api.player.isHypercharged = true; api.player.hyperChargeCharge = 100; }
  for (const b of api.bots) { b.isHypercharged = true; b.hyperchargeUntil = Date.now() + 999999999; b.hyperChargeCharge = 100; }
}
function unlockHyperForSelected() {
  const b = api.player.brawler || 'outlit';
  if (!api.playerData.brawlers[b]) api.playerData.brawlers[b] = {};
  api.playerData.brawlers[b].hyperchargeUnlocked = true;
}
function renderDrawImages(n) {
  counts.drawImage = 0;
  for (let i = 0; i < n; i++) api.render();
  return counts.drawImage / n;
}

// --- Training (Anthony: "it makes everyone hc"): free mode, grid AI off.
// 600 frames, player idle — no bot may ever read HC, no bot flag may set.
api.launchTrainingSandbox('outlit', 'free');
check('training boots (isTraining)', api.isTraining === true);
let trainingHcSeen = 0;
let trainingFlagSeen = false;
for (let f = 0; f < 600; f++) {
  api.update(1 / 60);
  trainingHcSeen = Math.max(trainingHcSeen, hcBots().length);
  if (api.bots.some(b => b && b._hcFxActive)) trainingFlagSeen = true;
}
check('training free, grid AI off, 600 frames: zero bots ever HC', trainingHcSeen === 0);
check('training free, grid AI off, 600 frames: no bot aura flag set', !trainingFlagSeen);

// --- Training with the grid AI on and the player standing in the grid.
// Even when grid bots can fight, they carry no hyperchargeUnlocked, so the
// bot hyper gate can never fire for them.
api.launchTrainingSandbox('outlit', 'free');
api.trainingGridBotsActiveAI = true;
for (const b of api.bots) if (b.isTrainingGridBot) b.isDummy = false;
api.player.x = 2900; api.player.y = 2400;
let trainingAiHcSeen = 0;
for (let f = 0; f < 600; f++) {
  api.update(1 / 60);
  trainingAiHcSeen = Math.max(trainingAiHcSeen, hcBots().length);
}
check('training free, grid AI on + player in grid, 600 frames: zero bots ever HC', trainingAiHcSeen === 0);
api.trainingGridBotsActiveAI = false;

// --- Training player-only hyper: exactly one burst, player flag only.
api.launchTrainingSandbox('outlit', 'free');
unlockHyperForSelected();
api.hyperChargeCharge = 100;
api.activateHypercharge();
runFrames(1);
check('training player hyper: player IS hypercharged', api.isHypercharged === true);
check('training player hyper: exactly one activation burst', countFx('hyperActivate') === 1);
check('training player hyper: player aura flag set', api.player._hcFxActive === true);
check('training player hyper: no bot aura flag set', !api.bots.some(b => b && b._hcFxActive));
check('training player hyper: zero bots HC', hcBots().length === 0);
runFrames(60); // drain the burst

// --- Plain Solo, no mutators: no free HC.
// 300 frames, player idle — no bot may read HC before it could plausibly
// earn 100 charge through combat (needs ~16 landed main hits).
launchNormal();
let soloHcSeen300 = 0;
for (let f = 0; f < 300; f++) {
  api.update(1 / 60);
  soloHcSeen300 = Math.max(soloHcSeen300, hcBots().length);
}
check('plain Solo, 300 frames, player idle: zero bots ever HC', soloHcSeen300 === 0);
// 600 frames: any bot that DOES read HC must have earned the charge — the
// max sampled hyperChargeCharge before/around the flip must be >= 99.
const maxChargeSeen = new Map();
const hcEver = new Set();
for (let f = 0; f < 600; f++) {
  for (const b of api.bots) {
    if (!b) continue;
    const prev = maxChargeSeen.get(b.id) || 0;
    maxChargeSeen.set(b.id, Math.max(prev, b.hyperChargeCharge || 0));
  }
  api.update(1 / 60);
  for (const b of api.bots) {
    if (!b) continue;
    maxChargeSeen.set(b.id, Math.max(maxChargeSeen.get(b.id) || 0, b.hyperChargeCharge || 0));
    if (api.isEntityHyperchargedNow(b, Date.now())) hcEver.add(b.id);
  }
}
let chargeEvidenceOk = true;
for (const id of hcEver) if ((maxChargeSeen.get(id) || 0) < 99) chargeEvidenceOk = false;
console.log(`  solo 600f: bots that ever read HC: ${hcEver.size} (max charge evidence ok: ${chargeEvidenceOk})`);
check('plain Solo, 600 frames: every bot that reads HC earned >=99 charge first', chargeEvidenceOk);

// --- Burst cap: 10 simultaneous activations produce at most 3 live bursts.
// Check the grants FIRST (within 10 frames, before combat can kill anyone
// — a dead bot reads as "not HC" and would flake the check later).
launchAndGrantHyper(10);
for (let f = 0; f < 10 && hcBots().length < 10; f++) runFrames(1);
check('hypercharged N=10: player + all 10 bots HC (grants intact)', api.isHypercharged === true && hcBots().length === 10);
// The aura flag is set by the per-frame tick on the rising edge, which can
// land a frame after the grant — give it two frames before checking flags.
runFrames(2);
check('hypercharged N=10: player aura flag set', api.player._hcFxActive === true);
check('hypercharged N=10: all 10 bot aura flags set (aura-only, not burst)', api.bots.every(b => b._hcFxActive === true));
let maxBurstsLive = 0;
let peakBursts = [];
for (let f = 0; f < 120; f++) {
  api.update(1 / 60);
  const live = api.explosions.filter(e => e.fxKind === 'hyperActivate');
  if (live.length > maxBurstsLive) { maxBurstsLive = live.length; peakBursts = [...live]; }
}
check('hypercharged N=10: at most 3 live activation bursts over 120 frames', maxBurstsLive <= 3);
check('hypercharged N=10: the peak bursts expired on their own (one-shot)',
  peakBursts.length > 0 && peakBursts.every(b => !api.explosions.includes(b)));
check('hypercharged N=10: live bursts still within cap at the end', countFx('hyperActivate') <= 3);

// --- Perf at N=10 HC entities: same-match ON vs OFF delta.
// Measure ON, then switch every HC flag off WITHOUT an update in between
// (the direct grant never re-arms, renders don't) and
// measure OFF on the identical scene — the delta is the aura's sprite
// cost alone, with no scene noise. Pre-fix this delta was 22 (player +
// 10 bots x glow+core); post-fix it is 2 (player only, bots ring-only).
// Embers are ownerless pool entries, so they draw in both halves and are
// bounded separately by the static 24-draw cap above.
launchAndGrantHyper(10);
runFrames(45);
// Drain the FX arrays and top up the player before measuring: the glow
// pass is skipped when visualPressure is true, and the ember pool can push
// explosions.length over 105 (which suppresses Pass 2 by design and makes
// the delta read 0). Renders don't advance the sim, so the counts stay
// frozen across both halves of the measurement.
api.explosions.length = 0;
api.bullets.length = 0;
if (api.player) api.player.hp = api.player.maxHp;
const onPerFrame = renderDrawImages(30);
api.isHypercharged = false; api.player._hcFxActive = false;
for (const b of api.bots) { b.isHypercharged = false; b._hcFxActive = false; }
const offPerFrame = renderDrawImages(30);
console.log(`  perf N=10 same-match: render drawImage/frame off=${offPerFrame.toFixed(2)} on=${onPerFrame.toFixed(2)} (delta ${(onPerFrame - offPerFrame).toFixed(2)})`);
check('perf N=10 HC: aura adds <=10 drawImage calls/frame (was 22 pre-fix)', (onPerFrame - offPerFrame) <= 10);
check('perf N=10 HC: aura actually drew (delta >= 2, not suppressed)',
  (onPerFrame - offPerFrame) >= 2);

// --- ?fps=1 meter: frame time + live HC count drawn on render.
launchAndGrantHyper(10);
runFrames(5);
counts.fillText = [];
api.render();
const meterText = counts.fillText.find(t => t.includes('HC:'));
console.log(`  fps meter text: ${meterText ? JSON.stringify(meterText) : '(none)'}`);
check('?fps=1 meter: text drawn with frame time + HC count',
  !!meterText && /[\d.]+ms/.test(meterText) && meterText.includes('HC:'));
check('?fps=1 meter: live HC count reads 11 (player + 10 bots)',
  !!meterText && meterText.includes('HC: 11'));

console.log(`✔ behavioural: ${passed} checks passed total, ${failures.length} failed`);
if (failures.length) {
  console.error('FAILURES:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('--- Hypercharge Nova perf fix regression passed ---');
process.exit(0);
