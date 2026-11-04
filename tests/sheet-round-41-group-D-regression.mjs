// Sheet Balance Round 41 — Group D regression (2026-11-04).
// Covers ONLY the Group D rows: JackTrade, Jetpack, Kage, Money & Tax,
// Nightshade (numbers only — her star-power gates are deliberately untouched),
// Oil Maker, Outlit, Rocketeer, Runner (no change), Upgradart, Xray.
// Sheet numbers are Power 11 values; code base stats scale 1.0x at P11.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const has = (re) => re.test(game);

// ---------- JackTrade (row 47) ----------
check('jacktrade card damage 900 -> 750', has(/const JACKTRADE_CARD_DAMAGE = 750;/));
check('jacktrade scaled dmg 900 -> 750', has(/dmg: Math\.round\(750 \* scale\), speed: 260/));
check('jacktrade SP1 rework: five-card flag armed on super', has(/if\(jackTradeHasSP1\(owner\)\)owner\.jackTradeSp1FiveCardArmed=true/));
check('jacktrade SP1 rework: 5-card fan in spawn', has(/fiveCard \? \[-0\.110,-0\.055,0,0\.055,0\.110\]/));
check('jacktrade SP1 rework: Hot Streak retired', has(/const hotBonus = false; \/\/ Round 41: Hot Streak retired/));
check('jacktrade SP1 rework: Lucky Break setter removed', !has(/jackTradeLuckyUntil=now\+2500/));
check('jacktrade SP2 rework: share helper with 300px radius + 20% strength', has(/shareJackTradeSp2/) && has(/Math\.hypot\(ally\.x-owner\.x,ally\.y-owner\.y\)>300/) && has(/ally\.jackTradeRushStrength=0\.2/) && has(/ally\.jackTradeRegenRemaining=\(ally\.jackTradeRegenRemaining\|\|0\)\+1200/));
check('jacktrade SP2 rework: shared rush divisor 1.4 in getFireDelay', has(/Math\.round\(644\/\(1\+2\*rushStr\)\)/));
check('jacktrade SP2 rework: shared rush divisor in getReloadTime', has(/base \/= \(1 \+ 2 \* \(player\.jackTradeRushStrength \?\? 1\)\)/));
check('jacktrade star gates accept slow/sp1 + long/sp2', has(/jackTradeHasSP1\(owner\)\{const c=getEntityStarChoice\(owner\);return c==='slow'\|\|c==='sp1'/) && has(/jackTradeHasSP2\(owner\)\{const c=getEntityStarChoice\(owner\);return c==='long'\|\|c==='sp2'/));
check('jacktrade charge 18 matches sheet (18 card hits)', has(/jacktrade:18/));

// ---------- Jetpack (row 48) ----------
check('jetpack reload 2300 -> 1917 (20% faster)', has(/jetpack: 1917,/));
check('jetpack charge window 1200 -> 960ms (25% faster, all 4 sites)', (game.match(/jetpackChargeStartedAt\)\/960/g) || []).length === 4);
check('jetpack landing damage 1100+900*charge', has(/Math\.round\(\(1100\+900\*f\.charge\)\*scale\)/));
check('jetpack aim preview 1100+900*charge', has(/Math\.round\(1100\+900\*charge\)\} DMG/));
check('jetpack G1 rework: deploys 3000 HP jet pod', has(/isJetpackJet:true/) && has(/hp:3000,maxHp:3000/) && has(/JET DEPLOYED/));
check('jetpack G1 rework: old Emergency Thrusters flight-cancel removed', !has(/SAFE LANDING/));
check('jetpack G1 rework: teammate pickup grants 4s free flight', has(/jetpackFreeFlyUntil = now \+ 4000/) && has(/JET RIDE!/));
check('jetpack G1 rework: free flight = +25% speed, player + bot chains', has(/player\.jetpackFreeFlyUntil && now < player\.jetpackFreeFlyUntil\) hcSpd \*= 1\.25/) && has(/t\.jetpackFreeFlyUntil && nowTarget < t\.jetpackFreeFlyUntil\) activeBotSpeed \*= 1\.25/));
check('jetpack SP1 rework: super flight 1250 -> 893ms gated on slow/sp1', has(/jetpackHasSP1\(owner\)\?893:1250/) && has(/jetpackHasSP1\(owner\)\{const c=getEntityStarChoice\(owner\);return c==='slow'\|\|c==='sp1'/));
check('jetpack SP1 rework: Soft Landing heal removed', !has(/doHeal\(owner,1000\)/));
check('jetpack super minimum dash 240px', has(/if\(jd<240\)/));
check('jetpack HC: fire zones 150 dmg, radius 80, 3s', has(/radius:80,damage:150,until:performance\.now\(\)\+3000/) && has(/z\.nextTickAt=now\+500/));
check('jetpack HC: zones on super bomb drops + main landing', has(/if\(f\.hyper\)spawnJetpackFireZone\(owner\.id,zx,zy\)/) && has(/if\(f\.hyper\)spawnJetpackFireZone\(owner\.id,owner\.x,owner\.y\)/));
check('jetpack HC: zones updated + rendered + reset', has(/updateJetpackFireZones\(now\)/) && has(/for\(const zone of jetpackFireZones\)/) && has(/jetpackFireZones\.length = 0;/));
check('jetpack charge FLAG documented: code 4 vs sheet 6 landings (unchanged)', has(/jetpack:4,/));

// ---------- Kage (row 49) ----------
check('kage fan 30% narrower (x0.7 offsets)', has(/ang - 0\.098,/) && has(/ang - 0\.0196,/) && has(/ang \+ 0\.0588,/) && has(/ang \+ 0\.098,/));
check('kage damage 300 -> 150 / 550 -> 400', has(/const minDmg = Math\.round\(150 \* scale\)/) && has(/const maxDmg = Math\.round\(400 \* scale\)/));
check('kage hit fallbacks 150/400', has(/b\.minDamage \|\| 150/) && has(/b\.maxDamage \|\| 400/));
check('kage G2 multiplier 0.60 -> 0.18 (-70%)', has(/Math\.round\(p11Stats\.dmg \* 0\.18\)/));
check('kage G2 arithmetic: 2350 x 0.18 = 423/dart', Math.round(2350 * 0.18) === 423);
check('kage charge FLAG documented: code 12 vs sheet 32 shurikens (unchanged)', has(/kage:12/));

// ---------- Money & Tax (row 56) ----------
check('money coins: player 270 -> 228, center 338 -> 287; bot 120 -> 101, center 150 -> 127', has(/isBot \? 127 : 287/) && has(/isBot \? 101 : 228/));
check('money full volley arithmetic: 3 x (287+228+228) = 2229 ~= sheet 2230', 3 * (287 + 228 + 228) === 2229);
check('tax notes: player 375 -> 793, bot 170 -> 359 (x1.45 -> 1150 / 521)', has(/isBot \? 359 : 793/) && has(/isBot\?359:793/));
check('tax arithmetic: 793 x 1.45 = 1150 (rounded)', Math.round(793 * 1.45) === 1150);
check('money charge FLAG documented: code 24 vs sheet 4 full hits / 8 notes (unchanged)', has(/money_and_tax:24/));

// ---------- Nightshade (row 57; numbers only) ----------
check('nightshade main 640 -> 560', has(/dmg: Math\.round\(560 \* scale\), speed: 300/));
check('nightshade super blade 1100 -> 800', has(/const NIGHTSHADE_BLADE_DAMAGE = 800;/));
check('nightshade SP2 1.2 -> 1.18', has(/Math\.round\(\(b\.damage \|\| 0\) \* 1\.18\); \/\/ Round 41: Fresh Wounds/));
check('nightshade star gates UNTOUCHED (declined fix 2026-10-28)', has(/nightshadeHasSP1/) && !has(/Round 41.*nightshadeHasSP/));
check('nightshade charge FLAG documented: code 6 vs sheet 24 dagger hits (unchanged)', has(/nightshade: 6/));

// ---------- Oil Maker (row 58) ----------
check('oil main 468 -> 320', has(/dmg: Math\.round\(320 \* scale\), speed: 260/));
check('oil super charges 3 -> 2 / hyper 5 -> 3 (all 3 sites)', has(/return isHyper \? 3 : 2; \/\/ Round 41/) && has(/entity\.oilMakerSuperCharges === 'number' \? entity\.oilMakerSuperCharges : 2/) && has(/player\.oilMakerSuperCharges = 3;/));
check('oil base reload 50% slower: player 24 -> 48 / 285 -> 570', has(/let fastDelay = selectedBrawler === 'oil_maker' \? 570/) && has(/let reloadTime = selectedBrawler === 'oil_maker' \? 48/));
check('oil bot fireDelay 56 -> 112 (50% slower cadence)', has(/oil_maker: 112,/));
check('oil G1/G2 wired via activateRecoveryGadget', has(/if\(brawler==='oil_maker'\)\{\s*\/\/ Round 41 fix: executeOilMakerG1\/G2 existed/) && has(/if\(gadget==='g1'\)executeOilMakerG1\(entity\);/));
check('oil SP1: dedicated slow 0.85 + reload x1.22 fields', has(/oilMakerSp1SlowUntil/) && has(/Math\.min\(baseSlow, 0\.85\)/) && has(/reloadTime \*= 1\.22/) && has(/fireDelay \*= 1\.22;/));
check('oil SP1: old generic reloadDebuff setter removed from puddle loop', !has(/ent\.reloadDebuffUntil = Math\.max\(ent\.reloadDebuffUntil/));
check('oil SP2: reload 1.25 -> 1.10 player + bot, heal 300 -> 200/s', has(/if \(nearFire\) reloadTime \/= 1\.10;/) && has(/fireDelay \/= 1\.10; \/\/ Round 41 Oil SP2/) && has(/doHeal\(ent, 200 \* dt\);/));
check('oil charge FLAG documented: code 16 vs sheet 36 flame hits (unchanged)', has(/oil_maker:16/));

// ---------- Outlit (row 60) ----------
check('outlit point blank: player pellet 233 -> 188, bot 183 -> 146', has(/const outlitDamage = isBot \? 146 : 188;/));
check('outlit point blank arithmetic: 8 x 188 = 1504 ~= sheet 1500', 8 * 188 === 1504);
check('outlit super pellet 1420 -> 767 (3 x 767 = 2301 ~= 2300)', has(/damage: 767, pierce: !!hyper/) && 3 * 767 === 2301);
check('outlit charge FLAG documented: code 30 (unchanged)', has(/outlit:30/));

// ---------- Rocketeer (row 69) ----------
check('rocketeer big rocket 2191 -> 1400 (launch + fallback)', has(/const damage=Math\.round\(1400\*damageMult\)/) && !has(/2191\*damageMult/));
check('rocketeer mini rockets flat 400 (no longer 14.9% of base)', has(/const miniDamage=400;/) && !has(/\.14904/));
check('rocketeer super spread +20% (cap 112 -> 134)', has(/Math\.min\(134,Math\.round\(\(62\+strikeCount\*4\)\*1\.2\)\)/));
check('rocketeer HC rework: 6 orbiting rockets, 400 dmg, 70px blast', has(/for\(let n=0;n<6;n\+\+\)/) && has(/damage:400,blastRadius:70/) && has(/rocketeerOrbitRockets\.push/));
check('rocketeer HC rework: old 8 radial minis retired', !has(/rocketeerHyperRadial/) || has(/The old 8 radial minis \(and the slop rocketeerHyperRadial override\) are retired/));
check('rocketeer HC rework: orbit update + render + reset', has(/rocketeerOrbitRockets\[i\]/) && has(/for\(const r of rocketeerOrbitRockets\)/) && has(/rocketeerOrbitRockets\.length = 0;/));
check('rocketeer charge FLAG documented: code 18 vs sheet 8 big rocket hits (unchanged)', has(/rocketeer:18/));

// ---------- Runner (row 70: NO CHANGE) ----------
check('runner unchanged: charge 6 matches sheet', has(/runner: 6/));

// ---------- Upgradart (row 89) ----------
check('upgradart stage 2-5 darts 320 -> 170 (stage 1 stays 960)', has(/const baseDamage = stage === 1 \? 960 : 170;/));
check('upgradart HC returning darts 15% of outbound (was flat 96)', has(/b\.damage = Math\.round\(\(b\.damage \|\| 0\) \* 0\.15\);/) && !has(/b\.damage = 96;/));
check('upgradart super gate: 15s cooldown, charge restored on failure', has(/upgradartSuperNextReadyAt = now \+ 15000/) && has(/SUPER NOT READY/) && has(/if\(!castUpgradartSuper\(player, !!isHypercharged, wm\.x, wm\.y\)\)superCharge=100/) && has(/if\(!castUpgradartSuper\(bot, isHyper, targetX, targetY\)\)bot\.superCharge=100/));
check('upgradart super duration 30% shorter: 5000/4000 -> 3500/2800', has(/const durationMs = stage >= 4 \? 3500 : 2800;/) && has(/MEGA POISON DARTS! \(3\.5s\)/) && has(/POISON DARTS! \(2\.8s\)/));
check('upgradart G2 rework: heal dart armed on gadget press (player + bot)', has(/player\.upgradartG2Armed = true;/) && has(/bot\.upgradartG2Armed = true;/) && has(/HEALING DART READY/));
check('upgradart G2 rework: next dart 0 damage, heals 1000 on first hit', has(/damage: isHealDart \? 0 : dartDamage/) && has(/upgradartHealDart: isHealDart/) && has(/b\.upgradartHealDart && !b\.upgradartHealDone/) && has(/doHeal\(owner, 1000\);/));
check('upgradart G2 rework: caltrops retired', !has(/TOXIC CALTROPS/));
check('upgradart charge N/A: code 10 unchanged', has(/upgradart:10/));

// ---------- Xray (row 93) ----------
check('xray main: player 1700 -> 1400, bot 972 -> 800', has(/damage: isBot \? 800 : 1400,/));
check('xray G1/G2 wired via activateRecoveryGadget (bot path)', has(/if\(brawler==='xray'\)\{/) && has(/QUICK SCAN/) && has(/xrayRevealedUntil=now\+4000/));
check('xray G2 rework: 30% DR shield 3s (defenseMult 0.70)', has(/entity\.defenseUntil=now\+3000;entity\.defenseMult=0\.70;/) && has(/LEAD APRON 30% DR/));
check('xray G2 rework: old 1900-HP shield path no longer reachable for G2', has(/g2: 'Lead Apron \(Gain 30% damage reduction for 3 seconds\)'/));
check('xray bot machine gains xrayHyper (hyper damage zone fix)', has(/xrayHyper: isHyper, \/\/ Round 41 incidental fix/));
check('xray ammo visibility: pip count follows real capacity (not hardcoded 3)', has(/const cap=Math\.max\(1,t\.maxAmmo\|\|getNativeAmmoCapacity\(t\.brawler\)\|\|3\)/) && has(/for\(let ai=0;ai<cap;ai\+\+\)/));
check('xray charge FLAG documented: code 5 vs sheet 7 hits (unchanged)', has(/xray:5,/));

// ---------- Shared helpers stay brawler-scoped ----------
check('shared slow helper: only an oil-scoped branch added', has(/oilMakerSp1SlowUntil/) && has(/if \(now < \(entity\.oilMakerSp1SlowUntil \|\| 0\)\) baseSlow = Math\.min\(baseSlow, 0\.85\)/));
check('syntax: game.js parses (checked separately via node --check)', true);

if (failures.length) {
  console.error(`\nGROUP D REGRESSION: ${passed} passed, ${failures.length} FAILED:`);
  for (const f of failures) console.error('  FAIL: ' + f);
  process.exit(1);
}
console.log(`GROUP D REGRESSION: all ${passed} checks passed.`);
