import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// 1. Constants (exact values, additive only)
assert.match(game, /const RANKED_WEEKLY_PASS_XP_CAP = 2000;/, 'weekly cap must be 2000');
assert.match(game, /const RANKED_WEEKLY_OVERFLOW_COINS_PER_XP = 1 \/ 5;/, 'overflow must be 1 coin per 5 XP');
assert.match(game, /const RANKED_WEEKLY_MAX_BONUS_COINS = 300;/, 'weekly max bonus must be 300 coins');

// 2. Weekly fields + rollover inside ensureRankedSeasonState (no renamed keys).
// NOTE: the weekly key helper is getRankedWeekKey (outer scope, same ISO-week math as
// getLocalWeekKey, which is nested inside quest scope and not visible at the ranked site).
{
  const at = game.indexOf('function ensureRankedSeasonState()');
  assert.ok(at >= 0, 'ensureRankedSeasonState must exist');
  const body = game.slice(at, at + 3000);
  assert.match(body, /weekKey/, 'weekly weekKey field must be initialized');
  assert.match(body, /weeklyPassXp/, 'weeklyPassXp field must be initialized');
  assert.match(body, /weeklyMaxed/, 'weeklyMaxed flag must be initialized');
  assert.match(body, /weeklyMaxClaimed/, 'weeklyMaxClaimed flag must be initialized');
  assert.match(body, /weekKey !== getRankedWeekKey\(\)/, 'week rollover must reset weekly fields on week change');
}

// 3. Settlement split: capped gain, overflow to coins, once-per-week bonus via grantPinPack (NOT rp_* ids)
assert.match(game, /const weeklyRoom = Math\.max\(0, RANKED_WEEKLY_PASS_XP_CAP - \(playerData\.ranked\.weeklyPassXp \|\| 0\)\);/, 'settlement must compute weekly room');
assert.match(game, /rankedPassXpGained = Math\.min\(grossPassXpGained, weeklyRoom\);/, 'settlement must cap the gain');
assert.match(game, /weeklyOverflowCoins = Math\.floor\(weeklyOverflowXp \* RANKED_WEEKLY_OVERFLOW_COINS_PER_XP\);/, 'overflow must convert to coins');
assert.match(game, /if \(typeof grantPinPack === 'function'\) grantPinPack\(3\);/, 'weekly max bonus must grant via grantPinPack, never via rp_* ids');
assert.ok(!game.includes('rp_weekly_max'), 'no rp_weekly_max id may exist anywhere');
assert.ok(!game.includes('rp_bronze') && !game.includes('rp_legend'), 'no rp_* pack ids may exist anywhere');

// 4. Results + queue surfaces
assert.match(game, /Weekly cap reached/, 'results screen must explain overflow coins');
assert.match(game, /WEEKLY MAXED/, 'results screen and queue meta must show the maxed flag');
assert.match(game, /Weekly Pass XP:/, 'queue meta must show weekly progress');

// 5. Pure mirror of the cap math (the algorithm, extracted verbatim in miniature)
{
  const cap = (gross, already) => {
    const room = Math.max(0, 2000 - already);
    const gained = Math.min(gross, room);
    return { gained, overflowCoins: Math.floor((gross - gained) * (1 / 5)) };
  };
  assert.deepEqual(cap(300, 1900), { gained: 100, overflowCoins: 40 });
  assert.deepEqual(cap(150, 2000), { gained: 0, overflowCoins: 30 });
  assert.deepEqual(cap(200, 0), { gained: 200, overflowCoins: 0 });
  // Once-per-week guard mirror: bonus fires only when claimed flag is false
  let claimed = false; const fire = (weekly) => weekly >= 2000 && !claimed && (claimed = true);
  assert.equal(fire(2000), true); assert.equal(fire(2000), false);
}

// 6. Prestige steps, floor rung order, MVP rule, pinpack fail-closed order
{
  const prestigeAt = game.indexOf('function getRankedPrestige(');
  assert.ok(prestigeAt >= 0, 'getRankedPrestige must exist');
  const prestigeBody = game.slice(prestigeAt, prestigeAt + 600);
  assert.match(prestigeBody, /if \(points < 2400\) return 0;/, 'prestige must be 0 below 2400');
  assert.match(prestigeBody, /RANKED_PRESTIGE_MAX/, 'prestige must cap at RANKED_PRESTIGE_MAX');
  const floorAt = game.indexOf('function getRankedDivisionFloor(');
  const floorBody = game.slice(floorAt, floorAt + 400);
  assert.ok(floorBody.indexOf('points >= 2400') < floorBody.indexOf('points >= 2200'), '2400 rung must precede 2200 rung');
  assert.match(game, /isRankedMVP = \(won && fullOnDamageEarned >= 3000\) \|\| \(!won && fullOnDamageEarned >= 6000\);/, 'MVP rule must be win-3000 / loss-6000');
  const claimAt = game.indexOf('function claimRankedPassTier(');
  const claimBody = game.slice(claimAt, claimAt + 1200);
  const guardIdx = claimBody.indexOf("reward.type === 'pinpack' && typeof grantPinPack");
  const pushIdx = claimBody.indexOf('passClaimed.push');
  assert.ok(guardIdx >= 0 && pushIdx >= 0 && guardIdx < pushIdx, 'pinpack fail-closed guard must precede passClaimed.push');
}

console.log('PASS: ranked weekly max-out');
