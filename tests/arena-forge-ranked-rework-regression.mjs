// Ranked rework (2026-11-20, Anthony's "11/20 Ranked Rework More Info"):
// 1. Ranked UI: RP progress bar with current league / halfway point / next
//    league — OR the Prestige League leaderboard when you are in Prestige
//    League, updating after every ranked match, with you + allies' names.
// 2. Ranked Seasons: Ranked resets every season, where "season" is the
//    current pass season. Soft reset from rank + gameplay stats + wins —
//    Prestige 5 resets to Prestige 3, never to Bronze — and resets grant
//    an elo boost until you get back to the rank you were at.
// The reset mapping and the elo boost amount are BUILDER PICKS (flagged in
// the report): prestige drops exactly 2 levels, everyone else 3 divisions;
// wins / win rate earn back up to 250 RP; prestige floor is Legend I
// (2200 RP); elo boost is x2 RP on wins. RP gain rules (mode + kills +
// damage + objective + win) and Prestige League payouts are UNCHANGED.
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
function extractConst(src, name) {
    const start = src.indexOf(`const ${name} =`);
    if (start === -1) throw new Error(`missing const ${name}`);
    let i = src.indexOf('=', start) + 1;
    while (src[i] === ' ' || src[i] === '\n') i++;
    const valStart = i;
    let dPar = 0, dBrk = 0, dBrc = 0, inS = null, esc = false, line = false, block = false;
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
        else if (ch === '(') dPar++;
        else if (ch === ')') dPar--;
        else if (ch === '[') dBrk++;
        else if (ch === ']') dBrk--;
        else if (ch === '{') dBrc++;
        else if (ch === '}') dBrc--;
        else if (ch === ';' && dPar === 0 && dBrk === 0 && dBrc === 0) return src.slice(valStart, i);
        i++;
    }
    throw new Error(`unbalanced const ${name}`);
}
const evalLiteral = (src) => vm.runInContext(`(${src})`, vm.createContext({}));

// --- static pins ------------------------------------------------------------
const hubSrc = extractFunction(game, 'openRankedHubOverlay');
check('ui: hub season label follows the live pass season (no hardcoded Season 1)',
    hubSrc.includes('getActiveSeasonProfile()') && !hubSrc.includes('SEASON 1') && !hubSrc.includes('3-MONTH SEASON'));
check('ui: hub progress bar shows current league, halfway point, next league',
    hubSrc.includes('HALFWAY') && hubSrc.includes('halfwayRp') && hubSrc.includes('NEXT:'));
check('ui: hub shows the Prestige League leaderboard when in Prestige League',
    hubSrc.includes('getPrestigeLeagueStandings(leagueState)') && hubSrc.includes('PRESTIGE LEAGUE') && hubSrc.includes('Teammates:'));
check('ui: hub leaderboard branch replaces the progress bar for Prestige League players',
    hubSrc.includes('inPrestigeLeague ? leagueBoardHtml : rankedProgressHtml'));
check('ui: hub elo-boost chip shows the live boost state and target',
    hubSrc.includes('ELO BOOST') && hubSrc.includes('resetBoostTarget'));
check('seasons: soft-reset mapping exists and is pure (rank + wins + win rate)',
    game.includes('function computeRankedSeasonReset(previousPoints, seasonStats)')
    && extractFunction(game, 'computeRankedSeasonReset').includes('getRankedPrestige(prev)'));
check('seasons: reset is wired into ensureRankedSeasonState via the pass season id',
    extractFunction(game, 'ensureRankedSeasonState').includes('getActiveSeasonPassId()')
    && extractFunction(game, 'ensureRankedSeasonState').includes('applyRankedSeasonReset()'));
check('seasons: per-season gameplay stats are recorded at match end',
    game.includes('rankedSeasonStats.matches') && game.includes('rankedSeasonStats.wins')
    && game.includes('rankedSeasonStats.kills') && game.includes('rankedSeasonStats.damage'));
check('seasons: elo boost doubles positive RP gains only (losses never boosted)',
    game.includes('if (rankedDelta > 0 && isRankedEloBoostActive())')
    && game.includes('rankedDelta = rankedDelta * RANKED_ELO_BOOST_MULTIPLIER;'));
check('seasons: results screen names the elo boost when it applies',
    game.includes('Elo Boost ×${RANKED_ELO_BOOST_MULTIPLIER}'));
check('seasons: prestige league still moves by the unboosted match delta',
    game.includes('recordPrestigeLeagueMatch(won, rankedRpParts.total)'));
check('unchanged: RP gain rules still mode + kills + damage + objective + win',
    (() => {
        const s = extractFunction(game, 'calcRankedRpGain');
        return s.includes('RANKED_RP_MODE_BASE[mode]') && s.includes('winRp') && s.includes('killRp')
            && s.includes('damageRp') && s.includes('objectiveRp') && s.includes('streakRp') && s.includes('mvpRp');
    })());
check('unchanged: Prestige League top-3 payouts still 100/5, 50/3, 25/2',
    (() => {
        const rewards = evalLiteral(extractConst(game, 'PRESTIGE_LEAGUE_TOP3_REWARDS'));
        return rewards.length === 3 && rewards[0].gems === 100 && rewards[0].tappers === 5
            && rewards[1].gems === 50 && rewards[1].tappers === 3 && rewards[2].gems === 25 && rewards[2].tappers === 2;
    })());
check('unchanged: Prestige League still 3-day cycles, max PL5',
    game.includes('const PRESTIGE_LEAGUE_MAX = 5;') && game.includes('3 * 24 * 60 * 60 * 1000'));

// --- vm harness: real reset math + real hub render ---------------------------
function smokeMatches(el, sel) {
    if (sel === 'button') return el.tagName === 'BUTTON';
    const attrM = sel.match(/^\[data-(action|tab)(?:="([^"]+)")?\]$/);
    if (attrM) return attrM[2] === undefined ? el.dataset[attrM[1]] !== undefined : el.dataset[attrM[1]] === attrM[2];
    if (sel.startsWith('.')) return el.className.split(' ').includes(sel.slice(1));
    if (sel.startsWith('#')) return el.id === sel.slice(1);
    return false;
}
class El {
    constructor(tag) {
        this.tagName = tag.toUpperCase(); this.children = []; this.style = {};
        this.dataset = {}; this.attributes = {}; this.className = ''; this.id = '';
        this._innerHTML = ''; this.textContent = ''; this.disabled = false;
        this.onclick = null; this._listeners = {};
    }
    setAttribute(k, v) { this.attributes[k] = String(v); if (k.startsWith('data-')) { const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); this.dataset[key] = String(v); } }
    getAttribute(k) { return this.attributes[k]; }
    appendChild(c) { this.children.push(c); c.parent = this; return c; }
    remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); } }
    addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
    removeEventListener(t, fn) { this._listeners[t] = (this._listeners[t] || []).filter(f => f !== fn); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) { const out = []; const walk = (el) => { for (const c of el.children) { if (smokeMatches(c, sel)) out.push(c); walk(c); } }; walk(this); return out; }
    set innerHTML(html) {
        this._innerHTML = html; this.children = [];
        const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g; let m;
        while ((m = tagRe.exec(html))) {
            const [, tag, attrs] = m;
            const el = new El(tag);
            const classM = attrs.match(/class="([^"]*)"/); if (classM) el.className = classM[1];
            const actionM = attrs.match(/data-action="([^"]*)"/); if (actionM) el.dataset.action = actionM[1];
            this.children.push(el); el.parent = this;
        }
    }
    get innerHTML() { return this._innerHTML; }
}

const PASS_ID = 'xplodemis-arena-forge-2026-s6';
const smokeBody = new El('body');
const grantCalls = [];
const smoke = {
    document: {
        body: smokeBody, activeElement: null,
        createElement: (tag) => new El(tag),
        getElementById: (id) => {
            const walk = (e) => { for (const c of e.children) { if (c.id === id) return c; const f = walk(c); if (f) return f; } return null; };
            return walk(smokeBody);
        },
        addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null,
    },
    playerData: {
        ownedSkins: {}, selectedSkins: {},
        ranked: { points: 0, rewardsClaimed: [] },
        prestigeLeague: {},
    },
    rankedTeammateNames: ['Ally 1', 'Ally 2'],
    appBuzz: () => {}, saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {},
    grantReward: (r) => { grantCalls.push(r); return true; },
    getActiveSeasonProfile: () => ({ key: 'xplodemis', seasonNumber: 6, id: PASS_ID, name: 'Xplodemis', upperName: 'XPLODEMIS', tiers: [], quests: [], startUtc: 0, endUtc: Date.UTC(2027, 0, 1), endLabel: 'December 31, 2026' }),
    getActiveSeasonPassId: () => PASS_ID,
};
for (const name of ['RANKED_DIVISIONS', 'TOURNAMENT_BOT_NAMES', 'PRESTIGE_LEAGUE_TOP3_REWARDS', 'RANKED_RP_MODE_BASE']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
for (const name of ['RANKED_POINTS_PER_DIVISION', 'RANKED_GOLD_MIN_DIVISION_INDEX',
    'RANKED_PRESTIGE_STEP_RP', 'RANKED_PRESTIGE_MAX', 'PRESTIGE_LEAGUE_MAX',
    'PRESTIGE_LEAGUE_CYCLE_MS', 'PRESTIGE_LEAGUE_OPPONENT_COUNT',
    'RANKED_SEASON_RESET_PRESTIGE_LEVELS_DROPPED', 'RANKED_SEASON_RESET_DROP_RP',
    'RANKED_SEASON_RESET_PRESTIGE_FLOOR_RP', 'RANKED_SEASON_RESET_WIN_CREDIT_RP',
    'RANKED_SEASON_RESET_WIN_CREDIT_CAP_RP', 'RANKED_SEASON_RESET_WINRATE_CREDIT_RP',
    'RANKED_ELO_BOOST_MULTIPLIER',
    // Ranked Solo (2026-11-20): the hub renders the solo ladder too.
    // Corrected model: placement delta capped at +300 (Solo) / +500
    // (Teams), no placement floor; 1200 RP is the solo ladder start.
    'RANKED_SOLO_LADDER_FLOOR_RP', 'RANKED_SOLO_LADDER_START_INDEX',
    'RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP', 'RANKED_SOLO_PLACEMENT_DELTA_CAP_RP',
    'RANKED_SOLO_PLACEMENT_CAP_RP', 'RANKED_SOLO_LEAGUE_OPPONENT_SALT']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
vm.createContext(smoke);
for (const fn of ['getRankedPrestige', 'getRankedDisplayLabel', 'getRankedTierInfo',
    'getRankedDivisionFloor', 'getRankedWeekKey', 'getPrestigeLeagueLevel',
    'getPrestigeLeagueCycleKey', 'hasCompletedRanked', 'buildPrestigeLeagueOpponents', 'payPrestigeLeagueTop3Rewards',
    'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings', 'getPrestigeLeaguePlayerRank',
    'recordPrestigeLeagueMatch', 'computeRankedSeasonReset', 'applyRankedSeasonReset',
    'isRankedEloBoostActive', 'getRankedEloBoostMultiplier', 'ensureRankedSeasonState',
    'calcRankedRpGain', 'openRankedHubOverlay',
    // Ranked Solo (2026-11-20): the hub renders the solo ladder too.
    'computeRankedSoloPlacement', 'getRankedSoloTierInfo', 'getRankedSoloDivisionFloor',
    'ensureRankedSoloSeasonState', 'isRankedSoloEloBoostActive',
    'hasCompletedRankedSolo']) {
    try { vm.runInContext(extractFunction(game, fn), smoke); }
    catch (e) { check(`smoke setup: extract+load ${fn}`, false); }
}

function resetSmoke(points, seasonId, seasonStats) {
    smoke.playerData.ranked = { points, rewardsClaimed: [], highPoints: points, winStreak: 0, seasonId, seasonStats: seasonStats || { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.prestigeLeague = {};
    // Ranked Solo (2026-11-20): the hub renders the solo ladder too — reset it per case.
    smoke.playerData.rankedSolo = { points: 0, rewardsClaimed: [], placed: false, highPoints: 0, winStreak: 0, seasonId, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.prestigeLeagueSolo = {};
    smokeBody.children = [];
}
// vm.runInContext has no locals — pass the overlay through the context.
smoke.__queueOverlay = new El('div');
function openHubWith(points, seasonId, seasonStats) {
    resetSmoke(points, seasonId, seasonStats);
    vm.runInContext('openRankedHubOverlay(__queueOverlay, () => {})', smoke);
    return smokeBody.children.find(c => c.id === 'rankedHubOverlay') || null;
}

// --- reset math ---------------------------------------------------------------
check('reset: Prestige 5 (4600 RP, no wins) resets to Prestige 3 (3400 RP) — Anthony\'s example',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(4600, { wins: 0, matches: 0 })', smoke);
        return r.newPoints === 3400 && vm.runInContext('getRankedPrestige(3400)', smoke) === 3 && r.boostTarget === 4600;
    })());
check('reset: deep Prestige 5 (4900 RP) still lands on Prestige 3',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(4900, { wins: 0, matches: 0 })', smoke);
        return r.newPoints === 3400 && vm.runInContext('getRankedPrestige(3400)', smoke) === 3;
    })());
check('reset: wins earn back RP (P5 4600 + 15 wins over 30 matches -> 3550, still PL3)',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(4600, { wins: 15, matches: 30 })', smoke);
        return r.newPoints === 3550 && vm.runInContext('getRankedPrestige(3550)', smoke) === 3;
    })());
check('reset: 60%+ win rate earns back more (P5 4600, 12W/20M -> 3620: 120 win credit + 100 rate credit)',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(4600, { wins: 12, matches: 20 })', smoke);
        return r.newPoints === 3620;
    })());
check('reset: non-prestige drops 3 divisions (Legend II 2300 -> Champion II 2000)',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(2300, { wins: 0, matches: 0 })', smoke);
        return r.newPoints === 2000;
    })());
check('reset: soft-reset sweep never drops a 1000+ RP player to Bronze, never below 2200 from Prestige',
    (() => {
        for (let prev = 0; prev <= 5000; prev += 100) {
            const r = vm.runInContext(`computeRankedSeasonReset(${prev}, { wins: 0, matches: 0 })`, smoke);
            if (r.newPoints > r.previousPoints) return false;
            if (prev >= 1000 && r.newPoints < 300) return false;
            if (prev >= 2400 && r.newPoints < 2200) return false;
            if (prev >= 4400 && vm.runInContext(`getRankedPrestige(${r.newPoints})`, smoke) !== 3) return false;
        }
        return true;
    })());
check('reset: a Bronze player stays Bronze (50 RP -> 0, no negative, no fake boost target issue)',
    (() => {
        const r = vm.runInContext('computeRankedSeasonReset(50, { wins: 0, matches: 0 })', smoke);
        return r.newPoints === 0 && r.boostTarget === 50;
    })());
check('reset: ensureRankedSeasonState performs the reset once when the pass season changes',
    (() => {
        resetSmoke(4600, 'turkey-trouble-arena-forge-2026-s5', { wins: 5, matches: 10, kills: 40, damage: 90000 });
        vm.runInContext('ensureRankedSeasonState()', smoke);
        const r = smoke.playerData.ranked;
        return r.points === 3450 && r.seasonId === PASS_ID && r.resetBoostTarget === 4600
            && r.seasonStats.wins === 0 && r.seasonStats.matches === 0;
    })());
check('reset: no second reset while the season id matches',
    (() => {
        const before = smoke.playerData.ranked.points;
        vm.runInContext('ensureRankedSeasonState()', smoke);
        return smoke.playerData.ranked.points === before;
    })());
check('boost: x2 while below the pre-reset rank, x1 once back at it',
    (() => {
        resetSmoke(3400, PASS_ID, { wins: 0, matches: 0, kills: 0, damage: 0 });
        smoke.playerData.ranked.resetBoostTarget = 4600;
        const active = vm.runInContext('isRankedEloBoostActive()', smoke) === true
            && vm.runInContext('getRankedEloBoostMultiplier()', smoke) === 2;
        smoke.playerData.ranked.points = 4600;
        const done = vm.runInContext('isRankedEloBoostActive()', smoke) === false
            && vm.runInContext('getRankedEloBoostMultiplier()', smoke) === 1;
        return active && done;
    })());
check('unchanged: RP gain math still totals 59 for the pinned example (mode 5 + win 20 + kills 10 + dmg 5 + obj 2 + streak 7 + mvp 10)',
    (() => {
        const p = vm.runInContext("calcRankedRpGain({ mode: 'arena_forge', kills: 5, damage: 5000, objectiveDamage: 2000, won: true, streak: 3, mvp: true })", smoke);
        return p.total === 59 && p.modeRp === 5 && p.winRp === 20 && p.killRp === 10 && p.damageRp === 5 && p.objectiveRp === 2 && p.streakRp === 7 && p.mvpRp === 10;
    })());

// --- hub render ---------------------------------------------------------------
check('hub: non-Prestige player sees current league / halfway / next league on the bar',
    (() => {
        const hub = openHubWith(1250, PASS_ID, { wins: 0, matches: 0, kills: 0, damage: 0 });
        if (!hub) return false;
        const html = hub.innerHTML;
        // 1250 RP: Brick Fume III, floor 1000, next Master I at 1300, halfway 1150.
        return html.includes('BRICK FUME III') && html.includes('HALFWAY') && html.includes('1150 RP')
            && html.includes('NEXT: BRICK MASTER I') && html.includes('SEASON 6') && html.includes('XPLODEMIS')
            && !html.includes('PRESTIGE LEAGUE LEADERBOARD');
    })());
check('hub: Prestige League player sees the leaderboard instead of the bar, with YOU + allies',
    (() => {
        const hub = openHubWith(3600, PASS_ID, { wins: 0, matches: 0, kills: 0, damage: 0 });
        if (!hub) return false;
        const html = hub.innerHTML;
        return html.includes('PRESTIGE LEAGUE LEADERBOARD') && html.includes('YOU') && html.includes('Teammates: Ally 1 & Ally 2')
            && html.includes('PL3') && !html.includes('HALFWAY');
    })());
check('hub: elo-boost chip shows the live boost target while the boost is active',
    (() => {
        resetSmoke(3400, PASS_ID, { wins: 0, matches: 0, kills: 0, damage: 0 });
        smoke.playerData.ranked.resetBoostTarget = 4600;
        vm.runInContext('openRankedHubOverlay(__queueOverlay, () => {})', smoke);
        const hub = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
        return !!hub && hub.innerHTML.includes('ELO BOOST') && hub.innerHTML.includes('4600 RP');
    })());
check('hub: leaderboard reflects a fresh ranked match (updates after every match)',
    (() => {
        resetSmoke(3600, PASS_ID, { wins: 0, matches: 0, kills: 0, damage: 0 });
        vm.runInContext('ensurePrestigeLeagueState()', smoke);
        const before = vm.runInContext('getPrestigeLeagueStandings(playerData.prestigeLeague)', smoke)
            .find(r => r.isPlayer).rp;
        vm.runInContext('recordPrestigeLeagueMatch(true, 40)', smoke);
        const after = vm.runInContext('getPrestigeLeagueStandings(playerData.prestigeLeague)', smoke)
            .find(r => r.isPlayer).rp;
        vm.runInContext('openRankedHubOverlay(__queueOverlay, () => {})', smoke);
        const hub = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
        return before === 0 && after === 40 && !!hub && hub.innerHTML.includes('40 RP');
    })());

if (failed) { console.error(`ranked-rework: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`ranked-rework: ${passed} passed`);
