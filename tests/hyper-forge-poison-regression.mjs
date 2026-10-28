// Hyper Forge LTM + Nightshade poison-structures regression,
// built 2026-10-28 from Anthony's orders:
//  A) NIGHTSHADE POISON AFFECTS STRUCTURES (user-confirmed: he wants her
//     TO BE ABLE to poison towers). Nightshade-only exception to the
//     standing poison-never-damages-structures rule: her stacks now apply
//     to Arena Forge towers, the Core and camps, and tick on them. The
//     GENERIC poison system (other brawlers) is untouched — see the
//     negative controls below. Super blades keep the filtered candidate
//     list and still NEVER hit structures (direct blade damage to towers
//     was NOT part of this order).
//  B) HYPER FORGE LTM (builder-picked working name — Anthony may rename):
//     Arena Forge where EVERYONE is always Hypercharged (reuses the
//     battle-tested ranked/custom `always_hyper` machinery: spawn,
//     match-start, per-frame enforcement, expiry suppression) and reload
//     speed is 3x faster (reload time divided by 3 — "300%" read as 3x,
//     NOT +300% = 4x; flag for Anthony to correct). Separate mode entry
//     `arena_forge_hyper`; default Arena Forge is untouched.
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
const allied = (a, b) => !!a && !!b && a.team === b.team;

// ------------------------------------------------- 1. poison source pins
const applySrc = extractFn(game, 'applyNightshadePoisonStacks');
check('A: applyNightshadePoisonStacks no longer guards isStructure', !applySrc.includes('isStructure'));
check('A: applyNightshadePoisonStacks still guards dead/null targets', applySrc.includes('!target || target.hp <= 0'));
const tickSrc = extractFn(game, 'updateNightshadePoisonTicks');
check('A: poison tick loop no longer skips isStructure', !tickSrc.includes('isStructure'));
check('A: poison tick loop still skips dead targets', tickSrc.includes('target.hp <= 0'));
check('A: nightshadePoisonCandidates exists (enemies INCLUDING structures)', game.includes('function nightshadePoisonCandidates(owner)'));
check('A: blade candidates still filter isStructure (blades unchanged)', extractFn(game, 'nightshadeEnemyCandidates').includes('!t.isStructure'));
const bladeSrc = extractFn(game, 'updateNightshadeBlades');
check('A: blade update still uses filtered candidates, not poison candidates', bladeSrc.includes('nightshadeEnemyCandidates(owner)') && !bladeSrc.includes('nightshadePoisonCandidates'));
const dashSrc = extractFn(game, 'updateNightshadeDash');
const purgeSrc = extractFn(game, 'executeNightshadeG2');
check('A: dash pass-through uses poison candidates', dashSrc.includes('nightshadePoisonCandidates(entity)'));
check('A: purge detonation uses poison candidates', purgeSrc.includes('nightshadePoisonCandidates(entity)'));
check('A: generic poison tick processor untouched (no nightshade/LTM refs)', game.includes('if(e.hp > 0 && e.poisonUntil && now < e.poisonUntil) {') && !game.slice(game.indexOf('if(e.hp > 0 && e.poisonUntil'), game.indexOf('if(e.hp > 0 && e.poisonUntil') + 2000).includes('nightshade'));

// ------------------------------------------------- 2. kit text pins
const brawlerDataIdx = game.indexOf('const brawlerData = {');
const nightIdx = game.indexOf("'nightshade': {", brawlerDataIdx);
const nightWin = nightIdx > 0 ? game.slice(nightIdx, nightIdx + 2500) : '';
check('A: attackDesc states poison affects towers/Core/camps', nightWin.includes('Poison affects structures too: towers, the Core and camps take poison damage.'));
check('A: g1 states dash applies stacks to structures too', nightWin.includes('Passing through an enemy or structure applies 2 poison stacks.'));
check('A: g2 states purge detonates structures too', nightWin.includes('Detonate all poison stacks on enemies and structures within 5 tiles'));

// ------------------------------------------------- 3. LTM wiring source pins
check('B: mode card entry present (Hyper Forge, hyper + reload in desc)', game.includes("['arena_forge_hyper', '⚡', 'Hyper Forge', '3v3 • everyone always Hypercharged • 3x reload speed']"));
check('B: permanent ids push present (rotation pool + ALL EVENTS)', game.includes("HOME_PERMANENT_MODE_IDS.push('arena_forge_hyper');"));
check('B: rewards entry present (+50 Coins, like Overclocked)', game.includes("arena_forge_hyper: { type:'coins', amount:50, label:'+50 Coins' }"));
check('B: rules list entry present', game.includes("arena_forge_hyper: ['3v3 lanes', 'Everyone is Hypercharged for the whole match', 'Reload speed 3x faster', 'Destroy both towers, then the Core']"));
check('B: mode name function returns Hyper Forge', game.includes("if (mode === 'arena_forge_hyper') return 'Hyper Forge';"));
check('B: brick power-gate exempt like other Forge modes', game.includes("showdownMode === 'arena_forge_minion_surge' || showdownMode === 'arena_forge_hyper';"));
check('B: mode UI block includes hyper mode', game.includes("showdownMode === 'arena_forge_minion_surge' || showdownMode === 'arena_forge_hyper' || showdownMode === 'marked_mayhem'"));
check('B: start button text Hyper Forge', game.includes("showdownMode === 'arena_forge_hyper' ? 'Start Hyper Forge 3v3'"));
check('B: in-match panel header shows HYPER FORGE', game.includes("showdownMode === 'arena_forge_hyper' ? '• HYPER FORGE'"));
check('B: match-start banner shows both modifiers', game.includes("HYPER FORGE: ALWAYS HYPERCHARGED • 3x RELOAD SPEED!"));
check('B: match start sets isArenaForgeMode + isHyperForgeLTM', game.includes("isArenaForgeMode = showdownMode === 'arena_forge' || showdownMode === 'arena_forge_overclocked' || showdownMode === 'arena_forge_minion_surge' || showdownMode === 'arena_forge_hyper';") && game.includes("isHyperForgeLTM = showdownMode === 'arena_forge_hyper';"));
check('B: spawn grants permanent hyper in LTM', game.includes("|| isHyperForgeLTM) {") && game.includes("entity.isHypercharged = true;\n            entity.hyperchargeUntil = now + 999999999;"));
check('B: match-start hyper block covers LTM', game.includes("activeRankedModifierTertiary === 'always_hyper' || isHyperForgeLTM) {"));
check('B: per-frame enforcement outer covers LTM', game.includes("if ((isRankedMatch || isCustomMutatorMatch || isHyperForgeLTM) && playing && !gameOver) {"));
check('B: player hyper expiry suppressed in LTM', game.includes("&& !isHyperForgeLTM){\n        isHypercharged = false;"));
check('B: bot hyper expiry suppressed in LTM', game.includes("&& !isHyperForgeLTM) {\n          t.isHypercharged = false; t.hyperChargeCharge = 0;"));
check('B: flag cleared at all 4 teardown sites', (game.match(/isArenaForgeMode = false;\n\s*isHyperForgeLTM = false;/g) || []).length === 4);
check('B: reload divided by 3 inside LTM only', game.includes('if (isHyperForgeLTM) base /= 3;'));
check('B: no placeholder text in new strings', !game.includes('Hyper Forge') || (!game.slice(game.indexOf("['arena_forge_hyper'"), game.indexOf("['arena_forge_hyper'") + 400).match(/TODO|TBD|coming soon/i)));

// ------------------------------------------------- 4. vm: poison applies to structures
try {
  const sb = {
    Math,
    performance: { now: () => 100000 },
    NIGHTSHADE_ENABLED: true,
    NIGHTSHADE_POISON_DPS: 60,
    NIGHTSHADE_POISON_TICK_MS: 250,
    NIGHTSHADE_POISON_DURATION_MS: 8000,
    NIGHTSHADE_POISON_DURATION_SP1_MS: 10000,
    NIGHTSHADE_POISON_MAX_STACKS: 4,
    getEntityStarChoice: () => 'none',
  };
  vm.createContext(sb);
  vm.runInContext(
    extractFn(game, 'nightshadeStarChoice') + '\n' +
    extractFn(game, 'nightshadeHasSP1') + '\n' +
    extractFn(game, 'nightshadePoisonDurationMs') + '\n' +
    extractFn(game, 'nightshadeActiveStacks') + '\n' +
    extractFn(game, 'applyNightshadePoisonStacks'),
    sb);
  const owner = { id: 0 };
  const tower = { id: 7, hp: 72000, maxHp: 72000, isStructure: true, isArenaForgeStructure: true, isArenaForgeTower: true, team: 'enemy' };
  const core = { id: 8, hp: 120000, maxHp: 120000, isStructure: true, isCore: true, isArenaForgeStructure: true, team: 'enemy' };
  const camp = { id: 9, hp: 5000, maxHp: 5000, isStructure: true, isArenaForgeCamp: true, team: 'enemy' };
  const foe = { id: 3, hp: 6400, team: 'enemy' };
  check('vm: dagger stack applies to a tower', sb.applyNightshadePoisonStacks(tower, owner, 1, false) === 1 && tower.nightshadePoisonStacks.length === 1);
  check('vm: dagger stack applies to the Core', sb.applyNightshadePoisonStacks(core, owner, 1, false) === 1 && core.nightshadePoisonStacks.length === 1);
  check('vm: dagger stack applies to a camp', sb.applyNightshadePoisonStacks(camp, owner, 1, false) === 1 && camp.nightshadePoisonStacks.length === 1);
  check('vm: normal enemy still poisonable (no regression)', sb.applyNightshadePoisonStacks(foe, owner, 1, false) === 1 && foe.nightshadePoisonStacks.length === 1);
  for (let k = 0; k < 5; k++) sb.applyNightshadePoisonStacks(tower, owner, 1, false);
  check('vm: tower stacks cap at 4 normally (oldest refreshes)', tower.nightshadePoisonStacks.length === 4);
  const tower2 = { id: 10, hp: 72000, isStructure: true, isArenaForgeStructure: true, team: 'enemy' };
  for (let k = 0; k < 6; k++) sb.applyNightshadePoisonStacks(tower2, owner, 1, true);
  check('vm: hyper (uncapped) stacks on a tower pass 4', tower2.nightshadePoisonStacks.length === 6);
  check('vm: dead structure takes no stacks', sb.applyNightshadePoisonStacks({ id: 11, hp: 0, isStructure: true }, owner, 1, false) === 0);
  check('vm: null target takes no stacks', sb.applyNightshadePoisonStacks(null, owner, 1, false) === 0);
} catch (e) { failures.push('poison-apply vm threw: ' + e.message); }

// ------------------------------------------------- 5. vm: candidates (blades vs poison)
try {
  const sb = {
    Math,
    player: { id: 0, team: 'player', x: 500, y: 500 },
    bots: [],
    aliveBots: null,
    areAlliedEntities: allied,
  };
  const tower = { id: 7, hp: 72000, isStructure: true, isArenaForgeStructure: true, team: 'enemy', x: 1000, y: 1000 };
  const foe = { id: 3, hp: 6400, team: 'enemy', x: 600, y: 500 };
  const ally = { id: 4, hp: 6400, team: 'player', x: 550, y: 500 };
  sb.bots = [tower, foe, ally];
  sb.aliveBots = sb.bots;
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'nightshadeEnemyCandidates') + '\n' + extractFn(game, 'nightshadePoisonCandidates'), sb);
  const owner = { id: 0, team: 'player' };
  const bladeIds = sb.nightshadeEnemyCandidates(owner).map((t) => t.id);
  const poisonIds = sb.nightshadePoisonCandidates(owner).map((t) => t.id);
  check('vm: blade candidates still EXCLUDE the tower (negative control)', !bladeIds.includes(7) && bladeIds.includes(3));
  check('vm: blade candidates still exclude allies/self', !bladeIds.includes(4) && !bladeIds.includes(0));
  check('vm: poison candidates INCLUDE the tower', poisonIds.includes(7) && poisonIds.includes(3));
  check('vm: poison candidates still exclude allies/self', !poisonIds.includes(4) && !poisonIds.includes(0));
} catch (e) { failures.push('candidates vm threw: ' + e.message); }

// ------------------------------------------------- 6. vm: poison ticks damage a tower
try {
  const hits = [];
  const sb = {
    Math,
    player: { id: 0, hp: 6400 },
    bots: [],
    NIGHTSHADE_POISON_DPS: 60,
    NIGHTSHADE_POISON_TICK_MS: 250,
    checkHit: (target, b) => { hits.push({ id: target.id, damage: b.damage, tick: !!b.nightshadePoisonTick }); },
  };
  const tower = { id: 7, hp: 72000, isStructure: true, isArenaForgeStructure: true, team: 'enemy', nightshadePoisonStacks: [{ endsAt: 108000, nextTickAt: 99000, ownerId: 0 }] };
  sb.bots = [tower];
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'nightshadeActiveStacks') + '\n' + extractFn(game, 'updateNightshadePoisonTicks'), sb);
  sb.updateNightshadePoisonTicks(100000);
  check('vm: tick fires on a tower (15 dmg = 60/s x 250ms)', hits.length === 1 && hits[0].id === 7 && hits[0].damage === 15 && hits[0].tick === true);
  check('vm: tower stack survives the tick (8s duration)', tower.nightshadePoisonStacks.length === 1);
  hits.length = 0;
  const dead = { id: 8, hp: 0, isStructure: true, nightshadePoisonStacks: [{ endsAt: 108000, nextTickAt: 99000, ownerId: 0 }] };
  sb.bots = [dead];
  sb.updateNightshadePoisonTicks(100000);
  check('vm: dead structure takes no tick', hits.length === 0);
} catch (e) { failures.push('tick vm threw: ' + e.message); }

// ------------------------------------------------- 7. vm: dash + purge work on structures
try {
  const hits = [];
  let healed = 0;
  const sb = {
    Math,
    performance: { now: () => 100000 },
    player: { id: 0, team: 'player', x: 500, y: 500, hp: 6400 },
    bots: [],
    aliveBots: null,
    areAlliedEntities: allied,
    NIGHTSHADE_ENABLED: true,
    NIGHTSHADE_POISON_DPS: 60,
    NIGHTSHADE_POISON_TICK_MS: 250,
    NIGHTSHADE_POISON_DURATION_MS: 8000,
    NIGHTSHADE_POISON_DURATION_SP1_MS: 10000,
    NIGHTSHADE_POISON_MAX_STACKS: 4,
    NIGHTSHADE_GADGET1_PASS_RADIUS: 48,
    NIGHTSHADE_GADGET2_RADIUS: 400,
    NIGHTSHADE_GADGET2_HEAL_PER_STACK: 200,
    getEntityStarChoice: () => 'none',
    checkHit: (target, b) => { hits.push({ id: target.id, damage: b.damage }); },
    doHeal: (entity, amount) => { healed += amount; },
    spawnFloatingText: () => {},
  };
  const tower = { id: 7, hp: 72000, isStructure: true, isArenaForgeStructure: true, team: 'enemy', x: 650, y: 500, radius: 42 };
  sb.bots = [tower];
  sb.aliveBots = sb.bots;
  vm.createContext(sb);
  vm.runInContext(
    extractFn(game, 'nightshadeStarChoice') + '\n' +
    extractFn(game, 'nightshadeHasSP1') + '\n' +
    extractFn(game, 'nightshadePoisonDurationMs') + '\n' +
    extractFn(game, 'nightshadeActiveStacks') + '\n' +
    extractFn(game, 'applyNightshadePoisonStacks') + '\n' +
    extractFn(game, 'nightshadeEnemyCandidates') + '\n' +
    extractFn(game, 'nightshadePoisonCandidates') + '\n' +
    extractFn(game, 'nightshadePurgeDamage') + '\n' +
    extractFn(game, 'updateNightshadeDash') + '\n' +
    extractFn(game, 'executeNightshadeG2'),
    sb);
  const dasher = { id: 0, team: 'player', x: 500, y: 500, hp: 6400, nightshadeDash: { startX: 500, startY: 500, targetX: 700, targetY: 500, startAt: 0, durationMs: 1000, angle: 0, hitIds: {} } };
  sb.player = dasher;
  sb.updateNightshadeDash(dasher, 1000);
  check('vm: dash pass-through applies 2 stacks to a tower', Array.isArray(tower.nightshadePoisonStacks) && tower.nightshadePoisonStacks.length === 2);
  // Purge: 2 stacks with 8s left each -> 60*8*2 = 960 instant, +400 heal.
  sb.executeNightshadeG2(dasher);
  check('vm: purge detonates tower stacks for remaining damage (960)', hits.length === 1 && hits[0].id === 7 && hits[0].damage === 960);
  check('vm: purge clears tower stacks', tower.nightshadePoisonStacks.length === 0);
  check('vm: purge heals 200 HP per detonated stack (400)', healed === 400);
  const farTower = { id: 12, hp: 72000, isStructure: true, isArenaForgeStructure: true, team: 'enemy', x: 5000, y: 5000, radius: 42, nightshadePoisonStacks: [{ endsAt: 108000, nextTickAt: 100250, ownerId: 0 }] };
  sb.bots = [farTower];
  sb.aliveBots = sb.bots;
  hits.length = 0;
  sb.executeNightshadeG2(dasher);
  check('vm: purge ignores out-of-range structures', hits.length === 0 && farTower.nightshadePoisonStacks.length === 1);
} catch (e) { failures.push('dash/purge vm threw: ' + e.message); }

// ------------------------------------------------- 8. vm: reload 3x in LTM, normal outside
try {
  const sb = {
    Math,
    performance: { now: () => 100000 },
    BALANCE_PROFILE: { reloadMsByBrawler: {} },
    player: {},
    selectedBrawler: 'nightshade',
    selectedStar: 'none',
    maxAmmo: 3,
    isSlopSushiMode: false,
    getSlopEffectTotal: () => 0,
    isHyperForgeLTM: false,
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'getReloadTime'), sb);
  const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
  check('vm: reload normal outside LTM (1740 x 1.15 = 2001ms)', near(sb.getReloadTime('nightshade'), 2001));
  sb.isHyperForgeLTM = true;
  check('vm: reload 3x inside LTM (2001 / 3 = 667ms)', near(sb.getReloadTime('nightshade'), 667));
  sb.isHyperForgeLTM = false;
  check('vm: reload back to normal after LTM flag clears', near(sb.getReloadTime('nightshade'), 2001));
} catch (e) { failures.push('reload vm threw: ' + e.message); }

// ------------------------------------------------- 9. vm: hyper state under LTM-forced values
try {
  const sb = {
    Math,
    performance: { now: () => 100000 },
    player: { id: 0 },
    isHypercharged: true,
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(game, 'isEntityHyperchargedNow'), sb);
  check('vm: LTM-forced player hyper reads true', sb.isEntityHyperchargedNow({ id: 0 }) === true);
  check('vm: LTM-forced bot hyper reads true', sb.isEntityHyperchargedNow({ id: 5, isHypercharged: true, hyperchargeUntil: 100000 + 999999999 }) === true);
  check('vm: bot without hyper still reads false (normal behavior outside LTM)', sb.isEntityHyperchargedNow({ id: 6, isHypercharged: false, hyperchargeUntil: 0 }) === false);
  check('vm: expired bot hyper still reads false (expiry works outside LTM)', sb.isEntityHyperchargedNow({ id: 7, isHypercharged: true, hyperchargeUntil: 50000 }) === false);
} catch (e) { failures.push('hyper-state vm threw: ' + e.message); }

console.log(`hyper-forge-poison-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
