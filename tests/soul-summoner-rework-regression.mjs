import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// 1. Constellations defined
assert.match(game, /SOUL_CONSTELLATIONS\s*=\s*Object\.freeze\(\[/, 'SOUL_CONSTELLATIONS array exists');
for (const c of ['Rare', 'Epic', 'Mythic', 'Exotic', 'Unique', 'Anomaly']) {
    assert.match(game, new RegExp(`id:\\s*'${c}'`), `Constellation ${c} is defined`);
}

// 2. Choice & Random helpers exist
assert.match(game, /function getOrGenerateCurrentChoices/, 'getOrGenerateCurrentChoices helper exists');
assert.match(game, /function rerollCurrentChoices/, 'rerollCurrentChoices helper exists');
assert.match(game, /function getConstellationProgress/, 'getConstellationProgress helper exists');
assert.match(game, /function getActiveConstellationTier/, 'getActiveConstellationTier helper exists');

// 3. UI Title & Choice Options
assert.match(game, /SOUL SUMMONER · SOUL ROAD/, 'Soul Summoner Soul Road title rendered');
assert.match(game, /CURRENT SOUL ROAD STEP/, 'Current Soul Road step rendered');
assert.match(game, /RANDOM PICK/, 'Random Pick button exists');
assert.match(game, /REROLL OPTIONS/, 'Reroll Options button exists');

console.log('Soul Summoner Choice & Random regression tests passed successfully!');
