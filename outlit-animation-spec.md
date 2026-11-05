# Outlit — Animated 2.5D Model + Voice Lines

Branch: `outlit-animation-voicelines` · Base: main @ a831a5ad (PR #88 merge)
Ordered by Anthony 2026-11-05. **Outlit only. No 3D** ("3d maybe coming soon" = later, not this PR).

> Note: the repo root already has a `SPEC.md` (Sheet Round 41 worker spec) — this
> PR's spec lives in `outlit-animation-spec.md` so that file is not overwritten.

## 1. Outlit, the character (read from the code first)

- **Day-one OG** — first id in the original `allBrawlers` list (June 3, 2026). Default selected brawler, starter unlock, fallback brawler everywhere (`selectedBrawler = 'outlit'`, bot fallback, tutorial).
- **Identity:** Common, Damage Dealer, **Close-range**. Colour `#ff9b42` (orange). Portrait icon 🔫.
- **Kit:**
  - Attack — **Scatter Pump**: compact shotgun, tight spread, strong point-blank. Player: 8 pellets × 188 dmg, 256.5px range, 1060ms reload, 200ms fire delay. Bots: 6 pellets × 146. Hypercharge: double shot, 40% less spread, pierces.
  - Super — **Boom Break**: 3 oversized shock pellets (767 dmg) that knock enemies back; hitting metal arcs through up to 5 walls for 90/80/70/60/50% damage. Hyper: pierces enemies.
  - Gadgets: Next Shot Pierce / Healing Pod. Star Powers: Shell Chill (slows; +2 ammo on Super) / Long Boom (+35% Super range, +15% main range).
  - Special ability — **Overpressure** (mutation): every 8 main attacks, the next 4 Scatter Pumps get +100% range and 50% faster unload.
- **Stats:** no `getScaledStats` special-case — generic fallback for role "Close-range": P1 5,400 HP / 1,500 dmg / 260 speed → **P11 10,400 HP / 2,050 dmg / 280 speed** (the dmg figure is unused in practice; per-pellet damage is hardcoded 188 in `fireOutlitMain`). P12: 10,900 / 2,105 / 282.
- **Visual identity** (`modules/visuals/roster-2p5d.js`): robot look `#ffc52f` / `#20e7ef`; identity `signal_lamp|light_caster|power_cell|lean` — a lamp-headed robot whose weapon casts light and whose chest carries a power cell. **Theme: light.** His name is the joke and the character: he is lit, and he turns other people's lights out.
- **Skins:** Electrified Outlit, Nutcracker Outlit, **Nightmare Outlit** (Forgeaween bespoke — has its own hand-drawn branch in `drawFeatured2p5DBrawler`, with demonic wings while Hypercharged).

## 2. Animated 2.5D model — 7 states

Implemented in `modules/visuals/roster-2p5d.js` (`draw()` + new exported `animationState(entity, now)`). The state machine is generic (every fighter gets walk/idle/hurt/death/win poses); Outlit gets bespoke extras. States resolve in this priority: **death > win > hurt > super > attack > walk > idle**.

| State | Trigger (gameplay field) | What you see |
|---|---|---|
| idle | alive, still, no recent combat | gentle breathing bob; **signal lamp glows** (pulsing cyan) |
| walk | `vx`/`vy` speed > 30 | step bob, lean into motion, swinging hand |
| attack | `visualAttackAt` < 180ms | existing per-fighter recoil + **Outlit pump-action muzzle flash** (bright cone along aim) + lamp flare |
| super | `visualSuperAt` < 500ms | shock ring + **3 Boom Break pellet streaks** radiating at −0.115 / 0 / +0.115 rad (matches the real Super spread) |
| hurt | `outlitHurtAt` < 260ms, stamped in `checkHit` | flinch shake backwards + red flash wash |
| death | `hp <= 0` (+ `outlitDeathAt`, stamped in `checkHit`) | falls sideways, sinks, fades over 450ms; lamp goes dark |
| win | `outlitWinAt` set at match end | victory bounce + halo ring + lamp flare |

**Reachability notes (verified, not assumed):**
- The in-match draw path is `drawBrawlerPortrait` → `drawFeatured2p5DBrawler` → `BraweRosterVisuals.draw`. Outlit is NOT in `CUSTOM_BRAWLER_PORTRAITS`, so the base + Electrified + Nutcracker skins all flow through the roster `draw()` — the states trigger from real gameplay fields (`visualAttackAt`/`visualSuperAt` are stamped by `fire()`/`fireSuper()`; `vx`/`vy` are the entity's real velocity).
- **Nightmare Outlit** bypasses the roster draw (bespoke branch in `drawFeatured2p5DBrawler`), so the same three visible states (hurt shake, death fall, win bounce) were added to that branch in `game.js`.
- **Death caveat:** dead fighters are not drawn in-match (`aliveBots` filters `hp > 0`; the player draw is gated on `player.hp > 0`). So the death *pose* renders wherever a dead entity is still drawn (boss direct draws, test harness), and the in-match death moment is covered by a visible **death-burst FX** instead: a dimming orange lamp ring (`fxKind: 'outlitDeathBurst'`) + floating text "💡 LIGHTS OUT!", spawned by the voice watcher at the death transition. The win pose IS visible in-match (player alive behind the results overlay).

## 3. Voice lines — 24 lines, written by Cosmo

**TTS voice (BUILDER PICK — flag for Anthony): `Twenty` (`avocado_v2:Twenty`) — bold, heroic American male.** Chosen for a cocky day-one OG shotgun brawler. If Anthony wants a different voice (e.g. Helio, the friendly default, or a younger/raspier read), every clip can be re-rendered from the text list below with one command each — no code changes needed, filenames stay the same.

- Format: MP3, 64 kbps, 24 kHz mono. 24 files, **463 KB total** (1.4–4.0s each, ~58s total), in `assets/voice/outlit/`.
- Playback: `modules/audio/outlit-voicelines.js` (`window.BraweOutlitVoice`, loaded by `bootstrap.js` right after the roster visuals). Lazy `Audio` per clip, cached; random pick per trigger, no immediate repeats; cooldowns: attack 4.5s, hurt 2.5s, kill 1.2s, idle 20s (spawn/super/death/win unthrottled). Skips playback while the tab is hidden. **Any failure (missing file, decode error, autoplay block) marks the clip dead and stays silent — the game never breaks on audio.**

### Full line list (Anthony can veto/rewrite any line)

| Trigger | File | Line |
|---|---|---|
| spawn | spawn-1.mp3 | "Lights on. Let's go." |
| spawn | spawn-2.mp3 | "Outlit's in the arena. Try and keep up." |
| spawn | spawn-3.mp3 | "Locked, loaded, and lit." |
| attack | attack-1.mp3 | "Eat buckshot!" |
| attack | attack-2.mp3 | "Point blank!" |
| attack | attack-3.mp3 | "Scatter!" |
| attack | attack-4.mp3 | "Pump it up!" |
| super | super-1.mp3 | "Boom Break!" |
| super | super-2.mp3 | "Lights out!" |
| super | super-3.mp3 | "Three shots. No survivors." |
| kill | kill-1.mp3 | "Lights out for you." |
| kill | kill-2.mp3 | "Down. Who's next?" |
| kill | kill-3.mp3 | "Point blank. Ouch." |
| hurt | hurt-1.mp3 | "Hey! Watch the lamp!" |
| hurt | hurt-2.mp3 | "Ow! That actually hurt!" |
| hurt | hurt-3.mp3 | "You scratched the paint!" |
| death | death-1.mp3 | "Lights... fading..." |
| death | death-2.mp3 | "Tell the lamp... I tried." |
| death | death-3.mp3 | "Out... lit..." |
| win | win-1.mp3 | "And that's why I'm the OG." |
| win | win-2.mp3 | "Still lit. Still standing." |
| win | win-3.mp3 | "Day one, and still number one." |
| idle | idle-1.mp3 | "Hello? Anyone still out there?" |
| idle | idle-2.mp3 | "My lamp's getting bored." |

### Trigger wiring (all in `game.js`, all guarded so a missing voice module is a no-op)

| Trigger | Hook |
|---|---|
| spawn | `updateOutlitVoiceState()` (new watcher, called from `loop()` after `update()`) — `playing` flips false→true, `selectedBrawler === 'outlit'` |
| attack | `fire()` — right after `fromEntity.visualAttackAt = now`, player Outlit only |
| super | `fireSuper()` — right after `player.visualSuperAt = now`, Outlit only |
| kill | `handleTrinketDamageDealt()` — inside the existing player-kill detection (target hp ≤ 0, 1200ms guard) |
| hurt | watcher — player HP drops frame-over-frame (throttled 2.5s in the module) |
| death | watcher — `gameOver` flips false→true with `player.hp <= 0`; also stamps `player.outlitDeathAt` + spawns the death-burst FX |
| win | watcher — `gameOver` flips false→true with `player.hp > 0`; stamps `player.outlitWinAt` (drives the win pose) |
| idle | watcher — alive, unmoving, no attack and no damage for 20s (25s between idle lines) |

Why a watcher in `loop()` instead of hooking match start/end directly: `update(dt)` returns early once `gameOver` is set, so it can never see the game-over transition; match start/end is scattered across dozens of mode-specific launchers and `gameOver = true` sites. One transition watcher covers every mode.

## 4. Files changed

- `modules/visuals/roster-2p5d.js` — 7-state animation machine in `draw()` + exported `animationState()`; Outlit lamp glow / muzzle flash / Boom Break streaks.
- `modules/audio/outlit-voicelines.js` — NEW: voice module (`window.BraweOutlitVoice`).
- `assets/voice/outlit/*.mp3` — NEW: 24 clips, 463 KB total.
- `game.js` — 6 small hook sites (attack/super/kill voice, `checkHit` hurt+death stamps, death-burst FX render branch, Nightmare-branch states) + `updateOutlitVoiceState()` watcher + `loop()` call. **No kit numbers changed.**
- `bootstrap.js` — loads the voice module after the roster visuals.
- `tests/outlit-animation-voicelines-regression.mjs` — NEW: 49 checks (live state resolution + draw, voice map/files/playback safety, hook presence, kit pins, no-3D guard).
- `outlit-animation-spec.md`, `pr-body.md` — this spec + the draft PR body.

## 5. Decisions for Anthony

1. **TTS voice:** Twenty (bold/heroic). Veto → re-render, no code change.
2. **Any line to rewrite/cut?** Full list in §3 above (also in `pr-body.md`).
3. **No 3D in this PR** per his "3d maybe coming soon" — 2.5D canvas only.
4. **Death pose visibility:** in-match the body stops rendering on death, so the death moment reads via the lamp-guttering burst FX + "LIGHTS OUT!" text, not the falling body. If he wants the body to linger and fall on screen, that's a render-gate change for a follow-up, not this PR.
