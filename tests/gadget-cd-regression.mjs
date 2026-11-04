import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameCode = fs.readFileSync('game.js', 'utf8');

console.log('--- Running Gadget CD / Activation Register & Beam Stun Nerf Regression Tests ---');

// 1. Beam Super Stun is once per super per target (Round 41: replaces the old 3.0s cooldown)
assert(gameCode.includes('beamGoldenSuperId'), 'Beam stun must be stamped per golden super (once per super per target)');
assert(!gameCode.includes('now - lastStun >= 3000'), 'Old 3000ms stun cooldown must be removed (Round 41: once per super)');

// 2. GADGET_COOLDOWN_BY_BRAWLER contains all brawlers including beam
assert(gameCode.includes('beam: { g1: 13000, g2: 14000 }'), 'GADGET_COOLDOWN_BY_BRAWLER must contain beam');
assert(gameCode.includes('rager: { g1: 15000, g2: 18000 }'), 'GADGET_COOLDOWN_BY_BRAWLER must have rager cooldowns');
assert(!gameCode.includes('attackDesc: \'Timber Slam: Rager'), 'Corrupt attackDesc in GADGET_COOLDOWN_BY_BRAWLER must be removed');

// 3. registerGadgetActivation exists and is properly wired
assert(gameCode.includes('function registerGadgetActivation'), 'registerGadgetActivation must be defined');

// 4. getPlayerGadgetCooldownUntil absorbs legacy writes and does not zero out
assert(gameCode.includes('if (s === normalizeGadgetSlot(selectedGadget) && (gadgetCooldownUntil || 0) > (gadgetCooldownBySlot[s] || 0))'),
  'getPlayerGadgetCooldownUntil must absorb legacy writes to gadgetCooldownUntil');

// 5. updateGadgetButton absorbs legacy writes before checking activeUntil
assert(gameCode.includes('absorbLegacyPlayerGadgetCooldownWrite(selectedGadget, now);'),
  'updateGadgetButton must absorb legacy writes');

console.log('All Gadget CD and Beam Stun Nerf assertions passed successfully!');
