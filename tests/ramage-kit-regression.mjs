import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /function activateRamageAdrenaline[\s\S]{0,500}ramageMultiplier = Math\.min\(RAMAGE_MAX_MULTIPLIER, Math\.round\(\(\(entity\.ramageMultiplier \|\| 1\) \+ 3\) \* 10\) \/ 10\)[\s\S]{0,250}doHeal\(entity, 1500\)/, 'Gadget 1 adds three multiplier stages up to the 12x cap and heals');
assert.match(game, /curBrawler === 'ramage' && curGadget === 'g1'[\s\S]{0,400}gadgetCooldownUntil/, 'player Gadget 1 is routed through the gadget button and cooldown');
assert.match(game, /curBrawler === 'ramage' && curGadget === 'g2'[\s\S]{0,220}ramageG2Armed = true/, 'player Gadget 2 arms the next Super');
assert.match(game, /const hasG2 = !!owner\.ramageG2Armed[\s\S]{0,120}owner\.ramageG2Armed = false/, 'Super consumes the armed Rebound Magnet exactly once');
assert.match(game, /ramagePulledTargetIds\.includes\(target\.id\)[\s\S]{0,600}REBOUND PULLED/, 'Rebound Magnet records enemies hit by the forward dash');
assert.match(game, /Rebound Magnet carries captured enemies[\s\S]{0,1500}pulled\.x = clamp[\s\S]{0,500}pulled\.y = clamp/, 'captured enemies move with Ramage instead of being teleported for one frame');
assert.match(game, /selectedBrawler === 'ramage'[\s\S]{0,180}ramageMultiplier \|\| 1\) >= 10\) activeSpeed \*= 1\.20/, 'Star Power 1 grants its movement bonus at max ramp');
assert.match(game, /Ramage SP1 15% Damage Reduction[\s\S]{0,900}b\.damage = Math\.round\(\(b\.damage \|\| 0\) \* 0\.85\)/, 'Star Power 1 reduces incoming damage by 15%');
assert.match(game, /const lossFraction = hasSp1 \? 0\.15 : 0\.33/, 'Star Power 1 preserves more multiplier on defeat');
assert.match(game, /SP2: Knuckle Blast[\s\S]{0,1000}const splashDmg = Math\.round\(\(b\.damage \|\| 320\) \* 0\.30\)/, 'Star Power 2 creates its 30% impact splash');
assert.match(game, /RAMAGE_LIFESTEAL_PER_HIT = 300[\s\S]{0,100}RAMAGE_LIFESTEAL_CAP = 2400/, 'Hyper shadow projectiles heal a flat 300 with a 2400-per-Super cap');
assert.match(game, /owner\.ramageLifestealHealed = 0/, 'each newly cast Super resets its shared lifesteal budget');
assert.match(game, /bot\.brawler === 'ramage' && g === 'g1'[\s\S]{0,350}bot\.brawler === 'ramage' && g === 'g2'/, 'bots can use both Ramage gadgets');
assert.match(game, /isRamageHyperCrossShot: true[\s\S]{0,550}ramageRegularRange: regularRange[\s\S]{0,550}maxLife: regularRange \/ bulletSpeed/, 'Purple Hyper projectiles must retain the regular Super projectile range on their outward trip');
assert.match(game, /if \(b\.isRamageHyperCrossShot[\s\S]{0,850}b\.vx \*= -1;[\s\S]{0,160}b\.maxLife = \(regularRange \* 2\) \/ speed/, 'Purple Hyper projectiles must reverse at max range and travel fully across to the other side');
assert.match(game, /const lifestealRange = normalProjectileRange \* 1\.80/, 'Green lifesteal shadow projectiles must receive exactly 80% extra range');
assert.match(game, /isRamageShadowLifestealShot: true[\s\S]{0,650}maxLife: lifestealRange \/ bulletSpeed/, 'Lifesteal range must be measured from each shadow firing point');
assert.match(game, /const ramageShotColor = b\.isRamageLifesteal \? '#2ed573' : \(b\.hyperVisual \? '#c65cff'/, 'Ramage return projectiles must visually separate green lifesteal shots from purple Hyper regular shots');

console.log('Ramage Gadget and Star Power regression checks passed.');
