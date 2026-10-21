import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const brickStart = source.indexOf('const BRICK_RANK_STAGES =');
const brickEnd = source.indexOf('const TRINKET_COST =', brickStart);
assert.ok(brickStart >= 0 && brickEnd > brickStart, 'Brick helper block exists');

const sandbox = {
  Math: Object.create(Math),
  getSelectedBrawlerLevel: () => 1,
  getSelectedProgress: () => ({ level: 1, bricks: 0, prestige: 0 }),
  isDamageFillerMode: false,
  isMirrorMode: false,
  isRankedMatch: false,
  isTowerTroubleMode: false,
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(brickStart, brickEnd)}\nthis.api={BRICK_RANK_STAGES,getLifetimeBricks,getBrickRankStage,getBrickOpponentLevel,getBrickMinimumPlayerPower,getNextBrickMinimumPlayerPower,canPlayBrickMatch};`, sandbox);
const api = sandbox.api;
const deltaMatch = source.match(/function applyBrickDelta\(progress, delta\)\s*\{([\s\S]*?)\n\s*\}/);
assert.ok(deltaMatch, 'Brick delta helper exists');
vm.runInContext(`function applyBrickDelta(progress,delta){${deltaMatch[1]}};this.applyBrickDelta=applyBrickDelta;`, sandbox);
api.applyBrickDelta = sandbox.applyBrickDelta;

const sequence = values => {
  let i = 0;
  sandbox.Math.random = () => values[i++ % values.length];
};
const p = (bricks, level, prestige = 0) => ({ bricks, level, prestige });

sequence([0, .999999]);
assert.equal(api.getBrickOpponentLevel(p(0, 1)), 1, 'P1 Brick I minimum bot is P1');
assert.equal(api.getBrickOpponentLevel(p(0, 1)), 3, 'P1 Brick I maximum bot is P3');
sequence([.999999]);
assert.equal(api.getBrickOpponentLevel(p(0, 10)), 11, 'P10 Brick I caps at P11');
assert.equal(api.getBrickOpponentLevel(p(0, 11)), 11, 'P11 Brick I always gets P11');
assert.equal(api.canPlayBrickMatch(p(320, 2)), false, 'TrickBrick III blocks P2');
assert.equal(api.canPlayBrickMatch(p(320, 3)), true, 'TrickBrick III allows P3');
assert.equal(api.canPlayBrickMatch(p(490, 4)), false, 'SupermeBrick II blocks P4');
assert.equal(api.canPlayBrickMatch(p(490, 5)), true, 'SupermeBrick II allows P5');
assert.equal(api.canPlayBrickMatch(p(791, 6)), false, 'InvincaBrick I blocks below P7');
assert.equal(api.canPlayBrickMatch(p(791, 7)), true, 'InvincaBrick I allows P7');
assert.equal(api.canPlayBrickMatch(p(950, 8)), false, 'InvincaBrick III blocks P8');
assert.equal(api.canPlayBrickMatch(p(950, 9)), true, 'InvincaBrick III allows P9');
assert.equal(api.canPlayBrickMatch(p(0, 10, 1)), false, 'Prestige blocks P10');
assert.equal(api.canPlayBrickMatch(p(0, 11, 1)), true, 'Prestige allows P11');

for (const bricks of [0, 59, 60, 120, 121, 399, 790, 791, 949, 950, 999]) {
  for (const level of [1, 3, 7, 10, 11]) {
    for (const roll of [0, .25, .5, .75, .999999]) {
      sequence([roll]);
      const botPower = api.getBrickOpponentLevel(p(bricks, level));
      assert.ok(botPower >= 1 && botPower <= 11, `Bot P${botPower} remains inside P1-P11`);
    }
  }
}
assert.equal(api.getBrickRankStage(p(0, 11, 1)).label, 'Prestige 1', '1000 lifetime Bricks is Prestige 1');
assert.equal(api.getBrickRankStage(p(0, 11, 3)).label, 'Prestige 3', 'Prestige continues through 3000');
assert.equal(api.getBrickRankStage(p(0, 11, 8)).label, 'Prestige 8', 'Prestige continues indefinitely');
const promoted = p(999, 11);
api.applyBrickDelta(promoted, 1);
assert.deepEqual({ bricks: promoted.bricks, prestige: promoted.prestige }, { bricks: 0, prestige: 1 }, 'Crossing 1000 preserves lifetime and promotes');

const slotMatch = source.match(/function getTrinketSlotCount\(level\)\s*\{([\s\S]*?)\n\s*\}/);
assert.ok(slotMatch, 'Trinket slot helper exists');
vm.runInContext(`function getTrinketSlotCount(level){${slotMatch[1]}};this.slots=getTrinketSlotCount;`, sandbox);
assert.deepEqual([5,6,7,8,9,10,11].map(sandbox.slots), [0,1,1,2,2,3,3], 'Slots unlock exactly at P6/P8/P10');

assert.match(source, /const TRINKET_COST = 350/, 'Trinkets cost 350 coins');
assert.match(source, /playerData\.coins\s*-=?\s*TRINKET_COST/, 'Buying subtracts the centralized Trinket cost');
assert.match(source, /ownedTrinkets:[\s\S]{0,180}equippedTrinkets:/, 'Trinket ownership and equipment persist in saves');
assert.match(source, /Math\.min\(2200,\s*player\.maxHp\s*\*\s*\.15\)/, 'Emergency Patch is 15% capped at 2200');
assert.match(source, /trinketEmergencyPatchCooldownUntil\s*=\s*now\s*\+\s*24000/, 'Emergency Patch cooldown is 24 seconds');
assert.match(source, /trinketUnshakableCooldownUntil\s*=\s*now\s*\+\s*10000/, 'Unshakable cooldown is 10 seconds');
assert.match(source, /\(2500\s*\/\s*8\)\s*\*\s*dt/, 'Bush Armor builds 2500 shield over 8 seconds');
assert.match(source, /function tickShieldDecay[\s\S]{0,220}shieldDecayTimer\s*=\s*0/, 'Normal shield decay is disabled');
assert.match(source, /ammo\s*=\s*Math\.min\(maxAmmo,\s*ammo\s*\+\s*1\)/, 'Hyper Reload restores exactly one ammo without exceeding max');
assert.match(source, /trinketHyperReloadUntil\s*=\s*performance\.now\(\)\s*\+\s*2000/, 'Hyper Reload buff lasts two seconds');

console.log('Brick + Trinket regression suite passed.');
