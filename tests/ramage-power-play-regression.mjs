import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const sushi = fs.readFileSync(new URL('../slopsushi-cards.js', import.meta.url), 'utf8');

const checks = [
  ['Ramage in POWER_PLAY_BRAWLERS set', /POWER_PLAY_BRAWLERS\s*=\s*new Set\(\[[^\]]*'ramage'/],
  ['Ramage in HOME_MODE_RULES power_play_showdown curated roster', /power_play_showdown:\s*\[[\s\S]*?Curated roster:[\s\S]*?Ramage/],
  ['Ramage powerNames entry in Power Play intro', /ramage:\s*'\+10% RANGE\/RAMP \(MAX 12X\) • 90% DASH DR • \+100% SUPER SHOTS'/],
  ['Ramage multiplier is capped at 12x', /const RAMAGE_MAX_MULTIPLIER = 12;/],
  ['getNextRamageMultiplier ramps up to the 12x cap', /getNextRamageMultiplier\(multiplier=1\) \{\s*return Math\.min\(RAMAGE_MAX_MULTIPLIER, Math\.round\(\(\(Number\(multiplier\) \|\| 1\) \+ RAMAGE_RAMP_PER_HIT\) \* 10\) \/ 10\);/],
  ['Ramage Main Attack fist range scales +10% per multiplier step (multiplier capped at 12x)', /isPowerPlayModifierActive\(fromEntity\)[\s\S]*?rangeBonus = multSteps \* 0\.10;[\s\S]*?fistRange = Math\.round\(fistRange \* \(1\.0 \+ rangeBonus\)\)/],
  ['Ramage 90% Damage Reduction during Super Dash', /if \(target && target\.ramageIsDashing && isPowerPlayModifierActive\(target\)[\s\S]*?b\.damage = Math\.round\(\(b\.damage \|\| 0\) \* 0\.10\)[\s\S]*?🛡️ -90% DASH DR!/],
  ['Ramage Super return dash fires +100% more projectiles in Power Play', /isPowerPlayModifierActive\(e\)[\s\S]*?offsets = isPP \? \[-0\.36, -0\.12, 0\.12, 0\.36\] : \[-0\.16, 0\.16\]/],
  ['Ramage aim preview scales range with Power Play multiplier bonus', /selectedBrawler === 'ramage' && !aimingSuper[\s\S]*?isPowerPlayModifierActive\(player\)[\s\S]*?rangeBonus = multSteps \* 0\.10;/],
  ['Ramage has 9 cards in slopsushi-cards.js (1 extra card)', /ramage:\[[\s\S]*?Iron Spiked Gauntlets[\s\S]*?Momentum Step[\s\S]*?Heavy Concussion[\s\S]*?Adrenaline Overdrive[\s\S]*?Twin Fist Echo[\s\S]*?Violent Rebound[\s\S]*?Unbounded Ramp[\s\S]*?Juggernaut Momentum[\s\S]*?TITAN OVERDRIVE CATACLYSM/],
];

for (const [label, pattern] of checks) {
  const src = label.includes('slopsushi') ? sushi : game;
  assert.match(src, pattern, label);
}

console.log(`Ramage Power Play & 12x-Capped Progression regression: ${checks.length}/${checks.length} checks passed.`);
