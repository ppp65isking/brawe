import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ENVIRONMENT REBUILD - Phase 5 (2026-10-23): props v1, the Prop Hunt
// substrate. Behavioral: boots the real game.js in a vm (same harness as
// spikey-regression.mjs) plus a probe injected at the test-export anchor
// for the map builders / nav internals. Pins:
//   - the canonical registry: PROP_DEFS semantics + placeProp routing
//     (solids -> destructibleWalls with isProp, pads -> mapProps)
//   - the kill switch PROPS_V1_ENABLED gates placement and terrain
//   - blocksMove semantics: barrel/crate are terrain for movement + the
//     bot nav grid; plant pot / sign post are not
//   - blocksShots in a live match: a bullet dies on a barrel and damages
//     it; the target behind it is untouched; once the barrel dies the
//     lane is open and its nav-grid cell frees up via the dirty hook
//   - pads apply effects: healing pad heals player + bot over time,
//     speed pad multiplies getTerrainMoveMultiplier by 1.3
//   - placement on the 3 touched maps (Showdown theme 0, Knockout,
//     Brawe Ball): full prop sets, >=240px from every spawn point
const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors ----
assert.match(source, /let PROPS_V1_ENABLED = true;/, 'kill switch must exist and default on');
assert.match(source, /barrel:\s*\{[^}]*hp: 2400[^}]*blocksMove: true[^}]*blocksShots: true/, 'barrel def');
assert.match(source, /crate:\s*\{[^}]*hp: 1800[^}]*blocksMove: true[^}]*blocksShots: true/, 'crate def');
assert.match(source, /plant_pot:\s*\{[^}]*hp: 900[^}]*blocksMove: false[^}]*blocksShots: true/, 'plant pot def');
assert.match(source, /sign_post:\s*\{[^}]*hp: 700[^}]*blocksMove: false[^}]*blocksShots: true/, 'sign post def');
assert.match(source, /healing_pad:\s*\{[^}]*blocksMove: false[^}]*blocksShots: false[^}]*pad: true/, 'healing pad def');
assert.match(source, /wall\.isProp && \(!PROPS_V1_ENABLED \|\| !wall\.blocksMove\)/, 'isNavigationWall must gate props by blocksMove + kill switch');
assert.match(source, /damageableObject = !!\([^)]*dw\.isProp\)/, 'bullet damage gate must include props');
assert.match(source, /if \(playing && !gameOver\) updatePropPads\(\);/, 'pad tick must run in the update loop');
assert.ok((source.match(/placeProp\('/g) || []).length >= 30, 'the 3 touched maps must place props (30+ placeProp calls)');

// ---- Boot harness (mirrors spikey-regression.mjs) ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE =
  '  globalThis.__propsProbe = { buildNextShowdownMap, buildKnockoutMap, buildBraweBallMap, getTerrainMoveMultiplier, isNavigationWall, markBotNavGridDirty, refreshBotNavGridDirty,\n' +
  '    navCellBlockedAt: (x, y) => { const i = botNavCellOf(x, y); return !!(botNavGrid && i >= 0 && botNavGrid.blocked[i] === 1); },\n' +
  '    setWorld: (w, h) => { WORLD_W = w; WORLD_H = h; },\n' +
  '    buildNav: () => buildBotNavGrid() };\n' + ANCHOR;
const booted = source.replace(ANCHOR, PROBE);

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
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, selectedBrawler: 'rocketeer', unlockedBrawlers: { rocketeer: true }, brawlerProgress: { rocketeer: { level: 11, bricks: 9999, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true } } } }));
vm.createContext(sandbox);
vm.runInContext(booted, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
const P = sandbox.__propsProbe;
assert.ok(api, 'game test API must boot');
assert.ok(P, 'props probe must be installed by the boot');

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

// ---- Registry + placement routing + kill switch ----
const wallsBefore = api.destructibleWalls.length;
const padsBefore = api.mapProps.length;
const barrel = api.placeProp('barrel', 500, 500);
assert.ok(barrel && barrel.isProp && barrel.propType === 'barrel', 'placeProp must return the barrel entry');
assert.equal(barrel.hp, 2400); assert.equal(barrel.maxHp, 2400);
assert.equal(barrel.blocksMove, true); assert.equal(barrel.blocksShots, true);
assert.ok(api.destructibleWalls.includes(barrel), 'solid props must live in destructibleWalls');
const plant = api.placeProp('plant_pot', 700, 500);
assert.equal(plant.blocksMove, false, 'plant pot must not block movement');
assert.equal(plant.hp, 900);
const pad = api.placeProp('healing_pad', 900, 500);
assert.ok(pad && pad.isPropPad, 'pads must be pad entries');
assert.ok(api.mapProps.includes(pad), 'pads must live in mapProps');
assert.ok(!api.destructibleWalls.includes(pad), 'pads must NOT be walls (they cannot block shots)');
assert.equal(api.placeProp('bogus_type', 0, 0), null, 'unknown prop types must be rejected');
assert.equal(api.destructibleWalls.length, wallsBefore + 2, 'only the 2 solid props joined the wall store');
api.PROPS_V1_ENABLED = false;
assert.equal(api.placeProp('crate', 100, 100), null, 'kill switch off: placement must be a no-op');
assert.equal(P.isNavigationWall(barrel), false, 'kill switch off: props are not terrain');
api.PROPS_V1_ENABLED = true;
assert.equal(P.isNavigationWall(barrel), true, 'barrel must be navigation terrain');
assert.equal(P.isNavigationWall(plant), false, 'plant pot must not be navigation terrain');
// Clean the unit props back out.
for (const w of [barrel, plant]) api.destructibleWalls.splice(api.destructibleWalls.indexOf(w), 1);
api.mapProps.splice(api.mapProps.indexOf(pad), 1);

// ---- Live match: shooting, blocking, pads ----
api.launchShowdownMatch();
api.playing = true;
api.bots.length = 1; // quiet lobby, same reasoning as the Spikey test
const p = api.player;
const bot = api.bots[0];
assert.ok(bot, 'a bot opponent is required');
p.shield = 0; bot.shield = 0;

// Find a Y whose 640..1300 corridor at x is free of cubes/walls on whatever
// Showdown theme the rotation served, and run the shooting range there.
function corridorClear(y) {
  const solids = [...api.destructibleWalls];
  for (const w of solids) {
    if (y > w.y - 24 && y < w.y + w.h + 24 && w.x + w.w > 620 && w.x < 1320) return false;
  }
  return true;
}
const rangeY = [2000, 1000, 3000, 600, 3400].find(corridorClear);
assert.ok(rangeY, 'some shooting-range corridor must be clear on the active theme');
p.x = 600; p.y = rangeY; p.hp = p.maxHp;
bot._x = 1250; bot._y = rangeY; bot.x = bot._x; bot.y = bot._y; bot.hp = 100000; bot.maxHp = 100000;

const rangeBarrel = api.placeProp('barrel', 900, rangeY - 24);
assert.ok(rangeBarrel, 'range barrel must place');
function shoot(fromX, y) {
  api.bullets.push({ ownerBrawler: 'rocketeer', x: fromX, y, vx: 900, vy: 0, life: 0, maxLife: 2, damage: 600, pierce: false, ownerId: p.id, hitIds: {}, radius: 6, hitboxMod: 1, ang: 0 });
  frames(45, bot);
}
shoot(640, rangeY);
assert.ok(rangeBarrel.hp < 2400, `a bullet must damage the barrel (hp ${rangeBarrel.hp})`);
assert.ok(rangeBarrel.hp >= 1700, `one 600-damage bullet must not over-damage the barrel (hp ${rangeBarrel.hp})`);
assert.equal(bot.hp, 100000, 'the barrel must block the shot: the bot behind it stays untouched');
rangeBarrel.hp = 500; // one more hit finishes it
shoot(640, rangeY);
assert.ok(!api.destructibleWalls.includes(rangeBarrel), 'a prop at 0 HP must die and leave the wall store');
assert.equal(bot.hp, 100000, 'the killing bullet is still consumed by the barrel');
shoot(640, rangeY);
assert.ok(bot.hp < 100000, 'with the barrel gone the lane is open: the next bullet reaches the bot');

// Healing pad: heals the player and a bot standing on it (350 HP/s ticks).
const healPad = api.placeProp('healing_pad', p.x - 48, p.y - 48);
assert.ok(healPad, 'healing pad must place');
p.hp = p.maxHp - 1000;
bot._x = p.x + 20; bot._y = p.y; bot.x = bot._x; bot.y = bot._y; bot.hp = 50000;
await framesOverTime(1200, bot);
assert.ok(p.hp > p.maxHp - 1000, `healing pad must heal the player (hp ${p.hp}/${p.maxHp})`);
assert.ok(bot.hp > 50000, `healing pad must heal a bot standing on it (hp ${bot.hp})`);
api.mapProps.splice(api.mapProps.indexOf(healPad), 1);

// Speed pad: the shared terrain multiplier is the effect (player + bots use it).
const speedPad = api.placeProp('speed_pad', p.x - 48, p.y - 48);
assert.ok(speedPad, 'speed pad must place');
assert.ok(api.isEntityOnPropPad(p, 'speed_pad'), 'player must register on the speed pad');
assert.ok(Math.abs(P.getTerrainMoveMultiplier(p) - 1.3) < 0.001, `speed pad must give x1.3 (got ${P.getTerrainMoveMultiplier(p)})`);
p.x += 500;
assert.equal(P.getTerrainMoveMultiplier(p), 1.0, 'off the pad the multiplier must be back to 1.0');
api.PROPS_V1_ENABLED = false;
assert.equal(api.isEntityOnPropPad(p, 'speed_pad'), false, 'kill switch off: pads must not register');
api.PROPS_V1_ENABLED = true;
api.mapProps.splice(api.mapProps.indexOf(speedPad), 1);

// ---- Map placement: content + spawn clearance on the 3 touched maps ----
function propCounts() {
  const solids = {};
  for (const w of api.destructibleWalls) if (w.isProp) solids[w.propType] = (solids[w.propType] || 0) + 1;
  const pads = {};
  for (const mp of api.mapProps) pads[mp.propType] = (pads[mp.propType] || 0) + 1;
  return { solids, pads };
}
function assertSpawnClearance(spawns, label) {
  const entries = [
    ...api.destructibleWalls.filter(w => w.isProp).map(w => ({ x: w.x + w.w / 2, y: w.y + w.h / 2, t: w.propType })),
    ...api.mapProps.map(mp => ({ x: mp.x + mp.w / 2, y: mp.y + mp.h / 2, t: mp.propType })),
  ];
  assert.ok(entries.length > 0, `${label}: props must be placed`);
  for (const e of entries) {
    for (const s of spawns) {
      const d = Math.hypot(e.x - s.x, e.y - s.y);
      assert.ok(d >= 235, `${label}: ${e.t} at (${Math.round(e.x)},${Math.round(e.y)}) is only ${Math.round(d)}px from spawn (${s.x},${s.y})`);
    }
  }
}
const teamSpawns = (worldH, backY, frontY, midX, step) => {
  const pts = [];
  for (const team of ['player', 'enemy']) for (let slot = 0; slot < 3; slot++) {
    pts.push({ x: midX + (slot - 1) * step, y: team === 'player' ? backY : frontY });
  }
  return pts;
};

P.buildNextShowdownMap(0);
{
  const { solids, pads } = propCounts();
  assert.deepEqual(solids, { barrel: 2, crate: 2, plant_pot: 2, sign_post: 2 }, 'Showdown theme 0 solid prop set');
  assert.deepEqual(pads, { healing_pad: 1, speed_pad: 2 }, 'Showdown theme 0 pad set');
  assertSpawnClearance([
    { x: 560, y: 560 }, { x: 3440, y: 560 }, { x: 3440, y: 3440 }, { x: 560, y: 3440 },
    { x: 2000, y: 460 }, { x: 2000, y: 3540 }, { x: 460, y: 2000 }, { x: 3440, y: 2000 },
  ], 'Showdown theme 0');
}
P.buildKnockoutMap();
{
  const { solids, pads } = propCounts();
  assert.deepEqual(solids, { barrel: 2, crate: 2, plant_pot: 2, sign_post: 2 }, 'Knockout solid prop set');
  assert.deepEqual(pads, { healing_pad: 2, speed_pad: 2 }, 'Knockout pad set');
  assertSpawnClearance(teamSpawns(2000, 1740, 260, 1000, 150), 'Knockout');
}
P.buildBraweBallMap();
{
  const { solids, pads } = propCounts();
  assert.deepEqual(solids, { barrel: 2, crate: 2, plant_pot: 2, sign_post: 2 }, 'Brawe Ball solid prop set');
  assert.deepEqual(pads, { healing_pad: 2, speed_pad: 2 }, 'Brawe Ball pad set');
  assertSpawnClearance(teamSpawns(2400, 2080, 320, 900, 170), 'Brawe Ball');
  for (const w of api.destructibleWalls.filter(w => w.isProp)) {
    const d = Math.hypot(w.x + w.w / 2 - 900, w.y + w.h / 2 - 1200);
    assert.ok(d >= 200, `Brawe Ball: solid props must keep the ball spawn clear (${Math.round(d)}px)`);
  }
}

// ---- Nav grid: blocking props register; death frees the cell ----
// The Phase 3 grid marks a cell blocked when terrain touches the cell
// CENTER (radius 18) - the same rule 48px arena-wall tiles already live
// under. So the grid assertions use props centered exactly on cell
// centers, which is the case the grid can see; the reactive steering
// stack (isCircleBlockedByTerrain) collides with the real rect at any
// position, which the movement gates above already pinned.
P.buildNextShowdownMap(0);
P.setWorld(4000, 4000); // Brawe Ball shrank the world; Showdown is 4000x4000
const gridBarrel = api.placeProp('barrel', 1526, 2026);   // center = cell center (1550, 2050)
const gridPlant = api.placeProp('plant_pot', 1630, 2030); // center = cell center (1650, 2050)
assert.ok(gridBarrel && gridPlant, 'grid props must place');
P.buildNav();
assert.equal(P.navCellBlockedAt(1550, 2050), true, 'a barrel on a cell center must block that nav-grid cell');
assert.equal(P.navCellBlockedAt(1650, 2050), false, 'a plant pot must never block a nav-grid cell (not navigation terrain)');
// Kill the barrel the way the bullet path does (splice + dirty hook), then
// run the grid's dirty refresh: the cell must open up for bot pathing.
const idx = api.destructibleWalls.indexOf(gridBarrel);
api.destructibleWalls.splice(idx, 1);
P.markBotNavGridDirty(gridBarrel);
P.refreshBotNavGridDirty(Number.MAX_SAFE_INTEGER);
assert.equal(P.navCellBlockedAt(1550, 2050), false, 'a destroyed barrel must free its nav-grid cell');

console.log('Environment Phase 5 props regression passed: registry + kill switch, blocksMove/blocksShots behavior, pad effects, map placement + spawn clearance, nav-grid register/free.');
process.exit(0);
