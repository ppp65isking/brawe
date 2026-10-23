import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors: registration, constants, and the wiring points ----
assert.match(game, /\['prop_hunt', '🫣', 'Prop Hunt'/, 'Prop Hunt card must be registered in HOME_MODE_CARDS');
assert.match(game, /'capture_turkey', 'prop_hunt'\];/, 'Prop Hunt must be a permanent home mode');
assert.match(game, /prop_hunt: \{ type:'coins', amount:60, label:'\+60 Coins' \}/, 'Prop Hunt must mirror the closest event reward table (+60 coins)');
assert.match(game, /let PROP_HUNT_ENABLED = true;/, 'Kill switch PROP_HUNT_ENABLED must exist and default on');
assert.match(game, /PROP_HUNT_REMORPH_COOLDOWN_MS = 10000/, 'Re-morph cooldown must be 10 seconds');
assert.match(game, /PROP_HUNT_WRONG_GUESS_TAX = 400/, 'Wrong-guess tax must be 400 HP');
assert.match(game, /PROP_HUNT_SHELL_BREAK_DAMAGE = 500/, 'Shell-break spillover must be 500');
assert.match(game, /PROP_HUNT_HEAD_START_MS = 15000/, 'Head start must be 15 seconds');
assert.match(game, /PROP_HUNT_MATCH_SECONDS = 150/, 'Seek timer must be 150 seconds');
assert.match(game, /applyPropHuntWrongGuessTax\(owner, dw\)/, 'Bullet-vs-wall code must apply the tax');
assert.match(game, /revealPropHuntHiderFromShell\(dw\)/, 'Bullet-vs-wall code must reveal on shell break');
assert.match(game, /!isPropHuntMode && !isTraining && !isBossFight && !isSoloTrial && !gameOver/, 'Storm must exclude Prop Hunt');
assert.match(game, /if \(isPropHuntMode && t\.propHuntRole\) \{ updatePropHuntBot\(t, dt, now\); continue; \}/, 'Bot loop must route Prop Hunt bots to their controller');
assert.match(game, /if \(isPropHuntMode && t\.propHuntMorphed\) continue;/, 'Render must skip morphed hiders (they render as the prop wall only)');
assert.match(game, /function canDetectMorphedHider/, 'Morph detection predicate must exist');
assert.match(game, /PROP_HUNT_MINIMAP_PING_SHOW_MS = 1000/, 'Minimap ping flash window must be 1s');
// Minimap leak (Anthony playtest, 2026-10-23): the aliveBots minimap loop must skip morphed
// hiders -- they render only as props -- flashing the dot only while an endgame ping is fresh.
const minimapBlock = game.slice(game.indexOf('ctx.translate(mapX, mapY)'));
const minimapLoopAt = minimapBlock.indexOf('for(const t of aliveBots){');
assert.ok(minimapLoopAt >= 0, 'minimap aliveBots loop must exist');
const minimapLoop = minimapBlock.slice(minimapLoopAt, minimapLoopAt + 800);
assert.match(minimapLoop, /if \(isPropHuntMode && t\.propHuntMorphed && !\(propHuntState && propHuntState\.lastPingAt > 0 && performance\.now\(\) - propHuntState\.lastPingAt < PROP_HUNT_MINIMAP_PING_SHOW_MS\)\) continue;/, 'Minimap must hide morphed hiders except during a fresh endgame ping');

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
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, selectedBrawler: 'spikey', unlockedBrawlers: { spikey: true }, brawlerProgress: { spikey: { level: 11, bricks: 9999, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } }));
vm.createContext(sandbox);
vm.runInContext(game, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
assert.ok(api, 'game test API must boot');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function frames(n) { for (let i = 0; i < n; i++) api.update(1 / 60); }
function launchPropHunt() {
  api.showdownMode = 'prop_hunt';
  api.launchShowdownMatch(1, 1);
  api.playing = true;
}
function parkSeekerBot() {
  const s = api.bots.find(b => b.propHuntRole === 'seeker');
  if (s) { s.x = 200; s.y = 3800; s.propHuntNextTestAt = Date.now() + 60000; }
  return s;
}

// ---- Match setup: mode registers, roles are 2 seekers / 6 hiders ----
launchPropHunt();
const p = api.player;
assert.equal(api.isPropHuntMode, true, 'prop_hunt must activate Prop Hunt mode');
assert.ok(api.propHuntState, 'prop hunt state must exist');
assert.equal(api.propHuntState.phase, 'hide', 'match must open in the hide phase');
assert.equal(api.propHuntState.endsAt - api.propHuntState.phaseEndsAt, 150000, 'seek phase must run 150s after the head start');
assert.equal(api.bots.length, 7, 'lobby must be 8 fighters: player + 7 bots');
assert.equal(api.bots.filter(b => b.propHuntRole === 'seeker').length, 1, 'exactly 1 seeker bot');
assert.equal(api.bots.filter(b => b.propHuntRole === 'hider').length, 6, 'exactly 6 hider bots');
assert.equal(p.propHuntRole, 'seeker', 'v1 solo default: the player is a seeker');
for (const type of ['barrel', 'crate', 'plant_pot', 'sign_post']) {
  assert.ok(api.destructibleWalls.some(w => w.isProp && w.propType === type), `Crown Collapse must place morph prop type ${type}`);
}
assert.equal(api.destructibleWalls.some(w => w.isPowerBox), false, 'Prop Hunt must not scatter power boxes');

// ---- Head start: seekers cannot fire or move; it ends after 15s ----
const seekerBot = parkSeekerBot();
const sbX = seekerBot.x, sbY = seekerBot.y;
api.fire(p, p.x + 300, p.y, false);
frames(30);
assert.equal(api.bullets.filter(b => b.ownerId === p.id).length, 0, 'seeker fire must be blocked during the head start');
assert.equal(Math.hypot(seekerBot.x - sbX, seekerBot.y - sbY), 0, 'seeker bot must stay frozen during the head start');
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek', 'seek phase must begin when the head start expires');

// ---- Morph: hider becomes a real prop wall with the prop type's HP ----
let hider = api.bots.find(b => b.propHuntRole === 'hider' && !b.propHuntMorphed);
hider.brawler = 'warrior'; // pin a passive-free brawler: aura brawlers (Cinderion etc.) would burn their own shell and pollute the spill measurement
const barrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
hider.x = barrel.x + barrel.w / 2 + 58; hider.y = barrel.y + barrel.h / 2; hider.propHuntRemorphAt = 0;
assert.equal(api.findPropHuntMorphSource(hider), barrel, 'nearest morph source must be the adjacent barrel');
assert.equal(api.morphPropHuntHider(hider, 'barrel'), true, 'morph must succeed next to a morph-suitable prop');
const shell = hider.propHuntWall;
assert.ok(shell && shell.isProp, 'morph must create a real prop wall (this is what renders as the prop)');
assert.equal(shell.hp, 2400, 'barrel morph shell must carry the barrel HP pool');
assert.equal(shell.propHuntHiderId, hider.id, 'shell must be flagged with the hider id');
assert.ok(api.destructibleWalls.includes(shell), 'shell must live in destructibleWalls');
assert.ok(Math.abs(shell.x + shell.w / 2 - hider.x) < 1 && Math.abs(shell.y + shell.h / 2 - hider.y) < 1, 'morph must anchor at the hider position');

// ---- Detection: 240px reveal radius, parallel to bush rules ----
assert.equal(api.canDetectMorphedHider(p, hider), false, 'a morphed hider must be undetectable from across the map');
const homeX = p.x, homeY = p.y;
p.x = hider.x + 200; p.y = hider.y;
assert.equal(api.canDetectMorphedHider(p, hider), true, 'a morphed hider inside 240px must be detectable');
p.x = homeX; p.y = homeY;

// ---- Wrong-guess tax: 400 HP for damaging a REAL prop ----
parkSeekerBot();
const crate = api.destructibleWalls.find(w => w.isProp && w.propType === 'crate' && !w.propHuntHiderId);
p.x = crate.x + crate.w / 2 + 300; p.y = crate.y + crate.h / 2;
p.hp = p.maxHp;
const hpBeforeTax = p.hp;
api.fire(p, crate.x + crate.w / 2, crate.y + crate.h / 2, false);
frames(60);
assert.equal(hpBeforeTax - p.hp, 400, `shooting a real prop must cost the seeker exactly 400 HP (lost ${hpBeforeTax - p.hp})`);
assert.ok(crate.hp < 1800, 'the real prop must still take the damage');

// ---- Correct guess: hitting a morphed hider feeds the shell, NO tax ----
await sleep(1400); // clear the player fire delay
parkSeekerBot();
p.x = shell.x + shell.w / 2 + 320; p.y = shell.y + shell.h / 2;
const hpBeforeGuess = p.hp;
api.fire(p, shell.x + shell.w / 2, shell.y + shell.h / 2, false);
frames(60);
assert.equal(p.hp, hpBeforeGuess, 'hitting a morphed hider must NOT tax the seeker');
assert.ok(shell.hp < 2400, 'the morph shell must absorb the hit first');
assert.equal(hider.propHuntMorphed, true, 'hider must stay morphed while the shell holds');

// ---- Shell break: reveal + 500 spillover + 10s re-morph cooldown ----
await sleep(1400);
shell.hp = 50;
const hiderHpBefore = hider.hp;
api.fire(p, shell.x + shell.w / 2, shell.y + shell.h / 2, false);
// Measure on the exact break frame: bot HP regen would mask the spill later.
let spillSeen = null;
let cooldownAtBreak = 0;
for (let i = 0; i < 90 && spillSeen === null; i++) {
  api.update(1 / 60);
  if (!hider.propHuntMorphed) { spillSeen = hiderHpBefore - hider.hp; cooldownAtBreak = hider.propHuntRemorphAt - Date.now(); }
}
assert.ok(spillSeen !== null, 'destroying the shell must reveal the hider');
assert.equal(spillSeen, 500, `shell break must spill exactly 500 onto the hider (lost ${spillSeen})`);
assert.ok(!api.destructibleWalls.includes(shell), 'broken shell must be removed from the world');
const cooldownLeft = cooldownAtBreak;
assert.ok(cooldownLeft > 8000 && cooldownLeft <= 10050, `re-morph cooldown must be ~10s (got ${cooldownLeft}ms)`);
assert.equal(api.morphPropHuntHider(hider, 'barrel'), false, 're-morph must be refused during the cooldown');

// ---- After the cooldown: morph again, and firing breaks it instantly ----
hider.propHuntRemorphAt = 0;
assert.equal(api.morphPropHuntHider(hider, 'barrel'), true, 'morph must work again after the cooldown');
api.fire(hider, hider.x + 100, hider.y, true);
assert.equal(hider.propHuntMorphed, false, 'firing must break the morph instantly');

// ---- Timer win for the hiders ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
api.propHuntState.endsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.winner, 'hiders', 'hiders alive at 0:00 must win');
assert.equal(api.gameOver, true, 'timer expiry must end the match');

// ---- Elimination win for the seekers ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
for (const b of api.bots) if (b.propHuntRole === 'hider') b.hp = 0;
frames(3);
assert.equal(api.propHuntState.winner, 'seekers', 'eliminating all hiders must win for the seekers');
assert.equal(api.gameOver, true, 'elimination must end the match');

// ---- Endgame anti-stall pings in the final 30s ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
let lateHider = api.bots.find(b => b.propHuntRole === 'hider' && !b.propHuntMorphed);
lateHider.brawler = 'warrior';
const lateBarrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
lateHider.x = lateBarrel.x + lateBarrel.w / 2 + 58; lateHider.y = lateBarrel.y + lateBarrel.h / 2; lateHider.propHuntRemorphAt = 0;
assert.equal(api.morphPropHuntHider(lateHider, 'barrel'), true, 'late hider must morph for the ping check');
api.propHuntState.endsAt = Date.now() + 20000; // inside the final 30s
api.propHuntState.nextPingAt = 0;
frames(3);
assert.ok(api.propHuntState.lastPingAt > 0, 'morphed hiders must emit reveal pings in the final 30s');
assert.ok(Date.now() - api.propHuntState.lastPingAt < 1000, 'a fresh ping must fall inside the 1s minimap flash window (PROP_HUNT_MINIMAP_PING_SHOW_MS)');

// ---- Minimap leak: before any endgame ping, the guard inputs keep hiders hidden ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
assert.equal(api.propHuntState.lastPingAt, 0, 'no ping yet: lastPingAt must be unset so the minimap guard hides morphed hiders');

// ---- Kill switch: disabling PROP_HUNT_ENABLED falls back to solo ----
api.PROP_HUNT_ENABLED = false;
api.showdownMode = 'prop_hunt';
api.launchShowdownMatch(1, 1);
assert.equal(api.isPropHuntMode, false, 'kill switch off must refuse Prop Hunt (falls back to solo)');
api.PROP_HUNT_ENABLED = true;

console.log('prop-hunt-regression: all assertions passed');
process.exit(0);
