import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

for (const threshold of [100,250,500,750,1000,1500,2000,2500,3000,4000,5000,6000,7500,8500,10000,11000,12500,15000,17500,20000,22500,25000]) {
  assert.match(game, new RegExp(`threshold:${threshold}(?:,|\\})`), `reward road must include ${threshold}`);
}
assert.match(game, /for\(let threshold=30000;threshold<=max;threshold\+=5000\)/, 'Veteran milestones repeat every 5,000 Bricks');
assert.match(game, /openBrickBonV2\('road'\)/, 'visible Brick Bon shortcut opens Reward Road');
assert.match(game, /openBrickBonV2\('career'\)/, 'visible Profile shortcut opens Career');
assert.match(game, /profile:\s*\{ playerName:/, 'new saves include Profile defaults');
assert.match(game, /brickBonV2:\s*\{ claimedRoad:/, 'new saves include Brick Bon 2.0 defaults');
assert.match(game, /profile: playerData\.profile/, 'Profile is persisted');
assert.match(game, /brickBonV2: playerData\.brickBonV2/, 'Brick Bon state is persisted');
assert.match(game, /mergeProfileProgressionSave\(data\.persistent\.profile, data\.persistent\.brickBonV2\)/, 'saved Profile and Brick Bon state uses the nested compatibility merge');
assert.match(game, /bon\.claimedRoad=normalizeBrickBonClaimIds\(bon\.claimedRoad,'road'\)/, 'road claim IDs are normalized and deduplicated');
assert.match(game, /bon\.claimedChallenges=normalizeBrickBonClaimIds\(bon\.claimedChallenges,'challenge'\)/, 'challenge claim IDs are normalized and deduplicated');
assert.match(game, /function claimProfileProgressionReward/, 'Brick Bon claims use a centralized idempotent claim helper');
assert.match(game, /bon\[key\]\.push\(claimId\);\s*for\(const reward of rewards\|\|\[\]\)applyProfileReward\(reward\);\s*saveProgress\(\)/, 'claims are recorded before rewards and saved immediately');
assert.match(game, /starrDropsToday: playerData\.starrDropsToday/, 'daily Tapper count is serialized');
assert.match(game, /playerData\.starrDropsToday = data\.persistent\.starrDropsToday/, 'daily Tapper count is restored');
assert.match(game, /ownedSkins: playerData\.ownedSkins/, 'owned skins are serialized in the canonical save');
assert.match(game, /selectedSkins: playerData\.selectedSkins/, 'selected skins are serialized in the canonical save');
assert.doesNotMatch(game, /TROPHIES|Total Trophies|trophyDelta/, 'BRAWE progression must remain Brick-based without a trophy system');
assert.match(game, /profile\.favorites=.*slice\(0,3\)/, 'Profile favorites are capped at three');
assert.match(game, /showcaseBadges=.*slice\(0,3\)/, 'showcase badges are capped at three');
assert.match(game, /endCareer\.matchesPlayed \+= 1/, 'new matches update Career stats');
assert.match(game, /careerStats\.eliminations \+= 1/, 'credited player eliminations update Career stats');
assert.match(game, /const costs = \[0, 50, 100, 175, 300, 500, 750, 1050, 1400, 2000, 3000, 4200\]/, 'Power 1 through 12 upgrade costs match the 13,525 coin curve');
for (const id of ['depth_25_250','depth_15_500','depth_10_750','depth_5_1000','prestige_25_roster','prestige_2_five','prestige_3_three']) assert.match(game,new RegExp(id));
for (const badge of ['roster_quarter','roster_deep_15','roster_elite_10','brick_masters','prestige_legion','double_stack','triple_threat']) assert.match(game,new RegExp(`${badge}:\\{name:`));
assert.match(game, /function formatProfileReward/);
assert.match(game, /BRICKS TO GO/);
assert.match(styles, /\.brick-bon-v2-overlay/);
assert.match(styles, /\.profile-hero/);
assert.match(styles, /\.brawler-upgrade-summary/);
assert.doesNotMatch(styles, /architect[^}]*animation:/i, 'Architect profile styling must not add a continuous animation');

console.log('Brick Bon 2.0, Profile, and brawler progression regression checks passed.');
