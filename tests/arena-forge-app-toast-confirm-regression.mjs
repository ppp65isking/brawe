// Arena Forge app toast + confirm sheet (2026-11-19): showToast was called
// from 3 places but defined nowhere, so toasts silently never appeared; and
// native alert()/confirm() blocked the save-import, shop-purchase and
// tournament-leave flows. Source-presence + real behavior (extracted
// helpers run against a minimal fake DOM). Never uses the banned bare word.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
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

// ================= X1: showToast is defined =================
check('showToast is defined exactly once', count(game, 'function showToast(') === 1);
check('all 3 call sites are still present', game.includes("showToast('BRAWE save downloaded!'") &&
    game.includes("showToast('Save code copied!'") &&
    game.includes("showToast('BRICK RUSH! 3x Bricks - 4x with a win streak'"));
check('call sites still guard with typeof (now resolves to the real toast)',
    count(game, "typeof showToast === 'function'") === 3);
check('toast CSS exists (pill, above the tab bar, pointer-events none)',
    game.includes('.app-toast{') && game.includes('pointer-events:none') &&
    game.includes('bottom:calc(84px + env(safe-area-inset-bottom,0px))'));
check('toast animates transform/opacity only (show class, no layout props)',
    game.includes('.app-toast.app-toast-show{transform:translate(-50%,0);opacity:1}') &&
    game.includes('transition:transform .22s ease-out,opacity .22s ease-out'));
check('toast is a live region and reuses one element',
    game.includes("toast.setAttribute('role', 'status')") &&
    game.includes("document.getElementById('appToast')") &&
    game.includes("toast.id = 'appToast'"));
check('toast auto-dismisses on a timer and restarts it on repeat calls',
    game.includes('appToastTimer = setTimeout(') && game.includes(', 2600)') &&
    game.includes('if (appToastTimer) clearTimeout(appToastTimer);'));
check('toast respects the haptics pref via appBuzz', game.includes("appBuzz(10);\n            if (appToastTimer)"));

// ================= X2: confirm sheet exists =================
check('showAppConfirmSheet is defined exactly once', count(game, 'function showAppConfirmSheet(') === 1);
check('closeAppConfirmSheet is defined exactly once', count(game, 'function closeAppConfirmSheet(') === 1);
check('confirm-sheet CSS exists (overlay, sheet, confirm/cancel/ok buttons)',
    game.includes('.app-confirm-overlay{') && game.includes('.app-confirm-sheet{') &&
    game.includes('.app-confirm-confirm{') && game.includes('.app-confirm-cancel{') &&
    game.includes('.app-confirm-ok{'));
check('sheet matches the kit-sheet look (gradient, top radius, safe-area bottom)',
    game.includes('background:linear-gradient(160deg,#0a2140,#06101f)') &&
    game.includes('border-radius:20px 20px 0 0') &&
    game.includes('padding:20px 16px calc(16px + env(safe-area-inset-bottom))'));
check('sheet sits above the save modal (z-index 1300) so import confirms are visible',
    game.includes('.app-confirm-overlay{position:fixed;inset:0;z-index:1300;'));
check('confirm variant exists (onConfirm -> confirm + cancel buttons)',
    game.includes("typeof opts.onConfirm === 'function'") &&
    game.includes("cancelBtn.className = 'app-confirm-cancel'") &&
    game.includes("confirmBtn.className = 'app-confirm-confirm'"));
check('message-only variant exists (no onConfirm -> single OK button + onClose)',
    game.includes("okBtn.className = 'app-confirm-ok'") &&
    game.includes("result === 'ok' && typeof opts.onClose === 'function'"));
check('sheet dismisses on backdrop tap and Escape (cancel for confirm, ok for message)',
    game.includes("if (event.target === overlay) dismiss(hasConfirm ? 'cancel' : 'ok')") &&
    game.includes("if (event.key === 'Escape') dismiss(hasConfirm ? 'cancel' : 'ok')"));
check('sheet is a dialog, message uses textContent (no HTML injection)',
    game.includes("sheet.setAttribute('role', 'dialog')") &&
    game.includes("sheet.setAttribute('aria-modal', 'true')") &&
    game.includes('body.textContent = message;'));
check('only one sheet at a time (open replaces the previous one)',
    game.includes('closeAppConfirmSheet();\n        const hasConfirm'));
check('sheet buttons meet the 48px touch target', game.includes('.app-confirm-actions button{flex:1;min-height:48px;'));

// ================= X2: the three flows use the sheet =================
function bodyOf(name) { return extractFunction(game, name); }
const noNative = (body) => !body.includes('alert(') && !/[^A-Za-z]confirm\(/.test(body);
check('save file import flow has no native dialogs', noNative(bodyOf('importBraweSaveBackup')));
check('save-code modal flow has no native dialogs', noNative(bodyOf('openSaveCodeModal')));
check('shop flow (openGemShop) has no native dialogs', noNative(bodyOf('openGemShop')));
check('ability-piece purchase has no native dialogs', noNative(bodyOf('buySpecialAbilityPiece')));
check('ability full-unlock purchase has no native dialogs', noNative(bodyOf('buySpecialAbilityFullUnlock')));
check('tournament bracket flow has no native dialogs', noNative(bodyOf('openTournamentBracket')));
check('shop uses the sheet for all 10 purchase errors', count(bodyOf('openGemShop'), 'showAppConfirmSheet(') === 10);
check('save file import uses the sheet 3x (read fail, success, invalid)',
    count(bodyOf('importBraweSaveBackup'), 'showAppConfirmSheet(') === 3);
check('save-code modal uses the sheet 6x (copy fail, empty, confirm, success, invalid, build fail)',
    count(bodyOf('openSaveCodeModal'), 'showAppConfirmSheet(') === 6);
check('file-picker import confirm uses the sheet',
    game.includes("showAppConfirmSheet({\n            title: 'IMPORT SAVE?'"));
check('ability purchases use the sheet 3x each',
    count(bodyOf('buySpecialAbilityPiece'), 'showAppConfirmSheet(') === 3 &&
    count(bodyOf('buySpecialAbilityFullUnlock'), 'showAppConfirmSheet(') === 3);
check('tournament LEAVE uses the sheet with a LEAVE/STAY confirm',
    bodyOf('openTournamentBracket').includes("confirmText: 'LEAVE'") &&
    bodyOf('openTournamentBracket').includes("cancelText: 'STAY'") &&
    bodyOf('openTournamentBracket').includes('Abandon this tournament run?'));
check('import success still reloads, but only after the sheet is dismissed',
    bodyOf('importBraweSaveBackup').includes("onClose: () => location.reload()") &&
    bodyOf('openSaveCodeModal').includes("onClose: () => location.reload()"));
check('ability purchases still return false on failure (callers gate on it)',
    bodyOf('buySpecialAbilityPiece').includes('return false;') &&
    bodyOf('buySpecialAbilityFullUnlock').includes('return false;') &&
    !bodyOf('buySpecialAbilityPiece').includes('return showAppConfirmSheet'));

// Dead-code season-premium confirms are intentionally left alone.
check('dead-code season-premium confirms left alone (unreachable Circuit Pass overlay)',
    game.includes('confirm(`Unlock Premium for') && game.includes('confirm(`Spend ${offer.cost} Pass Tokens'));
check('no banned bare word in game.js (word-boundary check, assembled so this file stays clean)',
    !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
check('no banned bare word in this test file',
    !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(self));

// ================= Behavior: extracted helpers on a fake DOM =================
class FakeClassList {
    constructor() { this.set = new Set(); }
    add(...c) { c.forEach((x) => this.set.add(x)); }
    remove(...c) { c.forEach((x) => this.set.delete(x)); }
    contains(c) { return this.set.has(c); }
}
class FakeElement {
    constructor(tag, doc) {
        this.tagName = (tag || 'div').toUpperCase();
        this.doc = doc;
        this.children = [];
        this.style = {};
        this.classList = new FakeClassList();
        this.attributes = {};
        this.textContent = '';
        this.id = '';
        this.className = '';
        this.onclick = null;
        this.parent = null;
        this._listeners = {};
    }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] ?? null; }
    appendChild(child) {
        child.parent = this;
        this.children.push(child);
        if (child.id) this.doc._byId.set(child.id, child);
        return child;
    }
    remove() {
        if (this.parent) {
            const i = this.parent.children.indexOf(this);
            if (i >= 0) this.parent.children.splice(i, 1);
            this.parent = null;
        }
        if (this.id) this.doc._byId.delete(this.id);
    }
    addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
    removeEventListener(type, fn) {
        const l = this._listeners[type];
        if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
    }
    focus() { this.doc._focused = this; }
    click() { if (typeof this.onclick === 'function') this.onclick({ target: this }); }
}
class FakeDocument {
    constructor() {
        this._byId = new Map();
        this._listeners = {};
        this._focused = null;
        this.body = new FakeElement('body', this);
    }
    createElement(tag) { return new FakeElement(tag, this); }
    getElementById(id) { return this._byId.get(id) ?? null; }
    addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
    removeEventListener(type, fn) {
        const l = this._listeners[type];
        if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
    }
    dispatchKey(key) { [...(this._listeners.keydown || [])].forEach((fn) => fn({ key })); }
}
function descendants(el, out = []) {
    for (const c of el.children) { out.push(c); descendants(c, out); }
    return out;
}
const buttonsOf = (el) => descendants(el).filter((e) => e.tagName === 'BUTTON');

const doc = new FakeDocument();
const buzzes = [];
const navigatorStub = { vibrate: (ms) => { buzzes.push(ms); } };
const hapticsStore = new Map();
const localStorageStub = {
    getItem: (k) => (hapticsStore.has(k) ? hapticsStore.get(k) : null),
    setItem: (k, v) => { hapticsStore.set(k, String(v)); },
    removeItem: (k) => { hapticsStore.delete(k); },
};
const capturedTimers = [];
const fakeSetTimeout = (fn, ms) => { capturedTimers.push({ fn, ms }); return capturedTimers.length; };
const fakeClearTimeout = (id) => { if (capturedTimers[id - 1]) capturedTimers[id - 1].cancelled = true; };

const extracted = [
    'let appToastTimer = null;',
    'let appConfirmSheetKeyHandler = null;',
    "const APP_HAPTICS_KEY = 'arenaForgeHapticsV1';",
    extractFunction(game, 'appHapticsOn'),
    extractFunction(game, 'appBuzz'),
    extractFunction(game, 'showToast'),
    extractFunction(game, 'showAppConfirmSheet'),
    extractFunction(game, 'closeAppConfirmSheet'),
].join('\n');
const factory = new Function(
    'document', 'navigator', 'localStorage', 'setTimeout', 'clearTimeout',
    `${extracted}\nreturn { showToast, showAppConfirmSheet, closeAppConfirmSheet };`,
);
const { showToast, showAppConfirmSheet, closeAppConfirmSheet } =
    factory(doc, navigatorStub, localStorageStub, fakeSetTimeout, fakeClearTimeout);

// --- toast behavior ---
showToast('Save code copied!', '#5df2c2');
let toast = doc.getElementById('appToast');
check('toast element is created on first call', !!toast);
check('toast shows the message text', toast && toast.textContent === 'Save code copied!');
check('toast uses the caller accent on its left edge', toast && toast.style.borderLeftColor === '#5df2c2');
check('toast is visible (show class) right after the call', toast && toast.classList.contains('app-toast-show'));
check('toast buzzes lightly (haptics pref on)', buzzes.length === 1 && buzzes[0] === 10);
check('toast auto-dismiss timer is 2600ms', capturedTimers.length === 1 && capturedTimers[0].ms === 2600);
showToast('BRICK RUSH! 3x Bricks - 4x with a win streak', '#ffd166');
check('repeat toast reuses the single element (no stacking)', doc.getElementById('appToast') === toast);
check('repeat toast swaps the text and accent', toast.textContent.startsWith('BRICK RUSH!') && toast.style.borderLeftColor === '#ffd166');
check('repeat toast restarts the dismiss timer', capturedTimers.length === 2);
capturedTimers[1].fn();
check('firing the dismiss timer hides the toast', !toast.classList.contains('app-toast-show'));
hapticsStore.set('arenaForgeHapticsV1', '0');
buzzes.length = 0;
showToast('quiet one');
check('toast stays silent when the haptics pref is off', buzzes.length === 0);
hapticsStore.delete('arenaForgeHapticsV1');
capturedTimers[capturedTimers.length - 1].fn();

// --- confirm sheet: message-only variant ---
let closed = 0;
showAppConfirmSheet({ title: 'IMPORT FAILED', message: 'That file is not a valid BRAWE save.', onClose: () => { closed++; } });
let overlay = doc.getElementById('appConfirmOverlay');
check('message sheet creates one overlay', !!overlay);
check('message sheet shows the message text',
    overlay && descendants(overlay).some((e) => e.textContent === 'That file is not a valid BRAWE save.'));
check('message sheet has exactly one OK button and no confirm/cancel buttons', (() => {
    const b = buttonsOf(overlay);
    return b.length === 1 && b[0].className === 'app-confirm-ok' && b[0].textContent === 'GOT IT';
})());
buttonsOf(overlay)[0].click();
check('message sheet OK runs onClose and removes the sheet', closed === 1 && !doc.getElementById('appConfirmOverlay'));

// backdrop + Escape dismiss the message sheet the same way
showAppConfirmSheet({ message: 'Backdrop test.', onClose: () => { closed++; } });
overlay = doc.getElementById('appConfirmOverlay');
overlay.onclick({ target: overlay });
check('backdrop tap dismisses the message sheet via onClose', closed === 2 && !doc.getElementById('appConfirmOverlay'));
showAppConfirmSheet({ message: 'Escape test.', onClose: () => { closed++; } });
overlay = doc.getElementById('appConfirmOverlay');
doc.dispatchKey('Escape');
check('Escape dismisses the message sheet via onClose', closed === 3 && !doc.getElementById('appConfirmOverlay'));
showAppConfirmSheet({ message: 'Escape again.', onClose: () => { closed++; } });
closeAppConfirmSheet();
doc.dispatchKey('Escape');
check('closing the sheet removes its Escape listener (no double onClose)', closed === 3);

// --- confirm sheet: confirm/cancel variant ---
let confirmed = 0;
let cancelled = 0;
showAppConfirmSheet({
    title: 'LEAVE TOURNAMENT?',
    message: 'Abandon this tournament run?',
    confirmText: 'LEAVE',
    cancelText: 'STAY',
    onConfirm: () => { confirmed++; },
    onCancel: () => { cancelled++; },
});
overlay = doc.getElementById('appConfirmOverlay');
const confirmBtns = buttonsOf(overlay);
check('confirm sheet has cancel + confirm buttons in order', confirmBtns.length === 2 &&
    confirmBtns[0].className === 'app-confirm-cancel' && confirmBtns[0].textContent === 'STAY' &&
    confirmBtns[1].className === 'app-confirm-confirm' && confirmBtns[1].textContent === 'LEAVE');
confirmBtns[0].click();
check('cancel does not run onConfirm, runs onCancel, removes the sheet',
    confirmed === 0 && cancelled === 1 && !doc.getElementById('appConfirmOverlay'));
showAppConfirmSheet({ message: 'Abandon this tournament run?', onConfirm: () => { confirmed++; } });
overlay = doc.getElementById('appConfirmOverlay');
doc.dispatchKey('Escape');
check('Escape on a confirm sheet cancels (no onConfirm)', confirmed === 0 && !doc.getElementById('appConfirmOverlay'));
showAppConfirmSheet({ message: 'Abandon this tournament run?', onConfirm: () => { confirmed++; } });
overlay = doc.getElementById('appConfirmOverlay');
overlay.onclick({ target: overlay });
check('backdrop tap on a confirm sheet cancels (no onConfirm)', confirmed === 0 && !doc.getElementById('appConfirmOverlay'));
showAppConfirmSheet({ message: 'Abandon this tournament run?', onConfirm: () => { confirmed++; } });
overlay = doc.getElementById('appConfirmOverlay');
buttonsOf(overlay).find((b) => b.className === 'app-confirm-confirm').click();
check('confirm button runs onConfirm exactly once and removes the sheet',
    confirmed === 1 && !doc.getElementById('appConfirmOverlay'));

// --- replacement + empty-message edge cases ---
showAppConfirmSheet({ message: 'First sheet.' });
showAppConfirmSheet({ message: 'Second sheet.' });
check('opening a second sheet replaces the first (one overlay in the DOM)',
    descendants(doc.body).filter((e) => e.id === 'appConfirmOverlay').length === 1 &&
    descendants(doc.body).some((e) => e.textContent === 'Second sheet.'));
closeAppConfirmSheet();
check('empty message creates no sheet and returns null',
    showAppConfirmSheet({ message: '' }) === null && showAppConfirmSheet({}) === null &&
    !doc.getElementById('appConfirmOverlay'));

// ================= Report =================
if (failed > 0) {
    console.error(`FAIL ${failed}/${passed + failed}`);
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
}
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-toast-confirm`);
