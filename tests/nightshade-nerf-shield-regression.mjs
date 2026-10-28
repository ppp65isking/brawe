// Nightshade nerf + Hyper shield + fighters-screen crash regression,
// built 2026-10-28 from Anthony's orders + the live crash report:
//  * FIGHTERS SCREEN CRASH: live error was `Uncaught TypeError: Cannot
//    read properties of undefined (reading 'toUpperCase')` at the fighters
//    banner's `selectedSpecial.type.toUpperCase()`. ROOT CAUSE: the
//    SPECIAL_ABILITY_DEFS table held two stray brawlerData-shaped entries
//    ('mallow' and 'nightshade': name/role/desc/attack/super/hyper/g1/g2/
//    sp1/sp2, NO `type` field). Selecting mallow or nightshade made
//    selectedSpecial truthy with .type undefined, so the banner threw and
//    the whole fighters screen died. The same strays would also crash the
//    Core Pieces shop loop (def.type.toUpperCase()) and the detail view's
//    special card. FIX: the two strays are DELETED from the table.
//  * MISSING ROSTER CARDS: brawlerData had NO mallow or nightshade entry,
//    so the fighters grid skipped them (warn+continue) and the banner fell
//    back to outlit. FIX: proper brawlerData entries, kit text carried over
//    from the deleted strays (nightshade's updated for the nerf + shield).
//    MALLOW G2/SP2 NOTE: the carried-over text is 'Second Tool coming
//    soon.' / 'Second Talent coming soon.' — previously INVISIBLE (mallow
//    had no card), now visible on mallow's card/detail. That is honest
//    current-state text, NOT invented mechanics: PR #54 (unmerged) is what
//    replaces those two slots with Early Pop / Long Simmer, and it will
//    need a rebase to edit brawlerData.mallow instead of the stray entry
//    this fix deletes. Using PR #54's text here would promise mechanics
//    that do not exist on this branch; omitting g2/sp2 would render
//    "undefined" buttons with dead selectable slots. The coming-soon text
//    is the least-bad option and is pinned explicitly below so it cannot
//    slip through unnoticed.
//  * NIGHTSHADE NERFS: main dmg 800 -> 640 (-20%, at the getScaledStats
//    base so level scaling stays consistent), main dagger speed 1000 ->
//    700 (-30%), super blade speed 900 -> 630 (-30%).
//  * HYPER REWORK (user-confirmed): homing on super return REMOVED
//    entirely. Replacement: while a Hypercharged Super's blades are out, a
//    120px shield zone around Nightshade blocks ENEMY projectiles; the
//    zone lasts until the daggers return (last blade spliced/expired).
//    Blades still deal damage out and back, wall-pierce stays, uncapped
//    poison stacks on Hypercharged main attacks stay. No other Nightshade
//    numbers change (cone, poison rate, blade damage/counts as merged).
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
// Extract the SPECIAL_ABILITY_DEFS object literal (comment-aware scan),
// including the Object.freeze closing paren, so it can be evaluated.
function extractSpecialDefs(src) {
  const start = src.indexOf('const SPECIAL_ABILITY_DEFS = Object.freeze({');
  assert.notEqual(start, -1, 'SPECIAL_ABILITY_DEFS not found');
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
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(src.indexOf('Object.freeze({', start), i + 2); }
  }
  throw new Error('unbalanced braces in SPECIAL_ABILITY_DEFS');
}
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ---------------------------------------------------------- 1. strays gone
check('stray single-line mallow kit entry deleted', !game.includes("'mallow': { name: 'Mallow'"));
check('stray single-line nightshade kit entry deleted', !game.includes("'nightshade': { name: 'Nightshade'"));
try {
  const sb = vm.createContext({ Object });
  const defs = vm.runInContext(extractSpecialDefs(game), sb);
  const keys = Object.keys(defs);
  check('SPECIAL_ABILITY_DEFS has no mallow entry', !('mallow' in defs));
  check('SPECIAL_ABILITY_DEFS has no nightshade entry', !('nightshade' in defs));
  check('every SPECIAL_ABILITY_DEFS entry has a type (banner/shop/detail safe)', keys.every((k) => typeof defs[k].type === 'string' && defs[k].type.length > 0));
  check('every SPECIAL_ABILITY_DEFS entry has name/icon/color/shortDesc/pieceName', keys.every((k) => ['name', 'icon', 'color', 'shortDesc', 'pieceName'].every((f) => typeof defs[k][f] === 'string' && defs[k][f].length > 0)));
} catch (e) { failures.push('special-defs eval threw: ' + e.message); }
check('banner still renders special only when def exists (no crash path added)', game.includes('const selectedSpecial = getSpecialAbilityDef(selectedBrawler);') && game.includes('selectedSpecial.type.toUpperCase()'));

// ---------------------------------------------------------- 2. brawlerData entries
const brawlerDataIdx = game.indexOf('const brawlerData = {');
const mallowIdx = game.indexOf("'mallow': {", brawlerDataIdx);
const nightshadeIdx = game.indexOf("'nightshade': {", brawlerDataIdx);
check('brawlerData has mallow entry', mallowIdx > 0);
check('brawlerData has nightshade entry', nightshadeIdx > 0);
const mallowWin = mallowIdx > 0 ? game.slice(mallowIdx, mallowIdx + 2500) : '';
const nightWin = nightshadeIdx > 0 ? game.slice(nightshadeIdx, nightshadeIdx + 2500) : '';
if (mallowWin) {
  check('mallow entry: Epic Controller, 8x320 Pam fan kept', mallowWin.includes("role: 'Controller'") && mallowWin.includes('Fires 8 marshmallows in a wide Pam-style fan (320 damage each)'));
  check('mallow entry: real g1/sp1 kept (Sticky Volley / Toasted Haste)', mallowWin.includes("g1: 'Sticky Volley") && mallowWin.includes("sp1: 'Toasted Haste"));
  check('mallow entry: g2/sp2 coming-soon text carried over EXPLICITLY (PR #54 replaces on rebase)', mallowWin.includes("g2: 'Second Tool coming soon.'") && mallowWin.includes("sp2: 'Second Talent coming soon.'"));
  check('mallow entry: no PR #54 text shipped early (no Early Pop / Long Simmer)', !mallowWin.includes('Early Pop') && !mallowWin.includes('Long Simmer'));
}
if (nightWin) {
  check('nightshade entry: Mythic Assassin, purple', nightWin.includes("role: 'Assassin'") && nightWin.includes("rarity: 'Mythic'") && nightWin.includes("color: '#9b5cff'"));
  check('nightshade entry: attackDesc 640 each (-20%)', nightWin.includes('Throws 4 daggers in a tight super-short cone (640 damage each)'));
  check('nightshade entry: hyper describes shield, not homing', nightWin.includes('shield zone around Nightshade blocks enemy projectiles until the daggers return') && !nightWin.includes('home toward'));
  check('nightshade entry: gadgets/star powers kept', nightWin.includes("g1: 'Backstab Dash") && nightWin.includes("g2: 'Purge Vial") && nightWin.includes("sp1: 'Lingering Toxin") && nightWin.includes("sp2: 'Fresh Wounds"));
}

// ---------------------------------------------------------- 3. nerf values
check('main dmg base 800 -> 640 in getScaledStats', game.includes('hp: Math.round(6400 * scale), dmg: Math.round(640 * scale), speed: 300'));
check('main dagger speed 1000 -> 700 (-30%)', game.includes('const NIGHTSHADE_DAGGER_SPEED = 700;') && !game.includes('NIGHTSHADE_DAGGER_SPEED = 1000'));
check('super blade speed 900 -> 630 (-30%)', game.includes('const NIGHTSHADE_BLADE_SPEED = 630;') && !game.includes('NIGHTSHADE_BLADE_SPEED = 900'));
check('blade damage/count/range unchanged 1100/12/640', game.includes('const NIGHTSHADE_BLADE_DAMAGE = 1100;') && game.includes('const NIGHTSHADE_BLADE_COUNT = 12;') && game.includes('const NIGHTSHADE_BLADE_RANGE = 640;'));
check('cone/poison unchanged 0.36/60', game.includes('const NIGHTSHADE_DAGGER_FAN_ARC = 0.36;') && game.includes('const NIGHTSHADE_POISON_DPS = 60;'));

// ---------------------------------------------------------- 4. homing gone, shield in
check('no HOME_RANGE constant anywhere', !game.includes('NIGHTSHADE_BLADE_HOME_RANGE'));
check('no homing text anywhere', !game.includes('home toward the nearest poisoned'));
const bladeUpdate = extractFn(game, 'updateNightshadeBlades');
check('blade update: return path steers straight to owner', bladeUpdate.includes('Math.atan2(owner.y - blade.y, owner.x - blade.x)'));
check('blade update: no homing branch left', !bladeUpdate.includes('bestD') && !bladeUpdate.includes('nightshadeActiveStacks(t, now)'));
check('wall-pierce kept (non-hyper blades stop on walls)', bladeUpdate.includes('if (!blade.hyper && nightshadeHitsWall(blade.x, blade.y, NIGHTSHADE_BLADE_RADIUS))'));
check('shield radius constant 120px', game.includes('const NIGHTSHADE_SHIELD_RADIUS = 120;'));
check('shield helper exists', game.includes('function nightshadeHyperShieldBlocks(b)'));
check('bullet loop calls shield helper before hit detection', game.includes('if (nightshadeHyperShieldBlocks(b)) {'));
check('shield visual drawn (purple zone circle)', game.includes('ctx.arc(entity.x, entity.y, NIGHTSHADE_SHIELD_RADIUS'));

// ---------------------------------------------------------- 5. vm: scaled damage
try {
  const sb = { Math, MAX_POWER_LEVEL: 12, getSelectedBrawlerLevel: () => 11 };
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'getScaledStats'), sb);
  const l11 = sb.getScaledStats('nightshade', 11);
  check('vm: nightshade dmg is 640 at Power 11', l11.dmg === 640 && l11.hp === 6400 && l11.speed === 300);
  const l1 = sb.getScaledStats('nightshade', 1);
  check('vm: nightshade dmg scales 640 x 0.55 = 352 at Power 1', l1.dmg === 352);
} catch (e) { failures.push('scaled-stats vm threw: ' + e.message); }

// ---------------------------------------------------------- 6. vm: shield behavior
try {
  const sb = {
    Math,
    player: { id: 0, x: 500, y: 500, hp: 6400, radius: 14, team: 'a' },
    bots: [
      { id: 5, brawler: 'nightshade', x: 900, y: 900, hp: 6400, radius: 14, team: 'b' },
      { id: 8, x: 100, y: 100, hp: 6400, radius: 14, team: 'a' },
      { id: 9, x: 2000, y: 2000, hp: 6400, radius: 14, team: 'b' },
    ],
    selectedBrawler: 'nightshade',
    nightshadeBlades: [],
    NIGHTSHADE_SHIELD_RADIUS: 120,
    areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'isNightshadeEntity') + '\n' + extractFn(game, 'nightshadeHyperShieldBlocks'), sb);
  const bullet = (x, y, ownerId) => ({ x, y, ownerId });
  sb.nightshadeBlades.length = 0;
  check('shield vm: no blades -> nothing blocked', sb.nightshadeHyperShieldBlocks(bullet(500, 500, 9)) === false);
  sb.nightshadeBlades.push({ hyper: false, ownerId: 0 });
  check('shield vm: non-hyper blades only -> nothing blocked', sb.nightshadeHyperShieldBlocks(bullet(500, 500, 9)) === false);
  sb.nightshadeBlades.length = 0;
  sb.nightshadeBlades.push({ hyper: true, ownerId: 0 });
  check('shield vm: enemy bullet inside 120px blocked', sb.nightshadeHyperShieldBlocks(bullet(550, 500, 9)) === true);
  check('shield vm: enemy bullet at 200px NOT blocked', sb.nightshadeHyperShieldBlocks(bullet(700, 500, 9)) === false);
  check('shield vm: own bullet inside zone NOT blocked', sb.nightshadeHyperShieldBlocks(bullet(550, 500, 0)) === false);
  check('shield vm: allied bullet inside zone NOT blocked', sb.nightshadeHyperShieldBlocks(bullet(550, 500, 8)) === false);
  check('shield vm: bullet at exactly 120px blocked (boundary inclusive)', sb.nightshadeHyperShieldBlocks(bullet(620, 500, 9)) === true);
  sb.nightshadeBlades.length = 0;
  sb.nightshadeBlades.push({ hyper: true, ownerId: 5 });
  // Bullet must come from the bot's ENEMY (team 'a', here the player) —
  // a team-'b' bullet would be allied to the bot and correctly pass.
  check('shield vm: bot nightshade shield blocks near the bot', sb.nightshadeHyperShieldBlocks(bullet(950, 900, 0)) === true);
  check('shield vm: bot shield does NOT cover the player', sb.nightshadeHyperShieldBlocks(bullet(550, 500, 9)) === false);
  sb.player.hp = 0;
  sb.nightshadeBlades.length = 0;
  sb.nightshadeBlades.push({ hyper: true, ownerId: 0 });
  check('shield vm: dead owner -> no shield even with live blades', sb.nightshadeHyperShieldBlocks(bullet(550, 500, 9)) === false);
  sb.player.hp = 6400;
} catch (e) { failures.push('shield vm threw: ' + e.message); }

// ---------------------------------------------------------- 7. vm: return steers to owner, not poisoned enemy
try {
  const sb = {
    Math,
    performance: { now: () => 100100 },
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    WORLD_W: 4000, WORLD_H: 4000,
    player: { id: 0, x: 500, y: 500, hp: 6400, radius: 14 },
    bots: [],
    aliveBots: [],
    cubes: [],
    destructibleWalls: [],
    explosions: [],
    nightshadeBlades: [],
    NIGHTSHADE_BLADE_SPEED: 630,
    NIGHTSHADE_BLADE_RANGE: 640,
    NIGHTSHADE_BLADE_RADIUS: 18,
    NIGHTSHADE_BLADE_MAX_LIFE_MS: 4000,
    NIGHTSHADE_BLADE_DAMAGE: 1100,
    getSelectedBrawlerLevel: () => 11,
    rectCircleCollides: () => false,
    areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
    checkHit: () => {},
  };
  sb.bots.push({ id: 2, x: 700, y: 700, hp: 6400, radius: 14, team: 'b', nightshadePoisonStacks: [{ endsAt: 200000, nextTickAt: 100250, ownerId: 0 }] });
  sb.aliveBots = sb.bots;
  vm.createContext(sb);
  vm.runInContext(
    extractFn(game, 'nightshadeOwnerById') + '\n' +
    extractFn(game, 'nightshadeEnemyCandidates') + '\n' +
    extractFn(game, 'nightshadeHitsWall') + '\n' +
    extractFn(game, 'nightshadeBladeLevelDamage') + '\n' +
    extractFn(game, 'updateNightshadeBlades'),
    sb);
  // Returning hyper blade at (700,500); owner at (500,500); poisoned enemy
  // at (700,700). Old homing code would steer toward the enemy (+y).
  sb.nightshadeBlades.push({ x: 700, y: 500, vx: 0, vy: 0, ownerId: 0, ownerBrawler: 'nightshade', hyper: true, outbound: false, traveled: 640, bornAt: 100000, hitOut: {}, hitBack: {}, spin: 0 });
  sb.updateNightshadeBlades(0.016, 100100);
  const blade = sb.nightshadeBlades[0];
  check('return vm: hyper blade still live mid-return', !!blade);
  if (blade) {
    check('return vm: blade steers toward owner (vx negative), NOT poisoned enemy', blade.vx < 0 && near(blade.vy, 0, 1));
    check('return vm: blade moved toward owner', blade.x < 700);
  }
  // Blade close to owner returns and is spliced -> shield drops.
  sb.nightshadeBlades.length = 0;
  sb.nightshadeBlades.push({ x: 520, y: 500, vx: 0, vy: 0, ownerId: 0, ownerBrawler: 'nightshade', hyper: true, outbound: false, traveled: 640, bornAt: 100000, hitOut: {}, hitBack: {}, spin: 0 });
  sb.updateNightshadeBlades(0.016, 100100);
  check('return vm: blade reaching owner is removed (shield drops with last blade)', sb.nightshadeBlades.length === 0);
} catch (e) { failures.push('return vm threw: ' + e.message); }

console.log(`nightshade-nerf-shield-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
