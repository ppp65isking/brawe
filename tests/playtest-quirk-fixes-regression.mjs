// Playtest quirk fixes regression — Anthony's order 2026-10-26
// ("we gotta prob fix those", after the 2026-10-26 browser playtest).
//
// Issue 1 — Soul Summoner modal (openSoulSummoner) could only be dismissed
// with its X button: no Escape handler, no backdrop-click handler, so the
// playtester had to reload the page. Fix wires the house modal pattern:
// Escape key + backdrop click, routed through one close helper that also
// removes the keydown listener. The summon action is synchronous, so
// dismissal is always cancel-safe.
// Issue 2 — finishCoreBreach() (Season 3 Core Breach intro) was DELETED with
// the Core Breach intro in the big-changes deletions; its checks are gone.
// Only the Soul Summoner fix (Issue 1) remains in this suite.
//
// Soul Summoner checks EXECUTE openSoulSummoner in a vm with a stub DOM.
// Run against a game path: node tests/playtest-quirk-fixes-regression.mjs
// [path-to-game.js] (default: ../game.js). The unfixed game must FAIL.
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

// Same brace-matching extractor as moneytax-art-fix-regression.
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
const ssStart = game.indexOf('function openSoulSummoner()');
const ssEnd = game.indexOf('  function getUpgradeCost(level)', ssStart);
const ssRegion = ssStart !== -1 && ssEnd !== -1 ? game.slice(ssStart, ssEnd) : '';
check('soul summoner region found', ssRegion.length > 0);
check('soul summoner has Escape handler', ssRegion.includes("event.key === 'Escape'"));
check('soul summoner Escape stops propagation', ssRegion.includes('event.stopPropagation(); closeSoulSummoner();'));
check('soul summoner close helper removes keydown listener',
  ssRegion.includes("document.removeEventListener('keydown', soulSummonerKeyboard)"));
check('soul summoner backdrop click guards on overlay itself',
  ssRegion.includes('overlay.onclick') && ssRegion.includes('if (e.target === overlay) closeSoulSummoner();'));
check('soul summoner X button routes through close helper',
  ssRegion.includes('closeBtn.onclick = () => closeSoulSummoner();'));
check('soul summoner registers keydown listener',
  ssRegion.includes("document.addEventListener('keydown', soulSummonerKeyboard);"));

// ---------------------------------------------------------- 2. stub DOM
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

// ---------------------------------------------------------- 3. vm: Soul Summoner
try {
  const doc = makeDocument();
  const playerData = {
    souls: 1000000,
    soulSummoner: {
      claimedMilestones: {}, soulBank: 0, soulWater: 0,
      deferredQueue: [], pullCount: 0, road: [], targetBrawler: null,
    },
    unlockedBrawlers: {},
  };
  const sandbox = {
    document: doc,
    playerData,
    SOUL_CONSTELLATIONS: [{ id: 'starter', name: 'Starter', cost: 170, color: '#8e8cff', icon: '✦', milestoneReward: { label: 'Test Reward' } }],
    getActiveConstellationTier: () => 'starter',
    getConstellationProgress: () => ({ total: 1, unlocked: 0, pct: 0, completed: false, brawlers: [] }),
    getOrGenerateCurrentChoices: () => ['beam', 'rocketeer', 'money_and_tax'],
    allBrawlers: ['beam', 'rocketeer', 'money_and_tax'],
    getBrawlerRarity: () => 'Rare',
    isBrawlerUnlocked: () => false,
    disabledBrawlers: new Set(),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    getSoulUnlockCostForRarity: () => 170,
    brawlerData: {
      beam: { name: 'Beam', role: 'Damage Dealer', color: '#f00' },
      rocketeer: { name: 'Rocketeer', role: 'Damage Dealer', color: '#0f0' },
      money_and_tax: { name: 'Money & Tax', role: 'Damage Dealer', color: '#ff0' },
    },
    ensureSoulSummonerData: () => {
      if (!playerData.soulSummoner) playerData.soulSummoner = {};
    },
    saveProgress: () => {},
    autoSpendSoulsOnTarget: () => {},
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const fnSrc = extractFn(game, 'openSoulSummoner');
  vm.runInContext(fnSrc + '\nthis.__open = openSoulSummoner;', sandbox);
  vm.runInContext('__open();', sandbox);
  const overlay = doc.body.children[doc.body.children.length - 1];
  check('vm: soul summoner overlay appended', !!overlay && overlay.tagName === 'div');
  check('vm: soul summoner keydown listener registered', doc.keydownListeners.length === 1);
  const keyHandler = doc.keydownListeners[0];
  const panel = overlay.children[0];
  // Escape dismisses and unregisters.
  let stopped = false;
  check('vm: soul summoner Escape handler is callable', typeof keyHandler === 'function');
  if (typeof keyHandler === 'function') {
    keyHandler({ key: 'Escape', stopPropagation: () => { stopped = true; } });
  }
  check('vm: Escape dismisses soul summoner overlay', overlay.removed === true);
  check('vm: Escape stops propagation', stopped === true);
  check('vm: Escape listener removed after close', doc.keydownListeners.length === 0);
  // Fresh open: backdrop click dismisses, panel click does not.
  vm.runInContext('__open();', sandbox);
  const overlay2 = doc.body.children[doc.body.children.length - 1];
  const panel2 = overlay2.children[0];
  check('vm: backdrop click dismisses soul summoner',
    typeof overlay2.onclick === 'function' &&
    (() => { overlay2.onclick({ target: overlay2 }); return overlay2.removed === true; })());
  vm.runInContext('__open();', sandbox);
  const overlay3 = doc.body.children[doc.body.children.length - 1];
  const panel3 = overlay3.children[0];
  check('vm: panel click does NOT dismiss soul summoner',
    typeof overlay3.onclick === 'function' &&
    (() => { overlay3.onclick({ target: panel3 }); return overlay3.removed !== true; })());
  check('vm: panel reference resolved', !!panel && !!panel2 && !!panel3);
} catch (e) {
  failures.push('vm: soul summoner execution threw: ' + e.message);
}

console.log(`playtest-quirk-fixes-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
