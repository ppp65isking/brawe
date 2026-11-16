import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const rosterFiles = [
  'common', 'rare', 'super-rare', 'epic', 'mythic', 'legendary', 'exotic', 'anomaly',
].map(rarity => fs.readFileSync(new URL(`../modules/brawlers/${rarity}/roster.js`, import.meta.url), 'utf8')).join('\n');

const chargeStart = game.indexOf('const SUPER_CHARGE_HITS_BY_BRAWLER =');
const chargeEnd = game.indexOf('let nextMainAttackActivationId', chargeStart);
assert.ok(chargeStart >= 0 && chargeEnd > chargeStart, 'Central Super charge table exists');
const chargeSandbox = {};
vm.createContext(chargeSandbox);
vm.runInContext(`${game.slice(chargeStart, chargeEnd)}\nthis.table=SUPER_CHARGE_HITS_BY_BRAWLER;`, chargeSandbox);
const chargeTable = chargeSandbox.table;

const rosterIds = new Set([...rosterFiles.matchAll(/'([a-z0-9_]+)'/g)].map(match => match[1]));
assert.equal(rosterIds.size, 74, 'The current modular roster contains 74 fighters');
assert.equal(Object.keys(chargeTable).length, 102, 'Every current fighter has an explicit Power Move charge rule');
for (const id of rosterIds) assert.ok(chargeTable[id], `${id} has a Super charge hit count`);
assert.equal(chargeTable.dashaholic, 2, 'Dashaholic charges in two successful attacks');
assert.equal(chargeTable.minigunnin, 72, 'Minigunnin needs sustained projectile accuracy instead of earning a three-second Super');
assert.equal(chargeTable.steamer, 8, 'Steamer cone attacks remain activation-based and require eight connected bursts');
assert.equal(chargeTable.duck, 45, 'Duck continuous crumbs use a rapid-fire-safe hit requirement');
assert.equal(chargeTable.fuser, 24, 'Fuser projectile charge is normalized around complete eight-shot volleys');
assert.equal(chargeTable.outlit, 30, 'Outlit needs six complete five-pellet blasts rather than one point-blank Super');
assert.equal(chargeTable.beast, 20, 'Beast multi-claw volleys cannot nearly fill Super in one attack');
assert.equal(chargeTable.fightnfire, 30, 'Fight n Fire endpoint shards are included in its projectile budget');
assert.equal(chargeTable.tempo_maker, 14, 'Tempo Maker accounts for both notes in each attack');
assert.equal(chargeTable.chickpig, 12, 'Chickpig accounts for both food projectiles');
assert.equal(chargeTable.kage, 12, 'Kage charges in twelve successful attacks');
assert.equal(chargeTable.heater_miser, 20, 'Heater Miser earns Super through sustained tether ticks');
assert.equal(chargeTable.portalo, 7, 'Portalo uses the proposed seven-hit rule');
assert.equal(chargeTable.ghoul, 6, 'Ghoul uses the proposed six-hit rule');
assert.equal(chargeTable.jacktrade, 18, 'JackTrade accounts for the one-two-four projectile progression');
assert.equal(chargeTable.awakenator, 8, 'Awakenator requires eight successful Dream Bolt hits');

assert.match(game, /beginMainAttackActivation\(fromEntity, brawler, now\)/, 'Normal attacks receive an activation id');
assert.match(game, /entry\.isPrimaryChargeProjectile = true/, 'Every spawned main-attack projectile is marked as an independent charge source');
assert.match(game, /if \(source\.superChargeGranted\) return false;[\s\S]*?source\.superChargeGranted = true/, 'A projectile grants its full step once even when it pierces or hits repeatedly');
assert.match(game, /source\?\.isIndependentChargeTick === true/, 'Continuous attacks can mark a real damage tick as an independent charge step');
assert.match(game, /isHeaterTether: true,[\s\S]{0,100}isIndependentChargeTick: true/, 'Heater Miser enemy tether ticks feed the shared charge system');
assert.match(game, /chargedMainAttackActivations\.includes\(activationId\)/, 'Non-projectile attacks remain deduplicated by activation');
assert.match(game, /owner\.isPet \|\| owner\.isSummon \|\| owner\.isBoss/, 'Summons and bosses do not receive normal player charge steps');
assert.match(game, /if\(!b\.super && !b\.isSuperDash && !b\.isMinigunninMutationFire && !target\.isPet\) grantMainAttackCharge\(owner, b\)/, 'Projectile hits use the shared charge helper while mutation fire ticks cannot farm charge');
assert.doesNotMatch(game, /rawDmg\s*\/\s*8000|damage\s*\/\s*8000|dealt\s*\/\s*8000/, 'The old damage-based 8000 Super formula is removed');

const rewardStart = game.indexOf('const TOWER_FLOOR_COIN_REWARDS =');
const rewardEnd = game.indexOf('const TOWER_FLOOR_BIOMES', rewardStart);
assert.ok(rewardStart >= 0 && rewardEnd > rewardStart, 'Tower reward helpers exist');
const rewardSandbox = { Math, TOWER_TROUBLE_FLOORS: 10 };
vm.createContext(rewardSandbox);
vm.runInContext(`${game.slice(rewardStart, rewardEnd)}\nthis.reward=getTowerTroubleFloorReward;this.mult=getTowerTroubleRewardMultiplier;`, rewardSandbox);
assert.equal(rewardSandbox.reward(1, 0), 100, 'Floor 1 awards 100 coins');
assert.equal(rewardSandbox.reward(5, 0), 100, 'Floor 5 awards 100 coins');
assert.equal(rewardSandbox.reward(6, 0), 200, 'Floor 6 awards 200 coins');
assert.equal(rewardSandbox.reward(10, 0), 200, 'Floor 10 awards 200 coins');
assert.equal(rewardSandbox.reward(6, 1), 100, 'One knockout halves a later 200-coin floor');
assert.equal(rewardSandbox.reward(6, 2), 50, 'Two knockouts quarter a later 200-coin floor');
assert.equal([1,2,3,4,5,6,7,8,9,10].reduce((sum, floor) => sum + rewardSandbox.reward(floor, 0), 0), 1500, 'A flawless run still totals 1500 floor coins');

assert.match(game, /towerGuestPick[\s\S]{0,220}!towerGuestPick && !isBrawlerUnlocked/, 'Tower Trouble can keep a locked guest brawler selected');
assert.match(game, /function getTowerTroubleBrawlerPool\(\)[\s\S]{0,420}getActiveSlopSushiDeck\(id\)\.length >= 8/, 'Tower roster rolls use the centralized complete-deck pool');
assert.doesNotMatch(game.match(/function getTowerTroubleBrawlerPool\(\)[\s\S]*?\n  \}/)?.[0]||'', /isBrawlerUnlocked/, 'Tower guest pool does not filter out locked brawlers');
assert.match(game, /if \(won\) \{[\s\S]{0,260}playerData\.coins = \(playerData\.coins \|\| 0\) \+ floorReward/, 'Floor coins are awarded only after a clear');
assert.match(game, /run\.losses=Math\.min\(3,[\s\S]{0,420}Rewards now \$\{Math\.round\(getTowerTroubleRewardMultiplier\(run\.losses\)\*100\)\}%/, 'Each knockout updates and displays the reduced reward multiplier');
assert.match(game, /if\(run\.brawler&&!run\.eliminated\.includes\(run\.brawler\)\)run\.eliminated\.push\(run\.brawler\);[\s\S]{0,260}if \(won\)/, 'The selected Tower fighter retires before either the win or loss outcome is processed');
assert.match(game, /Every fighter can battle only once per run, whether they win or lose/, 'Tower crew rules explain that wins also consume a fighter');
assert.match(game, /used\?'USED THIS RUN':'POWER 11 • READY'/, 'Consumed Tower fighters display a neutral used status');

console.log('Super charge + Tower Trouble regression suite passed.');
