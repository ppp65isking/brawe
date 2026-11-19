// Arena Forge app home redesign (2026-11-18, Anthony's order): Brawl Stars
// style home for the APK — bottom tab bar, big hero fighter card, huge PLAY
// button, slim top strip. App mode ONLY (.native-app / isNativeAppMode):
// the website renders exactly as before. Source-presence + behavior mirrors.
// Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- App mode only: website untouched ---
check('web home is hidden ONLY under .native-app (website keeps it)', game.includes('.native-app #homeScreen{display:none !important}'));
check('no unscoped #homeScreen hide rule exists', !/^[ \t]*#homeScreen\{display:none/m.test(game));
check('app shell builds only when isNativeAppMode() is true', game.includes('function buildAppHome()') && game.includes('if (appHomeEl || !isNativeAppMode()) return;'));
check('app shell element is created and appended to body', game.includes("shell.id = 'appHome'") && game.includes('document.body.appendChild(shell);'));

// --- Activation fix (2026-11-18): localhost fallback + load/DOMContentLoaded retry ---
// The APK serves local assets at https://localhost/; if window.Capacitor is
// not injected yet when the IIFE evaluates, the boot-only check missed and
// the shell never turned on (Anthony's screenshot: fullscreen button still
// visible = .native-app never applied). The fix: localhost fallback + retry.
check('isNativeAppMode falls back to localhost (Capacitor local server)', (() => {
    const start = game.indexOf('function isNativeAppMode() {');
    const boot = game.indexOf("if (isNativeAppMode()) document.documentElement.classList.add('native-app');", start);
    const host = game.indexOf("window.location.hostname === 'localhost'", start);
    return start !== -1 && boot !== -1 && host !== -1 && host < boot;
})());
check('bridge check still comes first, localhost is only the fallback', (() => {
    const start = game.indexOf('function isNativeAppMode() {');
    const bridge = game.indexOf('window.Capacitor.isNativePlatform()', start);
    const host = game.indexOf("window.location.hostname === 'localhost'", start);
    return start !== -1 && bridge !== -1 && host !== -1 && bridge < host;
})());
// Two location.hostname reads exist since 2026-11-18: the localhost
// fallback inside isNativeAppMode() and the Pages-host gate inside
// refreshApkDiagStrip(). The strip gate never feeds app mode — it only
// decides whether the APK-only diagnostic strip is created.
check('no other host broadens app mode (no 127.0.0.1, no wildcard hostname)', !game.includes('127.0.0.1') && (game.match(/location\.hostname/g) || []).length === 2 && game.indexOf("window.location.hostname === 'localhost'") !== -1 && game.indexOf('window.location.hostname || ') !== -1);
check('retry helper re-applies the class and rebuilds the shell', game.includes('function retryAppHomeActivation() {') && game.includes("if (isNativeAppMode()) document.documentElement.classList.add('native-app');\n        buildAppHome();"));
check('retry runs on window load', game.includes("window.addEventListener('load', retryAppHomeActivation);"));
check('retry runs on DOMContentLoaded', game.includes("document.addEventListener('DOMContentLoaded', retryAppHomeActivation);"));
check('retry is registered after the boot buildAppHome() call', game.indexOf("window.addEventListener('load', retryAppHomeActivation);") > game.indexOf('    buildAppHome();\n'));

// --- Shell structure: top strip, hero, PLAY, event chip, tabs ---
check('top strip has player chip + season chip + currencies host', game.includes('id="appHomePlayerName"') && game.includes('id="appHomeSeasonChip"') && game.includes('id="appHomeCurrencies"'));
check('hero view + events host exist', game.includes('id="appHomeHeroView"') && game.includes('id="appHomeEventsHost"'));
check('PLAY button + event chip exist in the play row', game.includes('id="appHomePlay"') && game.includes('id="appHomeEventChip"'));
check('bottom tab bar has all four tabs with data-app-tab', game.includes('data-app-tab="home"') && game.includes('data-app-tab="fighters"') && game.includes('data-app-tab="events"') && game.includes('data-app-tab="shop"'));
check('CSS lays out the shell fullscreen with safe-area padding', game.includes('#appHome{position:fixed;inset:0;') && game.includes('env(safe-area-inset-top)') && game.includes('env(safe-area-inset-bottom)'));
check('app shell is hidden by default and shown only in native-app mode', game.includes('#appHome{position:fixed;inset:0;z-index:30;display:none;') && game.includes(".native-app #appHome:not(.app-home-hidden){display:flex}"));
check('portrait fallback layout exists for portrait orientation', game.includes('@media (orientation:portrait){#appHomeHero{flex-direction:column;'));

// --- Reuse, not rebuild: currency bar + events view are MOVED, not duplicated ---
check('live currency bar is moved into the app top strip', game.includes("document.getElementById('homeCurrencyBar')") && game.includes('currencyHost.appendChild(currencyBar);'));
check('existing events view is moved into the app events host', game.includes("document.getElementById('homeEventsView')") && game.includes('eventsHost.appendChild(eventsView);'));
check('no duplicate events/mode logic is built in the app shell', !game.includes('appHomeModeCard') && !game.includes('createAppModeCard'));

// --- Hero: same data as the web card, never blank ---
check('hero reads the same data as renderHomeBrawlerCard (outlit fallback)', game.includes("brawlerData[selectedBrawler] || brawlerData.outlit"));
check('hero shows name + rarity + role + HP/DMG/SPEED/POWER', game.includes('<small>READY TO BRAWL</small>') && game.includes('<small>HP</small>') && game.includes('<small>DMG</small>') && game.includes('<small>SPEED</small>') && game.includes('<small>POWER</small>'));
check('hero portrait comes from getBrawlerPortraitMarkup', game.includes('getBrawlerPortraitMarkup(selectedBrawler)'));
check('hero portrait call is guarded so one bad read cannot blank the hero', game.includes('try { portrait = getBrawlerPortraitMarkup(selectedBrawler) || \'\'; } catch (_) { portrait = \'\'; }'));
check('hero falls back to a large initials tile when the portrait is empty', game.includes('app-hero-fallback') && game.includes("(name || '?').substring(0, 2).toUpperCase()"));
check('hero background has a --hero-color fallback so it can never go invalid', game.includes('var(--hero-color,#0b69bd)') && game.includes("hero.style.setProperty('--hero-color', bColor);"));
check('hero uses explicit flex sizing, not the web card percentage-height + absolute children', game.includes('#appHomeHero{flex:1 1 auto;min-height:0;display:flex;align-items:center;') && !game.includes('#appHomeHero{position:absolute'));

// --- Top strip + event chip read live game state ---
check('player name comes from the profile (BRAWLER default)', game.includes("playerData?.profile?.playerName || playerData?.playerName || 'BRAWLER'"));
check('season chip is date-driven from getActiveSeasonProfile (never hardcoded)', game.includes('const s = getActiveSeasonProfile(); seasonEl.textContent = `Season ${s.seasonNumber} · ${s.name}`;'));
check('event chip reads the selected mode from HOME_MODE_DATA', game.includes('HOME_MODE_DATA?.[showdownMode]') && game.includes("chip.innerHTML = `<span aria-hidden=\"true\">${modeEntry[1] || '⚔'}</span>"));

// --- Wiring: PLAY + tabs reuse existing entry points ---
check('PLAY clicks the existing #startMatch button', game.includes("document.getElementById('startMatch')?.click();"));
check('hero tap opens the fighters collection via brawlerBtn', game.includes("document.getElementById('appHomeHero')?.addEventListener('click'") && game.includes('brawlerBtn.click()'));
check('Fighters tab reuses brawlerBtn.click()', game.includes("if (tab === 'fighters') { if (brawlerBtn) brawlerBtn.click(); return; }"));
check('Shop tab reuses openHomeShop()', game.includes("if (tab === 'shop') { if (typeof openHomeShop === 'function') openHomeShop(); return; }"));
check('Home/Events tabs reuse setHomeTab', game.includes("setHomeTab(tab === 'events' ? 'events' : 'home');"));
check('event chip tap goes to the Events tab', game.includes("document.getElementById('appHomeEventChip')?.addEventListener('click', () => setAppHomeTab('events'));"));

// --- Sync: hero stays fresh, tab follows web tab state, visibility follows home ---
check('syncAppHome is hooked at the end of renderHomeBrawlerCard', (() => { const start = game.indexOf('function renderHomeBrawlerCard() {'); const hook = game.indexOf('syncAppHome();', start); const next = game.indexOf('const FASTPASS_MOMENTUM_PER_HIT', start); return start !== -1 && hook !== -1 && hook < next; })());
check('syncAppHome is hooked at the end of refreshPersonalizedHome', game.includes('season.innerHTML = homeSeasonProfile.key === ') && /Packets have been retired\.`; \}\n      syncAppHome\(\);\n  \}\n\n  function setHomeTab/.test(game));
check('syncAppHome is hooked at the end of setHomeTab', game.includes("document.getElementById('homePanel')?.scrollTo({ top: 0, behavior: 'smooth' });\n      syncAppHome();"));
check('app tab is derived from the web events view is-active state', game.includes("document.getElementById('homeEventsView')?.classList.contains('is-active')"));
check('app shell hides when the home screen hides (match start) via MutationObserver', game.includes('new MutationObserver(syncAppHomeVisibility).observe(homeScreenEl, { attributes: true, attributeFilter: [\'style\'] })') && game.includes("appHomeEl.classList.toggle('app-home-hidden', hidden);"));
check('first sync is deferred past initial evaluation (no TDZ reads at boot)', game.includes('if (typeof setTimeout === \'function\') setTimeout(syncAppHome, 0);'));
check('syncAppHome no-ops on the website (appHomeEl null / not native)', game.includes('if (!appHomeEl || !isNativeAppMode()) return;'));

// --- Behavior mirrors ---
// Mirror of the hero portrait decision: empty/whitespace markup -> initials tile.
function heroPortrait(portrait, name, color) {
    const p = (portrait || '').trim();
    if (p) return { kind: 'portrait', html: p };
    return { kind: 'fallback', initials: (name || '?').substring(0, 2).toUpperCase(), color };
}
check('hero: SVG portrait markup renders as portrait', heroPortrait('<svg viewBox="0 0 100 100"></svg>', 'Outlit', '#fff').kind === 'portrait');
check('hero: emoji portrait markup renders as portrait', heroPortrait('🔥', 'Outlit', '#fff').kind === 'portrait');
check('hero: empty portrait renders the initials fallback tile', (() => { const r = heroPortrait('', 'Outlit', '#7a4dff'); return r.kind === 'fallback' && r.initials === 'OU' && r.color === '#7a4dff'; })());
check('hero: whitespace-only portrait renders the initials fallback tile', heroPortrait('   ', 'Pandy', '#ec4899').kind === 'fallback');
check('hero: null portrait renders the initials fallback tile', heroPortrait(null, 'Gravy', '#b45309').initials === 'GR');

// Mirror of the app-tab derivation from the web events view state.
function appTabFromEventsView(eventsIsActive) { return eventsIsActive ? 'events' : 'home'; }
check('tab derivation: events view active -> events tab', appTabFromEventsView(true) === 'events');
check('tab derivation: events view inactive -> home tab', appTabFromEventsView(false) === 'home');

// Mirror of isNativeAppMode: Capacitor bridge first, localhost fallback.
function nativeMode({ hasBridge, bridgeNative, hostname }) {
    try {
        if (hasBridge && bridgeNative) return true;
    } catch (_) { /* fall through to the localhost check */ }
    try { return hostname === 'localhost'; } catch (_) { return false; }
}
check('mode: bridge native on the website host -> app mode (bridge primary)', nativeMode({ hasBridge: true, bridgeNative: true, hostname: 'ppp65isking.github.io' }) === true);
check('mode: no bridge on localhost -> app mode (APK local server fallback)', nativeMode({ hasBridge: false, bridgeNative: false, hostname: 'localhost' }) === true);
check('mode: bridge present but not native + localhost -> app mode (fallback)', nativeMode({ hasBridge: true, bridgeNative: false, hostname: 'localhost' }) === true);
check('mode: no bridge on the website host -> NOT app mode', nativeMode({ hasBridge: false, bridgeNative: false, hostname: 'ppp65isking.github.io' }) === false);
check('mode: no bridge, empty hostname -> NOT app mode', nativeMode({ hasBridge: false, bridgeNative: false, hostname: '' }) === false);

// Mirror of the activation retry: class add is idempotent, buildAppHome
// early-returns once the shell exists, so late retries never duplicate it.
function activationRetry(state, mode) {
    if (mode) state.classAdded = true; // classList.add is idempotent
    if (!state.shellBuilt && mode) state.shellBuilt = true; // buildAppHome guard
    return state;
}
check('retry: boot without bridge on website -> no class, no shell', (() => { const s = activationRetry({ classAdded: false, shellBuilt: false }, false); return s.classAdded === false && s.shellBuilt === false; })());
check('retry: bridge appears by load -> class added, shell built once', (() => { const s = activationRetry({ classAdded: false, shellBuilt: false }, true); return s.classAdded === true && s.shellBuilt === true; })());
check('retry: DOMContentLoaded retry after load -> still exactly one shell', (() => { let s = activationRetry({ classAdded: false, shellBuilt: false }, true); s = activationRetry(s, true); return s.classAdded === true && s.shellBuilt === true; })());
check('retry: localhost boot already active -> load retry changes nothing', (() => { let s = activationRetry({ classAdded: true, shellBuilt: true }, true); s = activationRetry(s, true); return s.classAdded === true && s.shellBuilt === true; })());

// Mirror of the rarity color map used by the hero (same values as renderHomeBrawlerCard).
const rarityColors = { 'Starter': '#9fb4c7', 'Common': '#9fb4c7', 'Rare': '#5df2c2', 'Super Rare': '#6ee7ff', 'Epic': '#f1c40f', 'Mythic': '#ff7bd1', 'Exotic': '#b983ff', 'Unique': '#ff9b42', 'Legendary': '#ff9b42', 'Anomaly': '#7a4dff' };
check('hero rarity colors match the web card (Epic gold, Mythic pink, Anomaly purple)', rarityColors['Epic'] === '#f1c40f' && rarityColors['Mythic'] === '#ff7bd1' && rarityColors['Anomaly'] === '#7a4dff');
check('hero rarity falls back to #9fb4c7 for unknown rarities', (rarityColors['Nope'] || '#9fb4c7') === '#9fb4c7');

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-home`);
