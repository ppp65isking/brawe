// Bolznstien Signature — OVERCHARGE (2026-10-22, Anthony's spec):
// 3-Piece Signature wired into the UNIVERSAL signature framework (the
// #signature button / SIG touch button / R key all call
// activateSignatureAbility). Only activatable during Electric Eyes: costs
// 1,500 HP (clamped, cannot kill), 14s cooldown, 2s of double-speed Super
// ticks (140ms -> 70ms) with two voltaic hands stunning the 2 nearest
// enemies every 0.9s for 0.1s. Shipped balance: chain lightning -50%
// (20% -> 10% of tick). The -30% Super tick nerf was ALREADY in the code —
// this test pins it at x0.70 so it is never applied twice.
// (An earlier build wrongly wired activation through the Power Move button;
// Anthony caught it — the universal bar/button is the only surface now.)
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- Def ---
const def = game.match(/bolznstien: \{\s*type: 'signature',\s*name: 'Overcharge',[\s\S]*?\},/);
assert.ok(def, 'bolznstien signature def (Overcharge) missing');
assert.match(def[0], /Signature Piece/, 'piece name missing');

// --- Universal state function ---
const state = game.match(/function getBolznstienSignatureState\(entity = player, now = performance\.now\(\)\) \{[\s\S]*?\n  \}/);
assert.ok(state, 'getBolznstienSignatureState missing');
assert.match(state[0], /isSpecialAbilityAvailableForEntity\(entity, 'bolznstien'\)/, 'state must gate on the unlocked Signature');
assert.match(state[0], /NEEDS ELECTRIC EYES/, 'state must require the Super to be active');
assert.match(state[0], /COOLDOWN/, 'state must surface the cooldown');
assert.match(state[0], /label: 'OVERCHARGE'/, 'ready label must be OVERCHARGE');
assert.match(game, /const BOLZNSTIEN_SIGNATURE_COOLDOWN_MS = 14000;/, 'cooldown const must be 14s');

// --- Universal dispatch branch ---
const dispatch = game.match(/if \(fighterId === 'bolznstien'\) \{[\s\S]*?\n      \}/);
assert.ok(dispatch, 'activateSignatureAbility bolznstien branch missing');
assert.match(dispatch[0], /getBolznstienSignatureState\(entity\)/, 'branch must consult the state function');
assert.match(dispatch[0], /Math\.min\(1500, Math\.max\(0, entity\.hp - 1\)\)/, 'HP cost must be 1500, clamped so it cannot kill');
assert.match(dispatch[0], /bolznstienOverchargeUntil = now \+ 2000/, 'overcharge must last 2s');
assert.match(dispatch[0], /bolznstienOverchargeReadyAt = now \+ BOLZNSTIEN_SIGNATURE_COOLDOWN_MS/, 'branch must set the 14s cooldown');
assert.match(dispatch[0], /updateSignatureButton\(\)/, 'branch must refresh the signature button');

// --- Universal button registration ---
assert.match(game, /selectedBrawler === 'dashaholic' \|\| selectedBrawler === 'bolznstien'/, 'updateSignatureButton must list bolznstien as a signature fighter');
assert.match(game, /selectedBrawler === 'bolznstien' \? getBolznstienSignatureState\(player\)/, 'button state chain must include bolznstien');
assert.match(game, /selectedBrawler === 'bolznstien' \? ' · 1500 HP'/, 'button label must show the 1500 HP cost');
assert.match(game, /if \(entity === player\) updateSignatureButton\(\);/, 'casting Electric Eyes must refresh the signature button');

// --- The old Power Move hacks must stay GONE ---
assert.doesNotMatch(game, /tryActivateBolznstienOvercharge/, 'old standalone activation must be removed');
assert.doesNotMatch(game, /Power Move: ⚡ OVERCHARGE!/, 'super-button hack must be removed');

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
