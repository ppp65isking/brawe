import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors: identity, kit, and the reworked systems ----
assert.match(game, /spikey': \{ name: 'Spikey', role: 'Damage Dealer'[\s\S]*?attack: 'Triple Thorn Toss'[\s\S]*?super: 'Mega Spike Ball'/, 'Spikey kit identity must be registered');
assert.match(game, /g1: 'Burst Barbs \([\s\S]*?g2: 'Quill Roll \(/, 'Spikey gadgets must be registered');
assert.match(game, /spikey:\s*'Mythic'/, 'Spikey must be Mythic');
assert.match(game, /spikey:6/, 'Spikey Super must charge in 6 hits');
assert.match(game, /return \{ hp: Math\.round\(7000 \* scale\), dmg: Math\.round\(950 \* scale\), recallDmg: Math\.round\(950 \* scale\), superDmg: Math\.round\(1750 \* scale\)/, 'Spikey stats: 950 throw AND 950 return (the 1,425 recall is gone)');
assert.doesNotMatch(game, /recallDmg: Math\.round\(1425/, 'Launch 1,425 recall damage must be gone');
assert.doesNotMatch(game, /for 1,425 damage/, 'Kit text must not advertise the old recall damage');
assert.match(game, /SPIKEY_TRAVELING_SUPER_ENABLED = false/, 'Traveling Mega Ball Super must be vaulted');
assert.match(game, /spikeyPendingSlams\.push/, 'New Super must queue the slam barrage');
assert.match(game, /ensureSpikeyCycle/, 'Magazine cycle state must exist');
assert.match(game, /countSpikeyParked\(fromEntity\) >= SPIKEY_MAX_DEPLOYED[\s\S]*?recallSpikeyBalls\(fromEntity\)/, 'fire() must turn the attack into RETURN at 3 parked');
assert.match(game, /noteSpikeyBallHome\(b\.ownerId\)/, 'Recall arrivals must settle balls home');
assert.match(game, /ATTACK TO RETURN/, 'HUD must show the RETURN state');
assert.match(game, /SPIKEBALLS RELOADING/, 'HUD must show the reloading state');
// Immunity exemption points (Anthony's explicit rule, 2026-10-23):
assert.match(game, /function stealAmmo\(target, ownerId, amount\) \{\s*\/\/ Spikey immunity[\s\S]*?if \(isSpikeyEntity\(target\)\) return;/, 'stealAmmo must exempt Spikey');
assert.match(game, /if \(isSpikeyEntity\(target\)\) return 0;/, 'stealAmmoForRobber must exempt Spikey');
assert.match(game, /if\(!isSpikeyEntity\(target\)\) \{\s*if\(target\.id===player\.id\)ammo=Math\.max\(0,ammo-1\)/, 'Boom-Arang Super drain must exempt Spikey');
assert.match(game, /if \(!isSpikeyEntity\(target\)\) target\.reloadDebuffUntil = performance\.now\(\) \+ 3000;/, 'Tax Note reload debuff must exempt Spikey');
assert.match(game, /if \(!isSpikeyEntity\(target\)\) target\.reloadDebuffUntil = now \+ 3000;/, 'Sticky-note reload debuff must exempt Spikey');
assert.match(game, /else if \(selectedBrawler === 'spikey'\) \{[\s\S]{0,500}?currentReloadTime = 9999999;/, 'Spikey reload must bypass the generic reload pipeline');
// Bots use the same systems through the shared dispatch.
assert.match(game, /botCombatBrawler === 'spikey'\) \{ castSpikeySuper\(bot, isHyper, targetX, targetY\)/, 'Bots must cast the new slam Super');
assert.match(game, /combatBrawler === 'spikey'\) \{ castSpikeySuper\(player, !!isHypercharged, wm\.x, wm\.y\)/, 'Player Super dispatch must target the slam barrage');
assert.doesNotMatch(game, /freeBrawlers[\s\S]{0,200}spikey/, 'Spikey must not be silently free-unlocked');

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
async function framesOverTime(ms, pin) {
  const end = Date.now() + ms;
  while (Date.now() < end) { frames(3, pin); await sleep(40); }
}

api.launchShowdownMatch(1, 1);
api.playing = true;
api.bots.length = 1; // quiet lobby: roaming bots would fight/heal the pinned target and pollute HP measurements
const p = api.player;
const bot = api.bots[0];
const origBotBrawler = bot.brawler;
assert.equal(api.bots.length >= 1, true, 'a bot opponent is required');
p.x = 600; p.y = 2000; p.hp = p.maxHp; p.shield = 0;
bot._x = 930; bot._y = 2000; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000; bot.maxHp = 100000; bot.shield = 0;

// ---- Magazine cycle: 3 throws, each consuming a hand ball ----
for (let t = 0; t < 3; t++) {
  const hpBefore = bot.hp;
  api.fire(p, 1100, 2000, false);
  frames(70, bot);
  assert.equal(api.spikeyParkedBalls.filter(b => b.ownerId === p.id).length, t + 1, `throw ${t + 1} must park`);
  assert.equal(p.spikeyBallsReady, 2 - t, `throw ${t + 1} must consume a ball from hand`);
  if (t === 0) assert.ok(hpBefore - bot.hp >= 900, 'a throw must deal 950 piercing damage through the pinned bot');
  if (t < 2) await sleep(300); // player fireDelay between throws
}
assert.equal(api.getSpikeyCycleState(p), 'return', 'with 3 parked the attack must become RETURN');
// The next attack is the RETURN: recalls spawn, no throw does.
api.fire(p, 1100, 2000, false);
const recalls = api.bullets.filter(b => b.isSpikeyRecall && b.ownerId === p.id);
assert.equal(recalls.length, 3, 'RETURN must recall exactly the 3 parked balls');
assert.equal(api.bullets.some(b => b.isSpikeyThrow && b.ownerId === p.id), false, 'RETURN must not spawn a throw');
for (const r of recalls) assert.equal(r.damage, 950, 'return damage must be 950 per ball (the 1,425 era is over)');
assert.equal(api.spikeyParkedBalls.filter(b => b.ownerId === p.id).length, 0, 'RETURN must clear the parked balls');

// Full return through one pinned target: 3 balls x 950 = 2,850 max, never more.
bot.hp = 100000;
frames(90, bot);
const returnDrop = 100000 - bot.hp;
assert.ok(returnDrop >= 2800, `a full return through one target must land all 3 balls (drop ${returnDrop})`);
assert.ok(returnDrop <= 2850, `a full return must never exceed 2,850 on one target (drop ${returnDrop})`);
assert.equal(api.bullets.some(b => b.isSpikeyRecall && b.ownerId === p.id), false, 'recall bullets must despawn on arrival');
assert.equal(api.getSpikeyCycleState(p), 'ready', 'with the reload gone, a homecoming must leave her instantly ready');
assert.equal(p.spikeyBallsReady, 3, 'all 3 balls must be back the moment the return lands — no reload wait');

// ---- Ammo-steal immunity (and a control: steal still works on others) ----
const lastShotBefore = bot.lastShot || 0;
api.stealAmmo(bot, p.id, 0.25);
assert.ok((bot.lastShot || 0) >= lastShotBefore + 200, 'control: stealAmmo must still delay a normal brawler');
api.stealAmmo(p, bot.id, 1);
assert.equal(p.spikeyBallsReady, 3, 'ammo steal must not touch Spikey balls');
assert.equal(api.getSpikeyCycleState(p), 'ready', 'ammo steal must not disturb the cycle state');

// ---- Reload-modifier immunity: a huge external reload debuff must not
// create any wait — there is no reload left to stretch.
p.reloadDebuffUntil = Date.now() + 60000;
await framesOverTime(1500, bot);
assert.equal(p.spikeyBallsReady, 3, 'balls must stay ready through a reload debuff — no reload exists to stretch');
assert.equal(api.getSpikeyCycleState(p), 'ready', 'cycle must stay ready through a reload debuff');
// Throwing works immediately after the return.
api.fire(p, 1100, 2000, false);
frames(70, bot);
assert.equal(api.spikeyParkedBalls.filter(b => b.ownerId === p.id).length, 1, 'throwing must work immediately after the return');

// ---- Bot cycle: a bot Spikey fires RETURN the same way, SP1 slow intact ----
bot.brawler = 'spikey';
bot.level = 11;
bot.selectedStar = 'slow';
bot.spikeyBallsReady = 0; bot.spikeyHomePool = 0; bot.spikeyReloadPending = 0; bot.spikeyReloadEndsAt = 0;
bot._x = 2200; bot._y = 2200; bot.x = bot._x; bot.y = bot._y;
for (const dx of [180, 240, 300]) api.spikeyParkedBalls.push({ x: bot.x + dx, y: bot.y, ownerId: bot.id, nextThornAt: 0, seed: 1 });
api.fire(bot, bot.x - 200, bot.y, true);
const botRecalls = api.bullets.filter(b => b.isSpikeyRecall && b.ownerId === bot.id);
assert.equal(botRecalls.length, 3, 'a bot with 3 parked must RETURN instead of throwing');
for (const r of botRecalls) {
  assert.equal(r.damage, 950, 'bot return damage must be 950');
  assert.equal(r.spikeySlowMs, 1000, 'SP1 slow must ride the return hits');
}
frames(90, bot);
assert.equal(api.bullets.some(b => b.isSpikeyRecall && b.ownerId === bot.id), false, 'bot recall bullets must arrive home');
bot.brawler = origBotBrawler;

// ---- New Super: 3 slams stepping forward, no traveling Mega Ball ----
bot._x = 830; bot._y = 2000; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000;
api.castSpikeySuper(p, false, p.x + 500, p.y);
assert.equal(api.spikeyPendingSlams.length, 3, 'the Super must queue exactly 3 slams');
assert.equal(api.spikeyPendingSlams.map(s => Math.round(s.x)).join(','), '710,830,950', 'slams must step forward from close range');
assert.equal(api.spikeyMegaBalls.length, 0, 'the traveling Mega Ball must never spawn');
await framesOverTime(700, bot);
assert.equal(api.spikeyPendingSlams.length, 0, 'all slams must resolve');
const slamDrop = 100000 - bot.hp;
assert.ok(slamDrop >= 5000 && slamDrop <= 5300, `a target at the middle slam must take all 3 slams (drop ${slamDrop})`);
// Slams stay close: a target well past the last slam is untouched.
bot._x = 1500; bot._y = 2000; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000;
api.castSpikeySuper(p, false, p.x + 500, p.y);
await framesOverTime(700, bot);
assert.equal(bot.hp, 100000, 'slams must not reach far targets (no traveling ball)');

// ---- Hypercharge Super: 2 smaller side balls per slam (500, r80) ----
bot._x = 710; bot._y = 2175; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000;
api.castSpikeySuper(p, true, p.x + 500, p.y);
assert.equal(api.spikeyPendingSlams.length, 3, 'Hyper Super must still queue 3 slams');
assert.ok(api.spikeyPendingSlams.every(s => s.hyper), 'Hyper slams must be flagged hyper');
await framesOverTime(700, bot);
const sideDrop = 100000 - bot.hp;
assert.ok(sideDrop >= 400 && sideDrop <= 600, `a target on a side-ball spot must take one 500 side ball (drop ${sideDrop})`);

// ---- Hyper main attack boosts: +100% speed/unload (was +50%), 0.8s root ----
api.isHypercharged = true;
p.hyperchargeUntil = Date.now() + 10000;
api.spikeyParkedBalls.length = 0;
api.bullets.length = 0;
p.spikeyBallsReady = 3; p.spikeyHomePool = 0; p.spikeyReloadPending = 0; p.spikeyReloadEndsAt = 0;
api.fire(p, 1100, 2000, false);
const hyperThrow = api.bullets.find(b => b.isSpikeyThrow && b.ownerId === p.id);
assert.ok(hyperThrow, 'a Hyper throw must spawn');
assert.equal(Math.round(Math.hypot(hyperThrow.vx, hyperThrow.vy)), 1760, 'Hyper throw speed must be +100% (880 x 2)');
assert.equal(hyperThrow.spikeyRootMs, 800, 'Hyper hits must root for 0.8s');
assert.equal(hyperThrow.damage, 950, 'Hyper throw damage stays 950');
assert.equal(p.spikeyBallsReady, 2, 'a Hyper throw still consumes one hand ball');

console.log('Spikey rework regression passed: magazine cycle (950 return, reload removed — instant return), ammo-steal + reload-modifier immunity, 3-slam Super, Hyper side balls, SP1/bot cycle.');
process.exit(0);
