import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const cards = fs.readFileSync(new URL('../slopsushi-cards.js', import.meta.url), 'utf8');

assert.match(cards, /C\('Mythic','Smart Money','Money-mode coins steer toward enemies with 45% homing strength\.',\{moneyCoinHoming:\.45,moneyCoinHomingRadius:620\}\)/,
  'Money & Tax has the new 45% Smart Money Tower card');
// Slop Sushi is deleted: the Smart Money homing is a constant 0, but the
// coin still carries the (now inert) slopHoming field.
assert.match(game, /const coinHoming=0;[\s\S]*?slopHoming: coinHoming/,
  'Smart Money homing is a constant 0 (Slop Sushi deleted) but the coin field remains');
assert.match(game, /if \(b\.slopHoming\) \{[\s\S]*?turn=Math\.min\(\.22,b\.slopHoming\*dt\*5\)/,
  'Money coins use the central Tower homing trajectory system');

console.log('Money & Tax Smart Money regression: 3/3 checks passed.');
