// Arena Forge app Fighters round 2 (2026-11-19): screenshot diagnosis
// fixes + favorites / sort / skin selector.
//
// Screenshot (~/workspace/user/files/11357_18_xsfe.png, 2026-11-19 10:48)
// diagnosis, verified against the code on main 35098e4a:
// (a) detail showed Electrostien while Rocketeer was highlighted — the tap
//     path on main renders strip+detail from the same `focused`, so the
//     split itself is not reproducible; the remaining hazard is the
//     handler rendering the strip FIRST, so a detail throw leaves the
//     strip on the new brawler and the panel on the old one. Fixed:
//     detail renders first, the render is wrapped so a failure shows an
//     error state instead of stale content, and the panel stamps which
//     brawler it rendered (data-rendered-for).
// (b) CORE SURGE cut off mid-sentence — pre-round-1 slice(0, 90), proven
//     by an exact match (node: slice(0,90) of Electrostien's hyper is
//     character-for-character the screenshot text). Round 1 removed the
//     slice; round 2 also exempts the Core Surge slot from the F9
//     3-line clamp, so the full desc is ALWAYS visible in the slot.
// (c) kit text was one run-on paragraph — pre-round-1 comma-expression
//     bug (`kitSlotHtml(...), kitDesc(...)` threw the buttons away and
//     rendered the four bare descs; verified verbatim against
//     Electrostien's g1/g2/sp1/sp2). Round 1 fixed the slots; round 2
//     also gives MAIN / SUPER their descriptions (attackDesc/superDesc),
//     so every slot is a labeled line.
// (d) portrait stretched into a tall oval — the container relied on
//     aspect-ratio alone inside a row flex (stretch can win in a
//     WebView). Now it has an explicit square height + align-self:center.
// (e) no toolbar / stats / slots in the shot — all three exist in code on
//     main (toolbar, stats row, 5 kit slots, kit sheet); the shot is a
//     pre-round-1 install. Round 2 pins that the four Tool/Talent slots
//     render (locked or not) in both orientations.
// (f) 0 currency + nearly all LOCKED is NOT a code bug: the currency bar
//     reads playerData (0 on a fresh install) and the default unlocks are
//     exactly outlit/fuser/rocketeer/carmela_fudge/rager/bolznstien/
//     electrostien/magnatar/oil_maker (ensurePlayerDataDefaults) — the
//     shot matches a fresh install whose save was never re-imported.
//     No fix invented; the whitelist / diag gate / save-code modal are
//     pinned untouched below.
//
// New in round 2: favorites (star on a card, FAVORITE button in the
// detail panel; the existing localStorage-backed favoriteBrawlers set),
// sort (favorites / name / power / rarity / owned-first; favorites
// always sort first), and a skin selector in the detail panel (only
// skins that exist in skinsDatabase AND are owned; equip via the
// existing playerData.selectedSkins path the shop uses).
//
// Layout/UX only: no mechanics, numbers, or core-kit changes; website
// untouched; save whitelist NOT widened; diag gate + save-code modal
// untouched; no banned disabled-brawler word anywhere.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
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

// --- (a) detail/strip desync hardening (static) ---
const stripHandlerAt = game.indexOf("view.querySelector('#appFightersStrip')?.addEventListener('click'");
const stripHandler = stripHandlerAt === -1 ? '' : game.slice(stripHandlerAt, stripHandlerAt + 1600);
check('(a) strip tap opens the fighter full screen (fixes round: no inline detail, no highlight-ahead-of-panel)',
    stripHandler.includes('openAppFighterPage(appFightersState.focused);') &&
    stripHandler.includes('renderAppFightersStrip();') &&
    !stripHandler.includes('renderAppFightersDetail();'));
check('(a) detail render is wrapped: a failure renders an error state, never stale content',
    game.includes('Could not show this fighter — go back and pick another fighter.') &&
    game.includes('function renderAppFightersDetailFor(id) {'));
check('(a) detail stamps which brawler it rendered (data-rendered-for)',
    game.includes('if (detail.dataset) detail.dataset.renderedFor = id;'));

// --- (b) Core Surge full desc, never clamped (static) ---
check('(b) Core Surge slot desc is exempt from the 3-line clamp (always fully visible)',
    game.includes('.app-kit-slot[data-app-kit="hyper"] .app-kit-desc{display:block;-webkit-line-clamp:unset;overflow:visible}'));
check('(b) no 90-char slice on the Core Surge description anywhere',
    !game.includes("(getCoreSurgeDescription(id) || '').slice(0, 90)"));

// --- (c) labeled kit text (static) ---
check('(c) MAIN line shows the name AND its description (attackDesc)',
    game.includes('<b>MAIN</b> · ${data.main || \'—\'}${data.attackDesc ? ` — ${data.attackDesc}` : \'\'}'));
check('(c) SUPER line shows the name AND its description (superDesc)',
    game.includes('<b>SUPER</b> · ${data.super || \'—\'}${data.superDesc ? ` — ${data.superDesc}` : \'\'}'));

// --- (d) portrait keeps aspect ratio (static) ---
check('(d) detail portrait has an explicit square height + align-self:center (not aspect-ratio alone)',
    game.includes('.app-fighters-detail-portrait{flex:none;width:min(26vh,150px);height:min(26vh,150px);aspect-ratio:1;align-self:center;'));
check('(d) portrait media query also pins the height (portrait orientation)',
    game.includes('.app-fighters-detail-portrait{width:min(34vw,120px);height:min(34vw,120px)}'));

// --- (e) toolbar / stats / slots exist and the detail is one scroller (static) ---
check('(e) Fighters toolbar (search + icon buttons + counter) is built',
    game.includes('<div class="app-fighters-toolbar">') && game.includes('id="appFightersSearch"') && game.includes('id="appFightersFavToggle"') && game.includes('id="appFightersCount"'));
check('(e) detail is one scroller on its own full screen (no nested starved panel in landscape)',
    game.includes('#appFighterDetail{flex:none;overflow-y:visible}'));
check('(e) kit slot tap still opens the kit sheet (phase-4 behavior, byte-identical)',
    game.includes("if (kitBtn) { openAppKitSheet(appFightersState.focused, kitBtn.dataset.appKit); return; }"));

// --- (f) 0 currency / LOCKED is the fresh-install state, not a wipe (static) ---
check('(f) currency pills read playerData (0 on a fresh install with no imported save)',
    game.includes('const coins = Math.floor(playerData?.coins || 0).toLocaleString();') &&
    game.includes('const gems = Math.floor(playerData?.gems || 0).toLocaleString();') &&
    game.includes('const souls = Math.floor(playerData?.souls || 0).toLocaleString();'));
check('(f) no save wipe exists: the only localStorage removals are help + fullscreen prefs',
    !game.includes('localStorage.clear') &&
    (game.match(/localStorage\.removeItem/g) || []).length === 2 &&
    game.includes("localStorage.removeItem('arenaForgeHelpHiddenV1')") &&
    game.includes('localStorage.removeItem(FULLSCREEN_PREF_KEY)'));

// --- Favorites / sort / skins (static) ---
check('fav: star toggle on the strip card (data-app-favorite, checked before the card tap)',
    game.includes('data-app-favorite="${id}"') &&
    stripHandler.includes("event.target.closest('[data-app-favorite]')") &&
    stripHandler.includes('toggleAppFighterFavorite(favBtn.dataset.appFavorite)'));
check('fav: detail panel has a FAVORITE toggle button',
    game.includes('data-app-action="favorite"') && game.includes('★ FAVORITED') && game.includes('☆ FAVORITE'));
check('fav: toggle uses the existing localStorage-backed set (no new storage)',
    game.includes('function toggleAppFighterFavorite(id) {') &&
    game.includes('setFavoriteBrawler(id, !isFavoriteBrawler(id));') &&
    game.includes("const favoriteBrawlersKey = 'brawl_arena_favorites';"));
check('sort: sort select lives in the filter sheet with all five modes (fixes round)',
    game.includes('id="appFilterSort"') &&
    game.includes("APP_FIGHTERS_SORTS.map((s) => opt(s,") &&
    game.includes('Favorites first') && game.includes('Name A–Z') &&
    game.includes('Power (high first)') && game.includes('Rarity (high first)') &&
    game.includes('Owned first') && !game.includes('<select id="appFightersSort"'));
check('sort: favorites always sort first, then the chosen mode',
    game.includes("const fa = isFavoriteBrawler(a) ? 0 : 1;") &&
    game.includes('if (fa !== fb) return fa - fb;'));
check('sort: class sort (role, then name) is still the default order with no favorites',
    game.includes('// Brawl Stars default: class sort — group by role, then name.') &&
    game.includes('if (ra !== rb) return ra.localeCompare(rb);'));
check('sort: rarity uses the canonical rank helper, power uses live progress, owned uses isBrawlerUnlocked',
    game.includes('getBrawlerRarityRank(a)') && game.includes('getEffectiveBrawlerProgress(a).level || 1') &&
    game.includes('isBrawlerUnlocked(a) ? 0 : 1'));
check('skins: selector lists only owned skins for this brawler, plus DEFAULT',
    game.includes('function appFighterOwnedSkins(id) {') &&
    game.includes('data-app-skin="default">DEFAULT</button>') &&
    game.includes('data-app-skin="${skin.id}"'));
check('skins: the deleted skins are gone; the Holiday Lights skin is the first skin in the new system (rebuild stage 3-4)',
    !game.includes("'molten-rock-chaird'") && !game.includes("'xploder-rocketeer'") &&
    game.includes("'holiday-lights-freezeon'") && game.includes('skinsDatabase'));
check('skins: equip uses the existing selectedSkins path the shop uses; unowned/foreign refused',
    game.includes('function appFightersSkinPick(id, skinId) {') &&
    game.includes('playerData.selectedSkins[id] = skinId;') &&
    game.includes("if (!Array.isArray(owned) || !owned.includes(skinId)) return;") &&
    game.includes("if (!skin || skin.brawler !== id) return;"));
check('skins: DEFAULT clears every equip map for the brawler',
    game.includes("if (playerData.selectedSkins) delete playerData.selectedSkins[id];") &&
    game.includes("if (playerData.activeSkins) delete playerData.activeSkins[id];") &&
    game.includes("if (playerData.equippedSkins) delete playerData.equippedSkins[id];"));

// --- Runtime: really render strip + detail, really sort/favorite/equip ---
const CORE_SURGE_FULL = 'When Core Surge is ready, the next Super erupts into a storm of blades that chase every enemy on the field for massive damage and keep chasing until the Surge ends.';
const skinDB = {
    'tree-freeze-freezeon': { id: 'tree-freeze-freezeon', name: 'Tree Freeze', brawler: 'freezeon', icon: '🎄' },
    'molten-rock-chaird': { id: 'molten-rock-chaird', name: 'Molten Rock Chaird', brawler: 'chaird', icon: '🪨' },
    'xploder-rocketeer': { id: 'xploder-rocketeer', name: 'Xploder', brawler: 'rocketeer', icon: '🚀' },
    'frostbite-feathers': { id: 'frostbite-feathers', name: 'Frostbite', brawler: 'feathers', icon: '❄️' },
};
const lsStore = new Map();
const elements = {};
const newEl = () => ({ innerHTML: '', textContent: '', dataset: {} });
const documentStub = { getElementById: (id) => (elements[id] ||= newEl()) };
const unlockedSet = new Set(['alpha', 'beta', 'mallow', 'freezeon', 'chaird', 'rocketeer']);
let saveCalls = 0, syncCalls = 0;
const sandbox = {
    document: documentStub,
    localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => { lsStore.set(k, String(v)); },
        removeItem: (k) => { lsStore.delete(k); },
    },
    skinsDatabase: skinDB,
    allBrawlers: ['zeta', 'alpha', 'beta', 'mallow', 'solo', 'freezeon', 'chaird', 'rocketeer', 'feathers'],
    brawlerData: {
        zeta: { name: 'Zeta', emoji: '⚡', color: '#888', role: 'Tank', main: 'Zap', attackDesc: 'Zaps for 100.', super: 'Big Zap', superDesc: 'Zaps everyone.', g1: 'Gadget Z1 (zaps once)', g2: 'Gadget Z2 (zaps twice)', sp1: 'Star Z1 (zap lasts)', sp2: 'Star Z2 (zap spreads)' },
        alpha: { name: 'Alpha', emoji: '🔥', color: '#f00', role: 'Damage Dealer', main: 'Punch', attackDesc: 'Punches for 200.', super: 'Mega Punch', superDesc: 'Punches everyone.', g1: 'Gadget A1 (punch twice)', g2: 'Gadget A2 (punch thrice)', sp1: 'Star A1 (punch burns)', sp2: 'Star A2 (punch freezes)' },
        beta: { name: 'Beta', emoji: '💧', color: '#00f', role: 'Damage Dealer', main: 'Splash', attackDesc: 'Splashes for 150.', super: 'Wave', superDesc: 'Waves everyone.', g1: 'Gadget B1 (splash more)', g2: 'Gadget B2 (splash less)', sp1: 'Star B1 (splash slows)', sp2: 'Star B2 (splash heals)' },
        mallow: { name: 'Mallow', emoji: '🍬', color: '#f8f', role: 'Controller', main: 'Toss', attackDesc: 'Tosses for 120.', super: 'Rain', superDesc: 'Rains candy.', g1: 'Gadget M1 (toss twice)', g2: 'Gadget M2 (toss thrice)', sp1: 'Star M1 (toss sticks)', sp2: 'Star M2 (toss bounces)' },
        solo: { name: 'Solo', emoji: '⭐', color: '#8cf05a', role: 'Damage Dealer', main: 'Solo main', attackDesc: 'Solos for 300.', super: 'Solo super', superDesc: 'Solos everyone.', g1: 'Only Gadget (the only one)', sp1: 'Only Star (the only one)' },
        freezeon: { name: 'FreeZeon', emoji: '🍦', color: '#8df', role: 'Controller', main: 'Snow Cone', attackDesc: 'Throws snow cones.', super: 'Ice Rink', superDesc: 'Lobs a freezing rink.', g1: 'Cryo Syrup (sticky cones)', g2: 'Extra Scoop (one more cone)', sp1: 'Supercool (rink shoots snowballs)', sp2: 'Hypothermia (slip zones freeze)' },
        chaird: { name: 'Chaird', emoji: '🪑', color: '#a80', role: 'Tank', main: 'Chair Slam', attackDesc: 'Slams a chair.', super: 'Rock Chair', superDesc: 'Becomes a rocking chair.', g1: 'Gadget C1 (slam twice)', g2: 'Gadget C2 (slam thrice)', sp1: 'Star C1 (slam burns)', sp2: 'Star C2 (slam stuns)' },
        rocketeer: { name: 'Rocketeer', emoji: '🚀', color: '#f60', role: 'Artillery', main: 'Breakup Rocket', attackDesc: 'Fires a splitting rocket.', super: 'Triple Impact', superDesc: 'Three rockets fall.', g1: 'Split Override (split into 5)', g2: 'Emergency Ignition (blast away)', sp1: 'Scorched Launch (fire zone)', sp2: 'Gravity Warheads (pull in)' },
        feathers: { name: 'Feathers', emoji: '🪶', color: '#adf', role: 'Controller', main: 'Peck', attackDesc: 'Pecks lightly.', super: 'Molt', superDesc: 'Sheds feathers.', g1: 'Gadget F1 (peck twice)', g2: 'Gadget F2 (peck thrice)', sp1: 'Star F1 (peck slows)', sp2: 'Star F2 (peck heals)' },
    },
    brawlerRarities: { zeta: 'Rare', alpha: 'Epic', beta: 'Starter', mallow: 'Mythic', solo: 'Anomaly', freezeon: 'Epic', chaird: 'Rare', rocketeer: 'Starter', feathers: 'Rare' },
    SOUL_UNLOCK_COST_BY_RARITY: { Starter: 0, Rare: 70, Epic: 170, Mythic: 270, Exotic: 420, Unique: 600, Anomaly: 850 },
    playerData: {
        coins: 100000,
        selectedSkins: {},
        // 'solo' deliberately holds the stale non-array shape (a bare
        // `true` from an old reward grant): the selector must not crash
        // on it and must never treat it as owning every skin.
        ownedSkins: { freezeon: ['tree-freeze-freezeon'], chaird: ['molten-rock-chaird'], rocketeer: [], solo: true, feathers: [] },
        brawlers: {
            zeta: { level: 1 },
            alpha: { level: 12, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedGadget: 'g1', selectedStar: 'slow' },
            beta: { level: 5, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false, selectedGadget: 'g2', selectedStar: 'long' },
            mallow: { level: 9, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: false, selectedGadget: 'g1', selectedStar: 'slow' },
            solo: { level: 3 },
            freezeon: { level: 11, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedGadget: 'g1', selectedStar: 'slow' },
            chaird: { level: 7, gadgetUnlocked: true, starPowerUnlocked: false, hyperchargeUnlocked: false, selectedGadget: 'g1' },
            rocketeer: { level: 1 },
            feathers: { level: 4 },
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
    getCoreSurgeDescription: () => CORE_SURGE_FULL,
    getActiveSkinForBrawler: (id) => { const sid = sandbox.playerData.selectedSkins && sandbox.playerData.selectedSkins[id]; return sid ? skinDB[sid] || null : null; },
    getUpgradeCost: () => 100,
    getCorePieceUpgradeCost: () => 0,
    getCorePieces: () => 999,
    spendCorePieces: () => {},
    ensureHyperchargeDiscount: () => {},
    saveProgress: () => { saveCalls++; },
    syncAppHome: () => { syncCalls++; },
};
vm.createContext(sandbox);
const run = (code) => vm.runInContext(code, sandbox);
try {
    // Real safeJsonParse + the real favorites set/functions.
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
    run(sliceBetween('    function toggleAppFighterFavorite(id) {', '    // Owned skins for one brawler'));
    run(sliceBetween('    function appFighterOwnedSkins(id) {', '    // Equip via the existing skin-equip path'));
    run(sliceBetween('    function appFightersSkinPick(id, skinId) {', '    // Round 2 (screenshot item a)'));
    run(sliceBetween('    function playableBrawlerIds() {', '    // Emergency balance hold:'));
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    run(sliceBetween('    function renderAppFightersDetail() {', '    function appFightersKitPick(id, key) {'));
    check('runtime: all Fighters functions extracted and evaluated', true);
} catch (err) {
    check('runtime: all Fighters functions extracted and evaluated (' + err.message + ')', false);
}
check('runtime fixture: Core Surge text is over 90 chars (so the old slice would have cut it)',
    CORE_SURGE_FULL.length > 90);

const stripOrder = () => [...(elements.appFightersStrip.innerHTML.matchAll(/data-app-fighter="([^"]+)"/g))].map((m) => m[1]).join(',');
run(`appFightersState.sort = 'favorites'; appFightersState.search = ''; appFightersState.role = 'all'; renderAppFightersStrip();`);
check('runtime sort: default (favorites, none set) is the old class sort (role, then name)',
    stripOrder() === 'rocketeer,feathers,freezeon,mallow,alpha,beta,solo,chaird,zeta');
run(`appFightersState.sort = 'name'; renderAppFightersStrip();`);
check('runtime sort: name A–Z',
    stripOrder() === 'alpha,beta,chaird,feathers,freezeon,mallow,rocketeer,solo,zeta');
run(`appFightersState.sort = 'power'; renderAppFightersStrip();`);
check('runtime sort: power high→low, ties by name',
    stripOrder() === 'alpha,freezeon,mallow,chaird,beta,feathers,solo,rocketeer,zeta');
run(`appFightersState.sort = 'rarity'; renderAppFightersStrip();`);
check('runtime sort: rarity rarest first, ties by name',
    stripOrder() === 'solo,mallow,alpha,freezeon,chaird,feathers,zeta,beta,rocketeer');
run(`appFightersState.sort = 'owned'; renderAppFightersStrip();`);
check('runtime sort: owned first, then class sort inside each group',
    stripOrder() === 'rocketeer,freezeon,mallow,alpha,beta,chaird,feathers,solo,zeta');
run(`appFightersState.sort = 'favorites'; renderAppFightersStrip();`);

// Detail render: labels, descs, slots, Core Surge, renderedFor.
run(`appFightersState.focused = 'alpha'; renderAppFightersDetail();`);
const alphaDetail = elements.appFighterDetail.innerHTML;
check('runtime (c): MAIN line has the name AND the attack description',
    alphaDetail.includes('<b>MAIN</b> · Punch — Punches for 200.'));
check('runtime (c): SUPER line has the name AND the super description',
    alphaDetail.includes('<b>SUPER</b> · Mega Punch — Punches everyone.'));
check('runtime (e): all four Tool/Talent slots render (tappable buttons, kit sheet path)',
    ['g1', 'g2', 'sp1', 'sp2'].every((k) => alphaDetail.includes(`data-app-kit="${k}"`)));
check('runtime (e): Core Surge slot renders with the FULL description (never clamped text)',
    alphaDetail.includes(CORE_SURGE_FULL) && alphaDetail.includes('data-app-kit="hyper"'));
check('runtime (a): detail stamps renderedFor for the focused brawler',
    elements.appFighterDetail.dataset.renderedFor === 'alpha');
check('runtime fav: detail shows ☆ FAVORITE for a non-favorite',
    alphaDetail.includes('☆ FAVORITE'));

// Detail render: Power-1 brawler with nothing unlocked — slots still render, locked.
run(`appFightersState.focused = 'rocketeer'; renderAppFightersDetail();`);
const rocketDetail = elements.appFighterDetail.innerHTML;
check('runtime (e): Power-1 brawler still renders all four Tool/Talent slots (locked, tappable to the sheet)',
    ['g1', 'g2', 'sp1', 'sp2'].every((k) => rocketDetail.includes(`data-app-kit="${k}"`)) &&
    rocketDetail.includes('LOCKED · POWER 7') && rocketDetail.includes('LOCKED · POWER 9'));

// (a) error state: if the detail cannot render, it says so instead of showing the old brawler.
const realStats = sandbox.getScaledStats;
run(`appFightersState.focused = 'alpha'; renderAppFightersDetail();`);
check('runtime (a) setup: detail shows Alpha before the failing render',
    elements.appFighterDetail.innerHTML.includes('Alpha') && elements.appFighterDetail.dataset.renderedFor === 'alpha');
sandbox.getScaledStats = () => { throw new Error('boom'); };
run(`appFightersState.focused = 'mallow'; renderAppFightersDetail();`);
check('runtime (a): a failing detail render shows the error state, NOT the previous brawler',
    elements.appFighterDetail.innerHTML.includes('Could not show this fighter') &&
    !elements.appFighterDetail.innerHTML.includes('Alpha') &&
    elements.appFighterDetail.dataset.renderedFor === '');
sandbox.getScaledStats = realStats;
run(`appFightersState.focused = 'mallow'; renderAppFightersDetail();`);
check('runtime (a): after the failure, a good render recovers to the focused brawler',
    elements.appFighterDetail.innerHTML.includes('Mallow') && elements.appFighterDetail.dataset.renderedFor === 'mallow');

// Favorites: toggle floats the brawler first, star + button update, untoggle restores.
run(`toggleAppFighterFavorite('solo');`);
check('runtime fav: toggling writes the existing localStorage favorites key',
    lsStore.get('brawl_arena_favorites') === JSON.stringify(['solo']));
const favStrip = elements.appFightersStrip.innerHTML;
check('runtime fav: favorited brawler sorts first in the strip',
    stripOrder().startsWith('solo,'));
check('runtime fav: favorited card shows a filled ★',
    /data-app-favorite="solo"[^>]*>★</.test(favStrip) || favStrip.includes('data-app-favorite="solo"') && favStrip.includes('is-fav'));
run(`appFightersState.focused = 'solo'; renderAppFightersDetail();`);
check('runtime fav: detail shows ★ FAVORITED for a favorite',
    elements.appFighterDetail.innerHTML.includes('★ FAVORITED'));
run(`toggleAppFighterFavorite('solo');`);
check('runtime fav: toggling again removes the favorite and restores the order',
    lsStore.get('brawl_arena_favorites') === JSON.stringify([]) &&
    stripOrder() === 'rocketeer,feathers,freezeon,mallow,alpha,beta,solo,chaird,zeta');
run(`appFightersState.sort = 'favorites'; renderAppFightersStrip();`);

// Skins: selector offers owned skins only; equip / refuse / default / stale shape.
run(`appFightersState.focused = 'freezeon'; renderAppFightersDetail();`);
const freezeDetail = elements.appFighterDetail.innerHTML;
check('runtime skins: owned Tree Freeze chip renders (with DEFAULT), no foreign skins',
    freezeDetail.includes('data-app-skin="tree-freeze-freezeon"') && freezeDetail.includes('🎄 Tree Freeze') &&
    freezeDetail.includes('data-app-skin="default"') && !freezeDetail.includes('xploder-rocketeer') &&
    !freezeDetail.includes('frostbite-feathers'));
check('runtime skins: DEFAULT is active when no skin is equipped',
    /data-app-skin="default"[^>]*class="app-fighter-skin is-active"/.test(freezeDetail) ||
    freezeDetail.includes('class="app-fighter-skin is-active" data-app-skin="default"'));
saveCalls = 0; syncCalls = 0;
run(`appFightersSkinPick('freezeon', 'tree-freeze-freezeon');`);
check('runtime skins: equipping an owned skin writes selectedSkins + saves + re-renders',
    sandbox.playerData.selectedSkins.freezeon === 'tree-freeze-freezeon' && saveCalls === 1 &&
    elements.appFighterDetail.innerHTML.includes('data-app-skin="tree-freeze-freezeon"'));
check('runtime skins: equipped skin chip is active after equip',
    elements.appFighterDetail.innerHTML.includes('class="app-fighter-skin is-active" data-app-skin="tree-freeze-freezeon"'));
saveCalls = 0;
run(`appFightersSkinPick('rocketeer', 'xploder-rocketeer');`);
check('runtime skins: unowned Xploder is refused (no write, no save)',
    sandbox.playerData.selectedSkins.rocketeer === undefined && saveCalls === 0);
run(`appFightersSkinPick('freezeon', 'molten-rock-chaird');`);
check('runtime skins: a foreign skin (another brawler’s) is refused',
    sandbox.playerData.selectedSkins.freezeon === 'tree-freeze-freezeon' && saveCalls === 0);
run(`appFightersSkinPick('freezeon', 'not-a-skin');`);
check('runtime skins: an unknown skin id is refused',
    sandbox.playerData.selectedSkins.freezeon === 'tree-freeze-freezeon' && saveCalls === 0);
saveCalls = 0;
run(`appFightersSkinPick('freezeon', 'default');`);
check('runtime skins: DEFAULT clears the equip and saves',
    sandbox.playerData.selectedSkins.freezeon === undefined && saveCalls === 1);
run(`appFightersState.focused = 'solo'; renderAppFightersDetail();`);
check('runtime skins: stale non-array ownedSkins shape never crashes and offers no skins',
    elements.appFighterDetail.innerHTML.includes('Solo') && !elements.appFighterDetail.innerHTML.includes('app-fighters-skins'));

// --- Hard limits: desktop, whitelist, diag gate, save-code modal, banned word ---
check('save backup whitelist NOT widened',
    game.includes("return /^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i.test(String(key || ''));"));
check('diagnostic strip gate untouched',
    game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save-code modal untouched (same opener)',
    game.includes('function openSaveCodeModal() {'));
check('no sound toggle or progress reset invented',
    !game.includes('soundToggle') && !game.includes('resetProgress'));
check('no banned disabled-brawler word anywhere in game.js',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(game));
check('no banned disabled-brawler word in this test file',
    !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(read('tests/arena-forge-round2-fighters-regression.mjs')));

console.log(`arena-forge-round2-fighters: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
