// Molten Rock Chaird skin regression — Thanksgiving Surprise Update, item 2.
// FREE skin for Chaird. Builder picks (flagged for Anthony): the visual
// treatment (volcanic-rock fighter + lava-crack aura + molten spin chairs),
// the 'Thanksgiving Surprise' set name, and the 🌋 icon. Anthony's spec is
// authoritative: free unlock, no cost, no paywall; lava cracks, ember glow,
// rock texture on the chair; card art description included.
//   - The 'molten-rock-chaird' registry entry ALREADY existed on main, but
//     as a battle-pass reward (currency 'battlepass', tier 10, season
//     'lava-stones-2026-05') — those gate fields were dead metadata (never
//     read anywhere) yet the skin was not owned by anyone. This change
//     converts it to a true free skin and grants it to every save on load.
//   - Render is keyed off REAL state only: getActiveSkinForBrawler() from
//     playerData.selectedSkins, never a faked flag. No HP/damage/speed/
//     hitbox change anywhere (PR #42: skins never touch tower HP).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');

// ---- brace-matching extractor (same approach as bookworm-regression) ----
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  return extractBalanced(src, start);
}
function extractBalanced(src, start) {
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no opening brace');
  const out0 = i;
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
// Extract a whole `if (...) {...}` statement starting at marker (no else).
function extractIf(src, marker, nth = 0) {
  let idx = -1;
  for (let n = 0; n <= nth; n++) { idx = src.indexOf(marker, idx + 1); if (idx < 0) throw new Error('marker not found: ' + marker); }
  return extractBalanced(src, idx);
}
function extractIfElse(src, marker, nth = 0) {
  let idx = -1;
  for (let n = 0; n <= nth; n++) { idx = src.indexOf(marker, idx + 1); if (idx < 0) throw new Error('marker not found: ' + marker); }
  const ifEnd = Number(extractBalanced(src, idx).length);
  let rest = src.slice(idx + ifEnd);
  const elseMatch = rest.match(/^\s*else\s*\{/);
  if (!elseMatch) throw new Error('no else block after if at ' + idx);
  const elseStart = idx + ifEnd + elseMatch.index;
  const elseLen = extractBalanced(src, elseStart).length;
  return src.slice(idx, elseStart + elseLen);
}
function stubCtx() {
  const calls = [];
  const sets = [];
  return {
    calls, sets,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const setValues = (rec, prop) => rec.sets.filter((s) => s.p === prop).map((s) => s.v);

// ================= 1. registry: free Thanksgiving skin =================
const entryStart = game.indexOf("'molten-rock-chaird': {");
assert.ok(entryStart > 0, 'molten-rock-chaird registered in skinsDatabase');
const entry = extractBalanced(game, entryStart);
assert.match(entry, /brawler: 'chaird'/, 'skin belongs to chaird');
assert.match(entry, /price: 0/, 'price is 0');
assert.match(entry, /currency: 'gems'/, 'currency is gems (not battlepass)');
assert.match(entry, /set: 'Thanksgiving Surprise'/, 'Thanksgiving Surprise set');
assert.match(entry, /isAlwaysAvailable: true/, 'always available');
assert.match(entry, /icon: '🌋'/, 'card icon present');
assert.match(entry, /_displayColor: '#ff6b2d'/, 'display color is lava orange');
assert.match(entry, /attackEffect: \{ type: 'lavaChair', color: '#ff6b2d', glow: true \}/, 'lavaChair attack effect');
assert.match(entry, /superEffect: \{ type: 'moltenSpin', color: '#ff9b42', glow: true \}/, 'moltenSpin super effect');
assert.match(entry, /takedownEffect: \{ type: 'lavaBurst', color: '#ffb15a', glow: true \}/, 'lavaBurst takedown effect');
assert.match(entry, /FREE Thanksgiving skin!/, 'description says FREE');
assert.match(entry, /volcanic rock/, 'card art description: volcanic rock');
assert.match(entry, /lava cracks/, 'card art description: lava cracks');
assert.match(entry, /ember light/, 'card art description: ember glow');
assert.doesNotMatch(entry, /battlePassRewardTier/, 'no battle-pass tier gate on the entry');
assert.doesNotMatch(entry, /battlePassRewardSeason/, 'no battle-pass season gate on the entry');
assert.doesNotMatch(game, /battlePassRewardTier/, 'battlePassRewardTier is gone everywhere (was dead metadata)');
assert.doesNotMatch(game, /lava-stones-2026-05/, 'old lava-stones season reference is gone');

// ================= 2. free unlock grant =================
assert.match(game, /function grantFreeThanksgivingSkins\(\)/, 'grant function exists');
assert.match(game, /grantFreeThanksgivingSkins\(\);\n\s*grantFreeChristmasSkins\(\);\n\s*\} catch\(e\)/, 'grant runs at the end of loadProgress (Christmas grant runs right after it)');
assert.match(game, /grantFreeThanksgivingSkins\(\);\n            grantFreeChristmasSkins\(\);\n        \}\n\n        function isFavoriteBrawler/, 'grant runs in ensurePlayerDataDefaults (Christmas grant runs right after it)');
const grantSrc = extractFn(game, 'grantFreeThanksgivingSkins');
assert.match(grantSrc, /ownedSkins\.chaird\.includes\('molten-rock-chaird'\)/, 'grant is idempotent (includes-check)');
assert.doesNotMatch(grantSrc, /selectedSkins/, 'grant never auto-equips (selection stays the player\'s tap)');
assert.doesNotMatch(grantSrc, /gems|coins|price/, 'grant charges nothing');

// ================= 3. roster portrait / fighter look =================
assert.match(roster, /'molten-rock-chaird':\['chair','#2b2b2e','#ff6b2d'\]/, 'roster skin: chair silhouette, dark rock coat, lava accent');

// ================= 4. in-match render hooks keyed on real state =================
const auraCount = (game.match(/if \(activeSkinId === 'molten-rock-chaird'\) \{/g) || []).length;
assert.equal(auraCount, 2, 'molten aura block exists for both bots and the player');
assert.match(game, /const isMoltenSpin = spinSkinId === 'molten-rock-chaird'/, 'spin chairs key on the equipped skin');
assert.match(game, /ctx\.fillStyle = isMoltenSpin \? '#ff6b2d'/, 'spin chairs go molten orange when equipped');
assert.match(game, /isMoltenSpin \? 'rgba\(255, 107, 45, 0\.15\)'/, 'spin AoE goes molten when equipped');
assert.match(game, /activeSkinId === 'molten-rock-chaird'\) && b\.ownerBrawler === 'chaird'/, 'chair bullets render molten when the skin is equipped');
// No gameplay stat touched by any molten block.
for (const [name, chunk] of [
  ['registry entry', entry],
  ['grant function', grantSrc],
]) {
  assert.doesNotMatch(chunk, /maxHp|\.hp\s*=|damage\s*=|hitboxMod|speedMult/, name + ' touches no combat stat');
}
// No gameplay stat touched by any molten block: check ONLY the chunks this
// change added/edited (entry, grant, aura blocks, spin block) — the rest of
// game.js legitimately mentions tower HP elsewhere (PR #42 rule).
const spinStart = game.indexOf('// Molten Rock Chaird: the spinning chairs');
assert.ok(spinStart > 0, 'molten spin block present');
const spinEnd = game.indexOf("ctx.lineWidth = 2;\n            ctx.stroke();", spinStart);
assert.ok(spinEnd > spinStart, 'molten spin block ends');
const spinChunk = game.slice(spinStart, spinEnd);
for (const [name, chunk] of [
  ['registry entry', entry],
  ['grant function', grantSrc],
  ['spin block', spinChunk],
]) {
  assert.doesNotMatch(chunk, /maxHp|\.hp\s*=|damage\s*=|damage\s*\+=|hitboxMod|speedMult/, name + ' touches no combat stat');
}
assert.doesNotMatch(entry, /tower/i, 'registry entry never mentions towers');

// ================= 5. vm: grant + active-skin resolution (real state) =================
// Real registry entry, evaluated from the shipped source (not re-typed).
const entryObjSrc = game.slice(entryStart, entryStart + entry.length);
const skinsDatabase = vm.runInNewContext(`({${entryObjSrc}})`, {});
const sandbox = {
  Math,
  performance: { now: () => 100000 },
  playerData: { ownedSkins: {}, selectedSkins: {} },
  skinsDatabase,
  isTraining: false,
  activeSkinTrial: null,
};
vm.createContext(sandbox);
vm.runInContext(extractFn(game, 'grantFreeThanksgivingSkins'), sandbox);
vm.runInContext(extractFn(game, 'getActiveSkinForBrawler'), sandbox);

sandbox.playerData = { ownedSkins: {}, selectedSkins: {} };
sandbox.grantFreeThanksgivingSkins();
// (vm-realm arrays fail strict deepEqual — compare plain values instead.)
assert.equal([...sandbox.playerData.ownedSkins.chaird].join(','), 'molten-rock-chaird', 'fresh save owns the skin after load');
sandbox.grantFreeThanksgivingSkins();
assert.equal([...sandbox.playerData.ownedSkins.chaird].join(','), 'molten-rock-chaird', 'grant is idempotent on re-load');
assert.equal(sandbox.getActiveSkinForBrawler('chaird'), null, 'not active before the player equips it');
sandbox.playerData.selectedSkins.chaird = 'molten-rock-chaird';
const active = sandbox.getActiveSkinForBrawler('chaird');
assert.equal(active.id, 'molten-rock-chaird', 'equipped skin resolves as active');
assert.equal(active.brawler, 'chaird', 'active skin belongs to chaird');
assert.equal(active.attackEffect.type, 'lavaChair', 'active skin carries the lavaChair effect');
assert.equal(sandbox.getActiveSkinForBrawler('forest'), null, 'other brawlers are unaffected');
delete sandbox.playerData.selectedSkins.chaird;
assert.equal(sandbox.getActiveSkinForBrawler('chaird'), null, 'unequipping clears the active skin');
// Pre-existing save keeps its other skins and gains the free one.
sandbox.playerData = { ownedSkins: { chaird: ['demon_villain_chaird'] }, selectedSkins: {} };
sandbox.grantFreeThanksgivingSkins();
assert.equal([...sandbox.playerData.ownedSkins.chaird].join(','), 'demon_villain_chaird,molten-rock-chaird', 'existing saves keep owned skins and gain the free one');

// ================= 6. vm: roster portrait + fighter draw (real module) =================
const rosterBox = { globalThis: {} };
vm.runInNewContext(roster, rosterBox);
const visuals = rosterBox.globalThis.BraweRosterVisuals;
assert.ok(visuals, 'roster module loads');
const moltenPortrait = visuals.portrait('chaird', 'molten-rock-chaird');
assert.match(moltenPortrait, /fighter-portrait-art/, 'molten card portrait renders');
assert.match(moltenPortrait, /#2b2b2e/, 'molten portrait uses the dark volcanic-rock coat');
assert.match(moltenPortrait, /#ff6b2d/, 'molten portrait uses the lava accent');
assert.doesNotMatch(moltenPortrait, /#b99064/, 'molten portrait does not use the base wood tone');
const basePortrait = visuals.portrait('chaird', null);
assert.match(basePortrait, /#b99064/, 'base portrait still uses the wood tone');
assert.doesNotMatch(basePortrait, /#ff6b2d/, 'base portrait has no lava accent');
assert.match(visuals.portrait('forest', null), /#409f67/, 'other fighters unaffected');

function drawWithSkin(skinId) {
  const rec = stubCtx();
  const entity = { x: 100, y: 100, radius: 14, vx: 0, vy: 0 };
  const ok = visuals.draw(rec.proxy, entity, 100, 'chaird', skinId, 100000, false);
  assert.equal(ok, true, 'roster draw succeeds for chaird' + (skinId ? ' + ' + skinId : ''));
  return rec;
}
const moltenDraw = drawWithSkin('molten-rock-chaird');
assert.ok(setValues(moltenDraw, 'fillStyle').includes('#ff6b2d'), 'in-match fighter draws lava accent when equipped');
assert.ok(setValues(moltenDraw, 'fillStyle').includes('#2b2b2e'), 'in-match fighter draws volcanic-rock coat when equipped');
const baseDraw = drawWithSkin(null);
assert.ok(setValues(baseDraw, 'fillStyle').includes('#b99064'), 'in-match fighter draws wood tone when not equipped');
assert.ok(!setValues(baseDraw, 'fillStyle').includes('#ff6b2d'), 'in-match fighter draws no lava when not equipped');

// ================= 7. vm: shipped chair-bullet render branch =================
const chairBranch = extractIfElse(game, "if ((b.skinEffect === 'lavaChair'");
assert.match(chairBranch, /activeSkinId === 'molten-rock-chaird'/, 'branch keys on the real equipped skin id');
function runChairBranch(activeSkinId, skinEffect) {
  const rec = stubCtx();
  const explosions = [];
  const mathStub = Object.create(Math);
  mathStub.random = () => 0.5;
  const box = {
    Math: mathStub,
    performance: { now: () => 100000 },
    ctx: rec.proxy,
    explosions,
    activeSkinId,
    b: { isChair: true, ownerBrawler: 'chaird', x: 100, y: 100, vx: 500, vy: 0, id: 1, skinEffect },
  };
  vm.createContext(box);
  vm.runInContext(chairBranch, box);
  return { rec, explosions };
}
const equipped = runChairBranch('molten-rock-chaird', undefined);
assert.ok(setValues(equipped.rec, 'fillStyle').includes('#ff6b2d'), 'equipped chair bullet renders molten orange');
assert.ok(setValues(equipped.rec, 'shadowBlur').includes(24), 'equipped chair bullet has the lava glow');
assert.equal(equipped.explosions.length, 5, 'equipped chair bullet sheds 5 ember particles');
assert.ok(equipped.explosions.every((p) => p.isParticle && (p.color === '#ffb15a' || p.color === '#ff6b2d')), 'ember particles are lava-coloured');
const plain = runChairBranch('', undefined);
assert.ok(setValues(plain.rec, 'fillStyle').includes('#8B4513'), 'unequipped chair bullet renders plain brown');
assert.ok(!setValues(plain.rec, 'fillStyle').includes('#ff6b2d'), 'unequipped chair bullet has no lava');
assert.equal(plain.explosions.length, 0, 'unequipped chair bullet sheds no embers');
const viaEffect = runChairBranch('', 'lavaChair');
assert.ok(setValues(viaEffect.rec, 'fillStyle').includes('#ff6b2d'), 'skinEffect lavaChair also renders molten');

// ================= 8. vm: shipped fighter aura blocks =================
const auraMarker = "if (activeSkinId === 'molten-rock-chaird') {";
const auraBlocks = [extractIf(game, auraMarker, 0), extractIf(game, auraMarker, 1)];
assert.equal(auraBlocks[0], auraBlocks[1], 'bots and player aura blocks are identical');
for (const block of auraBlocks) assert.doesNotMatch(block, /\.hp\s*=|maxHp|\bdamage\s*[+\-*\/]?=|speedMult\s*=|hitboxMod/, 'aura block touches no combat stat');
function runAura(randomValue) {
  const rec = stubCtx();
  const explosions = [];
  const mathStub = Object.create(Math);
  mathStub.random = () => randomValue;
  const box = {
    Math: mathStub,
    performance: { now: () => 100000 },
    ctx: rec.proxy,
    explosions,
    activeSkinId: 'molten-rock-chaird',
    t: { x: 100, radius: 14 },
    drawY: 100,
  };
  vm.createContext(box);
  vm.runInContext(auraBlocks[0], box);
  return { rec, explosions };
}
const aura = runAura(0.01);
assert.ok(setValues(aura.rec, 'strokeStyle').includes('rgba(255, 107, 45, 0.55)'), 'aura draws the ember-glow ring');
assert.ok(setValues(aura.rec, 'strokeStyle').includes('rgba(255, 177, 90, 0.9)'), 'aura draws the lava-crack strokes');
assert.equal(aura.explosions.length, 1, 'aura sheds a rising ember when the roll hits');
assert.equal(aura.explosions[0].color, '#ffb15a', 'rising ember is lava-coloured');
const auraQuiet = runAura(0.9);
assert.equal(auraQuiet.explosions.length, 0, 'aura sheds no ember when the roll misses');
assert.ok(setValues(auraQuiet.rec, 'strokeStyle').includes('rgba(255, 107, 45, 0.55)'), 'ring still draws when no ember spawns');

console.log('Molten Rock Chaird skin regression: All checks passed successfully!');
