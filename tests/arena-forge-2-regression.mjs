import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /Arena Forge - Triple Tower War/, 'Arena Forge title is active');
assert.match(game, /const laneXs = \[WORLD_W \* 0\.18, WORLD_W \* 0\.5, WORLD_W \* 0\.82\]/, '2.0 uses three tower lanes');
assert.match(game, /'tower', 'center', laneXs\[1\]/, 'each team receives a center tower');
assert.match(game, /lane === 'left' \? 'rail' : \(lane === 'center' \? 'prism' : 'mortar'\)/, 'towers receive distinct attack identities');
assert.match(game, /towerType === 'prism' \? \[-0\.13, 0, 0\.13\] : \[0\]/, 'Prism Tower fires a three-shot fan');
assert.match(game, /towerType === 'rail' \? 1120/, 'Rail Tower uses its fast projectile');
assert.match(game, /towerType === 'mortar' \? \.18 : 0/, 'Mortar Tower uses light homing');
assert.match(game, /towerType === 'rail' \? 42 : \(towerType === 'prism' \? 58 : 150\)/, 'tower splash radii are differentiated');

for (const card of ['quantum_rounds', 'emergency_repair', 'soul_capacitor', 'fortress_link']) {
  assert.match(game, new RegExp(`id: '${card}'`), `new Blueprint ${card} is registered`);
}
assert.match(game, /owner\?\.arenaForgeQuantumRounds[\s\S]{0,180}b\.pierce = true/, 'Quantum Rounds is functional');
assert.match(game, /collector\.arenaForgeSoulCapacitor[\s\S]{0,300}superCharge = clamp/, 'Soul Capacitor is functional');
assert.match(game, /arenaForgeFortressLink && isNearAlliedArenaForgeStructure/, 'Fortress Link is functional');
assert.match(game, /function showDamageNumber\(x, y, amount/, 'legacy Forge damage-number crash has a compatibility function');

console.log('Arena Forge regression checks passed.');
