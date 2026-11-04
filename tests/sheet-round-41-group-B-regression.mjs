// Sheet Round 41 — Group B regression (2026-11-04, base a8e8aee).
// Applies ONLY to: Blobert (no change), Bolznstien, Boom-Arang,
// Bouncin' Balls, Carmela & Fudge, Chaird (no change), Cheseypuff,
// Chickpig, Cinderion, Classy.
// Sheet numbers are Power 11 values; getScaledStats P11 = 1.0x base, and
// the flat-damage brawlers below use P11 literals directly (verified:
// getLevelDamageScale(11) = 0.55 + 10*0.045 = 1.0).
// FLAGS baked into this file (see coordinator report for full detail):
//  - Classy main damage is NOT raised to the sheet's 350: code P11 is 320
//    (note literal), already below 350, and the sheet's ~480 premise matches
//    no code value — raising it would be a buff against a nerf row.
//  - Bouncin' bot ball 194 > 129 and Chickpig bot bacon 800 > 696 are
//    proportional keeps (same bot/player ratio) so the nerf does not leave
//    bots hitting harder than players (Bouncin') or silently rebalanced.
//  - Super charge rates are PINNED as coded, not changed: the sheet column
//    disagrees with code for 7/10 Group B rows (listed below); charge
//    mechanics were explicitly out of scope, so mismatches are reported,
//    not "fixed" here.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
function count(re) {
  return (game.match(re) || []).length;
}
// Slice of the Bouncin' main volley: from its fire() branch to Goonbob's.
const bouncinMain = game.slice(
  game.indexOf("} else if (brawler === 'bouncin_balls')"),
  game.indexOf("} else if (brawler === 'goonbob')")
);
assert.ok(bouncinMain.length > 1000, 'bouncin main block slice found');

// ---------- Blobert (row 11, NO CHANGE) ----------
check('blobert def present', game.includes("'goonbob': { name: 'Blobert'"));
check('blobert main damage pinned 530/265', game.includes('damage: isBot ? 265 : 530'));
check('blobert charge table pinned 6', game.includes('goonbob:6'));

// ---------- Bolznstien (row 12: main 1320>990; SP1 25%>12.5%) ----------
check('bolz base main 1320>990', game.includes('dmg: Math.round(990 * scale), strikeDmg'));
check('bolz old 1320 gone from scaled stats', !game.includes('dmg: Math.round(1320 * scale)'));
check('bolz SP1 strike bonus 1.25>1.125', game.includes('strikeDmg * (sp1 ? 1.125 : 1.0)'));
check('bolz SP1 tooltip +12.5%', game.includes('deal +12.5% bonus damage and slow enemies hit by 35% for 1.5s'));
check('bolz SP1 gate still accepts live slow + legacy sp1',
  /selectedStar\) === 'slow' \|\| \(owner\.id === player\.id \? selectedStar : owner\.selectedStar\) === 'sp1'/.test(game));

// ---------- Boom-Arang (row 13: 1st main 1100>1000; super pull -25%) ----------
check('boom main 1100>1000', game.includes('Math.round(1000 * ownerMult * levelMult)'));
check('boom old main 1100 gone', !game.includes('Math.round(1100 * ownerMult * levelMult)'));
check('boom super pullMult 0.75 on both spawns (player + bot)', count(/pullMult: 0\.75/g) === 2);
check('boom pull loop applies pullMult (default 1, others unaffected)',
  game.includes('const pullForce = (b.hyperVisual ? 450 : 320) * (b.pullMult ?? 1) * dt;'));

// ---------- Bouncin' Balls (row 14: ball 285>190; balls in sync) ----------
check('bouncin ball 285>190 (player), bot 194>129 proportional, crystal 335 kept',
  game.includes('const damageBase = isBot ? 129 : (transformed ? 335 : 190);'));
check('bouncin volley no longer staggered in main block', !bouncinMain.includes('i * 88'));
check('bouncin volley launches together (delay 0)', bouncinMain.includes('}, 0);'));
check('bouncin volley cadence lock kept (same next-volley window)',
  bouncinMain.includes('lockMainAttackSequence(fromEntity,(balls-1)*88,now);'));
check('bouncin crystal super staggers untouched (both remaining i*88 are supers)',
  count(/\}, i \* 88\);/g) === 2);

// ---------- Carmela & Fudge (row 15: hand dmg range 1600-2500 > 900-1750) ----------
// Reading: the 1600-2500 range is exactly the Carmela-form charge-tier
// damage spread (1600/1900/2200/2500), NOT travel range (360-620px).
// Middle tiers linearly interpolated between the new endpoints, rounded
// to the game's 5-damage breakpoint grid. Fudge glob (1200) untouched.
check('carmela hand tiers 900/1185/1465/1750',
  game.includes('handDmg = 900;') && game.includes('handDmg = 1185;') &&
  game.includes('handDmg = 1465;') && game.includes('handDmg = 1750;'));
check('carmela old hand tiers gone',
  !game.includes('handDmg = 1600;') && !game.includes('handDmg = 1900;') &&
  !game.includes('handDmg = 2200;') && !game.includes('handDmg = 2500;'));
check('carmela fudge glob 1200 untouched', game.includes('damage: 1200,'));

// ---------- Chaird (row 16, NO CHANGE) ----------
check('chaird def present', game.includes("'chaird': { name: 'Chaird'"));
check('chaird main damage pinned 970/580', game.includes('damage: isBot ? 580 : 970'));
check('chaird charge table pinned 5', game.includes('chaird:5'));

// ---------- Cheseypuff (row 17: SP2 third stage +30% range, -20% DMG) ----------
check('chesey SP2 gate accepts live long + legacy sp2',
  game.includes("(selectedStar === 'long' || selectedStar === 'sp2')"));
check('chesey SP2 third-stage dmg 890>712', game.includes('stageDamage[2] = 712;'));
check('chesey SP2 third-stage range +30% recorded', game.includes('stageRanges[2] = Math.round(stageRanges[2] * 1.30);'));
check('chesey SP2 stage-3 flag on bullet', game.includes('cheseySp2Stage3,'));
check('chesey SP2 stage-3 travel extended once on entry (both advance paths)',
  count(/cheseySp2RangeApplied/g) >= 3);
check('chesey base third-stage dmg 890 still the pre-nerf literal',
  game.includes('[1300, 1090, 890]'));
check('chesey G1 big-forever 1300s untouched', game.includes('[1300, 1300, 1300]'));

// ---------- Chickpig (row 18: poison 250>150; bacon 1150>1000; pig 1200>600, 30% faster) ----------
check('chickpig poison 250>150 at both application sites (direct egg + egg zone)',
  count(/poisonDamage\|\|0,150/g) === 2 && !game.includes('poisonDamage||0,250'));
check('chickpig bacon 1150>1000 (player), bot 800>696 proportional',
  game.includes('damage:isBot?696:1000'));
check('chickpig scaled-stats dmg kept consistent 1150>1000',
  game.includes("(brawlerId==='chickpig'?1000:"));
check('chickpig super pig ram 1200>600', game.includes('damage:600,pierce:true,isChickpigRam:true'));
check('chickpig pig hits 30% faster: 900ms > 900/1.3 = 692ms',
  game.includes('t.ramCooldownUntil=now+692;'));
check('chickpig egg damage 900 + zone tick 180 untouched (not in row)',
  game.includes('damage:isBot?650:900') && game.includes('damage:180'));

// ---------- Cinderion (row 19: no re-shift to symmetry; smooth add/remove) ----------
// Mechanism: the update loop used to re-pack every layer every frame
// (symmetricSlot/symmetricCount), so every add/remove jumped all other
// flames. Now each flame keeps a fixed cap-grid slot for life.
check('cinderion fixedSlot assigned at flame creation', game.includes('let fixedSlot = 0;'));
check('cinderion flame object carries fixedSlot', game.includes('layer, fixedSlot, createdAt: now'));
check('cinderion update loop no longer assigns symmetric slots',
  !game.includes('symmetricSlot=index'));
check('cinderion phase uses fixed cap-grid slot, not live count',
  game.includes('(Number.isFinite(flame.fixedSlot) ? flame.fixedSlot : 0) * Math.PI * 2 / CINDERION_LAYER_CAPS[flame.layer]'));
check('cinderion layer caps unchanged [3,6,8,10]',
  game.includes('const CINDERION_LAYER_CAPS = Object.freeze([3, 6, 8, 10]);'));

// ---------- Classy (row 20: main ~480>350 FLAGGED; SP1 3%/hit) ----------
// Main note literal stays 320: it is already below the sheet's 350 target
// and no code value matches the sheet's ~480 premise, so writing 350
// would be a +9% buff against a nerf row. See coordinator report.
check('classy main note damage deliberately kept at 320 (flagged, not 350)',
  count(/damage:\s*isBotFire\s*\?\s*170\s*:\s*320/g) === 2);
check('classy SP1 per-hit 3.5%>3%', game.includes('comboHits * 0.03'));
check('classy SP1 cap 28%>24% (8 hits x 3%)', game.includes('Math.min(0.24, comboHits * 0.03)'));
check('classy SP1 gate accepts live slow + legacy sp1',
  game.includes("if (classyStar === 'slow' || classyStar === 'sp1')"));

// ---------- Super charge rates: PINNED as coded (sheet mismatches reported) ----------
// Code SUPER_CHARGE_HITS_BY_BRAWLER vs sheet: goonbob 6=6 OK; chaird 5=5 OK;
// bolznstien 5 vs 7; boom_arang 4 vs 8; bouncin_balls 6 vs 5; carmela 5 vs 6;
// cheseypuff 6 vs 7; chickpig 12 vs 7; cinderion 10 vs 30 flames; classy 6 vs
// 30 notes. Charge mechanics unchanged by design (out of scope).
const chargeTable = game.slice(game.indexOf('SUPER_CHARGE_HITS_BY_BRAWLER'), game.indexOf('let nextMainAttackActivationId'));
for (const [id, hits] of [['goonbob', 6], ['bolznstien', 5], ['boom_arang', 4],
  ['bouncin_balls', 6], ['carmela_fudge', 5], ['chaird', 5], ['cheseypuff', 6],
  ['chickpig', 12], ['cinderion', 10], ['classy', 6]]) {
  check(`charge table pinned ${id}=${hits}`, chargeTable.includes(`${id}:${hits}`) || chargeTable.includes(`${id}: ${hits}`));
}

console.log(`sheet-round-41-group-B: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
