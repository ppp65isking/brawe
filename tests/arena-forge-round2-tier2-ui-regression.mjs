// Arena Forge app overhaul round 2, Tier 2 UI (2026-11-19):
// 1. match-intro phone restyle (mode + map header, split modifier
//    name/description, full-width card rows),
// 2. profile editor + ranked queue phone layouts,
// 3. shop empty states (only the skins tab can ever be empty).
// App/touch mode ONLY: desktop rules and behavior are asserted unchanged.
// Source-presence + behavior mirrors (appEventMapName, the modifier defs
// and the skins filter predicate are extracted and run against fixtures).
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const styles = read('styles.css');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const normWs = (s) => s.replace(/\s+/g, ' ').trim();
// String-aware brace matcher: returns the source from `start` through its
// matching close brace (skips string literals, template literals and
// line/block comments so braces inside them cannot end the match early).
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

// --- Slices ---
const introFn = sliceBetween(game, 'function showMatchIntroCards() {', '    const ATTACHIE_PULL_COST');
const matchCardFn = sliceBetween(game, 'function buildMatchCard(entry) {', '        function getMatchCardRoster()');
const rankedFn = sliceBetween(game, 'function openRankedQueueUI() {', '    // Prop Hunt v2: pre-match role picker.');
const profileEditorFn = sliceBetween(game, 'function openProfileEditor(onSaved){', '    function renderProfileCareer(container){');
const skinsTab = sliceBetween(game, 'const renderSkinsTab = () => {', '      const renderWheelTab = () => {');
const dailyTab = sliceBetween(game, 'const renderDailyDealsTab = () => {', '      const renderFighterDealTab = () => {');
const fighterTab = sliceBetween(game, 'const renderFighterDealTab = () => {', '      // [Worker C] Overdrive milestone shop:');
const featuredTab = sliceBetween(game, 'const renderFeaturedTab = () => {', '      const renderSkinsTab = () => {');
const exchangeTab = sliceBetween(game, 'const renderExchangeTab = () => {', '      const renderDailyDealsTab = () => {');
const overdriveTab = sliceBetween(game, 'const renderOverdriveTab = () => {', '      const renderTabContent = () => {');
const wheelTab = sliceBetween(game, 'const renderWheelTab = () => {', '      const renderDailyDealsTab = () => {');
const countCards = (slice) => (slice.match(/makeShopCard\(\{/g) || []).length;

// ================= 1. MATCH-INTRO PHONE RESTYLE =================
check('intro builds a touch-only mode/map header', introFn.includes("head.className = 'match-intro__head'") && introFn.includes("modeEl.className = 'match-intro__mode'") && introFn.includes("mapEl.className = 'match-intro__map'"));
check('intro header uses the real mode label', introFn.includes('getShowdownModeLabel(showdownMode)'));
check('intro header reuses the Events-slot map names', introFn.includes('appEventMapName(showdownMode)'));
check('intro header is gated on touch mode', introFn.includes('if (mobileInput.enabled) {') && introFn.indexOf("match-intro__head") > introFn.indexOf('if (mobileInput.enabled) {'));
check('intro omits the map line when a mode has no named map', introFn.includes('if (introMapName) {'));
check('intro header can never block match start', introFn.includes("} catch (_) { /* header is presentational; never block match start */ }"));
check('intro modifier row splits name and description', introFn.includes("modName.className = 'match-intro__modifier-name'") && introFn.includes("modDesc.className = 'match-intro__modifier-desc'") && introFn.includes('modRow.append(modName, modDesc)'));
check('intro modifier no longer runs name + description on one line', !introFn.includes("${introModDef.label || introModDef.name}: ${introModDef.description}"));
check('intro modifier row is still touch-only', introFn.includes("if (mobileInput.enabled && activeShowdownModifier && !isShowdownModifierActive('none')) {"));
check('buildMatchCard wraps name/title/fighter in a body div', matchCardFn.includes('<div class="match-card__body">') && matchCardFn.includes('</div>') && matchCardFn.includes("match-card__name") && matchCardFn.includes("match-card__fighter"));
check('intro still auto-dismisses after 2800ms', introFn.includes('}, 2800);'));
check('intro still caps shown opponents at 9', introFn.includes('roster.enemies.slice(0, 9)'));
check('app CSS: intro scrolls with safe-area padding', game.includes('.native-app .match-intro{justify-content:flex-start !important;overflow-y:auto !important;padding:max(12px,env(safe-area-inset-top))'));
check('app CSS: intro mode 24px, map 15px', game.includes('.native-app .match-intro__mode{font-size:24px') && game.includes('.native-app .match-intro__map{font-size:15px'));
check('app CSS: modifier name 15px, description 13px, left-aligned', game.includes('.native-app .match-intro__modifier-name{font-size:15px') && game.includes('.native-app .match-intro__modifier-desc{font-size:13px'));
check('app CSS: intro rows are full-width columns (max 520px)', game.includes('.native-app .match-intro__row{flex-direction:column !important;flex-wrap:nowrap !important;align-items:stretch !important;width:100%;max-width:520px'));
check('app CSS: intro cards are full-width horizontal rows', game.includes('.native-app .match-card{display:flex !important;align-items:center;gap:10px;width:100% !important;max-width:520px'));
check('app CSS: intro portrait is 44px, tag pinned right', game.includes('.native-app .match-card__portrait{width:44px !important;height:44px !important') && game.includes('.native-app .match-card__tag{margin-top:0 !important;flex:none}'));
check('app CSS: intro rows go two-across in landscape', game.includes("@media (orientation:landscape){.native-app .match-intro__row{display:grid !important;grid-template-columns:1fr 1fr}"));
check('desktop intro CSS untouched in styles.css', styles.includes('.match-card{width:132px') && styles.includes('.match-card.is-player{width:160px') && styles.includes('.match-intro__modifier{max-width:min(560px,92vw);font-size:14px'));

// Behavior mirror: appEventMapName (extracted, run with stubs).
const mapNameFnSrc = extractBraced(game, game.indexOf('function appEventMapName(id) {'));
check('appEventMapName extracts cleanly', !!mapNameFnSrc);
if (mapNameFnSrc) {
    const factory = new Function('getActiveShowdownTheme', 'TOURNAMENT_MAP_NAME', `${mapNameFnSrc}\nreturn appEventMapName;`);
    const mapName = factory(() => ({ name: 'Test Map' }), 'Tourney Map');
    check('map mirror: showdown-family falls back to the rotating theme', mapName('solo') === 'Test Map' && mapName('duo') === 'Test Map');
    // Round 2 small fixes (PR #158, merged before this rebase) gave
    // duels / tower duels / fused the shared "Duels Arena" label, so the
    // old "no map line" pin below is updated, not weakened: the label is
    // asserted here now, and friendly (custom_clash) still has none.
    check('map mirror: duels is Duels Arena, friendly has no map line', mapName('duels') === 'Duels Arena' && mapName('custom_clash') === null);
    check('map mirror: mirror / vault / arena-forge use their named arenas', mapName('mirror') === 'Mirror Arena' && mapName('brick_vault') === 'Vault Siege Arena' && mapName('arena_forge') === 'Three-Lane Foundry');
}
// Behavior mirror: every modifier def has a description to show (except none).
const modDefsSrc = extractBraced(game, game.indexOf('const SHOWDOWN_MODIFIER_DEFS = {'));
check('modifier defs extract cleanly', !!modDefsSrc);
if (modDefsSrc) {
    const defs = new Function(`${modDefsSrc}\nreturn SHOWDOWN_MODIFIER_DEFS;`)();
    const entries = Object.entries(defs).filter(([id]) => id !== 'none');
    check('every live modifier def carries a non-empty description', entries.length >= 1 && entries.every(([, d]) => typeof d.description === 'string' && d.description.length > 0 && typeof d.label === 'string' && d.label.length > 0));
    check('modifier defs include icon + label for the intro name line', entries.every(([, d]) => typeof d.icon === 'string' && d.icon.length > 0));
}

// ================= 2a. PROFILE EDITOR PHONE LAYOUT =================
check('app CSS: editor overlay is full-bleed (no padding, block)', game.includes('.native-app .profile-edit-overlay{padding:0 !important;display:block !important}'));
check('app CSS: editor panel is 100vw x 100dvh with safe-area padding', game.includes('.native-app .profile-edit-panel{width:100vw !important;max-width:none !important;height:100dvh !important;max-height:none !important;border-radius:0 !important;border:0 !important;box-shadow:none !important;padding:max(16px,env(safe-area-inset-top))'));
check('app CSS: editor fields clear 44px at 16px (no focus zoom)', game.includes('.native-app .profile-edit-panel>input,.native-app .profile-edit-panel select{min-height:44px !important;font-size:16px !important}'));
check('app CSS: editor labels stack above their fields', game.includes('.native-app .profile-edit-panel label{grid-template-columns:1fr !important;gap:4px !important}'));
check('app CSS: editor actions are full-width 48px buttons', game.includes('.native-app .profile-edit-actions button{flex:1 !important;min-height:48px !important;padding:12px !important;font-size:15px !important}'));
check('editor still edits the same fields (no new fields invented)', profileEditorFn.includes("addSelect(`Favorite #${i+1}`") && profileEditorFn.includes("addSelect('Title'") && profileEditorFn.includes("addSelect('Frame'") && profileEditorFn.includes("addSelect('Background'") && profileEditorFn.includes("addSelect(`Badge #${i+1}`") && profileEditorFn.includes('name.maxLength=20'));
check('editor still saves the same draft shape', profileEditorFn.includes('draft.playerName=name.value.trim().slice(0,20)') && profileEditorFn.includes('Object.assign(profile,draft);saveProgress();'));
check('editor is still opened from the profile career screen', game.includes('openProfileEditor(()=>renderProfileCareer(container))'));

// ================= 2b. RANKED QUEUE PHONE LAYOUT =================
const rankedClasses = ['ranked-queue-overlay', 'ranked-queue-panel', 'ranked-queue-top', 'ranked-queue-title', 'ranked-queue-meta', 'ranked-queue-top-actions', 'ranked-queue-close-btn', 'ranked-queue-banner', 'ranked-queue-lineup', 'ranked-queue-stepper', 'ranked-queue-status', 'ranked-queue-arena', 'ranked-queue-col-blue', 'ranked-queue-col-center', 'ranked-queue-col-red', 'ranked-queue-ladder-title', 'ranked-queue-ladder', 'ranked-queue-actions', 'ranked-queue-ff-btn', 'ranked-queue-queue-btn', 'ranked-queue-search', 'ranked-queue-grid', 'ranked-queue-controls', 'ranked-queue-team-card', 'ranked-queue-pick-card'];
check('ranked queue sets every phone-layout hook class', rankedClasses.every((c) => rankedFn.includes(c)));
check('app CSS: ranked panel goes full-bleed under 760px', game.includes('@media (max-width:760px){') && game.includes('.native-app .ranked-queue-panel{width:100vw !important;max-width:none !important;height:100dvh !important;max-height:none !important;border-radius:0 !important;border:0 !important'));
check('app CSS: ranked top bar stacks with 44px action buttons', game.includes('.native-app .ranked-queue-top{flex-direction:column !important;align-items:stretch !important}') && game.includes('.native-app .ranked-queue-top-actions button{flex:1 !important;min-height:44px !important'));
check('app CSS: ranked draft stacks picker-first (one scroller)', game.includes('.native-app .ranked-queue-arena{grid-template-columns:1fr !important}') && game.includes('.native-app .ranked-queue-col-center{order:1 !important}') && game.includes('.native-app .ranked-queue-col-blue{order:2 !important}') && game.includes('.native-app .ranked-queue-col-red{order:3 !important}'));
check('app CSS: ranked picker grid drops its nested scroller', game.includes('.native-app .ranked-queue-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr)) !important;max-height:none !important;overflow-y:visible !important}'));
check('app CSS: ranked pick cards clear 48px, search 44px at 16px', game.includes('.native-app .ranked-queue-pick-card{min-height:48px !important') && game.includes('.native-app .ranked-queue-search{min-height:44px !important;font-size:16px !important'));
check('app CSS: ranked lock-in buttons clear 44px, launch bar 48px full-width', game.includes('.native-app .ranked-queue-controls button{min-height:44px !important') && game.includes('.native-app .ranked-queue-actions button{min-height:48px !important;width:100% !important}'));
check('ranked desktop inline layout untouched (1100px panel, 230px draft grid)', rankedFn.includes("panel.style.width = 'min(1100px, calc(100vw - 24px))'") && rankedFn.includes("arena.style.gridTemplateColumns = '230px 1fr 230px'") && rankedFn.includes("gridBox.style.maxHeight = '275px'"));
check('ranked draft logic (4-ban schedule, states, launch — rebuild stage 6)', rankedFn.includes('draftState = \'ban\'') && rankedFn.includes('draftState = \'ready\'') && (rankedFn.match(/\{ step: \d,/g) || []).length === 4 && rankedFn.includes('queueBtn.onclick = () => {') && rankedFn.includes('launchShowdownMatch();'));
check('ranked queue overlay z-index and close path untouched', rankedFn.includes("overlay.style.zIndex = '2200'") && rankedFn.includes('if (aiTurnTimer) clearTimeout(aiTurnTimer);'));

// ================= 3. SHOP EMPTY STATES =================
check('shared empty-state builder exists (icon + line + action)', game.includes('const makeShopEmptyState = ({ icon, titleText, bodyText, actionLabel, onAction }) => {') && game.includes("empty.className = 'brawe-shop-empty'") && game.includes("empty.style.gridColumn = '1 / -1'"));
check('empty-state action button clears 44px', game.includes("btn.style.minHeight = '44px'") && game.slice(game.indexOf('const makeShopEmptyState'), game.indexOf('const makeShopEmptyState') + 2600).includes("btn.style.background = '#5df2c2'"));
check('skins tab shows an empty state when its filter list is empty', skinsTab.includes('if (!skinList.length) {') && skinsTab.includes('grid.appendChild(makeShopEmptyState({'));
check('skins empty copy covers owned / locked / buyable / all', skinsTab.includes("owned: { titleText: 'No skins owned yet'") && skinsTab.includes("locked: { titleText: 'No locked fighters'") && skinsTab.includes("buyable: { titleText: 'Nothing left to buy'") && skinsTab.includes("all: { titleText: 'No skins in the catalogue'"));
check('skins empty action resets the filters to the full catalogue', skinsTab.includes("actionLabel: shopSkinOwnership === 'all' ? 'BACK TO DAILY DEALS' : 'BROWSE ALL SKINS'") && skinsTab.includes("shopSkinOwnership = 'all';") && skinsTab.includes("shopSkinQuery = '';"));
check('skins empty action for the all-view goes back to Daily Deals via the sidebar', skinsTab.includes("sidebar.querySelector('[data-tab-id=\"daily\"]')") && skinsTab.includes('dailyBtn.click()'));
check('search no-match has its own hidden empty state', skinsTab.includes("searchEmpty.setAttribute('data-shop-search-empty', '1')") && skinsTab.includes("titleText: 'No skins match that search'") && skinsTab.includes("actionLabel: 'CLEAR SEARCH'"));
check('search handler toggles the no-match state (not the filter state)', skinsTab.includes("const noMatch = wrap.querySelector('[data-shop-search-empty]');") && skinsTab.includes("noMatch.style.display = (q && visible === 0 && totalCards > 0) ? '' : 'none'"));
check('clear-search restores every card and the count', skinsTab.includes("wrap.querySelectorAll('[data-skin-card]').forEach(card => { card.style.display = ''; });") && skinsTab.includes("count.textContent = `${skinList.length} skins`"));
check('skins filter predicates are intact (owned / buyable / locked / all)', skinsTab.includes("if (shopSkinOwnership === 'owned') return owned;") && skinsTab.includes("if (shopSkinOwnership === 'buyable') return !owned && !locked;") && skinsTab.includes("if (shopSkinOwnership === 'locked') return locked;"));
// Behavior mirror: run the real skins filter predicate against fixtures.
const filterSrc = extractBraced(game, game.indexOf('Object.values(skinsDatabase).filter(skin => {'));
check('skins filter predicate extracts cleanly', !!filterSrc && filterSrc.startsWith('Object.values(skinsDatabase).filter(skin => {'));
if (filterSrc) {
    const runFilter = (ownership, ownedSkins, unlocked) => {
        const skinsDatabase = { a: { id: 'a', brawler: 'x' }, b: { id: 'b', brawler: 'y' }, c: { id: 'c', brawler: 'z' } };
        const playerData = { ownedSkins, unlockedBrawlers: unlocked };
        return new Function('skinsDatabase', 'playerData', 'shopSkinOwnership', `return ${filterSrc});`)(skinsDatabase, playerData, ownership);
    };
    check('filter mirror: owned is empty when nothing is owned', runFilter('owned', {}, { x: true, y: true, z: true }).length === 0);
    check('filter mirror: locked is empty when every fighter is unlocked', runFilter('locked', {}, { x: true, y: true, z: true }).length === 0);
    check('filter mirror: buyable is empty when everything is owned', runFilter('buyable', { x: ['a'], y: ['b'], z: ['c'] }, { x: true, y: true, z: true }).length === 0);
    check('filter mirror: all still lists the full catalogue', runFilter('all', {}, { x: true }).length === 3);
    check('filter mirror: owned lists only owned skins', runFilter('owned', { y: ['b'] }, { x: true, y: true, z: true }).map((s) => s.id).join(',') === 'b');
    check('filter mirror: locked lists only locked-fighter skins', runFilter('locked', {}, { x: true, y: false, z: true }).map((s) => s.id).join(',') === 'b');
}
// Never-empty tabs: fixed cards / fixed tiers / fixed wheel segments.
check('daily tab can never be empty (5 fixed cards + stipend fallback)', countCards(dailyTab) >= 6 && dailyTab.includes("titleText: '🔰 Forge Stipend'"));
check('fighter tab can never be empty (upgrade + loadout fund are fixed)', countCards(fighterTab) >= 2 && fighterTab.includes('Loadout Fund'));
check('featured tab can never be empty (5 fixed cards)', countCards(featuredTab) >= 5 && featuredTab.includes("titleText: '🎁 Daily Freebie'") && featuredTab.includes('Tapper Mega Bundle'));
check('wheel tab can never be empty (fixed 8-segment wheel + spin button)', (wheelTab.match(/\{ text: '/g) || []).length === 8 && wheelTab.includes("spinBtn.textContent = 'SPIN WHEEL (🪙 100)'"));
check('only the skins tab renders through a filterable list', !dailyTab.includes('shopSkinOwnership') && !fighterTab.includes('shopSkinOwnership') && !featuredTab.includes('shopSkinOwnership') && !exchangeTab.includes('shopSkinOwnership') && !overdriveTab.includes('shopSkinOwnership') && !wheelTab.includes('shopSkinOwnership'));

// --- Scope guards ---
check('diag gate untouched (?diag=1)', game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save-code modal untouched', game.includes("document.getElementById('saveCodeModal')") && game.includes("modal.id = 'saveCodeModal'"));
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-tier2-ui`);
