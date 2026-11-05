import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');

assert.match(game,/anti_royal:\s*'Exotic'/,'Anti-Royal is registered as Exotic');
assert.match(game,/'anti_royal':\s*\{[\s\S]*?name:\s*'Anti-Royal'/,'Anti-Royal has roster metadata');
assert.match(game,/if \(brawlerId === 'anti_royal'\)[\s\S]*?Math\.round\(7600 \* hpScale\)[\s\S]*?Math\.round\(1550 \* scale\)[\s\S]*?speed:\s*255/,'P11 stats are wired');
assert.match(game,/ANTI_ROYAL_MORTAR_ROUND_CAP\s*=\s*6/,'separate mortar bank caps at six');
assert.match(game,/ANTI_ROYAL_BLOCK_COOLDOWN_MS\s*=\s*4500/,'personal blocker has a 4.5 second cooldown');
assert.match(game,/ANTI_ROYAL_MORTAR_FIRE_MS\s*=\s*1820/,'mortar fires every 1.3 seconds');
assert.match(game,/ANTI_ROYAL_OPENING_BARRAGE_FIRE_MS\s*=\s*308/,'banked rounds create the rapid opening barrage');
assert.match(game,/barrageOffsets=\[-90,90,-55,55,-120,120,-25,25\]/,'opening barrage alternates among distinct impact offsets');
assert.match(game,/barrageOffset\+\(mortar\.antiRoyalHyper\?-42:0\)/,'Hyper double shells preserve the spread-out barrage center');
assert.match(game,/isAntiRoyalGoldPouch[\s\S]*?registerAntiRoyalGoldHit\(owner\)/,'gold hits bank mortar rounds');
assert.match(game,/compound\?2:1/,'Compound Interest doubles every third banked hit');
assert.match(game,/isAntiRoyalMortar:true[\s\S]*?hp:5000[\s\S]*?antiRoyalRoundsLeft:rounds/,'Super deploys a 5000 HP mortar loaded from the bank');
assert.doesNotMatch(game,/if\(mortar\.antiRoyalRoundsLeft<=0\)[\s\S]{0,180}mortar\.hp=0/,'empty mortars stay active instead of despawning');
assert.match(game,/mortar\.antiRoyalNextShotAt=now\+\(mortar\.antiRoyalOpeningBarrage\?ANTI_ROYAL_OPENING_BARRAGE_FIRE_MS:ANTI_ROYAL_MORTAR_FIRE_MS\)/,'mortar transitions from barrage cadence to permanent 1.3-second fire');
assert.match(game,/if\(mortar\.antiRoyalHyper\)launchAntiRoyalMortarShell/,'Hyper mortar fires the second shell');
assert.match(game,/until:now\+1200/,'mortar impact zones last 1.2 seconds');
assert.match(game,/delta>Math\.PI\*55\/180/,'Royal Blocker uses a 110 degree frontal arc');
assert.match(game,/grantShield\(target,Math\.round\(\(projectile\.damage\|\|0\)\*2\)\)/,'Hyper blocker converts twice the absorbed damage to shield');
assert.match(game,/pod\.antiRoyalShieldReadyAt=now\+3000/,'Mortar Shield recharges every three seconds');
assert.match(game,/curBrawler === 'anti_royal' && curGadget === 'g1'/,'Counterfeit is wired for players');
assert.match(game,/curBrawler === 'anti_royal' && curGadget === 'g2'/,'Emergency Funding is wired for players');
assert.match(game,/bot\.brawler === 'anti_royal' && g === 'g1'/,'bots can use Counterfeit');
assert.match(game,/botCombatBrawler === 'anti_royal'/,'bots can cast the mortar Super');
assert.match(game,/selectedBrawler==='anti_royal'[\s\S]*?MORTAR/,'HUD exposes the separate mortar bank');
assert.match(game,/selectedBrawler === 'anti_royal'[\s\S]*?drawStandardAimCone/,'Anti-Royal has custom attack and Super aiming');
assert.match(game,/b\.ownerBrawler === 'anti_royal'/,'gold pouch has custom projectile visuals');
assert.match(game,/pod\.isAntiRoyalMortar/,'mortar has custom deployable visuals');

console.log('anti-royal regression checks passed');
