// Mallow G2/SP2 regression — replaces the two placeholder loadout slots
// (ordered 2026-10-26 after Anthony flagged placeholders shipping).
// G2 Early Pop: instantly detonate all live trail puffs, 14s cooldown.
// SP2 Long Simmer: volley slow lasts 1.5s per hit instead of 1s.
// Nothing else changes: burn/explosion/mini/fan/fuse/HP/damage untouched.
// Helpers are EXECUTED in a vm (PR #45 pattern: tests do not run the
// frame loop, so behavior helpers must be executed directly).
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
  throw new Error('unbalanced braces in ' + name);
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. source pins
check('SP2 slow constant is 1500ms', game.includes('const MALLOW_SLOW_DURATION_SP2_MS = 1500;'));
check('SP2 helper accepts sp2 and long aliases',
  game.includes("function mallowHasSP2(entity) { const c = mallowStarChoice(entity); return c === 'sp2' || c === 'long'; }"));
check('slow application uses SP2 duration for SP2 owners',
  game.includes('target.mallowSlowUntil = now + (owner && mallowHasSP2(owner) ? MALLOW_SLOW_DURATION_SP2_MS : MALLOW_SLOW_DURATION_MS);'));
check('SP2 helper referenced only in its definition and the slow line',
  (game.match(/mallowHasSP2/g) || []).length === 2);
check('G2 detonate helper exists', game.includes('function detonateMallowPuff(puff, now) {'));
check('G2 execute function exists', game.includes('function executeMallowG2(entity) {'));
let detonateSrc = '';
try { detonateSrc = extractFn(game, 'detonateMallowPuff'); } catch (_) { detonateSrc = ''; }
check('detonate helper keeps ally guard + damage + animation + hyper minis',
  detonateSrc.includes('areAlliedEntities(owner, target)') &&
  detonateSrc.includes('MALLOW_TRAIL_EXPLOSION_DAMAGE') &&
  detonateSrc.includes('mallowExplosions.push') &&
  detonateSrc.includes('if (puff.hyper) spawnMallowMinis(puff, now);'));
check('timed explosion routes through the same helper',
  game.includes('if (now >= puff.explodeAt && !puff.exploded) {\n                detonateMallowPuff(puff, now);'));
check('player G2 dispatch uses the per-brawler map value + slot setter',
  game.includes("curBrawler === 'mallow' && curGadget === 'g2'") &&
  game.includes("gadgetCooldownUntil = now + getGadgetCooldownMsForBrawler(curBrawler, curGadget);") &&
  game.includes('setPlayerGadgetCooldownUntil(gadgetCooldownUntil, curGadget);'));
check('bot G2 dispatch branch exists', game.includes("bot.brawler === 'mallow' && g === 'g2'"));
check('cooldown map gives G2 14s', game.includes('mallow: { g1: 12000, g2: 14000 },'));
check('def text: G2 is Early Pop', game.includes("g2: 'Early Pop (Instantly detonate all live trail puffs)'"));
check('def text: SP2 is Long Simmer', game.includes("sp2: 'Long Simmer (Volley slow lasts 1.5s per hit instead of 1s)'"));
check('no placeholder text remains anywhere',
  !game.includes('Second Tool coming soon.') && !game.includes('Second Talent coming soon.'));
check('untouched: burn 200, explosion 400, mini 150, fan 1.20, fuse 1320',
  game.includes('const MALLOW_TRAIL_BURN_DPS = 200;') &&
  game.includes('const MALLOW_TRAIL_EXPLOSION_DAMAGE = 400;') &&
  game.includes('const MALLOW_MINI_DAMAGE = 150;') &&
  game.includes('const MALLOW_VOLLEY_FAN_ARC = 1.20;') &&
  game.includes('const MALLOW_TRAIL_FUSE_MS = 1320;'));
check('untouched: HP 6800 / 320 / 270 and G1 6% / SP1 1.05',
  game.includes('hp: Math.round(6800 * scale), dmg: Math.round(320 * scale), speed: 270') &&
  game.includes('const MALLOW_SLOW_GADGET_PER_HIT = 0.06;') &&
  game.includes('? 1.05 : 1.0;'));
check('SP2 scope: slow function touches no burn/explosion/mini state',
  !/(BURN|EXPLOSION|MINI)/.test(extractFn(game, 'applyMallowSlowHit')));

// ---------------------------------------------------------- 2. vm: SP2 slow window
try {
  let nowValue = 100000;
  const sandbox = {
    Math,
    performance: { now: () => nowValue },
    getEntityStarChoice: (e) => (e && e.selectedStar) || 'none',
    MALLOW_ENABLED: true,
    MALLOW_SLOW_PER_HIT: 0.04,
    MALLOW_SLOW_GADGET_PER_HIT: 0.06,
    MALLOW_SLOW_DURATION_MS: 1000,
    MALLOW_SLOW_DURATION_SP2_MS: 1500,
    MALLOW_SLOW_MAX_STACKS: 8,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'mallowStarChoice') + '\n' +
    extractFn(game, 'mallowHasSP1') + '\n' +
    extractFn(game, 'mallowHasSP2') + '\n' +
    extractFn(game, 'getMallowSlowMultiplier') + '\n' +
    extractFn(game, 'applyMallowSlowHit') + '\n' +
    extractFn(game, 'getMallowSp1SpeedMult'),
    sandbox);
  const noneOwner = { hp: 6800, selectedStar: 'none' };
  const t0 = { hp: 6800 };
  sandbox.applyMallowSlowHit(t0, noneOwner, { mallowSlowPerHit: 0.04 });
  check('SP2: no-SP2 owner still gets a 1s window', t0.mallowSlowUntil === 101000);
  const sp2Owner = { hp: 6800, selectedStar: 'sp2' };
  const t1 = { hp: 6800 };
  sandbox.applyMallowSlowHit(t1, sp2Owner, { mallowSlowPerHit: 0.04 });
  check('SP2: sp2 owner gets a 1.5s window', t1.mallowSlowUntil === 101500);
  check('SP2: per-hit slow unchanged (still 4%)', near(sandbox.getMallowSlowMultiplier(t1, 100000), 0.96));
  const longOwner = { hp: 6800, selectedStar: 'long' };
  const t2 = { hp: 6800 };
  sandbox.applyMallowSlowHit(t2, longOwner, { mallowSlowPerHit: 0.04 });
  check('SP2: long alias also gets a 1.5s window', t2.mallowSlowUntil === 101500);
  const sp1Owner = { hp: 6800, selectedStar: 'sp1' };
  const t3 = { hp: 6800 };
  sandbox.applyMallowSlowHit(t3, sp1Owner, { mallowSlowPerHit: 0.04 });
  check('SP2: sp1 owner keeps a 1s window (no leak)', t3.mallowSlowUntil === 101000);
  check('SP2: sp1 speed window stays 1s', sp1Owner.mallowSp1SpeedUntil === 101000);
  for (let k = 0; k < 7; k++) sandbox.applyMallowSlowHit(t1, sp2Owner, { mallowSlowPerHit: 0.04 });
  check('SP2: stacks still cap at 8', t1.mallowSlowStacks === 8);
  check('SP2: 8 hits still 32% (mult 0.68)', near(sandbox.getMallowSlowMultiplier(t1, 100000), 0.68));
  check('SP2: slow still live at 1.4s (past old 1s expiry)', near(sandbox.getMallowSlowMultiplier(t1, 101400), 0.68));
  check('SP2: slow expired by 1.6s', near(sandbox.getMallowSlowMultiplier(t1, 101600), 1.0));
} catch (e) { failures.push('SP2 slow vm block threw: ' + e.message); }

// ---------------------------------------------------------- 3. vm: G2 detonation
try {
  const hits = [];
  const texts = [];
  const sandbox = {
    Math,
    performance: { now: () => 100000 },
    player: { id: 1, x: 210, y: 200, hp: 6800 },
    bots: [
      { id: 2, x: 230, y: 200, hp: 6800, radius: 14 },
      { id: 3, x: 1000, y: 1000, hp: 6800, radius: 14 },
    ],
    areAlliedEntities: () => false,
    checkHit: (target, bullet) => { hits.push({ targetId: target.id, damage: bullet.damage }); },
    spawnFloatingText: (x, y, text) => { texts.push(text); },
    mallowTrailPuffs: [],
    mallowExplosions: [],
    mallowMinis: [],
    MALLOW_TRAIL_EXPLOSION_RADIUS: 90,
    MALLOW_TRAIL_EXPLOSION_DAMAGE: 400,
    MALLOW_MINI_OFFSET: 55,
    MALLOW_MINI_FUSE_MS: 350,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    extractFn(game, 'findMallowEntityById') + '\n' +
    extractFn(game, 'spawnMallowMinis') + '\n' +
    extractFn(game, 'detonateMallowPuff') + '\n' +
    extractFn(game, 'executeMallowG2'),
    sandbox);
  const entity = { id: 1, x: 210, y: 200, hp: 6800 };
  sandbox.mallowTrailPuffs = [
    { x: 200, y: 200, ownerId: 1, placedAt: 99000, explodeAt: 101320, radius: 26, hyper: false, hitAt: {}, exploded: false },
    { x: 260, y: 200, ownerId: 1, placedAt: 99000, explodeAt: 101320, radius: 26, hyper: false, hitAt: {}, exploded: false },
    { x: 320, y: 200, ownerId: 1, placedAt: 99000, explodeAt: 101320, radius: 36, hyper: true, hitAt: {}, exploded: false },
    { x: 500, y: 500, ownerId: 99, placedAt: 99000, explodeAt: 101320, radius: 26, hyper: false, hitAt: {}, exploded: false },
  ];
  sandbox.executeMallowG2(entity);
  check('G2: all own live puffs detonated (array drained of own puffs)', sandbox.mallowTrailPuffs.length === 1);
  check('G2: other-owner puff left untouched', sandbox.mallowTrailPuffs[0].ownerId === 99);
  check('G2: 3 explosion animations pushed', sandbox.mallowExplosions.length === 3);
  check('G2: in-range enemy took 3x400 explosion damage',
    hits.filter((h) => h.targetId === 2 && h.damage === 400).length === 3);
  check('G2: out-of-range enemy took nothing', hits.every((h) => h.targetId !== 3));
  check('G2: owner took nothing (owner-skip)', hits.every((h) => h.targetId !== 1));
  check('G2: floating confirmation shown', texts.includes('EARLY POP!'));
  check('G2: hyper puff released 4 minis in + shape',
    sandbox.mallowMinis.length === 4 &&
    sandbox.mallowMinis.some((m) => m.x === 375 && m.y === 200) &&
    sandbox.mallowMinis.some((m) => m.x === 265 && m.y === 200) &&
    sandbox.mallowMinis.some((m) => m.x === 320 && m.y === 255) &&
    sandbox.mallowMinis.some((m) => m.x === 320 && m.y === 145));
  check('G2: minis fuse 350ms from detonation', sandbox.mallowMinis.every((m) => m.explodeAt === 100350));
  // No-puffs case: still shows text, changes nothing, does not throw.
  const hitsBefore = hits.length;
  const expBefore = sandbox.mallowExplosions.length;
  sandbox.mallowTrailPuffs = sandbox.mallowTrailPuffs.filter((p) => p.ownerId !== 1);
  sandbox.mallowTrailPuffs = [];
  sandbox.executeMallowG2(entity);
  check('G2: no puffs -> no damage, no explosions, still shows text',
    hits.length === hitsBefore && sandbox.mallowExplosions.length === expBefore && texts.filter((t) => t === 'EARLY POP!').length === 2);
  // Already-exploded puff is a no-op (no double damage).
  const dead = { x: 230, y: 200, ownerId: 1, placedAt: 99000, explodeAt: 101320, radius: 26, hyper: false, hitAt: {}, exploded: true };
  const hitsBefore2 = hits.length;
  sandbox.detonateMallowPuff(dead, 100000);
  check('G2: already-exploded puff detonates to nothing', hits.length === hitsBefore2);
} catch (e) { failures.push('G2 detonation vm block threw: ' + e.message); }

console.log(`mallow-g2sp2-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
