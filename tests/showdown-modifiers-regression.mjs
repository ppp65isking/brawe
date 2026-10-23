import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Thanksgiving big update Phase 4 — rotating Showdown modifiers rework.
// One behavioural row per modifier (plan test matrix), forced through the
// showdownModifierOverride debug hook instead of the 20-minute rotation:
//   none            -> baseline getters, 75 boxes
//   heavy_storm     -> 90s storm, one storm tick deals exactly x1.35
//   power_surge     -> attack-hit Super gain x1.2 AND Core Surge gain x1.2
//                      (player and bot), via grantMainAttackCharge
//   no_free_cubes   -> Box Scarcity: cubes (structural walls) identical to
//                      the none launch, Power Boxes 75 -> 49 / 90 -> 59
//   core_instability-> implemented: 20s surge telegraphs 3 live boxes and
//                      converts them to Charged (4800 HP); solo never does

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static pins: registry, vault, hooks ----
assert.match(source, /const SHOWDOWN_MODIFIER_DEFS = \{/, 'modifier registry must exist');
for (const id of ['none', 'heavy_storm', 'power_surge', 'no_free_cubes', 'core_instability']) {
  assert.match(source, new RegExp(`${id}: \\{ label: '`), `registry must define ${id}`);
}
assert.match(source, /no_free_cubes: \{ label: 'Box Scarcity'/, 'no_free_cubes must be relabelled Box Scarcity');
assert.match(source, /core_instability: \{ label: 'Corrupted Packet Storm'/, 'core_instability label must stay Corrupted Packet Storm');
const mapRulesAt = source.indexOf('function applyShowdownModifierMapRules()');
assert.ok(mapRulesAt >= 0, 'applyShowdownModifierMapRules must still exist as the launch hook');
const mapRules = source.slice(mapRulesAt, mapRulesAt + 900);
assert.match(mapRules, /VAULTED/, 'the wall-deleting map rule must be marked VAULTED');
assert.ok(!mapRules.includes('cubes.length = 0') && !mapRules.includes('cubes.push'), 'no code path may delete structural cubes as a modifier');
assert.match(source, /getShowdownBoxScarcityMultiplier\(\)/, 'generatePowerBoxes must consume the scarcity multiplier');
assert.match(source, /function getModeHyperGainMultiplier\(\)/, 'power_surge widening needs a dedicated Core Surge multiplier');
const grantAt = source.indexOf('function grantMainAttackCharge');
assert.match(source.slice(grantAt, grantAt + 4200), /getModeHyperGainMultiplier\(\)/, 'grantMainAttackCharge must route hyper gain through the mode hyper multiplier');
assert.match(source, /const CORE_INSTABILITY_SURGE_INTERVAL_MS = 20000;/, 'core_instability surge interval must be 20s');
assert.match(source, /function updateCoreInstability/, 'core_instability must have a real update (it was a placebo label)');
assert.match(source, /initCoreInstability\(\);/, 'launch must initialise core_instability state');
assert.match(source, /SHOWDOWN_MODIFIER_DEFS\[activeShowdownModifier\]/, 'HUD must read the modifier description from the registry');

// ---- Behavioural harness: the real game booted in a vm sandbox ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__modProbe = (() => { let __tmp;
  return {
    SHOWDOWN_MODIFIER_DEFS,
    getModeStormDurationSeconds, getModeStormDamageMultiplier,
    getModeSuperGainMultiplier, getModeHyperGainMultiplier,
    getShowdownBoxScarcityMultiplier, applyShowdownModifierMapRules,
    getAttackChargeMultiplier, grantMainAttackCharge, updateCoreInstability,
    get activeShowdownModifier() { return activeShowdownModifier; },
    get superCharge() { return superCharge; },
    get cubes() { return cubes; },
    get destructibleWalls() { return destructibleWalls; },
    get coreInstabilityState() { return coreInstabilityState; },
    get CORE_INSTABILITY_TELEGRAPH_MS() { return CORE_INSTABILITY_TELEGRAPH_MS; },
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

// ---- power_surge: Super x1.2 AND Core Surge x1.2, player and bot ----
launch('solo', 'none');
function measureCharge(owner) {
  owner.brawler = 'warrior'; // pin a non-multi-super brawler for a clean single charge path
  if (owner === api.player) { P.setVar('superCharge', 0); api.hyperChargeCharge = 0; }
  else { owner.superCharge = 0; owner.hyperChargeCharge = 0; }
  const ok = P.grantMainAttackCharge(owner, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
  assert.equal(ok, true, 'grantMainAttackCharge must land for a live owner');
  return owner === api.player
    ? { s: P.superCharge, h: api.hyperChargeCharge }
    : { s: owner.superCharge, h: owner.hyperChargeCharge };
}
const bot = api.bots[0];
const playerNone = measureCharge(api.player);
const botNone = measureCharge(bot);
assert.ok(playerNone.s > 0 && playerNone.h > 0, 'baseline grant must charge Super and Core Surge');
P.setVar('activeShowdownModifier', 'power_surge');
assert.equal(P.getAttackChargeMultiplier(api.player) / 1 > 0, true);
const playerSurge = measureCharge(api.player);
const botSurge = measureCharge(bot);
for (const [who, base, surge] of [['player', playerNone, playerSurge], ['bot', botNone, botSurge]]) {
  assert.ok(Math.abs(surge.s / base.s - 1.2) < 0.02, `power_surge: ${who} Super gain ratio must be x1.2 (got ${surge.s / base.s})`);
  assert.ok(Math.abs(surge.h / base.h - 1.2) < 0.02, `power_surge: ${who} Core Surge gain ratio must be x1.2 (got ${surge.h / base.h})`);
}
P.setVar('activeShowdownModifier', 'none');

// ---- no_free_cubes (Box Scarcity): cover untouched, boxes reduced ----
launch('solo', 'no_free_cubes');
assert.equal(P.activeShowdownModifier, 'no_free_cubes');
assert.equal(P.cubes.length, cubesBaseline, 'Box Scarcity must NEVER delete structural wall cubes');
const cubesBeforeRule = cubesFingerprint();
P.applyShowdownModifierMapRules();
assert.equal(cubesFingerprint(), cubesBeforeRule, 'the vaulted map rule must be a pure no-op even when invoked directly');
assert.equal(powerBoxes().length, 49, 'Box Scarcity: Solo boxes 75 -> 49');
launch('duo', 'no_free_cubes');
assert.equal(powerBoxes().length, 59, 'Box Scarcity: Duo/Trio boxes 90 -> 59');
launch('duo', 'none');
assert.equal(powerBoxes().length, 90, 'none: Duo launch must spawn the full 90 boxes');

// ---- core_instability: the placebo becomes real ----
launch('corrupted_showdown', 'core_instability');
assert.equal(P.activeShowdownModifier, 'core_instability');
const ci = P.coreInstabilityState;
assert.ok(ci, 'core_instability state must be created at launch');
assert.equal(ci.surges, 0, 'no surge may fire before the first interval');
const typesBefore = powerBoxes().map(b => b.powerBoxType).join(',');
P.updateCoreInstability(ci.nextSurgeAt - 1);
assert.equal(ci.telegraphs.length, 0, 'no telegraphs before the first surge');
assert.equal(powerBoxes().map(b => b.powerBoxType).join(','), typesBefore, 'no box may convert before the first surge');
const surgeAt = ci.nextSurgeAt;
P.updateCoreInstability(surgeAt);
assert.equal(ci.surges, 1, 'the surge counter must advance at the interval');
assert.equal(ci.telegraphs.length, 3, 'a surge must telegraph exactly 3 live boxes');
const targets = ci.telegraphs.map(t => t.box);
for (const b of targets) assert.equal(b.coreInstabilityTelegraphed, true, 'telegraphed boxes must be flagged');
P.updateCoreInstability(surgeAt + P.CORE_INSTABILITY_TELEGRAPH_MS - 1);
assert.equal(ci.telegraphs.length, 3, 'telegraphs must stay pending for the telegraph delay');
P.updateCoreInstability(surgeAt + P.CORE_INSTABILITY_TELEGRAPH_MS);
assert.equal(ci.telegraphs.length, 0, 'telegraphs must resolve after the delay');
for (const b of targets) {
  assert.equal(b.powerBoxType, 'charged', 'a surged box must convert to charged');
  assert.equal(b.hp, 4800, 'a converted box must refill to the charged spec HP (4800)');
  assert.equal(b.maxHp, 4800, 'a converted box maxHp must be the charged spec');
  assert.equal(b.powerBoxReward, 'charged', 'a converted box must drop the charged reward');
}
// Negative control: outside core_instability nothing ever converts.
launch('solo', 'power_surge');
assert.equal(P.coreInstabilityState, null, 'core_instability state must not exist in a Solo power_surge match');
const snapshot = powerBoxes().map(b => `${b.powerBoxType}:${b.hp}`).join(',');
P.updateCoreInstability(Date.now() + 999999999);
assert.equal(powerBoxes().map(b => `${b.powerBoxType}:${b.hp}`).join(','), snapshot, 'no box may convert outside core_instability');

console.log('showdown-modifiers-regression: all assertions passed');
process.exit(0);
