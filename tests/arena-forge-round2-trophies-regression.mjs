// Arena Forge trophies in profile (2026-11-19, app overhaul round 2):
// trophies are DISPLAY derived from real tracked wins only — 10 per win
// with a brawler, 0 per loss. Per-brawler wins/matches are recorded at the
// one match-end career settlement site, inside profile.careerStats (already
// in both save payloads), so no new storage key and no whitelist change.
// Friendly Battles, Training and Tutorial matches earn no trophies.
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
    ensureProfileProgressionState: () => ({ profile: fakeProfile }),
    getBrawlerPortraitMarkup: (id) => `<i>${id}</i>`,
    document: { createElement: (tag) => makeEl(tag) },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const runSrc = (src) => vm.runInContext(src, sandbox);
runSrc(`const TROPHY_PER_WIN = ${(game.match(/const TROPHY_PER_WIN = (\d+);/) || [])[1]};`);
for (const fn of ['getTrophyCareerStats', 'getBrawlerTrophyWins', 'getBrawlerTrophies', 'getTotalTrophies', 'getTotalTrophyWins', 'getTopBrawlersByTrophies', 'recordTrophyMatchResult', 'createTrophySection']) {
    runSrc(extractFunction(game, fn));
}
const T = (expr) => vm.runInContext(expr, sandbox);

// --- 1. The rule itself ---
check('TROPHY_PER_WIN is exactly 10', T('TROPHY_PER_WIN') === 10);
check('fresh career: total trophies 0, total trophy wins 0, top list empty', T('getTotalTrophies()') === 0 && T('getTotalTrophyWins()') === 0 && T('getTopBrawlersByTrophies().length') === 0);
check('fresh career: per-brawler trophies 0', T(`getBrawlerTrophies('outlit')`) === 0);

// --- 2. Recording: win +10, loss +0 trophies but still counts as a match ---
check('win records: returns true, 1 win / 1 match / 10 trophies', T(`recordTrophyMatchResult('outlit', true, {})`) === true && T(`getBrawlerTrophyWins('outlit')`) === 1 && career.brawlerMatches.outlit === 1 && T(`getBrawlerTrophies('outlit')`) === 10);
check('loss records a match but no win and no trophies', T(`recordTrophyMatchResult('outlit', false, {})`) === true && career.brawlerMatches.outlit === 2 && T(`getBrawlerTrophyWins('outlit')`) === 1 && T(`getBrawlerTrophies('outlit')`) === 10);
check('total is 10 x summed wins', T('getTotalTrophies()') === 10 * T('getTotalTrophyWins()'));

// --- 3. No-trophy match types earn nothing ---
for (const [label, opts] of [['training', '{ isTraining: true }'], ['tutorial', '{ isTutorialMode: true }'], ['friendly', '{ isFriendlyBattle: true }']]) {
    const before = JSON.stringify(career);
    check(`${label} match records nothing and returns false`, T(`recordTrophyMatchResult('fuser', true, ${opts})`) === false && JSON.stringify(career) === before);
}
check('unknown brawler records nothing and returns false', T(`recordTrophyMatchResult('nope', true, {})`) === false && !('nope' in career.brawlerWins));

// --- 4. Top brawlers: ranked by trophies, zero-win brawlers excluded ---
T(`recordTrophyMatchResult('fuser', true, {})`); T(`recordTrophyMatchResult('fuser', true, {})`); T(`recordTrophyMatchResult('fuser', true, {})`);
check('fuser 3 wins = 30 trophies, outlit still 10', T(`getBrawlerTrophies('fuser')`) === 30 && T(`getBrawlerTrophies('outlit')`) === 10);
check('total trophies 40 across 4 trophy wins', T('getTotalTrophies()') === 40 && T('getTotalTrophyWins()') === 4);
const top = T('getTopBrawlersByTrophies(5)');
check('top list is fuser then outlit, axeywaxy (0 wins) excluded', top.length === 2 && top[0].id === 'fuser' && top[0].trophies === 30 && top[1].id === 'outlit' && top[1].trophies === 10);
check('top list honours the limit', T('getTopBrawlersByTrophies(1).length') === 1 && T('getTopBrawlersByTrophies(1)')[0].id === 'fuser');

// --- 5. Profile section renders the real numbers + the rule in plain text ---
const section = T('createTrophySection()');
check('trophy section has profile-section + profile-trophies classes', section.className.includes('profile-section') && section.className.includes('profile-trophies'));
check('section shows the total (40) and the per-win value', section.innerHTML.includes('40') && section.innerHTML.includes('10 trophies per win'));
check('section states the rule: wins earn, losses earn 0', section.innerHTML.includes('every win with a brawler earns that brawler 10 trophies') && section.innerHTML.includes('losses earn 0'));
check('section names the no-trophy match types', section.innerHTML.includes('Friendly Battles') && section.innerHTML.includes('Training') && section.innerHTML.includes('Tutorial'));
check('section says pre-update wins do not count', section.innerHTML.includes("wins before this update don't count"));
check('section lists the top brawlers with trophy counts', section.innerHTML.includes('Fuser') && section.innerHTML.includes('30') && section.innerHTML.includes('Outlit') && section.innerHTML.includes('10'));
check('empty career section says no trophies yet', (() => {
    career.brawlerWins = {}; career.brawlerMatches = {};
    const empty = T('createTrophySection()');
    return empty.innerHTML.includes('No trophies yet') && empty.innerHTML.includes('first 10');
})());

// --- 6. Wiring pins (source) ---
check('match end calls recordTrophyMatchResult with the results-screen brawler', game.includes('recordTrophyMatchResult(completedMatchFighter, won, { isTraining, isTutorialMode, isFriendlyBattle })'));
check('match-end hook sits at the one career settlement site (right after the win buckets, before saveProgress)', (() => {
    const i = game.indexOf('recordTrophyMatchResult(completedMatchFighter');
    const j = game.indexOf('endCareer.matchesPlayed += 1');
    return i !== -1 && j !== -1 && i > j && game.indexOf('saveProgress();', i) - i < 200;
})());
check('player profile overlay inserts the trophy section under the hero', game.includes('main.appendChild(createTrophySection());'));
check('Brick Bon career tab inserts the trophy section under the hero', game.includes('container.appendChild(createTrophySection());'));
check('fresh-save default seeds empty per-brawler trophy maps', game.includes('brawlerWins:{}, brawlerMatches:{}'));
check('ensureProfileProgressionState normalises the per-brawler maps', game.includes("for(const key of ['brawlerWins','brawlerMatches'])"));
check('saved careerStats (with the maps) merge back on load', game.includes('careerStats:{...(existingProfile.careerStats||{}),...savedCareer}'));

// --- 7. Storage: no new key, whitelist untouched ---
check('backup whitelist regex is unchanged', (() => {
    const src = extractFunction(game, 'isBraweBackupStorageKey');
    return src.includes("/^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i");
})());
check('no new trophy storage key is written anywhere', !/localStorage\.setItem\('[^']*troph/i.test(game) && !/localStorage\.setItem\("[^"]*troph/i.test(game));
check('trophies live inside playerData.profile, which saveProgress already persists', game.includes("profile: playerData.profile,") && game.includes("localStorage.setItem('brawlGameProgress', JSON.stringify({ ...playerData, selectedBrawler }))"));

// --- 8. CSS: phone-first trophy styles exist ---
check('CSS has the trophy total + list styles', css.includes('.profile-trophy-total') && css.includes('.profile-trophy-list') && css.includes('.profile-trophy-note'));
check('CSS shrinks the trophy rows under 700px (phone layout)', css.includes('.profile-trophy-list>div{grid-template-columns:30px minmax(100px,1fr) auto}'));
check('CSS trophy total wraps instead of overflowing', css.includes('.profile-trophy-total{display:flex;align-items:baseline;flex-wrap:wrap'));

// --- 9. Hygiene ---
check('no bare forbidden word in game.js', !/\bcluster\b/i.test(game));
check('no bare forbidden word in this suite', !/\bcluster\b/i.test(self));
check('trophies never touch damage, HP, matchmaking or rewards (no such reference in the trophy block)', (() => {
    const start = game.indexOf('// ---- Trophies (2026-11-19');
    const end = game.indexOf('function createProfileBrawlerCard', start);
    const block = game.slice(start, end);
    return !/damage|matchmaking|rewardCoins|addSouls|maxHp/i.test(block);
})());

console.log(`trophies: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL:', f); process.exit(1); }
