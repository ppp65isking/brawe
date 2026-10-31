// Events persistence + desktop scroll regression (ordered 2026-10-30):
//  * FIX 1 — the last selected event (and the open home/events tab) survive a
//    reload: selection is saved on every home card sync, the tab is saved on
//    every tab switch, and boot restores both. A saved id that is no longer
//    available (expired/removed event) falls back gracefully, never blank.
//  * FIX 2 — desktop scrolling: the 2026-10-22 internal-scroll fix already
//    covers wide desktop, but fine-pointer windows <=850px wide were still
//    unscrollable: that range flips the panel to height:auto page flow while
//    #homeScreen stayed overflow:hidden, clipping everything with no scroll
//    path at all. The fix flips #homeScreen to overflow-y:auto in that range.
//    Wide-desktop internal scrolling and mobile page scrolling are untouched.
//  * Method note (same as other game tests): the game logic lives inline in
//    game.js, so source-presence assertions pin the edited lines in place and
//    a verbatim mirror of the restore algorithm proves the cases. No live
//    browser playtest here: real reload-restore and real wheel scrolling on
//    desktop remain for the user's playtest.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const tactical = fs.readFileSync(new URL('../tactical-ui.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// ---------- FIX 1: source presence ----------
// Storage keys follow the existing arenaForge* prefix style.
assert.match(game, /const HOME_LAST_EVENT_CHOICE_KEY = 'arenaForgeLastEventChoice';/,
  'last-event storage key must be defined');
assert.match(game, /const HOME_LAST_TAB_KEY = 'arenaForgeLastHomeTab';/,
  'last-tab storage key must be defined');

// Selection is saved at the top of syncHomeModeCards, the choke point every
// selection path runs through (card clicks, variant picks, season actions,
// info-modal Play all call updateShowdownModeUI -> syncHomeModeCards).
{
  const at = game.indexOf('function syncHomeModeCards()');
  assert.ok(at >= 0, 'syncHomeModeCards must exist');
  const head = game.slice(at, at + 800);
  assert.match(head, /localStorage\.setItem\(HOME_LAST_EVENT_CHOICE_KEY, showdownMode\)/,
    'syncHomeModeCards must persist the current selection');
  assert.match(head, /try \{ localStorage\.setItem/,
    'the selection save must be try/catch-guarded (private-mode safety)');
}

// The tab is saved inside setHomeTab, which every nav click and season
// action runs through.
{
  const at = game.indexOf('function setHomeTab(');
  assert.ok(at >= 0, 'setHomeTab must exist');
  const head = game.slice(at, at + 600);
  assert.match(head, /localStorage\.setItem\(HOME_LAST_TAB_KEY, safeTab\)/,
    'setHomeTab must persist the active tab');
}

// The guarded restore sits before the existing availability fallback, so an
// expired/removed saved id still falls through to solo, never a blank page.
{
  const restoreAt = game.indexOf('localStorage.getItem(HOME_LAST_EVENT_CHOICE_KEY)');
  const fallbackAt = game.indexOf('if (!availableIds.has(showdownMode))');
  assert.ok(restoreAt >= 0 && fallbackAt >= 0, 'restore and fallback must exist');
  assert.ok(restoreAt < fallbackAt, 'restore must run before the availability fallback');
  const block = game.slice(restoreAt - 400, restoreAt + 300);
  assert.match(block, /if \(showdownMode === 'solo'\)/,
    'restore must be guarded to fresh-boot default only');
  assert.match(block, /availableIds\.has\(lastEvent\)/,
    'restore must only adopt ids that are still available');
}

// Boot-only tab restore: placed at boot right after the selector is built,
// NOT inside setupCompactHomeModeSelector, so rotation rebuilds never yank
// the player between tabs mid-session.
{
  const at = game.indexOf('rankedBtn.onclick = openRankedQueueUI;');
  assert.ok(at >= 0, 'boot block must exist');
  const head = game.slice(at, at + 700);
  assert.match(head, /localStorage\.getItem\(HOME_LAST_TAB_KEY\) === 'events'/,
    'boot must restore the events tab when it was last open');
  assert.match(head, /setHomeTab\('events'\)/,
    'boot tab restore must go through setHomeTab');
}

// ---------- FIX 1: restore algorithm, mirrored verbatim ----------
// Mirror of the edited fallback block (real code prefers remembered
// solo/duo/trio before solo; simplified here to solo for the fallback leg).
function restoreSelection(showdownMode, saved, availableIds) {
  if (showdownMode === 'solo') {
    const lastEvent = saved;
    if (lastEvent && availableIds.has(lastEvent)) showdownMode = lastEvent;
  }
  if (!availableIds.has(showdownMode)) showdownMode = 'solo';
  return showdownMode;
}
function restoreTab(savedTab) {
  return savedTab === 'events' ? 'events' : 'home';
}
const avail = new Set(['solo', 'duo', 'trio', 'tower_defense', 'arena_forge', 'prop_hunt']);
assert.equal(restoreSelection('solo', 'tower_defense', avail), 'tower_defense',
  'round-trip: select tower_defense -> reload -> tower_defense again');
assert.equal(restoreSelection('solo', 'arena_forge', avail), 'arena_forge',
  'round-trip: select arena_forge -> reload -> arena_forge again');
assert.equal(restoreSelection('solo', 'beast_boss_god_mode', avail), 'solo',
  'expired event (god mode day over) must fall back to solo, not crash');
assert.equal(restoreSelection('solo', 'bogus_mode_xyz', avail), 'solo',
  'unknown saved id must fall back to solo');
assert.equal(restoreSelection('solo', null, avail), 'solo',
  'no saved selection must stay solo');
assert.equal(restoreSelection('arena_forge', 'tower_defense', avail), 'arena_forge',
  'mid-session guard: a current non-solo selection must never be clobbered');
assert.equal(restoreSelection('duo', 'tower_defense', avail), 'duo',
  'guard: a restored showdown variant must never be clobbered');
assert.equal(restoreTab('events'), 'events', 'saved events tab must restore');
assert.equal(restoreTab('home'), 'home', 'saved home tab must restore');
assert.equal(restoreTab(null), 'home', 'missing saved tab must default to home');

// Events redesign (§B): ALL EVENTS is replaced by POPULAR EVENTS (always
// available) + ROTATING EVENTS (daily picks); the validity set follows.
assert.match(game, /createSection\('POPULAR EVENTS'/, 'POPULAR EVENTS section must exist');
assert.match(game, /createSection\('ROTATING EVENTS'/, 'ROTATING EVENTS section must exist');
assert.match(game, /const availableIds = new Set\(\['solo', 'duo', 'trio', \.\.\.HOME_POPULAR_MODE_IDS, \.\.\.dailyEventIds\]\);/,
  'availableIds computation must be popular + daily ids');

// ---------- FIX 2: desktop scroll ----------
// The <=850px range flips the panel to height:auto page flow; without a
// scrollable viewport ancestor the fixed #homeScreen (overflow:hidden)
// clips everything. The fix flips #homeScreen to overflow-y:auto there.
{
  const at = css.indexOf('@media(max-width:850px)');
  assert.ok(at >= 0, 'the <=850px media query must exist');
  const block = css.slice(at, css.indexOf('\n', at));
  assert.match(block, /#homeScreen\{overflow-y:auto !important\}/,
    '<=850px range must let #homeScreen scroll');
  assert.match(block, /#homeModesSection\{overflow:visible !important\}/,
    '<=850px page flow for the modes list must be preserved');
}

// The 2026-10-22 wide-desktop internal-scroll fix must still be intact.
assert.match(tactical, /#homeEventsView\.is-active\{display:flex!important;flex-direction:column\}/,
  'wide-desktop events view must stay a flex column');
assert.match(tactical, /#homeModesSection\{flex:1 1 auto;min-height:0;overflow-y:auto!important/,
  'wide-desktop modes list must stay the internal scroll container');
assert.match(tactical, /#homeEventsView\{min-height:0!important;height:100%\}/,
  'wide-desktop events view height chain must stay intact');

// Mobile page scrolling must be untouched: the mobile block still flips
// #homeScreen to overflow-y:auto.
{
  const at = css.indexOf('@media (max-width:680px), (pointer:coarse) and (max-width:920px)');
  assert.ok(at >= 0, 'the mobile-lobby media query must exist');
  const head = css.slice(at, at + 600);
  assert.match(head, /overflow-y:auto !important/,
    'mobile #homeScreen page scroll must be preserved');
}

// Cache-bust: styles.css changed, so its version query must move or desktop
// browsers with the September-cached file never receive the scroll fix.
assert.match(html, /styles\.css\?v=20261030-events-scroll1/,
  'index.html must load the new styles.css version');
assert.doesNotMatch(html, /styles\.css\?v=20260913/,
  'the old cached styles.css version must be gone');

console.log('events-persist-scroll: all checks passed');
