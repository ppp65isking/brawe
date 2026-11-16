// Driller voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as freezeon/bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Dig in!',
      "Dirt's flying today!",
    ],
    kill: [
      'Buried. Next!',
      'You just got dug under.',
    ],
    hurt: [
      'Hey! My hard hat!',
      'Ow! That rattled my teeth!',
    ],
    super: [
      'Drill time!',
      'Going underground!',
    ],
    spawn: [
      'Driller, ready to dig!',
    ],
    win: [
      'I dug my way to the top.',
    ],
    death: [
      'Buried alive... ironic...',
    ],
    idle: [
      'Hmm, this dirt smells like victory.',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweDrillerVoice = {
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
        if (typeof window !== 'undefined' && window.BraweDrillerVoiceClip) {
          window.BraweDrillerVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
