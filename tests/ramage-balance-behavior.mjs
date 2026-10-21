import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const start=game.indexOf('const RAMAGE_BASE_DAMAGE =');
const end=game.indexOf('function ensureRamageState',start);
assert(start>=0&&end>start,'Ramage balance helpers exist');
const context=vm.createContext({});
vm.runInContext(`${game.slice(start,end)};globalThis.testApi={getRamagePunchDamage,getNextRamageMultiplier,getRamageLifestealAmount};`,context);
const api=context.testApi;

assert.equal(api.getRamagePunchDamage(1,1,false),320,'base punch is 320 at P11');
assert.equal(api.getRamagePunchDamage(1,.55,false),176,'Power scaling still affects the punch');
assert.equal(api.getRamagePunchDamage(1,1,true),1600,'Hyper begins at the 5x floor');
assert.equal(api.getRamagePunchDamage(10,1,false),3200,'punch scales with multiplier');
assert.equal(api.getRamagePunchDamage(99,1,true),3840,'multiplier is capped at 12x');
assert.equal(api.getNextRamageMultiplier(1),1.5,'a hit adds exactly 0.5x');
assert.equal(api.getNextRamageMultiplier(9.8),10.3,'ramp scales beyond 10x');
assert.equal(api.getNextRamageMultiplier(11.8),12,'ramp stops at the 12x cap');
assert.equal(api.getNextRamageMultiplier(12),12,'ramp holds at the 12x cap');
assert.equal(api.getRamageLifestealAmount({ramageLifestealHealed:0}),300);
assert.equal(api.getRamageLifestealAmount({ramageLifestealHealed:2850}),150);
assert.equal(api.getRamageLifestealAmount({ramageLifestealHealed:3000}),0);
console.log('Ramage balance behavior passed: scaling, ramp, Hyper floor, 12x-capped multiplier, and flat capped lifesteal.');
