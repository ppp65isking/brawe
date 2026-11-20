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
assert.ok(!game.includes('CURRENT SOUL ROAD STEP'), 'no Soul Road step display — the summoner is display-only now (rebuild stage 2)');
assert.match(game, /RANDOM PICK/, 'Random Pick button exists');
assert.ok(!game.includes('REROLL OPTIONS'), 'no reroll button — a summon offers 3 random brawlers, no reroll (rebuild stage 2)');

console.log('Soul Summoner Choice & Random regression tests passed successfully!');
