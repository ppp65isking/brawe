// Arena Forge solo placement fix (2026-11-20, Anthony's correction of PR #177;
// solo LADDER corrected 2026-11-21, Anthony — the build had it backwards).
// Corrected model — placement RP is CAPPED, not clamped into a floor:
//  (1) A Teams placement match can award up to +500 RP, a Solo placement
//      match up to +300 RP. The placement still uses your match stats AND
//      your Ranked Teams rank as its base, but the match's own RP delta
//      under the Teams rules can never exceed those caps (only the upside
//      is capped — a loss still subtracts its full delta). The placement
//      RESULT is still capped at 2400 RP (Solo PL3 — higher solo prestige
//      must be earned in Solo, not placed into).
//      UPDATE 2026-11-20 (high-RP fix, Anthony: "Make sure people already
//      over 1200 get placed into a leauge"): the placement RESULT is now
//      floored at 1200 RP (Solo Prestige starts there) — nobody places
//      below it; the delta itself is still only capped, never floored.
//      See arena-forge-solo-placement-high-rp-regression for the floor
//      pins; the checks below were updated to match.
//  (2) Solo Prestige leagues start at 1200 RP (PL1), so the solo LADDER
//      is the BOTTOM of the table, not the top: 13 divisions, Bronze I
//      .. Fume III (0-1200 RP), indices 0-12 — shorter than the
//      25-division Teams ladder. Solo Prestige is PL1 1200, PL2 1700,
//      PL3 2200, PL4 2700, PL5 3200 (500 RP steps, max PL5), and the
//      Solo Prestige leaderboard resets every 2 days (Teams stays 3).
//      Every solo display (Ranked entry UI, solo progress bar, solo
//      leaderboard) shows the corrected ladder.
//  (3) The old solo [1200, 2400] clamp-as-floor (RANKED_SOLO_PLACEMENT_
//      FLOOR_RP) is gone. The solo soft-reset floor follows the new model:
//      solo resets stay at/above 1200 RP (Solo Prestige start) and drop
//      2 SOLO Prestige levels, like Teams drops 2 of its own.
// FLAG — capped-placement reading, corrected once already: under today's
// RP rules the biggest possible match delta is +75, so the +300/+500 caps
// never bind yet (they pin the rule for future RP-rule changes). And no
// Teams placement match exists in this build (Teams starts at 0 RP with
// no placement flow), so the +500 Teams cap is a pinned rule with no call
// site yet — Anthony to confirm whether Teams should ever have one.
// FLAG — a low Teams rank now places AT 1200 RP (floor on the placement
// RESULT, 2026-11-20 high-RP fix): a fresh player places at 1200 RP and
// displays at the TOP rung of the solo ladder (Fume III, division 13 of
// 13) as Solo PL1. Regular solo losses can also dip a player below 1200
// RP (division safety floor 1000 at 1200-1299 RP); the display then shows
// the ladder division for that RP, bottoming at Bronze I.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = read('tests/arena-forge-solo-placement-fix-regression.mjs');
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

// --- (1) static: the caps + the ladder start ------------------------------------
const TEAMS_DELTA_CAP = evalLiteral(extractConst(game, 'RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP'));
const SOLO_DELTA_CAP = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_DELTA_CAP_RP'));
const SOLO_RESULT_CAP = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_CAP_RP'));
const SOLO_LADDER_FLOOR = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_FLOOR_RP'));
const SOLO_LADDER_START = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_START_INDEX'));
const SOLO_LADDER_END = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_END_INDEX'));
const SOLO_CYCLE_MS = evalLiteral(extractConst(game, 'PRESTIGE_LEAGUE_SOLO_CYCLE_MS'));
check('caps: Teams placement delta capped at +500 RP', TEAMS_DELTA_CAP === 500);
check('caps: Solo placement delta capped at +300 RP', SOLO_DELTA_CAP === 300);
check('caps: placement result still capped at 2400 RP (Solo PL3 — higher solo prestige must be earned in Solo)', SOLO_RESULT_CAP === 2400);
check('ladder: Solo Prestige starts at 1200 RP (PL1, solo only)', SOLO_LADDER_FLOOR === 1200);
check('ladder: solo ladder runs Bronze I (index 0) to Fume III (index 12) — 13 divisions',
    SOLO_LADDER_START === 0 && SOLO_LADDER_END === 12 && SOLO_LADDER_END - SOLO_LADDER_START + 1 === 13);
check('ladder: 0 RP is Brick Bronze I and 1200 RP is Brick Fume III (top of the solo ladder)',
    (() => {
        const divs = evalLiteral(extractConst(game, 'RANKED_DIVISIONS'));
        return divs.length === 25 && divs[0].label === 'Brick Bronze I' && divs[12].label === 'Brick Fume III' && divs[24].label === 'Brick Legend III';
    })());
check('ladder: Solo Prestige leaderboard cycles every 2 days (Teams stays 3)',
    SOLO_CYCLE_MS === 2 * 24 * 60 * 60 * 1000
    && evalLiteral(extractConst(game, 'PRESTIGE_LEAGUE_CYCLE_MS')) === 3 * 24 * 60 * 60 * 1000);
check('caps: the old placement-floor constant is gone from game.js',
    !game.includes('RANKED_SOLO_PLACEMENT_FLOOR_RP'));
check('caps: the old "no solo placement below that floor" copy is gone from game.js',
    !game.includes('no solo placement below that floor'));
check('caps: hub still says solo leagues run Bronze I to Fume III (0–1200 RP), 13 divisions, and states the +300 cap',
    game.includes('Solo leagues run Bronze I to Fume III (0–1200 RP)')
    && game.includes('A placement match can add up to +300 RP')
    && !game.includes('Solo leagues start at Brick Fume III (1200 RP)'));
check('caps: no Teams placement function exists yet — the +500 Teams cap is a pinned rule with no call site (FLAG for Anthony)',
    !game.includes('function computeRankedTeamsPlacement(')
    && extractFunction(game, 'computeRankedSoloPlacement').includes('RANKED_SOLO_PLACEMENT_DELTA_CAP_RP'));

// --- vm setup (mirrors arena-forge-pass-38950-ranked-ui-regression.mjs) --------
function smokeMatches(el, sel) {
    if (sel === 'button') return el.tagName === 'BUTTON';
    const attrM = sel.match(/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/);
    if (attrM) {
        const key = attrM[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return attrM[2] === undefined ? el.dataset[key] !== undefined : el.dataset[key] === attrM[2];
    }
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
    closest(sel) {
        let el = this;
        while (el) { if (smokeMatches(el, sel)) return el; el = el.parent; }
        return null;
    }
    set innerHTML(html) {
        this._innerHTML = html; this.children = [];
        const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g; let m;
        while ((m = tagRe.exec(html))) {
            const [, tag, attrs] = m;
            const el = new El(tag);
            const classM = attrs.match(/class="([^"]*)"/); if (classM) el.className = classM[1];
            const idM = attrs.match(/id="([^"]*)"/); if (idM) el.id = idM[1];
            const ariaM = attrs.match(/aria-selected="([^"]*)"/); if (ariaM) el.attributes['aria-selected'] = ariaM[1];
            for (const dm of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
                const key = dm[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                el.dataset[key] = dm[2];
            }
            this.children.push(el); el.parent = this;
        }
    }
    get innerHTML() { return this._innerHTML; }
}

const PASS_ID = 'xplodemis-arena-forge-2026-s6';
const smokeBody = new El('body');
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
        rankedSolo: { points: 0, rewardsClaimed: [], placed: false },
        prestigeLeague: {}, prestigeLeagueSolo: {},
    },
    rankedTeammateNames: ['Ally 1', 'Ally 2'],
    appBuzz: () => {}, saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {},
    grantReward: () => true,
    getActiveSeasonProfile: () => ({ key: 'xplodemis', seasonNumber: 6, id: PASS_ID, name: 'Xplodemis', upperName: 'XPLODEMIS', tiers: [], quests: [], startUtc: 0, endUtc: Date.UTC(2027, 0, 1), endLabel: 'December 31, 2026' }),
    getActiveSeasonPassId: () => PASS_ID,
};
for (const name of ['RANKED_DIVISIONS', 'TOURNAMENT_BOT_NAMES', 'PRESTIGE_LEAGUE_TOP3_REWARDS', 'RANKED_RP_MODE_BASE']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
for (const name of ['RANKED_POINTS_PER_DIVISION', 'RANKED_GOLD_MIN_DIVISION_INDEX',
    'RANKED_PRESTIGE_STEP_RP', 'RANKED_PRESTIGE_MAX', 'PRESTIGE_LEAGUE_MAX',
    'PRESTIGE_LEAGUE_CYCLE_MS', 'PRESTIGE_LEAGUE_SOLO_CYCLE_MS', 'PRESTIGE_LEAGUE_OPPONENT_COUNT',
    'RANKED_SEASON_RESET_PRESTIGE_LEVELS_DROPPED', 'RANKED_SEASON_RESET_DROP_RP',
    'RANKED_SEASON_RESET_PRESTIGE_FLOOR_RP', 'RANKED_SEASON_RESET_WIN_CREDIT_RP',
    'RANKED_SEASON_RESET_WIN_CREDIT_CAP_RP', 'RANKED_SEASON_RESET_WINRATE_CREDIT_RP',
    'RANKED_ELO_BOOST_MULTIPLIER',
    'RANKED_SOLO_LADDER_FLOOR_RP', 'RANKED_SOLO_LADDER_START_INDEX', 'RANKED_SOLO_LADDER_END_INDEX',
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
    'computeRankedSoloPlacement', 'getRankedSoloPrestige', 'getRankedSoloDisplayLabel',
    'getRankedSoloTierInfo', 'getRankedSoloDivisionFloor',
    'ensureRankedSoloSeasonState', 'isRankedSoloEloBoostActive',
    'hasCompletedRankedSolo']) {
    try { vm.runInContext(extractFunction(game, fn), smoke); }
    catch (e) { check(`smoke setup: extract+load ${fn}`, false); }
}
const run = (code) => vm.runInContext(code, smoke);
smoke.__queueOverlay = new El('div');
function openHub(rankedPoints, soloPoints, soloPlaced) {
    smoke.playerData.ranked = { points: rankedPoints, rewardsClaimed: [], highPoints: rankedPoints, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.rankedSolo = { points: soloPoints, rewardsClaimed: [], placed: soloPlaced, highPoints: soloPoints, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.prestigeLeague = {};
    smoke.playerData.prestigeLeagueSolo = {};
    smokeBody.children = [];
    run('openRankedHubOverlay(__queueOverlay, () => {}, () => {})');
    return smokeBody.children.find(c => c.id === 'rankedHubOverlay') || null;
}

// --- (1) vm: the caps bind on the match delta ----------------------------------
// The biggest match delta the RP rules can produce today is +75
// (mode 5 + win 20 + kills 10 + damage 10 + objective 5 + streak 15 +
// mvp 10) — the +300 cap is a forward pin, not a number a player hits.
check('caps vm: max possible match delta under today\'s RP rules is +75 (so the +300 cap never binds yet)',
    (() => {
        const p = run("calcRankedRpGain({ mode: 'solo', kills: 5, damage: 10000, objectiveDamage: 5000, won: true, streak: 10, mvp: true })");
        return p.total === 75 && p.modeRp === 5 && p.winRp === 20 && p.killRp === 10 && p.damageRp === 10
            && p.objectiveRp === 5 && p.streakRp === 15 && p.mvpRp === 10;
    })());
check('caps vm: Solo delta never exceeds +300 (Teams 2000 + 500-delta match -> +300, 2300 RP)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: 500 })');
        return p.points === 2300 && p.matchDelta === 300 && p.rawDelta === 500 && p.deltaCapPoints === 300;
    })());
check('caps vm: Solo delta never exceeds +300 even for an absurd delta (Teams 2000 + 10000 -> +300)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: 10000 })');
        return p.points === 2300 && p.matchDelta === 300;
    })());
check('caps vm: base is still your Teams rank (Teams 2000 + 50 -> 2050)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: 50 })');
        return p.points === 2050 && p.basePoints === 2000 && p.matchDelta === 50 && p.teamsPoints === 2000;
    })());
check('caps vm: a loss still subtracts its full delta — only the upside is capped (Teams 2000 - 10 -> 1990)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: -10 })');
        return p.points === 1990 && p.matchDelta === -10;
    })());
check('caps vm: placement RESULT floors at 1200 RP (Solo Prestige starts there; Teams 0 + loss -> 1200, never negative; Teams 100 + 40 -> 1200)',
    run('computeRankedSoloPlacement(0, { total: -10 })').points === 1200
    && run('computeRankedSoloPlacement(100, { total: 40 })').points === 1200);
check('caps vm: placement result still capped at 2400 (Teams 2600 + win -> 2400; Teams 2300 + 500-delta -> 2400)',
    run('computeRankedSoloPlacement(2600, { total: 60 })').points === 2400
    && run('computeRankedSoloPlacement(2300, { total: 500 })').points === 2400
    && run('computeRankedSoloPlacement(2399, { total: 1 })').points === 2400
    && run('computeRankedSoloPlacement(5000, { total: 0 })').basePoints === 2400);
check('caps vm: Teams delta cap constant is +500 (pinned rule; no Teams placement call site yet)',
    run('RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP') === 500);

// --- (2) vm: the solo ladder is Bronze I .. Fume III (0-1200 RP) --------------
check('ladder vm: 0 RP displays as Brick Bronze I, solo division 1 of 13',
    (() => {
        const t = run('getRankedSoloTierInfo(0)');
        return t.label === 'Brick Bronze I' && t.index === 0 && t.teamIndex === 0 && t.divisionsTotal === 13
            && t.nextLabel === 'Brick Bronze II' && t.nextThreshold === 100;
    })());
check('ladder vm: 500 RP is Brick Silver III, solo division 6 of 13',
    (() => {
        const t = run('getRankedSoloTierInfo(500)');
        return t.label === 'Brick Silver III' && t.index === 5 && t.divisionsTotal === 13
            && t.nextLabel === 'Brick Silver IV' && t.nextThreshold === 600;
    })());
check('ladder vm: 1150 RP is Brick Fume II, solo division 12 of 13 (one division under the top)',
    (() => {
        const t = run('getRankedSoloTierInfo(1150)');
        return t.label === 'Brick Fume II' && t.index === 11 && t.divisionsTotal === 13
            && t.nextLabel === 'Brick Fume III' && t.nextThreshold === 1200;
    })());
check('ladder vm: 1200-1299 RP is Fume III (division 13), the top rung — no next division',
    run('getRankedSoloTierInfo(1200)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(1299)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(1200)').index === 12
    && run('getRankedSoloTierInfo(1200)').nextLabel === null
    && run('getRankedSoloTierInfo(1200)').nextThreshold === null);
check('ladder vm: 2400 RP is still Fume III, solo division 13 of 13, no next division (above the ladder = Solo Prestige)',
    (() => {
        const t = run('getRankedSoloTierInfo(2400)');
        return t.label === 'Brick Fume III' && t.index === 12 && t.divisionsTotal === 13
            && t.nextLabel === null && t.nextThreshold === null;
    })());
check('ladder vm: sweep 0..5000 RP stays inside the 13-division solo ladder (solo index 0..12) and maps 100 RP per division below 1200',
    (() => {
        const divs = run('RANKED_DIVISIONS');
        for (let rp = 0; rp <= 5000; rp += 50) {
            const t = run(`getRankedSoloTierInfo(${rp})`);
            if (t.teamIndex < 0 || t.index < 0 || t.index > 12 || t.divisionsTotal !== 13) return false;
            if (rp < 1200 && t.label !== divs[Math.floor(rp / 100)].label) return false;
            if (rp >= 1200 && t.label !== 'Brick Fume III') return false;
        }
        return true;
    })());
check('ladder vm: solo division floor is the start of the current solo division (0/500/1150 -> 0/500/1100; 1250/2400 -> 1200, the ladder top)',
    run('getRankedSoloDivisionFloor(0)') === 0
    && run('getRankedSoloDivisionFloor(500)') === 500
    && run('getRankedSoloDivisionFloor(1150)') === 1100
    && run('getRankedSoloDivisionFloor(1250)') === 1200
    && run('getRankedSoloDivisionFloor(1350)') === 1200
    && run('getRankedSoloDivisionFloor(2400)') === 1200);
check('ladder vm: Teams tier info is untouched (0 RP is still Bronze I, 25 divisions)',
    run('getRankedTierInfo(0)').label === 'Brick Bronze I'
    && run('getRankedTierInfo(0)').index === 0);

// --- (2b) vm: Solo Prestige starts at 1200 RP, 500 RP steps, max PL5 ----------
check('prestige vm: Solo Prestige is PL1 1200, PL2 1700, PL3 2200, PL4 2700, PL5 3200 (max PL5)',
    run('getRankedSoloPrestige(0)') === 0
    && run('getRankedSoloPrestige(1199)') === 0
    && run('getRankedSoloPrestige(1200)') === 1
    && run('getRankedSoloPrestige(1699)') === 1
    && run('getRankedSoloPrestige(1700)') === 2
    && run('getRankedSoloPrestige(2199)') === 2
    && run('getRankedSoloPrestige(2200)') === 3
    && run('getRankedSoloPrestige(2699)') === 3
    && run('getRankedSoloPrestige(2700)') === 4
    && run('getRankedSoloPrestige(3199)') === 4
    && run('getRankedSoloPrestige(3200)') === 5
    && run('getRankedSoloPrestige(5000)') === 5);
check('prestige vm: Teams Prestige is untouched (starts at 2400 RP: 2399 -> 0, 2400 -> PL1, 2900 -> PL2, 4400 -> PL5)',
    run('getRankedPrestige(2399)') === 0
    && run('getRankedPrestige(2400)') === 1
    && run('getRankedPrestige(2900)') === 2
    && run('getRankedPrestige(4400)') === 5);
check('prestige vm: solo display label pairs the top division with the Solo Prestige level (1200 -> Fume III PL1, 2400 -> Fume III PL3; 500 -> Silver III, no prestige)',
    run('getRankedSoloDisplayLabel(500)') === 'Brick Silver III'
    && run('getRankedSoloDisplayLabel(1200)') === 'Brick Fume III • Prestige League PL1'
    && run('getRankedSoloDisplayLabel(2400)') === 'Brick Fume III • Prestige League PL3');
check('prestige vm: league level is mode-aware (2400 RP is Solo PL3 but Teams PL1)',
    run('getPrestigeLeagueLevel(2400, true)') === 3
    && run('getPrestigeLeagueLevel(2400)') === 1
    && run('getPrestigeLeagueLevel(1200, true)') === 1
    && run('getPrestigeLeagueLevel(1200)') === 0);
check('prestige vm: cycle keys are mode-aware (Solo 2-day, Teams 3-day)',
    (() => {
        // t0 = 6 days sits on a boundary of BOTH grids (LCM of 2 and 3).
        const t0 = 6 * 24 * 60 * 60 * 1000;
        const soloCycle = 2 * 24 * 60 * 60 * 1000;
        const teamsCycle = 3 * 24 * 60 * 60 * 1000;
        return run(`getPrestigeLeagueCycleKey(${t0}, true)`) === 3
            && run(`getPrestigeLeagueCycleKey(${t0 + soloCycle - 1}, true)`) === 3
            && run(`getPrestigeLeagueCycleKey(${t0 + soloCycle}, true)`) === 4
            && run(`getPrestigeLeagueCycleKey(${t0})`) === 2
            && run(`getPrestigeLeagueCycleKey(${t0 + teamsCycle - 1})`) === 2
            && run(`getPrestigeLeagueCycleKey(${t0 + teamsCycle})`) === 3;
    })());
check('prestige vm: Solo Prestige League unlocks at 1200 RP (PL1) — a freshly placed player is in the league',
    (() => {
        smoke.playerData.rankedSolo = { points: 1199, rewardsClaimed: [], placed: true, highPoints: 1199, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        const below = run('hasCompletedRankedSolo()');
        smoke.playerData.rankedSolo.points = 1200;
        const at = run('hasCompletedRankedSolo()');
        return below === false && at === true;
    })());

// --- (3) vm: solo soft reset never drops below 1200 RP -------------------------
check('reset vm: solo reset drops 2 SOLO Prestige levels (PL3 2500 -> PL1 1200; PL5 3200 -> PL3 2200; PL2 1700 -> PL1 1200, no wins)',
    run('computeRankedSeasonReset(2500, { wins: 0, matches: 0 }, true)').newPoints === 1200
    && run('computeRankedSeasonReset(3200, { wins: 0, matches: 0 }, true)').newPoints === 2200
    && run('computeRankedSeasonReset(1700, { wins: 0, matches: 0 }, true)').newPoints === 1200
    && run('computeRankedSeasonReset(1200, { wins: 0, matches: 0 }, true)').newPoints === 1200);
check('reset vm: Teams reset is untouched (P5 4600, no wins -> P3 3400)',
    run('computeRankedSeasonReset(4600, { wins: 0, matches: 0 })').newPoints === 3400
    && run('computeRankedSeasonReset(4600, { wins: 0, matches: 0 }, false)').newPoints === 3400);
check('reset vm: solo reset never drops below 1200 RP across the whole ladder (0..4900, no wins)',
    (() => {
        for (let prev = 0; prev <= 4900; prev += 100) {
            smoke.playerData.rankedSolo = { points: prev, rewardsClaimed: [], highPoints: prev, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
            run('applyRankedSeasonReset(playerData.rankedSolo, RANKED_SOLO_LADDER_FLOOR_RP, true)');
            if (smoke.playerData.rankedSolo.points < 1200) return false;
        }
        return true;
    })());
check('reset vm: solo reset floors at 1200 (1500, no wins -> 1200) while Teams can reset below it (1000, no wins -> 700)',
    (() => {
        smoke.playerData.rankedSolo = { points: 1500, rewardsClaimed: [], highPoints: 1500, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        run('applyRankedSeasonReset(playerData.rankedSolo, RANKED_SOLO_LADDER_FLOOR_RP, true)');
        const solo = smoke.playerData.rankedSolo.points === 1200;
        smoke.playerData.ranked = { points: 1000, rewardsClaimed: [], highPoints: 1000, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        run('applyRankedSeasonReset(playerData.ranked)');
        return solo && smoke.playerData.ranked.points === 700;
    })());
check('reset vm: season change runs the solo reset at the ladder floor (1500 old season -> 1200, boost target kept)',
    (() => {
        smoke.playerData.rankedSolo = { points: 1500, rewardsClaimed: [], highPoints: 1500, winStreak: 0, seasonId: 'turkey-trouble-arena-forge-2026-s5', seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        run('ensureRankedSoloSeasonState()');
        const s = smoke.playerData.rankedSolo;
        return s.points === 1200 && s.seasonId === PASS_ID && s.resetBoostTarget === 1500;
    })());

// --- (2) vm: hub shows the corrected solo ladder ------------------------------
{
    const hub = openHub(500, 0, false);
    const html = hub ? hub.innerHTML : '';
    check('hub vm: unplaced solo CTA states the +300 cap and the Bronze I–Fume III ladder',
        html.includes('PLAY 1 RANKED SOLO MATCH TO GET PLACED')
        && html.includes('A placement match can add up to +300 RP')
        && html.includes('Solo leagues run Bronze I to Fume III (0–1200 RP)')
        && html.includes('13 divisions')
        && html.includes('Solo Prestige from 1200 RP')
        && !html.includes('no solo placement below that floor'));
}
{
    const hub = openHub(1400, 1350, true); // Teams Master II (division 15 of 25), solo Fume III + PL1 (division 13 of 13)
    const html = hub ? hub.innerHTML : '';
    check('hub vm: placed solo above 1200 shows Fume III, DIVISION 13 OF 13, and the Solo Prestige board at PL1 (Teams stays DIVISION 15 OF 25)',
        html.includes('DIVISION 13 OF 13') && html.includes('DIVISION 15 OF 25')
        && html.includes('Brick Fume III • Prestige League PL1')
        && html.includes('SOLO PRESTIGE LEAGUE PL1')
        && html.includes('resets every 2 days'));
}
{
    const hub = openHub(2400, 1150, true); // Teams Legend III, solo Fume II (division 12 of 13)
    const html = hub ? hub.innerHTML : '';
    check('hub vm: solo below 1200 RP shows its ladder division (Fume II, division 12 of 13) — never a league outside the ladder',
        html.includes('DIVISION 12 OF 13') && html.includes('<span>BRICK FUME II</span>')
        && !html.includes('<span>BRICK BRONZE') && !html.includes('<span>BRICK SILVER')
        && !html.includes('<span>BRICK GOLD') && !html.includes('<span>BRICK FUME I</span>'));
    check('hub vm: solo below 1200 RP ticks stay on the ladder (1100 / HALFWAY 1150 / 1200) with the division safety floor',
        html.includes('<span>1100 RP</span>') && html.includes('HALFWAY 1150 RP')
        && html.includes('<span>1200 RP</span>') && html.includes('Division safety floor: 1000 RP'));
}
{
    const hub = openHub(500, 500, true); // Teams Silver III, solo Silver III (division 6 of 13)
    const html = hub ? hub.innerHTML : '';
    check('hub vm: solo at 500 RP shows Silver III, division 6 of 13, with its own progress bar (HALFWAY 550, next Silver IV 600)',
        html.includes('DIVISION 6 OF 13') && html.includes('<span>BRICK SILVER III</span>')
        && html.includes('HALFWAY 550 RP') && html.includes('<span>600 RP</span>')
        && html.includes('NEXT: BRICK SILVER IV'));
}
{
    const hub = openHub(2400, 2400, true); // Teams Legend III (PL1), solo Fume III (PL3)
    const html = hub ? hub.innerHTML : '';
    check('hub vm: solo at 2400 RP is Fume III, division 13 of 13, Solo PL3 (Teams stays 25 of 25, Teams PL1)',
        html.includes('DIVISION 13 OF 13') && html.includes('DIVISION 25 OF 25')
        && html.includes('SOLO PRESTIGE LEAGUE PL3') && html.includes('PRESTIGE LEAGUE PL1'));
    check('hub vm: Solo board resets every 2 days, Teams board every 3 days',
        html.includes('resets every 2 days') && html.includes('resets every 3 days'));
}

// --- hygiene --------------------------------------------------------------------
check('hygiene: zero bare forbidden word in game.js + this suite',
    !/\bcluster\b/i.test(game) && !/\bcluster\b/i.test(self));
check('hygiene: no Brawl Stars wording/branding in the new placement or solo-ladder copy',
    !/brawl stars/i.test(extractFunction(game, 'computeRankedSoloPlacement'))
    && !/brawl stars/i.test(extractFunction(game, 'getRankedSoloTierInfo'))
    && !/brawl stars/i.test(extractFunction(game, 'getRankedSoloPrestige'))
    && !/brawl stars/i.test(extractFunction(game, 'openRankedHubOverlay')));

if (failed) { console.error(`solo-placement-fix: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`solo-placement-fix: ${passed} passed`);
