// Arena Forge Fighters mobile redesign (2026-11-23, Anthony's Mobile-1
// design): Fighters-screen top bar (title + all currencies + tappers /
// present + Currently Playing), Weekly Max-Out section rendered from the
// existing Weekly Trials list, per-card HP/DMG + EDIT KIT + rarity pin +
// trial pill, and ONE combined filter panel (sort chips + multi-checkbox
// role / rarity) replacing the three separate Sort / Role / Rarity
// dropdowns in the desktop browser. Plus the MAXED-ribbon / status-pill
// overlap fixes. Static pins + a small vm harness that really renders the
// app strip with stubbed data.
// Layout/UX only: no mechanics, numbers, or core-kit changes; Weekly
// Trials count, mechanics and rewards untouched (still 2/week); the app
// filter sheet (dropdowns) is untouched — the combined panel is the
// desktop browser's controls row, where the three dropdowns lived.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const kitCss = read('kit-redesign.css');
const stylesCss = read('styles.css');
const galleryCss = read('fighter-gallery.css');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

function sliceBetween(startMarker, endMarker) {
    const start = game.indexOf(startMarker);
    if (start === -1) throw new Error('start anchor missing: ' + startMarker);
    const end = game.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error('end anchor missing: ' + endMarker);
    return game.slice(start, end);
}

// --- App top bar: title + all currencies + tappers + Currently Playing ---
check('topbar: Fighters header element exists in the app view',
    game.includes('<div id="appFightersHeader" class="app-fighters-header"></div>'));
check('topbar: header renders on every tab visit (not only first build)',
    game.includes('renderAppFightersHeader();\n        renderAppFightersWeekly();\n        renderAppFightersStrip();'));
check('topbar: header shows title plus Coins, Souls, Core Pieces, Gems',
    game.includes('<h2>Fighters</h2>') &&
    game.includes('🪙 ${(Number(coins) || 0).toLocaleString()}') &&
    game.includes('🪄 ${(Number(souls) || 0).toLocaleString()}') &&
    game.includes('💠 ${(Number(corePieces) || 0).toLocaleString()}') &&
    game.includes('💎 ${(Number(gems) || 0).toLocaleString()}'));
check('topbar: tapper / present buttons reuse the existing openers',
    game.includes("if (kind === 'reg') openStarrDrop();") &&
    game.includes("else if (kind === 'super') openSuperStarrDrop();") &&
    game.includes("else if (kind === 'hyper') openHyperStarrDrop();") &&
    game.includes("else if (kind === 'present') openPresent();") &&
    game.includes("else if (kind === 'all') openAllTappers();"));
check('topbar: Currently Playing chip shows the active fighter icon + name',
    game.includes('CURRENTLY PLAYING') &&
    game.includes('data-app-now-playing="1"') &&
    game.includes('class="app-fighters-now-icon"') &&
    game.includes('openAppFighterPage(selectedBrawler)'));
check('topbar: no new mechanic — the chip opens the ACTIVE FIGHTER page',
    game.includes('the ACTIVE FIGHTER\n    // banner\'s fighter, no new mechanic'));

// --- Weekly Max-Out section (app) ---
check('weekly: section element exists in the app view',
    game.includes('<div id="appFightersWeekly" class="app-fighters-weekly" hidden></div>'));
check('weekly: section renders from the existing trial list + days left',
    game.includes('function renderAppFightersWeekly() {') &&
    game.includes('state = ensureWeeklyTrialState(); info = getWeeklyTrialWeekInfo();') &&
    game.includes('${daysLeft} DAYS LEFT') &&
    game.includes('state.fighterIds.map((id) => {'));
check('weekly: trial rows show rarity/class, Power 11 kit, HP/DMG, bricks, EDIT KIT',
    game.includes('POWER 11 · COMPLETE KIT') &&
    game.includes('data-app-weekly-edit=') &&
    game.includes('data-app-weekly-fighter='));
check('weekly: trial count NOT changed (still 2/week, const untouched)',
    game.includes('const WEEKLY_TRIAL_FIGHTER_COUNT = 2;'));
check('weekly: desktop panel copy is dynamic (stale THREE FIGHTERS is gone)',
    !game.includes('THREE FIGHTERS. COMPLETE KITS.') &&
    game.includes("['ZERO','ONE','TWO','THREE','FOUR'][weeklyState.fighterIds.length]"));

// --- App strip cards: trial pill, HP/DMG, EDIT KIT, rarity pin, bricks ---
check('cards: strip card has Weekly Max-Out pill on trial fighters',
    game.includes('<span class="app-fighter-trial">WEEKLY MAX-OUT</span>'));
check('cards: strip card shows HP/DMG stats from getScaledStats at its own level',
    game.includes('const cardStats = getScaledStats(id, pData.level || 1); cardHp = cardStats.hp || 0; cardDmg = cardStats.dmg || 0;') &&
    game.includes('<span class="app-fighter-stats">❤ ${cardHp.toLocaleString()} · ⚔ ${cardDmg.toLocaleString()}</span>'));
check('cards: strip card has an EDIT KIT affordance wired to the fighter page',
    game.includes('data-app-edit-kit="${id}"') &&
    game.includes("openAppFighterPage(editBtn.dataset.appEditKit); return;"));
check('cards: strip card has a rarity pin at the top right',
    game.includes('class="app-fighter-rarity-pin"'));
check('cards: bricks chip is visible on strip cards (no longer display:none in the strip)',
    game.includes('#appFightersStrip .app-fighter-trophies{display:block;'));

// --- Desktop browser: combined filter panel replaces the 3 dropdowns ---
check('filter: combined panel replaces Sort/Role/Rarity selects (no selects remain)',
    game.includes("filterPanel.className = 'brawler-browser__filter-panel';") &&
    !game.includes("const modalSortSelect = document.createElement('select');") &&
    !game.includes("const roleFilter = document.createElement('select');") &&
    !game.includes("const rarityFilter = document.createElement('select');"));
check('filter: panel has sort radio chips with the same 7 modes',
    game.includes("[['rarity-desc','Rarity ↓'],['rarity-asc','Rarity ↑'],['power-level','Power Level'],['bricks-desc','Bricks (High)'],['bricks-asc','Bricks (Low)'],['name','A-Z'],['role','Role']]"));
check('filter: role + rarity are multi-checkbox arrays (empty = all)',
    game.includes("role: readStoredMulti('brawl_arena_brawler_role_filter', allFilterRoles),") &&
    game.includes("rarity: readStoredMulti('brawl_arena_brawler_rarity_filter', allFilterRarities),") &&
    game.includes("if (modalSortState.role.length > 0 && !modalSortState.role.includes(role)) return false;") &&
    game.includes("if (modalSortState.rarity.length > 0 && !modalSortState.rarity.includes(rarity)) return false;"));
check('filter: search, ownership chips, result count, Clear filters all kept',
    game.includes("className = 'brawler-browser__search';") &&
    game.includes("[['all','All'],['owned','Owned'],['locked','Locked'],['favorites','⭐ Favorites']]") &&
    game.includes("id = 'brawlerBrowserCount';") &&
    game.includes("clearFiltersBtn.textContent = '✖ Clear filters';") &&
    game.includes("modalSortState.search = ''; modalSortState.role = []; modalSortState.rarity = []; modalSortState.ownership = 'all';"));

// --- Desktop browser: top bar + per-card additions ---
check('desktop topbar: Gems + Core Pieces + Currently Playing join Coins/Souls',
    game.includes('💎 ${(playerData.gems || 0).toLocaleString()}') &&
    game.includes('headerCorePieces = getCorePieces();') &&
    game.includes('Currently Playing: ${(brawlerData[selectedBrawler]?.name || selectedBrawler)}'));
check('desktop cards: HP/DMG stats + EDIT KIT button + rarity pin on each card',
    game.includes("statsLine.className = 'brawler-card__stats';") &&
    game.includes("editKitBtn.className = 'brawler-card__edit-kit';") &&
    game.includes("rarityPin.className = 'brawler-card__rarity-pin';") &&
    game.includes("editKitBtn.onclick = (event) => { event.stopPropagation(); if (!isDisabled) showDetails(id); };"));
check('desktop cards: weekly trial pill still renders on trial fighters',
    game.includes("trialPill.className='brawler-card__status brawler-card__status--trial';"));

// --- MAXED ribbon + status pill overlap fixes ---
check('ribbon: moved below the chip row (top 34px), still centered, never rotated',
    (() => { const m = kitCss.match(/\.brawler-card__maxed-ribbon \{([\s\S]*?)\}/); return !!m && /top: 34px/.test(m[1]) && /left: 50%/.test(m[1]) && !/rotate\(/.test(m[1]); })());
check('status: styles.css base no longer forces top:84px over the intended positions',
    !stylesCss.includes('top:84px !important'));
check('status: gallery pills sit below the chips row, left-anchored, not centered over the art',
    galleryCss.includes('.fighter-gallery .brawler-card__status{top:34px!important;left:8px!important;transform:none!important}'));

// --- Hard limits ---
check('limits: Weekly Trials count / mechanics / rewards untouched (no 3-fighter pick)',
    game.includes('pickWeeklyTrialFighters(pool, WEEKLY_TRIAL_FIGHTER_COUNT,week.key)') &&
    !game.includes('fallbackSpecials ? 2 : 3'));
check('limits: no voice-line changes in this redesign',
    !/voiceline/i.test(game.slice(game.indexOf('renderAppFightersHeader'), game.indexOf('function buildAppFightersView'))));

// --- Runtime: really render the app strip with the new card spans ---
const elements = {};
const documentStub = { getElementById: (id) => (elements[id] ||= { innerHTML: '', textContent: '' }) };
const sandbox = {
    document: documentStub,
    allBrawlers: ['alpha', 'trialOne', 'lockedEpic'],
    brawlerData: {
        alpha: { name: 'Alpha', emoji: '🔥', color: '#ff9f1c', role: 'Damage Dealer' },
        trialOne: { name: 'Trial One', emoji: '⭐', color: '#8cf05a', role: 'Controller' },
        lockedEpic: { name: 'Locked Epic', emoji: '🐍', color: '#b388ff', role: 'Controller' },
    },
    brawlerRarities: { alpha: 'Epic', trialOne: 'Mythic', lockedEpic: 'Epic' },
    SOUL_UNLOCK_COST_BY_RARITY: { Starter: 0, Rare: 70, Epic: 170, Mythic: 270, Exotic: 420, Unique: 600, Anomaly: 850 },
    playerData: {
        coins: 1000,
        brawlers: {
            alpha: { level: 5, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false },
            trialOne: { level: 1 },
            lockedEpic: { level: 1 },
        },
    },
    appFightersState: { search: '', role: 'all', focused: 'alpha', sort: 'name', rarity: 'all', minPower: 0, owned: 'all', favoritesOnly: false },
    APP_FIGHTER_RARITY_COLORS: { Starter: '#ff9f1c', Rare: '#8cf05a', Epic: '#b388ff', Mythic: '#ff8ad8' },
    MAX_POWER_LEVEL: 12,
    selectedBrawler: 'alpha',
    isBrawlerUnlocked: (id) => id === 'alpha',
    isWeeklyTrialBrawler: (id) => id === 'trialOne',
    getEffectiveBrawlerProgress: (id) => sandbox.playerData.brawlers[id] || { level: 1 },
    getScaledStats: () => ({ hp: 5200, dmg: 650, speed: 270 }),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    isFavoriteBrawler: () => false,
};
vm.createContext(sandbox);
const run = (code) => vm.runInContext(code, sandbox);
try {
    run(sliceBetween('        function getBrawlerRarity(brawlerId) {', '        function getDisplayRarityName'));
    run(sliceBetween('        function getSoulUnlockCostForRarity(rarity) {', '        function getSoulsForPlacement'));
    run(sliceBetween('        function getBrawlerRarityRank(brawlerId) {', '        function ensurePlayerDataDefaults() {'));
    run(sliceBetween('    function playableBrawlerIds() {', '    // Emergency balance hold:'));
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    check('runtime: strip functions extracted and evaluated', true);
} catch (err) {
    check('runtime: strip functions extracted and evaluated (' + err.message + ')', false);
}
run(`renderAppFightersStrip();`);
const stripHtml = elements.appFightersStrip.innerHTML;
check('runtime: trial fighter card carries the WEEKLY MAX-OUT pill',
    stripHtml.includes('app-fighter-trial') && stripHtml.includes('WEEKLY MAX-OUT'));
check('runtime: every card carries HP/DMG stats from its own level',
    (stripHtml.match(/app-fighter-stats/g) || []).length === 3 &&
    stripHtml.includes('❤ 5,200 · ⚔ 650'));
check('runtime: every card carries an EDIT KIT affordance + a rarity pin',
    (stripHtml.match(/data-app-edit-kit=/g) || []).length === 3 &&
    (stripHtml.match(/app-fighter-rarity-pin/g) || []).length === 3);
check('runtime: locked non-trial card still shows LOCKED + soul cost (F8 untouched)',
    stripHtml.includes('🔒 LOCKED') && stripHtml.includes('170 SOULS TO UNLOCK'));

console.log(`arena-forge-fighters-mobile-redesign: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
