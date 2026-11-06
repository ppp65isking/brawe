// Fused mode regression — Anthony's order 2026-11-06.
// Random duels: each round each side rolls a fresh fusion of two distinct
// brawlers; one press fires both mains, one press fires both Supers.
// Not optimized, just fun. Same vm pattern as mallow-balance-regression:
// helpers are EXECUTED, not just pinned.
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
check('mode card exists', game.includes("['fused', '🧬', 'Fused Duels', 'Two random brawlers fused — both attacks, both Supers']"));
check('fused is a permanent mode', game.includes("'brawe_ball', 'knockout_3v3', 'duels', 'fused', 'power_play_showdown'"));
check('fused is a popular mode', game.includes("'brawe_ball', 'knockout_3v3', 'duels', 'fused',"));
check('isFusedMode flag declared', game.includes('let isFusedMode = false;'));
check('isFusedMode reset in match launches', (game.match(/isFusedMode = false;/g) || []).length >= 3);
check('helpers exist',
  game.includes('function isFusedEntity(entity)') &&
  game.includes('function rollFusedParts()') &&
  game.includes('function getFusedTier(parts, level)') &&
  game.includes('function getFusedDisplayName(parts)') &&
  game.includes('function fireFusionSupersPlayer()') &&
  game.includes('function fireFusionSupersBot(bot, targetX, targetY)'));
check('roll excludes disabled brawlers', game.includes('allBrawlers.filter((id) => !disabledBrawlers.has(id))'));
check('roll forces distinct parts', game.includes('while (second === first && pool.length > 1)'));
check('tier averages hp and speed',
  game.includes('hp: Math.round(((a.hp || 0) + (b.hp || 0)) / 2)') &&
  game.includes('speed: Math.round(((a.speed || 110) + (b.speed || 110)) / 2)'));
check('fire() resolves the part override first', game.includes('const brawler = fromEntity.fusedPartCall || getCombatBrawler(fromEntity, isBot);'));
check('fire() defines fusedOuter', game.includes('const fusedOuter = !fromEntity.fusedPartCall && isFusedEntity(fromEntity);'));
check('fusion fires at the slower component rate',
  game.includes('fireDelay = Math.max(getFireDelay(fusedParts[0], null), getFireDelay(fusedParts[1], null));'));
check('fire() fusion branch fires both parts',
  game.includes('fromEntity.fusedPartCall = fusedParts[0];') &&
  game.includes('fromEntity.fusedPartCall = fusedParts[1];') &&
  game.includes('fromEntity.fusedPartCall = null;'));
check('fire() fusion branch runs after the ammo block (one ammo per press)',
  game.indexOf('} else if (!fromEntity.fusedPartCall) {') < game.indexOf('if (fusedOuter) {'));
check('fire() inner calls skip the throttle',
  game.includes('if(!cursedForcedAttack && !fromEntity.fusedPartCall && now - (isBot ? fromEntity.lastShot : lastShot) < fireDelay) return;'));
check('fire() inner calls skip the ammo check',
  game.includes("if (!fromEntity.fusedPartCall && brawler !== 'spikey' && ammo < cost && !ammoSaverFree) return;"));
check('player super fusion branch', game.includes('if (!player.fusedSuperPart && isFusedEntity(player)) {'));
check('player super meter consumed once', game.includes("if (!player.fusedSuperPart && !hasMultiSuper(selectedBrawler)) {"));
check('bot super fusion branch', game.includes('if (!bot.fusedSuperPart && isFusedEntity(bot)) {'));
check('bot super meter consumed once', game.includes("if (!bot.fusedSuperPart && bot.brawler !== 'steamer'"));
check('launch routes fused to beginFusedMatch', game.includes("if (showdownMode === 'fused') {"));
check('beginFusedMatch exists and starts a round', game.includes('function beginFusedMatch()') && game.includes('duelsTargetWins = 9;'));
check('fused match is a Duels match with no Slop Sushi',
  game.includes('isDuels = true;\n      isFusedMode = true;') &&
  game.includes('isSlopSushiMode = false;\n      sushiMatchArmed = false;'));
check('round rolls a fresh player fusion',
  game.includes('const fusedParts = rollFusedParts();') &&
  game.includes('player.fusedParts = fusedParts;'));
check('round rolls a fresh bot fusion',
  game.includes('const fusedBotParts = isFusedMode ? rollFusedParts() : null;') &&
  game.includes('fusedParts: fusedBotParts || undefined,'));
check('round uses averaged tiers',
  game.includes('const ptier = isFusedMode ? getFusedTier(player.fusedParts, duelPlayerLevel) : getHPTier(selectedBrawler, duelPlayerLevel);') &&
  game.includes('const btier = isFusedMode ? getFusedTier(fusedBotParts, botLevel) : getHPTier(bBrawler, botLevel);'));
check('round announces the fusion',
  game.includes("'FUSED: ' + getFusedDisplayName(player.fusedParts) + '!'") &&
  game.includes("'FUSED: ' + getFusedDisplayName(fusedBot.fusedParts) + '!'"));
check('stale fusions are cleared on match and non-fused round start',
  (game.match(/player\.fusedParts = null;/g) || []).length >= 4);

// ---------------------------------------------------------- 2. vm harness
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

// --- executed: isFusedEntity ---
try {
  const sandbox = { Math };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'isFusedEntity'), sandbox);
  check('isFusedEntity: two parts is fused', sandbox.isFusedEntity({ fusedParts: ['mallow', 'nightshade'] }) === true);
  check('isFusedEntity: no parts is not fused', sandbox.isFusedEntity({}) === false);
  check('isFusedEntity: one part is not fused', sandbox.isFusedEntity({ fusedParts: ['mallow'] }) === false);
  check('isFusedEntity: string parts is not fused', sandbox.isFusedEntity({ fusedParts: 'mallow' }) === false);
  check('isFusedEntity: null is not fused', sandbox.isFusedEntity(null) === false);
} catch (e) { failures.push('isFusedEntity vm block threw: ' + e.message); }

// --- executed: rollFusedParts ---
try {
  const sandbox = {
    Math,
    allBrawlers: ['mallow', 'nightshade', 'aegis', 'robber'],
    disabledBrawlers: new Set(['robber']),
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'rollFusedParts'), sandbox);
  const seen = new Set();
  let ok = true;
  for (let n = 0; n < 300; n++) {
    const parts = sandbox.rollFusedParts();
    if (!Array.isArray(parts) || parts.length !== 2) ok = false;
    if (parts[0] === parts[1]) ok = false;
    for (const p of parts) {
      if (p === 'robber') ok = false;
      if (!['mallow', 'nightshade', 'aegis'].includes(p)) ok = false;
      seen.add(p);
    }
  }
  check('roll: 300 rolls all distinct pairs, no disabled brawler', ok);
  check('roll: every enabled brawler shows up over 300 rolls', seen.size === 3);
} catch (e) { failures.push('rollFusedParts vm block threw: ' + e.message); }

// --- executed: getFusedTier ---
try {
  const sandbox = {
    Math,
    getHPTier: (id) => (id === 'mallow' ? { hp: 6800, speed: 270 } : { hp: 6401, speed: 300 }),
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'getFusedTier'), sandbox);
  const tier = sandbox.getFusedTier(['mallow', 'nightshade'], 11);
  check('tier: hp is the average (6800+6401)/2 rounded', tier.hp === 6601);
  check('tier: speed is the average (270+300)/2', tier.speed === 285);
} catch (e) { failures.push('getFusedTier vm block threw: ' + e.message); }

// --- executed: getFusedDisplayName ---
try {
  const sandbox = {
    Math,
    brawlerData: { mallow: { name: 'Mallow' }, nightshade: { name: 'Nightshade' } },
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'getFusedDisplayName'), sandbox);
  check('display name joins both names', sandbox.getFusedDisplayName(['mallow', 'nightshade']) === 'Mallow + Nightshade');
  check('display name falls back to ids', sandbox.getFusedDisplayName(['mallow', 'unknown_brawler']) === 'Mallow + unknown_brawler');
} catch (e) { failures.push('getFusedDisplayName vm block threw: ' + e.message); }

// --- executed: player super wrapper swaps brawler per part, restores after ---
try {
  const seen = [];
  const sandbox = {
    Math,
    player: { id: 1, fusedParts: ['mallow', 'nightshade'] },
    selectedBrawler: 'outlit',
    fireSuper: function () { seen.push(this.selectedBrawler); },
  };
  // fireSuper is called as a bare global; capture the global at call time.
  sandbox.fireSuper = function () { seen.push(sandbox.selectedBrawler); };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'fireFusionSupersPlayer'), sandbox);
  sandbox.fireFusionSupersPlayer();
  check('player wrapper: super fires once per part', seen.length === 2);
  check('player wrapper: parts fire in order', seen[0] === 'mallow' && seen[1] === 'nightshade');
  check('player wrapper: selected brawler restored', sandbox.selectedBrawler === 'outlit');
  check('player wrapper: part flag cleared', sandbox.player.fusedSuperPart === null);
} catch (e) { failures.push('fireFusionSupersPlayer vm block threw: ' + e.message); }

// --- executed: player super wrapper restores even when a cast throws ---
try {
  const sandbox = {
    Math,
    player: { id: 1, fusedParts: ['mallow', 'nightshade'] },
    selectedBrawler: 'outlit',
    fireSuper: function () { throw new Error('boom'); },
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'fireFusionSupersPlayer'), sandbox);
  let threw = false;
  try { sandbox.fireFusionSupersPlayer(); } catch (e) { threw = e.message === 'boom'; }
  check('player wrapper: throw propagates', threw);
  check('player wrapper: selected brawler restored after throw', sandbox.selectedBrawler === 'outlit');
  check('player wrapper: part flag cleared after throw', sandbox.player.fusedSuperPart === null);
} catch (e) { failures.push('fireFusionSupersPlayer throw vm block threw: ' + e.message); }

// --- executed: bot super wrapper swaps brawler per part, restores after ---
try {
  const seen = [];
  const sandbox = {
    Math,
    fireSuperBot: function (bot) { seen.push(bot.brawler); },
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'fireFusionSupersBot'), sandbox);
  const bot = { id: 2, brawler: 'aegis', fusedParts: ['runner', 'aura_charmer'] };
  sandbox.fireFusionSupersBot(bot, 100, 200);
  check('bot wrapper: super fires once per part', seen.length === 2);
  check('bot wrapper: parts fire in order', seen[0] === 'runner' && seen[1] === 'aura_charmer');
  check('bot wrapper: brawler restored', bot.brawler === 'aegis');
  check('bot wrapper: part flag cleared', bot.fusedSuperPart === null);
} catch (e) { failures.push('fireFusionSupersBot vm block threw: ' + e.message); }

// ---------------------------------------------------------- 3. report
if (failures.length) {
  console.error(`FUSED MODE: ${passed} passed, ${failures.length} FAILED`);
  for (const f of failures) console.error('  FAIL:', f);
  process.exit(1);
}
console.log(`FUSED MODE: ${passed} passed`);
