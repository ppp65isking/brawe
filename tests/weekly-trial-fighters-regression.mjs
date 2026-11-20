import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const tactical=fs.readFileSync(new URL('../tactical-ui.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

assert.match(game,/weeklyTrials:\s*\{ schemaVersion:1, weekKey:'', fighterIds:\[\], fallbackSpecials:false, loadouts:\{\} \}/,'new saves initialize weekly trials safely');
assert.match(game,/function getWeeklyTrialWeekInfo[\s\S]{0,420}\+ 7 \* 86400000/,'rotation uses one persistent UTC week');
assert.match(game,/function isPermanentlyMaxedBrawler[\s\S]{0,360}level[^\n]+>= 11[\s\S]{0,220}gadgetUnlocked[\s\S]{0,120}starPowerUnlocked[\s\S]{0,120}hyperchargeUnlocked/,'fully maxed permanent fighters are excluded');
assert.match(game,/pickWeeklyTrialFighters\(pool, WEEKLY_TRIAL_FIGHTER_COUNT,week\.key\)/,'weekly trials pick WEEKLY_TRIAL_FIGHTER_COUNT fighters (2 per week, rebuild stage 5)');
assert.match(game,/const WEEKLY_TRIAL_FIGHTER_COUNT = 2;/,'trial count is 2 per week');
assert.match(game,/function getEffectiveBrawlerProgress[\s\S]{0,600}level:11[\s\S]{0,180}gadgetUnlocked:true[\s\S]{0,120}starPowerUnlocked:true[\s\S]{0,120}hyperchargeUnlocked:true/,'trial fighters receive temporary Power 11 and full core loadout access');
assert.match(game,/loadout\.ownedTrinkets = TRINKET_DEFS\.map/,'every Trinket choice is available temporarily');
assert.match(game,/function getPlayerHyperMainActive\(brawlerId\) \{ return !!isHypercharged; \}/,'Core Surge main upgrades no longer depend on weekly-trial Attachies');
assert.match(game,/if \(isWeeklyTrialBrawler\(fighterId\)\) return true/,'available Specials work during trial matches');
assert.match(game,/!isBrawlerUnlocked\(selectedBrawler\) && !isWeeklyTrialBrawler\(selectedBrawler\)/,'selection normalization preserves locked weekly guests');
assert.match(game,/weeklyTrials: playerData\.weeklyTrials/,'weekly picks and trial loadouts persist in the normal save');
assert.match(game,/className\s*=\s*'weekly-trial-panel'/,'fighter screen renders the weekly trial circuit');
assert.match(game,/WEEKLY TRIAL FIGHTER[\s\S]{0,260}COMPLETE KIT ACCESS/,'fighter detail makes temporary access obvious');
assert.match(css,/\.weekly-trial-panel\{[\s\S]{0,220}grid-template-columns/,'weekly circuit has a deliberate desktop layout');
assert.match(tactical,/Fighter HQ v3[^\n]+game-first roster/,'the final stylesheet uses the game-first Fighter HQ composition');
assert.match(tactical,/grid-template-columns:minmax\(540px,2fr\) minmax\(310px,\.82fr\)/,'desktop Fighter HQ uses a dedicated roster and hero stage');
assert.match(game,/brawler-browser__selected-actions[\s\S]{0,220}EDIT LOADOUT[\s\S]{0,160}USE FIGHTER/,'the selected fighter stage exposes the two primary actions');
assert.match(html,/bootstrap\.js\?v=202609/,'release token refreshes the runtime');

console.log('BRAWE weekly Trial Fighters and Fighter HQ regression checks passed.');
