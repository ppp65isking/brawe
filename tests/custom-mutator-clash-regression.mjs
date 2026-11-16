import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

const checks = [
  // 1. Boss Mode Flag Declarations & ReferenceError Fixes
  ['isDemonVillainsBossMode variable declared', /let isDemonVillainsBossMode\s*=\s*false;/.test(game)],
  ['isRamageBossMode variable declared', /let isRamageBossMode\s*=\s*false;/.test(game)],
  ['isOrboBossMode variable declared', /let isOrboBossMode\s*=\s*false;/.test(game)],
  ['Storm check excludes isWeeFeeBossMode and isDemonVillainsBossMode', /!isWeeFeeBossMode && !isDemonVillainsBossMode/.test(game)],
  ['decayerShieldCap uses fromEntity in fire() to prevent ReferenceError: entity', /const decayerShieldCap = isPowerPlayModifierActive\(fromEntity\)/.test(game)],

  // 2. Custom Mutator Clash Registration in Permanent Modes
  // Phase 8 (Friendly Battles) renamed the card/label but kept the
  // `custom_clash` mode id, so the pins below track the new name.
  ['custom_clash registered in HOME_MODE_CARDS', /\['custom_clash',\s*'🤝',\s*'Friendly Battle'/.test(game)],
  ['custom_clash registered in HOME_PERMANENT_MODE_IDS', /HOME_PERMANENT_MODE_IDS\s*=\s*\[[\s\S]*?'custom_clash'/.test(game)],
  ['custom_clash registered in HOME_EVENT_REWARDS', /custom_clash:\s*\{\s*type:\s*'coins',\s*amount:\s*80/.test(game)],
  ['custom_clash registered in HOME_MODE_RULES', /custom_clash:\s*\[[\s\S]*?Pick ANY mode[\s\S]*?Select up to 3 active mutators/.test(game)],
  ['getShowdownModeLabel returns label for custom_clash', /if\s*\(mode === 'custom_clash'\)\s*return 'Friendly Battle';/.test(game)],

  // 3. Custom Mutator Picker UI Modal
  ['openCustomMutatorPickerUI function implemented', /function openCustomMutatorPickerUI\(\)/.test(game)],
  ['openHomeModeInfo routes custom_clash to openCustomMutatorPickerUI', /if\s*\(mode === 'custom_clash'\)\s*\{\s*close\(\);\s*openCustomMutatorPickerUI\(\);\s*return;\s*\}/.test(game)],
  ['Picker UI enforces max 3 modifiers selection', /selectedModifiers\.length >= 3[\s\S]*?Max 3 modifiers allowed!/.test(game)],
  ['Picker UI supports all 3v3 and Showdown modes', /brawe_ball[\s\S]*?knockout_3v3[\s\S]*?objective[\s\S]*?construction[\s\S]*?brick_vault[\s\S]*?knock_donate/.test(game)],
  ['Picker UI launches match with isCustomMutatorMatch = true', /isCustomMutatorMatch = true;[\s\S]*?launchShowdownMatch\(\);/.test(game)],

  // 4. Up to 3 Simultaneous Modifiers Mechanics
  ['activeRankedModifierTertiary declared and tracked', /let activeRankedModifierTertiary\s*=\s*null;/.test(game)],
  ['isCustomMutatorMatch declared and tracked', /let isCustomMutatorMatch\s*=\s*false;/.test(game)],
  ['clearRankedSessionState clears tertiary modifier and custom mutator match flag', /activeRankedModifierTertiary\s*=\s*null;\s*isCustomMutatorMatch\s*=\s*false;/.test(game)],
  ['renderRankedModifierHUD renders 3 modifiers on HUD badge', /ctx\.fillText\(`\${label1}\s*•\s*\${label2}\s*•\s*\${label3}`, innerWidth \* 0\.5, badgeY \+ 17\);/.test(game)],
  ['renderRankedModifierHUD called for isCustomMutatorMatch', /\(isRankedMatch \|\| isCustomMutatorMatch\) && !gameOver/.test(game)],
  ['isFriendlyFireActive supports tertiary modifier and custom mutator match', /function isFriendlyFireActive\(\)[\s\S]*?isMutatorActive\('friendly_fire'\)/.test(game)],
  ['colossus_friend supports tertiary modifier and custom mutator match', (game.match(/isMutatorActive\('colossus_friend'\)/g) || []).length >= 2],
  ['always_hyper supports tertiary modifier and custom mutator match', (game.match(/isMutatorActive\('always_hyper'\)/g) || []).length >= 5],
  ['hyper_overdrive supports tertiary modifier and custom mutator match', /if\s*\(isMutatorActive\('hyper_overdrive'\)\)/.test(game)],
  ['super_surge supports tertiary modifier and custom mutator match', (game.match(/isMutatorActive\('super_surge'\)/g) || []).length >= 2],
  ['quickfire supports tertiary modifier and custom mutator match', /isMutatorActive\('quickfire'\) && !source\?\.super/.test(game)],
  ['timed_detonation supports tertiary modifier and custom mutator match', (game.match(/isMutatorActive\('timed_detonation'\)/g) || []).length >= 2],
  ['crowd_uncontrol supports tertiary modifier and custom mutator match', (game.match(/isMutatorActive\('crowd_uncontrol'\)/g) || []).length === 3],

  // 5. Public Game Exports
  ['window.__pureHTMLGame exports activeRankedModifierTertiary', /get activeRankedModifierTertiary\(\)\s*\{\s*return activeRankedModifierTertiary;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports isCustomMutatorMatch', /get isCustomMutatorMatch\(\)\s*\{\s*return isCustomMutatorMatch;\s*\}/.test(game)],
  ['window.__pureHTMLGame exports openCustomMutatorPickerUI', /get openCustomMutatorPickerUI\(\)\s*\{\s*return openCustomMutatorPickerUI;\s*\}/.test(game)],
  ['launchShowdownMatch initializes modifiers for isCustomMutatorMatch', /if\s*\(isRankedMatch \|\| isCustomMutatorMatch\)\s*\{[\s\S]*?timedDetonationStage = 0;/.test(game)],
  ['startBtn click opens picker UI when showdownMode is custom_clash', /if\s*\(showdownMode === 'custom_clash'\)\s*\{\s*openCustomMutatorPickerUI\(\);/.test(game)],
  ['createHomeModeCard click opens picker UI when id is custom_clash', /if\s*\(id === 'custom_clash'\)\s*\{\s*openCustomMutatorPickerUI\(\);/.test(game)]
];

let failed = 0;
for (const [desc, result] of checks) {
  if (result) {
    console.log('PASS: ' + desc);
  } else {
    console.error('FAIL: ' + desc);
    failed++;
  }
}

console.log('\n================================');
console.log(`Results: ${checks.length - failed}/${checks.length} passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Custom Mutator Clash & Boss Mode Fix regression checks passed successfully!');
}
