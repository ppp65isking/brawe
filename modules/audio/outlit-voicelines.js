// Outlit voice lines — 24 TTS clips, one voice, wired to match triggers.
// Voice: Twenty (avocado_v2:Twenty) — bold, heroic American male. Builder pick:
// Anthony can veto the voice or rewrite any line (full list in SPEC.md).
// Loaded as a classic script before game.js (see bootstrap.js). If this file
// is missing or audio fails to load, every call degrades to a silent no-op:
// the game must never break on missing audio.
(function (root) {
  'use strict';

  var BASE = 'assets/voice/outlit/';
  var VOICE_ID = 'avocado_v2:Twenty';
  var VOICE_NAME = 'Twenty';

  // trigger -> clip files. Filenames are the line ids from SPEC.md.
  var LINES = {
    spawn: ['spawn-1.mp3', 'spawn-2.mp3', 'spawn-3.mp3'],
    attack: ['attack-1.mp3', 'attack-2.mp3', 'attack-3.mp3', 'attack-4.mp3'],
    super: ['super-1.mp3', 'super-2.mp3', 'super-3.mp3'],
    kill: ['kill-1.mp3', 'kill-2.mp3', 'kill-3.mp3'],
    hurt: ['hurt-1.mp3', 'hurt-2.mp3', 'hurt-3.mp3'],
    death: ['death-1.mp3', 'death-2.mp3', 'death-3.mp3'],
    win: ['win-1.mp3', 'win-2.mp3', 'win-3.mp3'],
    idle: ['idle-1.mp3', 'idle-2.mp3']
  };

  // Spoken text per clip (subtitle source + regression-test reference).
  var TEXT = {
    'spawn-1.mp3': "Lights on. Let's go.",
    'spawn-2.mp3': "Outlit's in the arena. Try and keep up.",
    'spawn-3.mp3': 'Locked, loaded, and lit.',
    'attack-1.mp3': 'Eat buckshot!',
    'attack-2.mp3': 'Point blank!',
    'attack-3.mp3': 'Scatter!',
    'attack-4.mp3': 'Pump it up!',
    'super-1.mp3': 'Boom Break!',
    'super-2.mp3': 'Lights out!',
    'super-3.mp3': 'Three shots. No survivors.',
    'kill-1.mp3': 'Lights out for you.',
    'kill-2.mp3': "Down. Who's next?",
    'kill-3.mp3': 'Point blank. Ouch.',
    'hurt-1.mp3': 'Hey! Watch the lamp!',
    'hurt-2.mp3': 'Ow! That actually hurt!',
    'hurt-3.mp3': 'You scratched the paint!',
    'death-1.mp3': 'Lights... fading...',
    'death-2.mp3': 'Tell the lamp... I tried.',
    'death-3.mp3': 'Out... lit...',
    'win-1.mp3': "And that's why I'm the OG.",
    'win-2.mp3': 'Still lit. Still standing.',
    'win-3.mp3': 'Day one, and still number one.',
    'idle-1.mp3': 'Hello? Anyone still out there?',
    'idle-2.mp3': "My lamp's getting bored."
  };

  // Per-trigger minimum gap so chatty triggers (attack/hurt) never spam.
  // Rare triggers (spawn/super/death/win) have no throttle.
  var COOLDOWN_MS = { spawn: 0, attack: 4500, super: 0, kill: 1200, hurt: 2500, death: 0, win: 0, idle: 20000 };

  var enabled = true;
  var cache = new Map();
  var deadFiles = new Set();
  var lastPlayed = {};
  var lastIndex = {};

  function resolveUrl(file) {
    try {
      if (typeof document !== 'undefined' && document.baseURI) return new URL(BASE + file, document.baseURI).href;
    } catch (e) { /* fall through to the relative path */ }
    return BASE + file;
  }

  function nowMs() {
    try { return performance.now(); } catch (e) { return Date.now(); }
  }

  // Play one random line for a trigger. Returns true if playback started.
  // Never throws, never rejects: any failure marks the clip dead and stays silent.
  function play(trigger) {
    try {
      if (!enabled) return false;
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (typeof Audio === 'undefined') return false;
      var files = LINES[trigger];
      if (!files || !files.length) return false;
      var now = nowMs();
      if (now - (lastPlayed[trigger] || 0) < (COOLDOWN_MS[trigger] || 0)) return false;
      var idx = Math.floor(Math.random() * files.length);
      if (files.length > 1 && idx === lastIndex[trigger]) idx = (idx + 1) % files.length;
      lastIndex[trigger] = idx;
      lastPlayed[trigger] = now;
      var file = files[idx];
      if (deadFiles.has(file)) return false;
      var audio = cache.get(file);
      if (!audio) {
        audio = new Audio(resolveUrl(file));
        audio.volume = 0.9;
        audio.preload = 'auto';
        audio.addEventListener('error', function () { deadFiles.add(file); });
        cache.set(file, audio);
      }
      try { audio.currentTime = 0; } catch (e) { /* some browsers throw before metadata loads */ }
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () { deadFiles.add(file); });
      return true;
    } catch (e) {
      return false;
    }
  }

  function fileCount() {
    var n = 0;
    for (var k in LINES) n += LINES[k].length;
    return n;
  }

  root.BraweOutlitVoice = Object.freeze({
    play: play,
    lines: LINES,
    text: TEXT,
    cooldowns: COOLDOWN_MS,
    voiceId: VOICE_ID,
    voiceName: VOICE_NAME,
    basePath: BASE,
    fileCount: fileCount,
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; }
  });
})(globalThis);
