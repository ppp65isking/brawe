import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// 1. Registration
assert.match(game, /'upgradart': \{[\s\S]{0,400}name: 'Upgradart'[\s\S]{0,200}role: 'Damage Dealer'/, 'Upgradart is properly registered in brawlerData');
assert.match(game, /upgradart: 'Rare'/, 'Upgradart rarity is Rare');
assert.match(game, /upgradart: '🎯'/, 'Upgradart has a portrait icon');
assert.match(game, /CUSTOM_BRAWLER_PORTRAITS[\s\S]{0,100}'upgradart'/, 'Upgradart has a custom SVG portrait');
assert.match(game, /playerData\.unlockedBrawlers\.rocketeer = true/, 'Rocketeer is unlocked by default along with Outlit and Fuser');

// 2. Stages and Progress
assert.match(game, /const UPGRADART_STAGE_THRESHOLDS = Object\.freeze\(\[[\s\S]{0,350}12000[\s\S]{0,100}17000[\s\S]{0,100}23000[\s\S]{0,100}30000/, 'Buffed thresholds match 12k, 17k, 23k, and 30k');
assert.match(game, /function getUpgradartStage\(totalDmg\)/, 'getUpgradartStage calculates active stage');
assert.match(game, /function getUpgradartProgress\(totalDmg\)/, 'getUpgradartProgress calculates progress pct and labels');
assert.match(game, /function recordUpgradartDamage\(entity, dmg\)/, 'recordUpgradartDamage increments progress and announces level ups');

// 3. Main Attack firing
assert.match(game, /\} else if \(brawler === 'upgradart'\) \{[\s\S]{0,1500}diagAngleOffset[\s\S]{0,500}centerCount/, 'Main attack implements stage-based dart counts and diagonal offsets');
assert.match(game, /const baseDamage = stage === 1 \? 960 : 320/, 'Stage 1 dart damage is buffed by 200% to 960');
assert.match(game, /const diagAngleOffset = 0\.14/, 'Diagonal dart spread is reduced by 50%');
assert.match(game, /upgradartStage:\s*stage/, 'Darts carry their stage for custom visuals');
assert.match(game, /if \(b\.isUpgradartDart\)[\s\S]{0,500}const colors = \['#00ff88', '#28d8ff', '#8b72ff', '#d85cff', '#ffd45c'\]/, 'Each stage has distinct dart visuals');
assert.match(game, /damage:\s*dartDamage,[\s\S]{0,80}pierce:\s*hyper/, 'Hypercharge main attack darts pierce');
assert.match(game, /hitboxMod:\s*1\.8/, 'Main attack dart size is increased by 80%');
assert.match(game, /if \(hyper && isSuperActive\) \{[\s\S]{0,200}centerCount \+= 1;[\s\S]{0,100}leftCount \+= 1;[\s\S]{0,100}rightCount \+= 1;/, 'Core Surge adds +1 dart to every direction during Super');

// 4. Super / Power Move
assert.match(game, /function castUpgradartSuper\(owner, hyper, targetX, targetY\) \{[\s\S]{0,500}const durationMs = stage >= 4 \? 5000 : 4000;/, 'Super duration is 4.0s for Stages 1-3 and 5.0s for Stages 4-5');
assert.match(game, /target\.upgradartPoisonValue = Math\.min\(1000, \(target\.upgradartPoisonValue \|\| 0\) \+ poisonStackGain\);/, 'Poison darts stack poison up to 1000 damage');

// 5. Core Surge / Returning Darts
assert.match(game, /if \(b\.isUpgradartDart && b\.upgradartReturns\) \{[\s\S]{0,400}b\.damage = 96;[\s\S]{0,400}Math\.atan2\(dartOwner\.y - b\.y, dartOwner\.x - b\.x\)/, 'Returning darts deal 30% damage (96 dmg) and home toward owner');

// 6. Gadgets (G1 & G2)
assert.match(game, /curBrawler === 'upgradart' && curGadget === 'g1'[\s\S]{0,800}recordUpgradartDamage\(player, 3000\)[\s\S]{0,300}ammo = Math\.min\(maxAmmo, ammo \+ 2\)/, 'Gadget 1 adds +3,000 progress and reloads 2 ammo');
assert.match(game, /curBrawler === 'upgradart' && curGadget === 'g2'[\s\S]{0,800}upgradartCaltrops\.push[\s\S]{0,500}damage: 450/, 'Gadget 2 drops 5 toxic caltrops dealing 450 damage');
assert.match(game, /bot\.brawler === 'upgradart' && g === 'g1'[\s\S]{0,800}bot\.brawler === 'upgradart' && g === 'g2'/, 'Bots can use both Upgradart gadgets');

// 7. Star Powers (SP1 & SP2)
assert.match(game, /entity\.upgradartSp1AntiHealUntil && performance\.now\(\) < entity\.upgradartSp1AntiHealUntil[\s\S]{0,80}amount \*= 0\.50/, 'Star Power 1 cuts enemy healing by 50%');
assert.match(game, /const baseDartSpeed = 850 \* \(hasSp2 \? 1\.25 : 1\.0\);[\s\S]{0,100}const baseDartRange = 440 \* \(hasSp2 \? 1\.20 : 1\.0\);/, 'Star Power 2 boosts projectile speed by 25% and range by 20%');

// 8. HUD & UI
assert.match(game, /selectedBrawler === 'upgradart'[\s\S]{0,300}getUpgradartProgress\(player\.upgradartTotalDamage \|\| 0\)/, 'getPlayerMechanicHudState displays real-time stage and progress bar');

console.log('Upgradart main attack, Super, Hypercharge, Gadgets, and Star Powers regression checks passed!');
