// Tree Freeze takedown: snowball landing regression.
// Follow-up to PRs #125/#126 (2026-11-18): Anthony reported "Takedown
// effect isn't on the skin" — it should be a snowball landing when they
// die, visual only.
//   Root cause: a takedown system DOES exist — triggerSkinPulse(entity,
//   skin, kind) reads skin[kind + 'Effect'] dynamically, and checkHit
//   calls triggerSkinPulse(target, takedownSkin, 'takedown') when the
//   player's shot kills an enemy. But the caller gate only allowed
//   rarities 'legendary'/'mythic', and Tree Freeze is 'hypercharge', so
//   the pulse never fired. (PR #126's "zero consumers" finding was a
//   literal grep for `takedownEffect`; the real consumer is the dynamic
//   skin[kind + 'Effect'] lookup.) triggerSkinPulse itself already treats
//   hypercharge as legendary — the gate was the only blocker.
//   Fix: (1) gate also allows 'hypercharge'; (2) bespoke snowball branch
//   in triggerSkinPulse for Tree Freeze takedowns (Aura Farmer precedent);
//   (3) new 'treeFreezeSnowball' explosion render branch: the ball drops
//   from 150px above, then lands with a ring + snow-poof dots + pile.
//   Registry type updated 'ornamentBurst' -> 'snowballLanding' (the type
//   string is read by nothing; the old name no longer describes it).
// Coverage: EVERY FreeZeon damage path flows through checkHit (cones,
// patch DoT, shatter, Super impact), so the hook covers every FreeZeon
// takedown. The hook requires b.ownerId === player.id and uses the
// player's own equipped skin, so bot FreeZeons and the default skin can
// never trigger it. RENDER ONLY — no HP, damage, speed or hitbox change.
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
  takedownEffect: { type: 'snowballLanding', color: '#fbbf24', glow: true },
  spawnEffect: { type: 'treeArrival', color: '#16a34a', glow: true },
};
const nightmareSkin = {
  id: 'nightmare-outlit', rarity: 'hypercharge', set: 'Forgeaween',
  takedownEffect: { type: 'abyssalExecution', color: '#ff007f', glow: true },
};
const plainSkin = {
  id: 'plain-test-skin', rarity: 'super-rare', set: 'Test',
  takedownEffect: { type: 'plainBurst', color: '#ff0000', glow: false },
};

// ================= 1. source pins: the gate =============================
assert.match(game, /if \(\(takedownSkin\?\.rarity === 'legendary' \|\| takedownSkin\?\.rarity === 'mythic' \|\| takedownSkin\?\.rarity === 'hypercharge'\) && !target\._legendaryTakedownFxPlayed\) \{/, 'takedown gate allows legendary, mythic AND hypercharge skins');
assert.match(game, /if \(target\.hp <= 0 && b\.ownerId === player\.id\) \{\n        const takedownSkin = getActiveSkinForBrawler\(selectedBrawler\);/, 'takedown hook only fires for the PLAYER killer using the PLAYER equipped skin (bots own no skins)');
assert.doesNotMatch(game, /\bcluster\b/i, 'no banned word anywhere in game.js');

// ================= 2. source pins: registry + branches ==================
const skinStart = game.indexOf("'tree-freeze-freezeon'");
assert.ok(skinStart > 0, 'Tree Freeze registry entry exists');
assert.match(game.slice(skinStart, skinStart + 3000), /takedownEffect: \{ type: 'snowballLanding', color: '#fbbf24', glow: true \}/, 'registry takedown type is snowballLanding');
const pulseSrc = extractFn(game, 'triggerSkinPulse');
assert.match(pulseSrc, /if \(kind === 'takedown' && skin\.id === 'tree-freeze-freezeon'\) \{/, 'triggerSkinPulse has a bespoke Tree Freeze takedown branch');
assert.match(pulseSrc, /fxKind: 'treeFreezeSnowball', legendary: true, skinId: skin\.id \}\);/, 'bespoke branch pushes a treeFreezeSnowball explosion');
assert.match(game, /if \(ex\.fxKind === 'treeFreezeSnowball'\) \{/, 'explosion renderer has a treeFreezeSnowball branch');
const snowSrc = extractIf(game, "if (ex.fxKind === 'treeFreezeSnowball')");
assert.match(snowSrc, /const ballY = ex\.y - 150 \* \(1 - ease\);/, 'snowball falls from 150px above the defeated enemy');
assert.match(snowSrc, /ctx\.ellipse\(ex\.x, ex\.y \+ 10, 6 \+ 12 \* ease, 3 \+ 5 \* ease/, 'ground shadow grows as the ball approaches');
assert.match(snowSrc, /for \(let s = 0; s < 8; s\+\+\) \{/, 'landing poof has 8 snow dots');
assert.match(snowSrc, /ctx\.ellipse\(ex\.x, ex\.y \+ 6, 16 \+ 10 \* q, 6 \+ 3 \* q/, 'landing leaves a flattening snow pile');
// Visual-only: the new code writes no damage, HP, knockback or status.
for (const [name, src] of [['bespoke branch', pulseSrc.slice(pulseSrc.indexOf("tree-freeze-freezeon"), pulseSrc.indexOf("tree-freeze-freezeon") + 600)], ['render branch', snowSrc]]) {
  assert.doesNotMatch(src, /applyKnockback|applyStatusEffect|freezeonApply|checkHit|damage:/, name + ' writes no damage/knockback/status');
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

// (a) Tree Freeze takedown -> exactly one snowball, no generic pulse.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, ${JSON.stringify(treeFreezeSkin)}, 'takedown');`, box);
  assert.equal(box.explosions.length, 1, 'one snowball explosion');
  const fx = box.explosions[0];
  assert.equal(fx.fxKind, 'treeFreezeSnowball', 'fxKind is treeFreezeSnowball');
  assert.equal(fx.x, 100, 'snowball lands on the defeated enemy x');
  assert.equal(fx.y, 200, 'snowball lands on the defeated enemy y');
  assert.equal(fx.maxLife, 0.65, 'snowball lasts 0.65s');
  assert.equal(fx.legendary, true, 'snowball is a legendary fx');
  assert.equal(fx.skinId, 'tree-freeze-freezeon', 'snowball is stamped with the skin id');
}

// (b) No skin (default) -> nothing at all.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, null, 'takedown');`, box);
  assert.equal(box.explosions.length, 0, 'default skin plays no takedown effect');
}

// (c) Nightmare Outlit (hypercharge) takedown -> generic pulse fires now.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 50, y: 60 }, ${JSON.stringify(nightmareSkin)}, 'takedown');`, box);
  const pulses = box.explosions.filter((e) => e.fxKind === 'takedown');
  assert.equal(pulses.length, 1, 'hypercharge skins now get their generic takedown pulse');
  assert.equal(pulses[0].color, '#ff007f', 'pulse uses the skin effect color');
  assert.equal(pulses[0].ringCount, 3, 'takedown pulse has 3 rings');
}

// (d) Tree Freeze spawn -> bespoke tree arrival (spawn effect wired up
// 2026-11-18), NOT a snowball, NOT the generic pulse anymore.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 100, y: 200 }, ${JSON.stringify(treeFreezeSkin)}, 'spawn');`, box);
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeSnowball').length, 0, 'snowball is takedown-only');
  assert.equal(box.explosions.filter((e) => e.fxKind === 'treeFreezeArrival').length, 1, 'spawn plays the bespoke tree arrival');
  assert.equal(box.explosions.filter((e) => e.fxKind === 'spawn').length, 0, 'generic spawn pulse is replaced by the bespoke arrival');
}

// (e) Plain non-hypercharge skin takedown -> generic pulse unchanged.
{
  const box = pulseBox();
  vm.runInContext(`triggerSkinPulse({ x: 10, y: 20 }, ${JSON.stringify(plainSkin)}, 'takedown');`, box);
  assert.equal(box.explosions.filter((e) => e.fxKind === 'takedown').length, 1, 'generic takedown path still works');
}

// ================= 4. vm: snowball render branch ========================
function renderSnowball(ex) {
  const rec = richCtx();
  const box = {
    ex, ctx: rec.proxy,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    console,
  };
  vm.createContext(box);
  // The branch ends with `continue`, so run it inside a once-loop.
  vm.runInContext('for (let _once = 0; _once < 1; _once++) ' + snowSrc, box);
  return rec;
}

// Falling phase: ball drawn high above the ground + shadow ellipse.
{
  const rec = renderSnowball({ x: 100, y: 200, radius: 46, life: 0.1, maxLife: 0.65, fxKind: 'treeFreezeSnowball' });
  const arcs = arcCalls(rec);
  assert.ok(arcs.length >= 2, 'falling phase draws the ball (arc) plus highlight');
  const ballArc = arcs.find((c) => c.args[1] < 150);
  assert.ok(ballArc, 'snowball is drawn well above the defeated enemy while falling');
  assert.ok(rec.calls.some((c) => c.m === 'ellipse'), 'ground shadow ellipse is drawn while falling');
  assert.ok(setValues(rec, 'fillStyle').includes('#ffffff'), 'snowball is white');
}

// Landing phase: ring + 8 poof dots + pile + flash.
{
  const rec = renderSnowball({ x: 100, y: 200, radius: 46, life: 0.5, maxLife: 0.65, fxKind: 'treeFreezeSnowball' });
  const arcs = arcCalls(rec);
  assert.ok(arcs.length >= 10, 'landing phase draws ring + 8 poof dots + flash (got ' + arcs.length + ' arcs)');
  assert.ok(rec.calls.some((c) => c.m === 'ellipse'), 'snow pile ellipse is drawn on landing');
  assert.ok(setValues(rec, 'strokeStyle').includes('#e0f2fe'), 'landing ring is snow white-blue');
}

// End phase: fully faded (alpha 0) but still runs without throwing.
{
  const rec = renderSnowball({ x: 100, y: 200, radius: 46, life: 0.65, maxLife: 0.65, fxKind: 'treeFreezeSnowball' });
  assert.ok(setValues(rec, 'globalAlpha').includes(0), 'effect fades to alpha 0 at the end');
}

console.log('tree-freeze-takedown-snowball-regression: all assertions passed');
