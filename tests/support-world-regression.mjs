import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
assert.match(game,/function applyOverlordBurnAt[\s\S]{0,260}const owner = ownerIsPlayer \? player : bots\.find\(bot => bot\.id === ownerId\)/,'Overlord burn resolves its owner before ally checks');

assert.match(game, /const disabledBrawlers = new Set\(\[\]\);/, 'the disabled set is empty since the deletion (no temporarily disabled fighters remain)');
assert.match(game, /function isBrawlerHidden[\s\S]{0,180}disabledBrawlers\.has\(brawlerId\)/, 'Disabled and data-hidden fighters share one visibility rule');
assert.match(game, /const sortedIds = allBrawlers[\s\S]{0,180}!isBrawlerHidden\(id\)/, 'Hidden kits are removed from the compact selector');
assert.match(game, /const visibleBrawlers = \[\.\.\.allBrawlers\][\s\S]{0,220}(?:isBrawlerHidden\(id\)|disabledBrawlers\.has\(id\))/, 'Hidden kits are removed from the brawler browser');

assert.match(game, /function applyRelayAllyHit[\s\S]{0,500}Math\.hypot\(projectile\.x-target\.x,projectile\.y-target\.y\)>hitRadius/, 'Relay shields require the orb to physically reach its ally');
assert.match(game, /function applyAngelAllyHit[\s\S]{0,500}Math\.hypot\(projectile\.x-target\.x,projectile\.y-target\.y\)>hitRadius/, 'Angel healing requires the light projectile to physically reach its ally');
assert.match(game, /projectile\.hitIds\[target\.id\] = true;[\s\S]{0,220}grantRelayShield/, 'Relay can affect each ally only once per projectile');
assert.match(game, /projectileOwner && podOwner && areAlliedEntities\(projectileOwner, podOwner\)/, 'Allied deployables cannot be farmed for damage or Super charge');

assert.match(game, /function isPowerBoxWall[\s\S]{0,180}isNovaBox/, 'Every power-box variant shares one classification helper');
assert.match(game, /function isNavigationWall[\s\S]{0,180}isPowerBoxWall\(wall\)/, 'Power boxes are excluded from navigation walls');
assert.match(game, /isNavigationWall\(c, player\)/, 'Player collision uses the shared navigation-wall rule');
assert.match(game, /isNavigationWall\(c, t\)/, 'Bot collision uses the shared navigation-wall rule');
assert.match(game, /function pointInsideBlockingWall[\s\S]{0,300}isNavigationWall\(w\)/, 'Line-of-sight routing ignores power boxes as walls');
assert.match(game, /const waterDetour = waterZones\.includes\(blocker\)/, 'Bots identify water blockers for larger detours');
assert.match(game, /planned\.waterDetour \? 4600 : 2600/, 'Bots keep water-routing waypoints long enough to clear the obstacle');
assert.match(game, /botWallBreakTargetHitId = getDestructibleWallHitId\(blocker\)/, 'Bots deliberately target destructible walls blocking their shot');
assert.match(game, /const damageableObject = !!\(dw\.isArenaWall[\s\S]{0,420}b\.damage \* mult/, 'Metal arena walls take ordinary projectile damage, including directed bot shots');

assert.match(game, /function applyProjectileEndpointVaultDamage/, 'Projectile endpoints can damage vaults');
assert.match(game, /if \(dw\.isVault\)[\s\S]{0,720}registerBrickVaultWallDamage/, 'Direct projectiles can damage vaults');
assert.match(game, /function applyNonProjectileStructureDamage[\s\S]{0,1900}applyHeaterBoxDamage\(owner, wall, damage\)/, 'Non-projectile attacks retain the shared power-box and vault damage path alongside breakable metal walls');
assert.match(game, /function AOEDamage[\s\S]{0,12000}applyNonProjectileStructureDamage\(owner, x, y, radius, wallDamage\)/, 'AOE and melee attacks share vault damage handling');
assert.match(game, /function resolveGhoulHaunt[\s\S]{0,3600}applyNonProjectileStructureDamage\(owner,handX,handY,46,structureDamage/, 'Ghoul hands damage power boxes and enemy vaults through the shared structure path');
assert.match(game, /for\(let i=rings\.length-1[\s\S]{0,2600}applyNonProjectileStructureDamage\(ringOwner/, 'Expanding non-projectile rings damage power boxes and enemy vaults');
assert.match(game, /function updateSnapperWaves[\s\S]{0,4200}applyHeaterBoxDamage\(owner,wall,w\.mini\?600:1800\)/, 'Snapper waves damage each power box or enemy vault once');
assert.match(game, /const damagingDash=[\s\S]{0,500}applyNonProjectileStructureDamage\(e,e\.x,e\.y/, 'Damage-dealing dash attacks share the structure collision route');
assert.match(game, /const WEEKLY_FEATURED_MODE_IDS = \['brick_vault', 'power_gods'\]/, 'Vault Siege and Power of the Gods are this week\'s featured modes');
assert.match(game, /function getHomePermanentModeIds[\s\S]{0,260}WEEKLY_FEATURED_MODE_IDS/, 'Weekly featured modes become always playable');
assert.match(game, /function getHomeRotatingModeIds[\s\S]{0,300}!WEEKLY_FEATURED_MODE_IDS\.includes\(id\)/, 'Weekly modes are removed from random slots while featured');
assert.match(game, /FEATURED THIS WEEK/, 'The home event cards explain their weekly feature');
assert.match(game, /function startDuelsRound[\s\S]{0,2600}getActiveSlopSushiDeck\(selectedBrawler\)[\s\S]{0,1200}duelTowerDeck\.slice\(0, 2\)\.map/, 'Each Duels fighter receives two Tower Power transformations, including the weekend preset fallback');
assert.match(game, /Arena Forge - Duels • Tower Power/, 'Duels announces its Tower Power modifier');
assert.ok(game.includes('Vault Siege 3v3'), 'The retired Brick Vault presentation is replaced by Vault Siege');
assert.doesNotMatch(game, /\n\s*if\s*\(b\.isUpiedownCorePie&&b\.upiedownFresh&&owner\)/, 'Projectile-only variables cannot leak into the global renderer');
assert.match(game, /function hasEntityAttachie[\s\S]{0,260}return false/, 'All retired Attachies no longer apply combat effects');

console.log('Support collision + world regression suite passed.');
