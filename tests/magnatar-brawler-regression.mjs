import fs from 'fs';

const game = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const checks = [
  // 1. Roster & Metadata Registration
  ['index.html contains magnatar option', html.includes('<option value="magnatar">Magnatar (Epic)</option>')],
  ['magnatar registered in brawlerData', /'magnatar':\s*\{[\s\S]*?name:\s*'Magnatar'/.test(game)],
  ['magnatar role registered as Controller', /magnatar:\s*'Controller'/.test(game)],
  ['magnatar rarity registered as Epic', /magnatar:\s*'Epic'/.test(game)],
  ['magnatar registered in allBrawlers array', /'magnatar'/.test(game) && game.includes("'sir_cheeseburger', 'weefee', 'blinkeye', 'bolznstien', 'magnatar'")],
  ['magnatar registered in getScaledStats', /brawlerId === 'magnatar'[\s\S]*?hp:\s*Math\.round\(6600 \* scale\)[\s\S]*?dmg:\s*Math\.round\(864 \* scale\)/.test(game)],
  ['magnatar registered in reloadMsByBrawler', /magnatar:\s*1450/.test(game)],
  ['magnatar registered in fireDelayMsByBrawler', /magnatar:\s*200/.test(game)],
  ['magnatar portrait icon is 🧲', /magnatar:\s*'🧲'/.test(game)],
  ['magnatar in CUSTOM_BRAWLER_PORTRAITS', /CUSTOM_BRAWLER_PORTRAITS[\s\S]*?'magnatar'/.test(game)],
  ['magnatar SVG portrait defined', /magnatar:\s*`<circle cx="50" cy="50" r="34" fill="#0b132b"/.test(game)],
  ['magnatar in brawlerTraitData', /magnatar:\s*\['Projectile Attractor',\s*'Charge Attack'\]/.test(game)],
  ['magnatar in GADGET_COOLDOWN_BY_BRAWLER', /magnatar:\s*\{\s*g1:\s*14000,\s*g2:\s*15000\s*\}/.test(game)],

  // 2. Progression & Unlocks
  ['magnatar unlocked in ensureUnlockedBrawlers', /playerData\.unlockedBrawlers\.magnatar = true;/.test(game)],
  ['magnatar default level 11 and unlocks in ensureSoulSummonerData', /playerData\.brawlers\.magnatar = \{\s*level:\s*11[\s\S]*?gadgetUnlocked:\s*true,\s*starPowerUnlocked:\s*true,\s*hyperchargeUnlocked:\s*true/.test(game)],
  ['magnatar preserved in loadProgress', /playerData\.unlockedBrawlers\.magnatar = true;/.test(game)],
  ['magnatar default level 11 in getOrCreateProgress', /brawlerId === 'bolznstien' \|\| brawlerId === 'magnatar'/.test(game)],
  ['syncAbilityInputs ensures defaults for magnatar', /selectedBrawler === 'bolznstien' \|\| selectedBrawler === 'magnatar'/.test(game)],

  // 3. Main Attack: Spinning Orbs & Hold to Charge (up to 4, up to 8 in HC)
  ['Hold-to-charge input handles up to 4 orbs (up to 8 in HC)', /selectedBrawler === 'magnatar'[\s\S]*?const maxOrbs = isHypercharged \? 8 : 4;[\s\S]*?player\.magnatarOrbCount = clamp\(1 \+ Math\.floor\(elapsed \/ msPerOrb\), 1, maxOrbs\);/.test(game)],
  ['fire() spawns isMagnatarOrb bullets in an orbital formation (not a cone)', /brawler === 'magnatar'[\s\S]*?orbitRadius[\s\S]*?orbitBaseAngle[\s\S]*?isMagnatarOrb:\s*true/.test(game)],
  ['updateBullets updates isMagnatarOrb flight with orbital kinematics', /b\.isMagnatarOrb && !b\.isMagnetized && \(b\.orbitRadius \|\| 0\) > 0[\s\S]*?b\.orbitSpeed/.test(game)],
  ['isMagnatarOrb bullets render a realistic planetary solar system', /else if \(b\.isMagnatarOrb\)[\s\S]*?Solar Corona[\s\S]*?Orbit Track[\s\S]*?Saturn-like rings[\s\S]*?Moonlet orbiting Planet 3/.test(game)],
  ['Aim preview shows orbital channel bounds and revolving orb indicators', /selectedBrawler === 'magnatar' && !aimingSuper[\s\S]*?player\.magnatarOrbCount \|\| 1[\s\S]*?orbitR[\s\S]*?ctx\.arc\(ox, oy, 6, 0, Math\.PI \* 2\)/.test(game)],

  // 4. Super: Magnetic Beacon (Ground & Enemy Attachment)
  ['castMagnatarSuper throws isMagnatarBeacon', /function castMagnatarSuper\(entity, targetX, targetY, isHyper\)[\s\S]*?isMagnatarBeacon:\s*true/.test(game)],
  ['deployMagnatarBeacon attaches vortex to ground or enemy target', /function deployMagnatarBeacon\(ownerEntity, x, y, attachedEntityId = null, isHyper = false, isPersonalAura = false\)[\s\S]*?magnatarVortices\.push\(beacon\)/.test(game)],
  ['Beacon wall collision deploys beacon', /b\.isMagnatarBeacon[\s\S]*?deployMagnatarBeacon\(owner, b\.x, b\.y, null, !!b\.isHyper, false\);/.test(game)],
  ['Beacon maxLife / range expiration deploys beacon', /b\.isMagnatarBeacon[\s\S]*?deployMagnatarBeacon\(owner, b\.targetX \|\| b\.x, b\.targetY \|\| b\.y, null, !!b\.isHyper, false\);/.test(game)],
  ['Beacon enemy hit attaches beacon to enemy entity', /b\.isMagnatarBeacon[\s\S]*?deployMagnatarBeacon\(owner, target\.x, target\.y, target\.id, !!b\.isHyper, false\);/.test(game)],
  ['Vortex follows attached enemy position each frame', /if \(v\.attachedEntityId\) \{\s*const ent = getEntityById\(v\.attachedEntityId\);[\s\S]*?v\.x = ent\.x;\s*v\.y = ent\.y;\s*\}/.test(game)],
  ['fireSuper routes magnatar to castMagnatarSuper', /combatBrawler === 'magnatar'[\s\S]*?castMagnatarSuper\(player, wm\.x, wm\.y, !!isHypercharged\)/.test(game)],
  ['fireSuperBot routes magnatar to castMagnatarSuper', /botCombatBrawler === 'magnatar'[\s\S]*?castMagnatarSuper\(bot, targetX, targetY, isHyper\)/.test(game)],

  // 5. Super: Projectile Inward Pull + Orbital Spinning (no pierce)
  ['Projectiles entering vortex do not gain piercing', /dist <= v\.radius[\s\S]*?b\.isMagnetized = true;/.test(game) && !/dist <= v\.radius[\s\S]*?b\.pierce = true;[\s\S]*?b\.isMagnetized = true;/.test(game)],
  ['Projectiles reset hitIds periodically to re-hit spinning targets', /dist <= v\.radius[\s\S]*?!b\._lastMagnetHitReset \|\| now - b\._lastMagnetHitReset > 220[\s\S]*?b\.hitIds = \{\};/.test(game)],
  ['Phase 1 direct homing and Phase 2 orbital spin inward pulling', /PHASE 1: DIRECT HOMING TO ENEMY[\s\S]*?PHASE 2: ORBITAL SPIN TRYING TO HIT AGAIN[\s\S]*?targetVx = Math\.cos\(angleToFocus\) \* pullStrength \+ Math\.cos\(tangentAngle\) \* spinStrength/.test(game)],
  ['Projectiles smoothly steer inward and spiral around center', /b\.vx = b\.vx \* \(1 - steerFactor\) \+ targetVx \* steerFactor;/.test(game)],
  ['Vortex visual rendering renders boundary, swirling flux spirals, and beacon core', /for \(const v of magnatarVortices\)[\s\S]*?isWorldVisualVisible[\s\S]*?spiralAng[\s\S]*?fillText\(isPersonal \? '🛡️🧲' : '🧲', 0, 0\)/.test(game)],

  // 6. Hypercharge Features
  ['HC Super has +40% size (radius 308 vs 220)', /const baseRadius = isPersonalAura \? 180 : \(isHyper \? 308 : 220\);/.test(game)],
  ['HC Super creates personal aura around player that makes projectiles spin around player', /if \(isHyper\) \{\s*deployMagnatarBeacon\(entity, entity\.x, entity\.y, null, true, true\);[\s\S]*?🧲 SINGULARITY BARRIER!/.test(game)],
  ['HC personal singularity barrier guides projectiles around player and protects from damage', /Singularity barrier: projectile curves safely around player without damaging player[\s\S]*?HYPERCHARGE PERSONAL SINGULARITY BARRIER: PROJECTILES GO AROUND THE PLAYER[\s\S]*?tangentAngle = angleFromPlayer \+ \(Math\.PI \/ 2\) \* spinDir;/.test(game)],
  ['Personal aura moves with owner entity', /else if \(v\.isPersonalAura\) \{\s*const owner = getEntityById\(v\.ownerId\);[\s\S]*?v\.x = owner\.x;\s*v\.y = owner\.y;\s*\}/.test(game)],
  ['HC personal aura exempts player outgoing Super beacon', /if \(v\.isPersonalAura && b\.isMagnatarBeacon\) continue;/.test(game)],
  ['HC personal aura exempts Magnatar own projectiles', /if \(v\.isPersonalAura && b\.ownerId === v\.ownerId\) continue;/.test(game)],
  ['HC main attack charges +4 orbs up to 8', /const maxOrbs = isHypercharged \? 8 : 4;/.test(game)],

  // 7. Gadgets & Star Powers
  ['G1 executeMagnatarG1 emits 180px shockwave and repels bullets', /function executeMagnatarG1\(entity\)[\s\S]*?const shockRadius = 180;[\s\S]*?applyKnockback\(t, entity\.x, entity\.y, 320\);[\s\S]*?b\.ownerId = entity\.id;/.test(game)],
  ['G2 executeMagnatarG2 arms instant max orbs with size and damage boost', /function executeMagnatarG2\(entity\)[\s\S]*?entity\.magnatarG2Armed = true;/.test(game)],
  ['G2 armed check sets orbCount to maxOrbs with +25% size and damage in fire()', /fromEntity\.magnatarG2Armed[\s\S]*?orbCount = maxOrbs;[\s\S]*?sizeBonus = 1\.25;[\s\S]*?dmgBonus = 1\.25;/.test(game)],
  ['SP1 Ferrous Drag slows enemies 30% with no damage tick', /if \(v\.sp1\) \{\s*applyStatusEffect\(t, 'slow', 500\);\s*\}/.test(game)],
  ['SP2 Kinetic Induction extends vortex duration and grants super charge', /if \(v\.sp2 && !b\._magnatarSP2Triggered\) \{\s*b\._magnatarSP2Triggered = true;[\s\S]*?v\.expiresAt = Math\.min\(v\.expiresAt \+ 350, now \+ 8000\);[\s\S]*?superCharge = clamp\(superCharge \+ 4, 0, 100\);/.test(game)],
  ['gadgetBtn click handles G1 and G2 for magnatar with cooldown', /curBrawler === 'magnatar' && curGadget === 'g1'[\s\S]*?executeMagnatarG1\(player\);[\s\S]*?gadgetCooldownUntil = now \+ GADGET_COOLDOWN_MS;[\s\S]*?updateGadgetButton\(\);[\s\S]*?return;/.test(game)],
  ['updateGadgetInfo has descriptions for magnatar G1 and G2', /selectedBrawler === 'magnatar'[\s\S]*?Magnatar G1: Polarity Inversion[\s\S]*?Magnatar G2: Flux Overcharge/.test(game)],
  ['Bot AI supports magnatar G1 and G2', /bot\.brawler === 'magnatar' && g === 'g1'[\s\S]*?executeMagnatarG1\(bot\);/.test(game)],

  // 8. Visual Models & Exports
  ['2.5D character model for Magnatar with N/S pole gauntlets and orbiting planetary orbs', /brawlerId === 'magnatar'[\s\S]*?North Pole Gauntlet[\s\S]*?South Pole Gauntlet[\s\S]*?Orbiting magnetic planetary orbs/.test(game)],
  ['Super aiming preview with 660px range, soft auto-lock reticle, and HC barrier preview', /selectedBrawler === 'magnatar' && aimingSuper[\s\S]*?const range = 660;[\s\S]*?LOCKED ON[\s\S]*?PERSONAL HC VORTEX/.test(game)],
  ['cleanBattlefield resets magnatarVortices', /magnatarVortices\.length = 0;/.test(game)],
  ['window.__pureHTMLGame exports magnatarVortices', /get magnatarVortices\(\)\s*\{\s*return magnatarVortices;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports castMagnatarSuper', /get castMagnatarSuper\(\)\s*\{\s*return castMagnatarSuper;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports deployMagnatarBeacon', /get deployMagnatarBeacon\(\)\s*\{\s*return deployMagnatarBeacon;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeMagnatarG1', /get executeMagnatarG1\(\)\s*\{\s*return executeMagnatarG1;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports executeMagnatarG2', /get executeMagnatarG2\(\)\s*\{\s*return executeMagnatarG2;\s*\}/.test(game)]
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
  console.log('All Magnatar brawler regression checks passed successfully!\n');
}
