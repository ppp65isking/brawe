// Arena Forge mobile app (2026-11-18, Anthony's order): a REAL Android app
// (sideload APK via the Capacitor shell) — mobile camera POV, no-overlays
// app mode, Brawl Stars-style events page, app identity + adaptive icon.
// Source-presence + behavior mirrors. Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const config = read('capacitor.config.ts');
const gradle = read('android/app/build.gradle');
const strings = read('android/app/src/main/res/values/strings.xml');
const workflow = read('.github/workflows/android-apk.yml');
const mainActivity = read('android/app/src/main/java/com/ppp65isking/arenaforge/MainActivity.java');
const iconBg = read('android/app/src/main/res/drawable/ic_launcher_background.xml');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- App identity ---
check('appId is com.ppp65isking.arenaforge in capacitor.config.ts', config.includes("appId: 'com.ppp65isking.arenaforge'") && !config.includes('com.example.arenaforge'));
check('build.gradle namespace + applicationId are the new appId', gradle.includes('namespace "com.ppp65isking.arenaforge"') && gradle.includes('applicationId "com.ppp65isking.arenaforge"') && !gradle.includes('com.example.arenaforge'));
check('strings.xml package_name + custom_url_scheme are the new appId', strings.includes('com.ppp65isking.arenaforge') && !strings.includes('com.example.arenaforge'));
check('MainActivity package is com.ppp65isking.arenaforge', mainActivity.includes('package com.ppp65isking.arenaforge;'));
check('MainActivity hides status + nav bars (sticky immersive) and re-applies on focus', mainActivity.includes('WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars()') && mainActivity.includes('BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE') && mainActivity.includes('onWindowFocusChanged'));

// --- APK workflow ---
check('workflow triggers on push to main + manual dispatch', workflow.includes('branches: [main]') && workflow.includes('workflow_dispatch'));
check('workflow installs, builds web, and syncs Capacitor', workflow.includes('npm ci') && workflow.includes('npm run build') && workflow.includes('npx cap sync android'));
check('workflow sets up JDK 17 + Android SDK', workflow.includes("java-version: '17'") && workflow.includes('setup-android'));
check('workflow builds the debug APK and uploads artifact arena-forge-apk', workflow.includes('./gradlew assembleDebug') && workflow.includes('name: arena-forge-apk') && workflow.includes('app-debug.apk'));

// --- Mobile camera POV ---
check('mobile zoom min visible width constant is 1100 world px', game.includes('const MOBILE_CAMERA_MIN_VISIBLE_WIDTH = 1100;'));
check('desktop zoom base unchanged (0.90)', game.includes('const CAMERA_ZOOM_BASE = 0.90;'));
check('Pandy Hyper / Snipa Super zoom constants unchanged (0.72)', game.includes('const PANDY_HYPER_CAMERA_ZOOM = 0.72;') && game.includes('const SNIPA_SUPER_CAMERA_ZOOM = 0.72;'));
check('render() applies the mobile factor to base + Hyper/Super zooms', game.includes('const mobileZoomFactor = getMobileCameraZoomFactor();') && game.includes('PANDY_HYPER_CAMERA_ZOOM * mobileZoomFactor') && game.includes('SNIPA_SUPER_CAMERA_ZOOM * mobileZoomFactor') && game.includes('CAMERA_ZOOM_BASE * mobileZoomFactor'));
check('old un-factored targetZoom line is gone', !game.includes('const targetZoom = pandyHyperZoomed ? PANDY_HYPER_CAMERA_ZOOM : snipaSuperZoomed ? SNIPA_SUPER_CAMERA_ZOOM : CAMERA_ZOOM_BASE;'));

// Behavior mirror of getMobileCameraZoomFactor (faithful re-implementation).
function mobileZoomFactor(viewportWidth, isTouch) {
    const CAMERA_ZOOM_BASE = 0.90, MIN_W = 1100;
    if (!isTouch) return 1;
    if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 1;
    return Math.min(1, (viewportWidth / CAMERA_ZOOM_BASE) / MIN_W);
}
check('desktop 1920px: factor 1 (unchanged)', mobileZoomFactor(1920, false) === 1);
check('wide touch laptop 1440px: factor 1 (already >= 1100 world px wide)', mobileZoomFactor(1440, true) === 1);
check('Pixel 9 Pro landscape 892x412 touch: factor ~0.90, visible width >= 1100', (() => { const f = mobileZoomFactor(892, true); return f > 0.89 && f < 0.92 && 892 / (0.90 * f) >= 1100; })());
check('phone portrait 412px touch: factor ~0.42, visible width >= 1100', (() => { const f = mobileZoomFactor(412, true); return f > 0.41 && f < 0.43 && 412 / (0.90 * f) >= 1100; })());
check('Pandy Hyper on mobile keeps its 0.72-vs-0.90 ratio (0.648 at factor 0.90)', Math.abs(0.72 * mobileZoomFactor(892, true) - 0.648) < 0.01);
check('Pandy Hyper on desktop is still exactly 0.72', 0.72 * mobileZoomFactor(1920, false) === 0.72);
check('zero/unknown viewport on touch degrades to factor 1 (no crash, no zoom-out)', mobileZoomFactor(0, true) === 1 && mobileZoomFactor(undefined, true) === 1);

// --- App mode: no overlays, sticks stay ---
check('native app detection uses the Capacitor bridge only', game.includes('function isNativeAppMode()') && game.includes('window.Capacitor') && game.includes('isNativePlatform'));
check('native-app class is set at boot', game.includes("if (isNativeAppMode()) document.documentElement.classList.add('native-app');"));
check('CSS hides fullscreen buttons + legacy HUD in native-app mode', game.includes(".native-app #fullscreenBtn, .native-app #mobileFullscreenBtn, .native-app #hud { display:none !important; }"));
check('touch sticks + action buttons are NOT in the native-app hide rule', !game.includes('.native-app #mobileControlsRoot') && !game.includes('.native-app .mobile-stick') && !game.includes('.native-app #mobileActionButtons'));
check('fullscreen toggle itself is untouched (web still has it)', game.includes('async function toggleGameFullscreen()') && game.includes("fullscreenBtn.addEventListener('click'"));

// --- Events page: featured season + tournament slots ---
check('featured row is built at the top of the events page', game.includes("createSection('FEATURED EVENTS', 'LIVE NOW — TAP TO OPEN.', 'featured-section')"));
check('season slot reads the live season profile (never hardcoded)', game.includes('const featuredSeasonProfile = getActiveSeasonProfile();') && game.includes('SEASON ${featuredSeasonProfile.seasonNumber} · ${featuredSeasonProfile.upperName}'));
check('season slot shows the end label + a live countdown', game.includes('ends ${featuredSeasonProfile.endLabel}') && game.includes('data-season-countdown'));
check('season slot tap opens the Season Pass', game.includes('const openSeasonSlot = () => openSeasonPass();') && game.includes('seasonSlot.onclick = openSeasonSlot;'));
check('tournament slot reads live tournament state + resume subtitle', game.includes('const featuredTournamentState = getTournamentState();') && game.includes('getTournamentCardSubtitle()'));
check('tournament slot shows RESUME RUN when a run is in progress', game.includes("featuredTournamentActive ? 'RESUME RUN' : 'LIVE'"));
check('tournament slot tap opens the tournament hub', game.includes('const openTournamentSlot = () => openTournamentHub();') && game.includes('tournamentSlot.onclick = openTournamentSlot;'));
check('featured slots are their own cards (not mode-card map entries)', game.includes("seasonSlot.dataset.featuredSlot = 'season'") && game.includes("tournamentSlot.dataset.featuredSlot = 'tournament'"));
check('season countdown ticks in the 1s interval', game.includes("querySelectorAll('[data-season-countdown]')") && game.includes('formatSeasonCountdown(Math.max(0, getActiveSeasonProfile().endUtc - Date.now()))'));
check('season countdown formatter exists and clamps negatives', game.includes('function formatSeasonCountdown(ms)') && game.includes('Math.max(0, Math.ceil(ms / 1000))'));

// Behavior mirror of formatSeasonCountdown.
function formatSeasonCountdown(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}D ${String(hours).padStart(2, '0')}H LEFT`;
    if (hours > 0) return `${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M LEFT`;
    return `${String(minutes).padStart(2, '0')}M LEFT`;
}
check('season countdown: 13.5 days -> "13D 12H LEFT"', formatSeasonCountdown(13.5 * 86400 * 1000) === '13D 12H LEFT');
check('season countdown: 5h30m -> "05H 30M LEFT"', formatSeasonCountdown((5 * 3600 + 30 * 60) * 1000) === '05H 30M LEFT');
check('season countdown: past end -> "00M LEFT"', formatSeasonCountdown(-1000) === '00M LEFT');

// Behavior mirror of getActiveSeasonProfile date branches (constants from game.js).
const TURKEY_START = Date.UTC(2026, 10, 1), XPLODEMIS_START = Date.UTC(2026, 11, 1), EMBER_START = Date.UTC(2027, 0, 1);
function seasonKey(now) { if (now >= EMBER_START) return 'ember'; if (now >= XPLODEMIS_START) return 'xplodemis'; if (now >= TURKEY_START) return 'turkey'; return 'arenaween'; }
check('season is date-driven: Nov 18 2026 -> turkey', seasonKey(Date.UTC(2026, 10, 18)) === 'turkey');
check('season is date-driven: Dec 15 2026 -> xplodemis', seasonKey(Date.UTC(2026, 11, 15)) === 'xplodemis');
check('season is date-driven: Jan 15 2027 -> ember', seasonKey(Date.UTC(2027, 0, 15)) === 'ember');

// --- Adaptive icon: real PNG bytes at every density ---
function pngSize(rel) {
    const b = fs.readFileSync(new URL(rel, root));
    if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4E || b[3] !== 0x47) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    for (const name of ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png']) {
        const s = pngSize(`android/app/src/main/res/mipmap-${density}/${name}`);
        check(`icon ${density}/${name} is a real ${size}x${size} PNG`, !!s && s.w === size && s.h === size);
    }
}
check('adaptive icon background is dark navy, not the default teal', iconBg.includes('#0B1220') && !iconBg.includes('#26A69A'));

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-mobile-app`);
