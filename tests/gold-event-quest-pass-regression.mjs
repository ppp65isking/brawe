import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../tactical-ui.css',import.meta.url),'utf8');

// Gold Event is RETIRED (Core Surge Overdrive build): hidden, not deleted.
// Conversion is off because the gate below makes isGoldEventActive() false.
assert.match(game,/const GOLD_EVENT_RETIRED = true;/,'Gold Event carries a retired flag');
assert.match(game,/function isGoldEventActive\(now = Date\.now\(\)\) \{\s*\n\s*if \(GOLD_EVENT_RETIRED\) return false;/,'isGoldEventActive() returns false while retired');
assert.match(game,/if \(!GOLD_EVENT_RETIRED\) makeTab\('gold', '🪙 Gold Event'\)/,'Gold Event tab is gated behind the retired flag');
assert.doesNotMatch(game,/\n\s+makeTab\('gold', '🪙 Gold Event'\)/,'no ungated Gold Event tab remains in Quest HQ');

// Retired by hiding: the state, view and commit code are preserved intact.
assert.match(game,/GOLD_EVENT_ID = 'gold-event-2026-08'/,'Gold Event id is preserved');
assert.match(game,/GOLD_EVENT_DURATION_MS=7\*24\*60\*60\*1000/,'Gold Event duration constant is preserved');
assert.match(game,/GOLD_EVENT_MATCH_COIN_CAP=25000/,'Gold Event per-match cap constant is preserved');
assert.match(game,/GOLD_EVENT_DAMAGE_PER_COIN=100/,'Gold Event conversion constant is preserved');
assert.match(game,/function createGoldEventView\(\)/,'Gold Event view code is preserved');
assert.match(game,/function addGoldEventMatchDamage\(amount\)[\s\S]{0,200}isGoldEventActive\(\)/,'Gold damage intake still routes through the (now false) active gate');
assert.match(game,/function commitGoldEventMatch\(isWin = false, now = Date\.now\(\)\)[\s\S]{0,120}isGoldEventActive\(now\)/,'Gold commit still routes through the (now false) active gate');
assert.match(game,/hpBeforeHit=Math\.max\(0,Number\(target\.hp\)\+value\)[\s\S]{0,80}Math\.min\(value,hpBeforeHit\)/,'preserved Gold intake still excludes lethal overkill damage');
assert.match(css,/\.gold-event-view\{/,'Gold Event presentation is preserved');

// Untouched Quest HQ behavior: the season tab still carries the Core Circuit Pass label.
assert.match(game,/makeTab\('season', '⚡ Core Circuit Pass'\)/,'season tab still presents the Core Circuit Pass');
assert.match(css,/\.gold-event-grid\{/,'Gold Event grid presentation is preserved');

console.log('Gold Event retirement, Quest HQ v4, and Core Circuit Pass regression checks passed.');
