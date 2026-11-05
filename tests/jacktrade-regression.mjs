import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const exotic = fs.readFileSync(new URL('../modules/brawlers/exotic/roster.js', import.meta.url), 'utf8');
const towerCards = fs.readFileSync(new URL('../slopsushi-cards.js', import.meta.url), 'utf8');

assert.match(exotic, /'jacktrade'/, 'JackTrade is registered in the Exotic roster');
assert.match(game, /'jacktrade':\s*\{[\s\S]*?name:'JackTrade'[\s\S]*?attack:'Double or Nothing'[\s\S]*?super:'Trade of Fate'/, 'JackTrade has complete roster and UI metadata');
assert.match(game, /Math\.round\(7200 \* hpScale\)[\s\S]*?Math\.round\(750 \* scale\)[\s\S]*?speed: 260/, 'JackTrade has the requested Power 11 stats');
assert.match(game, /brawler === 'jacktrade'\) base = 1650/, 'JackTrade reloads in 1.65 seconds');
assert.match(game, /entity\.jackTradeRushUntil\|\|0\) \? 217 : 644/, 'JackTrade unloads both normally and during Rush Order 30 percent faster');

assert.match(game, /const stage = hyper \? 4 : getJackTradeStage\(owner\)/, 'ALL IN locks main attacks to four cards');
assert.match(game, /stage === 1 \? \[0\] : stage === 2 \? \[-\.04416,\.04416\] : \[-\.09246,-\.03036,\.03036,\.09246\]/, 'Two-card and four-card layouts have another 15 percent more spread');
assert.match(game, /JACKTRADE_CARD_RANGE_BY_STAGE = Object\.freeze\(\{1:650,2:530,4:430\}\)/, 'One-card attacks have long range, two-card attacks medium range, and four-card attacks short range');
assert.match(game, /const cardRange = getJackTradeCardRange\(stage\)[\s\S]*?maxLife:cardRange\/speed/, 'Each projectile uses its current volley stage range');
assert.match(game, /if \(!volley \|\| volley\.hit\) return;[\s\S]*?volley\.hit = true/, 'Multiple cards in one volley only advance progression once');
assert.match(game, /volley\.stage === 1\) setJackTradeStage\(owner,isSlopSushiMode&&getEntitySlopEffectTotal\(owner,'jackTradeDoubleDown'\)>0\?4:2\)[\s\S]*?volley\.stage === 2\) setJackTradeStage\(owner,4\)/, 'Successful attacks advance one to two to four cards, while Double Down can skip stage two');
assert.match(game, /owner\.jackTradeSafeBetArmed[\s\S]*?jackTradeDealerInsurance[\s\S]*?else setJackTradeStage\(owner,1\)/, 'A complete miss resets progression unless Safe Bet or Dealer Insurance changes it');
assert.match(game, /if\(!owner\|\|owner\.hp<=0\|\|volley\.hit\|\|volley\.hyper\)continue/, 'Hyper misses preserve the normal attack stage');
assert.match(game, /NEXT: \$\{stage\} CARD/, 'The HUD clearly displays the next volley size');

for (const outcome of ['regeneration','demolition','rush','toxic','slow','healing']) {
  assert.ok(game.includes(`'${outcome}'`), `Trade of Fate includes ${outcome}`);
}
assert.match(game, /function prepareJackTradeOutcomes\(owner,count=1\)[\s\S]*?available=JACKTRADE_SUPER_OUTCOMES\.filter\(outcome=>!owner\.jackTradePreparedOutcomes\.includes\(outcome\)\)/, 'Jackpot prepares two different outcomes without replacement');
assert.match(game, /superCharge >= 100[\s\S]*?prepareJackTradeOutcomes\(player,getJackTradePreparedOutcomeCount\(player\)\)[\s\S]*?JACKTRADE_OUTCOME_LABELS/, 'A charged Trade of Fate reveals every committed outcome on the Super button');
assert.match(game, /jackTradeRegenRemaining[\s\S]*?\+6000[\s\S]*?jackTradeRegenUntil=now\+10000/, 'Regeneration restores 6000 HP over ten seconds');
assert.match(game, /damageJackTradeWalls\([\s\S]*?jackTradePushVX[\s\S]*?jackTradePushUntil/, 'Demolition destroys walls and applies smooth knockback');
assert.match(game, /jackTradeRushUntil[\s\S]*?now\+5000/, 'Rush Order lasts five seconds');
assert.match(game, /base \/= 3/, 'Rush Order reloads 200 percent faster');
assert.match(game, /JACKTRADE_TOXIC_SPRAY_RANGE = 300 \* 1\.4/, 'Toxic Spray has forty percent more range than its former cone');
assert.match(game, /'toxicSpray'[\s\S]*?travelDistance:JACKTRADE_TOXIC_SPRAY_RANGE[\s\S]*?poisonDuration:2000[\s\S]*?poisonDamagePerSecond:1000/, 'Toxic Spray is an aimed traveling cloud that poisons for two seconds');
assert.match(game, /zone\.x=zone\.originX\+Math\.cos\(zone\.angle\)\*zone\.travelDistance\*ease[\s\S]*?const touched=distance<=zone\.radius/, 'Toxic Spray physically travels and poisons only enemies touched by its cloud');
assert.match(game, /zone\.frameMoveX=zone\.x-previousX[\s\S]*?getEntityKnockbackMultiplier\(target,now\)[\s\S]*?canMoveToPosition\(target,nx,ny\)/, 'Traveling poison smoothly carries enemies while respecting CC immunity and walls');
assert.match(game, /zone\.startRadius\*\(1\+\.5\*progress\)/, 'Slow Trade grows by 50 percent over its lifetime');
assert.match(game, /ally\.id===owner\.id\?4000:3000/, 'Healing Pot heals JackTrade and teammates for the requested amounts');

assert.match(game, /if\(hyper\)[\s\S]*?jackTradeRushUntil[\s\S]*?jackTradeRegenRemaining[\s\S]*?throwJackTradeEffect\(owner,'allin'/, 'ALL IN replaces the random roll with the combined sequence');
assert.match(game, /for\(const angle of \[-Math\.PI\/2,Math\.PI,Math\.PI\/2,0\]\)[\s\S]*?'toxicWave'[\s\S]*?cloudRadius:106[\s\S]*?travelDistance:360[\s\S]*?poisonDuration:2000[\s\S]*?returnsToCenter:true[\s\S]*?returnX:effect\.x,returnY:effect\.y/, 'ALL IN launches four cardinal Hyper poison clouds with two poison ticks that return to center');
assert.match(game, /stackHyper[\s\S]*?jackTradeHyperPoisonStacks=Math\.min\(4[\s\S]*?damagePerSecond\*target\.jackTradeHyperPoisonStacks/, 'ALL IN poison damage stacks up to four times on one target');
assert.match(game, /if\(zone\.returnsToCenter\)[\s\S]*?travel<\.5[\s\S]*?zone\.returnX-endX[\s\S]*?zone\.returnY-endY/, 'Hyper poison movement reverses smoothly from its outer endpoint to the ALL IN center');
assert.match(game, /'slow'[\s\S]*?duration:7000[\s\S]*?healPerSecond:300/, 'ALL IN creates the growing slow field and healing aura');
assert.match(game, /'hyperPuddle'[\s\S]*?radius:42[\s\S]*?JACKTRADE_HYPER_PUDDLE_MS/, 'Each Hyper card creates a small two-second endpoint puddle');

assert.match(game, /jackTradeJackpotArmed=true/, 'Jackpot can be armed by the player or AI');
assert.match(game, /jackTradeSafeBetArmed=true/, 'Safe Bet can be armed by the player or AI');
assert.match(game, /jackTradeSp1FiveCardArmed=true/, 'Fifth Card arms after a Super (Round 41 SP1)');
assert.match(game, /const fiveCard = !hyper && !!owner\.jackTradeSp1FiveCardArmed/, 'Fifth Card throws five cards on the next non-hyper attack (Round 41 SP1)');
assert.match(game, /function shareJackTradeSp2\(owner, outcome, now\)/, 'Shared Pot shares Super outcomes with nearby teammates (Round 41 SP2)');
assert.match(game, /ally\.jackTradeRushStrength=0\.2/, 'Shared Pot rush reaches allies at 20% strength');
assert.match(game, /ally\.jackTradeRegenRemaining=\(ally\.jackTradeRegenRemaining\|\|0\)\+1200/, 'Shared Pot regen reaches allies at 1200 HP');

assert.match(game, /bot\.brawler === 'jacktrade'[\s\S]*?getJackTradeStage\(bot\)===4/, 'JackTrade AI understands its attack progression');
assert.match(game, /botCombatBrawler === 'jacktrade'[\s\S]*?castJackTradeSuper/, 'JackTrade bots can cast Trade of Fate and ALL IN');
assert.match(game, /jackTradeVolleys\.length = 0[\s\S]*?jackTradeThrownEffects\.length = 0[\s\S]*?jackTradeZones\.length = 0/, 'JackTrade temporary entities clean up between rounds');
assert.match(game, /if\(b\.isJackTradeCard\)[\s\S]*?fillText\(\(b\.jackTradeCardIndex%2\)\?'♦':'♠'/, 'JackTrade cards have bespoke gambling visuals');

assert.match(game, /const hyper=zone\.type==='toxicWave'[\s\S]*?globalCompositeOperation=hyper\?'source-over':'lighter'[\s\S]*?for\(let puff=0;puff<\(hyper\?2:12\);puff\+\+\)/, 'Hyper poison uses lightweight blending and only two puffs while normal poison remains readable');
assert.doesNotMatch(game, /if\(hyper\)\{for\(let bolt=/, 'Hyper poison no longer renders expensive per-frame lightning');
assert.match(game, /const hyperGain = gain \* \.5 \* \(brawler === 'jacktrade' \? \.7 : \(brawler === 'classy' \? \.4 : 1\)\)/, 'JackTrade retains its 30 percent Hypercharge nerf alongside the Classy-specific rate');
assert.match(game, /hyper\?'rgba\(184,61,241,\.62\)'/, 'Hyper poison clouds are purple');
assert.match(game, /zone\.type==='slow'&&zone\.hyper[\s\S]*?groundGlow[\s\S]*?for\(let quadrant=0;quadrant<4;quadrant\+\+\)/, 'ALL IN ground control field has a bespoke layered arena-seal visual');
assert.match(game, /ex\.fxKind==='jackTradeHealing'[\s\S]*?for\(let plus=0;plus<8;plus\+\+\)/, 'Healing outcomes have a bespoke healing burst visual');
assert.match(game, /jackTradeRegenFxUntil[\s\S]*?setLineDash\(\[8,6\]\)/, 'Regeneration displays a persistent orbiting healing aura');
assert.match(game, /ex\.fxKind==='jackTradeAllIn'[\s\S]*?for\(let dir=0;dir<4;dir\+\+\)/, 'ALL IN has an upgraded four-direction collapse visual');
assert.match(game, /if\(aimingSuper\)[\s\S]*?if\(hyper\)[\s\S]*?for\(const direction of \[-Math\.PI\/2,Math\.PI,Math\.PI\/2,0\]\)[\s\S]*?prepareJackTradeOutcomes[\s\S]*?outcome==='regeneration'\|\|outcome==='rush'[\s\S]*?outcome==='toxic'[\s\S]*?outcome==='demolition'\?175:outcome==='slow'\?195:180/, 'Every revealed Trade of Fate outcome and ALL IN has a distinct custom aiming preview');
assert.match(game, /ex\.fxKind==='jackTradeDemo'[\s\S]*?for\(let ray=0;ray<16;ray\+\+\)/, 'Demolition has a bespoke explosive blast treatment');
assert.match(towerCards, /'MARKET CRASH'[\s\S]*?jackTradeSuperUnloadAll:1/, 'Market Crash unloads all six normal Super outcomes');
assert.match(game, /jackTradeSuperUnloadAll'\)>0\)return JACKTRADE_SUPER_OUTCOMES\.length/, 'Market Crash prepares the full outcome table without modifying ALL IN');
assert.match(towerCards, /'ROYAL FLUSH'[\s\S]*?jackTradeRoyalFlush:1/, 'Royal Flush replaces the old ALL IN enhancement');
assert.match(game, /function throwJackTradeRoyalFlush[\s\S]*?for\(let index=0;index<5;index\+\+\)[\s\S]*?type:'royalCard'/, 'Royal Flush throws a five-card pentagon');
assert.match(game, /effect\.type==='royalCard'[\s\S]*?1800\*scale[\s\S]*?effect\.royalIndex===4[\s\S]*?4800\*scale/, 'Royal Flush detonates five cards and a colossal final blast');
assert.match(game, /getEntitySlopEffectTotal\(owner,'jackTradeRoyalFlush'\)>0[\s\S]*?throwJackTradeRoyalFlush[\s\S]*?return;/, 'Royal Flush fully replaces the standard Hyper Super sequence');
assert.match(game, /ex\.fxKind==='jackTradeRoyalCard'\|\|ex\.fxKind==='jackTradeRoyalFlush'/, 'Royal Flush has bespoke impact visuals');
assert.doesNotMatch(game, /getBrawlerLevel\s*\(/, 'No removed getBrawlerLevel helper is referenced');

console.log('JackTrade regression suite passed.');
