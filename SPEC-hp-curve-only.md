# SPEC — Family Circuit restriction + HP-ONLY low-level curve (rebuild, 2026-11-05)

Branch: `hp-curve-only` · Base: main @ `a831a5ad` (PR #88 merge, Healnstein on main)
Repo: https://github.com/ppp65isking/brawe — built locally only, never pushed.

This is a REBUILD of Piece 1 (previous branch `family-circuit-hp-curve`,
commit 3156aab, never pushed). The previous attempt got the Family Circuit
removal and the explicit-branch HP curve right, but its fallback unification
was WRONG: it also scaled fallback DAMAGE down at low levels (e.g. Adlof P1
1600→1183), so time-to-kill barely moved — the opposite of what Anthony
asked for ("do js hp fix"). This rebuild keeps the correct parts and fixes
the fallback: HP only, damage untouched everywhere. The old branch is
abandoned; do not push it.

> Note: the repo root already has a `SPEC.md` (Sheet Round 41 worker spec) —
> this piece's spec lives here as `SPEC-hp-curve-only.md` so that file is untouched.

## 1. Family Circuit restriction — Electrostien only (unchanged from previous attempt)

Only Electrostien keeps the Family Circuit signature. Bolznstien keeps his OWN
signature, verified untouched in code: **Overcharge** — costs 1,500 HP, only
during Electric Eyes, 14s cooldown (`BOLZNSTIEN_SIGNATURE_COOLDOWN_MS = 14000`).

Removed from **Voltastein, Staticstein, and Healnstein** (all three on main now):
- `SPECIAL_ABILITY_DEFS` entries (Family Circuit defs, incl. "win 3 battles" shortDesc).
- Signature state functions: `getVoltasteinSignatureState`,
  `getStaticsteinSignatureState`, `getHealnsteinSignatureState`.
- `activateSignatureAbility` branches for the three (no more arming).
- `updateSignatureButton` wiring: removed from the signature-fighter list,
  the state ternary, the cost text, and the `· WIN-EARNED` button text.
- Win-earned gating: `grantVoltasteinSignatureWin` /
  `grantStaticsteinSignatureWin` / `grantHealnsteinSignatureWin` deleted, plus
  their three match-end call sites. The `voltastein/staticstein/healnstein
  SignatureWins` counters are gone too.
- Core Pieces buy guards for the three in `buySpecialAbilityPiece` /
  `buySpecialAbilityFullUnlock` (unreachable once the defs were gone; removed
  for cleanliness — Electrostien's guards stay).
- The three sky-strike effect blocks: Voltastein Power Outage, Staticstein
  Static Interference, Healnstein Healing Poison needle — plus the now-unused
  constants `VOLTASTEIN_FAMILY_STRIKE_DMG`, `STATICSTEIN_FAMILY_STRIKE_DMG`,
  `HEALNSTEIN_FAMILY_STRIKE_DMG` (all 500).
- One stale Healnstein header comment ("Family Circuit effect = the next
  needle also calls a 500-dmg sky strike…") trimmed.

Removed brawlers get **NO signature for now** — no replacement was invented.
Their Signature button no longer appears (they are not signature fighters
anymore); in training the button is hidden the same way.

Kept (Electrostien, untouched): Family Circuit def, state fn, activate branch,
`grantElectrostienSignatureWin` + call site, `realm.familyCircuit` flag,
sky-strike echoes (`ELECTROSTIEN_FAMILY_STRIKE_DAMAGE`, `electrostienFamilyStrike`
fx + render branch), HUD Family Circuit block, Core Pieces shop note, and the
`electrostienSignatureWins` save/load. Old saves may still carry
`specialAbilities.signature.voltastein/staticstein/healnstein` entries — they
are dead data now (nothing reads them); no migration was added.

Note: `selectedBrawler === 'voltastein'` / `'staticstein'` still appear twice
in game.js (reload-time SP2 hooks, ~L62378–62379) — those are NOT signature
wiring and were intentionally left alone.

## 2. Low-level HP curve — new shared HP scale (unchanged from previous attempt)

**BUILDER PICK — flagged for Anthony (see PR body):**
`getLevelHpScale(level) = 0.40 + (level-1) * 0.06`, defined next to
`getLevelDamageScale` and used for HP everywhere in `getScaledStats`.
Damage scale is **exactly unchanged**: `0.55 + (level-1) * 0.045`, still used
by `getPlayerDamageScale` / `getLevelDamageScale` and for all damage values
(`dmg`, `strikeDmg`, `batDmg`, `recallDmg`, `superDmg`).

| Level | HP scale (new) | HP scale (old = dmg scale) | HP vs before |
|------:|---:|---:|---:|
| P1 | 0.40 | 0.55 | **−27.3%** |
| P5 | 0.64 | 0.73 | **−12.3%** |
| P8 | 0.82 | 0.865 | **−5.2%** |
| P11 | 1.00 | 1.00 | 0% (identical) |
| P12 | 1.06 | 1.045 | **+1.4%** |

Examples (HP): Bolznstien P1 3960→2880, P5 5256→4608, P8 6228→5904, P11 7200,
P12 7524→7632. Electrostien P1 4510→3280, P12 8569→8692. Mallow P1 3740→2720,
P12 7106→7208. Damage at every level is unchanged for all 52 explicit-branch
brawlers (e.g. Bolznstien P1 dmg still 545).

Applied in all 44 `scale` sites inside `getScaledStats` (each explicit entry
now declares `const hpScale = getLevelHpScale(level);` and uses it for `hp`
only). The Kage entry's old-value comment (`/*hp:Math.round(9200*scale)*/`)
was preserved verbatim.

## 3. Fallback: HP-ONLY (the rebuild fix)

The generic fallback in `getScaledStats` (used by the ids with no explicit
branch) was additive on main:
`hp = hpBase + (level-1)*500` (tanks 850),
`dmg = dmgBase + (level-1)*55` (tanks 70).

The previous attempt made BOTH multiplicative, which cut low-level damage
(Adlof P1 1600→1183) and left time-to-kill unchanged. This rebuild:

- **HP** is multiplicative off the P11 anchor: `p11Hp = hpBase + 5000`
  (tanks +8500), `hp = round(p11Hp * getLevelHpScale(level))`. P11 is
  preserved exactly (old additive P11 = new P11 by construction).
- **Damage stays on the ORIGINAL additive formula, untouched.**
- **Speed untouched** (`speedBase + (level-1) * (assassin ? 4 : 2)`).

Result — the point of the rebuild: kills actually get faster at low levels.
Adlof P1: 6000 HP / 1600 dmg = 4 hits to kill → 4400 HP / 1600 dmg = 3 hits.
Outlit P1: 5400/1500 = 4 hits → 4160/1500 = 3 hits. P12 fallback HP is
+1.1–1.4% vs old (same scale-ratio side effect as explicit brawlers).

## 4. Non-brawler entities: carved out, unchanged at every level (new in rebuild)

Non-brawler ids routed through `getScaledStats` keep the ORIGINAL additive
stats at EVERY level — the HP curve is for brawlers only. Implemented as a
roster check in the fallback (placed after the `brawlerData` read, so
`allBrawlers` — declared before `brawlerData` in this scope — is always
initialised): `if (!allBrawlers.includes(brawlerId))` → old additive
hp/dmg/speed. This covers, verified by enumeration (brawlerData keys minus
allBrawlers, plus entity ids used as `brawler:` values):
`chickpig_pig`, `tower_core`, `turret`, `wall_structure`, `decoy_healer`,
`skeletrooper`, `evil_doctor_dna`, `parrot`, `egg`, `prism_bumper`.
Verified: all 10 match main exactly at L1/5/8/11/12 (hp, dmg, speed).

One deliberate exception: `the_deleter` is NOT in `allBrawlers` either, but
it has its OWN explicit branch in `getScaledStats` and never reaches the
fallback — the HP curve applies there by design (P1 3630→2640, dmg untouched),
per the "apply it to HP in every getScaledStats site" instruction.

## Verification

- `node --check game.js` clean.
- **Acceptance diff (pristine main vs new file, all 116 ids × levels 1–12,
  every returned field): ALL CHECKS PASS.**
  - P11 before/after diff: EMPTY (0 diffs).
  - Damage diffs at ANY level: 0. Speed diffs: 0. Other-field diffs: 0.
  - Entity diffs at any level: 0 (all 10 carved-out ids).
  - HP-curve violations for brawlers: 0 (every brawler HP = round(P11 × hpScale)).
  - Spot checks: Bolznstien P1 3960→2880 (dmg 545→545); Outlit P1 5400→4160
    (dmg 1500→1500); Adlof P1 6000→4400 (dmg 1600→1600); tower_core /
    skeletrooper identical at P1/P11/P12.
- New regression suite `tests/hp-curve-only-regression.mjs`: **35/35 passing**
  (FC removal ×3, Electrostien/Bolznstien kept, HP-curve source + live vm
  values incl. P1/P5/P8/P11/P12 samples, fallback HP-only loop over every
  roster fallback id, entity-untouched loop over all 10 entity ids at
  L1/5/8/11/12, the_deleter curve check, time-to-kill improvement check).
- Updated existing tests (copied from the previous attempt, all still valid —
  none of them asserted fallback damage): voltastein-staticstein, healnstein,
  aura-charmer, runner, mallow, nightshade-brawler, nightshade-nerf-shield,
  aegis-shield, bolznstien-brawler, carmela-fudge, dr0ne, ghoul, looma,
  magnatar, portalo, rager, sheet-round-41 A+C, spikey,
  unhitabble-and-mutation, weefee, anti-royal, balance-v6-live, jacktrade,
  king.
- Full sweep vs pristine baseline: pristine 151 pass / 36 fail;
  branch **152 pass / 36 fail** — the +1 is the new suite; the 36 failing
  files are IDENTICAL on both sides (same files, same order), so **zero new
  failures**. Logs: `~/workspace/sweep-outputs/hp-fix-pristine-sweep.txt`,
  `~/workspace/sweep-outputs/hp-fix-sweep.txt`. (The previous attempt's branch
  showed 153/35 — the one-file difference is the known spikey flake, which
  failed on BOTH sides in this run.)
  Known flakes that fail on pristine main too: spikey, magnatar-sp2, prop-hunt,
  environment-phase5-props, github-pages-soul-summoner, electrostien — plus
  browser/DOM-dependent suites that cannot run headless here.

## Decisions needed from Anthony

1. **HP curve numbers** (builder pick): `0.40 + (level-1)*0.06` — P1 −27%,
   P5 −12%, P8 −5%, P11 unchanged, P12 +1.4%. Veto/adjust the numbers?
2. **P12 +1.4% HP** — a side effect of the curve (P12 was 1.045×, now 1.06×).
   Intended, or should P12 stay 1.045× (would need a kinked curve)?
3. **No replacement signatures** for Voltastein / Staticstein / Healnstein —
   confirm they stay signature-less, or order new ones later (separate piece).
4. Old saves carrying the three removed signatures' pieces/state: harmless dead
   data; no migration included. OK as-is?
5. **`the_deleter` takes the HP curve** (explicit branch, P1 3630→2640) —
   intended, or carve it out with the other non-roster entities?

## Files changed

- `game.js` — Family Circuit removal + HP curve + fallback HP-only +
  entity carve-out.
- `tests/hp-curve-only-regression.mjs` — NEW (35 checks).
- Updated tests (26 files, from the previous attempt): listed above.
- `SPEC-hp-curve-only.md`, `pr-body.md` (this branch's docs; the repo-root
  `SPEC.md` belongs to Sheet Round 41 and was left untouched).
- Backups (local only, gitignored): `.backups/game.js.pristine-a831a5ad`
  (byte-identical to main @ a831a5ad), `.backups/game.js.hp-curve-only`.
