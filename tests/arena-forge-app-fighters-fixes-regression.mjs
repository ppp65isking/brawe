// Arena Forge app Fighters fixes (2026-11-19, plan section A):
// F1 UPGRADE disabled on locked brawlers (button state AND handler),
// F3 sticky search toolbar, F4 Enter dismisses the keyboard,
// F5 clear-search button, F6 full Core Surge description,
// F7 no "coming soon" second-tool promise (slot omitted when no g2),
// F8 locked strip cards show the unlock soul cost,
// F9 owned/total counter + line-clamped kit descs.
// Layout/UX only: no mechanics, numbers, or core-kit changes; website
// untouched; save whitelist NOT widened; diag gate + save-code modal
// untouched; no banned disabled-brawler word anywhere.
//
// Two layers: static pins (the code says the right thing) and a small
// vm harness that really renders the strip + detail with stubbed data
// and really calls appFightersUpgrade on a locked brawler.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Slice one top-level declaration out of game.js by unique anchors.
// Fails loudly (throws) if an anchor drifted, so a silent false-pass
// from a bad slice is impossible.
function sliceBetween(startMarker, endMarker) {
    const start = game.indexOf(startMarker);
    if (start === -1) throw new Error('start anchor missing: ' + startMarker);
    const end = game.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error('end anchor missing: ' + endMarker);
    return game.slice(start, end);
}

// --- F1: UPGRADE disabled on locked brawlers (static) ---
check('F1: detail computes the upgrade guard from the locked flag, like PLAY',
    game.includes("if (locked) { upgLabel = '🔒 LOCKED'; upgDisabled = true; }"));
check('F1: upgrade button still renders the disabled attr from upgDisabled',
    game.includes("data-app-action=\"upgrade\" ${upgDisabled ? 'disabled' : ''}"));
check('F1: PLAY is still disabled when locked (unchanged guard)',
    game.includes("data-app-action=\"play\" ${locked ? 'disabled' : ''}"));
check('F1: appFightersUpgrade refuses locked brawlers, same shape as PLAY',
    game.includes('function appFightersUpgrade(id) {') &&
    game.includes("if (!isBrawlerUnlocked(id) && !isWeeklyTrialBrawler(id)) return;"));
check('F1: trial + max-level guards still present in the handler',
    game.includes('if (isWeeklyTrialBrawler(id) || (pData.level || 1) >= MAX_POWER_LEVEL) return;'));
check('F1: upgrade cost path untouched (coins + core pieces, level++, save)',
    game.includes('const cost = getUpgradeCost(pData.level);') &&
    game.includes('playerData.coins -= cost;') && game.includes('pData.level++;'));

// --- F3: sticky search toolbar (static) ---
check('F3: fighters toolbar is sticky at the top of the view with an opaque background',
    game.includes('.app-fighters-toolbar{position:sticky;top:0;z-index:3;background:linear-gradient(160deg,#06101f,#0a2140)'));
check('F3: fighter strip sticks just below the toolbar (one-row toolbar, ~52px)',
    game.includes('#appFightersStrip{top:56px}'));
check('F3: phase-3 strip sticky base rule still present (suite pin kept)',
    game.includes('#appFightersStrip{position:sticky;top:0;z-index:2;'));

// --- F4: Enter dismisses the keyboard (static) ---
check('F4: search input has an Enter keydown handler that blurs (dismisses keyboard)',
    game.includes("addEventListener('keydown', (event) => {") &&
    game.includes("if (event.key === 'Enter') { event.preventDefault(); event.target.blur(); }"));

// --- F5: clear-search button (static) ---
check('F5: clear-search button exists in the search field (hidden until there is a query)',
    game.includes('id="appFightersClearSearch"') &&
    game.includes('class="app-fighters-clear-search"') &&
    game.includes('aria-label="Clear search" hidden>✕</button>'));
check('F5: search sits in a wrap so the ✕ can sit inside the field',
    game.includes('class="app-fighters-search-wrap"'));
check('F5: typing toggles the clear button; tapping it clears state + input and re-renders',
    game.includes('if (clearBtn) clearBtn.hidden = !appFightersState.search;') &&
    game.includes("appFightersState.search = '';\n                if (input) { input.value = ''; input.focus(); }") &&
    game.includes('if (clearBtn) clearBtn.hidden = true;'));
check('F5: clear button CSS (inside the field, round, hidden attr wins)',
    game.includes('.app-fighters-clear-search{position:absolute;right:4px;top:50%;') &&
    game.includes('.app-fighters-clear-search[hidden]{display:none}'));

// --- F6: full Core Surge description (static) ---
check('F6: Core Surge description is no longer sliced to 90 chars',
    !game.includes("(getCoreSurgeDescription(id) || '').slice(0, 90)") &&
    game.includes('try { hyperDesc = getCoreSurgeDescription(id) || \'\'; } catch (_) {}'));
check('F6: hyper slot shows the name "Core Surge" with the full desc under it, like the other slots',
    game.includes("kitSlotHtml('hyper', 'CORE SURGE', 'Core Surge', !pData.hyperchargeUnlocked, 'LOCKED · POWER 11', false, hyperDesc)"));

// --- F7: no "coming soon" second tool (static) ---
check('F7: the misleading "Second Tool/Talent coming soon" label is gone',
    !game.includes('Second Tool/Talent coming soon'));
check('F7: TOOL 2 slot is only rendered when the brawler actually has a g2',
    game.includes("const g2Slot = data.g2 ? kitSlotHtml('g2', 'TOOL 2', kitName(data.g2, 'Gadget 2')") &&
    game.includes('${g2Slot}'));
check('F7: TOOL 1 / TALENT 1 / TALENT 2 slots still render with their real fallbacks',
    game.includes("kitSlotHtml('g1', 'TOOL 1', kitName(data.g1, 'Gadget 1')") &&
    game.includes("kitSlotHtml('sp1', 'TALENT 1', kitName(data.sp1, 'Star Power 1')") &&
    game.includes("kitSlotHtml('sp2', 'TALENT 2', kitName(data.sp2, 'Star Power 2')"));

// --- Slot-render fix found while doing F6/F7 (static) ---
// Pristine L6332-6335 read `${kitSlotHtml(...), kitDesc(...)}` — a comma
// expression, so the slot button HTML was computed and thrown away and
// only the bare description text rendered (no slot, no kit-sheet tap).
check('slots: kitDesc is passed INTO kitSlotHtml as the 7th arg (no comma-expression discard)',
    game.includes("pData.selectedGadget === 'g1', kitDesc(data.g1))}") &&
    game.includes("pData.selectedStar === 'slow', kitDesc(data.sp1))}") &&
    game.includes("pData.selectedStar === 'long', kitDesc(data.sp2))}") &&
    !game.includes("=== 'g1'), kitDesc(data.g1)}") &&
    !game.includes("=== 'slow'), kitDesc(data.sp1)}"));

// --- F8: locked strip cards show the unlock soul cost (static) ---
check('F8: locked strip cards compute the soul cost from the Soul Summoner table',
    game.includes('const soulCost = locked ? getSoulUnlockCostForRarity(getBrawlerRarity(id)) : 0;'));
check('F8: locked strip cards show "N SOULS TO UNLOCK" under the LOCKED line',
    game.includes('<span class="app-fighter-cost">${soulCost} SOULS TO UNLOCK</span>'));
check('F8: the LOCKED / POWER line itself is byte-identical (existing suite pin kept)',
    game.includes("${locked ? '🔒 LOCKED' : `POWER ${pData.level || 1}`}"));
check('F8: soul-cost line has its own styling',
    game.includes('.app-fighter-cost{display:block;font-size:9px;font-weight:800;color:#ffd166}'));

// --- F9: owned/total counter + clamped kit descs (static) ---
check('F9: Fighters toolbar has an owned/total counter element',
    game.includes('<span id="appFightersCount" class="app-fighters-count"></span>'));
check('F9: counter renders owned/total from isBrawlerUnlocked over the whole roster',
    game.includes('const owned = allBrawlers.filter((b) => isBrawlerUnlocked(b)).length;') &&
    game.includes('countEl.textContent = `${owned}/${allBrawlers.length} OWNED`;'));
check('F9: kit descs clamp to 3 lines so slots stay even heights',
    game.includes('.app-kit-desc{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'));
check('F9: phase-3 kit-desc base rule still present (suite pin kept)',
    game.includes('.app-kit-desc{display:block;font-size:10px;line-height:1.35;color:#bcd9f2;margin-top:2px}'));

// --- Runtime: really render strip + detail, really call the handler ---
const CORE_SURGE_FULL = 'When Core Surge is ready, the next Super erupts into a storm of blades that chase every enemy on the field for massive damage.';
check('runtime fixture: Core Surge text is over 90 chars (so the old slice would have cut it)',
    CORE_SURGE_FULL.length > 90);

const elements = {};
const documentStub = { getElementById: (id) => (elements[id] ||= { innerHTML: '', textContent: '' }) };
const unlockedSet = new Set(['unlockedStarter', 'noG2']);
let saveCalls = 0;
const sandbox = {
    document: documentStub,
    allBrawlers: ['unlockedStarter', 'lockedEpic', 'noG2'],
    brawlerData: {
        unlockedStarter: { name: 'Outlit', emoji: '🔥', color: '#ff9f1c', role: 'Damage Dealer', main: 'Main attack', super: 'Super attack', g1: 'Gadget One (does a thing)', g2: 'Gadget Two (does another thing)', sp1: 'Star One (shines bright)', sp2: 'Star Two (shines brighter)' },
        lockedEpic: { name: 'Nightshade', emoji: '🐍', color: '#b388ff', role: 'Controller', main: 'Viper Fan', super: 'Boomerang Blades', g1: 'Backstab Dash (dash behind)', g2: 'Purge Vial (cleanse all)', sp1: 'Lingering Toxin (poison lasts)', sp2: 'Fresh Wounds (reopen wounds)' },
        noG2: { name: 'Solo', emoji: '⭐', color: '#8cf05a', role: 'Damage Dealer', main: 'Solo main', super: 'Solo super', g1: 'Only Gadget (the only one)', sp1: 'Only Star (the only one)' },
    },
    brawlerRarities: { unlockedStarter: 'Starter', lockedEpic: 'Epic', noG2: 'Rare' },
    SOUL_UNLOCK_COST_BY_RARITY: { Starter: 0, Rare: 70, Epic: 170, Mythic: 270 },
    playerData: {
        coins: 100000,
        brawlers: {
            unlockedStarter: { level: 5, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedGadget: 'g1', selectedStar: 'slow' },
            lockedEpic: { level: 1 },
            noG2: { level: 3, gadgetUnlocked: true, starPowerUnlocked: false, hyperchargeUnlocked: false },
        },
    },
    appFightersState: { search: '', role: 'all', focused: 'lockedEpic' },
    APP_FIGHTER_RARITY_COLORS: { Starter: '#ff9f1c', Rare: '#8cf05a', Epic: '#b388ff' },
    MAX_POWER_LEVEL: 12,
    selectedBrawler: 'unlockedStarter',
    isBrawlerUnlocked: (id) => unlockedSet.has(id),
    isWeeklyTrialBrawler: () => false,
    getEffectiveBrawlerProgress: (id) => sandbox.playerData.brawlers[id] || { level: 1 },
    getScaledStats: () => ({ hp: 1000, dmg: 100, speed: 100 }),
    getBrawlerPortraitMarkup: () => '<span>🙂</span>',
    getCoreSurgeDescription: () => CORE_SURGE_FULL,
    getUpgradeCost: () => 100,
    getCorePieceUpgradeCost: () => 0,
    getCorePieces: () => 999,
    spendCorePieces: () => {},
    ensureHyperchargeDiscount: () => {},
    saveProgress: () => { saveCalls++; },
    syncAppHome: () => {},
};
vm.createContext(sandbox);
const run = (code) => vm.runInContext(code, sandbox);
try {
    run(sliceBetween('    const kitSplit = (raw) => {', '    const kitName = '));
    run(sliceBetween('    const kitName = ', '    const kitDesc = '));
    run(sliceBetween('    const kitDesc = ', '    function renderAppFightersDetail() {'));
    run(sliceBetween('    function appFightersVisibleList() {', '    function buildAppFightersView() {'));
    run(sliceBetween('    function renderAppFightersStrip() {', '    // Kit name/description split'));
    run(sliceBetween('    function renderAppFightersDetail() {', '    function appFightersKitPick(id, key) {'));
    run(sliceBetween('        function getBrawlerRarity(brawlerId) {', '        function getDisplayRarityName'));
    run(sliceBetween('        function getSoulUnlockCostForRarity(rarity) {', '        function getSoulsForPlacement'));
    run(sliceBetween('    function appFightersUpgrade(id) {', '    // ---- App Events view'));
    check('runtime: all Fighters functions extracted and evaluated', true);
} catch (err) {
    check('runtime: all Fighters functions extracted and evaluated (' + err.message + ')', false);
}

// Strip render (focused = lockedEpic).
run(`appFightersState.focused = 'lockedEpic'; renderAppFightersStrip();`);
const stripHtml = elements.appFightersStrip.innerHTML;
check('runtime F8: locked strip card shows LOCKED plus the 170-soul Epic cost',
    stripHtml.includes('🔒 LOCKED') && stripHtml.includes('170 SOULS TO UNLOCK'));
check('runtime F8: unlocked strip card shows POWER, no soul cost',
    stripHtml.includes('POWER 5') && (stripHtml.match(/SOULS TO UNLOCK/g) || []).length === 1);
check('runtime F9: counter reads 2/3 OWNED (2 of the 3 fixture brawlers unlocked)',
    elements.appFightersCount.textContent === '2/3 OWNED');

// Detail render, locked brawler: upgrade + play both disabled.
run(`appFightersState.focused = 'lockedEpic'; renderAppFightersDetail();`);
const lockedDetail = elements.appFightersDetail.innerHTML;
const upgBtn = (lockedDetail.match(/<button[^>]*data-app-action="upgrade"[^>]*>/) || [''])[0];
const playBtn = (lockedDetail.match(/<button[^>]*data-app-action="play"[^>]*>/) || [''])[0];
check('runtime F1: UPGRADE button is disabled on a locked brawler',
    upgBtn.includes('disabled') && lockedDetail.includes('>🔒 LOCKED</button>'));
check('runtime F1: PLAY button is disabled on a locked brawler (unchanged)',
    playBtn.includes('disabled'));
check('runtime slots: kit slot buttons actually render (g1/g2/sp1/sp2/hyper)',
    ['g1', 'g2', 'sp1', 'sp2', 'hyper'].every((k) => lockedDetail.includes(`data-app-kit="${k}"`)));

// Detail render, unlocked brawler with everything unlocked: full desc + enabled upgrade.
run(`appFightersState.focused = 'unlockedStarter'; renderAppFightersDetail();`);
const openDetail = elements.appFightersDetail.innerHTML;
const openUpgBtn = (openDetail.match(/<button[^>]*data-app-action="upgrade"[^>]*>/) || [''])[0];
check('runtime F1: UPGRADE button is enabled on an unlocked, affordable brawler',
    !openUpgBtn.includes('disabled'));
check('runtime F6: full Core Surge description renders in the slot (not 90-char cut)',
    openDetail.includes(CORE_SURGE_FULL));
check('runtime F6: Core Surge slot shows the name plus the desc line',
    openDetail.includes('>Core Surge</b>') && openDetail.includes('class="app-kit-desc"'));

// Detail render, brawler with no g2: no TOOL 2 slot, no coming-soon text.
run(`appFightersState.focused = 'noG2'; renderAppFightersDetail();`);
const noG2Detail = elements.appFightersDetail.innerHTML;
check('runtime F7: brawler with no g2 gets no TOOL 2 slot and no coming-soon text',
    !noG2Detail.includes('data-app-kit="g2"') && !/coming soon/i.test(noG2Detail));
check('runtime F7: brawler with no g2 still gets its TOOL 1 slot',
    noG2Detail.includes('data-app-kit="g1"'));

// Direct handler call: locked brawler cannot upgrade even with plenty of coins.
saveCalls = 0;
const beforeLevel = sandbox.playerData.brawlers.lockedEpic.level;
run(`appFightersUpgrade('lockedEpic');`);
check('runtime F1: direct appFightersUpgrade call on a locked brawler changes nothing',
    sandbox.playerData.brawlers.lockedEpic.level === beforeLevel && saveCalls === 0);
run(`appFightersUpgrade('unlockedStarter');`);
check('runtime F1: direct appFightersUpgrade call on an unlocked brawler still upgrades',
    sandbox.playerData.brawlers.unlockedStarter.level === 6 && saveCalls === 1);

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

console.log(`app-fighters-fixes: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
