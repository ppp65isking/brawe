import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

for (const type of ['standard', 'fortified', 'charged', 'vitality', 'nova']) {
  assert.match(source, new RegExp(`${type}:\\s*\\{`), `Power Box type ${type} should exist`);
}

assert.match(source, /function rollPowerBoxType\(\)/, 'weighted Power Box rolls should be centralized');
assert.match(source, /function createPowerBox\(/, 'Power Box creation should be centralized');
assert.match(source, /box\._powerBoxRewarded/, 'destroy rewards should have duplicate protection');
assert.match(source, /kind: 'charged_core'/, 'Charged boxes should drop Charged Cores');
assert.match(source, /kind: 'vitality_core'/, 'Vitality boxes should drop Vitality Cores');
assert.match(source, /bestWall\.isPowerBox[\s\S]{0,140}Math\.round\(dealtDamage\)/, 'direct attacks should use 100% resolved damage against boxes');
assert.match(source, /powerBoxDamage:\s*Math\.max\(1, Math\.round\(damage\)\)/, 'non-projectile attacks should preserve full damage against boxes');
assert.doesNotMatch(source, /const boxDamage = Math\.max\(220, Math\.round\(dealtDamage \* \(b\.super \? 0\.95 : 0\.75\)\)\)/, 'legacy direct-hit box penalty must be gone');

const typeTable = source.slice(source.indexOf('const POWER_BOX_TYPES'), source.indexOf('function rollPowerBoxType'));
const weights = [...typeTable.matchAll(/\bweight:\s*(\d+)/g)].map(match => Number(match[1]));
assert.equal(weights.length, 5, 'all five Power Box types should participate in weighted rolls');
assert.equal(weights.reduce((sum, value) => sum + value, 0), 100, 'Power Box weights should total 100%');

// Thanksgiving Phase 3 HP correction: clean-hits x 1,200 reference at P11.
const hpByType = Object.fromEntries([...typeTable.matchAll(/(\w+):\s*\{\s*hp:\s*(\d+)/g)].map(match => [match[1], Number(match[2])]));
assert.deepEqual(hpByType, { standard: 3600, fortified: 7200, charged: 4800, vitality: 5400, nova: 8400 }, 'Power Box HP must be the Phase 3 retune (3600/7200/4800/5400/8400)');
assert.match(source, /spawnedAt: performance\.now\(\)/, 'created boxes should stamp spawnedAt for the spawn pop');
assert.match(source, /powerBoxShards\.push\(/, 'box breaks should spawn shard particles');

console.log('Power Box 2.0 regression checks passed.');
