import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameCode = fs.readFileSync('game.js', 'utf8');

console.log('--- Running Beam Rework & Splitter Free Instinct Regression Tests ---');

// 1. Splitter free instinct gift is GONE with the Offer Archive
// (fixes round 2026-11-20, item 5: the archive tab held the gift card).
assert(!gameCode.includes("The Splitter's Special Gift"), 'Splitter gift section is gone with the Offer Archive');
assert(!gameCode.includes('splitterInstinctFreeShardsV1'), 'Splitter free-instinct claim key is gone with the Offer Archive');
assert(!gameCode.includes("addSpecialAbilityPiece('splitter');"), 'No Splitter free-shard grant remains in the shop');

// 2. Beam Signature Ability constants & functions
assert(gameCode.includes('BEAM_SIGNATURE_COOLDOWN_MS = 12000'), 'Must have 12s signature cooldown');
assert(gameCode.includes('BEAM_SIGNATURE_HP_COST = 2300'), 'Must cost 2300 HP');
assert(gameCode.includes('function getBeamSignatureState'), 'Must have getBeamSignatureState');
assert(gameCode.includes('entity.beamSignatureSlowUntil = now + 5000'), 'Must apply slow duration on signature');

// 3. Beam Super Speed Boost (+20%)
assert(gameCode.includes("selectedBrawler === 'beam' && now < (player.beamSuperGoldenUntil || 0)) hcSpd *= 1.20"), 'Player must receive +20% move speed during Golden Super');
assert(gameCode.includes("t.brawler === 'beam' && nowTarget < (t.beamSuperGoldenUntil || 0)) activeBotSpeed *= 1.20"), 'Bots must receive +20% move speed during Golden Super');

// 4. Beam continuous laser logic
assert(gameCode.includes('function updateBeamState'), 'Must have updateBeamState function');
assert(gameCode.includes('beamPrismSplitUntil'), 'Must handle G1 Prism Split 4-second duration');
assert(gameCode.includes('beamSP1ShieldActive'), 'Must set SP1 25% shield at stage 5');
assert(gameCode.includes('dealtDamage *= 0.75'), 'Damage reduction must apply 0.75x (25% shield) when beamSP1ShieldActive');
assert(gameCode.includes('isReflectedByCrystila'), 'Must handle Crystila glass shield beam reflection');

// 5. Visual styling
assert(gameCode.includes('isReflected'), 'Render loop must handle isReflected');
assert(gameCode.includes('isRefraction'), 'Render loop must handle isRefraction');
assert(gameCode.includes('#ffd700'), 'Render loop must render golden beam');
assert(gameCode.includes('#00f5d4'), 'Render loop must render signature beam');

console.log('All Beam rework & Splitter instinct assertions passed successfully!');
