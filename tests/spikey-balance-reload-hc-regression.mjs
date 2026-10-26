import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors: reload gone, Hyper 2x, everything else untouched ----
assert.doesNotMatch(game, /SPIKEY_CYCLE_RELOAD_MS/, 'the 1,350ms shared reload constant must be gone');
assert.match(game, /brawler==='spikey'&&\(isBot\?\!\!fromEntity\.isHypercharged:\!\!isHypercharged\)\)fireDelay\/=2/, 'Hyper unload must be 2x (fireDelay / 2)');
assert.match(game, /const spd = SPIKEY_THROW_SPEED \* \(hyper \? 2 : 1\)/, 'Hyper throw speed must be 2x');
assert.match(game, /Main attack gains \+100% projectile speed and \+100% unload speed/, 'Hyper kit text must say +100%/+100%');
assert.doesNotMatch(game, /Then all 3 reload together/, 'attack text must not promise a reload that no longer exists');
assert.match(game, /SPIKEY_RECALL_SPEED = 1080/, 'recall speed must be untouched (1080)');
assert.match(game, /SPIKEY_SIDE_BALL_DMG = 500/, 'Hyper side-slam damage must be untouched (500)');
assert.match(game, /function stealAmmo\(target, ownerId, amount\) \{\s*\/\/ Spikey immunity[\s\S]*?if \(isSpikeyEntity\(target\)\) return;/, 'stealAmmo must still exempt Spikey');
assert.match(game, /if \(!isSpikeyEntity\(target\)\) target\.reloadDebuffUntil = performance\.now\(\) \+ 3000;/, 'Tax Note reload debuff must still exempt Spikey');
assert.match(game, /else if \(selectedBrawler === 'spikey'\) \{[\s\S]{0,500}?currentReloadTime = 9999999;/, 'Spikey must still bypass the generic reload pipeline');

// ---- Behavioral harness: the real game booted in a vm sandbox ----
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
  console, Math, JSON, Date, Map, Set, Array, Object, Number, String, Boolean, RegExp, Error, Promise, Uint8Array,
  performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  Image: class { constructor() { this.complete = true; } }, Audio: class { play() { return Promise.resolve(); } pause() {} },
  location: { href: 'http://localhost/', reload() {} }, alert() {}, addEventListener() {}, removeEventListener() {},
  getComputedStyle: () => ({}),
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, selectedBrawler: 'spikey', unlockedBrawlers: { rocketeer: true, spikey: true }, brawlerProgress: { spikey: { level: 11, bricks: 9999, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } }));
vm.createContext(sandbox);
vm.runInContext(game, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
assert.ok(api, 'game test API must boot');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function frames(n, pin) {
  for (let i = 0; i < n; i++) {
    if (pin) { pin.stunUntil = Date.now() + 100000; pin.x = pin._x; pin.y = pin._y; }
    api.update(1 / 60);
  }
}

api.launchShowdownMatch(1, 1);
api.playing = true;
api.bots.length = 1;
const p = api.player;
const bot = api.bots[0];
p.x = 600; p.y = 2000; p.hp = p.maxHp; p.shield = 0;
bot._x = 930; bot._y = 2000; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000; bot.maxHp = 100000; bot.shield = 0;

// ---- (a) Reload gone: throw 3, RETURN, balls ready the instant recalls land ----
for (let t = 0; t < 3; t++) {
  api.fire(p, 1100, 2000, false);
  frames(70, bot);
  if (t < 2) await sleep(300);
}
assert.equal(api.getSpikeyCycleState(p), 'return', 'with 3 parked the attack must become RETURN');
api.fire(p, 1100, 2000, false);
assert.equal(api.bullets.filter(b => b.isSpikeyRecall && b.ownerId === p.id).length, 3, 'RETURN must recall exactly 3 balls');
frames(90, bot);
assert.equal(api.bullets.some(b => b.isSpikeyRecall && b.ownerId === p.id), false, 'recall bullets must despawn on arrival');
// NO time wait here on purpose: on unfixed code this is still 'reloading' with 0 balls.
assert.equal(api.getSpikeyCycleState(p), 'ready', 'the instant recalls land, the cycle must be ready — no reload wait');
assert.equal(p.spikeyBallsReady, 3, 'all 3 balls must be back the instant the return lands');
assert.equal(p.spikeyReloadPending, 0, 'no reload may ever be pending');
await sleep(300); // standard attack cooldown only (240ms) — far short of the old 1,350ms reload
api.fire(p, 1100, 2000, false);
frames(70, bot);
assert.equal(api.spikeyParkedBalls.filter(b => b.ownerId === p.id).length, 1, 'throwing must work immediately after the return');
assert.equal(p.spikeyBallsReady, 2, 'the immediate throw consumes one hand ball');

// ---- (b) Non-Hyper throw speed unchanged: 880 ----
api.isHypercharged = false;
api.spikeyParkedBalls.length = 0;
api.bullets.length = 0;
p.spikeyBallsReady = 3; p.spikeyHomePool = 0; p.spikeyReloadPending = 0; p.spikeyReloadEndsAt = 0;
await sleep(300); // player fireDelay gate (240ms base) between test fires
api.fire(p, 1100, 2000, false);
const plainThrow = api.bullets.find(b => b.isSpikeyThrow && b.ownerId === p.id);
assert.ok(plainThrow, 'a non-Hyper throw must spawn');
assert.equal(Math.round(Math.hypot(plainThrow.vx, plainThrow.vy)), 880, 'non-Hyper throw speed must stay 880');
assert.equal(plainThrow.damage, 950, 'non-Hyper throw damage stays 950');

// ---- (c) Hyper throw speed doubled: 1760, damage + root unchanged ----
api.isHypercharged = true;
p.hyperchargeUntil = Date.now() + 10000;
api.spikeyParkedBalls.length = 0;
api.bullets.length = 0;
p.spikeyBallsReady = 3; p.spikeyHomePool = 0; p.spikeyReloadPending = 0; p.spikeyReloadEndsAt = 0;
await sleep(300); // player fireDelay gate between test fires
api.fire(p, 1100, 2000, false);
const hyperThrow = api.bullets.find(b => b.isSpikeyThrow && b.ownerId === p.id);
assert.ok(hyperThrow, 'a Hyper throw must spawn');
assert.equal(Math.round(Math.hypot(hyperThrow.vx, hyperThrow.vy)), 1760, 'Hyper throw speed must be 2x (880 x 2)');
assert.equal(hyperThrow.spikeyRootMs, 800, 'Hyper hits must still root for 0.8s');
assert.equal(hyperThrow.damage, 950, 'Hyper throw damage stays 950');
api.isHypercharged = false;

// ---- (d) Hyper unload doubled, via a bot's lastShot gap ----
// Bot base fireDelay is 920ms: Hyper was 920/1.5 ≈ 613ms, now 920/2 = 460ms.
// A 530ms gap fires under the new delay but NOT under the old one.
function botThrowProbe({ hyper, gapMs }) {
  bot.brawler = 'spikey';
  bot.level = 11;
  bot.isHypercharged = hyper;
  bot._x = 2200; bot._y = 2200; bot.x = bot._x; bot.y = bot._y;
  bot.spikeyBallsReady = 3; bot.spikeyHomePool = 0; bot.spikeyReloadPending = 0; bot.spikeyReloadEndsAt = 0;
  bot.mainAttackSequenceUntil = 0;
  api.spikeyParkedBalls.length = 0;
  api.bullets.length = 0;
  bot.lastShot = Date.now() - gapMs;
  api.fire(bot, bot.x + 500, bot.y, true);
  return api.bullets.some(b => b.isSpikeyThrow && b.ownerId === bot.id);
}
assert.equal(botThrowProbe({ hyper: true, gapMs: 530 }), true, 'Hyper bot must fire after a 530ms gap (new 460ms delay)');
assert.equal(botThrowProbe({ hyper: false, gapMs: 530 }), false, 'control: non-Hyper bot must NOT fire after 530ms (920ms base delay)');
assert.equal(botThrowProbe({ hyper: true, gapMs: 400 }), false, 'control: Hyper bot must NOT fire after only 400ms (460ms delay)');

// ---- (e) Immunities still hold with no reload in the picture ----
api.spikeyParkedBalls.length = 0;
api.bullets.length = 0;
p.spikeyBallsReady = 3; p.spikeyHomePool = 0; p.spikeyReloadPending = 0; p.spikeyReloadEndsAt = 0;
p.reloadDebuffUntil = Date.now() + 60000;
api.stealAmmo(p, bot.id, 1);
assert.equal(p.spikeyBallsReady, 3, 'ammo steal must not touch Spikey balls');
assert.equal(api.getSpikeyCycleState(p), 'ready', 'a reload debuff must not disturb the cycle state');
assert.equal(p.spikeyReloadPending, 0, 'a reload debuff must not create a reload');

console.log('Spikey balance regression passed: instant return (reload gone), Hyper throw 2x speed (1760), Hyper unload 2x (460ms bot delay), non-Hyper unchanged, immunities intact.');
process.exit(0);
