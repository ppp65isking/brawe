// Season quests fix (2026-11-20, Anthony's report): the rebuilt 20-quest
// season ladders never showed up in the game, and later-season quests must
// be VISIBLE but grayed out with a "coming soon" label — not hidden, not
// claimable/active. Currently-available season quests stay normal + claimable.
// Daily/weekly quests, Pass XP labels, the pass screen and fighters are
// untouched; no reward or XP changes (Pass XP daily +300 / weekly +600
// is the 2026-11-23 rework — see the pitch-rework suite for the math).
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- source extraction helpers (same shape as season-pass-50) ---------------
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
// Extract the value source of `const NAME = <value>;` (arrays/objects/scalars).
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
check('fix1: season view attaches its quest box to the wrapper (root cause: it never did, so the season tab rendered empty)',
    game.includes('wrapper.appendChild(questBox);'));
check('fix1: no leftover always-unlocked season quest in the season view',
    !/const unlocked = true;/.test(game));
check('fix2: a stage-unlock helper gates season quests',
    game.includes('function isSeasonQuestStageUnlocked('));
check('fix2: season view renders a "Coming Soon" label for later-season quests',
    game.includes('Coming Soon'));
check('fix2: season view grays out coming-soon quests (reduced opacity)',
    /questCard\.style\.opacity/.test(game));
check('fix2: progress only flows into unlocked season quests',
    extractFunction(game, 'progressSeasonPassQuest').includes('isSeasonQuestStageUnlocked'));
check('fix2: claiming a locked season quest is refused',
    extractFunction(game, 'claimSeasonPassQuestReward').includes('isSeasonQuestStageUnlocked'));
check('untouched: daily/weekly quest schema still v5, weekly still 4/week',
    game.includes('DAILY_WEEKLY_QUEST_SCHEMA_VERSION = 5') && game.includes("buildRandomContractBucket(WEEKLY_CONTRACT_POOL, 4,"));
check('untouched: past/future season quest tables still pay 100 XP each (turkey + ember, 20 quests each — only the live Xplodemis set retuned in the 2026-11-20 tuning round)',
    (game.match(/xpReward:100/g) || []).length >= 20);
check('untouched: season tab still named "Season Quests"',
    game.includes("makeTab('season', '⚡ Season Quests')"));

// --- vm smoke: the real render, end to end ----------------------------------
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
            const tabM = attrs.match(/data-tab="([^"]*)"/); if (tabM) el.dataset.tab = tabM[1];
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
function collectButtons(el) {
    const out = [];
    const walk = (e) => { for (const c of e.children) { if (c.tagName === 'BUTTON') out.push(c); walk(c); } };
    walk(el);
    return out;
}
// A quest card is the div whose innerHTML holds "Stage N • <title>".
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
    isFriendlyBattle: false,
    playerData: {
        coins: 0, gems: 0, souls: 0, starrDrops: 0, superTapperCount: 0, hyperTapperCount: 0,
        presentCount: 0, ownedSkins: {}, selectedSkins: {},
        questBoard: { daily: {}, weekly: {}, questXP: 0, questLevel: 0 },
        seasonPass: null, xplodemisDaily: { dayKey: 'x', played: true, claimed: 0 },
    },
    brawlerData: {}, skinsDatabase: {},
    saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {}, refreshHomeUI: () => {},
    refreshDailyWeeklyQuests: () => {},
    addDailyWeeklyQuestProgress: () => false,
    awardSeasonPassXp: (amount) => { xpAwardCalls.push(amount); return true; },
    grantReward: (r) => { grantCalls.push(r); return true; },
    claimQuestReward: () => false,
    ensureXplodemisDaily: () => smoke.playerData.xplodemisDaily,
    getDailyPresentAllowance: () => 1,
    claimDailyPresent: () => false,
};
// Real season data + constants, evaluated out of game.js.
for (const name of ['TURKEY_TROUBLE_SEASON_ID', 'TURKEY_TROUBLE_START_UTC', 'TURKEY_TROUBLE_END_UTC',
    'XPLODEMIS_SEASON_ID', 'XPLODEMIS_START_UTC', 'XPLODEMIS_END_UTC',
    'EMBER_FORGE_SEASON_ID', 'EMBER_FORGE_START_UTC', 'EMBER_FORGE_END_UTC',
    'SEASON_PASS_SCHEMA_VERSION', 'SEASON_PASS_MAX_LEVEL', 'SEASON_PASS_XP_PER_TIER', 'SEASON_QUEST_STAGE_COUNT']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
for (const name of ['TURKEY_TROUBLE_PASS_TIERS', 'XPLODEMIS_PASS_TIERS', 'EMBER_FORGE_PASS_TIERS',
    'TURKEY_TROUBLE_QUEST_DEFS', 'XPLODEMIS_QUEST_DEFS', 'EMBER_FORGE_QUEST_DEFS']) {
    smoke[name] = evalLiteral(extractConst(game, name));
}
vm.createContext(smoke);
for (const fn of ['ensureBrawePassTokens', 'getActiveSeasonProfile', 'getActiveSeasonPassId',
    'buildSeasonPassQuests', 'resetSeasonPassForAll', 'ensureSeasonPassState',
    'isSeason3PassActive', 'getClaimableSeasonQuestCount', 'questRewardText',
    'normalizeQuestKey', 'progressSeasonPassQuest', 'claimSeasonPassQuestReward',
    'isQuestStageUnlocked', 'getQuestProgressCount', 'openQuestBoard',
    // Season quests rework (2026-11-23): the time gate is DELETED — no
    // timer functions exist anymore. Only the sanitize helper loads
    // alongside the season functions, or the vm harness throws the
    // moment a season function runs.
    'sanitizeSeasonQuestProgress']) {
    try { vm.runInContext(extractFunction(game, fn), smoke); }
    catch (e) { check(`smoke setup: extract+load ${fn}`, false); }
}
// The new helper is defined next to isQuestStageUnlocked; if it is missing
// (pre-fix code) the extract throws and the smoke checks below fail loudly.
let helperLoaded = true;
try { vm.runInContext(extractFunction(game, 'isSeasonQuestStageUnlocked'), smoke); }
catch (e) { helperLoaded = false; }
check('smoke setup: isSeasonQuestStageUnlocked loads in the harness', helperLoaded);

// Freeze "now" inside the Xplodemis window (Nov 20 2026 – Dec 31 2026) so the
// active profile is the rebuilt 50-tier Xplodemis season.
// NOTE: overriding the HOST Date.now does NOT reach inside the vm context
// (the context has its own Date intrinsic), so freeze the vm's Date too —
// otherwise the active season profile reads the real wall clock. There
// is NO time gate anymore (rework 2026-11-23): the freeze only pins the
// season window, it gates nothing.
const realNow = Date.now;
Date.now = () => Date.UTC(2026, 11, 5, 12, 0, 0);
vm.runInContext('Date.now = () => Date.UTC(2026, 11, 5, 12, 0, 0);', smoke);
let board = null, boardText = '', cards = [];
try {
    vm.runInContext('openQuestBoard(\'season\')', smoke);
    board = smokeBody.children.find(c => c.id === 'questBoardOverlay') || null;
    boardText = board ? visibleText(board) : '';
    cards = board ? collectSeasonCards(board) : [];
} catch (e) {
    check(`smoke: openQuestBoard('season') renders without throwing (${e.message})`, false);
}
Date.now = realNow;

check('smoke: season tab renders all 20 Xplodemis season quests', cards.length === 20);
check('smoke: season tab shows the first quest (First Snowfall) and the last (XPLODEMIS MASTER)',
    boardText.includes('First Snowfall') && boardText.includes('XPLODEMIS MASTER'));
check('smoke: stage 1 quest is available and normal (In Progress, not grayed, not Coming Soon)',
    (() => {
        const c = cards.find(x => /Stage 1 •/.test(x._innerHTML || ''));
        if (!c) return false;
        const btn = c.children.find(x => x.tagName === 'BUTTON');
        return !!btn && btn.textContent === 'In Progress' && (c.style.opacity === '' || c.style.opacity == null || Number(c.style.opacity) >= 1) && !/Coming Soon/.test(c._innerHTML || '');
    })());
check('smoke: later-season quests are visible but grayed out with a Coming Soon label',
    (() => {
        const later = cards.filter(x => !/Stage 1 •/.test(x._innerHTML || ''));
        if (later.length !== 19) return false;
        return later.every(c => {
            const btn = c.children.find(x => x.tagName === 'BUTTON');
            return Number(c.style.opacity) < 1 && /Coming Soon/.test(c._innerHTML || '') && !!btn && btn.textContent === 'Coming Soon';
        });
    })());
check('smoke: clicking a Coming Soon quest claims nothing',
    (() => {
        const before = grantCalls.length;
        const c = cards.find(x => /Stage 5 •/.test(x._innerHTML || ''));
        const btn = c && c.children.find(x => x.tagName === 'BUTTON');
        if (!btn || typeof btn.onclick !== 'function') return false;
        btn.onclick();
        return grantCalls.length === before && smoke.playerData.seasonPass.quests.xplodemis_05.rewardClaimed === false;
    })());
check('smoke: progress does NOT flow into a locked later-stage quest',
    (() => {
        vm.runInContext("progressSeasonPassQuest('perform_supers', 10)", smoke);
        const q = smoke.playerData.seasonPass.quests.xplodemis_05;
        return q.progress === 0 && q.completed === false;
    })());
check('smoke: progress DOES flow into the available stage-1 quest and completes it',
    (() => {
        // Season quests tuning (2026-11-20): stage 1 target is 5 battles now, not 3.
        vm.runInContext("progressSeasonPassQuest('play_match', 5)", smoke);
        const q = smoke.playerData.seasonPass.quests.xplodemis_01;
        return q.progress === 5 && q.completed === true;
    })());
check('smoke: finishing stage 1 unlocks stage 2 (no longer Coming Soon) while stage 3+ stay Coming Soon',
    (() => {
        vm.runInContext("openQuestBoard('season')", smoke);
        const fresh = smokeBody.children.find(c => c.id === 'questBoardOverlay');
        const freshCards = fresh ? collectSeasonCards(fresh) : [];
        const s2 = freshCards.find(x => /Stage 2 •/.test(x._innerHTML || ''));
        const s3 = freshCards.find(x => /Stage 3 •/.test(x._innerHTML || ''));
        const s2btn = s2 && s2.children.find(x => x.tagName === 'BUTTON');
        const s3btn = s3 && s3.children.find(x => x.tagName === 'BUTTON');
        return !!s2 && !/Coming Soon/.test(s2._innerHTML || '') && !!s2btn && s2btn.textContent === 'In Progress'
            && !!s3 && /Coming Soon/.test(s3._innerHTML || '') && !!s3btn && s3btn.textContent === 'Coming Soon';
    })());
check('smoke: completing then claiming stage 1 grants its reward and marks it claimed',
    (() => {
        const before = grantCalls.length;
        const ok = vm.runInContext("claimSeasonPassQuestReward('xplodemis_01')", smoke);
        return ok === true && grantCalls.length > before
            && smoke.playerData.seasonPass.quests.xplodemis_01.rewardClaimed === true;
    })());
check('smoke: claiming a locked quest is refused even if a stale save marks it completed',
    (() => {
        const q = smoke.playerData.seasonPass.quests.xplodemis_05;
        q.completed = true; q.progress = q.target; // stale/forced state: stage 4 not done
        const before = grantCalls.length;
        const ok = vm.runInContext("claimSeasonPassQuestReward('xplodemis_05')", smoke);
        q.completed = false; q.progress = 0;
        return ok === false && grantCalls.length === before;
    })());

if (failed) { console.error(`season-quests-fix: ${passed} passed, ${failed} failed:\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`season-quests-fix: ${passed} passed`);
