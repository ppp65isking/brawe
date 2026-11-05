# Megastein — Fused Five-Stein Limited-Event Boss (SPEC)

One-week limited-event solo boss: all five Steins (Bolznstien, Electrostien,
Voltastein, Staticstein, Healnstein) fused into ONE mega-hard boss.
Branch: `megastein-boss`. Base: main @ a831a5ad (PR #88 merge).

## Patterns followed (no new framework invented)

- **Boss shape — Tombstone Tycoon (PRs #55/#56):** solo arena (2400×2200),
  `isMegasteinBossEvent` flag + `megasteinBossRuntime` object, `init / update /
  render` trio, lose-on-death (`player.bossLives = 1`), generic boss staging
  (bossStage 1→3 by HP, permanent hypercharge) comes free from the shared
  `isBoss` path, win rewards on the normal boss-fight win path.
- **Featured card — Beast Boss God Mode (PR #66):** the card is unshifted into
  the home daily rotation while the event is live; launch is date/window-gated
  with a fallback to solo.
- **Event window — Core Surge Overdrive (PR #76):** state created lazily by
  `ensureMegasteinEventState()` on first load / first home render after
  shipping; `playerData.megastein = { startAt, endAt, wins, firstWinClaimed }`,
  persisted in the save payload next to `overdrive`.

## The boss

- **Name:** Megastein (builder pick — see PR body).
- **Base brawler:** `bolznstien`. The generic bot AI gives his sky-strike main
  attack free, exactly as Tombstone gets Money & Tax's kit free. The boss
  entity is flagged `isMegasteinBoss: true`, team `megastein_enemy`,
  radius 46, speed 150.
- **HP: 500,000.** Tuning reasoning + Tombstone comparison:

  | Boss | HP |
  |---|---|
  | Tombstone Normal | 90,000 |
  | Tombstone Hard | 135,000 |
  | Tombstone Extreme | 200,000 |
  | Tombstone Impossible | 300,000 |
  | **Megastein (single tier)** | **500,000 (1.67× Tombstone Impossible)** |

  A Power 11 fighter sustains roughly 1,500–2,500 DPS, so 500,000 HP is
  ~3.5–5.5 minutes of perfect uptime before the heal tax. The heal channel
  (below) can add up to 40,000 HP per uninterrupted channel, so a player who
  never interrupts pays for it in fight length — the interrupt is the skill
  check that keeps the fight beatable. No minions: the five fused attacks
  are the whole fight (builder pick).

## Fused moveset — one signature attack per Stein, all reused verbatim

| Stein | Attack | Reused code | Cadence |
|---|---|---|---|
| Bolznstien | Sky Strike Barrage — 3 strikes in a triangle on the player, 500 dmg each | `scheduleBolznstienStrikes()` | every 6s (first at 3s) |
| Electrostien | Boltz Chain tether — 250ms ticks, 300/120/30 by distance band (≤120 / ≤240 / ≤360px), breaks past 360px, re-stuck by the scheduler | `stickElectrostienChain()`; ticks run in the existing `updateElectrostienSystems()` | every 8s (first at 5s) |
| Voltastein | Power Outage — the real Super: 400 zap + chain, slow ramps 10%→50% over 4s, DoT 150/s, floors victims at 1 HP, jumps to a nearby enemy on kill | `castVoltasteinSuper()`; ticks/jumps in existing `updateVoltasteinSystems()` | every 14s (first at 9s), 300px zap range from the boss |
| Staticstein | Static Interference — burst of 3 random donor shots from the real `STATICSTEIN_DONOR_POOL` / `STATICSTEIN_DONOR_SHOTS` registry (PR #87), hypercharged 1.5× (boss is permanently hypercharged) | `fireStaticsteinDonorShot()` | every 9s (first at 7s) |
| Healnstein | Remedy Channel — telegraphed 3s channel (green ring + countdown), then heals 8% max HP (40,000). **Interruptible:** if the boss takes ≥15,000 damage during the channel, the channel breaks and no heal happens | new, boss-local | every 25s (first at 25s) |

- **LAST STAND (under 15% HP):** all attack intervals ×0.7, speed ×1.2, and
  the heal channel is **disabled** so the finish is real (builder pick).

## Rewards (builder pick)

- Every win: **+500 Coins & +150 Souls**. Coins ride the generic
  `rewardCoins` boss path; souls are granted by `grantMegasteinBossRewards()`.
- **First win only:** **+5 Gems & +3 Core Pieces** (tracked in
  `playerData.megastein.firstWinClaimed`, so it can never be farmed twice).
- Repeat wins keep paying coins + souls for the rest of the week.

## Event window + dormancy (real, not cosmetic)

- Window: **7 days from first load / first home render after the update
  ships** (`MEGASTEIN_DURATION_MS = 7 * 24 * 60 * 60 * 1000`).
- While live: the card is unshifted to the front of the home daily rotation
  (including patching a rotation cached earlier the same day), the event
  overlay shows days left, and launch works.
- After expiry: `isMegasteinEventActive()` is false, so the card is removed
  from the cached rotation, `openMegasteinBossEvent()` alerts and refuses,
  and `launchShowdownMatch()` falls back to solo with an alert. There is no
  re-arm, no extension, and no permanent unlock unless Anthony orders it.
  `playerData.megastein` is kept (wins / first-win flag) so a future
  re-run would not double-pay the first-win bonus.
- Kill switch: `MEGASTEIN_BOSS_ENABLED` (default true, debug setter in the
  test export object, same convention as `TOMBSTONE_BOSS_ENABLED`).

## Files changed

- `game.js` — boss block (constants, window/state fns, overlay, init/update/
  render, rewards) + wiring: home card, daily rotation, mode color/rules,
  card tag + click, launch gate, match flags, arena size, init/update/render
  calls, HUD banner, end screen, reward branch, 3 cleanup sites, save/load
  persistence, debug setter/getters.
- `tests/megastein-boss-regression.mjs` — new suite (source pins + vm-executed
  init/update/window/reward/render blocks).
- `megastein-spec.md`, `pr-body.md` — this spec and the draft PR body.
- `.backups/game.js.pristine-a831a5ad` — pristine pre-change backup (house-rule
  backup only, not committed).

## Verification

- `node --check game.js` clean.
- `node tests/megastein-boss-regression.mjs` green.
- Full sweep vs pristine baseline (see PR body / final report for the diff).
