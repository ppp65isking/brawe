import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameCode = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

test('Orbo base stats have +25% main attack damage (575)', () => {
  assert.match(gameCode, /brawlerId === 'orbo'[\s\S]*?dmg:Math\.round\(575\*scale\)/);
});

test('Orbo main attack fires with 575 damage and +30% hitbox size (1.56 / 2.34)', () => {
  assert.match(gameCode, /damage:isBot\?412:575/);
  assert.match(gameCode, /hitboxMod:dense\?2\.34:1\.56/);
});

test('Orbo Super features animated charging windup state and update loop', () => {
  assert.match(gameCode, /owner\.orboSuperWindup\s*=\s*\{/);
  assert.match(gameCode, /function updateOrboStates\(/);
  assert.match(gameCode, /updateOrboStates\(dt\)/);
});

test('Orbo Cosmic Candy Cannon uses its tuned normal and Hyper widths', () => {
  assert.match(gameCode, /hitboxMod:\s*hyper\s*\?\s*11\.8\s*:\s*12\.6/);
  assert.match(gameCode, /orboCandyRay:\s*true/);
});

test('Orbo Hypercharge Super has wider separated cone spread ([-0.38, 0, 0.38])', () => {
  assert.match(gameCode, /angles\s*=\s*hyper\s*\?\s*\[-0\.38,\s*0,\s*0\.38\]\s*:\s*\[0\]/);
  assert.match(gameCode, /const superAngles=isHypercharged\?\[-0\.38,0,0\.38\]:\[0\]/);
});

test('Orbo Super rendering draws a long narrow cosmic candy bolt', () => {
  assert.match(gameCode, /const lengthRadius\s*=\s*hyper\s*\?\s*126\s*:\s*142/);
  assert.match(gameCode, /const widthRadius\s*=\s*hyper\s*\?\s*34\s*:\s*38/);
  assert.match(gameCode, /ctx\.ellipse\(0,\s*0,\s*lengthRadius,\s*widthRadius,\s*0,\s*0,\s*Math\.PI\s*\*\s*2\)/);
});

test('Cosmic Candy Cannon is a fast, map-wide, wall-piercing power shot', () => {
  assert.match(gameCode, /const speed = 1480/);
  assert.match(gameCode, /damage:\s*owner\.id === player\.id \? \(hyper \? 2600 : 3700\)/);
  // Power Play modifier is deleted: Orbo's Super always pierces walls now.
  assert.match(gameCode, /isOrboSuper: true,[\s\S]{0,900}pierce: true,\s*pierceWalls: true,/);
  assert.match(gameCode, /super:'Cosmic Candy Cannon'/);
});

test('Orbo Super windup draws cosmic orbital collapsing rings and glowing core', () => {
  assert.match(gameCode, /entity\.orboSuperWindup/);
  assert.match(gameCode, /ctx\.ellipse\(entity\.x,\s*entity\.y,\s*currentR,\s*currentR\s*\*\s*0\.55,\s*spinAngle,\s*0,\s*Math\.PI\s*\*\s*2\)/);
});

test('Every Orbo Super enemy hit restores 20% Super and a quarter-rate Hyper amount', () => {
  assert.match(gameCode, /const recharge = 20 \* getAttackChargeMultiplier\(owner\)/);
  assert.match(gameCode, /const hyperRecharge = recharge \* \.25/);
  assert.match(gameCode, /superCharge = clamp\(superCharge \+ recharge, 0, 100\)/);
  assert.match(gameCode, /owner\.superCharge = clamp\(\(owner\.superCharge \|\| 0\) \+ recharge, 0, 100\)/);
  assert.match(gameCode, /hyperChargeCharge = clamp\(hyperChargeCharge \+ hyperRecharge, 0, 100\)/);
  assert.match(gameCode, /owner\.hyperChargeCharge = clamp\(\(owner\.hyperChargeCharge \|\| 0\) \+ hyperRecharge, 0, 100\)/);
  assert.doesNotMatch(gameCode, /orboSuperRechargeGranted/);
});
