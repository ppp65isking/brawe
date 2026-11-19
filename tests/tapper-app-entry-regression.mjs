// Tapper Upper in the app (2026-11-19, Anthony: "idk if I can open tapper
// uppers here"): the open buttons live on the web home screen statsDiv,
// which the app home shell covers — so app mode had NO way to open
// tappers. Fix: a TAPPERS button in the app home quick row opens a sheet
// with live counts; its buttons call the same openers the web buttons use
// (openStarrDrop / openSuperStarrDrop / openHyperStarrDrop / openAllTappers).
//
// Source pins + a vm behavior mirror: extract the real openAppTapperSheet,
// run it in a sandbox with stubbed DOM/globals, assert the sheet renders
// the live counts and that each button calls the right opener and closes
// the sheet. App/touch only; website untouched.
//
// Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Source pins ---
check('quick row has a TAPPERS button with a live badge',
    game.includes('data-app-quick="tappers"') &&
    game.includes('id="appTapperBadge"') &&
    game.includes('⭐ TAPPERS'));
check('quick-row listener routes tappers to the sheet',
    game.includes("else if (action === 'tappers') { if (typeof openAppTapperSheet === 'function') openAppTapperSheet(); }"));
check('syncAppHome updates the tapper badge from the three live counts',
    game.includes("document.getElementById('appTapperBadge')") &&
    game.includes('(playerData.starrDrops || 0) + (playerData.superTapperCount || 0) + (playerData.hyperTapperCount || 0)'));
check('openAppTapperSheet is defined and app-mode gated',
    game.includes('function openAppTapperSheet()') &&
    game.includes('if (!isNativeAppMode()) return;'));
check('sheet calls the same openers as the web buttons',
    game.includes("if (which === 'reg' && typeof openStarrDrop === 'function') openStarrDrop();") &&
    game.includes("else if (which === 'super' && typeof openSuperStarrDrop === 'function') openSuperStarrDrop();") &&
    game.includes("else if (which === 'hyper' && typeof openHyperStarrDrop === 'function') openHyperStarrDrop();") &&
    game.includes("else if (which === 'bulk' && typeof openAllTappers === 'function') openAllTappers();"));
check('sheet is app-only: built from buildAppHome, no web home changes',
    !game.includes('appTapperSheet') || game.includes("function openAppTapperSheet()"));
check('tapper sheet styles exist (bottom-sheet language, safe-area aware)',
    game.includes('.app-tapper-sheet{') && game.includes('.app-tapper-card{') &&
    game.includes('env(safe-area-inset-bottom)'));
check('website tapper buttons untouched (still call the same openers)',
    game.includes("dropBtn.onclick = () => openStarrDrop();") &&
    game.includes('openAllBtn.textContent = `🎁 BULK OPEN (${totalTapperCount})`'));

// --- Behavior mirror: extract + run the real sheet function ---
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
        closest(sel) { return sel === '[data-app-tapper]' ? this._closestBtn || null : null; },
    };
    return el;
}

function runSheet(counts) {
    const calls = [];
    const ctx = {
        console,
        playerData: { starrDrops: counts.reg || 0, superTapperCount: counts.sup || 0, hyperTapperCount: counts.hyp || 0 },
        isNativeAppMode: () => true,
        appBuzz: () => {},
        syncAppHome: () => {},
        openStarrDrop: () => calls.push('reg'),
        openSuperStarrDrop: () => calls.push('super'),
        openHyperStarrDrop: () => calls.push('hyper'),
        openAllTappers: () => calls.push('bulk'),
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
    vm.runInContext(extractFunction(game, 'openAppTapperSheet'), ctx);
    vm.runInContext('openAppTapperSheet()', ctx);
    const sheet = ctx.document.body.children[0];
    return { ctx, calls, sheet };
}

function clickButton(sheet, which) {
    // Fake a click on a sheet button: the sheet's delegated listener reads
    // event.target.closest('[data-app-tapper]').
    const fakeBtn = { dataset: { appTapper: which }, closest: () => fakeBtn };
    sheet._closestBtn = fakeBtn;
    sheet._handlers.click({ target: fakeBtn });
}

{
    const { calls, sheet } = runSheet({ reg: 3, sup: 2, hyp: 1 });
    const html = sheet.innerHTML || '';
    check('sheet renders all three live counts', html.includes('(3)') && html.includes('(2)') && html.includes('(1)'));
    check('sheet shows BULK OPEN with the total (6)', html.includes('BULK OPEN (6)'));
    check('sheet has Open buttons for each type',
        html.includes('Open Tapper Upper') && html.includes('Open SUPER TAPPER') && html.includes('Open SURGE TAPPER'));
    clickButton(sheet, 'bulk');
    check('BULK OPEN button calls openAllTappers', calls.includes('bulk'));
    check('sheet closes after the tap', sheet.removed === true);
}
{
    const { calls, sheet } = runSheet({ reg: 1, sup: 0, hyp: 0 });
    clickButton(sheet, 'reg');
    check('regular button calls openStarrDrop', calls.includes('reg'));
}
{
    const { calls, sheet } = runSheet({ reg: 0, sup: 1, hyp: 0 });
    const html = sheet.innerHTML || '';
    check('zero-count buttons are disabled, non-zero stay enabled',
        html.includes('data-app-tapper="reg" disabled') && !html.includes('data-app-tapper="super" disabled'));
    check('no BULK OPEN button when total is 1 or fewer', !html.includes('BULK OPEN'));
    clickButton(sheet, 'super');
    check('super button calls openSuperStarrDrop', calls.includes('super'));
}
{
    const { calls, sheet } = runSheet({ reg: 0, sup: 0, hyp: 1 });
    clickButton(sheet, 'hyper');
    check('surge button calls openHyperStarrDrop', calls.includes('hyper'));
}
{
    const { sheet } = runSheet({ reg: 0, sup: 0, hyp: 0 });
    const html = sheet.innerHTML || '';
    check('empty state tells the player how to earn tappers',
        html.includes('No tappers yet') && html.includes('milestones'));
    check('no BULK OPEN button when there are no tappers', !html.includes('BULK OPEN'));
}

console.log(`tapper-app-entry: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures); process.exitCode = 1; }
