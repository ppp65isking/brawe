// Gameboard voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as spritz/pitch/gravy/driller/freezeon/bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Your move.',
      'I see five moves ahead.',
    ],
    kill: [
      'Checkmate.',
      'Off the board.',
    ],
    hurt: [
      'That was not in my plan.',
      'Ouch. Rude.',
    ],
    super: [
      'The whole board shifts now.',
      'Watch every square.',
    ],
    spawn: [
      'Gameboard has entered the game.',
    ],
    win: [
      'Every piece played its part.',
    ],
    death: [
      'Knocked off the board...',
    ],
    idle: [
      'Hmm. Knight to... no, wait.',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweGameboardVoice = {
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
        if (typeof window !== 'undefined' && window.BraweGameboardVoiceClip) {
          window.BraweGameboardVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();
