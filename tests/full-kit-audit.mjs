import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const rosterFiles = [
  'common','rare','super-rare','epic','mythic','legendary','exotic','anomaly'
].map(rarity => new URL(`../modules/brawlers/${rarity}/roster.js`, import.meta.url));
const ids = rosterFiles.flatMap(file => {
  const source=fs.readFileSync(file,'utf8');
  const group=source.match(/registerBrawlerGroup\([^,]+,\s*\[([\s\S]*?)\]\s*\)/)?.[1] || '';
  return [...group.matchAll(/['"]([^'"]+)['"]/g)].map(match=>match[1]);
});

assert.equal(new Set(ids).size, ids.length, 'roster ids must be unique');
assert.equal(ids.length, 74, 'expected complete 74-fighter roster');

for (const id of ids) {
  assert.match(game, new RegExp(`['"]${id}['"]\\s*:\\s*\\{`), `${id}: missing kit metadata`);
  assert.match(game, new RegExp(`(?:brawler|combatBrawler|botCombatBrawler)\\s*===\\s*['"]${id}['"]|getCombatBrawler`), `${id}: missing combat routing`);
}

for (const token of [
  'activateRecoveryGadget', 'castRecoverySuper',
  'duckBuffetArmed', 'overlordArcBurstArmed',
  'beastRendingArmed', 'chickpigSunnyArmed', 'upiedownFreshArmed'
]) assert.ok(game.includes(token), `missing recovery hook: ${token}`);

assert.ok(game.includes('if(owner && areAlliedEntities(owner, bot)'), 'AOE must use alliance helper for bots');
assert.ok(game.includes('if(!(owner && areAlliedEntities(owner, player)))'), 'AOE must use alliance helper for player');
assert.ok(game.includes('if (owner && areAlliedEntities(owner, target)) continue;'), 'status effects must skip allies');
assert.ok(game.includes('team:getEntityTeam(owner)'), 'recovered summons must inherit their owner team');
assert.ok(game.includes('return hitCount;'), 'direct attacks need hit confirmation for on-hit mechanics');

console.log(`Full kit audit passed for ${ids.length} brawlers.`);
