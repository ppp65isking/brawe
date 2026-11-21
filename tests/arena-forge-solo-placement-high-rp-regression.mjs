// Arena Forge solo placement — high-RP fix (2026-11-20, Anthony:
// "Make sure people already over 1200 get placed into a leauge").
// Placement RESULT is floored at 1200 RP (Solo Prestige starts there)
// and capped at 2400 RP (Solo PL3):
//  (1) A player ALREADY over 1200 RP in Ranked Teams places into the
//      solo league matching their Teams RP — Teams 1800 + win lands at
//      1850 RP (Solo PL2, top division Fume III), Teams 1800 + loss
//      still lands there (base minus the loss delta, never below 1200).
//      The +300 Solo / +500 Teams delta caps are unchanged; only the
//      upside is capped, a loss still subtracts its full delta.
//  (2) Nobody places below 1200 RP: Teams 0 + loss places at exactly
//      1200 RP (Fume III, division 13 of 13, Solo PL1), Teams 500 + win
//      places at 1200, Teams 1150 + loss places at 1200.
//  (3) Placement always marks the player placed — the call site sets
//      rankedBucket.placed = true unconditionally on a placement
//      result, so no RP in range can leave a player stuck unplaced.
//      The placed player shows in the solo hub with the right league:
//      progress bar below 1200, solo Prestige leaderboard at 1200+.
// Supersedes the PR #178 "no placement floor" reading: the floor is
// back, as a RESULT floor at 1200 RP (RANKED_SOLO_LADDER_FLOOR_RP),
// not as a delta clamp. The old RANKED_SOLO_PLACEMENT_FLOOR_RP
// constant stays gone; the caps, the 13-division solo ladder
// (Bronze I .. Fume III), the 38,950 pass total, RP gain rules,
// Prestige payouts, 2-day Solo / 3-day Teams cycles and max PL5 are
// all untouched. (Ladder corrected 2026-11-21: Solo is the BOTTOM of
// the table, Bronze I .. Fume III — not Fume III .. Legend III.)
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = read('tests/arena-forge-solo-placement-high-rp-regression.mjs');
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

// --- static: caps unchanged, result floored at the ladder start ------------
const TEAMS_DELTA_CAP = evalLiteral(extractConst(game, 'RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP'));
const SOLO_DELTA_CAP = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_DELTA_CAP_RP'));
const SOLO_RESULT_CAP = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_CAP_RP'));
const SOLO_LADDER_FLOOR = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_FLOOR_RP'));
const SOLO_LADDER_START = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_START_INDEX'));
const SOLO_LADDER_END = evalLiteral(extractConst(game, 'RANKED_SOLO_LADDER_END_INDEX'));
check('caps: Teams placement delta still capped at +500 RP', TEAMS_DELTA_CAP === 500);
check('caps: Solo placement delta still capped at +300 RP', SOLO_DELTA_CAP === 300);
check('caps: placement result still capped at 2400 RP (Solo PL3)', SOLO_RESULT_CAP === 2400);
check('ladder: solo ladder floor is still 1200 RP (Solo Prestige starts there, PL1)', SOLO_LADDER_FLOOR === 1200);
check('ladder: solo ladder still has 13 divisions, Bronze I (index 0) to Fume III (index 12)',
    SOLO_LADDER_START === 0 && SOLO_LADDER_END === 12
    && SOLO_LADDER_END - SOLO_LADDER_START + 1 === 13
    && evalLiteral(extractConst(game, 'RANKED_DIVISIONS')).length === 25);
check('floor: computeRankedSoloPlacement floors the RESULT at RANKED_SOLO_LADDER_FLOOR_RP (1200), not at 0',
    (() => {
        const fn = extractFunction(game, 'computeRankedSoloPlacement');
        return fn.includes('Math.max(RANKED_SOLO_LADDER_FLOOR_RP,')
            && fn.includes('Math.min(RANKED_SOLO_PLACEMENT_CAP_RP, basePoints + matchDelta)')
            && !fn.includes('Math.max(0, Math.min(RANKED_SOLO_PLACEMENT_CAP_RP');
    })());
check('floor: the old RANKED_SOLO_PLACEMENT_FLOOR_RP constant is still gone (the floor reuses the ladder floor)',
    !game.includes('RANKED_SOLO_PLACEMENT_FLOOR_RP'));
check('placed: the placement call site marks the player placed unconditionally (no stuck-unplaced path)',
    game.includes('rankedBucket.placed = true;')
    && game.includes('rankedBucket.placement = soloPlacement;')
    && game.includes('const soloPlacement = (isRankedSoloMatch && !rankedBucket.placed)'));
check('placed: the placement branch only runs on the first solo match (!rankedBucket.placed) and only for solo',
    game.includes('? computeRankedSoloPlacement((playerData.ranked && playerData.ranked.points) || 0, rankedRpParts)'));

// --- vm setup (mirrors arena-forge-solo-placement-fix-regression.mjs) --------
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

// --- (1) vm: high-RP players place into their league ---------------------------
// League map (corrected 2026-11-21): the solo ladder tops out at Fume III
// (1200 RP); anything above 1200 is Solo Prestige — PL1 1200, PL2 1700,
// PL3 2200, PL4 2700, PL5 3200. Teams RP still seeds the placement.
check('high-rp vm: Teams 1800 + win places at 1850 RP (Brick Fume III, Solo PL2, division 13 of 13)',
    (() => {
        const p = run('computeRankedSoloPlacement(1800, { total: 50 })');
        const t = run('getRankedSoloTierInfo(1850)');
        return p.points === 1850 && p.basePoints === 1800 && p.matchDelta === 50
            && t.label === 'Brick Fume III' && t.index === 12 && t.divisionsTotal === 13
            && run('getRankedSoloPrestige(1850)') === 2;
    })());
check('high-rp vm: Teams 1800 + loss still places near 1800 (1790 RP, Brick Fume III, Solo PL2 — never below 1200)',
    (() => {
        const p = run('computeRankedSoloPlacement(1800, { total: -10 })');
        const t = run('getRankedSoloTierInfo(1790)');
        return p.points === 1790 && p.matchDelta === -10
            && t.label === 'Brick Fume III' && t.index === 12 && p.points >= 1200
            && run('getRankedSoloPrestige(1790)') === 2;
    })());
check('high-rp vm: Teams 1800 + worst realistic loss (solo loss, 0 kills/damage -> -5 RP) places at 1795',
    (() => {
        const loss = run("calcRankedRpGain({ mode: 'solo', kills: 0, damage: 0, objectiveDamage: 0, won: false, streak: 0, mvp: false })");
        const p = run(`computeRankedSoloPlacement(1800, { total: ${loss.total} })`);
        return loss.total === -5 && p.points === 1795 && p.matchDelta === -5;
    })());
check('high-rp vm: Teams 1800 + win from real match stats (solo win, 3 kills, 3000 dmg -> +35) places at 1835, Solo PL2',
    (() => {
        const win = run("calcRankedRpGain({ mode: 'solo', kills: 3, damage: 3000, objectiveDamage: 1000, won: true, streak: 0, mvp: false })");
        const p = run(`computeRankedSoloPlacement(1800, { total: ${win.total} })`);
        const t = run(`getRankedSoloTierInfo(${p.points})`);
        return win.total === 35 && p.points === 1835 && t.label === 'Brick Fume III'
            && run('getRankedSoloPrestige(1835)') === 2;
    })());
check('high-rp vm: Teams 1800 + absurd loss (-1000 RP delta) still floors at 1200, never below',
    run('computeRankedSoloPlacement(1800, { total: -1000 })').points === 1200);
check('high-rp vm: Teams 2400 + win places at the 2400 cap (Brick Fume III, Solo PL3, division 13 of 13)',
    (() => {
        const p = run('computeRankedSoloPlacement(2400, { total: 60 })');
        const t = run('getRankedSoloTierInfo(2400)');
        return p.points === 2400 && t.label === 'Brick Fume III' && t.index === 12
            && t.divisionsTotal === 13 && t.nextLabel === null && t.nextThreshold === null
            && run('getRankedSoloPrestige(2400)') === 3;
    })());
check('high-rp vm: Teams 2400 + loss still places high (2390 RP, Brick Fume III, Solo PL3)',
    (() => {
        const p = run('computeRankedSoloPlacement(2400, { total: -10 })');
        return p.points === 2390 && run('getRankedSoloTierInfo(2390)').label === 'Brick Fume III'
            && run('getRankedSoloPrestige(2390)') === 3;
    })());
check('high-rp vm: Teams 2100 + win places at 2150 RP (Brick Fume III, Solo PL2, division 13 of 13)',
    (() => {
        const p = run('computeRankedSoloPlacement(2100, { total: 50 })');
        const t = run('getRankedSoloTierInfo(2150)');
        return p.points === 2150 && t.label === 'Brick Fume III' && t.index === 12 && t.nextThreshold === null
            && run('getRankedSoloPrestige(2150)') === 2;
    })());
check('high-rp vm: Teams 1500 + win places at 1550 RP (Brick Fume III, Solo PL1, division 13 of 13)',
    (() => {
        const p = run('computeRankedSoloPlacement(1500, { total: 50 })');
        const t = run('getRankedSoloTierInfo(1550)');
        return p.points === 1550 && t.label === 'Brick Fume III' && t.index === 12 && t.nextThreshold === null
            && run('getRankedSoloPrestige(1550)') === 1;
    })());

// --- (2) vm: nobody places below 1200 RP ---------------------------------------
check('floor vm: Teams 0 + loss places at exactly 1200 (Solo Prestige starts there, Fume III, PL1) — the PR #178 0-RP case is fixed',
    (() => {
        const p = run('computeRankedSoloPlacement(0, { total: -10 })');
        const t = run('getRankedSoloTierInfo(1200)');
        return p.points === 1200 && p.matchDelta === -10 && p.basePoints === 0
            && t.label === 'Brick Fume III' && t.index === 12
            && run('getRankedSoloPrestige(1200)') === 1;
    })());
check('floor vm: Teams 0 + win still places at 1200 (not 50)',
    run('computeRankedSoloPlacement(0, { total: 50 })').points === 1200);
check('floor vm: Teams 500 + win places at 1200 (not 550)',
    run('computeRankedSoloPlacement(500, { total: 50 })').points === 1200);
check('floor vm: Teams 1150 + loss places at 1200 (not 1140)',
    run('computeRankedSoloPlacement(1150, { total: -10 })').points === 1200);
check('floor vm: Teams 1199 + no delta places at 1200 (not 1199)',
    run('computeRankedSoloPlacement(1199, { total: 0 })').points === 1200);
check('floor vm: Teams 1200 + loss floors at 1200 (not 1190)',
    run('computeRankedSoloPlacement(1200, { total: -10 })').points === 1200);
check('floor vm: sweep — every Teams RP 0..2600 with deltas -1000/-10/0/+50/+300/+500 lands in [1200, 2400]',
    (() => {
        for (let teams = 0; teams <= 2600; teams += 100) {
            for (const d of [-1000, -10, 0, 50, 300, 500]) {
                const p = run(`computeRankedSoloPlacement(${teams}, { total: ${d} })`);
                if (p.points < 1200 || p.points > 2400) return false;
            }
        }
        return true;
    })());
check('floor vm: the +300 delta cap still binds above the floor (Teams 2000 + 500-delta -> 2300, not 2500)',
    run('computeRankedSoloPlacement(2000, { total: 500 })').points === 2300
    && run('computeRankedSoloPlacement(2000, { total: 500 })').matchDelta === 300);
check('floor vm: a loss above the floor still subtracts fully (Teams 2000 - 10 -> 1990, no clamp to 2000)',
    run('computeRankedSoloPlacement(2000, { total: -10 })').points === 1990);

// --- (3) vm: league lookup resolves across the whole placed range --------------
check('league vm: placed RP resolves to Fume III + the right Solo Prestige level at 1200/1500/1800/2100/2400 (PL1/PL1/PL2/PL2/PL3)',
    run('getRankedSoloTierInfo(1200)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(1500)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(1800)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(2100)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(2400)').label === 'Brick Fume III'
    && run('getRankedSoloTierInfo(1200)').index === 12
    && run('getRankedSoloTierInfo(1500)').index === 12
    && run('getRankedSoloTierInfo(1800)').index === 12
    && run('getRankedSoloTierInfo(2100)').index === 12
    && run('getRankedSoloTierInfo(2400)').index === 12
    && run('getRankedSoloPrestige(1200)') === 1
    && run('getRankedSoloPrestige(1500)') === 1
    && run('getRankedSoloPrestige(1800)') === 2
    && run('getRankedSoloPrestige(2100)') === 2
    && run('getRankedSoloPrestige(2400)') === 3);
check('league vm: Teams lookup is untouched at the same RPs (Fume III / Master III / Grandmaster / Champion III / Legend III)',
    run('getRankedTierInfo(1200)').label === 'Brick Fume III'
    && run('getRankedTierInfo(1500)').label === 'Brick Master III'
    && run('getRankedTierInfo(1800)').label === 'Brick Grandmaster'
    && run('getRankedTierInfo(2100)').label === 'Brick Champion III'
    && run('getRankedTierInfo(2400)').label === 'Brick Legend III');

// --- (4) vm: the hub shows the placed player in the right league ---------------
{
    const hub = openHub(1800, 1850, true); // Teams 1800 + win -> solo Fume III, PL2
    const html = hub ? hub.innerHTML : '';
    check('hub vm: placed 1850 solo shows Brick Fume III • Prestige League PL2, division 13 of 13, 1850 RP — never NOT PLACED YET',
        html.includes('Brick Fume III • Prestige League PL2') && html.includes('DIVISION 13 OF 13')
        && html.includes('1850 RP') && html.includes('RANKED SOLO · BRICK FUME III · 1850 RP')
        && html.includes('SOLO PRESTIGE LEAGUE PL2')
        && !html.includes('NOT PLACED YET'));
}
{
    const hub = openHub(1800, 1790, true); // Teams 1800 + loss -> solo Fume III, PL2
    const html = hub ? hub.innerHTML : '';
    check('hub vm: placed 1790 solo (after a placement loss) still shows Brick Fume III • Prestige League PL2, division 13 of 13',
        html.includes('Brick Fume III • Prestige League PL2') && html.includes('DIVISION 13 OF 13')
        && html.includes('1790 RP') && !html.includes('NOT PLACED YET'));
}
{
    const hub = openHub(0, 1200, true); // Teams 0 + loss -> Solo Prestige start
    const html = hub ? hub.innerHTML : '';
    check('hub vm: placed 1200 solo shows Brick Fume III • Prestige League PL1, division 13 of 13, 1200 RP — never NOT PLACED YET',
        html.includes('Brick Fume III • Prestige League PL1') && html.includes('DIVISION 13 OF 13')
        && html.includes('1200 RP') && !html.includes('NOT PLACED YET'));
}
{
    const hub = openHub(2400, 2400, true); // Teams 2400 + win -> Legend III, solo Fume III PL3, Prestige League unlocked
    const html = hub ? hub.innerHTML : '';
    check('hub vm: placed 2400 solo shows Brick Fume III • Prestige League PL3, division 13 of 13, and the solo Prestige leaderboard with YOU on it',
        html.includes('DIVISION 13 OF 13') && html.includes('SOLO PRESTIGE LEAGUE LEADERBOARD')
        && html.includes('SOLO PRESTIGE LEAGUE PL3')
        && html.includes('YOU ARE #') && html.includes('YOU — 0 RP')
        && !html.includes('NOT PLACED YET'));
}
{
    const hub = openHub(1800, 0, false); // not placed yet: the CTA still shows, no league claimed
    const html = hub ? hub.innerHTML : '';
    check('hub vm: unplaced solo still shows NOT PLACED YET + the placement CTA (placement happens on the first match, not before)',
        html.includes('NOT PLACED YET') && html.includes('PLAY 1 RANKED SOLO MATCH TO GET PLACED'));
}

// --- hygiene --------------------------------------------------------------------
check('hygiene: zero bare forbidden word in game.js + this suite',
    !/\bcluster\b/i.test(game) && !/\bcluster\b/i.test(self));
check('hygiene: no Brawl Stars wording/branding in the placement or solo-ladder helpers',
    !/brawl stars/i.test(extractFunction(game, 'computeRankedSoloPlacement'))
    && !/brawl stars/i.test(extractFunction(game, 'getRankedSoloTierInfo'))
    && !/brawl stars/i.test(extractFunction(game, 'getRankedSoloPrestige'))
    && !/brawl stars/i.test(extractFunction(game, 'getRankedSoloDivisionFloor'))
    && !/brawl stars/i.test(extractFunction(game, 'openRankedHubOverlay')));

if (failed) { console.error(`solo-placement-high-rp: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`solo-placement-high-rp: ${passed} passed`);
