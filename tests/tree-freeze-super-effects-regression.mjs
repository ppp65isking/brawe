// Tree Freeze Super effects regression.
// Follow-up to PR #125 (2026-11-18): Anthony reported "Super doesn't have
// effects" — with the Tree Freeze skin equipped, FreeZeon's Super "Ice
// Rink" rendered in the default blue ice look. Root cause: the skin
// registry declares superEffect { type: 'treeStar' } but NOTHING in
// game.js consumed it — the patch, thrown-rink and impact-explosion
// renders never checked the active skin.
//   Base Super DOES have effects (and keeps them): blue gradient patch +
//   dashed ring, spinning ice can + dashed landing marker, generic
//   'freezeonSuperSpawn' blast, '❄️ ICE RINK!' / '❄️ DEEP FREEZE!' text.
//   This fix gives the SKINNED Super its own Christmas effects:
//   - patch: snow center -> pine-green edge (gold when Hyper), gold ring,
//     12 twinkling tree lights on the rim, gold star at the center.
//   - thrown rink: spinning gold star + gold landing marker + star.
//   - impact: gold star-burst + 8 ornament sparks + gold ring.
//   - floating text: '🎄 TREE RINK!' / '🎄 DEEP FREEZE!'.
// Numbers UNCHANGED: 260px, 6s, 800 impact, 30/s base DoT, 150/s Hyper.
// RENDER ONLY — no HP, damage, speed or hitbox change (PR #42).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- brace-matching extractor (same approach as bookworm-regression) ----
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  return extractBalanced(src, start);
}
function extractBalanced(src, start) {
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no opening brace');
  let depth = 0, inS = null, esc = false, lineComment = false, blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i], nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces');
}
function extractIf(src, marker, nth = 0) {
  let idx = -1;
  for (let n = 0; n <= nth; n++) { idx = src.indexOf(marker, idx + 1); if (idx < 0) throw new Error('marker not found: ' + marker); }
  return extractBalanced(src, idx);
}
function richCtx() {
  const calls = [];
  const sets = [];
  const gradients = [];
  function grad() {
    const g = { stops: [] };
    g.addColorStop = (o, c) => g.stops.push([o, c]);
    gradients.push(g);
    return g;
  }
  return {
    calls, sets, gradients,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        if (prop === 'createRadialGradient') return (...a) => { calls.push({ m: 'createRadialGradient', args: a }); return grad(); };
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const setValues = (rec, prop) => rec.sets.filter((s) => s.p === prop).map((s) => s.v);
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ================= 1. source pins: stamping + propagation =============
assert.match(game, /const treeFreeze = entity\.id === player\.id && getActiveSkinForBrawler\('freezeon'\)\?\.id === 'tree-freeze-freezeon';/, 'Super stamps the skin only for the PLAYER cast (bots own no skins)');
assert.match(game, /freezeonThrownRinks\.push\(\{ startX: entity\.x, startY: entity\.y, targetX: x, targetY: y, createdAt: now, impactAt: now \+ flightMs, ownerId: entity\.id, hyper: !!hyper, treeFreeze \}\);/, 'thrown rink carries the treeFreeze flag');
assert.match(game, /freezeonPatches\.push\(\{ x, y, radius: FREEZEON_SUPER_RADIUS, until: now \+ FREEZEON_SUPER_DURATION_MS, nextTickAt: now, ownerId: thrown\.ownerId, hyper, treeFreeze: !!thrown\.treeFreeze \}\);/, 'landing propagates treeFreeze to the patch');
assert.match(game, /fxKind: 'freezeonSuperSpawn', treeFreeze: !!thrown\.treeFreeze \}\);/, 'landing propagates treeFreeze to the impact explosion');
assert.match(game, /thrown\.treeFreeze \? \(hyper \? '🎄 DEEP FREEZE!' : '🎄 TREE RINK!'\) : \(hyper \? '❄️ DEEP FREEZE!' : '❄️ ICE RINK!'\)/, 'floating text is Christmas when skinned, default otherwise');
assert.match(game, /'❄️ ICE RINK!'/, 'default ICE RINK text still exists');

// ================= 2. source pins: patch render =======================
const renderSrc = extractFn(game, 'renderFreezeonEffects');
assert.match(renderSrc, /if \(p\.treeFreeze\) \{/, 'patch render branches on treeFreeze');
assert.match(renderSrc, /for \(let i = 0; i < 12; i\+\+\) \{/, 'patch rim has 12 twinkling lights');
assert.match(renderSrc, /const treeLightColors = \['#dc2626', '#fbbf24', '#2563eb', '#fde68a'\];/, 'lights cycle red/gold/blue/pale-gold');
assert.match(renderSrc, /rgba\(22,163,74,0\.14\)/, 'patch edge is pine green, not ice blue');
assert.match(renderSrc, /rgba\(240,253,244,0\.55\)/, 'patch center is snow white-green');
assert.match(renderSrc, /const starR = p\.hyper \? 20 : 16;/, 'gold center star, bigger + brighter when Hyper');
assert.match(renderSrc, /strokeStyle = p\.hyper \? '#fde047' : '#fbbf24';/, 'patch ring + star are gold');
// Default patch is untouched (blue ice look).
assert.match(renderSrc, /grad\.addColorStop\(0, p\.hyper \? 'rgba\(192,132,252,0\.5\)' : 'rgba\(186,230,253,0\.5\)'\)/, 'default patch gradient still ice blue / purple');
assert.match(renderSrc, /strokeStyle = p\.hyper \? '#c084fc' : '#38bdf8';/, 'default patch ring still blue / purple');

// ================= 3. source pins: thrown rink render =================
assert.match(renderSrc, /strokeStyle = r\.treeFreeze \? \(r\.hyper \? '#fde047' : '#fbbf24'\) : \(r\.hyper \? '#c084fc' : '#38bdf8'\);/, 'landing marker is gold when skinned, blue otherwise');
assert.match(renderSrc, /\/\/ Tree Freeze: the flying can is a spinning gold star\./, 'flying can becomes a spinning gold star');
assert.match(renderSrc, /\/\/ Small gold star at the landing point\./, 'landing point gets a small gold star');

// ================= 4. source pins: impact explosion branch ============
assert.match(game, /if \(ex\.fxKind === 'freezeonSuperSpawn' && ex\.treeFreeze\) \{/, 'explosion renderer has a Tree Freeze Super branch');
const burstSrc = extractIf(game, "if (ex.fxKind === 'freezeonSuperSpawn' && ex.treeFreeze)");
assert.match(burstSrc, /const treeBurstColors = \['#dc2626', '#fbbf24', '#2563eb', '#16a34a'\];/, 'burst sparks are ornament colors');
assert.match(burstSrc, /for \(let s = 0; s < 8; s\+\+\) \{/, 'burst has 8 ornament sparks');
assert.match(burstSrc, /ctx\.fillStyle = '#fde047';/, 'burst star core is bright gold');
assert.match(burstSrc, /ctx\.strokeStyle = '#fbbf24'; ctx\.lineWidth = 4;/, 'burst ring is gold');
assert.match(burstSrc, /const starR = 22 \+ 26 \* progress;/, 'burst star scales up as it expands');

// ================= 5. numbers unchanged ================================
assert.match(game, /const FREEZEON_SUPER_RADIUS = 260;/, 'Super radius still 260px');
assert.match(game, /const FREEZEON_SUPER_DURATION_MS = 6000;/, 'patch still lasts 6s');
assert.match(game, /const FREEZEON_SUPER_THROW_RANGE = 560;/, 'throw range still 560px');
assert.match(game, /const FREEZEON_SUPER_IMPACT_DMG = 800;/, 'impact damage still 800');
assert.match(game, /const FREEZEON_SUPER_DOT_PER_S = 30;/, 'base DoT still 30/s');
assert.match(game, /const FREEZEON_HYPER_DOT_PER_S = 150;/, 'Hyper DoT still 150/s');
assert.match(game, /const FREEZEON_SUPER_THROW_SPEED = 1100;/, 'throw speed still 1100 px/s');
assert.doesNotMatch(game, /\bcluster\b/i, 'no banned word anywhere in game.js');

// ================= 6. vm: cast + land (real state) =====================
let nowMs = 100000;
const entitiesById = new Map();
let skinEquipped = false;
let hits = [];
let floats = [];
function mkEntity(id, opts = {}) {
  const e = {
    id, x: opts.x ?? 0, y: opts.y ?? 0, hp: opts.hp ?? 5000, maxHp: opts.maxHp ?? 5000,
    radius: opts.radius ?? 14, team: opts.team ?? 'player', brawler: opts.brawler ?? 'freezeon',
    level: opts.level ?? 11, isHypercharged: !!opts.isHypercharged,
  };
  entitiesById.set(id, e);
  return e;
}
const superBox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  window: {},
  getActiveSkinForBrawler: () => (skinEquipped ? { id: 'tree-freeze-freezeon' } : null),
  areAlliedEntities: () => false,
  checkHit: (t, hit) => { hits.push({ target: t.id, damage: hit.damage, super: !!hit.super }); },
  spawnFloatingText: (x, y, text, color) => { floats.push({ text, color }); },
  player: null,
  bots: [],
  freezeonThrownRinks: [],
  freezeonPatches: [],
  explosions: [],
  WORLD_W: 2000,
  WORLD_H: 2000,
};
for (const m of game.matchAll(/const (FREEZEON_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  superBox[m[1]] = Number(m[2]);
}
vm.createContext(superBox);
vm.runInContext(
  ['freezeonFindOwner', 'castFreezeonSuper', 'freezeonLandRink'].map((fn) => extractFn(game, fn)).join('\n'),
  superBox,
);
function resetSuper() {
  entitiesById.clear();
  hits = [];
  floats = [];
  nowMs = 100000;
  skinEquipped = false;
  const p = mkEntity('p1', { team: 'player', brawler: 'freezeon', x: 0, y: 0 });
  const enemy = mkEntity('b1', { team: 'enemy', brawler: 'lou', x: 300, y: 0 });
  const farEnemy = mkEntity('b2', { team: 'enemy', brawler: 'lou', x: 900, y: 0 });
  superBox.player = p;
  superBox.bots = [enemy, farEnemy];
  superBox.freezeonThrownRinks = [];
  superBox.freezeonPatches = [];
  superBox.explosions = [];
  return { p, enemy, farEnemy };
}

// Player casts with the skin equipped: everything is stamped treeFreeze.
let s = resetSuper();
skinEquipped = true;
assert.equal(superBox.castFreezeonSuper(s.p, false, 300, 0), true, 'player cast succeeds');
assert.equal(superBox.freezeonThrownRinks.length, 1, 'one rink in flight');
assert.equal(superBox.freezeonThrownRinks[0].treeFreeze, true, 'thrown rink is stamped treeFreeze');
superBox.freezeonLandRink(superBox.freezeonThrownRinks[0]);
assert.equal(superBox.freezeonPatches.length, 1, 'patch forms on landing');
assert.equal(superBox.freezeonPatches[0].treeFreeze, true, 'patch carries treeFreeze');
assert.equal(superBox.freezeonPatches[0].radius, 260, 'patch radius is 260');
assert.equal(superBox.freezeonPatches[0].until, nowMs + 6000, 'patch lasts 6s');
assert.equal(superBox.explosions.length, 1, 'impact explosion spawns');
assert.equal(superBox.explosions[0].fxKind, 'freezeonSuperSpawn', 'impact is the Super spawn kind');
assert.equal(superBox.explosions[0].treeFreeze, true, 'impact explosion carries treeFreeze');
assert.equal(floats[0].text, '🎄 TREE RINK!', 'floating text is TREE RINK with the skin');
assert.deepEqual(hits.map((h) => [h.target, h.damage]), [['b1', 800]], 'impact hits only the enemy in radius for 800');

// Player casts WITHOUT the skin: nothing is stamped, default look.
s = resetSuper();
assert.equal(superBox.castFreezeonSuper(s.p, false, 300, 0), true, 'default cast succeeds');
assert.equal(superBox.freezeonThrownRinks[0].treeFreeze, false, 'no stamp without the skin');
superBox.freezeonLandRink(superBox.freezeonThrownRinks[0]);
assert.equal(superBox.freezeonPatches[0].treeFreeze, false, 'default patch has no treeFreeze');
assert.equal(superBox.explosions[0].treeFreeze, false, 'default explosion has no treeFreeze');
assert.equal(floats[0].text, '❄️ ICE RINK!', 'default floating text is ICE RINK');

// Bot casts while the PLAYER has the skin: bots own no skins.
s = resetSuper();
skinEquipped = true;
assert.equal(superBox.castFreezeonSuper(s.enemy, false, 0, 0), true, 'bot cast succeeds');
assert.equal(superBox.freezeonThrownRinks[0].treeFreeze, false, 'bot rink is NOT stamped even when the player owns the skin');
superBox.freezeonLandRink(superBox.freezeonThrownRinks[0]);
assert.equal(superBox.freezeonPatches[0].treeFreeze, false, 'bot patch is default blue');
assert.equal(floats[0].text, '❄️ ICE RINK!', 'bot landing text is default');

// Hyper cast with the skin: gold text variant, purple explosion color.
s = resetSuper();
skinEquipped = true;
assert.equal(superBox.castFreezeonSuper(s.p, true, 300, 0), true, 'hyper cast succeeds');
assert.equal(superBox.freezeonThrownRinks[0].hyper, true, 'hyper flag survives the cast');
superBox.freezeonLandRink(superBox.freezeonThrownRinks[0]);
assert.equal(floats[0].text, '🎄 DEEP FREEZE!', 'hyper skinned text is DEEP FREEZE with the tree');
assert.equal(superBox.explosions[0].color, 'rgba(192,132,252,.55)', 'hyper explosion color stays purple');
assert.equal(superBox.freezeonPatches[0].hyper, true, 'hyper patch keeps its hyper flag');

// ================= 7. vm: patch render — Christmas vs default =========
const renderBox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => 100000 },
  ctx: null,
  freezeonSlipZones: [],
  freezeonPatches: [],
  freezeonThrownRinks: [],
  player: null,
  bots: [],
  isFreezeon: (e) => e && e.brawler === 'freezeon',
  isHypercharged: false,
};
for (const m of game.matchAll(/const (FREEZEON_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  renderBox[m[1]] = Number(m[2]);
}
vm.createContext(renderBox);
vm.runInContext(extractFn(game, 'renderFreezeonEffects'), renderBox);
function renderWith(patches, rinks = []) {
  const rec = richCtx();
  renderBox.ctx = rec.proxy;
  renderBox.freezeonSlipZones = [];
  renderBox.freezeonPatches = patches;
  renderBox.freezeonThrownRinks = rinks;
  renderBox.player = { id: 'p1', x: 0, y: 0, hp: 5000, radius: 14, brawler: 'freezeon', freezeonFreeze: 0 };
  renderBox.bots = [];
  renderBox.isHypercharged = false;
  vm.runInContext('renderFreezeonEffects();', renderBox);
  return rec;
}
function gradientStops(rec) {
  return rec.gradients.flatMap((g) => g.stops.map((s) => s[1]));
}
function hasFill(rec, color) { return setValues(rec, 'fillStyle').includes(color); }
function hasStroke(rec, color) { return setValues(rec, 'strokeStyle').includes(color); }

// Tree Freeze patch: snow/green gradient, gold ring + star, no blue.
let rec = renderWith([{ x: 500, y: 500, radius: 260, until: 200000, nextTickAt: 0, ownerId: 'p1', hyper: false, treeFreeze: true }]);
{
  const stops = gradientStops(rec);
  assert.ok(stops.includes('rgba(240,253,244,0.55)'), 'skinned patch center is snow white-green');
  assert.ok(stops.includes('rgba(22,163,74,0.14)'), 'skinned patch edge is pine green');
  assert.ok(!stops.some((c) => c.includes('186,230,253')), 'skinned patch has NO ice-blue gradient');
  assert.ok(hasStroke(rec, '#fbbf24'), 'skinned patch ring is gold');
  assert.ok(hasFill(rec, '#fbbf24'), 'skinned patch star is gold');
  assert.ok(!hasStroke(rec, '#38bdf8'), 'skinned patch has NO blue ring');
  const arcs = rec.calls.filter((c) => c.m === 'arc');
  assert.ok(arcs.some((a) => near(a.args[2], 260)), 'skinned patch draws at radius 260');
  assert.ok(arcs.length >= 12, 'skinned patch draws the 12 rim lights + ring + star');
}
// Hyper Tree Freeze patch: gold gradient + brighter star.
rec = renderWith([{ x: 500, y: 500, radius: 260, until: 200000, nextTickAt: 0, ownerId: 'p1', hyper: true, treeFreeze: true }]);
{
  const stops = gradientStops(rec);
  assert.ok(stops.includes('rgba(254,243,199,0.6)'), 'hyper skinned patch center is gold');
  assert.ok(stops.includes('rgba(251,191,36,0.18)'), 'hyper skinned patch edge is gold');
  assert.ok(hasFill(rec, '#fde047'), 'hyper skinned patch star is bright gold');
  assert.ok(hasStroke(rec, '#fde047'), 'hyper skinned patch ring is bright gold');
}
// Default patch: blue ice, no gold anywhere.
rec = renderWith([{ x: 500, y: 500, radius: 260, until: 200000, nextTickAt: 0, ownerId: 'p1', hyper: false }]);
{
  const stops = gradientStops(rec);
  assert.ok(stops.includes('rgba(186,230,253,0.5)'), 'default patch center is ice blue');
  assert.ok(hasStroke(rec, '#38bdf8'), 'default patch ring is blue');
  assert.ok(!hasStroke(rec, '#fbbf24') && !hasFill(rec, '#fbbf24') && !hasFill(rec, '#fde047'), 'default patch has NO gold anywhere');
}

// ================= 8. vm: thrown rink render ==========================
rec = renderWith([], [{ startX: 0, startY: 0, targetX: 300, targetY: 0, createdAt: 99900, impactAt: 100300, ownerId: 'p1', hyper: false, treeFreeze: true }]);
assert.ok(hasStroke(rec, '#fbbf24'), 'skinned landing marker is gold');
assert.ok(hasFill(rec, '#fbbf24'), 'skinned flying star is gold');
assert.ok(!hasStroke(rec, '#38bdf8') && !hasFill(rec, '#7dd3fc'), 'skinned flight has NO blue can');
rec = renderWith([], [{ startX: 0, startY: 0, targetX: 300, targetY: 0, createdAt: 99900, impactAt: 100300, ownerId: 'p1', hyper: false }]);
assert.ok(hasStroke(rec, '#38bdf8'), 'default landing marker is blue');
assert.ok(hasFill(rec, '#7dd3fc'), 'default flying can is ice blue');

// ================= 9. vm: impact explosion branch =====================
const burstBox = { Math, clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)), ctx: null, ex: null };
vm.createContext(burstBox);
function runBurst(ex) {
  const rec = richCtx();
  burstBox.ctx = rec.proxy;
  burstBox.ex = ex;
  // The branch ends with `continue` (it lives inside the game's explosion
  // loop), so run it inside a dummy one-iteration loop to keep it legal.
  vm.runInContext('for (let _once = 0; _once < 1; _once++) ' + extractIf(game, "if (ex.fxKind === 'freezeonSuperSpawn' && ex.treeFreeze)"), burstBox);
  return rec;
}
rec = runBurst({ fxKind: 'freezeonSuperSpawn', treeFreeze: true, life: 0.1, maxLife: 0.4, radius: 260, x: 300, y: 0 });
assert.ok(hasFill(rec, '#fde047'), 'burst draws the bright gold star core');
assert.ok(hasStroke(rec, '#fbbf24'), 'burst draws the gold ring');
assert.ok(hasFill(rec, '#dc2626') && hasFill(rec, '#2563eb') && hasFill(rec, '#16a34a'), 'burst sparks are red/blue/green ornaments');
assert.ok(rec.calls.some((c) => c.m === 'arc'), 'burst draws arcs');
rec = runBurst({ fxKind: 'freezeonSuperSpawn', treeFreeze: false, life: 0.1, maxLife: 0.4, radius: 260, x: 300, y: 0 });
assert.equal(rec.calls.length, 0, 'default explosion does NOT run the Tree Freeze burst');
assert.equal(rec.sets.length, 0, 'default explosion sets nothing in the Tree Freeze branch');

console.log('tree-freeze-super-effects: all checks passed');
