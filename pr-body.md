# Outlit — Animated 2.5D Model + Voice Lines, + Megastein Boss Event

Two features, one PR: Outlit gets a full animated model and voice lines, and the five Steins fuse into a one-week mega-hard boss.

---

# Outlit — Animated 2.5D Model + Voice Lines

Outlit only. No 3D (that's "coming soon", not this PR).

## Animated 2.5D model (7 states)

`modules/visuals/roster-2p5d.js` now resolves one animation state per frame from real gameplay fields (`animationState(entity, now)`, exported for tests): **idle** (breathing bob + pulsing signal-lamp glow), **walk** (step bob, lean into motion, swinging hand), **attack** (recoil + pump-action muzzle flash + lamp flare), **super** (shock ring + 3 Boom Break pellet streaks at the real Super spread), **hurt** (flinch shake + red flash), **death** (falls sideways, sinks, fades, lamp goes dark), **win** (victory bounce + halo ring). Nightmare Outlit's bespoke branch gets the same hurt/death/win treatment.

One honest caveat: dead fighters aren't drawn in-match (bots filtered by `hp > 0`, player gated on `hp > 0`), so the in-match death moment reads through a new lamp-guttering burst FX + "💡 LIGHTS OUT!" floating text instead of the falling body. The win pose IS visible (you're alive behind the results overlay).

## Voice lines — 24, written by Cosmo

**⚠️ BUILDER PICKS — veto/rewrite freely:**
- **Voice: Twenty (`avocado_v2:Twenty`)** — bold, heroic American male. If you want a different voice, every clip re-renders from the text below with no code changes.
- **The lines themselves** — full list below, cut or rewrite any of them.

24 MP3 clips in `assets/voice/outlit/`, **463 KB total** (~58s). Played by the new `modules/audio/outlit-voicelines.js` (`window.BraweOutlitVoice`): random pick per trigger, no immediate repeats, throttled so attack/hurt can't spam (4.5s / 2.5s). If audio ever fails to load, the game stays silent and never breaks.

| Trigger | Line |
|---|---|
| spawn | "Lights on. Let's go." |
| spawn | "Outlit's in the arena. Try and keep up." |
| spawn | "Locked, loaded, and lit." |
| attack | "Eat buckshot!" |
| attack | "Point blank!" |
| attack | "Scatter!" |
| attack | "Pump it up!" |
| super | "Boom Break!" |
| super | "Lights out!" |
| super | "Three shots. No survivors." |
| kill | "Lights out for you." |
| kill | "Down. Who's next?" |
| kill | "Point blank. Ouch." |
| hurt | "Hey! Watch the lamp!" |
| hurt | "Ow! That actually hurt!" |
| hurt | "You scratched the paint!" |
| death | "Lights... fading..." |
| death | "Tell the lamp... I tried." |
| death | "Out... lit..." |
| win | "And that's why I'm the OG." |
| win | "Still lit. Still standing." |
| win | "Day one, and still number one." |
| idle | "Hello? Anyone still out there?" |
| idle | "My lamp's getting bored." |

## Wiring

- Spawn/win/death/idle/hurt: one transition watcher (`updateOutlitVoiceState()`, called from `loop()` after `update()`) — covers every mode, since match start/end has no single call site and `update()` returns early once `gameOver` is set.
- Attack: `fire()` (player Outlit only). Super: `fireSuper()`. Kill: the existing player-kill detection in `handleTrinketDamageDealt()`.
- Hurt/death pose stamps in `checkHit()` (Outlit targets only, structures excluded).

## Verification (Outlit)

- `node --check` clean on `game.js`, `bootstrap.js`, `modules/visuals/roster-2p5d.js`, `modules/audio/outlit-voicelines.js`.
- New `tests/outlit-animation-voicelines-regression.mjs`: **49/49 pass** — all 7 states resolve + draw live with a stub ctx, voice map/text/files verified on disk, playback degrades silently with no `Audio`, every hook present, Outlit kit numbers pinned unchanged, no-3D guard.
- **No kit numbers changed** — animation + voice only.

Spec: `outlit-animation-spec.md` (the repo-root `SPEC.md` is the Round 41 sheet spec, left untouched).

---

# Megastein — fused five-Stein one-week boss event

All five Steins (Bolznstien, Electrostien, Voltastein, Staticstein,
Healnstein) fused into ONE mega-hard solo boss, live for **one week from
first load / first home render after this ships**, then dormant. Follows the
Tombstone boss shape (PRs #55/#56), the Beast Boss God Mode featured-card
pattern (PR #66), and the Core Surge Overdrive window pattern (PR #76) —
no new boss framework.

## The fight

- **500,000 HP** (1.67× Tombstone Impossible's 300,000 — see SPEC.md for the
  DPS reasoning), solo arena, lose-on-death, LAST STAND under 15% HP.
- One signature attack per Stein, all reusing the real implementations:
  Bolznstien sky-strike barrage, Electrostien Boltz Chain tether, Voltastein
  Power Outage (slow ramp + DoT, floors at 1 HP, jumps on kill), Staticstein
  random donor shots from the real `STATICSTEIN_DONOR_POOL`, Healnstein
  remedy channel.
- Rewards: **+500 Coins & +150 Souls per win**; **first win also +5 Gems &
  +3 Core Pieces**.

## ⚠️ BUILDER PICKS — Anthony, your call on all of these

1. **Name "Megastein"** — my pick; rename it if you have a better one.
2. **HP 500,000** — my tuning (1.67× Tombstone Impossible). Say the word and
   I'll move it.
3. **Base brawler `bolznstien`** — the generic bot AI gives his sky-strike
   main attack free (same trick as Tombstone borrowing Money & Tax's kit).
4. **No minions** — the five fused attacks are the whole fight. Tombstone
   has skeletroopers; Megastein doesn't. Add some if you want them.
5. **Self-heal = telegraphed 3s REMEDY CHANNEL, healing 8% max HP
   (40,000), interrupted if the boss takes ≥15,000 damage during the
   channel.** Any damage counts toward the interrupt. Alternative was a
   plain periodic heal with no counterplay — I picked the interruptible one.
6. **LAST STAND disables the heal channel** so the finish is achievable.
7. **Rewards: +500 Coins & +150 Souls per win, first win +5 Gems & +3 Core
   Pieces.** Juicy but sane is my guess — adjust any number.
8. **Single tier (no Normal/Hard/Extreme/Impossible ladder).** This boss IS
   the hardest tier. Add a ladder later if you want one.
9. **7-day window, then dormant forever** unless you order a re-run. The
   first-win bonus is tracked so a future re-run would not double-pay it.

## Verification (Megastein)

- `node --check game.js` clean.
- New suite `tests/megastein-boss-regression.mjs` green (boss spawns, all
  five fused attacks fire, heal channel heals + interrupts, HP/reward
  values as specified, window opens/expires/dormant, rewards grant).
- Full regression sweep vs pristine main baseline — diff reported in the
  delivery message (known flakes on pristine main: spikey, magnatar-sp2,
  prop-hunt, environment-phase5-props, github-pages-soul-summoner,
  electrostien).

## Notes

- `game.js` (~5.15MB) exceeds the push-files transport limit, so this PR
  goes up via the web-upload route after your tap — nothing is pushed by
  the agent.
- Kill switch: `MEGASTEIN_BOSS_ENABLED` (default true).

---

## Combined verification

- `node --check` clean on `game.js`, `bootstrap.js`, `modules/visuals/roster-2p5d.js`, `modules/audio/outlit-voicelines.js`.
- Both new suites green: outlit-animation-voicelines **49/49**, megastein-boss **104/104**.
- Full regression sweep vs pristine main @ a831a5ad: no new failures.
