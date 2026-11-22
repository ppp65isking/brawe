// Spritz voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as pitch/gravy/driller/freezeon/bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Time to make a splash!',
      'Stay hydrated out there!',
    ],
    kill: [
      'All washed up!',
      'Down the drain you go!',
    ],
    hurt: [
      'Hey, that stings!',
      'My nozzle!',
    ],
    super: [
      'Fresh spray, coming up!',
      'Here comes the good stuff!',
    ],
    spawn: [
      'Spritz is on the scene.',
    ],
    win: [
      'Clean sweep, every time.',
    ],
    death: [
      'Out of water...',
    ],
    idle: [
      'Hmm, where did I put my hose?',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweSpritzVoice = {
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
        if (typeof window !== 'undefined' && window.BraweSpritzVoiceClip) {
          window.BraweSpritzVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
