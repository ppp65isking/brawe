// Core Perk fixes (2026-10-22):
// - Guardian Revival previously had NO implementation anywhere — the respawn
//   shield was never granted. It now grants inside triggerPlayerRespawnTrinkets,
//   which every player respawn path calls.
// - Kinetic Regen (50 HP/s heal) reworked to Kinetic Magazine: +1 bonus ammo
//   slot at the capacity source, and the bonus segment of the reload only
//   accumulates while the player is moving.
// - Surge Endurance untouched (verified working).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Defs ---
assert.match(game, /id: 'kinetic', name: 'Kinetic Magazine'/, 'kinetic def must be reworked to Kinetic Magazine');
assert.doesNotMatch(game, /Heal 50 HP\/s while moving/, 'old kinetic heal text must be gone');
assert.match(game, /id: 'guardian', name: 'Guardian Revival'[\s\S]*?30% of max HP/, 'guardian def must remain');

// --- Guardian grant lives inside the respawn hook ---
const hookStart = game.indexOf('function triggerPlayerRespawnTrinkets()');
assert.ok(hookStart > -1, 'respawn trinket hook missing');
const hookBody = game.slice(hookStart, hookStart + 1600);
assert.match(hookBody, /getCorePerk\(selectedBrawler\) === 'guardian'/, 'guardian check must be in the respawn hook');
assert.match(hookBody, /grantShield\(player, Math\.round\(\(player\.maxHp \|\| 0\) \* 0\.30\)\)/, 'guardian must grant 30% max-HP shield');

// --- Kinetic capacity + movement gate ---
assert.match(game, /if\(getCorePerk\(brawlerId\)==='kinetic'\)maxAmmo\+=1;/, 'kinetic must add +1 at the capacity source');
assert.match(game, /kineticBonusSegment = getCorePerk\(selectedBrawler\) === 'kinetic' && ammo >= maxAmmo - 1/, 'bonus segment gate missing');
assert.match(game, /kineticBonusSegment && !kineticMovingNow/, 'movement gate must pause the bonus reload while still');

// --- Old heal fully retired ---
assert.doesNotMatch(game, /updateCorePerkKinetic/, 'old kinetic heal function/call must be removed');
assert.doesNotMatch(game, /kineticLastHp/, 'old kinetic heal state must be removed');

// --- Surge untouched ---
assert.match(game, /getCorePerk\(selectedBrawler\) === 'surge' \? 1\.4 : 1/, 'surge duration multiplier must remain');

console.log('core-perk-fixes regression: all checks passed');
