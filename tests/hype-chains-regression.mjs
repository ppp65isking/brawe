import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /const HYPE_CHAIN_WINDOW_MS = 7000/);
assert.match(game, /function registerHypeChainTakedown\(target\)/);
assert.match(game, /target\.isDummy \|\| target\._hypeChainCounted/);
assert.match(game, /hypeChainCount = now <= hypeChainUntil \? hypeChainCount \+ 1 : 1/);
assert.match(game, /DOUBLE BONK!/);
assert.match(game, /TRIPLE TROUBLE!/);
assert.match(game, /FORGE FRENZY!/);
assert.match(game, /UNSTOPPABLE x/);
assert.match(game, /function renderHypeChainHud\(\)/);
assert.match(game, /registerHypeChainTakedown\(target\)/);
assert.match(game, /hasHandledGameOver = false;\n      resetHypeChain\(\);/);
assert.match(game, /target\._legendaryTakedownFxPlayed = false; target\._hypeChainCounted = false/);

console.log('Hype Chains regression checks passed.');
