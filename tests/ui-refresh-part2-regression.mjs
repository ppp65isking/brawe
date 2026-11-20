// UI Refresh Part 2 — mode panels + top-center stack + results backdrop
// (Thanksgiving Phase 7E completion / 7F-lite).
// Scope: the 12 square canvas mode panels -> drawChunkyPanel (radius 12, no
// slab); the alive line (y=48) + mode-rule lines (y=60) + Arena Forge callout
// (y=69) -> one shared top-center stack panel; the results-overlay backdrop
// -> the --af-overlay-backdrop token (value-identical). No text, font, colour,
// coordinate, or condition changes anywhere — only the painter / value source.
//
// Behavioural where render behaviour matters: the helpers are executed in a VM
// against a recording fake canvas context using the REAL helper code extracted
// from game.js, the REAL strings/fonts/colours, and a deterministic measureText
// (the production code calls the real canvas measureText — the panel width is
// derived from the measured width, never a hardcoded estimate).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const pristine = fs.readFileSync(new URL('../.backups/game.js.c9afa62-pre', import.meta.url), 'utf8');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
function near(a, b, eps = 0.01) { return Math.abs(a - b) <= eps; }

// ---------------------------------------------------------- 1. CSS token
check('token --af-overlay-backdrop defined once, value-identical to the old backdrop',
  (css.match(/--af-overlay-backdrop: rgba\(2, 8, 18, 0\.94\)/g) || []).length === 1);
check('results overlay uses the backdrop token',
  css.includes('background:var(--af-overlay-backdrop)'));
check('no hardcoded copy of the results backdrop left in styles.css',
  !css.includes('rgba(2,8,18,.94)'));
check('part-1 tokens still present (no token lost)',
  css.includes('--af-radius-xl: 24px') && css.includes('--af-hud-panel: rgba(4, 8, 16, 0.56)') &&
  css.includes('--af-panel-grad: linear-gradient(155deg, #102b48, #09172a 58%, #111329)'));

// ---------------------------------------------------------- 2. mode panels (9 kept)
const PANELS = [
  ['Prop Hunt', "drawChunkyPanel(ctx, innerWidth / 2 - bannerW / 2, 78, bannerW, bannerH, { radius: 12, fill: 'rgba(24, 18, 4, 0.85)', stroke: 'rgba(255, 209, 102, 0.8)', lineWidth: 2 });"],
  ['Turkey Capture', "drawChunkyPanel(ctx, innerWidth / 2 - bannerW / 2, 78, bannerW, 36, { radius: 12, fill: 'rgba(32, 16, 4, 0.85)', stroke: 'rgba(255, 179, 71, 0.8)', lineWidth: 2 });"],
  ['Control Clash', "drawChunkyPanel(ctx, innerWidth / 2 - bannerW / 2, 78, bannerW, 36, { radius: 12, fill: 'rgba(4, 14, 32, 0.85)', stroke: 'rgba(120, 190, 255, 0.75)', lineWidth: 2 });"],
  ['Brick Vault', "drawChunkyPanel(ctx, panelX, panelY, panelW, panelH, { radius: 12, fill: 'rgba(4, 14, 32, 0.88)', stroke: heistFeverActive ? '#ff0055' : 'rgba(125, 210, 255, 0.78)', lineWidth: heistFeverActive ? 3 : 2 });"],
  ['Arena Forge', "drawChunkyPanel(ctx, panelX, panelY, 530, 76, { radius: 12, fill: 'rgba(4, 14, 32, 0.82)', stroke: arenaForgeOvertime ? '#ffcf66' : '#63e6be', lineWidth: 2 });"],
  ['Knock n Donate', "drawChunkyPanel(ctx, innerWidth / 2 - 240, 78, 480, 40, { radius: 12, fill: 'rgba(4, 14, 32, 0.78)', stroke: 'rgba(125, 210, 255, 0.75)', lineWidth: 2 });"],
  ['Trio Showdown', "drawChunkyPanel(ctx, innerWidth / 2 - 205, 78, 410, 40, { radius: 12, fill: 'rgba(4, 14, 32, 0.78)', stroke: 'rgba(125, 210, 255, 0.75)', lineWidth: 2 });"],
  ['Damage Filler', "drawChunkyPanel(ctx, panelX, panelY, 530, panelH, { radius: 12, fill: 'rgba(4, 14, 32, 0.8)', stroke: 'rgba(125, 210, 255, 0.78)', lineWidth: 2 });"],
  ['Mirror 5v5', "drawChunkyPanel(ctx, panelX, panelY, 500, 58, { radius: 12, fill: 'rgba(4, 14, 32, 0.8)', stroke: 'rgba(125, 210, 255, 0.78)', lineWidth: 2 });"],
];
for (const [name, snippet] of PANELS) {
  check(`mode panel migrated with exact old geometry/fill/stroke: ${name}`, game.includes(snippet));
}
const OLD_PANEL_STROKES = [
  'ctx.strokeRect(innerWidth / 2 - bannerW / 2, 78, bannerW, bannerH);',
  'ctx.strokeRect(innerWidth / 2 - bannerW / 2, 78, bannerW, 36);',
  'ctx.strokeRect(innerWidth / 2 - bannerW / 2, 78, bannerW, brickCountdownTeam ? 52 : 36);',
  'ctx.strokeRect(panelX, panelY, panelW, panelH);',
  'ctx.strokeRect(panelX, panelY, 530, 76);',
  'ctx.strokeRect(panelX, panelY, 470, 52);',
  'ctx.strokeRect(panelX,panelY,490,50);',
  'ctx.strokeRect(innerWidth / 2 - 240, 78, 480, 40);',
  'ctx.strokeRect(innerWidth / 2 - 205, 78, 410, 40);',
  'ctx.strokeRect(panelX, panelY, 530, panelH);',
  'ctx.strokeRect(panelX, panelY, 500, 58);',
];
for (const s of OLD_PANEL_STROKES) {
  check(`old square panel strokeRect gone: ${s.slice(0, 52)}…`, !game.includes(s));
}
// Inner progress bars are bars, not panels — untouched.
for (const [name, snippet] of [
  ['Control Clash blue/red bars', 'ctx.fillRect(innerWidth / 2 - bannerW / 2 + 8, 104, (bannerW / 2 - 14) * (bluePct / 100), 5);'],
  ['Control Clash red bar', 'ctx.fillRect(innerWidth / 2 + 6, 104, (bannerW / 2 - 14) * (redPct / 100), 5);'],
  ['Arena Forge integrity bars', "ctx.fillRect(panelX + 18, panelY + 28, 220 * ownPct, 10);"],
  ['Damage Filler bars', 'ctx.fillRect(panelX + 18, panelY + 32, 228 * playerPct, 10);'],
  ['Mirror bars', 'ctx.fillRect(panelX + 18, panelY + 32, 210 * yourPct, 10);'],
]) check(`inner progress bar untouched: ${name}`, game.includes(snippet));
// Mode-panel inner texts untouched.
for (const [name, snippet] of [
  ['Prop Hunt line 1', 'ctx.fillText(phLine1, innerWidth / 2, 96);'],
  ['Turkey line', 'CAPTURE THE TURKEY'],
  ['Control Clash line', 'CONTROL CLASH'],
  ['Brick Vault title', 'ctx.fillText(`${feverTag}  •  ⏱️ ${timeLeft}s`, innerWidth / 2, panelY + 18);'],
  ['Arena Forge title', 'TOTAL BASE INTEGRITY'],
]) check(`mode-panel text untouched: ${name}`, game.includes(snippet));

// ---------------------------------------------------------- 3. stack call sites
const queueCalls = (game.match(/queueTopCenterLine\(ctx, topCenterStackQueue, /g) || []).length;
check('19 queue call sites (deleted-mode arms removed with the modes)',
  queueCalls === 19);
check('queue declared once, just before the alive counter',
  (game.match(/const topCenterStackQueue = \[\];/g) || []).length === 1 &&
  game.indexOf('const topCenterStackQueue = [];') < game.indexOf('queueTopCenterLine(ctx, topCenterStackQueue, '));
check('flush called once, after the rule chain, before renderHypeChainHud',
  (game.match(/flushTopCenterStack\(ctx, topCenterStackQueue,/g) || []).length === 1 &&
  game.indexOf('flushTopCenterStack(ctx, topCenterStackQueue,') > game.indexOf('queueTopCenterLine(ctx, topCenterStackQueue, ') &&
  game.indexOf('flushTopCenterStack(ctx, topCenterStackQueue,') < game.indexOf('renderHypeChainHud();'));
check('flush is suppressed only in the tutorial now (deleted-mode arms removed)',
  game.includes('flushTopCenterStack(ctx, topCenterStackQueue,\n        isTutorialMode,'));
check('helpers defined next to drawChunkyPanel',
  game.includes('function queueTopCenterLine(ctx, queue, text, x, y)') &&
  game.includes('function flushTopCenterStack(ctx, queue, suppressed, opts)') &&
  game.indexOf('function queueTopCenterLine') > game.indexOf('function drawChunkyPanel'));
// No bare top-center fillText left at y=48/60/69 in the HUD region.
const hudRegion = game.slice(game.indexOf('// Alive counter'), game.indexOf('renderHypeChainHud();'));
const bareTop = hudRegion.match(/ctx\.fillText\([^;]*?, (48|60|69)\);/g) || [];
check('no bare top-center fillText left at y=48/60/69 in the HUD region', bareTop.length === 0);
// Deliberately bare lines stay bare (transient / squeezed / effect lines).
for (const [name, snippet] of [
  ['Duo/Trio rally line (y=74)', 'innerWidth/2 - 125, 74)'],
  ['Darkagon label (y=42)', "'DARKAGON — OUTSIDE VISION BLOCKED'"],
  ['Ghoul darkness label (y=40)', 'DARKNESS ${Math.ceil'],
  ['LOW/CRITICAL HP flash (y=96)', "'CRITICAL HP' : 'LOW HP', innerWidth / 2, 96"],
  ['boss respawn strip (full-width band)', "ctx.fillRect(0, innerHeight/2 - 60, innerWidth, 80);"],
  ['Map/Modifier captions (x=20)', 'ctx.fillText(`Map: ${mapLabel}`, 20, 86);'],
]) check(`deliberately unmigrated line stays bare: ${name}`, game.includes(snippet));
// Text literals preserved verbatim (spot-check the queued strings).
for (const s of [
  "'Brawlers Left: ' + aliveCount",
  '`Duels | You: ${playerScore}  Bot: ${botScore}`',
  "'TRAINING MODE · ALL ABILITIES ENABLED'",
  "'🔥 TRIO SHOWDOWN - NO RESPAWNS, STORM CLOSES, LAST TRIO WINS 🔥'",
  '`🪞 MIRROR 5V5 - ${mirrorModeBrawler.toUpperCase()} ONLY - FIRST TO ${MIRROR_KILL_GOAL} KILLS 🪞`',
]) check(`queued text literal preserved verbatim: ${s.slice(0, 44)}…`, game.includes(s));

// ---------------------------------------------------------- 4. part-1 sites intact
const chunkyCalls = (game.match(/drawChunkyPanel\(ctx, /g) || []).length;
check('drawChunkyPanel call sites: 20 (deleted-mode panels removed with the modes)',
  (game.match(/drawChunkyPanel\(ctx, /g) || []).length === 20);
check('part-1 HUD sites still present (Attack/Super cards, minimap, bars, kit, badge)',
  game.includes("drawChunkyPanel(ctx, x, readY, cardW, readH, {") &&
  game.includes('drawChunkyPanel(ctx, 0, 0, mapW, mapH,') &&
  game.includes('drawChunkyPanel(ctx, bx-6, by-6, barW+12, barH+12,') &&
  game.includes('drawChunkyPanel(ctx, badgeX, badgeY, badgeW, badgeH,'));
check('part-1 banner sites still present (respawn / PREPARE)',
  game.includes("drawChunkyPanel(ctx, panelX, panelY, panelW, 92, { radius: 18, fill: respawnGradient") &&
  game.includes("drawChunkyPanel(ctx, panelX, panelY, panelW, panelH, { radius: 22, fill: 'rgba(6, 16, 34, 0.92)'"));
check('PR #42: doHeal still refuses Arena Forge towers',
  game.includes('if(entity.isArenaForgeTower) return;') &&
  game.includes('const ARENA_FORGE_TOWERS_HEAL_ENABLED = false;'));
check('game.js is still one IIFE (no ES modules, no split)',
  game.startsWith('(function(){') && game.includes('})();') &&
  !game.includes('\nexport ') && !game.includes('\nimport '));

// ---------------------------------------------------------- 5. DOM overlays stay put
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, lineComment = false, blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i], nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === inS) inS = null; continue; }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
const mutatorPicker = extractFn(game, 'openCustomMutatorPickerUI');
check('DOM overlays unmigrated: custom mutator picker has no chunky helper',
  !mutatorPicker.includes('drawChunkyPanel'));
check('DOM overlays unmigrated: season-3 panel keeps its bespoke 22px radius',
  css.includes('.season3-panel{width:min(1050px,96vw)') && css.includes('border-radius:22px;background:radial-gradient'));
check('no pause panel exists to migrate (only the runtime-error title + pureHTML hook)',
  !game.includes('showPause') && !game.includes('pauseMenu') &&
  game.includes("title.textContent = 'Match Paused Due To Runtime Error'"));

// ---------------------------------------------------------- 6. VM: helpers, real code
function extractConst(src, name) {
  const start = src.indexOf('const ' + name + ' =');
  assert.notEqual(start, -1, name + ' not found');
  const end = src.indexOf('};', start);
  return src.slice(start, end + 2);
}
const sandbox = { Math, performance: { now: () => 100000 } };
vm.createContext(sandbox);
function tryExtractFn(src, name) {
  try { return extractFn(src, name); } catch { return null; }
}
const helperSrcs = [
  extractConst(game, 'UI_HUD_TOKENS'),
  extractFn(game, 'drawChunkyPanel'),
  tryExtractFn(game, 'queueTopCenterLine'),
  tryExtractFn(game, 'flushTopCenterStack'),
];
const vmReady = helperSrcs.every(Boolean);
if (!vmReady) failures.push('VM: stack helpers missing from game.js (expected on pristine main — helpers do not exist there)');
else vm.runInContext(helperSrcs.join('\n'), sandbox);

function recordingCtx() {
  const calls = [];
  const ctx = {
    calls,
    font: 'bold 20px sans-serif', fillStyle: '#cfeef7', textAlign: 'left',
    textBaseline: 'alphabetic', lineWidth: 1,
    saveCount: 0, restoreCount: 0,
    save() { this.saveCount++; calls.push(['save']); },
    restore() { this.restoreCount++; calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    roundRect(x, y, w, h, r) { calls.push(['roundRect', x, y, w, h, r]); },
    fill() { calls.push(['fill', this.fillStyle]); },
    stroke() { calls.push(['stroke', this.strokeStyle, this.lineWidth]); },
    // Deterministic stand-in for the real canvas measureText: proportional to
    // the font size, exactly like a real canvas (width scales with size).
    measureText(text) {
      const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
      const size = m ? parseFloat(m[1]) : 14;
      return { width: String(text).length * size * 0.6 };
    },
    fillText(text, x, y) { calls.push(['fillText', text, x, y, this.font, this.fillStyle, this.textAlign]); },
  };
  return ctx;
}
const IW = 1280;

if (vmReady) try {
  // Solo Showdown: alive line (left-aligned, 20px, y=48) + no rule line.
  const ctx = recordingCtx();
  const q = [];
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = 'left';
  sandbox.queueTopCenterLine(ctx, q, 'Brawlers Left: 7', IW / 2 - 80, 48);
  check('VM queue: records the REAL measured width (16 chars x 20px x 0.6 = 192)',
    q.length === 1 && near(q[0].width, 192) && q[0].font === 'bold 20px sans-serif' &&
    q[0].fillStyle === '#cfeef7' && q[0].textAlign === 'left');
  sandbox.flushTopCenterStack(ctx, q, false);
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  const texts = ctx.calls.filter((c) => c[0] === 'fillText');
  check('VM solo: exactly ONE panel behind the single line (27..57 for a 20px line at y=48)',
    rects.length === 1 && near(rects[0][1], 560 - 14) && near(rects[0][2], 27) &&
    near(rects[0][3], 192 + 28) && near(rects[0][4], 30) && rects[0][5] === 14);
  check('VM solo: the text is drawn at exactly its old x/y, font and colour',
    texts.length === 1 && texts[0][1] === 'Brawlers Left: 7' && texts[0][2] === 560 &&
    texts[0][3] === 48 && texts[0][4] === 'bold 20px sans-serif' && texts[0][5] === '#cfeef7');
  check('VM solo: panel drawn BEFORE the text (panel cannot cover it)',
    ctx.calls.findIndex((c) => c[0] === 'roundRect') < ctx.calls.findIndex((c) => c[0] === 'fillText'));
  check('VM solo: queue is emptied by the flush (second flush draws nothing)',
    q.length === 0 && (() => { sandbox.flushTopCenterStack(ctx, q, false); return ctx.calls.filter((c) => c[0] === 'roundRect').length === 1; })());
} catch (e) { failures.push('VM solo stack threw: ' + e.message); }

if (vmReady) try {
  // Target Rush: alive line (left) + rule line (centered, 14px, y=60).
  const ctx = recordingCtx();
  const q = [];
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = 'left';
  sandbox.queueTopCenterLine(ctx, q, 'Target Rush | You 0-0 Enemy | 3:00', IW / 2 - 205, 48);
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#ff8fbd'; ctx.textAlign = 'center';
  sandbox.queueTopCenterLine(ctx, q, 'TARGET RUSH - MARKED KO = 3, NORMAL KO = 1, FIRST TO 10', IW / 2, 60);
  sandbox.flushTopCenterStack(ctx, q, false);
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  const texts = ctx.calls.filter((c) => c[0] === 'fillText');
  // Alive: 34 chars x 20 x 0.6 = 408 wide, x 435..843. Rule: 55 chars x 14 x 0.6 = 462,
  // centered 640 -> 409..871. Union 409..871 -> panel x 395, w 490. Top 27, bottom 67.5.
  check('VM duo-line: ONE shared panel (not two overlapping pills)',
    rects.length === 1);
  check('VM duo-line: panel spans the union of both lines + 14px side padding',
    near(rects[0][1], 395) && near(rects[0][3], 490) && near(rects[0][2], 27) && near(rects[0][4], 40.5));
  check('VM duo-line: both texts replayed at their exact old coords/styles',
    texts.length === 2 &&
    texts[0][1] === 'Target Rush | You 0-0 Enemy | 3:00' && texts[0][2] === 435 && texts[0][3] === 48 &&
    texts[0][6] === 'left' &&
    texts[1][1] === 'TARGET RUSH - MARKED KO = 3, NORMAL KO = 1, FIRST TO 10' && texts[1][2] === 640 &&
    texts[1][3] === 60 && texts[1][4] === 'bold 14px sans-serif' && texts[1][5] === '#ff8fbd' &&
    texts[1][6] === 'center');
} catch (e) { failures.push('VM duo-line stack threw: ' + e.message); }

if (vmReady) try {
  // Arena Forge: alive + rule + callout (y=69) — stack bottom must stay <= 78
  // (the integrity panel top) so the stack never paints over a mode panel.
  const ctx = recordingCtx();
  const q = [];
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = 'center';
  sandbox.queueTopCenterLine(ctx, q, 'Arena Forge | PREPARE 5s', IW / 2, 48);
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#7fffd4'; ctx.textAlign = 'center';
  sandbox.queueTopCenterLine(ctx, q, 'ARENA FORGE 3V3 - BREAK 2 TOWERS, THEN DESTROY THE CORE', IW / 2, 60);
  ctx.font = '900 15px sans-serif'; ctx.fillStyle = '#ffcf66'; ctx.textAlign = 'center';
  sandbox.queueTopCenterLine(ctx, q, 'WAVE INCOMING', IW / 2, 69);
  sandbox.flushTopCenterStack(ctx, q, false);
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  check('VM AF 3-line: one panel, bottom 76.75 — clear of the integrity panel top (78)',
    rects.length === 1 && near(rects[0][2] + rects[0][4], 76.75) && (rects[0][2] + rects[0][4]) <= 78);
  check('VM AF 3-line: all three texts replayed',
    ctx.calls.filter((c) => c[0] === 'fillText').length === 3);
} catch (e) { failures.push('VM AF stack threw: ' + e.message); }

if (vmReady) try {
  // Suppression: Impossible / Brawe Ball / Knockout / WeeFee / BlinkEye / Tutorial.
  const ctx = recordingCtx();
  const q = [];
  ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#cfeef7'; ctx.textAlign = 'left';
  sandbox.queueTopCenterLine(ctx, q, 'Brawlers Left: 7', IW / 2 - 80, 48);
  sandbox.flushTopCenterStack(ctx, q, true);
  check('VM suppressed: draws NO panel and NO text (the covering HUD owns the area)',
    !ctx.calls.some((c) => c[0] === 'roundRect') && !ctx.calls.some((c) => c[0] === 'fillText'));
  check('VM suppressed: queue still emptied', q.length === 0);
} catch (e) { failures.push('VM suppressed flush threw: ' + e.message); }

if (vmReady) try {
  // Empty queue: nothing.
  const ctx = recordingCtx();
  sandbox.flushTopCenterStack(ctx, [], false);
  check('VM empty queue: draws nothing',
    !ctx.calls.some((c) => c[0] === 'roundRect') && !ctx.calls.some((c) => c[0] === 'fillText'));
} catch (e) { failures.push('VM empty flush threw: ' + e.message); }

if (vmReady) try {
  // Mode-panel draw through the real helper: Prop Hunt geometry + colours.
  const ctx = recordingCtx();
  sandbox.drawChunkyPanel(ctx, 410, 78, 460, 36, { radius: 12, fill: 'rgba(24, 18, 4, 0.85)', stroke: 'rgba(255, 209, 102, 0.8)', lineWidth: 2 });
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  check('VM mode panel: one roundRect at the exact old rect, radius 12, no slab',
    rects.length === 1 && rects[0][1] === 410 && rects[0][2] === 78 && rects[0][3] === 460 &&
    rects[0][4] === 36 && rects[0][5] === 12);
  check('VM mode panel: fill + stroke are the exact old values',
    ctx.calls.some((c) => c[0] === 'fill' && c[1] === 'rgba(24, 18, 4, 0.85)') &&
    ctx.calls.some((c) => c[0] === 'stroke' && c[1] === 'rgba(255, 209, 102, 0.8)' && c[2] === 2));
} catch (e) { failures.push('VM mode panel threw: ' + e.message); }

// ---------------------------------------------------------- 7. suite sanity vs pristine
check('sanity: pristine main has no queue/flush helpers (suite would fail there)',
  !pristine.includes('function queueTopCenterLine') && !pristine.includes('function flushTopCenterStack'));
check('sanity: pristine main still has the 12 square mode panels (suite would fail there)',
  pristine.includes('ctx.strokeRect(panelX, panelY, 530, 76);') &&
  pristine.includes("ctx.fillText('Brawlers Left: ' + aliveCount, innerWidth/2 - 80, 48);"));

if (failures.length) {
  console.error(`UI Refresh Part 2: ${passed} passed, ${failures.length} FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`UI Refresh Part 2 regression checks passed (${passed} checks).`);
