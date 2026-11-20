// Souls -> Soul Water when all unlocked (Arena Forge rebuilds, 2026-11-20):
// addSouls splits 25% Soul Bank / 75% Soul Water once the roster is
// complete; routeExcessSoulsToWater moves leftover souls 100% to water.
// grantReward's souls arm routes through addSouls, so every reward path
// converts. No code change in this stage — this suite pins the wiring.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    let par = src.indexOf('(', start), pdepth = 0, pi = par;
    for (; pi < src.length; pi++) { if (src[pi] === '(') pdepth++; else if (src[pi] === ')') { pdepth--; if (pdepth === 0) break; } }
    const open = src.indexOf('{', pi);
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (line) { if (ch === '\n') line = false; i++; continue; }
        if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
        if (inS) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++; continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i++; continue; }
        if (ch === '/' && nxt === '*') { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in ${name}`);
}

check('addSouls splits when the roster is complete', game.includes('// All brawlers unlocked – split 25% bank / 75% water'));
check('routeExcessSoulsToWater exists', game.includes('function routeExcessSoulsToWater()'));
check('excess route moves leftovers 100% to water', game.includes('playerData.soulSummoner.soulWater = (playerData.soulSummoner.soulWater || 0) + excess;'));
check('excess route is called after the final unlock', game.includes('routeExcessSoulsToWater();'));
check('grantReward souls arm routes through addSouls', game.includes("if (typeof addSouls === 'function') addSouls(amount);"));
check('soul costs unchanged by the rebuild', game.includes('SOUL_UNLOCK_COST_BY_RARITY'));

{
    const unlocked = new Set(['outlit', 'a', 'b']);
    const playerData = { souls: 0, soulSummoner: {}, brawlers: {} };
    const waterChecks = [];
    const autoSpends = [];
    const sandbox = {
        console, playerData,
        allBrawlers: ['outlit', 'a', 'b', 'c'],
        disabledBrawlers: new Set(),
        isBrawlerUnlocked: (id) => unlocked.has(id),
        autoSpendSoulsOnTarget: () => { autoSpends.push(1); },
        checkSoulWaterRewards: () => { waterChecks.push(1); },
        saveProgress: () => {},
    };
    vm.createContext(sandbox);
    for (const fn of ['ensureSoulSummonerData', 'addSouls', 'routeExcessSoulsToWater']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const run = (code) => vm.runInContext(code, sandbox);

    // Roster incomplete (c locked): souls bank as souls, auto-spend runs.
    run('addSouls(100)');
    check('roster incomplete: souls go to the soul balance', playerData.souls === 100);
    check('roster incomplete: auto-spend runs', autoSpends.length === 1);
    check('roster incomplete: no water yet', (playerData.soulSummoner.soulWater || 0) === 0);

    // Roster complete: 25% bank / 75% water.
    unlocked.add('c');
    run('addSouls(100)');
    check('roster complete: souls balance untouched', playerData.souls === 100);
    check('roster complete: 25% goes to the Soul Bank', playerData.soulSummoner.soulBank === 25);
    check('roster complete: 75% goes to Soul Water', playerData.soulSummoner.soulWater === 75);
    check('roster complete: water rewards checked', waterChecks.length === 1);
    run('addSouls(7)');
    check('split rounds down on the bank share (7 -> 1 bank / 6 water)', playerData.soulSummoner.soulBank === 26 && playerData.soulSummoner.soulWater === 81);

    // Leftover souls route 100% to water.
    const moved = run('routeExcessSoulsToWater()');
    check('excess route moves the whole leftover balance', moved === 100 && playerData.souls === 0);
    check('excess route adds 100% to water (not the 25/75 split)', playerData.soulSummoner.soulWater === 181 && playerData.soulSummoner.soulBank === 26);
    check('excess route with nothing left returns 0', run('routeExcessSoulsToWater()') === 0);
    check('addSouls ignores zero/negative amounts', (() => { run('addSouls(0)'); run('addSouls(-50)'); return playerData.soulSummoner.soulWater === 181; })());
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`souls to soul water: ${passed} passed`);
