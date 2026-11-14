// Bookworm voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as pandy/snipa).
(function () {
  const LINES = {
    attack: [
      "Chapter one, let's go!",
      'Plot twist!',
    ],
    kill: [
      "That's the end of that chapter.",
      'You just got shelved.',
    ],
    hurt: [
      'Ouch, my bookmark!',
      'Hey, I was on that page!',
    ],
    super: [
      'Worm leap!',
      'Time for the big jump!',
    ],
    spawn: [
      'Bookworm, reporting for reading duty!',
    ],
    win: [
      'And they all lived happily ever after. Except you.',
    ],
    death: [
      'Back to the library...',
    ],
    idle: [
      'Hmm, where was I?',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweBookwormVoice = {
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
        if (typeof window !== 'undefined' && window.BraweBookwormVoiceClip) {
          window.BraweBookwormVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
