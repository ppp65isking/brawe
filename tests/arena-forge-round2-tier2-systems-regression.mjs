// Arena Forge round 2 Tier 2 systems (2026-11-19): editable control
// layout (locked vs floating joystick + button size S/M/L), deep links
// per screen, dead-code sweep (moved-but-hidden web events view).
// App/touch mode ONLY. Source-presence + live mirrors: the control
// prefs, the deep-link reader/writer and bindVirtualStick are extracted
// and run against stub storage/DOM. Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const capConfig = read('capacitor.config.ts');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// --- Stub storage / DOM for the live mirrors ---
function makeStubStorage(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: (k) => { store.delete(k); },
        _dump: () => Object.fromEntries(store),
    };
}
function makeClassList() {
    const set = new Set();
    return {
        toggle: (name, force) => { if (force === undefined) { set.has(name) ? set.delete(name) : set.add(name); } else if (force) set.add(name); else set.delete(name); },
        contains: (name) => set.has(name),
        _all: () => [...set].sort(),
    };
}
function makeFakeStick() {
    const listeners = {};
    return {
        style: {},
        listeners,
        addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
        setPointerCapture: function (id) { this.capturedId = id; },
        capturedId: null,
        getBoundingClientRect: () => ({ left: 100, top: 500, width: 132, height: 132 }),
        fire: function (type, event) { for (const fn of (listeners[type] || [])) fn(event); },
    };
}

// --- Extract + run the control-layout pref block live ---
function extractControlPrefs() {
    const start = game.indexOf("  const APP_CONTROLS_KEY = 'arenaForgeControlsV1';");
    const end = game.indexOf('  function initMobileControls() {', start);
    if (start === -1 || end === -1) return null;
    const src = game.slice(start, end);
    const factory = new Function('localStorage', 'document', 'mobileControlsRoot', `${src}\nreturn { getControlLayoutPrefs, isFloatingStickMode, applyControlLayoutPrefs, setControlLayoutPrefs };`);
    return factory;
}
const controlFactory = extractControlPrefs();
check('control pref block extracts cleanly from game.js', !!controlFactory);
function runControlPrefs(initialStorage = {}) {
    const storage = makeStubStorage(initialStorage);
    const moveStick = { style: { left: '18px', top: '', bottom: '24px', right: '' } };
    const aimStick = { style: { left: '', top: '', bottom: '24px', right: '20px' } };
    const documentStub = { getElementById: (id) => (id === 'mobileMoveStick' ? moveStick : id === 'mobileAimStick' ? aimStick : null) };
    const rootStub = { classList: makeClassList() };
    const api = controlFactory(storage, documentStub, rootStub);
    return { ...api, storage, rootStub, moveStick, aimStick };
}

// --- 1. Editable control layout: prefs ---
check('control pref key is a single named localStorage key', game.includes("const APP_CONTROLS_KEY = 'arenaForgeControlsV1';"));
{
    const t = runControlPrefs();
    const prefs = t.getControlLayoutPrefs();
    check('control prefs default to locked joystick + M buttons on empty storage', prefs.stick === 'locked' && prefs.size === 'M');
    check('floating mode reads back as floating', !t.isFloatingStickMode());
}
{
    const t = runControlPrefs();
    const next = t.setControlLayoutPrefs({ stick: 'floating' });
    check('setting floating persists as JSON with size kept', next.stick === 'floating' && next.size === 'M' && t.storage.getItem('arenaForgeControlsV1') === '{"stick":"floating","size":"M"}');
    check('isFloatingStickMode() is true after the floating write', t.isFloatingStickMode());
    check('apply toggles the floating class on the controls root', t.rootStub.classList.contains('controls-stick-floating') && !t.rootStub.classList.contains('controls-stick-locked'));
}
{
    const t = runControlPrefs({ arenaForgeControlsV1: '{"stick":"floating","size":"S"}' });
    const prefs = t.getControlLayoutPrefs();
    check('stored floating + S reads back intact', prefs.stick === 'floating' && prefs.size === 'S');
    t.applyControlLayoutPrefs();
    check('apply toggles the S size class (and not M/L)', t.rootStub.classList.contains('controls-size-s') && !t.rootStub.classList.contains('controls-size-m') && !t.rootStub.classList.contains('controls-size-l'));
    check('apply in floating mode does NOT clear the stick inline position', t.moveStick.style.left === '18px' && t.moveStick.style.bottom === '24px');
}
{
    const t = runControlPrefs({ arenaForgeControlsV1: '{"stick":"floating","size":"L"}' });
    t.setControlLayoutPrefs({ stick: 'locked' });
    check('switching back to locked clears the floating inline position', t.moveStick.style.left === '' && t.moveStick.style.top === '' && t.moveStick.style.bottom === '' && t.moveStick.style.right === '' && t.aimStick.style.left === '' && t.aimStick.style.bottom === '');
    check('switching back to locked toggles the locked class', t.rootStub.classList.contains('controls-stick-locked') && !t.rootStub.classList.contains('controls-stick-floating'));
}
{
    const t = runControlPrefs({ arenaForgeControlsV1: 'not-json{' });
    check('corrupt control pref falls back to locked/M', (() => { const p = t.getControlLayoutPrefs(); return p.stick === 'locked' && p.size === 'M'; })());
}
{
    const t = runControlPrefs({ arenaForgeControlsV1: '{"stick":"weird","size":"XL"}' });
    check('unknown control values are sanitized to locked/M', (() => { const p = t.getControlLayoutPrefs(); return p.stick === 'locked' && p.size === 'M'; })());
    const next = t.setControlLayoutPrefs({ size: 'L' });
    check('size L persists alongside locked', next.stick === 'locked' && next.size === 'L' && t.storage.getItem('arenaForgeControlsV1') === '{"stick":"locked","size":"L"}');
}

// --- 1b. Editable control layout: wiring + CSS ---
check('Settings has a JOYSTICK row with LOCKED/FLOATING actions', game.includes('🕹️ JOYSTICK') && game.includes('data-app-settings="stick-locked"') && game.includes('data-app-settings="stick-floating"'));
check('Settings has a BUTTON SIZE row with S/M/L actions', game.includes('🔘 BUTTON SIZE') && game.includes('data-app-settings="size-s"') && game.includes('data-app-settings="size-m"') && game.includes('data-app-settings="size-l"'));
check('settings handler routes stick/size actions through setControlLayoutPrefs + re-render', game.includes("if (action === 'stick-locked' || action === 'stick-floating') {") && game.includes("setControlLayoutPrefs({ stick: action === 'stick-floating' ? 'floating' : 'locked' });") && game.includes("if (action === 'size-s' || action === 'size-m' || action === 'size-l') {") && game.includes("setControlLayoutPrefs({ size: action.slice(5).toUpperCase() });"));
check('segmented settings buttons have their own CSS (not just the single-button rule)', game.includes('.app-settings-seg{flex:none;display:flex;gap:6px}') && game.includes('.app-settings-seg button.is-active{')); // rebase: the seg convention is unified on is-active (selected) — the incoming >button.is-off rule fought the orientation convention, so the controls rows now mark the selected button is-active instead
check('S size preset shrinks sticks + buttons via the controls-root class', game.includes('#mobileControlsRoot.controls-size-s .mobile-stick{width:104px;height:104px}') && game.includes('#mobileControlsRoot.controls-size-s .mobile-action-btn{width:48px;height:48px'));
check('L size preset grows sticks + buttons via the controls-root class', game.includes('#mobileControlsRoot.controls-size-l .mobile-stick{width:160px;height:160px}') && game.includes('#mobileControlsRoot.controls-size-l .mobile-action-btn{width:68px;height:68px'));
check('size presets lift the action-button row so it never overlaps a bigger aim stick', game.includes('#mobileControlsRoot.controls-size-s #mobileActionButtons{grid-template-columns:repeat(2,48px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 112px)}') && game.includes('#mobileControlsRoot.controls-size-l #mobileActionButtons{grid-template-columns:repeat(2,68px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 172px)}'));
check('initMobileControls applies the saved layout at boot', game.includes('mobileControlsRoot = root;\n      applyControlLayoutPrefs();'));
check('floating joystick handler is canvas-only, halves split move/aim, skips the modifier strip', game.includes("if (!playing || !mobileInput.enabled || !isFloatingStickMode()) return;") && game.includes('if (event.target !== canvas) return;') && game.includes('const isLeft = event.clientX < rect.left + rect.width / 2;') && game.includes('if (tapX >= 0 && tapX <= 360 && tapY >= 0 && tapY <= 40) return;'));
check('floating handler repositions the stick under the thumb and starts it there', game.includes("stick.style.left = `${left}px`;") && game.includes("stick.style.top = `${top}px`;") && game.includes("stick.style.bottom = 'auto';") && game.includes('try { handle.begin(event); } catch (_) {}'));
check('floating reposition clamps inside the viewport', game.includes('Math.max(8, Math.min(event.clientX - size / 2, window.innerWidth - size - 8))') && game.includes('Math.max(8, Math.min(event.clientY - size / 2, window.innerHeight - size - 8))'));
check('bindVirtualStick returns a begin/reset handle for the floating entry point', game.includes('return { begin, reset, isActive: () => activePointerId !== null };'));
check('move + aim sticks keep their handles in initMobileControls', game.includes('const moveStickHandle = bindVirtualStick(moveStick, moveKnob,') && game.includes('const aimStickHandle = bindVirtualStick(aimStick, aimKnob,'));
// Live: the refactored stick still behaves exactly like the old one.
{
    const start = game.indexOf('  function bindVirtualStick(stickEl, knobEl, onMove, onEnd) {');
    const end = game.indexOf('  // Arena Forge round 2 Tier 2: editable control layout', start);
    check('bindVirtualStick extracts cleanly from game.js', start !== -1 && end !== -1);
    const factory = new Function(`${game.slice(start, end)}\nreturn bindVirtualStick;`);
    const bindVirtualStick = factory();
    const stick = makeFakeStick();
    const knob = { style: {} };
    const moves = [];
    let ended = 0;
    const handle = bindVirtualStick(stick, knob, (x, y) => moves.push([x, y]), () => { ended++; });
    check('bindVirtualStick returns a handle with begin/reset', typeof handle.begin === 'function' && typeof handle.reset === 'function');
    const down = { pointerId: 7, clientX: 213, clientY: 566, preventDefault: () => {} };
    stick.fire('pointerdown', down);
    check('locked stick pointerdown captures the pointer and reports a near-full right push', stick.capturedId === 7 && moves.length === 1 && moves[0][0] > 0.9 && approx(moves[0][1], 0));
    check('locked stick pointerdown moves the knob off-center', knob.style.left !== '50%' || knob.style.top !== '50%');
    handle.begin({ pointerId: 9, clientX: 166, clientY: 566, preventDefault: () => {} });
    check('handle.begin() (floating entry point) starts the same press from center', moves.length === 2 && approx(moves[1][0], 0) && approx(moves[1][1], 0));
    stick.fire('pointerup', { pointerId: 9, preventDefault: () => {} });
    check('pointerup ends the press and resets the knob', ended === 1 && knob.style.left === '50%' && knob.style.top === '50%');
}
// Layout only: aim/fire behavior is untouched.
check('aim stick still writes the same aim + one-shot fire values', game.includes('mobileInput.aimHeld = true;') && game.includes('mouse.screenX = innerWidth * 0.5 + x * 180;') && game.includes('mobileInput.releaseShotTimer = setTimeout(() => { mobileInput.attackActive = false; }, 80);'));
check('move stick still writes the same move values', game.includes('mobileInput.moveX = x;') && game.includes('mobileInput.moveY = y;'));

// --- 2. Deep links ---
check('deep-link route table lists all eight screens', game.includes("const APP_DEEP_LINK_ROUTES = ['home', 'fighters', 'events', 'shop', 'pass', 'tournament', 'profile', 'settings'];"));
function extractDeepLinkReader() {
    const start = game.indexOf("    const APP_DEEP_LINK_ROUTES = ['home'");
    const end = game.indexOf('    function setAppDeepLink(route) {', start);
    if (start === -1 || end === -1) return null;
    const src = game.slice(start, end);
    return new Function('window', `${src}\nreturn readAppDeepLinkRoute;`);
}
const deepLinkReaderFactory = extractDeepLinkReader();
check('deep-link reader extracts cleanly from game.js', !!deepLinkReaderFactory);
function readRoute(hash, search) {
    const readAppDeepLinkRoute = deepLinkReaderFactory({ location: { hash, search } });
    return readAppDeepLinkRoute();
}
check('hash #fighters routes to fighters', readRoute('#fighters', '') === 'fighters');
check('hash is case-insensitive (#SHOP -> shop)', readRoute('#SHOP', '') === 'shop');
check('hash with a trailing path still routes (#pass?x=1 -> pass)', readRoute('#pass?x=1', '') === 'pass');
check('unknown hash falls through to ?screen= (?screen=tournament)', readRoute('#nope', '?screen=tournament') === 'tournament');
check('?screen= works with no hash (?screen=settings)', readRoute('', '?screen=settings') === 'settings');
check('hash wins over ?screen= when both are present', readRoute('#events', '?screen=shop') === 'events');
check('no route in the URL reads back as null (home stays home)', readRoute('', '') === null);
check('unknown ?screen= reads back as null', readRoute('', '?screen=bogus') === null);
function extractDeepLinkWriter() {
    const start = game.indexOf("    const APP_DEEP_LINK_ROUTES = ['home'");
    const end = game.indexOf('    function navigateAppDeepLink(route) {', start);
    if (start === -1 || end === -1) return null;
    // Include the route table: setAppDeepLink validates against it.
    const src = game.slice(start, end);
    return new Function('window', 'isNativeAppMode', `${src}\nreturn setAppDeepLink;`);
}
const deepLinkWriterFactory = extractDeepLinkWriter();
check('deep-link writer extracts cleanly from game.js', !!deepLinkWriterFactory);
{
    const calls = [];
    const windowStub = { history: { replaceState: (_s, _t, url) => { calls.push(url); } } };
    const setAppDeepLink = deepLinkWriterFactory(windowStub, () => true);
    setAppDeepLink('events');
    check('setAppDeepLink writes #events with replaceState in app mode', calls.length === 1 && calls[0] === '#events');
    setAppDeepLink('bogus');
    check('setAppDeepLink ignores an unknown route', calls.length === 1);
    const setAppDeepLinkWeb = deepLinkWriterFactory(windowStub, () => false);
    setAppDeepLinkWeb('home');
    check('setAppDeepLink does nothing outside app mode (website untouched)', calls.length === 1);
}
check('deep-link dispatch opens pass via openSeasonPass', game.includes("if (route === 'pass') { if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); return true; }"));
check('deep-link dispatch opens tournament via openTournamentHub', game.includes("if (route === 'tournament') { if (typeof openTournamentHub === 'function') openTournamentHub(); setAppDeepLink('tournament'); return true; }"));
check('deep-link dispatch opens profile via openPlayerProfile', game.includes("if (route === 'profile') { if (typeof openPlayerProfile === 'function') openPlayerProfile(); setAppDeepLink('profile'); return true; }"));
check('deep-link dispatch sends tab routes through setAppHomeTab', game.includes('setAppHomeTab(route);\n            return true;'));
check('deep-link dispatch refuses to run before the app shell exists', game.includes("if (!isNativeAppMode() || !appHomeEl) return false;"));
check('tab navigation syncs the URL (shop / settings / fighters-events-home)', game.includes("setAppDeepLink('shop')") && game.includes("setAppDeepLink('settings')") && game.includes('setAppDeepLink(tab);'));
check('shop close hands the URL back to home', game.includes("if (appHomeTab === 'shop') { appHomeTab = 'home'; syncAppHome(); setAppDeepLink('home'); }"));
check('overlay entry points sync the URL (player / season / pass / tournament)', game.includes("setAppDeepLink('profile')") && game.includes("setAppDeepLink('pass')") && game.includes("setAppDeepLink('tournament')"));
check('launch route applies after boot and hash changes are followed', game.includes('if (typeof setTimeout === \'function\') setTimeout(applyAppDeepLink, 0);') && game.includes("window.addEventListener('hashchange', applyAppDeepLink);"));
check('late-bridge retry re-applies the deep link only when it just built the shell', game.includes('if (!hadShell && appHomeEl) applyAppDeepLink();'));
check('URL sync uses replaceState, not pushState (no history entries, no hashchange loop)', game.includes("window.history.replaceState(null, '', `#${route}`);") && !game.includes('history.pushState'));
// Manifest / external-link honesty: external links do NOT open the app yet.
check('AndroidManifest has no VIEW intent filter (external deep links NOT wired — flagged, not claimed)', !/android\.intent\.action\.VIEW/.test(manifest));
check('capacitor config declares no URL scheme / server for external links', !/scheme|server/.test(capConfig));

// --- 3. Dead-code sweep ---
check('dead app events host is gone from game.js (zero references)', !game.includes('appHomeEventsHost'));
check('events-view move is gone (no eventsHost.appendChild)', !game.includes('eventsHost.appendChild'));
check('no host CSS rules remain', !game.includes('#appHomeEventsHost'));
check('web events view is still toggled by setHomeTab in place (nothing live removed)', game.includes("document.getElementById('homeEventsView')?.classList.toggle('is-active', safeTab === 'events');"));
check('live currency-bar move is untouched', game.includes('currencyHost.appendChild(currencyBar);'));
check('syncAppHome still toggles all four live views', game.includes("document.getElementById('appHomeHeroView')?.classList.toggle('is-active'") && game.includes("document.getElementById('appHomeFightersView')?.classList.toggle('is-active'") && game.includes("document.getElementById('appHomeEventsView')?.classList.toggle('is-active'") && game.includes("document.getElementById('appHomeSettingsView')?.classList.toggle('is-active'"));
check('Circuit Pass overlay is live (season-road build PR #154 revived it; this build never touched it)', game.includes("function openSeasonPass() {") && game.includes("id = 'circuitPassOverlay'") && game.includes('ENABLE_SEASON_PASS') && !game.includes("openQuestBoard('season');\n      return;")); // rebase: the old pin asserted the dead overlay (early return to the board); the road is live now, so the pin asserts the road instead
check('app shell build + tab state machine are untouched', game.includes('function buildAppHome() {') && game.includes("let appHomeTab = 'home';") && game.includes('function setAppHomeTab(tab) {'));

// --- Scope guards ---
check('diag gate untouched (?diag=1 still gates the strip)', game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save backup whitelist NOT widened', game.includes("return /^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i.test(String(key || ''));"));
check('no bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-tier2-systems`);
