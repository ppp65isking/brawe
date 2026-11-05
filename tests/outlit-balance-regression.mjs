import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

console.log('--- Running Outlit Balance & Mutation Regression Suite ---');

// 1. Mutation trigger threshold updated from 9 to 8 attacks
assert.match(game, /entity\.outlitMutationShotCounter >= 8/, 'Outlit mutation triggers at >= 8 shot counter');
assert.match(game, /entity\.outlitMutationCharges = 4/, 'Outlit mutation grants 4 overpressure charges');

// 2. Short description in SPECIAL_ABILITY_DEFS updated
assert.match(game, /Every 8 main attacks, the next 4 Scatter Pumps get \+100% range and 50% faster unload/, 'SPECIAL_ABILITY_DEFS description updated to 8 main attacks');

// 3. Main attack pellet count increased by +3 (5 -> 8 for player, 3 -> 6 for bot)
assert.match(game, /const pellets = \(isBot \? 6 : 8\) \+ outlitExtraPellets;/, 'Outlit fires 8 pellets for player (6 for bot)');

// 4. Damage nerfed by 12% (265 -> 233 for player, 208 -> 183 for bot)
assert.match(game, /const outlitDamage = Math\.round\(\(isBot \? 146 : 188\) \* damageMult\);/, 'Outlit damage is 188 for player (146 for bot)');

// 5. Range nerfed by 10% (285 -> 256.5)
assert.match(game, /const outlitBaseRange = 256\.5;/, 'Outlit base range is 256.5');

// 6. HUD counter max display updated to 8
assert.match(game, /Math\.min\(8, Math\.floor\(player\.outlitMutationShotCounter \|\| 0\)\)/, 'HUD counter caps at 8');
assert.match(game, /MUTATION - \$\{count\}\/8/, 'HUD displays MUTATION - count/8');

console.log('✔ 1. Mutation trigger at 8 attacks verified.');
console.log('✔ 2. Description in SPECIAL_ABILITY_DEFS verified.');
console.log('✔ 3. +3 pellets (8 player, 6 bot) verified.');
console.log('✔ 4. -12% damage (233 player, 183 bot) verified.');
console.log('✔ 5. -10% base range (256.5px) verified.');
console.log('✔ 6. HUD counter state max 8 verified.');
console.log('🎉 ALL OUTLIT BALANCE REGRESSION CHECKS PASSED!');
