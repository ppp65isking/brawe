import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  ['Money spread is 20% wider', /MONEY_TAX_BASE_SPREAD = 0\.105/],
  ['Money coins use the unified hitbox (7.392/6)', /MONEY_TAX_MONEY_SIZE_MULT = 1\.232/],
  ['empowered center coin uses the unified hitbox (15.68/(6*1.65))', /MONEY_TAX_FULL_CENTER_SIZE_MULT = 1\.5838/],
  ['Tax spread is 20% tighter', /MONEY_TAX_TAX_SPREAD = 0\.056/],
  ['Tax damage bonus is 45%', /MONEY_TAX_TAX_DAMAGE_MULT = 1\.45/],
  ['Tax projectile size is 15% larger', /MONEY_TAX_TAX_SIZE_MULT = 2\.30/],
  ['empowered center hitbox follows the empowered flag on every skin', /1\.65 \* MONEY_TAX_FULL_CENTER_SIZE_MULT \* \(1 \+ centerSize\)/],
  ['normal Money shots use their size modifier', /: MONEY_TAX_MONEY_SIZE_MULT/],
  ['larger Money coins are visible', /b\.moneyEmpoweredCenter \? 14 : 6\.6/],
];

for (const [label, pattern] of checks) assert.match(game, pattern, label);
console.log(`Money & Tax balance regression: ${checks.length}/${checks.length} checks passed.`);
