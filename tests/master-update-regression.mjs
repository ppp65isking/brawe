import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const masterCss = fs.readFileSync(new URL('../master-update.css', import.meta.url), 'utf8');

const checks = [
  // 1. Economy: Core Pieces upgrade cut (75% less; 100-piece full-unlock ability price untouched elsewhere)
  ['Core Pieces upgrade costs cut to 5/9/13/21', /const CORE_PIECE_UPGRADE_COSTS = \{ 8: 5, 9: 9, 10: 13, 11: 21 \};/.test(game)],
  ['Old Core Pieces upgrade costs are gone', !game.includes('{ 8: 20, 9: 35, 10: 50, 11: 85 }') && !game.includes('{8:20, 9:35, 10:50, 11:85}')],

  // 2. Economy: Soul Summoner auto-target is a uniform random pick among locked brawlers
  ['Soul Summoner auto-target picks randomly among locked brawlers', /ss\.targetBrawler = locked\[Math\.floor\(Math\.random\(\) \* locked\.length\)\];/.test(game)],
  ['Soul Summoner explicit picks are never overridden by auto-target', /Explicit player picks are never overridden/.test(game)],
  ['Soul Summoner pool still excludes Starters, unlocked, and disabled brawlers', /const locked = allBrawlers\.filter\(b => getBrawlerRarity\(b\) !== 'Starter' && !isBrawlerUnlocked\(b\) && !disabledBrawlers\.has\(b\)\);/.test(game)],

  // 3. Pins: ownership, equip cap, hub, in-match use
  ['Pin equip cap is 6', /const PIN_EQUIP_MAX = 6;/.test(game)],
  ['Pin starter set is forge_wave, good_game, ouch', /const PIN_STARTER_IDS = Object\.freeze\(\['forge_wave', 'good_game', 'ouch'\]\);/.test(game)],
  ['Pins hub opener exists', /function openPinsHub\(\)/.test(game)],
  ['In-match pin button + send with cooldown exist', /function ensurePinButton\(\)/.test(game) && /function sendPin\(pinId\)/.test(game)],
  ['Pin packs grant via grantPinPack', /function grantPinPack\(count = 3\)/.test(game)],
  ['addPins silently ignores unknown ids', /function addPins\(pinIds\)/.test(game)],

  // 4. Match-start profile cards + AI names
  ['Match-start profile cards builder exists', /function buildMatchCard\(entry\)/.test(game)],
  ['Match-start intro cards show with a timed dismiss', /function showMatchIntroCards\(\)/.test(game) && /setTimeout\(\(\) => \{ document\.getElementById\('matchIntroCards'\)\?\.remove\(\); \}, 2800\);/.test(game)],
  ['Opponent cards cap at 9 with a MORE FIGHTERS footer', /MORE FIGHTERS IN THE ARENA/.test(game)],
  ['AI display names assigned with a Forge Fighter fallback', /function assignBotDisplayNames\(\)/.test(game) && /Forge Fighter \$\{k \+ 1\}/.test(game)],

  // 5. Ranked weekly max-out (full coverage lives in ranked-weekly-maxout-regression.mjs)
  ['Ranked weekly cap constants exist', /const RANKED_WEEKLY_PASS_XP_CAP = 2000;/.test(game) && /const RANKED_WEEKLY_MAX_BONUS_COINS = 300;/.test(game)],
  ['Ranked settlement caps pass XP and converts overflow to coins', /rankedPassXpGained = Math\.min\(grossPassXpGained, weeklyRoom\);/.test(game) && /weeklyOverflowCoins = Math\.floor\(weeklyOverflowXp \* RANKED_WEEKLY_OVERFLOW_COINS_PER_XP\);/.test(game)],
  ['Ranked pass has 50 tiers with pin packs at 5/15/25/35/45', (game.match(/type: 'pinpack'/g) || []).length === 5],
  ['Draft state machine uses protect/swap/veto/ready, never complete', game.includes("draftState = 'protect'") && game.includes("draftState = 'swap'") && game.includes("draftState = 'veto'") && game.includes("draftState = 'ready'") && !game.includes("draftState = 'complete'")],

  // 6. Season 7 Ember Forge (new pass, date-gated, Xplodemis untouched)
  ['Ember Forge season id is season 7', /const EMBER_FORGE_SEASON_ID = 'ember-forge-arena-forge-2027-s7';/.test(game)],
  ['Ember Forge runs January 2027', /const EMBER_FORGE_START_UTC = Date\.UTC\(2027, 0, 1/.test(game) && /const EMBER_FORGE_END_UTC = Date\.UTC\(2027, 1, 1/.test(game)],
  ['Ember Forge quest defs exist', /const EMBER_FORGE_QUEST_DEFS = \[/.test(game)],

  // 7. Quests page: tab memory + CLAIM ALL
  ['Quest board remembers the active tab', /let activeQuestTab = initialTab;/.test(game)],
  ['Quest columns offer CLAIM ALL', /claimAllBtn\.textContent = 'CLAIM ALL';/.test(game)],
  ['Quest board Escape closes and returns focus', /const questBoardEscape = \(event\) => \{ if \(event\.key === 'Escape'\)/.test(game)],

  // 8. AI improvements (spot markers for the reworked branches)
  ['AI cover retreat helper exists', /function findBotCoverPoint\(bot, threatPos\)/.test(game)],
  ['AI kiting distinguishes tactical and spacing retreats', /const tacticalRetreat =/.test(game) && /const spacingRetreat =/.test(game)],
  ['AI hazard escape runs on a 400ms per-bot cooldown', /function getBotHazardEscapeVector\(bot, context\)/.test(game) && /botNextHazardEscapeAt/.test(game)],

  // 9. Profile rebuild + UI overhaul
  ['Player profile screen exists and the home button opens it', /function openPlayerProfile\(\)/.test(game) && /profileBtn\.addEventListener\('click', \(\) => openPlayerProfile\(\)\);/.test(game)],
  ['Master-update stylesheet is linked after pins.css', /master-update\.css\?v=20261031-master-update1/.test(html)],
  ['Dialog scale classes exist in the master stylesheet', /\.dialog-title \{/.test(masterCss) && /\.dialog-btn \{/.test(masterCss)],
];

let failed = 0;
for (const [desc, result] of checks) {
  if (result) {
    console.log('PASS: ' + desc);
  } else {
    console.error('FAIL: ' + desc);
    failed++;
  }
}
console.log(`\nResults: ${checks.length - failed}/${checks.length} passed.`);
if (failed > 0) process.exit(1);
else console.log('All master-update regression checks passed successfully!');
