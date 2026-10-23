import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// ENVIRONMENT REBUILD — Phase 4 map pass (2026-10-22).
// Certifies every live map builder against the map-pass checklist, headlessly,
// using the SAME passability bots experience in game: the Phase 3 bot nav
// grid (buildBotNavGrid / botNavIsCellPassable rules, isNavigationWall) and
// the real findBotNavPath code path. Maps are built through the real
// generateCubes() dispatcher (including its post-build water validation).
//   (a) spawn points >=120px clear of walls/water/bushes
//   (b) no sealed pockets: every spawn reaches map center on the nav grid;
//       every bush patch is enterable from the center component
//   (c) water never fully bisects a lane (traversal fails with water blocked
//       but succeeds with water ignored == water is the blocker)
//   (d) bush patches never overlap walls/water/cubes
//   (e) the random-scatter fall-through keeps center + spawn rings clear
// Randomized spawn samplers (Mirror, Damage Filler) are sampled repeatedly
// with a seeded RNG; the production samplers also filter candidates by the
// same 120px rule (isSpawnPointClearOfTerrain), so every draw must clear.
const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__mapProbe = (() => { let __tmp;
  return {
    generateCubes, buildNextShowdownMap, buildBotNavGrid, findBotNavPath, isNavigationWall, rectCircleCollides,
    cubes, destructibleWalls, bushZones, waterZones,
    getTugZoneSpawnPoint, getBraweBallSpawnPoint, getKnockoutSpawnPoint, getConstructionSpawnPoint,
    getDamageFillerSpawnPoint, getBrickVaultSpawnPoint, getArenaForgeSpawnPoint, getMarkedMayhemSpawnPoint,
    getMirrorSpawnPoint, getShowdownSpawnPosition, SHOWDOWN_MAP_THEMES,
    ARENA_FORGE_TEAM_SIZE, MARKED_MAYHEM_TEAM_SIZE,
    setVar: (n, v) => { __tmp = v; eval(n + ' = __tmp'); },
    getWorld: () => ({ w: WORLD_W, h: WORLD_H }),
    gridArrays: () => botNavGrid ? { cols: botNavGrid.cols, rows: botNavGrid.rows, blocked: Array.from(botNavGrid.blocked), water: Array.from(botNavGrid.water) } : null,
    cellOf: (x, y) => botNavCellOf(x, y),
  }; })();
` + ANCHOR;
const booted = source.replace(ANCHOR, PROBE);

// Seeded RNG so randomized builders / spawn samplers are deterministic.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(424242);
const seededMath = Object.create(Math);
seededMath.random = () => rng();

const map = new Map();
const storage = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => { map.set(k, String(v)); },
  removeItem: (k) => { map.delete(k); },
  clear: () => map.clear(),
  key: (i) => [...map.keys()][i] ?? null,
  get length() { return map.size; },
};
const dummy = (() => {
  const fn = function () {};
  const d = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'length') return 0;
      if (p === Symbol.iterator) return [][Symbol.iterator].bind([]);
      return d;
    },
    set() { return true; },
    apply() { return d; },
    construct() { return d; },
  });
  return d;
})();
const styleStub = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => { t[p] = v; return true; } });
const elCache = new Map();
const el = (id) => {
  if (id && elCache.has(id)) return elCache.get(id);
  const e = {
    style: styleStub(), dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], firstElementChild: null, value: '', textContent: '', innerHTML: '',
    addEventListener() {}, removeEventListener() {}, appendChild(c) { return c; },
    append() {}, prepend() {}, before() {}, after() {}, replaceWith() {}, replaceChildren() {},
    insertAdjacentHTML() {}, insertAdjacentElement() { return el(); },
    removeChild(c) { return c; }, remove() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => el(), querySelectorAll: () => [], getContext: () => dummy,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
    cloneNode: () => el(), insertBefore(c) { return c; }, closest: () => null, focus() {}, click() {},
    width: 300, height: 150,
  };
  if (id) elCache.set(id, e);
  return e;
};
const sandbox = {
  console, JSON, Math: seededMath, Date, Promise, Set, Map, Array, Object, Number, String, Boolean, RegExp, Error, TypeError, RangeError, SyntaxError, ReferenceError, Intl, URLSearchParams, ArrayBuffer, Uint8Array, Float32Array, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  localStorage: storage,
  document: {
    getElementById: (id) => el(id),
    querySelector: () => el(), querySelectorAll: () => [],
    createElement: () => el(), createElementNS: () => el(),
    addEventListener() {}, removeEventListener() {},
    body: el('body'), head: el('head'), documentElement: el('html'), readyState: 'complete',
    hidden: false, visibilityState: 'visible',
  },
  BrawePassTokens: { normalize() {}, earn() { return true; }, purchase() { return false; }, offers: [] },
  navigator: { userAgent: 'node-test', language: 'en-US' },
  location: { reload() {}, href: 'https://ppp65isking.github.io/brawe/', search: '', hash: '' },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  alert() {}, confirm: () => true, prompt: () => null,
  Image: class { constructor() { this.style = {}; } },
  Audio: class { constructor() { this.style = {}; } play() { return Promise.resolve(); } pause() {} },
  Blob: class {}, FileReader: class {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({}),
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  addEventListener() {}, removeEventListener() {},
  performance: { now: () => 0 },
  fetch: () => Promise.reject(new Error('no net in test')),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
try { vm.runInContext(booted, ctx, { filename: 'game.js' }); } catch { /* stub-limited late wiring */ }
const P = ctx.__mapProbe;
assert.ok(P, 'map probe must be installed');

const ALL_FLAGS = ['isWarperEvent', 'isBossFight', 'isDuels', 'isTraining', 'isSoloTrial', 'isBlinkEyeDodgeMode', 'isImpossibleMode', 'isBraweBallMode', 'isKnockoutMode', 'isMirrorMode', 'isBrickVaultMode', 'isArenaForgeMode', 'isMarkedMayhemMode', 'isTugZoneMode', 'isDamageFillerMode', 'isKnockDonateMode', 'isConstructionMode', 'isPowerGodsMode', 'isSplitterPoweredMode'];
function resetFlags() { for (const f of ALL_FLAGS) P.setVar(f, false); P.setVar('currentMapOverride', null); }

function rectDist(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function checkMap(label, spawns) {
  P.buildBotNavGrid();
  const g = P.gridArrays();
  assert.ok(g, `${label}: nav grid must build`);
  const { w: W, h: H } = P.getWorld();
  const { cols, rows, blocked, water } = g;
  const pass = (i, waterOpen) => !blocked[i] && (waterOpen || !water[i]);
  function components(waterOpen) {
    const comp = new Int32Array(cols * rows).fill(-1);
    let nc = 0;
    for (let s = 0; s < cols * rows; s++) {
      if (comp[s] !== -1 || !pass(s, waterOpen)) continue;
      const q = [s]; comp[s] = nc;
      while (q.length) {
        const cur = q.pop();
        const cx = cur % cols, cy = (cur / cols) | 0;
        const nbs = [cx > 0 ? cur - 1 : -1, cx < cols - 1 ? cur + 1 : -1, cy > 0 ? cur - cols : -1, cy < rows - 1 ? cur + cols : -1];
        for (const nb of nbs) if (nb >= 0 && comp[nb] === -1 && pass(nb, waterOpen)) { comp[nb] = nc; q.push(nb); }
      }
      nc++;
    }
    return comp;
  }
  const comp = components(false);
  const ccx = Math.min(cols - 1, Math.max(0, Math.floor((W / 2) / 100)));
  const ccy = Math.min(rows - 1, Math.max(0, Math.floor((H / 2) / 100)));
  let centerCell = -1, bestD = Infinity;
  for (let i = 0; i < cols * rows; i++) {
    if (!pass(i, false)) continue;
    const cx = i % cols, cy = (i / cols) | 0;
    const d = (cx - ccx) ** 2 + (cy - ccy) ** 2;
    if (d < bestD) { bestD = d; centerCell = i; }
  }
  assert.ok(centerCell >= 0, `${label}: map must have a passable cell near center`);
  const centerComp = comp[centerCell];
  const centerPt = { x: (centerCell % cols) * 100 + 50, y: ((centerCell / cols) | 0) * 100 + 50 };
  function spawnComponent(x, y) {
    const sc = P.cellOf(x, y);
    if (sc >= 0 && pass(sc, false)) return comp[sc];
    const pcx = Math.floor(x / 100), pcy = Math.floor(y / 100);
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const cx = pcx + dx, cy = pcy + dy;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        const i = cy * cols + cx;
        if (pass(i, false)) return comp[i];
      }
    }
    return -999;
  }

  const navWalls = P.destructibleWalls.filter((w) => P.isNavigationWall(w));
  // (a) + (b) per spawn
  for (const s of spawns) {
    let worst = { d: Infinity, what: '' };
    const consider = (arr, name) => { for (const r of arr) { const d = rectDist(s.x, s.y, r); if (d < worst.d) worst = { d, what: name }; } };
    consider(P.cubes, 'cube'); consider(navWalls, 'wall'); consider(P.waterZones, 'water'); consider(P.bushZones, 'bush');
    assert.ok(worst.d >= 120, `${label}: spawn (${s.x | 0},${s.y | 0}) is only ${worst.d.toFixed(0)}px from a ${worst.what} (checklist (a) needs >=120)`);
    assert.equal(spawnComponent(s.x, s.y), centerComp, `${label}: spawn (${s.x | 0},${s.y | 0}) cannot reach map center on the nav grid (checklist (b))`);
    const path = P.findBotNavPath({ x: s.x, y: s.y, radius: 14, brawler: 'outlit' }, centerPt.x, centerPt.y);
    assert.ok(path, `${label}: findBotNavPath spawn (${s.x | 0},${s.y | 0}) -> center must return a path (checklist (b))`);
  }
  // (b) + (d) per bush
  P.bushZones.forEach((b, bi) => {
    for (const [arr, name] of [[P.cubes, 'cube'], [navWalls, 'wall'], [P.waterZones, 'water']]) {
      for (const r of arr) {
        assert.equal(overlapArea(b, r), 0, `${label}: bush#${bi} (${b.x},${b.y},${b.w}x${b.h}) overlaps a ${name} rect (checklist (d))`);
      }
    }
    const samples = [
      { x: b.x + b.w / 2, y: b.y + b.h / 2 },
      { x: b.x + 12, y: b.y + 12 }, { x: b.x + b.w - 12, y: b.y + 12 },
      { x: b.x + 12, y: b.y + b.h - 12 }, { x: b.x + b.w - 12, y: b.y + b.h - 12 },
      { x: b.x + b.w / 2, y: b.y + 12 }, { x: b.x + b.w / 2, y: b.y + b.h - 12 },
      { x: b.x + 12, y: b.y + b.h / 2 }, { x: b.x + b.w - 12, y: b.y + b.h / 2 },
    ];
    const enterable = samples.some((p) => {
      const ci = P.cellOf(p.x, p.y);
      return ci >= 0 && pass(ci, false) && comp[ci] === centerComp;
    });
    assert.ok(enterable, `${label}: bush#${bi} (${b.x},${b.y},${b.w}x${b.h}) is not enterable from the center component (checklist (b))`);
  });
  // (c) water must not fully bisect a lane
  function traversal(waterOpen) {
    const c2 = components(waterOpen);
    const west = new Set(), east = new Set(), north = new Set(), south = new Set();
    for (let y = 0; y < rows; y++) {
      const wi = y * cols, ei = y * cols + (cols - 1);
      if (pass(wi, waterOpen)) west.add(c2[wi]);
      if (pass(ei, waterOpen)) east.add(c2[ei]);
    }
    for (let x = 0; x < cols; x++) {
      const ni = x, si = (rows - 1) * cols + x;
      if (pass(ni, waterOpen)) north.add(c2[ni]);
      if (pass(si, waterOpen)) south.add(c2[si]);
    }
    return { ew: [...west].some((c) => east.has(c)), ns: [...north].some((c) => south.has(c)) };
  }
  const tBlocked = traversal(false);
  const tOpen = traversal(true);
  assert.ok(tBlocked.ew || !tOpen.ew, `${label}: water fully bisects east-west traversal (checklist (c))`);
  assert.ok(tBlocked.ns || !tOpen.ns, `${label}: water fully bisects north-south traversal (checklist (c))`);
}

function showdownSpawns() {
  const { w: W, h: H } = P.getWorld();
  const cand = [
    { x: 560, y: 560 }, { x: W - 560, y: 560 }, { x: W - 560, y: H - 560 }, { x: 560, y: H - 560 },
    { x: W * 0.5, y: 460 }, { x: W * 0.5, y: H - 460 }, { x: 460, y: H * 0.5 }, { x: W - 460, y: H * 0.5 },
  ];
  const actual = P.getShowdownSpawnPosition();
  if (actual) cand.push({ x: actual.x, y: actual.y });
  return cand;
}
const bothTeams = (fn, n, teamSize) => {
  const out = [];
  for (const team of ['player', 'enemy']) for (let i = 0; i < n; i++) { const p = teamSize ? fn(team, i, teamSize) : fn(team, i); out.push({ x: p.x, y: p.y }); }
  return out;
};

let checked = 0;
function run(label, setup, spawnFn) {
  resetFlags();
  rng = mulberry32(424242);
  setup();
  P.generateCubes();
  const spawns = spawnFn();
  checkMap(label, spawns);
  checked++;
}

for (let i = 0; i < 10; i++) {
  const idx = i;
  run(`Showdown ${idx} (${P.SHOWDOWN_MAP_THEMES[idx].name})`, () => { P.setVar('currentMapOverride', idx); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); }, showdownSpawns);
}
// Gearfall Foundry: the Phase 4 pinwheel canals must survive the carve.
resetFlags();
rng = mulberry32(424242);
P.setVar('currentMapOverride', 7); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000);
P.generateCubes();
assert.equal(P.waterZones.length, 4, 'Gearfall Foundry must keep its 4 pinwheel canals after generateCubes (Phase 4 fix)');

run('Tug Zone', () => { P.setVar('isTugZoneMode', true); P.setVar('WORLD_W', 2400); P.setVar('WORLD_H', 1600); }, () => bothTeams(P.getTugZoneSpawnPoint, 3));
run('Damage Filler', () => { P.setVar('isDamageFillerMode', true); P.setVar('WORLD_W', 2200); P.setVar('WORLD_H', 1600); }, () => { const s = []; for (let k = 0; k < 3; k++) s.push(...bothTeams(P.getDamageFillerSpawnPoint, 2, 2)); return s; });
run('Damage Filler (Splitter)', () => { P.setVar('isDamageFillerMode', true); P.setVar('isSplitterPoweredMode', true); P.setVar('WORLD_W', 3600); P.setVar('WORLD_H', 2600); }, () => { const s = []; for (let k = 0; k < 3; k++) s.push(...bothTeams(P.getDamageFillerSpawnPoint, 2, 2)); return s; });
run('Brick Vault', () => { P.setVar('isBrickVaultMode', true); P.setVar('WORLD_W', 1800); P.setVar('WORLD_H', 2600); }, () => bothTeams(P.getBrickVaultSpawnPoint, 3, 3));
run('Mirror', () => { P.setVar('isMirrorMode', true); P.setVar('WORLD_W', 2400); P.setVar('WORLD_H', 1800); }, () => { const s = []; for (let k = 0; k < 3; k++) s.push(...bothTeams(P.getMirrorSpawnPoint, 4, 4)); return s; });
for (let ci = 0; ci < 2; ci++) {
  run(`Construction ${ci}`, () => { P.setVar('isConstructionMode', true); P.setVar('constructionMapIndex', ci); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); }, () => bothTeams(P.getConstructionSpawnPoint, 3, 3));
}
run('Impossible', () => { P.setVar('isImpossibleMode', true); P.setVar('WORLD_W', 1800); P.setVar('WORLD_H', 1300); }, () => [{ x: 900, y: 1130 }, { x: 900, y: 170 }]);
run('Arena Forge', () => { P.setVar('isArenaForgeMode', true); P.setVar('WORLD_W', 2400); P.setVar('WORLD_H', 3000); }, () => bothTeams(P.getArenaForgeSpawnPoint, P.ARENA_FORGE_TEAM_SIZE, P.ARENA_FORGE_TEAM_SIZE));
run('Marked Mayhem', () => { P.setVar('isMarkedMayhemMode', true); P.setVar('WORLD_W', 2200); P.setVar('WORLD_H', 1500); }, () => bothTeams(P.getMarkedMayhemSpawnPoint, P.MARKED_MAYHEM_TEAM_SIZE, P.MARKED_MAYHEM_TEAM_SIZE));
run('BlinkEye Dodge', () => { P.setVar('isBlinkEyeDodgeMode', true); P.setVar('WORLD_W', 2000); P.setVar('WORLD_H', 2000); }, () => [{ x: 1000, y: 1000 }]);
run('Brawe Ball', () => { P.setVar('isBraweBallMode', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); }, () => bothTeams(P.getBraweBallSpawnPoint, 3, 3));
run('Knockout', () => { P.setVar('isKnockoutMode', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); }, () => bothTeams(P.getKnockoutSpawnPoint, 3, 3));

// (e) scatter fall-through: protected points must stay clear of every strip,
// using the same radii the production scatter protects.
function checkScatter(label, setup, protectedPoints) {
  resetFlags();
  rng = mulberry32(424242);
  setup();
  P.generateCubes();
  for (const w of P.destructibleWalls) {
    for (const p of protectedPoints) {
      assert.ok(!P.rectCircleCollides(w.x, w.y, w.w, w.h, p.x, p.y, p.r),
        `${label}: scatter strip at (${w.x | 0},${w.y | 0}) crowds protected point (${p.x},${p.y}) r=${p.r} (checklist (e))`);
    }
  }
  checked++;
}
const CENTER = { x: 2000, y: 2000, r: 300 };
checkScatter('Scatter (boss)', () => { P.setVar('isBossFight', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); },
  [CENTER, { x: 1200, y: 800, r: 250 }, { x: 1200, y: 2000, r: 250 }]);
checkScatter('Scatter (duels)', () => { P.setVar('isDuels', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); },
  [CENTER, { x: 200, y: 750, r: 150 }, { x: 1400, y: 750, r: 150 }]);
checkScatter('Scatter (training)', () => { P.setVar('isTraining', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); },
  [CENTER,
   { x: 560, y: 560, r: 150 }, { x: 3440, y: 560, r: 150 }, { x: 3440, y: 3440, r: 150 }, { x: 560, y: 3440, r: 150 },
   { x: 2000, y: 460, r: 150 }, { x: 2000, y: 3540, r: 150 }, { x: 460, y: 2000, r: 150 }, { x: 3540, y: 2000, r: 150 }]);
// Training also plays on the scatter: its spawns must path to center.
run('Scatter (training) reachability', () => { P.setVar('isTraining', true); P.setVar('WORLD_W', 4000); P.setVar('WORLD_H', 4000); }, showdownSpawns);

console.log(`map sanity regression: all checks passed (${checked} map configurations)`);
