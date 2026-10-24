// Electrostien regression — new Mythic Assassin (Anthony's design, 2026-10-23).
// Behavioral checks in the vm harness + static pins for registration and the
// release rulings: Boltz Chain tiers/break/expiry, Electric Realm isolation +
// timers, Overvolt Roar + ICD + mini-chain, Discharge math, SP1 slow, SP2
// charge rate, FREE unlock, Power 11 start, Family Circuit win-gating,
// kill switches. Harness pattern follows tests/spikey-regression.mjs.
import fs from 'fs';
import vm from 'vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- static pins ----------
check('roster includes electrostien', /'feathers', 'spikey', 'electrostien'/.test(game));
check('rarity Mythic', /electrostien: 'Mythic'/.test(game));
check('role Assassin', /electrostien:'Assassin'/.test(game));
check('super charge 14 ticks', /spikey:6, electrostien:14/.test(game));
check('reload 1100ms', /electrostien: 1100/.test(game));
check('kill switches declared', /let ELECTROSTIEN_ENABLED = true/.test(game) && /let ELECTRIC_REALM_ENABLED = true/.test(game));
check('signature def present', /electrostien: \{\s*\n\s*type: 'signature',\s*\n\s*name: 'Family Circuit'/.test(game));
check('Core Piece buy guard', /fighterId === 'electrostien'\) \{ alert\('Family Circuit Pieces are EARNED/.test(game));
check('Daily Deals exclusion', /fid === 'electrostien'\) continue/.test(game));
check('free unlock lines', (game.match(/unlockedBrawlers\.electrostien = true/g) || []).length >= 3);
check('win counter persisted', /electrostienSignatureWins: playerData\.electrostienSignatureWins/.test(game));
check('realm guard in checkHit', /areRealmSeparated\(realmOwner, target\)\) return false/.test(game));
check('systems wired', /updateElectrostienSystems\(dt\)/.test(game) && /renderElectrostienEffects\(\)/.test(game));
check('win hook wired', /completedMatchFighter === 'electrostien'\) grantElectrostienSignatureWin\(\)/.test(game));
check('gadgets routed (player + bot)', (game.match(/executeElectrostienG2/g) || []).length >= 3 && (game.match(/executeElectrostienG1/g) || []).length >= 3);
check('bot AI wired', /bot\.brawler === 'electrostien'\) return distance < ELECTROSTIEN_SUPER_THROW_RANGE/.test(game) && /bot\.brawler === 'electrostien' && distance > 175/.test(game));

// ---------- vm harness (pattern from tests/spikey-regression.mjs) ----------
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
// Seed: player has picked Electrostien but does NOT own him in the save and has
// no progress entry — the free-release code must grant both at load.
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, souls: 500, selectedBrawler: 'electrostien', unlockedBrawlers: { rocketeer: true }, brawlerProgress: {} } }));
vm.createContext(sandbox);
vm.runInContext(game, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
check('test API exposed', !!api);
const pd = api.playerData;

// --- release rulings on a save that never owned him ---
check('FREE unlock granted at load', !!(pd.unlockedBrawlers || {}).electrostien);
check('no soul deduction for the free release', (pd.souls || 0) === 500);
const esProg = (pd.brawlers || {}).electrostien;
check('Power 11 start', !!esProg && esProg.level === 11 && esProg.gadgetUnlocked === true && esProg.starPowerUnlocked === true && esProg.hyperchargeUnlocked === true);
check('Family Circuit locked at boot', api.getElectrostienSignatureWins() === 0);

// --- launch as Electrostien ---
api.launchShowdownMatch(1, 1);
api.playing = true;
api.bots.length = 2; // quiet lobby: one victim + one outsider
const me = api.player;
const bot = api.bots[0];
const outsider = api.bots[1];
check('player spawns as Electrostien at 8200 HP (P11)', me.brawler === 'electrostien' && me.maxHp === 8200);
check('kill switches default on', api.ELECTROSTIEN_ENABLED === true && api.ELECTRIC_REALM_ENABLED === true);

function pin(e, x, y) { e._x = x; e._y = y; e.x = x; e.y = y; e.stunUntil = Date.now() + 60000; e.shield = 0; e.powerCubes = 0; e.equippedTrinkets = []; e.ownedTrinkets = []; e.trinketFirstStrikeReady = false; }
function frames(n) { for (let k = 0; k < n; k++) { for (const e of [me, bot, outsider]) { if (e && e._x !== undefined) { e.x = e._x; e.y = e._y; e.stunUntil = Date.now() + 60000; } } api.update(1 / 60); } }
pin(me, 1000, 1000); me.hp = me.maxHp;
pin(bot, 1100, 1000); bot.hp = 30000; bot.maxHp = 30000;
pin(outsider, 3000, 3000); outsider.hp = 20000; outsider.maxHp = 20000;

// --- chain tier damage (helper) ---
check('tier damage @100px = 300', api.getElectrostienChainTierDamage(me, bot) === 300);
bot._x = 1200; bot.x = 1200;
check('tier damage @200px = 120', api.getElectrostienChainTierDamage(me, bot) === 120);
bot._x = 1300; bot.x = 1300;
check('tier damage @300px = 30', api.getElectrostienChainTierDamage(me, bot) === 30);
bot._x = 1400; bot.x = 1400;
check('tier damage @400px = 0 (beyond tether)', api.getElectrostienChainTierDamage(me, bot) === 0);
bot._x = 1100; bot.x = 1100;

// --- SP2 Second Battery (bot Electrostien owns the chain; ticks charge HIS super) ---
bot.brawler = 'electrostien'; bot.superCharge = 0;
bot.selectedStar = 'sp2';
check('bot chain sticks', api.stickElectrostienChain(bot, me) === true);
await sleep(300); frames(2);
const sp2Gain = bot.superCharge;
api.breakElectrostienChain(bot);
bot.selectedStar = 'none'; bot.superCharge = 0;
api.stickElectrostienChain(bot, me);
await sleep(300); frames(2);
const plainGain = bot.superCharge;
api.breakElectrostienChain(bot);
bot.brawler = 'duck';
check('chain tick charges super', plainGain > 0);
check('SP2 charges ~25% faster', sp2Gain > plainGain && Math.abs(sp2Gain / Math.max(0.001, plainGain) - 1.25) < 0.06);
me.hp = me.maxHp;

// --- SP1 Conductive Grip (bot Electrostien with sp1 chains the player) ---
bot.brawler = 'electrostien'; bot.selectedStar = 'sp1';
api.stickElectrostienChain(bot, me);
await sleep(300); frames(2);
const slowMult = api.getEntitySlowMultiplier(me, Date.now());
check('SP1 slows chained target 20%', slowMult <= 0.8 && slowMult > 0.5);
api.breakElectrostienChain(bot);
me.electrostienChainedSlowUntil = 0;
bot.brawler = 'duck'; bot.selectedStar = 'none';
me.hp = me.maxHp;

// --- behavioral chain tick: 300 at tier 1, damage tracked ---
check('player chain sticks', api.stickElectrostienChain(me, bot) === true);
const hpTick0 = bot.hp;
await sleep(300); frames(2);
check('chain tick deals exactly 300 at tier 1', bot.hp === hpTick0 - 300);
check('chain damage tracked for Discharge', (me.electrostienChainDamageDealt || 0) === 300);

// --- chain breaks beyond 4.5 tiles ---
bot._x = 1500; bot.x = 1500;
await sleep(280); frames(2);
check('chain breaks past 4.5 tiles', !me.electrostienChainTargetId);
bot._x = 1100; bot.x = 1100;

// --- Discharge math: 50% of dealt, min 600, 0.5s stun, chain ends ---
api.stickElectrostienChain(me, bot);
me.electrostienChainDamageDealt = 2000;
bot.stunUntil = 0;
const hpDis0 = bot.hp;
check('discharge fires', api.executeElectrostienDischarge(me) === true);
check('discharge deals 50% (1000)', bot.hp === hpDis0 - 1000);
check('discharge ends the chain', !me.electrostienChainTargetId);
check('discharge stuns ~0.5s', (bot.stunUntil || 0) > Date.now() + 300);
pin(bot, 1100, 1000); // re-pin after the deliberate stun reset
api.stickElectrostienChain(me, bot);
me.electrostienChainDamageDealt = 400; // 50% = 200 -> floor
const hpDis1 = bot.hp;
api.executeElectrostienDischarge(me);
check('discharge floor is 600', bot.hp === hpDis1 - 600);

// --- Static Dash: dash + empower window ---
me._x = 1000; me.x = 1000;
api.executeElectrostienG1(me);
check('dash empowers the next punch', (me.electrostienDashEmpoweredUntil || 0) > Date.now());
me._x = 1000; me.x = 1000; // undo the dash displacement for later math

// --- Electric Realm: isolation ---
check('realm opens', api.enterElectricRealm(me, bot, false) === true);
check('both fighters phased together', (me.electricRealmId || 0) > 0 && bot.electricRealmId === me.electricRealmId);
check('realm chain attached', me.electrostienChainTargetId === bot.id);
check('pair not separated from each other', api.areRealmSeparated(me, bot) === false);
check('separated from outsider', api.areRealmSeparated(me, outsider) === true);
const outHp0 = outsider.hp;
check('realm fighter cannot damage outsider', api.checkHit(outsider, { ownerBrawler: 'electrostien', ownerId: me.id, damage: 500, hitIds: {} }, -1) === false && outsider.hp === outHp0);
const meHp0 = me.hp;
check('outsider cannot damage realm fighter', api.checkHit(me, { ownerBrawler: 'duck', ownerId: outsider.id, damage: 500, hitIds: {} }, -1) === false && me.hp === meHp0);
api.AOEDamage(me.x, me.y, 220, 700, outsider.id, false);
check('outsider AoE cannot reach into the realm', me.hp === meHp0);
const inHp0 = bot.hp;
const inHit = api.checkHit(bot, { ownerBrawler: 'electrostien', ownerId: me.id, damage: 250, hitIds: {} }, -1);
check('realm pair CAN hit each other', inHit !== false && bot.hp === inHp0 - 250);

// --- realm chain holds max tier at range ---
bot._x = 1350; bot.x = 1350; // 350px apart, still inside
const realmHp0 = bot.hp;
await sleep(300); frames(2);
check('realm chain ticks max tier (300) at 350px', bot.hp === realmHp0 - 300);
bot._x = 1100; bot.x = 1100;

// --- realm 5s timer ---
await sleep(5000); frames(2);
check('realm ends after 5s', (me.electricRealmId || 0) === 0 && (bot.electricRealmId || 0) === 0 && api.electricRealms.length === 0);

// --- realm early exit on death (the outsider is the sacrificial victim) ---
pin(outsider, 1100, 1000);
api.enterElectricRealm(me, outsider, false);
check('realm opens on the outsider', (me.electricRealmId || 0) > 0 && outsider.electricRealmId === me.electricRealmId);
outsider.hp = 0; // death must collapse the realm on the next systems pass
frames(3);
check('realm ends early when a fighter dies', (me.electricRealmId || 0) === 0 && api.electricRealms.length === 0);

// --- Overvolt Roar (bot Electrostien, hyper): 400 dmg, mini-chain, ICD ---
bot.brawler = 'electrostien';
bot._x = 1150; bot.x = 1150; // 150px from the player
bot.isHypercharged = true; bot.hyperchargeUntil = Date.now() + 10000;
bot.powerCubes = 0; // cubes grant +10% damage each; the bot may have looted the outsider's drop
me.hp = me.maxHp;
const roarHp0 = me.hp;
check('roar triggers while hyper', api.triggerElectrostienRoar(bot) === true);
check('roar deals 400 to nearby enemies', me.hp === roarHp0 - 400);
check('roar applies a mini-chain', (me.electrostienMiniChainUntil || 0) > Date.now());
check('roar blocked by 2.5s ICD', api.triggerElectrostienRoar(bot) === false && me.hp === roarHp0 - 400);
const miniHp0 = me.hp;
await sleep(300); frames(2);
check('mini-chain ticks 100', me.hp === miniHp0 - 100);
bot.isHypercharged = false; bot.hyperchargeUntil = 0; bot.electrostienRoarReadyAt = 0;
check('roar requires hypercharge', api.triggerElectrostienRoar(bot) === false);
me.electrostienMiniChainUntil = 0;
bot.brawler = 'duck'; bot._x = 1100; bot.x = 1100;
me.hp = me.maxHp;

// --- chain 4s expiry ---
api.stickElectrostienChain(me, bot);
check('chain re-stuck for expiry test', !!me.electrostienChainTargetId);
await sleep(4300); frames(2);
check('chain expires after 4s', !me.electrostienChainTargetId);
bot.hp = 30000;

// --- Family Circuit: locked -> 3 wins -> armed echo strikes ---
check('signature locked before wins', api.getElectrostienSignatureState(me).ready === false);
api.grantElectrostienSignatureWin();
api.grantElectrostienSignatureWin();
check('still locked at 2 wins', api.getElectrostienSignatureWins() === 2 && api.getElectrostienSignatureState(me).ready === false);
api.grantElectrostienSignatureWin();
check('unlocked at 3 wins', api.getElectrostienSignatureWins() === 3 && api.getElectrostienSignatureState(me).ready === true);
check('signature pieces granted by wins', (pd.specialAbilities.signature.electrostien || {}).unlocked === true && (pd.specialAbilities.signature.electrostien || {}).pieces === 3);
// control run: realm + punch, NO circuit -> punch 700 + one chain tick 300
pin(bot, 1100, 1000); bot.hp = 30000;
api.enterElectricRealm(me, bot, false);
const ctrlHp0 = bot.hp;
api.fire(me, bot.x, bot.y, false);
frames(8);
await sleep(420); frames(3);
const ctrlDrop = ctrlHp0 - bot.hp;
api.exitElectricRealm(me);
// armed run: same sequence with the circuit armed
check('signature arm activates', api.activateSignatureAbility(me) === true);
pin(bot, 1100, 1000); bot.hp = 30000;
api.enterElectricRealm(me, bot, false);
const armHp0 = bot.hp;
api.fire(me, bot.x, bot.y, false);
frames(8);
await sleep(420); frames(3);
const armDrop = armHp0 - bot.hp;
check('control run = punch + one realm tick (1000)', ctrlDrop === 1000);
check('family strike echoes the punch (+500)', armDrop - ctrlDrop === 500);
api.exitElectricRealm(me);
check('arm consumed when the realm ends', !me.electrostienFamilyCircuitArmed);

// --- Storm Realm (Hyper Super): victim slowed 30%, chain x1.5 ---
pin(bot, 1100, 1000); bot.hp = 30000;
api.enterElectricRealm(me, bot, true);
await sleep(300); frames(2);
const stormSlow = api.getEntitySlowMultiplier(bot, Date.now());
check('storm realm slows victim 30%', stormSlow <= 0.7 && stormSlow > 0.4);
const stormHp0 = bot.hp;
await sleep(300); frames(2);
check('storm chain ticks 450 (x1.5)', bot.hp <= stormHp0 - 450 && bot.hp >= stormHp0 - 1000);
api.exitElectricRealm(me);
bot.electrostienRealmSlowUntil = 0;

// --- kill switches ---
api.setElectrostienKillSwitches(true, false);
check('realm switch off blocks enterElectricRealm', api.enterElectricRealm(me, bot, false) === false);
api.castElectrostienSuper(me, false, bot.x, bot.y);
const shock = api.bullets[api.bullets.length - 1];
check('fallback shock when realm disabled', !!shock && !!shock.isElectrostienShock && shock.electrostienRealmMode === false && shock.damage === 1200);
api.setElectrostienKillSwitches(false, true);
check('master switch blocks chain stick', api.stickElectrostienChain(me, bot) === false);
api.setElectrostienKillSwitches(true, true);
check('switches restored', api.ELECTROSTIEN_ENABLED === true && api.ELECTRIC_REALM_ENABLED === true);

// --- visuals hotfix (PR #44 crash): renderElectrostienEffects must run with
// a live punch telegraph + armed signature, on and off. The old code called
// isWorldVisualVisible() here, but that helper is local to render(), so the
// first punch threw ReferenceError and paused the match.
api.ELECTROSTIEN_VISUALS_ENABLED = true;
api.electrostienPunchTelegraphs.push({ x: me.x, y: me.y, ang: 0, range: 120, hyper: false, empowered: false, until: Date.now() + 60000 });
me.electrostienFamilyCircuitArmed = true;
let renderThrew = null;
try { api.renderElectrostienEffects(); } catch (e) { renderThrew = e; }
check('renderElectrostienEffects runs with telegraph + armed (no ReferenceError)', renderThrew === null);
api.ELECTROSTIEN_VISUALS_ENABLED = false;
let renderOffThrew = null;
try { api.renderElectrostienEffects(); } catch (e) { renderOffThrew = e; }
check('renderElectrostienEffects runs with visuals switch off', renderOffThrew === null);
api.ELECTROSTIEN_VISUALS_ENABLED = true;
me.electrostienFamilyCircuitArmed = false;
api.electrostienPunchTelegraphs.length = 0;

console.log(`electrostien-regression: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failed ? 1 : 0); // the game's intervals would otherwise hold the event loop open
