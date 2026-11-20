import fs from 'node:fs';
import assert from 'node:assert/strict';

// Duels Mode Upgrade regression — rewritten for the Arena Forge big changes
// and the current Duels implementation (draft overlay launch, maxed mode,
// getDuelsWinScore() formats). Tower Duels is deleted: no Tower Powers in
// Duels, no DUELS_ACTIVE_TOWER_POWERS, no slopSushiCards, no
// openDuelsTeamSelectionModal / startDuelsMatch / renderDuelsHUD (all
// replaced by the openDuelsDraftOverlay flow), no DUELS_WIN_SCORE const
// (replaced by getDuelsWinScore()), no passive turbo charge (that was
// Power Play boss code, never a Duels mechanic).

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // Draft formats: first-to-7 / 9 / 15, defaulting to 9.
  ['DUELS_ROUND_OPTIONS offers first-to-7, first-to-9, and first-to-15 formats', /const DUELS_ROUND_OPTIONS = Object\.freeze\(\[7, 9, 15\]\);/.test(game)],
  ['getDuelsWinScore uses the chosen format, defaulting to 9', /function getDuelsWinScore\(\) \{[\s\S]*?return DUELS_ROUND_OPTIONS\.includes\(duelsTargetWins\) \? duelsTargetWins : 9;/.test(game)],
  ['No DUELS_WIN_SCORE const remains (formats live in getDuelsWinScore)', !/(?<![A-Z_])DUELS_WIN_SCORE/.test(game)],
  // Home registration.
  ['Duels registered in HOME_MODE_CARDS', /\['duels',\s*'⚔️',\s*'Duels \(First to 9\)'/.test(game)],
  ['Duels in HOME_PERMANENT_MODE_IDS', /HOME_PERMANENT_MODE_IDS\s*=\s*\[[^\]]*'duels'/.test(game)],
  ['Duels in HOME_EVENT_REWARDS', /duels:\s*\{\s*type:\s*'coins',\s*amount:\s*50/.test(game)],
  ['Duels rules in HOME_MODE_RULES with First to 9 and 1-4 draft, no Tower Powers', /duels:\s*\[(?:(?!Tower Power)[\s\S])*?Draft 1 to 4 brawlers[\s\S]*?First to win 9 rounds[\s\S]*?Level 12 stats[\s\S]*?All gadgets, star powers & Hypercharge[\s\S]*?Poison storm disabled'\]/.test(game)],
  ['Duels mode color and 1V1 tag in createModeCard', /duels:\s*'#a855f7'[\s\S]*?tag\s*=\s*'1V1'/.test(game)],
  // Draft overlay launch (replaces the old showdownMode/startBtn routing).
  ['Draft overlay titles the 1-4 fighter draft', /title\.textContent = 'Draft 1–4 Brawlers for Duels!';/.test(game)],
  ['Draft overlay explains the format pick', /Choose 1–4 fighters, then pick a format and LAUNCH\./.test(game)],
  ['Draft overlay caps the squad at DUELS_MAX_FIGHTERS = 4', /const DUELS_MAX_FIGHTERS = 4;/.test(game) && /drafted\.length < DUELS_MAX_FIGHTERS/.test(game)],
  ['Home Duels button opens the draft overlay', /duelsBtn\.addEventListener\('click', \(\) => openDuelsDraftOverlay\(\)\);/.test(game)],
  ['Draft launch needs at least one drafted fighter', /launchBtn\.disabled = drafted\.length < 1;/.test(game)],
  ['Draft launch plays maxed mode and starts the first round', /isDuelsMaxedMode = true;[\s\S]*?startDuelsRound\(\);/.test(game)],
  // Round engine.
  ['startDuelsRound levels fighters 11, or 12 in maxed mode', /function startDuelsRound\(\) \{[\s\S]*?const duelPlayerLevel = isDuelsMaxedMode \? 12 : 11;/.test(game)],
  ['startDuelsRound gives the bot its level unlocks (maxed = all)', /const unlocks = getUnlocksForLevel\(duelBotLevel\);[\s\S]*?gadgetUnlocked: unlocks\.gadgetUnlocked,[\s\S]*?starPowerUnlocked: unlocks\.starPowerUnlocked,[\s\S]*?hyperchargeUnlocked: unlocks\.hyperchargeUnlocked,/.test(game)],
  ['Duels round transitions check getDuelsWinScore', /if \(botScore >= getDuelsWinScore\(\)\) gameOver = true;[\s\S]*?if \(playerScore >= getDuelsWinScore\(\)\) gameOver = true;/.test(game)],
  ['Duels HUD shows the live score line', /Duels \| You: \$\{playerScore\}  Bot: \$\{botScore\}/.test(game)],
  ['Game over text confirms YOU WON THE DUEL / BOT WON THE DUEL', /won = playerScore >= getDuelsWinScore\(\);[\s\S]*?matchText = won \? "YOU WON THE DUEL!" : "BOT WON THE DUEL!";[\s\S]*?rankText = `Score: \$\{playerScore\} - \$\{botScore\}`;/.test(game)],
  // Storm: the update gate and the draw both run only in Showdown-family
  // modes — team modes, training, boss fights and Solo Trial are excluded.
  ['Storm update gate excludes the team modes', /if \(!isObjectiveMode && !isDamageFillerMode && !isMirrorMode && !isKnockDonateMode && !isBrickVaultMode && !isArenaForgeMode && !isPropHuntMode && !isTraining && !isBossFight && !isSoloTrial && !gameOver\) \{[\s\S]*?stormTimer \+= dt;/.test(game)],
  ['Storm draw excludes the team modes', /if \(!isTraining && !isBossFight && !isSoloTrial && !isObjectiveMode && !isDamageFillerMode && !isMirrorMode && !isKnockDonateMode && !isBrickVaultMode && !isArenaForgeMode\) \{[\s\S]*?ctx\.arc\(WORLD_W\/2, WORLD_H\/2, Math\.max\(0, stormRadius\)/.test(game)],
  // Tower Duels is gone from Duels entirely.
  ['No Tower Powers references remain in Duels code', !/DUELS_ACTIVE_TOWER_POWERS|isTowerDuelEvent|rollDuelsTowerLoadout|slopSushiCards/.test(game)],
];

let failed = 0;
for (const [label, result] of checks) {
  if (result) {
    console.log('PASS: ' + label);
  } else {
    console.error('FAIL: ' + label);
    failed++;
  }
}

console.log('\n================================');
console.log(`Results: ${checks.length - failed}/${checks.length} passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('Duels Mode Upgrade regression: all checks passed.');
}
