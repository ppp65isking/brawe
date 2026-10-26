// Soul Summoner excess souls regression — Anthony's order 2026-10-26
// ("Small bug with soul summoner: excess souls that don't go into Soul
// Water just stay there. Fix that pls.")
//
// Bug: autoSpendSoulsOnTarget() spends exactly the target's cost and never
// routes the leftover once the roster completes, and the all-unlocked
// fountain branch never sweeps souls already sitting in playerData.souls
// (leftover from the final summon, or from reward paths that bypass
// addSouls' split). The game's own all-unlocked rule (addSouls) routes NEW
// earnings 25% bank / 75% water, but no code ever transitions the
// pre-existing leftover into the fountain flow, so it just sits in the
// summoner header with nothing left to buy.
//
// Fix: new helper routeExcessSoulsToWater() moves the whole
// playerData.souls balance into soulWater and rolls water rewards; it is
// called (a) from autoSpendSoulsOnTarget() when a summon completes the
// roster, and (b) from openSoulSummoner's all-unlocked fountain branch so
// already-stranded balances sweep on next summoner open. Assumption
// (Anthony's wording): the leftover goes 100% to Soul Water, not the
// 25/75 earnings split — the bank keeps growing from new earnings only
// and stays reserved for upcoming fighters + the soul exchange.
// Untouched: summon costs, earn rates, the 25/75 split, soulBank, combat.
//
// Checks EXECUTE the real functions in a vm (brace-matched extraction,
// same pattern as playtest-quirk-fixes-regression). Run:
//   node tests/soul-summoner-excess-regression.mjs [path-to-game.js]
// The unfixed game must FAIL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const gamePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : new URL('../game.js', import.meta.url).pathname;
const game = fs.readFileSync(gamePath, 'utf8');
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

// ---------------------------------------------------------- 1. source pins
check('helper routeExcessSoulsToWater exists', game.includes('function routeExcessSoulsToWater()'));
const helperRegion = game.indexOf('function routeExcessSoulsToWater()') !== -1
  ? game.slice(game.indexOf('function routeExcessSoulsToWater()'))
  : '';
check('helper moves souls to soulWater', helperRegion.includes('playerData.soulSummoner.soulWater = (playerData.soulSummoner.soulWater || 0) + excess;'));
check('helper zeroes summoner souls', helperRegion.includes('playerData.souls = 0;'));
check('helper rolls water rewards', helperRegion.includes('checkSoulWaterRewards();'));
check('autoSpend routes leftover on final summon',
  game.includes('const stillLocked = allBrawlers.filter') && game.includes('routeExcessSoulsToWater();'));
check('fountain branch sweeps stranded souls',
  game.includes('// All Unlocked Cosmic Overflow Fountain') &&
  game.slice(game.indexOf('// All Unlocked Cosmic Overflow Fountain')).includes('routeExcessSoulsToWater();'));

// ---------------------------------------------------------- 2. stub DOM (same as quirk test)
class El {
  constructor(tag) {
    this.tagName = tag;
    this.style = {};
    this.children = [];
    this.dataset = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    this._innerHTML = '';
    this.removed = false;
    this.listeners = {};
  }
  set innerHTML(v) { this._innerHTML = v; this.children = []; }
  get innerHTML() { return this._innerHTML; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { cs.forEach((c) => this.children.push(c)); }
  setAttribute() {}
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }
  remove() { this.removed = true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}
function makeDocument() {
  const doc = {
    keydownListeners: [],
    body: new El('body'),
    createElement: (tag) => new El(tag),
    addEventListener(t, f) { if (t === 'keydown') this.keydownListeners.push(f); },
    removeEventListener(t, f) {
      if (t === 'keydown') this.keydownListeners = this.keydownListeners.filter((x) => x !== f);
    },
    getElementById: () => null,
    querySelector: () => null,
    activeElement: null,
  };
  doc.body.removeChild = (c) => { c.removed = true; };
  return doc;
}

// ---------------------------------------------------------- 3. vm: summon flow
function runSummon({ souls, unlocked, target }) {
  const unlockedMap = { ...unlocked };
  const playerData = {
    souls,
    soulSummoner: {
      claimedMilestones: {}, soulBank: 0, soulWater: 0,
      deferredQueue: [], pullCount: 0, road: [], targetBrawler: target,
      pendingWaterReward: null, pendingTargetPick: null,
    },
    unlockedBrawlers: unlockedMap,
  };
  const calls = { saved: 0, popups: [] };
  const sandbox = {
    document: makeDocument(),
    playerData,
    allBrawlers: ['outlit', 'beam', 'hope'],
    getBrawlerRarity: (b) => (b === 'outlit' ? 'Starter' : 'Rare'),
    isBrawlerUnlocked: (b) => !!unlockedMap[b],
    disabledBrawlers: new Set(),
    getSoulUnlockCostForRarity: () => 70,
    unlockBrawler: (id) => { unlockedMap[id] = true; return true; },
    ensureSoulSummonerData: () => {
      const ss = playerData.soulSummoner;
      if (ss.soulBank == null) ss.soulBank = 0;
      if (ss.soulWater == null) ss.soulWater = 0;
      playerData.souls = Math.max(0, Math.floor(playerData.souls || 0));
    },
    saveProgress: () => { calls.saved++; },
    _tryShowUnlockBrawlerPopup: (id) => { calls.popups.push(id); },
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const fn of ['_getSoulWaterRewardTable', 'checkSoulWaterRewards', 'routeExcessSoulsToWater', 'autoSpendSoulsOnTarget']) {
    vm.runInContext(extractFn(game, fn) + '\nthis.__' + fn + ' = ' + fn + ';', sandbox);
  }
  vm.runInContext('__autoSpendSoulsOnTarget();', sandbox);
  return { playerData, unlockedMap, calls };
}

try {
  // Scenario 1: final summon — leftover must land in Soul Water.
  const r1 = runSummon({ souls: 200, unlocked: { outlit: true, beam: true }, target: 'hope' });
  check('vm: final summon unlocks the last fighter', r1.unlockedMap.hope === true);
  check('vm: final summon leaves no souls in the summoner', r1.playerData.souls === 0);
  check('vm: final summon routes excess to Soul Water (130 - 100 reward cost = 30)',
    r1.playerData.soulSummoner.soulWater === 30);
  check('vm: final summon rolls a Common water reward',
    r1.playerData.soulSummoner.pendingWaterReward !== null &&
    r1.playerData.soulSummoner.pendingWaterReward.tier === 'Common' &&
    r1.playerData.soulSummoner.pendingWaterReward.cost === 100);
  check('vm: final summon still shows the unlock popup', r1.calls.popups.includes('hope'));

  // Scenario 2: non-final summon — leftover must STAY for the next target.
  const r2 = runSummon({ souls: 200, unlocked: { outlit: true }, target: 'beam' });
  check('vm: non-final summon unlocks its target', r2.unlockedMap.beam === true);
  check('vm: non-final summon keeps leftover souls for the next target', r2.playerData.souls === 130);
  check('vm: non-final summon sends nothing to Soul Water', r2.playerData.soulSummoner.soulWater === 0);
  check('vm: non-final summon rolls no water reward', r2.playerData.soulSummoner.pendingWaterReward === null);
  check('vm: non-final summon leaves the next fighter locked', r2.unlockedMap.hope !== true);
} catch (e) {
  failures.push('vm: summon flow execution threw: ' + e.message);
}

// ---------------------------------------------------------- 4. vm: helper direct
try {
  const playerData = {
    souls: 250,
    soulSummoner: { soulBank: 0, soulWater: 0, pendingWaterReward: null },
  };
  let saved = 0;
  const sandbox = {
    document: makeDocument(),
    playerData,
    ensureSoulSummonerData: () => {
      const ss = playerData.soulSummoner;
      if (ss.soulBank == null) ss.soulBank = 0;
      if (ss.soulWater == null) ss.soulWater = 0;
      playerData.souls = Math.max(0, Math.floor(playerData.souls || 0));
    },
    saveProgress: () => { saved++; },
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const fn of ['_getSoulWaterRewardTable', 'checkSoulWaterRewards', 'routeExcessSoulsToWater']) {
    vm.runInContext(extractFn(game, fn) + '\nthis.__' + fn + ' = ' + fn + ';', sandbox);
  }
  const routed = vm.runInContext('__routeExcessSoulsToWater();', sandbox);
  check('vm: helper routes the full balance', routed === 250);
  check('vm: helper zeroes summoner souls', playerData.souls === 0);
  check('vm: helper lands excess in Soul Water minus the rolled reward cost',
    playerData.soulSummoner.pendingWaterReward !== null &&
    playerData.soulSummoner.soulWater === 250 - playerData.soulSummoner.pendingWaterReward.cost);
  check('vm: helper saves', saved > 0);
  const routed2 = vm.runInContext('__routeExcessSoulsToWater();', sandbox);
  check('vm: helper is a no-op on empty balance', routed2 === 0);
} catch (e) {
  failures.push('vm: helper execution threw: ' + e.message);
}

// ---------------------------------------------------------- 5. vm: fountain sweep
try {
  const doc = makeDocument();
  const playerData = {
    souls: 250,
    soulSummoner: {
      claimedMilestones: {}, soulBank: 0, soulWater: 0,
      deferredQueue: [], pullCount: 0, road: [], targetBrawler: null,
      pendingWaterReward: null, pendingTargetPick: null,
    },
    unlockedBrawlers: {},
  };
  let saved = 0;
  const sandbox = {
    document: doc,
    playerData,
    SOUL_CONSTELLATIONS: [{ id: 'starter', name: 'Starter', cost: 170, color: '#8e8cff', icon: '✦', milestoneReward: { label: 'Test Reward' } }],
    getActiveConstellationTier: () => 'starter',
    getConstellationProgress: () => ({ total: 1, unlocked: 1, pct: 100, completed: false, brawlers: [] }),
    getOrGenerateCurrentChoices: () => ['beam', 'rocketeer', 'money_and_tax'],
    allBrawlers: ['beam', 'rocketeer', 'money_and_tax'],
    getBrawlerRarity: () => 'Rare',
    isBrawlerUnlocked: () => true,
    disabledBrawlers: new Set(),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    getSoulUnlockCostForRarity: () => 170,
    brawlerData: {
      beam: { name: 'Beam', role: 'Damage Dealer', color: '#f00' },
      rocketeer: { name: 'Rocketeer', role: 'Damage Dealer', color: '#0f0' },
      money_and_tax: { name: 'Money & Tax', role: 'Damage Dealer', color: '#ff0' },
    },
    ensureSoulSummonerData: () => {
      const ss = playerData.soulSummoner;
      if (ss.soulBank == null) ss.soulBank = 0;
      if (ss.soulWater == null) ss.soulWater = 0;
      playerData.souls = Math.max(0, Math.floor(playerData.souls || 0));
    },
    saveProgress: () => { saved++; },
    autoSpendSoulsOnTarget: () => {},
    claimSoulWaterReward: () => null,
    claimConstellationMilestone: () => {},
    rerollCurrentChoices: () => {},
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const fn of ['_getSoulWaterRewardTable', 'checkSoulWaterRewards', 'routeExcessSoulsToWater']) {
    vm.runInContext(extractFn(game, fn) + '\nthis.__' + fn + ' = ' + fn + ';', sandbox);
  }
  vm.runInContext(extractFn(game, 'openSoulSummoner') + '\nthis.__open = openSoulSummoner;', sandbox);
  vm.runInContext('__open();', sandbox);
  check('vm: fountain sweep zeroes stranded souls', playerData.souls === 0);
  check('vm: fountain sweep lands stranded souls in Soul Water minus the rolled reward cost',
    playerData.soulSummoner.pendingWaterReward !== null &&
    playerData.soulSummoner.soulWater === 250 - playerData.soulSummoner.pendingWaterReward.cost);
  check('vm: fountain sweep saves', saved > 0);
  check('vm: fountain overlay appended', doc.body.children.length > 0);
} catch (e) {
  failures.push('vm: fountain execution threw: ' + e.message);
}

console.log(`soul-summoner-excess-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
