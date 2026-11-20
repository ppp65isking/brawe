// Arena Forge Brawl Space redesign (2026-11-19).
//
// Anthony: "Brawl stars uses there space very good" — the app screens
// felt broken and hard to move. His 8 reference screenshots are heavy
// inspiration for layout, spacing and hierarchy ONLY: no Brawl Stars
// art, icons, text or branding is lifted; all names, art and copy stay
// Arena Forge. Folded in: neon Ranked hub + the same spacious
// treatment on the website views.
//
// Pins:
//  (1) Fighters grid replaces the horizontal strip — big portrait
//      cards with power badge, bricks chip, rarity strip — and the
//      view is the ONE scroller (the grid is not a scroller, toolbar
//      stays sticky, touch-action pan-y so vertical drags are never
//      stolen). Search + sort + favorites + skins + PLAY + upgrade
//      all still work; detail is a big showcase.
//  (2) Home full-bleed hero stage, Events tab-style sections.
//  (3) Season pass road: tier bubbles on a track rail, same state/flow.
//  (4) Ranked: neon hub (emblem + RP bar + pass card + PLAY) gates the
//      draft — no AI turn starts before PLAY. Same tier/RP/pass data.
//  (5) Brick road: horizontal milestone road, next goal focused.
//  (6) Profile: split layout (player card full-width, two columns).
//  (7) Website: same space language (home stage, roster grid, events).
//  (8) Safe areas + deep links + save code + MORE sheet untouched.
//
// Layout/UX only: no mechanics, numbers, or core-kit changes; no new
// ranks, rewards or currencies; no banned disabled-brawler word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const circuitCss = read('circuit-pass.css');
const homeCss = read('home-brawl-style.css');
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

// --- (1) Fighters grid + one scroller ---
check('fighters: strip is a horizontal paging scroller (fixes round: 4 small per column, swipe left/right)',
    game.includes("#appFightersStrip{display:flex;flex-direction:row;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;padding:4px 2px 12px;background:transparent;border-radius:0;flex:1 1 auto;min-height:0;max-height:520px}"));
check('fighters: strip pages are one column of 4 (118px portrait, 96px landscape)',
    game.includes('#appFightersStrip .app-fighters-page{flex:1 0 118px;max-width:260px;display:grid;grid-template-rows:repeat(4,minmax(0,1fr));gap:8px;scroll-snap-align:start}') &&
    game.includes("@media (orientation:landscape){#appFightersStrip .app-fighters-page{flex-basis:96px;max-width:220px}}"));
check('fighters: view is the one scroller (touch-action pan-y, momentum kept)',
    game.includes('#appHomeFightersView{touch-action:pan-y}') &&
    game.includes('#appHomeFightersView{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'));
// Landscape home UI (sketch, 2026-11-20): paging stays the portrait
// layout; landscape is a 3-column grid per Anthony's sketch. The old
// auto-fill grids stay gone; the only grid rule is the landscape one.
check('fighters: old 280px/300px grid is gone (paging in portrait, 3-col grid in landscape)',
    !game.includes('repeat(auto-fill,minmax(280px,1fr))') &&
    !game.includes('repeat(auto-fill,minmax(300px,1fr))') &&
    [...game.matchAll(/#appFightersStrip\{display:grid/g)].length === 1 &&
    game.includes('.native-app #appFightersStrip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));'));
check('fighters: container carries the grid class',
    game.includes('<div id="appFightersStrip" class="app-fighters-grid"></div>'));
check('fighters: card has power badge, bricks chip, rarity strip in markup',
    game.includes('<span class="app-fighter-power">${pData.level || 1}</span>') &&
    game.includes('<span class="app-fighter-rarity" style="--rarity-color:${rarityColor}" aria-hidden="true"></span>') &&
    game.includes('<span class="app-fighter-trophies">🧱 ${bricks.toLocaleString()}</span>'));
check('fighters: small cards keep the power badge, thin the rarity edge to 6px (kit strip hidden)',
    game.includes('.app-fighter-power{position:absolute;top:4px;right:3px;z-index:3;width:24px;height:24px;') &&
    game.includes('.app-fighter-rarity{position:absolute;top:0;right:0;bottom:0;width:6px;') &&
    game.includes('.app-fighter-kit{display:none}'));
check('fighters: card is a small card filling its page row (no aspect-ratio)',
    game.includes('.app-fighter-card{position:relative;width:auto;padding:0;border-radius:10px;overflow:hidden;text-align:left;border:2px solid #0a1428;box-shadow:0 3px 0 rgba(0,0,0,.45);background:var(--card-color,#0b69bd)}') &&
    !game.includes('aspect-ratio:16/10') &&
    game.includes('.app-fighter-card .app-fighter-portrait{position:absolute;inset:0;width:100%;height:100%;margin:0;border:0;border-radius:0;display:grid;place-items:center}'));
check('fighters: search + icon buttons + owned count present; sort lives in the filter sheet now',
    game.includes('id="appFightersSearch"') && game.includes('id="appFightersFavToggle"') &&
    game.includes('id="appFightersCount"') && game.includes('id="appFilterSort"') &&
    !game.includes('id="appFightersRoles"') && !game.includes('<select id="appFightersSort"') &&
    game.includes("const APP_FIGHTERS_SORTS = ['favorites', 'name', 'power', 'rarity', 'owned'];"));
check('fighters: tap opens the fighter full screen (fixes round: no inline detail)',
    (() => {
        const at = game.indexOf("view.querySelector('#appFightersStrip')?.addEventListener('click'");
        if (at === -1) return false;
        const h = game.slice(at, at + 2200);
        return h.includes('openAppFighterPage(appFightersState.focused);') && !h.includes('renderAppFightersDetail();');
    })());
check('fighters: detail is a showcase on its own full screen (centered stage, 2-col kit grid)',
    game.includes('#appFighterDetail{flex-direction:column;align-items:center;text-align:center;padding:16px 14px}') &&
    game.includes('.app-kit-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}') &&
    game.includes('@media (orientation:landscape){#appFighterDetail{flex-direction:row;align-items:flex-start;text-align:left}') &&
    game.includes('function buildAppFighterView() {'));
check('fighters: detail controls kept (play / upgrade / favorite / skins / kit sheet)',
    game.includes('data-app-action="play"') && game.includes('data-app-action="upgrade"') &&
    game.includes('data-app-action="favorite"') && game.includes('data-app-skin=') &&
    game.includes('data-app-kit=') && game.includes('function openAppKitSheet(id, key) {'));

// --- (2) Home hero + events ---
check('home: hero is a full-bleed stage with a fighter-color glow',
    game.includes('#appHomeHero::before{content:"";position:absolute;inset:-40% -20% auto;height:120%;background:radial-gradient(ellipse at 50% 30%,color-mix(in srgb,var(--hero-color,#0b69bd) 55%,transparent),transparent 70%);pointer-events:none}') &&
    game.includes('#appHomeHero .app-hero-portrait{width:min(44vh,300px);'));
check('home: top strip, quick row, PLAY, event chip all still wired',
    game.includes('id="appHomePlayer"') && game.includes('id="appHomeSeasonChip"') &&
    game.includes('id="appHomeSaveBtn"') && game.includes('id="appHomePlay"') &&
    game.includes('id="appHomeEventChip"') && game.includes('data-app-quick="quests"') &&
    game.includes('data-app-quick="pass"') && game.includes('data-app-quick="tappers"') &&
    game.includes('data-app-quick="more"') && game.includes('data-app-quick="settings"'));
check('events: section headers read as tabs; cards bigger',
    game.includes('.app-events-section{display:inline-block;font-size:13px;letter-spacing:.12em;') &&
    game.includes('.app-events-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding-top:10px}') &&
    game.includes('.app-event-slot{min-height:118px;padding:16px 16px 14px}'));
check('events: same data + routes (featured, popular, rotating, info buttons)',
    game.includes('data-app-featured="season"') && game.includes('data-app-featured="tournament"') &&
    game.includes('data-app-info=') &&
    game.includes('HOME_POPULAR_MODE_IDS') && game.includes('getHomeDailyRotationIds'));

// --- (3) Season pass road ---
check('pass: tier numbers are glowing bubbles on a track rail',
    circuitCss.includes('.circuit-tier h2{width:52px;height:52px;display:grid;place-items:center;border-radius:50%;') &&
    circuitCss.includes('.circuit-tier::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;') &&
    circuitCss.includes('.circuit-tier.unlocked h2{border-color:#72e8d2;'));
check('pass: app landscape goes back to the horizontal track',
    circuitCss.includes('@media (orientation:landscape){.native-app .circuit-road{flex-direction:row;overflow-x:auto;gap:12px;'));
check('pass: pinned road rules intact (web horizontal, app vertical stack)',
    circuitCss.includes('.circuit-road{display:flex;gap:12px;overflow-x:auto;') &&
    circuitCss.includes('.circuit-tier{flex:0 0 178px;') &&
    circuitCss.includes('.native-app .circuit-road{display:flex;flex-direction:column;overflow:visible;'));
check('pass: same state/flow (tiers, claims, MISSIONS link)',
    game.includes('function openSeasonPass() {') && game.includes('claimSeasonPassTrackReward') &&
    game.includes('data-action="quests"') && game.includes("tab==='road'"));

// --- (4) Ranked neon hub ---
// Ranked Solo round (2026-11-20): hub gained a third arg (onPlaySolo) for
// the solo PLAY button — signature pin updated, gating behavior unchanged.
check('ranked: hub function exists and gates the draft behind PLAY',
    game.includes('function openRankedHubOverlay(queueOverlay, onPlay, onPlaySolo) {') &&
    game.includes('openRankedHubOverlay(overlay, () => { renderDraft(); scheduleNextTurn(250); }, () => { if (aiTurnTimer) clearTimeout(aiTurnTimer); overlay.remove(); startRankedSoloMatch(); })') &&
    !game.includes('        renderDraft();\n        overlay.appendChild(panel);'));
check('ranked: hub has emblem + RP bar + PLAY + close (old pass card deleted)',
    game.includes('class="ranked-hub-emblem"') && game.includes('class="ranked-hub-bar"') &&
    game.includes('data-ranked-hub="play"') &&
    game.includes('data-ranked-hub="close"') && game.includes('▶ PLAY RANKED'));
check('ranked: hub reads the same tier/RP data + Prestige League standings (Ranked Pass deleted, stage 6-7)',
    game.includes('const tierInfo = getRankedTierInfo(rankedPoints);') &&
    game.includes('getPrestigeLeagueLevel(rankedPoints)') && game.includes('getRankedDivisionFloor(rankedPoints)') &&
    !game.includes('RANKED_PASS_TIERS'));
check('ranked: hub close removes the queue overlay (draft never started)',
    game.includes('queueOverlay.remove();'));
check('ranked: neon CSS — hub, queue and pass all glow cyan/purple',
    game.includes('.ranked-hub-overlay{position:fixed;inset:0;z-index:2300;') &&
    game.includes('.ranked-hub-play{padding:16px 20px;border:0;border-radius:16px;background:linear-gradient(90deg,#00f5d4,#38bdf8,#a855f7);') &&
    game.includes('.ranked-queue-overlay{background:radial-gradient(ellipse at 50% 0%,rgba(88,28,135,.5),rgba(2,0,20,.97) 60%) !important}') &&
    game.includes('.ranked-pass-panel{border-color:rgba(0,245,212,.55) !important;'));
check('ranked: hub stacks below 640px (single column)',
    game.includes('@media (max-width:640px){.ranked-hub-body{grid-template-columns:1fr}.ranked-hub-panel{padding:16px}}'));

// --- (5) Trophy / Brick road ---
check('brick road: profile bricks are a horizontal node road too',
    game.includes('.profile-trophies .profile-trophy-list{display:flex;gap:10px;overflow-x:auto;') &&
    game.includes('.profile-trophies .profile-trophy-list>div{flex:0 0 190px;'));
check('brick road: bricks data (lifetime bricks, placement awards)',
    game.includes('function getLifetimeBricks(progress) {') &&
    game.includes('1st place earns 30'));

// --- (6) Profile split ---
check('profile: panel carries the split class; grid is two columns, one on phones',
    game.includes("panel.className = 'brick-bon-v2 profile-view';") &&
    game.includes('.brick-bon-v2.profile-view>main{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);') &&
    game.includes('@media (max-width:760px){.brick-bon-v2.profile-view>main{grid-template-columns:minmax(0,1fr)}}'));
check('profile: same sections (hero, bricks, career, favorites, badges, pins, road, ranked)',
    game.includes('function openPlayerProfile() {') && game.includes('function renderProfileCareer(container){') &&
    game.includes('createBricksSection()') && game.includes('EDIT PROFILE'));

// --- (7) Website treatment ---
check('web home: bigger stage, bigger PLAY, roomier bottom bar',
    homeCss.includes('#homeScreen #homeBrawlerCard { min-height: clamp(340px, 62vh, 580px) !important; }') &&
    homeCss.includes('#homeScreen #startMatch { width: 220px !important; min-height: 100px !important; font-size: 30px !important; }') &&
    homeCss.includes('#homeScreen #homeBsBottom { gap: 16px !important; }'));
check('web events: heading is a tab, compact row is wider with bigger cards',
    homeCss.includes('#homeScreen #homeModeCompactRow {') &&
    homeCss.includes('grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;') &&
    homeCss.includes('#homeScreen #homeEventsView .home-mode-card { min-height: 128px !important; }'));
check('web roster: wider grid on desktop, bricks line on cards',
    galleryCss.includes('.fighter-gallery:not(.brawler-detail-view) .brawler-browser__grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;gap:12px!important}') &&
    galleryCss.includes('@media(min-width:1100px){.fighter-gallery:not(.brawler-detail-view) .brawler-browser__grid{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))!important;') &&
    game.includes("trophyLine.className = 'brawler-card__trophies';") &&
    galleryCss.includes('.fighter-gallery .brawler-card__trophies{'));
check('web: save code, MORE links, deep links and mode cards untouched',
    game.includes('function openSaveCodeModal() {') && game.includes('function openAppMoreSheet() {') &&
    game.includes("const APP_DEEP_LINK_ROUTES = ['home', 'fighters', 'fighter', 'events', 'shop', 'pass', 'tournament', 'profile', 'settings'];") &&
    game.includes('homeModeCardMap'));

// --- (8) Safe areas + hard limits ---
check('safe area: edge-to-edge fix intact (dark root, inset padding)',
    game.includes('html.native-app{background:#06101f}') &&
    game.includes("padding-top:max(8px,env(safe-area-inset-top))"));
check('no banned disabled-brawler word anywhere in game.js',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(game));
check('no banned disabled-brawler word in this test file',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(read('tests/arena-forge-brawl-space-regression.mjs')));

// --- Runtime: really render the grid cards ---
const lsStore = new Map();
const elements = {};
const newEl = () => ({ innerHTML: '', textContent: '', dataset: {} });
const documentStub = { getElementById: (id) => (elements[id] ||= newEl()) };
const unlockedSet = new Set(['alpha', 'beta']);
const sandbox = {
    document: documentStub,
    localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => { lsStore.set(k, String(v)); },
        removeItem: (k) => { lsStore.delete(k); },
    },
    skinsDatabase: {},
    allBrawlers: ['beta', 'alpha', 'mallow'],
    brawlerData: {
        alpha: { name: 'Alpha', emoji: '🔥', color: '#f00', role: 'Damage Dealer', main: 'Punch', attackDesc: 'Punches.', super: 'Mega Punch', superDesc: 'Punches all.', g1: 'Gadget A1 (once)', g2: 'Gadget A2 (twice)', sp1: 'Star A1 (burns)', sp2: 'Star A2 (freezes)' },
        beta: { name: 'Beta', emoji: '💧', color: '#00f', role: 'Damage Dealer', main: 'Splash', attackDesc: 'Splashes.', super: 'Wave', superDesc: 'Waves.', g1: 'Gadget B1 (more)', sp1: 'Star B1 (slows)' },
        mallow: { name: 'Mallow', emoji: '🍬', color: '#f8f', role: 'Controller', main: 'Toss', attackDesc: 'Tosses.', super: 'Rain', superDesc: 'Rains.', g1: 'Gadget M1 (twice)', g2: 'Gadget M2 (thrice)', sp1: 'Star M1 (sticks)', sp2: 'Star M2 (bounces)' },
    },
    brawlerRarities: { alpha: 'Epic', beta: 'Starter', mallow: 'Mythic' },
    SOUL_UNLOCK_COST_BY_RARITY: { Starter: 0, Rare: 70, Epic: 170, Mythic: 270, Exotic: 420, Unique: 600, Anomaly: 850 },
    playerData: {
        coins: 100000, selectedSkins: {}, ownedSkins: {},
        brawlers: {
            alpha: { level: 12, bricks: 240, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedGadget: 'g1', selectedStar: 'slow' },
            beta: { level: 5, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false, selectedGadget: 'g2', selectedStar: 'long' },
            mallow: { level: 9, bricks: 120 },
        },
    },
    appFightersState: { search: '', role: 'all', focused: 'alpha', sort: 'favorites' },
    APP_FIGHTER_RARITY_COLORS: { Starter: '#ff9f1c', Rare: '#8cf05a', Epic: '#b388ff', Mythic: '#ff8ad8', Anomaly: '#f3d5ff' },
    MAX_POWER_LEVEL: 12,
    selectedBrawler: 'alpha',
    isBrawlerUnlocked: (id) => unlockedSet.has(id),
    isWeeklyTrialBrawler: () => false,
    getEffectiveBrawlerProgress: (id) => sandbox.playerData.brawlers[id] || { level: 1 },
    getScaledStats: () => ({ hp: 1000, dmg: 100, speed: 100 }),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    getLifetimeBricks: (p) => Math.max(0, Math.floor(p?.bricks || 0)) + Math.max(0, Math.floor(p?.prestige || 0)) * 1000,
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
    run(sliceBetween('    function playableBrawlerIds() {', '    // Emergency balance hold:'));
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    check('runtime: Fighters functions extracted and evaluated', true);
} catch (err) {
    check('runtime: Fighters functions extracted and evaluated (' + err.message + ')', false);
}
run(`appFightersState.sort = 'favorites'; appFightersState.search = ''; appFightersState.role = 'all'; renderAppFightersStrip();`);
const stripHtml = elements.appFightersStrip.innerHTML;
check('runtime grid: power badge shows the level on the card',
    stripHtml.includes('<span class="app-fighter-power">12</span>'));
check('runtime grid: bricks chip shows real lifetime bricks, hidden at zero',
    stripHtml.includes('🧱 240') && !stripHtml.includes('🧱 0'));
check('runtime grid: rarity strip carries the rarity color',
    stripHtml.includes('--rarity-color:#b388ff') && stripHtml.includes('--rarity-color:#ff9f1c'));
check('runtime grid: locked card still shows LOCKED + soul cost',
    stripHtml.includes('🔒 LOCKED') && stripHtml.includes('270 SOULS TO UNLOCK'));
check('runtime grid: favorite star + portrait + name still on the card',
    stripHtml.includes('data-app-favorite="alpha"') && stripHtml.includes('Alpha') &&
    stripHtml.includes('class="app-fighter-portrait"'));

console.log(`arena-forge-brawl-space: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
