import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Ranked Rotation: knock_donate, arena_forge, and brick_vault
  ['RANKED_TEAM_MODE_POOL includes knock_donate, arena_forge, and brick_vault', /RANKED_TEAM_MODE_POOL\s*=\s*\[[^\]]*'knock_donate'[^\]]*'arena_forge'[^\]]*'brick_vault'[^\]]*\]/.test(game)],
  ['Showdown mode labels include Brawe Ball 3v3 and Knockout 3v3', /if\s*\(mode === 'brawe_ball'\)\s*return 'Brawe Ball 3v3';[\s\S]*?if\s*\(mode === 'knockout_3v3'\)\s*return 'Knockout 3v3';/],
  ['HOME_MODE_CARDS includes brawe_ball and knockout_3v3', /\['brawe_ball',\s*'⚽',\s*'Brawe Ball 3v3'[\s\S]*?\['knockout_3v3',\s*'🥊',\s*'Knockout 3v3'/],
  ['HOME_PERMANENT_MODE_IDS includes brawe_ball and knockout_3v3', /HOME_PERMANENT_MODE_IDS\s*=\s*\[[\s\S]*?'brawe_ball'[\s\S]*?'knockout_3v3'/],
  ['HOME_EVENT_REWARDS includes brawe_ball and knockout_3v3', /brawe_ball:\s*\{\s*type:\s*'coins',\s*amount:\s*80[\s\S]*?knockout_3v3:\s*\{\s*type:\s*'coins',\s*amount:\s*80/],
  ['HOME_MODE_RULES includes brawe_ball and knockout_3v3', /brawe_ball:\s*\[[\s\S]*?3v3 Soccer clash[\s\S]*?knockout_3v3:\s*\[[\s\S]*?Best of 3 Rounds/],

  // 2. Ranked Modifiers: Bug Fixes & Always Hyper
  ['always_hyper modifier registered in RANKED_MODIFIERS', /'always_hyper':\s*\{\s*id:\s*'always_hyper',\s*name:\s*'Always Hyper'/],
  ['always_hyper continuously hypercharges player and bots in update loop', /activeRankedModifier === 'always_hyper'[\s\S]*?isHypercharged = true;[\s\S]*?b\.isHypercharged = true;/],
  ['always_hyper initializes hypercharge on match start', /activeRankedModifier === 'always_hyper'[\s\S]*?isHypercharged = true;[\s\S]*?hyperChargeCharge = 100;/],
  ['always_hyper persists hypercharge across respawns', /activeRankedModifier === 'always_hyper'[\s\S]*?entity\.isHypercharged = true;/],
  ['always_hyper exempted from player and bot hypercharge expiration', /!\(isRankedMatch && activeRankedModifier === 'always_hyper'\)/],
  ['timed_detonation crash fixed: uses bushZones and bushes without grassZones', !game.includes('grassZones') && game.includes("activeRankedModifier !== 'timed_detonation'") && game.includes('bushZones.splice(i, 1);')],
  ['hyper_overdrive passive charge fixed to call updateHyperButton', /hyperChargeCharge = Math\.min\(100,\s*hyperChargeCharge \+ 4\.0 \* dt\);[\s\S]*?if \(typeof updateHyperButton === 'function'\) updateHyperButton\(\);/],
  ['super_surge passive super charge calls updateSuperButton', /superCharge = Math\.min\(100,\s*superCharge \+ 5\.0 \* dt\);[\s\S]*?if \(typeof updateSuperButton === 'function'\) updateSuperButton\(\);/],
  ['colossus_friend persists max HP across respawns with 4,000 HP bonus shield', /activeRankedModifier === 'colossus_friend' && activeColossusMaxHp[\s\S]*?grantShield\(entity,\s*4000,\s*4000\);/],
  ['quickfire only refunds ammo on main attacks, not supers', /activeRankedModifier === 'quickfire' && !source\?\.super && !source\?\.isSuper/],
  ['Ranked modifier HUD badge helper implemented', /function renderRankedModifierHUD\(ctx\)/],
  ['friendly_fire modifier registered in RANKED_MODIFIERS', /'friendly_fire':\s*\{\s*id:\s*'friendly_fire',\s*name:\s*'Friendly Fire'/],
  ['isFriendlyFireActive helper function implemented', /function isFriendlyFireActive\(\)\s*\{\s*return (?:isRankedMatch && activeRankedModifier === 'friendly_fire'|\(isRankedMatch && activeRankedModifier === 'friendly_fire'\) \|\| [^;]+);\s*\}/],
  ['friendly_fire permits bullet hit detection against allied player and bots', /if \(!isFriendlyFireActive\(\)\) continue; \/\/ skip friendly fire/],
  ['friendly_fire permits AOEDamage against allied entities', /areAlliedEntities\(owner, bot\) && !bot\.isChairSpinning && !isFriendlyFireActive\(\)[\s\S]*?!\(owner && areAlliedEntities\(owner, player\)\) \|\| isFriendlyFireActive\(\)/],
  ['friendly_fire prevents super charge gain on hitting teammates', /!\(areAlliedEntities\(owner, target\) && isFriendlyFireActive\(\)\)\) grantMainAttackCharge/],
  ['friendly_fire displays floating warning feedback on hit', /spawnFloatingText\(target\.x, target\.y - 32, '⚠️ FRIENDLY FIRE!', '#ff4757'\);/],


  // 3. Ranked Ban & Draft Overhaul
  ['Player team slot is randomized (player is not always leader)', /const playerSlot = Math\.floor\(Math\.random\(\) \* 3\);[\s\S]*?const isPlayerLeader = \(playerSlot === 0\);/],
  ['Ban schedule gives leaders 2 bans and members 1 ban (8 bans total)', /banSchedule = \[[\s\S]*?slot: 0, banIdx: 0[\s\S]*?slot: 0, banIdx: 1[\s\S]*?slot: 1, banIdx: 0[\s\S]*?slot: 2, banIdx: 0/],
  ['Draft pick line supports snake pick order with player position tracking', /pickLine = blueHasFirstPick \?[\s\S]*?pickNum: 1[\s\S]*?pickNum: 6/],
  ['Available brawler choices reduce dynamically as earlier draft picks claim brawlers', /getAvailablePool = \(pickingTeam = 'blue'\) => \{[\s\S]*?const banned = new Set\(getAllBanned\(\)\);[\s\S]*?const picked = new Set\(getAllPicked\(\)\);[\s\S]*?enemyProtected/],
  ['Ranked match launch preserves teammate picks, enemy picks, and multi-bans', /rankedTeammatePicks = bluePicks\.filter[\s\S]*?rankedEnemyPicks = redPicks\.slice[\s\S]*?rankedBans = \{/],

  // 4. Brawe Ball 3v3 Implementation
  ['isBraweBallMode runtime flag and state initialized', /let isBraweBallMode\s*=\s*false;\s*let braweBallState\s*=\s*null;/],
  ['initBraweBallState creates ball physics and score tracker', /function initBraweBallState\(\)[\s\S]*?ball:\s*\{[\s\S]*?carrier:\s*null,[\s\S]*?scores:\s*\{\s*player:\s*0,\s*enemy:\s*0\s*\}/],
  ['attack handler intercepts normal kick when holding ball', /if \(isBraweBallMode && braweBallState && braweBallState\.ball && braweBallState\.ball\.carrier === fromEntity\.id\) \{[\s\S]*?kickBraweBall\(fromEntity,\s*targetX,\s*targetY,\s*false\);/],
  ['fireSuper intercepts Super Power Shot when player holds ball', /if \(isBraweBallMode && braweBallState && braweBallState\.ball && braweBallState\.ball\.carrier === player\.id\) \{[\s\S]*?kickBraweBall\(player,\s*wm\.x,\s*wm\.y,\s*true\);/],
  ['fireSuperBot intercepts Super Power Shot when bot holds ball', /if \(isBraweBallMode && braweBallState && braweBallState\.ball && braweBallState\.ball\.carrier === bot\.id\) \{[\s\S]*?kickBraweBall\(bot,\s*targetX,\s*targetY,\s*true\);/],
  ['updateBraweBall processes physics, bounce, carrier, and goal detection', /function updateBraweBall\(dt\)[\s\S]*?b\.x \+= b\.vx \* dt;[\s\S]*?b\.y \+= b\.vy \* dt;/],
  ['Brawe Ball overtime triggers sudden death and clears obstacles', /s\.isOvertime = true;[\s\S]*?destructibleWalls\.length = 0;[\s\S]*?OVERTIME! NEXT GOAL WINS!/],
  ['Brawe Ball bot AI advances, dribbles, and shoots at goal', /if \(b\.carrier === bot\.id\) \{[\s\S]*?distToGoal <= 560[\s\S]*?kickBraweBall\(bot,/],
  ['renderBraweBallWorld draws pitch, goals, nets, and soccer ball', /function renderBraweBallWorld\(ctx\)[\s\S]*?Goal Lines[\s\S]*?Soccer Pattern/],
  ['renderBraweBallHUD displays scores, timer, and overtime status', /function renderBraweBallHUD\(ctx\)[\s\S]*?s\.scores\.player[\s\S]*?s\.scores\.enemy/],

  // 5. Knockout 3v3 Implementation
  ['isKnockoutMode runtime flag and state initialized', /let isKnockoutMode\s*=\s*false;\s*let knockoutState\s*=\s*null;/],
  ['initKnockoutState sets best-of-3 rounds tracking', /function initKnockoutState\(\)[\s\S]*?currentRound:\s*1,[\s\S]*?maxRounds:\s*3,[\s\S]*?roundWins:\s*\{\s*player:\s*0,\s*enemy:\s*0\s*\}/],
  ['Knockout suppresses respawns during active rounds', /player\.respawnTimer = 0;[\s\S]*?for \(const bot of bots\) bot\.respawnTimer = 0;/],
  ['updateKnockout shrinks poison gas after delay', /function updateKnockout\(dt\)[\s\S]*?s\.roundTimer <= 35[\s\S]*?s\.stormActive = true;[\s\S]*?s\.stormRadius/],
  ['checkKnockoutRoundEnd awards round win and triggers intermission or victory', /s\.roundWins\[roundWinTeam\]\+\+;[\s\S]*?intermissionUntil/],
  ['Knockout intermission revives fighters with full HP for next round', /restoreRespawningEntity\(player,[\s\S]*?restoreRespawningEntity\(bot,/],
  ['renderKnockoutWorld renders toxic storm circle and danger zone', /function renderKnockoutWorld\(ctx\)[\s\S]*?s\.stormActive[\s\S]*?s\.stormRadius/],
  ['renderKnockoutHUD displays best-of-3 round dots and surviving fighters', /function renderKnockoutHUD\(ctx\)[\s\S]*?ROUND[\s\S]*?Alive vs/],

  // 6. Match Results Screen Handlers
  ['showdownResults handles Brawe Ball and Knockout custom outcomes', /if \(isBraweBallMode\) \{[\s\S]*?BRAWE BALL VICTORY![\s\S]*?\} else if \(isKnockoutMode\) \{[\s\S]*?KNOCKOUT MATCH VICTORY!/],

  // 7. Master update: queue pool twins + ranked-pass pin packs
  ['super_rate_plus excluded from the ranked queue pool but still defined', /k !== 'super_rate_plus'/.test(game) && /'super_rate_plus':\s*\{/.test(game)],
  ['ranked-pass pinpack claim branch grants via grantPinPack', /reward\.type === 'pinpack'/.test(game) && /grantPinPack\(reward\.amount \|\| 3\);/.test(game)],
  ['ranked-pass pinpack claim fails closed when grantPinPack is missing', /reward\.type === 'pinpack' && typeof grantPinPack !== 'function'/.test(game)],
  ['no rp_* pin ids exist anywhere', !game.includes('rp_weekly_max') && !game.includes('rp_bronze') && !game.includes('rp_legend')]
];

let failed = 0;
for (const [desc, result] of checks) {
  if (typeof result === 'boolean') {
    if (result) {
      console.log('PASS: ' + desc);
    } else {
      console.error('FAIL: ' + desc);
      failed++;
    }
  } else if (result instanceof RegExp) {
    if (result.test(game)) {
      console.log('PASS: ' + desc);
    } else {
      console.error('FAIL: ' + desc);
      failed++;
    }
  }
}

console.log('\n================================');
console.log('Results: ' + (checks.length - failed) + '/' + checks.length + ' passed.');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Ranked modes & modifiers regression checks passed successfully!');
}
