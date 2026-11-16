// Tower Duels mode + Duels maxed-out regression — ordered 2026-11-16
// (builder picks, flagged for his correction). Anthony's order: "when playing
// duals brawlers will be maxed out and new mode tower duels with all tower
// powers unlocked". CORRECTION 2026-11-16 15:47 ("Yes and hc too"): "maxed
// out" = EVERYTHING — Power 12 stats AND all gadgets unlocked AND all star
// powers unlocked AND Hypercharge unlocked/usable. Applies to Tower Duels too.
// Builder pick (flagged): Hypercharge charges normally in Duels rather than
// starting hypercharged — if he wants brawlers to START hypercharged, that is
// a follow-up.
// Locked design:
// - Duels: brawlers at Power 12 (was Level 11), full loadout (gadget + star
//   power + Hypercharge all usable). Regular Duels keeps 5 Tower Powers.
// - NEW permanent mode 'Tower Duels' on the mode select (NOT the retired
//   weekend event — tower_duels_weekend stays retired): duels format (draft
//   1-4 brawlers, first to 9 rounds, poison storm disabled) with ALL 8 Tower
//   Powers active/unlocked for player AND bots. Tower Powers stay DISABLED
//   everywhere else — TOWER_POWER_SYSTEM_ENABLED is NOT flipped globally; the
//   mode is gated on its own isTowerDuelsMode flag.
// - Mode description/banner: Tower Duels card, rules, label, color, 1V1 tag,
//   start-button label, topbar banner, bot power tray. Visuals key off REAL
//   state (Snipa lesson: never a faked flag) — the bot tray renders the bot's
//   actual slopSushiCards list, and the player tray renders getSlopCards().
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
check('flags declared next to isTowerDuelEvent', game.includes('let isTowerDuelsMode = false; // permanent Tower Duels mode: all 8 Tower Powers') && game.includes('let isDuelsMaxedMode = false; // Duels + Tower Duels: Power 12 + all gadgets/star powers/Hypercharge'));
check('TOWER_POWER_SYSTEM_ENABLED stays false (never flipped globally)', game.includes('const TOWER_POWER_SYSTEM_ENABLED = false;') && !game.includes('TOWER_POWER_SYSTEM_ENABLED = true'));
check('tower_duels_weekend stays retired; tower_duels is NOT in the retired set', game.includes("RETIRED_TOWER_MODE_IDS = new Set(['slop_sushi','slop_sushi_gauntlet','slop_sushi_plus','tower_duels_weekend','power_gods','solo_td'])") && !game.match(/RETIRED_TOWER_MODE_IDS[^;]*'tower_duels'/));
check('power count constants: Duels 5, Tower Duels 8', game.includes('const DUELS_ACTIVE_TOWER_POWERS = 5;') && game.includes('const TOWER_DUELS_ACTIVE_TOWER_POWERS = 8;'));
check('getSelectedBrawlerLevel returns 12 when maxed', game.includes('function getSelectedBrawlerLevel() {\n    if (isDuelsMaxedMode) return 12;'));
check('getSelectedProgress maxed branch: level 12 + all three unlocks true', game.includes('if (isDuelsMaxedMode) return {') && game.includes('level: 12,') && game.slice(game.indexOf('if (isDuelsMaxedMode) return {'), game.indexOf('if (isDuelsMaxedMode) return {') + 220).includes('gadgetUnlocked: true,') && game.slice(game.indexOf('if (isDuelsMaxedMode) return {'), game.indexOf('if (isDuelsMaxedMode) return {') + 220).includes('starPowerUnlocked: true,') && game.slice(game.indexOf('if (isDuelsMaxedMode) return {'), game.indexOf('if (isDuelsMaxedMode) return {') + 220).includes('hyperchargeUnlocked: true'));
check('getBotLevelNearPlayer returns 12 when maxed', game.includes('function getBotLevelNearPlayer() {\n        if (isDuelsMaxedMode) return 12;'));
check('startDuelsRound: player level 12 when maxed, else 11', game.includes('const duelPlayerLevel = isDuelsMaxedMode ? 12 : 11;'));
check('startDuelsRound: bot level 12 when maxed, event stays 11', game.includes('const botLevel = isDuelsMaxedMode ? 12 : (isTowerDuelEvent ? 11 : getBotLevelNearPlayer());'));
check('startDuelsRound: player power slice is 8 in Tower Duels, 5 in Duels', game.includes('duelTowerDeck.slice(0, isTowerDuelsMode ? TOWER_DUELS_ACTIVE_TOWER_POWERS : DUELS_ACTIVE_TOWER_POWERS).map(card => card.id);'));
check('startDuelsRound: weekend event preset path untouched', game.includes('const towerDuelPreset = isTowerDuelEvent ? towerDuelPowerLoadouts[selectedBrawler] : null;'));
check('startDuelsRound: maxed loadout re-sync (stored choice kept, defaults slow/g1, sp1 normalized)', game.includes('if (isDuelsMaxedMode) {') && game.includes("const maxedProg = getOrCreateProgress(selectedBrawler);") && game.includes("selectedGadget = maxedProg.selectedGadget || 'g1';") && game.includes("selectedStar = maxedProg.selectedStar || 'slow';") && game.includes("if (selectedStar !== 'slow' && selectedStar !== 'long') selectedStar = 'slow';"));
check('bot power cap is 8 in Tower Duels, 5 otherwise', game.includes('const cardCap = isTowerDuelsMode ? TOWER_DUELS_ACTIVE_TOWER_POWERS : 5;') && game.includes('const cardCount = Math.max(1, Math.min(cardCap, slopSushiActiveCards.length || 1));'));
check('gadget button gates on getSelectedProgress().gadgetUnlocked', game.includes('const unlocked = isTraining || !!getSelectedProgress().gadgetUnlocked;'));
check('hyper button gates on getSelectedProgress().hyperchargeUnlocked', game.includes('const unlocked = isTraining || !!getSelectedProgress().hyperchargeUnlocked;'));
check('activateHypercharge gates on getSelectedProgress().hyperchargeUnlocked', game.includes('const hcAvailable = prog.hyperchargeUnlocked || isTraining || isOrboBossMode || isBlinkEyeDodgeMode || isPowerPlayShowdownMode || isPowerPlayModifierActive();'));
check('bot hyper activation gates on bot.hyperchargeUnlocked', game.includes('function shouldBotActivateHyper(bot, target, context) {\n        if (!bot.hyperchargeUnlocked || (bot.hyperChargeCharge || 0) < 100 || bot.isHypercharged) return false;'));
check('bot gadget use gates on bot.gadgetUnlocked', game.includes('function shouldBotUseGadget(bot, target, context) {\n        if (!bot.gadgetUnlocked || (bot.botNextGadgetDecisionAt || 0) > context.now) return false;'));
check('fireSuperBot forces selectedStar none only when bot star NOT unlocked', game.includes("if (!bot.starPowerUnlocked) bot.selectedStar = 'none';"));
check('HOME_MODE_CARDS has Tower Duels right after Duels', game.includes("['duels', '⚔️', 'Duels (First to 9)', 'Draft 1 to 4 brawlers'],\n    ['tower_duels', '🗼', 'Tower Duels', 'Draft 1 to 4 brawlers • ALL 8 Tower Powers'],"));
check('HOME_PERMANENT_MODE_IDS includes tower_duels', game.includes("'knockout_3v3', 'duels', 'tower_duels', 'fused', 'power_play_showdown',"));
check('HOME_POPULAR_MODE_IDS includes tower_duels', game.includes("    'brawe_ball', 'knockout_3v3', 'duels', 'tower_duels', 'fused',"));
check('HOME_MODE_RULES duels: Level 12 + maxed loadout line, no Level 11 stats left', game.includes("duels: ['Draft 1 to 4 brawlers', 'First to win 9 rounds', 'Level 12 stats', 'All gadgets, star powers & Hypercharge', '5 Tower Powers', 'Poison storm disabled'],") && !game.includes('Level 11 stats'));
check('HOME_MODE_RULES tower_duels: Level 12 + maxed loadout + ALL 8 powers', game.includes("tower_duels: ['Draft 1 to 4 brawlers', 'First to win 9 rounds', 'Level 12 stats', 'All gadgets, star powers & Hypercharge', 'ALL 8 Tower Powers', 'Poison storm disabled'],"));
check('getShowdownModeLabel returns Tower Duels', game.includes("if (mode === 'tower_duels') return 'Tower Duels';"));
check('modeColors has tower_duels', game.includes("tower_duels: '#38bdf8',"));
check('mode tag: Tower Duels is 1V1', game.includes("else if (id === 'duels' || id === 'tower_duels' || id === 'impossible') tag = '1V1';"));
check('start button label for Tower Duels', game.includes("} else if (showdownMode === 'tower_duels' && startBtn) {\n          startBtn.textContent = '🗼 Start Tower Duels • ALL 8 Powers';"));
check('start handler opens the Tower Duels draft', game.includes("else if (showdownMode === 'tower_duels') { openTowerDuelsDraft(); return; }"));
check('draft overlay extracted to openDuelsDraftOverlay(isTowerDuels)', game.includes('function openDuelsDraftOverlay(isTowerDuels) {'));
check('openTowerDuelsDraft entry point exists', game.includes('function openTowerDuelsDraft() { openDuelsDraftOverlay(true); }'));
check('duelsBtn opens the regular Duels overlay', game.includes("duelsBtn.addEventListener('click', () => openDuelsDraftOverlay(false));"));
check('overlay title is mode-aware', game.includes("title.textContent = isTowerDuels ? 'Draft 1–4 Brawlers for Tower Duels!' : 'Draft 1–4 Brawlers for Duels!';"));
check('overlay hint is mode-aware', game.includes("draftHint.textContent = isTowerDuels ? 'Choose 1–4 fighters — ALL 8 Tower Powers active for every fighter. First to 9 rounds.' : 'Choose 1–4 fighters, then pick a format and LAUNCH.';"));
check('format row hidden in Tower Duels (fixed at 9)', game.includes("if (isTowerDuels) formatRow.style.display = 'none';"));
check('launch button label is mode-aware', game.includes("launchBtn.textContent = isTowerDuels ? 'LAUNCH TOWER DUELS' : 'LAUNCH DUELS';"));
check('launch sets isTowerDuelsMode + isDuelsMaxedMode exactly once each', (game.match(/isTowerDuelsMode = isTowerDuels;/g) || []).length === 1 && (game.match(/isDuelsMaxedMode = true;/g) || []).length === 1);
check('launch forces 9 rounds in Tower Duels', game.includes('if (isTowerDuels) duelsTargetWins = 9;'));
check('topbar banner is mode-aware (real state)', game.includes("document.getElementById('topbar').textContent = isTowerDuels ? 'Arena Forge - Tower Duels • ALL 8 Tower Powers' : 'Arena Forge - Duels • Tower Power';"));
check('bot HUD var declared', game.includes('let slopSushiBotCardHud=null;'));
check('removeSlopSushiCardHud removes the bot tray too', game.includes('function removeSlopSushiCardHud(){if(slopSushiCardHud)slopSushiCardHud.remove();slopSushiCardHud=null;if(slopSushiBotCardHud)slopSushiBotCardHud.remove();slopSushiBotCardHud=null;}'));
check('bot power tray keys off the bot REAL card list (never a faked count)', game.includes("if (isTowerDuelsMode && bots[0] && Array.isArray(bots[0].slopSushiCards) && bots[0].slopSushiCards.length) {") && game.includes("bots[0].slopSushiCards.forEach(card=>{"));
check('bot tray label is BOT POWERS', game.includes("botLabel.textContent='BOT POWERS'"));
check('resets: launchShowdownMatch clears both flags', game.includes("isTutorialMode = false;\n      isDuels = false;\n      isFusedMode = false;\n      player.fusedParts = null;\n      isTowerDuelEvent = false;\n      isTowerDuelsMode = false;\n      isDuelsMaxedMode = false;"));
check('resets: fused launch clears both flags', game.includes("isDuels = true;\n      isFusedMode = true;\n      isTowerDuelEvent = false;\n      isTowerDuelsMode = false;\n      isDuelsMaxedMode = false;"));
check('resets: weekend event launch clears both flags', game.includes("isDuels = true;\n      isTowerDuelEvent = true;\n      isTowerDuelsMode = false;\n      isDuelsMaxedMode = false;"));
check('resets: other reset sites clear both flags', (game.match(/isTowerDuelsMode = false;\n      isDuelsMaxedMode = false;/g) || []).length >= 4);
check('no global Driller-style arrays added (no new reset-site surface)', !game.includes('towerDuelsPowers = [') && !game.includes('let towerDuelsDeck'));

// ---------------------------------------------------------- 2. vm execution
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
function extractBlock(src, marker) {
  const m = src.indexOf(marker);
  assert.notEqual(m, -1, 'marker not found: ' + marker);
  let i = src.indexOf('{', m);
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
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(m, i + 1); }
  }
  throw new Error('unbalanced braces in block: ' + marker);
}

// Minimal fake DOM for the HUD test.
function fakeEl(tag) {
  const el = {
    tag, children: [], removed: false, parent: null,
    style: {}, _text: '', _html: '', title: '',
    onmouseenter: null, onmouseleave: null,
    appendChild(c) { this.children.push(c); c.parent = this; return c; },
    remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); },
  };
  Object.defineProperty(el, 'textContent', { get() { return this._text; }, set(v) { this._text = String(v); } });
  Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(v) { this._html = String(v); } });
  return el;
}
const bodyEl = fakeEl('body');
const documentStub = { body: bodyEl, createElement: (tag) => fakeEl(tag) };

const sandbox = {
  Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  performance: { now: () => 100000 },
  // --- level / progress stubs ---
  playerData: { brawlers: { outlit: { level: 5, selectedStar: 'long', selectedGadget: 'g2' }, driller: { level: 1 } } },
  localStorage: { getItem: () => '{}' },
  selectedBrawler: 'outlit',
  normalizeSelectedBrawler: () => {},
  getEffectiveBrawlerProgress: (id) => ({ level: 1, bricks: 0, gadgetUnlocked: false, starPowerUnlocked: false, hyperchargeUnlocked: false, selectedStar: 'none', selectedGadget: 'g1' }),
  getSelectedProgress: () => ({ level: 5 }),
  getBrickOpponentLevel: () => 6,
  getOrCreateProgress: (id) => (sandbox.playerData.brawlers[id] || { level: 1 }),
  // --- mode flags ---
  isTraining: false,
  isDamageFillerMode: false,
  isMirrorMode: false,
  isRankedMatch: false,
  // Friendly Battles (Phase 8): the level hooks read these, so the minimal
  // sandbox must stub them like every other mode flag above.
  isFriendlyBattle: false,
  friendlyBattleConfig: { mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: [] },
  isTowerTroubleMode: false,
  isTowerDuelEvent: false,
  isTowerDuelsMode: false,
  isDuelsMaxedMode: false,
  isSlopSushiMode: true,
  // --- duels round state ---
  slopSushiActiveCards: [],
  slopSushiCardHud: null,
  slopSushiBotCardHud: null,
  bots: [],
  selectedStar: 'none',
  selectedGadget: 'g1',
  TOWER_DUELS_ACTIVE_TOWER_POWERS: 8,
  DUELS_ACTIVE_TOWER_POWERS: 5,
  document: documentStub,
  getSlopCards: () => sandbox.slopSushiActiveCards.map((id) => ({ id, name: 'Power ' + id, icon: '🗼', desc: 'd', rarity: 'Mythic' })),
  getSlopPowerLevel: () => 0,
};
vm.createContext(sandbox);
vm.runInContext(
  [
    'getUnlocksForLevel', 'getSelectedBrawlerLevel', 'getSelectedProgress',
    'getBotLevelNearPlayer', 'removeSlopSushiCardHud', 'renderSlopSushiCardHud',
  ].map((fn) => extractFn(game, fn)).join('\n'),
  sandbox);

// --- executed: unlocks for level ---
try {
  check('getUnlocksForLevel(12): gadget + star + hyper all true', (() => {
    const u = sandbox.getUnlocksForLevel(12);
    return u.gadgetUnlocked === true && u.starPowerUnlocked === true && u.hyperchargeUnlocked === true;
  })());
  check('getUnlocksForLevel(10): hyper still locked (level gate is real)', sandbox.getUnlocksForLevel(10).hyperchargeUnlocked === false && sandbox.getUnlocksForLevel(10).starPowerUnlocked === true);
  check('getUnlocksForLevel(7): gadget only', (() => {
    const u = sandbox.getUnlocksForLevel(7);
    return u.gadgetUnlocked === true && u.starPowerUnlocked === false && u.hyperchargeUnlocked === false;
  })());
} catch (e) { failures.push('unlocks threw: ' + e.message); }

// --- executed: player level hook ---
try {
  sandbox.isDuelsMaxedMode = true;
  check('level hook: maxed Duels -> 12 even for a level-1 brawler', (() => {
    sandbox.selectedBrawler = 'driller';
    return sandbox.getSelectedBrawlerLevel() === 12;
  })());
  sandbox.isDuelsMaxedMode = false;
  sandbox.isTraining = true;
  check('level hook: training still 11', sandbox.getSelectedBrawlerLevel() === 11);
  sandbox.isTraining = false;
  sandbox.selectedBrawler = 'outlit';
  check('level hook: normal mode returns the stored level (5)', sandbox.getSelectedBrawlerLevel() === 5);
} catch (e) { failures.push('level hook threw: ' + e.message); }

// --- executed: getSelectedProgress maxed branch ---
try {
  sandbox.isDuelsMaxedMode = true;
  const prog = sandbox.getSelectedProgress();
  check('progress: maxed Duels -> level 12', prog.level === 12);
  check('progress: maxed Duels -> gadget unlocked', prog.gadgetUnlocked === true);
  check('progress: maxed Duels -> star power unlocked', prog.starPowerUnlocked === true);
  check('progress: maxed Duels -> Hypercharge unlocked (the "hc too" correction)', prog.hyperchargeUnlocked === true);
  check('progress: maxed branch keeps the base record fields (no wipe)', prog.bricks === 0 && prog.selectedGadget === 'g1');
  sandbox.isDuelsMaxedMode = false;
  const base = sandbox.getSelectedProgress();
  check('progress: non-maxed mode returns the raw base (level 1, all locked)', base.level === 1 && base.gadgetUnlocked === false && base.starPowerUnlocked === false && base.hyperchargeUnlocked === false);
} catch (e) { failures.push('progress threw: ' + e.message); }

// --- executed: bot level hook ---
try {
  sandbox.isDuelsMaxedMode = true;
  check('bot level: maxed Duels -> 12', sandbox.getBotLevelNearPlayer() === 12);
  sandbox.isDuelsMaxedMode = false;
  sandbox.isTowerDuelEvent = true;
  check('bot level: weekend event stays 11', sandbox.getBotLevelNearPlayer() === 11);
  sandbox.isTowerDuelEvent = false;
  check('bot level: normal mode uses the near-player level (stubbed 6)', sandbox.getBotLevelNearPlayer() === 6);
  check('bot level 12 unlocks everything via getUnlocksForLevel', (() => {
    const u = sandbox.getUnlocksForLevel(sandbox.getBotLevelNearPlayer() === 6 ? 12 : 12);
    return u.gadgetUnlocked && u.starPowerUnlocked && u.hyperchargeUnlocked;
  })());
} catch (e) { failures.push('bot level threw: ' + e.message); }

// --- executed: maxed loadout re-sync (real block from startDuelsRound) ---
const loadoutBlock = extractBlock(game, '// Maxed-out Duels (Anthony 2026-11-16)');
try {
  sandbox.isDuelsMaxedMode = true;
  sandbox.selectedBrawler = 'driller'; // level 1, no stored star/gadget
  sandbox.selectedStar = 'none';
  sandbox.selectedGadget = 'g1';
  vm.runInContext(loadoutBlock, sandbox);
  check('loadout: level-1 brawler gets a star power in maxed Duels (slow default)', sandbox.selectedStar === 'slow');
  check('loadout: level-1 brawler gets a gadget in maxed Duels (g1 default)', sandbox.selectedGadget === 'g1');
  sandbox.selectedBrawler = 'outlit'; // stored long + g2
  sandbox.selectedStar = 'none';
  sandbox.selectedGadget = 'g1';
  vm.runInContext(loadoutBlock, sandbox);
  check('loadout: stored star choice is kept (long stays long)', sandbox.selectedStar === 'long');
  check('loadout: stored gadget choice is kept (g2 stays g2)', sandbox.selectedGadget === 'g2');
  sandbox.getOrCreateProgress = () => ({ selectedStar: 'sp1', selectedGadget: 'g2' });
  sandbox.selectedStar = 'none';
  vm.runInContext(loadoutBlock, sandbox);
  check('loadout: legacy sp1 choice normalizes to slow (syncAbilityInputs parity)', sandbox.selectedStar === 'slow');
  sandbox.getOrCreateProgress = (id) => (sandbox.playerData.brawlers[id] || { level: 1 });
  sandbox.isDuelsMaxedMode = false;
} catch (e) { failures.push('loadout block threw: ' + e.message); }

// --- executed: tower power slice (real statement from startDuelsRound) ---
const sliceStart = game.indexOf('slopSushiActiveCards = Array.isArray(towerDuelPreset)');
const sliceEnd = game.indexOf('DUELS_ACTIVE_TOWER_POWERS).map(card => card.id);', sliceStart) + 'DUELS_ACTIVE_TOWER_POWERS).map(card => card.id);'.length;
const sliceStmt = game.slice(sliceStart, sliceEnd);
const fakeDeck = Array.from({ length: 8 }, (_, i) => ({ id: 'power_' + (i + 1) }));
try {
  sandbox.towerDuelPreset = null;
  sandbox.duelTowerDeck = [...fakeDeck];
  sandbox.isTowerDuelsMode = true;
  vm.runInContext(sliceStmt, sandbox);
  check('power slice: Tower Duels gives the player all 8 powers', sandbox.slopSushiActiveCards.length === 8 && sandbox.slopSushiActiveCards[7] === 'power_8');
  sandbox.duelTowerDeck = [...fakeDeck];
  sandbox.isTowerDuelsMode = false;
  vm.runInContext(sliceStmt, sandbox);
  check('power slice: regular Duels still gives exactly 5 powers', sandbox.slopSushiActiveCards.length === 5 && sandbox.slopSushiActiveCards[4] === 'power_5');
  sandbox.towerDuelPreset = ['preset_a', 'preset_b'];
  sandbox.isTowerDuelsMode = true;
  vm.runInContext(sliceStmt, sandbox);
  check('power slice: weekend event preset still wins over the deck', sandbox.slopSushiActiveCards.length === 2 && sandbox.slopSushiActiveCards[0] === 'preset_a');
  sandbox.towerDuelPreset = null;
} catch (e) { failures.push('power slice threw: ' + e.message); }

// --- executed: bot power cap (real lines from assignSlopSushiBotPowers) ---
const capStart = game.indexOf('const cardCap = isTowerDuelsMode');
const capEnd = game.indexOf('const cardCount = Math.max(1, Math.min(cardCap, slopSushiActiveCards.length || 1));', capStart) + 'const cardCount = Math.max(1, Math.min(cardCap, slopSushiActiveCards.length || 1));'.length;
const capLines = game.slice(capStart, capEnd);
try {
  const runCap = (tower, activeLen) => vm.runInContext(
    `(() => { isTowerDuelsMode = ${tower}; slopSushiActiveCards = Array(${activeLen}).fill('x'); ${capLines} return cardCount; })()`,
    sandbox,
  );
  check('bot cap: Tower Duels lets the bot take 8 powers', runCap(true, 8) === 8);
  check('bot cap: regular Duels still caps the bot at 5', runCap(false, 8) === 5);
  check('bot cap: short deck does not inflate the count', runCap(true, 3) === 3);
} catch (e) { failures.push('bot cap threw: ' + e.message); }

// --- executed: bot power HUD (real renderSlopSushiCardHud) ---
const mkBotCards = (n) => Array.from({ length: n }, (_, i) => ({ id: 'bot_' + (i + 1), name: 'Bot Power ' + (i + 1), icon: '🔋', desc: 'd', rarity: 'Mythic' }));
function resetHud() {
  bodyEl.children = [];
  sandbox.slopSushiCardHud = null;
  sandbox.slopSushiBotCardHud = null;
  sandbox.slopSushiActiveCards = ['p1', 'p2'];
  sandbox.isSlopSushiMode = true;
}
try {
  resetHud();
  sandbox.isTowerDuelsMode = true;
  sandbox.bots = [{ slopSushiCards: mkBotCards(8) }];
  sandbox.renderSlopSushiCardHud();
  const trays = bodyEl.children.filter((c) => !c.removed);
  check('HUD: Tower Duels renders two trays (player + bot)', trays.length === 2);
  check('HUD: player tray shows the player REAL cards (2)', trays[0] && trays[0].children.length === 2);
  const botTray = trays[1];
  check('HUD: bot tray has the BOT POWERS label', botTray && botTray.children[0] && botTray.children[0].textContent === 'BOT POWERS');
  check('HUD: bot tray shows all 8 of the bot REAL cards (never a faked count)', botTray && botTray.children.length === 9);
  check('HUD: bot tray icons come from the bot card list', botTray && botTray.children.slice(1).every((chip) => chip.textContent === '🔋'));
  sandbox.removeSlopSushiCardHud();
  check('HUD: remove clears both trays', bodyEl.children.filter((c) => !c.removed).length === 0 && sandbox.slopSushiCardHud === null && sandbox.slopSushiBotCardHud === null);

  resetHud();
  sandbox.isTowerDuelsMode = true;
  sandbox.bots = [{ slopSushiCards: mkBotCards(3) }];
  sandbox.renderSlopSushiCardHud();
  const trays3 = bodyEl.children.filter((c) => !c.removed);
  check('HUD: bot tray shows exactly the bot REAL count (3 cards -> 3 chips + label)', trays3[1] && trays3[1].children.length === 4);
  sandbox.removeSlopSushiCardHud();

  resetHud();
  sandbox.isTowerDuelsMode = false;
  sandbox.bots = [{ slopSushiCards: mkBotCards(8) }];
  sandbox.renderSlopSushiCardHud();
  check('HUD: regular Duels shows NO bot tray even with 8 bot cards', bodyEl.children.filter((c) => !c.removed).length === 1);
  sandbox.removeSlopSushiCardHud();

  resetHud();
  sandbox.isTowerDuelsMode = true;
  sandbox.bots = [{ slopSushiCards: [] }];
  sandbox.renderSlopSushiCardHud();
  check('HUD: Tower Duels with an empty bot list shows NO bot tray', bodyEl.children.filter((c) => !c.removed).length === 1);
  sandbox.removeSlopSushiCardHud();
} catch (e) { failures.push('HUD threw: ' + e.message); }

// ---------------------------------------------------------- 3. summary
if (failures.length) {
  console.error(`FAIL ${failures.length}:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
}
console.log(`tower-duels: ${passed} passed, ${failures.length} failed`);
