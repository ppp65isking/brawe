// Arena Forge round 2 — sound mute + progress reset (2026-11-19):
// MASTER MUTE (pref arenaForgeMutedV1, default OFF) pushes into every
// audio module's setEnabled, so voice lines + Hypercharge SFX go silent
// immediately with no reload; PROGRESS RESET double-confirms through the
// app-styled sheet, wipes the real save keys, then reloads to a fresh
// home. The mute is verified against the REAL modules/audio/* files
// (stubbed Audio only), not just stubs of the game code. Source-presence
// + real behavior. Never uses the banned bare word.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const pristine = fs.readFileSync(new URL('../.backups/game.js.35098e4a-pristine', import.meta.url), 'utf8');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');

// --- extract a `function NAME(...) {...}` by brace counting (comments and
// strings skipped, same approach as the save-code suite) ---
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    assert.ok(start !== -1, `${name} exists in game.js`);
    const brace = src.indexOf('{', start);
    assert.ok(brace !== -1, `${name} has a body`);
    let depth = 0;
    let i = brace;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (; i < src.length; i++) {
        const ch = src[i];
        const next = src[i + 1];
        if (lineComment) { if (ch === '\n') lineComment = false; continue; }
        if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
        if (quote) {
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === quote) quote = null;
            continue;
        }
        if (ch === '/' && next === '/') { lineComment = true; continue; }
        if (ch === '/' && next === '*') { blockComment = true; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    throw new Error(`could not extract ${name}: unbalanced braces`);
}

const count = (hay, needle) => hay.split(needle).length - 1;

let passed = 0;
let failed = 0;
const failures = [];
function check(name, cond) {
    if (cond) passed++;
    else { failed++; failures.push(name); }
}

// ================= Mute: source presence =================
check('mute pref key is exactly arenaForgeMutedV1', game.includes("const APP_MUTED_KEY = 'arenaForgeMutedV1';"));
check('mute helpers defined exactly once each',
    count(game, 'function appSoundMuted(') === 1 &&
    count(game, 'function applyAppSoundMuted(') === 1 &&
    count(game, 'function appSetSoundMuted(') === 1);
check('mute list names all 10 audio modules (9 voice + Hypercharge SFX)',
    ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice', 'BraweHyperchargeSfx']
        .every((n) => game.includes(`'${n}'`)));
check('mute list matches the audio call sites in game.js (no module missed, no extra)',
    (() => {
        const called = new Set([...game.matchAll(/window\.(Brawe\w+)\?\.(?:play|playActivation)\(/g)].map((m) => m[1]));
        const listed = [...game.match(/const APP_AUDIO_MODULE_NAMES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
        return called.size === 10 && listed.length === 10 && listed.every((n) => called.has(n)) && [...called].every((n) => listed.includes(n));
    })());
check('mute pushes setEnabled(!muted) into each module', game.includes('mod.setEnabled(!muted)'));
check('mute is applied at boot and again on load', game.includes('applyAppSoundMuted();\n    window.addEventListener(\'load\', applyAppSoundMuted);'));
check('mute never touches volumes (on/off only: no volume in the mute functions)',
    !/volume/i.test(extractFunction(game, 'appSoundMuted') + extractFunction(game, 'applyAppSoundMuted') + extractFunction(game, 'appSetSoundMuted')));
check('no music path exists to mute (no AudioContext(, no speechSynthesis., no new Audio( in code)',
    !game.includes('AudioContext(') && !game.includes('speechSynthesis.') && !game.includes('new Audio('));
check('muted pref defaults to sound ON (only "1" means muted)', game.includes("return localStorage.getItem(APP_MUTED_KEY) === '1';"));
check('mute survives restarts: pref is a localStorage key, not an in-memory flag',
    game.includes("localStorage.setItem(APP_MUTED_KEY, muted ? '1' : '0')"));

// ================= Settings rows + handler =================
check('Settings has a SOUND row next to the HAPTICS row',
    game.indexOf('data-app-settings="haptics"') !== -1 &&
    game.indexOf('data-app-settings="sound"') > game.indexOf('data-app-settings="haptics"') &&
    game.includes('<b>🔇 SOUND</b>'));
check('sound row label says it takes effect without a restart', game.includes('Turning it off silences them right away'));
check('sound row shows ON/OFF from the pref with the is-off class when muted',
    game.includes("class=\"${muted ? 'is-off' : ''}\" data-app-settings=\"sound\"") &&
    game.includes('${muted ? \'ON\' : \'OFF\'}'));
check('Settings has a destructive ERASE ALL PROGRESS row',
    game.includes('data-app-settings="reset"') && game.includes('<b>🗑️ ERASE ALL PROGRESS</b>') &&
    game.includes('class="app-settings-row is-danger"'));
check('danger row has red CSS (button + border)', game.includes('.app-settings-row.is-danger>button{background:#ff5470;color:#fff}') &&
    game.includes('.app-settings-row.is-danger{border-color:rgba(255,84,112,.5)}'));
check('settings handler toggles sound and re-renders', game.includes("appSetSoundMuted(!appSoundMuted());"));
check('settings handler routes reset to the reset flow', game.includes("openAppProgressResetFlow();"));

// ================= Reset: source presence =================
check('reset helpers defined exactly once each',
    count(game, 'function appProgressResetKeys(') === 1 &&
    count(game, 'function wipeAppProgress(') === 1 &&
    count(game, 'function openAppProgressResetFlow(') === 1);
check('reset covers the save-code whitelist via isBraweBackupStorageKey', game.includes('isBraweBackupStorageKey(key) || /^arenaForge/i.test(key)'));
check('reset covers the two keys neither pattern catches',
    game.includes("'brickBonClaimed'") && game.includes("'brawe_gadget_test_results_v1'"));
check('reset flow is two confirm sheets (double-confirm, no single-tap wipe)',
    count(extractFunction(game, 'openAppProgressResetFlow'), 'showAppConfirmSheet({') === 3);
check('first sheet explains exactly what is wiped and that it cannot be undone',
    game.includes('This erases your coins, souls, gems, unlocked brawlers, season progress, tournament runs and settings on this device. A save code will not bring it back. This cannot be undone.'));
check('second sheet is a distinct explicit confirm', game.includes("title: 'ARE YOU SURE?'") && game.includes("confirmText: 'ERASE EVERYTHING'"));
check('wipe happens only inside the second sheet confirm, never the first',
    (() => {
        const flow = extractFunction(game, 'openAppProgressResetFlow');
        const first = flow.indexOf('onConfirm: () => {');
        const wipe = flow.indexOf('wipeAppProgress();');
        return wipe > first && flow.indexOf('wipeAppProgress();', first) !== -1;
    })());
check('reset reloads to a fresh home (import-flow pattern) and only after the wipe',
    (() => {
        const flow = extractFunction(game, 'openAppProgressResetFlow');
        return count(flow, 'location.reload()') === 1 && flow.indexOf('location.reload()') > flow.indexOf('wipeAppProgress();');
    })());
check('reset uses the app sheet, never a native confirm/alert',
    (() => {
        const flow = extractFunction(game, 'openAppProgressResetFlow');
        return !/\bconfirm\s*\(/.test(flow) && !/\balert\s*\(/.test(flow);
    })());
check('save whitelist NOT widened (isBraweBackupStorageKey byte-identical to pristine)',
    extractFunction(game, 'isBraweBackupStorageKey') === extractFunction(pristine, 'isBraweBackupStorageKey'));
check('diag gate untouched (?diag=1 still gates the strip)', game.includes("get('diag') === '1'"));
check('save-code modal behavior untouched (Settings still opens it)', game.includes("if (action === 'save') { if (typeof openSaveCodeModal === 'function') openSaveCodeModal(); return; }"));

// ================= Real behavior: VM with the REAL audio modules =================
class FakeAudio {
    constructor(url) { this.src = url; this.volume = 1; this.preload = ''; this.currentTime = 0; FakeAudio.played.push(url); }
    addEventListener() {}
    play() { return Promise.resolve(); }
}
FakeAudio.played = [];
class FakeStorage {
    constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
    get length() { return this.map.size; }
    key(i) { return [...this.map.keys()][i] ?? null; }
    getItem(k) { const v = this.map.get(k); return v === undefined ? null : v; }
    setItem(k, v) { this.map.set(k, String(v)); }
    removeItem(k) { this.map.delete(k); }
}

const sheets = [];
const ctx = {
    console,
    Audio: FakeAudio,
    document: { baseURI: 'http://localhost/', hidden: false },
    location: { reload: () => { ctx.__reloaded = true; } },
    navigator: {},
    localStorage: new FakeStorage(),
    showAppConfirmSheet: (opts) => { sheets.push(opts); return { dismissed: false }; },
    __reloaded: false,
};
ctx.window = ctx;
vm.createContext(ctx);
const run = (code) => vm.runInContext(code, ctx);

// Load the REAL audio modules (bootstrap.js order) into the context.
for (const f of ['outlit-voicelines.js', 'fuser-voicelines.js', 'hypercharge-sfx.js', 'voodoyou-voicelines.js', 'pandy-voicelines.js', 'snipa-voicelines.js', 'bookworm-voicelines.js', 'freezeon-voicelines.js', 'driller-voicelines.js', 'gravy-voicelines.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../modules/audio/${f}`, import.meta.url), 'utf8'), ctx);
}
// Load the mute + reset helpers out of game.js into the same context.
for (const name of ['appSoundMuted', 'applyAppSoundMuted', 'appSetSoundMuted', 'appProgressResetKeys', 'wipeAppProgress', 'openAppProgressResetFlow', 'isBraweBackupStorageKey']) {
    vm.runInContext(extractFunction(game, name), ctx);
}
for (const re of [/const APP_MUTED_KEY = '[^']+';/, /const APP_AUDIO_MODULE_NAMES = \[[^\]]*\];/, /const APP_PROGRESS_RESET_EXTRA_KEYS = \[[^\]]*\];/]) {
    const m = game.match(re);
    assert.ok(m, `const found: ${re}`);
    vm.runInContext(m[0], ctx);
}

const MODULES = ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice', 'BraweHyperchargeSfx'];
// Only six modules actually play audio today (the other four are silent
// text stubs — see the mute comment in game.js — with no setEnabled hook
// and no audio output at all).
const AUDIO_MODULES = ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweHyperchargeSfx'];
const STUB_MODULES = ['BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice'];
check('all 10 voice/SFX modules loaded; the 6 audio ones expose setEnabled/isEnabled',
    MODULES.every((n) => run(`typeof window.${n} === 'object' && (typeof window.${n}.play === 'function' || typeof window.${n}.playActivation === 'function')`)) &&
    AUDIO_MODULES.every((n) => run(`typeof window.${n}.setEnabled === 'function' && typeof window.${n}.isEnabled === 'function'`)));
check('the 4 newer voice modules are silent text stubs: no setEnabled, play() emits no audio',
    STUB_MODULES.every((n) => run(`typeof window.${n}.setEnabled === 'undefined'`)) &&
    (() => {
        FakeAudio.played.length = 0;
        STUB_MODULES.forEach((n) => run(`window.${n}.play('spawn')`));
        return FakeAudio.played.length === 0;
    })());
check('default (no pref): sound ON, every real audio module enabled, a voice line plays',
    (() => {
        run('applyAppSoundMuted()');
        const allOn = AUDIO_MODULES.every((n) => run(`window.${n}.isEnabled()`));
        FakeAudio.played.length = 0;
        const played = run(`window.BraweOutlitVoice.play('spawn')`);
        return run('appSoundMuted()') === false && allOn && played === true && FakeAudio.played.length === 1;
    })());
check('muting flips every real audio module off and silences play() immediately (no reload)',
    (() => {
        FakeAudio.played.length = 0;
        run("appSetSoundMuted(true)");
        const allOff = AUDIO_MODULES.every((n) => run(`window.${n}.isEnabled()`) === false);
        const voice = run(`window.BraweFuserVoice.play('spawn')`);
        const sfx = run(`window.BraweHyperchargeSfx.playActivation('outlit')`);
        return run("localStorage.getItem('arenaForgeMutedV1')") === '1' && allOff && voice === false && sfx === false && FakeAudio.played.length === 0;
    })());
check('unmuting flips every real audio module back on and play() works again',
    (() => {
        FakeAudio.played.length = 0;
        run("appSetSoundMuted(false)");
        const allOn = AUDIO_MODULES.every((n) => run(`window.${n}.isEnabled()`));
        const played = run(`window.BraweOutlitVoice.play('spawn')`);
        return run("localStorage.getItem('arenaForgeMutedV1')") === '0' && allOn && played === true && FakeAudio.played.length === 1;
    })());
check('boot-time apply reads the stored pref directly (restart restores mute)',
    (() => {
        run("localStorage.setItem('arenaForgeMutedV1', '1')");
        run('applyAppSoundMuted()');
        return AUDIO_MODULES.every((n) => run(`window.${n}.isEnabled()`) === false) && run('appSoundMuted()') === true;
    })());
check('apply tolerates a missing module and a module without setEnabled',
    (() => {
        run("localStorage.setItem('arenaForgeMutedV1', '0')");
        run('delete window.BraweSnipaVoice; window.BrawePandyVoice = {};');
        const ok = run('applyAppSoundMuted()');
        return ok === false;
    })());

// ================= Real behavior: reset key list =================
const FULL_KEYS = {
    brawl_arena_save: '{}', brawlGameProgress: '{}', brawl_arena_brawler_sort: 'x',
    brawl_arena_brawler_role_filter: 'x', brawl_arena_brawler_rarity_filter: 'x',
    brawl_arena_brawler_ownership_filter: 'x', brawl_arena_favorites: '[]',
    brawl_arena_demon_origin_watched_v2: '1', super_granted: '1', super_granted2: '1',
    shop_daily_deal: 'x', sushi_combo: 'x', tower_duels_best: 'x', season_pass_claims: 'x',
    arena_forge_daily_brick_rush_v1: '{}', arenaForgeTournamentV1: '{}',
    arenaForgeHelpViewsV1: '3', arenaForgeHelpHiddenV1: '1',
    arenaForgeHomeEventRotationV5: '{}', arenaForgeHomeEventRotationV4: '{}',
    arenaForgeLastShowdownChoice: 'solo', arenaForgeLastEventChoice: 'duels',
    arenaForgeLastHomeTab: 'home', arenaForgeFullscreenPref: '1',
    arenaForgeHapticsV1: '1', arenaForgeMutedV1: '1',
    brickBonClaimed: '{}', brawe_gadget_test_results_v1: '{}',
};
const KEEP_KEYS = { randomKey: 'keep-me', myGameSave: 'keep-me', brawe_something_else: 'keep-me', forgedArenaKey: 'keep-me', unrelated: '1' };
function freshStore() { return new FakeStorage({ ...FULL_KEYS, ...KEEP_KEYS }); }
check('reset key list covers every real save key (whitelist + tournament + prefs + extras)',
    (() => {
        ctx.localStorage = freshStore();
        const wiped = run('wipeAppProgress()');
        return Object.keys(FULL_KEYS).length === wiped.length &&
            Object.keys(FULL_KEYS).every((k) => wiped.includes(k)) &&
            Object.keys(FULL_KEYS).every((k) => ctx.localStorage.getItem(k) === null);
    })());
check('reset never touches unrelated localStorage keys',
    (() => {
        ctx.localStorage = freshStore();
        run('wipeAppProgress()');
        return Object.entries(KEEP_KEYS).every(([k, v]) => ctx.localStorage.getItem(k) === v);
    })());
check('reset key-matching agrees with the save-code whitelist on every sample key',
    (() => {
        ctx.localStorage = freshStore();
        const wiped = run('appProgressResetKeys(localStorage)');
        return [...ctx.localStorage.map.keys()].every((k) =>
            run(`isBraweBackupStorageKey(${JSON.stringify(k)})`) ? wiped.includes(k) : true);
    })());
check('wipe returns the exact wiped list (tournament + mute pref included)',
    (() => {
        ctx.localStorage = freshStore();
        const wiped = run('appProgressResetKeys(localStorage)');
        return wiped.includes('arenaForgeTournamentV1') && wiped.includes('arenaForgeMutedV1') &&
            wiped.includes('arenaForgeHapticsV1') && wiped.includes('brawl_arena_save');
    })());

// ================= Real behavior: double-confirm flow =================
check('flow: first confirm alone wipes NOTHING and opens the second sheet',
    (() => {
        sheets.length = 0;
        ctx.__reloaded = false;
        ctx.localStorage = freshStore();
        run('openAppProgressResetFlow()');
        if (sheets.length !== 1) return false;
        const first = sheets[0];
        if (typeof first.onConfirm !== 'function' || !first.cancelText) return false;
        first.onConfirm();
        const intact = Object.keys(FULL_KEYS).every((k) => ctx.localStorage.getItem(k) !== null);
        return sheets.length === 2 && intact && !ctx.__reloaded;
    })());
check('flow: second sheet is a distinct confirm; cancelling it (not confirming) wipes nothing',
    (() => {
        const second = sheets[1];
        if (typeof second.onConfirm !== 'function' || second.title !== 'ARE YOU SURE?') return false;
        // Simulate cancel: simply never call onConfirm — nothing is wiped.
        const intact = Object.keys(FULL_KEYS).every((k) => ctx.localStorage.getItem(k) !== null);
        return intact && sheets.length === 2;
    })());
check('flow: second confirm wipes everything, shows the erased sheet, and reloads only on GOT IT',
    (() => {
        const second = sheets[1];
        second.onConfirm();
        const wiped = Object.keys(FULL_KEYS).every((k) => ctx.localStorage.getItem(k) === null);
        const kept = Object.entries(KEEP_KEYS).every(([k, v]) => ctx.localStorage.getItem(k) === v);
        if (sheets.length !== 3 || sheets[2].title !== 'PROGRESS ERASED') return false;
        if (ctx.__reloaded) return false; // reload must wait for the acknowledgement
        if (typeof sheets[2].onClose !== 'function') return false;
        sheets[2].onClose();
        return wiped && kept && ctx.__reloaded === true;
    })());
check('flow: a fresh open after a cancel leaves progress intact (two taps, no single-tap wipe)',
    (() => {
        sheets.length = 0;
        ctx.__reloaded = false;
        ctx.localStorage = freshStore();
        run('openAppProgressResetFlow()');
        // User backs out of sheet 1 without confirming: nothing happens.
        return sheets.length === 1 && Object.keys(FULL_KEYS).every((k) => ctx.localStorage.getItem(k) !== null) && !ctx.__reloaded;
    })());

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-settings-audio`);
