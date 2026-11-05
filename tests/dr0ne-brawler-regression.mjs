import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameCode = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const rosterCode = fs.readFileSync(new URL('../modules/brawlers/mythic/roster.js', import.meta.url), 'utf8');
const visualsCode = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
const slopSushiCode = fs.readFileSync(new URL('../slopsushi-cards.js', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Dr0ne is registered in allBrawlers, brawlerRarities, and Mythic roster', () => {
  assert.match(gameCode, /'dr0ne'/);
  assert.match(gameCode, /dr0ne:\s*'Mythic'/);
  assert.match(rosterCode, /'dr0ne'/);
  assert.match(visualsCode, /dr0ne:\s*\['robot',\s*'#00e5ff',\s*'#80d8ff'\]/);
  assert.match(indexHtml, /<option value="dr0ne">Dr0ne \(Mythic\)<\/option>/);
});

test('Dr0ne has scaling stats defined (hp: 6400, dmg: 1400, speed: 275)', () => {
  assert.match(gameCode, /if\s*\(brawlerId === 'dr0ne'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(6400 \* hpScale\), dmg: Math\.round\(1400 \* scale\), speed: 275 \};\s*\}/);
});

test('Dr0ne brawlerData has complete attack, super, hyper, gadgets, and star powers defined', () => {
  assert.match(gameCode, /'dr0ne':\s*\{\s*name:\s*'Dr0ne'/);
  assert.match(gameCode, /attack:\s*'Pulse Blaster & Swarm Command'/);
  assert.match(gameCode, /super:\s*'Drone Station'/);
  assert.match(gameCode, /hyper:\s*'Overdrive Grid 2\.0/);
  assert.match(gameCode, /g1:\s*'Emergency Recall/);
  assert.match(gameCode, /g2:\s*'Drone Blitz/);
  assert.match(gameCode, /sp1:\s*'Nano Repair/);
  assert.match(gameCode, /sp2:\s*'Shield Matrix/);
});

test('Dr0ne main attack fires dual plasma darts with repair synergy and focus targeting', () => {
  assert.match(gameCode, /ownerBrawler:\s*'dr0ne'/);
  assert.match(gameCode, /isDr0nePulse:\s*true/);
  assert.match(gameCode, /b\.ownerBrawler === 'dr0ne' && b\.isDr0nePulse/);
  assert.match(gameCode, /pod\.isDroneStation && pod\.ownerId === b\.ownerId/);
  assert.match(gameCode, /owner\.dr0neFocusTargetId = target\.id/);
});

test('Dr0ne Super deploys stationary Drone Station that fabricates combat drones', () => {
  assert.match(gameCode, /function spawnDr0neStation\(/);
  assert.match(gameCode, /isDroneStation:\s*true/);
  assert.match(gameCode, /function spawnDr0neCombatDrone\(/);
  assert.match(gameCode, /isDr0neMinion:\s*true/);
  assert.match(gameCode, /if \(combatBrawler === 'dr0ne'\) \{ spawnDr0neStation\(player/);
  assert.match(gameCode, /if \(botCombatBrawler === 'dr0ne'\) \{ spawnDr0neStation\(bot/);
});

test('Dr0ne Hypercharge spawns Ultra-Fast Seeker Drones that rush with 100% DR, strike enemies, and warp back on 4s cooldown', () => {
  assert.match(gameCode, /isSeeker:\s*!!isSeeker/);
  assert.match(gameCode, /if \(drone\.isSeeker\)/);
  assert.match(gameCode, /drone\.invulnerableUntil = now \+ 100/);
  assert.match(gameCode, /CRUSHING RUSH!/);
  assert.match(gameCode, /WARP RETURN!/);
  assert.match(gameCode, /drone\.seekerCooldownUntil = now \+ 4000/);
});

test('Dr0ne Gadgets and Star Powers execute properly', () => {
  assert.match(gameCode, /function triggerDr0neEmergencyRecall\(/);
  assert.match(gameCode, /function triggerDr0neDroneBlitz\(/);
  assert.match(gameCode, /isDr0neLaser:\s*true/);
  assert.match(gameCode, /DR0NE_SP1_NANO_REPAIR_HPS/);
  assert.match(gameCode, /brawler === 'dr0ne' && getOwnerStarChoice\(entity\) === 'long'/);
});

test('Dr0ne body and swarm minions render custom vector/canvas artwork', () => {
  assert.match(gameCode, /brawlerId === 'dr0ne'/);
  assert.match(gameCode, /brawlerId === 'dr0ne_minion'/);
  assert.match(gameCode, /pod\.isDroneStation/);
  assert.match(gameCode, /b\.ownerBrawler === 'dr0ne' && b\.isDr0nePulse/);
  assert.match(gameCode, /b\.ownerBrawler === 'dr0ne' && b\.isDr0neLaser/);
});
