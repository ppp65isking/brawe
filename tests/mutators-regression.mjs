import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Thanksgiving big update Phase 5 — Ranked / Custom mutators rework.
// PURE centralization/dedupe: one MUTATOR_DEFS registry + isMutatorActive(),
// the two duplicate defs removed as definitions (kept as canonicalising
// aliases), Ranked leaving exclusions as rankedPool:false flags.
// NO behaviour change is intended, so this suite pins the AS-SHIPPED
// behaviour of every mutator, each with a `classic` negative control.
// Known as-shipped quirks pinned here (NOT fixed by this rework):
//   - quickfire refunds max(0.35, maxAmmo x 0.12) = 12%, not the 10% the
//     copy claims; a Super refunds 0; refund is once per activation.
//   - crowd_uncontrol reflects slow/stun/root/freeze but NOT knockback.
//   - timed_detonation splices Power Boxes (no reward) like any wall.
//   - colossus_friend respawn restores shared HP but the shield granted in
//     restoreRespawningEntity is wiped by the later shield reset in the
//     same function, so a respawned fighter ends with shield 0.
//   - the bullets.push giant hook is dead at runtime: a later push override
//     (charge stamping) replaces it, so giant scaling happens only in the
//     bullet update loop, not at push time.
//   - timed_detonation / giant family can no longer be drafted in Ranked
//     (unchanged); the single-modifier fallback can no longer roll the
//     super_rate_plus ALIAS id (mechanically identical to super_rate_90).

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static pins: registry, dedupe, flags, no leftover chains ----
assert.match(source, /const MUTATOR_DEFS = \{/, 'MUTATOR_DEFS registry must exist');
assert.ok(!source.includes('RANKED_MODIFIERS'), 'old RANKED_MODIFIERS table must be gone');
assert.ok(!source.includes('rankedLeavingModifiers'), 'side leaving Set must be gone');
assert.ok(!source.includes('colossal_projectiles'), 'phantom alias must stay absent');
assert.match(source, /const MUTATOR_ALIASES = \{[^}]*'super_rate_plus': 'super_rate_90'[^}]*'projectiles_150': 'giant_projectiles'/,
  'alias map must hold exactly the two duplicate pairs');
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
assert.match(source, /'timed_detonation': \{[\s\S]*?rankedPool: false/, 'timed_detonation must be rankedPool:false');
assert.match(source, /'giant_projectiles': \{[\s\S]*?rankedPool: false/, 'giant_projectiles must be rankedPool:false');

// ---- Behavioural harness: the real game booted in a vm sandbox ----
const ANCHOR = '  window.__pureHTMLGame = window.__pureHTMLGame || {};\n  Object.defineProperties(window.__pureHTMLGame';
assert.ok(source.includes(ANCHOR), 'test-export block anchor must exist for the probe');
const PROBE = `  globalThis.__mutProbe = (() => { let __tmp;
  return {
    MUTATOR_DEFS, MUTATOR_ALIASES, resolveMutatorId, getMutatorDef,
    isMutatorActive, getRankedMutatorPoolKeys, setActiveMutators,
    isFriendlyFireActive, isFriendlyFirePlusActive, isSuperRate90Active,
    isGiantProjectilesActive, applyGiantProjectilesModifier,
    applyStatusEffect, grantMainAttackCharge, triggerTimedDetonationWave,
    restoreRespawningEntity, grantFriendlyFirePlusBonus,
    get activeColossusMaxHp() { return activeColossusMaxHp; },
    get timedDetonationStage() { return timedDetonationStage; },
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

// Force the rotating Showdown modifier to 'none' so Phase 4's power_surge
// (x1.2 Super gain) can never skew the mutator charge measurements.
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

// ---- Registry: 12 canonical defs, 11 mechanics + classic baseline ----
const defKeys = Object.keys(P.MUTATOR_DEFS);
assert.equal(defKeys.length, 12, `registry must hold 12 canonical defs (got ${defKeys.length})`);
for (const id of ['classic', 'colossus_friend', 'crowd_uncontrol', 'hyper_overdrive', 'always_hyper', 'quickfire', 'timed_detonation', 'super_surge', 'friendly_fire', 'friendly_fire_plus', 'super_rate_90', 'giant_projectiles']) {
  const d = P.MUTATOR_DEFS[id];
  assert.ok(d, `registry must define ${id}`);
  assert.equal(d.id, id, `${id}: def id must match its key`);
  assert.ok(d.name && d.icon && d.color && d.desc, `${id}: def needs name/icon/color/desc`);
  assert.equal(d.testId, `mutator-${id.replace(/_/g, '-')}`, `${id}: testId must be mutator-<kebab-id>`);
}
assert.deepEqual(Object.keys(P.MUTATOR_ALIASES).sort(), ['projectiles_150', 'super_rate_plus'], 'alias map must hold exactly the two duplicate pairs');
assert.equal(P.resolveMutatorId('super_rate_plus'), 'super_rate_90', 'super_rate_plus must resolve to super_rate_90');
assert.equal(P.resolveMutatorId('projectiles_150'), 'giant_projectiles', 'projectiles_150 must resolve to giant_projectiles');
assert.equal(P.resolveMutatorId('super_rate_90'), 'super_rate_90', 'canonical ids must resolve to themselves');
assert.equal(P.getMutatorDef('super_rate_plus'), P.MUTATOR_DEFS.super_rate_90, 'alias def lookup must return the canonical def');
assert.equal(P.getMutatorDef('projectiles_150'), P.MUTATOR_DEFS.giant_projectiles, 'alias def lookup must return the canonical def');
assert.equal(P.resolveMutatorId('colossal_projectiles'), null, 'phantom id must resolve to null');
assert.equal(P.getMutatorDef('colossal_projectiles'), null, 'phantom id must have no def');
assert.equal(P.resolveMutatorId(null), null, 'null slot must resolve to null');
assert.equal(P.resolveMutatorId('nope'), null, 'unknown id must resolve to null');

// ---- Ranked pool: leaving exclusions as registry flags ----
const poolNoClassic = P.getRankedMutatorPoolKeys(false);
assert.ok(!poolNoClassic.includes('classic'), 'multi-modifier pool must never roll classic');
assert.ok(!poolNoClassic.includes('timed_detonation'), 'ranked pool must exclude timed_detonation');
assert.ok(!poolNoClassic.includes('giant_projectiles'), 'ranked pool must exclude giant_projectiles');
assert.ok(!poolNoClassic.includes('super_rate_plus') && !poolNoClassic.includes('projectiles_150'), 'ranked pool must not contain alias ids');
assert.equal(poolNoClassic.length, 9, `multi-modifier pool must hold 9 keys (got ${poolNoClassic.length})`);
const poolWithClassic = P.getRankedMutatorPoolKeys(true);
assert.ok(poolWithClassic.includes('classic'), 'single-modifier fallback pool must still offer classic');
assert.equal(poolWithClassic.length, 10, `single-modifier pool must hold 10 keys (got ${poolWithClassic.length})`);
assert.equal(P.MUTATOR_DEFS.timed_detonation.rankedPool, false, 'timed_detonation flag must be false');
assert.equal(P.MUTATOR_DEFS.giant_projectiles.rankedPool, false, 'giant_projectiles flag must be false');

// ---- isMutatorActive: slots, context, alias resolution ----
api.isRankedMatch = true; api.isCustomMutatorMatch = false;
api.setActiveMutators('super_surge', 'quickfire', 'hyper_overdrive');
assert.equal(P.isMutatorActive('super_surge'), true, 'primary slot must activate');
assert.equal(P.isMutatorActive('quickfire'), true, 'secondary slot must activate');
assert.equal(P.isMutatorActive('hyper_overdrive'), true, 'tertiary slot must activate');
assert.equal(P.isMutatorActive('classic'), false, 'classic in no slot must not activate');
assert.equal(P.isMutatorActive('colossus_friend'), false, 'unset mutator must not activate');
api.activeRankedModifier = 'super_rate_plus'; // legacy alias id, raw slot write
assert.equal(P.isMutatorActive('super_rate_90'), true, 'alias id in a slot must activate its canonical mechanic');
api.activeRankedModifier = 'projectiles_150';
assert.equal(P.isMutatorActive('giant_projectiles'), true, 'alias id in a slot must activate giant_projectiles');
api.activeRankedModifier = 'colossal_projectiles';
assert.equal(P.isMutatorActive('giant_projectiles'), false, 'phantom id in a slot must activate nothing');
api.isRankedMatch = false; api.isCustomMutatorMatch = false;
api.setActiveMutators('super_surge', null, null);
assert.equal(P.isMutatorActive('super_surge'), false, 'mutators must be inert outside Ranked/Custom matches');
api.setActiveMutators('classic', null, null);
assert.equal(P.isMutatorActive('classic'), false, 'classic must never count as an active mutator');
assert.equal(P.isFriendlyFirePlusActive(), false, 'FF+ helper must be false on classic');
assert.equal(P.isSuperRate90Active(), false, 'super-rate helper must be false on classic');
assert.equal(P.isGiantProjectilesActive(), false, 'giant-projectiles helper must be false on classic');
assert.equal(P.isFriendlyFireActive(), false, 'friendly-fire helper must be false on classic solo');

// ---- classic: the negative control launch ----
launchCustom('solo', 'classic');
assert.equal(P.isMutatorActive('classic'), false, 'classic launch must activate nothing');
assert.equal(api.player.shield, 0, 'classic launch must grant no colossus shield');
P.superCharge = 0;
const classicCharge = measureCharge(api.player);
assert.ok(classicCharge.s > 0, 'classic baseline grant must charge Super');

// ---- colossus_friend: shared HP + 4000 shield, respawn restores HP ----
launchCustom('solo', 'colossus_friend');
const sharedHp = P.activeColossusMaxHp;
assert.ok(sharedHp > 0, 'colossus launch must record the lobby max HP');
assert.equal(api.player.maxHp, sharedHp, 'colossus: player maxHp must be the lobby max');
assert.equal(api.player.hp, sharedHp, 'colossus: player hp must be the lobby max');
assert.equal(api.player.shield, 4000, 'colossus: player must spawn with a 4000 shield');
const fighterBots = api.bots.filter(b => b && !b.isStructure && !b.isDummy);
assert.ok(fighterBots.length > 0, 'colossus: fighter bots must exist to check');
for (const b of fighterBots) {
  assert.equal(b.maxHp, sharedHp, 'colossus: every fighter bot must share the lobby max HP');
  assert.equal(b.shield, 4000, 'colossus: every fighter bot must hold the 4000 shield');
}
const respawnBot = fighterBots[0];
respawnBot.hp = 0; respawnBot.isDead = true;
P.restoreRespawningEntity(respawnBot, { x: respawnBot.baseX || respawnBot.x, y: respawnBot.baseY || respawnBot.y }, false, 0);
assert.equal(respawnBot.maxHp, sharedHp, 'colossus respawn must restore the shared max HP');
assert.equal(respawnBot.hp, sharedHp, 'colossus respawn must restore the shared HP');
// As-shipped quirk (NOT fixed here): the shield granted above is wiped by
// the later `entity.shield = 0` reset in the same restore function.
assert.equal(respawnBot.shield, 0, 'colossus respawn shield is wiped by the later reset (as-shipped quirk)');

// ---- colossus_friend in Arena Forge: towers can NEVER gain HP (PR #42) ----
launchCustom('arena_forge', 'colossus_friend');
assert.ok(P.activeColossusMaxHp < 72000, 'colossus lobby max must be fighter-derived, never tower HP');
const structures = api.bots.filter(b => b && b.isArenaForgeStructure);
assert.ok(structures.length >= 8, `arena forge must spawn its 8 structures (got ${structures.length})`);
for (const s of structures) {
  const base = s.isArenaForgeCore ? 120000 : 72000;
  assert.equal(s.maxHp, base, `colossus must not raise a ${s.isArenaForgeCore ? 'core' : 'tower'} maxHp above ${base}`);
  assert.equal(s.hp, base, `colossus must not raise a ${s.isArenaForgeCore ? 'core' : 'tower'} hp above ${base}`);
}
const forgeFighters = api.bots.filter(b => b && !b.isStructure && !b.isDummy);
assert.ok(forgeFighters.length > 0, 'arena forge fighters must exist');
for (const b of forgeFighters) assert.equal(b.maxHp, P.activeColossusMaxHp, 'arena forge fighters must still share the lobby max HP');

// ---- crowd_uncontrol: slow + stun reflect exactly once; classic: none ----
launchCustom('solo', 'crowd_uncontrol');
const ccBot = api.bots.find(b => b && !b.isStructure && !b.isDummy);
assert.ok(ccBot, 'crowd test needs a live bot');
api.player.slowUntil = 0; api.player.stunUntil = 0; ccBot.slowUntil = 0; ccBot.stunUntil = 0;
P.applyStatusEffect(ccBot, 'slow', 1000, api.player);
assert.ok(ccBot.slowUntil > Date.now(), 'crowd: target must be slowed');
assert.ok(api.player.slowUntil > Date.now(), 'crowd: slow must reflect to the attacker');
assert.ok(api.player.slowUntil <= Date.now() + 1500, 'crowd: reflect must land exactly once (no double duration)');
P.applyStatusEffect(ccBot, 'stun', 1000, api.player);
assert.ok(ccBot.stunUntil > Date.now(), 'crowd: target must be stunned');
assert.ok(api.player.stunUntil > Date.now(), 'crowd: stun must reflect to the attacker');
launchCustom('solo', 'classic');
api.player.slowUntil = 0; api.player.stunUntil = 0; ccBot.slowUntil = 0; ccBot.stunUntil = 0;
P.applyStatusEffect(ccBot, 'slow', 1000, api.player);
assert.ok(ccBot.slowUntil > Date.now(), 'classic: target must still be slowed');
assert.equal(api.player.slowUntil, 0, 'classic: slow must NOT reflect to the attacker');

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

// ---- always_hyper: permanent Hypercharge past normal expiry ----
launchCustom('solo', 'always_hyper');
assert.equal(api.isHypercharged, true, 'always_hyper: player must start Hypercharged');
assert.equal(api.hyperChargeCharge, 100, 'always_hyper: player Hypercharge must start full');
assert.ok(api.hyperchargeUntil > Date.now() + 1000000, 'always_hyper: expiry must be pushed far out');
api.hyperchargeUntil = Date.now() - 1000; // force a past expiry and let the loop re-assert
runSeconds(1);
assert.equal(api.isHypercharged, true, 'always_hyper: player must stay Hypercharged past expiry');
assert.ok(api.hyperchargeUntil > Date.now() + 1000000, 'always_hyper: loop must re-assert the far-out expiry');
launchCustom('solo', 'classic');
api.isHypercharged = true; api.hyperchargeUntil = Date.now() - 1000;
runSeconds(0.2);
assert.equal(api.isHypercharged, false, 'classic: Hypercharge must expire once its timestamp passes');

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

// ---- timed_detonation: wave clears terrain/bushes, stage advances ----
launchCustom('solo', 'timed_detonation');
const stageBefore = P.timedDetonationStage;
const cx = 2000, cy = 2000; // world centre (WORLD_W/H are 4000); stage-1 radius is 440
const myWall = { x: cx - 21, y: cy - 21, w: 42, h: 42, hp: 100, maxHp: 100 };
const myBox = { x: cx - 21, y: cy + 60, w: 42, h: 42, hp: 4500, maxHp: 4500, isPowerBox: true, powerBoxType: 'standard' };
const myBush = { x: cx - 21, y: cy - 100, w: 42, h: 42 };
P.destructibleWalls.push(myWall);
P.destructibleWalls.push(myBox);
P.bushZones.push(myBush);
P.triggerTimedDetonationWave();
assert.equal(P.timedDetonationStage, stageBefore + 1, 'timed_detonation: wave must advance the stage');
// As-shipped: the wave splices every destructible wall in radius, Power
// Boxes included (no reward) — the plan's exclusion is NOT part of this
// pure rework, so the suite pins the current behaviour.
assert.ok(!P.destructibleWalls.includes(myWall), 'timed_detonation: terrain wall in radius must be spliced');
assert.ok(!P.destructibleWalls.includes(myBox), 'timed_detonation: power box in radius must be spliced too (as-shipped)');
assert.ok(!P.bushZones.includes(myBush), 'timed_detonation: bush in radius must be removed');
// The 8s timer path: rewind the window timer and let update() fire a wave.
const stageMid = P.timedDetonationStage;
sandbox._lastTimedDetonationAt = Date.now() - 9000;
runSeconds(0.2);
assert.ok(P.timedDetonationStage > stageMid, 'timed_detonation: update loop must fire a wave after 8s');
launchCustom('solo', 'classic');
const classicStage = P.timedDetonationStage;
P.triggerTimedDetonationWave();
assert.equal(P.timedDetonationStage, classicStage, 'classic: trigger must be a no-op');

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

// ---- friendly_fire_plus: +18 Super / +12 Hyper, on top of FF damage ----
launchCustom('duo', 'friendly_fire_plus');
assert.equal(P.isFriendlyFirePlusActive(), true, 'FF+: helper must be true');
assert.equal(P.isFriendlyFireActive(), true, 'FF+: friendly fire must be active too');
const ffBot = api.bots.find(b => b && !b.isStructure && !b.isDummy);
ffBot.superCharge = 0; ffBot.hyperChargeCharge = 0; ffBot.isHypercharged = false;
P.grantFriendlyFirePlusBonus(ffBot);
assert.equal(ffBot.superCharge, 18, 'FF+: ally hit must grant +18 Super to a bot');
assert.equal(ffBot.hyperChargeCharge, 12, 'FF+: ally hit must grant +12 Hypercharge to a bot');
P.superCharge = 0; api.hyperChargeCharge = 0; api.isHypercharged = false;
P.grantFriendlyFirePlusBonus(api.player);
assert.equal(P.superCharge, 18, 'FF+: ally hit must grant +18 Super to the player');
assert.equal(api.hyperChargeCharge, 12, 'FF+: ally hit must grant +12 Hypercharge to the player');
launchCustom('solo', 'classic');
assert.equal(P.isFriendlyFirePlusActive(), false, 'classic: FF+ helper must be false');

// ---- super_rate_90 (+ alias): x1.9 on hit, +9/s passive ----
launchCustom('solo', 'super_rate_90');
assert.equal(P.isSuperRate90Active(), true, 'super_rate_90: helper must be true');
P.superCharge = 0;
runSeconds(1);
assert.ok(Math.abs(P.superCharge - 9) < 1.0, `super_rate_90: 1s must gain ~9 Super (got ${P.superCharge})`);
const srPlayer = measureCharge(api.player);
assert.ok(Math.abs(srPlayer.s / classicCharge.s - 1.9) < 0.05, `super_rate_90: on-hit gain must be x1.9 (got ${srPlayer.s / classicCharge.s})`);
api.activeRankedModifier = 'super_rate_plus'; // legacy alias id, raw slot write
assert.equal(P.isSuperRate90Active(), true, 'super_rate_plus slot must activate the same helper');
const srAlias = measureCharge(api.player);
assert.ok(Math.abs(srAlias.s / classicCharge.s - 1.9) < 0.05, `super_rate_plus slot: on-hit gain must still be x1.9 (got ${srAlias.s / classicCharge.s})`);
launchCustom('solo', 'classic');
assert.equal(P.isSuperRate90Active(), false, 'classic: super-rate helper must be false');

// ---- giant_projectiles (+ alias): bullets x2.5, phantom rejected ----
// As-shipped wiring note: the bullets.push hook at the giant check is dead
// at runtime — a later push override (charge stamping) replaces it. The
// LIVE path is the bullet update loop, which calls
// applyGiantProjectilesModifier(b) every frame. This block proves the live
// path (push + one update frame) plus the direct modifier gate.
launchCustom('solo', 'giant_projectiles');
assert.equal(P.isGiantProjectilesActive(), true, 'giant_projectiles: helper must be true');
api.bullets.length = 0;
const big = { x: api.player.x, y: api.player.y, vx: 0, vy: 0, ownerId: api.player.id, hitboxMod: 1, radius: 10 };
api.bullets.push(big);
assert.equal(big.hitboxMod, 1, 'giant_projectiles: push alone must NOT scale (push hook is shadowed as-shipped)');
runSeconds(0.05);
assert.equal(big.hitboxMod, 2.5, 'giant_projectiles: update loop must scale a live bullet hitboxMod x2.5');
assert.equal(big.radius, 25, 'giant_projectiles: update loop must scale a live bullet radius x2.5');
const bigDirect = { hitboxMod: 1, radius: 10 };
P.applyGiantProjectilesModifier(bigDirect);
assert.equal(bigDirect.hitboxMod, 2.5, 'giant_projectiles: direct modifier must scale hitboxMod x2.5');
api.activeRankedModifier = 'projectiles_150'; // legacy alias id, raw slot write
assert.equal(P.isGiantProjectilesActive(), true, 'projectiles_150 slot must activate the same helper');
const bigAlias = { hitboxMod: 1, radius: 10 };
P.applyGiantProjectilesModifier(bigAlias);
assert.equal(bigAlias.hitboxMod, 2.5, 'projectiles_150 slot: bullet must still grow x2.5');
api.activeRankedModifier = 'colossal_projectiles'; // phantom id, raw slot write
assert.equal(P.isGiantProjectilesActive(), false, 'phantom id in a slot must not activate giant projectiles');
const small = { hitboxMod: 1, radius: 10 };
P.applyGiantProjectilesModifier(small);
assert.equal(small.hitboxMod, 1, 'phantom id: bullet must stay unscaled');
assert.equal(small.radius, 10, 'phantom id: bullet radius must stay unscaled');
launchCustom('solo', 'classic');
api.bullets.length = 0;
const plain = { x: api.player.x, y: api.player.y, vx: 0, vy: 0, ownerId: api.player.id, hitboxMod: 1, radius: 10 };
api.bullets.push(plain);
runSeconds(0.05);
assert.equal(plain.hitboxMod, 1, 'classic: live bullet must stay unscaled');
assert.equal(plain.radius, 10, 'classic: live bullet radius must stay unscaled');

console.log('mutators-regression: all assertions passed');
process.exit(0);
