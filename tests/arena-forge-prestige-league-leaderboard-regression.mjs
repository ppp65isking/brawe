// Prestige League leaderboard unlock (fixes round 2026-11-20, item 11):
// the leaderboard is REAL (bot names) and only unlocks after completing all
// of Ranked — reaching the top division, Brick Legend III (2400 RP, where
// PL1 also begins). Before that it stays locked and empty: no opponents,
// no standings, no payouts, and matches don't move it. The ranked hub shows
// a locked line with progress to Brick Legend III; once unlocked it shows
// the summary line plus a full 6-row leaderboard board. The results screen
// only shows the league block when unlocked.
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

// --- Static pins: the gate, the locked state, the hub board -----------------
check('unlock gate keys off the top Ranked division',
    game.includes('function hasCompletedRanked() {') &&
    game.includes('getRankedTierInfo(points).index >= RANKED_DIVISIONS.length - 1'));
check('locked league has no opponents or teammates',
    game.includes('league.locked = true;') &&
    game.includes('league.opponents = [];') &&
    game.includes('league.teammates = [];'));
check('locked matches are a no-op', game.includes('if (league.locked) return league;'));
check('hub shows a locked line with progress to Brick Legend III',
    game.includes('complete Ranked to unlock') && game.includes('RP to Brick Legend III'));
check('hub renders a full leaderboard board when unlocked',
    game.includes("leagueBoard.className = 'ranked-queue-league-board';") &&
    game.includes('PRESTIGE LEAGUE LEADERBOARD'));
check('results screen only shows the league when unlocked',
    game.includes('if (prestigeLeague && !prestigeLeague.locked) {'));
check('existing league rules untouched (3-day cycle, max PL5, 5 opponents)',
    game.includes('const PRESTIGE_LEAGUE_CYCLE_MS = 3 * 24 * 60 * 60 * 1000;') &&
    game.includes('const PRESTIGE_LEAGUE_MAX = 5;') &&
    game.includes('const PRESTIGE_LEAGUE_OPPONENT_COUNT = 5;'));
check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

// --- Live behavior: locked -> unlocked --------------------------------------
{
    const grants = [];
    const playerData = { ranked: { points: 1200, highPoints: 1200 } }; // mid-Ranked: locked
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
    vm.runInContext(game.match(/    const RANKED_DIVISIONS = \[[\s\S]*?\n    \];/)[0] + '\n' + game.match(/    const RANKED_POINTS_PER_DIVISION = \d+;/)[0], sandbox);
    for (const fn of ['hasCompletedRanked', 'getRankedTierInfo', 'getPrestigeLeagueCycleKey', 'getPrestigeLeagueLevel', 'buildPrestigeLeagueOpponents', 'payPrestigeLeagueTop3Rewards', 'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings', 'getPrestigeLeaguePlayerRank', 'recordPrestigeLeagueMatch']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const CYCLE = 3 * 24 * 60 * 60 * 1000;
    const t0 = 5 * CYCLE;
    sandbox.Date = { now: () => t0 };
    const run = (code) => vm.runInContext(code, sandbox);

    check('gate is false mid-Ranked (1200 RP)', run('hasCompletedRanked()') === false);
    const locked = run(`ensurePrestigeLeagueState(${t0})`);
    check('locked league reports locked', locked.locked === true);
    check('locked league has no opponents', locked.opponents.length === 0);
    check('locked league has no teammates', locked.teammates.length === 0);
    check('locked league points start at 0', locked.points === 0);
    const lockedStandings = run('getPrestigeLeagueStandings(playerData.prestigeLeague)');
    check('locked standings are just the player', lockedStandings.length === 1 && lockedStandings[0].isPlayer);
    run('recordPrestigeLeagueMatch(true, 30)');
    check('locked match does not move league points', playerData.prestigeLeague.points === 0);
    check('locked match does not build opponents', playerData.prestigeLeague.opponents.length === 0);
    check('locked match does not count as played', playerData.prestigeLeague.matchesPlayed === 0);
    grants.length = 0;
    run(`ensurePrestigeLeagueState(${t0 + CYCLE})`);
    check('locked cycle rollover pays nothing', grants.length === 0);
    check('locked league stays locked across cycles', playerData.prestigeLeague.locked === true);

    // Boundary: 2399 RP is still locked, 2400 RP (Brick Legend III) unlocks.
    playerData.ranked.points = 2399; playerData.ranked.highPoints = 2399;
    run(`ensurePrestigeLeagueState(${t0})`);
    check('gate is false at 2399 RP', run('hasCompletedRanked()') === false && playerData.prestigeLeague.locked === true);
    playerData.ranked.points = 2400; playerData.ranked.highPoints = 2400;
    check('gate is true at 2400 RP (Brick Legend III)', run('hasCompletedRanked()') === true);
    const unlocked = run(`ensurePrestigeLeagueState(${t0})`);
    check('unlocked league reports unlocked', unlocked.locked === false);
    check('unlocked league has 5 opponents', unlocked.opponents.length === 5);
    check('unlocked opponents have distinct bot names', new Set(unlocked.opponents.map(o => o.name)).size === 5);
    check('unlocked opponents are real bot names', unlocked.opponents.every(o => sandbox.TOURNAMENT_BOT_NAMES.includes(o.name)));
    check('unlocked teammates are the 2 draft teammates', JSON.stringify(unlocked.teammates) === JSON.stringify(['Ally 1', 'Ally 2']));
    const standings = run('getPrestigeLeagueStandings(playerData.prestigeLeague)');
    check('unlocked standings have 6 rows (you + 5 bots)', standings.length === 6);
    check('unlocked standings sorted by RP desc', standings.every((r, i) => i === 0 || standings[i - 1].rp >= r.rp));
    check('unlocked standings include the player', standings.some(r => r.isPlayer));
    run('recordPrestigeLeagueMatch(true, 25)');
    check('unlocked match moves league points', playerData.prestigeLeague.points === 25);
    check('unlocked match counts as played', playerData.prestigeLeague.matchesPlayed === 1);

    // The completing match itself unlocks: fresh locked league at 2399 RP,
    // then Ranked is completed (2400 RP, as match resolution updates
    // ranked.points before recordPrestigeLeagueMatch) and the match records.
    const playerData2 = { ranked: { points: 2399, highPoints: 2399 } };
    const sandbox2 = { ...sandbox, playerData: playerData2 };
    vm.createContext(sandbox2);
    vm.runInContext(game.match(/    const RANKED_DIVISIONS = \[[\s\S]*?\n    \];/)[0] + '\n' + game.match(/    const RANKED_POINTS_PER_DIVISION = \d+;/)[0], sandbox2);
    for (const fn of ['hasCompletedRanked', 'getRankedTierInfo', 'getPrestigeLeagueCycleKey', 'getPrestigeLeagueLevel', 'buildPrestigeLeagueOpponents', 'payPrestigeLeagueTop3Rewards', 'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings', 'getPrestigeLeaguePlayerRank', 'recordPrestigeLeagueMatch']) {
        vm.runInContext(extractFunction(game, fn), sandbox2);
    }
    const run2 = (code) => vm.runInContext(code, sandbox2);
    run2(`ensurePrestigeLeagueState(${t0})`);
    check('completing-match setup starts locked', playerData2.prestigeLeague.locked === true);
    playerData2.ranked.points = 2400; playerData2.ranked.highPoints = 2400;
    run2('recordPrestigeLeagueMatch(true, 25)');
    check('the completing match unlocks the league', playerData2.prestigeLeague.locked === false);
    check('the completing match builds 5 bot opponents', playerData2.prestigeLeague.opponents.length === 5);
    check('the completing match records league points', playerData2.prestigeLeague.points === 25);

    // Unlocked rollover still pays the top 3 (gate did not break payouts).
    const league2 = run(`ensurePrestigeLeagueState(${t0})`);
    league2.points = 99999;
    grants.length = 0;
    run(`ensurePrestigeLeagueState(${t0 + CYCLE})`);
    const gems = grants.filter(g => g.type === 'gems').reduce((n, g) => n + (g.amount || 0), 0);
    check('unlocked rollover still pays 1st place 100 gems', gems === 100);
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`prestige league leaderboard: ${passed} passed`);
