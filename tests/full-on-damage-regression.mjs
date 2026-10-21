import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');

assert.match(game,/FULL_ON_DAMAGE_DURATION_MS=7\*24\*60\*60\*1000/,'Full On Damage lasts seven days');
assert.equal((game.match(/target:\d+,rewards:/g)||[]).filter((_,i)=>i>=0).length>=20,true,'Damage milestones are present');
assert.match(game,/const FULL_ON_DAMAGE_MILESTONES=\[[\s\S]*?target:50000000,rewards:\{coins:10000,gems:100,hyperTappers:3\}/,'The final 50M milestone has the major reward');
assert.equal((game.match(/title:'(?:Opening Barrage|Bot Brigade|Damage Storm|Heavy Hitters|Arena Meltdown|Weekend Wreckage|Final Detonation)'/g)||[]).length,7,'There are seven rotating daily team tasks');
assert.match(game,/function recordFullOnDamage\(amount\)[\s\S]{0,180}isTraining\|\|isTutorialMode/,'Training and tutorial damage cannot farm the event');
assert.match(game,/function applyShieldDamage[\s\S]{0,1500}recordFullOnDamage\(amount\)/,'All standard fighter, bot, summon, hazard, and shield damage enters the match ledger');
assert.match(game,/const stormDmg =[\s\S]{0,300}recordFullOnDamageToTarget\(e, stormDmg\)/,'Storm damage enters the match ledger');
assert.match(game,/recordFullOnDamageToTarget\(pod,b\.damage\)[\s\S]{0,100}pod\.hp -= b\.damage/,'Healing-pod damage enters the match ledger');
assert.match(game,/recordFullOnDamageToTarget\(screw,damageToScrew\)[\s\S]{0,100}screw\.hp -= damageToScrew/,'Amplifier deployable damage enters the match ledger');
assert.match(game,/recordFullOnDamageToTarget\(dw,wallDamage\)[\s\S]{0,100}dw\.hp -= wallDamage/,'Power-box and wall damage enters the match ledger');
assert.match(game,/const fullOnDamageEarned=commitFullOnDamageMatch\(\)/,'The full match ledger commits once at match end');
assert.match(game,/hasHandledGameOver = false;[\s\S]{0,100}resetFullOnDamageMatchLedger\(\)/,'Each newly launched match receives a fresh damage ledger');
assert.match(game,/addFullOnDamageMatchDamage\(total\)/,'Committed match damage advances the persistent event');
assert.match(game,/const FULL_ON_DAMAGE_ENABLED=false/,'Full On Damage is retired (Season 6 Core update) — vaulted, state preserved');
assert.doesNotMatch(game,/makeTab\('damage', `💥 Full On Damage/,'Retired Full On Damage has no quest-board tab');
assert.match(game,/Everyone in your matches contributes—including every bot/,'Daily UI explains shared bot contribution');

console.log('Full On Damage regression checks passed.');
