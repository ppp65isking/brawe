// Home screen redesign (ordered 2026-11-03, chunky mobile-game home layout):
//  * index.html restructures the home screen into top bar / left rail /
//    center brawler stage / right rail / bottom bar with a large PLAY
//    button, keeping every existing home element ID and JS wiring intact.
//    The unreferenced wrappers (homeMain, homePlaySection,
//    homePersonalPanel) are gone; no JS referenced them.
//  * home-brawl-style.css (loaded last) owns the reskin + mobile fill
//    (dynamic viewport units + safe-area insets, responsive breakpoints).
//    It never sets #homeScreen display — match code hides the home screen
//    by toggling its inline display, and that must keep working.
//  * Fullscreen persistence: the choice is stored in localStorage and
//    re-requested on the first tap/keypress after a reload (browsers drop
//    fullscreen on reload and require a gesture). In-app navigation never
//    exits fullscreen by itself: exitFullscreen lives only in
//    toggleGameFullscreen. The silent restore path never alerts (iPhones
//    have no fullscreen API; the button's Add-to-Home-Screen fallback
//    messaging stays the iPhone path).
//  * No imported terms: neither new file may contain the phrase
//    "Brawl Stars" (visual layout inspiration only).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../home-brawl-style.css', import.meta.url), 'utf8');
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
  throw new Error('unbalanced ' + name);
}
const idCount = (id) => (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;

// ---------- (a) stylesheet wired last + zones exist ----------
check('home-brawl-style.css linked from index.html', html.includes('home-brawl-style.css'));
check('stylesheet link comes after kit-redesign.css (last in cascade)',
  html.indexOf('home-brawl-style.css') > html.indexOf('kit-redesign.css'));
for (const id of ['homeBsLeft', 'homeBsCenter', 'homeBsRight', 'homeBsBottom']) {
  check('new zone present exactly once: ' + id, idCount(id) === 1);
}

// ---------- (b) every preserved home ID present exactly once ----------
const preserved = ['homeScreen', 'homePanel', 'homeHeader', 'homeMenuBtn', 'homeTitle',
  'homeWelcomeLine', 'homeProfileChip', 'homeProfileChipName', 'homeCurrencyBar',
  'fullscreenBtn', 'homeLobbyNav', 'homeCollectionNav', 'homeEventsNav', 'homeShopNav',
  'homeActionRow', 'brawlerBtn', 'homeLobbyView', 'homeBrawlerCard', 'homeEventsView',
  'homeModesSection', 'homeModeCompactRow', 'showdownModeRow', 'homeSeasonPulse',
  'homeFeaturedOffer', 'homeCareerSnapshot', 'homeRankCard', 'homeGreeting',
  'homeDailyBrief', 'homeSelectedEventCard', 'homeSelectedEventIcon',
  'homeSelectedEventName', 'homeSelectedEventRule', 'homeProgressDock',
  'homeQuickActions', 'startMatch', 'homePersonalPanel', 'homeUtilityDetails', 'homeUtilityRow',
  'homeMobileNav', 'homeMobileLobby', 'homeMobileFighters', 'homeMobileEvents',
  'homeMobileShop', 'homeMobileMore'];
for (const id of preserved) check('preserved id exactly once: ' + id, idCount(id) === 1);
for (const id of ['homeMain', 'homePlaySection']) {
  check('dropped unreferenced wrapper gone: ' + id, idCount(id) === 0);
}
check('homeScreen keeps its inline display:flex (match hide toggles it)',
  html.includes('id="homeScreen" style="position:fixed;inset:0;display:flex'));

// ---------- (c) reskin + mobile fill in the new stylesheet ----------
check('panel grid areas cover top/strip/left/center/right/bottom/tools',
  css.includes('"top top top"') && css.includes('"left center right"') && css.includes('"bottom bottom bottom"'));
check('dynamic viewport units used', css.includes('100dvh'));
check('safe-area insets used', css.includes('env(safe-area-inset-'));
check('PLAY is in-flow (not absolute) in the bottom bar',
  css.includes('#startMatch') && /#homeScreen #startMatch \{[^}]*position: static !important/s.test(css));
check('ranked card explicitly re-shown in the bottom bar',
  /#homeScreen #homeBsBottom #homeRankCard \{[^}]*display: block !important/s.test(css));
check('medium breakpoint present', css.includes('@media (max-width: 980px)'));
check('phone breakpoint present', css.includes('@media (max-width: 700px)'));
check('short landscape breakpoint present',
  css.includes('@media (pointer: coarse) and (orientation: landscape) and (max-height: 540px)'));
check('stylesheet never sets #homeScreen display',
  !/#homeScreen \{[^}]*display\s*:/s.test(css));

// ---------- (d) fullscreen persistence wiring ----------
check('pref key defined', game.includes("const FULLSCREEN_PREF_KEY = 'arenaForgeFullscreenPref';"));
for (const fn of ['setFullscreenPref', 'wantsFullscreenRestore', 'requestGameFullscreenSilent', 'armFullscreenRestoreOnGesture']) {
  check('pref helper defined: ' + fn, game.includes('function ' + fn + '('));
}
check('toggle enter stores the preference', game.includes('setFullscreenPref(true);'));
check('toggle exit clears the preference', game.includes('setFullscreenPref(false);'));
check('fullscreenchange + webkitfullscreenchange listeners present',
  game.includes("document.addEventListener('fullscreenchange'") &&
  game.includes("document.addEventListener('webkitfullscreenchange'"));
check('restore armed at boot', game.includes('armFullscreenRestoreOnGesture();'));
check('restore skips taps on the fullscreen buttons',
  game.includes("closest('#fullscreenBtn, #matchFullscreenBtn')"));
check('silent restore path never alerts',
  !extractFn(game, 'requestGameFullscreenSilent').includes('alert(') &&
  !extractFn(game, 'armFullscreenRestoreOnGesture').includes('alert('));
check('profile chip opens the existing profile',
  game.includes("getElementById('homeProfileChip')?.addEventListener('click', () => openPlayerProfile())"));
check('chip name synced in refreshPersonalizedHome',
  game.includes("getElementById('homeProfileChipName')"));

// ---------- (e) exitFullscreen lives ONLY in toggleGameFullscreen ----------
const toggleSrc = extractFn(game, 'toggleGameFullscreen');
const countIn = (src, re) => (src.match(re) || []).length;
check('no exitFullscreen outside toggleGameFullscreen',
  countIn(game, /exitFullscreen/g) === countIn(toggleSrc, /exitFullscreen/g) &&
  countIn(game, /webkitExitFullscreen/g) === countIn(toggleSrc, /webkitExitFullscreen/g) &&
  countIn(game, /exitFullscreen/g) > 0);

// ---------- (f) pref helpers behave (evaluated with a stub store) ----------
{
  const store = new Map();
  const sandbox = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext("const FULLSCREEN_PREF_KEY = 'arenaForgeFullscreenPref';" + extractFn(game, 'setFullscreenPref') + ';' + extractFn(game, 'wantsFullscreenRestore') + ';', sandbox);
  check('pref: empty store means no restore', vm.runInContext('wantsFullscreenRestore();', sandbox) === false);
  vm.runInContext('setFullscreenPref(true);', sandbox);
  check('pref: set(true) stores 1 and wants restore', store.get('arenaForgeFullscreenPref') === '1' && vm.runInContext('wantsFullscreenRestore();', sandbox) === true);
  vm.runInContext('setFullscreenPref(false);', sandbox);
  check('pref: set(false) clears and wants no restore', !store.has('arenaForgeFullscreenPref') && vm.runInContext('wantsFullscreenRestore();', sandbox) === false);
}

// ---------- (g) wording: no imported terms in the new files ----------
check('no "Brawl Stars" phrase in index.html', !/Brawl Stars/i.test(html));
check('no "Brawl Stars" phrase in new stylesheet', !/Brawl Stars/i.test(css));

console.log(`home-screen-brawl-style: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
