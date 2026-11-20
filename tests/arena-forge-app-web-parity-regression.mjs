// Arena Forge app web parity + status-bar fix (2026-11-19, Anthony:
// "our app needs to be exactly like the web version js different ui
// etc and we need to eliate all gray space like in the camera status
// bar without status bar overlap").
//
// GOAL 1 — WEB PARITY: every action the web home exposes must be
// reachable in the app shell, calling the SAME opener. The gaps were
// the web ☰ menu / MORE utility row (Brick Bon, Brick Road, Emote
// Pins, Balance Blog, Soul Summoner, Season Hub, Ranked, Tutorial),
// the Overdrive community card in Events, and the per-mode "i" info
// buttons. Fix: a ☰ MORE quick button + bottom sheet (same pattern as
// the tapper sheet), the Overdrive card in renderAppEventsView, info
// buttons beside each event slot, and app-aware routing inside
// openSeason3Hub (its mode buttons used to switch the hidden WEB
// Events tab). No gameplay fork, no new mechanics.
//
// GOAL 2 — STATUS-BAR GRAY SPACE: the app targets SDK 34, so the OS
// does NOT force edge-to-edge — the WebView sat BELOW the status bar
// and the strip around the camera cutout painted the window
// background, which came from the Light theme (light gray). Fix at
// every layer: MainActivity draws edge-to-edge (decor-fits-system-
// windows off + transparent bars) and into the cutout (shortEdges),
// the window + WebView backgrounds are the app's dark blue #06101f,
// and the page root is dark too. Content still stays below the
// cutout via the shell's safe-area-inset-top padding.
//
// Source pins + a vm behavior mirror for the MORE sheet (same pattern
// as the tapper-app-entry suite). App/touch only; website untouched.
//
// Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const indexHtml = read('index.html');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const stylesXml = read('android/app/src/main/res/values/styles.xml');
const mainActivity = read('android/app/src/main/java/com/ppp65isking/arenaforge/MainActivity.java');
const capConfig = read('capacitor.config.ts');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const count = (hay, needle) => hay.split(needle).length - 1;

// --- GOAL 1: MORE sheet — the web ☰ menu in the app ---
check('quick row has a MORE button (web menu equivalent)',
    game.includes('data-app-quick="more"') && game.includes('☰ MORE'));
check('quick-row listener routes more to the sheet',
    game.includes("else if (action === 'more') { if (typeof openAppMoreSheet === 'function') openAppMoreSheet(); }"));
check('openAppMoreSheet is defined and app-mode gated',
    game.includes('function openAppMoreSheet()') && game.includes('if (!isNativeAppMode()) return;'));
check('MORE sheet calls the SAME openers as the web buttons',
    game.includes("if (which === 'ranked' && typeof openRankedQueueUI === 'function') openRankedQueueUI();") &&
    game.includes("else if (which === 'season-hub' && typeof openSeason3Hub === 'function') openSeason3Hub();") &&
    game.includes("else if (which === 'brick-bon' && typeof openBrickBonV2 === 'function') openBrickBonV2('road');") &&
    game.includes("else if (which === 'brick-road' && typeof openBrickRoadModal === 'function') openBrickRoadModal();") &&
    game.includes("else if (which === 'pins' && typeof openPinsHub === 'function') openPinsHub();") &&
    game.includes("else if (which === 'souls' && typeof openSoulSummoner === 'function') openSoulSummoner();") &&
    game.includes("else if (which === 'blog' && typeof openBalanceBlog === 'function') openBalanceBlog();") &&
    game.includes("else if (which === 'tutorial' && typeof launchTutorialMatch === 'function') launchTutorialMatch();"));
check('MORE sheet rows cover all 8 web utility actions',
    game.includes('data-app-more="ranked"') && game.includes('data-app-more="season-hub"') &&
    game.includes('data-app-more="brick-bon"') && game.includes('data-app-more="brick-road"') &&
    game.includes('data-app-more="pins"') && game.includes('data-app-more="souls"') &&
    game.includes('data-app-more="blog"') && game.includes('data-app-more="tutorial"'));
check('ranked row label is live (tier + RP from getRankedTierInfo)',
    game.includes('getRankedTierInfo(playerData?.ranked?.points || 0)') &&
    game.includes('RANKED · ${info.label.toUpperCase()}'));
check('season hub row label is live (season profile, never hardcoded)',
    game.includes('const s = getActiveSeasonProfile();') &&
    game.includes('${s.upperName} HUB'));
check('MORE sheet styles exist (bottom-sheet language, safe-area aware)',
    game.includes('.app-more-sheet{') && game.includes('.app-more-card{') &&
    game.includes('.app-more-btn{') && game.includes('env(safe-area-inset-bottom)'));

// --- GOAL 1: season hub routes to the APP events tab ---
check('season hub has the app-aware tab helper',
    game.includes('const goAppEventsTab = () =>') &&
    game.includes("if (typeof isNativeAppMode === 'function' && isNativeAppMode())") &&
    game.includes("setAppHomeTab('events')"));
check('all 5 hub mode buttons route through the helper',
    count(game, 'goAppEventsTab();') === 5);
check('no hub handler still switches the hidden WEB events tab',
    count(game, "updateShowdownModeUI();setHomeTab('events');") === 0 &&
    game.includes("if (localStorage.getItem(HOME_LAST_TAB_KEY) === 'events') setHomeTab('events');") &&
    game.includes("const focusHomeEvents = () => setHomeTab('events');")); // the only two remaining web uses: restore-last-tab + the web nav — the helper's else-branch is the web path, not a hub handler
check('hub refreshes the app event chip when it picks a mode in app mode',
    game.includes("if (typeof renderAppHomeEventChip === 'function') renderAppHomeEventChip();"));

// --- GOAL 1: Overdrive card in the app Events view ---
check('Events view renders the Overdrive card while the event is live',
    game.includes("if (typeof isOverdriveActive === 'function' && isOverdriveActive())") &&
    game.includes('data-app-overdrive="1"') &&
    game.includes('CORE SURGE OVERDRIVE'));
check('Overdrive card shows the same community totals as the web card',
    game.includes('getOverdriveMainTier()') && game.includes('getOverdriveDailyTier()') &&
    game.includes('OVERDRIVE_MAIN_TIERS.length'));
check('Overdrive card opens the quest board overdrive tab',
    game.includes("if (typeof openQuestBoard === 'function') openQuestBoard('overdrive');"));

// --- GOAL 1: per-mode info buttons on app event slots ---
check('event slots carry an info button beside (never inside) the slot button',
    game.includes('class="app-event-slot-wrap"') &&
    game.includes('</button><button type="button" class="app-event-info"'));
check('info button carries the mode id + daily flag for the reward lookup',
    game.includes('data-app-info="${id}"') && game.includes('data-app-info-daily='));
check('info tap opens the same mode-info modal as the web card',
    game.includes("if (typeof openHomeModeInfo === 'function') openHomeModeInfo(info.dataset.appInfo,") &&
    game.includes('getHomeEventRewardForMode(info.dataset.appInfo)'));
check('slot wrapper + info button styles exist',
    game.includes('.app-event-slot-wrap{') && game.includes('.app-event-info{'));
check('slot button still fills its wrapper (no layout regression)',
    game.includes('.app-event-slot-wrap .app-event-slot{flex:1;width:100%}'));

// --- GOAL 2: status bar — viewport + shell safe areas ---
check('viewport is edge-to-edge (viewport-fit=cover)',
    indexHtml.includes('viewport-fit=cover'));
check('app shell still pads content below the status bar / cutout',
    game.includes('padding-top:max(8px,env(safe-area-inset-top))'));
check('app shell still pads content above the bottom gesture bar',
    game.includes('padding-bottom:max(8px,env(safe-area-inset-bottom))'));
check('page root behind the shell is the app dark blue, never white',
    game.includes('html.native-app{background:#06101f}'));

// --- GOAL 2: status bar — native window draws edge-to-edge ---
check('activity draws into the camera cutout (shortEdges)',
    manifest.includes('android:windowLayoutInDisplayCutoutMode="shortEdges"'));
check('window background is dark on both app themes (no gray strip)',
    count(stylesXml, '<item name="android:windowBackground">#06101f</item>') === 2);
check('status + navigation bars are transparent in the themes',
    count(stylesXml, '<item name="android:statusBarColor">@android:color/transparent</item>') === 2 &&
    count(stylesXml, '<item name="android:navigationBarColor">@android:color/transparent</item>') === 2);
check('themes do not request light status-bar icons on the dark background',
    count(stylesXml, '<item name="android:windowLightStatusBar">false</item>') === 2);
check('MainActivity opts out of decor-fits-system-windows + transparent bars',
    mainActivity.includes('WindowCompat.setDecorFitsSystemWindows(getWindow(), false);') &&
    mainActivity.includes('getWindow().setStatusBarColor(Color.TRANSPARENT);') &&
    mainActivity.includes('getWindow().setNavigationBarColor(Color.TRANSPARENT);') &&
    mainActivity.includes('import androidx.core.view.WindowCompat;') &&
    mainActivity.includes('import android.graphics.Color;'));
check('immersive hide is untouched (bars stay hidden, swipe to peek)',
    mainActivity.includes('controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());'));
check('Capacitor WebView background is the app dark blue (no white flash)',
    capConfig.includes("backgroundColor: '#06101f'"));

// --- Scope guards: nothing else moved ---
check('quick row still has quests / pass / tappers / settings',
    game.includes('data-app-quick="quests"') && game.includes('data-app-quick="pass"') &&
    game.includes('data-app-quick="tappers"') && game.includes('data-app-quick="settings"'));
check('app shell entry points untouched',
    game.includes('function buildAppHome() {') && game.includes('function setAppHomeTab(tab) {') &&
    game.includes('function openAppTapperSheet()'));
check('seasonal accent vars still paint the home (tier2-feel re-skin)',
    game.includes('.native-app #appHome{background:linear-gradient(160deg,var(--app-season-bg1,#06101f)'));
check('no mechanics/numbers changes (bricks 30 for 1st down to -13 for 15th)',
    game.includes('const awards = [30, 26, 22, 18, 14, 10, 6, 2, -1, -3, -5, -7, -9, -11, -13];'));
check('no bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

// --- Behavior mirror: extract + run the real MORE sheet function ---
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    const open = src.indexOf('{', start);
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (line) { if (ch === '\n') line = false; i++; continue; }
        if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
        if (inS) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++; continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i += 2; continue; }
        if (ch === '/' && nxt === '*') { block = true; i += 2; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced ${name}`);
}

function makeEl(tag) {
    const el = {
        tagName: (tag || 'div').toUpperCase(),
        children: [],
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        _handlers: {},
        appendChild(c) { this.children.push(c); return c; },
        remove() { this.removed = true; },
        addEventListener(ev, fn) { this._handlers[ev] = fn; },
        setAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest(sel) { return sel === '[data-app-more]' ? this._closestBtn || null : null; },
    };
    return el;
}

function runSheet() {
    const calls = [];
    const ctx = {
        console,
        playerData: { ranked: { points: 250 } },
        isNativeAppMode: () => true,
        appBuzz: () => {},
        syncAppHome: () => {},
        getRankedTierInfo: () => ({ label: 'Gold', points: 250, nextLabel: 'Platinum' }),
        getActiveSeasonProfile: () => ({ key: 'xplodemis', upperName: 'XPLODEMIS', seasonNumber: 6 }),
        openRankedQueueUI: () => calls.push('ranked'),
        openSeason3Hub: () => calls.push('season-hub'),
        openBrickBonV2: (tab) => calls.push(`brick-bon:${tab}`),
        openBrickRoadModal: () => calls.push('brick-road'),
        openPinsHub: () => calls.push('pins'),
        openSoulSummoner: () => calls.push('souls'),
        openBalanceBlog: () => calls.push('blog'),
        launchTutorialMatch: () => calls.push('tutorial'),
        document: {
            createElement: (tag) => makeEl(tag),
            getElementById: () => null,
            body: {
                children: [],
                appendChild(el) { this.children.push(el); return el; },
                removeChild() {},
            },
        },
    };
    vm.createContext(ctx);
    vm.runInContext(extractFunction(game, 'openAppMoreSheet'), ctx);
    vm.runInContext('openAppMoreSheet()', ctx);
    const sheet = ctx.document.body.children[0];
    return { ctx, calls, sheet };
}

function clickButton(sheet, which) {
    const fakeBtn = { dataset: { appMore: which }, closest: () => fakeBtn };
    sheet._closestBtn = fakeBtn;
    sheet._handlers.click({ target: fakeBtn });
}

{
    const { calls, sheet } = runSheet();
    const html = sheet.innerHTML || '';
    check('mirror: sheet renders all 8 rows',
        ['RANKED', 'XPLODEMIS HUB', 'BRICK BON', 'BRICK ROAD', 'EMOTE PINS', 'SOUL SUMMONER', 'BALANCE BLOG', 'TUTORIAL'].every((t) => html.includes(t)));
    check('mirror: ranked row shows the live tier + RP',
        html.includes('RANKED · GOLD') && html.includes('250 RP') && html.includes('next: Platinum'));
    check('mirror: season hub row shows the live season name',
        html.includes('XPLODEMIS HUB') && html.includes('Season 6 events'));
    const rows = ['ranked', 'season-hub', 'brick-road', 'pins', 'souls', 'blog', 'tutorial'];
    for (const row of rows) clickButton(sheet, row);
    check('mirror: every row calls its web opener',
        rows.every((r) => calls.includes(r)));
    clickButton(sheet, 'brick-bon');
    check('mirror: Brick Bon opens on the road tab',
        calls.includes('brick-bon:road'));
    check('mirror: sheet closes after a tap', sheet.removed === true);
}

console.log(`arena-forge-app-web-parity: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures); process.exitCode = 1; }
