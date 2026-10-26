// Playtest quirk fixes regression — Anthony's order 2026-10-26
// ("we gotta prob fix those", after the 2026-10-26 browser playtest).
//
// Issue 1 — Soul Summoner modal (openSoulSummoner) could only be dismissed
// with its X button: no Escape handler, no backdrop-click handler, so the
// playtester had to reload the page. Fix wires the house modal pattern:
// Escape key + backdrop click, routed through one close helper that also
// removes the keydown listener. The summon action is synchronous, so
// dismissal is always cancel-safe.
// Issue 2 — finishCoreBreach() (the LIVE Season 3 Core Breach intro ending,
// not dead code: shouldStartCoreBreachIntro() is true for any solo/duo/trio
// Showdown while season.coreBreachCompleted is false, i.e. every first
// Solo Showdown on a fresh save) showed a fixed 4.2s, non-interactive
// "6 UNKNOWN PACKET SIGNALS DETECTED" overlay whose 6 signal names are plain
// spans that look like choices but are not clickable, and it could pop over
// an already-shown match-over screen. Rewards/flags/save all happen BEFORE
// the overlay line, so skipping or dismissing it loses nothing. Fix: skip
// the overlay when the match already ended (gameOver true); otherwise make
// it click-to-dismiss (same end state as the timer) with a hint.
//
// Soul Summoner checks EXECUTE openSoulSummoner in a vm with a stub DOM;
// finishCoreBreach checks EXECUTE it in a vm with stubbed season/document.
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
const ssEnd = game.indexOf('const BRICK_ROAD_MILESTONES', ssStart);
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

const cbStart = game.indexOf('function finishCoreBreach()');
const cbEnd = game.indexOf('function updateCoreBreachIntro', cbStart);
const cbRegion = cbStart !== -1 && cbEnd !== -1 ? game.slice(cbStart, cbEnd) : '';
check('core breach region found', cbRegion.length > 0);
check('core breach skips overlay when match already over',
  cbRegion.includes('if(gameOver){return;}'));
check('core breach overlay is click-to-dismiss',
  cbRegion.includes('overlay.onclick=()=>{clearTimeout(breachEndTimer);overlay.remove();gameOver=true;}'));
check('core breach overlay has continue hint',
  cbRegion.includes('CLICK TO CONTINUE'));
check('core breach 4.2s timer preserved',
  cbRegion.includes('setTimeout(()=>{overlay.remove();gameOver=true;},4200)'));
check('core breach still awards signals before overlay',
  cbRegion.indexOf("addPacketSignal('bird',100,'CORE BREACH',false)") !== -1 &&
  cbRegion.indexOf("addPacketSignal('bird',100,'CORE BREACH',false)") <
  cbRegion.indexOf('core-breach-ending'));
check('core breach still saves before overlay',
  cbRegion.indexOf('saveProgress();') !== -1 &&
  cbRegion.indexOf('saveProgress();') < cbRegion.indexOf('core-breach-ending'));

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

// ---------------------------------------------------------- 4. vm: finishCoreBreach
function runBreach(presetGameOver) {
  const season = { coreBreachReplayDebug: false, coreBreachCompleted: false, coreBreachSignalsRevealed: false };
  const calls = { signals: [], saved: 0, quests: 0, appended: [], timers: [], cleared: [] };
  const doc = makeDocument();
  doc.body.appendChild = (el) => { calls.appended.push(el); doc.body.children.push(el); return el; };
  const sandbox = {
    coreBreachState: { finished: false, phase: 'raid' },
    ensureSeason3State: () => ({ season }),
    addPacketSignal: (id, amt, src) => calls.signals.push([id, amt, src]),
    PACKET_DEFS: { bird: {}, skywild: {}, molten_crown: {}, iron_chorus: {}, glacier_signal: {}, umbral_garden: {}, chrono_divide: {} },
    saveProgress: () => { calls.saved++; },
    progressSeason3Quest: () => { calls.quests++; },
    document: doc,
    gameOver: presetGameOver,
    setTimeout: (cb, ms) => { const id = { cb, ms }; calls.timers.push(id); return id; },
    clearTimeout: (id) => { calls.cleared.push(id); },
    console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'finishCoreBreach') + '\nthis.__finish = finishCoreBreach;', sandbox);
  vm.runInContext('__finish();', sandbox);
  return { sandbox, calls, season, doc };
}
try {
  // Timer path + click path on a live match.
  const r = runBreach(false);
  check('vm: breach awards signals and saves before overlay',
    r.calls.signals.length > 0 && r.calls.saved === 1);
  check('vm: breach overlay created on live match', r.calls.appended.length === 1);
  const ov = r.calls.appended[0];
  check('vm: breach overlay keeps signal names',
    ov && ov.innerHTML.includes('6 UNKNOWN PACKET SIGNALS DETECTED') && ov.innerHTML.includes('SKYWILD'));
  check('vm: breach overlay has continue hint', ov && ov.innerHTML.includes('CLICK TO CONTINUE'));
  check('vm: breach timer is 4.2s', r.calls.timers.length === 1 && r.calls.timers[0].ms === 4200);
  check('vm: breach overlay click dismisses to game over',
    typeof ov.onclick === 'function' &&
    (() => { ov.onclick(); return ov.removed === true && r.sandbox.gameOver === true; })());
  check('vm: breach click clears the timer',
    r.calls.cleared.length === 1 && r.calls.cleared[0] === r.calls.timers[0]);
  const r2 = runBreach(false);
  const ov2 = r2.calls.appended[0];
  r2.calls.timers[0].cb();
  check('vm: breach timer path still ends the match',
    ov2.removed === true && r2.sandbox.gameOver === true);
  // Guard path: match already over.
  const r3 = runBreach(true);
  check('vm: breach overlay skipped when match already over', r3.calls.appended.length === 0);
  check('vm: breach rewards persist even when overlay skipped',
    r3.calls.signals.length > 0 && r3.calls.saved === 1);
} catch (e) {
  failures.push('vm: finishCoreBreach execution threw: ' + e.message);
}

console.log(`playtest-quirk-fixes-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
