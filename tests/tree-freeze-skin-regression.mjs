// Tree Freeze skin + FreeZeon nerf + Core Surge rename regression.
// Ordered 2026-11-18 (Anthony, in class, half day): a surprise Christmas
// skin launching TODAY, unannounced. Four parts, one PR.
//   A. Tree Freeze skin for FreeZeon — hypercharge/Core Surge tier, FREE,
//      auto-granted, never auto-equipped (Molten Rock Chaird precedent).
//      Full visual overhaul, NOT a recolor: tree body (pine tiers,
//      baubles, star topper), ornament projectiles instead of snow cones,
//      and a distinct Core Surged form (tree lights blaze, star brightens).
//   B. FreeZeon nerf: cone speed 780 -> 720 px/s; cones alternate
//      left/right of the aim line (Lou-style); the volley origin is
//      snapshotted at fire time so speed, 90ms delay and cone spacing are
//      identical whether the owner is moving or standing still.
//   C. Activation pop-up text '⚡ HYPERCHARGE!' -> '⚡ CORE SURGE!' —
//      that pop-up ONLY. Other Hypercharge labels stay as-is.
//   D. No enemy/map tint while hypercharged: verified by code search —
//      NO such tint exists (the Nova aura draws only on the HC entity
//      itself; the only world-sized fills are the arena background and
//      UpieDown's super-aim telegraph, which is a per-brawler aim UI, not
//      a hypercharge effect). Nothing changed for this part; these checks
//      pin that it stays that way.
// Builder picks (flagged for Anthony): the exact tree art, the ±0.07 rad
// (~4 deg) spread, 720 px/s, free + auto-granted, 'Christmas 2026' set,
// 🎄 icon. RENDER ONLY — no HP, damage, speed or hitbox change (PR #42).
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
function stubCtx() {
  const calls = [];
  const sets = [];
  return {
    calls, sets,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        if (prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const setValues = (rec, prop) => rec.sets.filter((s) => s.p === prop).map((s) => s.v);
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ================= 1. registry: free Christmas skin =================
const entryStart = game.indexOf("'tree-freeze-freezeon': {");
assert.ok(entryStart > 0, 'tree-freeze-freezeon registered in skinsDatabase');
const entry = extractBalanced(game, entryStart);
assert.match(entry, /id: 'tree-freeze-freezeon'/, 'skin id');
assert.match(entry, /name: 'Tree Freeze'/, 'skin name');
assert.match(entry, /brawler: 'freezeon'/, 'skin belongs to freezeon');
assert.match(entry, /rarity: 'hypercharge'/, 'Core Surge tier: hypercharge rarity');
assert.match(entry, /hyperTransform: true/, 'hyperTransform flag (Core Surge form)');
assert.match(entry, /isHyperchargeSkin: true/, 'isHyperchargeSkin flag');
assert.match(entry, /set: 'Christmas 2026'/, 'Christmas 2026 set');
assert.match(entry, /price: 0/, 'price is 0 (free)');
assert.match(entry, /currency: 'gems'/, 'currency is gems');
assert.match(entry, /icon: '🎄'/, 'card icon is a Christmas tree');
assert.match(entry, /_displayColor: '#16a34a'/, 'display color is evergreen');
assert.match(entry, /isAlwaysAvailable: true/, 'always available');
assert.match(entry, /attackEffect: \{ type: 'treeOrnament', color: '#dc2626', glow: true \}/, 'treeOrnament attack effect');
assert.match(entry, /superEffect: \{ type: 'treeStar', color: '#fbbf24', glow: true \}/, 'treeStar super effect');
assert.match(entry, /FREE Christmas skin!/, 'description says FREE Christmas skin');
assert.match(entry, /ornaments/, 'description: bauble ornaments');
assert.match(entry, /star topper/, 'description: star topper');
assert.match(entry, /Core Surged/, 'description: Core Surged form');
assert.doesNotMatch(entry, /battlePassRewardTier|battlePassRewardSeason/, 'no battle-pass gate on the entry');
// No gameplay stat touched by the registry entry.
assert.doesNotMatch(entry, /maxHp|\.hp\s*=|damage\s*=|hitboxMod|speedMult/, 'registry entry touches no combat stat');
assert.doesNotMatch(entry, /\bcluster\b/i, 'registry entry never uses the banned word');

// ================= 2. free unlock grant =================
assert.match(game, /function grantFreeChristmasSkins\(\)/, 'grant function exists');
const grantSrc = extractFn(game, 'grantFreeChristmasSkins');
assert.match(grantSrc, /ownedSkins\.freezeon\.includes\('tree-freeze-freezeon'\)/, 'grant is idempotent (includes-check)');
assert.doesNotMatch(grantSrc, /selectedSkins/, 'grant never auto-equips (selection stays the player\'s tap)');
assert.doesNotMatch(grantSrc, /gems|coins|price/, 'grant charges nothing');
// Grant runs at both load sites (and nowhere else).
const grantCalls = (game.match(/grantFreeChristmasSkins\(\);/g) || []).length;
assert.equal(grantCalls, 2, 'grant runs at exactly two load sites');
assert.match(game, /grantFreeThanksgivingSkins\(\);\n            grantFreeChristmasSkins\(\);\n        \}\n\n        function isFavoriteBrawler/, 'grant runs in ensurePlayerDataDefaults');
assert.match(game, /grantFreeThanksgivingSkins\(\);\n          grantFreeChristmasSkins\(\);\n      \} catch\(e\)/, 'grant runs at the end of loadProgress');

// ================= 3. nerf constants =================
assert.match(game, /const FREEZEON_CONE_SPEED = 720;/, 'cone speed nerfed 780 -> 720');
assert.match(game, /const FREEZEON_CONE_SPREAD_RAD = 0.07;/, 'L-R spread is 0.07 rad (~4 deg)');
assert.match(game, /const FREEZEON_CONE_FIRE_DELAY_MS = 90;/, '90ms stagger unchanged');
assert.match(game, /const FREEZEON_CONE_RANGE = 700;/, 'range unchanged at 700px');
assert.match(game, /freezeonPendingCones\.push\(\{ at: now \+ i \* FREEZEON_CONE_FIRE_DELAY_MS, ownerId: fromEntity\.id, ang: coneAng, hyper, dmg: stats\.dmg, ox, oy, spawnR, treeFreeze \}\);/, 'queue stores the spread angle + snapshotted origin + skin stamp');
assert.match(game, /const coneAng = ang \+ \(i % 2 === 0 \? -FREEZEON_CONE_SPREAD_RAD : FREEZEON_CONE_SPREAD_RAD\);/, 'cone 1 left, cone 2 right, alternating');
assert.match(game, /const ox = fromEntity\.x, oy = fromEntity\.y, spawnR = \(fromEntity\.radius \|\| 14\) \+ 8;/, 'volley origin snapshotted at fire time');
assert.match(game, /const treeFreeze = getActiveSkinForBrawler\('freezeon'\)\?\.id === 'tree-freeze-freezeon';/, 'skin stamped at fire time from the real equipped skin');
assert.match(game, /const ox = Number\.isFinite\(entry\.ox\) \? entry\.ox : owner\.x;/, 'spawn uses the snapshotted origin');
assert.match(game, /treeFreeze: !!entry\.treeFreeze \}\);/, 'bullet carries the treeFreeze flag');

// ================= 4. vm: grant + active-skin resolution (real state) =================
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
vm.runInContext(extractFn(game, 'grantFreeChristmasSkins'), sandbox);
vm.runInContext(extractFn(game, 'getActiveSkinForBrawler'), sandbox);

sandbox.playerData = { ownedSkins: {}, selectedSkins: {} };
sandbox.grantFreeChristmasSkins();
assert.equal([...sandbox.playerData.ownedSkins.freezeon].join(','), 'tree-freeze-freezeon', 'fresh save owns the skin after load');
sandbox.grantFreeChristmasSkins();
assert.equal([...sandbox.playerData.ownedSkins.freezeon].join(','), 'tree-freeze-freezeon', 'grant is idempotent on re-load');
assert.equal(sandbox.getActiveSkinForBrawler('freezeon'), null, 'not active before the player equips it');
sandbox.playerData.selectedSkins.freezeon = 'tree-freeze-freezeon';
const active = sandbox.getActiveSkinForBrawler('freezeon');
assert.equal(active.id, 'tree-freeze-freezeon', 'equipped skin resolves as active');
assert.equal(active.brawler, 'freezeon', 'active skin belongs to freezeon');
assert.equal(active.rarity, 'hypercharge', 'active skin is Core Surge tier');
assert.equal(active.attackEffect.type, 'treeOrnament', 'active skin carries the treeOrnament effect');
assert.equal(sandbox.getActiveSkinForBrawler('chaird'), null, 'other brawlers are unaffected');
delete sandbox.playerData.selectedSkins.freezeon;
assert.equal(sandbox.getActiveSkinForBrawler('freezeon'), null, 'unequipping clears the active skin');
// Pre-existing save keeps its other skins and gains the free one.
sandbox.playerData = { ownedSkins: { freezeon: ['frosty-freezeon'] }, selectedSkins: {} };
sandbox.grantFreeChristmasSkins();
assert.equal([...sandbox.playerData.ownedSkins.freezeon].join(','), 'frosty-freezeon,tree-freeze-freezeon', 'existing saves keep owned skins and gain the free one');

// ================= 5. vm: volley — L-R-L-R, 720 px/s, origin snapshot =================
// Controllable clock + entity registry (same pattern as freezeon-regression).
let nowMs = 100000;
const entitiesById = new Map();
let bullets = [];
let playerEnt = null;
function mkEntity(id, opts = {}) {
  const e = {
    id, x: opts.x ?? 0, y: opts.y ?? 0, hp: opts.hp ?? 5000, maxHp: opts.maxHp ?? 5000,
    radius: opts.radius ?? 14, team: opts.team ?? 'player', brawler: opts.brawler ?? 'freezeon',
    level: opts.level ?? 11, selectedStar: opts.selectedStar ?? 'none',
    isHypercharged: !!opts.isHypercharged, vx: opts.vx ?? 0, vy: opts.vy ?? 0,
  };
  entitiesById.set(id, e);
  return e;
}
let skinEquipped = false;
const volleyBox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => nowMs },
  getScaledStats: (id, lvl) => id === 'freezeon' ? { hp: 5200, dmg: 500, speed: 270 } : { hp: 5000, dmg: 1000, speed: 250 },
  getSelectedBrawlerLevel: () => 11,
  getEntityById: (id) => entitiesById.get(id) || null,
  getActiveSkinForBrawler: () => (skinEquipped ? { id: 'tree-freeze-freezeon' } : null),
  isHypercharged: false,
  selectedBrawler: 'freezeon',
  player: null,
  bots: [],
  bullets: [],
  freezeonPendingCones: [],
  WORLD_W: 2000,
  WORLD_H: 2000,
};
// Pull every FREEZEON_* numeric constant straight from game.js (no drift).
for (const m of game.matchAll(/const (FREEZEON_[A-Z0-9_]+) = ([0-9.]+);/g)) {
  volleyBox[m[1]] = Number(m[2]);
}
vm.createContext(volleyBox);
vm.runInContext(
  ['fireFreezeonMain', 'freezeonFirePendingCone'].map((fn) => extractFn(game, fn)).join('\n'),
  volleyBox,
);
function resetVolley(ownerX = 0, ownerY = 0) {
  entitiesById.clear();
  bullets = [];
  nowMs = 100000;
  skinEquipped = false;
  playerEnt = mkEntity('p1', { team: 'player', brawler: 'freezeon', x: ownerX, y: ownerY });
  volleyBox.player = playerEnt;
  volleyBox.bullets = bullets;
  volleyBox.freezeonPendingCones = [];
  volleyBox.isHypercharged = false;
}
function fireAllQueued() {
  // Fire every queued cone in queue order (the shipped tick fires them
  // in reverse within one frame; queue order is the volley's own order).
  for (const entry of [...volleyBox.freezeonPendingCones]) {
    volleyBox.freezeonFirePendingCone(entry);
  }
  volleyBox.freezeonPendingCones = [];
  return bullets.filter((b) => b.isFreezeonCone);
}

// Queue shape: 4 cones, 90ms apart, L-R-L-R angles, origin snapshotted.
resetVolley(0, 0);
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
assert.equal(volleyBox.freezeonPendingCones.length, 4, 'firing queues 4 cones');
assert.ok(volleyBox.freezeonPendingCones.every((c, i) => c.at === nowMs + i * 90), 'queued cones are 90ms apart (0/90/180/270)');
{
  const angs = volleyBox.freezeonPendingCones.map((c) => c.ang);
  assert.ok(angs[0] < 0 && angs[1] > 0 && angs[2] < 0 && angs[3] > 0, 'queued angles alternate L/R/L/R');
  assert.ok(angs.every((a) => near(Math.abs(a), 0.07, 0.001)), 'spread is ±0.07 rad');
  assert.ok(volleyBox.freezeonPendingCones.every((c) => c.ox === 0 && c.oy === 0 && c.spawnR === 22), 'origin snapshot is the fire-time position (0,0) + radius 22');
  assert.ok(volleyBox.freezeonPendingCones.every((c) => c.treeFreeze === false), 'no skin stamped when unequipped');
}
// Still owner: bullets fly 720 px/s along their L/R angles from the origin.
resetVolley(0, 0);
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
const stillCones = fireAllQueued();
assert.equal(stillCones.length, 4, 'all 4 cones spawn');
assert.ok(stillCones.every((c) => near(Math.hypot(c.vx, c.vy), 720)), 'cones fly at 720 px/s (nerfed from 780)');
assert.ok(stillCones.every((c) => near(c.maxLife, 700 / 720)), 'range still 700px (maxLife 700/720)');
assert.ok(stillCones.every((c) => near(Math.hypot(c.x, c.y), 22)), 'cones spawn 22px out from the origin');
assert.ok(stillCones[0].y < 0 && stillCones[1].y > 0 && stillCones[2].y < 0 && stillCones[3].y > 0, 'spawned cones go L/R/L/R');
// Moving owner: the volley is IDENTICAL to the still volley — same spawn
// points, same velocities — because every cone spawns from the fire-time
// origin, not the owner's live position.
resetVolley(0, 0);
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
playerEnt.x = 150; playerEnt.y = -80; // owner sprints away mid-volley
const movingCones = fireAllQueued();
assert.equal(movingCones.length, 4, 'moving owner: all 4 cones still spawn');
{
  const key = (c) => [c.x.toFixed(3), c.y.toFixed(3), c.vx.toFixed(3), c.vy.toFixed(3)].join('|');
  assert.deepEqual(movingCones.map(key).sort(), stillCones.map(key).sort(), 'moving volley is identical to the still volley (same spawns + velocities)');
}
// Moving TOWARD the aim line also changes nothing.
resetVolley(0, 0);
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
playerEnt.x = 60; playerEnt.y = 0; // owner runs forward along the aim line
const forwardCones = fireAllQueued();
{
  const key = (c) => [c.x.toFixed(3), c.y.toFixed(3), c.vx.toFixed(3), c.vy.toFixed(3)].join('|');
  assert.deepEqual(forwardCones.map(key).sort(), stillCones.map(key).sort(), 'forward-moving volley is identical to the still volley');
}
// Skin stamp: equipped -> bullets carry treeFreeze; unequipped -> false.
resetVolley(0, 0);
skinEquipped = true;
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
const skinnedCones = fireAllQueued();
assert.ok(skinnedCones.every((c) => c.treeFreeze === true), 'equipped volley stamps treeFreeze on every cone');
// Dead owner mid-volley: remaining cones never fire.
resetVolley(0, 0);
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
playerEnt.hp = 0;
assert.equal(volleyBox.freezeonFirePendingCone(volleyBox.freezeonPendingCones[0]), false, 'dead owner drops the cone');
assert.equal(bullets.filter((b) => b.isFreezeonCone).length, 0, 'no cone from a dead brawler');
// G2 Extra Scoop still queues 6 cones with the same L-R pattern.
resetVolley(0, 0);
playerEnt.freezeonExtraScoopArmed = true;
volleyBox.fireFreezeonMain(playerEnt, 1000, 0, false);
assert.equal(volleyBox.freezeonPendingCones.length, 6, 'G2 queues 6 cones');
assert.ok(volleyBox.freezeonPendingCones.map((c) => Math.sign(c.ang)).join(',') === '-1,1,-1,1,-1,1', 'G2 volley keeps the L/R/L/R/L/R pattern');

// ================= 6. vm: cone art — bauble vs snow cone =================
const coneBox = { Math, ctx: null, performance: { now: () => 100000 } };
vm.createContext(coneBox);
vm.runInContext(extractFn(game, 'drawFreezeonCone'), coneBox);
function drawCone(b) {
  const rec = stubCtx();
  coneBox.ctx = rec.proxy;
  coneBox.b = b;
  vm.runInContext('drawFreezeonCone(ctx, b);', coneBox);
  return rec;
}
const bauble = drawCone({ x: 100, y: 100, vx: 720, vy: 0, treeFreeze: true, hyperVisual: false });
assert.ok(setValues(bauble, 'fillStyle').includes('#dc2626'), 'tree cone renders a red bauble');
assert.ok(setValues(bauble, 'fillStyle').includes('#fbbf24'), 'tree cone has a gold cap');
assert.ok(!setValues(bauble, 'fillStyle').includes('#d97706'), 'tree cone is not the brown snow-cone cone');
const baubleHyper = drawCone({ x: 100, y: 100, vx: 720, vy: 0, treeFreeze: true, hyperVisual: true });
assert.ok(setValues(baubleHyper, 'fillStyle').includes('#a855f7'), 'hyper tree cone renders a purple bauble');
const plainCone = drawCone({ x: 100, y: 100, vx: 720, vy: 0, treeFreeze: false, hyperVisual: false });
assert.ok(setValues(plainCone, 'fillStyle').includes('#d97706'), 'unequipped cone still renders the brown snow-cone cone');
assert.ok(setValues(plainCone, 'fillStyle').includes('#7dd3fc'), 'unequipped cone still has the ice-blue scoop');
assert.ok(!setValues(plainCone, 'fillStyle').includes('#dc2626'), 'unequipped cone has no bauble red');

// ================= 7. vm: portrait — tree vs snowman, HC vs not =================
const portraitBranch = extractIf(game, "if (brawlerId === 'freezeon') {\n                // Tree Freeze:");
function runPortrait({ skin, hyper, isPlayerEnt }) {
  const rec = stubCtx();
  const entity = { x: 100, y: 100, radius: 14, isHypercharged: hyper };
  const box = {
    Math,
    ctx: rec.proxy,
    entity,
    drawY: 100,
    size: 30,
    activeSkin: skin ? { id: 'tree-freeze-freezeon' } : null,
    isHypercharged: hyper,
    player: isPlayerEnt ? entity : { id: 'someone-else' },
    brawlerId: 'freezeon',
  };
  vm.createContext(box);
  vm.runInContext(portraitBranch, box);
  return rec;
}
const treePlain = runPortrait({ skin: true, hyper: false, isPlayerEnt: true });
assert.ok(setValues(treePlain, 'fillStyle').includes('#15803d'), 'tree portrait draws the dark pine tier');
assert.ok(setValues(treePlain, 'fillStyle').includes('#16a34a'), 'tree portrait draws the mid pine tier');
assert.ok(setValues(treePlain, 'fillStyle').includes('#22c55e'), 'tree portrait draws the light pine tier');
assert.ok(setValues(treePlain, 'fillStyle').includes('#78350f'), 'tree portrait draws the trunk');
assert.ok(setValues(treePlain, 'fillStyle').includes('#dc2626'), 'tree portrait draws red baubles');
assert.ok(setValues(treePlain, 'fillStyle').includes('#2563eb'), 'tree portrait draws blue baubles');
assert.ok(setValues(treePlain, 'fillStyle').includes('#fbbf24'), 'tree portrait draws the gold star topper');
assert.ok(!setValues(treePlain, 'fillStyle').includes('#e0f2fe'), 'tree portrait does not draw the snowman body');
assert.ok(!setValues(treePlain, 'fillStyle').includes('#f97316'), 'tree portrait does not draw the carrot nose');
const treeHyper = runPortrait({ skin: true, hyper: true, isPlayerEnt: true });
assert.ok(setValues(treeHyper, 'fillStyle').includes('#fde047'), 'Core Surged tree draws the bright star');
assert.ok(setValues(treeHyper, 'fillStyle').includes('rgba(255,255,255,.9)'), 'Core Surged tree draws glowing light glints');
assert.ok(!setValues(treeHyper, 'fillStyle').includes('#e0f2fe'), 'Core Surged tree is still a tree, not the snowman');
const treeBot = runPortrait({ skin: true, hyper: true, isPlayerEnt: false });
assert.ok(setValues(treeBot, 'fillStyle').includes('#fde047'), 'bot Core Surged tree also brightens (entity.isHypercharged path)');
const snowman = runPortrait({ skin: false, hyper: false, isPlayerEnt: true });
assert.ok(setValues(snowman, 'fillStyle').includes('#e0f2fe'), 'unequipped portrait still draws the snowman body');
assert.ok(setValues(snowman, 'fillStyle').includes('#f97316'), 'unequipped portrait still draws the carrot nose');
assert.ok(!setValues(snowman, 'fillStyle').includes('#16a34a'), 'unequipped portrait has no pine green');
assert.ok(!setValues(snowman, 'fillStyle').includes('#fbbf24'), 'unequipped portrait has no gold star');
// No gameplay stat touched by the portrait branch.
assert.doesNotMatch(portraitBranch, /\.hp\s*=|maxHp|\bdamage\s*[+\-*\/]?=|speedMult\s*=|hitboxMod/, 'portrait branch touches no combat stat');

// ================= 8. vm: twinkle aura blocks (bots + player) =================
const auraMarker = "if (activeSkinId === 'tree-freeze-freezeon') {";
const auraBlocks = [extractIf(game, auraMarker, 0), extractIf(game, auraMarker, 1)];
assert.equal(auraBlocks[0], auraBlocks[1], 'bots and player aura blocks are identical');
for (const block of auraBlocks) assert.doesNotMatch(block, /\.hp\s*=|maxHp|\bdamage\s*[+\-*\/]?=|speedMult\s*=|hitboxMod/, 'aura block touches no combat stat');
function runAura({ randomValue, hyper }) {
  const rec = stubCtx();
  const explosions = [];
  const mathStub = Object.create(Math);
  mathStub.random = () => randomValue;
  const t = { x: 100, radius: 14, isHypercharged: hyper };
  const box = {
    Math: mathStub,
    performance: { now: () => 100000 },
    ctx: rec.proxy,
    explosions,
    activeSkinId: 'tree-freeze-freezeon',
    t,
    drawY: 100,
    player: t,
    isHypercharged: hyper,
  };
  vm.createContext(box);
  vm.runInContext(auraBlocks[0], box);
  return { rec, explosions };
}
const auraPlain = runAura({ randomValue: 0.01, hyper: false });
assert.ok(setValues(auraPlain.rec, 'strokeStyle').includes('rgba(34, 197, 94, 0.55)'), 'aura draws the green tree-lights ring');
assert.equal(auraPlain.explosions.length, 1, 'aura sheds a rising sparkle when the roll hits');
assert.ok(['#fbbf24', '#dc2626'].includes(auraPlain.explosions[0].color), 'rising sparkle is gold or bauble-red');
const auraHyper = runAura({ randomValue: 0.01, hyper: true });
assert.ok(setValues(auraHyper.rec, 'strokeStyle').includes('rgba(251, 191, 36, 0.7)'), 'Core Surged aura draws the gold ring');
assert.equal(auraHyper.explosions[0].color, '#fde047', 'Core Surged sparkle is bright gold');
const auraQuiet = runAura({ randomValue: 0.9, hyper: false });
assert.equal(auraQuiet.explosions.length, 0, 'aura sheds no sparkle when the roll misses');
assert.ok(setValues(auraQuiet.rec, 'strokeStyle').includes('rgba(34, 197, 94, 0.55)'), 'ring still draws when no sparkle spawns');

// ================= 9. Part C: CORE SURGE popup (that text only) =================
assert.match(game, /spawnFloatingText\(e\.x, e\.y - 46, '⚡ CORE SURGE!', '#f0abff'\);/, 'activation popup reads CORE SURGE');
assert.doesNotMatch(game, /⚡ HYPERCHARGE!/, 'the old HYPERCHARGE popup text is gone everywhere');
const hcTickSrc = extractFn(game, 'hcTickHyperEntity');
assert.match(hcTickSrc, /'⚡ CORE SURGE!'/, 'the popup lives in hcTickHyperEntity (the real activation edge)');
// Scope: only the activation popup changed. The other Hypercharge labels
// (ready text, Hyper Forge banner, boss enrage) stay as-is.
assert.match(game, /'HYPERCHARGE READY \(100%\)!'/, 'HYPERCHARGE READY text untouched');
assert.match(game, /'⚡ HYPER FORGE: ALWAYS HYPERCHARGED • 3x RELOAD SPEED!'/, 'Hyper Forge banner untouched');
assert.match(game, /'⚡ COSMIC HYPERCHARGE ENRAGED! ⚡'/, 'boss enrage text untouched');

// ================= 10. Part D: no enemy/map tint while hypercharged =================
// The Nova aura draws ONLY on the hypercharged entity itself: rings +
// glow + embers centered on that entity. It never fills the world and
// never draws on any other entity.
const auraSrc = extractFn(game, 'drawHyperchargeAuras');
assert.doesNotMatch(auraSrc, /fillRect/, 'Nova aura never fills the world/map');
assert.match(auraSrc, /collectRing\(player\)/, 'player ring collected from the player entity');
assert.match(auraSrc, /if \(b && !b\.isDummy\) collectRing\(b\)/, 'bot rings collected only from HC bots (dummies excluded)');
assert.match(auraSrc, /if \(!e \|\| e\.hp <= 0 \|\| !isEntityHyperchargedNow\(e, now\)\) return;/, 'every aura draw is gated on THAT entity being hypercharged');
assert.doesNotMatch(auraSrc, /enemy|target\.x|target\.y/, 'Nova aura never references enemies or targets');
// The activation edge spawns its burst + popup at the HC entity's own
// position only — nothing is drawn on enemies or the map.
assert.match(hcTickSrc, /explosions\.push\(\{ x: e\.x, y: e\.y, radius: \(e\.radius \|\| 16\) \+ 52/, 'activation burst is centered on the HC entity');
assert.match(hcTickSrc, /spawnFloatingText\(e\.x, e\.y - 46, '⚡ CORE SURGE!'/, 'activation popup is positioned at the HC entity');
// World-sized fills: exactly two exist — the arena background, and
// UpieDown's super-AIM telegraph (a per-brawler aim UI shown only while
// aiming that one super; it exists with or without hypercharge and only
// changes colour). Neither is a hypercharge tint on enemies or the map.
const worldFills = game.match(/fillRect\(0,0,WORLD_W,WORLD_H\)/g) || [];
assert.equal(worldFills.length, 2, 'exactly two world-sized fills exist');
assert.match(game, /ctx\.fillRect\(0,0,WORLD_W,WORLD_H\); \/\/ arena/, 'one world fill is the arena background');
{
  const upieIdx = game.indexOf("selectedBrawler === 'upiedown'");
  const fillIdx = game.indexOf('fillRect(0,0,WORLD_W,WORLD_H)', upieIdx);
  assert.ok(upieIdx > 0 && fillIdx > upieIdx && fillIdx - upieIdx < 3000, 'the other world fill sits inside the UpieDown super-aim telegraph');
  assert.match(game.slice(upieIdx, fillIdx + 1200), /FLIP ENTIRE MAP/, 'UpieDown telegraph is the map-flip super aim UI, not a hypercharge effect');
}
// The banned word never appears in this change.
assert.doesNotMatch(game.slice(game.indexOf("'tree-freeze-freezeon'"), game.indexOf("'tree-freeze-freezeon'") + 3000), /\bcluster\b/i, 'skin entry never uses the banned word');

console.log('Tree Freeze skin regression: All checks passed successfully!');
