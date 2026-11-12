// Pandy voice lines — 12 TTS clips, one voice, wired to match triggers.
// Voice: TBD — Anthony picks the voice; clips are NOT rendered yet (the
// module degrades to a silent no-op until they exist, same as Outlit's
// module did pre-render). RULE ONE (2026-11-05): voice lines NEVER explain
// what attacks do — no counts, ranges, damage, or mechanics. Flavor only.
// Loaded as a classic script before game.js (see bootstrap.js). If this
// file is missing or audio fails to load, every call degrades to a silent
// no-op: the game must never break on missing audio.
(function (root) {
  'use strict';

  var BASE = 'assets/voice/pandy/';
  var VOICE_ID = 'TBD';
  var VOICE_NAME = 'TBD (Anthony picks the voice)';

  // trigger -> clip files. Filenames are the line ids from the spec.
  var LINES = {
    spawn: ['spawn-1.mp3', 'spawn-2.mp3'],
    attack: ['attack-1.mp3', 'attack-2.mp3'],
    super: ['super-1.mp3'],
    kill: ['kill-1.mp3', 'kill-2.mp3'],
    hurt: ['hurt-1.mp3'],
    death: ['death-1.mp3', 'death-2.mp3'],
    win: ['win-1.mp3'],
    idle: ['idle-1.mp3']
  };

  // Spoken text per clip (subtitle source + regression-test reference).
  var TEXT = {
    'spawn-1.mp3': 'Sugar, spice, and everything nice.',
    'spawn-2.mp3': "The candy aisle's closed. I'm open.",
    'attack-1.mp3': 'Sugarshot!',
    'attack-2.mp3': 'Sweet!',
    'super-1.mp3': 'Candy Cannon!',
    'kill-1.mp3': "That one's on the house.",
    'kill-2.mp3': 'Trick AND treat.',
    'hurt-1.mp3': 'Hey! That stings more than a cavity!',
    'death-1.mp3': 'Melted...',
    'death-2.mp3': 'Somebody save me a seat at the candy store...',
    'win-1.mp3': 'Sweet victory. Obviously.',
    'idle-1.mp3': "The candy store's quiet tonight."
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

  root.BrawePandyVoice = Object.freeze({
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
