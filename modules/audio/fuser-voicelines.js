// Fuser voice lines — 24 TTS clips, one voice, wired to match triggers.
// RULE ONE (Anthony, 2026-11-05): voice lines NEVER explain what attacks do —
// no counts, ranges, damage, or mechanics in any line. Battle-cry NAMES
// ("Wall-Fuser Barrage!") are not explanations and stay.
// Voice: Speedy Scooter (avocado_v2:vd2_r82_rep5k_0048_v068_28k_g5k) —
// mid-pitched, fast pacing, energetic but relatively flat delivery. The flat
// delivery is the robotic edge; the pace is the energy. Builder pick: if
// Anthony wants more robot, re-render from the text below in Sober Pendulum
// (explicitly mechanical robotic, deep/slow) or Deadpan Clock (android, flat,
// metallic edge) — no code changes needed, filenames stay the same.
// Rendered at speed 110. Loaded as a classic script before game.js (see
// bootstrap.js). If this file is missing or audio fails to load, every call
// degrades to a silent no-op: the game must never break on missing audio.
(function (root) {
  'use strict';

  var BASE = 'assets/voice/fuser/';
  var VOICE_ID = 'avocado_v2:vd2_r82_rep5k_0048_v068_28k_g5k';
  var VOICE_NAME = 'Speedy Scooter';

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
    'spawn-1.mp3': "Fuser online. Try to keep up, twin.",
    'spawn-2.mp3': "Reactor's roaring. Outlit, watch and learn!",
    'spawn-3.mp3': "Reactor's hot. Let's fuse some fools.",
    'attack-1.mp3': "Coming in hot!",
    'attack-2.mp3': "Double trouble, twin!",
    'attack-3.mp3': "Fuse lit!",
    'attack-4.mp3': "Eat plasma!",
    'super-1.mp3': "Wall-Fuser Barrage!",
    'super-2.mp3': "Fuser unleashed!",
    'super-3.mp3': "Reactor at full blast!",
    'kill-1.mp3': "Fused. Next!",
    'kill-2.mp3': "You're short-circuited.",
    'kill-3.mp3': "Twin beats twin. Every time.",
    'hurt-1.mp3': "Hey! My reactor's sensitive!",
    'hurt-2.mp3': "Ow! System shock!",
    'hurt-3.mp3': "You dented the suit!",
    'death-1.mp3': "Reactor... failing...",
    'death-2.mp3': "Tell Outlit... he got lucky...",
    'death-3.mp3': "Fusing... out...",
    'win-1.mp3': "Fuser wins. The twin takes the crown.",
    'win-2.mp3': "One twin standing. Me.",
    'win-3.mp3': "Outlit who? I'm the upgrade.",
    'idle-1.mp3': "Hello? Did everyone fuse out?",
    'idle-2.mp3': "My reactor's getting bored."
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

  root.BraweFuserVoice = Object.freeze({
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
