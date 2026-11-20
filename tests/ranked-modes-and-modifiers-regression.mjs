import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Ranked Rotation: knock_donate, arena_forge, and brick_vault
  ['RANKED_TEAM_MODE_POOL includes knock_donate, arena_forge, and brick_vault', /RANKED_TEAM_MODE_POOL\s*=\s*\[[^\]]*'knock_donate'[^\]]*'arena_forge'[^\]]*'brick_vault'[^\]]*\]/.test(game)],

  // 2. Ranked Modifiers: kept mutators
  ['hyper_overdrive passive charge fixed to call updateHyperButton', /hyperChargeCharge = Math\.min\(100,\s*hyperChargeCharge \+ 4\.0 \* dt\);[\s\S]*?if \(typeof updateHyperButton === 'function'\) updateHyperButton\(\);/],
  ['super_surge passive super charge calls updateSuperButton', /superCharge = Math\.min\(100,\s*superCharge \+ 5\.0 \* dt\);[\s\S]*?if \(typeof updateSuperButton === 'function'\) updateSuperButton\(\);/],
  ['quickfire only refunds ammo on main attacks, not supers', /isMutatorActive\('quickfire'\) && !source\?\.super && !source\?\.isSuper/],
  ['Ranked modifier HUD badge helper implemented', /function renderRankedModifierHUD\(ctx\)/],
  ['friendly_fire modifier registered in MUTATOR_DEFS', /const MUTATOR_DEFS = \{[\s\S]*?'friendly_fire':\s*\{\s*id:\s*'friendly_fire',\s*name:\s*'Friendly Fire'/],
  ['isFriendlyFireActive helper function implemented', /function isFriendlyFireActive\(\)\s*\{\s*return isMutatorActive\('friendly_fire'\) \|\| isFriendlyFirePlusActive\(\) \|\| \(showdownMode === 'knock_donate' && !isBossFight && !isTraining\);\s*\}/],
  ['friendly_fire permits bullet hit detection against allied player and bots', /if \(!isFriendlyFireActive\(\)\) continue; \/\/ skip friendly fire/],
  ['friendly_fire permits AOEDamage against allied entities', /areAlliedEntities\(owner, bot\) && !bot\.isChairSpinning && !isFriendlyFireActive\(\)[\s\S]*?!\(owner && areAlliedEntities\(owner, player\)\) \|\| isFriendlyFireActive\(\)/],
  ['friendly_fire prevents super charge gain on hitting teammates', /!\(areAlliedEntities\(owner, target\) && isFriendlyFireActive\(\)\)\) grantMainAttackCharge/],
  ['friendly_fire displays floating warning feedback on hit', /spawnFloatingText\(target\.x, target\.y - 32, '⚠️ FRIENDLY FIRE!', '#ff4757'\);/],


  // 3. Ranked Ban & Draft Overhaul
  ['Player team slot is randomized (player is not always leader)', /const playerSlot = Math\.floor\(Math\.random\(\) \* 3\);[\s\S]*?const isPlayerLeader = \(playerSlot === 0\);/],
  ['Ban schedule gives leaders 2 bans and members 1 ban (8 bans total)', /banSchedule = \[[\s\S]*?slot: 0, banIdx: 0[\s\S]*?slot: 0, banIdx: 1[\s\S]*?slot: 1, banIdx: 0[\s\S]*?slot: 2, banIdx: 0/],
  ['Draft pick line supports snake pick order with player position tracking', /pickLine = blueHasFirstPick \?[\s\S]*?pickNum: 1[\s\S]*?pickNum: 6/],
  ['Available brawler choices reduce dynamically as earlier draft picks claim brawlers', /getAvailablePool = \(pickingTeam = 'blue'\) => \{[\s\S]*?const banned = new Set\(getAllBanned\(\)\);[\s\S]*?const picked = new Set\(getAllPicked\(\)\);[\s\S]*?enemyProtected/],
  ['Ranked match launch preserves teammate picks, enemy picks, and multi-bans', /rankedTeammatePicks = bluePicks\.filter[\s\S]*?rankedEnemyPicks = redPicks\.slice[\s\S]*?rankedBans = \{/],

  // 3. Master update: queue pool twins (ranked-pass pin packs deleted)
  ['no rp_* pin ids exist anywhere', !game.includes('rp_weekly_max') && !game.includes('rp_bronze') && !game.includes('rp_legend')]
];

let failed = 0;
for (const [desc, result] of checks) {
  if (typeof result === 'boolean') {
    if (result) {
      console.log('PASS: ' + desc);
    } else {
      console.error('FAIL: ' + desc);
      failed++;
    }
  } else if (result instanceof RegExp) {
    if (result.test(game)) {
      console.log('PASS: ' + desc);
    } else {
      console.error('FAIL: ' + desc);
      failed++;
    }
  }
}

console.log('\n================================');
console.log('Results: ' + (checks.length - failed) + '/' + checks.length + ' passed.');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Ranked modes & modifiers regression checks passed successfully!');
}
