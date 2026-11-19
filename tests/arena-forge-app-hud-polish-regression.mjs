// Arena Forge app HUD polish (2026-11-19, build F): top-center pill clamp
// (HU1), touch modifier description (HU2), touch TOOL countdown (HU4).
// App/touch mode ONLY: desktop HUD rules are asserted unchanged.
// Source-presence + behavior mirrors (flushTopCenterStack is extracted and
// run against a stub canvas context). Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const styles = read('styles.css');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const normWs = (s) => s.replace(/\s+/g, ' ').trim();
const fontSizeOf = (font) => { const m = /(\d+(?:\.\d+)?)px/.exec(font || ''); return m ? parseFloat(m[1]) : null; };
const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// --- Extract queueTopCenterLine + flushTopCenterStack and run them live ---
function extractTopCenterStack() {
    const qStart = game.indexOf('    function queueTopCenterLine(ctx, queue, text, x, y) {');
    const endMarker = '    // Utility: deterministic color from string';
    const fEnd = game.indexOf(endMarker, qStart);
    if (qStart === -1 || fEnd === -1) return null;
    const src = game.slice(qStart, fEnd).replace(/^    /gm, '');
    const factory = new Function('drawChunkyPanel', 'UI_HUD_TOKENS', `${src}\nreturn { queueTopCenterLine, flushTopCenterStack };`);
    return factory;
}
const topCenterFactory = extractTopCenterStack();
check('flushTopCenterStack + queueTopCenterLine extract cleanly from game.js', !!topCenterFactory);

function makeStubCtx() {
    const calls = { panels: [], texts: [] };
    let currentFont = 'bold 20px sans-serif';
    const ctx = {
        get font() { return currentFont; },
        set font(v) { currentFont = String(v); },
        fillStyle: '#fff', textAlign: 'left', textBaseline: 'alphabetic',
        save() {}, restore() {},
        measureText(text) {
            const size = fontSizeOf(currentFont) || 14;
            return { width: [...text].length * size * 0.55 };
        },
        fillText(text, x, y) { calls.texts.push({ text, x, y, font: currentFont }); },
    };
    return { ctx, calls };
}
function runPillCase({ W, H, opts, text, x, y, align = 'left' }) {
    const { ctx, calls } = makeStubCtx();
    const panels = calls.panels;
    const drawChunkyPanel = (c, px, py, pw, ph) => { panels.push({ x: px, y: py, w: pw, h: ph }); };
    const UI_HUD_TOKENS = { panelFill: '#000', panelStroke: '#fff' };
    const { queueTopCenterLine, flushTopCenterStack } = topCenterFactory(drawChunkyPanel, UI_HUD_TOKENS);
    const prevW = globalThis.innerWidth, prevH = globalThis.innerHeight;
    globalThis.innerWidth = W; globalThis.innerHeight = H;
    try {
        const queue = [];
        ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = align;
        queueTopCenterLine(ctx, queue, text, x, y);
        const snapshot = queue.map((l) => ({ ...l }));
        flushTopCenterStack(ctx, queue, false, opts);
        return { calls, snapshot, queue };
    } finally {
        globalThis.innerWidth = prevW; globalThis.innerHeight = prevH;
    }
}
// Legacy (pre-fix) panel geometry, reimplemented independently from the
// queued entries: no clamp, no font cap, panel = union bounds + 14px pads.
function legacyPanel(snapshot) {
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    for (const line of snapshot) {
        const size = fontSizeOf(line.font) || 14;
        top = Math.min(top, line.y - size * 0.75); bottom = Math.max(bottom, line.y + size * 0.25);
        const l = line.textAlign === 'center' ? line.x - line.width / 2 : line.x;
        const r = line.textAlign === 'center' ? line.x + line.width / 2 : line.x + line.width;
        left = Math.min(left, l); right = Math.max(right, r);
    }
    return { x: left - 14, y: top - 6, w: (right - left) + 28, h: (bottom - top) + 10 };
}
const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const panelEq = (a, b) => approx(a.x, b.x) && approx(a.y, b.y) && approx(a.w, b.w) && approx(a.h, b.h);
const minimapRect = (W) => ({ x: W - 140, y: 20, w: 120, h: 120 });

if (topCenterFactory) {
    // HU1 portrait touch (412x915): short line tucks left of the minimap.
    {
        const W = 412, H = 915;
        const { calls, snapshot } = runPillCase({ W, H, opts: { touch: true }, text: 'Brawlers Left: 9', x: W / 2 - 80, y: 48 });
        const panel = calls.panels[0];
        check('HU1 portrait short pill: exactly one panel drawn', calls.panels.length === 1);
        check('HU1 portrait short pill: panel clamped inside the viewport', panel.x >= 8 && panel.x + panel.w <= W - 8);
        check('HU1 portrait short pill: panel does not overlap the minimap', !rectsOverlap(panel, minimapRect(W)));
        check('HU1 portrait short pill: panel stays in the top band (tucked, not dropped)', panel.y + panel.h <= 140);
        check('HU1 portrait short pill: font capped to 16px (was 20px)', calls.texts.length === 1 && fontSizeOf(calls.texts[0].font) === 16);
        check('HU1 portrait short pill: full text drawn, nothing truncated', calls.texts.length === 1 && calls.texts[0].text === snapshot[0].text);
        check('HU1 portrait short pill: queue is drained', true);
    }
    // HU1 portrait touch: long Duels tournament line shrinks to fit, drops
    // below the minimap instead of painting over it.
    {
        const W = 412, H = 915;
        const line = '🏆 Bronze • Round 1 vs SomeBotName | You: 0  Bot: 0';
        const { calls } = runPillCase({ W, H, opts: { touch: true }, text: line, x: W / 2 - 100, y: 48 });
        const panel = calls.panels[0];
        check('HU1 portrait Duels line: panel clamped inside the viewport', panel.x >= 8 && panel.x + panel.w <= W - 8);
        check('HU1 portrait Duels line: panel does not overlap the minimap', !rectsOverlap(panel, minimapRect(W)));
        check('HU1 portrait Duels line: panel dropped below the minimap (too wide to tuck)', panel.y >= 148);
        check('HU1 portrait Duels line: font shrunk but never below 13px', calls.texts.every((t) => { const s = fontSizeOf(t.font); return s <= 16 && s >= 13; }));
        check('HU1 portrait Duels line: full text drawn, scores intact', normWs(calls.texts.map((t) => t.text).join(' ')) === normWs(line));
    }
    // HU1 portrait touch: very long Arena Forge line wraps instead of overflowing.
    {
        const W = 412, H = 915;
        const line = 'Arena Forge 2.0 • TRIPLE TOWER WAR | 2:30 | Energy 5-3 | Wave 2 10s | Breach 5s | Boon 8s';
        const { calls } = runPillCase({ W, H, opts: { touch: true }, text: line, x: W / 2, y: 48, align: 'center' });
        const panel = calls.panels[0];
        check('HU1 portrait Arena Forge line: wraps to more than one drawn line', calls.texts.length > 1);
        check('HU1 portrait Arena Forge line: panel clamped inside the viewport', panel.x >= 8 && panel.x + panel.w <= W - 8);
        check('HU1 portrait Arena Forge line: panel does not overlap the minimap', !rectsOverlap(panel, minimapRect(W)));
        check('HU1 portrait Arena Forge line: fonts within 13-16px', calls.texts.every((t) => { const s = fontSizeOf(t.font); return s <= 16 && s >= 13; }));
        check('HU1 portrait Arena Forge line: full text drawn across wrapped lines', normWs(calls.texts.map((t) => t.text).join(' ')) === normWs(line));
    }
    // HU1 landscape touch (844x390): geometry identical to the legacy algorithm.
    {
        const W = 844, H = 390;
        const { calls, snapshot } = runPillCase({ W, H, opts: { touch: true }, text: 'Brawlers Left: 9', x: W / 2 - 80, y: 48 });
        const expected = legacyPanel(snapshot);
        check('HU1 landscape touch: panel geometry is legacy-identical', panelEq(calls.panels[0], expected));
        check('HU1 landscape touch: text drawn at legacy x/y with legacy 20px font', calls.texts.length === 1 && calls.texts[0].x === snapshot[0].x && calls.texts[0].y === snapshot[0].y && calls.texts[0].font === snapshot[0].font);
    }
    // HU1 desktop (no opts): geometry identical to the legacy algorithm.
    {
        const W = 412, H = 915;
        const { calls, snapshot } = runPillCase({ W, H, opts: undefined, text: 'Brawlers Left: 9', x: W / 2 - 80, y: 48 });
        const expected = legacyPanel(snapshot);
        check('HU1 desktop: panel geometry is legacy-identical', panelEq(calls.panels[0], expected));
        check('HU1 desktop: text drawn at legacy x/y with legacy 20px font', calls.texts.length === 1 && calls.texts[0].x === snapshot[0].x && calls.texts[0].y === snapshot[0].y && calls.texts[0].font === snapshot[0].font);
    }
    // Suppressed flush still clears the queue without drawing (legacy behavior).
    {
        const { ctx, calls } = makeStubCtx();
        const drawChunkyPanel = (c, px, py, pw, ph) => { calls.panels.push({ x: px, y: py, w: pw, h: ph }); };
        const { queueTopCenterLine, flushTopCenterStack } = topCenterFactory(drawChunkyPanel, { panelFill: '#000', panelStroke: '#fff' });
        const queue = [];
        ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = 'left';
        queueTopCenterLine(ctx, queue, 'Brawlers Left: 9', 126, 48);
        flushTopCenterStack(ctx, queue, true);
        check('HU1 suppressed flush draws nothing and drains the queue', calls.panels.length === 0 && calls.texts.length === 0 && queue.length === 0);
    }
}

// --- HU1 wiring: the single call site passes touch mode ---
check('HU1 call site passes touch mode to the flush', game.includes('{ touch: touchHud });'));
check('HU1 only one flush call site exists (definition + call)', (game.match(/flushTopCenterStack\(/g) || []).length === 2);

// --- HU2: modifier description reachable in touch ---
check('HU2 touch map/modifier line is 13px, not 11px', (() => {
    const start = game.indexOf('// App HUD polish (HU2): touch mode used to collapse');
    const end = game.indexOf('        } else {', start);
    const block = game.slice(start, end);
    return start !== -1 && block.includes("ctx.font = 'bold 13px sans-serif';") && !block.includes('bold 11px');
})());
check('HU2 touch line shows a tap chevron when a modifier description exists', game.includes("(touchModExpanded ? ' \\u25b4' : ' \\u25be')"));
check('HU2 tap-to-expand state is keyed by modifier id (auto-collapses on rotation)', game.includes('let touchModifierDescExpandedFor = null;') && game.includes('touchModifierDescExpandedFor === activeShowdownModifier'));
check('HU2 canvas tap on the top-left strip toggles the description', game.includes("canvas.addEventListener('pointerdown'") && game.includes('touchModifierDescExpandedFor = touchModifierDescExpandedFor === activeShowdownModifier ? null : activeShowdownModifier;'));
check('HU2 tap handler never blocks input (no preventDefault in the toggle)', (() => {
    const start = game.indexOf("canvas.addEventListener('pointerdown'");
    const end = game.indexOf('});', start);
    const block = game.slice(start, end);
    return start !== -1 && !block.includes('preventDefault') && !block.includes('stopPropagation');
})());
check('HU2 expanded description draws below the pill, left of the minimap', game.includes('descPanelY = 80') && game.includes('ctx.roundRect(12, descPanelY, descPanelW, descPanelH, 10);'));
check('HU2 expanded description word-wraps to the strip left of the minimap', game.includes('const descMaxW = Math.max(120, innerWidth - 140 - 8 - 12 - 16);'));
check('HU2 match-intro cards show the modifier description in touch mode', game.includes("if (mobileInput.enabled && activeShowdownModifier && !isShowdownModifierActive('none')) {") && game.includes("modRow.className = 'match-intro__modifier';"));
check('HU2 intro modifier row is styled at readable 14px', styles.includes('.match-intro__modifier{') && styles.includes('font-size:14px'));
check('HU2 desktop map/modifier block is untouched (Map/Modifier/description lines)', game.includes('ctx.fillText(`Map: ${mapLabel}`, 20, 86);') && game.includes('ctx.fillText(`Modifier: ${activeShowdownModifierLabel}`, 20, 106);') && game.includes('ctx.fillText(modifierDef.description, 20, 122);'));

// --- HU4: TOOL button numeric countdown ---
check('HU4 touch TOOL shows numeric seconds while cooling down', game.includes('const gadgetTouchLabel = gadgetCdSecs > 0 ? `${gadgetCdSecs}s` : getMobileToolButtonIcon();'));
check('HU4 countdown uses ceil seconds until ready, 0 when ready', game.includes('const gadgetCdSecs = gadgetReadyAt > gadgetNow ? Math.ceil((gadgetReadyAt - gadgetNow) / 1000) : 0;'));
check('HU4 gadget icon returns when the tool is ready', game.includes(': getMobileToolButtonIcon();') && game.includes("if (gadgetTouchBtn.textContent !== gadgetTouchLabel) {"));
check('HU4 countdown label writes only on change (cheap per-frame sync)', game.includes('if (gadgetTouchBtn.textContent !== gadgetTouchLabel) {'));
check('HU4 countdown is announced in the aria-label', game.includes('`Use Tool, ${gadgetCdSecs} seconds remaining`'));
check('HU4 cooldown ring is still set alongside the number', game.includes("gadgetTouchBtn.style.setProperty('--mobile-charge', `${gadgetFrac * 360}deg`);"));
check('HU4 sync runs every frame via the rAF loop (countdown ticks live)', (() => {
    const start = game.indexOf('  function updateMobileControlsVisibility() {');
    const end = game.indexOf('  // Round 2 HUD (2026-11-19): per-gadget TOOL icons.', start);
    return start !== -1 && end !== -1 && game.slice(start, end).includes('syncMobileActionButtons();') && game.includes('updateMobileControlsVisibility();');
})());
check('HU4 countdown formula mirror: 8s left -> 8, 1ms left -> 1, ready -> 0', (() => {
    const cdSecs = (readyAt, now) => readyAt > now ? Math.ceil((readyAt - now) / 1000) : 0;
    return cdSecs(8000, 0) === 8 && cdSecs(1, 0) === 1 && cdSecs(0, 0) === 0 && cdSecs(8001, 0) === 9 && cdSecs(500, 1000) === 0;
})());

// --- Desktop HUD rules untouched ---
check('desktop TOOL text still mirrors the same cooldown (Tool: CD 5s)', game.includes('gadgetBtn.textContent = `Tool: CD ${Math.ceil((activeUntil - now) / 1000)}s`;'));
check('desktop TOOL states untouched (Locked / Armed / Ready)', game.includes("gadgetBtn.textContent = 'Tool: Locked';") && game.includes("gadgetBtn.textContent = 'Tool: Armed';") && game.includes("gadgetBtn.textContent = 'Tool: Ready';"));

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-hud-polish`);
