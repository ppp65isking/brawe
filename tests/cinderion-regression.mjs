import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(source, /'cinderion'\s*:\s*\{[\s\S]*?name:\s*'Cinderion'/, 'Cinderion roster data is missing');
assert.match(source, /cinderion:\s*'Exotic'/, 'Cinderion must be Exotic');
assert.match(source, /CINDERION_LAYER_CAPS\s*=\s*Object\.freeze\(\[3, 6, 8, 10\]\)/, 'orbit layers must be 3/6/8/10');
assert.match(source, /CINDERION_BASE_ORBIT_MS\s*=\s*13000/, 'base flames must last 13 seconds');
assert.match(source, /const maxLayer = hyper \? 4 : 3/, 'fourth layer must be Hyper-only');
assert.match(source, /isCinderionScatterFlame:true[\s\S]*?maxLife:range\/speed[\s\S]*?pierce:true/, 'Solar Scatter must create piercing ranged flames');
assert.match(source, /const flameCount = 8/, 'Solar Scatter must use the eight-way aerial burst pattern');
assert.match(source, /isCinderionScatterCore:true[\s\S]*?targetX:impactX,targetY:impactY/, 'Solar Scatter must aim an aerial-style burst core');
assert.match(source, /flameAng=\(b\.scatterRotation\|\|0\)\+flameIndex\*Math\.PI\*2\/count/, 'impact flames must scatter symmetrically in 360 degrees');
assert.match(source, /b\.isCinderionScatterCore && b\.life >= b\.maxLife[\s\S]*?b\.x=burstX;b\.y=burstY/, 'Solar Scatter must resolve at its exact aimed destination on the arrival frame');
assert.match(source, /b\.life \+= dt;[\s\S]*?if \(b\.isCinderionScatterCore && b\.life >= b\.maxLife[\s\S]*?b\.cinderionBurstDetonated=true/, 'Solar Scatter must burst after lifetime advances and before generic expiry cleanup');
assert.match(source, /cinderionSweptPlayerHit[\s\S]*?distToSegment/, 'fast scatter flames need swept player collision');
assert.match(source, /cinderionSweptTargetHit[\s\S]*?distToSegment/, 'fast scatter flames need swept bot collision');
assert.match(source, /cinderionSweptRectHit/, 'fast scatter flames need swept box and wall collision');
assert.match(source, /const range = 464/, 'Solar Scatter must have double the 232px aerial-flame range');
assert.match(source, /CINDERION_LAYER_RADII\s*=\s*Object\.freeze\(\[75, 122, 172, 226\]\)/, 'resting orbit radii must include the 30% range buff');
assert.match(source, /flame\.expanding = true[\s\S]*?flame\.homing = !!hyper/, 'Power Move must expand every stored flame and Hyper must enable homing');
assert.match(source, /flame\.symmetricSlot=index; flame\.symmetricCount=group\.length/, 'active flames must repack into symmetrical layers');
assert.match(source, /flame\.radius \+= \(54 \+ flame\.layer \* 5\) \* dt/, 'Power Move expansion must use the slower on-map speed');
assert.match(source, /let closest = null, best = 220/, 'Hyper homing must only engage nearby enemies');
assert.match(source, /flame\.renderX = baseX \+ flame\.homingOffsetX/, 'Hyper homing must preserve the base spiral and use a local offset');
assert.match(source, /orbitSpeedMult=getCinderionStar\(owner\)==='slow'[\s\S]*?1\+0\.5\*clamp/, 'Hot Company must scale orbit speed up to 50%');
assert.match(source, /if \(flame\.expanding\) \{ flame\.spent = true; break; \}/, 'expanding flame must end on enemy impact');
assert.match(source, /cinderionDoubleKindling[\s\S]*?addCinderionOrbitFlame\(owner, hitNow, true\)/, 'Double Kindling is not wired to successful hits');
assert.match(source, /activateCinderionGuard\(player\)/, 'Cinder Guard player gadget is not wired');
assert.match(source, /updateCinderionSystems\(now, dt\)/, 'Cinderion runtime update is not called');
assert.match(source, /ORBIT \$\{total\}\/\$\{cap\}/, 'orbit HUD meter is missing');
assert.match(source, /botCombatBrawler === 'cinderion'[\s\S]*?castCinderionSuper/, 'bot Super support is missing');
assert.match(source, /entity\.cinderionOrbitFlames = \[\]/, 'respawn cleanup is missing');

console.log('Cinderion regression checks passed.');
