import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Thanksgiving big update Phase 5 — Ranked / Custom mutators rework.
// PURE centralization/dedupe: one MUTATOR_DEFS registry + isMutatorActive().
// Arena Forge big changes deleted 7 mutators (colossus_friend,
// crowd_uncontrol, always_hyper, timed_detonation, friendly_fire_plus,
// super_rate_90, giant_projectiles) and emptied MUTATOR_ALIASES, so this
// suite pins the AS-SHIPPED behaviour of the 5 kept mutators, each with a
// `classic` negative control.
// Known as-shipped quirks pinned here (NOT fixed by this rework):
//   - quickfire refunds max(0.35, maxAmmo x 0.12) = 12%, not the 10% the
//     copy claims; a Super refunds 0; refund is once per activation.
// NOTE: the deleted mutators' helper functions still exist in game.js as
// inert dead code (no def can ever activate them); this suite does not
// pin them.

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static pins: registry, dedupe, flags, no leftover chains ----
assert.match(source, /const MUTATOR_DEFS = \{/, 'MUTATOR_DEFS registry must exist');
assert.ok(!source.includes('RANKED_MODIFIERS'), 'old RANKED_MODIFIERS table must be gone');
assert.ok(!source.includes('rankedLeavingModifiers'), 'side leaving Set must be gone');
assert.ok(!source.includes('colossal_projectiles'), 'phantom alias must stay absent');
assert.match(source, /const MUTATOR_ALIASES = \{\};/,
  'alias map must be empty after the deletions');
assert.ok(!/'super_rate_plus':\s*\{/.test(source), 'super_rate_plus must not be a def');
assert.ok(!/'projectiles_150':\s*\{/.test(source), 'projectiles_150 must not be a def');
assert.match(source, /function isMutatorActive\(id\)/, 'isMutatorActive must exist');
assert.match(source, /function resolveMutatorId\(id\)/, 'resolveMutatorId must exist');
assert.match(source, /function getMutatorDef\(id\)/, 'getMutatorDef must exist');
assert.match(source, /function getRankedMutatorPoolKeys\(includeClassic\)/, 'pool helper must exist');
assert.match(source, /function setActiveMutators\(primary, secondary, tertiary\)/, 'canonicalising setter must exist');
assert.ok(!source.includes("activeRankedModifier === '"), 'no single-slot === chain may remain');
assert.ok(!source.includes('activeRankedModifierSecondary ==='), 'no secondary === chain may remain');
assert.ok(!source.includes('activeRankedModifierTertiary ==='), 'no tertiary === chain may remain');
assert.ok(!source.includes('activeRankedModifierSecondary !=='), 'no secondary !== chain may remain');
assert.ok(!source.includes('activeRankedModifierTertiary !=='), 'no tertiary !== chain may remain');

// ---- Behavioural harness: the real game booted in a vm sandbox ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__mutProbe = (() => { let __tmp;
  return {
    MUTATOR_DEFS, MUTATOR_ALIASES, resolveMutatorId, getMutatorDef,
    isMutatorActive, getRankedMutatorPoolKeys, setActiveMutators,
    isFriendlyFireActive, grantMainAttackCharge,
    get superCharge() { return superCharge; },
    set superCharge(v) { superCharge = v; },
    get ammo() { return ammo; },
    set ammo(v) { ammo = v; },
    get maxAmmo() { return maxAmmo; },
    get destructibleWalls() { return destructibleWalls; },
    get cubes() { return cubes; },
    get bushZones() { return bushZones; },
    get bullets() { return bullets; },
    get isBossFight() { return isBossFight; },
    get isTraining() { return isTraining; },
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
  }, set: (t, k, v) => { t[k] = v; return true; } });
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
const P = sandbox.__mutProbe;
assert.ok(api && P, 'game test API + mutator probe must boot');

// Force the rotating Showdown modifier to 'none' so Heavy Storm can never
// skew the mutator charge measurements (power_surge is deleted).
function launchCustom(mode, primary, secondary = null, tertiary = null) {
  P.setVar('showdownModifierOverride', 'none');
  api.isRankedMatch = false;
  api.isCustomMutatorMatch = true;
  api.showdownMode = mode;
  api.setActiveMutators(primary, secondary, tertiary);
  api.launchShowdownMatch(1, 1);
  api.playing = true;
  api.gameOver = false;
  P.setVar('showdownModifierOverride', null);
}
function parkBots() {
  for (const b of api.bots) { b.x = 2000; b.y = 2000; b.hp = b.maxHp; }
  api.player.x = 1000; api.player.y = 1000;
}
function runSeconds(seconds) {
  // One update() frame costs ~3s wall time in this VM harness, but dt is
  // unclamped (verified: update(1.0) grants exactly the 1s passive), so a
  // whole game-second can be advanced in a single frame.
  parkBots();
  api.update(seconds);
}
function measureCharge(owner) {
  owner.brawler = 'warrior'; // pin a non-multi-super brawler for a clean single charge path
  if (owner === api.player) { P.superCharge = 0; api.hyperChargeCharge = 0; }
  else { owner.superCharge = 0; owner.hyperChargeCharge = 0; }
  const ok = P.grantMainAttackCharge(owner, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
  assert.equal(ok, true, 'grantMainAttackCharge must land for a live owner');
  return owner === api.player
    ? { s: P.superCharge, h: api.hyperChargeCharge }
    : { s: owner.superCharge, h: owner.hyperChargeCharge };
}

// ---- Registry: 5 canonical defs, 4 mechanics + classic baseline ----
const defKeys = Object.keys(P.MUTATOR_DEFS);
assert.equal(defKeys.length, 5, `registry must hold 5 canonical defs (got ${defKeys.length})`);
for (const id of ['classic', 'hyper_overdrive', 'quickfire', 'super_surge', 'friendly_fire']) {
  const d = P.MUTATOR_DEFS[id];
  assert.ok(d, `registry must define ${id}`);
  assert.equal(d.id, id, `${id}: def id must match its key`);
  assert.ok(d.name && d.icon && d.color && d.desc, `${id}: def needs name/icon/color/desc`);
  assert.equal(d.testId, `mutator-${id.replace(/_/g, '-')}`, `${id}: testId must be mutator-<kebab-id>`);
}
assert.deepEqual(Object.keys(P.MUTATOR_ALIASES).sort(), [], 'alias map must be empty after the deletions');
assert.equal(P.resolveMutatorId('super_rate_plus'), null, 'deleted alias id must resolve to null');
assert.equal(P.resolveMutatorId('projectiles_150'), null, 'deleted alias id must resolve to null');
assert.equal(P.resolveMutatorId('super_rate_90'), null, 'deleted mutator id must resolve to null');
assert.equal(P.resolveMutatorId('giant_projectiles'), null, 'deleted mutator id must resolve to null');
assert.equal(P.getMutatorDef('super_rate_plus'), null, 'deleted alias id must have no def');
assert.equal(P.getMutatorDef('projectiles_150'), null, 'deleted alias id must have no def');
assert.equal(P.resolveMutatorId('classic'), 'classic', 'kept canonical ids must resolve to themselves');
assert.equal(P.resolveMutatorId('colossal_projectiles'), null, 'phantom id must resolve to null');
assert.equal(P.getMutatorDef('colossal_projectiles'), null, 'phantom id must have no def');
assert.equal(P.resolveMutatorId(null), null, 'null slot must resolve to null');
assert.equal(P.resolveMutatorId('nope'), null, 'unknown id must resolve to null');

// ---- Ranked pool: leaving exclusions as registry flags ----
const poolNoClassic = P.getRankedMutatorPoolKeys(false);
assert.deepEqual(poolNoClassic.sort(), ['friendly_fire', 'hyper_overdrive', 'quickfire', 'super_surge'], 'multi-modifier pool must hold exactly the 4 kept non-classic mutators');
const poolWithClassic = P.getRankedMutatorPoolKeys(true);
assert.deepEqual(poolWithClassic.sort(), ['classic', 'friendly_fire', 'hyper_overdrive', 'quickfire', 'super_surge'], 'single-modifier pool must hold classic + the 4 kept mutators');

// ---- isMutatorActive: slots, context, alias resolution ----
api.isRankedMatch = true; api.isCustomMutatorMatch = false;
api.setActiveMutators('super_surge', 'quickfire', 'hyper_overdrive');
assert.equal(P.isMutatorActive('super_surge'), true, 'primary slot must activate');
assert.equal(P.isMutatorActive('quickfire'), true, 'secondary slot must activate');
assert.equal(P.isMutatorActive('hyper_overdrive'), true, 'tertiary slot must activate');
assert.equal(P.isMutatorActive('classic'), false, 'classic in no slot must not activate');
assert.equal(P.isMutatorActive('colossus_friend'), false, 'unset mutator must not activate');
api.activeRankedModifier = 'super_rate_90'; // deleted id, raw slot write
assert.equal(P.isMutatorActive('super_rate_90'), false, 'deleted id in a slot must activate nothing');
api.activeRankedModifier = 'giant_projectiles';
assert.equal(P.isMutatorActive('giant_projectiles'), false, 'deleted id in a slot must activate nothing');
api.activeRankedModifier = 'colossal_projectiles';
assert.equal(P.isMutatorActive('colossal_projectiles'), false, 'phantom id in a slot must activate nothing');
api.isRankedMatch = false; api.isCustomMutatorMatch = false;
api.setActiveMutators('super_surge', null, null);
assert.equal(P.isMutatorActive('super_surge'), false, 'mutators must be inert outside Ranked/Custom matches');
api.setActiveMutators('classic', null, null);
assert.equal(P.isMutatorActive('classic'), false, 'classic must never count as an active mutator');
assert.equal(P.isFriendlyFireActive(), false, 'friendly-fire helper must be false on classic solo');

// ---- classic: the negative control launch ----
launchCustom('solo', 'classic');
assert.equal(P.isMutatorActive('classic'), false, 'classic launch must activate nothing');
assert.equal(api.player.shield, 0, 'classic launch must grant no shield');
P.superCharge = 0;
const classicCharge = measureCharge(api.player);
assert.ok(classicCharge.s > 0, 'classic baseline grant must charge Super');

// ---- hyper_overdrive: +4/s passive, none while Hypercharged ----
launchCustom('solo', 'hyper_overdrive');
api.hyperChargeCharge = 0; api.isHypercharged = false;
runSeconds(1);
assert.ok(Math.abs(api.hyperChargeCharge - 4) < 1.0, `hyper_overdrive: 1s must gain ~4 Hypercharge (got ${api.hyperChargeCharge})`);
api.hyperChargeCharge = 50; api.isHypercharged = true; api.hyperchargeUntil = Date.now() + 60000;
runSeconds(1);
assert.ok(Math.abs(api.hyperChargeCharge - 50) < 0.5, `hyper_overdrive: Hypercharged player must gain 0 (got ${api.hyperChargeCharge})`);
api.isHypercharged = false;
launchCustom('solo', 'classic');
api.hyperChargeCharge = 0;
runSeconds(1);
assert.equal(api.hyperChargeCharge, 0, 'classic: no passive Hypercharge gain');

// ---- quickfire: as-shipped 12% refund, once per activation, Super = 0 ----
launchCustom('solo', 'quickfire');
const expectedRefund = Math.max(0.35, P.maxAmmo * 0.12);
P.ammo = 0;
let ok = P.grantMainAttackCharge(api.player, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
assert.equal(ok, true, 'quickfire grant must land');
assert.ok(Math.abs(P.ammo - expectedRefund) < 1e-9, `quickfire: one hit must refund max(0.35, maxAmmo x 0.12) = ${expectedRefund} (got ${P.ammo})`);
const actSource = { mainAttackActivationId: 424242, ownerBrawler: 'warrior' };
P.ammo = 0;
P.grantMainAttackCharge(api.player, actSource);
const afterFirst = P.ammo;
P.grantMainAttackCharge(api.player, actSource);
assert.equal(P.ammo, afterFirst, 'quickfire: same activation id must refund only once');
P.ammo = 0;
ok = P.grantMainAttackCharge(api.player, { isPrimaryChargeProjectile: true, super: true, ownerBrawler: 'warrior' });
assert.equal(ok, false, 'quickfire: a Super source must not grant at all');
assert.equal(P.ammo, 0, 'quickfire: a Super must refund 0 ammo');
P.ammo = P.maxAmmo - 0.1;
P.grantMainAttackCharge(api.player, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
assert.equal(P.ammo, P.maxAmmo, 'quickfire: refund must clamp at maxAmmo (never overfill)');
const qBot = api.bots.find(b => b && !b.isStructure && !b.isDummy);
qBot.ammo = 0;
P.grantMainAttackCharge(qBot, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
assert.ok(Math.abs(qBot.ammo - Math.max(0.35, (qBot.maxAmmo || 3) * 0.12)) < 1e-9, 'quickfire: bots must get the same refund');
launchCustom('solo', 'classic');
P.ammo = 0;
P.grantMainAttackCharge(api.player, { isPrimaryChargeProjectile: true, ownerBrawler: 'warrior' });
assert.equal(P.ammo, 0, 'classic: no ammo refund');

// ---- super_surge: +5/s passive and x1.4 on hit ----
launchCustom('solo', 'super_surge');
P.superCharge = 0;
runSeconds(1);
assert.ok(Math.abs(P.superCharge - 5) < 1.0, `super_surge: 1s must gain ~5 Super (got ${P.superCharge})`);
const surgePlayer = measureCharge(api.player);
const surgeBot = measureCharge(api.bots[0]);
assert.ok(Math.abs(surgePlayer.s / classicCharge.s - 1.4) < 0.05, `super_surge: player on-hit gain must be x1.4 (got ${surgePlayer.s / classicCharge.s})`);
assert.ok(Math.abs(surgeBot.s / classicCharge.s - 1.4) < 0.05, `super_surge: bot on-hit gain must be x1.4 (got ${surgeBot.s / classicCharge.s})`);
launchCustom('solo', 'classic');
P.superCharge = 0;
runSeconds(1);
assert.equal(P.superCharge, 0, 'classic: no passive Super gain');

// ---- friendly_fire: helper gates, knock_donate clause, FF+ implies FF ----
launchCustom('duo', 'friendly_fire');
assert.equal(P.isFriendlyFireActive(), true, 'friendly_fire: helper must be true in a Duo custom match');
launchCustom('solo', 'classic');
assert.equal(P.isFriendlyFireActive(), false, 'classic solo: helper must be false');
api.showdownMode = 'knock_donate';
assert.equal(P.isFriendlyFireActive(), true, 'knock_donate: mode clause must enable friendly fire even on classic');
api.showdownMode = 'solo';
assert.equal(P.isFriendlyFireActive(), false, 'back to solo classic: helper must be false again');

console.log('mutators-regression: all assertions passed');
process.exit(0);
