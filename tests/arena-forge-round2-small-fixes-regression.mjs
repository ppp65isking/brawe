// Arena Forge round 2 small fixes (2026-11-19): orientation lock, save-modal
// PASTE, Duels map labels, Season Pass tab rename, ranked/friendly PLAY AGAIN.
// App/touch mode only: no mechanics, numbers, or core-kit changes; website
// untouched; save whitelist NOT widened; diag gate (?diag=1) untouched.
// Source-presence pins + VM behavior mirrors (same pattern as the
// results-flow suite: extract the helper source, run it in a sandbox with
// stubbed globals). Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const css = read('styles.css');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const pkg = JSON.parse(read('package.json'));
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a top-level function declaration out of game.js source.
function extractFunction(src, name) {
    let start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    // Keep the `async ` prefix when the declaration is async, or the
    // extracted body fails to parse (await outside an async function).
    if (src.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
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
            i++;
            continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i++; continue; }
        if (ch === '/' && nxt === '*') { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in ${name}`);
}

// --- 1. ORIENTATION LOCK ---
check('manifest no longer hard-locks landscape', !manifest.includes('sensorLandscape'));
check('manifest orientation is sensor (Auto = follow the device)', manifest.includes('android:screenOrientation="sensor"'));
check('screen-orientation plugin installed (Capacitor 6)', typeof pkg.dependencies['@capacitor/screen-orientation'] === 'string' && pkg.dependencies['@capacitor/screen-orientation'].startsWith('^6.'));
check('orientation pref key + reader exist', game.includes("const APP_ORIENTATION_KEY = 'arenaForgeOrientationV1';") && game.includes('function appOrientationPref()'));
check('orientation pref defaults to auto and rejects junk', game.includes("if (v === 'portrait' || v === 'landscape') return v;") && game.includes("return 'auto';"));
check('orientation apply goes through the Capacitor bridge first (registerPlugin, no bundled JS)', game.includes("cap.registerPlugin('ScreenOrientation', {})"));
check('orientation apply falls back to a direct nativePromise call', game.includes("cap.nativePromise('ScreenOrientation', 'lock', { orientation: want })"));
check('orientation apply falls back to the web Screen Orientation API', game.includes("screen.orientation.lock(want === 'portrait' ? 'portrait-primary' : 'landscape-primary')"));
check('orientation apply unlocks for auto', game.includes("await plugin.unlock();") && game.includes("await cap.nativePromise('ScreenOrientation', 'unlock', {})"));
check('orientation apply never throws into the caller', game.includes('} catch (_) { /* a failed lock is reported, never thrown */ }'));
check('settings row offers Auto / Portrait / Landscape', game.includes('data-orientation-value="auto"') && game.includes('data-orientation-value="portrait"') && game.includes('data-orientation-value="landscape"'));
check('settings orientation tap saves the pref and applies it', game.includes("if (action === 'orientation') {") && game.includes('localStorage.setItem(APP_ORIENTATION_KEY, value)') && game.includes('applyAppOrientation(value).then((ok) => {'));
check('settings orientation tap toasts success and unavailability honestly', game.includes("showToast(`Orientation locked to ${value === 'portrait' ? 'Portrait' : 'Landscape'}`") && game.includes("showToast('Orientation lock is not available on this device — staying in Auto'"));
check('settings render marks the active orientation', game.includes("class=\"${orientationPref === 'auto' ? 'is-active' : ''}\""));
check('orientation segmented-control CSS exists', game.includes('.app-settings-seg{flex:none;display:flex;gap:6px}') && game.includes('.app-settings-seg button.is-active{background:#ff9f1c'));
check('orientation lock is applied at boot and on bridge retry (native app only)', game.includes('if (isNativeAppMode()) void applyAppOrientation(appOrientationPref());'));

// VM: applyAppOrientation path selection
const orientSrc = extractFunction(game, 'applyAppOrientation');
const prefSrc = extractFunction(game, 'appOrientationPref');
function orientSandbox(overrides = {}) {
    const local = { store: {}, getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }, setItem(k, v) { this.store[k] = String(v); } };
    const sandbox = { localStorage: local, console };
    Object.assign(sandbox, overrides);
    vm.createContext(sandbox);
    // appOrientationPref reads the module-level key const, which lives
    // outside the extracted function — declare the same binding here.
    vm.runInContext("const APP_ORIENTATION_KEY = 'arenaForgeOrientationV1';", sandbox);
    vm.runInContext(`${prefSrc}\n${orientSrc}`, sandbox);
    return { sandbox, local };
}
async function runOrient(sandbox, expr) { return vm.runInContext(expr, sandbox); }
{
    // Pref reader: valid values pass through, junk/empty fall back to auto.
    const { sandbox, local } = orientSandbox();
    check('VM orientation pref: unset is auto', (await runOrient(sandbox, 'appOrientationPref()')) === 'auto');
    local.setItem('arenaForgeOrientationV1', 'portrait');
    check('VM orientation pref: portrait reads back', (await runOrient(sandbox, 'appOrientationPref()')) === 'portrait');
    local.setItem('arenaForgeOrientationV1', 'sideways');
    check('VM orientation pref: junk falls back to auto', (await runOrient(sandbox, 'appOrientationPref()')) === 'auto');
}
{
    // Path 1: registered plugin proxy wins, lock + unlock recorded.
    const calls = [];
    const plugin = { lock: async (o) => { calls.push(['lock', o.orientation]); }, unlock: async () => { calls.push(['unlock']); } };
    const { sandbox } = orientSandbox({ window: { Capacitor: { Plugins: { ScreenOrientation: plugin } } }, screen: {} });
    check('VM orientation: registered plugin locks portrait', (await runOrient(sandbox, 'applyAppOrientation("portrait")')) === true && calls.some((c) => c[0] === 'lock' && c[1] === 'portrait'));
    check('VM orientation: registered plugin unlocks for auto', (await runOrient(sandbox, 'applyAppOrientation("auto")')) === true && calls.some((c) => c[0] === 'unlock'));
}
{
    // Path 2: bridge registerPlugin (no JS implementation) routes to native.
    const calls = [];
    const plugin = { lock: async (o) => { calls.push(['lock', o.orientation]); }, unlock: async () => { calls.push(['unlock']); } };
    let registeredName = null;
    const cap = { registerPlugin: (name) => { registeredName = name; return plugin; }, isPluginAvailable: (n) => n === 'ScreenOrientation' };
    const { sandbox } = orientSandbox({ window: { Capacitor: cap }, screen: {} });
    check('VM orientation: bridge registerPlugin resolves ScreenOrientation', (await runOrient(sandbox, 'applyAppOrientation("landscape")')) === true && registeredName === 'ScreenOrientation' && calls.some((c) => c[0] === 'lock' && c[1] === 'landscape'));
    check('VM orientation: bridge registerPlugin unlocks for auto', (await runOrient(sandbox, 'applyAppOrientation("auto")')) === true && calls.some((c) => c[0] === 'unlock'));
}
{
    // Path 3: raw nativePromise when nothing is registered.
    const calls = [];
    const cap = { nativePromise: async (plugin, method, opts) => { calls.push([plugin, method, opts]); } };
    const { sandbox } = orientSandbox({ window: { Capacitor: cap }, screen: {} });
    check('VM orientation: nativePromise locks portrait', (await runOrient(sandbox, 'applyAppOrientation("portrait")')) === true && calls.some((c) => c[0] === 'ScreenOrientation' && c[1] === 'lock' && c[2].orientation === 'portrait'));
    check('VM orientation: nativePromise unlocks for auto', (await runOrient(sandbox, 'applyAppOrientation("auto")')) === true && calls.some((c) => c[1] === 'unlock'));
}
{
    // Path 4: web Screen Orientation API, no Capacitor at all.
    const calls = [];
    const { sandbox } = orientSandbox({ window: {}, screen: { orientation: { lock: async (o) => { calls.push(o); }, unlock: () => { calls.push('unlock'); } } } });
    check('VM orientation: web API locks portrait-primary', (await runOrient(sandbox, 'applyAppOrientation("portrait")')) === true && calls.includes('portrait-primary'));
    check('VM orientation: web API auto returns true (manifest default)', (await runOrient(sandbox, 'applyAppOrientation("auto")')) === true);
}
{
    // No path at all: reports false instead of throwing.
    const { sandbox } = orientSandbox({ window: {}, screen: {} });
    check('VM orientation: nothing available returns false', (await runOrient(sandbox, 'applyAppOrientation("landscape")')) === false);
    check('VM orientation: junk pref treated as auto', (await runOrient(sandbox, 'applyAppOrientation("sideways")')) === true);
}

// --- 2. PASTE-FROM-CLIPBOARD ---
check('save modal has a PASTE button next to IMPORT', game.includes('id="saveCodePasteBtn"') && game.includes('>📋 PASTE</button>') && game.includes('id="saveCodeImportBtn"'));
check('save modal size is unchanged (same panel geometry)', game.includes('width:min(560px,94vw);max-height:88vh;'));
check('clipboard reader helper exists and uses navigator.clipboard.readText', game.includes('async function readSaveCodeFromClipboard()') && game.includes('navigator.clipboard?.readText'));
check('clipboard reader distinguishes denied / empty / unsupported', game.includes("reason: 'denied'") && game.includes("reason: 'empty'") && game.includes("reason: 'unsupported'"));
check('PASTE handler fills the import field and toasts on success', game.includes("document.getElementById('saveCodePasteBtn')?.addEventListener('click'") && game.includes("showToast('Save code pasted!', '#5ec4ff')"));
check('PASTE denial explains itself and points at long-press paste', game.includes("title: 'CLIPBOARD BLOCKED'") && game.includes('long-press the field above and tap Paste'));
check('PASTE empty clipboard explains itself', game.includes("title: 'CLIPBOARD EMPTY'") && game.includes('copy a save code first, then tap PASTE'));
check('PASTE unsupported WebView explains itself', game.includes("title: 'PASTE NOT AVAILABLE'"));
check('import-success GOT IT wait is untouched (build C behavior)', game.includes("showAppConfirmSheet({ title: 'SAVE IMPORTED', message: 'Save imported! BRAWE will reload now.', onClose: () => location.reload() })"));
check('save whitelist NOT widened: decode still requires the URL-safe base64 alphabet', game.includes("if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) throw new Error('Save code has characters outside the URL-safe base64 alphabet');"));
check('save whitelist NOT widened: import still goes through importBraweSaveCode', game.includes('importBraweSaveCode(rawCode)'));

// VM: readSaveCodeFromClipboard outcomes
const pasteSrc = extractFunction(game, 'readSaveCodeFromClipboard');
async function runPaste(navigatorValue) {
    const sandbox = { navigator: navigatorValue, console };
    vm.createContext(sandbox);
    vm.runInContext(pasteSrc, sandbox);
    return vm.runInContext('readSaveCodeFromClipboard()', sandbox);
}
{
    const ok = await runPaste({ clipboard: { readText: async () => '  ABC-123_def  ' } });
    check('VM paste: clipboard text is read and trimmed', ok.ok === true && ok.text === 'ABC-123_def');
    const empty = await runPaste({ clipboard: { readText: async () => '   ' } });
    check('VM paste: blank clipboard reports empty', empty.ok === false && empty.reason === 'empty');
    const denied = await runPaste({ clipboard: { readText: async () => { throw new Error('NotAllowedError'); } } });
    check('VM paste: denial reports denied, never throws', denied.ok === false && denied.reason === 'denied');
    const unsupported = await runPaste({});
    check('VM paste: no clipboard API reports unsupported', unsupported.ok === false && unsupported.reason === 'unsupported');
}

// --- 3. DUELS MAP LABELS ---
check('duels slot gets the Duels Arena label', game.includes("if (id === 'duels') return 'Duels Arena';"));
check('friendly slot keeps no map line (map is picked per match)', game.includes("if (id === 'custom_clash') return null;"));
check('tournament keeps its own named map', game.includes("if (id === 'tournament') return TOURNAMENT_MAP_NAME;"));

// VM: appEventMapName
const mapSrc = extractFunction(game, 'appEventMapName');
{
    const sandbox = {
        TOURNAMENT_MAP_NAME: "Champion's Ring",
        getConstructionMapName: () => 'S-Curve Depot',
        getActiveShowdownTheme: () => ({ name: 'Ember Wastes' }),
        console,
    };
    vm.createContext(sandbox);
    vm.runInContext(mapSrc, sandbox);
    const label = (id) => vm.runInContext(`appEventMapName('${id}')`, sandbox);
    check('VM map: duels is Duels Arena', label('duels') === 'Duels Arena');
    check('VM map: deleted ids fall back to the showdown theme', label('tower_duels') === 'Ember Wastes' && label('fused') === 'Ember Wastes');
    check('VM map: friendly battle has no map line', label('custom_clash') === null);
    check('VM map: tournament keeps Champion\'s Ring', label('tournament') === "Champion's Ring");
    check('VM map: mirror keeps Mirror Arena', label('mirror') === 'Mirror Arena');
    check('VM map: showdown falls back to the active theme', label('solo') === 'Ember Wastes');
}

// --- 4. SEASON TAB RENAME ---
check('season tab is named Season Quests (fixes round: pass is out of quests)', game.includes("makeTab('season', '⚡ Season Quests')"));
check('board subtitle no longer climbs the Season Pass', game.includes("boardSubtitle.textContent = 'Complete quests and claim rewards.';"));
check('dead-code pass overlay keeps its internal id (not user-facing)', game.includes("overlay.id = 'circuitPassOverlay'"));

// --- 5. PLAY AGAIN SAME-MODE ---
const playAgainSrc = extractFunction(game, 'playAgainFromResults');
check('play-again helper re-queues ranked via the ranked launch path', playAgainSrc.includes("if (typeof isRankedMatch !== 'undefined' && isRankedMatch && typeof openRankedQueueUI === 'function') {") && playAgainSrc.includes('openRankedQueueUI();'));
check('play-again helper replays friendly via the friendly launch path', playAgainSrc.includes("if (typeof isFriendlyBattle !== 'undefined' && isFriendlyBattle && typeof launchFriendlyBattle === 'function'") && playAgainSrc.includes('launchFriendlyBattle({'));
check('play-again friendly replay passes the whole saved config (mode/map/power/enemy/mods)', playAgainSrc.includes('mode: friendlyBattleConfig.mode,') && playAgainSrc.includes('mapIndex: friendlyBattleConfig.mapIndex,') && playAgainSrc.includes('powerRule: friendlyBattleConfig.powerRule,') && playAgainSrc.includes('enemyPool: friendlyBattleConfig.enemyPool,') && playAgainSrc.includes('modifiers: Array.isArray(friendlyBattleConfig.modifiers) ? friendlyBattleConfig.modifiers.slice() : []'));
check('play-again ranked/friendly branches run before the casual PLAY click', playAgainSrc.indexOf('openRankedQueueUI();') < playAgainSrc.indexOf("document.getElementById('startMatch')?.click();") && playAgainSrc.indexOf('launchFriendlyBattle({') < playAgainSrc.indexOf("document.getElementById('startMatch')?.click();"));
check('play-again ranked/friendly branches use typeof guards (old VM sandboxes stay valid)', playAgainSrc.includes("typeof isRankedMatch !== 'undefined'") && playAgainSrc.includes("typeof isFriendlyBattle !== 'undefined'"));
check('play-again still refuses tournament matches', playAgainSrc.includes('if (isTournamentMatch) return false;'));
check('play-again duels branch is unchanged', playAgainSrc.includes('if (isDuels) {') && playAgainSrc.includes('startDuelsRound();'));

// VM: playAgainFromResults routing
function playAgainSandbox(overrides = {}) {
    const calls = [];
    const startBtn = { clicked: false, click() { this.clicked = true; } };
    const overlay = { removed: false, remove() { this.removed = true; } };
    const sandbox = {
        isTournamentMatch: false, isDuels: false, isTowerDuelEvent: false, isTowerDuelsMode: false,
        isRankedMatch: false, isFriendlyBattle: false, friendlyBattleConfig: null,
        openRankedQueueUI() { calls.push('openRankedQueueUI'); },
        launchFriendlyBattle(cfg) { calls.push(['launchFriendlyBattle', cfg]); },
        clearShowdownModifier() { calls.push('clearShowdownModifier'); },
        startDuelsRound() { calls.push('startDuelsRound'); },
        generateCubes() { calls.push('generateCubes'); },
        playerScore: 0, botScore: 0, savedPlayerSuper: 0, savedPlayerHyper: 0, savedBotSuper: 0, savedBotHyper: 0,
        hasHandledGameOver: true, WORLD_W: 2200, WORLD_H: 1800,
        cubes: [], powerups: [], amplifierToolboxes: [], amplifierScrewZones: [], skeleParachutes: [], skelePortals: [],
        brawlerSelect: { disabled: false }, homeScreen: { style: { display: 'flex' } },
        document: { getElementById(id) { if (id === 'topbar') return { textContent: '' }; if (id === 'startMatch') return startBtn; return null; } },
        console,
    };
    Object.assign(sandbox, overrides);
    vm.createContext(sandbox);
    vm.runInContext(playAgainSrc, sandbox);
    return { sandbox, calls, startBtn, overlay };
}
{
    // Ranked: re-queues into ranked, does NOT click casual PLAY.
    const { sandbox, calls, startBtn, overlay } = playAgainSandbox({ isRankedMatch: true });
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(sandbox, { __ov: overlay }));
    check('VM play-again: ranked returns true', ret === true);
    check('VM play-again: ranked re-opens the ranked queue', calls.includes('openRankedQueueUI'));
    check('VM play-again: ranked does NOT click casual PLAY', !startBtn.clicked);
    check('VM play-again: ranked overlay removed first', overlay.removed);
}
{
    // Friendly: replays the exact saved config, modifiers copied.
    const cfg = { mode: 'brawe_ball', mapIndex: 2, powerRule: 'max', enemyPool: 'same', modifiers: ['hyper_overdrive', 'friendly_fire'] };
    const { sandbox, calls, startBtn, overlay } = playAgainSandbox({ isFriendlyBattle: true, friendlyBattleConfig: cfg });
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(sandbox, { __ov: overlay }));
    const launched = calls.find((c) => Array.isArray(c) && c[0] === 'launchFriendlyBattle');
    check('VM play-again: friendly returns true', ret === true);
    check('VM play-again: friendly relaunches via launchFriendlyBattle', !!launched);
    check('VM play-again: friendly replays the same mode/map/power/enemy', !!launched && launched[1].mode === 'brawe_ball' && launched[1].mapIndex === 2 && launched[1].powerRule === 'max' && launched[1].enemyPool === 'same');
    check('VM play-again: friendly modifiers are copied, not shared', !!launched && Array.isArray(launched[1].modifiers) && launched[1].modifiers.length === 2 && launched[1].modifiers !== cfg.modifiers);
    check('VM play-again: friendly does NOT click casual PLAY', !startBtn.clicked);
}
{
    // Friendly with no modifiers: launches with an empty list.
    const { sandbox, calls } = playAgainSandbox({ isFriendlyBattle: true, friendlyBattleConfig: { mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: null } });
    vm.runInContext('playAgainFromResults(__ov)', Object.assign(sandbox, { __ov: { remove() {} } }));
    const launched = calls.find((c) => Array.isArray(c) && c[0] === 'launchFriendlyBattle');
    check('VM play-again: friendly without modifiers launches with []', !!launched && Array.isArray(launched[1].modifiers) && launched[1].modifiers.length === 0);
}
{
    // No ranked/friendly flags at all (old sandboxes): falls through to casual PLAY.
    const { sandbox, calls, startBtn } = playAgainSandbox();
    delete sandbox.isRankedMatch;
    delete sandbox.isFriendlyBattle;
    delete sandbox.friendlyBattleConfig;
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(sandbox, { __ov: { remove() {} } }));
    check('VM play-again: no session flags still rematches via PLAY', ret === true && startBtn.clicked);
    check('VM play-again: no session flags does not open the ranked queue', !calls.includes('openRankedQueueUI'));
}
{
    // Tournament guard still holds even for a ranked flag.
    const { sandbox, startBtn } = playAgainSandbox({ isTournamentMatch: true, isRankedMatch: true });
    const ov = { removed: false, remove() { this.removed = true; } };
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(sandbox, { __ov: ov }));
    check('VM play-again: tournament still returns false', ret === false);
    check('VM play-again: tournament overlay stays put', !ov.removed);
    check('VM play-again: tournament launches nothing', !startBtn.clicked);
}

// --- Scope guards ---
check('diag gate untouched (?diag=1 still the only trigger)', game.includes(".get('diag') === '1'"));
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));
check('no banned bare word in styles.css', !/\bcluster\b/i.test(css));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-small-fixes`);
