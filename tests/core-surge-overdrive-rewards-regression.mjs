// Core Surge Overdrive — rewards + shop regression tests.
// Static checks on game.js plus a vm run of the standalone Overdrive core
// block (state, tier arrays, reward tables, claim logic, Surge Tapper
// grants) with stubbed game globals.
//
// 2026-11-04 change (overdrive-reward-nerf-tappers): rewards nerfed
// (hardest at the top tiers) and the PR #76 in-match pickup retired —
// Surge Drop rewards are now Surge Tappers (playerData.hyperTapperCount,
// opened with the existing tap-to-reveal openHyperStarrDrop() overlay).
// There must be NO pickup code left: no pickup kind, no USE arming, no
// spawn hook, no walk-over collection, no pickup draw branch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---------- Static: contract shape, tables, shop, Tapper wiring ----------
assert.match(game, /const OVERDRIVE_MAIN_TIERS = \[100, 250, 500, 1000, 2500, 5000, 10000\]/, 'main tiers must match the shared contract');
assert.match(game, /const OVERDRIVE_DAILY_TIERS = \[500, 1000, 2500, 5000, 11500\]/, 'daily tiers must match the shared contract');
// Integrated state shape is unchanged (bars suite asserts its exact keys);
// the legacy surgeDrops counter survives only as a one-time migration
// source in ensureOverdriveState — it must never feed a pickup again.
assert.ok(game.includes('surgeDrops: 0'), 'overdrive state must still init surgeDrops as a numeric count');
assert.ok(!game.includes('surgeDrops: []'), 'overdrive surgeDrops must not be an array');
for (const fn of ['function ensureOverdriveState(', 'function isOverdriveActive(', 'function getOverdriveMainTier()', 'function getOverdriveDailyTier()', 'function claimOverdriveReward(kind, tierIdx)']) {
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
assert.ok(!game.includes('OVERDRIVE PLACEHOLDER') && !game.includes('TODO: overdrive'), 'no placeholder text in overdrive shop');
// Pickup code must be GONE: no pickup kind, no USE arming, no spawn hook,
// no walk-over collection, no pickup draw branch.
for (const banned of ['overdrive_surge', 'useOverdriveSurgeDrop', 'maybeSpawnOverdriveSurgeDropPickup', 'collectOverdriveSurgePickup', 'Core Surge Drop', 'ARM NEXT MATCH', 'USE — ARM NEXT MATCH']) {
  assert.ok(!game.includes(banned), `retired pickup reference must not remain: ${banned}`);
}
// Tapper wiring: milestone claims grant Surge Tappers to the existing
// inventory, and the shop card opens the existing Tapper overlay.
assert.ok(game.includes('playerData.hyperTapperCount = (playerData.hyperTapperCount || 0) + r.surgeTappers'), 'claim must grant Surge Tappers to hyperTapperCount');
assert.ok(game.includes("addSection(grid, 'Surge Tappers')"), 'shop must have a Surge Tappers section');
assert.ok(game.includes('OPEN A SURGE TAPPER'), 'shop must have an OPEN A SURGE TAPPER card');
assert.ok(game.includes('openHyperStarrDrop()'), 'shop card must open the existing Surge Tapper overlay');
assert.ok(game.includes('Surge Tappers: ${playerData.hyperTapperCount || 0}'), 'Overdrive view must show the Surge Tapper count');
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
// tables + claim code in the rewards block — concat both slices.
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
let __pinCalls = [];
let __saves = 0;
let isTraining = false;
let isTutorialMode = false;
const WORLD_W = 2000, WORLD_H = 1200;
const player = { id: 'player', x: 100, y: 100, hp: 1000, radius: 14, hyperChargeCharge: 0 };
const powerups = [];
const playerData = { coins: 0, gems: 0, souls: 0, corePieces: 0, hyperTapperCount: 0, shopClaims: {} };
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function addCorePieces(n) { playerData.corePieces += n; return playerData.corePieces; }
function grantPinPack(n) { __pinCalls.push(n); return { granted: [], coinsFallback: 0 }; }
function saveProgress() { __saves++; }
function updateHyperButton() {}
function spawnFloatingText() {}
function activateHypercharge() {}
`;

const checks = `
const assert = __assert;
assert.deepEqual(OVERDRIVE_MAIN_TIERS, [100, 250, 500, 1000, 2500, 5000, 10000]);
assert.deepEqual(OVERDRIVE_DAILY_TIERS, [500, 1000, 2500, 5000, 11500]);
assert.equal(OVERDRIVE_MAIN_REWARDS.length, 7);
assert.equal(OVERDRIVE_DAILY_REWARDS.length, 5);
// Nerfed tables (2026-11-04 builder picks): escalation holds, top tiers cut.
assert.deepEqual(OVERDRIVE_MAIN_REWARDS, [
  { coins: 500, gems: 5 },
  { coins: 1000, gems: 10, corePieces: 10 },
  { coins: 1500, gems: 12, corePieces: 20, pins: 2 },
  { coins: 3000, gems: 20, corePieces: 40, pins: 3, souls: 40 },
  { coins: 5000, gems: 30, corePieces: 75, pins: 4, souls: 75 },
  { coins: 9000, gems: 40, corePieces: 125, pins: 5, souls: 125, surgeTappers: 1 },
  { coins: 18000, gems: 60, corePieces: 250, pins: 6, souls: 250, surgeTappers: 2 },
]);
assert.deepEqual(OVERDRIVE_DAILY_REWARDS, [
  { coins: 250, gems: 3 },
  { coins: 750, gems: 8, corePieces: 15 },
  { coins: 1500, gems: 12, corePieces: 30, pins: 2 },
  { coins: 3000, gems: 20, corePieces: 60, pins: 3, souls: 60, surgeTappers: 1 },
  { coins: 7000, gems: 30, corePieces: 150, pins: 4, souls: 150, surgeTappers: 2 },
]);
// Escalation: every currency field is non-decreasing across tiers.
for (const table of [OVERDRIVE_MAIN_REWARDS, OVERDRIVE_DAILY_REWARDS]) {
  for (const field of ['coins', 'gems', 'corePieces', 'pins', 'souls', 'surgeTappers']) {
    for (let i = 1; i < table.length; i++) assert.ok((table[i][field] || 0) >= (table[i - 1][field] || 0), field + ' must not decrease at tier ' + i);
  }
}
// Defaults + tier getters.
const s = ensureOverdriveState();
assert.equal(s.mainTotal, 0); assert.equal(s.surgeDrops, 0); assert.deepEqual(s.mainClaimed, []);
assert.equal(isOverdriveActive(), true); // integrated ensure starts the 14-day window immediately
s.mainTotal = 2600; assert.equal(getOverdriveMainTier().reached, 5);
s.dailyTotal = 1000; assert.equal(getOverdriveDailyTier().reached, 2);
// Claim grants exactly the table (main tier 3 = index 3: 3000/20/40/pins 3/40 souls).
s.mainTotal = 1000;
const granted = claimOverdriveReward('main', 3);
assert.deepEqual(granted, { coins: 3000, gems: 20, corePieces: 40, pins: 3, souls: 40, surgeTappers: 0 });
assert.equal(playerData.coins, 3000); assert.equal(playerData.gems, 20);
assert.equal(playerData.corePieces, 40); assert.equal(playerData.souls, 40);
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
// Daily top claim grants its 2 Surge Tappers to the existing inventory.
s.dailyTotal = 11500;
const dGranted = claimOverdriveReward('daily', 4);
assert.equal(dGranted.surgeTappers, 2); assert.equal(playerData.hyperTapperCount, 2);
assert.equal(dGranted.coins, 7000); assert.equal(playerData.shopClaims.overdrive_daily_4, true);
// Main tier 5 (index 5) grants 1 Surge Tapper.
s.mainTotal = 5000;
const mGranted = claimOverdriveReward('main', 5);
assert.equal(mGranted.surgeTappers, 1); assert.equal(playerData.hyperTapperCount, 3);
assert.equal(mGranted.coins, 9000);
// Legacy pickup inventory converts once into Surge Tappers, never spawns.
playerData.overdrive.surgeDrops = 1;
playerData.overdrive.surgeDropArmed = true;
ensureOverdriveState();
assert.equal(playerData.hyperTapperCount, 5); // 3 + 1 unspent + 1 armed
assert.equal(playerData.overdrive.surgeDrops, 0);
assert.equal(playerData.overdrive.surgeDropArmed, undefined);
ensureOverdriveState(); // idempotent: no second conversion
assert.equal(playerData.hyperTapperCount, 5);
`;

vm.runInNewContext(stubs + block + checks, { __assert: assert });
console.log('Core Surge Overdrive rewards regression checks passed.');
