// Bolznstien Signature — OVERCHARGE (2026-10-22, Anthony's spec):
// 3-Piece Signature. Pressing Power Move again during Electric Eyes activates
// it for 2s: costs 1,500 HP (clamped, cannot kill), 14s cooldown, Super ticks
// twice as fast (140ms -> 70ms), and two voltaic hands stun the 2 nearest
// enemies every 0.9s for 0.1s. Shipped balance: chain lightning -50%
// (20% -> 10% of tick). The -30% Super tick nerf was ALREADY in the code —
// this test pins it at x0.70 so it is never applied twice.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Def ---
const def = game.match(/bolznstien: \{\s*type: 'signature',\s*name: 'Overcharge',[\s\S]*?\},/);
assert.ok(def, 'bolznstien signature def (Overcharge) missing');
assert.match(def[0], /Signature Piece/, 'piece name missing');

// --- Activation gates and numbers ---
const act = game.match(/function tryActivateBolznstienOvercharge\(entity\) \{[\s\S]*?\n    \}/);
assert.ok(act, 'activation function missing');
assert.match(act[0], /bolznstienSuperUntil/, 'must require the Super to be active');
assert.match(act[0], /isSpecialAbilityAvailableForEntity\(entity, 'bolznstien'\)/, 'must require the unlocked Signature');
assert.match(act[0], /Math\.min\(1500, Math\.max\(0, Math\.floor\(entity\.hp\) - 1\)\)/, 'HP cost must be 1500, clamped so it cannot kill');
assert.match(act[0], /bolznstienOverchargeUntil = now \+ 2000/, 'overcharge must last 2s');
assert.match(act[0], /bolznstienOverchargeReadyAt = now \+ 14000/, 'cooldown must be 14s');

// --- fireSuper hook fires BEFORE the charge gate ---
const fireSuperStart = game.indexOf('function fireSuper(isAimDrag = false)');
const hookIdx = game.indexOf('tryActivateBolznstienOvercharge(player)', fireSuperStart);
const gateIdx = game.indexOf('if(superCharge < 100 || player.hp <= 0) return;', fireSuperStart);
assert.ok(hookIdx > fireSuperStart && gateIdx > hookIdx, 'overcharge hook must precede the super-charge gate inside fireSuper');

// --- Super button advertises OVERCHARGE ---
assert.match(game, /Power Move: ⚡ OVERCHARGE!/, 'super button overcharge state missing');

// --- Tick haste + hands in the Super tick loop ---
assert.match(game, /bolzTickInterval = \(ent\.bolznstienOverchargeUntil \|\| 0\) > now \? 70 : 140/, 'tick interval must halve while overcharged');
assert.match(game, /bolznstienHandsNextAt = now \+ 900/, 'hands must pulse every 0.9s');
assert.match(game, /applyStatusEffect\(t, 'stun', 100, ent\)/, 'hands must stun for 0.1s');
assert.match(game, /\.slice\(0, 2\)/, 'hands must hit at most 2 enemies');

// --- Balance: chain halved, tick nerf NOT doubled ---
assert.match(game, /const chainDmg = Math\.round\(tickDmg \* 0\.10\);/, 'chain lightning must be 10% of tick after the -50% nerf');
assert.doesNotMatch(game, /tickDmg \* 0\.20/, 'old chain ratio must be gone');
const tickLine = game.match(/const tickDmg = Math\.round\(\(\(ent\.level \|\| 11\) \* 24 \+ 190\) \* ([\d.]+)\)/);
assert.ok(tickLine, 'tick damage line missing');
assert.equal(tickLine[1], '0.70', 'Super tick must stay at the existing -30% (x0.70) — never double-nerfed');

console.log('bolznstien-signature regression: all checks passed');
