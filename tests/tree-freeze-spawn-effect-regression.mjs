// Tree Freeze spawn effect (treeArrival) regression.
// Follow-up to PRs #125/#126/#127 (2026-11-18): the skin declared
// spawnEffect { type: 'treeArrival' } but NOTHING consumed the type —
// Tree Freeze only ever got the GENERIC spawn pulse (green ring,
// 0.25s, gold sparks), with no bespoke arrival.
//   Root cause: triggerSkinPulse(entity, skin, 'spawn') reads
//   skin['spawnEffect'] dynamically, and BOTH spawn call sites already
//   call it with the spawning entity's skin (match/round start in
//   startDuelsRound, respawn in restoreRespawningEntity, via
//   getActiveSkinForBrawler) — but there was no bespoke branch for the
//   skin, so the generic pulse was all it ever got.
//   Fix (Aura Farmer / takedown precedent, PR #127): (1) bespoke spawn
//   branch in triggerSkinPulse for Tree Freeze pushes one explosion
//   fxKind 'treeFreezeArrival' (radius 42, 0.55s — the bespoke-skin
//   spawn life); (2) new 'treeFreezeArrival' explosion render branch:
//   expanding pine-green + gold rings, a gold 5-point star topper
//   scaling up, 12 twinkling bauble lights around the rim, soft
//   pine-green glow center.
// Coverage: both existing spawn call sites flow through
// triggerSkinPulse, so the arrival shows on match/round start AND on
// respawn. No new call sites. Pre-existing quirk (same class as the
// ornament-cone quirk, left alone): getActiveSkinForBrawler reads the
// PLAYER's equipped skins, so a bot FreeZeon respawning while the
// player has Tree Freeze equipped also shows the arrival — the generic
// spawn pulse already behaved that way for every skin.
// RENDER ONLY — no HP, damage, speed or hitbox change.
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
  function grad() {
    const g = { stops: [] };
    g.addColorStop = (o, c) => g.stops.push([o, c]);
    return g;
  }
  return {
    calls, sets,
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
const arcCalls = (rec) => rec.calls.filter((c) => c.m === 'arc');

// Fake skins mirroring the registry entries.
const treeFreezeSkin = {
  id: 'tree-freeze-freezeon', rarity: 'hypercharge', set: 'Christmas 2026',
  spawnEffect: { type: 'treeArrival', color: '#16a34a', glow: true },
  takedownEffect: { type: 'snowballLanding', color: '#fbbf24', glow: true },
  deathEffect: { type: 'treeFall', color: '#16a34a', glow: true },
};
const plainSkin = {
  id: 'plain-test-skin', rarity: 'super-rare', set: 'Test',
  spawnEffect: { type: 'plainArrival', color: '#ff0000', glow: false },
};

// ================= 1. source pins: the two spawn call sites ============
assert.match(game, /const spawnSkin = getActiveSkinForBrawler\(selectedBrawler\);\n    triggerSkinPulse\(player, spawnSkin, 'spawn'\);/, 'match/round start calls triggerSkinPulse(player, spawnSkin, \'spawn\')');
assert.match(game, /const respawnSkin = getActiveSkinForBrawler\(entity\.brawler \|\| \(entity\.id === player\.id \? selectedBrawler : null\)\);\n        if \(respawnSkin\) triggerSkinPulse\(entity, respawnSkin, 'spawn'\);/, 'respawn calls triggerSkinPulse(entity, respawnSkin, \'spawn\')');
assert.doesNotMatch(game, /\bcluster\b/i, 'no banned word anywhere in game.js');

// ================= 2. source pins: registry + branches ==================
const skinStart = game.indexOf("'tree-freeze-freezeon'");
assert.ok(skinStart > 0, 'Tree Freeze registry entry exists');
assert.match(game.slice(skinStart, skinStart + 3000), /spawnEffect: \{ type: 'treeArrival', color: '#16a34a', glow: true \}/, 'registry spawn type is treeArrival');
const pulseSrc = extractFn(game, 'triggerSkinPulse');
assert.match(pulseSrc, /if \(kind === 'spawn' && skin\.id === 'tree-freeze-freezeon'\) \{/, 'triggerSkinPulse has a bespoke Tree Freeze spawn branch');
assert.match(pulseSrc, /fxKind: 'treeFreezeArrival', legendary: true, skinId: skin\.id \}\);/, 'bespoke branch pushes a treeFreezeArrival explosion');
assert.match(pulseSrc, /radius: 42, life: 0, maxLife: 0\.55, fxKind: 'treeFreezeArrival'/, 'arrival uses the bespoke-skin spawn size/life (radius 42, 0.55s)');
assert.match(game, /if \(ex\.fxKind === 'treeFreezeArrival'\) \{/, 'explosion renderer has a treeFreezeArrival branch');
const arrivalSrc = extractIf(game, "if (ex.fxKind === 'treeFreezeArrival')");
assert.match(arrivalSrc, /ctx\.strokeStyle = '#16a34a'; ctx\.lineWidth = 4;/, 'arrival draws an expanding pine-green outer ring');
assert.match(arrivalSrc, /ctx\.strokeStyle = '#fbbf24'; ctx\.lineWidth = 2\.5;/, 'arrival draws a gold inner ring');
assert.match(arrivalSrc, /for \(let s = 0; s < 12; s\+\+\) \{/, 'arrival has 12 twinkling bauble lights');
assert.match(arrivalSrc, /const starR = 8 \+ 14 \* progress;/, 'gold star topper scales up as the tree arrives');
assert.match(arrivalSrc, /for \(let p = 0; p < 10; p\+\+\) \{/, 'star topper uses the 10-vertex star path');
// Visual-only: the new code writes no damage, HP, knockback or status.
for (const [name, src] of [['bespoke branch', pulseSrc.slice(pulseSrc.indexOf("kind === 'spawn'"), pulseSrc.indexOf("kind === 'spawn'") + 700)], ['render branch', arrivalSrc]]) {
  assert.doesNotMatch(src, /applyKnockback|applyStatusEffect|freezeonApply|checkHit|damage:|\.hp\s*[-+]=|hp =/, name + ' writes no damage/HP/knockback/status');
}

// ================= 3. vm: triggerSkinPulse ==============================
function pulseBox() {
  const box = {
    explosions: [],
    getSkinRarityMeta: () => ({ border: '#ffffff' }),
    console,
  };
  vm.createContext(box);
  vm.runInContext(extractFn(game, 'triggerSkinPulse'), box);
  return box;
}

// (a) Tree Freeze spawn -> exactly one arrival, no generic pulse.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, ${JSON.stringify(treeFreezeSkin)}, 'spawn');`, box);
  assert.equal(box.explosions.length, 1, 'one arrival explosion');
  const fx = box.explosions[0];
  assert.equal(fx.fxKind, 'treeFreezeArrival', 'fxKind is treeFreezeArrival');
  assert.equal(fx.x, 100, 'arrival is at the spawning brawler x');
  assert.equal(fx.y, 200, 'arrival is at the spawning brawler y');
  assert.equal(fx.radius, 42, 'arrival radius is 42');
  assert.equal(fx.maxLife, 0.55, 'arrival lasts 0.55s');
  assert.equal(fx.legendary, true, 'arrival is a legendary fx');
  assert.equal(fx.skinId, 'tree-freeze-freezeon', 'arrival is stamped with the skin id');
}

// (b) No skin (default) -> nothing at all.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, null, 'spawn');`, box);
  assert.equal(box.explosions.length, 0, 'default skin plays no spawn effect');
}

// (c) Plain non-hypercharge skin spawn -> generic pulse unchanged.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 10, y: 20 }, ${JSON.stringify(plainSkin)}, 'spawn');`, box);
  assert.equal(box.explosions.filter((e) => e.fxKind === 'spawn').length, 1, 'generic spawn path still works for other skins');
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeArrival').length, 0, 'other skins never get the tree arrival');
}

// (d) Tree Freeze takedown -> still the snowball, never the arrival.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, ${JSON.stringify(treeFreezeSkin)}, 'takedown');`, box);
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeSnowball').length, 1, 'takedown still plays the snowball');
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeArrival').length, 0, 'arrival is spawn-only');
}

// (e) Tree Freeze death -> generic death pulse, never the arrival.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, ${JSON.stringify(treeFreezeSkin)}, 'death');`, box);
  assert.equal(box.explosions.filter((e) => e.fxKind === 'death').length, 1, 'death still plays its generic pulse');
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeArrival').length, 0, 'arrival is spawn-only');
}

// ================= 4. vm: arrival render branch =========================
function renderArrival(ex) {
  const rec = richCtx();
  const box = {
    ex, ctx: rec.proxy,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    console,
  };
  vm.createContext(box);
  // The branch ends with `continue`, so run it inside a once-loop.
  vm.runInContext('for (let _once = 0; _once < 1; _once++) ' + arrivalSrc, box);
  return rec;
}

// Early phase: rings + glow + 12 bauble dots + star path.
{
  const rec = renderArrival({ x: 100, y: 200, radius: 42, life: 0.1, maxLife: 0.55, fxKind: 'treeFreezeArrival' });
  const arcs = arcCalls(rec);
  assert.ok(arcs.length >= 15, 'early phase draws 2 rings + glow + 12 bauble dots (got ' + arcs.length + ' arcs)');
  assert.ok(setValues(rec, 'strokeStyle').includes('#16a34a'), 'outer ring is pine green');
  assert.ok(setValues(rec, 'strokeStyle').includes('#fbbf24'), 'inner ring is gold');
  assert.ok(setValues(rec, 'fillStyle').includes('#fde047'), 'star topper is gold');
  assert.ok(rec.calls.some((c) => c.m === 'moveTo'), 'star topper path is drawn');
  const baubleFills = setValues(rec, 'fillStyle').filter((v) => ['#dc2626', '#fbbf24', '#2563eb', '#16a34a'].includes(v));
  assert.ok(baubleFills.length >= 4, 'bauble lights use the red/gold/blue/green palette');
}

// Late phase: rings have grown (outer ring radius larger than early).
{
  const early = renderArrival({ x: 100, y: 200, radius: 42, life: 0.05, maxLife: 0.55, fxKind: 'treeFreezeArrival' });
  const late = renderArrival({ x: 100, y: 200, radius: 42, life: 0.5, maxLife: 0.55, fxKind: 'treeFreezeArrival' });
  const earlyRing = arcCalls(early)[0].args[2];
  const lateRing = arcCalls(late)[0].args[2];
  assert.ok(lateRing > earlyRing, 'rings expand over the arrival (early ' + earlyRing.toFixed(1) + ' -> late ' + lateRing.toFixed(1) + ')');
}

// End phase: fully faded (alpha 0) but still runs without throwing.
{
  const rec = renderArrival({ x: 100, y: 200, radius: 42, life: 0.55, maxLife: 0.55, fxKind: 'treeFreezeArrival' });
  assert.ok(setValues(rec, 'globalAlpha').includes(0), 'effect fades to alpha 0 at the end');
}

console.log('tree-freeze-spawn-effect-regression: all assertions passed');
