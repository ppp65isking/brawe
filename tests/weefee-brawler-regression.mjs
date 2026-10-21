import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const mythicRoster = fs.readFileSync(new URL('../modules/brawlers/mythic/roster.js', import.meta.url), 'utf8');

// 1. Roster and Module Registration
assert.ok(mythicRoster.includes("'weefee'"), 'Wee-Fee is registered in modules/brawlers/mythic/roster.js');
assert.ok(game.includes("'weefee'"), 'Wee-Fee is registered in allBrawlers in game.js');
assert.match(game, /weefee:\s*'Rare'/, 'Wee-Fee is assigned Rare rarity');
assert.match(game, /weefee:\s*'Controller'/, 'Wee-Fee is categorized as Controller');

// 2. Base Stats and Scaling
assert.match(
  game,
  /if\s*\(brawlerId === 'weefee'\)\s*\{[\s\S]{0,80}return\s*\{\s*hp:\s*Math\.round\(6800\s*\*\s*scale\),\s*dmg:\s*Math\.round\(1200\s*\*\s*scale\),\s*speed:\s*270\s*\};/,
  'Wee-Fee has 6800 base HP, 1200 impact damage, and 270 speed'
);

// 3. Main Attack: Throwable Signal Pole
assert.match(
  game,
  /isWeeFeeToss:\s*true/,
  'Wee-Fee main attack fires lobbed throwable Signal Pole projectile'
);

assert.match(
  game,
  /if\s*\(b\.isWeeFeeToss\s*&&\s*b\.life\s*>=\s*b\.maxLife\)\s*\{[\s\S]{0,300}spawnWeeFeePole\(b\.ownerId,\s*landX,\s*landY/,
  'Signal Pole toss projectile lands at destination and deploys pole on ground'
);

assert.match(
  game,
  /function spawnWeeFeePole\(owner,\s*x,\s*y/,
  'spawnWeeFeePole helper creates deployable Signal Poles'
);

// 4. Pole Management & SP2 E-Waste Demolition
assert.match(
  game,
  /while\s*\(currentPoles\.length\s*>=\s*maxPoles\)\s*\{[\s\S]{0,220}if\s*\(hasSp2\)\s*\{[\s\S]{0,120}AOEDamage\(oldest\.x,\s*oldest\.y,\s*90,\s*1400/,
  'Wee-Fee replaces oldest pole when reaching cap, and SP2 triggers 1400 AOE Demolition explosion'
);

// 5. Expanding Wi-Fi Shockwaves, Ground Logos & Triangle Pulse Scaling
assert.match(
  game,
  /function spawnWeeFeeShockwave\(x,\s*y,\s*ownerId[\s\S]*?sizeMultiplier\s*=\s*1.0\)/,
  'spawnWeeFeeShockwave supports sizeMultiplier'
);

assert.match(
  game,
  /triangleScale\s*=\s*1.0\s*\+\s*factor\s*\*\s*2.0/,
  'Triangle center pulse scales up to +200% (3.0x size) based on triangle area'
);

assert.match(
  game,
  /ctx\.arc\(0,\s*dotY,\s*16,\s*-Math\.PI\s*\*\s*0\.82,\s*-Math\.PI\s*\*\s*0\.18\)/,
  'Renders animated illuminated Wi-Fi signal arcs that light up sequentially'
);

assert.match(
  game,
  /target\.weefeeInterferenceUntil[\s\S]{0,120}spawnFloatingText\(target\.x,\s*target\.y\s*-\s*32,\s*'📶 LAG -20% DMG'/,
  'SP1 applies 20% damage reduction on Wi-Fi shockwave hits'
);

// 6. Super & Hypercharge
assert.match(
  game,
  /function castWeeFeeSuper\(owner,\s*hyper/,
  'castWeeFeeSuper activates 5G Mobile Data coverage'
);

assert.match(
  game,
  /🛰️ SATELLITE STRIKE!/,
  'Hypercharge Sat Uh Light calls down orbital satellite strikes on active poles'
);

// 7. Gadgets G1 & G2
assert.match(
  game,
  /function triggerWeeFeeOverclockGadget\(owner\)/,
  'G1 Overclock Router discharges rapid high-power pulse bursts'
);

assert.match(
  game,
  /function triggerWeeFeeRebootGadget\(owner\)/,
  'G2 Router Reboot destroys poles to heal Wee-Fee and restore ammo'
);

console.log('Wee-Fee brawler regression tests passed successfully.');
