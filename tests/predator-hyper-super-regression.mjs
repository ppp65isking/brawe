// Predator Hyper Super rework + Arena Forge tower-heal removal (2026-10-23, Anthony's spec).
//
// CHANGE 1 — Predator: the Hyper Super latch keeps its stun and its claw
// damage unchanged, but the owner may keep jumping (main attack) while it
// plays out. Base (non-Hyper) Super latches still lock the owner out.
// Mechanism: the owner stays self-stunned through the latch (movement stays
// glued/pinned), but the main-attack gates now exempt an owner sitting in a
// Hyper latch via predatorHyperLatchCanAct().
// CHANGE 2 — Arena Forge: towers never heal. Both tower-healing sources (the
// repair camp reward and the repair upgrade) skip structures flagged
// isArenaForgeTower while ARENA_FORGE_TOWERS_HEAL_ENABLED is false. The Core
// still heals; tower damage, targeting, HP and everything else is untouched.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---------------- static pins ----------------
// Predator: the exemption helper exists and is hyper-latch scoped.
assert.match(source, /function predatorHyperLatchCanAct\(entity\) \{\s*return !!entity\?\.predatorLatch\?\.hyper;\s*\}/,
  'predatorHyperLatchCanAct must exist and only fire on a Hyper latch');
assert.match(source, /\(\!playerIsStunned \|\| predatorHyperLatchCanAct\(player\)\)/,
  'the player main-attack gate must exempt a Hyper-latched Predator');
assert.match(source, /\(\!isStunned \|\| predatorHyperLatchCanAct\(t\)\) && distToTarget < 980/,
  'the bot main-attack gate must exempt a Hyper-latched Predator bot');
// Predator: stun + damage untouched — target stun lines and latch tick damage still present.
assert.match(source, /target\.stunUntil=Math\.max\(target\.stunUntil\|\|0,now\+duration\)/,
  'the Hyper Super landing must still stun the target for the full latch');
assert.match(source, /owner\.stunUntil=Math\.max\(owner\.stunUntil\|\|0,latch\.until\);target\.stunUntil=Math\.max\(target\.stunUntil\|\|0,latch\.until\)/,
  'the per-frame latch must still pin both stuns through latch.until');
assert.match(source, /dealPredatorDamage\(owner,target,owner\.id===player\.id\?580:420,latch\.hyper\?'#ed9cff':'#d8ff68',false\)/,
  'latch claw tick damage must be unchanged');
// Towers: the flag exists and both heal loops skip towers through it.
assert.match(source, /const ARENA_FORGE_TOWERS_HEAL_ENABLED = false;/,
  'the tower-heal kill flag must exist and be false');
const campLoop = source.match(/if \(camp\.arenaForgeCampType === 'repair'\) \{[\s\S]*?\n        \} else if/);
assert.ok(campLoop, 'repair camp branch missing');
assert.match(campLoop[0], /if \(!ARENA_FORGE_TOWERS_HEAL_ENABLED && structure\.isArenaForgeTower\) continue;/,
  'repair camp must skip towers');
assert.match(campLoop[0], /structure\.maxHp \* 0\.16/, 'repair camp must still heal the Core by 16%');
const upgradeLoop = source.match(/if \(type === 'repair'\) \{\s*\n            for \(const structure of getArenaForgeStructures\(team\)\) \{[\s\S]*?\n            \}\n        \} else \{/);
assert.ok(upgradeLoop, 'repair upgrade branch missing');
assert.match(upgradeLoop[0], /if \(!ARENA_FORGE_TOWERS_HEAL_ENABLED && structure\.isArenaForgeTower\) continue;/,
  'repair upgrade must skip towers');
assert.match(upgradeLoop[0], /Math\.max\(1800, Math\.round\(structure\.maxHp \* 0\.18\)\)/, 'repair upgrade must still heal the Core');
// Towers: offense untouched.
assert.match(source, /const ARENA_FORGE_TOWER_DAMAGE = 2000;/, 'tower damage const must be intact');
assert.match(source, /isArenaForgeTowerShell: !!t\.isArenaForgeTower/, 'tower shells must still fire as tower shells');
assert.match(source, /const ARENA_FORGE_TOWER_RANGE = 720;/, 'tower range const must be intact');

// ---------------- behavioral probe (vm harness) ----------------
const CALL = '  loadProgress();\n';
assert.equal(source.split(CALL).length - 1, 1, 'boot loadProgress() call site must exist exactly once');

const probe = `
  globalThis.__probeResult = (function(){
    const out = {};
    try {
      const T0 = 1000000;
      __setTestNow(T0);

      // ===== Predator Hyper latch =====
      bots.length = 0;
      const realPlayerHp = player.hp;
      player.hp = 0; // keep the real player out of targeting for this scenario
      const owner = { id:'pred-owner', brawler:'predator', x:100, y:100, radius:14,
        hp:5000, maxHp:5000, team:'player', level:11, selectedStar:'slow',
        stunUntil:0, slowUntil:0, rootUntil:0, isFlying:false, z:0,
        predatorLongLeapArmed:false, predatorSuperWindup:null, predatorFlight:null, predatorLatch:null };
      const target = { id:'pred-target', brawler:'orbo', x:160, y:100, radius:14,
        hp:9000, maxHp:9000, team:'enemy', stunUntil:0, slowUntil:0, isFlying:false, z:0 };
      bots.push(owner, target);
      // Seed the latch exactly as updatePredatorStates() builds it on a Hyper Super landing.
      const duration = 1500, ticks = 4;
      owner.predatorLatch = { targetId: target.id, until: T0+duration, nextTick: T0,
        tickInterval: (duration-100)/(ticks-1), ticksLeft: ticks, hyper: true };
      owner.stunUntil = T0+duration;
      target.stunUntil = T0+duration;
      const hpBefore = target.hp;

      out.ownerStillStunned = isEntityStunned(owner, T0+100);   // movement lock preserved
      out.canActHyper = predatorHyperLatchCanAct(owner);        // jump allowed
      const ownerBase = { id:'pred-owner-base', stunUntil: T0+duration,
        predatorLatch: { targetId: target.id, until: T0+duration, hyper: false } };
      out.canActBase = predatorHyperLatchCanAct(ownerBase);     // base super: still locked out
      // Mirror of the player main-attack input gate:
      mouse.down = true;
      out.gateHyper = (mouse.down || mobileInput.attackActive) && (!isEntityStunned(owner, T0+100) || predatorHyperLatchCanAct(owner));
      out.gateBase = (mouse.down || mobileInput.attackActive) && (!isEntityStunned(ownerBase, T0+100) || predatorHyperLatchCanAct(ownerBase));
      mouse.down = false;
      // The jump itself: this is what fire() calls for predator's main attack.
      __setTestNow(T0+200);
      performPredatorLeap(owner, target.x, target.y, true, false);
      out.jumpMode = owner.predatorFlight && owner.predatorFlight.mode;
      // Run the full latch window; claw ticks must land and the latch must clear.
      for (let t = T0; t <= T0+duration+400; t += 50) { __setTestNow(t); updatePredatorStates(); }
      out.damageDealt = hpBefore - target.hp;
      out.ticksLeft = owner.predatorLatch ? owner.predatorLatch.ticksLeft : 0;
      out.latchCleared = !owner.predatorLatch;
      out.targetStunnedLate = isEntityStunned(target, T0+1400); // stun holds through the latch
      player.hp = realPlayerHp;

      // ===== Arena Forge towers: damage ok, healing gone =====
      bots.length = 0;
      isArenaForgeMode = true;
      arenaForgeSoulBank.player = 50;
      const tower = { id:'forge-tower-1', x:500, y:500, radius:40, hp:36000, maxHp:72000, team:'player',
        isStructure:true, isArenaForgeStructure:true, isArenaForgeTower:true, arenaForgeTowerType:'mortar' };
      const core = { id:'forge-core-1', x:500, y:1500, radius:50, hp:60000, maxHp:120000, team:'player',
        isStructure:true, isArenaForgeStructure:true, isArenaForgeCore:true };
      bots.push(tower, core);
      out.upgradeBought = purchaseArenaForgeUpgrade('player', 'repair') === true;
      out.towerHpAfterUpgrade = tower.hp;   // must be unchanged: 36000
      out.coreHpAfterUpgrade = core.hp;     // core still heals: 60000 + max(1800, 18% of 120000)
      player.arenaForgeBonusLevel = 20;     // grantArenaForgeXp no-op for the camp reward
      activateArenaForgeCampReward({ x:0, y:0, arenaForgeCampType:'repair', arenaForgeCampLabel:'REPAIR', respawnAt:0 }, 'player');
      out.towerHpAfterCamp = tower.hp;      // must still be 36000
      out.coreHpAfterCamp = core.hp;        // core heals again: +16% of 120000
      isArenaForgeMode = false;
      bots.length = 0;
    } catch (e) { out.error = String((e && e.stack) || e); }
    return out;
  })();
`;
const booted = source.replace(CALL, CALL + probe);

// Sandbox: browser shims copied from power12-load-order-regression.mjs, with a
// controllable clock so the probe can step time through the latch window.
let testNow = 0;
const map = new Map();
const storage = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => { map.set(k, String(v)); },
  removeItem: (k) => { map.delete(k); },
  clear: () => map.clear(),
  key: (i) => [...map.keys()][i] ?? null,
  get length() { return map.size; },
};
const dummy = (() => {
  const fn = function () {};
  const d = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'length') return 0;
      if (p === Symbol.iterator) return [][Symbol.iterator].bind([]);
      return d;
    },
    set() { return true; },
    apply() { return d; },
    construct() { return d; },
  });
  return d;
})();
const styleStub = () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => { t[p] = v; return true; } });
const elCache = new Map();
const el = (id) => {
  if (id && elCache.has(id)) return elCache.get(id);
  const e = {
    style: styleStub(), dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], firstElementChild: null, value: '', textContent: '', innerHTML: '',
    addEventListener() {}, removeEventListener() {}, appendChild(c) { return c; },
    append() {}, prepend() {}, before() {}, after() {}, replaceWith() {}, replaceChildren() {},
    insertAdjacentHTML() {}, insertAdjacentElement() { return el(); },
    removeChild(c) { return c; }, remove() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => el(), querySelectorAll: () => [], getContext: () => dummy,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
    cloneNode: () => el(), insertBefore(c) { return c; }, closest: () => null, focus() {}, click() {},
    width: 300, height: 150,
  };
  if (id) elCache.set(id, e);
  return e;
};
const sandbox = {
  console, JSON, Math, Date, Promise, Set, Map, Array, Object, Number, String, Boolean, RegExp, Error, TypeError, RangeError, SyntaxError, ReferenceError, Intl, URLSearchParams, ArrayBuffer, Uint8Array, Float32Array, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  __setTestNow: (v) => { testNow = v; },
  localStorage: storage,
  document: {
    getElementById: (id) => el(id),
    querySelector: () => el(), querySelectorAll: () => [],
    createElement: () => el(), createElementNS: () => el(),
    addEventListener() {}, removeEventListener() {},
    body: el('body'), head: el('head'), documentElement: el('html'), readyState: 'complete',
    hidden: false, visibilityState: 'visible',
  },
  BrawePassTokens: { normalize() {}, earn() { return true; }, purchase() { return false; }, offers: [] },
  navigator: { userAgent: 'node-test', language: 'en-US' },
  location: { reload() {}, href: 'https://ppp65isking.github.io/brawe/', search: '', hash: '' },
  requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  alert() {}, confirm: () => true, prompt: () => null,
  Image: class { constructor() { this.style = {}; } },
  Audio: class { constructor() { this.style = {}; } play() { return Promise.resolve(); } pause() {} },
  Blob: class {}, FileReader: class {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({}),
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  addEventListener() {}, removeEventListener() {},
  performance: { now: () => testNow },
  fetch: () => Promise.reject(new Error('no net in test')),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
try { vm.runInContext(booted, ctx, { filename: 'game.js' }); } catch { /* later DOM wiring is stub-limited; the probe is what matters */ }

assert.ok(ctx.__probeResult, 'the behavioral probe must run');
const r = ctx.__probeResult;
assert.ok(!r.error, `probe must not throw (got: ${r.error})`);

// Predator: Hyper latch keeps stun + damage, unlocks the jump, base latch unchanged.
assert.equal(r.ownerStillStunned, true, 'owner must stay stunned through the Hyper latch (movement stays glued)');
assert.equal(r.canActHyper, true, 'predatorHyperLatchCanAct must allow acting in a Hyper latch');
assert.equal(r.canActBase, false, 'base (non-Hyper) latch must NOT allow acting');
assert.ok(r.gateHyper, 'the player attack gate must open for a Hyper-latched Predator');
assert.equal(r.gateBase, false, 'the player attack gate must stay closed for a base-latched Predator');
assert.equal(r.jumpMode, 'main', 'Predator must be able to start a main-attack leap mid-Hyper-latch');
assert.ok(r.damageDealt > 0, `latch claw ticks must still damage the target (dealt ${r.damageDealt})`);
assert.equal(r.ticksLeft, 0, 'all latch claw ticks must fire');
assert.equal(r.latchCleared, true, 'the latch must clear when its window ends');
assert.equal(r.targetStunnedLate, true, 'the target must stay stunned through the latch');

// Towers: repair sources run (Core heals) but towers take zero healing.
assert.equal(r.upgradeBought, true, 'the repair upgrade purchase must succeed');
assert.equal(r.towerHpAfterUpgrade, 36000, 'repair upgrade must NOT heal towers');
assert.equal(r.coreHpAfterUpgrade, 60000 + Math.max(1800, Math.round(120000 * 0.18)), 'repair upgrade must still heal the Core');
assert.equal(r.towerHpAfterCamp, 36000, 'repair camp must NOT heal towers');
assert.equal(r.coreHpAfterCamp, 60000 + Math.max(1800, Math.round(120000 * 0.18)) + Math.round(120000 * 0.16), 'repair camp must still heal the Core');

console.log('predator-hyper-super + arena-forge-tower-heal regression: all checks passed');
