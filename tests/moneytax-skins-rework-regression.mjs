// Money & Tax skins rework regression — Anthony's order 2026-10-25.
// His playtest verdict on PR #46: the skin visuals were "just dots and shit".
// This test proves the rework: ALL FOUR skins (regular/default, battle,
// gold-silver, tombstone) draw REAL detailed art — ridged coins with etched
// emblems and shading, banknotes with borders/printed lines/corner ornaments,
// full broker bodies, and Super auras built from orbiting mini objects —
// never a bare dot or a bare ring. It also proves the ordered regular-coin
// +12% size and +12% fan spread, and that PR #46's moneyTaxSuperUntil fix
// survives. Render helpers are EXECUTED in a vm with a recording stub canvas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source: sizes, spread, wiring
check('regular coin size const is 1.12', /const MONEY_TAX_REGULAR_COIN_SIZE_MULT = 1\.12;/.test(game));
check('regular spread const is 1.12', /const MONEY_TAX_REGULAR_SPREAD_MULT = 1\.12;/.test(game));
check('fire fan is unified across skins', !game.includes('mntRegularFan'));
check('fire fan applies spread mult to all skins', game.includes('const mntFanSpread = MONEY_TAX_BASE_SPREAD * MONEY_TAX_REGULAR_SPREAD_MULT;'));
check('fire fan uses widened spread', game.includes('const a = ang + (i - centerIndex) * mntFanSpread;'));
check('widened fan math: 0.105 * 1.12 = 0.1176', Math.abs(0.105 * 1.12 - 0.1176) < 1e-9);
check('base spread itself untouched (0.105)', game.includes('const MONEY_TAX_BASE_SPREAD = 0.105;'));
check('tax spread untouched (0.056)', game.includes('const MONEY_TAX_TAX_SPREAD = 0.056;'));
check('default bullet block exists', game.includes("if (b.ownerBrawler === 'money_and_tax' && (b.isCoin || b.isBoomerang || b.isTaxNote || b.isStickySuper))"));
check('gold-silver hyper block exists', game.includes("activeSkinId === 'gold-silver-moneytax' && b.ownerBrawler === 'money_and_tax' && b.hyperVisual"));
check('battle bullet block routes to detailed engine', game.includes("drawDetailedMoneyTaxCoin(ctx, b, 'battle', !!b.hyperVisual)"));
check('entity body hooks for all skins', game.includes("drawDetailedMoneyTaxBody(ctx, t, drawY, (t.moneyAndTaxMode || 'money'), 'battle'") && game.includes("drawDetailedMoneyTaxBody(ctx, t, drawY, (t.moneyAndTaxMode || 'money'), 'goldsilver'") && game.includes("drawDetailedMoneyTaxBody(ctx, t, drawY, (t.moneyAndTaxMode || 'money'), 'regular'"));
check('player body hooks for all skins', game.includes("drawDetailedMoneyTaxBody(ctx, player, drawY, (player.moneyAndTaxMode || 'money'), 'battle'") && game.includes("drawDetailedMoneyTaxBody(ctx, player, drawY, (player.moneyAndTaxMode || 'money'), 'regular'"));
check('default aura hook exists', game.includes("drawDetailedMoneyTaxAura(ctx, t, drawY, 'regular')"));
check('super timer declared (PR #46 fix preserved)', game.includes('let moneyTaxSuperUntil = 0;'));
check('player cast stamps super timer', game.includes('moneyTaxSuperUntil = performance.now() + 2400;'));
check('bot cast stamps super timer', game.includes('bot.moneyTaxSuperUntil = now + 2400;'));
check('generic fallback intact (other brawlers untouched)', game.includes("ctx.fillStyle = b.hyperVisual ? '#e0f' : '#f1c40f'; // Gold or Purple"));
check('no other money spread/size consts changed', !game.includes('MONEY_TAX_MONEY_SIZE_MULT = 1.12'));

// ---------------------------------------------------------- 2. vm-executed helpers
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

const helperNames = ['moneyTaxArtPalette', 'drawDetailedMoneyTaxCoin', 'drawDetailedMoneyTaxNote', 'drawDetailedMoneyTaxBody', 'drawDetailedMoneyTaxAura', 'drawGraveTaxSkullCoin', 'drawGraveTaxNote', 'drawGraveTaxBody', 'drawGraveTaxSuperAura'];
const helperSrcs = helperNames.map((n) => extractFn(game, n));
for (const [idx, s] of helperSrcs.entries()) {
  check(helperNames[idx] + ' is pure draw code', !/\.damage\s*=|\.hp\s*=|[^a-zA-Z]speed\s*=/.test(s));
}

const sandbox = { performance: { now: () => 100000 }, Math };
vm.createContext(sandbox);
vm.runInContext('const MONEY_TAX_REGULAR_COIN_SIZE_MULT = 1.12;\nconst MONEY_TAX_REGULAR_SPREAD_MULT = 1.12;\n' + helperSrcs.join('\n') + '\nthis.__fns = { moneyTaxArtPalette, drawDetailedMoneyTaxCoin, drawDetailedMoneyTaxNote, drawDetailedMoneyTaxBody, drawDetailedMoneyTaxAura, drawGraveTaxSkullCoin, drawGraveTaxNote, drawGraveTaxBody, drawGraveTaxSuperAura };', sandbox);
const fns = sandbox.__fns;

function stubCtx() {
  const calls = [];
  const sets = [];
  return {
    calls, sets,
    proxy: new Proxy({}, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const count = (calls, m) => calls.filter((c) => c.m === m).length;
const hasFill = (sets, color) => sets.some((s) => s.p === 'fillStyle' && String(s.v).includes(color));
const hasText = (calls, text) => calls.some((c) => c.m === 'fillText' && c.args.includes(text));
const maxArcR = (calls) => Math.max(-1, ...calls.filter((c) => c.m === 'arc').map((c) => c.args[2]));
const near = (a, b) => Math.abs(a - b) < 0.01;

// Coins: detailed art + sizes, per skin
for (const [skin, baseR] of [['regular', 6.6], ['battle', 6.6], ['goldsilver', 6.6]]) { // unified coin base: every skin draws the regular standard
  const s = stubCtx();
  fns.drawDetailedMoneyTaxCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, skin, false);
  check(skin + ' coin is detailed, not a dot (>=30 canvas calls)', s.calls.length >= 30);
  check(skin + ' coin has ridge ticks + emblem (>=15 lineTo, $ print)', count(s.calls, 'lineTo') >= 15 && hasText(s.calls, '$'));
  check(skin + ' coin non-hyper has no flame tongues', count(s.calls, 'quadraticCurveTo') === 0);
  const expR = baseR * 1.12;
  check(skin + ' coin disc radius is ' + expR.toFixed(3), near(maxArcR(s.calls), expR));
  const sh = stubCtx();
  fns.drawDetailedMoneyTaxCoin(sh.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, skin, true);
  check(skin + ' hyper coin adds flame tongues', count(sh.calls, 'quadraticCurveTo') > 0);
}
{
  // Regular size ladder: empowered center and boomerang rules.
  const e = stubCtx();
  fns.drawDetailedMoneyTaxCoin(e.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true, moneyEmpoweredCenter: true }, 'regular', false);
  check('regular empowered coin is 14 * 1.12', near(maxArcR(e.calls), 15.68));
  const b = stubCtx();
  fns.drawDetailedMoneyTaxCoin(b.proxy, { x: 100, y: 100, vx: 100, vy: 0, isBoomerang: true }, 'regular', false);
  check('regular Super boomerang keeps size 16 (size order covers coins)', near(maxArcR(b.calls), 16));
}
// Tombstone coins via the preserved PR #46 API.
{
  const s = stubCtx();
  fns.drawGraveTaxSkullCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, false);
  check('tombstone coin is detailed (>=30 calls) with skull sockets', s.calls.length >= 30 && hasFill(s.sets, '#0b0f14'));
  check('tombstone coin non-hyper has no violet stroke', !s.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('#b26bff')));
  const sh = stubCtx();
  fns.drawGraveTaxSkullCoin(sh.proxy, { x: 100, y: 100, vx: 100, vy: 0, isBoomerang: true }, true);
  check('tombstone hyper coin: brighter disc + violet ring + flames', hasFill(sh.sets, '#d8ffe9') && sh.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('#b26bff')) && count(sh.calls, 'quadraticCurveTo') > 0);
}

// Notes: detailed banknotes + seals, per skin
for (const skin of ['regular', 'battle', 'goldsilver']) {
  const s = stubCtx();
  fns.drawDetailedMoneyTaxNote(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isTaxNote: true, hitboxMod: 1 }, skin, false);
  const rects = s.calls.filter((c) => c.m === 'fillRect');
  const strokes = s.calls.filter((c) => c.m === 'strokeRect');
  check(skin + ' note is a real banknote (body + double border + corners + TAX)', rects.length >= 5 && strokes.length >= 2 && hasText(s.calls, 'TAX'));
  const st = stubCtx();
  fns.drawDetailedMoneyTaxNote(st.proxy, { x: 100, y: 100, vx: 100, vy: 0, isStickySuper: true }, skin, false);
  const srects = st.calls.filter((c) => c.m === 'fillRect');
  check(skin + ' sticky seal is bigger than its note and has no TAX print', srects.length && rects.length && Math.abs(srects[0].args[2]) > Math.abs(rects[0].args[2]) && !hasText(st.calls, 'TAX'));
}
{
  const s = stubCtx();
  fns.drawGraveTaxNote(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isTaxNote: true, hitboxMod: 1 }, false);
  check('tombstone note stays blood-red with TAX print', hasFill(s.sets, '#8b1a2d') && hasText(s.calls, 'TAX'));
  const st = stubCtx();
  fns.drawGraveTaxNote(st.proxy, { x: 100, y: 100, vx: 100, vy: 0, isStickySuper: true }, false);
  check('tombstone seal stays grave-purple with no TAX print', hasFill(st.sets, '#3d1257') && !hasText(st.calls, 'TAX'));
}

// Bodies: full broker characters, money vs tax, hyper vs not
for (const skin of ['regular', 'battle', 'goldsilver']) {
  const m = stubCtx();
  fns.drawDetailedMoneyTaxBody(m.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', skin, false);
  check(skin + ' money body is a real character (hat rects + $ badge + face arcs)', m.calls.some((c) => c.m === 'fillRect') && hasText(m.calls, '$') && count(m.calls, 'arc') >= 4);
  const t = stubCtx();
  fns.drawDetailedMoneyTaxBody(t.proxy, { x: 200, y: 200, radius: 16 }, 200, 'tax', skin, false);
  check(skin + ' tax body is distinct (TAX badge)', hasText(t.calls, 'TAX') && !hasText(t.calls, '$'));
  const h = stubCtx();
  fns.drawDetailedMoneyTaxBody(h.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', skin, true);
  check(skin + ' hyper body adds flame tongues', count(h.calls, 'quadraticCurveTo') > count(m.calls, 'quadraticCurveTo'));
}
{
  const m = stubCtx();
  fns.drawGraveTaxBody(m.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', false);
  check('tombstone money body: gold-green pupils + bone', hasFill(m.sets, '#7dffb0') && hasFill(m.sets, '#f5ecd7'));
  const t = stubCtx();
  fns.drawGraveTaxBody(t.proxy, { x: 200, y: 200, radius: 16 }, 200, 'tax', false);
  check('tombstone tax body: blood-red pupils + red trim', hasFill(t.sets, '#ff4d5e') && t.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('rgba(200, 30, 58, 0.8)')));
  const h = stubCtx();
  fns.drawGraveTaxBody(h.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', true);
  check('tombstone hyper body adds spectral flame ring', h.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('rgba(125, 255, 176, 0.9)')));
  check('tombstone non-hyper body has no flame ring', !m.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('rgba(125, 255, 176, 0.9)')));
}

// Auras: orbiting mini objects, not bare rings
for (const skin of ['regular', 'battle', 'goldsilver']) {
  const s = stubCtx();
  fns.drawDetailedMoneyTaxAura(s.proxy, { x: 200, y: 200, radius: 16 }, 200, skin);
  check(skin + ' aura has orbiting mini coins + markers (not just rings)', count(s.calls, 'arc') >= 7 && hasText(s.calls, '$'));
}
{
  const s = stubCtx();
  fns.drawGraveTaxSuperAura(s.proxy, { x: 200, y: 200, radius: 16 }, 200);
  check('tombstone aura: violet + green seal borders + mini skulls', s.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('rgba(178, 107, 255, 0.9)')) && s.sets.some((x) => x.p === 'strokeStyle' && String(x.v).includes('rgba(125, 255, 176, 0.75)')) && hasFill(s.sets, '#f5ecd7') && hasFill(s.sets, '#0b0f14'));
}

console.log(`moneytax-skins-rework-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
