import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');

assert.match(game,/DAILY_WEEKLY_QUEST_SCHEMA_VERSION = 5/,'Quest Board schema advances to v5 (fixes round: old quest buckets deleted)');
assert.doesNotMatch(game,/MEGA_QUESTS/,'Mega Quests definitions are deleted (fixes round)');
assert.doesNotMatch(game,/makeTab\('mega'/,'The retired Mega tab is no longer shown');
assert.doesNotMatch(game,/AWAKENATOR_JOURNEY_QUESTS/,'Awakenator Journey definitions are deleted (fixes round)');
assert.doesNotMatch(game,/COIN_ASCENT_QUESTS/,'Coin Ascent definitions are deleted (fixes round)');
assert.equal((game.match(/id:'coin_ascent_\d\d'/g)||[]).length,0,'Coin Ascent stages are gone');
assert.ok(!game.includes("addEventQuestProgress('collect_coins_event'"),'Match-end coins no longer progress quests');
assert.doesNotMatch(game,/mergeQuestBucket/,'Quest-bucket merge helper is deleted with the old buckets (fixes round)');
assert.match(game,/delete playerData\.questBoard\.awakenatorJourney;/,'Stale Awakenator buckets are dropped from existing saves on migrate (fixes round)');
assert.doesNotMatch(game,/const DAILY_QUESTS|const WEEKLY_QUESTS|SOUL_STARTER_QUESTS|LIMITED_QUESTS/,'All old fixed quest definitions are deleted (fixes round)');
assert.doesNotMatch(game,/makeTab\('snapper'/,'Snapper Journey is retired from the active Quest Board');
assert.doesNotMatch(game,/makeTab\('journeys'/,'The New Journeys tab is retired from the active Quest Board');
assert.doesNotMatch(game,/makeTab\('limited'/,'Charged Packs are retired from the active Quest Board');
assert.doesNotMatch(game,/GOLD_EVENT|makeTab\('gold'/,'Gold Event tab and consts are deleted (fixes round)');
assert.match(game,/function grantContractXP\(amount\)[\s\S]{0,500}board\.questLevel=after/,'claiming Quest XP now advances Contract Level');
assert.match(game,/closeBoard\(\);[\s\S]{0,120}openQuestBoard\(activeQuestTab\);/,'claiming a Contract reward redraws the Quest HQ shell so the XP bar updates immediately');
assert.doesNotMatch(game,/SNAPPER_JOURNEY_QUESTS/,'Snapper Journey definitions are fully retired while old save fields remain harmless');
assert.match(game,/specialAbilityQuestEvent: playerData\.specialAbilityQuestEvent/,'The seven-day Unleash Potential deadline persists in save data');

console.log('Quest Board v3 regression checks passed.');
