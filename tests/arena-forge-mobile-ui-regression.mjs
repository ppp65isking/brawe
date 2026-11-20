// Arena Forge mobile UI overhaul (2026-11-20, last big-changes phase).
//
// Mobile ONLY (the website gets none of it): smaller sizing on phones,
// Fighters portrait grid 4-across with taller 3/4 cards so the v2 34px
// right strip (power badge + kit state + upgrade-count badge) still
// fits, search + filter as icon buttons in a top bar (search opens on
// tap; filter opens an in-app bottom sheet — NOT the Android UI box),
// and no boxes on mobile screens (flat detail panel, kit slots, stat
// pills, event slots, profile ranked boxes). Everything else from
// Brawl Space v2 stays: home chips + giant yellow PLAY, 3-col-ish
// landscape grid, Ranked neon, Events title + sticky tabs, two-row
// pass rail, Brick Road rail + NEXT BIG REWARD, profile diagonal split.
//
// The portrait toolbar was measured broken before this change: the
// one-row toolbar squeezed the search field to 54px wide and the sort
// select overlapped it. The column toolbar + collapsible search fix
// that; the render check (render-check-mobile-ui.mjs) proves it.
//
// Layout only: no gameplay, modes, pass contents, Ranked, quests, or
// system-logic changes; nothing the deletions removed comes back;
// no banned disabled-brawler word anywhere.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const circuitCss = read('circuit-pass.css');
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

// --- 4-per-column portrait grid (and the card that makes it work) ---
const baseGrid = "#appFightersStrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;";
const portraitGrid = "@media (orientation:portrait) and (max-width:560px){#appFightersStrip{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}}";
check('grid: portrait phones show 4 fighters per column',
    game.includes(portraitGrid));
check('grid: the 4-col portrait rule comes AFTER the base grid rule, so it wins',
    game.indexOf(portraitGrid) > game.indexOf(baseGrid) && game.indexOf(baseGrid) !== -1);
check('grid: landscape keeps the v2 wide-card grid (300px auto-fill)',
    game.includes("@media (orientation:landscape){#appFightersStrip{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}"));
check('grid: one scroller is kept — the view scrolls, the grid does not',
    game.includes('#appHomeFightersView{touch-action:pan-y}') &&
    game.includes('#appFightersStrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;overflow:visible;position:static;touch-action:pan-y'));
check('cards: portrait cards are taller (3/4) so the strip fits at 4-across',
    game.includes('.app-fighter-card{aspect-ratio:3/4}'));
check('cards: 34px right strip is kept (rarity bar + power badge + kit)',
    game.includes('.app-fighter-rarity{position:absolute;top:0;right:0;bottom:0;width:34px;') &&
    game.includes('.app-fighter-power{position:absolute;top:5px;right:3px;') &&
    game.includes('.app-fighter-kit{position:absolute;top:44px;right:0;bottom:8px;width:34px;'));
check('cards: portrait strip elements shrink to fit (24px badge, 14px kit icons, 16px upgrade badge, 22px fav)',
    game.includes('.app-fighter-power{width:24px;height:24px;font-size:12px;top:4px;right:5px}') &&
    game.includes('.app-fighter-kit-icons i{width:14px;height:14px;border-radius:5px;font-size:9px}') &&
    game.includes('.app-fighter-upg{min-width:16px;height:16px;font-size:10px;padding:0 3px}') &&
    game.includes('.app-fighter-fav{width:22px;height:22px;font-size:13px;top:4px;left:4px}'));
check('cards: portrait name / bricks chip / locked text shrink to fit',
    game.includes('.app-fighter-card b{font-size:10px;right:36px;bottom:4px;max-width:calc(100% - 40px)}') &&
    game.includes('.app-fighter-trophies{font-size:8px;padding:1px 4px;left:4px;bottom:4px}') &&
    game.includes('.app-fighter-card.is-locked small{font-size:9px}') &&
    game.includes('.app-fighter-cost{font-size:8px;line-height:1.25}'));

// --- Icon top bar: search + filter icons, collapsible search ---
check('topbar: toolbar has an icon top bar with a search toggle and a filter button',
    game.includes('<div class="app-fighters-topbar">') &&
    game.includes('id="appFightersSearchToggle"') &&
    game.includes('class="app-fighters-icon-btn" aria-label="Search fighters"') &&
    game.includes('id="appFightersFilterBtn"') &&
    game.includes('class="app-fighters-icon-btn" aria-label="Filter fighters"'));
check('topbar: search toggle flips the open class, marks aria-expanded, focuses on open',
    game.includes("view.classList.toggle('app-fighters-search-open')") &&
    game.includes("toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false')") &&
    game.includes("if (open) view.querySelector('#appFightersSearch')?.focus();"));
check('topbar: filter button opens the filter sheet',
    game.includes("view.querySelector('#appFightersFilterBtn')?.addEventListener('click'") &&
    game.includes('openAppFightersFilterSheet();'));
check('topbar: search field is hidden on portrait phones until opened, then full-width',
    game.includes("#appHomeFightersView:not(.app-fighters-search-open) .app-fighters-search-wrap{display:none}") &&
    game.includes("#appHomeFightersView.app-fighters-search-open .app-fighters-search-wrap{display:flex;flex:none;width:100%}"));
check('topbar: top bar is hidden on wide windows; the filter row unwraps there (desktop toolbar unchanged)',
    game.includes('.app-fighters-topbar{display:none}') &&
    game.includes('.app-fighters-filter-row{display:contents}') &&
    game.includes('<div class="app-fighters-filter-row">'));
check('topbar: portrait toolbar is a compact column (icon bar / search / sort+roles+count)',
    game.includes('.app-fighters-toolbar{flex-direction:column;align-items:stretch;gap:6px;padding:2px 2px 8px}') &&
    game.includes('.app-fighters-filter-row{display:flex;align-items:center;gap:8px;flex:none}'));
check('topbar: sticky toolbar rule itself is untouched (still pins to the view top)',
    game.includes('.app-fighters-toolbar{position:sticky;top:0;z-index:3;background:linear-gradient(160deg,#06101f,#0a2140)'));
check('topbar: search + sort + roles + count all still exist (same ids as before)',
    game.includes('id="appFightersSearch"') && game.includes('id="appFightersSort"') &&
    game.includes('id="appFightersRoles"') && game.includes('id="appFightersCount"') &&
    game.includes('<span id="appFightersCount" class="app-fighters-count"></span>'));

// --- Filter sheet: rarity / power / owned, persisted, live ---
check('filter: state carries the three filter fields with all-defaults',
    game.includes("sort: 'favorites', rarity: 'all', minPower: 0, owned: 'all'"));
check('filter: rarity / power-band / owned vocabularies + storage key',
    game.includes("const APP_FIGHTERS_FILTERS_KEY = 'brawl_arena_fighters_filters';") &&
    game.includes("const APP_FIGHTER_RARITIES = ['Starter', 'Rare', 'Epic', 'Mythic', 'Exotic', 'Unique', 'Anomaly'];") &&
    game.includes('const APP_FIGHTER_POWER_BANDS = [0, 5, 9, 11, 12];') &&
    game.includes("const APP_FIGHTER_OWNED_STATES = ['all', 'owned', 'locked'];"));
check('filter: stored filters load validated (bad values fall back to defaults)',
    game.includes('safeJsonParse(localStorage.getItem(APP_FIGHTERS_FILTERS_KEY), null)') &&
    game.includes('if (APP_FIGHTER_RARITIES.includes(storedFilters.rarity))') &&
    game.includes('if (APP_FIGHTER_POWER_BANDS.includes(Number(storedFilters.minPower)))') &&
    game.includes('if (APP_FIGHTER_OWNED_STATES.includes(storedFilters.owned))'));
check('filter: save helper writes the same key as JSON',
    game.includes('function saveAppFightersFilters() {') &&
    game.includes("localStorage.setItem(APP_FIGHTERS_FILTERS_KEY, JSON.stringify({ rarity: appFightersState.rarity || 'all', minPower: Number(appFightersState.minPower) || 0, owned: appFightersState.owned || 'all' }));"));
check('filter: visible list applies rarity, min power and owned state (each short-circuits on default)',
    game.includes("const rarityFilter = appFightersState.rarity || 'all';") &&
    game.includes('if (r !== rarityFilter) return false;') &&
    game.includes("const minPower = Number(appFightersState.minPower) || 0;") &&
    game.includes('if (lv < minPower) return false;') &&
    game.includes("const ownedFilter = appFightersState.owned || 'all';") &&
    game.includes("if (ownedFilter === 'owned' && !owned) return false;") &&
    game.includes("if (ownedFilter === 'locked' && owned) return false;"));
check('filter: sheet opens as an in-app bottom sheet (kit-sheet language, own overlay id)',
    game.includes('function openAppFightersFilterSheet() {') &&
    game.includes('function closeAppFightersFilterSheet() {') &&
    game.includes("overlay.className = 'app-kit-sheet-overlay';") &&
    game.includes("overlay.id = 'appFightersFilterOverlay';") &&
    game.includes('FIGHTERS · FILTER'));
check('filter: sheet has rarity, power and owned selects with the right options',
    game.includes('id="appFilterRarity"') && game.includes('All rarities') &&
    game.includes('id="appFilterPower"') && game.includes('Power 12 (max)') &&
    game.includes('id="appFilterOwned"') && game.includes('data-app-filter-clear="1"') &&
    game.includes('data-app-filter-done="1"'));
check('filter: sheet changes persist + re-render + sync the button; CLEAR ALL resets all three',
    game.includes('saveAppFightersFilters(); renderAppFightersStrip(); syncAppFightersFilterBtn();') &&
    game.includes("appFightersState.rarity = 'all'; appFightersState.minPower = 0; appFightersState.owned = 'all';"));
check('filter: filter button lights up while any filter is set (and only then)',
    game.includes('function syncAppFightersFilterBtn() {') &&
    game.includes("btn.classList.toggle('is-active', !!active);") &&
    game.includes("btn.setAttribute('aria-pressed', active ? 'true' : 'false');") &&
    game.includes('syncAppFightersFilterBtn();'));

// --- Smaller sizing on portrait phones ---
check('sizing: home top bar + hero + quick row + event chip tighten on portrait phones',
    game.includes('#appHomeTop{gap:8px;min-height:40px}') &&
    game.includes('#appHomePlayer{font-size:13px;padding:5px 10px}') &&
    game.includes('#appHomeHero .app-hero-portrait{width:min(36vh,240px)}') &&
    game.includes('.app-hero-info strong{font-size:clamp(24px,5vh,36px)}') &&
    game.includes('.app-quick-btn{padding:8px 10px;font-size:12px}') &&
    game.includes('#appHomeEventChip b{font-size:13px}'));
check('sizing: search field is 16px on portrait phones (no focus zoom)',
    game.includes('.app-fighters-search-wrap .app-fighters-search{font-size:16px}') &&
    game.includes('.app-filter-field select{min-height:44px;'));
check('sizing: role chips + sort + detail text tighten on portrait phones',
    game.includes('.app-fighters-role{padding:6px 10px;font-size:11px}') &&
    game.includes('.app-fighters-filter-row .app-fighters-sort{padding:8px 6px;font-size:12px}') &&
    game.includes('.app-fighters-detail-info h3{font-size:clamp(22px,4.5vh,30px)}'));

// --- No boxes on mobile ---
check('nobox: fighters detail panel goes flat on portrait phones (border + background removed)',
    game.includes('#appFightersDetail{border:0;border-radius:0;background:transparent;box-shadow:none;padding:12px 4px}'));
check('nobox: kit slots + stat pills lose their heavy borders on portrait phones',
    game.includes('.app-kit-slot{border-color:transparent;background:rgba(255,255,255,.05)}') &&
    game.includes('.app-fighters-detail-stats span{padding:4px 8px;font-size:11px;border-color:transparent;background:rgba(255,255,255,.06)}'));
check('nobox: event slots thin out on portrait phones (title, tabs, structure untouched)',
    game.includes('.app-event-slot{min-height:96px;padding:12px;border:1px solid rgba(255,255,255,.10);background:rgba(8,20,42,.55)}'));
check('nobox: profile ranked boxes lose their heavy borders on portrait phones',
    game.includes('.native-app .profile-ranked-boxes>div{border-color:transparent;background:rgba(10,16,32,.4)}'));

// --- Desktop / v2 keep-list: unchanged ---
check('keep: v2 card is still a 16/10 wide card with dark border + hard shadow (base rule)',
    game.includes('aspect-ratio:16/10;background:var(--card-color,#0b69bd)') &&
    game.includes('border:3px solid #0a1428;box-shadow:0 4px 0 rgba(0,0,0,.45);'));
check('keep: home PLAY is still giant yellow',
    game.includes('#appHomePlay{min-height:64px;font-size:26px;background:linear-gradient(180deg,#ffe14d,#ffb400);'));
check('keep: home chips + hero trophy + menu button still exist',
    game.includes('id="appHomeTrophyChip"') && game.includes('id="appHomeRankedChip"') &&
    game.includes('class="app-hero-trophy"') && game.includes('id="appHomeMenuBtn"'));
check('keep: Ranked neon hub is untouched',
    game.includes('.ranked-hub-overlay{background:radial-gradient(ellipse at 50% 0%,rgba(0,245,212,.28),') &&
    game.includes('class="ranked-hub-foot"') && game.includes('RANK BOOST!'));
check('keep: Events title + sticky tabs are untouched',
    game.includes('class="app-events-title"') && game.includes('PLAY TO PROGRESS!') &&
    game.includes('class="app-events-tabs"') && game.includes('data-app-events-tab="tournament"'));
check('keep: season pass is still a two-row tier column with the bubble on the rail',
    circuitCss.includes('.circuit-tier{display:flex;flex-direction:column}') &&
    circuitCss.includes('.circuit-tier .circuit-reward.premium{order:2}') &&
    circuitCss.includes('.circuit-tier .circuit-reward.free{order:4}'));
check('keep: Brick Road rail + profile diagonal split are untouched',
    game.includes('.profile-trophies .profile-trophy-list{display:flex;gap:10px;overflow-x:auto;') &&
    game.includes('.brick-bon-v2.profile-view>main{background:linear-gradient(115deg,#1e7fe0 0 46%,#6d4bd8 46% 100%)}') &&
    game.includes('.profile-favorites-section .profile-favorite-icon{clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)}') &&
    game.includes('TOTAL PRESTIGE'));

// --- Hard limits ---
check('limits: no banned disabled-brawler word in game.js',
    !(new RegExp('\\\\b' + 'cl' + 'uster' + '\\\\b', 'i')).test(game));
check('limits: no banned disabled-brawler word in this test file',
    !(new RegExp('\\\\b' + 'cl' + 'uster' + '\\\\b', 'i')).test(read('tests/arena-forge-mobile-ui-regression.mjs')));
check('limits: tapper gem logic untouched (Surge parity)',
    game.includes('Surge parity (2026-11-19)') && game.includes('totalGems += 8;'));
check('limits: deleted skins stay deleted; Holiday Lights is still the tier-50 skin',
    !game.includes("'molten-rock-chaird'") && !game.includes("'xploder-rocketeer'") &&
    game.includes("'holiday-lights-freezeon'"));
check('limits: no Brawl Stars wording/branding in the new mobile-UI section',
    (() => {
        const start = game.indexOf('/* ---- Arena Forge mobile UI overhaul');
        const end = game.indexOf('`;', start);
        if (start === -1 || end === -1) return false;
        const section = game.slice(start, end);
        return !section.includes('Brawl Stars') && !section.includes('brawl stars');
    })());

// --- Runtime: filters really filter (vm harness, round-2 fixture shape) ---
const lsStore = new Map();
const elements = {};
const newEl = () => ({
    innerHTML: '', textContent: '', dataset: {},
    classList: { _s: new Set(), toggle(c, f) { if (f) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
});
const documentStub = { getElementById: (id) => (elements[id] ||= newEl()) };
const unlockedSet = new Set(['alpha', 'beta', 'mallow', 'freezeon', 'chaird', 'rocketeer']);
const sandbox = {
    document: documentStub,
    localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => { lsStore.set(k, String(v)); },
        removeItem: (k) => { lsStore.delete(k); },
    },
    skinsDatabase: {},
    allBrawlers: ['zeta', 'alpha', 'beta', 'mallow', 'solo', 'freezeon', 'chaird', 'rocketeer', 'feathers'],
    brawlerData: {
        zeta: { name: 'Zeta', emoji: '⚡', color: '#888', role: 'Tank', main: 'Zap', attackDesc: 'Zaps.', super: 'Big Zap', superDesc: 'Zaps all.', g1: 'Gadget Z1 (once)', sp1: 'Star Z1 (lasts)' },
        alpha: { name: 'Alpha', emoji: '🔥', color: '#f00', role: 'Damage Dealer', main: 'Punch', attackDesc: 'Punches.', super: 'Mega Punch', superDesc: 'Punches all.', g1: 'Gadget A1 (twice)', g2: 'Gadget A2 (thrice)', sp1: 'Star A1 (burns)', sp2: 'Star A2 (freezes)' },
        beta: { name: 'Beta', emoji: '💧', color: '#00f', role: 'Damage Dealer', main: 'Splash', attackDesc: 'Splashes.', super: 'Wave', superDesc: 'Waves.', g1: 'Gadget B1 (more)', sp1: 'Star B1 (slows)' },
        mallow: { name: 'Mallow', emoji: '🍬', color: '#f8f', role: 'Controller', main: 'Toss', attackDesc: 'Tosses.', super: 'Rain', superDesc: 'Rains.', g1: 'Gadget M1 (twice)', sp1: 'Star M1 (sticks)' },
        solo: { name: 'Solo', emoji: '⭐', color: '#8cf05a', role: 'Damage Dealer', main: 'Solo main', attackDesc: 'Solos.', super: 'Solo super', superDesc: 'Solos all.', g1: 'Only Gadget (the only one)', sp1: 'Only Star (the only one)' },
        freezeon: { name: 'FreeZeon', emoji: '🍦', color: '#8df', role: 'Controller', main: 'Snow Cone', attackDesc: 'Throws cones.', super: 'Ice Rink', superDesc: 'Lobs a rink.', g1: 'Cryo Syrup (sticky)', sp1: 'Supercool (snowballs)' },
        chaird: { name: 'Chaird', emoji: '🪑', color: '#a80', role: 'Tank', main: 'Chair Slam', attackDesc: 'Slams.', super: 'Rock Chair', superDesc: 'Rocks.', g1: 'Gadget C1 (twice)', sp1: 'Star C1 (burns)' },
        rocketeer: { name: 'Rocketeer', emoji: '🚀', color: '#f60', role: 'Artillery', main: 'Breakup Rocket', attackDesc: 'Fires.', super: 'Triple Impact', superDesc: 'Three rockets.', g1: 'Split Override (split 5)', sp1: 'Scorched Launch (fire zone)' },
        feathers: { name: 'Feathers', emoji: '🪶', color: '#adf', role: 'Controller', main: 'Peck', attackDesc: 'Pecks.', super: 'Molt', superDesc: 'Sheds.', g1: 'Gadget F1 (twice)', sp1: 'Star F1 (slows)' },
    },
    brawlerRarities: { zeta: 'Rare', alpha: 'Epic', beta: 'Starter', mallow: 'Mythic', solo: 'Anomaly', freezeon: 'Epic', chaird: 'Rare', rocketeer: 'Starter', feathers: 'Rare' },
    SOUL_UNLOCK_COST_BY_RARITY: { Starter: 0, Rare: 70, Epic: 170, Mythic: 270, Exotic: 420, Unique: 600, Anomaly: 850 },
    playerData: {
        coins: 100000, selectedSkins: {}, ownedSkins: {},
        brawlers: {
            zeta: { level: 1 }, alpha: { level: 12, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true },
            beta: { level: 5, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false },
            mallow: { level: 9, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false },
            solo: { level: 3 }, freezeon: { level: 11, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true },
            chaird: { level: 7 }, rocketeer: { level: 1 }, feathers: { level: 4 },
        },
    },
    appFightersState: { search: '', role: 'all', focused: 'alpha', sort: 'name' },
    APP_FIGHTERS_FILTERS_KEY: 'brawl_arena_fighters_filters',
    APP_FIGHTER_RARITY_COLORS: { Starter: '#ff9f1c', Rare: '#8cf05a', Epic: '#b388ff', Mythic: '#ff8ad8', Anomaly: '#f3d5ff' },
    MAX_POWER_LEVEL: 12,
    selectedBrawler: 'alpha',
    isBrawlerUnlocked: (id) => unlockedSet.has(id),
    isWeeklyTrialBrawler: () => false,
    getEffectiveBrawlerProgress: (id) => sandbox.playerData.brawlers[id] || { level: 1 },
    getScaledStats: () => ({ hp: 1000, dmg: 100, speed: 100 }),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    getCoreSurgeDescription: () => 'Core Surge description.',
    getActiveSkinForBrawler: () => null,
    getUpgradeCost: () => 100,
    getCorePieceUpgradeCost: () => 0,
    getCorePieces: () => 999,
    spendCorePieces: () => {},
    ensureHyperchargeDiscount: () => {},
    saveProgress: () => {},
    syncAppHome: () => {},
};
vm.createContext(sandbox);
const run = (code) => vm.runInContext(code, sandbox);
try {
    const sjStart = game.indexOf('    function safeJsonParse(raw, fallback) {');
    const sjEnd = game.indexOf('\n    }\n', sjStart) + '\n    }\n'.length;
    run(game.slice(sjStart, sjEnd));
    const favKeyAt = game.indexOf("    const favoriteBrawlersKey = 'brawl_arena_favorites';");
    const favLetAt = game.indexOf('    let favoriteBrawlers = ', favKeyAt);
    const favLetEnd = game.indexOf('\n', favLetAt) + 1;
    run(game.slice(favKeyAt, favLetEnd));
    run(sliceBetween('        function isFavoriteBrawler(id) {', '        function getBrawlerRarity(brawlerId) {'));
    run(sliceBetween('        function getBrawlerRarity(brawlerId) {', '        function getDisplayRarityName'));
    run(sliceBetween('        function getSoulUnlockCostForRarity(rarity) {', '        function getSoulsForPlacement'));
    run(sliceBetween('        function getBrawlerRarityRank(brawlerId) {', '        function ensurePlayerDataDefaults() {'));
    run(sliceBetween('    const kitSplit = (raw) => {', '    const kitName = '));
    run(sliceBetween('    const kitName = ', '    const kitDesc = '));
    run(sliceBetween('    const kitDesc = ', '    function toggleAppFighterFavorite(id) {'));
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function syncAppFightersFilterBtn() {', '    function renderAppFightersStrip() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    run(sliceBetween('    function saveAppFightersFilters() {', '    function appFightersRoles() {'));
    check('runtime: Fighters + filter functions extracted and evaluated', true);
} catch (err) {
    check('runtime: Fighters + filter functions extracted and evaluated (' + err.message + ')', false);
}

const stripOrder = () => [...(elements.appFightersStrip.innerHTML.matchAll(/data-app-fighter="([^"]+)"/g))].map((m) => m[1]).join(',');
const resetFilters = () => run(`appFightersState.search = ''; appFightersState.role = 'all'; appFightersState.sort = 'name'; appFightersState.rarity = 'all'; appFightersState.minPower = 0; appFightersState.owned = 'all'; renderAppFightersStrip();`);

// The sandbox state starts WITHOUT the filter fields (an old shape):
// the defaults must still yield the full list — no crash, no filtering.
delete sandbox.appFightersState.rarity;
delete sandbox.appFightersState.minPower;
delete sandbox.appFightersState.owned;
run(`appFightersState.search = ''; appFightersState.role = 'all'; appFightersState.sort = 'name'; renderAppFightersStrip();`);
check('runtime defaults: a state without filter fields lists every fighter (name order)',
    stripOrder() === 'alpha,beta,chaird,feathers,freezeon,mallow,rocketeer,solo,zeta');

run(`appFightersState.rarity = 'Epic'; renderAppFightersStrip();`);
check('runtime filter: rarity Epic keeps only the Epics',
    stripOrder() === 'alpha,freezeon');
run(`appFightersState.rarity = 'Anomaly'; renderAppFightersStrip();`);
check('runtime filter: rarity Anomaly keeps only Solo',
    stripOrder() === 'solo');
resetFilters();
run(`appFightersState.minPower = 11; renderAppFightersStrip();`);
check('runtime filter: min power 11 keeps only Power 11+',
    stripOrder() === 'alpha,freezeon');
run(`appFightersState.minPower = 12; renderAppFightersStrip();`);
check('runtime filter: min power 12 keeps only the maxed fighter',
    stripOrder() === 'alpha');
resetFilters();
run(`appFightersState.owned = 'owned'; renderAppFightersStrip();`);
check('runtime filter: owned keeps only unlocked fighters',
    stripOrder() === 'alpha,beta,chaird,freezeon,mallow,rocketeer');
run(`appFightersState.owned = 'locked'; renderAppFightersStrip();`);
check('runtime filter: locked keeps only the locked fighters',
    stripOrder() === 'feathers,solo,zeta');
resetFilters();
run(`appFightersState.rarity = 'Rare'; appFightersState.owned = 'locked'; renderAppFightersStrip();`);
check('runtime filter: rarity + owned compose (locked Rares)',
    stripOrder() === 'feathers,zeta');
resetFilters();
run(`appFightersState.rarity = 'Epic'; appFightersState.minPower = 12; renderAppFightersStrip();`);
check('runtime filter: rarity + power compose (Epic at Power 12)',
    stripOrder() === 'alpha');
resetFilters();
run(`appFightersState.search = 'freez'; appFightersState.rarity = 'Epic'; renderAppFightersStrip();`);
check('runtime filter: search + rarity compose (name search still works with filters)',
    stripOrder() === 'freezeon');
run(`appFightersState.rarity = 'Rare'; renderAppFightersStrip();`);
check('runtime filter: search + a non-matching rarity gives the empty state',
    stripOrder() === '' && elements.appFightersStrip.innerHTML.includes('No fighters match that search.'));
resetFilters();
check('runtime filter: clearing the filters restores the full list',
    stripOrder() === 'alpha,beta,chaird,feathers,freezeon,mallow,rocketeer,solo,zeta');

// Filter button sync: lights up while any filter is set.
const filterBtn = () => elements.appFightersFilterBtn;
run(`appFightersState.rarity = 'all'; appFightersState.minPower = 0; appFightersState.owned = 'all'; syncAppFightersFilterBtn();`);
check('runtime sync: no filters → button not active',
    !filterBtn().classList.contains('is-active') && filterBtn().getAttribute('aria-pressed') === 'false');
run(`appFightersState.rarity = 'Mythic'; syncAppFightersFilterBtn();`);
check('runtime sync: a rarity filter → button active',
    filterBtn().classList.contains('is-active') && filterBtn().getAttribute('aria-pressed') === 'true');
run(`appFightersState.rarity = 'all'; appFightersState.minPower = 9; syncAppFightersFilterBtn();`);
check('runtime sync: a power filter → button active',
    filterBtn().classList.contains('is-active'));
run(`appFightersState.minPower = 0; appFightersState.owned = 'locked'; syncAppFightersFilterBtn();`);
check('runtime sync: an owned filter → button active',
    filterBtn().classList.contains('is-active'));
run(`appFightersState.owned = 'all'; syncAppFightersFilterBtn();`);
check('runtime sync: clearing all filters → button inactive again',
    !filterBtn().classList.contains('is-active'));

// Persistence round-trip through the real save helper.
lsStore.clear();
run(`appFightersState.rarity = 'Mythic'; appFightersState.minPower = 9; appFightersState.owned = 'owned'; saveAppFightersFilters();`);
check('runtime persist: save writes the filters key as JSON with all three fields',
    (() => { try { const v = JSON.parse(lsStore.get('brawl_arena_fighters_filters')); return v.rarity === 'Mythic' && v.minPower === 9 && v.owned === 'owned'; } catch (_) { return false; } })());
run(`appFightersState.rarity = 'all'; appFightersState.minPower = 0; appFightersState.owned = 'all'; saveAppFightersFilters();`);
check('runtime persist: saving defaults writes the all-defaults JSON',
    lsStore.get('brawl_arena_fighters_filters') === JSON.stringify({ rarity: 'all', minPower: 0, owned: 'all' }));

console.log(`arena-forge-mobile-ui: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
