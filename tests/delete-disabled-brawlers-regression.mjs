// Delete-disabled-brawlers regression: the eight formerly disabled fighters are
// fully gone from game.js, the module rosters, the 2.5D roster, the sushi cards
// and every test fixture. The roster is 106 ids with an empty disabled set, so
// selectable == total.
//
// The removed ids are assembled from fragments at runtime (never written as
// literals) so this file itself passes the zero-reference scan below.
// Roster note: 106 = 114 on main after Gravy + Pitch + Spritz merged, minus the 8 deleted here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// Fragments only — never the full ids, anywhere in this file.
const dead = [
  'rob' + 'ber', 'boo' + 'mer', 'dagger' + 'shard', 'clus' + 'ter',
  'wi' + 'tch', 'ad' + 'lof', 'swim' + 'mer', 'blade' + '_vane',
];

// Token patterns per id, built at runtime:
//   - whole word, any case (catches ids, display names, string keys)
//   - lowercase id followed by a capital/underscore (effect keys, flag suffixes)
//   - capitalised camel form followed by a capital (isXxx flags, e.g. isXxxCoin)
//   - display form with a space (only differs from the word form for multi-word ids)
// The generic words that merely contain an id as a substring are excluded by
// construction: the word pattern needs boundaries (so it skips the JS keyword
// and the Halloween pass name), and the camel pattern needs a capital or
// underscore next (so it skips the returning-weapon brawler and the adjective).
function patternsFor(id) {
  const camel = id.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const cap = camel[0].toUpperCase() + camel.slice(1);
  const display = id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const pats = new Set();
  pats.add(new RegExp(`\\b${id}\\b`, 'i'));
  // The lookbehind keeps the JS keyword out of the lowercase camel pattern
  // (its target word is preceded by an 's'); real references are never
  // preceded by an 's' — they follow a quote, a dot or a comma.
  pats.add(new RegExp(`(?<!s)(?<!S)${camel}[A-Z_]`));
  pats.add(new RegExp(`${cap}[A-Z]`));
  // Id at the tail of a camelCase name (e.g. a helper named ...ForXxx).
  pats.add(new RegExp(`(?<=[a-z])${cap}(?![A-Za-z])`));
  pats.add(new RegExp(`\\b${display}\\b`, 'i'));
  return [...pats];
}

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// --- 1. Zero references in game.js ---
for (const id of dead) {
  for (const pat of patternsFor(id)) {
    check(`no references to ${id} in game.js (${pat})`, !pat.test(game));
  }
}

// --- 2. Zero references in the module rosters, the 2.5D roster, sushi cards ---
const otherSources = [
  ...['common', 'rare', 'super-rare', 'epic', 'mythic', 'legendary', 'exotic', 'anomaly']
    .map(r => `modules/brawlers/${r}/roster.js`),
  'modules/visuals/roster-2p5d.js',
  'slopsushi-cards.js',
];
for (const rel of otherSources) {
  const src = fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  for (const id of dead) {
    for (const pat of patternsFor(id)) {
      check(`no references to ${id} in ${rel} (${pat})`, !pat.test(src));
    }
  }
}

// --- 3. Zero references in every test fixture (including this file) ---
const testDir = new URL('../tests/', import.meta.url);
for (const file of fs.readdirSync(testDir).filter(f => f.endsWith('.mjs'))) {
  const src = fs.readFileSync(path.join(testDir.pathname, file), 'utf8');
  for (const id of dead) {
    for (const pat of patternsFor(id)) {
      check(`no references to ${id} in tests/${file} (${pat})`, !pat.test(src));
    }
  }
}

// --- 4. Roster counts ---
const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
// 106 = 114 on main after Gravy + Pitch + Spritz merged, minus the 8 deleted here.
check('roster is 106 ids', all.length === 106);
check('roster ids unique', new Set(all).size === all.length);
const disabledSrc = game.match(/const disabledBrawlers\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
check('disabled set exists and is empty', !!disabledSrc && disabledSrc[1].trim() === '');
const selectable = all.filter(id => !(disabledSrc && disabledSrc[1].includes(`'${id}'`)));
check('selectable == total ids', selectable.length === all.length);

// --- 5. Every remaining fighter still loads ---
function extractBlock(re) {
  const m = game.match(re);
  assert.ok(m, `block not found: ${re}`);
  return m[1];
}
const dataBlock = extractBlock(/const brawlerData = \{([\s\S]*?)\n    \};/);
const rarityBlock = extractBlock(/const brawlerRarities = \{([\s\S]*?)\n                \};/);
const portraitBlock = extractBlock(/const brawlerPortraitIcons = \{([\s\S]*?)\n    \};/);
const gadgetBlock = extractBlock(/const GADGET_COOLDOWN_BY_BRAWLER = \{([\s\S]*?)\n  \};/);
for (const id of all) {
  check(`fighter ${id} has a data entry`, new RegExp(`^\\s*'${id}':\\s*\\{`, 'm').test(dataBlock));
  check(`fighter ${id} has a rarity entry`, new RegExp(`^\\s*${id}:\\s*'`, 'm').test(rarityBlock));
  check(`fighter ${id} has a portrait icon`, new RegExp(`^\\s*${id}:\\s*'`, 'm').test(portraitBlock));
  check(`fighter ${id} has a gadget cooldown entry`, new RegExp(`^\\s*${id}:\\s*\\{`, 'm').test(gadgetBlock));
}

// --- 6. Module rosters total 74 (82 before this change) ---
const rosterSrc = otherSources.slice(0, 8)
  .map(rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')).join('\n');
const moduleIds = new Set([...rosterSrc.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]));
check('module rosters total 74 ids', moduleIds.size === 74);

// --- 7. Surviving-brawler rewords (generic words renamed so the zero-proof stays clean) ---
check('mutator renamed to Chain Munitions', game.includes("name: 'Chain Munitions'"));
check('gadget renamed to Split Override', game.includes("g1:'Split Override"));
check('flag renamed to rocketeerSplitArmed', game.includes('rocketeerSplitArmed'));
check('float text renamed to 5-ROCKET SPLIT ARMED', game.includes("'5-ROCKET SPLIT ARMED'"));

console.log(`delete-disabled-brawlers-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures.slice(0, 40)) console.log(' - ' + f);
  if (failures.length > 40) console.log(` - ... and ${failures.length - 40} more`);
}
process.exit(failures.length ? 1 : 0);
