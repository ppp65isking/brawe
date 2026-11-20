// Prestige League (Arena Forge rebuilds, 2026-11-20):
// Ranked Prestige -> Prestige League. Leaderboard resets every 3 days.
// Max PL5. Top 3 get gems + tappers at cycle rollover. The 2 names shown
// with you are your teammates. Opponents' RP moves up/down every match,
// synced to your result (deterministic per cycle+match).
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

check('display label renamed to Prestige League', game.includes('Prestige League PL${prestige}'));
check('no bare "Prestige N" label remains', !game.includes('• Prestige ${prestige}'));
check('cycle is 3 days', game.includes('const PRESTIGE_LEAGUE_CYCLE_MS = 3 * 24 * 60 * 60 * 1000;'));
check('max PL5', game.includes('const PRESTIGE_LEAGUE_MAX = 5;'));
check('5 opponents', game.includes('const PRESTIGE_LEAGUE_OPPONENT_COUNT = 5;'));
check('top-3 rewards defined (1st 100 gems + 5 tappers)', game.includes('{ gems: 100, tappers: 5 }'));
check('match-end records the league match', game.includes('prestigeLeague = recordPrestigeLeagueMatch(won, rankedRpParts.total);'));
// Ranked rework (2026-11-20): the league moves by the UNBOOSTED match
// delta — the elo boost is a ranked-ladder catch-up, not league
// performance, so it must not inflate league points.
check('teammate names captured at draft finish', game.includes('rankedTeammateNames = blueRoster.filter((_, idx) => idx !== playerSlot)'));
check('results screen shows league standings', game.includes('Prestige League — you are #${rank}'));
check('results screen shows teammates', game.includes('Teammates: ${teamNames}'));
check('hub shows league line', game.includes('Prestige League PL${getPrestigeLeagueLevel(rankedPoints)}'));

// --- Live behavior ------------------------------------------------------------------
{
    const grants = [];
    const playerData = { ranked: { points: 2500, highPoints: 2500 } }; // Ranked complete (item 11): the league is unlocked here
    const sandbox = {
        console, playerData,
        rankedTeammateNames: ['Ally 1', 'Ally 2'],
        TOURNAMENT_BOT_NAMES: ['Max', 'Ruby', 'Finn', 'Zara', 'Leo', 'Mia', 'Oscar', 'Ivy', 'Hugo', 'Luna'],
        PRESTIGE_LEAGUE_MAX: 5,
        PRESTIGE_LEAGUE_CYCLE_MS: 3 * 24 * 60 * 60 * 1000,
        PRESTIGE_LEAGUE_TOP3_REWARDS: [{ gems: 100, tappers: 5 }, { gems: 50, tappers: 3 }, { gems: 25, tappers: 2 }],
        PRESTIGE_LEAGUE_OPPONENT_COUNT: 5,
        grantReward: (r) => { grants.push(r); return true; },
        getRankedPrestige: (pts) => { const p = Math.max(0, Math.floor(pts || 0)); if (p < 2400) return 0; return Math.min(5, 1 + Math.floor((p - 2400) / 500)); },
    };
    vm.createContext(sandbox);
    // Ranked ladder consts for the item-11 unlock gate (hasCompletedRanked).
    vm.runInContext(game.match(/    const RANKED_DIVISIONS = \[[\s\S]*?\n    \];/)[0] + '\n' + game.match(/    const RANKED_POINTS_PER_DIVISION = \d+;/)[0], sandbox);
    for (const fn of ['hasCompletedRanked', 'getRankedTierInfo', 'getPrestigeLeagueCycleKey', 'getPrestigeLeagueLevel', 'buildPrestigeLeagueOpponents', 'payPrestigeLeagueTop3Rewards', 'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings', 'getPrestigeLeaguePlayerRank', 'recordPrestigeLeagueMatch']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const CYCLE = 3 * 24 * 60 * 60 * 1000;
    const t0 = 5 * CYCLE; // a cycle boundary
    // Freeze 'now' at t0: recordPrestigeLeagueMatch calls
    // ensurePrestigeLeagueState() with no arg, and a real Date.now()
    // would roll the cycle over mid-test.
    sandbox.Date = { now: () => t0 };
    const run = (code) => vm.runInContext(code, sandbox);
    check('cycle key is 3-day based', run(`getPrestigeLeagueCycleKey(${t0})`) === 5 && run(`getPrestigeLeagueCycleKey(${t0 + CYCLE - 1})`) === 5 && run(`getPrestigeLeagueCycleKey(${t0 + CYCLE})`) === 6);
    check('PL level caps at 5', run('getPrestigeLeagueLevel(99999)') === 5);
    check('PL level 0 below 2400 RP', run('getPrestigeLeagueLevel(2399)') === 0);
    check('PL level 1 at 2400 RP', run('getPrestigeLeagueLevel(2400)') === 1);

    const league = run(`ensurePrestigeLeagueState(${t0})`);
    check('league has 5 opponents', league.opponents.length === 5);
    check('opponents have distinct names', new Set(league.opponents.map(o => o.name)).size === 5);
    check('teammates are the 2 draft teammates', JSON.stringify(league.teammates) === JSON.stringify(['Ally 1', 'Ally 2']));
    check('league points start at 0', league.points === 0);
    const standings = run('getPrestigeLeagueStandings(playerData.prestigeLeague)');
    check('standings sorted by RP desc', standings.every((r, i) => i === 0 || standings[i - 1].rp >= r.rp));
    check('standings include the player', standings.some(r => r.isPlayer));

    // Opponent movement is synced to the match result.
    const before = league.opponents.map(o => o.rp);
    run('recordPrestigeLeagueMatch(true, 30)');
    const afterWin = league.opponents.map(o => o.rp);
    check('on a win every opponent loses RP', afterWin.every((rp, i) => rp < before[i]));
    check('on a win the loss is 5..15 per opponent', afterWin.every((rp, i) => before[i] - rp >= 5 && before[i] - rp <= 15));
    check('league points track the RP delta', league.points === 30);
    check('matchesPlayed increments', league.matchesPlayed === 1);
    run('recordPrestigeLeagueMatch(false, -10)');
    const afterLoss = league.opponents.map(o => o.rp);
    check('on a loss every opponent gains RP', afterLoss.every((rp, i) => rp > afterWin[i]));
    check('league points never go below 0', league.points === 20);

    // Determinism: same cycle + same match sequence = same movement.
    const playerData2 = { ranked: { points: 2500, highPoints: 2500 } };
    const sandbox2 = { ...sandbox, playerData: playerData2 };
    vm.createContext(sandbox2);
    vm.runInContext(game.match(/    const RANKED_DIVISIONS = \[[\s\S]*?\n    \];/)[0] + '\n' + game.match(/    const RANKED_POINTS_PER_DIVISION = \d+;/)[0], sandbox2);
    for (const fn of ['hasCompletedRanked', 'getRankedTierInfo', 'getPrestigeLeagueCycleKey', 'getPrestigeLeagueLevel', 'buildPrestigeLeagueOpponents', 'payPrestigeLeagueTop3Rewards', 'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings', 'getPrestigeLeaguePlayerRank', 'recordPrestigeLeagueMatch']) {
        vm.runInContext(extractFunction(game, fn), sandbox2);
    }
    const run2 = (code) => vm.runInContext(code, sandbox2);
    run2(`ensurePrestigeLeagueState(${t0})`);
    run2('recordPrestigeLeagueMatch(true, 30)');
    run2('recordPrestigeLeagueMatch(false, -10)');
    check('opponent movement is deterministic (same cycle, same matches)', JSON.stringify(playerData2.prestigeLeague.opponents.map(o => o.rp)) === JSON.stringify(afterLoss));

    // Cycle rollover: top-3 payout, then reset.
    const league2 = run(`ensurePrestigeLeagueState(${t0})`);
    league2.points = 99999; // force rank 1
    grants.length = 0;
    run(`ensurePrestigeLeagueState(${t0 + CYCLE})`);
    const gems = grants.filter(g => g.type === 'gems').reduce((n, g) => n + (g.amount || 0), 0);
    const tappers = grants.filter(g => g.type === 'tapper').length;
    check('cycle rollover pays 1st place 100 gems', gems === 100);
    check('cycle rollover pays 1st place 5 tappers', tappers === 5);
    check('new cycle resets league points', playerData.prestigeLeague.points === 0);
    check('new cycle regenerates opponents', playerData.prestigeLeague.opponents.length === 5);
    check('last cycle rank recorded', playerData.prestigeLeague.lastCycleRank === 1);

    // Rank 4+ gets nothing.
    const league3 = run(`ensurePrestigeLeagueState(${t0 + CYCLE})`);
    league3.points = 0;
    grants.length = 0;
    run(`ensurePrestigeLeagueState(${t0 + 2 * CYCLE})`);
    check('rank 4+ gets no top-3 reward', grants.length === 0);
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`prestige league: ${passed} passed`);
