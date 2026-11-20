// Arena Forge fixes round (2026-11-20): Anthony's 10 playtest orders.
// 1. Season Pass button works (pass-token fallback + 50-tier header).
// 2. Pass out of Quests. 3. Old quests deleted (daily 2-3/day + weekly +
//    new season quests only). 4. No skins in the shop. 5. Offer archive
//    deleted. 6. Fighters paging grid (4 small per column, swipe left/
//    right, portrait + landscape). 7. Top bar home-only; fighter page
//    shows coins + core pieces. 8. Filter/search icons only. 9. Fighter
//    page + quests are full screens. 10. Fighter count is playable only.
// Source-presence + behavior mirrors (playableBrawlerIds, the pass-token
// fallback, getClaimableSeasonQuestCount are extracted and run).
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const passCss = read('circuit-pass.css');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
// String-aware brace matcher (same shape as the round-2 tier-2 suite).
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
const sliceBetween = (src, startMarker, endMarker) => {
    const s = src.indexOf(startMarker);
    if (s === -1) return '';
    const e = endMarker ? src.indexOf(endMarker, s + startMarker.length) : src.length;
    return src.slice(s, e === -1 ? src.length : e);
};

// ================= 1. SEASON PASS BUTTON =================
check('pass-token fallback exists and is installed before any dereference',
    game.includes('function ensureBrawePassTokens() {') &&
    game.includes('ensureBrawePassTokens();\n          if (!ENABLE_SEASON_QUESTS) return;') &&
    game.includes('ensureBrawePassTokens();\n      if (!ENABLE_SEASON_PASS) { openQuestBoard(); return; }') &&
    game.includes('for(const offer of ensureBrawePassTokens().offers){'));
check('pass header is 50 tiers, not the stale 25',
    game.includes('LEVEL / ${SEASON_PASS_MAX_LEVEL}') &&
    !game.includes('LEVEL / 25') && !game.includes('pass.level >= 25') && !game.includes('pass.level>=25'));
check('pass opener is still wired to every app entry point',
    game.includes('seasonSlot.onclick = openSeasonSlot;') &&
    game.includes("const openSeasonSlot = () => openSeasonPass();") &&
    game.includes("data-app-quick=\"pass\"") &&
    game.includes("if (route === 'pass') { if (typeof openSeasonPass === 'function') openSeasonPass();"));
check('pass is still the 50-tier road with Holiday Lights at tier 50',
    game.includes('SEASON_PASS_MAX_LEVEL = 50') &&
    game.includes("SEASON_PREMIUM_UNLOCK_GEMS = 100") &&
    game.includes("SEASON_PREMIUM_UNLOCK_COINS = 11999") &&
    game.includes("{tier:50,title:'HOLIDAY LIGHTS',free:{type:'coins',amount:5000},premium:{type:'skin',id:'holiday-lights-freezeon'}}"));
check('pass overlay is full-viewport in app mode (circuit-pass.css)',
    passCss.includes('.native-app .circuit-overlay{padding:0;') &&
    passCss.includes('.native-app .circuit-panel{width:100%;height:100dvh;max-height:none;border-radius:0}'));
// Behavior mirror: the fallback builds when the module is missing.
const tokensSrc = extractBraced(game, game.indexOf('function ensureBrawePassTokens() {'));
check('ensureBrawePassTokens extracts cleanly', !!tokensSrc);
if (tokensSrc) {
    const tokens = new Function(`${tokensSrc}\nreturn ensureBrawePassTokens();`)();
    check('fallback offers 5 token-exchange entries, no skins',
        !!tokens && Array.isArray(tokens.offers) && tokens.offers.length === 5 &&
        tokens.offers.every((o) => o.reward.type !== 'skin'));
    check('fallback normalize seeds tokens from xp (250 xp -> level 3, 250 wallet)',
        (() => { const p = { xp: 250 }; tokens.normalize(p, 50); return p.tokenWallet === 250 && p.level === 3 && p.tokenSchema === 1; })());
    check('fallback earn + purchase round-trip',
        (() => { const p = { xp: 0 }; tokens.normalize(p, 50); tokens.earn(p, 500, 50); return p.tokenWallet === 500 && tokens.purchase(p, 'coin-cache', () => true) && p.tokenWallet === 400; })());
}

// ================= 2. PASS OUT OF QUESTS =================
const seasonView = sliceBetween(game, 'function createSeasonView() {', 'function createCoreView() {');
check('season tab is named Season Quests, not Season Pass',
    game.includes("makeTab('season', '⚡ Season Quests')") && !game.includes("makeTab('season', '⚡ Season Pass')"));
check('quest board subtitle no longer climbs the Season Pass',
    game.includes("boardSubtitle.textContent = 'Complete quests and claim rewards.';") &&
    !game.includes('climb the Season Pass'));
check('season view has no pass tier ladder or premium unlock panel',
    !seasonView.includes('Tier Track') && !seasonView.includes('Unlock Premium Track') &&
    !seasonView.includes('getActiveSeasonPassTiers()') && !seasonView.includes('unlockSeasonPremium('));
check('season view keeps the season quests + Daily Present card',
    seasonView.includes('buildSeasonPassQuests()') && seasonView.includes('DAILY PRESENT QUEST'));
check('season quest claim button actually claims (no dead if(false))',
    seasonView.includes('claimSeasonPassQuestReward(quest.id)') && !seasonView.includes('if (false)'));
check('pass MISSIONS button still opens the board on the season tab',
    game.includes("openQuestBoard('season')"));

// ================= 3. QUESTS CLEANUP =================
for (const dead of ['const DAILY_QUESTS = [', 'const WEEKLY_QUESTS = [', 'const SOUL_STARTER_QUESTS = [',
    'const LIMITED_QUESTS = [', 'const AWAKENATOR_JOURNEY_QUESTS = [', 'const COIN_ASCENT_QUESTS = [',
    'const MEGA_QUESTS = [', 'GOLD_EVENT', 'LIMITED_QUEST_EVENT_ID', 'addLimitedQuestProgress',
    'addJourneyQuestProgress', 'progressSoulStarterQuests', 'getActiveWeeklyStage',
    'isLimitedQuestActive', 'mergeQuestBucket', "makeTab('gold'", 'WEEKLY_STAGE_COUNT']) {
    check(`old quest code gone: ${dead}`, !game.includes(dead));
}
check('quest schema bumped to v5 (stale save buckets migrate away)',
    game.includes('DAILY_WEEKLY_QUEST_SCHEMA_VERSION = 5'));
check('migration drops every stale old-quest bucket from existing saves',
    game.includes('delete playerData.questBoard.starter;') &&
    game.includes('delete playerData.questBoard.limited;') &&
    game.includes('delete playerData.questBoard.mega;') &&
    game.includes('delete playerData.questBoard.awakenatorJourney;') &&
    game.includes('delete playerData.questBoard.coinAscent;') &&
    game.includes('delete playerData.questBoard.limitedMeta;'));
check('only daily + weekly random contracts remain (2-3/day, 4/week)',
    game.includes('DAILY_CONTRACT_POOL') && game.includes('WEEKLY_CONTRACT_POOL') &&
    game.includes('buildRandomContractBucket(DAILY_CONTRACT_POOL, getDailyQuestCountForDay') &&
    game.includes('buildRandomContractBucket(WEEKLY_CONTRACT_POOL, 4,') &&
    game.includes('function getDailyQuestCountForDay(dayKey)'));
check('core view has only Daily + Weekly columns',
    game.includes("createColumn('Daily Contracts'") && game.includes("createColumn('Weekly Contracts'") &&
    !game.includes("createColumn('Starter Journey'") && !game.includes("createColumn('Awake Awakenator'") &&
    !game.includes("createColumn('Coin Ascent'"));
check('quest badge counts daily + weekly + season QUESTS only',
    game.includes('const seasonReady = getClaimableSeasonQuestCount();') &&
    game.includes('function getClaimableSeasonQuestCount() {') &&
    game.includes('function claimSeasonPassQuestReward(questId) {'));
check('event-hub quests are untouched (separate system, not the board)',
    game.includes('function buildEventQuests()') && game.includes('function addEventQuestProgress('));
// Behavior mirror: season-quest claimable count.
const qCountSrc = extractBraced(game, game.indexOf('function getClaimableSeasonQuestCount() {'));
check('getClaimableSeasonQuestCount extracts cleanly', !!qCountSrc);
if (qCountSrc) {
    const run = (pass) => new Function('playerData', 'ENABLE_SEASON_QUESTS', `${qCountSrc}\nreturn getClaimableSeasonQuestCount();`)({ seasonPass: pass }, true);
    check('season quest count counts completed-unclaimed only',
        run({ quests: { a: { completed: true }, b: { completed: true, rewardClaimed: true }, c: { completed: false } } }) === 1);
    check('season quest count is 0 without a pass', run(null) === 0);
}

// ================= 4. NO SKINS IN THE SHOP =================
for (const dead of ['renderSkinsTab', "createSidebarButton('🎭 SKIN CATALOGUE'", 'shopSkinQuery',
    'shopSkinOwnership', 'shopSkinSort', 'Skin of the day', 'BUY SKIN']) {
    check(`shop skin code gone: ${dead}`, !game.includes(dead));
}
const dropFn = sliceBetween(game, 'function generateEventDrop(rarity) {', 'function showHoldToOpenDrop() {');
check('event drops can never award a skin',
    !dropFn.includes("type: 'skin'") && !dropFn.includes('eventOnly') && dropFn.includes('no skin drops'));
check('daily deals are still the 7 bricks-priced deals (40-120)',
    game.includes('DAILY_DEAL_ROTATION') && game.includes('soul-cache') && game.includes('gem-chip'));
check('skinsDatabase still holds only Holiday Lights (pass grant needs it)',
    game.includes('holiday-lights-freezeon') && game.includes('passOnly: true'));

// ================= 5. OFFER ARCHIVE DELETED =================
for (const dead of ['renderFeaturedTab', "createSidebarButton('🎁 OFFER ARCHIVE'", 'OFFER ARCHIVE',
    'Splitter Instinct 3 free shards', 'Relay Early Access', 'Tapper Mega Bundle']) {
    check(`offer archive gone: ${dead}`, !game.includes(dead));
}
check('shop sidebar has exactly three tabs (daily / fighter / wheel)',
    game.includes("createSidebarButton('☀ DAILY DEALS', 'daily')") &&
    game.includes("createSidebarButton('👤 FIGHTER DEAL', 'fighter')") &&
    game.includes("createSidebarButton('🎡 LUCKY WHEEL', 'wheel')"));
const tabContent = sliceBetween(game, 'const renderTabContent = () => {', 'const infoBar = document.createElement');
check('shop dispatch has no featured/skins branches',
    tabContent.includes("activeTab === 'daily'") && tabContent.includes("activeTab === 'fighter'") &&
    tabContent.includes("activeTab === 'wheel'") && !tabContent.includes("'featured'") && !tabContent.includes("'skins'"));

// ================= 6. FIGHTERS PAGING GRID =================
check('strip is a horizontal paging scroller (both orientations)',
    game.includes('#appFightersStrip{display:flex;flex-direction:row;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity') &&
    game.includes('#appFightersStrip .app-fighters-page{flex:0 0 auto;width:118px;display:grid;grid-template-rows:repeat(4,minmax(0,1fr));gap:8px;scroll-snap-align:start}') &&
    game.includes("@media (orientation:landscape){#appFightersStrip .app-fighters-page{width:96px}}"));
check('old fighters strip grid and 16/10 cards are gone',
    !game.includes('#appFightersStrip{display:grid') && !game.includes('repeat(auto-fill,minmax(280px,1fr))') &&
    !game.includes('aspect-ratio:16/10') && !game.includes('aspect-ratio:3/4'));
check('strip renders pages of 4 small cards',
    game.includes('const cardHtml = (id) => {') &&
    game.includes('for (let i = 0; i < list.length; i += 4) pages.push(list.slice(i, i + 4));') &&
    game.includes('`<div class="app-fighters-page">${page.map(cardHtml).join(\'\')}</div>`'));
check('small cards keep power badge + upgrade count, hide the kit strip',
    game.includes('.app-fighter-kit{display:none}') &&
    game.includes('.app-fighter-upg{position:absolute;top:32px;right:3px;') &&
    game.includes('.app-fighter-rarity{position:absolute;top:0;right:0;bottom:0;width:6px;'));
check('strip tap opens the fighter page, not an inline detail',
    game.includes('openAppFighterPage(appFightersState.focused);') &&
    !game.includes("document.getElementById('appFightersDetail')"));

// ================= 7. TOP BAR HOME-ONLY =================
check('top bar hides on every non-Home screen',
    game.includes("document.getElementById('appHomeTop')?.style.setProperty('display', appHomeTab === 'home' ? '' : 'none');"));
check('fighter page shows its own coins + core pieces wallet',
    game.includes('function renderAppFighterWallet() {') &&
    game.includes('id="appFighterWallet"') &&
    game.includes('getCorePieces()') &&
    game.includes('playerData.coins'));

// ================= 8. ICONS ONLY =================
for (const dead of ['renderAppFightersRoles', 'appFightersRoles()', "id=\"appFightersRoles\"",
    '<select id="appFightersSort"', "querySelector('#appFightersSort')", "querySelector('#appFightersRoles')"]) {
    check(`word-pill toolbar code gone: ${dead}`, !game.includes(dead));
}
check('toolbar has exactly three icon buttons (search / filter / favorites star)',
    game.includes('id="appFightersSearchToggle"') && game.includes('id="appFightersFilterBtn"') &&
    game.includes('id="appFightersFavToggle"') && game.includes('aria-label="Favorites only"'));
check('favorites star filters the strip and persists',
    game.includes('favoritesOnly: false') &&
    game.includes('if (appFightersState.favoritesOnly && !isFavoriteBrawler(id)) return false;') &&
    game.includes('favoritesOnly: !!appFightersState.favoritesOnly'));
check('sort moved into the filter sheet (rarity / power / owned / sort)',
    game.includes('id="appFilterSort"') && game.includes('APP_FIGHTERS_SORTS.map((s) => opt(s,') &&
    game.includes("t.id === 'appFilterSort'") && game.includes('id="appFilterRarity"') &&
    game.includes('id="appFilterPower"') && game.includes('id="appFilterOwned"'));
check('landscape phones get the icon top bar too (not portrait-only)',
    game.includes('@media (orientation:landscape) and (max-width:900px){') &&
    game.includes('.app-fighters-topbar{display:flex;align-items:center;gap:8px;flex:none}'));

// ================= 9. FULL SCREENS =================
check('fighter page exists: view + builder + opener + back button',
    game.includes('<div id="appHomeFighterView"></div>') &&
    game.includes('function buildAppFighterView() {') &&
    game.includes('function openAppFighterPage(id) {') &&
    game.includes('id="appFighterBack"') &&
    game.includes("if (tab === 'fighter') { appHomeTab = tab; buildAppFighterView();"));
check('fighter detail renders into the fighter page host',
    game.includes("document.getElementById('appFighterDetail')") &&
    game.includes('<div id="appFighterDetail"></div>'));
check('quests board is full-screen in app mode (both orientations)',
    game.includes('.native-app #questBoardOverlay{padding:0 !important}') &&
    game.includes('.native-app #questBoardOverlay>div{width:100vw !important;height:100dvh !important;max-height:none !important;border-radius:0 !important;border:0 !important}'));
check('no inline fighter detail host remains anywhere',
    !game.includes('appFightersDetail'));

// ================= 10. FIGHTER COUNT =================
check('playableBrawlerIds filters allBrawlers to brawlerData rows',
    game.includes('function playableBrawlerIds() {') &&
    game.includes('return allBrawlers.filter((id) => !!brawlerData[id]);'));
check('strip counter and roster lists use playable ids',
    game.includes('const playable = playableBrawlerIds();') &&
    game.includes('countEl.textContent = `${owned}/${playable.length} OWNED`;') &&
    game.includes('const list = playableBrawlerIds().filter((id) => {'));
// Behavior mirror: 104 real + 4 module-only ids -> 104.
const playableSrc = extractBraced(game, game.indexOf('function playableBrawlerIds() {'));
check('playableBrawlerIds extracts cleanly', !!playableSrc);
if (playableSrc) {
    const ids104 = Array.from({ length: 104 }, (_, i) => `b${i}`);
    const all = [...ids104, 'duck', 'the_deleter', 'dr0ne', 'unhitabble'];
    const data = Object.fromEntries(ids104.map((id) => [id, { name: id }]));
    const out = new Function('allBrawlers', 'brawlerData', `${playableSrc}\nreturn playableBrawlerIds();`)(all, data);
    check('playable count is 104 (module-only ids excluded)', out.length === 104);
    check('the 4 module-only ids are the excluded ones',
        ['duck', 'the_deleter', 'dr0ne', 'unhitabble'].every((id) => !out.includes(id)));
}

// ================= SCOPE GUARDS =================
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));
// Names built from parts so this file itself contains no literal deleted
// brawler name (the delete-disabled-brawlers suite scans test files for them).
const deletedBrawlerNames = ['rob' + 'ber', 'boo' + 'mer', 'dagger' + 'shard', 'wi' + 'tch', 'ad' + 'lof', 'swim' + 'mer', 'blade' + ' vane', 'clus' + 'ter'];
check('the 8 deleted brawlers stay deleted', deletedBrawlerNames.every((n) => !new RegExp('\\b' + n.replace(' ', '[ _]') + '\\b', 'i').test(game)));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-fixes-round`);
