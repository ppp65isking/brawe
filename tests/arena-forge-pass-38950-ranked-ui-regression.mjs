// Pass 38,950 + Ranked entry redesign + Solo floor 1200 (2026-11-20, Anthony's round).
// (1) Pass total is 38,950 XP, not 4,900 — per-tier table in five bands,
//     and the Xplodemis season-quest XP ladder rescaled to sum to 38,950.
// (2) Ranked entry redesign: Teams and Solo are BOTH visible in the same
//     Ranked hub and selectable via mode tabs, each with its own progress
//     bar / Prestige League leaderboard view and its own PLAY button.
// (3) Solo Prestige leagues start at 1200 RP now — solo ONLY. Teams keeps
//     its 1300 RP floor (Brick Master I, above Fume III). 1200 RP is Brick
//     Fume III (100 RP per division, idx 12), so the solo ladder now starts
//     one division lower than Teams' floor — that is Anthony's call, and
//     the interpretation is flagged, not smoothed over.
// Builder picks flagged below: the per-tier band values (400/650/800/950/
// 1135) and the rescaled quest bands (795/1391/2186/3418) — Anthony's own
// bands add to 38,950 but the per-tier numbers were never written into
// code, so both tables are proportional rescales of the old model.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = read('tests/arena-forge-pass-38950-ranked-ui-regression.mjs');
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

// --- (1) pass total = 38,950 ---------------------------------------------------
const PASS_XP_PER_TIER = evalLiteral(extractConst(game, 'SEASON_PASS_XP_PER_TIER'));
const PASS_TOTAL_XP = evalLiteral(extractConst(game, 'SEASON_PASS_TOTAL_XP'));
const PASS_MAX_LEVEL = evalLiteral(extractConst(game, 'SEASON_PASS_MAX_LEVEL'));
check('pass: still 50 tiers', PASS_MAX_LEVEL === 50);
check('pass: per-tier table has 49 level-up costs', PASS_XP_PER_TIER.length === 49);
check('pass: per-tier table sums to exactly 38,950', PASS_XP_PER_TIER.reduce((s, v) => s + v, 0) === 38950);
check('pass: total const is 38,950', PASS_TOTAL_XP === 38950);
check('pass: bands are 400 (x9) / 650 (x10) / 800 (x10) / 950 (x10) / 1135 (x10) — BUILDER PICK, escalating',
    PASS_XP_PER_TIER.slice(0, 9).every(v => v === 400) && PASS_XP_PER_TIER.slice(9, 19).every(v => v === 650)
    && PASS_XP_PER_TIER.slice(19, 29).every(v => v === 800) && PASS_XP_PER_TIER.slice(29, 39).every(v => v === 950)
    && PASS_XP_PER_TIER.slice(39, 49).every(v => v === 1135));
check('pass: flat 100 XP/level model is gone', !game.includes('SEASON_PASS_XP_PER_LEVEL'));
check('pass: premium still 100 gems / 11,999 coins', game.includes('const SEASON_PREMIUM_UNLOCK_GEMS = 100;') && game.includes('const SEASON_PREMIUM_UNLOCK_COINS = 11999;'));
check('pass: tier-50 skin still Holiday Lights FreeZeon', game.includes("premium.id === 'holiday-lights-freezeon'") || game.includes("'holiday-lights-freezeon'"));
check('pass: overflow still every extra 1000 XP = 2 random tappers, every 2500 = a super tapper',
    extractFunction(game, 'awardSeasonPassOverflow').includes('SEASON_PASS_TOTAL_XP')
    && game.includes('const steps = Math.floor(over / 1000);') && game.includes('const superSteps = Math.floor(over / 2500);'));
check('pass: daily (+25) / weekly (+100) Pass XP unchanged', game.includes('passXP:100') && game.includes('passXP:25'));
check('pass: match XP unchanged (25 win / 15 loss)', game.includes('awardSeasonPassXp(won ? 25 : 15)'));

const xplodemisDefs = evalLiteral(extractConst(game, 'XPLODEMIS_QUEST_DEFS'));
const questXpSum = xplodemisDefs.reduce((s, d) => s + d.xpReward, 0);
check(`quests: Xplodemis season quest XP sums to exactly 38,950 (got ${questXpSum})`, questXpSum === 38950);
check('quests: rescaled ladder keeps the old shape — 795 / 1391 / 2186 / 3418 (BUILDER PICK, proportional rescale)',
    xplodemisDefs.slice(0, 5).every(d => d.xpReward === 795)
    && xplodemisDefs.slice(5, 10).every(d => d.xpReward === 1391)
    && xplodemisDefs.slice(10, 15).every(d => d.xpReward === 2186)
    && xplodemisDefs.slice(15, 20).every(d => d.xpReward === 3418));
check('quests: still 20 stages, targets and rewards untouched by the rescale',
    xplodemisDefs.length === 20 && xplodemisDefs.every((d, i) => d.stage === i + 1)
    && xplodemisDefs[0].target === 5 && xplodemisDefs[19].target === 35);

// --- (1) vm: level math from the table -----------------------------------------
const tableCtx = vm.createContext({});
const table = PASS_XP_PER_TIER;
const helpers = {};
for (const fn of ['seasonPassXpToReachLevel', 'seasonPassLevelForXp', 'seasonPassXpIntoLevel', 'seasonPassXpPerLevel', 'seasonPassLevelProgress']) {
    vm.runInContext(extractFunction(game, fn), tableCtx);
    vm.runInContext(`SEASON_PASS_MAX_LEVEL = ${PASS_MAX_LEVEL}; SEASON_PASS_XP_PER_TIER = ${JSON.stringify(table)};`, tableCtx);
}
const runTable = (code) => vm.runInContext(code, tableCtx);
check('pass vm: 0 XP is tier 1, 38950 XP is tier 50',
    runTable('seasonPassLevelForXp(0)') === 1 && runTable('seasonPassLevelForXp(38950)') === 50
    && runTable('seasonPassLevelForXp(99999)') === 50);
check('pass vm: tier boundaries follow the bands (400 -> tier 2, 3600 -> tier 10, 10100 -> tier 20)',
    runTable('seasonPassLevelForXp(399)') === 1 && runTable('seasonPassLevelForXp(400)') === 2
    && runTable('seasonPassLevelForXp(3599)') === 9 && runTable('seasonPassLevelForXp(3600)') === 10
    && runTable('seasonPassLevelForXp(10100)') === 20 && runTable('seasonPassLevelForXp(38949)') === 49);
check('pass vm: progress object — tier 7 at 2600 XP is 200/400, 50%',
    JSON.stringify(runTable('seasonPassLevelProgress(2600)')) === JSON.stringify({ level: 7, xpInto: 200, xpPerLevel: 400, xpToNext: 200, pct: 50, maxed: false }));
check('pass vm: an old maxed save (4900 XP) re-levels to tier 12 under the new total — XP kept, tier not kept',
    runTable('seasonPassLevelForXp(4900)') === 12);

// --- (1) vm: token module honours the table, flat-100 without it ---------------
{
    const tokensSrc = read('modules/progression/pass-tokens.js');
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(tokensSrc, sandbox);
    const T = sandbox.BrawePassTokens;
    const fresh = (xp, level) => ({ xp, level, tokenWallet: xp, tokensEarned: xp, tokenPurchases: {}, tokenSchema: 1 });
    const withTable = fresh(38950, 1);
    T.normalize(withTable, 50, PASS_XP_PER_TIER);
    check('tokens: normalize with the table puts 38950 XP at tier 50', withTable.level === 50);
    const oldSave = fresh(4900, 50);
    T.normalize(oldSave, 50, PASS_XP_PER_TIER);
    check('tokens: normalize with the table re-levels an old tier-50 save (4900 XP) to tier 12', oldSave.level === 12);
    const noTable = fresh(150, 1);
    T.normalize(noTable, 50);
    check('tokens: normalize without a table keeps the old flat-100 behaviour (150 XP -> tier 2)', noTable.level === 2);
    const earned = fresh(0, 1);
    T.earn(earned, 795, 50, PASS_XP_PER_TIER);
    check('tokens: earn with the table credits XP and levels from it (795 XP -> tier 2)', earned.level === 2 && earned.xp === 795 && earned.tokenWallet === 795);
}

// --- (3) solo floor 1200, Teams floor still 1300 --------------------------------
const SOLO_FLOOR = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_FLOOR_RP'));
const SOLO_CAP = evalLiteral(extractConst(game, 'RANKED_SOLO_PLACEMENT_CAP_RP'));
check('solo floor: placement floor const is 1200 RP', SOLO_FLOOR === 1200);
check('solo floor: placement cap is still 2400 RP', SOLO_CAP === 2400);
check('solo floor: 1200 RP is Brick Fume III (idx 12, 100 RP/division) — solo leagues now start at Fume III',
    (() => {
        const divs = evalLiteral(extractConst(game, 'RANKED_DIVISIONS'));
        return divs[Math.floor(1200 / 100)].label === 'Brick Fume III' && divs[Math.floor(1300 / 100)].label === 'Brick Master I';
    })());
check('solo floor: hub labels say Brick Fume III (1200 RP), not Master I (1300 RP)',
    game.includes('Solo leagues start at Brick Fume III (1200 RP)') && !game.includes('Solo leagues start at Brick Master I (1300 RP)'));
check('teams floor: isRankedAboveBrickFume is still 1300 (Brick Master I) — Teams untouched',
    extractFunction(game, 'isRankedAboveBrickFume').includes('return points >= 1300;'));
check('teams floor: division floor table still has the 1300 step — Teams untouched',
    extractFunction(game, 'getRankedDivisionFloor').includes('if (points >= 1300) return 1300;'));
check('solo floor: RP gain rules, Prestige payouts (100/5, 50/3, 25/2), 3-day cycles, max PL5 unchanged',
    game.includes('const PRESTIGE_LEAGUE_MAX = 5;') && game.includes('3 * 24 * 60 * 60 * 1000')
    && extractFunction(game, 'calcRankedRpGain').includes('RANKED_RP_MODE_BASE[mode]'));

// --- (2) Ranked entry: both modes visible + selectable (static) ------------------
const hubSrc = extractFunction(game, 'openRankedHubOverlay');
check('hub: mode tabs exist for both modes', hubSrc.includes('data-ranked-mode-tab="teams"') && hubSrc.includes('data-ranked-mode-tab="solo"'));
check('hub: tabs show each mode\'s live rank (Teams label + RP, Solo label + RP or NOT PLACED YET)',
    hubSrc.includes('RANKED TEAMS · ${tierInfo.label.toUpperCase()} · ${tierInfo.points} RP')
    && hubSrc.includes("RANKED SOLO · ${soloPlaced ? `${soloTierInfo.label.toUpperCase()} · ${soloPoints} RP` : 'NOT PLACED YET'}"));
check('hub: Teams is the default selection (data-ranked-mode=teams, Teams tab + card is-selected)',
    hubSrc.includes("hub.setAttribute('data-ranked-mode', 'teams')")
    && hubSrc.includes('class="ranked-hub-mode-tab is-selected"') && hubSrc.includes('class="ranked-hub-main is-selected"'));
check('hub: both mode cards render in the same hub', hubSrc.includes('class="ranked-hub-main') && hubSrc.includes('class="ranked-hub-solo"'));
check('hub: each card carries its own PLAY button (Teams + Solo)',
    hubSrc.includes('class="ranked-hub-play ranked-hub-play-card" data-ranked-hub="play">▶ PLAY RANKED</button>')
    && hubSrc.includes('class="ranked-hub-play ranked-hub-play-card" data-ranked-hub="play-solo">▶ PLAY RANKED SOLO</button>'));
check('hub: footer kept (boost chips) — PLAY moved into the cards, not deleted',
    hubSrc.includes('class="ranked-hub-foot"') && hubSrc.includes('RANK BOOST!') && hubSrc.includes('SOLO RANK BOOST!'));
check('hub: non-Prestige players see the progress bar (current league / HALFWAY / next league) for BOTH modes',
    hubSrc.includes('inPrestigeLeague ? leagueBoardHtml : rankedProgressHtml')
    && hubSrc.includes('soloInPrestigeLeague ? soloLeagueBoardHtml : soloProgressHtml')
    && hubSrc.includes('HALFWAY') && hubSrc.includes('NEXT:'));
check('hub: Prestige League players see the leaderboard instead, for BOTH modes',
    hubSrc.includes('PRESTIGE LEAGUE LEADERBOARD') && hubSrc.includes('SOLO PRESTIGE LEAGUE LEADERBOARD')
    && hubSrc.includes('Teammates:'));
check('hub: tab taps switch the selection without closing the hub',
    hubSrc.includes('selectRankedHubMode(modeTab.dataset.rankedModeTab)') && hubSrc.includes("hub.setAttribute('data-ranked-mode', next)"));
check('hub: both cards get equal width so Solo fits alongside Teams',
    game.includes('.ranked-hub-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}'));
check('hub: selected-card highlight + tab styles exist',
    game.includes('.ranked-hub-mode-tab.is-selected') && game.includes('.ranked-hub-main.is-selected,.ranked-hub-solo.is-selected'));

// --- (2)+(3) vm: real hub render + tab switching + solo clamp --------------------
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
    'PRESTIGE_LEAGUE_CYCLE_MS', 'PRESTIGE_LEAGUE_OPPONENT_COUNT',
    'RANKED_SEASON_RESET_PRESTIGE_LEVELS_DROPPED', 'RANKED_SEASON_RESET_DROP_RP',
    'RANKED_SEASON_RESET_PRESTIGE_FLOOR_RP', 'RANKED_SEASON_RESET_WIN_CREDIT_RP',
    'RANKED_SEASON_RESET_WIN_CREDIT_CAP_RP', 'RANKED_SEASON_RESET_WINRATE_CREDIT_RP',
    'RANKED_ELO_BOOST_MULTIPLIER',
    'RANKED_SOLO_PLACEMENT_FLOOR_RP', 'RANKED_SOLO_PLACEMENT_CAP_RP', 'RANKED_SOLO_LEAGUE_OPPONENT_SALT']) {
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
    'computeRankedSoloPlacement', 'ensureRankedSoloSeasonState', 'isRankedSoloEloBoostActive',
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
    smoke.__playedTeams = 0; smoke.__playedSolo = 0;
    run('openRankedHubOverlay(__queueOverlay, () => { __playedTeams++; }, () => { __playedSolo++; })');
    return smokeBody.children.find(c => c.id === 'rankedHubOverlay') || null;
}
function clickHub(hub, target) {
    const listeners = hub._listeners.click || [];
    for (const fn of listeners) fn({ target });
}

// solo clamp [1200, 2400] in the real helper
check('solo vm: placement clamps to [1200, 2400] (Teams 0 + loss -> 1200, Teams 2600 + win -> 2400)',
    run('computeRankedSoloPlacement(0, { total: -10 })').points === 1200
    && run('computeRankedSoloPlacement(2600, { total: 60 })').points === 2400
    && run('computeRankedSoloPlacement(2000, { total: 50 })').points === 2050
    && run('computeRankedSoloPlacement(0, { total: -10 })').floorPoints === 1200);
check('solo vm: a 1250-RP solo player is Brick Fume III — the new solo starting league',
    run('getRankedTierInfo(1250)').label === 'Brick Fume III' && run('getRankedTierInfo(1300)').label === 'Brick Master I');

// hub: both modes visible, Teams selected by default
{
    const hub = openHub(1400, 1350, true); // 1400 RP = Brick Master II, 1350 RP = Brick Master I
    const html = hub ? hub.innerHTML : '';
    check('hub vm: both mode tabs render with live ranks',
        html.includes('data-ranked-mode-tab="teams"') && html.includes('data-ranked-mode-tab="solo"')
        && html.includes('RANKED TEAMS') && html.includes('RANKED SOLO'));
    check('hub vm: default selection is Teams', hub.getAttribute('data-ranked-mode') === 'teams'
        && hub.querySelector('.ranked-hub-main').className.includes('is-selected')
        && !hub.querySelector('.ranked-hub-solo').className.includes('is-selected'));
    check('hub vm: both cards show their own progress bar (Teams Master II + Solo Master I)',
        html.includes('<span>BRICK MASTER II</span>') && html.includes('<span>BRICK MASTER I</span>'));
    check('hub vm: each card has its own PLAY button',
        hub.querySelectorAll('[data-ranked-hub="play"]').length === 1
        && hub.querySelectorAll('[data-ranked-hub="play-solo"]').length === 1);
}

// hub: tapping the Solo tab selects Solo and does NOT close the hub
{
    const hub = openHub(1500, 1350, true);
    const soloTab = hub.querySelector('[data-ranked-mode-tab="solo"]');
    clickHub(hub, soloTab);
    check('hub vm: Solo tab tap selects Solo (data-ranked-mode=solo, Solo card highlighted, Teams un-highlighted)',
        hub.getAttribute('data-ranked-mode') === 'solo'
        && hub.querySelector('.ranked-hub-solo').className.includes('is-selected')
        && !hub.querySelector('.ranked-hub-main').className.includes('is-selected')
        && soloTab.getAttribute('aria-selected') === 'true'
        && hub.querySelector('[data-ranked-mode-tab="teams"]').getAttribute('aria-selected') === 'false');
    check('hub vm: Solo tab tap does not close the hub', smokeBody.children.includes(hub));
    const teamsTab = hub.querySelector('[data-ranked-mode-tab="teams"]');
    clickHub(hub, teamsTab);
    check('hub vm: Teams tab tap switches back', hub.getAttribute('data-ranked-mode') === 'teams'
        && hub.querySelector('.ranked-hub-main').className.includes('is-selected'));
}

// hub: card PLAY buttons play the right mode
{
    const hub = openHub(1500, 1350, true);
    clickHub(hub, hub.querySelector('[data-ranked-hub="play-solo"]'));
    check('hub vm: Solo card PLAY starts a solo match and closes the hub', smoke.__playedSolo === 1 && smoke.__playedTeams === 0 && !smokeBody.children.includes(hub));
    const hub2 = openHub(1500, 1350, true);
    clickHub(hub2, hub2.querySelector('[data-ranked-hub="play"]'));
    check('hub vm: Teams card PLAY starts a Teams match and closes the hub', smoke.__playedTeams === 1 && smoke.__playedSolo === 0 && !smokeBody.children.includes(hub2));
}

// hub: unplaced solo still shows the placement CTA with the 1200 floor; prestige solo shows its own board
{
    const hub = openHub(500, 0, false);
    const html = hub ? hub.innerHTML : '';
    check('hub vm: unplaced solo shows the placement CTA + Fume III 1200 floor',
        html.includes('PLAY 1 RANKED SOLO MATCH TO GET PLACED') && html.includes('Solo leagues start at Brick Fume III (1200 RP)')
        && html.includes('NOT PLACED YET'));
    smoke.playerData.ranked = { points: 500, rewardsClaimed: [], highPoints: 500, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.rankedSolo = { points: 2400, rewardsClaimed: [], placed: true, highPoints: 2400, winStreak: 0, seasonId: PASS_ID, seasonStats: { wins: 0, matches: 0, kills: 0, damage: 0 } };
    smoke.playerData.prestigeLeague = {};
    smoke.playerData.prestigeLeagueSolo = {};
    run('ensurePrestigeLeagueState(Date.now(), true)');
    run('recordPrestigeLeagueMatch(true, 40, true)');
    smokeBody.children = [];
    run('openRankedHubOverlay(__queueOverlay, () => {}, () => {})');
    const hub2 = smokeBody.children.find(c => c.id === 'rankedHubOverlay');
    const html2 = hub2 ? hub2.innerHTML : '';
    check('hub vm: Prestige solo shows its own leaderboard (not the Teams board)',
        html2.includes('SOLO PRESTIGE LEAGUE LEADERBOARD') && html2.includes('YOU — 40 RP'));
}

// --- hygiene --------------------------------------------------------------------
check('hygiene: zero bare forbidden word in game.js + this suite',
    !/\bcluster\b/i.test(game) && !/\bcluster\b/i.test(self));
check('hygiene: no Brawl Stars wording/branding in the new hub or pass copy',
    !/brawl stars/i.test(hubSrc) && !/brawl stars/i.test(extractFunction(game, 'seasonPassLevelProgress')));

if (failed) { console.error(`pass-38950-ranked-ui: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`pass-38950-ranked-ui: ${passed} passed`);
