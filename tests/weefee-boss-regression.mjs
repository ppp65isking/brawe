import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  ['Boss Battle registered in HOME_MODE_CARDS', /\['weefee_boss',\s*'📶',\s*'Boss Battle: 1 vs Mega WeeFee'/],
  ['WeeFee Boss in HOME_PERMANENT_MODE_IDS', /HOME_PERMANENT_MODE_IDS\s*=\s*\[[^\]]*'weefee_boss'/],
  ['Boss Battle rules in HOME_MODE_RULES with unlimited poles counterplay', /weefee_boss:\s*\[[\s\S]*?1-Player Boss Battle: 1 vs Mega WeeFee![\s\S]*?UNLIMITED signal poles[\s\S]*?Destroy signal poles \(1500 HP\)/],
  ['Boss Battle rewards in HOME_EVENT_REWARDS', /weefee_boss:\s*\{\s*type:\s*'coins',\s*amount:\s*90/],
  ['Mode color and SOLO tag in syncHomeModeCards', /weefee_boss:\s*'#00f5d4'[\s\S]*?id === 'weefee_boss'[\s\S]*?tag\s*=\s*'SOLO'/],
  ['Mode runtime flag isWeeFeeBossMode initialized', /let isWeeFeeBossMode = false;\s*let weefeeBossState = null;/],
  ['isPowerPlayModifierActive helper defined for WeeFee Boss', /if \(isWeeFeeBossMode && weefeeBossState\?\.hasPowerPlayModifier\) \{[\s\S]*?return true;/],
  ['generatePowerBoxes explicitly excludes isWeeFeeBossMode', /isBlinkEyeDodgeMode[\s\S]*?isWeeFeeBossMode \|\| isPropHuntMode\)\s*return;/],
  ['spawnBots returns early for isWeeFeeBossMode', /if \(isDuels \|\| isTraining \|\| isBlinkEyeDodgeMode \|\| .*isWeeFeeBossMode.*\) return;/],
  ['spawnBots sets enemyCount = 0 for isWeeFeeBossMode', /(?:if|else if) \(isWeeFeeBossMode\) enemyCount = 0;/],
  ['Storm check excludes isWeeFeeBossMode', /!isWeeFeeBossMode && !isDemonVillainsBossMode/],
  ['launchShowdownMatch inits WeeFee Boss state', /isWeeFeeBossMode = showdownMode === 'weefee_boss';[\s\S]*?player\.powerCubes = 0;[\s\S]*?initWeeFeeBossState\(\);/],
  ['Unlimited poles for boss in spawnWeeFeePole', /const isBossOwner = isWeeFeeBossMode \|\|[\s\S]*?const maxPoles = isBossOwner \? Infinity : /],
  ['Poles are destructible with 1500 HP for boss in spawnWeeFeePole', /hp:\s*isBossOwner \? 1500 : undefined,[\s\S]*?isDestructible:\s*isBossOwner \? true : false/],
  ['updateWeeFeeSystems processes bossEntities', /isWeeFeeBossMode && weefeeBossState\?\.bossEntities \? weefeeBossState\.bossEntities : \[\]/],
  ['Player bullets damage destructible poles and drop data pickups', /for \(let pIdx = weefeePoles\.length - 1; pIdx >= 0; pIdx--\)[\s\S]*?pole\.isDestructible[\s\S]*?pole\.hp = Math\.max\(0, pole\.hp - dmg\);[\s\S]*?POLE JAMMED![\s\S]*?dataPickups\.push/],
  ['AOEDamage hits boss entities and destructible poles', /if \(isWeeFeeBossMode && weefeeBossState\?\.bossEntities && ownerId === player\.id\)[\s\S]*?weefeePoles[\s\S]*?pole\.isDestructible/],
  ['Collecting data packets heals player and restores super', /dataPickups[\s\S]*?doHeal\(player, 150\);[\s\S]*?superCharge = clamp\(superCharge \+ 10, 0, 100\);/],
  ['buildWeeFeeBossMap creates arena with cyber pillars', /function buildWeeFeeBossMap\(\) \{[\s\S]*?weefeePoles\.length = 0;[\s\S]*?pillars = \[/],
  ['spawnWeeFeeBossStage implements 3 escalating stages', /function spawnWeeFeeBossStage\(stageNumber\) \{[\s\S]*?2\.4GHz Broadband[\s\S]*?5G Ultra-Wideband Overclock[\s\S]*?6G Orbital Satellite Mesh/],
  ['Stage 3 activates Power Play modifier for player', /s\.hasPowerPlayModifier = true;[\s\S]*?6G SATELLITE MESH ACTIVATED! POWER PLAY MODIFIER UNLOCKED FOR PLAYER!/],
  ['renderWeeFeeBossWorld renders orbital strikes, data pickups and cyber models', /function renderWeeFeeBossWorld\(ctx\)[\s\S]*?orbitalStrikes[\s\S]*?dataPickups[\s\S]*?BraweRosterVisuals\.draw/],
  ['renderWeeFeeBossHUD displays Stage, Health bar, active poles and collected data packets', /function renderWeeFeeBossHUD\(ctx\)[\s\S]*?BOSS BATTLE • STAGE[\s\S]*?ACTIVE POLES:.*\(UNLIMITED\)[\s\S]*?PACKETS:/],
  ['Results screen records WeeFee Boss victory and stages cleared', /isWeeFeeBossMode\) \{[\s\S]*?6G MESH DISMANTLED![\s\S]*?Stages Cleared:/]
];

for (const [label, pattern] of checks) {
  assert.match(game, pattern, label);
}

console.log(`WeeFee Boss Battle regression: ${checks.length}/${checks.length} checks passed.`);
