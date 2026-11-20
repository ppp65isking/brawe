import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');

assert.match(game, /function drawFeatured2p5DBrawler\(entity, drawY, brawlerId, isBoss\)/, 'featured 2.5D renderer exists');
for (const id of ['evil_doctor', 'bouncin_balls', 'minigunnin', 'mageny']) {
  assert.match(game, new RegExp(`brawlerId === '${id}'`), `${id} owns a custom in-match design`);
}
assert.match(game, /fromEntity\.visualAimAngle = ang;[\s\S]{0,100}fromEntity\.visualAttackAt = now;/, 'successful attacks drive fighter pose animation');
assert.match(game, /player\.visualSuperAt = now;/, 'player Supers drive fighter pose animation');
assert.match(game, /bot\.visualSuperAt = bot\.lastAttackAt;/, 'bot Supers drive fighter pose animation');
assert.match(game, /function hasCustomBrawlerPortrait\(brawlerId\)/, 'shared custom portrait routing exists');
assert.match(game, /home-brawler-avatar[\s\S]{0,160}getBrawlerPortraitMarkup|portraitIcon/, 'home hero receives shared portrait art');
assert.match(game, /profile-favorite-icon[\s\S]{0,180}getBrawlerPortraitMarkup/, 'profile favorites receive shared portrait art');
assert.match(game, /charIcon\.innerHTML = getBrawlerPortraitMarkup\(id\)/, 'fighter upgrade page receives shared portrait art');
assert.match(bootstrap, /const RELEASE_TOKEN = '202609\d{2}-[^']+'/, 'dated release token cache-busts the 2.5D renderer');
assert.match(bootstrap, /\.\/modules\/visuals\/roster-2p5d\.js/, 'runtime loads the shared 2.5D registry before game.js');

console.log('Featured 2.5D fighter render and animation wiring checks passed.');
