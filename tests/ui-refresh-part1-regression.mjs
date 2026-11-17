// UI Refresh Part 1 — HUD + home screen (Thanksgiving Phase 7A/7B/7C-lite/7E).
// Scope: design tokens in styles.css, token adoption on home PLAY/nav/mode-card/
// currency-pill/results surfaces, and the shared drawChunkyPanel canvas helper
// applied to the HUD panels. No HUD information added or removed; no overlay
// migrated (7F is deliberately untouched — see the overlay pins below).
// Behavioural where render behaviour matters: drawChunkyPanel is executed in a
// VM against a recording fake canvas context (real geometry, real state —
// never a faked flag).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const homeCss = fs.readFileSync(new URL('../home-brawl-style.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. 7A tokens
for (const token of [
  '--af-radius-sm: 8px', '--af-radius-md: 14px', '--af-radius-lg: 18px',
  '--af-radius-xl: 24px', '--af-radius-pill: 999px',
  '--af-outline-3w: 3px solid rgba(255, 255, 255, 0.85)',
  '--af-outline-3w-solid: 3px solid #fff',
  '--af-outline-3w-soft: 3px solid rgba(255, 255, 255, 0.7)',
  '--af-slab-gold: 0 7px 0 #a85a08, 0 14px 25px rgba(0, 26, 71, 0.66)',
  '--af-slab-blue-4: 0 4px 0 #0a2a5e',
  '--af-slab-navy-5: 0 5px 0 #051f50',
  '--af-slab-navy-4: 0 4px 0 #061d43',
  '--af-btn-primary: linear-gradient(180deg, #ffe95c, #ffb61f)',
  '--af-btn-secondary: linear-gradient(180deg, #2b7de0, #16549e)',
  '--af-card-grad: linear-gradient(145deg, #1b75d1, #164493)',
  '--af-rarity-common: #9ed9ff', '--af-rarity-rare: #5df2c2',
  '--af-rarity-epic: #c084fc', '--af-rarity-mythic: #ff5ba7',
  '--af-rarity-legendary: #ffb347', '--af-rarity-exotic: #55f7ff',
  '--af-hud-panel: rgba(4, 8, 16, 0.56)',
  '--af-hud-stroke: rgba(255, 255, 255, 0.08)',
]) check(`7A token present: ${token}`, css.includes(token));
check('7A token block is one :root block (no duplicate token names)',
  (css.match(/--af-radius-lg/g) || []).length === 1 &&
  (css.match(/--af-btn-primary:/g) || []).length === 1 &&
  (homeCss.match(/var\(--af-btn-primary\)/g) || []).length === 1);

// ---------------------------------------------------------- 2. 7B home adoption
check('PLAY button uses the primary token (same gold gradient, no hardcoded copy)',
  homeCss.includes('#homeScreen #startMatch') &&
  homeCss.includes('background: var(--af-btn-primary) !important') &&
  homeCss.includes('box-shadow: var(--af-slab-gold) !important') &&
  homeCss.includes('border: var(--af-outline-3w-solid) !important'));
check('PLAY button keeps its chunky geometry (190px wide, 88px tall, 26px type)',
  homeCss.includes('width: 190px !important') && homeCss.includes('min-height: 88px !important') &&
  homeCss.includes('font-size: 26px !important'));
check('PLAY button gains a hover lift; :active press behaviour unchanged',
  homeCss.includes('#homeScreen #startMatch:hover') &&
  homeCss.includes('#homeScreen #startMatch:active') &&
  homeCss.includes('box-shadow: var(--af-slab-gold-2) !important'));
check('home nav buttons use the secondary token + white-outline token',
  (homeCss.match(/background: var\(--af-btn-secondary\) !important/g) || []).length === 3 &&
  (homeCss.match(/border: var\(--af-outline-3w\) !important/g) || []).length === 5);
check('no hardcoded copy of the adopted blue gradient / white outline left in home css',
  !homeCss.includes('linear-gradient(180deg, #2b7de0, #16549e)') &&
  !homeCss.includes('3px solid rgba(255, 255, 255, 0.85) !important') &&
  !homeCss.includes('box-shadow: 0 4px 0 #0a2a5e !important'));
check('mode card adopts tokens (same blue card gradient, same navy slab)',
  css.includes('.home-mode-card{min-height:110px !important') &&
  css.includes('background:var(--af-card-grad) !important') &&
  css.includes('box-shadow:var(--af-slab-navy-5) !important'));
check('currency pills keep their slab shadow via token (same #061d43 value)',
  css.includes('box-shadow:var(--af-slab-navy-4),inset 0 2px rgba(255,255,255,.14) !important'));
check('results card adopts the token radius/panel/slab (same values as before)',
  css.includes('border-radius:var(--af-radius-xl)') &&
  css.includes('background:var(--af-panel-grad)') &&
  css.includes('box-shadow:var(--af-slab-9)'));
check('results home button keeps its teal slab via token',
  css.includes('box-shadow:var(--af-slab-teal-5)') &&
  css.includes('box-shadow:var(--af-slab-teal-2)'));

// ---------------------------------------------------------- 3. home elements reachable
for (const id of ['homeScreen', 'homePanel', 'homeHeader', 'homeTitle', 'homeMenuBtn',
  'homeProfileChip', 'homeCurrencyBar', 'fullscreenBtn', 'homeLobbyNav',
  'homeCollectionNav', 'homeEventsNav', 'homeShopNav', 'homeBrawlerCard',
  'homeModeCompactRow', 'showdownModeRow', 'homeSeasonPulse', 'homeFeaturedOffer',
  'homeCareerSnapshot', 'homeRankCard', 'homePersonalPanel', 'homeGreeting',
  'homeDailyBrief', 'homeSelectedEventCard', 'homeSelectedEventName',
  'homeSelectedEventRule', 'homeProgressDock', 'homeQuickActions', 'startMatch',
  'homeUtilityDetails', 'homeUtilityRow', 'homeMobileNav', 'homeMobileLobby',
  'homeMobileFighters', 'homeMobileEvents', 'homeMobileShop', 'homeMobileMore']) {
  check(`home element still present: #${id}`, html.includes(`id="${id}"`));
}
check('home still loads the token stylesheet before the home stylesheet',
  html.indexOf('styles.css') < html.indexOf('home-brawl-style.css'));
check('refreshHomeUI / setHomeTab logic untouched (names + tab controller)',
  game.includes('function refreshHomeUI()') && game.includes("function setHomeTab(tab = 'home')"));
check('mode cards still carry role/tabIndex/dataset + active-state sync',
  game.includes("card.setAttribute('role', 'button')") &&
  game.includes('card.tabIndex = 0') &&
  game.includes('card.dataset.homeMode = id') &&
  game.includes("card.classList.toggle('active', modeId === showdownMode)"));
check('currency bar still renders all three pills with counts',
  game.includes("class=\"home-currency-pill coins\"") &&
  game.includes("class=\"home-currency-pill gems\"") &&
  game.includes("class=\"home-currency-pill souls\""));
check('selected-event card still opens the Events tab',
  game.includes("focusHomeEvents") && game.includes("setHomeTab('events')"));

// ---------------------------------------------------------- 4. 7E helper + call sites
check('UI_HUD_TOKENS declared with the HUD panel colours',
  game.includes('const UI_HUD_TOKENS = {') &&
  game.includes("panelFill: 'rgba(4, 8, 16, 0.56)'") &&
  game.includes("panelStroke: 'rgba(255, 255, 255, 0.08)'") &&
  game.includes("slabOffset: 4"));
check('drawChunkyPanel defined once, with slab + radius + fill + stroke + lineWidth',
  (game.match(/function drawChunkyPanel\(ctx, x, y, w, h, opts\)/g) || []).length === 1 &&
  game.includes('ctx.roundRect(x, y + (o.slabOffset == null ? UI_HUD_TOKENS.slabOffset : o.slabOffset), w, h, radius)'));
// UI Refresh Part 2 (2026-11-17): 12 mode panels + 1 stack flush added, so the
// count is 23 call sites (24 matches incl. the definition line).
check('exactly 23 drawChunkyPanel call sites (24 matches incl. the definition line)',
  (game.match(/drawChunkyPanel\(ctx, /g) || []).length === 24);
for (const [name, snippet] of [
  ['attack/super cards', "drawChunkyPanel(ctx, x, readY, cardW, readH, {"],
  ['minimap frame', 'drawChunkyPanel(ctx, 0, 0, mapW, mapH, { radius: 8,'],
  ['super bar backdrop', 'drawChunkyPanel(ctx, bx-6, by-6, barW+12, barH+12, { radius: 8,'],
  ['hyper bar backdrop', 'drawChunkyPanel(ctx, bx-6, hy-6, barW+12, barH+12, { radius: 8,'],
  ['bottom-left kit panel', 'drawChunkyPanel(ctx, hudX, hudY, hudW, hudH, {'],
  ['respawn banner', 'drawChunkyPanel(ctx, panelX, panelY, panelW, 92, { radius: 18,'],
  ['arena-forge PREPARE banner', 'drawChunkyPanel(ctx, panelX, panelY, panelW, panelH, { radius: 22,'],
  ['tutorial banner', 'drawChunkyPanel(ctx, panelX, 22, panelW, 92, { radius: 16,'],
  ['impossible banner', 'drawChunkyPanel(ctx, innerWidth / 2 - 250, 26, 500, 48, { radius: 14,'],
  ['ranked modifier badge', 'drawChunkyPanel(ctx, badgeX, badgeY, badgeW, badgeH, { radius: 8,'],
]) check(`7E call site: ${name}`, game.includes(snippet));

// ---------------------------------------------------------- 5. HUD info intact
for (const [name, snippet] of [
  ['attack/super type tags', "const typeTag = isAttack ? `${dmgInfo.mainIcon} ATTACK` : `${dmgInfo.superIcon} SUPER`"],
  ['ammo pips', 'Segmented Ammo Pips'],
  ['super energy bar', 'Super Energy Bar'],
  ['kit panel Tool/Talent/Core rows', "ctx.fillText('Tool', hudX + 12, hudY + 22)"],
  ['super bar label', "ctx.fillText(hudSuperLabel, bx, by-10)"],
  ['hyper bar label', "ctx.fillText('CORE SURGE (F)', bx, hy-10)"],
  // UI Refresh Part 2 (2026-11-17): the alive line is queued into the top-center
  // stack now — same string, same x/y, drawn by flushTopCenterStack.
  ['alive counter', "queueTopCenterLine(ctx, topCenterStackQueue, 'Brawlers Left: ' + aliveCount, innerWidth/2 - 80, 48)"],
  ['minimap player dot', "ctx.fillRect(player.x*scX - 3, player.y*scY - 3, 6, 6)"],
  ['minimap morphed-hider leak guard (PR #38)', 'if (isPropHuntMode && t.propHuntMorphed'],
  ['ranked badge text', "ctx.fillText((mod1?.icon || '⚡') + ' ' + (mod1?.name || 'Modifier').toUpperCase(), innerWidth * 0.5, badgeY + 17)"],
  ['results overlay classes', "overlay.className = `match-results-overlay ${won ? 'is-victory' : 'is-defeat'}`"],
]) check(`HUD info intact: ${name}`, game.includes(snippet));

// ---------------------------------------------------------- 6. 7F overlays untouched
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
check('7F: custom mutator picker overlay NOT migrated (no chunky helper, no af- classes)',
  !mutatorPicker.includes('drawChunkyPanel') && !mutatorPicker.includes('af-'));
check('7F: shop / season-hub inline styles still as before (no token classes injected)',
  !game.includes('af-mode-card') && !game.includes('af-token'));

// ---------------------------------------------------------- 7. towers never gain HP (PR #42)
check('PR #42: doHeal refuses Arena Forge towers',
  game.includes("if(entity.isArenaForgeTower) return;") &&
  game.includes('towers can never gain HP from ANY heal source'));
check('PR #42: tower-heal kill switch still off',
  game.includes('const ARENA_FORGE_TOWERS_HEAL_ENABLED = false;'));
check('PR #42: structure repair loops still skip towers',
  (game.match(/if \(!ARENA_FORGE_TOWERS_HEAL_ENABLED && structure\.isArenaForgeTower\) continue;/g) || []).length >= 2);

// ---------------------------------------------------------- 8. single IIFE, no split
check('game.js is still one IIFE (no ES modules, no split)',
  game.startsWith('(function(){') && game.includes('})();') &&
  !game.includes('\nexport ') && !game.includes('\nimport '));

// ---------------------------------------------------------- 9. VM: drawChunkyPanel
function extractConst(src, name) {
  const start = src.indexOf('const ' + name + ' =');
  assert.notEqual(start, -1, name + ' not found');
  const end = src.indexOf('};', start);
  return src.slice(start, end + 2);
}
const sandbox = { Math, performance: { now: () => 100000 } };
vm.createContext(sandbox);
vm.runInContext(extractConst(game, 'UI_HUD_TOKENS') + '\n' + extractFn(game, 'drawChunkyPanel'), sandbox);

function recordingCtx() {
  const calls = [];
  const ctx = {
    calls, saveCount: 0, restoreCount: 0,
    fillStyle: null, strokeStyle: null, lineWidth: 1,
    shadowColor: null, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    save() { this.saveCount++; calls.push(['save']); },
    restore() { this.restoreCount++; calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    roundRect(x, y, w, h, r) { calls.push(['roundRect', x, y, w, h, r]); },
    fill() { calls.push(['fill', this.fillStyle]); },
    stroke() { calls.push(['stroke', this.strokeStyle, this.lineWidth]); },
  };
  return ctx;
}

try {
  const ctx = recordingCtx();
  sandbox.drawChunkyPanel(ctx, 10, 20, 100, 50, {});
  check('VM: default call fills + strokes with token defaults at radius 10',
    ctx.calls.some((c) => c[0] === 'roundRect' && c[1] === 10 && c[2] === 20 && c[3] === 100 && c[4] === 50 && c[5] === 10) &&
    ctx.calls.some((c) => c[0] === 'fill' && c[1] === 'rgba(4, 8, 16, 0.56)') &&
    ctx.calls.some((c) => c[0] === 'stroke' && c[1] === 'rgba(255, 255, 255, 0.08)' && c[2] === 1));
  check('VM: default call draws no slab (one roundRect only)',
    ctx.calls.filter((c) => c[0] === 'roundRect').length === 1);
  check('VM: save/restore balanced, shadow state zeroed after the call',
    ctx.saveCount === 1 && ctx.restoreCount === 1 && ctx.shadowBlur === 0 &&
    ctx.shadowColor === 'rgba(0,0,0,0)' && ctx.shadowOffsetX === 0 && ctx.shadowOffsetY === 0);
} catch (e) { failures.push('VM default call threw: ' + e.message); }

try {
  const ctx = recordingCtx();
  sandbox.drawChunkyPanel(ctx, 10, 20, 100, 50, { radius: 18, fill: 'rgba(1,2,3,0.5)', stroke: '#ff0000', lineWidth: 3, slab: true });
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  check('VM: slab call draws the slab FIRST, offset 4px down, same size/radius',
    rects.length === 2 && rects[0][1] === 10 && rects[0][2] === 24 && rects[0][3] === 100 && rects[0][4] === 50 && rects[0][5] === 18 &&
    rects[1][1] === 10 && rects[1][2] === 20);
  check('VM: slab uses the slab fill, panel uses the passed fill + stroke + width',
    ctx.calls.some((c) => c[0] === 'fill' && c[1] === 'rgba(2, 9, 22, 0.8)') &&
    ctx.calls.some((c) => c[0] === 'fill' && c[1] === 'rgba(1,2,3,0.5)') &&
    ctx.calls.some((c) => c[0] === 'stroke' && c[1] === '#ff0000' && c[2] === 3));
} catch (e) { failures.push('VM slab call threw: ' + e.message); }

try {
  const ctx = recordingCtx();
  const gradient = { __gradient: true };
  sandbox.drawChunkyPanel(ctx, 0, 0, 50, 50, { fill: gradient, stroke: null });
  check('VM: gradient fill passes through as the fillStyle (respawn banner case)',
    ctx.calls.some((c) => c[0] === 'fill' && c[1] === gradient));
  check('VM: null stroke draws no stroke',
    !ctx.calls.some((c) => c[0] === 'stroke'));
} catch (e) { failures.push('VM gradient call threw: ' + e.message); }

try {
  const ctx = recordingCtx();
  sandbox.drawChunkyPanel(ctx, 5, 5, 10, 10, { radius: 0, fill: '#fff', stroke: '#000', lineWidth: 2, slab: true, slabOffset: 0 });
  const rects = ctx.calls.filter((c) => c[0] === 'roundRect');
  check('VM: radius 0 and slabOffset 0 are honoured (0 is a real value, not "missing")',
    rects.length === 2 && rects[0][5] === 0 && rects[0][2] === 5 && rects[1][5] === 0);
} catch (e) { failures.push('VM zero-value call threw: ' + e.message); }

if (failures.length) {
  console.error(`UI Refresh Part 1: ${passed} passed, ${failures.length} FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`UI Refresh Part 1 regression checks passed (${passed} checks).`);
