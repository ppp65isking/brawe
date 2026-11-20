// Arena Forge fixes round 2 (2026-11-20): Anthony's playtest of the
// fixes-round APK (PR #171, main d49475cb) — 5 items.
// 1. Bottom nav: every tab (HOME / FIGHTERS / EVENTS / SHOP) responds
//    from the fighters screen. (Live jsdom boot harness re-clicks all
//    four; here the wiring + routing are pinned.)
// 2. Weekly quests STAY (4/week random contracts) and every quest says
//    it gives Pass XP: daily +25, weekly +100 (builder pick — a match
//    pays 25 win / 15 loss), season quests show their +100 xpReward.
//    Daily/weekly pass XP is actually granted on claim, not just labeled.
// 3. Sort + filter work: the sheet opens, applies live, and dismisses
//    via DONE, the X button, tap-outside, Escape, and CLEAR ALL; a
//    clear-filters chip in the toolbar is the way out of a filtered view.
// 4. Search collapses to an icon by default at EVERY width: the old
//    landscape query was capped at 900px and a landscape phone is
//    ~915-1140 CSS px wide, so the icon bar never appeared there.
// 5. Fighters pager: pages of 4 with scroll-snap, and pages grow to
//    fill the strip so a short list never leaves a big empty blue area.
// Source-presence + behavior mirrors (contract builder, filter reset,
// reward text are extracted and run).
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
function extractBraced(src, start) {
    const open = src.indexOf('{', start);
    if (open === -1) return null;
    let depth = 0, i = open, quote = null, esc = false, lineComment = false, blockComment = false;
    for (; i < src.length; i++) {
        const c = src[i], n = src[i + 1];
        if (lineComment) { if (c === '\n') lineComment = false; continue; }
        if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '/' && n === '/') { lineComment = true; continue; }
        if (c === '/' && n === '*') { blockComment = true; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        if (c === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    return null;
}
// Like extractBraced, but for functions whose parameter list itself
// contains braces (e.g. `rewards = {}`): the body brace is the first
// `{` after the parameter list's closing paren.
function extractFunction(src, sig) {
    const s = src.indexOf(sig);
    if (s === -1) return null;
    // The sig ends with the parameter list's opening paren, so we are
    // already one paren deep when the scan starts.
    let depth = 1, i = s + sig.length;
    for (; i < src.length; i++) {
        const c = src[i];
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) break; }
    }
    if (i >= src.length) return null;
    const open = src.indexOf('{', i + 1);
    if (open === -1) return null;
    depth = 0;
    let quote = null, esc = false, lineComment = false, blockComment = false;
    for (let j = open; j < src.length; j++) {
        const c = src[j], n = src[j + 1];
        if (lineComment) { if (c === '\n') lineComment = false; continue; }
        if (blockComment) { if (c === '*' && n === '/') { blockComment = false; j++; } continue; }
        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '/' && n === '/') { lineComment = true; continue; }
        if (c === '/' && n === '*') { blockComment = true; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        if (c === '}') { depth--; if (depth === 0) return src.slice(s, j + 1); }
    }
    return null;
}

// ================= 1. BOTTOM NAV =================
check('all four bottom-nav buttons exist (home/fighters/events/shop)',
    game.includes('data-app-tab="home"') && game.includes('data-app-tab="fighters"') &&
    game.includes('data-app-tab="events"') && game.includes('data-app-tab="shop"'));
check('nav buttons are wired to setAppHomeTab',
    game.includes("button.addEventListener('click', () => { appBuzz(10); setAppHomeTab(button.dataset.appTab); });"));
check('setAppHomeTab routes home / fighters / events (and shop)',
    game.includes("if (tab === 'fighters' || tab === 'events' || tab === 'home') {") &&
    game.includes("if (tab === 'shop') { if (typeof openHomeShop === 'function') openHomeShop(); return; }"));
check('syncAppHome activates exactly the current view',
    game.includes("document.getElementById('appHomeHeroView')?.classList.toggle('is-active', activeView === 'home'") &&
    game.includes("document.getElementById('appHomeFightersView')?.classList.toggle('is-active', activeView === 'fighters')"));
check('no overlay can sit over the nav: filter sheet is the only app overlay with z-index 100 and it dismisses (see §3)',
    game.includes(".app-kit-sheet-overlay{position:fixed;inset:0;z-index:100;"));

// ================= 2. QUESTS: WEEKLY KEPT + PASS XP =================
check('weekly contracts stay: pool + 4/week build',
    game.includes('const WEEKLY_CONTRACT_POOL = [') &&
    game.includes('buildRandomContractBucket(WEEKLY_CONTRACT_POOL, 4,') &&
    game.includes("createColumn('Weekly Contracts'"));
check('daily contracts carry +25 Pass XP, weekly +100',
    game.includes('questXP:35, passXP:100') && game.includes('questXP:20, passXP:25'));
check('claiming a contract actually grants the Pass XP (central grantReward type xp)',
    game.includes("if (rewards.passXP) grantReward({ type: 'xp', amount: rewards.passXP });"));
check('existing buckets are backfilled with passXP on refresh (progress untouched)',
    game.includes("for (const [bucketName, amount] of [['daily', 25], ['weekly', 100]])") &&
    game.includes('if (q && q.rewards && !Number.isFinite(q.rewards.passXP)) q.rewards.passXP = amount;'));
check('daily/weekly quest cards print the Pass XP',
    // Plain concatenation, not a template literal: the ranked-rework
    // suite guards game.js against the literal 'Pass XP`' (the ranked
    // end screen must never advertise Pass XP), so no template may
    // end in Pass XP + backtick.
    game.includes("if (quest.rewards?.passXP) rewardParts.push(quest.rewards.passXP + ' Pass XP');"));
check('questRewardText has a Pass XP label',
    game.includes("passXP:['Pass XP','Pass XP']"));
check('season quest cards print their xpReward as Pass XP (default 100, same as the grant)',
    game.includes("questRewardText(Object.assign({}, questState.rewards || quest.rewards, { passXP: questState.xpReward || quest.xpReward || 100 }))"));
check('season quests still grant the pass XP on completion (awardSeasonPassXp, not just a label)',
    game.includes('awardSeasonPassXp(q.xpReward || 100);'));
// Behavior mirror: the contract builder stamps passXP.
const bucketSrc = extractBraced(game, game.indexOf('function buildRandomContractBucket('));
const seedSrc = extractBraced(game, game.indexOf('function seededQuestNumber('));
const questBucketSrc = extractBraced(game, game.indexOf('function buildQuestBucket('));
const questStateSrc = extractBraced(game, game.indexOf('function createQuestState('));
check('contract builder + helpers extract cleanly', !!bucketSrc && !!seedSrc && !!questBucketSrc && !!questStateSrc);
if (bucketSrc && seedSrc && questBucketSrc && questStateSrc) {
    const pool = [{ kind: 'play_match', title: 'T', desc: 'D.', targets: [2] }];
    const run = (weekly) => new Function('pool', `${seedSrc}\n${questStateSrc}\n${questBucketSrc}\n${bucketSrc}\nreturn buildRandomContractBucket(pool, 1, 'k', 'p', ${weekly});`)(pool);
    const daily = run(false);
    const weekly = run(true);
    const d = Object.values(daily)[0], w = Object.values(weekly)[0];
    check('daily contract grants 25 Pass XP', d && d.rewards && d.rewards.passXP === 25);
    check('weekly contract grants 100 Pass XP', w && w.rewards && w.rewards.passXP === 100);
    check('contract XP (questXP) is untouched by the pass-XP change', d && d.rewards.questXP === 20 && w && w.rewards.questXP === 35);
}
// Behavior mirror: questRewardText prints Pass XP.
const rewardTextSrc = extractFunction(game, 'function questRewardText(');
check('questRewardText extracts cleanly', !!rewardTextSrc);
if (rewardTextSrc) {
    const text = new Function('brawlerData', 'skinsDatabase', `${rewardTextSrc}\nreturn questRewardText({ coins: 150, questXP: 20, passXP: 25 });`)({}, {});
    check('questRewardText prints "+25 Pass XP" alongside coins + Contract XP',
        text.includes('25 Pass XP') && text.includes('150 Coins') && text.includes('20 Contract XP'));
    const seasonText = new Function('brawlerData', 'skinsDatabase', `${rewardTextSrc}\nreturn questRewardText({ coins: 250, passXP: 100 });`)({}, {});
    check('questRewardText prints "+100 Pass XP" for a season quest', seasonText.includes('100 Pass XP'));
}

// ================= 3. SORT + FILTER =================
check('filter sheet has a visible X close button',
    game.includes('data-app-filter-close="1"') && game.includes('class="app-filter-close"'));
check('X / DONE / tap-outside all close the sheet',
    game.includes("event.target.closest('[data-app-filter-close]')") &&
    game.includes("event.target.closest('[data-app-filter-done]')") &&
    game.includes('if (event.target === overlay'));
check('Escape dismisses the sheet (listener added on open, removed on close)',
    game.includes("document.addEventListener('keydown', appFightersFilterSheetKeyHandler);") &&
    game.includes("document.removeEventListener('keydown', appFightersFilterSheetKeyHandler);") &&
    game.includes("if (event.key === 'Escape') { event.stopPropagation(); closeAppFightersFilterSheet(); }"));
check('sheet changes apply live (change handler re-renders the strip)',
    game.includes("saveAppFightersFilters(); renderAppFightersStrip(); syncAppFightersFilterBtn(); syncAppFightersClearChip();"));
check('CLEAR ALL uses the shared filter reset',
    game.includes("resetAppFightersFilters(); closeAppFightersFilterSheet(); return;") &&
    game.includes('function resetAppFightersFilters() {'));
check('clear-filters chip exists in the toolbar and syncs with the filters',
    game.includes('id="appFightersClearFilters"') && game.includes('function syncAppFightersClearChip() {') &&
    game.includes("chip.hidden = !active;"));
check('chip click resets the filters without opening the sheet',
    game.includes("view.querySelector('#appFightersClearFilters')?.addEventListener('click', () => {") &&
    game.includes('resetAppFightersFilters();'));
check('sort still lives in the sheet and favorites toggle re-syncs the chip',
    game.includes('id="appFilterSort"') && game.includes('syncAppFightersClearChip();\n                renderAppFightersStrip();'));
// Behavior mirror: the shared reset restores defaults and re-syncs.
const resetSrc = extractBraced(game, game.indexOf('function resetAppFightersFilters() {'));
check('resetAppFightersFilters extracts cleanly', !!resetSrc);
if (resetSrc) {
    let calls = [];
    const state = { rarity: 'Mythic', minPower: 11, owned: 'locked', sort: 'name', favoritesOnly: true };
    const store = {};
    const fakeStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
    const stub = (name) => (..._a) => { calls.push(name); };
    new Function('appFightersState', 'APP_FIGHTERS_SORT_KEY', 'localStorage', 'saveAppFightersFilters', 'renderAppFightersStrip', 'syncAppFightersFilterBtn', 'syncAppFightersFavBtn', 'syncAppFightersClearChip',
        `${resetSrc}\nresetAppFightersFilters();`)(state, 'brawl_arena_fighters_sort', fakeStorage, stub('save'), stub('render'), stub('filterBtn'), stub('favBtn'), stub('chip'));
    check('reset restores rarity/power/owned/sort/favorites to defaults',
        state.rarity === 'all' && state.minPower === 0 && state.owned === 'all' && state.sort === 'favorites' && state.favoritesOnly === false);
    check('reset persists the default sort + re-renders + re-syncs all buttons',
        store['brawl_arena_fighters_sort'] === 'favorites' && calls.includes('render') && calls.includes('chip') && calls.includes('filterBtn') && calls.includes('favBtn'));
}

// ================= 4. SEARCH COLLAPSED BY DEFAULT =================
check('landscape query no longer caps at 900px (landscape phones are ~915-1140 CSS px)',
    !game.includes('@media (orientation:landscape) and (max-width:900px)') &&
    game.includes('@media (orientation:landscape){'));
check('icon top bar + collapsed search are unconditional defaults (later rules win over the display:none base)',
    game.includes('.app-fighters-topbar{display:flex;align-items:center;gap:8px;flex:none}') &&
    game.includes("#appHomeFightersView:not(.app-fighters-search-open) .app-fighters-search-wrap{display:none}") &&
    game.includes("#appHomeFightersView.app-fighters-search-open .app-fighters-search-wrap{display:flex;flex:none;width:100%}"));
check('unconditional top-bar rules come AFTER the display:none base rule',
    game.lastIndexOf('.app-fighters-topbar{display:flex;align-items:center;gap:8px;flex:none}') >
    game.indexOf('.app-fighters-topbar{display:none}'));
check('search toggle still flips the open class',
    game.includes("const open = view.classList.toggle('app-fighters-search-open');"));

// ================= 5. FIGHTERS PAGER =================
check('strip is a horizontal paging scroller with scroll-snap',
    game.includes('#appFightersStrip{display:flex;flex-direction:row;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity') &&
    game.includes('scroll-snap-align:start'));
// Landscape home UI (sketch, 2026-11-20): the strip DOES become a grid
// in landscape now — 3 columns per Anthony's sketch. The pin narrows:
// the only grid rule is the .native-app landscape one; the base layout
// stays the paging scroller.
check('no grid rule except the landscape 3-column one',
    [...game.matchAll(/#appFightersStrip\{display:grid/g)].length === 1 &&
    game.includes('.native-app #appFightersStrip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));'));
check('pages are 4-small-card columns that grow to fill the strip (no empty blue area on a short list)',
    game.includes('#appFightersStrip .app-fighters-page{flex:1 0 118px;max-width:260px;display:grid;grid-template-rows:repeat(4,minmax(0,1fr));gap:8px;scroll-snap-align:start}') &&
    game.includes("@media (orientation:landscape){#appFightersStrip .app-fighters-page{flex-basis:96px;max-width:220px}}"));
check('strip renders pages of 4 small cards',
    game.includes('for (let i = 0; i < list.length; i += 4) pages.push(list.slice(i, i + 4));') &&
    game.includes('`<div class="app-fighters-page">${page.map(cardHtml).join(\'\')}</div>`'));

// ================= SCOPE GUARDS =================
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));
const deletedBrawlerNames = ['rob' + 'ber', 'boo' + 'mer', 'dagger' + 'shard', 'wi' + 'tch', 'ad' + 'lof', 'swim' + 'mer', 'blade' + ' vane', 'clus' + 'ter'];
check('the 8 deleted brawlers stay deleted', deletedBrawlerNames.every((n) => !new RegExp('\\b' + n.replace(' ', '[ _]') + '\\b', 'i').test(game)));
check('weekly quests were not deleted by the pass-XP work', game.includes('WEEKLY_CONTRACT_POOL') && !game.includes('const WEEKLY_QUESTS = ['));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-fixes-round-2`);
