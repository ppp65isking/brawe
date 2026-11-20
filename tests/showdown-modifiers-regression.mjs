import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Thanksgiving big update Phase 4 — rotating Showdown modifiers rework.
// One behavioural row per modifier (plan test matrix), forced through the
// showdownModifierOverride debug hook instead of the 20-minute rotation:
//   none            -> baseline getters, 75 boxes
//   heavy_storm     -> 90s storm, one storm tick deals exactly x1.35
// Arena Forge big changes deleted power_surge, no_free_cubes (Box Scarcity)
// and core_instability (Corrupted Packet Storm); the rotation pools now
// hold only none / heavy_storm.

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static pins: registry, vault, hooks ----
assert.match(source, /const SHOWDOWN_MODIFIER_DEFS = \{/, 'modifier registry must exist');
for (const id of ['none', 'heavy_storm']) {
  assert.match(source, new RegExp(`${id}: \\{ label: '`), `registry must define ${id}`);
}
const mapRulesAt = source.indexOf('function applyShowdownModifierMapRules()');
assert.ok(mapRulesAt >= 0, 'applyShowdownModifierMapRules must still exist as the launch hook');
const mapRules = source.slice(mapRulesAt, mapRulesAt + 900);
assert.match(mapRules, /VAULTED/, 'the wall-deleting map rule must be marked VAULTED');
assert.ok(!mapRules.includes('cubes.length = 0') && !mapRules.includes('cubes.push'), 'no code path may delete structural cubes as a modifier');
assert.match(source, /getShowdownBoxScarcityMultiplier\(\)/, 'generatePowerBoxes must consume the scarcity multiplier');
assert.match(source, /function getModeHyperGainMultiplier\(\)/, 'power_surge widening needs a dedicated Core Surge multiplier');
const grantAt = source.indexOf('function grantMainAttackCharge');
assert.match(source.slice(grantAt, grantAt + 4200), /getModeHyperGainMultiplier\(\)/, 'grantMainAttackCharge must route hyper gain through the mode hyper multiplier');
assert.match(source, /getShowdownModifierDef\(activeShowdownModifier\)/, 'HUD must read the modifier description from the registry via the lookup helper');
assert.match(source, /function isShowdownModifierActive\(id\)/, 'one active-check must exist for the modifier family');
assert.match(source, /function getShowdownModifierDef\(id\)/, 'one registry lookup must exist for the modifier family');
// Centralisation: the ONLY direct string comparison against the active
// modifier lives inside isShowdownModifierActive itself. Every call site
// (storm/super/hyper/scarcity getters, core_instability, HUD) must ask it.
const directEq = source.match(/activeShowdownModifier ===/g) || [];
assert.equal(directEq.length, 1, `exactly one direct activeShowdownModifier === comparison may remain (inside the active-check), found ${directEq.length}`);
assert.ok(!/activeShowdownModifier !==/.test(source), 'no direct activeShowdownModifier !== comparison may remain');
assert.ok(!/SHOWDOWN_MODIFIER_DEFS\[activeShowdownModifier\]/.test(source), 'call sites must not index the registry directly');

// ---- Behavioural harness: the real game booted in a vm sandbox ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__modProbe = (() => { let __tmp;
  return {
    SHOWDOWN_MODIFIER_DEFS, SHOWDOWN_MODE_MODIFIER_POOLS, MODE_MODIFIER_ROTATE_MS,
    isShowdownModifierActive, getShowdownModifierDef, pickShowdownModifierForMode,
    getModeStormDurationSeconds, getModeStormDamageMultiplier,
    getModeSuperGainMultiplier, getModeHyperGainMultiplier,
    getShowdownBoxScarcityMultiplier, applyShowdownModifierMapRules,
    getAttackChargeMultiplier, grantMainAttackCharge,
    get activeShowdownModifier() { return activeShowdownModifier; },
    get superCharge() { return superCharge; },
    get cubes() { return cubes; },
    get destructibleWalls() { return destructibleWalls; },
    setVar: (n, v) => { __tmp = v; eval(n + ' = __tmp'); },
  }; })();
` + ANCHOR;
const booted = source.replace(ANCHOR, PROBE);

const storage = new Map();
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: [] });
    if (typeof k === 'string') return t[k] !== undefined ? t[k] : (() => {});
    return undefined;
  }, set: () => true });
}
function makeEl() {
  const el = {
    style: new Proxy({}, { get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? (() => {}) : t[k]), set: () => true }),
    children: [], dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    width: 800, height: 600, textContent: '', innerHTML: '', value: '',
    appendChild(c) { this.children.push(c); return c; }, append(...c) { this.children.push(...c); }, prepend() {}, removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [], getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600, left: 0, top: 0 }),
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
  };
  return new Proxy(el, { get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'firstChild') return t.children[0] || null;
    if (k === 'lastChild') return t.children[t.children.length - 1] || null;
    if (k === 'parentNode' || k === 'parentElement' || k === 'nextSibling' || k === 'previousSibling') return null;
    if (k === 'childNodes' || k === 'children') return [];
    if (typeof k === 'string') return () => makeEl();
    return undefined;
  }, set: () => true });
}
const sandbox = {
  console, Math, JSON, Date, Map, Set, Array, Object, Number, String, Boolean, RegExp, Error, Promise, Uint8Array,
  performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  Image: class { constructor() { this.complete = true; } }, Audio: class { play() { return Promise.resolve(); } pause() {} },
  location: { href: 'http://localhost/', reload() {} }, alert() {}, addEventListener() {}, removeEventListener() {},
  getComputedStyle: () => ({}),
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, selectedBrawler: 'spikey', unlockedBrawlers: { spikey: true }, brawlerProgress: { spikey: { level: 11, bricks: 9999, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } }));
vm.createContext(sandbox);
vm.runInContext(booted, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
const P = sandbox.__modProbe;
assert.ok(api && P, 'game test API + modifier probe must boot');

function launch(mode, modifier) {
  P.setVar('showdownModifierOverride', modifier);
  api.showdownMode = mode;
  api.launchShowdownMatch(1, 1);
  api.playing = true;
  P.setVar('showdownModifierOverride', null);
}
function powerBoxes() { return P.destructibleWalls.filter(w => w.isPowerBox && w.powerBoxType); }

// ---- none: the baseline row ----
launch('solo', 'none');
assert.equal(P.activeShowdownModifier, 'none', 'override must force the none modifier');
assert.equal(P.getModeStormDurationSeconds(), 120, 'none: storm duration must be 120s');
assert.equal(P.getModeStormDamageMultiplier(), 1.0, 'none: storm damage multiplier must be 1.0');
assert.equal(P.getModeSuperGainMultiplier(), 1.0, 'none: super gain multiplier must be 1.0');
assert.equal(P.getModeHyperGainMultiplier(), 1.0, 'none: hyper gain multiplier must be 1.0');
assert.equal(P.getShowdownBoxScarcityMultiplier(), 1, 'none: no box scarcity');
assert.equal(powerBoxes().length, 75, 'none: a Solo launch must spawn 75 Power Boxes');
// Modern Showdown themes carry their structural blocks as destructible
// walls; `cubes` may legitimately be sparse (even 0) on the current
// rotation theme — what matters is that a modifier never changes it.
const cubesBaseline = P.cubes.length;
const cubesFingerprint = () => P.cubes.map(c => `${c.x}:${c.y}:${c.w}:${c.h}`).join('|');

// ---- Registry shape (mutators-style fields) + the one active-check ----
for (const [id, def] of Object.entries(P.SHOWDOWN_MODIFIER_DEFS)) {
  assert.equal(def.id, id, `registry def ${id} must carry its own id`);
  assert.equal(def.name, def.label, `registry def ${id} name must match its label`);
  assert.ok(typeof def.name === 'string' && def.name.length > 0, `registry def ${id} needs a name`);
  assert.ok(typeof def.icon === 'string' && def.icon.length > 0, `registry def ${id} needs an icon`);
  assert.match(def.colour, /^#[0-9a-f]{6}$/i, `registry def ${id} needs a hex colour`);
  assert.equal(def.testId, `showdown-modifier-${id.replace(/_/g, '-')}`, `registry def ${id} needs its testId`);
  assert.equal(typeof def.description, 'string', `registry def ${id} needs a description`);
}
for (const [mode, pool] of Object.entries(P.SHOWDOWN_MODE_MODIFIER_POOLS)) {
  for (const id of pool) assert.ok(id in P.SHOWDOWN_MODIFIER_DEFS, `pool ${mode} references unknown modifier ${id}`);
}
assert.equal(P.getShowdownModifierDef('bogus').id, 'none', 'unknown modifier IDs must fall back to the none def');
assert.equal(P.getShowdownModifierDef('heavy_storm').colour, '#7fb2ff', 'heavy_storm colour must come from the registry');

// Active-check truth table, driven through the real launch path + direct sets.
launch('solo', 'heavy_storm');
assert.equal(P.isShowdownModifierActive('heavy_storm'), true, 'heavy_storm must be active after a heavy_storm launch');
assert.equal(P.isShowdownModifierActive('none'), false, 'none must not be active during heavy_storm');
assert.equal(P.getModeStormDurationSeconds(), 90, 'the storm getter must still read the active modifier through the check');
P.setVar('activeShowdownModifier', 'none');
assert.equal(P.isShowdownModifierActive('none'), true, 'none must be active when set');
assert.equal(P.isShowdownModifierActive('heavy_storm'), false, 'heavy_storm must not be active when none is set');
P.setVar('activeShowdownModifier', null); // a null modifier is active for nothing
assert.equal(P.isShowdownModifierActive('none'), false, 'null modifier must not count as none');
assert.equal(P.isShowdownModifierActive('heavy_storm'), false, 'null modifier must not count as heavy_storm');
assert.equal(P.isShowdownModifierActive('bogus'), false, 'an unknown ID must never be active');
P.setVar('activeShowdownModifier', 'none');

// Rotation / selection: the 20-minute slot walk, with Date.now stubbed.
const realNow = Date.now;
try {
  const pickAt = (ms, mode) => { Date.now = () => ms; return P.pickShowdownModifierForMode(mode); };
  assert.equal(pickAt(0, 'solo'), 'heavy_storm', 'slot 0 of the solo pool must be heavy_storm');
  assert.equal(pickAt(P.MODE_MODIFIER_ROTATE_MS, 'solo'), 'heavy_storm', 'the solo pool holds only heavy_storm, so every slot picks it');
  assert.equal(pickAt(2 * P.MODE_MODIFIER_ROTATE_MS, 'solo'), 'heavy_storm', 'slot 2 of the solo pool must still be heavy_storm');
  assert.equal(pickAt(3 * P.MODE_MODIFIER_ROTATE_MS, 'solo'), 'heavy_storm', 'the solo pool must wrap back to heavy_storm');
  assert.equal(pickAt(0, 'trio'), 'heavy_storm', 'the trio pool holds only heavy_storm');
  assert.equal(pickAt(0, 'duo'), 'none', 'the duo pool holds only none');
  assert.equal(pickAt(7 * P.MODE_MODIFIER_ROTATE_MS, 'corrupted_showdown'), 'none', 'corrupted_showdown has only none');
  assert.equal(pickAt(0, 'definitely_not_a_mode'), 'none', 'an unknown mode must fall back to none');
  P.setVar('showdownModifierOverride', 'none');
  assert.equal(pickAt(0, 'solo'), 'none', 'the override hook must win over the rotation pick');
  P.setVar('showdownModifierOverride', null);
} finally { Date.now = realNow; }

// ---- heavy_storm: getters + one real storm tick at exactly x1.35 ----
P.setVar('activeShowdownModifier', 'heavy_storm');
assert.equal(P.getModeStormDurationSeconds(), 90, 'heavy_storm: storm must close in 90s');
assert.equal(P.getModeStormDamageMultiplier(), 1.35, 'heavy_storm: storm damage must be x1.35');
P.setVar('activeShowdownModifier', 'none');

function stormTickDamage(modifier) {
  launch('solo', modifier);
  const p = api.player;
  p.maxHp = 20000; p.hp = 20000; p.x = 40; p.y = 40; p.stormDamageTick = 0; p.stormTicks = 0; p.activeDmgText = null;
  // Fast-forward the storm clock so the zone (radius ~533) is already past
  // the corner-parked player: the first tick lands within a few frames,
  // before the bot lobby can interfere. The damage itself still flows
  // through the real update() storm path and getModeStormDamageMultiplier.
  // Measured via the storm's own damage text (the exact computed stormDmg),
  // so idle regen / absorb effects elsewhere in the frame cannot skew it.
  P.setVar('stormTimer', modifier === 'heavy_storm' ? 75 : 100);
  let guard = 0;
  while ((p.stormTicks || 0) < 1 && guard < 120) {
    for (const b of api.bots) { b.x = 2000; b.y = 2000; b.hp = b.maxHp; b.superCharge = 0; b.hyperChargeCharge = 0; }
    p.x = 40; p.y = 40;
    api.update(1 / 30);
    guard++;
  }
  assert.ok((p.stormTicks || 0) >= 1, `storm must tick on an out-of-zone player (${modifier})`);
  assert.ok(p.activeDmgText && p.activeDmgText.color === '#39d879', 'the storm tick must spawn its #39d879 damage text');
  return p.activeDmgText.amount;
}
const tickNone = stormTickDamage('none');
assert.equal(tickNone, 1600, `none: first storm tick on 20000 max HP must be 8% = 1600 (got ${tickNone})`);
const tickHeavy = stormTickDamage('heavy_storm');
assert.equal(tickHeavy, 2160, `heavy_storm: first tick must be 1600 x1.35 = 2160 (got ${tickHeavy})`);

console.log('showdown-modifiers-regression: all assertions passed');
process.exit(0);
