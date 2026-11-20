// Arena Forge Brawl Space v2 (2026-11-19).
//
// Anthony playtested v1: "It is not what I imagined and not the best UI
// and QoL". V2 rebuilds each screen's STRUCTURE to the exact layout of
// his 8 Brawl Stars screenshots (cross-checked against the web): wide
// landscape fighter cards with the kit strip, home top bar + side
// columns + giant yellow PLAY, ranked split (pass card left, emblem
// center, PLAY foot), event title + bottom tabs, two-row pass road with
// the rail through the tier bubbles, brick road rail + nodes + hero
// stage + next big reward, profile diagonal split. Layout, proportions,
// spacing and colors only — all content, names, art and copy stay Arena
// Forge; no Brawl Stars art, icons, text or branding is lifted.
//
// Pins the v2 match per screen + a vm runtime render of the kit strip
// (tool / talent / Core Surge state + upgrade-count badge). One scroller
// and all the v1 behavior pins live in the v1 suite; this suite only
// adds what v2 changed.
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

// --- Fighters: wide landscape cards, kit strip, upgrade badge ---
check('v2 fighters: grid is wide landscape cards (280px, 300px landscape)',
    game.includes("#appFightersStrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;") &&
    game.includes("@media (orientation:landscape){#appFightersStrip{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}"));
check('v2 fighters: card is a 16/10 wide card with a dark border + hard shadow',
    game.includes('aspect-ratio:16/10;background:var(--card-color,#0b69bd)') &&
    game.includes('border:3px solid #0a1428;box-shadow:0 4px 0 rgba(0,0,0,.45);'));
check('v2 fighters: portrait fills the card, name bottom-right, bricks chip bottom-left',
    game.includes('.app-fighter-card .app-fighter-portrait{position:absolute;inset:0;width:100%;height:100%;') &&
    game.includes('.app-fighter-card b{position:absolute;right:42px;bottom:6px;') &&
    game.includes('.app-fighter-trophies{position:absolute;left:6px;bottom:6px;'));
check('v2 fighters: right strip is 34px with the power badge on top of it',
    game.includes('.app-fighter-rarity{position:absolute;top:0;right:0;bottom:0;width:34px;') &&
    game.includes('.app-fighter-power{position:absolute;top:5px;right:3px;') &&
    game.includes('.app-fighter-kit{position:absolute;top:44px;right:0;bottom:8px;width:34px;'));
check('v2 fighters: kit strip shows tool / talent / surge state + upgrade-count badge',
    game.includes('<span class="app-fighter-kit" aria-hidden="true">') &&
    game.includes('class="kit-tool${kitTool ? \' on\' : \'\'}"') &&
    game.includes('class="kit-talent${kitTalent ? \' on\' : \'\'}"') &&
    game.includes('class="kit-surge${kitSurge ? \' on\' : \'\'}"') &&
    game.includes('<span class="app-fighter-upg">${kitUpg}</span>'));
check('v2 fighters: locked cards are greyed with a centered LOCKED overlay + souls cost',
    game.includes('.app-fighter-card.is-locked .app-fighter-portrait{filter:grayscale(.75) brightness(.55)}') &&
    game.includes('.app-fighter-card.is-locked small{display:flex;position:absolute;left:0;right:36px;top:50%;'));

// --- Home: top bar chips, side column, giant PLAY ---
check('v2 home: top bar has bricks + ranked chips and a menu button',
    game.includes('id="appHomeTrophyChip"') && game.includes('id="appHomeRankedChip"') &&
    game.includes('id="appHomeMenuBtn"') && game.includes("openAppMoreSheet();"));
check('v2 home: top chips are filled from live data (bricks, ranked tier, pass XP)',
    game.includes("trophyEl.textContent = `🧱 ${getTotalBrickBonBricks().toLocaleString()}`") &&
    game.includes('const ti = getRankedTierInfo(rp);') &&
    game.includes("xpEl.textContent = `🎫 LV ${pass.level} · ${Math.min(100, pass.xp % 100)}/100`"));
check('v2 home: hero carries the bricks chip above the portrait',
    game.includes('class="app-hero-trophy"') && game.includes('heroBricksHtml') &&
    game.includes("getLifetimeBricks(playerData.brawlers?.[selectedBrawler])"));
check('v2 home: mode card carries the New-map countdown; PLAY is giant yellow',
    game.includes('app-home-map-count') && game.includes('New map in: ${formatHomeEventCountdown(') &&
    game.includes('#appHomePlay{min-height:64px;font-size:26px;background:linear-gradient(180deg,#ffe14d,#ffb400);'));
check('v2 home: landscape is a 3-column grid (quick row | hero | side column, play row bottom)',
    game.includes("@media (orientation:landscape){\n          #appHomeHeroView.is-active{display:grid;grid-template-columns:minmax(140px,220px) minmax(0,1fr) minmax(140px,220px);") &&
    game.includes('#appHomeSideRight{display:flex;grid-column:3;grid-row:1}') &&
    game.includes('id="appHomeSideRight"') &&
    game.includes('data-app-side="ranked"') && game.includes('data-app-side="news"') &&
    game.includes("openRankedQueueUI();") && game.includes("openBalanceBlog();"));

// --- Ranked: reference split, neon kept ---
check('v2 ranked: hub is split — back chevron, pass card left, emblem center, PLAY foot',
    game.includes('class="ranked-hub-back"') && game.includes('class="ranked-hub-pass-clip"') &&
    game.includes('class="ranked-hub-pass-title"') && game.includes('class="ranked-hub-season"') &&
    game.includes('class="ranked-hub-ticks"') && game.includes('class="ranked-hub-foot"') &&
    game.includes('class="ranked-hub-boost"') && game.includes('RANK BOOST!'));
check('v2 ranked: hub panel is wider and keeps the neon overlay',
    game.includes('.ranked-hub-panel{width:min(1100px,100%)}') &&
    game.includes('.ranked-hub-overlay{background:radial-gradient(ellipse at 50% 0%,rgba(0,245,212,.28),') &&
    game.includes('background:linear-gradient(180deg,#ffd166,#ffb400);color:#231303;border:3px solid #0a1428;')); // gold pass card, neon kept

// --- Events: title + bottom tabs ---
check('v2 events: big outlined title + season countdown, section anchors',
    game.includes('class="app-events-title"') && game.includes('PLAY TO PROGRESS!') &&
    game.includes('data-app-events-section="featured"') && game.includes('data-app-events-section="popular"') &&
    game.includes('data-app-events-section="rotating"') && game.includes('data-app-events-section="overdrive"'));
check('v2 events: sticky bottom tab strip scrolls to each section',
    game.includes('class="app-events-tabs"') && game.includes('data-app-events-tab="featured"') &&
    game.includes('data-app-events-tab="popular"') && game.includes('data-app-events-tab="rotating"') &&
    game.includes('data-app-events-tab="tournament"') &&
    game.includes("view.querySelector(`[data-app-events-section=\"${tab.dataset.appEventsTab}\"]`)"));

// --- Season pass: hero + GET, two-row rail, tabs at the bottom ---
check('v2 pass: hero fighter + GET button claim the next ready reward',
    game.includes("heroWrap.className='circuit-road-wrap'") && game.includes("heroAside.className='circuit-hero'") &&
    game.includes('class="circuit-hero-get"') && game.includes('claimSeasonPassTrackReward(nextClaim.tier,nextClaim.track)'));
check('v2 pass: tier is a two-row column with the rail through the bubble',
    circuitCss.includes('.circuit-tier{display:flex;flex-direction:column}') &&
    circuitCss.includes('.circuit-tier-cards{display:contents}') &&
    circuitCss.includes('.circuit-tier h2{order:3;') &&
    circuitCss.includes('.circuit-tier h2::before{content:"";position:absolute;top:50%;left:-75px;right:-75px;height:6px;') &&
    circuitCss.includes('.circuit-tier .circuit-reward.premium{order:2}') &&
    circuitCss.includes('.circuit-tier .circuit-reward.free{order:4}'));
check('v2 pass: tabs sit below the content; app portrait keeps the v1 side-by-side cards',
    circuitCss.includes('.circuit-panel .circuit-content{order:3}') &&
    circuitCss.includes('.circuit-panel .circuit-tabs{order:4}') &&
    circuitCss.includes('.native-app .circuit-tier-cards{display:grid}') &&
    circuitCss.includes('.native-app .circuit-tier::before{display:block}'));

// --- Brick road: rail, nodes, stage, next big reward, tier row ---
check('v2 road: each node draws its own rail segment; nodes are 150px rail nodes',
    game.includes("railSeg.style.cssText = `position:absolute;left:-6px;right:-6px;top:28px;height:8px;") &&
    game.includes('flex:0 0 150px;scroll-snap-align:start;') &&
    game.includes("trackContainer.style.cssText = 'position:relative;display:flex;"));
check('v2 road: icon is a 64px circle on the rail; NEXT GOAL labels the next node',
    game.includes('width:64px;height:64px;border-radius:50%;') &&
    game.includes("nextGoal.textContent = 'NEXT GOAL'"));
check('v2 road: hero stage + next-big-reward card + numbered tier row below the track',
    game.includes("roadStage.style.cssText = 'display:flex;align-items:flex-end;") &&
    game.includes('NEXT BIG REWARD') && game.includes('BRICKS</span>') &&
    game.includes("tierRow.style.cssText = 'display:flex;gap:8px;overflow-x:auto;") &&
    game.includes("trackContainer.children[i]?.scrollIntoView({ inline: 'center', block: 'nearest' })"));
check('v2 road: header shows the league + a bricks chip',
    game.includes('${league.name.toUpperCase()} · Earn Bricks') &&
    game.includes('brickChip.textContent = `🧱 ${totalBricks.toLocaleString()}`'));

// --- Profile: diagonal split, ranked panel, hex favorites ---
check('v2 profile: diagonal split background; hero left spanning, bricks/ranked/favorites right',
    game.includes('.brick-bon-v2.profile-view>main{background:linear-gradient(115deg,#1e7fe0 0 46%,#6d4bd8 46% 100%)}') &&
    game.includes('.brick-bon-v2.profile-view>main>.profile-hero{grid-column:1;grid-row:1/4}') &&
    game.includes('.brick-bon-v2.profile-view>main>.profile-trophies{grid-column:2;grid-row:1}') &&
    game.includes('.brick-bon-v2.profile-view>main>.profile-ranked{grid-column:2;grid-row:2}') &&
    game.includes('.brick-bon-v2.profile-view>main>.profile-favorites-section{grid-column:2;grid-row:3}'));
check('v2 profile: ranked panel shows current + highest tier',
    game.includes("section.className = 'profile-section profile-ranked';") &&
    game.includes('Highest: ${rankedHighInfo.label}') &&
    game.includes('function createRankedProfileSection() {') &&
    game.includes('<h3>⚔️ RANKED</h3>'));
check('v2 profile: favorites are hex-clipped with a prestige shield + SHOW MORE',
    game.includes('.profile-favorites-section .profile-favorite-icon{clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)}') &&
    game.includes("shieldC.className='profile-prestige-shield'") &&
    game.includes('TOTAL PRESTIGE') &&
    game.includes("showMoreC.textContent='SHOW MORE'") &&
    game.includes('function goProfileFighters() {'));

// --- Website: same exact-layout treatment ---
check('v2 web roster: wide cards, portrait fills, name/bricks placed, kit strip right',
    galleryCss.includes('.fighter-gallery:not(.brawler-detail-view) .brawler-browser__grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;gap:12px!important}') &&
    galleryCss.includes('@media(min-width:1100px){.fighter-gallery:not(.brawler-detail-view) .brawler-browser__grid{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))!important;') &&
    galleryCss.includes('.fighter-gallery .brawler-card{position:relative!important;aspect-ratio:16/10!important;') &&
    galleryCss.includes('.fighter-gallery .brawler-card__portrait{position:absolute!important;inset:0!important;') &&
    galleryCss.includes('.fighter-gallery .brawler-card__name{position:absolute!important;right:42px!important;bottom:6px!important;') &&
    galleryCss.includes('.fighter-gallery .brawler-card__trophies{position:absolute!important;left:6px!important;bottom:6px!important;') &&
    galleryCss.includes('.fighter-gallery .brawler-card__abilities{position:absolute!important;top:44px!important;right:0!important;'));
check('v2 web home: BS blue + skull pattern, chunky borders, yellow PLAY',
    homeCss.includes('#homeScreen{background:linear-gradient(180deg,#1e7fe0,#0f5fc4) url("data:image/svg+xml,') &&
    homeCss.includes('#homeScreen #startMatch{background:linear-gradient(180deg,#ffe14d,#ffb400) !important;') &&
    homeCss.includes('#homeScreen .home-mode-card{border:3px solid #0a1428 !important;'));

// --- Hard limits ---
check('v2: no banned disabled-brawler word in game.js',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(game));
check('v2: no banned disabled-brawler word in this test file',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(read('tests/arena-forge-brawl-space-v2-regression.mjs')));

// --- Runtime: really render the kit strip ---
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
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    check('v2 runtime: Fighters functions extracted and evaluated', true);
} catch (err) {
    check('v2 runtime: Fighters functions extracted and evaluated (' + err.message + ')', false);
}
run(`appFightersState.sort = 'favorites'; appFightersState.search = ''; appFightersState.role = 'all'; renderAppFightersStrip();`);
const stripHtml = elements.appFightersStrip.innerHTML;
check('v2 runtime kit: surge icon lit only where Core Surge is unlocked (alpha, 1 of 3)',
    stripHtml.includes('class="kit-surge on"') && (stripHtml.match(/kit-surge on/g) || []).length === 1);
check('v2 runtime kit: tool + talent lit for alpha and beta, dark for locked mallow',
    (stripHtml.match(/kit-tool on/g) || []).length === 2 &&
    (stripHtml.match(/kit-talent on/g) || []).length === 2 &&
    stripHtml.includes('class="kit-tool">🔧') && stripHtml.includes('class="kit-surge">⚡'));
check('v2 runtime kit: upgrade badge counts missing kit pieces — beta 1, mallow 3, alpha none',
    (stripHtml.match(/app-fighter-upg/g) || []).length === 2 &&
    stripHtml.includes('<span class="app-fighter-upg">1</span>') &&
    stripHtml.includes('<span class="app-fighter-upg">3</span>'));

console.log(`arena-forge-brawl-space-v2: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
