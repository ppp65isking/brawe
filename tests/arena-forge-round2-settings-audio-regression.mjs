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
check('mute list names all 12 audio modules (11 voice + Hypercharge SFX)',
    ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice', 'BrawePitchVoice', 'BraweSpritzVoice', 'BraweHyperchargeSfx']
        .every((n) => game.includes(`'${n}'`)));
check('mute list matches the audio call sites in game.js (no module missed, no extra)',
    (() => {
        const called = new Set([...game.matchAll(/window\.(Brawe\w+)\?\.(?:play|playActivation)\(/g)].map((m) => m[1]));
        const listed = [...game.match(/const APP_AUDIO_MODULE_NAMES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
        return called.size === 12 && listed.length === 12 && listed.every((n) => called.has(n)) && [...called].every((n) => listed.includes(n));
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
check('settings handler toggles sound and re-renders', game.includes("appSetSoundMuted(!appSoundMuted());"));

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
for (const f of ['outlit-voicelines.js', 'fuser-voicelines.js', 'hypercharge-sfx.js', 'voodoyou-voicelines.js', 'pandy-voicelines.js', 'snipa-voicelines.js', 'bookworm-voicelines.js', 'freezeon-voicelines.js', 'driller-voicelines.js', 'gravy-voicelines.js', 'pitch-voicelines.js', 'spritz-voicelines.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../modules/audio/${f}`, import.meta.url), 'utf8'), ctx);
}
// Load the mute + reset helpers out of game.js into the same context.
for (const name of ['appSoundMuted', 'applyAppSoundMuted', 'appSetSoundMuted', 'isBraweBackupStorageKey']) {
    vm.runInContext(extractFunction(game, name), ctx);
}
for (const re of [/const APP_MUTED_KEY = '[^']+';/, /const APP_AUDIO_MODULE_NAMES = \[[^\]]*\];/]) {
    const m = game.match(re);
    assert.ok(m, `const found: ${re}`);
    vm.runInContext(m[0], ctx);
}

const MODULES = ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice', 'BrawePitchVoice', 'BraweSpritzVoice', 'BraweHyperchargeSfx'];
// Only six modules actually play audio today (the other four are silent
// text stubs — see the mute comment in game.js — with no setEnabled hook
// and no audio output at all).
const AUDIO_MODULES = ['BraweOutlitVoice', 'BraweFuserVoice', 'BraweVoodoyouVoice', 'BrawePandyVoice', 'BraweSnipaVoice', 'BraweHyperchargeSfx'];
const STUB_MODULES = ['BraweBookwormVoice', 'BraweFreezeonVoice', 'BraweDrillerVoice', 'BraweGravyVoice', 'BrawePitchVoice', 'BraweSpritzVoice'];
check('all 12 voice/SFX modules loaded; the 6 audio ones expose setEnabled/isEnabled',
    MODULES.every((n) => run(`typeof window.${n} === 'object' && (typeof window.${n}.play === 'function' || typeof window.${n}.playActivation === 'function')`)) &&
    AUDIO_MODULES.every((n) => run(`typeof window.${n}.setEnabled === 'function' && typeof window.${n}.isEnabled === 'function'`)));
check('the 6 newer voice modules are silent text stubs: no setEnabled, play() emits no audio',
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

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-settings-audio`);
