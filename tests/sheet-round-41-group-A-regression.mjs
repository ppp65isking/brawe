// Sheet Round 41 — GROUP A regression (base a8e8aee).
// Covers ONLY: aegis, amplifier, angel, anti_royal, awakenator, axeywaxy,
// badbat, beam, beast, blinkeye. All numbers are POWER 11 values; code
// base stats are P11 x the getScaledStats curve (P11 scale = 1.0), so a
// P11 sheet value lands verbatim in the base — except where a brawler
// hardcodes its fire damage (angel, awakenator, blinkeye, beast claws),
// where the same P11 value (or its documented ratio) is asserted there.
// Charge-rate mismatches vs the sheet are REPORTED, not changed (the
// Balance text never orders a charge change): see the footer comments.
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const has = (s) => game.includes(s);
const notHas = (s) => !game.includes(s);

// ---------- AEGIS (row 1: FIX G1 as designed, DMG; no number changes) ----------
// G1 Shield Charge dashes 240px (3 tiles) dealing 900 damage. The live bug:
// updateAegisDash skipped training dummies, so in training G1 dealt no
// damage at all. Dummies are now hittable (structures/pets still excluded).
check('aegis G1 dash no longer skips dummies',
  has("if (target.isStructure || (target.isPet && !target.isTowerDefenseMinion)) continue;"));
check('aegis G1 damage still 900', has('const AEGIS_GADGET1_DAMAGE = 900;'));
check('aegis G1 shield still 1500', has('const AEGIS_GADGET1_SHIELD = 1500;'));
check('aegis main unchanged 900', /brawlerId === 'aegis'\)\s*\{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(7400 \* hpScale\), dmg: Math\.round\(900 \* scale\), speed: 270 \};/.test(game));

// ---------- AMPLIFIER (row 2: minimal main-attack visuals, FLAG treatment) ----------
check('amplifier toolbox has a dedicated draw branch', has('else if (b.isAmplifierToolboxShot) {'));
check('amplifier visual draws a toolbox body', has("ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 3);"));
check('amplifier visual keeps torque-snap glow distinct', has("b.ampTorqueSnap ? 'rgba(217,70,239,.55)'"));
check('amplifier main damage untouched (bot 605 / player 980)', has('damage: isBot ? 605 : 980,'));

// ---------- ANGEL (row 3: FIX G1 + SP2 Knockback; main 1600>1200 P11; HC 3>2) ----------
check('angel scaledStats P11 dmg 1200 (was 1600)', has("dmg:brawlerId==='angel'?1200:"));
check('angel fire normal player 1200 (was 1600)', has('(isBot?840:1200)'));
check('angel fire normal bot 840 (was 1120, same 0.75 ratio)', has('(isBot?840:1200)'));
check('angel fire hyper player 885 (was 1180, same ratio)', has('(isBot?638:885)'));
check('angel fire hyper bot 638 (was 850, same ratio)', has('(isBot?638:885)'));
check('angel HC burst 3>2 shots', has('const count = (hyper ? 2 : 1)'));
check('angel G1 player transfer preserves blessing owner', has('ally.angelSecondLifeOwnerId=player.id;player.angelSecondLifeUntil=0;'));
check('angel G1 bot transfer exists', has("bot.brawler === 'angel' && g === 'g1'"));
check('angel G1 bot transfer preserves blessing owner', has('ally.angelSecondLifeOwnerId = bot.id; bot.angelSecondLifeUntil = 0;'));
check('angel SP2 gate accepts legacy sp2 (path 1)', has("(selectedStar==='long'||selectedStar==='sp2')"));
check('angel SP2 path 2 uses blessing owner, not revived entity', has('const angelOwner = entity.angelSecondLifeOwnerId===player.id ? player : bots.find(b=>b.id===entity.angelSecondLifeOwnerId);'));
check('angel SP2 knockback applied on activation', has('applyKnockback(foe,target.x,target.y,180,performance.now())'));
check('angel G2 heal untouched 1600', has('doHeal(ally,1600)'));

// ---------- ANTI-ROYAL (row 4: reload 30% slower, unload 40% slower, FLAG sign) ----------
// Reload speed x0.70 => reload time 1800/0.70 = 2571ms.
// Unload (mortar fire) interval x1.40: sustained 1300>1820, barrage 220>308.
check('anti_royal reload 1800>2571', has("else if (brawler === 'anti_royal') base = 2571;"));
check('anti_royal reload arithmetic 1800/0.70 = 2571', Math.round(1800 / 0.70) === 2571);
check('anti_royal mortar sustained 1300>1820', has('const ANTI_ROYAL_MORTAR_FIRE_MS = 1820;'));
check('anti_royal mortar barrage 220>308', has('const ANTI_ROYAL_OPENING_BARRAGE_FIRE_MS = 308;'));
check('anti_royal unload arithmetic 1300x1.4=1820, 220x1.4=308', Math.round(1300 * 1.4) === 1820 && Math.round(220 * 1.4) === 308);
check('anti_royal main dmg untouched 1550', has('dmg: Math.round(1550 * scale)'));

// ---------- AWAKENATOR (row 5: DMG 950>1050) ----------
check('awakenator scaledStats 950>1050', has('dmg: Math.round(1050 * scale), speed: 260 };'));
check('awakenator fire 950>1050', has('const damage = Math.round(1050 * getLevelDamageScale(level));'));
check('awakenator tooltip 1050', has("attackDesc:'Fire a 1050-damage dream bolt."));

// ---------- AXEYWAXY (row 6: super DMG 250>200) ----------
check('axeywaxy super tick 250>200 (non-hyper)', has('const tickDamage = hyper ? 150 : 200;'));
check('axeywaxy hyper tick untouched 150', has('const tickDamage = hyper ? 150 : 200;'));
check('axeywaxy super tooltip 200', has('dealing 200 damage per tick every 0.2s (1,000 DPS)'));
check('axeywaxy main cleave untouched 1400', has('(hyper ? 1600 : 1400)'));

// ---------- BADBAT (row 7: straight telegraph main; bat HP decays, FLAG numbers) ----------
check('badbat telegraph list exists', has('const badbatTelegraphs = [];'));
check('badbat fire pushes a straight telegraph', has('badbatTelegraphs.push({ x: fromEntity.x, y: fromEntity.y, ang, until: now + 450 });'));
check('badbat telegraph drawn as a dashed straight line', has("ctx.setLineDash([14, 10]);"));
check('badbat wave visual narrowed to a straight wedge', has('ctx.arc(0, 0, cr, -0.18, 0.18);'));
check('badbat wave hitbox untouched (baseRadius still 42/84)', has('const baseRadius = isG1 ? 84 : 42;'));
check('badbat bat HP decay 28/s', has('bat.hp -= 28 * dt;'));
check('badbat decay arithmetic: 560 HP at 28/s lasts 20s', 560 / 28 === 20);
check('badbat bat max HP untouched 560', has('hp: 560,\n                maxHp: 560,') || has('hp: 560,'));
check('badbat main dmg untouched 1400 (scaledStats)', has('dmg: Math.round(1400 * scale), batDmg: Math.round(300 * scale)'));

// ---------- BEAM (row 8: FIX SP1 + SP2; super stun 1x per super, FLAG reading) ----------
check('beam SP gates accept legacy sp1/sp2', has("const hasSP1 = (star === 'slow' || star === 'sp1');") && has("const hasSP2 = (star === 'long' || star === 'sp2');"));
check('beam SP1 grants literal 25% max-HP shield at max ramp', has('const shieldAmt = Math.round((entity.maxHp || 0) * 0.25);'));
check('beam SP1 shield granted once per ramp', has('if (!entity.beamSP1ShieldGranted) {'));
check('beam SP1 25% DR preserved', has('dealtDamage *= 0.75;'));
check('beam SP2 slowed-target refraction now deals damage', has('let slowRefDmg = Math.round(baseDmg * 0.45);'));
check('beam SP2 slowed refraction excludes the origin target', has('rt.id === target.id) continue;'));
check('beam golden super id stamped at cast (player)', has('player.beamGoldenSuperId = (player.beamGoldenSuperId || 0) + 1;'));
check('beam golden super id stamped at cast (bot)', has('bot.beamGoldenSuperId = (bot.beamGoldenSuperId || 0) + 1;'));
check('beam stun gated once per super per target', has('target.beamStunnedGoldenId !== goldenId'));
check('beam old 3s stun window removed', notHas('if (now - lastStun >= 3000)'));
check('beam super still 5s golden', has('player.beamSuperGoldenUntil = now + 5000;'));
check('beam ramp stages untouched', has('const stageDmgPerSec = [120, 300, 500, 850, 1250, 1980][stage];'));

// ---------- BEAST (row 9: main 750>650; SP1 30% decaying shield; SP2 ammo 0.08-0.12) ----------
// Full regular hit = primary + small (0.58x): old 475+276=751~=750;
// new 412+239=651~=650 (bot 216+125=341, same ratio as old 250+145=395).
check('beast primary claw P11 475>412 player / 250>216 bot', has('const p11RawDamage = isBot ? 216 : 412;'));
check('beast full-hit arithmetic 412+round(412*0.58)=651 ~= 650', 412 + Math.round(412 * 0.58) === 651);
check('beast SP1 shield grant 30% max HP on beast-mode start', has('const beastShieldAmt = Math.round((entity.maxHp || 0) * 0.30);'));
check('beast SP1 shield granted after the 15% beast HP boost', (() => {
  const grantAt = game.indexOf('const beastShieldAmt');
  const boostAt = game.indexOf('entity.maxHp = Math.round(baseMaxHp * 1.15);');
  return grantAt > boostAt && grantAt - boostAt < 2000;
})());
check('beast SP1 decay 5% max HP/s', has('Math.round((entity.maxHp || 0) * 0.05)'));
check('beast SP1 gate accepts slow or sp1', has("(getEntityStarChoice(entity) === 'slow' || getEntityStarChoice(entity) === 'sp1')"));
check('beast SP1 tooltip reworked (no placeholder)', has("sp1: 'Primal Guard (Gain a 30% decaying shield when starting beast mode)'"));
check('beast SP2 ammo 0.25>0.10 (sheet range 0.08-0.12 midpoint)', has('ammo+.10)') && has('(owner.ammo||0)+.10)'));
check('beast SP2 gate accepts long or sp2', has("(getEntityStarChoice(owner)==='long'||getEntityStarChoice(owner)==='sp2')"));
check('beast old SP1 knockback text gone', notHas("sp1: 'Razor Pounce (Main attack gains tiny knockback)'"));

// ---------- BLINKEYE (row 10: main 1850>1400) ----------
check('blinkeye scaledStats 1850>1400', has('dmg: Math.round(1400 * scale), speed: 265 };'));
check('blinkeye fire player normal 1400 (was 1850)', has('(isHyper ? 1665 : 1400)'));
check('blinkeye fire bot normal 832 (was 1100, same ratio)', has('(isHyper ? 1059 : 832)'));
check('blinkeye ratio arithmetic', Math.round(1100 * 1400 / 1850) === 832 && Math.round(2200 * 1400 / 1850) === 1665);
check('blinkeye boss damage untouched (separate boss entity, 580)', has('blinkeyeBaseDmg: 580,'));

// ---------- GUARD: untouched neighbours still at base values ----------
// Spot-checks that no other brawler was edited: nightshade (Group D's sheet
// value 560, not Group A's), runner (no-change row), mallow (not in this round).
check('guard: nightshade main is 560 (Group D sheet value)', has('dmg: Math.round(560 * scale), speed: 300 };'));
check('guard: runner main still 950', has('dmg: Math.round(950 * scale), speed: 290 };'));
check('guard: mallow main still 320', has('dmg: Math.round(320 * scale), speed: 270 };'));

if (failures.length) {
  console.error(`GROUP A REGRESSION: ${passed} passed, ${failures.length} FAILED:`);
  for (const f of failures) console.error('  FAIL: ' + f);
  process.exit(1);
}
console.log(`GROUP A REGRESSION: all ${passed} checks passed.`);
// Charge-rate report (NOT changed — Balance text orders no charge change):
// aegis: sheet 5, code default 6 (not in registry) — MISMATCH.
// amplifier: sheet 5, code 6 — MISMATCH. angel: sheet 6, code 6 — match.
// anti_royal: sheet 5, code 6 — MISMATCH. awakenator: sheet 6, code 8 — MISMATCH.
// axeywaxy: sheet 6, code 6 — match. badbat: sheet 7, code 5 — MISMATCH.
// beam: sheet "Same", code registry 8 + per-tick 2%/3% golden/normal charge —
//   no change (sheet says Same). beast: sheet "8 Full Hits", code registry
//   20 — MISMATCH (charge dedupes per activation, not per claw; a full
//   attack is 2 swings, so even 8 full hits != 8 activations). blinkeye:
//   sheet 6, code 4 — MISMATCH.
