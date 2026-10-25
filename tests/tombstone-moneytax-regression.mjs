// Tombstone Tycoon (tombstone-moneytax) skin regression — Anthony's order 2026-10-25.
// Covers: skin def + unlock pattern, coin / Super / tax-mode / Hypercharge visuals,
// base body + Super aura call sites, and that defaults + older money_and_tax skins
// are untouched. Render helpers are EXECUTED in a vm with a recording stub canvas
// (the PR #45 lesson: render-scope art only proves itself when it actually runs).
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

// ---------------------------------------------------------- 1. skin def + unlock
check('skin def exists', game.includes("'tombstone-moneytax': {"));
check('def id matches key', game.includes("id: 'tombstone-moneytax'"));
check('def brawler is money_and_tax', /'tombstone-moneytax': \{[\s\S]{0,400}?brawler: 'money_and_tax'/.test(game));
check('def rarity mythic', /'tombstone-moneytax': \{[\s\S]{0,400}?rarity: 'mythic'/.test(game));
check('def set Graveyard Ledger', game.includes("set: 'Graveyard Ledger'"));
check('unlock follows gold-silver pattern (49 gems)', /'tombstone-moneytax': \{[\s\S]{0,600}?price: 49,[\s\S]{0,50}?currency: 'gems'/.test(game));
check('def has skull icon', game.includes("icon: '💀'"));
check('def has spectral display color', game.includes("_displayColor: '#7dffb0'"));
check('def attack/super/takedown effects', game.includes("attackEffect: { type: 'graveSkullCoin'") && game.includes("superEffect: { type: 'graveSkullSuper'") && game.includes("takedownEffect: { type: 'graveTakedown'"));

// ---------------------------------------------------------- 2. call sites
check('bullet branch before universal renderer', game.indexOf("activeSkinId === 'tombstone-moneytax'") < game.indexOf('if (renderUniversalSkinProjectile(b, activeSkin)) continue;') && game.indexOf("activeSkinId === 'tombstone-moneytax'") !== -1);
check('bullet branch covers coin/boomerang/note/sticky', game.includes("(b.isCoin || b.isBoomerang || b.isTaxNote || b.isStickySuper)"));
check('coin path passes hyperVisual through', game.includes('drawGraveTaxSkullCoin(ctx, b, !!b.hyperVisual)'));
check('note path passes hyperVisual through', game.includes('drawGraveTaxNote(ctx, b, !!b.hyperVisual)'));
check('bot body overlay call site', game.includes("drawGraveTaxBody(ctx, t, drawY, (t.moneyAndTaxMode || 'money'), !!t.isHypercharged)"));
check('player body overlay call site', game.includes("drawGraveTaxBody(ctx, player, drawY, (player.moneyAndTaxMode || 'money'), !!player.isHypercharged)"));
check('bot super aura call site', game.includes("drawGraveTaxSuperAura(ctx, t, drawY)"));
check('player super aura call site', game.includes('drawGraveTaxSuperAura(ctx, player, drawY)'));
check('super timer declared (fixes undeclared moneyTaxSuperUntil)', game.includes('let moneyTaxSuperUntil = 0;'));
check('player cast stamps super timer', game.includes('moneyTaxSuperUntil = performance.now() + 2400;'));
check('bot cast stamps super timer', game.includes('bot.moneyTaxSuperUntil = now + 2400;'));

// ---------------------------------------------------------- 3. defaults + old skins untouched
check('default coin block intact', game.includes("ctx.fillStyle = b.hyperVisual ? '#e0f' : '#f1c40f'; // Gold or Purple"));
check('default tax note block intact', game.includes("ctx.fillStyle = b.hyperVisual ? '#e0f' : '#27ae60'; // Green Note or Purple"));
check('gold-silver coin block intact', game.includes("if (activeSkinId === 'gold-silver-moneytax' && b.ownerBrawler === 'money_and_tax' && !b.hyperVisual)"));
check('gold-silver def intact', game.includes("'gold-silver-moneytax': {"));
check('battle-moneytax block intact', game.includes("if (activeSkinId === 'battle-moneytax' && b.ownerBrawler === 'money_and_tax')"));

// ---------------------------------------------------------- 4. vm-executed helpers
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null; // quote char
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

// Rework 2026-10-25: the grave helpers are now wrappers over the shared
// detailed-art engine, so the vm run must extract the engine too (plus
// the module-level size/spread constants the coin helper references).
const helperNames = ['moneyTaxArtPalette', 'drawDetailedMoneyTaxCoin', 'drawDetailedMoneyTaxNote', 'drawDetailedMoneyTaxBody', 'drawDetailedMoneyTaxAura', 'drawGraveTaxSkullCoin', 'drawGraveTaxNote', 'drawGraveTaxBody', 'drawGraveTaxSuperAura'];
const helperSrcs = helperNames.map((n) => extractFn(game, n));
for (const [idx, src] of helperSrcs.entries()) {
  check(helperNames[idx] + ' is pure draw code (no combat writes)', !/\.damage\s*=|\.hp\s*=|[^a-zA-Z]speed\s*=/.test(src));
}

const sandbox = { performance: { now: () => 100000 }, Math };
vm.createContext(sandbox);
vm.runInContext('const MONEY_TAX_REGULAR_COIN_SIZE_MULT = 1.12;\nconst MONEY_TAX_REGULAR_SPREAD_MULT = 1.12;\n' + helperSrcs.join('\n') + '\nthis.__fns = { drawGraveTaxSkullCoin, drawGraveTaxNote, drawGraveTaxBody, drawGraveTaxSuperAura };', sandbox);
const fns = sandbox.__fns;

function stubCtx() {
  const calls = [];
  const sets = [];
  const base = {};
  return {
    calls, sets,
    proxy: new Proxy(base, {
      get(_t, prop) {
        if (prop === 'canvas') return undefined;
        return (...args) => { calls.push({ m: String(prop), args }); };
      },
      set(_t, prop, value) { sets.push({ p: String(prop), v: value }); return true; },
    }),
  };
}
const hasFill = (sets, color) => sets.some((s) => s.p === 'fillStyle' && String(s.v).includes(color));
const hasStroke = (sets, color) => sets.some((s) => s.p === 'strokeStyle' && String(s.v).includes(color));
const hasText = (calls, text) => calls.some((c) => c.m === 'fillText' && c.args.includes(text));

// Coins: normal vs hyper, coin vs boomerang
{
  const s = stubCtx();
  fns.drawGraveTaxSkullCoin(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isCoin: true }, false);
  check('coin draws spectral disc + skull sockets', hasFill(s.sets, '#c9ffdf') && hasFill(s.sets, '#0b0f14'));
  check('coin non-hyper has no violet flame ring', !hasStroke(s.sets, '#b26bff'));
  const sh = stubCtx();
  fns.drawGraveTaxSkullCoin(sh.proxy, { x: 100, y: 100, vx: 100, vy: 0, isBoomerang: true }, true);
  check('hyper coin draws brighter disc + violet ring', hasFill(sh.sets, '#d8ffe9') && hasStroke(sh.sets, '#b26bff'));
  check('boomerang coin issues more canvas work than a plain coin (bigger art)', sh.calls.length >= s.calls.length);
}
// Tax notes: note vs sticky Super, normal vs hyper
{
  const s = stubCtx();
  fns.drawGraveTaxNote(s.proxy, { x: 100, y: 100, vx: 100, vy: 0, isTaxNote: true, hitboxMod: 1 }, false);
  check('tax note is blood-red with TAX print', hasFill(s.sets, '#8b1a2d') && hasText(s.calls, 'TAX'));
  const st = stubCtx();
  fns.drawGraveTaxNote(st.proxy, { x: 100, y: 100, vx: 100, vy: 0, isStickySuper: true }, false);
  check('sticky Super is a grave-purple seal, not a TAX note', hasFill(st.sets, '#3d1257') && !hasText(st.calls, 'TAX'));
  const sh = stubCtx();
  fns.drawGraveTaxNote(sh.proxy, { x: 100, y: 100, vx: 100, vy: 0, isTaxNote: true, hitboxMod: 1 }, true);
  check('hyper note adds violet flame ring', hasStroke(sh.sets, 'rgba(178, 107, 255, 0.9)'));
  const rects = st.calls.filter((c) => c.m === 'fillRect');
  const noteRects = s.calls.filter((c) => c.m === 'fillRect');
  check('sticky seal is bigger than a tax note', rects.length && noteRects.length && Math.abs(rects[0].args[2]) > Math.abs(noteRects[0].args[2]));
}
// Body: money vs tax modes, hyper vs not
{
  const m = stubCtx();
  fns.drawGraveTaxBody(m.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', false);
  check('money body has gold-green pupils + skull', hasFill(m.sets, '#7dffb0') && hasFill(m.sets, '#f5ecd7'));
  const t = stubCtx();
  fns.drawGraveTaxBody(t.proxy, { x: 200, y: 200, radius: 16 }, 200, 'tax', false);
  check('tax body is distinct: blood-red pupils + red wisps', hasFill(t.sets, '#ff4d5e') && hasStroke(t.sets, 'rgba(200, 30, 58, 0.8)'));
  const h = stubCtx();
  fns.drawGraveTaxBody(h.proxy, { x: 200, y: 200, radius: 16 }, 200, 'money', true);
  check('hyper body adds spectral flame ring', hasStroke(h.sets, 'rgba(125, 255, 176, 0.9)'));
  check('non-hyper body has no flame ring', !hasStroke(m.sets, 'rgba(125, 255, 176, 0.9)'));
}
// Super aura
{
  const s = stubCtx();
  fns.drawGraveTaxSuperAura(s.proxy, { x: 200, y: 200, radius: 16 }, 200);
  check('super aura has violet tombstone ring + green inner ring', hasStroke(s.sets, 'rgba(178, 107, 255, 0.9)') && hasStroke(s.sets, 'rgba(125, 255, 176, 0.75)'));
  check('super aura draws orbiting skulls (bone + sockets)', hasFill(s.sets, '#f5ecd7') && hasFill(s.sets, '#0b0f14'));
}

console.log(`tombstone-moneytax-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failures.length ? 1 : 0);
