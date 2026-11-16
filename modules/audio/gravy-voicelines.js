// Gravy voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as driller/freezeon/bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Gravy train, coming through!',
      'Ladle it on!',
    ],
    kill: [
      'Mopped up!',
      "That's the good stuff.",
    ],
    hurt: [
      'Hey! Watch the gravy!',
      'Ow! My ladle!',
    ],
    super: [
      'Gravy boat, full steam ahead!',
      'Time to flood the table!',
    ],
    spawn: [
      'Gravy, ready to pour!',
    ],
    win: [
      'Dinner is served. I win.',
    ],
    death: [
      'Spilled... everywhere...',
    ],
    idle: [
      'Hmm, needs a pinch more salt.',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweGravyVoice = {
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
        if (typeof window !== 'undefined' && window.BraweGravyVoiceClip) {
          window.BraweGravyVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
