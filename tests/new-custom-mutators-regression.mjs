import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Modifier Registrations
  ['friendly_fire_plus registered in MUTATOR_DEFS', /const MUTATOR_DEFS = \{[\s\S]*?'friendly_fire_plus':\s*\{[\s\S]*?id:\s*'friendly_fire_plus'[\s\S]*?name:\s*'Friendly Fire\+'/.test(game)],
  ['super_rate_90 registered in MUTATOR_DEFS', /const MUTATOR_DEFS = \{[\s\S]*?'super_rate_90':\s*\{[\s\S]*?id:\s*'super_rate_90'[\s\S]*?name:\s*'90% Super Rate\+'/.test(game)],
  ['super_rate_plus alias canonicalises to super_rate_90 (no duplicate def)', /'super_rate_plus':\s*'super_rate_90'/.test(game) && !/'super_rate_plus':\s*\{/.test(game)],
  ['giant_projectiles registered in MUTATOR_DEFS with rankedPool false', /const MUTATOR_DEFS = \{[\s\S]*?'giant_projectiles':\s*\{[\s\S]*?id:\s*'giant_projectiles'[\s\S]*?name:\s*'150% Bigger Projectiles'[\s\S]*?rankedPool: false/.test(game)],
  ['projectiles_150 alias canonicalises to giant_projectiles (no duplicate def)', /'projectiles_150':\s*'giant_projectiles'/.test(game) && !/'projectiles_150':\s*\{/.test(game)],

  // 2. Helper Functions
  ['isFriendlyFirePlusActive helper function implemented', /function isFriendlyFirePlusActive\(\)/.test(game)],
  ['isSuperRate90Active helper function implemented', /function isSuperRate90Active\(\)/.test(game)],
  ['isGiantProjectilesActive helper function implemented', /function isGiantProjectilesActive\(\)/.test(game)],
  ['isFriendlyFireActive delegates to isFriendlyFirePlusActive', /isFriendlyFireActive[\s\S]*?isFriendlyFirePlusActive\(\)/.test(game)],

  // 3. Friendly Fire+ Mechanics & Charge Generation
  ['grantFriendlyFirePlusBonus function implemented', /function grantFriendlyFirePlusBonus\(owner\)/.test(game)],
  ['grantFriendlyFirePlusBonus grants superCharge and hyperChargeCharge', /superCharge = clamp\(superCharge \+ superBonus, 0, 100\)[\s\S]*?hyperChargeCharge = clamp\(hyperChargeCharge \+ hyperBonus, 0, 100\)/.test(game)],
  ['grantFriendlyFirePlusBonus shows teal feedback floating text', /spawnFloatingText\(player\.x, player\.y - 42, '⚡ \+SUPER & HYPER!', '#00f5d4'\)/.test(game)],
  ['AoE bot hit grants attack charge when friendly_fire_plus active', /areAlliedEntities\(owner, bot\) && isFriendlyFirePlusActive\(\)\) grantMainAttackCharge/.test(game)],
  ['AoE bot hit triggers grantFriendlyFirePlusBonus', /areAlliedEntities\(owner, bot\) && isFriendlyFirePlusActive\(\)[\s\S]*?grantFriendlyFirePlusBonus\(owner\)/.test(game)],
  ['AoE player hit grants attack charge when friendly_fire_plus active', /areAlliedEntities\(owner, player\) && isFriendlyFirePlusActive\(\)\) grantMainAttackCharge/.test(game)],
  ['AoE player hit triggers grantFriendlyFirePlusBonus', /areAlliedEntities\(owner, player\) && isFriendlyFirePlusActive\(\)[\s\S]*?grantFriendlyFirePlusBonus\(owner\)/.test(game)],
  ['Bullet hit triggers grantFriendlyFirePlusBonus on ally hit', /areAlliedEntities\(owner, target\) && isFriendlyFireActive\(\)[\s\S]*?grantFriendlyFirePlusBonus\(owner\)/.test(game)],
  ['Bullet hit shows FF+ floating text on ally hit', /isFriendlyFirePlusActive\(\)[\s\S]*?spawnFloatingText\(target\.x, target\.y - 32, '⚠️ FF\+ CHARGE!', '#00f5d4'\)/.test(game)],
  ['Bullet hit grants main attack charge on ally hit when friendly_fire_plus active', /areAlliedEntities\(owner, target\) && isFriendlyFirePlusActive\(\)\) grantMainAttackCharge/.test(game)],

  // 4. 90% Super Rate+ Mechanics
  ['grantMainAttackCharge multiplies gain by 1.9 when isSuperRate90Active', /isSuperRate90Active\(\)\) gain \*= 1\.9;/.test(game)],
  ['Update loop grants +9%/s passive Super charge when isSuperRate90Active', /isSuperRate90Active\(\)\)[\s\S]*?superCharge = Math\.min\(100, superCharge \+ 9\.0 \* dt\)/.test(game)],
  ['Update loop charges bots passive Super when isSuperRate90Active', /isSuperRate90Active\(\)\)[\s\S]*?b\.superCharge = Math\.min\(100, \(b\.superCharge \|\| 0\) \+ 9\.0 \* dt\)/.test(game)],

  // 5. 150% Bigger Projectiles Mechanics
  ['applyGiantProjectilesModifier function implemented', /function applyGiantProjectilesModifier\(b\)/.test(game)],
  ['applyGiantProjectilesModifier scales hitboxMod by 2.5', /b\.hitboxMod\s*=\s*\(b\.hitboxMod\s*\|\|\s*1\)\s*\* 2\.5;/.test(game)],
  ['applyGiantProjectilesModifier scales radius by 2.5', /b\.radius\s*\*=\s*2\.5;/.test(game)],
  ['bullets.push hook intercepts and applies giant projectiles', /bullets\.push = function\(\.\.\.items\)[\s\S]*?applyGiantProjectilesModifier\(item\)/.test(game)],
  ['Bullet update loop applies giant projectiles modifier', /applyGiantProjectilesModifier\(b\)/.test(game)],
  ['Visual underlay renders glowing aura for giant projectiles', /const isGiant = typeof isGiantProjectilesActive === 'function' && isGiantProjectilesActive\(\);[\s\S]*?fillStyle = isGiant \? '#ff70a6'/.test(game)],

  // 6. Match Start Floaters
  ['Friendly Fire+ match start warning implemented', /⚠️⚡ FRIENDLY FIRE\+ ACTIVE! HIT ALLIES FOR SUPER\/HYPER!/.test(game)],
  ['90% Super Rate+ match start notification implemented', /🔋⚡ 90% SUPER RATE\+ ACTIVE!/.test(game)],
  ['150% Bigger Projectiles match start notification implemented', /🔮 150% BIGGER PROJECTILES ACTIVE!/.test(game)],

  // 7. Custom Mutator Picker UI
  ['Picker UI includes friendly_fire_plus option', /id:\s*'friendly_fire_plus',[\s\S]*?name:\s*'Friendly Fire\+'/.test(game)],
  ['Picker UI includes super_rate_90 option', /id:\s*'super_rate_90',[\s\S]*?name:\s*'90% Super Rate\+'/.test(game)],
  ['Picker UI includes giant_projectiles option', /id:\s*'giant_projectiles',[\s\S]*?name:\s*'150% Bigger Projectiles'/.test(game)],

  // 8. window.__pureHTMLGame Exports
  ['window.__pureHTMLGame exports isFriendlyFirePlusActive', /get isFriendlyFirePlusActive\(\)\s*\{\s*return isFriendlyFirePlusActive;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports isSuperRate90Active', /get isSuperRate90Active\(\)\s*\{\s*return isSuperRate90Active;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports grantFriendlyFirePlusBonus', /get grantFriendlyFirePlusBonus\(\)\s*\{\s*return grantFriendlyFirePlusBonus;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports isGiantProjectilesActive', /get isGiantProjectilesActive\(\)\s*\{\s*return isGiantProjectilesActive;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports applyGiantProjectilesModifier', /get applyGiantProjectilesModifier\(\)\s*\{\s*return applyGiantProjectilesModifier;\s*\}/.test(game)]
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
  console.error(`${failed} check(s) failed!`);
  process.exit(1);
} else {
  console.log('All Custom Mutator regression checks passed successfully!\n');
}
