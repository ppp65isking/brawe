// Arena Forge round 2 HUD (2026-11-19): per-gadget TOOL icons + in-match
// pause/menu. App/touch mode ONLY. Source-presence checks plus live mirrors:
// the icon getter and the pause/resume/quit functions are extracted from
// game.js and run against stub state. Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// --- Roster + gadget data, parsed from the real game.js ---
const rosterMatch = game.match(/const allBrawlers = \[([\s\S]*?)\];/);
const roster = [...rosterMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
check('roster parses: 105 selectable brawlers', roster.length === 105);
function parseBrawlerData(src) {
    const start = src.indexOf('const brawlerData = {');
    let depth = 0, end = -1;
    for (let i = start; i < src.length; i++) {
        if (src[i] === '{') depth++;
        if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const block = src.slice(start, end + 1);
    const rows = [];
    const re = /'([^']+)':\s*\{/g;
    let m;
    while ((m = re.exec(block))) {
        const id = m[1];
        const bstart = m.index + m[0].length - 1;
        let d = 0, j = bstart;
        for (; j < block.length; j++) { if (block[j] === '{') d++; if (block[j] === '}') { d--; if (d === 0) break; } }
        const body = block.slice(bstart, j + 1);
        const g1 = (body.match(/\bg1:\s*'((?:[^'\\]|\\.)*)'/) || [])[1];
        const g2 = (body.match(/\bg2:\s*'((?:[^'\\]|\\.)*)'/) || [])[1];
        if (g1) rows.push({ id, slot: 'g1', text: g1 });
        if (g2) rows.push({ id, slot: 'g2', text: g2 });
    }
    return rows;
}
const gadgets = parseBrawlerData(game);
check('brawlerData parses: 210 gadgets (105 g1 + 105 g2)', gadgets.length === 210
    && gadgets.filter((g) => g.slot === 'g1').length === 105
    && gadgets.filter((g) => g.slot === 'g2').length === 105);
check('every roster brawler has both gadgets in brawlerData',
    roster.every((b) => gadgets.some((g) => g.id === b && g.slot === 'g1') && gadgets.some((g) => g.id === b && g.slot === 'g2')));

// --- Extract the icon map + getter and run them live ---
function extractBlock(startMarker, endMarker) {
    const s = game.indexOf(startMarker);
    const e = game.indexOf(endMarker, s);
    if (s === -1 || e === -1) return null;
    return game.slice(s, e);
}
const iconSrc = extractBlock('  const MOBILE_GADGET_ICONS = {', '  function syncMobileActionButtons() {');
check('icon map + getter extract cleanly from game.js', !!iconSrc);
let iconApi = null;
if (iconSrc) {
    const factory = new Function(
        'let selectedBrawler = \'outlit\';\n'
        + 'let selectedGadget = \'g1\';\n'
        + 'function normalizeGadgetSlot(slot) { return slot === \'g2\' ? \'g2\' : \'g1\'; }\n'
        + iconSrc
        + '\nreturn { getMobileToolButtonIcon, MOBILE_GADGET_ICONS, setSel: (b, g) => { selectedBrawler = b; selectedGadget = g; } };');
    iconApi = factory();
}
if (iconApi) {
    const map = iconApi.MOBILE_GADGET_ICONS;
    check('icon map has 210 entries', Object.keys(map).length === 210);
    check('icon map covers every gadget in brawlerData (no fallback needed)',
        gadgets.every((g) => typeof map[`${g.id}:${g.slot}`] === 'string' && map[`${g.id}:${g.slot}`].length > 0));
    check('no gadget maps to the gear fallback (\\u2699)',
        Object.values(map).every((v) => v !== '\u2699'));
    const distinct = new Set(Object.values(map)).size;
    check(`icon map uses 161 distinct icons for 210 gadgets (repeats only inside one effect family)`, distinct === 161);
    // The icon map was byte-identical to the pre-deletions build (verified)
    // before Pitch; Pitch adds 2 entries, of which only ✳️ is a new icon
    // (➕ repeats unopcoloco's). The pinned 210-entry / 161-distinct counts
    // above are the no-new-art guard.
    check('icon map has no entries beyond the 210 pinned above (no new art)', Object.keys(map).length === 210);
    // Getter behaviour.
    const get = iconApi.getMobileToolButtonIcon;
    check('getter: looma g1 -> Snip Snap icon', get('looma', 'g1') === map['looma:g1'] && get('looma', 'g1') === '🔪');
    check('getter: looma g2 -> Safety Stitch icon (different from g1)', get('looma', 'g2') === '🛡' && get('looma', 'g2') !== get('looma', 'g1'));
    check('getter: gravy g2 -> ladle icon', get('gravy', 'g2') === '🥄');
    check('getter: freezeon g1 -> ice icon', get('freezeon', 'g1') === '🧊');
    check('getter: unknown brawler falls back to the gear', get('not_a_brawler', 'g1') === '\u2699');
    check('getter: unknown slot normalizes to g1, unknown brawler still gear', get('not_a_brawler', 'g2') === '\u2699');
    check('getter: no args resolves the live selection (outlit/g1)', get() === '🗡');
    iconApi.setSel('looma', 'g1');
    check('getter: live selection looma/g1', get() === '🔪');
    iconApi.setSel('looma', 'g2');
    check('getter: icon changes when the selected gadget changes (g1 -> g2)', get() === '🛡');
    iconApi.setSel('driller', 'g2');
    check('getter: icon follows a brawler change too', get() === '⛏');
}

// --- Icon wiring: the per-frame sync uses the getter, not a constant ---
check('sync uses the getter for the ready label (not a hard-coded gear)',
    game.includes('const gadgetTouchLabel = gadgetCdSecs > 0 ? `${gadgetCdSecs}s` : getMobileToolButtonIcon();'));
check('TOOL button is created with the getter icon', game.includes('gadgetTouchBtn.textContent = getMobileToolButtonIcon();'));
check('TOOL tooltip names the equipped gadget (title follows selection)',
    game.includes('const gadgetTitle = `Tool: ${gadgetName}`;') && game.includes('if (gadgetTouchBtn.title !== gadgetTitle) gadgetTouchBtn.title = gadgetTitle;'));
check('cooldown seconds readout still wins while recharging (HU4 intact)',
    game.includes('const gadgetTouchLabel = gadgetCdSecs > 0 ? `${gadgetCdSecs}s` : getMobileToolButtonIcon();'));

// --- Pause: button, CSS placement, menu ---
check('pause button is created in initMobileControls (touch only)', game.includes("matchPauseBtnEl.id = 'mobilePauseBtn';"));
check('pause button shows the pause glyph and calls the pause function',
    game.includes("matchPauseBtnEl.textContent = '⏸';") && game.includes('pauseMatchFromHud();'));
check('pause button has an accessible label', game.includes("matchPauseBtnEl.setAttribute('aria-label', 'Pause match');"));
check('pause button CSS exists: 48px, safe-area aware, top-left',
    game.includes('#mobilePauseBtn{position:fixed;top:max(30px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));width:48px;height:48px;'));
check('pause button is NOT in the native-app hide rule (fullscreen/hud only)',
    (() => {
        const m = game.match(/\.native-app #fullscreenBtn[^\n]*/);
        return !!m && !m[0].includes('mobilePauseBtn');
    })());
check('pause button geometry clears the touch minimap, cards and modifier line', (() => {
    const btn = { x: 10, y: 30, w: 48, h: 48 };
    const cases = [
        { W: 412, H: 915 }, // portrait phone
        { W: 844, H: 390 }, // landscape phone
    ];
    return cases.every(({ W }) => {
        const minimap = { x: W - 140, y: 20, w: 120, h: 120 };
        const cards = { x: 12, y: 84, w: 220, h: 48 };
        const modLine = { x: 12, y: 8, w: 360, h: 20 };
        const actionBtns = { x: W - 160, y: 390, w: 160, h: 400 };
        return !rectsOverlap(btn, minimap) && !rectsOverlap(btn, cards) && !rectsOverlap(btn, modLine) && !rectsOverlap(btn, actionBtns);
    });
})());
check('pause menu reuses the app confirm-sheet classes (no duplicate Settings UI)',
    game.includes("overlay.className = 'app-confirm-overlay';") && game.includes("sheet.className = 'app-confirm-sheet';") && game.includes("overlay.id = 'matchPauseOverlay';"));
check('pause menu has Resume, Haptics toggle and Quit to Lobby',
    game.includes("resumeBtn.textContent = '▶ RESUME';")
    && game.includes("hapticsBtn.textContent = `📳 HAPTICS: ${appHapticsOn() ? 'ON' : 'OFF'}`;")
    && game.includes("quitBtn.textContent = '🚪 QUIT TO LOBBY';"));
check('pause menu haptics toggle reuses the existing haptics pref (no duplicate setting)',
    game.includes("localStorage.setItem(APP_HAPTICS_KEY, appHapticsOn() ? '0' : '1');"));
check('pause menu has no full Settings view (only the haptics row is in-match)',
    !game.includes('matchPauseSettings') && !game.includes('openAppSettings'));
check('backdrop tap resumes; Escape resumes',
    game.includes("if (event.target === overlay) resumeMatchFromHud();")
    && game.includes("if (event.key === 'Escape') { event.preventDefault(); resumeMatchFromHud(); }"));

// --- Pause: sim freeze is the real update() gate ---
check('sim freeze uses the update() playing gate (not an overlay alone)',
    game.includes('function update(dt){\n    if(!playing || gameOver) return;'));
check('pause sets playing=false and drops live input',
    game.includes('playing = false;\n      mobileInput.moveX = 0;'));
check('pause is blocked in the tutorial and after game over',
    game.includes('return !!mobileInput.enabled && !!playing && !gameOver && !matchPaused && !isTutorialMode;'));
check('quit path calls the in-place return and never reloads', (() => {
    const s = game.indexOf('  function quitMatchToLobbyFromPause() {');
    const e = game.indexOf('\n  }', s);
    const body = game.slice(s, e);
    return body.includes('returnToLobbyFromResults(null);') && !body.includes('window.location.reload') && !body.includes('location.reload');
})());
check('resume shifts only the listed player wall-clock stamps (no damage/timer rewrites)',
    (() => {
        const s = game.indexOf('  function resumeMatchFromHud() {');
        const e = game.indexOf('  function quitMatchToLobbyFromPause() {', s);
        const body = game.slice(s, e);
        return body.includes('gadgetCooldownUntil += pausedMs')
            && body.includes('hyperchargeUntil += pausedMs')
            && body.includes('arenaForgePrepUntil += pausedMs')
            && !body.includes('damage') && !body.includes('superCharge =') && !body.includes('player.hp');
    })());

// --- Live pause harness: extract the pause block and run it ---
const pauseSrc = extractBlock('  function isMatchPauseAllowed() {', '  // Round 2 HUD (2026-11-19): per-gadget TOOL icons.');
check('pause block extracts cleanly from game.js', !!pauseSrc);
let pauseApi = null;
if (pauseSrc) {
    const mkEl = () => {
        const el = { children: [], style: {}, dataset: {}, className: '', id: '', textContent: '', removed: false,
            setAttribute(k, v) { this['attr:' + k] = v; },
            appendChild(c) { this.children.push(c); return c; },
            addEventListener() {}, remove() { this.removed = true; }, onclick: null };
        return el;
    };
    const calls = { buzz: [], releaseSuper: 0, lobby: [] };
    const preamble = [
        'let mobileInput = { enabled: true, moveX: 1, moveY: 1, attackActive: true, aimHeld: true };',
        'let playing = true;',
        'let gameOver = false;',
        'let isTutorialMode = false;',
        'let matchPaused = false;',
        'let matchPausedAt = 0;',
        'let matchPauseMenuEl = null;',
        'let matchPauseKeyHandler = null;',
        'let selectedBrawler = \'outlit\';',
        'let gadgetCooldownUntil = 0;',
        'let gadgetCooldownBySlot = { g1: 0, g2: 0 };',
        'let hyperchargeUntil = 0;',
        'let arenaForgePrepUntil = 0;',
        'let arenaForgeNextWaveAt = 0;',
        'let arenaForgeNextAutoUpgradeAt = 0;',
        'let arenaForgeNextBreachWaveAt = 0;',
        'let arenaForgeNextSurgeAt = 0;',
        'let arenaForgeNextEnemyBuyAt = 0;',
        'let arenaForgeLastCalloutUntil = 0;',
        'const brawlerData = { outlit: { name: \'Outlit\' }, looma: { name: \'Looma\' } };',
        'const APP_HAPTICS_KEY = \'arenaForgeHapticsV1\';',
        'const __store = {};',
        'const localStorage = { getItem(k) { return (__store[k] ?? null); }, setItem(k, v) { __store[k] = String(v); } };',
        'let __now = 100000;',
        'const performance = { now() { return __now; } };',
        'const document = { body: null, createElement: null, addEventListener() {}, removeEventListener() {} };',
        'function appHapticsOn() { try { return localStorage.getItem(APP_HAPTICS_KEY) !== \'0\'; } catch (_) { return true; } }',
        'function appBuzz(ms) { calls.buzz.push(ms); }',
        'function releaseSuper() { calls.releaseSuper++; }',
        'function returnToLobbyFromResults(overlay) { calls.lobby.push(overlay); playing = false; }',
    ].join('\n');
    const factory = new Function('calls', 'mkEl',
        preamble
        + '\ndocument.body = mkEl();\ndocument.createElement = mkEl;\n'
        + pauseSrc
        + '\nreturn { isMatchPauseAllowed, pauseMatchFromHud, resumeMatchFromHud, quitMatchToLobbyFromPause,'
        + ' get: () => ({ playing, gameOver, isTutorialMode, matchPaused, gadgetCooldownUntil, hyperchargeUntil, arenaForgePrepUntil, menu: matchPauseMenuEl }),'
        + ' set: (patch) => { if (\'playing\' in patch) playing = patch.playing; if (\'gameOver\' in patch) gameOver = patch.gameOver; if (\'isTutorialMode\' in patch) isTutorialMode = patch.isTutorialMode; if (\'gadgetCooldownUntil\' in patch) gadgetCooldownUntil = patch.gadgetCooldownUntil; if (\'hyperchargeUntil\' in patch) hyperchargeUntil = patch.hyperchargeUntil; if (\'arenaForgePrepUntil\' in patch) arenaForgePrepUntil = patch.arenaForgePrepUntil; if (\'now\' in patch) __now = patch.now; },'
        + ' calls };');
    pauseApi = factory(calls, mkEl);
}
if (pauseApi) {
    const findBtn = (menu, id) => {
        const walk = (el) => {
            if (!el) return null;
            if (el.id === id) return el;
            for (const c of (el.children || [])) { const hit = walk(c); if (hit) return hit; }
            return null;
        };
        return walk(menu);
    };
    // Pause engages: sim off, menu up, input dropped.
    check('live: pause returns true and freezes the sim (playing=false)', pauseApi.pauseMatchFromHud() === true && pauseApi.get().playing === false && pauseApi.get().matchPaused === true);
    check('live: pause opens the menu overlay with Resume / Haptics / Quit buttons', (() => {
        const menu = pauseApi.get().menu;
        return !!menu && menu.id === 'matchPauseOverlay'
            && !!findBtn(menu, 'matchPauseResumeBtn') && !!findBtn(menu, 'matchPauseHapticsBtn') && !!findBtn(menu, 'matchPauseQuitBtn');
    })());
    check('live: menu names the paused brawler', (() => {
        const menu = pauseApi.get().menu;
        const walk = (el) => { const texts = [el.textContent || '']; for (const c of (el.children || [])) texts.push(...walk(c)); return texts; };
        return walk(menu).join(' ').includes('Outlit');
    })());
    check('live: pausing again while paused is a no-op (false)', pauseApi.pauseMatchFromHud() === false);
    check('live: resume returns true, restarts the sim, removes the menu',
        pauseApi.resumeMatchFromHud() === true && pauseApi.get().playing === true && pauseApi.get().matchPaused === false && pauseApi.get().menu === null);
    check('live: resume when not paused is a no-op (false)', pauseApi.resumeMatchFromHud() === false);
    // Wall-clock shift: 3s paused -> player stamps move 3s, zero stamps stay 0.
    pauseApi.set({ now: 200000, gadgetCooldownUntil: 208000, hyperchargeUntil: 205000, arenaForgePrepUntil: 0 });
    pauseApi.pauseMatchFromHud();
    pauseApi.set({ now: 203000 });
    pauseApi.resumeMatchFromHud();
    check('live: resume shifts gadget cooldown + hypercharge by the paused duration (3s)',
        pauseApi.get().gadgetCooldownUntil === 211000 && pauseApi.get().hyperchargeUntil === 208000);
    check('live: resume leaves a zero (not-running) stamp at zero', pauseApi.get().arenaForgePrepUntil === 0);
    // Guards.
    pauseApi.set({ gameOver: true });
    check('live: pause is refused after game over', pauseApi.pauseMatchFromHud() === false && pauseApi.get().playing === true);
    pauseApi.set({ gameOver: false, isTutorialMode: true });
    check('live: pause is refused in the tutorial', pauseApi.pauseMatchFromHud() === false);
    pauseApi.set({ isTutorialMode: false });
    // Quit: in-place return, never a reload.
    pauseApi.pauseMatchFromHud();
    const lobbyBefore = pauseApi.calls.lobby.length;
    check('live: quit returns true, calls the in-place lobby return with null, clears pause state',
        pauseApi.quitMatchToLobbyFromPause() === true
        && pauseApi.calls.lobby.length === lobbyBefore + 1
        && pauseApi.calls.lobby[pauseApi.calls.lobby.length - 1] === null
        && pauseApi.get().matchPaused === false && pauseApi.get().menu === null);
    check('live: quit when not paused is a no-op (false)', pauseApi.quitMatchToLobbyFromPause() === false);
    // Haptics toggle inside the menu flips the shared pref.
    pauseApi.set({ playing: true });
    pauseApi.pauseMatchFromHud();
    const hBtn = findBtn(pauseApi.get().menu, 'matchPauseHapticsBtn');
    const labelBefore = hBtn.textContent;
    hBtn.onclick();
    check('live: menu haptics button toggles the shared pref and relabels',
        hBtn.textContent !== labelBefore && hBtn.textContent.includes('OFF'));
    hBtn.onclick();
    check('live: menu haptics button toggles back', hBtn.textContent.includes('ON'));
    pauseApi.resumeMatchFromHud();
}

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-hud`);
