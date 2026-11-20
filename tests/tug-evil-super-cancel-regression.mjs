import assert from 'node:assert/strict';
import fs from 'node:fs';

// Evil Doctor, JackTrade UI, and universal Super cancel regression checks.
// (Tug Zone is deleted — its movement/event checks were removed with it.)

const src = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const has = (needle, message = needle) => assert.ok(src.includes(needle), message);

// Evil Doctor: all attributed kill paths converge on one guarded handler.
has('function handleEvilDoctorKill(victim, ownerId, options = {})');
has("handleEvilDoctorKill(target, b.ownerId, { canChain: true })");
has('fromChainDNA: !!dna.evilDoctorChainDNA');
has('evilDoctorPoisonFromChainDNA');
has('victim._evilDoctorChainBurstDone');
has("spawnFloatingText(originX, originY - 28, 'CHAIN DNA'");

// JackTrade: locked outcome is visible immediately and cancel never clears it.
has('superBtn.dataset.lockedOutcome=lockedLabel');
has("superBtn.dataset.lockedOutcome = 'ALL IN'");
const cancelBody = src.slice(src.indexOf('function cancelSuperAim()'), src.indexOf('function startAimingSuper', src.indexOf('function cancelSuperAim()')));
assert.ok(!cancelBody.includes('clearJackTradePreparedOutcomes'), 'cancel must preserve prepared JackTrade outcomes');

// Universal desktop/mobile cancel paths.
has("k === 'escape' && aimingSuper");
has('e.button === 2 && aimingSuper');
has('superAimCancelState.leftDeadZone');
has('const shouldCancel = superAimCancelState.leftDeadZone && superAimCancelState.cancel;');
has('releaseSuper(shouldCancel)');
has("pointercancel', (e) => { e.preventDefault(); cancelSuperAim(); }");

console.log('Evil Doctor, JackTrade UI, and universal Super cancel regression checks passed.');
