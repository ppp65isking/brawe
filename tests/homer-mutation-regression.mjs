// Homer Mutation — WORMHOLE ROUNDS (2026-10-22, Anthony's spec):
// Every 6 attacks, the next 3 shots open portals — they phase through walls,
// gain +150% range (maxLife 1.05 -> 2.625 at his 900 projectile speed), and
// home at full strength (homerHomingPct = 1, same as his Super shots).
// Mirrors the Crystila mutation's 6 -> 3 cadence and the standard mutation
// integration (record/consume helpers, fire-branch hook, wall-section gate,
// aura ring, mechanic HUD, match-start resets).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Def ---
const def = game.match(/homer: \{\s*type: 'mutation',\s*name: 'Wormhole Rounds',[\s\S]*?\},/);
assert.ok(def, 'homer mutation def (Wormhole Rounds) missing');
assert.match(def[0], /Every 6 attacks, the next 3/, 'def text must carry the 6 -> 3 cadence');

// --- Helpers: 6 shots -> 3 charges ---
const record = game.match(/function recordHomerMutationShot\(entity, now = performance\.now\(\)\) \{[\s\S]*?\n  \}/);
assert.ok(record, 'recordHomerMutationShot missing');
assert.match(record[0], /homerMutationShotCounter >= 6/, 'must trigger at 6 attacks');
assert.match(record[0], /homerMutationCharges = 3/, 'must grant 3 charges');
assert.match(game, /function consumeHomerMutationCharge\(entity\)/, 'consume helper missing');
assert.match(game, /function hasHomerMutation\(entity\) \{ return isSpecialAbilityAvailableForEntity\(entity, 'homer'\); \}/, 'availability gate missing');

// --- Fire branch integration ---
assert.match(game, /const portalCharged = consumeHomerMutationCharge\(fromEntity\);/, 'fire branch must consume a charge');
assert.match(game, /const homing=portalCharged\?1:/, 'portal shots must home at full strength');
assert.match(game, /maxLife:portalCharged\?2\.625:1\.05/, 'portal shots must get +150% range (maxLife x2.5)');
assert.match(game, /homerPortalShot:portalCharged/, 'portal flag must ride the bullet');
assert.match(game, /if \(!portalCharged\) recordHomerMutationShot\(fromEntity, now\);/, 'normal shots must feed the counter');

// --- Wall phasing ---
assert.match(game, /const portalPhased = !!b\.homerPortalShot;/, 'wall section must detect portal shots');
assert.match(game, /if\(!portalPhased && rectCircleCollides\(c\.x,c\.y,c\.w,c\.h/, 'portal shots must skip static walls');
assert.match(game, /if\(!portalPhased && rectCircleCollides\(dw\.x, dw\.y, dw\.w, dw\.h/, 'portal shots must skip destructible walls');
assert.match(game, /fxKind: 'homerPortal'/, 'portal entry/exit flash missing');

// --- Presentation + lifecycle ---
assert.match(game, /fighterId==='homer'&&isSpecialAbilityAvailableForEntity\(entity,'homer'\)&&\(entity\.homerMutationCharges\|\|0\)>0/, 'aura ring while charges live missing');
assert.match(game, /MUTATION - \$\{charges\} WORMHOLE/, 'mechanic HUD entry missing');
assert.match(game, /player\.homerMutationShotCounter = 0;/, 'match-start reset missing');

console.log('homer-mutation regression: all checks passed');
