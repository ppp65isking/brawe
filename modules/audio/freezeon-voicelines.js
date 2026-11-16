// FreeZeon voice lines — RULE ONE: flavor only, never explain mechanics.
// Lines are silent in-game until Anthony picks a voice; the module degrades
// to a no-op when no voice is selected (same pattern as bookworm/pandy/snipa).
(function () {
  const LINES = {
    attack: [
      'Snow cones, coming right up!',
      'Brain freeze incoming!',
    ],
    kill: [
      'Chill out, you lost.',
      'Frozen solid. Stay frosty.',
    ],
    hurt: [
      'Hey, I melt at that temperature!',
      'Ow! My sprinkles!',
    ],
    super: [
      'Ice rink time!',
      "Let's chill!",
    ],
    spawn: [
      'FreeZeon, serving up the cold!',
    ],
    win: [
      'Ice to meet you. And ice to beat you.',
    ],
    death: [
      'Melted... see you next summer...',
    ],
    idle: [
      'Hmm, is it just me or is it cold in here?',
    ],
  };
  let lastAttackAt = 0;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  window.BraweFreezeonVoice = {
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
        if (typeof window !== 'undefined' && window.BraweFreezeonVoiceClip) {
          window.BraweFreezeonVoiceClip(text);
        }
      } catch (e) {}
    },
    lines: LINES,
  };
})();

