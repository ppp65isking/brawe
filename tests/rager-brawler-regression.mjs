import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const checks = [
  // 1. Registration & Stats
  ['rager registered in brawlerData', /'rager':\s*\{\s*name:\s*'Rager',\s*role:\s*'Controller'/.test(game)],
  ['rager registered in brawlerRarities as Rare', /rager:\s*'Rare'/.test(game)],
  ['rager registered in getScaledStats (7600 HP, 2200 DMG)', /if\s*\(brawlerId === 'rager'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*return \{ hp: Math\.round\(7600 \* scale\),\s*dmg: Math\.round\(2200 \* scale\) \};/.test(game)],
  ['rager registered in reloadMsByBrawler as 1500ms', /reloadMsByBrawler:\s*\{[\s\S]*?rager:\s*1500/.test(game)],
  ['rager registered in fireDelayMsByBrawler as 220ms', /fireDelayMsByBrawler:\s*\{[\s\S]*?rager:\s*220/.test(game)],
  ['rager registered in brawlerRoles', /rager:'Controller'/.test(game)],
  ['rager registered in brawlerPortraitIcons', /rager:\s*'🪓🪵'/.test(game)],
  ['rager in CUSTOM_BRAWLER_PORTRAITS', /CUSTOM_BRAWLER_PORTRAITS\s*=\s*Object\.freeze\(\[[\s\S]*?'rager'/.test(game)],
  ['rager SVG portrait defined', /rager:\s*`\<circle cx="50" cy="50" r="34" fill="#2d1500" stroke="#ff4757"/.test(game)],
  ['rager in GADGET_COOLDOWNS', /rager:\s*\{\s*g1:\s*15000,\s*g2:\s*18000\s*\}/.test(game)],
  ['rager in BRAWLER_SUPER_CHARGE_HITS (4 hits)', /rager:4/.test(game)],
  ['rager registered in allBrawlers array', /allBrawlers\s*=\s*\[[\s\S]*?'rager'/.test(game)],
  ['rager in BALANCE_PROFILE damageScalarByBrawler', /damageScalarByBrawler:\s*\{[\s\S]*?rager:\s*1\.0/.test(game)],
  ['rager in SOUL_CONSTELLATIONS Rare pool', /id:\s*'Rare'[\s\S]*?brawlers:\s*\[[\s\S]*?'rager'/.test(game)],
  ['rager in brawlerTraitData', /brawlerTraitData\s*=\s*\{[\s\S]*?rager:/.test(game)],
  ['rager in default playerData.unlockedBrawlers', /unlockedBrawlers:\s*\{[\s\S]*?rager:\s*true/.test(game)],
  ['rager unlocked in ensureSoulSummonerData', /playerData\.unlockedBrawlers\.rager = true;/.test(game)],
  ['rager option in index.html brawlerSelect', /<option value="rager">Rager \(Rare\)<\/option>/.test(html)],

  // 2. Abilities & State
  ['ragerWarTotems declared', /const ragerWarTotems = \[\];/.test(game)],
  ['castRagerSuper helper implemented', /function castRagerSuper\(entity, targetX, targetY, isHyper\)/.test(game)],
  ['castRagerSuper sets 7000ms duration normal and 9100ms in HC (+30%)', /const duration = isHyper \? 9100 : 7000;/.test(game)],
  ['castRagerSuper places 240px radius War Totem capped at 600px throw range', /const targetRadius = 240;[\s\S]*?Math\.min\(dist, 600\);/.test(game)],
  ['executeRagerG1 performs 360° Cleave Timber dealing 950 dmg and 140px knockback', /function executeRagerG1\(entity\)[\s\S]*?const radius = 180;[\s\S]*?const dmg = 950;[\s\S]*?applyKnockback\(t, entity\.x, entity\.y, 140/.test(game)],
  ['executeRagerG2 performs Battle Cry with +20% speed and 30% super charge', /function executeRagerG2\(entity\)[\s\S]*?ally\.ragerSpeedUntil = now \+ 3000;[\s\S]*?superCharge \+ 30/.test(game)],

  // 3. Attack & Super Dispatch
  ['fire() spawns isRagerTimber projectile with 420px range', /brawler === 'rager'[\s\S]*?const trunkRange = 420;[\s\S]*?isRagerTimber: true/.test(game)],
  ['player fireSuper routes rager to castRagerSuper', /combatBrawler === 'rager'\)\s*\{\s*castRagerSuper\(player, wm\.x, wm\.y, !!isHypercharged\);/.test(game)],
  ['bot fireSuperBot routes rager to castRagerSuper', /botCombatBrawler === 'rager'\)\s*\{\s*castRagerSuper\(bot, targetX, targetY, isHyper\);/.test(game)],
  ['Timber hit applies knockback', /b\.ownerBrawler === 'rager' && b\.isRagerTimber[\s\S]*?applyKnockback\(target, b\.x, b\.y, 35/.test(game)],
  ['SP1 Splinter Shrapnel spawns 4 cardinal splinter darts on max range expiration', /b\.ownerBrawler === 'rager' && b\.isRagerTimber && b\.hasSp1[\s\S]*?isRagerSplinter: true[\s\S]*?damage: 650/.test(game)],

  // 4. Raged Area Loop & Mechanics
  ['Raged Area grants allies +15% damage', /ally\.ragerDmgBuffUntil = now \+ 300/.test(game) && /dealtDamage \*= 1\.15/.test(game)],
  ['Raged Area auto-fires ally attacks every 1.0s', /now - ally\._lastRagerAutoFireAt >= 1000[\s\S]*?fire\(fireAng, false\)[\s\S]*?⚡ RAGE AUTO-FIRE!/.test(game)],
  ['HC Raged Area slows enemies reload by 40%', /totem\.isHyper[\s\S]*?enemy\.ragerReloadSlowUntil = now \+ 300;/.test(game)],
  ['SP2 Bloodlust Resurgence heals 40% of damage dealt', /owner && owner\.ragerSp2HealActive && dealtDamage > 0[\s\S]*?doHeal\(owner, Math\.round\(dealtDamage \* 0\.40\)\);/.test(game)],
  ['G2 grants +20% movement speed', /player\.ragerSpeedUntil && performance\.now\(\) < player\.ragerSpeedUntil[\s\S]*?hcSpd \*= 1\.20;/.test(game)],

  // 5. Visual Rendering & Previews
  ['2.5D character model implemented for Rager', /brawlerId === 'rager'[\s\S]*?RAGER 2\.5D LUMBERJACK BERSERKER MODEL/.test(game)],
  ['Timber trunk log projectile rendering implemented', /b\.ownerBrawler === 'rager' && b\.isRagerTimber[\s\S]*?roundRect\(-42, -18, 84, 36, 8\)/.test(game)],
  ['Splinter projectile rendering implemented', /b\.ownerBrawler === 'rager' && b\.isRagerSplinter/.test(game)],
  ['War Totem and Raged Area ground rendering implemented', /Render Rager War Totems & Raged Areas[\s\S]*?totem\.radius \+ pulse[\s\S]*?Center War Totem Pole/.test(game)],
  ['Aim preview implemented for Rager attack and super', /selectedBrawler === 'rager' && !aimingSuper[\s\S]*?selectedBrawler === 'rager' && aimingSuper/.test(game)],

  // 6. UI & State Integration
  ['gadgetBtn handles Rager G1 and G2 clicks', /curBrawler === 'rager' && curGadget === 'g1'[\s\S]*?executeRagerG1[\s\S]*?curBrawler === 'rager' && curGadget === 'g2'[\s\S]*?executeRagerG2/.test(game)],
  ['Bot AI supports Rager G1 and G2', /bot\.brawler === 'rager' && g === 'g1'[\s\S]*?executeRagerG1\(bot\)[\s\S]*?bot\.brawler === 'rager' && g === 'g2'[\s\S]*?executeRagerG2\(bot\)/.test(game)],
  ['updateGadgetInfo includes Rager G1 and G2 descriptions', /selectedBrawler === 'rager'[\s\S]*?Rager G1: Cleave Timber[\s\S]*?Rager G2: Battle Cry/.test(game)],
  ['ensureSoulSummonerData defaults Rager to level 11 and unlocks', /playerData\.brawlers\.rager\s*=\s*\{\s*level:\s*11/.test(game)],
  ['syncAbilityInputs ensures default gadget and star power for Rager', /selectedBrawler === 'rager'[\s\S]*?selectedGadget = 'g1';[\s\S]*?selectedStar = 'slow';/.test(game)],
  ['cleanBattlefield resets ragerWarTotems', /ragerWarTotems\.length = 0;/.test(game)],
  ['window.__pureHTMLGame exports ragerWarTotems', /get ragerWarTotems\(\)\s*\{\s*return ragerWarTotems;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports castRagerSuper', /get castRagerSuper\(\)\s*\{\s*return castRagerSuper;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeRagerG1', /get executeRagerG1\(\)\s*\{\s*return executeRagerG1;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeRagerG2', /get executeRagerG2\(\)\s*\{\s*return executeRagerG2;\s*\}/.test(game)]
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
  console.log('All Rager brawler regression checks passed successfully!\n');
}