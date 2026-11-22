// Showdown storm Play Again regression (2026-11-22).
// Bug: after a Showdown match ended with the storm active, tapping Play
// Again started a new match with the storm already closed — and the storm
// stayed visible until a page reload.
// Root cause: the storm state (stormTimer + stormRadius) was only ever
// reset in startDuelsRound. launchShowdownMatch — the path Play Again
// takes (playAgainFromResults clicks #startMatch) — reset every other
// per-match array but never the storm, so the new match inherited the
// finished match's stormTimer and its shrunken stormRadius.
// Fix: resetShowdownStorm() (stormTimer = 0, stormRadius = 4000, the
// declared initial radius) is called from launchShowdownMatch and from
// startDuelsRound. The storm update loop still recomputes the radius
// from the timer every tick, and the update/draw gates are untouched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------------------------------------------------------- 1. source pins
check('storm reset helper exists (timer 0 + radius 4000)', game.includes('function resetShowdownStorm() { stormTimer = 0; stormRadius = 4000; }'));
check('launchShowdownMatch resets the storm (Play Again path)', (() => {
  const lines = game.split('\n');
  const launchIdx = lines.findIndex((l) => l.includes('function launchShowdownMatch()'));
  const resetIdx = lines.findIndex((l, i) => i > launchIdx && l.includes('resetShowdownStorm(); // Showdown storm Play Again fix'));
  const arrayResetIdx = lines.findIndex((l, i) => i > launchIdx && l.startsWith('      feathersWindZones = []; feathersStorms = [];'));
  return launchIdx !== -1 && resetIdx !== -1 && arrayResetIdx !== -1 && resetIdx === arrayResetIdx + 1;
})());
check('startDuelsRound resets the storm every round', game.includes('resetShowdownStorm(); // Reset storm every round (timer + radius'));
check('Play Again routes Showdown through #startMatch (the launch path)', game.includes("document.getElementById('startMatch')?.click();"));
check('storm update still recomputes the radius from the timer every tick', game.includes('stormRadius = Math.max(0, (WORLD_W * 0.8) - (stormTimer / stormDuration) * (WORLD_W * 0.8));'));
check('storm update gate still excludes the team modes + game over', /if \(!isObjectiveMode && !isDamageFillerMode && !isMirrorMode && !isKnockDonateMode && !isBrickVaultMode && !isArenaForgeMode && !isPropHuntMode && !isTraining && !isBossFight && !isSoloTrial && !gameOver\) \{[\s\S]*?stormTimer \+= dt;/.test(game));
check('storm draw gate is untouched', /if \(!isTraining && !isBossFight && !isSoloTrial && !isObjectiveMode && !isDamageFillerMode && !isMirrorMode && !isKnockDonateMode && !isBrickVaultMode && !isArenaForgeMode\) \{[\s\S]*?ctx\.arc\(WORLD_W\/2, WORLD_H\/2, Math\.max\(0, stormRadius\)/.test(game));
check('storm initial state is still timer 0 + radius 4000', game.includes('let stormRadius = 4000;') && game.includes('let stormTimer = 0;'));

// ---------------------------------------------------------- 2. vm execution
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

try {
  // A finished match: storm 100s in, radius shrunk to ~667 on a 4000 world.
  const sandbox = { stormTimer: 100, stormRadius: 667 };
  vm.createContext(sandbox);
  vm.runInContext(extractFn(game, 'resetShowdownStorm'), sandbox);
  sandbox.resetShowdownStorm();
  check('reset: a finished match stormTimer (100s) resets to 0', sandbox.stormTimer === 0);
  check('reset: a shrunken stormRadius (667) resets to the full 4000', sandbox.stormRadius === 4000);
  sandbox.resetShowdownStorm();
  check('reset: calling it on a fresh match is a no-op (still 0 / 4000)', sandbox.stormTimer === 0 && sandbox.stormRadius === 4000);
  // Mid-match storm, then Play Again: same reset.
  sandbox.stormTimer = 45;
  sandbox.stormRadius = 2000;
  sandbox.resetShowdownStorm();
  check('reset: a mid-match storm also resets fully', sandbox.stormTimer === 0 && sandbox.stormRadius === 4000);
} catch (e) { failures.push('storm reset threw: ' + e.message); }

// ---------------------------------------------------------- report
if (failures.length) {
  console.error(`FAIL ${failures.length} checks:\n- ${failures.join('\n- ')}`);
  console.error(`passed ${passed}`);
  process.exit(1);
}
console.log(`PASS showdown-storm-play-again-regression.mjs (${passed} checks)`);
