// Fully-maxed card treatment (2026-10-22): Power 12 + Tool + Talent + Core
// Surge fighters get a gold MAXED roster tile and a FULLY MAXED banner on the
// kit screen. Static checks: the shared helper gates on level + all three
// unlocks, both render sites consult it, and the shine keyframes animate
// transform ONLY (Anthony's no-lag requirement — no particles/paint tricks).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../kit-redesign.css', import.meta.url), 'utf8');

// --- Helper gates on Power cap + gadget + star + hyper ---
const helper = game.match(/function isProgressFullyMaxed\(progress\) \{[^}]+\}/);
assert.ok(helper, 'isProgressFullyMaxed helper missing');
assert.match(helper[0], /MAX_POWER_LEVEL/, 'helper must gate on the power cap (12)');
assert.match(helper[0], /gadgetUnlocked/);
assert.match(helper[0], /starPowerUnlocked/);
assert.match(helper[0], /hyperchargeUnlocked/);

// --- Roster tile hook ---
assert.match(game, /classList\.toggle\('brawler-card--maxed', fullyMaxedCard\)/, 'roster maxed class toggle missing');
assert.match(game, /brawler-card__maxed-ribbon/, 'MAXED ribbon element missing');
assert.match(game, /maxedRibbon\.textContent = '★ MAXED'/, 'ribbon label missing');

// --- Kit screen hook ---
assert.match(game, /classList\.add\('brawler-upgrade-card--maxed'\)/, 'detail maxed class missing');
assert.match(game, /maxedBanner\.textContent = '★ FULLY MAXED ★'/, 'detail banner missing');

// --- CSS treatment + lag discipline ---
assert.match(css, /\.brawler-card--maxed \{/, 'maxed card CSS missing');
assert.match(css, /\.brawler-card__maxed-ribbon \{/, 'ribbon CSS missing');
assert.match(css, /\.brawler-upgrade-card--maxed \{/, 'detail maxed CSS missing');
assert.match(css, /\.brawler-maxed-banner \{/, 'banner CSS missing');
const shine = css.match(/@keyframes kr-maxed-shine \{([\s\S]*?)\n\}/);
assert.ok(shine, 'shine keyframes missing');
assert.match(shine[1], /transform/, 'shine must move via transform');
assert.doesNotMatch(shine[1], /filter|box-shadow|opacity/, 'shine must not animate paint-heavy properties');
assert.doesNotMatch(game, /maxedParticle|maxedCanvas/, 'no JS particle/canvas maxed effects allowed');

console.log('maxed-card regression: all checks passed');
