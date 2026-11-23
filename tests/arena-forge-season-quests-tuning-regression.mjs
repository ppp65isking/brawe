// Season Quests Tuning + Ranked Solo + Mobile Landscape Home UI (2026-11-20, Anthony's round;
// solo ladder corrected 2026-11-21 — Solo is the BOTTOM of the table, Bronze I .. Fume III).
// Season quests: (1) XP sums to the FULL pass total, (2) Coming Soon stages
// accrue ZERO progress, (3) harder than daily/weekly, (4) time-unlock
// schedule with live countdowns. Ranked Solo: ranked Showdown with bots,
// own RP bucket + Prestige League ladder, placement from Teams rank +
// match stats with the match delta capped at +300 RP (corrected
// 2026-11-20 — the old 1200 RP placement floor is gone; 1200 RP is now
// only the Solo Prestige start (PL1), and solo soft resets
// never drop below it). Landscape home UI:
// Anthony's sketch — rounded buttons, 3-column fighters grid, icon-only
// bottom nav as a left rail, profile goes home from Fighters, season-pass
// bar with tier progress, quick tools/talents from the hero power level.
// Landscape ONLY: portrait, desktop and web are untouched.
// Daily/weekly quests and their Pass XP (+25/+100), the Ranked RP gain
// rules, Prestige League payouts (100/5, 50/3, 25/2), Teams 3-day cycles
// and max PL5 are untouched. (Solo Prestige cycles are 2 days, corrected
// 2026-11-21.)
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = read('tests/arena-forge-season-quests-tuning-regression.mjs');
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

// --- static: pass XP total ----------------------------------------------------
// The code's pass model is per-tier (2026-11-20, Anthony: "switch both"):
// 50 tiers, SEASON_PASS_XP_PER_TIER is 49 level-up costs in five bands
// (400 / 650 / 800 / 950 / 1135) summing to 38,950 XP. Anthony's own
// bands add to 38,950 too, but the per-tier numbers were never written
// into code, so the band values are BUILDER PICKS (proportional rescale
// of the old flat 100 XP/level). Overflow pays tappers every 1000 XP
// past 38,950.
const PASS_MAX_LEVEL = evalLiteral(extractConst(game, 'SEASON_PASS_MAX_LEVEL'));
const PASS_XP_PER_TIER = evalLiteral(extractConst(game, 'SEASON_PASS_XP_PER_TIER'));
const PASS_TOTAL_XP = evalLiteral(extractConst(game, 'SEASON_PASS_TOTAL_XP'));
const CODE_PASS_TOTAL = PASS_XP_PER_TIER.reduce((s, v) => s + v, 0);
check('pass total: code model is 50 tiers with a 49-entry per-tier XP table', PASS_MAX_LEVEL === 50 && PASS_XP_PER_TIER.length === 49);
check('pass total: per-tier table is the 400/650/800/950/1135 bands (BUILDER PICK)',
    PASS_XP_PER_TIER.slice(0, 9).every(v => v === 400) && PASS_XP_PER_TIER.slice(9, 19).every(v => v === 650)
    && PASS_XP_PER_TIER.slice(19, 29).every(v => v === 800) && PASS_XP_PER_TIER.slice(29, 39).every(v => v === 950)
    && PASS_XP_PER_TIER.slice(39, 49).every(v => v === 1135));
check(`pass total: code sum is ${CODE_PASS_TOTAL} XP and the total const agrees`, CODE_PASS_TOTAL === 38950 && PASS_TOTAL_XP === 38950);
check('pass total: flat 100 XP/level model is gone', !game.includes('SEASON_PASS_XP_PER_LEVEL'));
const xplodemisDefs = evalLiteral(extractConst(game, 'XPLODEMIS_QUEST_DEFS'));
const xpSum = xplodemisDefs.reduce((s, d) => s + d.xpReward, 0);
check(`(a) season quest XP sums to the pass total (${xpSum} = ${CODE_PASS_TOTAL})`, xpSum === CODE_PASS_TOTAL);
check('(a) XP is weighted later/harder: bands 795 (stages 1-5) < 1391 (6-10) < 2186 (11-15) < 3418 (16-20) — proportional rescale, BUILDER PICK',
    xplodemisDefs.slice(0, 5).every(d => d.xpReward === 795)
    && xplodemisDefs.slice(5, 10).every(d => d.xpReward === 1391)
    && xplodemisDefs.slice(10, 15).every(d => d.xpReward === 2186)
    && xplodemisDefs.slice(15, 20).every(d => d.xpReward === 3418));
check('(a) still 20 season quests, stages 1..20 in order', xplodemisDefs.length === 20 && xplodemisDefs.every((d, i) => d.stage === i + 1));

// --- static: zero-progress + time gate wiring ---------------------------------
check('(b) progress flows only into unlocked season quests (gate in the recording path, not just claim)',
    extractFunction(game, 'progressSeasonPassQuest').includes('isSeasonQuestStageUnlocked'));
check('(b) season state is sanitised on load so no stale save smuggles progress into a locked stage',
    extractFunction(game, 'ensureSeasonPassState').includes('sanitizeSeasonQuestProgress(pass)'));
check('(c) claim refuses locked stages',
    extractFunction(game, 'claimSeasonPassQuestReward').includes('isSeasonQuestStageUnlocked'));
check('(d) REWORK 2026-11-23: the stage gate is sequential ONLY — no time unlock in the gate',
    extractFunction(game, 'isSeasonQuestStageUnlocked').includes('previousStageQuest')
    && !extractFunction(game, 'isSeasonQuestStageUnlocked').includes('TimeUnlocked'));
check('(d) REWORK 2026-11-23: the time schedule is DELETED (no step const, no unlock-ms / start / countdown / time-unlock functions)',
    !game.includes('const SEASON_QUEST_UNLOCK_STEP_MS =') && !game.includes('function seasonQuestStageUnlockMs(')
    && !game.includes('function seasonQuestStageStartUtc(') && !game.includes('function isSeasonQuestStageTimeUnlocked(')
    && !game.includes('function formatSeasonQuestUnlockCountdown('));
check('(d) REWORK 2026-11-23: locked cards carry NO countdown span and no ticking interval',
    !game.includes('data-season-quest-unlock-utc=') && !game.includes('formatSeasonQuestUnlockCountdown('));
check('(d) REWORK 2026-11-23: locked cards still say they unlock after the previous stage',
    game.includes('Coming soon — unlocks after the previous stage is complete.'));

// --- static: harder than daily/weekly -----------------------------------------
// Daily maxima (from DAILY_CONTRACT_POOL): play_match 4, deal_damage 35,000,
// defeat_enemies 16, perform_supers 9, use_gadget 7, collect_cubes 16.
// Weekly maxima (from WEEKLY_CONTRACT_POOL): win_match 12, play_match 28,
// deal_damage 240,000, defeat_enemies 70, perform_supers 45, use_gadget 30.
// Rule: stages 1-7 beat the DAILY max for their kind (win_match has no
// daily entry, so it beats the weekly max); stages 8-20 beat the WEEKLY
// max where one exists. Kinds with no pool entry beat their old value.
const dailyPool = evalLiteral(extractConst(game, 'DAILY_CONTRACT_POOL'));
const weeklyPool = evalLiteral(extractConst(game, 'WEEKLY_CONTRACT_POOL'));
const maxTarget = (pool, kind) => { const e = pool.find(p => p.kind === kind); return e ? Math.max(...e.targets) : null; };
const OLD_TARGETS = { christmas_showdown_matches: 2, christmas_showdown_wins: 1, christmas_powerups: 5, different_fighters: 6 };
const harderFailures = [];
for (const d of xplodemisDefs) {
    const dailyMax = maxTarget(dailyPool, d.kind);
    const weeklyMax = maxTarget(weeklyPool, d.kind);
    let ok, against;
    if (d.stage <= 7) {
        if (dailyMax != null) { ok = d.target > dailyMax; against = `daily max ${dailyMax}`; }
        else { ok = d.target > weeklyMax; against = `weekly max ${weeklyMax} (no daily ${d.kind} quest)`; }
    } else {
        if (weeklyMax != null) { ok = d.target > weeklyMax; against = `weekly max ${weeklyMax}`; }
        else { ok = d.target > OLD_TARGETS[d.kind]; against = `old season target ${OLD_TARGETS[d.kind]} (no daily/weekly ${d.kind} quest)`; }
    }
    if (!ok) harderFailures.push(`stage ${d.stage} ${d.kind} target ${d.target} not > ${against}`);
}
check(`(e) every season requirement beats its daily/weekly equivalent${harderFailures.length ? ` — ${harderFailures.join('; ')}` : ''}`, harderFailures.length === 0);
check('REWORK 2026-11-23: daily contracts pay +300 Pass XP, weekly +600 (pass actually completable — see the pitch-rework suite for the math)',
    game.includes('rewards: weekly ? { coins:500+index*150, souls:35+index*10, questXP:35, passXP:600 } : { coins:150+index*40, questXP:20, passXP:300 }'));
check('no bare word-boundary forbidden brawler token in game.js or this suite',
    (() => { const word = 'clus' + 'ter'; const re = new RegExp(`\\b${word}\\b`); return !re.test(game) && !re.test(self); })());

// --- static: Ranked Solo --------------------------------------------------------
check('solo: mode base table pays solo Showdown +5 (BUILDER PICK, same as Arena Forge)',
    (() => { const t = evalLiteral(extractConst(game, 'RANKED_RP_MODE_BASE')); return t.solo === 5 && t.arena_forge === 5 && t.knock_donate === 0 && t.brick_vault === 0; })());
check('solo: placement helper exists and caps the match delta at +300 RP (corrected 2026-11-20 — placement RESULT floors at 1200 RP, Solo Prestige starts there; 1200 RP is the solo Prestige start, Teams keeps 1300)',
    game.includes('function computeRankedSoloPlacement(') && game.includes('const RANKED_SOLO_PLACEMENT_DELTA_CAP_RP = 300;')
    && game.includes('const RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP = 500;')
    && game.includes('const RANKED_SOLO_LADDER_FLOOR_RP = 1200;')
    && !game.includes('RANKED_SOLO_PLACEMENT_FLOOR_RP')
    && game.includes('return points >= 1300; // Brick Master I (idx 13) and above')
    && game.includes('const RANKED_SOLO_PLACEMENT_CAP_RP = 2400;'));
check('solo: match-end settles into the solo bucket and runs the placement on the first solo match',
    game.includes('const rankedBucket = isRankedSoloMatch ? playerData.rankedSolo : playerData.ranked;')
    && game.includes('computeRankedSoloPlacement((playerData.ranked && playerData.ranked.points) || 0, rankedRpParts)'));
check('solo: hub shows the solo ladder with its own play button',
    game.includes('RANKED SOLO') && game.includes('data-ranked-hub="play-solo"') && game.includes('▶ PLAY RANKED SOLO'));
check('solo: launcher starts a solo ranked Showdown (no draft, bots, Power 11 via isRankedMatch)',
    extractFunction(game, 'startRankedSoloMatch').includes("showdownMode = 'solo';")
    && extractFunction(game, 'startRankedSoloMatch').includes('isRankedMatch = true;')
    && extractFunction(game, 'startRankedSoloMatch').includes('isRankedSoloMatch = true;'));
check('solo: solo bucket + solo league persist in the save',
    game.includes('rankedSolo: { points: 0, rewardsClaimed: [], placed: false }')
    && game.includes('if (data.persistent.rankedSolo) playerData.rankedSolo = data.persistent.rankedSolo;')
    && game.includes('rankedSolo: playerData.rankedSolo,'));
check('solo: Prestige League payouts unchanged (100/5, 50/3, 25/2) and Teams 3-day cycles, max PL5 (Solo cycles are 2 days)',
    (() => {
        const rewards = evalLiteral(extractConst(game, 'PRESTIGE_LEAGUE_TOP3_REWARDS'));
        return rewards.length === 3 && rewards[0].gems === 100 && rewards[0].tappers === 5
            && rewards[1].gems === 50 && rewards[1].tappers === 3 && rewards[2].gems === 25 && rewards[2].tappers === 2;
    })() && game.includes('const PRESTIGE_LEAGUE_MAX = 5;') && game.includes('3 * 24 * 60 * 60 * 1000')
    && game.includes('const PRESTIGE_LEAGUE_SOLO_CYCLE_MS = 2 * 24 * 60 * 60 * 1000;'));

// --- vm smoke: real season state, real progress, real hub ----------------------
function smokeMatches(el, sel) {
    if (sel === 'button') return el.tagName === 'BUTTON';
    const attrM = sel.match(/^\[data-([a-zA-Z-]+)(?:="([^"]*)")?\]$/);
    if (attrM) {
        const key = attrM[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return attrM[2] === undefined ? el.dataset[key] !== undefined : el.dataset[key] === attrM[2];
    }
    if (sel.startsWith('.')) return el.className.split(' ').includes(sel.slice(1));
    if (sel.startsWith('#')) return el.id === sel.slice(1);
    // Plain tag names (b, i, small, span ...) — landscape section.
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(sel)) return el.tagName === sel.toUpperCase();
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
    closest(sel) { let el = this; while (el) { if (smokeMatches(el, sel)) return el; el = el.parent; } return null; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) {
        // Single-part selectors behave exactly as before; a space-separated
        // chain (e.g. '.app-land-pass-bar i') matches each part among the
        // previous part's descendants — landscape section.
        const parts = sel.trim().split(/\s+/);
        let current = [this];
        for (const part of parts) {
            const next = [];
            for (const base of current) {
                const walk = (el) => { for (const c of el.children) { if (smokeMatches(c, part)) next.push(c); walk(c); } };
                walk(base);
            }
            current = next;
        }
        return current;
    }
    set innerHTML(html) {
        this._innerHTML = html; this.children = [];
        const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g; let m;
        while ((m = tagRe.exec(html))) {
            const [, tag, attrs] = m;
            const el = new El(tag);
            const classM = attrs.match(/class="([^"]*)"/); if (classM) el.className = classM[1];
            const dataRe = /data-([a-zA-Z-]+)="([^"]*)"/g; let dm;
            while ((dm = dataRe.exec(attrs))) el.dataset[dm[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = dm[2];
            this.children.push(el); el.parent = this;
        }
    }
    get innerHTML() { return this._innerHTML; }
}
function visibleText(el) {
    let out = (el.textContent || '') + '\n' + (el._innerHTML || '').replace(/<[^>]+>/g, ' ');
    for (const c of el.children) out += '\n' + visibleText(c);
    return out;
}
function collectSeasonCards(el) {
    const out = [];
    const walk = (e) => {
        for (const c of e.children) {
            if (/Stage \d+ •/.test(c._innerHTML || '')) out.push(c);
            walk(c);
        }
    };
    walk(el);
    return out;
}

const PASS_ID = 'xplodemis-arena-forge-2026-s6';
const smokeBody = new El('body');
const grantCalls = [];
const xpAwardCalls = [];
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
    ENABLE_SEASON_QUESTS: true, ENABLE_SEASON_PASS: true, ENABLE_DAILY_WEEKLY_QUESTS: true,
    isFriendlyBattle: false, isRankedSoloMatch: false,
    playerData: {
        coins: 0, gems: 0, souls: 0, starrDrops: 0, superTapperCount: 0, hyperTapperCount: 0,
        presentCount: 0, ownedSkins: {}, selectedSkins: {},
        questBoard: { daily: {}, weekly: {}, questXP: 0, questLevel: 0 },
        seasonPass: null, xplodemisDaily: { dayKey: 'x', played: true, claimed: 0 },
        ranked: { points: 0, rewardsClaimed: [], highPoints: 0, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } },
        rankedSolo: null, prestigeLeague: {}, prestigeLeagueSolo: {},
    },
    rankedTeammateNames: ['Ally 1', 'Ally 2'],
    brawlerData: {}, skinsDatabase: {},
    saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {}, refreshHomeUI: () => {},
    setActiveTab: () => {}, appBuzz: () => {},
    refreshDailyWeeklyQuests: () => {},
    addDailyWeeklyQuestProgress: () => false,
    awardSeasonPassXp: (amount) => { xpAwardCalls.push(amount); return true; },
    grantReward: (r) => { grantCalls.push(r); return true; },
    claimQuestReward: () => false,
    ensureXplodemisDaily: () => smoke.playerData.xplodemisDaily,
    getDailyPresentAllowance: () => 1,
    claimDailyPresent: () => false,
    getActiveSeasonProfile: () => ({ key: 'xplodemis', seasonNumber: 6, id: PASS_ID, name: 'Xplodemis', upperName: 'XPLODEMIS', tiers: [], quests: [], startUtc: Date.UTC(2026, 10, 20, 0, 0, 0), endUtc: Date.UTC(2027, 0, 1, 0, 0, 0), endLabel: 'December 31, 2026' }),
    getActiveSeasonPassId: () => PASS_ID,
};
for (const name of ['TURKEY_TROUBLE_PASS_TIERS', 'XPLODEMIS_PASS_TIERS', 'EMBER_FORGE_PASS_TIERS',
    'TURKEY_TROUBLE_QUEST_DEFS', 'XPLODEMIS_QUEST_DEFS', 'EMBER_FORGE_QUEST_DEFS']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
for (const name of ['TURKEY_TROUBLE_SEASON_ID', 'TURKEY_TROUBLE_START_UTC', 'TURKEY_TROUBLE_END_UTC',
    'XPLODEMIS_SEASON_ID', 'XPLODEMIS_START_UTC', 'XPLODEMIS_END_UTC',
    'EMBER_FORGE_SEASON_ID', 'EMBER_FORGE_START_UTC', 'EMBER_FORGE_END_UTC',
    'SEASON_PASS_SCHEMA_VERSION', 'SEASON_PASS_MAX_LEVEL', 'SEASON_PASS_XP_PER_TIER', 'SEASON_PASS_TOTAL_XP', 'SEASON_QUEST_STAGE_COUNT',
    'RANKED_DIVISIONS', 'RANKED_POINTS_PER_DIVISION', 'RANKED_GOLD_MIN_DIVISION_INDEX',
    'RANKED_PRESTIGE_STEP_RP', 'RANKED_PRESTIGE_MAX', 'PRESTIGE_LEAGUE_MAX',
    'PRESTIGE_LEAGUE_CYCLE_MS', 'PRESTIGE_LEAGUE_TOP3_REWARDS', 'PRESTIGE_LEAGUE_OPPONENT_COUNT',
    'RANKED_RP_MODE_BASE', 'TOURNAMENT_BOT_NAMES',
    'RANKED_SEASON_RESET_PRESTIGE_LEVELS_DROPPED', 'RANKED_SEASON_RESET_DROP_RP',
    'RANKED_SEASON_RESET_PRESTIGE_FLOOR_RP', 'RANKED_SEASON_RESET_WIN_CREDIT_RP',
    'RANKED_SEASON_RESET_WIN_CREDIT_CAP_RP', 'RANKED_SEASON_RESET_WINRATE_CREDIT_RP',
    'RANKED_ELO_BOOST_MULTIPLIER',
    'RANKED_SOLO_LADDER_FLOOR_RP', 'RANKED_SOLO_LADDER_START_INDEX', 'RANKED_SOLO_LADDER_END_INDEX',
    'PRESTIGE_LEAGUE_SOLO_CYCLE_MS',
    'RANKED_TEAMS_PLACEMENT_DELTA_CAP_RP', 'RANKED_SOLO_PLACEMENT_DELTA_CAP_RP',
    'RANKED_SOLO_PLACEMENT_CAP_RP', 'RANKED_SOLO_LEAGUE_OPPONENT_SALT']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
vm.createContext(smoke);
for (const fn of ['ensureBrawePassTokens', 'getActiveSeasonProfile', 'getActiveSeasonPassId',
    'seasonPassXpToReachLevel', 'seasonPassLevelForXp', 'seasonPassXpIntoLevel', 'seasonPassXpPerLevel', 'seasonPassLevelProgress',
    'buildSeasonPassQuests', 'resetSeasonPassForAll', 'ensureSeasonPassState',
    'isSeason3PassActive', 'getClaimableSeasonQuestCount', 'questRewardText',
    'normalizeQuestKey', 'progressSeasonPassQuest', 'claimSeasonPassQuestReward',
    'isQuestStageUnlocked', 'getQuestProgressCount', 'openQuestBoard',
    'sanitizeSeasonQuestProgress', 'isSeasonQuestStageUnlocked',
    'getRankedPrestige', 'getRankedDisplayLabel', 'getRankedTierInfo', 'getRankedDivisionFloor',
    'getRankedWeekKey', 'getPrestigeLeagueLevel', 'getPrestigeLeagueCycleKey',
    'hasCompletedRanked', 'hasCompletedRankedSolo', 'buildPrestigeLeagueOpponents',
    'payPrestigeLeagueTop3Rewards', 'ensurePrestigeLeagueState', 'getPrestigeLeagueStandings',
    'getPrestigeLeaguePlayerRank', 'recordPrestigeLeagueMatch',
    'computeRankedSeasonReset', 'applyRankedSeasonReset',
    'isRankedEloBoostActive', 'getRankedEloBoostMultiplier',
    'ensureRankedSeasonState', 'ensureRankedSoloSeasonState', 'isRankedSoloEloBoostActive',
    'computeRankedSoloPlacement', 'getRankedSoloPrestige', 'getRankedSoloDisplayLabel',
    'getRankedSoloTierInfo', 'getRankedSoloDivisionFloor',
    'calcRankedRpGain', 'openRankedHubOverlay',
    'getLandscapePassBarInfo', 'renderAppHomeLandscapeBar', 'openAppQuickLoadout']) {
    try { vm.runInContext(extractFunction(game, fn), smoke); }
    catch (e) { check(`smoke setup: extract+load ${fn}`, false); }
}
const run = (code) => vm.runInContext(code, smoke);
smoke.__queueOverlay = new El('div');
// Freeze "now" INSIDE the vm (host Date.now overrides do not reach the
// context): Dec 5, 2026 — inside the Xplodemis window. Unlocks are
// sequential only (rework 2026-11-23), so the date gates nothing.
vm.runInContext('Date.now = () => Date.UTC(2026, 11, 5, 12, 0, 0);', smoke);
const quests = () => smoke.playerData.seasonPass.quests;

// --- (d) NO timer: sequential unlock only (rework 2026-11-23) ----------------
// Seed the season state first (fresh: stage 1 open, 2-20 locked).
run("openQuestBoard('season')");
check('(d) stage 1 is always unlocked', run('isSeasonQuestStageUnlocked({stage:1})') === true);
check('(d) stage 2 is locked until stage 1 completes (sequential only, no date involved)',
    run('isSeasonQuestStageUnlocked({stage:2})') === false);
check('(d) the gate reads the previous stage, never the clock — same answer on Nov 20 and on Dec 31',
    run('isSeasonQuestStageUnlocked({stage:2}, Date.UTC(2026,10,20))') === false
    && run('isSeasonQuestStageUnlocked({stage:2}, Date.UTC(2026,11,31))') === false);

// --- (b) zero progress while locked ----------------------------------------------
run("openQuestBoard('season')");
check('(b) fresh season state seeds all 20 quests at 0 progress',
    Object.keys(quests()).length === 20 && Object.values(quests()).every(q => q.progress === 0 && !q.completed));
check('(b) wins do NOT accrue into locked stage 3 (win_match x50)',
    (() => { run("progressSeasonPassQuest('win_match', 50)"); return quests().xplodemis_03.progress === 0 && !quests().xplodemis_03.completed; })());
check('(b) kills do NOT accrue into locked stage 4 (defeat_enemies x500)',
    (() => { run("progressSeasonPassQuest('defeat_enemies', 500)"); return quests().xplodemis_04.progress === 0; })());
check('(b) damage does NOT accrue into completion-locked stage 2 (deal_damage x2,000,000)',
    (() => { run("progressSeasonPassQuest('deal_damage', 2000000)"); return quests().xplodemis_02.progress === 0; })());
check('(b) matches DO accrue into the available stage 1 (play_match x5 completes it, +795 Pass XP — rescaled 2026-11-20)',
    (() => {
        const before = xpAwardCalls.length;
        run("progressSeasonPassQuest('play_match', 5)");
        return quests().xplodemis_01.progress === 5 && quests().xplodemis_01.completed === true
            && xpAwardCalls.length === before + 1 && xpAwardCalls[xpAwardCalls.length - 1] === 795;
    })());
// Drive stages 2-8 to completion with their exact new targets.
for (const [kind, amount] of [['deal_damage', 50000], ['win_match', 13], ['defeat_enemies', 30], ['perform_supers', 20], ['christmas_showdown_matches', 5], ['use_gadget', 20], ['deal_damage', 300000]]) {
    run(`progressSeasonPassQuest('${kind}', ${amount})`);
}
check('(b) stages 2-8 complete in order once unlocked', [2, 3, 4, 5, 6, 7, 8].every(n => quests()[`xplodemis_0${n}`].completed === true));
check('(b)+(f) REWORK: stage 9 accrues progress the moment stage 8 is complete — no waiting for Dec 6',
    (() => { run("progressSeasonPassQuest('different_fighters', 10)"); return quests().xplodemis_09.progress === 10 && quests().xplodemis_09.completed === true; })());
check('(f) REWORK: stage 10 unlocks the moment stage 9 completes (same day, no Dec 8 wait)',
    run('isSeasonQuestStageUnlocked({stage:10})') === true);

// --- (c) locked claim refuses + stale-save sanitize ------------------------------
check('(c) claiming a completion-locked quest is refused even when a stale save marks it completed',
    (() => {
        const q = quests().xplodemis_11;
        q.completed = true; q.progress = q.target; // stale/forced: stage 10 not done
        const before = grantCalls.length;
        const ok = run("claimSeasonPassQuestReward('xplodemis_11')");
        return ok === false && grantCalls.length === before && quests().xplodemis_11.completed === false && quests().xplodemis_11.progress === 0;
    })());
check('(b) stale save cannot smuggle progress into a locked stage (load re-check zeroes it)',
    (() => {
        smoke.playerData.seasonPass = {
            seasonId: PASS_ID, xp: 0, level: 1, premiumUnlocked: false,
            claimedFreeRewards: [], claimedPremiumRewards: [], overflowSteps: 0, overflowSuperSteps: 0,
            quests: {
                xplodemis_03: { progress: 13, completed: true, rewardClaimed: false },
                xplodemis_04: { progress: 30, completed: true, rewardClaimed: true },
                xplodemis_09: { progress: 10, completed: true, rewardClaimed: false },
            },
        };
        run('ensureSeasonPassState()');
        const q3 = quests().xplodemis_03, q4 = quests().xplodemis_04, q9 = quests().xplodemis_09;
        // Stage 3's prev (stage 2) is incomplete in this stale save, so 3+4
        // zero out; stage 9's prev (stage 8) is incomplete too, so it
        // zeroes on the completion gate (no time gate anymore).
        return q3.progress === 0 && !q3.completed && q4.progress === 0 && !q4.completed && !q4.rewardClaimed
            && q9.progress === 0 && !q9.completed;
    })());

// --- (d) NO countdown text on the locked cards (rework 2026-11-23) --------------
{
    vm.runInContext('Date.now = () => Date.UTC(2026, 11, 5, 12, 0, 0);', smoke);
    smoke.playerData.seasonPass = null;
    run("openQuestBoard('season')");
    const board = smokeBody.children.find(c => c.id === 'questBoardOverlay') || null;
    const cards = board ? collectSeasonCards(board) : [];
    const s9 = cards.find(x => /Stage 9 •/.test(x._innerHTML || ''));
    const s20 = cards.find(x => /Stage 20 •/.test(x._innerHTML || ''));
    check('(d) locked cards render NO countdown span (stage 9)',
        !!s9 && !/data-season-quest-unlock-utc/.test(s9._innerHTML || '') && !/unlocks in/.test(s9._innerHTML || ''));
    check('(d) locked cards say they unlock after the previous stage (stage 9 + stage 20)',
        !!s9 && /unlocks after the previous stage is complete/.test(s9._innerHTML || '')
        && !!s20 && /unlocks after the previous stage is complete/.test(s20._innerHTML || ''));
    check('(d) stage 1 card has no unlock note (already open)', (() => {
        const s1 = cards.find(x => /Stage 1 •/.test(x._innerHTML || ''));
        return !!s1 && !/unlocks after the previous stage/.test(s1._innerHTML || '');
    })());
}

// --- Ranked Solo ------------------------------------------------------------------
check('solo: a solo match pays RP by the Teams rules (mode solo = arena_forge = +5 base)',
    (() => {
        const solo = run("calcRankedRpGain({ mode: 'solo', kills: 5, damage: 5000, objectiveDamage: 2000, won: true, streak: 3, mvp: true })");
        const teams = run("calcRankedRpGain({ mode: 'arena_forge', kills: 5, damage: 5000, objectiveDamage: 2000, won: true, streak: 3, mvp: true })");
        return solo.total === 59 && teams.total === 59 && solo.modeRp === 5;
    })());
check('solo: placement uses Teams rank + match stats (Teams 2000 + win delta 50 -> 2050)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: 50 })');
        return p.points === 2050 && p.basePoints === 2000 && p.matchDelta === 50;
    })());
check('solo: placement caps the match delta at +300 RP (Teams 2000 + 500-delta match -> +300, 2300 RP)',
    (() => {
        const p = run('computeRankedSoloPlacement(2000, { total: 500 })');
        return p.points === 2300 && p.matchDelta === 300 && p.deltaCapPoints === 300;
    })());
check('solo: placement RESULT floors at the 1200 ladder start (Teams 0 + loss -> 1200, Teams 100 + 40 -> 1200)',
    run('computeRankedSoloPlacement(0, { total: -10 })').points === 1200
    && run('computeRankedSoloPlacement(0, { total: -10 })').matchDelta === -10
    && run('computeRankedSoloPlacement(100, { total: 40 })').points === 1200);
check('solo: placement caps at Solo PL3 (Teams 2600 + win -> 2400, higher solo prestige must be earned)',
    run('computeRankedSoloPlacement(2600, { total: 60 })').points === 2400
    && run('computeRankedSoloPlacement(2300, { total: 50 })').points === 2350);
check('solo: solo leaderboard renders with RP and YOU highlighted',
    (() => {
        smoke.playerData.ranked = { points: 500, rewardsClaimed: [], highPoints: 500, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.rankedSolo = { points: 2400, rewardsClaimed: [], placed: true, highPoints: 2400, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.prestigeLeague = {};
        smoke.playerData.prestigeLeagueSolo = {};
        run('ensurePrestigeLeagueState(Date.now(), true)');
        run('recordPrestigeLeagueMatch(true, 40, true)');
        const standings = run('getPrestigeLeagueStandings(playerData.prestigeLeagueSolo)');
        const you = standings.find(r => r.isPlayer);
        const rank = run('getPrestigeLeaguePlayerRank(playerData.prestigeLeagueSolo)');
        smokeBody.children = [];
        run('openRankedHubOverlay(__queueOverlay, () => {}, () => {})');
        const hub = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
        const html = hub ? hub.innerHTML : '';
        return you && you.rp === 40 && rank >= 1 && rank <= 6
            && html.includes('SOLO PRESTIGE LEAGUE LEADERBOARD') && html.includes('SOLO PRESTIGE LEAGUE PL3')
            && html.includes('YOU — 40 RP') && html.includes('resets every 2 days')
            && !html.includes('Teammates: Ally 1');
    })());
check('solo: hub shows the placement call-to-action before the first solo match',
    (() => {
        smoke.playerData.rankedSolo = { points: 0, rewardsClaimed: [], placed: false, highPoints: 0, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.prestigeLeagueSolo = {};
        smokeBody.children = [];
        run('openRankedHubOverlay(__queueOverlay, () => {}, () => {})');
        const hub = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
        const html = hub ? hub.innerHTML : '';
        return html.includes('RANKED SOLO') && html.includes('PLAY 1 RANKED SOLO MATCH TO GET PLACED')
            && html.includes('data-ranked-hub="play-solo"') && html.includes('▶ PLAY RANKED SOLO')
            && html.includes('Solo leagues run Bronze I to Fume III (0–1200 RP)')
            && html.includes('A placement match can add up to +300 RP')
            && !html.includes('no solo placement below that floor');
    })());
check('solo: hub shows the solo progress bar once placed (1050 RP = Brick Fume I, halfway 1050)',
    (() => {
        smoke.playerData.ranked = { points: 500, rewardsClaimed: [], highPoints: 500, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.rankedSolo = { points: 1050, rewardsClaimed: [], placed: true, highPoints: 1050, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.prestigeLeagueSolo = {};
        smokeBody.children = [];
        run('openRankedHubOverlay(__queueOverlay, () => {}, () => {})');
        const hub = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
        const html = hub ? hub.innerHTML : '';
        return html.includes('RANKED SOLO') && html.includes('<span>BRICK FUME I</span>')
            && html.includes('HALFWAY') && html.includes('NEXT: BRICK FUME II')
            && html.includes('DIVISION 11 OF 13')
            && !html.includes('NOT PLACED YET');
    })());
check('solo: soft reset applies to solo and never drops below the 1200 floor (1500, no wins -> 1200)',
    (() => {
        smoke.playerData.rankedSolo = { points: 1500, rewardsClaimed: [], highPoints: 1500, winStreak: 0, seasonId: 'turkey-trouble-arena-forge-2026-s5', seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        run('ensureRankedSoloSeasonState()');
        const s = smoke.playerData.rankedSolo;
        return s.points === 1200 && s.seasonId === PASS_ID && s.resetBoostTarget === 1500
            && s.seasonStats.wins === 0 && s.seasonStats.matches === 0;
    })());
check('solo: elo boost is x2 while below the pre-reset rank, x1 once back at it',
    (() => {
        const active = run('isRankedSoloEloBoostActive()') === true;
        smoke.playerData.rankedSolo.points = 1500;
        const done = run('isRankedSoloEloBoostActive()') === false;
        return active && done;
    })());
check('solo: the shared boost check reads the solo bucket during a solo match (flag-routed)',
    (() => {
        smoke.playerData.ranked = { points: 500, rewardsClaimed: [], highPoints: 500, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
        smoke.playerData.rankedSolo.points = 1300;
        run('isRankedSoloMatch = true');
        const soloActive = run('isRankedEloBoostActive()') === true;
        run('isRankedSoloMatch = false');
        const teamsActive = run('isRankedEloBoostActive()') === false;
        return soloActive && teamsActive;
    })());
check('solo: Teams RP is untouched by solo state (solo ladder is a separate bucket)',
    smoke.playerData.ranked.points === 500 && smoke.playerData.rankedSolo.points === 1300);

// --- Mobile landscape home UI (Anthony's sketch, 2026-11-20) ------------------
// Sketch = layout + element list; spacing/finish polished (generous gaps,
// breathing room, clean alignment). Landscape ONLY — portrait, desktop and
// web are untouched: every new element hides by default and only shows
// under .native-app + (orientation:landscape).
check('landscape: rail + action bar + settings icon + hero power button + fighters home button exist',
    game.includes(`rail.id = 'appHomeLandscapeRail';`) &&
    game.includes(`bar.id = 'appHomeLandscapeBar';`) &&
    game.includes(`settingsBtn.id = 'appHomeLandscapeSettingsBtn';`) &&
    game.includes('class="app-hero-power" data-hero-power') &&
    game.includes(`id="appFightersHomeBtn"`) &&
    game.includes('function openAppQuickLoadout() {') &&
    game.includes('function getLandscapePassBarInfo(pass) {') &&
    game.includes('function renderAppHomeLandscapeBar() {'));
check('landscape: new elements are hidden by default, so portrait never sees them',
    game.includes(`#appHomeLandscapeRail,#appHomeLandscapeBar,#appHomeLandscapeSettingsBtn,#appHomeHero .app-hero-power{display:none}`) &&
    game.includes(`.app-fighters-home-btn{display:none}`));
check('landscape: rail is the icon-only bottom nav with Search / Filter (+ Shop so the store is not stranded)',
    game.includes(`data-land-rail="search"`) && game.includes(`data-land-rail="filter"`) && game.includes(`data-land-rail="shop"`) &&
    game.includes(`.native-app #appHomeLandscapeRail{grid-column:1;grid-row:1;display:flex;flex-direction:column;`) &&
    game.includes(`if (action === 'search') { setAppHomeTab('fighters'); document.getElementById('appHomeFightersView')?.classList.add('app-fighters-search-open'); document.getElementById('appFightersSearch')?.focus(); }`) &&
    game.includes(`else if (action === 'filter') { setAppHomeTab('fighters'); if (typeof openAppFightersFilterSheet === 'function') openAppFightersFilterSheet(); }`) &&
    game.includes(`else if (action === 'shop') { setAppHomeTab('shop'); }`));
check('landscape: bottom tab bar hides on home + fighters (+ fighter), stays on events/shop/settings',
    game.includes(`.native-app #appHome[data-app-tab="home"] #appHomeTabs,.native-app #appHome[data-app-tab="fighters"] #appHomeTabs,.native-app #appHome[data-app-tab="fighter"] #appHomeTabs{display:none}`) &&
    game.includes(`try { appHomeEl.dataset.appTab = tab; } catch (_) {}`) &&
    game.includes(`try { appHomeEl.dataset.appTab = appHomeTab; } catch (_) {}`));
check('landscape: fighters screen has no bottom nav — profile (3) goes home',
    game.includes(`view.querySelector('#appFightersHomeBtn')?.addEventListener('click', () => {
                appBuzz(10);
                setAppHomeTab('home');
            });`));
check('landscape: fighters grid is 3 columns (portrait keeps the 4-per-column paging)',
    game.includes(`.native-app #appFightersStrip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));`) &&
    game.includes(`.native-app #appFightersStrip .app-fighters-page{display:contents}`) &&
    game.includes(`scroll-snap-type:none;max-height:none`) &&
    game.includes(`.native-app .app-fighter-card{aspect-ratio:1/1;min-height:0}`));
check('landscape: brawler square shows power level + tool/talent/surge kit on its right side',
    game.includes(`<span class="app-fighter-power">`) &&
    game.includes(`<span class="app-fighter-kit"`) &&
    game.includes(`.native-app .app-fighter-kit{display:flex;position:absolute;right:6px;top:50%;transform:translateY(-50%);`) &&
    game.includes(`.native-app .app-fighter-kit-icons{display:flex;flex-direction:column;gap:4px}`));
check('landscape: season pass bar shows current tier + progress to the next tier, tap opens the pass',
    game.includes(`id="appHomeLandscapePass"`) &&
    game.includes(`class="app-land-pass-bar"`) &&
    game.includes(`label.textContent = \`🎁 SEASON PASS · TIER \${info.level}\``) &&
    game.includes(`sub.textContent = info.maxed ? 'MAX TIER · PASS COMPLETE'`) &&
    game.includes(`bar.querySelector('#appHomeLandscapePass')?.addEventListener('click', () => { appBuzz(10); if (typeof openSeasonPass === 'function') openSeasonPass();`));
check('landscape: More (menu) + Settings icon + save-code icon in the top strip',
    game.includes(`document.getElementById('appHomeMenuBtn')?.addEventListener('click', () => { appBuzz(10); if (typeof openAppMoreSheet === 'function') openAppMoreSheet(); });`) &&
    game.includes(`settingsBtn.addEventListener('click', () => { appBuzz(10); setAppHomeTab('settings'); });`) &&
    game.includes(`document.getElementById('appHomeSaveBtn')?.addEventListener('click', () => { appBuzz(10); openSaveCodeModal(); });`) &&
    game.includes(`.native-app #appHomeMenuBtn{order:3;margin-left:auto}`) &&
    game.includes(`.native-app #appHomeLandscapeSettingsBtn{order:5}`) &&
    game.includes(`.native-app #appHomeSaveBtn{order:6}`));
check('landscape: Quest + Tappers icon buttons in the action row',
    game.includes(`id="appHomeLandscapeQuests"`) && game.includes(`id="appHomeLandscapeTappers"`) &&
    game.includes(`bar.querySelector('#appHomeLandscapeQuests')?.addEventListener('click', () => { appBuzz(10); if (typeof openQuestBoard === 'function') openQuestBoard(); });`) &&
    game.includes(`bar.querySelector('#appHomeLandscapeTappers')?.addEventListener('click', () => { appBuzz(10); if (typeof openAppTapperSheet === 'function') openAppTapperSheet(); });`));
check('landscape: event name pill (8) taps to change; Play Ranked (9) + Play (10) buttons',
    game.includes(`id="appHomeLandscapeEvent"`) &&
    game.includes(`bar.querySelector('#appHomeLandscapeEvent')?.addEventListener('click', () => { appBuzz(10); setAppHomeTab('events'); });`) &&
    game.includes(`id="appHomeLandscapeRanked"`) &&
    game.includes(`bar.querySelector('#appHomeLandscapeRanked')?.addEventListener('click', () => { appBuzz(10); if (typeof openRankedQueueUI === 'function') openRankedQueueUI(); });`) &&
    game.includes(`id="appHomeLandscapePlay"`) &&
    game.includes(`bar.querySelector('#appHomeLandscapePlay')?.addEventListener('click', () => { appBuzz(12); document.getElementById('startMatch')?.click(); });`));
check('landscape: hero shows brawler name + model with NO stats (stats hidden in landscape only)',
    game.includes(`.native-app #appHomeHero .app-hero-stats{display:none}`) &&
    game.includes(`<div class="app-hero-portrait">`) &&
    game.includes('<strong>${name}</strong>') &&
    game.includes(`.native-app #appHomeHero .app-hero-side{display:none}`));
check('landscape: tapping the power level opens the quick tools/talents menu (no fighters nav)',
    game.includes(`hero.querySelector('[data-hero-power]')?.addEventListener('click', (event) => { event.stopPropagation(); appBuzz(10); if (typeof openAppQuickLoadout === 'function') openAppQuickLoadout(); });`) &&
    game.includes(`sheet.className = 'app-kit-sheet-overlay';`) &&
    game.includes(`slot('g1', 'TOOL 1'`) && game.includes(`slot('sp2', 'TALENT 2'`) &&
    game.includes(`appFightersKitPick(id, btn.dataset.quickKit);`) &&
    game.includes(`if (!btn || btn.getAttribute('aria-disabled') === 'true') return;`));
check('landscape: bricks (12) + coins/gems (13) stay visible in the top strip',
    game.includes(`.native-app #appHomeTrophyChip{order:2}`) &&
    game.includes(`.native-app #appHomeCurrencies{order:1}`) &&
    !game.includes(`#appHomeTrophyChip{display:none}`) &&
    !game.includes(`#appHomeCurrencies{display:none}`) &&
    !game.includes(`#homeCurrencyBar{display:none}`));
check('landscape: every new button is rounded (sketch squares are for easy drawing only)',
    game.includes(`.native-app #appHomeLandscapeRail button{flex:none;width:48px;height:48px;display:grid;place-items:center;border-radius:999px;`) &&
    game.includes(`.native-app #appHomeLandscapeBar button{border-radius:999px;cursor:pointer}`) &&
    game.includes(`.native-app #appHomeLandscapeSettingsBtn{flex:none;width:44px;height:44px;display:grid;place-items:center;border-radius:999px;`) &&
    game.includes(`.native-app #appHomeHero .app-hero-power{position:absolute;top:12px;right:12px;z-index:4;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;`) &&
    game.includes(`.app-fighters-icon-btn{flex:none;width:44px;height:44px;display:grid;place-items:center;border-radius:12px;`) &&
    game.includes(`.app-quick-close{width:100%;padding:12px;border:0;border-radius:12px;`));
check('landscape: polished spacing — rail/bar gaps with breathing room, hero grid has air',
    game.includes(`.native-app #appHomeHeroView.is-active{display:grid;grid-template-columns:60px minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;gap:16px}`) &&
    game.includes(`gap:14px;min-width:0}`) &&
    game.includes(`.native-app #appHomeLandscapeBar{grid-column:1/-1;grid-row:2;display:flex;align-items:center;gap:12px;`) &&
    game.includes(`gap:20px;padding:20px 18px}`));
check('portrait/desktop untouched: old pinned landscape grid rule + paging base rules still present',
    game.includes(`@media (orientation:landscape){\n          #appHomeHeroView.is-active{display:grid;grid-template-columns:minmax(140px,220px) minmax(0,1fr) minmax(140px,220px);`) &&
    game.includes(`grid-template-rows:repeat(4,minmax(0,1fr))`) &&
    game.includes(`scroll-snap-type:x proximity`) &&
    game.includes(`if (appHomeEl || !isNativeAppMode()) return;`));
check('portrait untouched: the new landscape ids never appear in a portrait media query',
    (() => {
        const cssStart = game.indexOf('/* ---- Mobile landscape home UI');
        const css = game.slice(cssStart, game.indexOf('`;', cssStart));
        const portraitHits = [...css.matchAll(/@media \(orientation:portrait\)/g)].length;
        const landBlock = css.slice(css.indexOf('@media (orientation:landscape){'));
        return portraitHits === 0 && landBlock.includes('appHomeLandscape') && landBlock.includes('app-fighter-kit');
    })());
check('hygiene: zero bare forbidden word in game.js + this suite',
    !/\bcluster\b/i.test(game) && !/\bcluster\b/i.test(self));

// --- vm: landscape pass-bar math + render + quick loadout ----------------------
// Per-tier table (2026-11-20): level is derived from XP. Cumulative XP to
// reach tier 7 is 6x400 = 2400, so xp 2600 = tier 7, 200 into a 400 tier;
// to reach tier 10 is 9x400 = 3600, so xp 3925 = tier 10, 325 into a 650
// tier. Maxed shows a full bar (xpInto = xpPerLevel of the last tier).
check('landscape vm: pass-bar math — tier 1 fresh, mid-tier, maxed',
    run('JSON.stringify(getLandscapePassBarInfo({level:1,xp:0}))') === JSON.stringify({ level: 1, xpInto: 0, xpPerLevel: 400, xpToNext: 400, pct: 0, maxed: false }) &&
    run('JSON.stringify(getLandscapePassBarInfo({level:7,xp:2600}))') === JSON.stringify({ level: 7, xpInto: 200, xpPerLevel: 400, xpToNext: 200, pct: 50, maxed: false }) &&
    run('JSON.stringify(getLandscapePassBarInfo({level:10,xp:3925}))') === JSON.stringify({ level: 10, xpInto: 325, xpPerLevel: 650, xpToNext: 325, pct: 50, maxed: false }) &&
    run('JSON.stringify(getLandscapePassBarInfo({level:50,xp:99999}))') === JSON.stringify({ level: 50, xpInto: 1135, xpPerLevel: 1135, xpToNext: 0, pct: 100, maxed: true }) &&
    run('JSON.stringify(getLandscapePassBarInfo(null))') === JSON.stringify({ level: 1, xpInto: 0, xpPerLevel: 400, xpToNext: 400, pct: 0, maxed: false }));
check('landscape vm: render fills the pass bar + event pill from live state',
    (() => {
        const landPass = new El('button'); landPass.id = 'appHomeLandscapePass';
        const barWrap = new El('span'); barWrap.className = 'app-land-pass-bar';
        const barFill = new El('i'); barWrap.appendChild(barFill);
        const label = new El('b'); const sub = new El('small');
        landPass.appendChild(label); landPass.appendChild(barWrap); landPass.appendChild(sub);
        const landEvent = new El('button'); landEvent.id = 'appHomeLandscapeEvent';
        const evLabel = new El('b'); const evTag = new El('i'); evTag.textContent = 'CHANGE';
        landEvent.appendChild(evLabel); landEvent.appendChild(evTag);
        smokeBody.appendChild(landPass); smokeBody.appendChild(landEvent);
        smoke.HOME_MODE_DATA = { solo: ['solo', '⚔', 'Showdown', 'Enter the arena'] };
        smoke.showdownMode = 'solo';
        smoke.playerData.seasonPass = { level: 7, xp: 2600 };
        run('renderAppHomeLandscapeBar()');
        return barFill.style.width === '50%' && label.textContent === '🎁 SEASON PASS · TIER 7'
            && sub.textContent === '200/400 XP · 200 XP TO TIER 8'
            && evLabel.textContent === '⚔ Showdown';
    })());
check('landscape vm: quick loadout sheet lists tools/talents and equips on tap; locked slots refuse',
    (() => {
        smoke.isNativeAppMode = () => true;
        smoke.syncAppHome = () => {};
        smoke.brawlerData = { outlit: { name: 'Outlit', color: '#0b69bd', g1: 'Gadget One: does a thing', g2: 'Gadget Two: does another', sp1: 'Star One: shines', sp2: 'Star Two: glows' } };
        smoke.selectedBrawler = 'outlit';
        smoke.getEffectiveBrawlerProgress = () => ({ level: 11, gadgetUnlocked: true, starPowerUnlocked: false, hyperchargeUnlocked: true, selectedGadget: 'g1', selectedStar: 'slow' });
        smoke.kitName = (raw, fb) => raw ? String(raw).split(':')[0].split('(')[0].trim() : fb;
        smoke.kitDesc = () => '';
        const kitPicks = []; smoke.appFightersKitPick = (id, key) => { kitPicks.push([id, key]); };
        run('openAppQuickLoadout()');
        const sheet = smoke.document.getElementById('appQuickLoadoutSheet');
        if (!sheet) return false;
        const text = visibleText(sheet);
        const hasSlots = text.includes('TOOL 1') && text.includes('TOOL 2') && text.includes('TALENT 1') && text.includes('TALENT 2')
            && text.includes('LOCKED · POWER 9') && text.includes('QUICK LOADOUT');
        const slotG2 = sheet.querySelector('[data-quick-kit="g2"]');
        const slotSp1 = sheet.querySelector('[data-quick-kit="sp1"]');
        if (!slotG2 || !slotSp1) return false;
        slotSp1.setAttribute('aria-disabled', 'true');
        const click = sheet._listeners.click[0];
        click({ target: slotG2 });
        const equipped = kitPicks.length === 1 && kitPicks[0][0] === 'outlit' && kitPicks[0][1] === 'g2'
            && smoke.document.getElementById('appQuickLoadoutSheet') === null;
        run('openAppQuickLoadout()');
        const sheet2 = smoke.document.getElementById('appQuickLoadoutSheet');
        if (!sheet2) return false;
        const slotSp1b = sheet2.querySelector('[data-quick-kit="sp1"]');
        slotSp1b.setAttribute('aria-disabled', 'true');
        sheet2._listeners.click[0]({ target: slotSp1b });
        return hasSlots && equipped && kitPicks.length === 1
            && smoke.document.getElementById('appQuickLoadoutSheet') !== null;
    })());

if (failed) { console.error(`season-quests-tuning: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`season-quests-tuning: ${passed} passed`);
