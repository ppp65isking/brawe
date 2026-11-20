// Kit descriptions for Rager + Outlit (2026-11-19, Anthony's order):
// "Yeah write them in the next update" — the 6 slots phase 3 found bare
// (Rager g1/g2/sp1/sp2, Outlit g1/g2) now carry parenthetical descriptions
// in brawlerData, drafted ONLY from what the code actually does.
// Rager G1: executeRagerG1 is a 360-degree cleave, 950 damage, knockback.
// Rager G2: executeRagerG2 gives allies +20% speed (hcSpd *= 1.20) for 3s
// and +30 Super charge. Rager SP1: timber bursts into 4 cardinal splinter
// darts on hit, 650 damage each. Rager SP2: while inside the totem, 40% of
// damage dealt heals the owner (doHeal(owner, dealtDamage * 0.40)).
// Outlit G1: the next shot's pellets pierce (outlitPierce). Outlit G2:
// deploys a healing pod, 2250 HP, that heals nearby allies.
// NOTE: the slotDesc table's Outlit texts ("attacks return once", "+1500 HP
// and 30% larger heal range") were NOT mirrored — they describe the retired
// attachie boosts (hasEntityAttachie() always returns false), so those
// effects never happen in-game. The strings below describe the base gadgets.
// Text only: no behavior, numbers, or mechanics changed anywhere.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- The 6 new strings, exact, in brawlerData ---
const expected = [
    ['rager', 'g1', 'Cleave Timber', '360° cleave around you, 950 damage + knockback'],
    ['rager', 'g2', 'Battle Cry', 'Allies gain +20% speed and +30% Super charge for 3s'],
    ['rager', 'sp1', 'Splinter Shrapnel', 'Timber bursts into 4 splinter darts on hit, 650 damage each'],
    ['rager', 'sp2', 'Bloodlust Resurgence', 'Heal 40% of damage dealt while inside your totem'],
    ['outlit', 'g1', 'Next Shot Pierce', 'Next shot pierces enemies'],
    ['outlit', 'g2', 'Healing Pod', 'Deploy a 2250 HP pod that heals nearby allies'],
];
for (const [bid, slot, name, desc] of expected) {
    check(`${bid} ${slot} reads "${name} (${desc})" in game.js`,
        game.includes(`${name} (${desc})`));
}

// --- The real kitSplit parses all 6 into name + non-empty desc ---
const km = game.match(/const kitSplit = \(raw\) => \{[\s\S]*?\n    \};/);
check('kitSplit extracts cleanly for execution', !!km);
if (km) {
    const kitSplit = eval(`(${km[0].replace('const kitSplit = ', '').replace(/;\s*$/, '')})`);
    for (const [bid, slot, name, desc] of expected) {
        const got = kitSplit(`${name} (${desc})`);
        check(`kitSplit: ${bid} ${slot} -> name "${name}" + desc`,
            got.name === name && got.desc === desc);
    }
    // --- No other brawlerData kit strings changed (count check) ---
    // brawlerData holds 104 brawlers x 4 kit slots = 416. Before this change
    // 410 carried a description and these 6 were bare; now all 416 do.
    const start = game.indexOf('const brawlerData = {');
    const endMark = '\n  };\n    // Player-facing BRAWE vocabulary';
    const end = game.indexOf(endMark, start);
    check('brawlerData block extracts cleanly', start !== -1 && end !== -1);
    if (start !== -1 && end !== -1) {
        const block = game.slice(start, end);
        const fields = [...block.matchAll(/\b(g1|g2|sp1|sp2)\s*:\s*'((?:[^'\\]|\\.)*)'/g)];
        check('brawlerData has exactly 416 kit slots (104 brawlers x 4)', fields.length === 416);
        let withDesc = 0, bare = 0;
        for (const [, , value] of fields) {
            if (kitSplit(value).desc) withDesc++;
            else bare++;
        }
        check('all 416 kit slots now carry a description', withDesc === 416);
        check('zero bare kit slots remain in brawlerData', bare === 0);
    }
}

// --- Scope guard: description strings only, nothing else moved ---
check('rager entry still has its 4 bare-name-free kit fields only changed in text',
    game.includes("g1: 'Cleave Timber (360° cleave around you, 950 damage + knockback)'"));
check('outlit sp1/sp2 untouched (Shell Chill / Long Boom as before)',
    game.includes("sp1: 'Shell Chill (Slows)', sp2: 'Long Boom (+35% Super Range)'"));

console.log(`kit-descriptions: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
