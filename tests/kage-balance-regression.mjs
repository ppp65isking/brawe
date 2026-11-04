import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(source, /brawlerId === 'kage'[\s\S]{0,180}hp:Math\.round\(9200\*scale\)[\s\S]{0,100}speed:320/);
assert.match(source, /blade_vane:5, kage:12,/);
assert.match(source, /const minDmg = Math\.round\(150 \* scale\)/);
assert.match(source, /const maxDmg = Math\.round\(400 \* scale\)/);
assert.match(source, /ang - 0\.14,[\s\S]{0,180}ang - 0\.084/);
assert.match(source, /kageCrossShardDamage: Math\.round\(\(hyper \? 250 : 300\) \* scale\)/);
assert.match(source, /const count = hyper \? 3 : 2;/);
assert.match(source, /damage: Math\.round\(1350 \* scale\)/);
assert.match(source, /shardDamage: Math\.round\(340 \* scale\)/);
assert.match(source, /owner\.speedBoostMult = 1\.18;/);
assert.match(source, /const dmg = Math\.round\(p11Stats\.dmg \* 0\.18\);/);
assert.match(source, /for \(const offset of \[-0\.045, 0\.045\]\)/);
assert.match(source, /const coneSpread = 0\.308;/);
assert.match(source, /const count = isHypercharged \? 3 : 2;/);

console.log('Kage balance regression checks passed.');
