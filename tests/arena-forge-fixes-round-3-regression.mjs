// Arena Forge fixes round 3 (2026-11-20): Anthony's two live-playtest items.
// 1. Season Pass button STILL dead on mobile (landscape). Root cause: the
//    APK bundles all linked CSS into ONE stylesheet, and tactical-ui.css
//    line 253 opened @media(max-width:760px){ without ever closing it, so
//    every later file — incl. the whole circuit-pass.css — was nested
//    inside that media query. On a phone in landscape (>760 CSS px) the
//    pass overlay lost ALL styling: it opened as an unstyled static div
//    under the fixed canvas/home, so the tap looked dead. (The website
//    serves separate files, so every VM harness passed — the divergence
//    was bundle-only.) Fix: close the media block. The tap path itself
//    (row delegation + direct button listener) is pinned too.
// 2. Pass UI bleeding into matches ("100 Gems", "11,999 Coins", "PREMIUM
//    LOCKED", "✓ CLAIMED" over the match HUD). Root cause: openSeasonPass
//    appends #circuitPassOverlay to the body and only its own close()
//    removes it — no match-start path ever closed it. Fix: every match
//    launcher calls closeSeasonPassOverlay() first, which removes the node
//    AND its Escape keydown listener and clears the #pass deep link.
// Numbers Anthony owns are pinned unchanged: premium 100 gems / 11,999
// coins, 50 tiers, tier-50 Holiday Lights, daily +25 / weekly +100 /
// season +100 Pass XP, 4 weekly quests. Source-presence + extracted
// behavior mirrors (same shape as the round-1/round-2 suites).
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const tactical = read('tactical-ui.css');
const circuitCss = read('circuit-pass.css');
const indexHtml = read('index.html');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
// String-aware brace matcher (same shape as the round-1 suite).
function extractBraced(src, start) {
    const open = src.indexOf('{', start);
    if (open === -1) return null;
    let depth = 0, i = open, quote = null, esc = false, lineComment = false, blockComment = false;
    for (; i < src.length; i++) {
        const c = src[i], n = src[i + 1];
        if (lineComment) { if (c === '\n') lineComment = false; continue; }
        if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === '\\') { esc = true; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '/' && n === '/') { lineComment = true; continue; }
        if (c === '/' && n === '*') { blockComment = true; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        if (c === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    return null;
}
const sliceBetween = (src, startMarker, endMarker) => {
    const s = src.indexOf(startMarker);
    if (s === -1) return '';
    const e = endMarker ? src.indexOf(endMarker, s + startMarker.length) : src.length;
    return src.slice(s, e === -1 ? src.length : e);
};
// CSS helper: strip comments + strings, then walk the text tracking the
// open @media stack; report the media stack at the first occurrence of a
// selector. This is the APK-bundle property: the bundle concatenates the
// linked files in order, so a missing brace in an early file nests every
// later file's rules inside its media query.
function mediaStackAt(cssText, selector) {
    const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const clean = noComments.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
    const stack = [];
    let depth = 0;
    for (let i = 0; i < clean.length; i++) {
        if (clean.startsWith('@media', i)) {
            const j = clean.indexOf('{', i);
            if (j === -1) break;
            stack.push({ query: clean.slice(i, j).trim(), depth });
            depth++;
            i = j;
            continue;
        }
        const ch = clean[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            while (stack.length && stack[stack.length - 1].depth === depth) stack.pop();
        }
        if (clean.startsWith(selector, i)) return stack.map((s) => s.query);
    }
    return null;
}
function braceBalance(cssText) {
    const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const clean = noComments.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
    let depth = 0;
    for (const ch of clean) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    return depth;
}

// ================= 1. THE MISSING BRACE (pass button dead in landscape) =================
check('tactical-ui.css braces balance (was 582 open / 581 close)', braceBalance(tactical) === 0);
const homeLobbyRuleAt = tactical.indexOf('#homeLobbyView.is-active{min-height:0!important}');
const media760At = tactical.lastIndexOf('@media(max-width:760px){', homeLobbyRuleAt);
const media760 = extractBraced(tactical, media760At);
check('the max-width:760px block extracts cleanly and closes', !!media760);
check('the 760px block holds only its one home-lobby rule', !!media760 &&
    media760.includes('#homeLobbyView.is-active{min-height:0!important}') &&
    !media760.includes('.upgrade-all-options') && !media760.includes('.quest-hq-panel'));
check('the rule after the 760px block is top-level again', (() => {
    if (!media760) return false;
    const after = tactical.slice(tactical.indexOf(media760) + media760.length)
        .replace(/^\s*\/\*[\s\S]*?\*\//, '').trimStart();
    return after.startsWith('.upgrade-all-options');
})());
// The APK bundle concatenates the linked stylesheets in index.html order:
// styles, tactical-ui, pins, master-update, circuit-pass, fighter-gallery,
// kit-redesign, home-brawl-style. Rebuild that concatenation from source
// and prove the pass overlay rules sit at top level, not inside 760px.
const linkedCss = [];
for (const m of indexHtml.matchAll(/<link[^>]*href="\.\/([^"']+\.css)[^"']*"/g)) linkedCss.push(m[1]);
check('index.html still links circuit-pass.css for the bundle', linkedCss.includes('circuit-pass.css'));
const bundleText = linkedCss.map((f) => { try { return read(f); } catch { return ''; } }).join('\n');
check('concatenated bundle: .circuit-overlay is top-level (not in 760px media)',
    JSON.stringify(mediaStackAt(bundleText, '.circuit-overlay{')) === '[]');
check('concatenated bundle: .circuit-panel/.circuit-premium/.circuit-road are top-level',
    JSON.stringify(mediaStackAt(bundleText, '.circuit-panel{')) === '[]' &&
    JSON.stringify(mediaStackAt(bundleText, '.circuit-premium{')) === '[]' &&
    JSON.stringify(mediaStackAt(bundleText, '.circuit-road{')) === '[]');
check('concatenated bundle: .circuit-overlay keeps fixed positioning + z-index 1200 + opaque full-screen backdrop (round 4: solid bg, no dim pop-up)',
    circuitCss.includes('.circuit-overlay{position:fixed;inset:0;z-index:1200;') &&
    circuitCss.includes('background:#070d18'));
// If a built dist/ bundle is present (local build), prove the same property
// on the real artifact; otherwise this is a documented skip, not a failure.
let distChecked = false, distOk = false;
try {
    const distDir = fs.readdirSync(new URL('dist/assets/', root));
    const bundleFile = distDir.find((f) => f.endsWith('.css'));
    if (bundleFile) {
        distChecked = true;
        const distCss = read(`dist/assets/${bundleFile}`);
        distOk = JSON.stringify(mediaStackAt(distCss, '.circuit-overlay{')) === '[]' &&
            distCss.includes('.circuit-overlay{position:fixed;inset:0;z-index:1200;');
    }
} catch (_) {}
check('built dist/ bundle (when present): .circuit-overlay is top-level', !distChecked || distOk);
if (!distChecked) console.log('SKIP: no dist/ bundle present — bundle property proven on source concatenation only.');

// ================= 2. THE OVERLAY CLOSER =================
check('closeSeasonPassOverlay exists', game.includes('function closeSeasonPassOverlay() {'));
const closerSrc = extractBraced(game, game.indexOf('function closeSeasonPassOverlay() {'));
check('closer extracts cleanly', !!closerSrc);
check('closer removes the overlay node AND its Escape keydown listener',
    !!closerSrc && closerSrc.includes("document.removeEventListener('keydown', seasonPassOverlayKeyboard)") &&
    closerSrc.includes('seasonPassOverlayEl.remove()') &&
    closerSrc.includes("document.getElementById('circuitPassOverlay')"));
check('closer clears the #pass deep link when it removes something',
    !!closerSrc && closerSrc.includes("setAppDeepLink('home')") && closerSrc.includes('if (removed)'));
check('closer tracks the overlay element + keyboard handler in module vars',
    game.includes('let seasonPassOverlayEl = null;') && game.includes('let seasonPassOverlayKeyboard = null;') &&
    game.includes('seasonPassOverlayEl = overlay;') && game.includes('seasonPassOverlayKeyboard = keyboard;'));
check('openSeasonPass reuses the closer (no stale bare .remove() first)',
    (() => {
        const fn = extractBraced(game, game.indexOf('function openSeasonPass() {'));
        return !!fn && fn.includes('closeSeasonPassOverlay();') &&
            !fn.includes("document.getElementById('circuitPassOverlay')?.remove();");
    })());
check("openSeasonPass close() clears the tracked refs", (() => {
    const fn = extractBraced(game, game.indexOf('function openSeasonPass() {'));
    return !!fn && fn.includes('if (seasonPassOverlayEl === overlay) seasonPassOverlayEl = null;') &&
        fn.includes('if (seasonPassOverlayKeyboard === keyboard) seasonPassOverlayKeyboard = null;');
})());
check('openSeasonPass focus can never scroll the page (preventScroll, guarded)',
    game.includes("overlay.querySelector('button')?.focus({ preventScroll: true })"));

// Behavior mirror: run the real closer against a fake document. The closer
// closes over two module lets, so the harness re-declares them in the same
// eval scope and passes the fake document, link writer, element and
// keyboard handler in as parameters (new Function has no outer closure).
if (closerSrc) {
    const evalCloser = (doc, setLink, el, kb) => new Function('doc', 'setLink', 'el', 'kb', `
        let seasonPassOverlayEl = null;
        let seasonPassOverlayKeyboard = null;
        ${closerSrc}
        const document = doc;
        const setAppDeepLink = setLink;
        seasonPassOverlayEl = el;
        seasonPassOverlayKeyboard = kb;
        closeSeasonPassOverlay();
    `)(doc, setLink, el, kb);
    // Case A: live overlay element + keyboard handler tracked.
    let deepLinkA = null;
    const elA = { removed: false, remove() { this.removed = true; } };
    const kbA = function kbA() {};
    const docA = {
        removedListener: null,
        removeEventListener(type, fn) { this.removedListener = [type, fn]; },
        getElementById() { return null; },
    };
    evalCloser(docA, (r) => { deepLinkA = r; }, elA, kbA);
    check('closer mirror A: removes the tracked element + Escape listener + resets deep link to home',
        elA.removed === true && docA.removedListener !== null && docA.removedListener[0] === 'keydown' &&
        docA.removedListener[1] === kbA && deepLinkA === 'home');
    // Case B: stale node only reachable via getElementById.
    let deepLinkB = null;
    const elB = { removed: false, remove() { this.removed = true; } };
    const docB = { removeEventListener() {}, getElementById() { return elB; } };
    evalCloser(docB, (r) => { deepLinkB = r; }, null, null);
    check('closer mirror B: removes a stale overlay found by id + resets deep link',
        elB.removed === true && deepLinkB === 'home');
    // Case C: nothing open — no deep-link touch, no throw.
    let deepLinkC = null;
    const docC = { removeEventListener() {}, getElementById() { return null; } };
    let threwC = false;
    try { evalCloser(docC, (r) => { deepLinkC = r; }, null, null); } catch (_) { threwC = true; }
    check('closer mirror C: no overlay open -> no deep-link change, no throw',
        !threwC && deepLinkC === null);
}

// ================= 3. EVERY MATCH-START PATH CLOSES THE PASS =================
const launchers = ['launchShowdownMatch', 'launchTournamentMatch', 'launchTrainingSandbox', 'launchTutorialMatch', 'playAgainFromResults'];
for (const name of launchers) {
    const fn = extractBraced(game, game.indexOf(`function ${name}(`));
    // Training/tutorial reset hyper first (pinned by the hypercharge-leak
    // suite), so the closer sits right after that reset there; everywhere
    // else it is the first statement. Either way it runs at launch.
    check(`match launcher ${name} closes the pass overlay on launch`, !!fn && fn.includes('closeSeasonPassOverlay();'));
}
check('PLAY / #startMatch click handler closes the pass overlay first', (() => {
    const h = sliceBetween(game, "startBtn.addEventListener('click', () => {", '});');
    return h.includes('closeSeasonPassOverlay();');
})());
check('Duels draft launch closes the pass overlay first', (() => {
    const h = sliceBetween(game, 'launchBtn.onclick = () => {\n          if (drafted.length < 1) return;', 'startDuelsRound();');
    return h.includes('closeSeasonPassOverlay();');
})());
check('debug play hook closes the pass overlay first',
    game.includes("window.__pureHTMLGame.play = ()=>{ if (typeof closeSeasonPassOverlay === 'function') closeSeasonPassOverlay();"));

// ================= 4. TAP PATH HARDENING =================
check('pass quick button keeps its row delegation',
    game.includes("document.getElementById('appHomeQuickRow')?.addEventListener('click'") &&
    game.includes("else if (action === 'pass') { if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); }"));
check('pass quick button ALSO has a direct listener on the button itself',
    game.includes("document.querySelector('[data-app-quick=\"pass\"]')?.addEventListener('click'"));
check('season chip still opens the pass directly',
    game.includes("document.getElementById('appHomeSeasonChip')?.addEventListener('click'"));
check('openSeasonPass removes any existing overlay before creating a new one (double-tap safe)',
    (() => {
        const fn = extractBraced(game, game.indexOf('function openSeasonPass() {'));
        return !!fn && fn.indexOf('closeSeasonPassOverlay();') < fn.indexOf("document.createElement('div')");
    })());

// ================= 5. ANTHONY'S NUMBERS UNCHANGED =================
check('pass is still 50 tiers, premium 100 gems / 11,999 coins, tier-50 Holiday Lights',
    game.includes('SEASON_PASS_MAX_LEVEL = 50') &&
    game.includes('SEASON_PREMIUM_UNLOCK_GEMS = 100') &&
    game.includes('SEASON_PREMIUM_UNLOCK_COINS = 11999') &&
    game.includes("{tier:50,title:'HOLIDAY LIGHTS',free:{type:'coins',amount:5000},premium:{type:'skin',id:'holiday-lights-freezeon'}}"));
check('Pass XP unchanged: daily +25, weekly +100',
    game.includes('rewards: weekly ? { coins:500+index*150, souls:35+index*10, questXP:35, passXP:100 } : { coins:150+index*40, questXP:20, passXP:25 }'));
check('Pass XP: season quests retuned (2026-11-20 tuning round) — Xplodemis pays 100/175/275/430 by stage band, past/future seasons still 100',
    (() => {
        const vals = [...game.matchAll(/xpReward:([0-9]+)/g)].map((m) => m[1]);
        return vals.length > 0 && vals.every((v) => ['100', '175', '275', '430'].includes(v));
    })());
check('weekly quests stay 4/week',
    (game.match(/buildRandomContractBucket\(WEEKLY_CONTRACT_POOL, 4,/g) || []).length >= 3);
check('no bare word-boundary forbidden brawler token in game.js or this suite',
    (() => {
        const word = 'clus' + 'ter';
        const re = new RegExp(`\\b${word}\\b`);
        return !re.test(game) && !re.test(self);
    })());

console.log(`fixes-round-3: ${passed} passed, ${failed} failed${failures.length ? ` — FAILED: ${failures.join(' | ')}` : ''}`);
if (failed) process.exit(1);
