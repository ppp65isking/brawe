import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  ["roster registration", /'cursed', 'king'/],
  ["Unique rarity", /king:\s*'Unique'/],
  ["Power 11 stats", /Math\.round\(7600 \* hpScale\).*Math\.round\(1650 \* scale\)/s],
  ["three ammo by default", /function getNativeAmmoCapacity[\s\S]*return 3;/],
  ["six-hit Super charge", /cursed:7, king:6/],
  ["smooth one-tile recoil", /kingRecoilRemaining=48/],
  ["terrain-safe recoil", /canBotMoveToPosition\(entity,nx,ny\)/],
  ["two-Princess cap", /KING_PRINCESS_MAX = 2/],
  ["Princess 250 base damage", /KING_PRINCESS_DAMAGE = 250/],
  ["Princess 0.5 second cadence", /KING_PRINCESS_FIRE_MS = 500/],
  ["Princess HP reduced to 3500", /KING_PRINCESS_HP = 3500/],
  ["Hyper Princess gains 10 damage per hit", /KING_HYPER_PRINCESS_DAMAGE_PER_HIT = 10/],
  ["Hyper Princess damage ramp caps at 550", /KING_HYPER_PRINCESS_DAMAGE_CAP = 550/],
  ["Hyper twin summon", /spawnKingPrincess\(owner,cx[\s\S]*hyperTwin:true,twinCastId[\s\S]*spawnKingPrincess\(owner,cx/s],
  ["Hyper Princess tracks its own hit ramp", /sourcePrincess\.kingHitDamageBonus=Math\.min\(KING_HYPER_PRINCESS_DAMAGE_CAP/],
  ["Royal Rage three seconds", /performance\.now\(\)\+3000/],
  ["Siege Order wall breaking", /pierceWalls:siege,breakWallsInstantly:siege/],
  ["Burning Tribute cadence", /kingBurnReadyAt=now\+5000/],
  ["Piercing Decree cadence", /kingPiercingReadyAt=now\+5000/],
  ["Hyper cannon knockback", /b\.isKingCannon && b\.hyperVisual[\s\S]*kingPushUntil=hitNow\+360/],
  ["player Super routing", /combatBrawler === 'king'\) \{ castKingSuper\(player/],
  ["bot Super routing", /botCombatBrawler === 'king'\) \{ castKingSuper\(bot/],
  ["custom aim and projectile visuals", /selectedBrawler === 'king'[\s\S]*ownerBrawler === 'king'/s],
];

for (const [label, pattern] of checks) assert.match(game, pattern, label);
console.log(`King regression: ${checks.length}/${checks.length} checks passed.`);
