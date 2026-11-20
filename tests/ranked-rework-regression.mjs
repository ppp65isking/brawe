// Ranked rework (Arena Forge rebuilds, 2026-11-20):
// RP from mode + kills + damage + objective + win. Shorter draft (4 bans,
// 250ms bot turns). Auto-scroll-up bug fixed. New end screen with the RP
// breakdown. Old Ranked Pass deleted outright.
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

// --- Old Ranked Pass is gone ---------------------------------------------------
check('no Ranked Pass XP accrual', !game.includes('rankedPassXpGained'));
check('no RANKED_PASS_REWARDS table', !game.includes('RANKED_PASS_REWARDS'));
check('no RANKED_PASS_TIERS const', !game.includes('RANKED_PASS_TIERS'));
check('no RANKED_PASS_XP_PER_TIER const', !game.includes('RANKED_PASS_XP_PER_TIER'));
check('no RANKED_WEEKLY_PASS_XP_CAP const', !game.includes('RANKED_WEEKLY_PASS_XP_CAP'));
check('no weeklyPassXp arms', !game.includes('weeklyPassXp'));
check('no weeklyMaxed arms', !game.includes('weeklyMaxed'));
check('no weeklyMaxClaimed arms', !game.includes('weeklyMaxClaimed'));
check('no pass XP in the rank text', !game.includes('Pass XP`'));

// --- Shorter draft ---------------------------------------------------------------
check('ban schedule is 4 steps (no 2/2 leader bans)', !game.includes('Ban 1/2') && !game.includes('Ban 2/2'));
check('ban schedule has Blue Ldr Ban', game.includes("title: 'Blue Ldr Ban'"));
check('ban schedule has Blue Mem 1 Ban', game.includes("title: 'Blue Mem 1 Ban'"));
check('no Member 2 ban step', !game.includes("title: 'Blue Mem 2 Ban'") && !game.includes("title: 'Red Mem 2 Ban'"));
check('stepper protect is step 4', game.includes("draftState === 'protect' ? 4"));
check('stepper pick base is 5', game.includes("draftState === 'pick' ? (5 + currentPickIndex)"));
check('stepper swap is 11', game.includes("draftState === 'swap' ? 11"));
check('stepper veto is 12', game.includes("draftState === 'veto' ? 12"));
check('stepper ready is 13', game.includes("draftState === 'veto' ? 12 : 13"));
check('bot draft turns default to 250ms', game.includes('const scheduleNextTurn = (delay = 250)'));
check('no 450/500ms draft delays remain', !game.includes('scheduleNextTurn(450)') && !game.includes('scheduleNextTurn(500)'));
check('bans summary shows 2 per team', game.includes('Blue Bans (2):') && game.includes('Red Bans (2):'));

// --- Auto-scroll fix ---------------------------------------------------------------
check('renderGridOnly saves scrollTop', game.includes('const savedScrollTop = gridBox.scrollTop;'));
check('renderGridOnly restores scrollTop', game.includes('gridBox.scrollTop = savedScrollTop;'));

// --- RP breakdown end screen ---------------------------------------------------------
check('results card builds the RP breakdown', game.includes('Ranked RP breakdown (rebuild 2026-11-20)'));
check('breakdown shows mode line', game.includes('Mode (${getShowdownModeLabel(showdownMode)'));
check('breakdown shows takedowns line', game.includes('Takedowns (${matchKills})'));
check('breakdown shows damage line', game.includes('Damage (${Math.round(matchDamageDealt)'));
check('breakdown shows objective line', game.includes('Objective (${Math.round(matchObjectiveDamage)'));
check('MATCH DAMAGE is real now (ledger, not 0)', game.includes('const fullOnDamageEarned = matchDamageDealt;'));
check('match-end uses calcRankedRpGain', game.includes('rankedRpParts = calcRankedRpGain({ mode: showdownMode, kills: matchKills, damage: matchDamageDealt, objectiveDamage: matchObjectiveDamage, won, streak: playerData.ranked.winStreak || 0, mvp: isRankedMVP });'));
check('ledger resets when a match launches', game.includes('resetMatchRpLedger(); // Ranked RP ledger starts clean for this match'));
check('ledger counts player damage', game.includes('matchDamageDealt += dealtDamage;'));
check('ledger counts objective damage', game.includes('if (target && (target.isVault || target.isArenaForgeStructure)) matchObjectiveDamage += dealtDamage;'));
check('ledger counts kills', game.includes('matchKills += 1; // Ranked RP ledger'));

// --- calcRankedRpGain formula ---------------------------------------------------------
{
    const sandbox = { console, RANKED_RP_MODE_BASE: { arena_forge: 5, knock_donate: 0, brick_vault: 0 } };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'calcRankedRpGain'), sandbox);
    const calc = (args) => vm.runInContext(`calcRankedRpGain(${JSON.stringify(args)})`, sandbox);
    const base = { mode: 'knock_donate', kills: 0, damage: 0, objectiveDamage: 0, won: true, streak: 0, mvp: false };
    check('win with nothing else = +20', calc(base).total === 20);
    check('loss with nothing else = -10', calc({ ...base, won: false }).total === -10);
    check('Arena Forge mode adds +5', calc({ ...base, mode: 'arena_forge' }).total === 25);
    check('kills +2 each', calc({ ...base, kills: 3 }).killRp === 6);
    check('kills cap at +10', calc({ ...base, kills: 9 }).killRp === 10);
    check('damage +1 per 1000', calc({ ...base, damage: 4500 }).damageRp === 4);
    check('damage caps at +10', calc({ ...base, damage: 50000 }).damageRp === 10);
    check('objective +1 per 1000', calc({ ...base, objectiveDamage: 3000 }).objectiveRp === 3);
    check('objective caps at +5', calc({ ...base, objectiveDamage: 99999 }).objectiveRp === 5);
    check('streak +5 at 2 wins', calc({ ...base, streak: 2 }).streakRp === 5);
    check('streak +2 per extra win, capped at +15', calc({ ...base, streak: 10 }).streakRp === 15);
    check('no streak bonus on a loss', calc({ ...base, won: false, streak: 5 }).streakRp === 0);
    check('MVP +10 on a win, +5 on a loss', calc({ ...base, mvp: true }).mvpRp === 10 && calc({ ...base, won: false, mvp: true }).mvpRp === 5);
    check('full match sums every part', calc({ mode: 'arena_forge', kills: 4, damage: 6500, objectiveDamage: 2200, won: true, streak: 3, mvp: true }).total === 5 + 20 + 8 + 6 + 2 + 7 + 10);
    check('negative/undefined inputs clamp to 0', calc({ ...base, kills: -3, damage: -100, objectiveDamage: -50 }).killRp === 0 && calc({ ...base, kills: -3 }).damageRp === 0);
    check('3v3 forced Power 11 kept', game.includes('getEffectiveBrawlerProgress'));
}

check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`ranked rework: ${passed} passed`);
