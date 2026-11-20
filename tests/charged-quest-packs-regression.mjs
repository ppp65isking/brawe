import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// Fixes round (2026-11-20, item 3): the Charged Up limited quest pack was
// an old/other-category quest system — deleted with LIMITED_QUESTS. The pack
// definitions, milestone rewards, and expiry copy must all stay gone.
assert.doesNotMatch(game, /LIMITED_QUEST_EVENT_ID = 'charged-up-2026-08'/, 'Charged Up event id is gone');
assert.doesNotMatch(game, /LIMITED_QUEST_DURATION_MS = 14 \* 24 \* 60 \* 60 \* 1000/, 'Charged Up duration is gone');
assert.doesNotMatch(game, /id:'super_charge_\d+'/, 'Super Charged milestones are gone');
assert.doesNotMatch(game, /id:'hyper_charge_\d+'/, 'Hyper Charged milestones are gone');
assert.doesNotMatch(game, /A limited event expires once/, 'limited-quest expiry copy is gone');
assert.match(game, /addEventQuestProgress\('activate_hypers'\)/, 'player Hyper activations still report event-quest progress');
assert.doesNotMatch(game, /makeTab\('limited'/, 'Charged packs are no longer exposed as a live tab');
assert.match(game, /className = 'charged-quest-packs'/, 'Retired rendering code remains harmless for old save compatibility');

console.log('Charged quest pack regression checks passed.');
