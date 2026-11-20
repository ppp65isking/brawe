// Arena Forge bricks in profile (foundation, 2026-11-19 big changes):
// trophies are RETIRED as a display — the single progression number is
// lifetime bricks per fighter (progress.bricks + prestige * 1000),
// earned every match by placement (1st = 30, 8th = 2, lower places lose
// a few, floored at 0 lifetime). The wins ledger (per-brawler wins /
// matches in profile.careerStats) is KEPT because the profile still
// shows per-brawler wins — no new storage key, no whitelist change.
// Friendly Battles, Training and Tutorial matches earn no bricks.
// VM behavior mirrors (same extract-and-run pattern as the results-flow
// suite) + source-presence pins for the wiring, the save path and the CSS.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const css = read('styles.css');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a top-level function declaration out of game.js source.
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    // Skip past the parameter list first: a default like `opts = {}` holds
    // a brace that is NOT the body opener.
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

// --- Fake career state behind the stubbed ensureProfileProgressionState ---
const career = { matchesPlayed: 0, soloWins: 0, teamWins: 0, rankedWins: 0, eliminations: 0, brawlerWins: {}, brawlerMatches: {} };
const fakeProfile = { careerStats: career };
function makeEl(tag) {
    return { tag, className: '', innerHTML: '', textContent: '', children: [], appendChild(c) { this.children.push(c); return c; }, querySelector() { return null; } };
}
const sandbox = {
    console,
    allBrawlers: ['outlit', 'fuser', 'axeywaxy'],
    brawlerData: { outlit: { name: 'Outlit' }, fuser: { name: 'Fuser' }, axeywaxy: { name: 'Axeywaxy' } },
    playerData: {
        brawlers: {
            outlit: { bricks: 10, prestige: 0 },
            fuser: { bricks: 30, prestige: 0 },
            axeywaxy: { bricks: 0, prestige: 0 },
        },
    },
    ensureProfileProgressionState: () => ({ profile: fakeProfile }),
    getBrawlerPortraitMarkup: (id) => `<i>${id}</i>`,
    document: { createElement: (tag) => makeEl(tag) },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const runSrc = (src) => vm.runInContext(src, sandbox);
runSrc(`const DAILY_BRICK_RUSH_BONUS_CAP = ${(game.match(/const DAILY_BRICK_RUSH_BONUS_CAP = (\d+);/) || [])[1]};`);
for (const fn of ['getLifetimeBricks', 'getBrickDeltaForPlacement', 'applyPositiveBrickMultiplier', 'applyBrickDelta', 'awardBricksForPlacement', 'getTotalBrickBonBricks', 'getTrophyCareerStats', 'getBrawlerTrophyWins', 'getTotalTrophyWins', 'getTopBrawlersByBricks', 'recordTrophyMatchResult', 'createBricksSection']) {
    runSrc(extractFunction(game, fn));
}
const T = (expr) => vm.runInContext(expr, sandbox);

// --- 1. The rule itself: lifetime bricks + the placement table ---
check('lifetime bricks = bricks + prestige x 1000', T('getLifetimeBricks({bricks:250,prestige:2})') === 2250 && T('getLifetimeBricks({bricks:999,prestige:0})') === 999 && T('getLifetimeBricks({})') === 0 && T('getLifetimeBricks({bricks:-5,prestige:-1})') === 0);
check('placement table: 1st 30, 2nd 26, 8th 2, 9th -1, 15th -13', T('getBrickDeltaForPlacement(1)') === 30 && T('getBrickDeltaForPlacement(2)') === 26 && T('getBrickDeltaForPlacement(8)') === 2 && T('getBrickDeltaForPlacement(9)') === -1 && T('getBrickDeltaForPlacement(15)') === -13);
check('placement clamps outside 1-15', T('getBrickDeltaForPlacement(0)') === 30 && T('getBrickDeltaForPlacement(99)') === -13);
check('total bricks sums lifetime across the stub roster (10 + 30 + 0)', T('getTotalBrickBonBricks()') === 40);
check('total bricks counts prestige (fuser P1 = 1030, total 1040, then restored)', (() => {
    sandbox.playerData.brawlers.fuser.prestige = 1;
    const total = T('getTotalBrickBonBricks()');
    sandbox.playerData.brawlers.fuser.prestige = 0;
    return total === 1040 && T('getTotalBrickBonBricks()') === 40;
})());
check('positive-brick multiplier applies to wins only, capped at +250', T('applyPositiveBrickMultiplier(30, 3)') === 90 && T('applyPositiveBrickMultiplier(-5, 3)') === -5 && T('applyPositiveBrickMultiplier(30, 100)') === 280);
check('fresh wins ledger: 0 wins, 0 per-brawler wins', T('getTotalTrophyWins()') === 0 && T(`getBrawlerTrophyWins('outlit')`) === 0);

// --- 2. Awarding: placement delta lands, prestige flips at 1000, floor at 0 ---
check('1st place on a fresh fighter: +30 bricks, returns the delta', (() => {
    const p = { bricks: 0, prestige: 0 };
    sandbox.awardTarget = p;
    const delta = T('awardBricksForPlacement(awardTarget, 1)');
    return delta === 30 && p.bricks === 30 && p.prestige === 0;
})());
check('crossing 1000 lifetime flips prestige (990 + 30 = P1, 20 bricks)', (() => {
    const p = { bricks: 990, prestige: 0 };
    sandbox.awardTarget = p;
    T('awardBricksForPlacement(awardTarget, 1)');
    return p.prestige === 1 && p.bricks === 20;
})());
check('a big loss floors lifetime at 0 (5 - 13 = 0, never negative)', (() => {
    const p = { bricks: 5, prestige: 0 };
    sandbox.awardTarget = p;
    T('awardBricksForPlacement(awardTarget, 15)');
    return p.prestige === 0 && p.bricks === 0;
})());

// --- 3. Wins ledger (kept): win +1, loss +0 wins but still a match ---
check('win records: returns true, 1 win / 1 match', T(`recordTrophyMatchResult('outlit', true, {})`) === true && T(`getBrawlerTrophyWins('outlit')`) === 1 && career.brawlerMatches.outlit === 1);
check('loss records a match but no win', T(`recordTrophyMatchResult('outlit', false, {})`) === true && career.brawlerMatches.outlit === 2 && T(`getBrawlerTrophyWins('outlit')`) === 1);

// --- 4. No-brick match types earn nothing in the ledger ---
for (const [label, opts] of [['training', '{ isTraining: true }'], ['tutorial', '{ isTutorialMode: true }'], ['friendly', '{ isFriendlyBattle: true }']]) {
    const before = JSON.stringify(career);
    check(`${label} match records nothing and returns false`, T(`recordTrophyMatchResult('fuser', true, ${opts})`) === false && JSON.stringify(career) === before);
}
check('unknown brawler records nothing and returns false', T(`recordTrophyMatchResult('nope', true, {})`) === false && !('nope' in career.brawlerWins));

// --- 5. Top brawlers: ranked by lifetime bricks, then wins; zero/zero excluded ---
T(`recordTrophyMatchResult('fuser', true, {})`); T(`recordTrophyMatchResult('fuser', true, {})`); T(`recordTrophyMatchResult('fuser', true, {})`);
check('fuser 3 wins + 30 bricks, outlit 1 win + 10 bricks', T(`getBrawlerTrophyWins('fuser')`) === 3 && T(`getBrawlerTrophyWins('outlit')`) === 1);
check('total wins 4 across the ledger', T('getTotalTrophyWins()') === 4);
const top = T('getTopBrawlersByBricks(5)');
check('top list is fuser then outlit, axeywaxy (0 bricks, 0 wins) excluded', top.length === 2 && top[0].id === 'fuser' && top[0].bricks === 30 && top[0].wins === 3 && top[1].id === 'outlit' && top[1].bricks === 10 && top[1].wins === 1);
check('top list honours the limit', T('getTopBrawlersByBricks(1).length') === 1 && T('getTopBrawlersByBricks(1)')[0].id === 'fuser');

// --- 6. Profile section renders the real numbers + the rule in plain text ---
const section = T('createBricksSection()');
check('bricks section has profile-section + profile-trophies classes (class names kept, CSS untouched)', section.className.includes('profile-section') && section.className.includes('profile-trophies'));
check('section shows the total (40) and the 1st-place value', section.innerHTML.includes('40') && section.innerHTML.includes('1st place earns 30'));
check('section states the rule: placement earns, lower places lose a few', section.innerHTML.includes('every match earns bricks by placement') && section.innerHTML.includes('lower places lose a few'));
check('section names the no-bricks match types', section.innerHTML.includes('Friendly Battles') && section.innerHTML.includes('Training') && section.innerHTML.includes('Tutorial'));
check('section lists the top brawlers with brick counts', section.innerHTML.includes('Fuser') && section.innerHTML.includes('30') && section.innerHTML.includes('Outlit') && section.innerHTML.includes('10'));
check('empty career section says no bricks yet', (() => {
    career.brawlerWins = {}; career.brawlerMatches = {};
    for (const p of Object.values(sandbox.playerData.brawlers)) { p.bricks = 0; p.prestige = 0; }
    const empty = T('createBricksSection()');
    return empty.innerHTML.includes('No bricks yet') && empty.innerHTML.includes('first bricks');
})());

// --- 7. Wiring pins (source) ---
check('match end calls recordTrophyMatchResult with the results-screen brawler', game.includes('recordTrophyMatchResult(completedMatchFighter, won, { isTraining, isTutorialMode, isFriendlyBattle })'));
check('match end awards placement bricks to the results-screen fighter', game.includes('awardBricksForPlacement(endProgress, placement, brickRushMultiplier)'));
check('match-end hook sits at the one career settlement site (right after the win buckets, before saveProgress)', (() => {
    const i = game.indexOf('recordTrophyMatchResult(completedMatchFighter');
    const j = game.indexOf('endCareer.matchesPlayed += 1');
    return i !== -1 && j !== -1 && i > j && game.indexOf('saveProgress();', i) - i < 200;
})());
check('player profile overlay inserts the bricks section under the hero', game.includes('main.appendChild(createBricksSection());'));
check('Brick Bon career tab inserts the bricks section under the hero', game.includes('container.appendChild(createBricksSection());'));
check('home top chip shows total lifetime bricks', game.includes("trophyEl.textContent = `🧱 ${getTotalBrickBonBricks().toLocaleString()}`"));
check('hero chip shows the selected fighter lifetime bricks', game.includes('getLifetimeBricks(playerData.brawlers?.[selectedBrawler])'));
check('fresh-save default seeds empty per-brawler win maps', game.includes('brawlerWins:{}, brawlerMatches:{}'));
check('ensureProfileProgressionState normalises the per-brawler maps', game.includes("for(const key of ['brawlerWins','brawlerMatches'])"));
check('saved careerStats (with the maps) merge back on load', game.includes('careerStats:{...(existingProfile.careerStats||{}),...savedCareer}'));

// --- 8. Storage: no new key, whitelist untouched ---
check('backup whitelist regex is unchanged', (() => {
    const src = extractFunction(game, 'isBraweBackupStorageKey');
    return src.includes("/^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i");
})());
check('no new trophy storage key is written anywhere', !/localStorage\.setItem\('[^']*troph/i.test(game) && !/localStorage\.setItem\("[^"]*troph/i.test(game));
check('bricks live inside playerData.profile, which saveProgress already persists', game.includes("profile: playerData.profile,") && game.includes("localStorage.setItem('brawlGameProgress', JSON.stringify({ ...playerData, selectedBrawler }))"));

// --- 9. CSS: phone-first bricks styles exist (class names intentionally kept) ---
check('CSS has the bricks total + list styles', css.includes('.profile-trophy-total') && css.includes('.profile-trophy-list') && css.includes('.profile-trophy-note'));
check('CSS shrinks the bricks rows under 700px (phone layout)', css.includes('.profile-trophy-list>div{grid-template-columns:30px minmax(100px,1fr) auto}'));
check('CSS bricks total wraps instead of overflowing', css.includes('.profile-trophy-total{display:flex;align-items:baseline;flex-wrap:wrap'));

// --- 10. Hygiene: the trophy display is fully gone ---
check('no trophy display helpers remain in game.js', !game.includes('TROPHY_PER_WIN') && !game.includes('function getBrawlerTrophies(') && !game.includes('function getTotalTrophies(') && !game.includes('function createTrophySection('));
check('no trophy glyph anywhere in game.js', !game.includes('🏆'));
check('no "Arena Forge 2.0" anywhere in game.js', !game.includes('Arena Forge 2.0'));
check('no bare forbidden word in game.js', !/\bcluster\b/i.test(game));
check('no bare forbidden word in this suite', !/\bcluster\b/i.test(self));
check('bricks never touch damage, HP, matchmaking or rewards (no such reference in the bricks block)', (() => {
    const start = game.indexOf('// ---- Bricks profile section');
    const end = game.indexOf('function createProfileBrawlerCard', start);
    const block = game.slice(start, end);
    return !/damage|matchmaking|rewardCoins|addSouls|maxHp/i.test(block);
})());

console.log(`bricks: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL:', f); process.exit(1); }
