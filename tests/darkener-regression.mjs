import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const cards = fs.readFileSync(new URL('../slopsushi-cards.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/brawlers/anomaly/roster.js', import.meta.url), 'utf8');

for (const marker of [
  "name:'Darkener'",
  "attack:'Shroud Sweep'",
  "super:'Darkagon'",
  "function spawnDarkenerCloud",
  "function castDarkagon",
  "function updateDarkenerSystems",
  "function canDarkagonObserverSeeTarget",
  "DARKENER_CLOUD_RANGE*(hyper?1.5:1)",
  "134.4*(hyper?1.5:1)",
  "const dense=!!options.dense,range=DARKENER_CLOUD_RANGE*(hyper?1.5:1)*(1+rangeBonus),speed=DARKENER_CLOUD_SPEED",
  "linger=650*lingerMult*(1+lingerBonus)",
  "darkenerSlowSuffocation:cloud.slowSuffocation",
  "darkenerTickDamageMult:cloud.slowSuffocation?(1+state.ticks*.20):1",
  "if (b.isDarkenerCloud && b.darkenerSlowSuffocation) dealtDamage *= Math.max(0, Number(b.darkenerTickDamageMult) || 1)",
  "state.ticks>=maxTicks",
  "const DARKENER_CLOUD_TICK_MS = 416",
  "applyGhoulDarkness(target,now)",
  "triggerDarkenerHexRecall",
  "updateDarkenerSystems(now, dt)",
]) assert.ok(game.includes(marker), `Missing Darkener runtime marker: ${marker}`);

assert.ok(roster.includes("'darkener'"), 'Darkener must be registered in the Anomaly roster');
assert.ok(cards.includes("darkener:['Shroud Sweep','Darkagon','Eclipse']"), 'Darkener must receive an eight-card generated Tower deck');
assert.ok(game.includes("darkener: 'Anomaly'"), 'Darkener rarity must be Anomaly');
assert.ok(game.includes("darkener:6"), 'Darkener Super must charge through the centralized hit system');
assert.ok(game.includes("if (combatBrawler === 'darkener')"), 'Player Super dispatch missing');
assert.ok(game.includes("if (botCombatBrawler === 'darkener')"), 'Bot Super dispatch missing');
assert.ok(game.includes("if (brawler === 'darkener')"), 'Main attack dispatch missing');
assert.ok(game.includes("curBrawler === 'darkener' && curGadget === 'g1'"), 'Player Gadget 1 missing');
assert.ok(game.includes("curBrawler === 'darkener' && curGadget === 'g2'"), 'Player Gadget 2 missing');
assert.ok(game.includes("selectedBrawler === 'darkener'"), 'Custom Darkener aim indicator missing');
assert.ok(game.includes("DARKAGON — OUTSIDE VISION BLOCKED"), 'Darkagon player vision mask missing');

console.log('Darkener regression checks passed.');
