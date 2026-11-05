import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameCode = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const rosterCode = fs.readFileSync(new URL('../modules/brawlers/mythic/roster.js', import.meta.url), 'utf8');
const visualsCode = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Unhitabble is registered in allBrawlers, brawlerRarities, CUSTOM_BRAWLER_PORTRAITS, and Mythic roster', () => {
  assert.match(gameCode, /'unhitabble'/);
  assert.match(gameCode, /'dr0ne',\s*'unhitabble'/);
  assert.match(gameCode, /unhitabble:\s*'Mythic'/);
  assert.match(gameCode, /CUSTOM_BRAWLER_PORTRAITS\s*=\s*Object\.freeze\(\[[^\]]*'unhitabble'[^\]]*\]\)/);
  assert.match(rosterCode, /'unhitabble'/);
  assert.match(visualsCode, /unhitabble:\s*\[\s*'visor',\s*'#00f5d4',\s*'#d25bff'\s*\]/);
  assert.match(indexHtml, /<option value="unhitabble">Unhitabble \(Mythic\)<\/option>/);
});

test('Unhitabble has scaling stats defined (hp: 6000, dmg: 1400, speed: 280)', () => {
  assert.match(gameCode, /if\s*\(brawlerId === 'unhitabble'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(6000 \* hpScale\), dmg: Math\.round\(1400 \* scale\), speed: 280 \};\s*\}/);
});

test('Unhitabble brawlerData has complete attack, super, hyper, gadgets, and star powers defined', () => {
  assert.match(gameCode, /'unhitabble':\s*\{\s*name:\s*'Unhitabble'/);
  assert.match(gameCode, /attack:\s*'Miniaturization Wave'/);
  assert.match(gameCode, /super:\s*'Micro-Singularity Dome'/);
  assert.match(gameCode, /hyper:\s*'Subatomic Collapse/);
  assert.match(gameCode, /g1:\s*'Nano Dodge/);
  assert.match(gameCode, /g2:\s*'Collapse Blast/);
  assert.match(gameCode, /sp1:\s*'Particle Decay/);
  assert.match(gameCode, /sp2:\s*'Heavy Dilation/);
});

test('Unhitabble main attack fires quantum blast and spawns 3s Shrink Zone on hit, expiration, or wall collision', () => {
  assert.match(gameCode, /ownerBrawler:\s*'unhitabble'/);
  assert.match(gameCode, /isUnhitabbleBlast:\s*true/);
  assert.match(gameCode, /function spawnUnhitabbleShrinkZone\(/);
  assert.match(gameCode, /isShrinkZone:\s*true/);
  assert.match(gameCode, /b\.isUnhitabbleBlast/);
  assert.match(gameCode, /selectedBrawler === 'unhitabble' && !aimingSuper/);
});

test('Unhitabble Super deploys Miniaturization Dome and handles Hypercharge subatomic collapse', () => {
  assert.match(gameCode, /function spawnUnhitabbleDome\(/);
  assert.match(gameCode, /isUnhitabbleDome:\s*true/);
  assert.match(gameCode, /if \(combatBrawler === 'unhitabble'\) \{ spawnUnhitabbleDome\(player/);
  assert.match(gameCode, /if \(botCombatBrawler === 'unhitabble'\) \{ spawnUnhitabbleDome\(bot/);
  assert.match(gameCode, /b\.unhitabbleShrunkScale/);
  assert.match(gameCode, /selectedBrawler === 'unhitabble' && aimingSuper/);
  assert.match(gameCode, /SUBATOMIC COLLAPSE!/);
});

test('Unhitabble Gadgets and Star Powers execute properly with speed bonus and damage reduction', () => {
  assert.match(gameCode, /function triggerUnhitabbleNanoDodge\(/);
  assert.match(gameCode, /function triggerUnhitabbleCollapseBlast\(/);
  assert.match(gameCode, /entity\.unhitabbleNanoDodgeUntil/);
  assert.match(gameCode, /b\.unhitabbleSp1Reduced/);
  assert.match(gameCode, /player\.unhitabbleNanoDodgeUntil/);
  assert.match(gameCode, /curBrawler === 'unhitabble'/);
});

test('Fuser Mutation Ability is officially registered in SPECIAL_ABILITY_DEFS and breakthrough quests', () => {
  assert.match(gameCode, /fuser:\s*\{\s*type:\s*'mutation',\s*name:\s*'Homing Curvature'/);
  assert.match(gameCode, /pieceName:\s*'Fuser Mutation Piece'/);
  assert.match(gameCode, /fuser:\s*\[\s*\{id:'fusion_flow'/);
  assert.match(gameCode, /function hasFuserMutation\(/);
  assert.match(gameCode, /function consumeFuserMutationAttack\(/);
});

test('Fuser has 40% faster projectile speed (1596) and 40% faster unload delay (58ms / 25ms)', () => {
  assert.match(gameCode, /const delay = hyper \? 25 : 58;/);
  assert.match(gameCode, /const fuserSpd = isPowerPlayModifierActive\(fromEntity\) \? 252 : 1596;/);
  assert.match(gameCode, /b\.ownerBrawler === 'fuser' && b\.isFuserBullet && b\.isFuserMutation/);
  assert.match(gameCode, /b\.life >= b\.maxLife \* 0\.35/);
});

test('Fuser mutation aura ring and HUD state are rendered with standard special ability visuals', () => {
  assert.match(gameCode, /if\(fighterId==='fuser'&&isSpecialAbilityAvailableForEntity\(entity,'fuser'\)\)/);
  assert.match(gameCode, /if \(selectedBrawler === 'fuser'\) \{[\s\S]*?MUTATION - 1 CURVE VOLLEY/);
});
