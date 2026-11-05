// Family Circuit restriction (Electrostien-only) + HP-ONLY low-level curve.
// HP-only rebuild of Piece 1 (branch hp-curve-only), 2026-11-05.
// The previous attempt also scaled fallback DAMAGE down at low levels, which
// left time-to-kill unchanged; this rebuild cuts HP only — damage is untouched
// everywhere, and non-brawler entities keep their original stats at all levels.
// Source-presence checks + live getScaledStats behaviour via vm extraction.
import fs from 'fs';
import vm from 'node:vm';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
function extractFn(src, name) {
  const start = src.indexOf('function ' + name);
  if (start < 0) return null;
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
function extractConstObj(src, name) {
  const start = src.indexOf('const ' + name + ' =');
  if (start < 0) return null;
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(src.indexOf('{', start), i + 1); }
  }
  return null;
}
function extractConstArr(src, name) {
  const start = src.indexOf('const ' + name + ' =');
  if (start < 0) return null;
  let i = src.indexOf('[', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) return src.slice(src.indexOf('[', start), i + 1); }
  }
  return null;
}

// ---------------------------------------------------------- 1. Family Circuit: Electrostien keeps it
check('electrostien keeps Family Circuit def (win-earned, no Core Piece cost)', game.includes("electrostien: {\n          type: 'signature',\n          name: 'Family Circuit',") && game.includes('Electrostien Signature Piece') && game.includes('win 3 battles with Electrostien'));
check('electrostien keeps state fn + activate branch + grant fn + win call site', game.includes('function getElectrostienSignatureState') && game.includes("if (fighterId === 'electrostien') {") && game.includes('entity.electrostienFamilyCircuitArmed = true;') && game.includes('function grantElectrostienSignatureWin()') && game.includes("completedMatchFighter === 'electrostien') grantElectrostienSignatureWin();"));
check('electrostien keeps realm echo wiring (realm.familyCircuit + sky-strike echoes)', game.includes('realm.familyCircuit') && game.includes('ELECTROSTIEN_FAMILY_STRIKE_DAMAGE') && game.includes("fxKind: 'electrostienFamilyStrike'") && game.includes('electrostienFamilyCircuitArmed'));
check('electrostien keeps shop note (Pieces EARNED, never bought)', game.includes('Family Circuit Pieces are EARNED, never bought: win battles with Electrostien'));

// ---------------------------------------------------------- 2. Bolznstien keeps his OWN signature, untouched
check('bolznstien keeps Overcharge def (1500 HP, Electric Eyes, 14s cooldown)', game.includes("name: 'Overcharge',") && game.includes('costs 1,500 HP, 14s cooldown') && game.includes('const BOLZNSTIEN_SIGNATURE_COOLDOWN_MS = 14000;'));
check('bolznstien keeps state fn + activate branch (1500 HP cost, Electric Eyes gate)', game.includes('function getBolznstienSignatureState') && game.includes("if (fighterId === 'bolznstien') {") && game.includes('const cost = Math.min(1500, Math.max(0, entity.hp - 1));') && game.includes("label: 'NEEDS ELECTRIC EYES'"));

// ---------------------------------------------------------- 3. Family Circuit REMOVED from the other three Steins
for (const [fid, piece, cap] of [['voltastein', 'Voltastein', 'Voltastein'], ['staticstein', 'Staticstein', 'Staticstein'], ['healnstein', 'Healnstein', 'Healnstein']]) {
  check(`NO signature for ${fid}: no def, no state/activate/grant fns, no armed flag, no strike const, no win counter`,
    !game.includes(`${fid}: {\n          type: 'signature',`) && !game.includes(`${piece} Signature Piece`)
    && !game.includes(`function get${cap}SignatureState`) && !game.includes(`function grant${cap}SignatureWin`)
    && !game.includes(`${fid}FamilyCircuitArmed`) && !game.includes(`${fid.toUpperCase()}_FAMILY_STRIKE_DMG`)
    && !game.includes(`playerData.${fid}SignatureWins`) && !game.includes(`win 3 battles with ${piece}`));
  check(`NO signature wiring for ${fid}: no button list/state/cost text, no win-grant call site, no activate branch`,
    !game.includes(`(selectedBrawler === '${fid}' ? ' · WIN-EARNED'`) && !game.includes(`get${cap}SignatureState(player)`)
    && !game.includes(`completedMatchFighter === '${fid}') grant${cap}SignatureWin();`)
    && !game.includes(`if (fighterId === '${fid}') {`));
}
check('no Family Circuit buy-guard leftovers for the three (only Electrostien is win-earned)', !game.includes('win 3 battles with Voltastein') && !game.includes('win 3 battles with Staticstein') && !game.includes('win 3 battles with Healnstein'));

// ---------------------------------------------------------- 4. HP curve: shared scale, damage scale untouched
check('getLevelHpScale helper exists with the builder-pick formula 0.40 + (level-1)*0.06', game.includes('function getLevelHpScale(level)') && game.includes('return 0.40 + (level - 1) * 0.06;'));
check('damage scale untouched: getLevelDamageScale still 0.55 + (level-1)*0.045', game.includes('function getLevelDamageScale(level)') && game.includes('return 0.55 + (level - 1) * 0.045;'));
check('getPlayerDamageScale untouched (0.55 + (level-1)*0.045)', game.includes('function getPlayerDamageScale()') && game.includes('return 0.55 + (level - 1) * 0.045;'));
check('getScaledStats uses hpScale for HP and keeps scale for damage (bolznstien)', game.includes('hp: Math.round(7200 * hpScale), dmg: Math.round(990 * scale), strikeDmg: Math.round(1650 * scale), speed: 265'));
check('getScaledStats uses hpScale for HP (electrostien / voltastein / healnstein)', game.includes('hp: Math.round(8200 * hpScale)') && game.includes('hp: Math.round(5800 * hpScale)') && game.includes('hp: Math.round(6200 * hpScale)'));
check('no HP left on the damage scale inside getScaledStats (kage 9200 comment preserved)', (() => {
  const fn = extractFn(game, 'getScaledStats');
  if (!fn) return false;
  const hpOnDmgScale = fn.split('\n').filter((l) => /hp:\s*Math\.round\([^)]*\*\s*scale\)/.test(l) && !l.includes('9200*scale'));
  return hpOnDmgScale.length === 0 && fn.includes('hp:Math.round(8500*hpScale/*hp:Math.round(9200*scale)*/)');
})());

// ---------------------------------------------------------- 5. Fallback: HP-ONLY (damage stays additive)
check('fallback keeps the P11 HP anchor + hpScale for HP', game.includes("const p11Hp = hpBase + (role.includes('tank') ? 8500 : 5000);") && game.includes('Math.round(p11Hp * getLevelHpScale(level))'));
check('fallback damage is the ORIGINAL additive formula (no multiplicative damage)', game.includes("const dmg = Math.round(dmgBase + (level - 1) * (role.includes('tank') ? 70 : 55));") && !game.includes('Math.round(p11Dmg * getLevelDamageScale(level))'));
check('fallback carves out non-brawler entities via the roster check (original additive stats)', game.includes('if (!allBrawlers.includes(brawlerId)) {') && game.includes("const hp = Math.round(hpBase + (level - 1) * (role.includes('tank') ? 850 : 500));"));

// ---------------------------------------------------------- 6. Live behaviour via vm
const gssSrc = extractFn(game, 'getScaledStats');
const dataSrc = extractConstObj(game, 'brawlerData');
const rosterSrc = extractConstArr(game, 'allBrawlers');
check('getScaledStats + brawlerData + allBrawlers extract cleanly for vm', typeof gssSrc === 'string' && typeof dataSrc === 'string' && typeof rosterSrc === 'string');
let gss = null, brawlerData = null, allBrawlers = null;
try {
  const sb = { Math, MAX_POWER_LEVEL: 12, getSelectedBrawlerLevel: () => 11, getLevelDamageScale: (level) => 0.55 + (level - 1) * 0.045, getLevelHpScale: (level) => 0.40 + (level - 1) * 0.06 };
  sb.brawlerData = vm.runInNewContext('(' + dataSrc + ')', sb);
  sb.allBrawlers = vm.runInNewContext('(' + rosterSrc + ')', sb);
  brawlerData = sb.brawlerData; allBrawlers = sb.allBrawlers;
  vm.createContext(sb);
  vm.runInContext(gssSrc + '\nthis.__gss = getScaledStats;', sb);
  gss = sb.__gss;
} catch (e) { failures.push('vm setup threw: ' + e.message); failed++; }
if (gss) {
  // Explicit-branch samples: P11 identical, P1/P5/P8 follow hpScale, P12 +1.4% (x1.06), dmg unchanged.
  const samples = [
    ['bolznstien', 7200, 990, 2880, 4608, 5904, 7632],
    ['electrostien', 8200, 700, 3280, 5248, 6724, 8692],
    ['voltastein', 5800, 900, 2320, 3712, 4756, 6148],
    ['staticstein', 6200, 800, 2480, 3968, 5084, 6572],
    ['healnstein', 6200, 750, 2480, 3968, 5084, 6572],
    ['mallow', 6800, 320, 2720, 4352, 5576, 7208],
    ['nightshade', 6400, 560, 2560, 4096, 5248, 6784],
  ];
  for (const [id, p11hp, p11dmg, p1hp, p5hp, p8hp, p12hp] of samples) {
    const s = gss(id, 11), a = gss(id, 1), b = gss(id, 5), c = gss(id, 8), d = gss(id, 12);
    check(`vm ${id}: P11 ${p11hp}/${p11dmg}, P1 hp ${p1hp}, P5 ${p5hp}, P8 ${p8hp}, P12 hp ${p12hp} (dmg scale untouched)`,
      s.hp === p11hp && s.dmg === p11dmg && a.hp === p1hp && a.dmg === Math.round(p11dmg * 0.55)
      && b.hp === p5hp && c.hp === p8hp && d.hp === p12hp && d.dmg === Math.round(p11dmg * 1.045));
  }
  check('vm: speed untouched (nightshade 300 at P1 and P11)', gss('nightshade', 1).speed === 300 && gss('nightshade', 11).speed === 300);
  // the_deleter: explicit branch, not a roster brawler — HP curve applies by design.
  check('vm the_deleter (explicit, non-roster): HP follows the curve, dmg follows the damage scale',
    gss('the_deleter', 1).hp === 2640 && gss('the_deleter', 1).dmg === 963 && gss('the_deleter', 11).hp === 6600 && gss('the_deleter', 11).dmg === 1750);
  // Fallback: roster brawlerData ids WITHOUT an explicit branch keep their OLD
  // additive P11 exactly; HP follows the new curve, DAMAGE stays additive.
  const lines = game.split('\n');
  const gssStart = lines.findIndex((l) => l.includes('function getScaledStats'));
  const gssEnd = lines.findIndex((l, i) => i > gssStart && /^    \}$/.test(l));
  const gssFnSrc = lines.slice(gssStart, gssEnd + 1).join('\n');
  const explicit = new Set([...gssFnSrc.matchAll(/brawlerId === '([a-z0-9_]+)'/g)].map((m) => m[1]));
  const hpBaseFor = (role) => role.includes('tank') ? 10000 : role.includes('assassin') ? 6200 : role.includes('marksman') ? 5200 : role.includes('artillery') ? 5600 : role.includes('support') ? 5800 : role.includes('controller') ? 6000 : 5400;
  const dmgBaseFor = (role) => role.includes('tank') ? 1200 : role.includes('assassin') ? 1800 : role.includes('marksman') ? 1500 : role.includes('artillery') ? 1650 : role.includes('support') ? 1450 : role.includes('controller') ? 1600 : 1500;
  const speedBaseFor = (role) => role.includes('tank') ? 220 : role.includes('assassin') ? 300 : role.includes('marksman') ? 260 : role.includes('artillery') ? 245 : role.includes('support') ? 255 : role.includes('controller') ? 250 : 260;
  const hpScale = (lv) => 0.40 + (lv - 1) * 0.06;
  let fbTotal = 0, fbBad = [];
  for (const id of Object.keys(brawlerData)) {
    if (explicit.has(id) || !allBrawlers.includes(id)) continue; // entities handled below
    fbTotal++;
    const role = String((brawlerData[id] || {}).role || '').toLowerCase();
    const tank = role.includes('tank');
    const p11Hp = hpBaseFor(role) + (tank ? 8500 : 5000);
    const dmgOld = (lv) => Math.round(dmgBaseFor(role) + (lv - 1) * (tank ? 70 : 55));
    const spdOld = (lv) => Math.round(speedBaseFor(role) + (lv - 1) * (role.includes('assassin') ? 4 : 2));
    const got = gss(id, 11), got1 = gss(id, 1), got12 = gss(id, 12);
    if (got.hp !== p11Hp || got.dmg !== dmgOld(11) || got.speed !== spdOld(11)
      || got1.hp !== Math.round(p11Hp * 0.40) || got1.dmg !== dmgOld(1) || got1.speed !== spdOld(1)
      || got12.hp !== Math.round(p11Hp * 1.06) || got12.dmg !== dmgOld(12) || got12.speed !== spdOld(12)) fbBad.push(id);
  }
  check(`vm fallback HP-only: all ${fbTotal} roster fallback ids keep old P11 exactly, HP follows the curve, DAMAGE stays additive at P1/P12`, fbTotal > 0 && fbBad.length === 0);
  if (fbBad.length) failures.push('fallback HP-only mismatch: ' + fbBad.slice(0, 10).join(', '));
  // Entities: every non-roster id keeps the ORIGINAL additive stats at EVERY level.
  const entityIds = [...Object.keys(brawlerData).filter((id) => !allBrawlers.includes(id)), 'skeletrooper', 'evil_doctor_dna', 'parrot', 'egg', 'prism_bumper'];
  let entBad = [];
  for (const id of entityIds) {
    const role = String((brawlerData[id] || {}).role || '').toLowerCase();
    const tank = role.includes('tank');
    for (const lv of [1, 5, 8, 11, 12]) {
      const want = {
        hp: Math.round(hpBaseFor(role) + (lv - 1) * (tank ? 850 : 500)),
        dmg: Math.round(dmgBaseFor(role) + (lv - 1) * (tank ? 70 : 55)),
        speed: Math.round(speedBaseFor(role) + (lv - 1) * (role.includes('assassin') ? 4 : 2)),
      };
      const got = gss(id, lv);
      if (got.hp !== want.hp || got.dmg !== want.dmg || got.speed !== want.speed) entBad.push(`${id}@L${lv}`);
    }
  }
  check(`vm entities untouched: all ${entityIds.length} non-roster ids match the original additive stats at L1/5/8/11/12`, entBad.length === 0);
  if (entBad.length) failures.push('entity mismatch: ' + entBad.slice(0, 10).join(', '));
  // The point of the rebuild: kills get FASTER at low levels now (HP down, dmg same).
  check('vm time-to-kill improves at P1 (Adlof: 6000/1600 = 4 hits -> 4400/1600 = 3 hits)',
    Math.ceil(gss('adlof', 1).hp / gss('adlof', 1).dmg) < Math.ceil(6000 / 1600)
    && gss('adlof', 1).hp === 4400 && gss('adlof', 1).dmg === 1600);
}

console.log(`hp-curve-only: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
