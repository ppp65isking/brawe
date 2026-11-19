// Arena Forge app redesign phase 2 (2026-11-19, Anthony's order, overnight):
// "work on migrating rest of the app to a redesign for mobile and fix
// some other things to make it the best it could be pls like every screen
// and ones we already covered make it better". App/touch mode ONLY — the
// website's home/shop/quests/tournament/profile are untouched. Source
// presence + behavior mirrors, same pattern as the phase-1 suites.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Home quick row: the home features trapped in the hidden web home ---
check('quick row exists in the app shell with quests + pass + settings', game.includes('id="appHomeQuickRow"') && game.includes('data-app-quick="quests"') && game.includes('data-app-quick="pass"') && game.includes('data-app-quick="settings"'));
check('quick row buttons carry live badges', game.includes('id="appQuestsBadge"') && game.includes('id="appPassBadge"') && game.includes('class="app-quick-badge"'));
check('quick row quests opens the quest board', game.includes("if (action === 'quests') { if (typeof openQuestBoard === 'function') openQuestBoard(); }"));
check('quick row pass opens the revived season-pass tier road and sets the deep link (road from PR #154, deep link from round 2 Tier 2)', game.includes("else if (action === 'pass') { if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); }"));
check('quick row settings opens the native settings view', game.includes("if (action === 'settings') { setAppHomeTab('settings'); }"));
check('live Brick Rush button is moved into the quick row', game.includes("const brickRushBtn = document.getElementById('dailyBrickRushBtn');") && game.includes("if (brickRushBtn && quickRow) quickRow.appendChild(brickRushBtn);"));
check('quick-row badges refresh in syncAppHome', game.includes("document.getElementById('dailyWeeklyQuestCount')?.textContent") && game.includes("getClaimableSeasonRewardCount() || 0"));

// --- Player + season chips finally do something in app mode ---
// Phase 4: the handler also buzzes (appBuzz) — same tap, same destination.
check('player chip tap opens the player profile', game.includes("document.getElementById('appHomePlayer')?.addEventListener('click', () => { appBuzz(10); if (typeof openPlayerProfile === 'function') openPlayerProfile(); setAppDeepLink('profile'); });"));
// Phase 4: the handler also buzzes (appBuzz) — same tap, same destination.
check('season chip tap opens the season pass', game.includes("document.getElementById('appHomeSeasonChip')?.addEventListener('click', () => { appBuzz(10); if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); });"));
check('chips show a pointer cursor', game.includes('#appHomePlayer,#appHomeSeasonChip{cursor:pointer}'));

// --- Settings view: shell + builders + tab wiring ---
check('settings view container exists in the app shell', game.includes('id="appHomeSettingsView"'));
check('settings builders exist', game.includes('function buildAppSettingsView() {') && game.includes('function renderAppSettingsView() {'));
check('settings tab opens the native view', game.includes("if (tab === 'settings') { appHomeTab = tab; buildAppSettingsView(); syncAppHome(); setAppDeepLink('settings'); return; }"));
check('syncAppHome toggles the settings view', game.includes("document.getElementById('appHomeSettingsView')?.classList.toggle('is-active', appHomeTab === 'settings');"));
check('settings view hides the hero view while open', game.includes("activeView === 'home' && appHomeTab !== 'settings'"));
check('settings back button returns home', game.includes("if (action === 'back') { setAppHomeTab('home'); return; }"));

// --- Settings rows reuse existing paths only ---
check('settings save row opens the save-code modal', game.includes("if (action === 'save') { if (typeof openSaveCodeModal === 'function') openSaveCodeModal(); return; }"));
check('settings guide row resets the help flags and shows the guide', game.includes("localStorage.removeItem('arenaForgeHelpHiddenV1')") && game.includes("localStorage.setItem('arenaForgeHelpViewsV1', '0')") && game.includes("if (typeof maybeOpenArenaForgeHelp === 'function') maybeOpenArenaForgeHelp();"));
check('settings haptics row flips the stored pref and re-renders', game.includes("localStorage.setItem(APP_HAPTICS_KEY, appHapticsOn() ? '0' : '1')") && game.includes('renderAppSettingsView();'));
check('settings about shows live fighter count + season', game.includes('const fighterCount = Array.isArray(allBrawlers) ? allBrawlers.length : 0;') && game.includes('${fighterCount} fighters') && game.includes('season.seasonNumber'));

// --- Haptics: one guarded helper, all touch buttons go through it ---
check('haptics helper exists with the stored pref (default on)', game.includes("const APP_HAPTICS_KEY = 'arenaForgeHapticsV1';") && game.includes('function appBuzz(ms) {') && game.includes("localStorage.getItem(APP_HAPTICS_KEY) !== '0'"));
// Phase 4: more appBuzz call sites now exist (shell taps, kit sheet), so
// the count check is gone — the intent stands: no bare navigator.vibrate
// anywhere; the single vibrate call lives inside the guarded appBuzz.
check('all four touch-button vibrations go through appBuzz', game.includes('appBuzz(18);') && game.includes('appBuzz(22);') && (game.match(/navigator\.vibrate/g) || []).length === 1);
check('no bare vibrate call survives outside the helper', (game.match(/navigator\.vibrate/g) || []).length === 1);

// --- Web overlays restyled for the app (CSS only, same functions) ---
check('shop panel goes fullscreen in app mode', game.includes('.native-app .brawe-shop-panel{width:100vw !important;height:100dvh !important;max-height:none !important;border-radius:0 !important}'));
check('shop sidebar becomes a horizontal chip row in app mode', game.includes('.native-app .brawe-shop-sidebar{width:100% !important;flex-direction:row !important;overflow-x:auto !important;'));
check('shop cards use a 2-column grid on phones', game.includes('.native-app .brawe-shop-content>div{grid-template-columns:repeat(auto-fill,minmax(160px,1fr)) !important}'));
check('shop close button is 44px in app mode', game.includes('.native-app .brawe-shop-header button{width:44px !important;height:44px !important}'));
check('quest board panel goes fullscreen in app mode', game.includes('.native-app #questBoardOverlay>div{width:100vw !important;height:100dvh !important;max-height:none !important;border-radius:0 !important;padding:12px !important}'));
check('tournament overlays get the app class in all three openers', (game.match(/overlay\.classList\.add\('app-tournament-overlay'\);/g) || []).length === 3);
check('tournament hub padding shrinks in app mode', game.includes(".native-app .app-tournament-overlay{padding:14px 10px !important}"));
check('tournament league cards go two-per-row on phones', game.includes(".native-app .app-tournament-league-grid>div{width:min(200px,calc(50vw - 22px)) !important}"));

// --- Polish pass on the phase-1 screens ---
check('top strip wraps on narrow phones', game.includes("@media (max-width:430px){#appHomeTop{flex-wrap:wrap;row-gap:6px}"));
check('fighters detail stacks in narrow portrait', game.includes("@media (orientation:portrait) and (max-width:560px){#appFightersDetail{flex-direction:column;align-items:center;gap:10px}"));

// --- Website paths unchanged: same openers, same purchase/claim paths ---
check('shop opener still exists and still opens the gem shop', game.includes('function openGemShop() {') && game.includes("shopBtn.addEventListener('click', ()=>{ openGemShop(); });"));
check('shop still has all seven sidebar tabs', game.includes("createSidebarButton('☀ DAILY DEALS', 'daily')") && game.includes("createSidebarButton('👤 FIGHTER DEAL', 'fighter')") && game.includes("createSidebarButton('🎁 OFFER ARCHIVE', 'featured')") && game.includes("createSidebarButton('🎭 SKIN CATALOGUE', 'skins')") && game.includes("createSidebarButton('🎡 LUCKY WHEEL', 'wheel')") && game.includes("createSidebarButton('🪙 CONVERSIONS', 'exchange')") && game.includes("createSidebarButton('⚡ OVERDRIVE REWARDS', 'overdrive')"));
check('quest board opener still exists with all five tabs', game.includes('function openQuestBoard(initialTab') && game.includes("makeTab('core', '📋 Contracts')") && game.includes("makeTab('overdrive', '⚡ Core Surge Overdrive')") && game.includes("makeTab('special', '💠 Core Pieces')") && game.includes("makeTab('season', '⚡ Season Pass')"));
check('season pass still delegates to the quest board season tab', game.includes("function openSeasonPass() {") && game.includes("openQuestBoard('season');"));
check('save-code modal behavior untouched', game.includes('function openSaveCodeModal() {') && game.includes('width:min(560px,94vw);max-height:88vh;') && game.includes('importBraweSavePayload'));
check('diagnostic strip gate untouched', game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save backup whitelist unchanged (tournament state still out)', game.includes("return /^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i.test(String(key || ''));"));

console.log(`phase2: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
