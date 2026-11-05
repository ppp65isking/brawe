import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const anomalyRoster = fs.readFileSync(new URL('../modules/brawlers/anomaly/roster.js', import.meta.url), 'utf8');

const checks = [
  // 1. Registration & Base Stats
  ['carmela_fudge registered in brawlerData', /'carmela_fudge':\s*\{\s*name:\s*'Carmela & Fudge',\s*role:\s*'Damage Dealer'/.test(game)],
  ['carmela_fudge registered in brawlerRarities as Anomaly', /carmela_fudge:\s*'Anomaly'/.test(game)],
  ['carmela_fudge registered in modular Anomaly roster', /registerBrawlerGroup\('Anomaly',[\s\S]*?'carmela_fudge'/.test(anomalyRoster)],
  ['carmela_fudge registered in getScaledStats (6400 HP, 1800 DMG)', /if\s*\(brawlerId === 'carmela_fudge'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(6400 \* hpScale\),\s*dmg: Math\.round\(1800 \* scale\)/.test(game)],
  ['carmela_fudge registered in reloadMsByBrawler as 1400ms', /reloadMsByBrawler:\s*\{[\s\S]*?carmela_fudge:\s*1400/.test(game)],
  ['carmela_fudge registered in fireDelayMsByBrawler as 180ms', /fireDelayMsByBrawler:\s*\{[\s\S]*?carmela_fudge:\s*180/.test(game)],
  ['carmela_fudge registered in brawlerRoles', /carmela_fudge:'Damage Dealer'/.test(game)],
  ['carmela_fudge registered in brawlerPortraitIcons', /carmela_fudge:\s*'🍬🍫'/.test(game)],
  ['carmela_fudge in CUSTOM_BRAWLER_PORTRAITS', /CUSTOM_BRAWLER_PORTRAITS\s*=\s*Object\.freeze\(\[[\s\S]*?'carmela_fudge'/.test(game)],
  ['carmela_fudge SVG portrait defined', /carmela_fudge:\s*`[\s\S]*?fill="#d35400"/.test(game)],
  ['carmela_fudge in GADGET_COOLDOWNS (8s cooldown)', /carmela_fudge:\s*\{\s*g1:\s*8000,\s*g2:\s*8000\s*\}/.test(game)],
  ['carmela_fudge in BRAWLER_SUPER_CHARGE_HITS (5 hits)', /carmela_fudge:5/.test(game)],
  ['carmela_fudge registered in allBrawlers array', /allBrawlers\s*=\s*\[[\s\S]*?'carmela_fudge'/.test(game)],
  ['carmela_fudge in BALANCE_PROFILE damageScalarByBrawler', /damageScalarByBrawler:\s*\{[\s\S]*?carmela_fudge:\s*1\.0/.test(game)],
  ['carmela_fudge in SOUL_CONSTELLATIONS Anomaly pool', /id:\s*'Anomaly'[\s\S]*?brawlers:\s*\[[\s\S]*?'carmela_fudge'/.test(game)],
  ['carmela_fudge in brawlerTraitData', /brawlerTraitData\s*=\s*\{[\s\S]*?carmela_fudge:/.test(game)],
  ['carmela_fudge in default playerData.unlockedBrawlers', /unlockedBrawlers:\s*\{[\s\S]*?carmela_fudge:\s*true/.test(game)],
  ['carmela_fudge unlocked in ensureSoulSummonerData', /playerData\.unlockedBrawlers\.carmela_fudge = true;/.test(game)],
  ['carmela_fudge option in index.html brawlerSelect', /<option value="carmela_fudge">Carmela & Fudge \(Anomaly\)<\/option>/.test(html)],

  // 2. Free Gadget at Power 1 & Stance Switching
  ['Gadget unlocked free at Power 1 for Carmela & Fudge', /bid === 'carmela_fudge'[\s\S]*?gadgetUnlocked = true/.test(game)],
  ['switchCarmelaFudgeForm function implemented', /function switchCarmelaFudgeForm\(entity,\s*gadgetChoice\)/.test(game)],
  ['G1 switches form and heals 2000 HP', /gadgetChoice === 'g1'[\s\S]*?doHeal\(entity,\s*2000\)/.test(game)],
  ['G2 switches form, reloads 1 ammo, and grants +30% speed', /gadgetChoice === 'g2'[\s\S]*?ammo \+ 1[\s\S]*?carmelaSpeedUntil = now \+ 3000/.test(game)],
  ['G2 reloads the player global ammo pool', /entity\.id === player\.id[\s\S]*?ammo = Math\.min\(maxAmmo, ammo \+ 1\)[\s\S]*?ammoReloadTimer = 0/.test(game)],
  ['Movement speed applies faster speed in Fudge form and G2 boost', /carmelaFudgeForm === 'fudge'[\s\S]*?speed = 275/.test(game)],

  // 3. Carmela Form Combat (Sticky Hands & Quad Slam)
  ['Carmela main attack charges and spawns isCarmelaHand', /brawler === 'carmela_fudge'[\s\S]*?carmelaFudgeForm !== 'fudge'[\s\S]*?isCarmelaHand: true/.test(game)],
  ['Carmela Sticky Hand pull tiers (<15% dmg, 16-60% half, 61-90% full, >90% pull self)', /chargePct <= 0\.15[\s\S]*?chargePct <= 0\.60[\s\S]*?chargePct <= 0\.90[\s\S]*?pullSelf/.test(game)],
  ['Carmela Quad Slam super summons 4 hovering hands for 5s', /carmelaSuperHandsLeft = 4[\s\S]*?carmelaSuperUntil = now \+ 5000/.test(game)],
  ['Carmela Hypercharge speeds up charge by 30% and slams slow enemies', /carmelaHandChargeSpeed[\s\S]*?1\.30[\s\S]*?slowUntil = now \+ 2500/.test(game)],

  // 4. Fudge Form Combat (Sticky Fudge & Chocolate Shell)
  ['Fudge main attack fires isFudgeGlob', /brawler === 'carmela_fudge'[\s\S]*?carmelaFudgeForm === 'fudge'[\s\S]*?isFudgeGlob: true/.test(game)],
  ['Fudge player input dispatches fire instead of swallowing attacks', /selectedBrawler === 'carmela_fudge'[\s\S]*?else if \(held && !playerIsStunned\)[\s\S]*?fire\(player, wm\.x, wm\.y, false, isMoving\)/.test(game)],
  ['Carmela preserves mobile aim through charge release', /player\.carmelaAimX = wm\.x[\s\S]*?Number\.isFinite\(player\.carmelaAimX\)[\s\S]*?player\.carmelaAimX = undefined/.test(game)],
  ['Fudge glob accumulates chocolate coverage up to 100%', /target\.chocolateCoverage = \(target\.chocolateCoverage \|\| 0\) \+/.test(game)],
  ['100% chocolate triggers Chocolate Shell stunning target for duration', /target\.inChocolateShell = true[\s\S]*?target\.chocolateShellHp = 3500/.test(game)],
  ['Fudge Super Ultimate Shell creates instant 2x durability shell and cuts 30% current HP', /target\.chocolateShellHp = 7000[\s\S]*?hpLoss = Math\.round\(target\.hp \* 0\.30\)/.test(game)],
  ['Fudge Super slows enemy reload by 30% after exiting shell', /fudgeReloadSlowUntil = now \+ 4000/.test(game)],
  ['Fudge Hypercharge grants 30% homing, 3x shell HP, and converts 30% lost HP into shield', /isFudgeGlob && isHyper[\s\S]*?homing[\s\S]*?target\.chocolateShellHp = 10500[\s\S]*?doShield\(owner,\s*hpLoss/.test(game)],

  // 5. Star Powers
  ['SP1 Taffy & Cocoa: charges 25% faster and needs 3 hits (34%) for shell', /hasSp1[\s\S]*?1\.25[\s\S]*?34 : 25/.test(game)],
  ['SP2 Sweet Revenge: caramel burst on Carmela swap, chocolate puddle on Fudge swap', /hasSp2[\s\S]*?isCarmelaBurst[\s\S]*?chocolatePuddles\.push/.test(game)],

  // 6. Visuals & Models
  ['2.5D model for Carmela confectionery artisan', /brawlerId === 'carmela_fudge'[\s\S]*?CARMELA 2\.5D MODEL/.test(game)],
  ['2.5D model for Fudge chocolate beast', /brawlerId === 'carmela_fudge'[\s\S]*?FUDGE 2\.5D MODEL/.test(game)],
  ['Chocolate shell rendered on trapped targets', /target\.inChocolateShell[\s\S]*?drawChocolateShell/.test(game)],
  ['Target chocolate coverage buildup meter rendered', /t\.chocolateCoverage[\s\S]*?Math\.round\(t\.chocolateCoverage\)/.test(game)],
  ['Carmela Quad Slam floating hands rendered above head', /entity\.carmelaSuperHandsLeft[\s\S]*?f39c12[\s\S]*?fi <= 1\.5/.test(game)],
  ['Carmela hold-to-charge continuous caramel ammo bar with tier labels', /selectedBrawler === 'carmela_fudge'[\s\S]*?HOLD TO CHARGE[\s\S]*?SLINGSHOT!/.test(game)],
  ['Fudge 3 chocolate ammo bars with cocoa styling', /selectedBrawler === 'carmela_fudge'[\s\S]*?#8d6e63[\s\S]*?#5d4037[\s\S]*?#3e2723/.test(game)],
  ['Custom projectile rendering for isCarmelaHand, isFudgeGlob, isFudgeSuperBoulder, isCarmelaBurst', /b\.ownerBrawler === 'carmela_fudge'[\s\S]*?isCarmelaHand[\s\S]*?isFudgeGlob[\s\S]*?isFudgeSuperBoulder[\s\S]*?isCarmelaBurst/.test(game)],

  // 7. UI, Dispatch & Exports
  ['gadgetBtn handles Carmela & Fudge form swap', /curBrawler === 'carmela_fudge'[\s\S]*?switchCarmelaFudgeForm/.test(game)],
  ['Bot AI supports Carmela & Fudge', /bot\.brawler === 'carmela_fudge'[\s\S]*?switchCarmelaFudgeForm\(bot/.test(game)],
  ['updateGadgetInfo includes Carmela & Fudge G1 and G2 descriptions', /selectedBrawler === 'carmela_fudge'[\s\S]*?Sweet Recovery[\s\S]*?Sugar Sprint/.test(game)],
  ['window.__pureHTMLGame exports switchCarmelaFudgeForm', /get switchCarmelaFudgeForm\(\)\s*\{\s*return switchCarmelaFudgeForm;\s*\}/.test(game)]
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
  console.error(`${failed} check(s) failed!`);
  process.exit(1);
} else {
  console.log('All Carmela & Fudge brawler regression checks passed successfully!');
}
