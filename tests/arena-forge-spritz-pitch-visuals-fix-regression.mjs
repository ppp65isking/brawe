// Spritz + Pitch VISUAL FIX regression (2026-11-23, Anthony's playtest
// verdict: "It's just generic white and purple dots").
// Root causes, all in the real render flow:
//   A. The PR #183 bullet art for Spritz (teardrop stream / shell shots,
//      hose blast, Hyper main) and Pitch (purple-diamond shards) sat nested
//      INSIDE the kage owner branch, so with ownerBrawler 'spritz'/'pitch'
//      they never ran and fell through to the white-dot generic fallback.
//      The branches are now hoisted to top-level owner branches, without
//      kage's time-based spin pre-rotation (the teardrop rotates only by
//      its own flight angle).
//   B. The simplify gate flattened every non-warning explosion to a generic
//      dot once >28 live explosions existed on a touch device — killing the
//      spritzWaterBlast / spritzModeSwap / pitchHexBurst / pitchPigSpawn
//      branches through most of a busy fight. Those four fxKinds are now
//      whitelisted out of the simple-dot path.
//   C. The hex pot spun twice per flight, blurring rim + handle into a
//      purple ball. It now tilts gently (max ~20deg) and is wider than tall.
//   D. (readability, verified running) The shell spiral was low-contrast
//      dark-on-sky-blue and the G1 pool was faint: white rim +
//      high-contrast spiral, brighter fill + a third ripple.
// Visuals only: no kit, numbers, ranges, damage, timings, or mechanics
// change. Shell 180px spawn-away and the storm Play Again fix are untouched.
// Builder picks (flagged for his correction): pot tilt 0.35 rad, pot body
// ellipse 15x11, rim ellipse 12x8.5, shell rim r=10 lw=2 white, spiral
// lw=3 white (non-hyper) / #0284c7 (hyper), G1 fill 0.28, ripples alpha
// 0.75 lw=3, 3 ripples at 0.3/0.6/0.9 x radius, spritz/pitch fallback orbs
// r=8 (#38bdf8 / #a855f7).
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

// Brace-matching extractor: returns the block starting at the first '{'
// at/after `marker` (for `function name(` or `if (...) {` markers).
function extractBlock(src, marker) {
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, marker + ' not found');
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
  throw new Error('unbalanced braces after ' + marker);
}

function stubCtx() {
  const calls = [];
  const sets = [];
  return {
    calls, sets,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop: (...args) => { calls.push({ m: String(prop) + '.addColorStop', args }); } });
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}

// Run an extracted bullet-branch block with a mock bullet + mock ctx.
// The block ends in `continue`, so it runs inside a 1-iteration for loop.
function runBulletBlock(block, bullet) {
  const s = stubCtx();
  const fn = vm.runInNewContext(
    '(function(b, ctx, performance){ for (let _once = 0; _once < 1; _once++) {\n' + block + '\n} })',
    { console },
  );
  fn(bullet, s.proxy, { now: () => 1000 });
  return s;
}

// ---------------------------------------------------------- 1. source pins: hoist
const kageStart = game.indexOf("else if (b.ownerBrawler === 'kage') {");
const kageEnd = game.indexOf("else if (b.ownerBrawler === 'minigunnin')", kageStart);
const kageBlock = game.slice(kageStart, kageEnd);
check('cause A fixed: kage branch no longer contains any spritz/pitch art',
  !kageBlock.includes('isSpritzStream') && !kageBlock.includes('isSpritzHoseBlast')
  && !kageBlock.includes('isSpritzHyperMain') && !kageBlock.includes('isPitchShard'));
check('cause A fixed: kage keeps its own art (giant star, shard, ninja star)',
  kageBlock.includes('b.isKageGiantStar') && kageBlock.includes('b.isKageShard')
  && kageBlock.includes('Regular Ninja Star'));
const spritzBranchAt = game.indexOf("if (b.ownerBrawler === 'spritz') {");
const pitchBranchAt = game.indexOf("if (b.ownerBrawler === 'pitch') {");
const fallbackAt = game.indexOf("ctx.fillStyle = b.hyperVisual ? '#e0f' : (b.super ? '#ffd166' : (b.ownerId===player.id ? '#ffffff' : '#ffb3b3'));");
check('cause A fixed: top-level spritz + pitch owner branches exist before the white-dot fallback',
  spritzBranchAt !== -1 && pitchBranchAt !== -1 && fallbackAt !== -1
  && spritzBranchAt < fallbackAt && pitchBranchAt < fallbackAt);
check('cause A fixed: spritz branch has no kage spin pre-rotation (teardrop rotates by flight angle only)',
  game.slice(spritzBranchAt, pitchBranchAt).includes('ctx.rotate(spritzAng);')
  && !game.slice(spritzBranchAt, pitchBranchAt).includes('ctx.rotate(spin)'));
check('spritz/pitch fallback orbs are water/purple, never white dots',
  game.includes("ctx.fillStyle = '#38bdf8';") && game.includes("ctx.fillStyle = '#a855f7';"));

// ---------------------------------------------------------- 2. source pins: simplify whitelist
check('cause B fixed: the four custom fxKinds are whitelisted out of the simplify dot',
  game.includes("const SPRITZ_PITCH_CUSTOM_FX = new Set(['spritzWaterBlast', 'spritzModeSwap', 'pitchHexBurst', 'pitchPigSpawn', 'gameboardZoneLand', 'gameboardQueenBurst', 'gameboardBounceRelease', 'gameboardBishopLaunch']);")
  && game.includes('!SPRITZ_PITCH_CUSTOM_FX.has(ex.fxKind)'));
check('cause B fixed: simplify threshold itself unchanged (28 touch / 80 desktop)',
  game.includes('const simplifyExplosionFx = explosions.length > (LOW_POWER_DEVICE ? 28 : 80);'));

// ---------------------------------------------------------- 3. source pins: pot / shell / G1
check('cause C fixed: pot no longer spins twice per flight',
  !game.includes('ctx.rotate(progress * Math.PI * 4);')
  && game.includes('ctx.rotate(Math.sin(progress * Math.PI) * 0.35);'));
check('cause C fixed: pot body + rim are wider-than-tall ellipses, not circles',
  game.includes('ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2);')
  && game.includes('ctx.ellipse(0, 0, 12, 8.5, 0, 0, Math.PI * 2);'));
check('shell readability: white rim + high-contrast thicker spiral',
  game.includes("ctx.strokeStyle = '#ffffff';") && game.includes("ctx.strokeStyle = s.hyper ? '#0284c7' : '#ffffff';")
  && game.includes('ctx.arc(0, 0, 6.5, 0.5, Math.PI * 2 + 0.5);'));
check('G1 readability: brighter fill, stronger third ripple',
  game.includes("ctx.fillStyle = 'rgba(56,189,248,0.28)';")
  && game.includes('for (let r = 1; r <= 3; r++) {')
  && game.includes('const rippleR = c.r * (0.3 * r)'));
check('kit untouched: shell spawn-away 180px / 300ms / 40px arc / 150px floor still in place',
  game.includes('const SPRITZ_SUPER_SHELL_DISTANCE = 180;') && game.includes('const SPRITZ_SHELL_FLIGHT_MS = 300;')
  && game.includes('const SPRITZ_SHELL_ARC_HEIGHT = 40;') && game.includes('const SPRITZ_SHELL_MIN_DISTANCE = 150;'));
check('no Brawl Stars wording in the Spritz/Pitch blocks',
  !game.slice(game.indexOf('// ===== Spritz systems'), game.indexOf('// ===== Christmas Showdown buffs')).includes('Brawl Stars'));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'clus' + 'ter'}\\b`).test(game));
check('zero bare word-boundary deleted-name in game.js', !new RegExp(`\\b${'w' + 'itch'}\\b`, 'i').test(game));

// ---------------------------------------------------------- 4. executed: bullet branches
try {
  const spritzBlock = extractBlock(game, "if (b.ownerBrawler === 'spritz') {");
  const pitchBlock = extractBlock(game, "if (b.ownerBrawler === 'pitch') {");
  const kageExtract = extractBlock(game, "if (b.ownerBrawler === 'kage') {");

  const stream = runBulletBlock(spritzBlock, { ownerBrawler: 'spritz', isSpritzStream: true, x: 100, y: 100, vx: 1, vy: 0, hyperVisual: false });
  check('render (Spritz stream): teardrop path runs (quadratic curves + water-blue body)',
    stream.calls.some((c) => c.m === 'quadraticCurveTo')
    && stream.sets.some((s) => s.p === 'fillStyle' && s.v === '#38bdf8'));
  check('render (Spritz stream): white-dot fill does NOT run',
    !stream.sets.some((s) => s.p === 'fillStyle' && s.v === '#ffffff'));
  check('render (Spritz stream): no tumbling spin — exactly one rotate, by the flight angle (0 for vx=1,vy=0)',
    stream.calls.filter((c) => c.m === 'rotate').length === 1
    && stream.calls.filter((c) => c.m === 'rotate')[0].args[0] === 0);

  const shellShot = runBulletBlock(spritzBlock, { ownerBrawler: 'spritz', isSpritzShellShot: true, x: 100, y: 100, vx: 0, vy: 1, hyperVisual: false });
  check('render (Spritz shell shot): teardrop path runs, no white dot',
    shellShot.calls.some((c) => c.m === 'quadraticCurveTo')
    && !shellShot.sets.some((s) => s.p === 'fillStyle' && s.v === '#ffffff'));

  const hose = runBulletBlock(spritzBlock, { ownerBrawler: 'spritz', isSpritzHoseBlast: true, x: 100, y: 100, vx: 1, vy: 0, hyperVisual: false });
  check('render (Spritz hose blast): three-drop spray runs in hose blue',
    hose.calls.filter((c) => c.m === 'arc').length === 3
    && hose.sets.some((s) => s.p === 'fillStyle' && s.v === '#7dd3fc'));

  const hyper = runBulletBlock(spritzBlock, { ownerBrawler: 'spritz', isSpritzHyperMain: true, x: 100, y: 100, vx: 1, vy: 0, hyperVisual: true });
  check('render (Spritz Hyper main): big glowing droplet (r=14) + halo (r=20) run',
    hyper.calls.some((c) => c.m === 'arc' && c.args[2] === 14)
    && hyper.calls.some((c) => c.m === 'arc' && c.args[2] === 20));

  const shard = runBulletBlock(pitchBlock, { ownerBrawler: 'pitch', isPitchShard: true, x: 100, y: 100, vx: 1, vy: 0, hyperVisual: false });
  check('render (Pitch shard): purple diamond + green core run',
    shard.sets.some((s) => s.p === 'fillStyle' && s.v === '#c084fc')
    && shard.sets.some((s) => s.p === 'fillStyle' && s.v === '#86efac'));
  check('render (Pitch shard): white-dot fill does NOT run',
    !shard.sets.some((s) => s.p === 'fillStyle' && s.v === '#ffffff'));

  const kage = runBulletBlock(kageExtract, { ownerBrawler: 'kage', isKageShard: true, x: 100, y: 100, vx: 1, vy: 0, hyperVisual: false });
  check('render (Kage control): kage shard still renders its own silver art, no spritz water-blue leaks in',
    kage.sets.some((s) => s.p === 'fillStyle' && s.v === '#f1f5f9')
    && !kage.sets.some((s) => s.p === 'fillStyle' && s.v === '#38bdf8'));
} catch (e) { failures.push('bullet-branch execution threw: ' + e.message); }

// ---------------------------------------------------------- 5. executed: simplify condition
try {
  const setSrc = game.slice(game.indexOf('const SPRITZ_PITCH_CUSTOM_FX ='), game.indexOf(';', game.indexOf('const SPRITZ_PITCH_CUSTOM_FX =')) + 1);
  const condMatch = game.match(/if \((simplifyExplosionFx && !preserveWarningDetail && !ex\.isParticle && !ex\.isSteamPuff && !SPRITZ_PITCH_CUSTOM_FX\.has\(ex\.fxKind\))\) \{/);
  assert.ok(condMatch, 'simplify condition not found');
  const cond = condMatch[1];
  // Evaluate the REAL condition text from game.js (not a copy of it).
  const evalCond = (fxKind, simple = true) => vm.runInNewContext(
    setSrc + '\n(' + cond + ')',
    { simplifyExplosionFx: simple, preserveWarningDetail: false, ex: { fxKind, isParticle: false, isSteamPuff: false } },
  );
  for (const kind of ['spritzWaterBlast', 'spritzModeSwap', 'pitchHexBurst', 'pitchPigSpawn']) {
    check(`simplify (touch, 29+ explosions): ${kind} does NOT take the generic-dot path`, evalCond(kind) === false);
  }
  check('simplify (touch, 29+ explosions): a generic explosion still takes the simple-dot path', evalCond('genericBoom') === true);
  check('simplify off (few explosions): a generic explosion does NOT take the simple-dot path', evalCond('genericBoom', false) === false);
} catch (e) { failures.push('simplify-condition execution threw: ' + e.message); }

// ---------------------------------------------------------- 6. executed: shell / G1 / pot renders
try {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const nowMs = 100000;
  const player = { id: 'p1', x: 0, y: 0, hp: 5200, brawler: 'spritz', radius: 14, isHypercharged: false };
  const sandbox = {
    console, Math, performance: { now: () => nowMs }, clamp,
    player, bots: [], isHypercharged: false,
    spritzMists: [], spritzShells: [], spritzWaterCircles: [],
    pitchThrownHexes: [], pitchPendingEchoes: [],
    isSpritz: (e) => e && e.brawler === 'spritz',
    isPitch: (e) => e && e.brawler === 'pitch',
    PITCH_THROW_ARC_HEIGHT: Number(game.match(/const PITCH_THROW_ARC_HEIGHT = (\d+);/)[1]),
    PITCH_SHARD_RANGE_PX: Number(game.match(/const PITCH_SHARD_RANGE_PX = (\d+);/)[1]),
    SPRITZ_SHELL_ARC_HEIGHT: Number(game.match(/const SPRITZ_SHELL_ARC_HEIGHT = (\d+);/)[1]),
  };
  sandbox.spritzShellFlightPos = vm.runInNewContext(
    '(' + extractBlock(game, 'function spritzShellFlightPos(') + ')', sandbox,
  );
  const renderSpritz = vm.runInNewContext(
    '(' + extractBlock(game, 'function renderSpritzEffects(') + ')', sandbox,
  );
  const renderPitch = vm.runInNewContext(
    '(' + extractBlock(game, 'function renderPitchEffects(') + ')', sandbox,
  );
  sandbox.ctx = null;

  const s1 = stubCtx();
  sandbox.ctx = s1.proxy;
  sandbox.spritzShells = [{ x: 680, y: 500, fromX: 500, fromY: 500, createdAt: nowMs, landAt: nowMs + 300, ownerId: 'p1', hyper: false }];
  sandbox.spritzWaterCircles = [{ x: 300, y: 300, r: 160, ownerId: 'p1', until: nowMs + 4000, nextTickAt: 0 }];
  renderSpritz();
  check('render (Spritz): shell white rim + white spiral run, old deep-blue spiral gone',
    s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#ffffff')
    && !s1.sets.some((s) => s.p === 'strokeStyle' && s.v === '#075985'));
  check('render (Spritz): G1 pool fill is the brighter 0.28 + third ripple (alpha 0.75, lw 3)',
    s1.sets.some((s) => s.p === 'fillStyle' && s.v === 'rgba(56,189,248,0.28)')
    && s1.sets.some((s) => s.p === 'globalAlpha' && s.v === 0.75)
    && s1.sets.some((s) => s.p === 'lineWidth' && s.v === 3));

  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.pitchThrownHexes = [{ startX: 500, startY: 500, targetX: 900, targetY: 500, createdAt: nowMs - 100, impactAt: nowMs + 264, ownerId: 'p1', hyper: false, crossArmed: false, echoArmed: false, curve: false }];
  renderPitch();
  const potRotates = s2.calls.filter((c) => c.m === 'rotate');
  check('render (Pitch): pot rotates at most ~20deg (gentle tilt, never a 2-spin blur)',
    potRotates.length === 1 && Math.abs(potRotates[0].args[0]) <= 0.36);
  check('render (Pitch): pot body is the 15x11 ellipse, rim the 12x8.5 ellipse',
    s2.calls.some((c) => c.m === 'ellipse' && c.args[2] === 15 && c.args[3] === 11)
    && s2.calls.some((c) => c.m === 'ellipse' && c.args[2] === 12 && c.args[3] === 8.5));
  check('render (Pitch): pot rim still uses the deep purple',
    s2.sets.some((s) => s.p === 'strokeStyle' && s.v === '#7e22ce'));
} catch (e) { failures.push('effect-render execution threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS arena-forge-spritz-pitch-visuals-fix-regression.mjs (${passed} checks)`);
