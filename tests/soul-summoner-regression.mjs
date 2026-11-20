// Soul summoner rebuild (Arena Forge rebuilds, 2026-11-20):
// Constellation is now a plain soul summoner — no milestone rewards, a
// summon offers 3 RANDOM brawlers from the whole locked roster (no rarity
// lock, no reroll). Summon costs per brawler rarity are unchanged.
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

// Roster spanning rarities; only 'outlit' (Starter) is unlocked.
const RARITY = { outlit: 'Starter', echo: 'Rare', trapper: 'Epic', dashaholic: 'Mythic', copyphase: 'Exotic', decayer: 'Unique', crystila: 'Anomaly' };
function makeSandbox() {
    const playerData = { souls: 0, soulSummoner: { currentChoices: null, targetBrawler: null }, unlockedBrawlers: { outlit: true } };
    const sandbox = {
        console, playerData,
        allBrawlers: Object.keys(RARITY),
        getBrawlerRarity: (id) => RARITY[id] || 'Rare',
        disabledBrawlers: new Set(),
        brawlerData: {},
        isBrawlerUnlocked: (id) => !!playerData.unlockedBrawlers[id],
        ensureSoulSummonerData: () => { if (!playerData.soulSummoner) playerData.soulSummoner = {}; },
        saveProgress: () => {},
    };
    vm.createContext(sandbox);
    for (const fn of ['getOrGenerateCurrentChoices', 'rerollCurrentChoices', 'claimConstellationMilestone']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    return { sandbox, playerData };
}

{
    const { sandbox, playerData } = makeSandbox();
    const run = (code) => vm.runInContext(code, sandbox);
    const locked = Object.keys(RARITY).filter(id => id !== 'outlit');
    // Choices: 3 random locked brawlers, all from the locked pool.
    const seenRarities = new Set();
    let allValid = true;
    for (let i = 0; i < 25; i++) {
        playerData.soulSummoner.currentChoices = null;
        playerData.soulSummoner.targetBrawler = null;
        const choices = run('getOrGenerateCurrentChoices(3)');
        if (!Array.isArray(choices) || choices.length !== 3) { allValid = false; break; }
        if (new Set(choices).size !== 3) { allValid = false; break; }
        if (!choices.every(c => locked.includes(c))) { allValid = false; break; }
        choices.forEach(c => seenRarities.add(RARITY[c]));
    }
    check('summon offers 3 distinct locked brawlers', allValid);
    check('no rarity lock: offers span multiple rarities', seenRarities.size >= 3);
    // No reroll: rerollCurrentChoices returns the SAME 3 choices.
    playerData.soulSummoner.currentChoices = null;
    const first = run('getOrGenerateCurrentChoices(3)');
    const rerolled = run('rerollCurrentChoices()');
    check('reroll returns the same choices (no reroll)', JSON.stringify(rerolled) === JSON.stringify(first));
    // No milestone rewards, ever.
    check('claimConstellationMilestone never grants', run("claimConstellationMilestone('Rare')") === false && run("claimConstellationMilestone('Anomaly')") === false);
    // Souls -> Soul Water path still exists (all-unlocked conversion).
    check('routeExcessSoulsToWater still present', game.includes('function routeExcessSoulsToWater()'));
    check('addSouls still splits to Soul Bank/Water when roster complete', game.includes('All brawlers unlocked – split 25% bank / 75% water'));
}

// --- Source pins -----------------------------------------------------------
check('no milestoneReward anywhere in game.js', !game.includes('milestoneReward'));
check('no REROLL OPTIONS button in summoner UI', !game.includes('REROLL OPTIONS'));
check('no "Summon + reroll" label', !game.includes('Summon + reroll'));
check('choices no longer filtered by constellation tier', !game.includes('availableInTier'));
check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`soul summoner rebuild: ${passed} passed`);
