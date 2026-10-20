import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Registration & Stats
  ['bolznstien registered in brawlerData', /'bolznstien':\s*\{\s*name:\s*'Bolznstien',\s*role:\s*'Damage Dealer'/.test(game)],
  ['bolznstien registered in brawlerRarities as Rare', /bolznstien:\s*'Rare'/.test(game)],
  ['bolznstien registered in getScaledStats', /if\s*\(brawlerId === 'bolznstien'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*return \{ hp: Math\.round\(7200 \* scale\)/.test(game)],
  ['bolznstien registered in reloadMsByBrawler', /reloadMsByBrawler:\s*\{[\s\S]*?bolznstien:\s*1400/.test(game)],
  ['bolznstien registered in brawlerRoles', /bolznstien:'Damage Dealer'/.test(game)],
  ['bolznstien registered in brawlerPortraitIcons', /bolznstien:\s*'⚡🧟'/.test(game)],
  ['bolznstien in CUSTOM_BRAWLER_PORTRAITS', /CUSTOM_BRAWLER_PORTRAITS\s*=\s*Object\.freeze\(\[[\s\S]*?'bolznstien'/.test(game)],
  ['bolznstien SVG portrait defined', /bolznstien:\s*`<circle cx="50" cy="50" r="34" fill="#1e272e" stroke="#00f5d4" stroke-width="4"\/>/.test(game)],
  ['bolznstien in GADGET_COOLDOWNS', /bolznstien:\s*\{\s*g1:\s*14000,\s*g2:\s*15000\s*\}/.test(game)],
  ['bolznstien in BRAWLER_SUPER_CHARGE_HITS', /bolznstien:5/.test(game)],

  // Roster & Selection Registration
  ['bolznstien registered in allBrawlers array', /allBrawlers\s*=\s*\[[\s\S]*?'bolznstien'/.test(game)],
  ['bolznstien in BALANCE_PROFILE damageScalarByBrawler', /damageScalarByBrawler:\s*\{[\s\S]*?bolznstien:\s*1\.0/.test(game)],
  ['bolznstien in BALANCE_PROFILE fireDelayMsByBrawler', /fireDelayMsByBrawler:\s*\{[\s\S]*?bolznstien:\s*200/.test(game)],
  ['bolznstien in SOUL_CONSTELLATIONS Rare pool', /id:\s*'Rare'[\s\S]*?brawlers:\s*\[[\s\S]*?'bolznstien'/.test(game)],
  ['bolznstien in brawlerTraitData', /brawlerTraitData\s*=\s*\{[\s\S]*?bolznstien:/.test(game)],
  ['bolznstien in default playerData.unlockedBrawlers', /unlockedBrawlers:\s*\{[\s\S]*?bolznstien:\s*true/.test(game)],
  ['bolznstien unlocked in ensureSoulSummonerData', /playerData\.unlockedBrawlers\.bolznstien = true;/.test(game)],
  ['bolznstien preserved in loadProgress unlockedBrawlers', /playerData\.unlockedBrawlers\.bolznstien = true;/.test(game)],
  ['bolznstien option in index.html brawlerSelect', /<option value="bolznstien">Bolznstien \(Rare\)<\/option>/.test(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'))],

  // 2. Global Arrays & Core Helpers
  ['bolznstienPendingStrikes and bolznstienShockTrails declared', /const bolznstienPendingStrikes = \[\];\s*const bolznstienShockTrails = \[\];/.test(game)],
  ['scheduleBolznstienStrikes helper accepts a struck target', /function scheduleBolznstienStrikes\(ownerId, x, y, strikeDmg, isHyper, targetId = null\)/.test(game)],
  ['scheduleBolznstienStrikes keeps an 0.8s base delay', /:\s*800;\s*const triggerAt = now \+ strikeDelay;/.test(game)],
  ['scheduleBolznstienStrikes schedules 4 strikes in a tighter triangle during HC', /const strikeAngle = \(k \* 2 \* Math\.PI \/ 3\) - Math\.PI \/ 2;[\s\S]*?Math\.cos\(strikeAngle\) \* 100[\s\S]*?Math\.sin\(strikeAngle\) \* 100/.test(game)],
  ['scheduleBolznstienStrikes scales strike radius 30% larger in HC', /const strikeRadius = \(isHyper \? 85 : 65\) \* \(isHyper \? 1\.3 : 1\.0\);/.test(game)],
  ['castBolznstienSuper implemented with 4s normal and 6s HC duration', /const duration = isHyper \? 6000 : 4000;\s*entity\.bolznstienSuperUntil = now \+ duration;/.test(game)],
  ['executeBolznstienG1 detonates pending strikes with +30% damage', /s\.damage = Math\.round\(s\.damage \* 1\.30\);/.test(game)],
  ['executeBolznstienG2 grants +30% movement speed for 4s', /entity\.bolznstienSpeedUntil = now \+ 4000;/.test(game)],

  // 3. Attack & Super Triggers
  ['fire() spawns isBolznstienBolt with 30% larger hitbox in HC', /brawler === 'bolznstien'[\s\S]*?const sizeMod = hyper \? 1\.3 : 1\.0;[\s\S]*?isBolznstienBolt: true/.test(game)],
  ['fireSuper() routes bolznstien to castBolznstienSuper', /combatBrawler === 'bolznstien'\)\s*\{\s*castBolznstienSuper\(player, !!isHypercharged\);/.test(game)],
  ['fireSuperBot() routes bolznstien to castBolznstienSuper', /botCombatBrawler === 'bolznstien'\)\s*\{\s*castBolznstienSuper\(bot, isHyper\);/.test(game)],
  ['Bullet hit schedules lightning against that target', /scheduleBolznstienStrikes\(b\.ownerId, target\.x, target\.y, b\.strikeDmg \|\| 1650, !!b\.isHyper, target\.id\);/.test(game)],
  ['Training isBox targets belong to the shared damageable box family', /function isHeaterLockableBox\(wall\)[\s\S]*?wall\.isPowerBox \|\| wall\.isBox \|\| wall\.isPurpleBox/.test(game)],
  ['Ordinary projectile collision also accepts training isBox targets', /const damageableObject = !!\(dw\.isArenaWall \|\| dw\.isPowerBox \|\| dw\.isBox/.test(game)],

  // 4. Update Loop & Mechanics
  ['Update loop detonates pending strikes at triggerAt', /now >= s\.triggerAt[\s\S]*?isBolznstienStrike: true/.test(game)],
  ['SP1 applies 35% slow on strike hit', /s\.sp1[\s\S]*?applyStatusEffect\(t, 'slow', 1500\);/.test(game)],
  ['Update loop channels Super electric hand chains in cone with +40% range and -30% dmg', /ent\.bolznstienSuperUntil[\s\S]*?const range = Math\.round\(baseRange \* 1\.40\);[\s\S]*?tickDmg = Math\.round\(\(\(ent\.level \|\| 11\) \* 24 \+ 190\) \* 0\.70\);/.test(game)],
  ['Electric Eyes cone damages boxes and vault entities', /Electric Eyes is a continuous lightning attack[\s\S]*?isHeaterLockableBox\(wall\)[\s\S]*?applyHeaterBoxDamage\(ent, wall, tickDmg\)/.test(game)],
  ['Hypercharge Super applies 40% damage debuff on enemies for 4s', /t\.bolznstienDmgDebuffUntil = now \+ 4000;/.test(game)],
  ['SP2 ramps same-target lightning arrival up to 80% faster across five stacks', /bolznstienTempoTargetId === targetId[\s\S]*?Math\.min\(5,[\s\S]*?Math\.max\(160, 800 - 160 \* \(tempoStacks - 1\)\)/.test(game)],
  ['Sky lightning damages power boxes and enemy vaults in its strike circle', /rectCircleCollides\(wall\.x, wall\.y, wall\.w, wall\.h, s\.x, s\.y, s\.radius\)[\s\S]*?applyHeaterBoxDamage\(sOwner, wall, s\.damage\)/.test(game)],
  ['Debuffed enemies deal 40% less bullet damage', /owner\.bolznstienDmgDebuffUntil && performance\.now\(\) < owner\.bolznstienDmgDebuffUntil[\s\S]*?dealtDamage \*= 0\.60;/.test(game)],
  ['Debuffed enemies deal 40% less AoE damage', /owner\.bolznstienDmgDebuffUntil && performance\.now\(\) < owner\.bolznstienDmgDebuffUntil[\s\S]*?incomingAoeDamage \*= 0\.60;/.test(game)],
  ['Movement speed calculation applies +30% speed for G2', /if\s*\(player\.bolznstienSpeedUntil && performance\.now\(\) < player\.bolznstienSpeedUntil\)\s*hcSpd \*= 1\.30;/.test(game)],

  // 5. Visual Rendering & Previews
  ['2.5D character model implemented for Bolznstien', /brawlerId === 'bolznstien'[\s\S]*?BOLZNSTIEN 2\.5D FRANKEN-MONSTER MODEL/.test(game)],
  ['Lightning bolt projectile rendering implemented', /b\.ownerBrawler === 'bolznstien' && b\.isBolznstienBolt[\s\S]*?Electric jagged lightning bolt core/.test(game)],
  ['Ground pending strikes rendering implemented', /Render Bolznstien Pending Electric Strikes on Ground/.test(game)],
  ['Super 6 electric hand chains (+40% hands) cone rendering implemented', /Render Bolznstien Super: 6 Electric Hand Chains/.test(game)],
  ['Aim preview implemented for Bolznstien attack and super', /selectedBrawler === 'bolznstien' && !aimingSuper[\s\S]*?selectedBrawler === 'bolznstien' && aimingSuper/.test(game)],

  // 6. window.__pureHTMLGame Exports
  ['window.__pureHTMLGame exports castBolznstienSuper', /get castBolznstienSuper\(\)\s*\{\s*return castBolznstienSuper;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports scheduleBolznstienStrikes', /get scheduleBolznstienStrikes\(\)\s*\{\s*return scheduleBolznstienStrikes;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeBolznstienG1', /get executeBolznstienG1\(\)\s*\{\s*return executeBolznstienG1;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeBolznstienG2', /get executeBolznstienG2\(\)\s*\{\s*return executeBolznstienG2;\s*\}/.test(game)],

  // 7. Chain Lightning & Fixes Regression Checks
  ['Wall collision schedules Bolznstien strike', /b\.ownerBrawler === 'bolznstien' && b\.isBolznstienBolt[\s\S]*?scheduleBolznstienStrikes\(b\.ownerId, b\.x, b\.y, b\.strikeDmg/.test(game)],
  ['Max range expiration schedules Bolznstien strike', /isHoopBall[\s\S]*?b\.ownerBrawler === 'bolznstien' && b\.isBolznstienBolt[\s\S]*?scheduleBolznstienStrikes\(b\.ownerId, b\.x, b\.y/.test(game)],
  ['Super uses mouse world coordinates for aim', /getMouseWorld\(\)[\s\S]*?Math\.atan2\(wm\.y - ent\.y, wm\.x - ent\.x\)/.test(game)],
  ['Super chain lightning deals 40% less damage', /const chainDmg = Math\.round\(tickDmg \* (?:0\.20|0\.60)\);/.test(game)],
  ['Super chain range is buffed by 50% from 220 to 330', /const chainHopRange = 330;\s*\/\/ \+50% per-hop range \(220 -> 330\)/.test(game)],
  ['Each chain hop searches radially from its current victim with no straight-line restriction', /Math\.hypot\(candidate\.x - sourceNode\.x, candidate\.y - sourceNode\.y\)[\s\S]{0,100}dist <= chainHopRange/.test(game)],
  ['Super chain lightning creates chain arcs and floating text', /bolznstienChainArcs\.push[\s\S]*?⚡ CHAIN -(?:80|40)%/.test(game)],
  ['Vertical sky thunderbolt rendered in explosions loop', /ex\.isBolznstienStrike[\s\S]*?const boltTopY = ex\.y - 680;[\s\S]*?ctx\.stroke\(\);/.test(game)],
  ['Chain lightning arcs rendered', /for \(const ca of bolznstienChainArcs\)[\s\S]*?ctx\.shadowColor/.test(game)],
  ['Unlimited multi-hop chain lightning propagation implemented', /currentChainHop\.length > 0[\s\S]*?nextChainHop\.push\(candidate\);/.test(game)],
  ['Super builds one complete combat roster and filters teams instead of missing enemy layouts', /const targets = \[player, \.\.\.bots\];[\s\S]{0,900}areAlliedEntities\(ent, t\)/.test(game)],
  ['Primary Super victims remain eligible to receive a chain from another victim', /const visitedChained = new Set\(\[ent\.id\]\);/.test(game) && !/for \(const pt of primaryHitTargets\) visitedChained\.add\(pt\.id\)/.test(game)],
  ['Chain propagation skips its current source and marks each recipient once', /candidate\.id === sourceNode\.id[\s\S]{0,180}visitedChained\.has\(candidate\.id\)[\s\S]{0,260}visitedChained\.add\(candidate\.id\)/.test(game)],
  ['Chained Super damage is explicitly tagged and can relay into another hop', /isBolznstienChain: true/.test(game) && /nextChainHop\.push\(candidate\);[\s\S]{0,220}currentChainHop = nextChainHop;/.test(game)],
  ['HC triangle strikes use the tighter 100px spacing', /Math\.cos\(strikeAngle\) \* 100/.test(game)],
  ['bolznstienChainArcs exported on window.__pureHTMLGame', /get bolznstienChainArcs\(\)\s*\{\s*return bolznstienChainArcs;\s*\}/.test(game)],

  // 8. Gadget & Star Power Fixes
  ['SP1 recognizes slow (in addition to sp1)', /const sp1 = owner \? \(\([\s\S]*?\) === 'slow' \|\| \([\s\S]*?\) === 'sp1'\) : false;/.test(game)],
  ['SP2 recognizes long (in addition to sp2)', /const sp2 = owner \? \(\([\s\S]*?\) === 'long' \|\| \([\s\S]*?\) === 'sp2'\) : false;/.test(game)],
  ['G1 click sets cooldown and updates button', /curBrawler === 'bolznstien' && curGadget === 'g1'[\s\S]*?gadgetCooldownUntil = now \+ GADGET_COOLDOWN_MS;[\s\S]*?updateGadgetButton\(\);[\s\S]*?return;/.test(game)],
  ['G2 click sets cooldown and updates button', /curBrawler === 'bolznstien' && curGadget === 'g2'[\s\S]*?gadgetCooldownUntil = now \+ GADGET_COOLDOWN_MS;[\s\S]*?updateGadgetButton\(\);[\s\S]*?return;/.test(game)],
  ['G1 instantly detonates strikes (triggerAt = 0)', /executeBolznstienG1[\s\S]*?s\.triggerAt = 0;/.test(game)],
  ['updateGadgetInfo includes Bolznstien G1 and G2 descriptions', /selectedBrawler === 'bolznstien'[\s\S]*?Bolznstien G1: Instant Discharge[\s\S]*?Bolznstien G2: Conductive Surge/.test(game)],
  ['ensureSoulSummonerData provides Bolznstien default level 11 and unlocks', /ensureSoulSummonerData[\s\S]*?playerData\.brawlers\.bolznstien = \{ level: 11[\s\S]*?gadgetUnlocked: true, starPowerUnlocked: true/.test(game)],
  ['loadProgress preserves or initializes Bolznstien level 11 and unlocks', /bid === 'bolznstien'[\s\S]*?playerData\.brawlers\[bid\]\.gadgetUnlocked = true;[\s\S]*?playerData\.brawlers\[bid\]\.starPowerUnlocked = true;/.test(game)],
  ['getOrCreateProgress defaults Bolznstien to level 11 with gadget and SP', /brawlerId === 'bolznstien'[\s\S]*?level: 11[\s\S]*?gadgetUnlocked: true, starPowerUnlocked: true/.test(game)],
  ['syncAbilityInputs ensures default gadget and star power for Bolznstien', /selectedBrawler === 'bolznstien'[\s\S]*?selectedGadget = 'g1'[\s\S]*?selectedStar = 'slow'/.test(game)],
  ['Bot AI activeBotSpeed applies +30% speed boost from G2', /t\.bolznstienSpeedUntil && nowTarget < t\.bolznstienSpeedUntil\) activeBotSpeed \*= 1\.30/.test(game)]
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
  console.log('All Bolznstien brawler regression checks passed successfully!\n');
}
