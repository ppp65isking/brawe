// Hypercharge activation SFX — one unique sting per playable brawler (97).
// Brawl-Stars-style template, researched 2026-11-05: a sharp high-pitched
// chime + low hum + booming electronic burst, one punchy ~1s sting on
// activation. No looping pulse while hypercharged: Brawl Stars has no
// equivalent — the activation sting IS the sound (builder pick, flagged).
// Uniqueness is procedural (numpy/scipy, see /tmp/synth_hc.py): root pitch
// from the brawler's color hue on a pentatonic ladder, a role-family flavor
// layer (damage/tank/assassin/support/controller/marksman/thrower/close/
// artillery/specialist), id-hash jitter, and a per-id noise seed — no two
// stings are identical. Named overrides: outlit (lamp hum + electric
// crackle), fuser (fuse crackle + reactor surge), mallow (soft pop),
// nightshade (poison hiss), bolznstien (lightning crack + thunder rumble).
// Player-only (builder pick — flag the bot question for Anthony).
// Synthesized, not recorded: assets/sfx/hc/<id>.mp3, MP3 64kbps / 24kHz /
// mono, ~1.0s each. Replaces modules/audio/outlit-sfx.js (Outlit-only
// sting + quiet pulse — Anthony rejected the pulse: it did not sound like
// a real hypercharge attack SFX). Loaded as a classic script before game.js
// (see bootstrap.js). If this file is missing or audio fails to load, every
// call degrades to a silent no-op: the game must never break on missing audio.
(function (root) {
  'use strict';

  var BASE = 'assets/sfx/hc/';
  // brawler id -> sting file. Exactly the 97 playable brawlers (allBrawlers
  // minus the 8 disabled slated for deletion). Generated from the roster.
  var FILES = {
    'aegis': 'aegis.mp3',
    'amplifier': 'amplifier.mp3',
    'angel': 'angel.mp3',
    'anti_royal': 'anti_royal.mp3',
    'aura_charmer': 'aura_charmer.mp3',
    'awakenator': 'awakenator.mp3',
    'axeywaxy': 'axeywaxy.mp3',
    'badbat': 'badbat.mp3',
    'beam': 'beam.mp3',
    'beast': 'beast.mp3',
    'blinkeye': 'blinkeye.mp3',
    'bolznstien': 'bolznstien.mp3',
    'boom_arang': 'boom_arang.mp3',
    'bouncin_balls': 'bouncin_balls.mp3',
    'bowlin_rida': 'bowlin_rida.mp3',
    'carmela_fudge': 'carmela_fudge.mp3',
    'chaird': 'chaird.mp3',
    'cheseypuff': 'cheseypuff.mp3',
    'chickpig': 'chickpig.mp3',
    'cinderion': 'cinderion.mp3',
    'classy': 'classy.mp3',
    'copyphase': 'copyphase.mp3',
    'crystila': 'crystila.mp3',
    'cursed': 'cursed.mp3',
    'darkener': 'darkener.mp3',
    'dashaholic': 'dashaholic.mp3',
    'decayer': 'decayer.mp3',
    'demon': 'demon.mp3',
    'draflygon': 'draflygon.mp3',
    'drainbow': 'drainbow.mp3',
    'echo': 'echo.mp3',
    'electrostien': 'electrostien.mp3',
    'evil_doctor': 'evil_doctor.mp3',
    'fastpass': 'fastpass.mp3',
    'feathers': 'feathers.mp3',
    'fightnfire': 'fightnfire.mp3',
    'forest': 'forest.mp3',
    'freestyle': 'freestyle.mp3',
    'fuel': 'fuel.mp3',
    'fuser': 'fuser.mp3',
    'ghoul': 'ghoul.mp3',
    'goonbob': 'goonbob.mp3',
    'healnstein': 'healnstein.mp3',
    'heater_miser': 'heater_miser.mp3',
    'homer': 'homer.mp3',
    'hoop': 'hoop.mp3',
    'hope': 'hope.mp3',
    'hunter': 'hunter.mp3',
    'hyperorigin': 'hyperorigin.mp3',
    'ice_cream': 'ice_cream.mp3',
    'jacktrade': 'jacktrade.mp3',
    'jetpack': 'jetpack.mp3',
    'kage': 'kage.mp3',
    'king': 'king.mp3',
    'looma': 'looma.mp3',
    'mageny': 'mageny.mp3',
    'magnatar': 'magnatar.mp3',
    'malakor': 'malakor.mp3',
    'mallow': 'mallow.mp3',
    'minigunnin': 'minigunnin.mp3',
    'money_and_tax': 'money_and_tax.mp3',
    'nightshade': 'nightshade.mp3',
    'oil_maker': 'oil_maker.mp3',
    'orbo': 'orbo.mp3',
    'outlit': 'outlit.mp3',
    'overlord': 'overlord.mp3',
    'paradox': 'paradox.mp3',
    'peter_pickle': 'peter_pickle.mp3',
    'portalo': 'portalo.mp3',
    'predator': 'predator.mp3',
    'rager': 'rager.mp3',
    'ramage': 'ramage.mp3',
    'relay': 'relay.mp3',
    'rocketeer': 'rocketeer.mp3',
    'runner': 'runner.mp3',
    'screener': 'screener.mp3',
    'scuba_diver': 'scuba_diver.mp3',
    'sera_eclipse': 'sera_eclipse.mp3',
    'sir_cheeseburger': 'sir_cheeseburger.mp3',
    'skeleflying': 'skeleflying.mp3',
    'snapper': 'snapper.mp3',
    'spikey': 'spikey.mp3',
    'splitter': 'splitter.mp3',
    'staticstein': 'staticstein.mp3',
    'steamer': 'steamer.mp3',
    'teether': 'teether.mp3',
    'tempo_maker': 'tempo_maker.mp3',
    'trampaheal': 'trampaheal.mp3',
    'trapper': 'trapper.mp3',
    'unopcoloco': 'unopcoloco.mp3',
    'unstable': 'unstable.mp3',
    'upgradart': 'upgradart.mp3',
    'upiedown': 'upiedown.mp3',
    'voltastein': 'voltastein.mp3',
    'warrior': 'warrior.mp3',
    'weefee': 'weefee.mp3',
    'xray': 'xray.mp3'
  };

  var enabled = true;
  var cache = new Map();
  var deadFiles = new Set();
  var lastActivateAt = 0;

  function resolveUrl(file) {
    try {
      if (typeof document !== 'undefined' && document.baseURI) return new URL(BASE + file, document.baseURI).href;
    } catch (e) { /* fall through to the relative path */ }
    return BASE + file;
  }

  function nowMs() {
    try { return performance.now(); } catch (e) { return Date.now(); }
  }

  function fileFor(brawlerId) {
    if (!brawlerId) return undefined;
    return FILES[brawlerId];
  }

  function playFile(file, volume) {
    try {
      if (!enabled) return false;
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (typeof Audio === 'undefined') return false;
      if (deadFiles.has(file)) return false;
      var audio = cache.get(file);
      if (!audio) {
        audio = new Audio(resolveUrl(file));
        audio.preload = 'auto';
        audio.addEventListener('error', function () { deadFiles.add(file); });
        cache.set(file, audio);
      }
      audio.volume = volume;
      try { audio.currentTime = 0; } catch (e) { /* some browsers throw before metadata loads */ }
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () { deadFiles.add(file); });
      return true;
    } catch (e) {
      return false;
    }
  }

  // One-shot sting on hypercharge activation for the given brawler.
  // Unknown brawler id or missing file degrades to silent false.
  // Throttled so a double activation (button mashing, Core Surge re-arm)
  // never stacks the sting.
  function playActivation(brawlerId) {
    var now = nowMs();
    if (now - lastActivateAt < 1000) return false;
    var file = fileFor(brawlerId);
    if (!file) return false;
    lastActivateAt = now;
    return playFile(file, 0.9);
  }

  function playableIds() {
    return Object.keys(FILES);
  }

  root.BraweHyperchargeSfx = Object.freeze({
    playActivation: playActivation,
    fileFor: fileFor,
    playableIds: playableIds,
    fileCount: function () { return Object.keys(FILES).length; },
    basePath: BASE,
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; }
  });
})(globalThis);
