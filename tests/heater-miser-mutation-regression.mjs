import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /heater_miser:\s*\{\s*type:\s*'mutation',[\s\S]{0,180}Thermal Runaway/, 'Heater Miser registers Thermal Runaway');
assert.match(game, /const HEATER_MISER_RANGE = 540;/, 'Thermal Tether range is buffed to 540');
assert.match(game, /if \(e >= 10000\) return 1020;[\s\S]{0,220}return 180;/, 'Tether ramp is buffed from 180 to 1020');
assert.match(game, /tickDamage: sp2 \? 300 : 260/, 'Furnace damage is buffed');
assert.match(game, /HEATER_MUTATION_CHARGE_TICKS = 10;[\s\S]{0,100}HEATER_MUTATION_RUNAWAY_TICKS = 5;/, 'Mutation arms five Runaway ticks after ten connected ticks');
assert.match(game, /const tickValue = mutationTick \? Math\.round\(value \* 1\.25\) : value;/, 'Runaway ticks gain 25% power');
assert.match(game, /const pulseAmount = Math\.max\(1, Math\.round\(amount \* 0\.45\)\);[\s\S]{0,100}const radius = 135;/, 'Runaway creates a 45% thermal pulse');
assert.match(game, /const liveTargets = \[player, \.\.\.\(Array\.isArray\(bots\)/, 'Mutation pulse resolves live combatants without relying on update-local scope');

console.log('Heater Miser buff and Thermal Runaway Mutation regression checks passed!');
