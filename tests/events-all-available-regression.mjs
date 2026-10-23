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

// The Events tab lists the full catalog in an ALL EVENTS section, built from
// HOME_MODE_CARDS with the same retirement/system filters the game already uses.
assert.match(source, /createSection\('ALL EVENTS'/, 'an ALL EVENTS section must be created');
assert.match(source, /HOME_MODE_CARDS\.map\(\(entry\) => entry\[0\]\)/, 'ALL EVENTS must be built from the full mode catalog');
assert.match(source, /id !== 'brick_vault' \|\| TOWER_POWER_SYSTEM_ENABLED/, 'system-disabled modes must stay unlisted');
assert.match(source, /id !== 'tower_duels_weekend' \|\| TOWER_EVENT_MODES_ENABLED/, 'system-disabled modes must stay unlisted');
// Selecting any listed event must survive the selector's validity reset.
assert.match(source, /const availableIds = new Set\(\['solo', 'duo', 'trio', \.\.\.activeEventIds, \.\.\.allEventIds\]\);/, 'availableIds must include the ALL EVENTS list');

// The heading no longer advertises only the rotation.
assert.match(html, /ALL EVENTS - ALWAYS AVAILABLE/, 'events heading must reflect full availability');
assert.doesNotMatch(html, /7 LIVE EVENTS - ROTATING ALL DAY/, 'the rotation-only heading must be gone');

// The events pane must actually scroll: bounded flex column + scrollable list.
assert.match(css, /#homeEventsView\.is-active\{display:flex!important;flex-direction:column\}/, 'events view must be a flex column when active');
assert.match(css, /#homeModesSection\{flex:1 1 auto;min-height:0;overflow-y:auto!important/, 'the mode list must be the scroll container');

console.log('Events all-available + scroll fix regression checks passed.');
