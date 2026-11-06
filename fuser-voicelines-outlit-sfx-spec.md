# Fuser Voice Lines + Outlit Mutation Lines/SFX

Branch: `fuser-voicelines-outlit-sfx` · Base: main @ `5d36fd9` (PR #89 merge),
then merged main @ `0de8da0` (PR #90, HP curve + Family Circuit) — merge
commit `f91c664`, clean auto-merge, no conflicts.
Ordered by Anthony 2026-11-05. One PR, two pieces. **No kit numbers changed
anywhere. No 3D.**

> Note: the repo root already has a `SPEC.md` (Sheet Round 41 worker spec) —
> this PR's spec lives here as `fuser-voicelines-outlit-sfx-spec.md` so that
> file is untouched.

## 1. Fuser, the character (read from the code first)

- **Outlit's evil twin** (family lore) — starter unlock alongside Outlit and
  Rocketeer. Damage Dealer, colour `#ff4d6d`, icon 🧨.
- **Kit** (`brawlerData.fuser`):
  - Attack — **Six-Fuse Salvo**: 6 rapid bullets, 360 dmg each (bots 242),
    alternating parallel left/right lanes, +50% faster unload, +50%
    projectile speed. Hyper: 41ms delay (vs 96ms), lanes clamped to ±5px.
  - Super — **Wall-Fuser Barrage**: 14 piercing bullets, 3,400 total, break
    through walls, +50% projectile speed. Hyper: bullets return.
  - Gadgets: Wall Fuse (next attack pierces walls) / Spare Magazine (instant
    +2 ammo). Star Powers: Healing Fuse (every 4th attack shoots 2 healing
    bullets, 800 HP each) / Family Shield (bullets grant allies a 120 shield).
  - Hypercharge — **Return to Sender**: Super bullets return; main unloads
    50% faster with lanes clamped closer, but main bullets never return.
- **Visual identity**: split-core reactor suit, cyan-and-violet energy form
  while Hypercharged (per the skin description). Theme: reactor / fuse /
  plasma / twin rivalry with Outlit.

## 2. Fuser voice lines — 24 lines, written by Cosmo

**TTS voice (BUILDER PICK — flag for Anthony): `Speedy Scooter`
(`avocado_v2:vd2_r82_rep5k_0048_v068_28k_g5k`) — mid-pitched Australian,
fast pacing, energetic but relatively flat delivery. Rendered at speed 110.**
The flat delivery is the robotic edge; the pace is the energy. No catalog
voice is literally "robotic + human + energetic" at once — the two closest
alternatives, both flatter/slower, are **Sober Pendulum**
(`avocado_v2:vd2_measured_pendulum`, explicitly "mechanical robotic
delivery", very deep, composed, moderate pacing) and **Deadpan Clock**
(`avocado_v2:pb1_android_06`, calm android, crisp, flat, faint metallic
edge). If Anthony wants more robot, every clip re-renders from the text
below in either voice with no code changes (filenames stay the same).

- Format: MP3, 64 kbps, 24 kHz mono (same as Outlit's). 24 files,
  **376 KB total** (was 398 KB before the Rule One rewrites), in `assets/voice/fuser/`.
- Playback: `modules/audio/fuser-voicelines.js` (`window.BraweFuserVoice`,
  a line-for-line mirror of `outlit-voicelines.js`): lazy `Audio` per clip,
  cached; random pick per trigger, no immediate repeats; cooldowns: attack
  4.5s, hurt 2.5s, kill 1.2s, idle 20s (spawn/super/death/win unthrottled).
  Skips playback while the tab is hidden. **Any failure (missing file,
  decode error, autoplay block) marks the clip dead and stays silent — the
  game never breaks on audio.**

### Full line list (Anthony can veto/rewrite any line)

> **RULE ONE (Anthony, 2026-11-05): voice lines NEVER explain what attacks do —
> no counts, ranges, damage, or mechanics in any line.** Battle-cry NAMES
> ("Boom Break!", "Wall-Fuser Barrage!", "Overpressure!") are NOT explanations
> and stay. Audit table + borderline keeps in §7.

| Trigger | File | Line |
|---|---|---|
| spawn | spawn-1.mp3 | "Fuser online. Try to keep up, twin." |
| spawn | spawn-2.mp3 | "Reactor's roaring. Outlit, watch and learn!" |  <!-- Rule One rewrite 2026-11-05 -->
| spawn | spawn-3.mp3 | "Reactor's hot. Let's fuse some fools." |
| attack | attack-1.mp3 | "Coming in hot!" |  <!-- Rule One rewrite 2026-11-05 -->
| attack | attack-2.mp3 | "Double trouble, twin!" |  <!-- Rule One rewrite 2026-11-05 -->
| attack | attack-3.mp3 | "Fuse lit!" |
| attack | attack-4.mp3 | "Eat plasma!" |
| super | super-1.mp3 | "Wall-Fuser Barrage!" |
| super | super-2.mp3 | "Fuser unleashed!" |  <!-- Rule One rewrite 2026-11-05 -->
| super | super-3.mp3 | "Reactor at full blast!" |  <!-- Rule One rewrite 2026-11-05 -->
| kill | kill-1.mp3 | "Fused. Next!" |
| kill | kill-2.mp3 | "You're short-circuited." |
| kill | kill-3.mp3 | "Twin beats twin. Every time." |
| hurt | hurt-1.mp3 | "Hey! My reactor's sensitive!" |
| hurt | hurt-2.mp3 | "Ow! System shock!" |
| hurt | hurt-3.mp3 | "You dented the suit!" |
| death | death-1.mp3 | "Reactor... failing..." |
| death | death-2.mp3 | "Tell Outlit... he got lucky..." |
| death | death-3.mp3 | "Fusing... out..." |
| win | win-1.mp3 | "Fuser wins. The twin takes the crown." |
| win | win-2.mp3 | "One twin standing. Me." |  <!-- Rule One rewrite 2026-11-05 -->
| win | win-3.mp3 | "Outlit who? I'm the upgrade." |
| idle | idle-1.mp3 | "Hello? Did everyone fuse out?" |
| idle | idle-2.mp3 | "My reactor's getting bored." |

### Trigger wiring (all in `game.js`, all guarded so a missing voice module is a no-op)

Mirrors Outlit exactly: attack in `fire()`, super in `fireSuper()`, kill in
`handleTrinketDamageDealt()`, plus a new `updateFuserVoiceState()` watcher
called from `loop()` right after `updateOutlitVoiceState()` for
spawn/win/death/idle/hurt. Player-only, like Outlit's. Fuser gets no
animation poses in this PR (voice only) — no `checkHit` stamps were added.

## 3. Outlit mutation lines + SFX

### Mutation trigger (verified in code first)

Overpressure (`SPECIAL_ABILITY_DEFS.outlit`, type mutation): **every 8 main
attacks, the next 4 Scatter Pumps get +100% range and 50% faster unload.**
`recordOutlitMutationShot()` (called from `fireOutlitMain`) counts to 8,
then sets `entity.outlitMutationCharges = 4` + `outlitMutationReadyAt`,
pushes an `outlitMutationReady` explosion FX, and for the player shows
`OVERPRESSURE READY` floating text. The voice hook sits in that same block
(player only): when the mutation arms, one random mutation line plays.

### Mutation lines — 3 NEW lines, voice Twenty (Outlit's own voice)

**BUILDER PICK — count is 3, flag for Anthony.** With SFX baked in (below),
so each clip is a line + its sound effect in one file:

| File | Line |
|---|---|
| mutation-1.mp3 | "Overpressure! Light it up!" |  <!-- Rule One rewrite 2026-11-05 -->
| mutation-2.mp3 | "Pressure's peaking, time to blow this wide open!" |
| mutation-3.mp3 | "Full pressure! Nobody's safe now!" |

Trigger added to `modules/audio/outlit-voicelines.js` (`mutation`, cooldown
0 — the 8-attack arming cadence is the throttle). Outlit's file count is
now 27 (24 + 3); the existing Outlit suite was updated for the new total.

### Mutation SFX — real synthesized sound, baked into the clips

**Not silence, not placeholders.** Synthesized with numpy/scipy
(`/tmp/synth_sfx.py`, documented here so it can be re-run): a 1.8s bed of
rising pressure-charge whoosh (bandpassed noise sweeping 400→3,500 Hz over
0.8s) + boom at 0.8s (sine drop 120→35 Hz + noise burst + metallic valve
clang partials 620/930/1,470 Hz). Each mutation line was mixed voice-first
(150ms delay, bed at 0.45 volume) and encoded MP3 64 kbps / 24 kHz / mono.
Verified with ffprobe + volumedetect: 3.58s / 4.04s / 3.08s, mean
-25.4 / -25.8 / -22.5 dB, max -4.0 / -5.7 / -5.0 dB (no clipping).

## 4. Hypercharge SFX — rebuilt Brawl-Stars-style, unique per brawler

**REWORK 2026-11-05:** Anthony rejected the shipped Outlit HC pulse ("doesn't
sound like a real hc attack sfx") and ordered a Brawl-Stars-style sound, unique
for each brawler. The old `modules/audio/outlit-sfx.js` (Outlit-only sting +
quiet pulse) and `assets/sfx/outlit/hc-activate.mp3` + `hc-pulse.mp3` are
DELETED. Replaced by `modules/audio/hypercharge-sfx.js` (`window.BraweHyperchargeSfx`)
and 97 stings in `assets/sfx/hc/<id>.mp3`.

### Brawl Stars research (web, 2026-11-05)

- The in-game hypercharge activation is **three synthetic sounds timed to the
  UI: a sharp chime, a low hum, and a booming electronic burst** (Lazy Dingo
  clip summary, Oct 2025). A second source calls it **a synthetic,
  high-pitched chime — the hypercharge power-up sound effect** (Feb 2025 meme
  using the exact in-game cue). Parent's earlier finding matches: Kaze's HC
  activation is a high-pitched laser + rapid percussive hits + low rumble
  with a big energy field.
- **No looping pulse while hypercharged was found anywhere** — the activation
  is a one-shot sting. The quiet pulse is dropped (builder pick, flagged).

### Design (synthesized, numpy/scipy — `/tmp/synth_hc.py`, re-runnable)

Shared template, ~1.0s, MP3 64kbps / 24kHz / mono, peak-normalized to 0.92:
0.00s chime ping 1 (root×4 + harmonic) + ~0.12s chime ping 2 (root×6);
0.00–0.45s riser sweep (root → root×2.2) + noise sweep; 0.15–1.00s low hum
(root/2 swell); 0.45s booming burst (sine drop 150→38 Hz + lowpassed noise +
thump); 0.45–1.00s shimmer tail (root×8).

Per-brawler uniqueness (the theme parameters ARE the uniqueness — no
hand-crafted recordings):
- **Root pitch from the brawler's color hue** (pentatonic ladder on 220 Hz).
- **Role-family flavor layer:** damage (saw riser + crunch), tank (deeper boom
  + heavier hum), assassin (laser zip + snap), support (warm 3-note arpeggio),
  controller (tremolo shimmer + pulsing hum), marksman (clean ping + crack),
  thrower (lob whistle + pop), close-range (lamp hum + crackle), artillery
  (whistle + bigger boom), specialist (detuned chorus shimmer).
- **Id-hash jitter** (±1 semitone, riser rate, ping timing) + **per-id noise
  seed**, so no two stings are identical (verified: 97 unique md5s).
- **Named overrides:** Outlit (lamp hum 60/120 Hz + electric crackle),
  Fuser (fuse crackle + reactor surge), Mallow (soft marshmallow pop),
  Nightshade (poison hiss), Bolznstien (lightning crack + thunder rumble).

Wiring: `playActivation(brawlerId)` in `activateHypercharge()` (replaces the
Outlit-only hook), 1s anti-stack throttle, **player-only** (builder pick —
flag the bot question for Anthony). Unknown/missing brawler degrades to
silent false. File map in the module covers exactly the 97 playable ids
(`allBrawlers` minus the 8 disabled slated for deletion).

## 5. Files changed (final)

- `modules/audio/fuser-voicelines.js` — NEW: Fuser voice module (Rule One
  rewrites in TEXT map, §2).
- `assets/voice/fuser/*.mp3` — NEW: 24 clips, 376 KB total.
- `modules/audio/outlit-voicelines.js` — `mutation` trigger added (3 files +
  text + cooldown 0); Rule One rewrites in TEXT map (attack-2, kill-3,
  super-3, mutation-1).
- `assets/voice/outlit/*.mp3` — 27 clips (24 + 3 mutation), 537 KB total.
  `super-3.mp3` is a change to a clip already on main — included in this
  PR's upload list.
- `modules/audio/outlit-sfx.js` — DELETED (replaced by hypercharge-sfx.js).
- `assets/sfx/outlit/*.mp3` — DELETED (`hc-activate.mp3`, `hc-pulse.mp3`).
- `modules/audio/hypercharge-sfx.js` — NEW: per-brawler HC SFX module
  (`window.BraweHyperchargeSfx`, 97-file map).
- `assets/sfx/hc/*.mp3` — NEW: 97 stings, 823 KB total, one per playable
  brawler.
- `game.js` — hook sites (Fuser attack/super/kill, Fuser watcher + state vars
  + `loop()` call, mutation hook, generalized HC sting hook in
  `activateHypercharge()`, pulse tick REMOVED from the Outlit watcher).
  **No kit numbers changed.**
- `bootstrap.js` — loads `fuser-voicelines.js` + `hypercharge-sfx.js` after
  `outlit-voicelines.js`.
- `tests/fuser-voicelines-outlit-sfx-regression.mjs` — 33 checks (6 old
  Outlit-SFX checks moved to the HC suite).
- `tests/outlit-animation-voicelines-regression.mjs` — updated text pins
  (attack-2, kill-3, super-3, mutation-1).
- `tests/hypercharge-sfx-regression.mjs` — NEW: 19 checks (map vs parsed
  roster, files on disk, distinct renders, silent failure, hook, kit pins).
- `fuser-voicelines-outlit-sfx-spec.md`, `pr-body.md` — this spec + PR body
  (pr-body.md is a LOCAL file only — never committed to the branch).

## 6. Decisions for Anthony

1. **Fuser voice:** Speedy Scooter (fast, energetic, flat delivery = robotic
   edge). Swap to Sober Pendulum (more robot, deep/slow) or Deadpan Clock
   (android, flat, metallic) and all 24 clips re-render, no code change.
2. **Rule One rewrites:** 10 lines rewritten (§7). Any others to change?
3. **Mutation line count:** 3. Want more, or different lines?
4. **HC SFX scope:** every playable brawler, player-only. Want bot HCs to
   sting too?
5. **HC pulse:** DROPPED (no Brawl Stars equivalent found). Want any
   while-hypercharged sound back?
6. **File layout:** SFX in `assets/sfx/hc/` (voice vs SFX separation).

## 7. Rule One audit (2026-11-05)

**RULE ONE (Anthony): voice lines must NEVER explain what attacks do — no
counts, ranges, damage, or mechanics in any line.** Battle-cry NAMES are not
explanations and stay. Audited: all 24 Fuser lines, all 3 Outlit mutation
lines, all 24 Outlit original lines (PR #89).

### Rewritten (10)

| File | Old line (violation) | New line |
|---|---|---|
| fuser spawn-2 | "Two lanes. Six rounds. Zero mercy." (counts: lanes + rounds) | "Reactor's roaring. Outlit, watch and learn!" |
| fuser attack-1 | "Six rounds, coming at you!" (count) | "Coming in hot!" |
| fuser attack-2 | "Left lane! Right lane! Both lanes!" (lane mechanic) | "Double trouble, twin!" |
| fuser super-2 | "Walls mean nothing to me!" (wall-pierce mechanic) | "Fuser unleashed!" |
| fuser super-3 | "Fourteen rounds! No cover!" (count + pierce) | "Reactor at full blast!" |
| fuser win-2 | "Six rounds. One winner. Me." (count) | "One twin standing. Me." |
| outlit mutation-1 | "Overpressure! Four shots, double the range!" (count + range) | "Overpressure! Light it up!" |
| outlit attack-2 | "Point blank!" (range word) | "Taste the light!" |
| outlit kill-3 | "Point blank. Ouch." (range word) | "That one left a mark!" |
| outlit super-3 | "Three shots. No survivors." (count) | "Here comes the big one!" |

All 10 re-rendered in the same voice (Fuser: Speedy Scooter @ 110; Outlit:
Twenty @ 100), same house format (MP3 64kbps / 24kHz / mono). Mutation-1
re-mixed with the same SFX bed as the other mutation clips (voice 150ms in,
bed 0.45; 2.84s, max -2.5 dB, no clipping).

### Borderline keeps (flagged — say the word and they get rewritten too)

- Outlit attack-1 **"Eat buckshot!"** — names the weapon, gives no counts,
  ranges, or damage. Kept.
- Outlit attack-3 **"Scatter!"** — one-word battle cry (the attack's name
  root), no mechanics. Kept.
- Fuser attack-4 **"Eat plasma!"** — theme word, no mechanics. Kept.
- Fuser super-1 **"Wall-Fuser Barrage!"**, Outlit super-1 **"Boom Break!"**,
  mutation-1 **"Overpressure!"** — battle-cry NAMES, not explanations. Kept.
- Fuser attack-3 **"Fuse lit!"**, Outlit attack-4 **"Pump it up!"** — pure
  vibe, no mechanics. Kept.

All other lines (Fuser spawn-1/3, kill ×3, hurt ×3, death ×3, win-1/3,
idle ×2; Outlit spawn ×3, super-2, kill-1/2, hurt ×3, death ×3, win ×3,
idle ×2; mutation-2/3) passed clean — no counts, ranges, damage, or
mechanics.
