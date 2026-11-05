import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  [/brawlerId === 'kage'[\s\S]{0,200}8500\*hpScale/, 'Kage HP nerf'],
  [/PORTALO_TELEPORT_DISTANCE = ARENA_WALL_TILE \* 4\.5/, 'Portalo displacement nerf'],
  [/Math\.min\(3200, remaining \+ 800\)/, 'Ghoul Darkness cap'],
  [/Math\.random\(\) < \.4/, 'Cursed Mini Curse chance'],
  [/const recharge = 20 \* getAttackChargeMultiplier\(owner\)/, 'Orbo Super recharge'],
  [/RAMAGE_LIFESTEAL_CAP = 2400/, 'Ramage lifesteal cap'],
  [/CINDERION_BASE_ORBIT_MS = 13000/, 'Cinderion flame lifetime'],
  [/ANTI_ROYAL_MORTAR_ROUND_CAP = 6/, 'Anti-Royal opening bank'],
  [/b\.vx \*= 0\.76[\s\S]{0,150}b\.paradoxTimeEffect = 'slowed'/, 'Paradox enemy shot slow'],
  [/decayerSlowUntil = performance\.now\(\) \+ 1000/, 'Decayer G2 slow (Round 41)'],
  [/projectileSpeed=900\*\.6\*\(1\+momentum\*\.72\)/, 'Fastpass Momentum projectile speed'],
  [/isFreestyleDisco:true[\s\S]{0,300}damage:1924/, 'Freestyle Disco Ball buff'],
  [/const keyDamage=Math\.round\(1500\*\(Math\.abs\(lane\)<\.001\?1:\.94\)\)/, 'Freestyle outer-key adjustment'],
  [/const hp = hyper \? 7280 : 5600/, 'Trampaheal deployable HP buff'],
  [/const cost=Math\.min\(900,/, "Bouncin' Balls turret command cost"],
  [/fxKind:'signatureTurret'[\s\S]{0,40}|damage:270[\s\S]{0,500}fxKind:'signatureTurret'/, "Bouncin' Balls turret wave damage"],
  [/const damage=Math\.round\(1400\*damageMult\)/, 'Rocketeer direct-hit (Round 41)'],
  [/const miniDamage=400;/, 'Rocketeer mini rockets flat 400 (Round 41)'],
  [/livingTroopers >= 9/, 'Skeleflying summon cap'],
  [/while \(ownerZones\.length >= 5\)/, 'Malakor zone cap']
];

for (const [pattern, label] of checks) assert.match(game, pattern, label);

console.log(`balance V6 live regression: ${checks.length} checks passed`);
