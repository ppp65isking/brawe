// Aegis Blockshot fix regression (2026-10-28, post-PR #62 playtest):
//  * Bug 1: the Blockshot DEVICE's HP bar never showed — no bar was ever
//    drawn for it (deviceHp only appeared at creation, damage, and the
//    destruction check). Fix draws a device HP bar in drawAegisBubbles.
//  * Bug 2: bubble segments never visibly regrew with Wound Weave (SP1)
//    equipped. ROOT CAUSE: the live game stores SP1 as 'slow' (the
//    fighters-screen star buttons write 'slow'/'long', and index.html's
//    star radios are value="slow"/"long"), but aegisHasSP1 only accepted
//    'sp1' — so the regen gate in updateAegisSystems was false forever.
//    The PR #62 suite passed only because it mocked starChoice='sp1'
//    directly. Fix accepts the real stored values ('slow'/'sp1',
//    'long'/'sp2'), matching the codebase convention elsewhere.
//    SP2 had the identical latent bug (Sundered Guard never triggered
//    live) and is fixed the same way.
//  * Regrowing segments also glow brighter while SP1 is active, so the
//    slow refill reads on screen as it happens.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
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
  throw new Error('unbalanced ' + name);
}

// ---------- source checks ----------
check('aegisHasSP1 accepts slow (live UI value)', /function aegisHasSP1\(entity\) \{[^}]*'slow'/.test(game));
check('aegisHasSP1 still accepts sp1', /function aegisHasSP1\(entity\) \{[^}]*'sp1'/.test(game));
check('aegisHasSP2 accepts long (live UI value)', /function aegisHasSP2\(entity\) \{[^}]*'long'/.test(game));
check('aegisHasSP2 still accepts sp2', /function aegisHasSP2\(entity\) \{[^}]*'sp2'/.test(game));
const drawSrc = game.slice(game.indexOf('function drawAegisBubbles(ctx)'), game.indexOf('function drawAegisBubbles(ctx)') + 4000);
check('drawAegisBubbles draws device bar from deviceHp/deviceMaxHp', drawSrc.includes('bubble.deviceHp') && drawSrc.includes('bubble.deviceMaxHp') && drawSrc.includes('devicePct'));
check('device bar has track + gold fill + white border', drawSrc.includes("fillRect(-36, -AEGIS_DEVICE_RADIUS - 14, 72, 6)") && drawSrc.includes('72 * devicePct') && drawSrc.includes("strokeRect(-36, -AEGIS_DEVICE_RADIUS - 14, 72, 6)"));
check('regrowing segments glow brighter', drawSrc.includes('regrowingSeg') && drawSrc.includes('shadowBlur = regrowingSeg ? 16 : 8'));
check('no placeholder text in aegis draw', !/coming soon|TBD/i.test(drawSrc));

// ---------- behavioral checks via vm ----------
let starChoice = 'none';
const entitiesById = new Map();
const sandbox = {
  console,
  performance: globalThis.performance,
  AEGIS_ENABLED: true,
  AEGIS_BUBBLE_RADIUS: 180,
  AEGIS_BUBBLE_SEGMENTS: 8,
  AEGIS_BUBBLE_SEGMENT_HP: 250,
  AEGIS_DEVICE_HP: 2200,
  AEGIS_DEVICE_RADIUS: 26,
  AEGIS_BUBBLE_REGEN_PER_SEC: 40,
  AEGIS_GADGET1_DASH_DISTANCE: 240,
  AEGIS_GADGET1_DASH_DURATION_MS: 200,
  AEGIS_GADGET1_DAMAGE: 900,
  AEGIS_GADGET1_SHIELD: 1500,
  aegisBubbles: [],
  bullets: [],
  explosions: [],
  player: null,
  bots: [],
  WORLD_W: 2000,
  WORLD_H: 2000,
  getEntityStarChoice: () => starChoice,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: () => {},
  findNearestOpenSpot: (x, y) => ({ x, y }),
  checkHit: () => {},
  grantShield: () => {},
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
};
vm.createContext(sandbox);
for (const fn of ['aegisStarChoice', 'aegisHasSP1', 'aegisHasSP2', 'aegisBubbleSegmentIndex', 'aegisMakeLayer', 'createAegisBubble', 'castAegisSuper', 'aegisBubbleSegmentAt', 'aegisBubbleBlocks', 'updateAegisDash', 'updateAegisSystems', 'drawAegisBubbles']) {
  vm.runInContext(extractFn(game, fn), sandbox);
}
const run = (code) => vm.runInContext(code, sandbox);

// SP gates with the REAL stored values.
starChoice = 'slow';
check("aegisHasSP1 true for 'slow' (live UI SP1 value)", run(`aegisHasSP1({id:1})`) === true);
starChoice = 'sp1';
check("aegisHasSP1 true for 'sp1'", run(`aegisHasSP1({id:1})`) === true);
starChoice = 'long';
check("aegisHasSP1 false for 'long'", run(`aegisHasSP1({id:1})`) === false);
starChoice = 'none';
check("aegisHasSP1 false for 'none'", run(`aegisHasSP1({id:1})`) === false);
starChoice = 'long';
check("aegisHasSP2 true for 'long' (live UI SP2 value)", run(`aegisHasSP2({id:1})`) === true);
starChoice = 'sp2';
check("aegisHasSP2 true for 'sp2'", run(`aegisHasSP2({id:1})`) === true);
starChoice = 'slow';
check("aegisHasSP2 false for 'slow'", run(`aegisHasSP2({id:1})`) === false);

// Regen with the live UI value 'slow' (the exact case that was broken).
function freshBubble(owner) {
  sandbox.player = owner;
  sandbox.bots = [];
  sandbox.aegisBubbles = [];
  run(`aegisBubbles.push(createAegisBubble({id:${owner.id}}, 1000, 1000, false))`);
  return sandbox.aegisBubbles[0];
}
const owner = { id: 1, hp: 5000, aegisDash: null };
let bub = freshBubble(owner);
bub.layers[0][0] = 0;
starChoice = 'slow';
run('updateAegisSystems(1)');
check("regen runs with 'slow': torn segment 0 -> 40 in 1s", bub.layers[0][0] === 40);
bub = freshBubble(owner);
bub.layers[0][0] = 0;
starChoice = 'sp1';
run('updateAegisSystems(1)');
check("regen runs with 'sp1': torn segment 0 -> 40 in 1s", bub.layers[0][0] === 40);
bub = freshBubble(owner);
bub.layers[0][0] = 0;
starChoice = 'long';
run('updateAegisSystems(1)');
check('no regen with SP2 (long) equipped', bub.layers[0][0] === 0);
bub = freshBubble(owner);
bub.layers[0][0] = 0;
starChoice = 'none';
run('updateAegisSystems(1)');
check('no regen without SP1', bub.layers[0][0] === 0);
bub = freshBubble({ id: 1, hp: 0, aegisDash: null });
bub.layers[0][0] = 0;
starChoice = 'slow';
run('updateAegisSystems(1)');
check('no regen while owner dead', bub.layers[0][0] === 0);
bub = freshBubble(owner);
bub.layers[0][0] = 230;
starChoice = 'slow';
run('updateAegisSystems(1)');
check('regen caps at segment max 250', bub.layers[0][0] === 250);
// Hyper second layer also regrows.
bub = freshBubble(owner);
sandbox.aegisBubbles = [];
run('aegisBubbles.push(createAegisBubble({id:1}, 1000, 1000, true))');
bub = sandbox.aegisBubbles[0];
bub.layers[1][3] = 10;
starChoice = 'slow';
run('updateAegisSystems(1)');
check('hyper second layer regrows too', bub.layers[1][3] === 50);

// Device bar rendering with a recording fake canvas.
function fakeCtx() {
  const calls = [];
  const ctx = {
    calls,
    save() {}, restore() {}, translate() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, closePath() {},
    set fillStyle(v) { this._fill = v; },
    get fillStyle() { return this._fill; },
    set strokeStyle(v) { this._stroke = v; },
    get strokeStyle() { return this._stroke; },
    set globalAlpha(v) { this._alpha = v; },
    get globalAlpha() { return this._alpha; },
    set lineWidth(v) { this._lw = v; },
    get lineWidth() { return this._lw; },
    set shadowBlur(v) { this._blur = v; },
    get shadowBlur() { return this._blur; },
    fillRect(x, y, w, h) { calls.push({ kind: 'fill', fill: this._fill, x, y, w, h }); },
    strokeRect(x, y, w, h) { calls.push({ kind: 'strokeRect', stroke: this._stroke, x, y, w, h }); },
    stroke() { calls.push({ kind: 'stroke', alpha: this._alpha, blur: this._blur }); },
  };
  return ctx;
}
function drawBubble(bubble, ownerObj, choice) {
  sandbox.player = ownerObj;
  sandbox.bots = [];
  sandbox.aegisBubbles = [bubble];
  starChoice = choice;
  const ctx = fakeCtx();
  sandbox._ctx = ctx;
  run('drawAegisBubbles(_ctx)');
  return ctx.calls;
}
const barOwner = { id: 1, hp: 5000, aegisDash: null };
let b = freshBubble(barOwner);
let calls = drawBubble(b, barOwner, 'slow');
let goldFills = calls.filter((c) => c.kind === 'fill' && c.fill === '#f0b429' && c.h === 6);
check('device bar full at 2200 HP (gold fill 72 wide)', goldFills.some((c) => c.w === 72));
b = freshBubble(barOwner);
b.deviceHp = 1100;
calls = drawBubble(b, barOwner, 'slow');
goldFills = calls.filter((c) => c.kind === 'fill' && c.fill === '#f0b429' && c.h === 6);
check('device bar half at 1100 HP (gold fill 36 wide)', goldFills.some((c) => c.w === 36));
b = freshBubble(barOwner);
b.deviceHp = 0;
calls = drawBubble(b, barOwner, 'slow');
goldFills = calls.filter((c) => c.kind === 'fill' && c.fill === '#f0b429' && c.h === 6);
check('device bar empty at 0 HP (gold fill 0 wide)', goldFills.some((c) => c.w === 0));
calls = drawBubble(b, barOwner, 'slow');
check('device bar track always drawn (dark 72-wide track)', calls.some((c) => c.kind === 'fill' && c.fill === 'rgba(0, 0, 0, 0.6)' && c.w === 72));
// Regrowing segment glow: partial segment, SP1 owner -> brighter blur/alpha.
b = freshBubble(barOwner);
b.layers[0][0] = 100;
calls = drawBubble(b, barOwner, 'slow');
const glowStrokes = calls.filter((c) => c.kind === 'stroke' && c.blur === 16);
check('regrowing partial segment glows (blur 16) with SP1', glowStrokes.length > 0);
calls = drawBubble(b, barOwner, 'none');
const plainStrokes = calls.filter((c) => c.kind === 'stroke' && c.blur === 8);
check('no regrow glow without SP1 (blur 8)', plainStrokes.length > 0);

// Device HP stays distinct from segment HP.
b = freshBubble(barOwner);
const segBullet = { x: 1000 + 185, y: 1000, vx: -800, vy: 0, ownerId: 99, life: 1, damage: 100 };
run('aegisBubbleBlocks(' + JSON.stringify(segBullet).replace(/"/g, "'") + ')');
check('segment hit drops segment HP, device HP untouched', b.layers[0][0] === 150 && b.deviceHp === 2200);
b = freshBubble(barOwner);
b.layers[0] = [0, 0, 0, 0, 0, 0, 0, 0];
const devBullet = { x: 1000 + 20, y: 1000, vx: 0, vy: 0, ownerId: 99, life: 1, damage: 500 };
run('aegisBubbleBlocks(' + JSON.stringify(devBullet).replace(/"/g, "'") + ')');
check('device hit drops device HP, segment HP untouched', b.deviceHp === 1700 && b.layers[0].every((v) => v === 0));

console.log(`aegis-blockshot-fix-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
process.exit(0);
