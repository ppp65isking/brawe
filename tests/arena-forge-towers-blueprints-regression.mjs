import fs from 'node:fs';
import vm from 'node:vm';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
function assert(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else { failures += 1; console.log(`FAIL ${message}`); }
}

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---------------------------------------------------------------- static pins
for (const id of ['glass_cannon', 'thornmail', 'adrenal_surge', 'energy_vampire', 'mine_layer', 'second_wind', 'siege_plating', 'bounty_boots']) {
  assert(source.includes(`id: '${id}'`), `blueprint pool includes ${id}`);
}
const poolBlock = source.slice(source.indexOf('const ARENA_FORGE_BLUEPRINTS'), source.indexOf('];', source.indexOf('const ARENA_FORGE_BLUEPRINTS')));
assert((poolBlock.match(/\{ id: '/g) || []).length === 41, 'blueprint pool has 41 entries (33 old + 8 new)');
assert(source.includes('if (e.isArenaForgeStructure) continue;'), 'idle regen loop skips Arena Forge structures');
assert(source.includes('if(entity.isArenaForgeTower) return;'), 'doHeal hard-blocks tower healing');
assert((source.match(/if \(structure\.isArenaForgeTower\) continue;/g) || []).length === 2, 'both fortify paths exclude towers');
assert(source.includes('target?.arenaForgeSiegePlating && isNearAlliedArenaForgeStructure(target)') && source.includes('dealtDamage *= 0.75'), 'siege plating reduction wired in checkHit');
assert(source.includes('activeSpeed *= 1.25') && source.includes('activeBotSpeed *= 1.25'), 'adrenal speed consumed by player + bot movement');
assert(source.includes('currentReloadTime *= 0.70') && source.includes('cadence *= 0.70'), 'adrenal reload consumed by player reload + bot cadence');
assert(source.includes('player.arenaForgeSecondWind ? 0.6 : 1') && source.includes('b.arenaForgeSecondWind ? 0.6 : 1'), 'second wind scales both respawn sites');
assert(source.includes('grantShield(player, 2000, 2000)') && source.includes('grantShield(b, 2000, 2000)'), 'second wind grants its 2000 shield at both respawn sites');
assert(source.includes('arenaForgeMines.push({ x: entity.x'), 'mine layer drops mines in the blueprint tick');
assert(source.includes('collector.arenaForgeEnergyVampire') && source.includes('grantShield(collector, 600 * pickup.value, 5000)'), 'energy vampire hook on pickups');
assert(source.includes('collector.arenaForgeBountyBoots') && source.includes('arenaForgeBountySpeedUntil'), 'bounty boots hook on pickups');
assert(source.includes("blueprintId === 'glass_cannon'") && source.includes('arenaForgeBlueprintDamageMult *= 1.30') && source.includes('arenaForgeBlueprintHpMult *= 0.85'), 'glass cannon apply branch');
assert(source.includes('target?.arenaForgeThornmail') && source.includes('dealtDamage * 0.15'), 'thornmail reflect hook');
assert(source.includes('killer.arenaForgeAdrenalSurge') && source.includes('arenaForgeAdrenalUntil = performance.now() + 4000'), 'adrenal grant on takedown');

// ---------------------------------------------------------------- vm harness
const storage = new Map();
const save = {
  coins: 999999, gems: 9999, souls: 9999, bricks: 999999,
  selectedBrawler: 'spikey',
  unlockedBrawlers: { spikey: true },
  brawlerLevels: { spikey: 11 },
  brawlerPower: { spikey: 11 },
  brawlerTrophies: { spikey: 0 },
  upgrades: { spikey: { gadget: true, starPower: true, hypercharge: true } },
  selectedGadget: { spikey: 0 },
  selectedStar: { spikey: 'sp1' },
  corePieces: 9999,
};
storage.set('brawl_arena_save', JSON.stringify(save));
storage.set('arenaForgeHelpHiddenV1', '1'); // suppress the first-run help panel so updateArenaForgeMode runs

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
  console, Math, JSON, Object, Array, Map, Set, Date, Promise, Error, RegExp, Number, String, Boolean,
  Intl, URL, Uint8Array, Float32Array, Symbol, Reflect, Proxy,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  },
  document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 },
  location: { href: 'http://localhost/', search: '', reload() {} },
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
  alert() {}, Image: class { constructor() { this.complete = true; } },
  Audio: class { constructor() { this.paused = true; } play() { return Promise.resolve(); } pause() {} },
  URLSearchParams,
  getComputedStyle: () => ({}),
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
assert(!!api, 'game exposes __pureHTMLGame');
for (const key of ['ARENA_FORGE_BLUEPRINTS', 'applyArenaForgeBlueprint', 'purchaseArenaForgeUpgrade', 'applyArenaForgeFreeUpgrade', 'getArenaForgeStructures', 'getArenaForgeCore', 'activateArenaForgeCampReward', 'spawnArenaForgeEnergy', 'updateArenaForgeBlueprintCombatantEffects', 'handleArenaForgeCombatHit', 'getArenaForgeRespawnSeconds', 'checkHit', 'doHeal', 'arenaForgeMines', 'arenaForgeSoulBank']) {
  assert(api[key] !== undefined, `test export present: ${key}`);
}
assert(api.ARENA_FORGE_BLUEPRINTS.length === 41, 'runtime blueprint pool has 41 entries');

// ---------------------------------------------------------------- launch match
api.showdownMode = 'arena_forge';
api.launchShowdownMatch(1, 1);
api.playing = true;
assert(api.isArenaForgeMode === true, 'arena forge mode active after launch');

const fighters = () => api.bots.filter((b) => b && !b.isStructure && !b.isArenaForgeMinion && !b.isArenaForgeCamp && !b.isPet && !b.isDummy);
const allies = () => fighters().filter((b) => b.team === 'player');
const enemies = () => fighters().filter((b) => b.team === 'enemy');
assert(allies().length >= 2 && enemies().length >= 3, `fighter rosters present (allies ${allies().length}, enemies ${enemies().length})`);

const playerTowers = () => api.getArenaForgeStructures('player', 'tower');
assert(playerTowers().length >= 1, 'player towers exist');
assert(!!api.getArenaForgeCore('player'), 'player core exists');

function hitLoss(attacker, target, damage) {
  // Fixed bullet brawler: decouples the measurement from the bot's randomly
  // assigned kit (some kits mark/empower follow-up hits and skew ratios).
  const before = target.hp;
  api.checkHit(target, { damage, ownerBrawler: 'rocketeer', ownerId: attacker.id, pierce: true }, -1);
  return before - target.hp;
}

// ---------------------------------------------------------------- glass cannon
{
  const atk = enemies()[0];
  // Fresh target per hit: a first hit can leave marks/states that skew a second.
  const tgtA = allies()[0];
  const tgtB = allies()[1];
  for (const tgt of [tgtA, tgtB]) { tgt.maxHp = 30000; tgt.hp = 30000; tgt.shield = 0; tgt.invulnerableUntil = 0; }
  const lossA = hitLoss(atk, tgtA, 2000);
  assert(lossA > 0, `glass cannon baseline hit lands (${lossA})`);
  atk.hp = atk.maxHp;
  const baseMax = atk.arenaForgeBaseMaxHp;
  assert(api.applyArenaForgeBlueprint(atk, 'glass_cannon') === true, 'glass cannon applies');
  assert(Math.abs(atk.arenaForgeBlueprintDamageMult - 1.3) < 0.001, 'glass cannon damage mult is 1.30');
  const expectedMax = Math.round(baseMax * 0.85) + (atk.arenaForgeEnergyHpBonus || 0);
  assert(Math.abs(atk.maxHp - expectedMax) <= 1, `glass cannon max HP cut ~15% (${atk.maxHp} vs ${expectedMax})`);
  assert(atk.hp <= atk.maxHp, 'glass cannon clamps current HP to the new max');
  const lossB = hitLoss(atk, tgtB, 2000);
  const ratio = lossB / lossA;
  assert(ratio > 1.24 && ratio < 1.36, `glass cannon hit deals ~30% more (${lossA} -> ${lossB})`);
  tgtA.hp = tgtA.maxHp; tgtB.hp = tgtB.maxHp;
}

// ---------------------------------------------------------------- thornmail
{
  const def = allies()[1];
  const atk = enemies()[1];
  assert(api.applyArenaForgeBlueprint(def, 'thornmail') === true, 'thornmail applies');
  atk.hp = atk.maxHp;
  const a0 = atk.hp;
  api.handleArenaForgeCombatHit(atk, def, 2000, 2000, null);
  assert(atk.hp === a0 - 300, `thornmail reflects exactly 15% (${a0} -> ${atk.hp})`);
  const player = api.player;
  player.arenaForgeThornmail = false;
  api.handleArenaForgeCombatHit(atk, player, 2000, 2000, null);
  assert(atk.hp === a0 - 300, 'no reflect against a target without thornmail');
  atk.hp = atk.maxHp;
}

// ---------------------------------------------------------------- adrenal surge
{
  const killer = allies()[0];
  const victim = enemies()[2];
  assert(api.applyArenaForgeBlueprint(killer, 'adrenal_surge') === true, 'adrenal surge applies');
  killer.arenaForgeAdrenalUntil = 0;
  victim.lastDamagerId = killer.id;
  victim.hp = 0;
  api.update(1 / 60); // death-processing pass credits the killer
  assert((killer.arenaForgeAdrenalUntil || 0) > Date.now(), 'takedown grants adrenal surge window');
  assert((killer.arenaForgeAdrenalUntil || 0) <= Date.now() + 4500, 'adrenal surge window is ~4s');
  victim.hp = victim.maxHp;
}

// ---------------------------------------------------------------- mine layer
{
  const owner = enemies()[0];
  const victim = allies()[1];
  assert(api.applyArenaForgeBlueprint(owner, 'mine_layer') === true, 'mine layer applies');
  const t0 = Date.now();
  api.updateArenaForgeBlueprintCombatantEffects(0.016, t0 + 7000);
  const mine = api.arenaForgeMines.find((m) => m.ownerId === owner.id);
  assert(!!mine, 'mine layer drops a mine after 6s');
  if (mine) {
    victim.maxHp = Math.max(victim.maxHp, 20000); victim.hp = 20000; victim.shield = 0;
    victim.x = mine.x; victim.y = mine.y;
    const hpBefore = victim.hp;
    api.updateArenaForgeBlueprintCombatantEffects(0.016, t0 + 8100);
    assert(victim.hp === hpBefore - 900, `armed mine detonates for exactly 900 (${hpBefore} -> ${victim.hp})`);
    assert(!api.arenaForgeMines.some((m) => m.ownerId === owner.id), 'detonated mine is consumed');
    victim.hp = victim.maxHp;
  }
}

// ---------------------------------------------------------------- siege plating
{
  const atk = enemies()[0];
  // Fresh defender per hit (same reasoning as glass cannon); both wear the
  // plating, only the position changes.
  const defFar = allies()[0];
  const defNear = allies()[1];
  for (const def of [defFar, defNear]) {
    assert(api.applyArenaForgeBlueprint(def, 'siege_plating') === true, 'siege plating applies');
    def.maxHp = 40000; def.hp = 40000; def.shield = 0; def.invulnerableUntil = 0;
  }
  defFar.x = 2000; defFar.y = 2000;
  const lossFar = hitLoss(atk, defFar, 4000);
  assert(lossFar > 0, `siege baseline hit lands (${lossFar})`);
  const tower = playerTowers()[0];
  defNear.x = tower.x + 120; defNear.y = tower.y;
  const lossNear = hitLoss(atk, defNear, 4000);
  const ratio = lossNear / lossFar;
  assert(ratio > 0.69 && ratio < 0.81, `siege plating cuts damage ~25% near an allied tower (${lossFar} -> ${lossNear})`);
  defFar.hp = defFar.maxHp; defNear.hp = defNear.maxHp;
}

// ---------------------------------------------------------------- wait out prep
{
  const deadline = Date.now() + 4200;
  while (Date.now() < deadline) { api.update(1 / 60); await sleep(60); }
}

function isolateOthers(collector) {
  for (const e of [api.player, ...fighters()]) {
    if (!e || e.id === collector.id) continue;
    e.x = collector.x <= 2000 ? 3800 : 200;
    e.y = collector.y <= 2000 ? 3800 : 200;
  }
}
async function collectSpawnedPickup(bot, ms = 2000) {
  // Success = no energy pickup remains near the bot (ambient pickups elsewhere
  // on the map must not count). If the bot wanders off its pickup, walk it back.
  const nearPickup = () => api.arenaForgeSouls.some((s) => Math.hypot(s.x - bot.x, s.y - bot.y) <= 80);
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    api.update(1 / 60);
    if (!nearPickup()) return true;
    const soul = api.arenaForgeSouls.find((s) => Math.hypot(s.x - bot.x, s.y - bot.y) <= 400);
    if (soul) { bot.x = soul.x; bot.y = soul.y; }
    await sleep(25);
  }
  return !nearPickup();
}

// ---------------------------------------------------------------- energy vampire
{
  const bot = allies()[0];
  assert(api.applyArenaForgeBlueprint(bot, 'energy_vampire') === true, 'energy vampire applies');
  isolateOthers(bot);
  bot.hp = bot.maxHp; bot.invulnerableUntil = Date.now() + 3000;
  const shield0 = bot.shield || 0;
  const bank0 = api.arenaForgeSoulBank.player;
  api.spawnArenaForgeEnergy(bot.x, bot.y, 1);
  const collected = await collectSpawnedPickup(bot);
  assert(collected && api.arenaForgeSoulBank.player >= bank0 + 1, 'energy pickup collected by the vampire bot');
  assert((bot.shield || 0) >= shield0 + 600, `energy vampire grants its 600 shield (${shield0} -> ${bot.shield || 0})`);
}

// ---------------------------------------------------------------- bounty boots
{
  const bot = allies()[1];
  assert(api.applyArenaForgeBlueprint(bot, 'bounty_boots') === true, 'bounty boots applies');
  bot.arenaForgeBountyEnergyCount = 0;
  const super0 = bot.superCharge || 0;
  let allCollected = true;
  for (let i = 0; i < 5; i++) {
    isolateOthers(bot);
    bot.hp = bot.maxHp; bot.invulnerableUntil = Date.now() + 3000;
    api.spawnArenaForgeEnergy(bot.x, bot.y, 1);
    if (!(await collectSpawnedPickup(bot))) allCollected = false;
  }
  assert(allCollected, 'bounty bot collected all 5 energy');
  assert((bot.arenaForgeBountySpeedUntil || 0) > Date.now(), 'bounty boots speed burst triggered at 5 energy');
  assert((bot.superCharge || 0) >= super0 + 25, `bounty boots granted +25 super (${super0} -> ${bot.superCharge || 0})`);
  assert(bot.arenaForgeBountyEnergyCount === 0, 'bounty counter wrapped back to 0 after the burst');
}

// ---------------------------------------------------------------- second wind
{
  const swBot = enemies()[1];
  const ctrlBot = allies()[0];
  assert(api.applyArenaForgeBlueprint(swBot, 'second_wind') === true, 'second wind applies');
  ctrlBot.arenaForgeSecondWind = false;
  const baseEnemy = api.getArenaForgeRespawnSeconds('enemy');
  const basePlayer = api.getArenaForgeRespawnSeconds('player');
  // Normalize both bots to a clean, just-killed state: ambient combat may have
  // killed one already and left its respawn timer half-finished.
  for (const b of [swBot, ctrlBot]) { b.hp = b.maxHp; b.respawnTimer = 0; }
  swBot.x = 3800; swBot.y = 200;
  ctrlBot.x = 200; ctrlBot.y = 3800;
  swBot.hp = 0; ctrlBot.hp = 0;
  swBot.respawnTimer = 0; ctrlBot.respawnTimer = 0;
  let swSteps = -1; let ctrlSteps = -1;
  for (let step = 1; step <= 60; step++) {
    api.update(0.25);
    if (swSteps < 0 && swBot.hp > 0) swSteps = step;
    if (ctrlSteps < 0 && ctrlBot.hp > 0) ctrlSteps = step;
    if (swSteps > 0 && ctrlSteps > 0) break;
  }
  assert(swSteps > 0 && ctrlSteps > 0, `both bots respawned (sw ${swSteps}, ctrl ${ctrlSteps} steps of 0.25s)`);
  const swExpected = Math.round((0.6 * baseEnemy) / 0.25);
  const ctrlExpected = Math.round(basePlayer / 0.25);
  assert(Math.abs(swSteps - swExpected) <= 2, `second wind respawn ~40% faster (${swSteps} vs expected ~${swExpected})`);
  assert(Math.abs(ctrlSteps - ctrlExpected) <= 2, `control respawn at full delay (${ctrlSteps} vs expected ~${ctrlExpected})`);
  assert((swBot.shield || 0) >= 1999, `second wind respawn shield is 2000 (${swBot.shield || 0})`);
  assert((ctrlBot.shield || 0) < 1999, 'control bot respawns without the second wind shield');
}

// ---------------------------------------------------------------- towers: purchases + camp
{
  const tower = playerTowers()[0];
  const core = api.getArenaForgeCore('player');
  api.arenaForgeSoulBank.player = 100000;

  // paid repair: tower frozen, core still repaired (PR #34 behavior)
  tower.hp = Math.round(tower.maxHp * 0.5);
  core.hp = Math.round(core.maxHp * 0.5);
  const tHp = tower.hp; const tMax = tower.maxHp; const cHp = core.hp;
  assert(api.purchaseArenaForgeUpgrade('player', 'repair') === true, 'repair purchase succeeds');
  assert(tower.hp === tHp && tower.maxHp === tMax, 'paid repair does not touch the tower');
  assert(core.hp > cHp, 'paid repair still repairs the core');

  // repair camp: tower frozen, core + allies still healed.
  // Camps only open at 45s of match time — fast-forward game time until they spawn.
  for (let step = 0; step < 240 && api.arenaForgeCamps.length === 0; step++) api.update(0.5);
  assert(api.arenaForgeCamps.length === 3, 'side camps opened');
  const tower2 = playerTowers()[1] || tower;
  tower2.hp = Math.round(tower2.maxHp * 0.5);
  core.hp = Math.round(core.maxHp * 0.5);
  const ally = allies()[0];
  ally.hp = 1000;
  let camp = api.arenaForgeCamps.find((c) => c.arenaForgeCampType === 'repair');
  let flipped = null;
  if (!camp) { camp = api.arenaForgeCamps[0]; flipped = camp.arenaForgeCampType; camp.arenaForgeCampType = 'repair'; }
  assert(!!camp, 'a camp exists for the repair-camp check');
  const t2Hp = tower2.hp; const t2Max = tower2.maxHp; const cHp2 = core.hp;
  api.activateArenaForgeCampReward(camp, 'player', Date.now());
  if (flipped) camp.arenaForgeCampType = flipped;
  assert(tower2.hp === t2Hp && tower2.maxHp === t2Max, 'repair camp does not touch the tower');
  assert(core.hp > cHp2, 'repair camp still repairs the core');
  assert(ally.hp > 1000, `repair camp still heals allied fighters (${ally.hp})`);

  // fortify purchase: tower frozen (hp AND maxHp), core grows
  tower.hp = Math.round(tower.maxHp * 0.7);
  core.hp = core.maxHp;
  const fTHp = tower.hp; const fTMax = tower.maxHp; const fCHp = core.hp; const fCMax = core.maxHp;
  const coreBonus = Math.round((core.forgeBaseMaxHp || core.maxHp) * 0.10);
  assert(api.purchaseArenaForgeUpgrade('player', 'fortify') === true, 'fortify purchase succeeds');
  assert(tower.hp === fTHp && tower.maxHp === fTMax, 'fortify purchase does not touch the tower');
  assert(core.maxHp === fCMax + coreBonus && core.hp === fCHp + coreBonus, 'fortify purchase still strengthens the core');

  // fortify free boon (enemy team): tower frozen, core grows
  const eTower = api.getArenaForgeStructures('enemy', 'tower')[0];
  const eCore = api.getArenaForgeCore('enemy');
  eTower.hp = Math.round(eTower.maxHp * 0.7);
  eCore.hp = eCore.maxHp;
  const bTHp = eTower.hp; const bTMax = eTower.maxHp; const bCMax = eCore.maxHp;
  const eBonus = Math.round((eCore.forgeBaseMaxHp || eCore.maxHp) * 0.10);
  assert(api.applyArenaForgeFreeUpgrade('enemy', 'fortify') === true, 'free fortify boon succeeds');
  assert(eTower.hp === bTHp && eTower.maxHp === bTMax, 'free fortify boon does not touch the tower');
  assert(eCore.maxHp === bCMax + eBonus, 'free fortify boon still strengthens the core');

  // doHeal: hard-blocked on towers, still works on the core
  tower.hp = Math.round(tower.maxHp * 0.5);
  api.doHeal(tower, 5000);
  assert(tower.hp === Math.round(tower.maxHp * 0.5), 'doHeal cannot heal a tower');
  core.hp = core.maxHp - 10000;
  const dCHp = core.hp;
  api.doHeal(core, 5000);
  assert(core.hp === dCHp + 5000, 'doHeal still heals the core (guard is tower-only)');
}

// ---------------------------------------------------------------- idle regen probes
{
  const tower = playerTowers()[0];
  const core = api.getArenaForgeCore('player');
  const player = api.player;
  tower.hp = Math.round(tower.maxHp * 0.6);
  core.hp = Math.round(core.maxHp * 0.6);
  // The core's protection clamp floors hp at forgeProtectedHp while its towers
  // stand (by design). Lower the mark with the hp so the probe measures regen only.
  core.forgeProtectedHp = core.hp;
  const tHp = tower.hp; const tMax = tower.maxHp; const cHp = core.hp;
  let playerHealed = false;
  for (let attempt = 0; attempt < 6 && !playerHealed; attempt++) {
    player.x = 200; player.y = 3800; // quiet corner, away from the lanes
    player.hp = Math.round(player.maxHp * 0.5);
    player.lastAttackAt = 0; player.lastDamagedAt = 0; player.idleRegenNextAt = 0;
    tower.lastAttackAt = 0; tower.lastDamagedAt = 0; tower.idleRegenNextAt = 0;
    core.lastAttackAt = 0; core.lastDamagedAt = 0; core.idleRegenNextAt = 0;
    const pBefore = player.hp;
    api.update(1 / 60);
    if (player.hp > pBefore) playerHealed = true;
    assert(tower.hp === tHp && tower.maxHp === tMax, `idle ticks never heal the tower (probe ${attempt + 1})`);
    assert(core.hp === cHp, `idle ticks never regen the core (probe ${attempt + 1})`);
  }
  assert(playerHealed, 'fighters still idle-regen (control)');
  assert(tower.hp === tHp && tower.maxHp === tMax, 'tower hp/maxHp exactly unchanged after all idle probes');
}

console.log(failures === 0 ? '\nALL ARENA FORGE TOWERS + BLUEPRINTS CHECKS PASSED' : `\n${failures} ARENA FORGE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
