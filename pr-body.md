# Family Circuit is Electrostien-only + HP-ONLY low-level curve

**REBUILD of Piece 1** — the first attempt (`family-circuit-hp-curve`, never
pushed) got the Family Circuit removal right but its fallback change also cut
low-level DAMAGE, so kills didn't get faster. This branch fixes that: **HP
only, damage untouched everywhere.** The old branch is abandoned.

## What changed

### 1. Family Circuit: Electrostien only
- **Removed** from Voltastein, Staticstein, and Healnstein: signature defs,
  state/activate functions, Signature-button wiring, win-earned 3-battle
  gating + counters, Core Pieces buy guards, and the 500-dmg sky-strike
  effects. They get **no signature for now** — no replacement invented.
- **Electrostien keeps Family Circuit untouched.** **Bolznstien keeps his own
  Overcharge** (1,500 HP, Electric Eyes only, 14s cooldown) — verified in code.

### 2. Low-level HP curve (builder pick — flagged below)
- New shared `getLevelHpScale(level) = 0.40 + (level-1) * 0.06`, applied to HP
  in every `getScaledStats` site. Damage scale exactly unchanged
  (`0.55 + (level-1) * 0.045`).
- P1 HP **−27%**, P5 **−12%**, P8 **−5%**, P11 **unchanged**, P12 **+1.4%**.
  E.g. Bolznstien P1 3960→2880, Mallow P1 3740→2720, P11 identical everywhere.
- Fallback (brawlers with no explicit branch): HP is now multiplicative off
  the P11 anchor, **damage stays on the original additive formula**.
  Kills actually get faster now — Adlof P1: 4 hits to kill → 3 hits.
- **Non-brawler entities are carved out** (roster check in the fallback):
  towers, Core, walls, turrets, summons (`skeletrooper`, `parrot`, `egg`,
  `chickpig_pig`, `decoy_healer`, `evil_doctor_dna`, `prism_bumper`) keep
  their ORIGINAL stats at every level, verified.

## ⚠️ Builder picks — Anthony, your call
1. **HP curve numbers** (`0.40 + (level-1)*0.06`): veto or adjust?
2. **P12 +1.4% HP** (1.045× → 1.06×): intended, or kink P12 back to 1.045×?
3. **The three Steins stay signature-less**, or order replacements later?
4. Old saves may hold the removed signatures' pieces/state as dead data; no
   migration included — OK as-is?
5. **`the_deleter` takes the HP curve** (explicit branch, P1 3630→2640) —
   intended, or carve it out too?

## Verification
- `node --check` clean.
- **Full before/after diff (all 116 ids × levels 1–12, every field): P11 diff
  EMPTY; damage diffs at ANY level: 0; speed diffs: 0; entity diffs: 0;
  HP-curve violations: 0.**
- New suite `tests/hp-curve-only-regression.mjs`: **35/35 passing**.
- Full sweep vs pristine baseline: zero new failures (see delivery report).

---

## Merge note (2026-11-05)
Branch merged with main @ 5d36fd9 (PR #89: Outlit animation + voice lines, Megastein boss) to resolve the conflict after #89 merged. `game.js` auto-merged with no conflicts — both #89's features and this PR's Family Circuit removal + HP-only curve are present and verified (see below). The only conflicted file was `pr-body.md` (add/add); this file is kept as PR #90's body.
