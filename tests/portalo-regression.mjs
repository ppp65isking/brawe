import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const exotic = fs.readFileSync(new URL('../modules/brawlers/exotic/roster.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(exotic, /'portalo'/, 'Portalo is registered in the Exotic roster');
assert.match(game, /'portalo':\s*\{[\s\S]*?name:'Portalo'[\s\S]*?attack:'Portal Shot'[\s\S]*?super:'Portal Prison'/, 'Portalo has complete UI metadata');
assert.match(game, /return \{ hp: Math\.round\(6800 \* hpScale\), dmg: Math\.round\(1500 \* scale\), speed: 260 \}/, 'Portalo uses the requested P11 HP, damage, and normal speed');
assert.match(game, /brawler === 'portalo'\) base = 1700/, 'Portalo reloads in 1.7 seconds');

assert.match(game, /PORTALO_TELEPORT_DISTANCE = ARENA_WALL_TILE \* 4\.5/, 'Portal Shot displaces four and a half tiles');
assert.match(game, /damage:1500,pierce:false/, 'Portal Shot deals 1500 damage and does not pierce');
assert.match(game, /getPortaloPortalDuration\(owner, !!projectile\.portaloHyperAtFire\)/, 'Portal Shot creates duration-aware linked portals');
assert.match(game, /return \(hyper \|\| getEntityStarChoice\(owner\) === 'slow'\) \? 2500 : 1700/, 'Normal, Hyper, and Stable Portal durations are correct');
assert.match(game, /if \(portaloPortalPairs\[index\]\.ownerId === owner\.id\) portaloPortalPairs\.splice/, 'A new pair replaces the owner\'s prior pair');
assert.match(game, /findNearestOpenSpot\(desiredX, desiredY/, 'Teleport destinations use safe collision-aware placement');
assert.match(game, /entity\.portaloMoveX = entity\.x - lastX/, 'Portal travel tracks incoming movement direction');
assert.match(game, /entity\.portaloArrivalPairId === pair\.id[\s\S]*?const reversing =/, 'A direct teleport cannot auto-return; deliberate reverse movement is required');
assert.match(game, /enemy && pair\.oneWayEnemies && entryIndex === 1/, 'Hyper enemy travel is one-way while normal portal travel remains bidirectional');
assert.match(game, /target\.isStructure \|\| target\.isArenaForgeStructure \|\| target\.isVault/, 'Portal Shot never displaces map objectives or structures');

assert.match(game, /activateAt:now\+800, expiresAt:now\+6800/, 'Portal Prison arms after 0.8 seconds and remains active for six seconds');
assert.match(game, /if \(isInsideEnemyPortaloPrison\(entity, now\)\) mult \*= \.85/, 'Enemies inside Portal Prison deal 15% less damage');
assert.match(game, /exitAngle=Math\.random\(\)\*Math\.PI\*2/, 'Projectiles exit Portal Prison at a random edge');
assert.match(game, /field\.hyper && now >= field\.nextPullAt/, 'Portal Collapse pulls once per scheduled interval');
assert.match(game, /field\.nextPullAt \+= 1000/, 'Portal Collapse pull interval is one second');
assert.match(game, /getEntityBrawlerId\(entity\) === 'portalo'.*mult \*= 1\.20/, 'Portalo Hypercharge grants 20% damage');
assert.match(game, /selectedBrawler === 'portalo' \|\| selectedBrawler === 'ghoul'\) \? 1\.15/, 'Portalo Hypercharge grants 15% speed');
assert.match(game, /getEntityBrawlerId\(target\) === 'portalo'.*dealtDamage \*= \.90/, 'Portalo Hypercharge grants 10% defense');

assert.match(game, /createPortaloPortalPair\(player,player\.x,player\.y,wm\.x,wm\.y,4000,\{shortcut:true\}\)/, 'Shortcut places a four-second aimed portal pair');
assert.match(game, /player\.portaloReverseArmed=true/, 'Reverse Route arms the next shot');
assert.match(game, /entity\.portaloExitSpeedUntil = Math\.max[\s\S]*?now \+ 2000/, 'Stable Portals grant allies two seconds of exit speed');
assert.match(game, /checkHit\(target,\{ownerBrawler:'portalo'.*damage:600/, 'Portal Shock deals 600 delayed damage');
assert.match(game, /cancelPortaloShockOnReturn\(entity, pair, entryIndex, now\)/, 'Immediate return travel cancels Portal Shock');
assert.match(game, /SUPER_CHARGE_HITS_BY_BRAWLER[\s\S]*?portalo:7/, 'Portalo follows the proposed seven-hit Super charge rule');

assert.match(game, /bot\.brawler === 'portalo'[\s\S]*?valuableTarget/, 'Portalo bot AI evaluates valuable Reverse Route targets');
assert.match(game, /bot\.brawler === 'portalo'[\s\S]*?objectiveFight/, 'Portalo bot AI prioritizes Portal Prison on objectives');
assert.match(game, /if \(bot\.hp < bot\.maxHp \* \.48 && ready\.includes\('g1'\)\)/, 'Portalo bots prefer Shortcut when endangered');
const botGadgetTargetDeclaration = game.indexOf("const target = bot.lastTargetId === player.id ? player : bots.find(b=>b.id===bot.lastTargetId);");
const portaloGadgetTargetUse = game.indexOf("const highValueTarget = !!(target", botGadgetTargetDeclaration);
assert.ok(botGadgetTargetDeclaration >= 0 && portaloGadgetTargetUse > botGadgetTargetDeclaration, 'Bot gadget targets are initialized before Portalo evaluates them');
assert.match(game, /owner\.hp <= 0/, 'Portalo entities clean up when their owner dies');

assert.match(styles, /Mobile lobby: a compact, scrollable loadout-first flow/, 'The mobile lobby override is present');
assert.match(styles, /min-height:100svh/, 'The mobile lobby respects the small viewport height');
assert.match(styles, /#homeQuickActions\{[\s\S]*?overflow-x:auto/, 'Mobile progression actions are horizontally scrollable instead of overflowing');
assert.doesNotMatch(game, /attachiesBtn\.id = 'attachiesBtn'/, 'The retired Attachies collection is no longer exposed on Home');

console.log('Portalo and mobile-home regression suite passed.');
