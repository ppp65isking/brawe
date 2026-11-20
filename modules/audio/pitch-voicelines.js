// Pitch voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as gravy/driller/freezeon/bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Bubble, bubble — here it comes!',
      'A little hex for you!',
    ],
    kill: [
      'Oink! Down they go!',
      'The pigs will feast tonight.',
    ],
    hurt: [
      'Hey! My hat!',
      'Ow! That stung!',
    ],
    super: [
      'Pigs, go get them!',
      'Time for the parade!',
    ],
    spawn: [
      'Pitch is here, pigs in tow.',
    ],
    win: [
      'The pigs and I win again.',
    ],
    death: [
      'My pigs... carry on...',
    ],
    idle: [
      'Hmm, the brew needs a stir.',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BrawePitchVoice = {
    play(kind) {
      try {
        if (kind === 'attack') {
          const now = performance.now();
          if (now - lastAttackAt < 2500) return;
          lastAttackAt = now;
        }
        const lines = LINES[kind];
        if (!lines || !lines.length) return;
        const text = pick(lines);
        // No voice selected yet: silent no-op (Anthony picks a voice).
        if (typeof window !== 'undefined' && window.BrawePitchVoiceClip) {
          window.BrawePitchVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
