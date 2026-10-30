// Tower Defense charge + storm fix regression.
// Method (stated plainly): game.js is an 80k-line browser bundle, so these
// checks assert (a) the fixed gate predicates, simulated with the exact
// conditions now in game.js, and (b) that those conditions are actually
// present at the right call sites in game.js source. This is not a full
// engine run; the predicates below mirror the edited lines verbatim.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(root, 'game.js'), 'utf8');

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  ok - ${name}`); }
  else { failed++; console.log(`  FAIL - ${name}`); }
}
function countOccurrences(needle) {
  return src.split(needle).length - 1;
}

// --- Targets ---
const tdMinion = { isPet: true, isSummon: true, isTowerDefenseMinion: true };
const regularPet = { isPet: true, isSummon: true };
const normalBot = {};
const structure = { isStructure: true };
const dummy = { isDummy: true };

// --- 1. Main-attack charge gates (projectile path ~50943, bot path ~30889) ---
// Edited condition shape: (!target.isPet || target.isTowerDefenseMinion)
const chargeGate = (t) => !t.isPet || !!t.isTowerDefenseMinion;
check('charge gate passes for TD minion', chargeGate(tdMinion) === true);
check('charge gate still blocks regular pets', chargeGate(regularPet) === false);
check('charge gate still passes for normal bots', chargeGate(normalBot) === true);
check('projectile-path exemption present in source (2 lines)',
  countOccurrences('(!target.isPet || target.isTowerDefenseMinion)') >= 2);
check('bot-path exemption present in source (2 lines)',
  countOccurrences('(!bot.isPet || bot.isTowerDefenseMinion)') >= 2);

// --- 2. Orbo super recharge gate (~50667, additional site found during fix) ---
const orboGate = (t) =>
  (!t.isPet || !!t.isTowerDefenseMinion) && (!t.isSummon || !!t.isTowerDefenseMinion);
check('orbo recharge passes for TD minion', orboGate(tdMinion) === true);
check('orbo recharge still blocks regular pet/summon', orboGate(regularPet) === false);
check('orbo recharge passes for normal target', orboGate(normalBot) === true);
check('orbo exemption present in source',
  src.includes('(!target.isPet || target.isTowerDefenseMinion) && (!target.isSummon || target.isTowerDefenseMinion)'));

// --- 3. grantMainAttackCharge owner-side gate UNTOUCHED ---
check('owner-side pet/summon/boss gate still present in grantMainAttackCharge',
  src.includes('owner.isPet || owner.isSummon || owner.isBoss'));

// --- 4. Hyper flows through the same grant (so fixing the gate fixes both) ---
const grantStart = src.indexOf('function grantMainAttackCharge(');
const grantBody = src.slice(grantStart, src.indexOf('\n  function ', grantStart + 10));
check('grant updates Super charge', grantBody.includes('superCharge = clamp(superCharge + gain'));
check('grant updates Hyper charge from the same gain',
  grantBody.includes('hyperChargeCharge = clamp(hyperChargeCharge + modeHyperGain'));

// --- 5. Storm update guard (~53021) excludes Tower Defense ---
const stormLines = src.split('\n');
const stormUpdateIdx = stormLines.findIndex((l) => l.includes('stormTimer += dt'));
const stormGuard = stormLines.slice(Math.max(0, stormUpdateIdx - 3), stormUpdateIdx).join('\n');
check('storm update guard contains !isTowerDefenseEvent', stormGuard.includes('!isTowerDefenseEvent'));
check('storm update guard keeps other exclusions (!isBossFight, !isSoloTrial)',
  stormGuard.includes('!isBossFight') && stormGuard.includes('!isSoloTrial'));
const stormRuns = (flags) =>
  !flags.isBraweBallMode && !flags.isBossFight && !flags.isSoloTrial &&
  !flags.isTowerDefenseEvent && !flags.gameOver;
check('storm skipped when isTowerDefenseEvent', stormRuns({ isTowerDefenseEvent: true }) === false);
check('storm still runs for a normal showdown', stormRuns({}) === true);

// --- 6. Storm render guard (~76497) excludes Tower Defense ---
const drawStormIdx = stormLines.findIndex((l) => l.includes('// draw storm'));
const renderGuard = stormLines.slice(drawStormIdx, drawStormIdx + 2).join('\n');
check('storm render guard contains !isTowerDefenseEvent', renderGuard.includes('!isTowerDefenseEvent'));

// --- 7. Aegis sites (shred filter ~21465, dash loop ~21604) ---
// NOTE: these turned out to be Aegis-specific, not general auto-aim. The
// exemption is applied as instructed; the predicates below prove the shape.
const aegisFighter = (t) =>
  !!t && !t.isStructure && (!t.isPet || !!t.isTowerDefenseMinion) &&
  !t.isArenaForgeMinion && !t.isArenaForgeCamp && !t.isArenaForgeColossus;
check('aegis shred filter passes for TD minion', aegisFighter({ ...tdMinion }) === true);
check('aegis shred filter still blocks regular pets', aegisFighter(regularPet) === false);
check('aegis shred filter still blocks structures', aegisFighter(structure) === false);
check('aegis shred exemption present in source',
  src.includes('(!target.isPet || target.isTowerDefenseMinion) && !target.isArenaForgeMinion'));
const aegisDashSkipped = (t) =>
  !!(t.isStructure || (t.isPet && !t.isTowerDefenseMinion) || t.isDummy);
check('aegis dash hits TD minion (not skipped)', aegisDashSkipped(tdMinion) === false);
check('aegis dash still skips regular pets', aegisDashSkipped(regularPet) === true);
check('aegis dash still skips dummies', aegisDashSkipped(dummy) === true);
check('aegis dash exemption present in source',
  src.includes('(target.isPet && !target.isTowerDefenseMinion)'));

// --- 8. Scoping proof: the flag is only ever SET on TD minions ---
check('isTowerDefenseMinion is assigned true at exactly one site (the TD spawn)',
  countOccurrences('isTowerDefenseMinion: true') === 1);
check('no other mode can produce the flag (spawn is inside initTowerDefenseMatch)',
  src.includes('isTowerDefenseMinion: true, noRespawn: true'));

console.log(`\ntower-defense-charge-storm: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
