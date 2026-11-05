import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const exotic = fs.readFileSync(new URL('../modules/brawlers/exotic/roster.js', import.meta.url), 'utf8');

assert.match(exotic, /'ghoul'/, 'Ghoul is registered in the Exotic roster');
assert.match(game, /'ghoul':\s*\{[\s\S]*?name:'Ghoul'[\s\S]*?attack:'Haunt'[\s\S]*?super:'Invisible Party'/, 'Ghoul has complete UI metadata');
assert.match(game, /return \{ hp: Math\.round\(6500 \* hpScale\), dmg: Math\.round\(1050 \* scale\), speed: 300 \}/, 'Ghoul has the requested Power 11 stats and fast movement');
assert.match(game, /brawler === 'ghoul'\) base = 1700/, 'Ghoul reloads in 1.7 seconds');

assert.match(game, /GHOUL_BASE_INVIS_MS = 1800/, 'Haunt invisibility lasts at most 1.8 seconds');
assert.match(game, /GHOUL_HYPER_INVIS_MS = 2400/, 'Nightmare extends Haunt invisibility to 2.4 seconds');
assert.match(game, /GHOUL_REVEAL_RADIUS = 150/, 'Nearby enemies reveal Ghoul');
assert.match(game, /isGhoulHiddenFromObserver\([^,]+,\s*[^,\)]+(?:,\s*[^\)]+)?\)/, 'Bot detection checks Ghoul invisibility');
assert.match(game, /ghoulAimSessionActive\) return/, 'Holding aim cannot repeatedly restart invisibility');
assert.match(game, /endGhoulInvisibility\(fromEntity,now,true\)/, 'Attacking ends Haunt invisibility');

assert.match(game, /const handCount = party \? 3 : 2/, 'Invisible Party upgrades Haunt from two to three hands');
assert.match(game, /GHOUL_HAND_DAMAGE = 1050/, 'Each ghost hand deals 1050 base damage');
assert.match(game, /pierce:true, super:false,[\s\S]*?isGhoulHand:true/, 'Hand hits use isolated hit resolution without becoming piercing projectiles');
assert.match(game, /const offsets = haunt\.handCount === 3 \? \[-48, 0, 48\] : \[-27, 27\]/, 'Two- and three-hand layouts remain visually distinct');
assert.match(game, /const slamDelay = hyper \? 260 : 520/, 'Nightmare doubles hand slam speed');
assert.match(game, /target\.ghoulPushVX[\s\S]*?target\.ghoulPushUntil/, 'Invisible Party applies a smooth shove rather than an instant teleport');

assert.match(game, /remaining \+ 800/, 'Each Nightmare hand adds 0.8 seconds of Darkness');
assert.match(game, /Math\.min\(4000, remaining \+ 800\)/, 'Darkness stacking is capped at four seconds');
assert.match(game, /createRadialGradient\(innerWidth\/2,innerHeight\/2/, 'Darkness renders a player-centered restricted-vision mask');
assert.match(game, /ghoulDarknessUntil\|\|0\)>[^&]+&&Math\.hypot\([^\)]+\)>125/, 'Darkened bots lose distant targets');

assert.match(game, /GHOUL_SUPER_DURATION_MS = 8000/, 'Invisible Party lasts eight seconds');
assert.match(game, /Math\.floor\(\(now - \(entity\.ghoulSuperStartedAt \|\| now\)\) \/ 420\)/, 'Invisible Party repeatedly phases visibility');
assert.match(game, /SUPER_CHARGE_HITS_BY_BRAWLER[\s\S]*?ghoul:6/, 'Ghoul follows the six-connected-attack Super charge rework');
assert.match(game, /chargedMainAttackActivations\.includes\(activationId\)/, 'Multiple hands from one Haunt cannot grant duplicate charge');

assert.match(game, /ghoulPhantomReachArmed=true/, 'Phantom Reach arms the next Haunt');
assert.match(game, /GHOUL_HAUNT_RANGE \* \(phantom \? 1\.25 : 1\)/, 'Phantom Reach grants 25 percent range');
assert.match(game, /if \(hitCount < 2\) continue/, 'Phantom Reach slows only after both hands hit one victim');
assert.match(game, /ghoulPhantomSlowUntil[\s\S]*?now \+ 1500/, 'Phantom Reach slow lasts 1.5 seconds');
assert.match(game, /spawnGhoulClone\(player\)/, 'False Presence is available to the player');
assert.match(game, /isGhoulClone:true, ghoulCloneExpiresAt:now\+4000/, 'False Presence expires after four seconds');
assert.match(game, /if \(target\?\.isGhoulClone\)[\s\S]*?target\.hp\s*=\s*0/, 'Any hit immediately dispels the clone');

assert.match(game, /lingering = getEntityStarChoice\(owner\) === 'slow' && invisHeld >= 1000/, 'Lingering Fear requires one second of invisibility');
assert.match(game, /damage:GHOUL_HAND_DAMAGE \* \(lingering \? 1\.2 : 1\)/, 'Lingering Fear grants 20 percent damage');
assert.match(game, /ghoulShadowSpeedUntil[\s\S]*?now \+ 2000/, 'Shadow Walker lasts two seconds');
assert.match(game, /ghoulShadowSpeedUntil[\s\S]*?(?:hcSpd|activeBotSpeed) \*= 1\.18/, 'Shadow Walker grants 18 percent movement speed');

assert.match(game, /bot\.brawler === 'ghoul'[\s\S]*?grouped/, 'Ghoul bots evaluate grouped enemies');
assert.match(game, /bot\.brawler === 'ghoul'[\s\S]*?GHOUL_HAUNT_RANGE/, 'Ghoul bots use Phantom Reach for distant targets');
assert.match(game, /castGhoulSuper\(bot,isHyper\)/, 'Ghoul bots can activate Invisible Party');
assert.match(game, /if\(isBot\)\{const group=getBotLivingEnemies/, 'Ghoul bot Haunts center on clustered enemies');

assert.match(game, /getEntityBrawlerId\(entity\) === 'ghoul'.*mult \*= 1\.20/, 'Nightmare grants 20 percent damage');
assert.match(game, /selectedBrawler === 'portalo' \|\| selectedBrawler === 'ghoul'\) \? 1\.15/, 'Nightmare grants 15 percent movement speed');
assert.match(game, /getEntityBrawlerId\(target\) === 'portalo' \|\| getEntityBrawlerId\(target\) === 'ghoul'/, 'Nightmare grants 10 percent damage resistance');
assert.match(game, /for \(const haunt of ghoulHaunts\)/, 'Haunt has a bespoke animated hand renderer');
assert.match(game, /selectedBrawler === 'ghoul'[\s\S]*?HOLD TO PHASE/, 'Ghoul has a dedicated in-match mechanic HUD');

console.log('Ghoul regression suite passed.');
