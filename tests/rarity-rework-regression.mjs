import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// 1. Check SOUL_UNLOCK_COST_BY_RARITY
assert.match(game, /SOUL_UNLOCK_COST_BY_RARITY\s*=\s*\{[\s\S]*?Starter:\s*0[\s\S]*?Rare:\s*70[\s\S]*?Epic:\s*170[\s\S]*?Mythic:\s*270[\s\S]*?Exotic:\s*420[\s\S]*?Unique:\s*600[\s\S]*?Anomaly:\s*850/, 'Soul unlock costs match all 7 tiers');

// 2. Starter brawlers strictly outlit, fuser, rocketeer
assert.match(game, /outlit:\s*'Starter'/, 'outlit is Starter');
assert.match(game, /fuser:\s*'Starter'/, 'fuser is Starter');
assert.match(game, /rocketeer:\s*'Starter'/, 'rocketeer is Starter');

// 3. Default unlocks strictly outlit, fuser, rocketeer
assert.match(game, /playerData\.unlockedBrawlers\s*=\s*\{\s*outlit:\s*true,\s*fuser:\s*true,\s*rocketeer:\s*true\s*\}/, 'Default unlockedBrawlers object has outlit, fuser, rocketeer');
assert.match(game, /playerData\.unlockedBrawlers\.outlit\s*=\s*true;[\s\S]*?playerData\.unlockedBrawlers\.fuser\s*=\s*true;[\s\S]*?playerData\.unlockedBrawlers\.rocketeer\s*=\s*true;/, 'Default brawlers explicitly set to true');

// 4. Check representative brawlers for each tier
// Rare (19)
for (const b of ['echo', 'cheseypuff', 'unopcoloco', 'minigunnin', 'bowlin_rida', 'chaird', 'forest', 'goonbob', 'bolznstien', 'rager', 'oil_maker', 'drainbow', 'weefee', 'trampaheal', 'upgradart', 'fuel', 'axeywaxy', 'sir_cheeseburger', 'dr0ne']) {
    assert.match(game, new RegExp(`${b}:\\s*'Rare'`), `${b} is Rare`);
}

// Epic (31)
for (const b of ['trapper', 'heater_miser', 'money_and_tax', 'hunter', 'bouncin_balls', 'fightnfire', 'splitter', 'scuba_diver', 'hoop', 'beam', 'teether', 'warrior', 'peter_pickle', 'ramage', 'blinkeye', 'badbat', 'looma', 'magnatar', 'fastpass', 'homer', 'ice_cream', 'swimmer', 'boomer', 'blade_vane', 'daggershard', 'cluster', 'witch', 'predator', 'draflygon', 'duck', 'unhitabble']) {
    assert.match(game, new RegExp(`${b}:\\s*'Epic'`), `${b} is Epic`);
}

// Mythic (12)
for (const b of ['dashaholic', 'classy', 'steamer', 'tempo_maker', 'amplifier', 'skeleflying', 'evil_doctor', 'boom_arang', 'upiedown', 'chickpig', 'jetpack', 'freestyle']) {
    assert.match(game, new RegExp(`${b}:\\s*'Mythic'`), `${b} is Mythic`);
}

// Exotic (10)
for (const b of ['copyphase', 'snapper', 'portalo', 'ghoul', 'jacktrade', 'mageny', 'cinderion', 'cursed', 'anti_royal']) {
    assert.match(game, new RegExp(`${b}:\\s*'Exotic'`), `${b} is Exotic`);
}

// Unique (19)
for (const b of ['decayer', 'hyperorigin', 'overlord', 'beast', 'hope', 'screener', 'kage', 'malakor', 'paradox', 'sera_eclipse', 'xray', 'angel', 'demon', 'relay', 'robber', 'unstable', 'orbo', 'adlof', 'king']) {
    assert.match(game, new RegExp(`${b}:\\s*'Unique'`), `${b} is Unique`);
}

// Anomaly (4)
for (const b of ['crystila', 'darkener', 'awakenator', 'carmela_fudge']) {
    assert.match(game, new RegExp(`${b}:\\s*'Anomaly'`), `${b} is Anomaly`);
}

// 5. Rarity rank order & sort order
assert.match(game, /function getBrawlerRarityRank[\s\S]*?Starter:\s*1,\s*Rare:\s*2,\s*Epic:\s*3,\s*Mythic:\s*4,\s*Exotic:\s*5,\s*Unique:\s*6,\s*Anomaly:\s*7/, 'getBrawlerRarityRank uses updated tiers');
assert.match(game, /function getBrawlerSortOrder[\s\S]*?Starter:\s*0,\s*Rare:\s*1,\s*Epic:\s*2,\s*Mythic:\s*3,\s*Exotic:\s*4,\s*Unique:\s*5,\s*Anomaly:\s*6/, 'getBrawlerSortOrder uses updated tiers');

// 6. Soul summoner auto-spend excludes Starter and loops in correct tier order
assert.match(game, /allBrawlers\.filter\(\s*b\s*=>\s*getBrawlerRarity\(b\)\s*!==\s*'Starter'/, 'autoSpendSoulsOnTarget excludes Starter brawlers');
assert.match(game, /\['Starter',\s*'Rare',\s*'Epic',\s*'Mythic',\s*'Exotic',\s*'Unique',\s*'Anomaly'\]/, 'rarity order array includes all 7 tiers');

// 7. Fighter browser options & colors
assert.match(game, /<option value="Starter">Starter<\/option>[\s\S]*?<option value="Rare">Rare<\/option>[\s\S]*?<option value="Epic">Epic<\/option>[\s\S]*?<option value="Mythic">Mythic<\/option>[\s\S]*?<option value="Exotic">Exotic<\/option>[\s\S]*?<option value="Unique">Unique<\/option>[\s\S]*?<option value="Anomaly">Anomaly<\/option>/, 'Fighter browser dropdown has all 7 tiers in order');
assert.match(game, /'Unique':\s*'#ff9b42'/, 'Unique color mapped');
assert.match(game, /'Starter':\s*'#9fb4c7'/, 'Starter color mapped');

console.log('Rarity rework regression tests passed successfully!');
