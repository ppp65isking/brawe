import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. 6 New Ranks & RANKED_DIVISIONS (25 total)
  ['RANKED_DIVISIONS contains 25 divisions', (game.match(/label:\s*'Brick/g) || []).length >= 25],
  ['Brick Champion I division registered', /label:\s*'Brick Champion I'/i.test(game)],
  ['Brick Champion II division registered', /label:\s*'Brick Champion II'/i.test(game)],
  ['Brick Champion III division registered', /label:\s*'Brick Champion III'/i.test(game)],
  ['Brick Legend I division registered', /label:\s*'Brick Legend I'/i.test(game)],
  ['Brick Legend II division registered', /label:\s*'Brick Legend II'/i.test(game)],
  ['Brick Legend III division registered', /label:\s*'Brick Legend III'/i.test(game)],
  ['Division safety floor handles 2200 RP for Legend', /if\s*\(points\s*>=\s*2200\)\s*return 2200;/.test(game)],
  ['Division safety floor handles 1900 RP for Champion', /if\s*\(points\s*>=\s*1900\)\s*return 1900;/.test(game)],
  ['isRankedAboveBrickFume helper function implemented', /function isRankedAboveBrickFume\s*\(pointsRaw\)\s*\{[\s\S]*?return points >= 1300;[\s\S]*?\}/.test(game)],

  // 2. Dual Modifier Selection Above Brick Fume
  ['activeRankedModifierSecondary declared and tracked', /let activeRankedModifierSecondary\s*=\s*null;/.test(game)],
  ['Queue checks isRankedAboveBrickFume for dual modifiers', /const aboveBrickFume\s*=\s*isRankedAboveBrickFume\(rankedPoints\);/.test(game)],
  ['Dual modifiers randomly select two distinct mutators when above Brick Fume', /if\s*\(aboveBrickFume\)\s*\{[\s\S]*?draftModifierKey\s*=\s*shuffled\[0\][\s\S]*?draftModifierKeySecondary\s*=\s*shuffled\[1\]/.test(game)],
  ['Draft banner renders DUAL MODIFIER callout when secondary modifier exists', /⚡ DUAL MODIFIER:[\s\S]*?modDef1\.icon[\s\S]*?modDef2\.icon/.test(game)],
  ['Draft summary includes dual modifier names', /const modSummaryLabel\s*=\s*activeRankedModifierSecondary\s*\?/.test(game)],
  ['clearRankedSessionState resets both primary and secondary modifiers', /activeRankedModifier\s*=\s*'classic';\s*activeRankedModifierSecondary\s*=\s*null;/.test(game)],

  // 3. Ranked Friendly Fire Fixes & Visibility
  ['renderRankedModifierHUD called universally for all ranked matches before gameOver', /if\s*\(\(isRankedMatch \|\| isCustomMutatorMatch\) && !gameOver\)\s*renderRankedModifierHUD\(ctx\);/.test(game)],
  ['renderRankedModifierHUD supports dual modifier display badge', /ctx\.fillText\(`\${label1}\s*•\s*\${label2}/.test(game)],
  ['isFriendlyFireActive checks all three slots via isMutatorActive', /function isFriendlyFireActive\(\)[\s\S]*?isMutatorActive\('friendly_fire'\)/.test(game)],
  ['Friendly fire match start floating warning runs independently', /if\s*\(isMutatorActive\('friendly_fire'\)\)/.test(game)],
  ['Bullet vs bot friendly fire hit check allows friendly fire damage when active', /if \(!isFriendlyFireActive\(\)\) continue; \/\/ skip friendly fire unless modifier is active/.test(game)],

  // 4. Dual Modifier Gameplay Effects
  ['colossus_friend match start handles every slot via isMutatorActive', /if\s*\(isMutatorActive\('colossus_friend'\)\)/.test(game)],
  ['colossus_friend respawn shield handles every slot via isMutatorActive', /isMutatorActive\('colossus_friend'\) && activeColossusMaxHp/.test(game)],
  ['always_hyper match start handles every slot via isMutatorActive', /if\s*\(isMutatorActive\('always_hyper'\)/.test(game)],
  ['always_hyper respawn persistence handles every slot via isMutatorActive', /isMutatorActive\('always_hyper'\)\s*\|\|\s*isHyperForgeLTM\)\s*\{[\s\S]*?setEntityHypercharged\(entity, now \+ 999999999, now\);/.test(game)],
  ['always_hyper expiration exemption handles every slot via isMutatorActive', /!isMutatorActive\('always_hyper'\)/.test(game)],
  ['hyper_overdrive passive charge handles every slot via isMutatorActive', /if\s*\(isMutatorActive\('hyper_overdrive'\)\)/.test(game)],
  ['super_surge passive and hit charge handles every slot via isMutatorActive', (game.match(/isMutatorActive\('super_surge'\)/g) || []).length >= 2],
  ['quickfire attack ammo refund handles every slot via isMutatorActive', /isMutatorActive\('quickfire'\) && !source\?\.super/.test(game)],
  ['crowd_uncontrol crowd reflection handles every slot via isMutatorActive', (game.match(/isMutatorActive\('crowd_uncontrol'\)/g) || []).length === 3],
  ['timed_detonation wave timer handles every slot via isMutatorActive', /function triggerTimedDetonationWave\(\)[\s\S]*?!isMutatorActive\('timed_detonation'\)/.test(game)],

  // 5. Public Game Debug Exports
  ['window.__pureHTMLGame exports activeRankedModifierSecondary', /get activeRankedModifierSecondary\(\)\s*\{\s*return activeRankedModifierSecondary;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports isRankedAboveBrickFume', /get isRankedAboveBrickFume\(\)\s*\{\s*return isRankedAboveBrickFume;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports RANKED_DIVISIONS', /get RANKED_DIVISIONS\(\)\s*\{\s*return RANKED_DIVISIONS;\s*\}/.test(game)],

  // 6. Master update: prestige ladder, 2400 floor, weekly cap, queue pool, pin packs
  ['Division safety floor adds the 2400 RP rung above 2200', /if\s*\(points\s*>=\s*2400\)\s*return 2400;[\s\S]*?if\s*\(points\s*>=\s*2200\)\s*return 2200;/.test(game)],
  ['Ranked weekly pass-XP cap is 2000', /const RANKED_WEEKLY_PASS_XP_CAP = 2000;/.test(game)],
  ['Ranked weekly overflow converts at 1 coin per 5 XP', /const RANKED_WEEKLY_OVERFLOW_COINS_PER_XP = 1 \/ 5;/.test(game)],
  ['Ranked weekly max bonus is 300 coins', /const RANKED_WEEKLY_MAX_BONUS_COINS = 300;/.test(game)],
  ['Prestige ladder steps 500 RP to a max of 5 above 2400', /const RANKED_PRESTIGE_STEP_RP = 500;/.test(game) && /const RANKED_PRESTIGE_MAX = 5;/.test(game) && /function getRankedPrestige\(pointsRaw\)[\s\S]*?if \(points < 2400\) return 0;/.test(game)],
  ['Prestige display label appends Prestige N above 2400', /function getRankedDisplayLabel\(pointsRaw\)[\s\S]*?Prestige \$\{prestige\}/.test(game)],
  ['super_rate_plus removed as a duplicate def, kept as a canonicalising alias', /MUTATOR_ALIASES\s*=\s*\{[^}]*'super_rate_plus':\s*'super_rate_90'/.test(game) && !/'super_rate_plus':\s*\{/.test(game) && /getRankedMutatorPoolKeys/.test(game)],
  ['projectiles_150 alias canonicalises to giant_projectiles, no phantom alias', /MUTATOR_ALIASES\s*=\s*\{[^}]*'projectiles_150':\s*'giant_projectiles'/.test(game) && !game.includes('colossal_projectiles') && /function isGiantProjectilesActive\(\)\s*\{\s*return isMutatorActive\('giant_projectiles'\);/.test(game)],
  ['ranked-pass pinpack claim branch grants via grantPinPack', /reward\.type === 'pinpack'/.test(game) && /grantPinPack\(reward\.amount \|\| 3\);/.test(game)],
  ['MVP rule requires 3000 damage on a win or 6000 on a loss', /isRankedMVP = \(won && fullOnDamageEarned >= 3000\) \|\| \(!won && fullOnDamageEarned >= 6000\);/.test(game)],
  ['draft state machine no longer uses complete', !game.includes("draftState = 'complete'") && !game.includes("draftState === 'complete'") && !game.includes("draftState !== 'complete'")]
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

console.log('\n================================');
console.log(`Results: ${checks.length - failed}/${checks.length} passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Ranked Dual Modifiers and 6 New Ranks regression checks passed successfully!');
}
