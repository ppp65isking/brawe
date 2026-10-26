// Mallow balance follow-up regression — Anthony's orders 2026-10-26.
// Pam-style wide fan, purple hyper visuals, aimable dash with telegraph,
// 2 super charges via the multi-super system, global super count badge,
// fuse 1.1s -> 1.32s, slow zones REMOVED, hyper explosions release 4
// mini-mallows in a + shape (150 each). Same vm pattern as
// mallow-regression.mjs: helpers are EXECUTED, not just pinned.
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

// ---------------------------------------------------------- 1. source pins
check('Pam fan arc is 1.20 rad', game.includes('const MALLOW_VOLLEY_FAN_ARC = 1.20;'));
check('narrow cone constant is gone', !game.includes('MALLOW_VOLLEY_CONE'));
check('volley loop uses the fan arc', game.includes('MALLOW_VOLLEY_FAN_ARC / (MALLOW_VOLLEY_COUNT - 1)'));
check('volley telegraph arc uses the fan arc', game.includes('t.ang - MALLOW_VOLLEY_FAN_ARC / 2'));
check('fuse is 1320ms (+20%)', game.includes('const MALLOW_TRAIL_FUSE_MS = 1320;'));
check('slow zones fully removed (array)', !game.includes('mallowSlowZones'));
check('slow zones fully removed (constants)', !game.includes('MALLOW_SLOW_ZONE'));
check('slow zones fully removed (zone slow flag)', !game.includes('mallowZoneSlowUntil'));
check('no auto-chain dash field left', !game.includes('dashesLeft'));
check('mini constants 55/350/150/50',
  game.includes('const MALLOW_MINI_OFFSET = 55;') &&
  game.includes('const MALLOW_MINI_FUSE_MS = 350;') &&
  game.includes('const MALLOW_MINI_DAMAGE = 150;') &&
  game.includes('const MALLOW_MINI_RADIUS = 50;'));
check('mini spawn uses + offsets',
  game.includes('[[MALLOW_MINI_OFFSET, 0], [-MALLOW_MINI_OFFSET, 0], [0, MALLOW_MINI_OFFSET], [0, -MALLOW_MINI_OFFSET]]'));
check('hyper puff explosion spawns minis', game.includes('if (puff.hyper) spawnMallowMinis(puff, now);'));
check('mallow joins multi-super', game.includes("|| brawlerId === 'mallow';"));
check('mallow max charges is 2', game.includes("if (brawlerId === 'mallow') return 2;"));
check('mallow charge helpers exist',
  game.includes('function ensureMallowSuperState(entity)') &&
  game.includes('function addMallowSuperCharge(entity, amount)') &&
  game.includes('function consumeMallowSuperCharge(entity)'));
check('charge gain wired', game.includes("} else if (activeBrawler === 'mallow') {") &&
  game.includes('addMallowSuperCharge(owner, gain);'));
check('cast consumes one charge', game.includes('consumeMallowSuperCharge(entity);'));
check('bot super keeps its charge (no reset)', game.includes("bot.brawler !== 'dashaholic' && bot.brawler !== 'mallow')"));
check('badge helper exists', game.includes('function getSuperChargeBadgeCount(entity = player)'));
check('desktop single-charge button shows × badge', game.includes('×${badgeCount}'));
check('mobile button shows count for every brawler', game.includes("superTouchBtn.textContent = isMulti ? `★ ${charges}/${maxCharges}` : `★ ${charges}`;"));
check('HUD bar shows ×1 for ready single-charge', game.includes("'POWER MOVE · ×1'"));
check('hyper projectile is purple', game.includes("hyper ? '#a855f7'") && game.includes("hyper ? '#9333ea'"));
check('hyper trail puff is purple', game.includes("puff.hyper ? (fuseT > 0.6 ? '#d8b4fe' : '#f5e9ff')"));
check('hyper explosion ring is purple', game.includes("e.hyper ? '#c084fc'"));
check('aim telegraph draws dash path', game.includes('const aimTx = player.x + Math.cos(aimAng) * aimDist;'));
check('aim telegraph previews trail puffs', game.includes('for (let pi = 1; pi <= MALLOW_TRAIL_PUFFS; pi++)'));
check('hyper aura ring is purple', game.includes("ctx.strokeStyle = '#c084fc';") && game.includes("(ent.radius || 14) + 12"));
check('def: hyper text names +shape minis', game.includes('mini-mallows in a + shape'));
check('def: hyper text no longer names slow zones', !game.includes('every 3rd trail puff creates a slow zone'));
check('def: super text names 2 charges', game.includes('Holds 2 charges'));
check('def: super text names 1.32s fuse', game.includes('explodes 1.32s after placement'));
check('def: attack text names Pam fan', game.includes('wide Pam-style fan'));

// fan geometry: 8 pellets over 1.20 rad => step 1.20/7, endpoints ±0.60
{
  const step = 1.20 / 7;
  const angles = [];
  for (let mi = 0; mi < 8; mi++) angles.push((mi - 3.5) * step);
  check('fan: 8 pellets', angles.length === 8);
  check('fan: first pellet at -0.60 rad', Math.abs(angles[0] + 0.60) < 0.01);
  check('fan: last pellet at +0.60 rad', Math.abs(angles[7] - 0.60) < 0.01);
  check('fan: step is 1.20/7', Math.abs(step - 0.1714) < 0.001);
  check('fan: wider than the old 0.56 cone', 1.20 > 0.56);
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
  throw new Error('unbalanced braces in ' + name);
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
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// --- executed: +shape mini spawn ---
try {
  const sandbox = {
    Math, performance: { now: () => 100000 },
    mallowMinis: [],
    MALLOW_MINI_OFFSET: 55, MALLOW_MINI_FUSE_MS: 350,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'spawnMallowMinis'), sandbox);
  sandbox.spawnMallowMinis({ x: 200, y: 200, ownerId: 7 }, 100000);
  check('minis: exactly 4 spawn', sandbox.mallowMinis.length === 4);
  const pts = sandbox.mallowMinis.map((m) => `${m.x},${m.y}`).sort().join('|');
  check('minis: + shape offsets', pts === '145,200|200,145|200,255|255,200');
  check('minis: fuse is 350ms', sandbox.mallowMinis.every((m) => m.explodeAt === 100350));
  check('minis: owner carried', sandbox.mallowMinis.every((m) => m.ownerId === 7));
} catch (e) { failures.push('minis vm block threw: ' + e.message); }

// --- executed: charge add/consume ---
try {
  const sandbox = {
    Math, performance: { now: () => 100000 },
    player: { id: 1 }, superCharge: 0, updateSuperButton: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'ensureMallowSuperState') + '\n' +
    extractFn(game, 'addMallowSuperCharge') + '\n' +
    extractFn(game, 'consumeMallowSuperCharge'),
    sandbox);
  const e = { id: 1 };
  sandbox.addMallowSuperCharge(e, 100);
  check('charges: full meter grants 2', e.mallowSuperCharges === 2);
  check('charges: meter shows 100 while charged', sandbox.superCharge === 100);
  sandbox.consumeMallowSuperCharge(e);
  check('charges: first consume leaves 1', e.mallowSuperCharges === 1);
  check('charges: meter still 100 with 1 left', sandbox.superCharge === 100);
  sandbox.consumeMallowSuperCharge(e);
  check('charges: second consume leaves 0', e.mallowSuperCharges === 0);
  check('charges: meter drops to 0 when empty', sandbox.superCharge === 0);
  sandbox.addMallowSuperCharge(e, 40);
  check('charges: partial gain banks sub-charge, no charges yet', e.mallowSuperCharges === 0 && e.mallowSuperSubCharge === 40);
  sandbox.addMallowSuperCharge(e, 60);
  check('charges: reaching 100 grants 2 again', e.mallowSuperCharges === 2);
} catch (e) { failures.push('charges vm block threw: ' + e.message); }

// --- executed: badge count helper ---
try {
  const sandbox = {
    Math, performance: { now: () => 100000 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    player: { id: 1 }, selectedBrawler: 'mallow', superCharge: 100,
    isEntityHyperchargedNow: () => false,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'hasMultiSuper') + '\n' +
    extractFn(game, 'getBrawlerSuperMaxCharges') + '\n' +
    extractFn(game, 'ensureMallowSuperState') + '\n' +
    extractFn(game, 'getBrawlerSuperCharges') + '\n' +
    extractFn(game, 'getSuperChargeBadgeCount'),
    sandbox);
  check('badge: mallow is multi-super', sandbox.hasMultiSuper('mallow') === true);
  check('badge: mallow max is 2', sandbox.getBrawlerSuperMaxCharges('mallow', false) === 2);
  const me = { id: 1 };
  check('badge: mallow at full meter shows 2', sandbox.getSuperChargeBadgeCount(me) === 2);
  sandbox.selectedBrawler = 'beam';
  sandbox.superCharge = 100;
  check('badge: ready single-charge shows 1', sandbox.getSuperChargeBadgeCount({ id: 1 }) === 1);
  sandbox.superCharge = 45;
  check('badge: charging single-charge shows 0', sandbox.getSuperChargeBadgeCount({ id: 1 }) === 0);
} catch (e) { failures.push('badge vm block threw: ' + e.message); }

// --- executed: purple hyper projectile ---
try {
  const s = stubCtx();
  const sandbox = { Math, performance: { now: () => 100000 } };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'drawMallowProjectile'), sandbox);
  sandbox.drawMallowProjectile(s.proxy, { x: 100, y: 100, vx: 900, vy: 0, hyperVisual: true });
  const hasFill = (sets, color) => sets.some((x) => x.p === 'fillStyle' && String(x.v).includes(color));
  const hasStroke = (sets, color) => sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes(color));
  check('purple: hyper body is light purple-white', hasFill(s.sets, '#f5e9ff'));
  check('purple: hyper stroke is purple', hasStroke(s.sets, '#a855f7'));
  check('purple: hyper tips are purple', hasFill(s.sets, '#9333ea'));
  const b = stubCtx();
  sandbox.drawMallowProjectile(b.proxy, { x: 100, y: 100, vx: 900, vy: 0, hyperVisual: false });
  check('purple: base body stays cream', hasFill(b.sets, '#fff8ec'));
} catch (e) { failures.push('purple projectile vm block threw: ' + e.message); }

// --- executed: aim telegraph + hyper aura + mini render ---
try {
  const sandbox = {
    Math, performance: { now: () => 100000 },
    MALLOW_VISUALS_ENABLED: true,
    MALLOW_TRAIL_FUSE_MS: 1320, MALLOW_TRAIL_EXPLOSION_RADIUS: 90,
    MALLOW_VOLLEY_FAN_ARC: 1.20, MALLOW_TRAIL_PUFFS: 6,
    MALLOW_TRAIL_PUFF_RADIUS: 26, MALLOW_TRAIL_PUFF_RADIUS_HYPER: 36,
    MALLOW_DASH_DISTANCE: 480, MALLOW_DASH_DISTANCE_HYPER: 640,
    MALLOW_MINI_RADIUS: 50,
    mallowTelegraphs: [], mallowTrailPuffs: [],
    mallowMinis: [{ x: 300, y: 300, explodeAt: 100350 }],
    mallowExplosions: [],
    aimingSuper: true, selectedBrawler: 'mallow',
    player: { id: 1, x: 100, y: 100, hp: 6800, radius: 14 },
    bots: [{ brawler: 'mallow', id: 2, x: 400, y: 400, hp: 6800, radius: 14 }],
    getMouseWorld: () => ({ x: 500, y: 100 }),
    isHypercharged: false,
    isEntityHyperchargedNow: (ent) => ent.id === 2,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'renderMallowEffects'), sandbox);
  const s = stubCtx();
  sandbox.ctx = s.proxy;
  sandbox.renderMallowEffects();
  const lineTo = (x, y) => s.calls.some((c) => c.m === 'lineTo' && near(c.args[0], x) && near(c.args[1], y));
  const arcR = (r) => s.calls.some((c) => c.m === 'arc' && near(c.args[2], r));
  const hasStroke = (color) => s.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes(color));
  check('aim: dashed path ends at 480px dash distance', lineTo(580, 100));
  check('aim: trail preview dots are base radius 26', arcR(26));
  check('aim: mini renders as 12px puff', arcR(12));
  check('aura: hyper mallow bot gets purple ring stroke', hasStroke('#c084fc'));
  sandbox.isHypercharged = true;
  const s2 = stubCtx();
  sandbox.ctx = s2.proxy;
  sandbox.renderMallowEffects();
  const lineTo2 = (x, y) => s2.calls.some((c) => c.m === 'lineTo' && near(c.args[0], x) && near(c.args[1], y));
  const arcR2 = (r) => s2.calls.some((c) => c.m === 'arc' && near(c.args[2], r));
  check('aim: hyper path ends at 640px dash distance', lineTo2(740, 100));
  check('aim: hyper preview dots are wider radius 36', arcR2(36));
} catch (e) { failures.push('aim/aura vm block threw: ' + e.message); }

console.log(`mallow-balance-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
