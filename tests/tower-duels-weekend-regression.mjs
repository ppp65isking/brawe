import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(source, /tower_duels_weekend[^\n]+Tower Duels Weekend/);
assert.match(source, /TOWER_DUELS_WEEKEND_START = new Date\(2026, 7, 14/);
assert.match(source, /TOWER_DUELS_WEEKEND_END = new Date\(2026, 7, 17/);
assert.match(source, /tower_duelar:\{name:'TOWER DUELAR'/);
assert.match(source, /playerTeam = createTowerTroubleRoster\(pool, 3\)/);
assert.match(source, /botTeam = createTowerTroubleRoster\(pool, 3\)/);
assert.match(source, /function showTowerDuelsCrewPreview\(event\)/);
assert.match(source, /YOUR RANDOM DUEL CREW/);
assert.match(source, /TOWER POWER ACTIVE - 2 transformations per fighter/);
assert.match(source, /towerDuelPowerLoadouts = rollTowerDuelPowerLoadouts\(playerTeam\)/);
assert.match(source, /towerDuelBotPowerLoadouts = rollTowerDuelPowerLoadouts\(botTeam\)/);
assert.match(source, /towerDuelPreset\.map\(id => deck\.find/);
assert.match(source, /const duelPlayerLevel = 11;/);
assert.match(source, /const botLevel = isTowerDuelEvent \? 11/);
assert.match(source, /function getNativeAmmoCapacity\(brawlerId\)[\s\S]{0,260}minigunnin[\s\S]{0,120}return 100/);
assert.match(source, /function startDuelsRound\([\s\S]{0,3100}resetPlayerAmmoForBrawler\(selectedBrawler, true\)/);
assert.match(source, /event\.matchesCompleted = Math\.min\(5/);
assert.match(source, /bon\.unlockedTitles\.push\('tower_duelar'\)/);

const roster = ['a', 'b', 'c', 'd', 'e'];
function createRoster(pool, size, randomValues) {
  const shuffled = [...pool];
  let cursor = 0;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomValues[cursor++ % randomValues.length] * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}
const first = createRoster(roster, 3, [0.1, 0.4, 0.8, 0.2]);
const second = createRoster(roster, 3, [0.9, 0.7, 0.3, 0.6]);
assert.equal(first.length, 3);
assert.equal(new Set(first).size, 3);
assert.equal(second.length, 3);
assert.notDeepEqual(first, second);

console.log('tower duels weekend regression checks passed');
