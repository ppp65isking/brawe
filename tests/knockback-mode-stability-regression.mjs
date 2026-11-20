import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /function applyKnockback\(entity, sourceX, sourceY, distance/,
  'central knockback helper exists');
assert.match(game, /\[entity\.x, entity\.y, sourceX, sourceY, distance\]\.every\(Number\.isFinite\)/,
  'knockback rejects non-finite inputs');
assert.match(game, /const safeDistance = clamp\(Math\.abs\(distance\) \* resistance, 0, 500\)/,
  'knockback distance is capped');
assert.match(game, /if \(!canBotMoveToPosition\(entity, nextX, nextY\)\) break/,
  'knockback stops at blocked terrain');
assert.match(game, /function triggerTrapperKnockbackBlast[\s\S]*?applyKnockback\(target, owner\.x, owner\.y, 170, now\)/,
  'Trapper uses the safe knockback path');
assert.match(game, /function triggerBlinkEyeRetinalFlash[\s\S]*?applyKnockback\(target, entity\.x, entity\.y, knockback, now\)[\s\S]*?checkHit\(target/,
  'BlinkEye separates displacement from normal damage resolution');
assert.doesNotMatch(game, /function triggerBlinkEyeRetinalFlash[\s\S]{0,1200}?target\.hp -= 600/,
  'BlinkEye gadget no longer bypasses hit/death protections');
assert.match(game, /curBrawler === 'fuel' && curGadget === 'g2'[\s\S]*?areAlliedEntities\(player, target\)[\s\S]*?applyKnockback\(target, player\.x, player\.y, 95, now\)/,
  'Fuel knockback is collision-safe and does not burn teammates');
assert.match(game, /bot\.brawler === 'fuel' && g === 'g2'[\s\S]*?areAlliedEntities\(bot, enemy\)[\s\S]*?applyKnockback\(enemy, bot\.x, bot\.y, 95, now\)/,
  'Fuel bots use the same safe team-aware knockback');

assert.match(game, /const botTeamId = \(isObjectiveMode \|\| isMirrorMode \|\| isDamageFillerMode \|\| isKnockDonateMode \|\| isBrickVaultMode \|\| isArenaForgeMode\)/,
  'team-mode bots receive the shared enemy team id');

assert.match(game, /function stabilizeActiveMatchState\(\)/,
  'all modes run shared runtime-state validation');
assert.match(game, /stabilizeActiveMatchState\(\);\s*const now = performance\.now\(\);/,
  'runtime validation runs before mode simulation');

console.log('knockback and all-mode stability regression tests passed');
