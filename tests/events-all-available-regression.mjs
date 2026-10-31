import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tactical-ui.css', import.meta.url), 'utf8');

// Capture the Turkey is released early: a permanent mode with no launch guard.
assert.match(source, /'damage_filler', 'capture_turkey', 'prop_hunt'\];/, 'capture_turkey must be a permanent home mode');
assert.doesNotMatch(source, /showdownMode === 'capture_turkey' && !isTurkeyTroubleSeasonActive\(\)/, 'the Nov 1 launch guard for Capture the Turkey must be gone');
assert.match(source, /LIVE EARLY/, 'the Capture the Turkey card must announce the early release');
// ...while Christmas Showdown keeps its season gate.
assert.match(source, /showdownMode === 'christmas_showdown' && !isXplodemisSeasonActive\(\)/, 'Christmas Showdown must stay season-gated');

// Events redesign: POPULAR EVENTS always available, the rest rotate daily.
assert.match(source, /createSection\('POPULAR EVENTS'/, 'a POPULAR EVENTS section must be created');
assert.match(source, /HOME_POPULAR_MODE_IDS\.forEach/, 'POPULAR EVENTS must be built from HOME_POPULAR_MODE_IDS');
assert.match(source, /createSection\('ROTATING EVENTS'/, 'a ROTATING EVENTS section must be created');
assert.match(source, /const dailyEventIds = getHomeDailyRotationIds\(\);/, 'rotating section must be built from the daily rotation');
assert.doesNotMatch(source, /createSection\('ALL EVENTS'/, 'the ALL EVENTS section must be gone');
// Selecting any listed event must survive the selector's validity reset.
assert.match(source, /const availableIds = new Set\(\['solo', 'duo', 'trio', \.\.\.HOME_POPULAR_MODE_IDS, \.\.\.dailyEventIds\]\);/, 'availableIds must be popular + daily ids');
assert.match(source, /id !== 'brick_vault' \|\| TOWER_POWER_SYSTEM_ENABLED/, 'daily pool must keep system filters');
assert.match(source, /id !== 'prop_hunt' \|\| PROP_HUNT_ENABLED/, 'daily pool must keep prop-hunt filter');
assert.match(source, /id !== 'tombstone_boss' \|\| TOMBSTONE_BOSS_ENABLED/, 'daily pool must keep tombstone filter');

// The heading no longer advertises only the rotation.
assert.match(html, /POPULAR EVENTS - ALWAYS AVAILABLE/, 'events heading must reflect popular availability');
assert.doesNotMatch(html, /7 LIVE EVENTS - ROTATING ALL DAY/, 'the rotation-only heading must be gone');

// The events pane must actually scroll: bounded flex column + scrollable list.
assert.match(css, /#homeEventsView\.is-active\{display:flex!important;flex-direction:column\}/, 'events view must be a flex column when active');
assert.match(css, /#homeModesSection\{flex:1 1 auto;min-height:0;overflow-y:auto!important/, 'the mode list must be the scroll container');

console.log('Events popular + daily rotation regression checks passed.');
