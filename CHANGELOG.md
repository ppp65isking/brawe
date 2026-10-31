# Arena Forge — Master Update CHANGELOG

Base: `main` at `8ea69d4` ("Merge pull request #69"). **Nothing in this
directory has been pushed.** Pushing / PR happens only after Anthony's fresh
approval tap. Work lives in `~/workspace/brawe-master-update` (uncommitted).

> **How to read this file:** every `[BUILDER PICK]` is a detail Anthony left
> unspecified that the builder chose — each one is flagged here for his
> correction. "Spec correction" means the first-pass worker spec was wrong
> against the live code and the coordinator fixed it at apply time (never by
> guessing).

## 0. What was already done before this pass (not redone)

- **Pins system** (verified present): Emote Pins hub (`openPinsHub`, 30-tile
  grid, tap-to-equip, refuse-at-full), in-match pin button + `sendPin`
  (3s cooldown), `pins.css` linked in `index.html`, 30-pin catalog
  (`PIN_DEFS`), starters `forge_wave / good_game / ouch`, equip cap 6,
  `grantPinPack(3)` (random unowned pins, 250 coins per missing pin when
  complete), `addPins` silently ignores unknown ids.
- **Economy (verified present, not redone):** Core Pieces upgrade cut
  `{8:5, 9:9, 10:13, 11:21}`; Soul Summoner random auto-target; Brick Road
  already on main; PR #69 events persist/scroll already on main.
- **W1 terminology pass, W3 pins/cards/icons, W4 AI / Season 7 / quests /
  training / profile / UI** — applied 2026-10-31, `node --check` clean after
  every edit group. Summarized below; full detail lives in
  `.master-update-specs/coordinator-state.md`.

## 1. Terminology / wording pass (W1)

- Brick Leagues header, quest plurals, Surge Tapper naming, Contract XP,
  Power 8+ pack floor, Season 6 Xplodemis home hint,
  triangle-to-complete-ability wording, division points, **Starr Road renamed
  to Soul Road** `[BUILDER PICK]` (chosen over Constellation Road),
  Relay / Attachie / SlopSushi / tutorial / signature wording, "finish the set."
- UI-facing strings only. No save key or test-dependent identifier renamed.
  Starr Drop → Tapper Drop deferred (save keys / function names keep the old
  word); Showdown not renamed; Season 3 welcome line edit deferred pending
  live verification of which line displays.
- Rarity test §6 stale tier-order assertion replaced with a random-pick pin.

## 2. Match cards, AI names, icons, emoji migrations (W3)

- **AI names:** 40-name pool, `assignBotDisplayNames()` before `spawnBots()`,
  shuffle without replacement, `Forge Fighter N` fallback. `displayName: null`
  added on all three `spawnBots` push sites (main ally, Construction ally,
  enemy) — the spec said two sites; the code has three.
- **Match-start profile cards:** `buildMatchCard()`, `getMatchCardRoster()`,
  `showMatchIntroCards()` (2,800 ms pointer-events-none banner) at the true
  end of `launchShowdownMatch()`, stale-intro removal on match end. Cards
  exclude structures, pets, summons, minions, towers, lava entities.
  Opponents capped at 9 shown with a `+N MORE FIGHTERS IN THE ARENA` footer.
- **Icons:** 14 additions to `brawlerPortraitIcons` (91 → 105 keys): beam,
  sera_eclipse, boom_arang, teether, fuel, xray, angel, demon, relay, snapper,
  kage, drainbow, draflygon, aegis. Grouped-block placement was a builder
  pick. The aegis shield duplicates sir_cheeseburger's shield (left alone);
  the kage/robber invisible duplicate left alone. Electrostien rarity wording
  untouched.
- **Emoji migrations (7, Route A only, via `modules/visuals/roster-2p5d.js`
  `looks` + `identities`):** looma, feathers, spikey, electrostien, mallow,
  nightshade, aegis. The 8 disabled brawlers (Robber, Boomer, Daggershard,
  Cluster, Witch, Adlof, Swimmer, Blade Vane) were NOT touched.
- New test: `tests/match-cards-pins-icons-regression.mjs` (18 checks).

## 3. AI improvements (W4)

- **AI-2 cover retreat:** early return via `findBotCoverPoint` when
  `tacticalRetreat` is true (return shape preserved).
- **AI-1 kiting:** spacing-only reverse for `spacingRetreat`; perpendicular
  kite toward `preferredRange + 60` for `tacticalRetreat`; full disengage
  speed 1.12 under 0.15 HP.
- **AI-8 ally spacing:** supports/controllers repel at 0.5 strength vs
  frontline allies; others keep full repel.
- **AI-3 hazard escape:** new `getBotHazardEscapeVector` (zones + rings +
  snapper waves as rings + trapper-fence rectangle minimum-penetration escape
  — the spec text named fences but its code omitted them, so the coordinator
  added them). 400 ms per-bot cooldown (`botNextHazardEscapeAt`), speed cap
  1.12, non-Impossible bots only, allied hazards skipped unless friendly fire
  is on. Hooked before the damage-filler speed line in
  `getBotTacticalMovement`.
- **AI-4 focus fire:** low-HP bonus for all roles (assassin/skirmisher 520,
  others 260, under 0.42 HP); shared-focus bonus −150 when 2+ allies within
  620 px already target the same enemy, on top of the existing per-ally 105.
- **AI-5 super discipline:** invulnerability/flying/lift guard in
  `shouldBotUseSuper`; overkill guard (target under 0.12 HP, fewer than 2
  clustered, no objective fight/target) before the generic fallback; lock-branch
  refusal for invulnerable/flying/lifted targets.
- **AI-6 gadget discipline:** invulnerability veto + dive trigger (HP under
  0.30, target within 200 px) after `objectiveEmergency`; disengage veto
  (under role retreat threshold, distance over 520 px) before the fallback.
  **Playtest note:** the dive trigger sits before per-brawler branches, so it
  overrides them when diving.
- **AI-7 wall-break:** spec premise was false in this tree
  (`botWallBreakUntil` was set but never read). Added expiry check before the
  lock branch: expired wall still standing → 4,000 ms cooldown + clear; during
  cooldown the lock branch and both target scans skip `lastTargetId`.

## 4. Season 7 "Ember Forge" (W4)

- **Identity `[BUILDER PICK]`:** name Ember Forge, season 7, id
  `ember-forge-arena-forge-2027-s7`, window January 1–31, 2027 (directly after
  Xplodemis Dec 1–31, 2026, no gap/overlap), end label January 31, 2027.
- Structure preserved: 25 tiers, same `{tier, title, free, premium}` shape,
  100 XP/level, 25 max level, same premium price (79 gems / 6,500 coins),
  20 staged quests using only existing kinds. Old season arrays untouched.
- Tier table uses only existing grant types plus `pinPack`. Pin tiers are
  `{type:'pinPack', amount:3}` only — the spec's 15 proposed new pin ids were
  dropped; packs grant random unowned catalog pins, not themed fixed sets.
  Tier 25 premium adds `bonusGems: 15` (grant + display branches extended for
  `bonusGems` only).
- Gating: Ember branch first in `getActiveSeasonProfile`, before Xplodemis;
  `isSeason3PassActive` now returns `now < EMBER_FORGE_END_UTC` (name
  unchanged); new `isEmberForgeSeasonActive` mirrors
  `isXplodemisSeasonActive`. Rollover stays automatic via
  `ensureSeasonPassState` archiving into `seasonPassHistory`.
- Profile empty-state pins line names the Ember Forge Pass — it must change
  if the pass theme changes.

## 5. Quests page (W4)

- Claim keeps the tab (`activeQuestTab`, defaults to `initialTab`, set in
  `setActiveTab`); CLAIM ALL per column (enabled only with a claimable quest,
  claims in stage order, re-opens on the active tab, one `refreshHomeUI()`).
- Honest labels: Claimed / Claim / Locked (only when `!questUnlocked`) /
  In Progress (the weekly-only special case deleted). Claim gates unchanged.
- Locked rows gain "Unlocks after the previous stage is complete." (verified:
  unlock keys on the previous stage being *completed*, not claimed).
- Tab counts: Contracts count via new `countClaimableCoreQuests()` (daily,
  weekly, brawler, awakenatorJourney, bonelessBoomarang, coinAscent, starter;
  `completed && !claimed`); season count reuses
  `getClaimableSeasonRewardCount()`. Gold/Special tabs get no count.
- Season view: sticky quest/tier titles with solid backgrounds; single-column
  grid below 700 px; grid gap 14 → 12 px.
- Order: Daily Contracts, Weekly Contracts, Fighter Hunt, Starter Journey
  ("One-time onboarding — start here"), Awake Awakenator, Boneless Boomarang,
  Coin Ascent. Panel subtitle: "Complete contracts, claim rewards, and climb
  the Core Circuit Pass."
- Quest title uses `dialog-title`; claim button padding 10×14 px, 40 px min
  height; column header 13 px uppercase 0.08 em letter-spacing; row margin
  10 → 12 px.

## 6. Training cleanup (W4)

- **Training Hub:** new `openTrainingHub()` modal (quest-board visual language,
  z-index 1500, Escape closes + returns focus). Four mode cards, split
  `[BUILDER PICK]`: Free Play (everything, exactly as before), DPS Lab (meter
  bot + Colossus only), Duel Lab (duel dummy + duel spawner), Healing Lab
  (allies ward only). Each card states what spawns, no "etc." wording.
- Home Training button now opens the hub (after clearing `activeSkinTrial`
  and prop-hunt state). Brawler Lab entry and skin-trial path still launch
  the full sandbox directly (mode `'free'`).
- `launchTrainingSandbox(targetBrawler, mode='free')` with `trainingMode` +
  `TRAINING_MODE_LABELS`. Spawn gates: meter + Colossus free/dps; 3 allies
  free/healing; 15-bot grid free only; King duel dummy free/duel; gallery free
  only.
- Deck regroup (lite, not a full template rewrite): section ids, mode-
  conditional hiding (Duel hides allies+grid; DPS hides allies+grid+spawner;
  Healing hides grid+spawner), mode label row, "Refills and teleports. Nothing
  here costs anything.", "Dummies never fight back unless you spawn an enemy
  with AI on.", 13 px section labels, grid label drops "(BOTTOM RIGHT)".
- RESET button (full re-launch, same fighter + mode). Gadget-cooldown toggle
  button (flips `trainingGadgetNoCooldown`, syncs the `#tgNoCd` checkbox).
- DPS readout (`#tcMeterReadout`, meter 5-second window total; Colossus shows
  cumulative damage `maxHp - hp` — **deviation:** the spec assumed Colossus
  records `trainingDamageEvents`, but `recordTrainingBotDamage` only records
  `isDamageMeterBot`, so a 5s Colossus window is impossible without a new
  recording path).
- Ground text labels removed (10 `fillText` lines; tinting, dividers, `➕`
  markers kept). **Open note:** the overlay still paints all zone outlines
  even in modes where those spawns are gated off.
- **Deferred:** skin-trial BACK TO SKIN (no skins-view opener found; not
  guessed).

## 7. Player profile rebuild (W4)

- New `openPlayerProfile()` after `renderProfileCareer` (shares scope with
  profile helpers). Home button rewired to it (id/text/styling unchanged);
  `openBrickBonV2` + Career tab untouched for the Brick Bon button.
- Shell reuses Brick Bon overlay/panel. Header: PLAYER PROFILE, player name,
  equipped title or NO TITLE, lifetime bricks. Close X, overlay-click close,
  Escape close + focus return.
- Sections in order: profile card showcase (EDIT PROFILE re-opens the new
  screen on save); CAREER STATS grid verbatim + Fighters Unlocked + Current
  Win Streak, footnoted "* Tracked since Profile Update"; Favorite fighters;
  Badge showcase; Pins showcase; Brick Road progress card; Ranked card; Top
  fighters by lifetime bricks (moved last).
- Fighters Unlocked uses an inline predicate mirroring
  `getUnlockedBrawlerPool` (that function is nested too deeply to call from
  profile scope). Current Win Streak reads `playerData.winStreak || 0`.
- Exact empty states: "No favorites yet — set them in Edit Profile.";
  "No badges showcased yet.";
  "No pins yet — earn pin packs from the Ember Forge Pass."
- Pins showcase: equipped row (up to 6) + owned grid; tap owned to equip
  (refuses silently at 6, **no FIFO eviction — coordinator decision overriding
  the spec's FIFO + cap-3**); tap equipped to unequip; every change saves and
  re-renders only the pins section. Glyph/name from `PIN_DEFS`, else
  prettified id. Pins helpers accessed behind `typeof` guards (scope at the
  profile site vs the pins block was unproven).
- Brick Road card: total bricks, league, next milestone, 7 px bar,
  unclaimed-count pill only when > 0, OPEN BRICK ROAD closes the profile and
  calls unchanged `openBrickRoadModal()`. No milestone claim inside profile.
- Ranked card: points, division via `typeof`-guarded `getRankedTierInfo`
  (honest fallback: Brick Bronze I, `#b97845`, next Brick Bronze II at
  100 RP), next-division line or "Top division reached.", Ranked Win Streak,
  PLAY RANKED closes the profile and calls `openRankedQueueUI` only if it is
  a function. No ranked rule/RP/division value changed here (ranked overhaul
  is §9 below).
- **Post-W2 re-verification needed:** the ranked card reads
  `getRankedTierInfo`'s `{index, points, label, color, nextLabel,
  nextThreshold}` shape, which the ranked overhaul did not change — confirmed
  by the profile test assertions in `tests/master-update-regression.mjs`
  (function + wiring presence). Live PLAY RANKED wiring still wants one
  Anthony playtest tap.

## 8. UI overhaul (W4)

- New `master-update.css`, linked in `index.html` after `pins.css` (after
  `styles.css`, so it wins ties).
- Dialog scale/panel/button classes (`.dialog-title`, `.dialog-subtitle`,
  `.dialog-section-title`, `.dialog-panel`, `.dialog-panel-inner`,
  `.dialog-btn`, `.dialog-btn-primary`, `.dialog-btn-disabled`,
  `.dialog-btn-small`); home-button unification with `!important` (beats the
  `styles.css` radius override without editing `styles.css`); profile `h3`
  13 px / 0.08 em / uppercase; `#tcDeckBody button` 8×12 px / 12 px with
  `!important` (nav-bar buttons live outside `#tcDeckBody` and keep size);
  profile pins grid tiles (`.profile-pins-equipped`, `.profile-pins-grid`,
  `.profile-pin-tile`, equipped gold border `#ffd44f` mirroring badges).
- Quest panel already 16 px / 18 px and deck shell already 16 px, so those
  U-2 items were no-ops. Brick Road radius 20 → 16 px (padding left alone —
  the panel uses flush inner sections). Deck section padding 8×10 → 12 px.
- **No-op correction:** the spec's U-10 premise was wrong — the live Brick
  Road title already reads "🏆 BRICK ROAD · BRICK LEAGUES", not "TROPHY
  LEAGUES", so it was left unchanged.
- Escape + focus return added to: quest board (new `closeBoard` used by the
  Close button, column claim handler, CLAIM ALL handler), Brick Bon modal,
  Brick Road modal, Training Hub, new profile screen. Training deck itself
  got no Escape handler (EXIT remains its dismiss path). No full focus traps.
- Z-index stack (values unchanged): quest board 1300, Brick Road 1600,
  training deck 2100, Training Hub 1500, profile reuses Brick Bon stacking.
- **Left untouched deliberately:** `openSeasonPass()` redirects to
  `openQuestBoard('season')` and its circuit-overlay code below the return is
  unreachable dead code. Removal needs Anthony's approval in a separate
  cleanup (house rule: never delete large sections without approval).

## 9. Events page redesign (W2)

- **Popular always available, rest rotate daily.** `HOME_POPULAR_MODE_IDS`
  (17, `[BUILDER PICK]`): solo, duo, trio, arena_forge,
  arena_forge_overclocked, arena_forge_minion_surge, arena_forge_hyper,
  brawe_ball, knockout_3v3, duels, tug_zone, construction, knock_donate,
  damage_filler, capture_turkey, tower_defense, custom_clash.
- **Daily rotation** (`[BUILDER PICK]`): 16-id pool (7 bosses + power_play /
  corrupted / chaos_crown / prop_hunt / marked_mayhem / objective /
  brick_vault / mirror / impossible), + Christmas Showdown only while
  Xplodemis is active, + Slop Sushi Plus only while live; filtered by
  `HOME_MODE_DATA`, retired-mode, vault, prop-hunt, and Tombstone gates.
  Date-seeded daily picks, stride 7, 7 slots, one countdown to local
  midnight, no hourly timers; localStorage key
  `arenaForgeHomeEventRotationV5`; beast-boss God Mode prepended (slot 0) on
  God Mode days only. If the pool ever shrinks below 7, render however many
  ids exist — never pad with duplicates or popular ids.
- ALL EVENTS section deleted by design; replaced by POPULAR EVENTS
  ("ALWAYS AVAILABLE — NO WAITING.") and ROTATING EVENTS ("7 EVENTS TODAY —
  NEW PICKS AT MIDNIGHT."). Validity set = solo/duo/trio + popular + daily
  ids. 1-second interval is now a daily-countdown updater + midnight
  re-render check. `index.html` heading:
  "POPULAR EVENTS - ALWAYS AVAILABLE".
- **Reward rule change:** popular modes return `null` (standard match
  rewards); only daily-rotating modes get the bonus, slot 0 at 2×. The old
  weekly-feature 2× branch is deleted from `getHomeEventRewardForMode`
  (signature now `(mode, now)`; the launch call and the rotating-card
  info-button call were already single-argument).
- **Hourly engine deliberately left in place** (`getHomeEventRotationState`,
  `getActiveHomeEventIds`, `getNextHomeEventIds`, `getHomeEventCyclePool`,
  V4 key): deletion must wait for a grep confirming no regression file
  references it. Same for `getHomePermanentModeIds` /
  `getHomeRotatingModeIds` (test-pinned).
- **Spec corrections (events):**
  - The spec's E-8 quoted block (`getWeeklyFeaturedModeIds` returning
    corrupted/chaos/slop_sushi) does not exist in this tree. The real weekly
    feature is `WEEKLY_FEATURED_MODE_IDS = ['brick_vault', 'power_gods']`
    gated by `isWeeklyTowerFeatureActive` at 3 call sites + the countdown
    block. Applied the rolling even-ISO-week rule to the REAL mechanism and
    kept the real ids (changing the ids would have changed which modes get
    featured — an unapproved behavior change).
  - `getLocalWeekKey` is nested inside quest scope and NOT visible at the
    events site, so the ISO-week math is inlined verbatim in
    `isWeeklyTowerFeatureActive` instead of calling it.
  - The tower-duels / vault-weekend countdown updaters were dropped with the
    interval rewrite (their Aug 2026 windows are expired and no DOM element
    creates those countdown attributes anymore).
  - Beast-boss God Mode has no `HOME_EVENT_REWARDS` entry, so on Oct 30 its
    featured badge reads `2X FEATURED • BONUS REWARDS` and no bonus is paid.
    No economy was invented for it.
- **Dedupe + text:** first duplicate `orbo_boss` / `demon_villains_boss`
  cards, rules, and colors deleted (live second entries kept;
  `HOME_EVENT_REWARDS` orbo duplication is harmless and left alone).
  Showdown hub + card subtitles corrected (20-player solo, 10 teams of 2
  duo, 5 teams of 4 trio/Quad, Mirror 4v4). `getShowdownModeLabel` gains
  tug_zone, capture_turkey, prop_hunt, tower_defense, duels,
  power_play_showdown, corrupted_showdown, chaos_crown, impossible,
  arena_forge_overclocked, arena_forge_minion_surge; trio → Quad Showdown,
  mirror → Mirror 4v4. Tags, custom-clash list, mode-picker buttons, and the
  match title updated to QUAD/4V4 wording (the match-title line was a
  coordinator extension of the same rename). Mode ids (`trio`, `mirror`) and
  `isTrioShowdownMode` unchanged. Power Play rules roster gains Ramage
  (9th `POWER_PLAY_BRAWLERS` entry; rules text previously listed 8).
- **Weekly feature** is now a rolling even-ISO-week rule. Tower-duels weekend
  constants untouched (test-pinned, mode retired).

## 10. Mode fixes (W2)

- **Duels (M-1):** constants `DUELS_MAX_FIGHTERS = 4`,
  `DUELS_ROUND_OPTIONS = [7, 9, 15]` (frozen), `DUELS_ACTIVE_TOWER_POWERS = 5`,
  `duelsTargetWins` default 9, `getDuelsWinScore()`. Draft overlay is now
  1–4 fighters with a LAUNCH button enabled at 1+ (bot team sized to the
  drafted size) and a 7/9/15 format picker (default 9, gold outline). The old
  auto-launch-at-3 + 500 ms delay is gone; the launch path sets all the same
  mode flags. Win gates (both round-end sites + results) use
  `getDuelsWinScore()`. Duels player level always 11. Tower-power slice is 5
  in the duels path only via `DUELS_ACTIVE_TOWER_POWERS` (shared deck function
  untouched). Rules text: "5 Tower Powers". Overlay gained an honest
  instruction line ("Choose 1–4 fighters, then pick a format and LAUNCH.").
  **Tower-duel events keep first-to-5:** `getDuelsWinScore()` returns 5 when
  `isTowerDuelEvent` is true (their old fixed-gate scoring) — without this
  branch, M-1c would have silently moved tower-duel events from 5 to 9.
- **Solo / Duo (M-2/M-3):** presentation only, no code change (spawn math
  already correct: 20 players solo, 10 teams of 2 duo).
- **Trio/Quad (M-4a — the logic bug):** two one-line changes, `/3` → `/4`
  in the enemy team-id expression and in the anchor-existence check.
  Anchor-creation lines already used squad size 4. Spawn counts already gave
  5 teams of 4 (ally 3, enemy 16, 20 players).
- **Mirror 4v4 (M-5):** presentation only (spawn math already correct).
- **Fuel Bot Gadget 2 (M-6):** new bot branch in `activateGadgetBot`'s effect
  chain, mirroring the player branch (range 160, knockback 95, burn fields,
  160-radius explosion). Loop uses `bots.concat([player])`; object checks
  only, never truthiness-guarded ids. **Spec correction:** the spec said
  "immediately before the the_deleter branch", but its snippet opens with
  `} else if`, which only parses after a closed block — the branch is
  inserted after the the_deleter block closes, into the else-chain, before
  magnatar.
- **Power Gods / Splitter Powered (M-7):** the
  `splitter_powered → power_gods` rewrite moved to immediately before the
  retired-mode check, so it now flows retired → `'solo'` like every other
  retired mode. `splitter_powered` NOT added to `RETIRED_TOWER_MODE_IDS`
  (one mechanism is enough; that set feeds UI filters). Legacy label stays.
- **Christmas Showdown (M-8):** fixed by daily-pool gating (only while
  Xplodemis is active); the launch guard stays as backstop, not deleted.
- **Ranked pool vs events gating (M-9 — documented divergence, not fixed
  by deletion):** `RANKED_TEAM_MODE_POOL` keeps `brick_vault`. Only change
  is a banner note: " (Tower Powers vaulted)" when the draft mode is
  `brick_vault` and `TOWER_POWER_SYSTEM_ENABLED` is false.
- **M-10 (no game-code changes):** prop-hunt storm-guard pattern (test-only
  fix — the storm does exclude Prop Hunt); mode-scale 3200×3200 world-size
  expectation NOT adopted (live default world stays — see playtest item);
  duels win-score failure genuinely fixed by M-1c via `getDuelsWinScore()`.

## 11. Ranked overhaul (W2)

- **Weekly max-out `[BUILDER PICK]` numbers:** pass-XP cap 2,000/week;
  overflow 1 coin per 5 XP; max-out bonus 300 coins + 1 pin 3-pack, once per
  week. Cap applies to pass XP only; RP is never capped.
- **Weekly fields** added additively in `ensureRankedSeasonState` (`weekKey`,
  `weeklyPassXp`, `weeklyMaxed`, `weeklyMaxClaimed`) with week rollover
  resetting them. Old saves get current-week values, no retroactive credit.
  **Spec correction:** the spec called `getLocalWeekKey()` here, but that
  function is quest-nested and out of scope at the ranked site, so a
  same-math outer-scope helper `getRankedWeekKey()` (identical `YYYY-Www`
  format) is defined with the ranked constants and used instead.
- **Settlement split:** capped pass-XP gain, overflow XP → coins added to
  `rewardCoins` before payout, once-per-week max bonus (coins always granted;
  pin pack behind a `typeof grantPinPack === 'function'` guard so a missing
  pins module never eats the coin bonus or blocks settlement). Results text
  gains overflow and WEEKLY MAXED lines. Queue meta line gains weekly pass-XP
  progress + WEEKLY MAXED flag. Home button label unchanged.
- **Prestige ladder `[BUILDER PICK]`:** `RANKED_PRESTIGE_STEP_RP = 500`,
  `RANKED_PRESTIGE_MAX = 5`; prestige 1 at 2,400 RP (Legend III), then 2,900 /
  3,400 / 3,900 / 4,400. Divisions, labels, colors, 100 RP spacing unchanged.
  New `getRankedPrestige` + `getRankedDisplayLabel`. Promotion loop pays
  250 coins + 25 souls per new prestige step (existing promo div renders
  them). Queue header next-text for the top division is now the display
  label + "— MAX" (Grandmaster at index 18 / 1,800 RP is not the top division
  — the old "Grandmaster Max" label was wrong for every 2,400+ player).
- **Safety floor:** only the 2,400 rung added above the existing 2,200 rung
  (rest: 1,900/1,800/1,300/1,000/700/300/0). Per-division floors intentionally
  NOT added — floors stay at family boundaries `[BUILDER PICK]` (a bad
  streak costs at most one family, not one division).
- **MVP:** new rule `(won && fullOnDamageEarned >= 3000) || (!won &&
  fullOnDamageEarned >= 6000)`, replacing the effectively unconditional
  `playerScore > 0` clause. `isRankedAboveBrickFume` (points ≥ 1,300) NOT
  renamed (test-pinned), though its name is misleading (1,300 = Master I).
- **New pick phases:** Ban → Protect → Pick → Swap → Veto → Ready.
  State variables `blueProtect`, `redProtect`, `playerSwapped`,
  `vetoedModifier`. Ban→protect and pick→swap transitions at 4 sites each;
  nothing sets `draftState = 'complete'` anymore (verified by grep: zero
  remaining references). Fast-forward runs protect as random picks
  (protects must differ, banned excluded), skips swap and veto, ends at
  `'ready'`. Stepper is 17 steps (8 bans + 1 protect + 6 picks + 1 swap +
  1 veto); `ready` is step 17. Status callouts added for protect, swap,
  veto, ready (existing DRAFT COMPLETE text kept for ready). Launch gates
  moved from `'complete'` to `'ready'`. Summary appends Protect and Veto;
  `modSummaryLabel` is computed at launch from the final active variables
  (after veto).
- **Protect step:** player captain picks via grid + LOCK IN PROTECT, then AI
  red protect, then pick phase. Non-captain player gets random protects for
  both teams. `scheduleNextTurn` schedules nothing while `'protect'` and the
  player is captain (it only handles ban/pick states).
- **Protect pool rule — spec correction:** the spec's snippet excluded only
  `redProtect` from everyone (blocking red from its own protect and letting
  red pick blue's). Implemented team-aware instead: a protected brawler
  cannot be picked by the enemy but may be picked by its own team. All
  pick-context `getAvailablePool()` calls pass the picking team; ban-phase
  calls keep the banned-only filter. Grid is selectable in `'protect'` only
  when the player is captain, in `'swap'` only for the player's own pick
  replacement (choices = blue pool + current pick; enemy-protected brawlers
  render 🛡️ PROTECTED and unselectable), never in `'veto'`.
- **Swap:** player-only, once, grid-limited, SWAP (enabled only for a
  different brawler) + KEEP PICK buttons, then veto. `playerSwapped` guards
  re-render.
- **Veto:** one button per active modifier; 2–3 modifiers → vetoed one
  removed; exactly 1 non-classic modifier → veto replaces it with
  `'classic'`; `'classic'` roll → auto-skip straight to `'ready'`.
  Remaining modifiers shift down (no holes); final set written back to both
  draft keys and `activeRankedModifier*` variables; banner `innerHTML`
  rebuilt from the final set with the same template. `renderRankedModifierHUD`
  reads the active variables live and needed no edit.
  **Minor deviation:** the spec's "No modifier to veto" text for the classic
  auto-skip is not surfaced as a visible line (the step goes straight to
  `'ready'`, whose status text is the kept DRAFT COMPLETE line); the
  summary's "Veto: —" is the visible signal.
- **Fast-forward guard (coordinator addition):** auto-draft's protect
  randomization runs only when protects are still unset, so hitting
  fast-forward during pick/swap/veto/ready can never silently re-randomize
  protects after picks locked.
- **Modifier pool fixes:** `super_rate_plus` excluded from the queue pool
  (twin of `super_rate_90`); both keys stay defined and valid for custom
  clash. Dead `colossal_projectiles` alternative deleted from the
  giant-projectiles predicate. Leaving set unchanged (`timed_detonation`,
  `giant_projectiles`, `projectiles_150` excluded from queue rolls).
  **Tower/structure guard verified, no edit:** `restoreRespawningEntity`
  callers pass only player/bot entities — no tower/Core/structure flows
  through it with `activeColossusMaxHp` set, so towers can never gain HP
  from the Colossus modifier. (If a structure path is ever found, that is a
  new bug to report, not to fix silently.)
- **Ranked pass overhaul `[BUILDER PICK]` (full table — Anthony said "you
  choose"):** 50 tiers, 200 XP per tier, 10,000 XP total, single free track,
  no premium track, chapters render-only (1–10 Bronze, 11–20 Silver, 21–30
  Gold, 31–40 Fume, 41–50 Legend). Totals: 8,700 coins, 645 souls, 100 gems,
  16 tappers, 5 Starr Drops (rare / super-rare / mythic ×2 / legendary),
  2 titles, 3 frames, 5 pin packs (15 pins via `grantPinPack`), 1 skin.
  Pace: ~155 XP/match at 50% win rate outside Forge ≈ 65 matches for the
  full pass, ≈ 13/week over a 5-week minimum pace — the 2,000 XP/week cap
  binds only on players averaging 13+ ranked matches/week. Pin packs at
  tiers 5 (Bronze, rare), 15 (Silver, epic), 25 (Gold, epic), 35 (Fume,
  mythic), 45 (Legend, legendary). Titles: Brick Scout (7), Point Vanguard
  (21). Frames: Ranked Cyber (20), Golden Division (30), Master Fume Crest
  (40). Tier 50: Ranked Rocketeer skin (auto-equip, grand finale card +
  Try in Training unchanged). Pass title `3-MONTH SEASON 1` unchanged.
  **Dropped vs the old table:** tier-20 Epic Starr Drop, tier-25 Epic Starr
  Drop, tier-10 Tapper (displaced), tier-35 Apex Striker title, tier-45
  Grandmaster title. **No season rollover invented:** nothing increments
  `seasonId` today, and inventing a rollover date would silently wipe
  progress — `passXp`/`passClaimed` reset is out of scope.
- **Pin-pack claim (fail-closed):** guard before the push — if
  `grantPinPack` is not a function, a pinpack tier stays unclaimed and no
  other reward on that tier is granted; a collection-complete pack is a
  successful claim (250 coins/missing pin fallback, never treated as
  failure). Ranked code never writes `playerData.pins` directly, never
  touches `equipped`, never defines pin art/names/equip UI.
- **Pass UI:** chapter headers (BRONZE/SILVER/GOLD/FUME/LEGEND) as full-width
  rows; progress subtitle gains the weekly line; pin-pack cards show the
  honest subtext "3 random unowned pins (250 Coins each if your collection
  is complete)" — never `rp_*` ids (the spec's `rp_*` pin ids do not exist
  and were deleted, not implemented; `addPins` with a named already-owned
  pin would silently grant nothing, so named pins must not be used).

## 12. Files changed

- `game.js` — everything above (86,523 lines before W2; see backups).
- `index.html` — `pins.css` link (pins pass), `master-update.css` link
  (W4 UI), events heading → "POPULAR EVENTS - ALWAYS AVAILABLE" (E-16).
- `styles.css` — match-card CSS (W3; appended, not `pins.css`).
- `master-update.css` (new) — dialog scale, home-button unification,
  profile/pins styles (W4 UI).
- `pins.css` (new) — pins hub + in-match pin styles (pins pass).
- `modules/visuals/roster-2p5d.js` — 7 emoji-brawler migrations (W3).
- `tests/match-cards-pins-icons-regression.mjs` (new, W3) — 18 checks.
- `tests/ranked-weekly-maxout-regression.mjs` (new, W2 §I) — weekly cap
  math + settlement + prestige/floor/MVP/pinpack-order mirrors.
- `tests/master-update-regression.mjs` (new) — Core Pieces cut, Soul
  Summoner random, pins, match cards, weekly max-out, Ember Forge, quests,
  AI markers, profile wiring, UI classes.
- `tests/events-all-available-regression.mjs` (rewritten, W2 §H) — popular +
  daily rotation assertions; ALL EVENTS assertions replaced, not
  supplemented.
- `tests/events-persist-scroll-regression.mjs` (updated, W2 §B) — ALL EVENTS
  + old `availableIds` assertions replaced with POPULAR/ROTATING + new
  `availableIds`; PR #69 persistence assertions (restoreSelection/restoreTab)
  untouched and passing. The first-pass "re-run only" note for this file was
  wrong: it also asserted ALL EVENTS existence, which §B deletes by design.
- `tests/prop-hunt-regression.mjs` (test-only) — storm-guard pattern relaxed
  to the live multi-mode guard; guard itself untouched.
- `tests/quest-board-v3-regression.mjs` (updated, W4 Q-1/U-7) — claim-redraw
  pattern now expects `closeBoard(); … openQuestBoard(activeQuestTab);`
  instead of the old direct-remove + `openQuestBoard(tab)`; behavior
  preserved (re-opens on the remembered tab, plus focus return).
- `tests/brick-bon-profile-v2-regression.mjs` (updated, W4 profile) — Profile
  shortcut now asserted to open the new profile screen; Career tab asserted
  still present inside Brick Bon (it is — `openBrickBonV2('career')` simply
  has no caller anymore; the tab renders via the nav button).
- `tests/tower-duels-weekend-regression.mjs` (updated, M-1d/M-1e) —
  `duelPlayerLevel` asserted as unconditional `11` (identical in duels
  context); the `startDuelsRound` head window widened 3000 → 3100 chars
  (the test's window was already 99.4% full on pristine main — 2,982 of
  3,000 chars — and the spec'd M-1e slice spelling added 25 chars).
- `tests/soul-summoner-rework-regression.mjs` (updated, W1 terms) — STARR ROAD
  title assertions updated to SOUL ROAD (W1 rename; Starr is a Brawl Stars
  term, ordered out).
- `tests/ranked-modes-and-modifiers-regression.mjs` — `getAvailablePool`
  signature updated to the team-aware form + queue-pool/pinpack checks added.
- `tests/ranked-dual-modifiers-and-ranks-regression.mjs` — 2400 rung, weekly
  cap, prestige, pool, pinpack, MVP, no-`complete` checks added.
- `tests/mode-scale-regression.mjs` — NOT changed. Its card/rules assertions
  now pass via E-4/E-5; its 3200×3200 team-showdown world-size assertion
  still fails (see playtest item) and was deliberately not adopted or
  papered over.
- `tests/duels-overhaul-regression.mjs`, `tests/duels-mode-upgrade-regression.mjs`
  — NOT changed (see test results: they pin never-built features plus
  pre-M-1 API spellings; see §13).
- Backups in `.backups/` (primary stable backup never replaced):
  `game.js.master-update-start`, `game.js.master-update-pins-core`,
  `game.js.master-update-pins-ui`, `game.js.master-update-phase1-partial`,
  `game.js.master-update-w1-start`, `game.js.master-update-w1-applied`,
  `game.js.master-update-w3-start`, `game.js.master-update-w3-applied`,
  `game.js.master-update-w4-ai-pass-quests`,
  `game.js.master-update-w4-training-profile`,
  `game.js.master-update-w4-ui`, `game.js.master-update-w2a-start`,
  `game.js.master-update-w2b-applied`, `game.js.master-update-w2c-applied`,
  `game.js.master-update-w2d-applied`, `game.js.master-update-w2-all-applied`,
  plus `styles.css.master-update-w3-applied`, `master-update.css.w4-ui`.
- Specs in `.master-update-specs/`: `coordinator-state.md`,
  `worker1-economy-terms.md`, `worker2-events-modes-ranked.md`,
  `worker2-events-modes-ranked-edit-list.md` (W2 edit list, 930 lines),
  `worker3-pins-cards-icons.md`, `worker4-ai-training-pass-ui.md`.

## 13. Test results

- `node --check game.js`: clean after every applied edit group.
- New/updated W2 + master tests: `tests/ranked-weekly-maxout-regression.mjs`
  PASS; `tests/master-update-regression.mjs` 31/31;
  `tests/match-cards-pins-icons-regression.mjs` 18/18;
  `tests/events-all-available-regression.mjs` PASS;
  `tests/prop-hunt-regression.mjs` PASS;
  `tests/ranked-modes-and-modifiers-regression.mjs` 51/51;
  `tests/ranked-dual-modifiers-and-ranks-regression.mjs` 45/45;
  `tests/knockback-mode-stability-regression.mjs` PASS.
- Also passing after their spec'd test updates: events-persist-scroll,
  quest-board-v3, brick-bon-profile-v2, tower-duels-weekend,
  soul-summoner-rework (all failed in the suite run only because the run
  started before their test files were updated; all pass standalone now).
- Full-suite sweep (regression files only, deduped; non-regression helper
  scripts under `tests/` excluded — several need a live browser and are not
  runnable under plain `node`): compared against a pristine clone of main at
  `8ea69d4` run under the same loop. **Result: zero new failures.**
  Pristine main fails 37 regression files; this tree fails 35 — the exact
  same set minus two files this pass genuinely fixes:
  - `tests/knockback-mode-stability-regression.mjs` — fixed by M-6 (Fuel
    Bot Gadget 2 branch); fails on pristine, passes here.
  - `tests/prop-hunt-regression.mjs` — fixed by the test-only storm-guard
    pattern update; fails on pristine, passes here.
  - `tests/badbat-hypercharge-damage-regression.mjs` and
    `tests/beast-boss-god-mode-featured-regression.mjs` failed in the loaded
    suite runs but pass standalone in both trees — 60-second timeout flakes
    under concurrent load, not regressions (both re-verified standalone).
  - The five files this pass updated after the suite started
    (events-persist-scroll, quest-board-v3, brick-bon-profile-v2,
    tower-duels-weekend, soul-summoner-rework) all pass standalone now;
    their suite-run failures were the pre-update test files.
- Known failures remaining, all pre-existing and documented (none introduced
  by this pass):
  - `tests/mode-scale-regression.mjs`: fails ONLY on the 3200×3200
    team-showdown world-size assertion (line 19). Every card/rules
    assertion now passes. The 3200 expectation was deliberately not adopted
    (playtest item 5) and the test was deliberately not edited to hide it.
  - `tests/duels-overhaul-regression.mjs`: now passes through the constants,
    tower-duel-aware win score, "Choose 1–4 fighters" hint, and format
    assertions; fails from "temporary unlock and random-round rules are
    visible" onward. Remaining pins are never-built features, NOT M-1
    scope: all-power rounds every even round (`rollDuelsTowerLoadout`,
    `duelBotLastBrawler` reroll, `ALL ${…} TOWER POWERS` / `RANDOM TOWER
    POWERS` HUD strings, `ALL TOWER POWERS UNLOCKED • RANDOMIZED EACH
    ROUND` rules text) and the literal `launch.disabled = drafted.length
    === 0` spelling (the live button uses `launchBtn` + `updateLaunchBtn()`
    with identical enable-at-1 logic).
  - `tests/duels-mode-upgrade-regression.mjs`: fails from line 1
    (`DUELS_WIN_SCORE defined as 9`). It pins the pre-M-1 API that M-1
    deliberately replaced (`DUELS_WIN_SCORE` → `getDuelsWinScore()`,
    "4 Tower Power" → "5 Tower Powers", `deck.slice(0, 4)` → 5 powers,
    level ternary → always 11) plus never-built features
    (`openDuelsTeamSelectionModal`, `startDuelsMatch`, `renderDuelsHUD`,
    "⚔️ Start Duels (First to 9)" routing). The first-pass claim that both
    duels files would go FAIL → PASS via M-1 was wrong; M-1 implements the
    duels rework Anthony ordered, not the modal/HUD/all-power-rounds
    features these files pin. Building those is a separate order.
  - Other pre-existing failures from the first pass (tower-defense ×2,
    showdown-modifiers, power-play-showdown, arena-forge-availability):
    unchanged by this pass; see the suite run for their current state.
    The full pristine-vs-worktree comparison (37 pristine regression
    failures vs 35 here; the only differences are knockback + prop-hunt,
    both fixed here) is the authoritative result — no new failures.
- Flakes: 60-second timeout flakes under concurrent suite load
  (badbat-hypercharge-damage, beast-boss-god-mode-featured, and one
  prop-hunt second-pass run) — all pass standalone in both trees. No
  test was observed failing here that also fails on pristine main except
  the documented pre-existing set above.

## 14. Open questions for Anthony (decisions, not bugs)

1. **100-piece full-unlock ability price:** unchanged (the Core Pieces cut
   touched upgrade costs only). Is 100 still right, or should it move?
2. **Ranked-pass picks (all `[BUILDER PICK]` in §11):** 50 tiers / 200 XP,
   pin packs at 5/15/25/35/45, titles Brick Scout + Point Vanguard, frames
   Cyber / Gold Crest / Fume Master, Tier 50 Ranked Rocketeer, dropped
   Apex Striker + Grandmaster titles and two Epic drops. Correct, or change
   any tier?
3. **Weekly cap numbers:** 2,000 XP/week, 1 coin per 5 overflow XP, 300 coins
   + pin pack max bonus. Too tight / too generous?
4. **Prestige ladder:** 500 RP steps to Prestige 5 (2,400–4,400). Right pace?
5. **Family-boundary safety floors** (not per-division): keep, or build the
   full per-division ladder?
6. **Season 7 identity:** Ember Forge, January 2027. Rename / retheme?
7. **Soul Road** (ex-Starr Road): keep the name?
8. **Training mode splits** (Free / DPS / Duel / Healing labs): right splits?
9. **Profile pins:** refuse-at-full at 6, no FIFO eviction — keep, or bring
   back FIFO?
10. **Duels extras the tests pin but this pass did NOT build:** all-power
    rounds, modal team-selection flow, duels HUD score pips. Order them, or
    leave the tests failing as the record?
11. **Dead code:** `openSeasonPass()` unreachable circuit-overlay code —
    approve removal in a separate cleanup?
12. **Season 3 welcome line:** which line actually displays? (W1 edit deferred
    pending live verification.)

## 15. Needs Anthony's playtest (cannot be verified by tests)

1. Trio/Quad feel after M-4a: 5 teams of 4 spawn spread, squad-wipe
   elimination, Rally Beacon revive timing with 4-player squads.
2. Duels format after M-1: 1-fighter drafts (a single loss ends the match at
   first-to-7/9/15 — is that fun?), 4-fighter drafts, first-to-9 as default
   vs 7.
3. Damage Filler team size: `damageFillerTeamSize` defaults to 2; card/rules
   state no size, so no change made.
4. Corrupted Showdown with packets vaulted (`PACKETS_ENABLED = false`): does
   it still feel distinct from Solo, or Solo with a reskin?
5. **Team Showdown world size:** the mode-scale test wants 3200×3200 for
   duo/trio; live code uses the default world — cramped or fine at
   20 players? (This decides whether the test expectation is adopted.)
6. Boss difficulty/rewards: BlinkEye, Orbo, Ramage, WeeFee, Demon Villains,
   Headless (S4 ladder to Impossible XV), Tombstone (4 difficulties,
   +60/+120/+200/+350 coins), Beast God Mode (Oct 30 only — cannot be
   live-tested until the next Oct 30; use a mocked date in review, not a
   live match). Headless free-skin condition (clear Impossible XV)
   reachability.
7. Capture the Turkey: 3:00 length, first-to-3, carrier-drop behavior,
   whether its early-release card should stay popular after Nov 1 (it is in
   the popular list either way).
8. Prop Hunt: 2 seekers vs 6 hiders, 2:30 seek timer, 400 HP wrong-guess tax,
   500 shell-break spillover, 10s re-morph, 15s head start; hide-spot
   fairness on Crown Collapse.
9. Chaos Crown: 10 mystery guests, per-floor rules, 3-strike run, Floor 10
   CHAOS CLIMBER title — wiring verified, run feel not.
10. Power Play roster: does Ramage (9th entry) actually appear, or is the
    8-name rules text intended and Ramage the error? (Rules text now says 9.)
11. Daily rotation midnight rollover: does the selector rebuild exactly once
    at midnight without clobbering a mid-match selection (PR #69 restore
    logic must still win)?
12. Draft protect/swap/veto flows: captain vs member slots, fast-forward
    path, veto with 1 vs 3 modifiers, veto of primary shifting correctly.
13. Weekly cap boundary: a match landing exactly on 2,000 weekly XP (bonus
    fires once, overflow coins correct, next match in the same week earns 0
    pass XP but still earns RP).
14. Pin-pack claim when the collection is complete: `grantPinPack` pays 250
    coins per missing pin and the claim still records as claimed.
15. Prestige display at 2400+ RP (queue header `— MAX` + Prestige N, promo
    div including prestige coins/souls).
16. AI feel (playtest-only metrics): kite distance, hazard-escape latency,
    focus-fire convergence, super/gadget discipline, wall-break target
    switching, support trailing, dive-trigger override behavior.
17. Training overlay painting zones whose spawns are gated off in
    non-Free modes.
18. Ranked card PLAY RANKED wiring from the new profile screen (one tap).
19. Fighters-screen fix live confirmation (tap FIGHTERS with mallow or
    nightshade selected) — still pending from the earlier pass.
20. Tower Defense live confirmation (super/hyper charge on minion hits, no
    storm past 120 seconds) — still pending from the earlier pass.
21. God Mode warp question (VOID SHIFT text with each teleport) — still open,
    do not nag.
