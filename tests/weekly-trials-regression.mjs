// Weekly Trials rebuild (Arena Forge rebuilds, 2026-11-20):
// 2 trial fighters per week (was 3). Trials lock Power 11. Owned trial
// brawlers are upgradeable from their permanent progress; unowned trials
// stay play-only at Power 11.
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

check('trial count is 2 per week', game.includes('const WEEKLY_TRIAL_FIGHTER_COUNT = 2;'));
check('trial state uses the count const', game.includes('pickWeeklyTrialFighters(pool, WEEKLY_TRIAL_FIGHTER_COUNT,week.key)'));
check('no 3-fighter trial pick remains', !game.includes('fallbackSpecials ? 2 : 3'));
check('owned trial brawlers upgrade (action guard)', game.includes('if (isWeeklyTrialBrawler(id) && !trialOwned) return;'));
check('owned trial upgrade uses permanent progress', game.includes('const pData = trialOwned ? getOrCreateProgress(id) : getEffectiveBrawlerProgress(id);'));
check('detail upgrade button distinguishes owned trials', game.includes("else if (trial && !trialOwned) { upgLabel = 'WEEKLY TRIAL'; upgDisabled = true; }"));
check('trial Power 11 lock kept (effective progress forces 11)', game.includes('return {...base,...loadout,level:11,gadgetUnlocked:true,starPowerUnlocked:true,hyperchargeUnlocked:true};'));

// --- Live behavior: 2 picks, Power 11 lock, stable within a week -----------
{
    const playerData = { weeklyTrials: null, unlockedBrawlers: {}, brawlers: {} };
    const sandbox = {
        console, playerData,
        allBrawlers: ['a', 'b', 'c', 'd', 'e'],
        disabledBrawlers: new Set(),
        brawlerData: { a: {}, b: {}, c: {}, d: {}, e: {} },
        MAX_POWER_LEVEL: 12,
        WEEKLY_TRIAL_FIGHTER_COUNT: 2,
        TRINKET_DEFS: [],
        getOrCreateProgress: (id) => (playerData.brawlers[id] ||= { level: 1, gadgetUnlocked: false, starPowerUnlocked: false, hyperchargeUnlocked: false, selectedGadget: 'g1', selectedStar: 'slow' }),
        getSpecialAbilityDef: () => null,
        hashShopKey: (s) => [...s].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 7),
        saveProgress: () => {},
    };
    vm.createContext(sandbox);
    for (const fn of ['getWeeklyTrialWeekInfo', 'isPermanentlyMaxedBrawler', 'pickWeeklyTrialFighters', 'ensureWeeklyTrialState', 'isWeeklyTrialBrawler', 'getEffectiveBrawlerProgress']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const run = (code) => vm.runInContext(code, sandbox);
    const state = run('ensureWeeklyTrialState()');
    check('exactly 2 trial fighters this week', state.fighterIds.length === 2);
    check('trial fighters are distinct', new Set(state.fighterIds).size === 2);
    const trialId = state.fighterIds[0];
    check('trial brawler is detected as trial', run(`isWeeklyTrialBrawler('${trialId}')`) === true);
    check('trial brawler plays at Power 11', run(`getEffectiveBrawlerProgress('${trialId}').level`) === 11);
    check('trial brawler has full kit at Power 11', (() => { const p = run(`getEffectiveBrawlerProgress('${trialId}')`); return p.gadgetUnlocked && p.starPowerUnlocked && p.hyperchargeUnlocked; })());
    check('non-trial brawler is not a trial', run("isWeeklyTrialBrawler('e')") === false || state.fighterIds.includes('e') === false);
    check('same week returns the same 2 trials', JSON.stringify(run('ensureWeeklyTrialState().fighterIds')) === JSON.stringify(state.fighterIds));
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`weekly trials rebuild: ${passed} passed`);
