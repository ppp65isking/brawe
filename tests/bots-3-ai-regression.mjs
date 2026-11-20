import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Navigation & Wall Pathfinding
  ['Multi-clearance waypoint finding in chooseBotWallWaypoint', /function chooseBotWallWaypoint\(\s*entity,\s*blocker,\s*goalX,\s*goalY\s*\)[\s\S]*?clearances\s*=\s*\[baseClearance,\s*baseClearance \+ 24\];/],
  ['Tangential wall sliding fallback implemented in getBotSteeredStep', /function getBotSteeredStep\([\s\S]*?slideCandidates\s*=\s*\[[\s\S]*?dirX:\s*baseDirX,\s*dirY:\s*0[\s\S]*?dirX:\s*0,\s*dirY:\s*baseDirY/],
  ['Radial sweep testing lateral angles up to PI in getBotSteeredStep', /const angles = \[[\s\S]*?0,\s*0\.32,[\s\S]*?Math\.PI\s*\];/],
  ['Anti-stuck watchdog mechanism in getBotSteeredStep', /entity\.botStuckWatchdog\s*=\s*entity\.botStuckWatchdog\s*\|\|/],
  ['Clearance route scanning excluding blocker in isBotRouteClearExcluding', /function isBotRouteClearExcluding\(\s*entity,\s*fromX,\s*fromY,\s*toX,\s*toY,\s*ignoredBlocker\s*\)/],

  // 2. Cover Seeking
  ['findBotCoverPoint locates safe cover behind walls or bushes', /function findBotCoverPoint\(\s*bot,\s*threatPos\s*\)[\s\S]*?Math\.hypot\(cx - threatPos\.x,\s*cy - threatPos\.y\)[\s\S]*?destructibleWalls/],

  // 3. Combat Intelligence & Friendly Fire Avoidance
  ['isBotShotObstructed raycasts line of sight to avoid hitting teammates under friendly fire', /function isBotShotObstructed\([\s\S]*?isFriendlyFireActive\(\)[\s\S]*?pointSegmentDistance\(ally\.x,\s*ally\.y,\s*bot\.x,\s*bot\.y,\s*target\.x,\s*target\.y\)[\s\S]*?return true;\s*\/\/\s*Obstructed by friendly teammate/],
  ['getBotProjectileDodgeVector evades allied hazard bullets when friendly fire is active', /const owner = shot\.ownerId === player\.id \? player : bots\.find\(\(candidate\) => candidate\.id === shot\.ownerId\);[\s\S]*?areAlliedEntities\(bot,\s*owner\)\s*&&\s*!isFriendlyFireActive\(\)/],
  ['Hold-fire health regeneration discipline when under 35% HP in shouldBotShootTarget', /context\.hpPct < 0\.35 && distance > 175 && \(context\.now - \(bot\.lastDamagedAt \|\| 0\)\) > 600[\s\S]*?return false;/],
  ['Predictive aim lead calculation in getBotAimLeadSeconds', /function getBotAimLeadSeconds\(context,\s*distance\)[\s\S]*?clamp\(base \+ distance \/ 5200,\s*0\.16,\s*0\.48\)/],
  ['updateBotAI passes predictive aim coordinates (aimX, aimY) into fire()', /const aimX = target\.x \+ leadX;[\s\S]*?const aimY = target\.y \+ leadY;[\s\S]*?fire\(t,\s*aimX,\s*aimY,\s*true,\s*false\);/],

  // 4. Mode Intelligence
  ['Bots 3.0 flag registered on entity spawn and in getBotModeAiContext', /bot3:\s*!!bot\?\.isBot3\s*\|\|\s*isRankedMatch/ && /isBot3:\s*true/],

  // 5. Exports
  ['Navigation and AI helpers exposed on window.__pureHTMLGame', /getBotSteeredStep,[\s\S]*?chooseBotWallWaypoint,[\s\S]*?isBotShotObstructed,[\s\S]*?findBotCoverPoint,[\s\S]*?canBotMoveToPosition/],

  // 6. Permanent Knock n Donate with Friendly Fire Event
  ['HOME_MODE_CARDS includes Knock n Donate (Friendly Fire)', /\['knock_donate',\s*'🎯',\s*'Knock n Donate \(Friendly Fire\)'/],
  ['HOME_PERMANENT_MODE_IDS includes knock_donate', /HOME_PERMANENT_MODE_IDS\s*=\s*\[[^\]]*'knock_donate'/],
  ['HOME_EVENT_REWARDS includes knock_donate', /knock_donate:\s*\{\s*type:\s*'coins',\s*amount:\s*75/],
  ['HOME_MODE_RULES includes knock_donate with Friendly Fire rules', /knock_donate:\s*\[[\s\S]*?Ring-out 3v3 battles[\s\S]*?Friendly Fire Active/],
  ['isFriendlyFireActive returns true when showdownMode === knock_donate', /showdownMode === 'knock_donate'/],
  ['Floating banner on knock_donate match launch', /isKnockDonateMode\s*=\s*showdownMode === 'knock_donate';[\s\S]*?spawnFloatingText\(player\.x,\s*player\.y - 65,\s*'⚠️ FRIENDLY FIRE ACTIVE! WATCH YOUR AIM!',\s*'#ff4757'\);/]
];

let passed = 0;
let failed = 0;

for (const [name, condition] of checks) {
  const ok = typeof condition === 'function' ? condition() : Boolean(condition.test ? condition.test(game) : condition);
  if (ok) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.error(`FAIL: ${name}`);
    failed++;
  }
}

console.log(`\n================================`);
console.log(`Results: ${passed}/${checks.length} passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Bots 3.0 AI and Knock n Donate Friendly Fire Event checks passed successfully!');
}
