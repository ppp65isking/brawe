import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(game, /const DUELS_MAX_FIGHTERS = 4;/, 'Duels supports up to four fighters');
assert.match(game, /const DUELS_ROUND_OPTIONS = Object\.freeze\(\[7, 9, 15\]\);/, 'Duels offers first-to-7, first-to-9, and first-to-15 formats');
assert.match(game, /return DUELS_ROUND_OPTIONS\.includes\(duelsTargetWins\) \? duelsTargetWins : 9;/, 'match length uses the chosen format, defaulting to 9');
assert.match(game, /Choose 1–4 fighters/, 'draft explains the flexible squad size');
assert.match(game, /launchBtn\.disabled = drafted\.length < 1;/, 'launch needs at least one drafted fighter');
assert.match(game, /const duelsPool = getBotBrawlerPool\(\);[\s\S]*?botTeam = Array\.from\(\{length: drafted\.length\}/, 'enemy squad is randomly drawn from the bot pool');
assert.match(game, /getDuelsWinScore\(\)/, 'match scoring uses the centralized format helper');
assert.match(game, /isDuelsMaxedMode = true;/, 'Duels launch plays maxed (Power 12 + all gadgets/star powers/Hypercharge)');
assert.match(game, /const unlocks = getUnlocksForLevel\(duelBotLevel\);[\s\S]*?gadgetUnlocked: unlocks\.gadgetUnlocked,/, 'Duels bot unlocks come from its level');
assert.match(styles, /\.duels-draft-shell/, 'new responsive squad builder is styled');
assert.match(styles, /@media\(max-width:720px\)/, 'squad builder includes mobile layout');

console.log('Duels overhaul regression checks passed.');
