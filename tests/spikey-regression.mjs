// Spikey regression (2026-10-22, new brawler — Anthony's Lumi adaptation,
// design finished by Cosmo per his delegation).
//
// Kit under test:
// - Triple Thorn Toss: throw a piercing spikeball (950 @P11) that parks where
//   it lands; max 3 deployed; attacking with 3 out recalls them all, piercing,
//   for 1,425 @P11. SP1 Deep Roots adds a 30% / 1s slow to recall hits.
// - Mega Spike Ball Super: travels in legs and explodes (1,750 @P11, r130)
//   exactly 3 times. Hyper: longer legs (340 vs 260) + an 8-spike ring
//   (500 each) per bounce; Hyper main attack: +50% projectile/unload speed
//   and hits root for 0.8s.
// - Registration: Mythic (270 souls via the rarity table), Damage Dealer.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Static anchors: registration ---
assert.match(game, /'spikey': \{ name: 'Spikey', role: 'Damage Dealer'/, 'brawlerData entry missing');
assert.match(game, /attack: 'Triple Thorn Toss'/, 'attack name missing');
assert.match(game, /super: 'Mega Spike Ball'/, 'super name missing');
assert.match(game, /spikey: 'Mythic'/, 'rarity must be Mythic (270 souls via rarity cost table)');
assert.match(game, /'feathers', 'spikey'/, 'spikey must be in allBrawlers roster list');
assert.match(game, /spikey:'Damage Dealer'/, 'primary role map must say Damage Dealer');
assert.match(game, /spikey: '🦔'/, 'portrait emoji missing');
assert.match(game, /feathers:5, spikey:6/, 'SUPER_CHARGE_HITS entry missing');
assert.match(game, /spikey: \{ g1: 14000, g2: 12000 \}/, 'gadget cooldowns missing (g1 14s / g2 12s)');
assert.match(game, /hp: Math\.round\(7000 \* scale\), dmg: Math\.round\(950 \* scale\), recallDmg: Math\.round\(1425 \* scale\), superDmg: Math\.round\(1750 \* scale\)/, 'authored stats must be hp 7000 / throw 950 / recall 1425 / super 1750 @P11');
// Spikey must NOT be in the free-unlock migration lists (Feathers precedent).
assert.doesNotMatch(game, /bid === 'bolznstien' \|\| bid === 'magnatar' \|\| bid === 'badbat' \|\| bid === 'spikey'/, 'spikey must not be free-unlocked by migration');
// --- Static anchors: mechanics wiring ---
assert.match(game, /function castSpikeySuper\(entity, hyper, tx, ty\)/, 'castSpikeySuper missing');
assert.match(game, /function recallSpikeyBalls\(entity, harmless = false\)/, 'recallSpikeyBalls missing');
assert.match(game, /combatBrawler === 'spikey'\) \{ castSpikeySuper\(player/, 'player super dispatch missing');
assert.match(game, /botCombatBrawler === 'spikey'\) \{ castSpikeySuper\(bot/, 'bot super dispatch missing');
assert.match(game, /brawler === 'spikey'\) \{[\s\S]*?countSpikeyDeployed\(fromEntity\) >= 3[\s\S]*?recallSpikeyBalls\(fromEntity\)/, 'fire() recall pre-check missing');
assert.match(game, /b\.isSpikeyThrow && b\.life >= b\.maxLife\) \{\s*parkSpikeyBall\(b\)/, 'throw must park at max range');
assert.match(game, /b\.isSpikeyThrow\) \{\s*parkSpikeyBall\(b\);[\s\S]*?bullets\.splice\(i, 1\)/, 'throw must park on wall impact');
assert.match(game, /mega\.bouncesLeft--/, 'mega ball bounce counter missing');
assert.match(game, /spikeyRootMs:hyper\?800:0/, 'hyper main attack must root for 0.8s');
assert.match(game, /SPIKEBALLS \$\{deployed\}\/3 DEPLOYED/, 'mechanic HUD entry missing');
console.log("✔ static anchors: registration + wiring");

// --- Behavioral: boot the real game as Spikey ---
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
store.set('brawl_arena_save', JSON.stringify({ persistent: {
  selectedBrawler: 'spikey',
  unlockedBrawlers: { outlit: true, fuser: true, rocketeer: true, spikey: true },
  brawlerProgress: { spikey: { level: 11, bricks: 0, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } },
} }));
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
assert.equal(typeof api.fire, 'function', 'fire must be exported for the cycle test');
assert.equal(typeof api.castSpikeySuper, 'function', 'castSpikeySuper must be exported');

api.launchShowdownMatch();
api.playing = true;
const p = api.player;
assert.equal(p.brawler, 'spikey', `player should be Spikey, got ${p.brawler}`);
const bot = api.bots.find(b => b && b.hp > 0);
assert.ok(bot, 'no bot to target');
api.bots.length = 0;
api.bots.push(bot);
bot.hp = bot.maxHp = 100000; bot.shield = 0; bot.shieldMax = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));
function frames(n, pin) {
  for (let f = 0; f < n; f++) {
    bot.stunUntil = Date.now() + 100000;
    if (pin) { bot.x = pin.x; bot.y = pin.y; }
    api.update(1 / 60);
  }
}
const myParked = () => api.spikeyParkedBalls.filter(b => b.ownerId === p.id);

// --- Throw -> deploy x3 (bot sits on the throw line: throw damage check) ---
p.x = 600; p.y = 2000;
const throwLinePin = { x: p.x + 300, y: p.y };
for (let t = 0; t < 3; t++) {
  const hpBefore = bot.hp;
  api.fire(p, p.x + 500, p.y, false, false);
  const thrown = api.bullets.find(b => b.isSpikeyThrow && b.ownerId === p.id);
  assert.ok(thrown, `throw ${t + 1}: no spikeball bullet spawned`);
  assert.equal(thrown.damage, 950, `throw ${t + 1}: damage must be 950 @P11`);
  frames(70, throwLinePin);
  if (t === 0) assert.ok(bot.hp <= hpBefore - 900, `throw must pierce the bot on its line (hp ${hpBefore} -> ${bot.hp})`);
  assert.equal(myParked().length, t + 1, `after throw ${t + 1}: ${t + 1} ball(s) must be parked`);
  await sleep(280); // player fireDelay 240ms
}
assert.equal(api.countSpikeyDeployed(p), 3, 'deployed count must read 3 with a full set out'); 

// --- Recall: attack with 3 out -> all fly home, piercing, 1,425, SP1 slow flag ---
bot.hp = 100000;
const recallPin = { x: p.x + 330, y: p.y }; // between Spikey and the parked balls
api.fire(p, p.x + 500, p.y, false, false);
assert.equal(myParked().length, 0, 'recall must clear the parked set');
const recalls = api.bullets.filter(b => b.isSpikeyRecall && b.ownerId === p.id);
assert.equal(recalls.length, 3, 'recall must spawn one return bullet per parked ball');
assert.ok(recalls.every(b => b.damage === 1425), 'recall damage must be 1,425 @P11 (higher than the throw)');
assert.ok(recalls.every(b => b.spikeySlowMs === 0), 'without SP1 selected, recall hits must carry no slow (base recall has no CC)');
const hpBeforeRecall = bot.hp;
frames(80, recallPin);
assert.ok(bot.hp <= hpBeforeRecall - 1400, `recall line must damage the bot it passes through (hp ${hpBeforeRecall} -> ${bot.hp})`);
assert.equal(api.bullets.filter(b => b.isSpikeyRecall).length, 0, 'recall bullets must despawn on arrival');

// --- SP1 Deep Roots flag, exercised through a bot (bots carry their own
// selectedStar on the entity, the same field bot star powers read game-wide) ---
bot.brawler = 'spikey';
bot.selectedStar = 'slow';
bot.level = 11;
bot.x = 2200; bot.y = 2200;
for (let k = 0; k < 3; k++) api.spikeyParkedBalls.push({ x: bot.x + 300, y: bot.y, ownerId: bot.id, nextThornAt: 0, seed: 1 });
api.fire(bot, bot.x - 500, bot.y, true, false);
const botRecalls = api.bullets.filter(b => b.isSpikeyRecall && b.ownerId === bot.id);
assert.equal(botRecalls.length, 3, 'bot recall must spawn one return bullet per parked ball');
assert.ok(botRecalls.every(b => b.spikeySlowMs === 1000), 'SP1 Deep Roots must flag recall hits with the 1s slow');
assert.ok(botRecalls.every(b => b.damage === 1425), 'bot recall damage must also be 1,425 @P11');
frames(90, { x: 2200, y: 2200 });
assert.equal(api.bullets.filter(b => b.isSpikeyRecall).length, 0, 'bot recall bullets must despawn on arrival');
bot.brawler = 'spikey'; // keep the (single) test bot on Spikey for the super checks below

// --- Super: exactly 3 bounces, heavy AoE per bounce ---
const superPin = { x: p.x + (p.radius + 20) + 260, y: p.y }; // first bounce point
bot.hp = 100000;
api.castSpikeySuper(p, false, p.x + 500, p.y);
assert.equal(api.spikeyMegaBalls.length, 1, 'super must spawn one Mega Spike Ball');
assert.equal(api.spikeyMegaBalls[0].bouncesLeft, 3, 'mega ball must start with 3 bounces');
const bounceSeq = [];
let lastBounces = 3;
for (let f = 0; f < 240 && api.spikeyMegaBalls.length; f++) {
  frames(1, superPin);
  const left = api.spikeyMegaBalls.length ? api.spikeyMegaBalls[0].bouncesLeft : 0;
  if (left !== lastBounces) { bounceSeq.push(left); lastBounces = left; }
}
assert.deepEqual(bounceSeq, [2, 1, 0], `mega ball must bounce exactly 3 times (saw ${bounceSeq})`);
assert.ok(bot.hp <= 100000 - 1500, `bounce explosion must deal heavy damage (hp -> ${bot.hp})`);

// --- Hyper Super: longer legs + spike ring per bounce ---
api.castSpikeySuper(p, true, p.x + 500, p.y);
assert.equal(api.spikeyMegaBalls[0].hyper, true, 'hyper cast must flag the mega ball');
let ringSeen = 0;
for (let f = 0; f < 240 && api.spikeyMegaBalls.length; f++) {
  frames(1, superPin);
  if (api.spikeyMegaBalls.length && api.spikeyMegaBalls[0].bouncesLeft === 2) {
    ringSeen = api.bullets.filter(b => b.isSpikeyRingSpike).length;
    break;
  }
}
assert.equal(ringSeen, 8, `hyper bounce must burst a ring of 8 spikes (saw ${ringSeen})`);

// --- Hyper main attack: +50% projectile speed + 0.8s root flag ---
await sleep(1500); // let an ammo reload finish
api.isHypercharged = true;
api.hyperchargeUntil = Date.now() + 10000;
api.fire(p, p.x + 500, p.y, false, false);
const hyperThrow = api.bullets.find(b => b.isSpikeyThrow && b.ownerId === p.id);
assert.ok(hyperThrow, 'hyper throw did not spawn');
assert.equal(hyperThrow.spikeyRootMs, 800, 'hyper main attack hits must root for 0.8s');
assert.ok(Math.abs(Math.hypot(hyperThrow.vx, hyperThrow.vy) - 1320) < 2, `hyper projectile speed must be 880 * 1.5 = 1320 (got ${Math.hypot(hyperThrow.vx, hyperThrow.vy)})`);
api.isHypercharged = false;

console.log('✔ behavioral: throw/deploy/recall cycle, 3-bounce super, hyper ring + root + speed');
console.log('spikey regression: all checks passed');

process.exit(0);
