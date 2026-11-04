// Core Surge Overdrive — rewards + shop (Worker C) regression tests.
// Static checks on game.js plus a vm run of the standalone Overdrive core
// block (state, tier arrays, reward tables, claim logic, surge-drop use
// path) with stubbed game globals, mirroring the existing pickup pattern
// (overlord_crystal fills hyper charge to 100).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---------- Static: contract shape, tables, shop, pickup wiring ----------
assert.match(game, /const OVERDRIVE_MAIN_TIERS = \[100, 250, 500, 1000, 2500, 5000, 10000\]/, 'main tiers must match the shared contract');
assert.match(game, /const OVERDRIVE_DAILY_TIERS = \[500, 1000, 2500, 5000, 11500\]/, 'daily tiers must match the shared contract');
// Integrated state lives in the canonical event-bars block: surgeDrops is a
// numeric drop count, never an array.
assert.ok(game.includes('surgeDrops: 0'), 'overdrive state must init surgeDrops as a numeric count');
assert.ok(!game.includes('surgeDrops: []'), 'overdrive surgeDrops must not be an array');
for (const fn of ['function ensureOverdriveState(', 'function isOverdriveActive(', 'function getOverdriveMainTier()', 'function getOverdriveDailyTier()', 'function claimOverdriveReward(kind, tierIdx)', 'function useOverdriveSurgeDrop()', 'function maybeSpawnOverdriveSurgeDropPickup()', 'function collectOverdriveSurgePickup(collector)']) {
  assert.ok(game.includes(fn), `missing ${fn}`);
}
// Existing shop tabs untouched: all six original dispatch branches still exist.
for (const tab of ["activeTab === 'featured'", "activeTab === 'daily'", "activeTab === 'fighter'", "activeTab === 'skins'", "activeTab === 'wheel'", "activeTab === 'exchange'"]) {
  assert.ok(game.includes(tab), `existing shop tab branch missing: ${tab}`);
}
// New shop tab + render branch + render function.
assert.ok(game.includes("createSidebarButton('⚡ OVERDRIVE REWARDS', 'overdrive')"), 'overdrive sidebar tab missing');
assert.ok(game.includes("activeTab === 'overdrive'"), 'overdrive render dispatch missing');
assert.ok(game.includes('const renderOverdriveTab = () => {'), 'renderOverdriveTab missing');
assert.ok(game.includes('claimOverdriveReward(\'main\', i)'), 'main CLAIM button must call claimOverdriveReward');
assert.ok(game.includes('claimOverdriveReward(\'daily\', i)'), 'daily CLAIM button must call claimOverdriveReward');
assert.ok(game.includes('useOverdriveSurgeDrop()'), 'shop USE button must call useOverdriveSurgeDrop');
assert.ok(!game.includes('OVERDRIVE PLACEHOLDER') && !game.includes('TODO: overdrive'), 'no placeholder text in overdrive shop');
// Pickup wiring: player-only collection guard, spawn call, draw branch.
assert.ok(game.includes("if (p.kind === 'overdrive_surge' && collectedBy !== player) continue;"), 'bots must not consume the player surge drop');
assert.ok(game.includes('maybeSpawnOverdriveSurgeDropPickup();'), 'match-tick spawn hook missing');
assert.ok(game.includes("p.kind === 'overdrive_surge'"), 'overdrive_surge pickup kind missing');
assert.ok(game.includes("hyperChargeCharge = 100;"), 'surge pickup must fill hyper charge to 100');
assert.ok(game.includes('activateHypercharge();'), 'surge pickup must attempt Core Surge activation');
// Persistence: overdrive survives save/load like other event state.
assert.ok(game.includes('overdrive: playerData.overdrive || null,'), 'saveProgress must persist overdrive');
assert.ok(game.includes('if (data.persistent.overdrive) playerData.overdrive = data.persistent.overdrive;'), 'loadProgress must restore overdrive');
// Reward tables: lengths + escalation, checked statically as well as in vm.
const mainRewards = [...game.matchAll(/const OVERDRIVE_MAIN_REWARDS = \[([\s\S]*?)\];/g)][0][1];
const dailyRewards = [...game.matchAll(/const OVERDRIVE_DAILY_REWARDS = \[([\s\S]*?)\];/g)][0][1];
assert.equal((mainRewards.match(/\{[^}]*\}/g) || []).length, 7, 'main rewards must have 7 entries');
assert.equal((dailyRewards.match(/\{[^}]*\}/g) || []).length, 5, 'daily rewards must have 5 entries');

// ---------- VM: behaviour of the standalone core block ----------
// Integrated game: state + tier getters live in the event-bars block, reward
// tables + claim/drop code in the rewards block — concat both slices.
const aStart = game.indexOf('// === CORE SURGE OVERDRIVE (event bars) — BEGIN ===');
const aEnd = game.indexOf('=== CORE SURGE OVERDRIVE (event bars) — END ===');
const cStart = game.indexOf('const OVERDRIVE_MAIN_REWARDS');
const cEnd = game.indexOf('// ----- end Overdrive rewards core');
assert.ok(aStart > -1 && aEnd > aStart && cStart > -1 && cEnd > cStart, 'overdrive block markers missing');
const block = game.slice(aStart, aEnd) + '\n' + game.slice(cStart, cEnd);

const stubs = `
let hyperChargeCharge = 0;
let playing = true;
let gameOver = false;
let __surgeActivated = false;
let __pinCalls = [];
let __saves = 0;
let isTraining = false;
let isTutorialMode = false;
const WORLD_W = 2000, WORLD_H = 1200;
const player = { id: 'player', x: 100, y: 100, hp: 1000, radius: 14, hyperChargeCharge: 0 };
const powerups = [];
const playerData = { coins: 0, gems: 0, souls: 0, corePieces: 0, shopClaims: {} };
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function addCorePieces(n) { playerData.corePieces += n; return playerData.corePieces; }
function grantPinPack(n) { __pinCalls.push(n); return { granted: [], coinsFallback: 0 }; }
function saveProgress() { __saves++; }
function updateHyperButton() {}
function spawnFloatingText() {}
function activateHypercharge() { if (hyperChargeCharge >= 100 && player.hp > 0) { __surgeActivated = true; hyperChargeCharge = 0; } }
`;

const checks = `
const assert = __assert;
assert.deepEqual(OVERDRIVE_MAIN_TIERS, [100, 250, 500, 1000, 2500, 5000, 10000]);
assert.deepEqual(OVERDRIVE_DAILY_TIERS, [500, 1000, 2500, 5000, 11500]);
assert.equal(OVERDRIVE_MAIN_REWARDS.length, 7);
assert.equal(OVERDRIVE_DAILY_REWARDS.length, 5);
// Escalation: every currency field is non-decreasing across tiers, and the
// top tiers are big (main top: 30000 coins + 2 surge drops; daily top: 2 drops).
for (const table of [OVERDRIVE_MAIN_REWARDS, OVERDRIVE_DAILY_REWARDS]) {
  for (const field of ['coins', 'gems', 'corePieces', 'pins', 'souls', 'surgeDrops']) {
    for (let i = 1; i < table.length; i++) assert.ok((table[i][field] || 0) >= (table[i - 1][field] || 0), field + ' must not decrease at tier ' + i);
  }
}
assert.equal(OVERDRIVE_MAIN_REWARDS[6].coins, 30000);
assert.equal(OVERDRIVE_MAIN_REWARDS[6].surgeDrops, 2);
assert.equal(OVERDRIVE_DAILY_REWARDS[4].surgeDrops, 2);
assert.ok(OVERDRIVE_DAILY_REWARDS[4].coins >= 10000);
// Defaults + tier getters.
const s = ensureOverdriveState();
assert.equal(s.mainTotal, 0); assert.equal(s.surgeDrops, 0); assert.deepEqual(s.mainClaimed, []);
assert.equal(isOverdriveActive(), true); // integrated ensure starts the 14-day window immediately
s.mainTotal = 2600; assert.equal(getOverdriveMainTier().reached, 5);
s.dailyTotal = 1000; assert.equal(getOverdriveDailyTier().reached, 2);
// Claim grants exactly the table (main tier 3 = index 3: 4000/25/50/pins 3/50 souls).
s.mainTotal = 1000;
const granted = claimOverdriveReward('main', 3);
assert.deepEqual(granted, { coins: 4000, gems: 25, corePieces: 50, pins: 3, souls: 50, surgeDrops: 0 });
assert.equal(playerData.coins, 4000); assert.equal(playerData.gems, 25);
assert.equal(playerData.corePieces, 50); assert.equal(playerData.souls, 50);
assert.deepEqual(__pinCalls, [3]);
assert.ok(s.mainClaimed.includes(3));
assert.equal(playerData.shopClaims.overdrive_main_3, true);
assert.ok(__saves >= 1);
// Claim needs no active window: the goal was reached, so it stays claimable.
// Double-claim grants nothing.
const before = { coins: playerData.coins, gems: playerData.gems, cp: playerData.corePieces, souls: playerData.souls, pins: __pinCalls.length };
assert.equal(claimOverdriveReward('main', 3), false);
assert.equal(playerData.coins, before.coins); assert.equal(playerData.gems, before.gems);
assert.equal(playerData.corePieces, before.cp); assert.equal(playerData.souls, before.souls);
assert.equal(__pinCalls.length, before.pins);
// Unreached tier cannot be claimed.
s.mainTotal = 100;
assert.equal(claimOverdriveReward('main', 1), false);
assert.equal(playerData.coins, before.coins);
// Bad kind / out-of-range indices are rejected without granting.
assert.equal(claimOverdriveReward('bogus', 0), false);
assert.equal(claimOverdriveReward('main', 7), false);
assert.equal(claimOverdriveReward('main', -1), false);
// Daily top claim grants its 2 surge drops.
s.dailyTotal = 11500;
const dGranted = claimOverdriveReward('daily', 4);
assert.equal(dGranted.surgeDrops, 2); assert.equal(s.surgeDrops, 2);
assert.equal(dGranted.coins, 12000); assert.equal(playerData.shopClaims.overdrive_daily_4, true);
// Surge-drop use path: USE consumes one drop and arms; re-USE is refused;
// the next live-match tick spawns the pickup beside the player and disarms;
// walking over it activates Core Surge (player only).
assert.equal(useOverdriveSurgeDrop(), true);
assert.equal(s.surgeDrops, 1); assert.equal(s.surgeDropArmed, true);
assert.equal(useOverdriveSurgeDrop(), false);
assert.equal(s.surgeDrops, 1);
assert.equal(maybeSpawnOverdriveSurgeDropPickup(), true);
assert.equal(s.surgeDropArmed, false);
assert.equal(powerups.length, 1);
assert.equal(powerups[0].kind, 'overdrive_surge');
assert.equal(powerups[0].x, 170); // player.x + 70
assert.equal(maybeSpawnOverdriveSurgeDropPickup(), false); // no longer armed
hyperChargeCharge = 0; __surgeActivated = false;
assert.equal(collectOverdriveSurgePickup(player), true);
assert.equal(__surgeActivated, true); // activateHypercharge() fired at 100 charge
assert.equal(collectOverdriveSurgePickup({ id: 'bot' }), false); // bots get nothing
// No spawn while not playing (menus) and no spawn while already armed twice.
s.surgeDropArmed = true; playing = false;
assert.equal(maybeSpawnOverdriveSurgeDropPickup(), false);
assert.equal(powerups.length, 1);
playing = true;
assert.equal(maybeSpawnOverdriveSurgeDropPickup(), false); // pickup already on field
`;

vm.runInNewContext(stubs + block + checks, { __assert: assert });
console.log('Core Surge Overdrive rewards regression checks passed.');
