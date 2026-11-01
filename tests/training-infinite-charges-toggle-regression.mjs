// Training infinite-charges toggle: turning off infinite Super + Hypercharge
// must stop the per-frame training refill and stop training from starting
// (or re-starting on brawler switch) at 100/100, so training charges like a
// normal match. Default stays ON so current training behavior is unchanged.
// Source-presence checks. No DOM/match runtime needed.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

check('trainingInfiniteCharges variable exists, default true (current behavior preserved)', game.includes('let trainingInfiniteCharges = true;'));
check('per-frame training refill is gated by the toggle', game.includes('if (!isBrawlerLabMode && trainingInfiniteCharges) {'));
check('no ungated per-frame training refill remains', !game.includes('if (!isBrawlerLabMode) {\n            superCharge = 100;'));
check('training launch starts at 0/0 when toggle is off', game.includes('player.superCharge = trainingInfiniteCharges ? 100 : 0;'));
check('brawler-switch reset respects the toggle', (() => {
  const hits = game.match(/player\.superCharge = trainingInfiniteCharges \? 100 : 0;/g) || [];
  return hits.length >= 2;
})());
check('Training Hub has the Infinite Super + Hypercharge checkbox', game.includes("document.createTextNode('Infinite Super + Hypercharge (turn off for normal charging)')"));
check('in-match training panel has the tgInfiniteCharges checkbox', game.includes('id="tgInfiniteCharges"'));
check('panel checkbox wires to the toggle variable', game.includes("panel.querySelector('#tgInfiniteCharges').onchange=e=>{trainingInfiniteCharges=e.target.checked;};"));
check('manual training-cave refill buttons are untouched (explicit taps, not infinite)', game.includes("deck.querySelector('#tcRefillSuperBtn')") && game.includes("deck.querySelector('#tcRefillHyperBtn')"));
check('Brawler Lab mode exception still respected', game.includes('isBrawlerLabMode'));
check('gadget no-cooldown toggle untouched', game.includes('let trainingGadgetNoCooldown = true;'));

console.log(`training-infinite-charges-toggle: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures.join(' | ')); process.exit(1); }
