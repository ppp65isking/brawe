# Arena Forge (Brawe)

Arena Forge is a browser-first, top-down arena combat game built around an original roster, fast matches, unusual character mechanics, and long-term progression. Fight AI opponents in Showdown and team modes, unlock and upgrade brawlers, assemble loadouts, climb Ranked, and chase seasonal events and boss battles.

> **Current status:** actively developed playable prototype. The game runs locally in a modern browser and saves progress in browser storage. The active runtime is the classic-script build in `game.js` plus the roster modules loaded by `bootstrap.js` — see [Project layout](#project-layout).

## Play locally

No installation or build step is required.

1. Clone or download this repository.
2. Open [`index.html`](index.html) in Chrome, Edge, Firefox, or another modern browser.
3. Choose a brawler and mode from the home screen.
4. Select **PLAY** to start.

`index.html` loads `bootstrap.js`, which loads the module files (Pass Tokens, the 2.5D roster visuals, the registry, and the per-rarity roster files) and then `game.js`. Because these are classic scripts rather than ES modules, the game works from a plain local file without a web server.

Because saves use `localStorage`, progress belongs to the browser and local file origin used to launch the game. Clearing site data can erase that progress. Save data is stored under the `brawlGameProgress` local-storage key, with supporting keys for some preferences and event state.

## Current highlights

- **98 brawlers are registered in code** (the `allBrawlers` list in `game.js`, plus module-only registrations such as Duck, Dr0ne, Unhitabble, and The Deleter). **90 are currently selectable** — 8 are temporarily disabled and excluded from selection, bots, rewards, and quests while their kits are repaired: Robber, Boomer, Daggershard, Cluster, Witch, Adlof, Swimmer, and Blade Vane.
- Each brawler has a main attack, a Super, two Gadgets, two Star Powers, and a Hypercharge. Some fighters (for example Bouncin' Balls, Classy, Beast, Mageny, Beam, and Dashaholic) also have a **Signature** ability.
- **Power Levels 1–11** with stats that scale to their defined Power 11 values. Ranked and designated competitive or experimental modes can normalize brawlers to Power 11.
- **35 mode cards** on the home screen, spanning Showdown formats, 3v3 objectives, boss battles, limited events, and custom mutator games (see [Game modes](#game-modes)).
- **AI opponents** that fight, pursue objectives, and use brawler abilities, Gadgets, Supers, and event powers.
- **Progression and economy:** Coins, Gems, Souls, Bricks, Tappers and Super Tappers, quests and Contracts, Prestige, Trinkets, Blueprints, skins, and Ranked Points.
- **Loadout progression:** unlock and select Gadgets, Star Powers, and Hypercharges per brawler.
- **Desktop and touch controls** with a responsive canvas and on-screen controls on touch devices.

## The roster

Rarity in the live game is defined by `brawlerRarities` in `game.js`:

| Rarity | Count |
| --- | --- |
| Starter | 3 |
| Rare | 9 |
| Epic | 19 |
| Mythic | 31 |
| Exotic | 10 |
| Unique | 19 |
| Anomaly | 4 |

The three Starters — Outlit, Fuser, and Rocketeer — are unlocked by default. Other brawlers are unlocked mainly through the Soul Summoner, at Soul costs that rise with rarity.

Roles span Damage Dealer, Tank, Assassin, Support, Controller, Marksman, Thrower, and Specialist. Arena Forge is especially focused on mechanics that change how a match is read or controlled, including:

- **Looma:** stitches thread lines between planted anchors; enemies crossing a completed thread take damage and are slowed, and her Super is a spinning loom.
- **Copyphase:** downloads enemy phases into two slots, transforms into one stored identity, and summons the other as a clone.
- **Paradox:** teleports with a skip shot and manipulates allied and enemy projectile speed inside Relativity Zones.
- **Screener:** recharges a draining battery by landing screen hits and converts incoming shots through a projector field.
- **Xray:** reveals enemy ammunition through attacks and a deployable scanner.
- **Malakor:** permanently corrupts the arena with damaging Hell terrain that lasts until the match ends.
- **Teether:** attaches teeth, then temporarily converts the ammo display into an optional floss grapple timer.
- **Splitter:** creates recursively splitting projectile generations.
- **Blobert (Goonbob):** creates and collects goo puddles as a resource for a stronger jar Super.
- **Angel:** heals and briefly lifts allies while slowing enemies, with lethal-damage protection.
- **Demon:** throws a blade and chooses between recalling it or gliding to its landing point.
- **Warrior:** throws spears over walls and trades movement speed for an extreme reload burst in Final Stand.
- **Skeleflying:** drops explosive parachutes and opens sky portals that summon chasing Skeletroopers.
- **Carmela & Fudge:** a duo — Carmela pulls enemies or slingshots herself with caramel arms while Fudge encases enemies in chocolate shells.
- **Cinderion:** turns clean flame hits into a living solar orbit, then unleashes the whole formation as an expanding wheel.
- **Darkener:** blankets lanes in darkness and traps enemies inside a vision-blocking hexagonal prison.
- **Awakenator:** puts enemies to Sleep, remembers everyone he has slept, and corrupts their next attack.

Open the **Fighters** screen in-game for the complete current roster, exact Power 11 statistics, ability descriptions, loadouts, rarity, and ownership status.

## Game modes

The home screen exposes 35 mode cards: a permanent set, a rotating set (Target Rush, Control Clash, Vault Siege, Mirror, Power of the Gods, Solo Tower Defense, and The Impossible), and time-windowed features.

### Core modes

| Mode | Format | Objective |
| --- | --- | --- |
| Solo Showdown | 50-player free-for-all | Be the last fighter alive. |
| Duo Showdown | 25 teams of 2 | Keep your team alive and eliminate the others. |
| Trio Showdown | 15 teams of 3 | Outlast the other trios. |
| Brawe Ball | 3v3 soccer | Score on the enemy goal. |
| Knockout | 3v3, best of 3 rounds | Eliminate the enemy team each round. |
| Control Clash | 3v3 objective | Capture and control the central zone. |
| Tug Zone | 3v3 | Pull the moving zone home. |
| Brick Run | 3v3 construction race | Gather and use bricks to complete the team objective. |
| Vault Siege | 3v3 objective attack | Break the enemy core vault while defending yours. |
| Knock n Donate | 3v3 ring-out, friendly fire on | Knock opponents from the arena and win the rounds. |
| Damage Filler | Rotating 2v2/3v3 damage race | Reach the damage goal before the enemy team. |
| Target Rush | Objective hunt | Hunt marked targets for bonus points. |
| Mirror | 5v5 mirror match | Everyone uses the same randomly selected brawler. |
| Duels | 1v1, first to 9 | Draft 1–4 brawlers and out-pick your opponent. |

### Special and limited modes

| Mode | What it is |
| --- | --- |
| Custom Mutator Clash | Pick any mode and map, then add up to 3 mutators (Always Hyper, Friendly Fire, Giant Projectiles, Quickfire, and more). |
| Power Play Showdown | Limited mode with 5 curated Hypercharged fighters and 3 powers. |
| Corrupted Showdown | Season 3 Showdown variant with unstable Packet signals. |
| Chaos Crown | 10 floors, 10 mystery guests, 10 unique rules, 3 strikes. |
| Arena Forge 2.0 | 3v3 with three weapon towers and an expanded Blueprint deck. |
| Arena Forge: Overclocked | 3v3 with all four engines from spawn and four-direction bonus volleys. |
| Arena Forge: Minion Surge | 3v3 where fighter KOs rally armored reinforcements. |
| Power of the Gods | Limited solo mode with a high-power ruleset. |
| Solo Tower Defense | Solo defense: protect the tower from incoming waves. |
| The Impossible | 1v1 against an adaptive dodging AI. |
| Ranked | Competitive ladder using Ranked Points and tier divisions. |
| Training / Brawler Lab | Practice tools for testing kits, healing, and team setups. |

### Boss battles

Solo boss fights include **BlinkEye**, **Orbo**, **Bouncin' Balls**, **Ramage**, **Mega WeeFee**, the **Possessed Villains** (Demon Overlord) story battle, and the **Lava Villain** co-op ladder, which runs from Hard up to Impossible XV.

### Tower Trouble — currently retired

Tower Trouble (10 floors, a 12-brawler crew, and fused Transformation powers) and Tower Trouble: Grand Tour (20 floors, multi-mode) are Season 2 content. In the current code, `TOWER_EVENT_MODES_ENABLED` and `TOWER_POWER_SYSTEM_ENABLED` are both `false`, so Tower powers and Tower event modes are **temporarily retired**: collections are preserved and the modes are filtered out of the home rotation until the rework returns. The dedicated Tower Duels weekend and Power Vault weekend are also gated behind these flags and date windows.

## Season 3: Core Breaker

The current season system in code is **Season 3 — Core Breaker**, built around Packets:

- **Packet Collection:** 20 discoverable Packets across six Packet biomes.
- **Packet Discovery:** a signal map for tracking biome and signal progress.
- **Season Pass** with signal rewards, and **Season Quests** tied to discovering and triggering Packets.
- **Corrupted Showdown** as the season's chaos mode.
- The **Lava Villain** boss fight as the season's co-op event.

The season hub in code lists an end date of September 20, 2026.

## Controls

### Keyboard and mouse

| Action | Control |
| --- | --- |
| Move | `WASD` or Arrow Keys |
| Aim | Mouse cursor |
| Main attack | Hold or click the left mouse button |
| Gadget | `Q` |
| Signature (fighters that have one) | `R` |
| Super | Hold/aim with `E`, then release |
| Hypercharge | `F` |
| Select Star Power 1/2 | `1` / `2` |
| Start selected match | `Enter` |

Some brawlers intentionally alter the normal controls. Examples include Teether's timed floss attack, Demon's one-second blade glide choice, Copyphase's stored identities, and Money & Tax's two combat modes.

### Touch

Touch devices receive on-screen movement, attack, Gadget, Super, and Hypercharge controls. Landscape orientation is recommended.

## Progression

Arena Forge begins as a fresh local save and expands through several connected systems:

- **Coins** upgrade brawler Power Levels and support shop purchases.
- **Souls** progress the Soul Summoner and unlock new brawlers.
- **Gems** purchase premium or limited rewards.
- **Bricks** are each brawler's upgrade/progression track and feed Brick challenges and Prestige.
- **Tappers** grant rewards, with specialized variants for Supers, Hypercharges, and events.
- **Quests and Contracts** track matches, victories, damage, eliminations, Supers, Gadgets, survival, and mode objectives. Contract Levels pay out Tappers as they rise.
- **Ranked Points** move the player through ranked divisions.
- **Prestige and Trinkets** add long-term per-brawler goals and extra loadout pieces.
- **Blueprints** power the Arena Forge 2.0 deck and related systems.
- **Skins** range from effect-focused variants to higher-rarity cosmetic packages.

Normal matches use the selected brawler's current Power Level. Ranked and designated competitive or experimental modes can normalize brawlers to Power 11.

## SlopSushi / Tower cards

`slopsushi-cards.js` still defines the personalized card system built for the Tower/Sushi seasons: a generated deck for nearly every brawler, with cards that mutate that brawler's attack, Super, resource loop, or survivability, and fusion levels up to level 5. Because the Tower power system is currently disabled in `game.js` (see [Tower Trouble — currently retired](#tower-trouble--currently-retired)), these cards are not active in normal play right now. The definitions are kept so collections and decks survive until the rework returns.

## Project layout

```text
brawe/
├── index.html            # Page structure, HUD, and home-screen shell
├── bootstrap.js          # Error/recovery handling; loads modules, then game.js
├── game.js               # The active game: gameplay, UI, modes, AI, progression, saves (~78k lines)
├── modules/
│   ├── core/registry.js  # ArenaForgeModules registry for brawlers, modes, systems
│   ├── brawlers/         # Per-rarity roster registration (common → anomaly) + Outlit's full definition
│   ├── progression/      # Pass Tokens implementation
│   └── visuals/          # 2.5D roster visuals
├── slopsushi-cards.js    # Personalized Tower/Sushi card definitions
├── styles.css            # Main interface and responsive styling
├── tactical-ui.css       # Tactical HUD styling
├── fighter-gallery.css   # Fighter gallery styling
├── circuit-pass.css      # Circuit/Season pass styling
├── tests/                # Node regression tests (*-regression.mjs)
├── scripts/              # Audit, balance, and build helper scripts
└── README.md             # This file
```

The `src/` TypeScript/Phaser project, Vite config, and Capacitor/Android files also live in this repo, but they are **not** the active runtime — `bootstrap.js` explicitly keeps the legacy canvas game as the live build. `package.json` build scripts (`build`, `cap:*`, `android`) belong to that shell; its `postbuild` step copies `game.js` into `dist`.

## Development notes

- Reload `index.html` after editing the JavaScript or CSS files.
- Verify syntax after gameplay changes: `node --check game.js`.
- Run the relevant regression tests in `tests/` (for example `node tests/<name>-regression.mjs`) before calling a change done.
- Follow `AGENTS.md`: back up `game.js` (and any other affected core files) in `.backups/` before/after adding a new brawler and every few smaller features, and do not replace the primary stable backup until the build is confirmed stable.
- Browser developer tools are the quickest way to inspect runtime errors; `bootstrap.js` also surfaces real local runtime errors in an on-screen recovery panel.
- Most gameplay definitions currently live in `game.js`; roster registration is split into `modules/brawlers/`. Keep new isolated data tables in their own files when practical.
- Test a change in Training before checking normal modes, team modes, AI behavior, and event interactions.

## Credits and positioning

Arena Forge is an independent fan-made prototype inspired by top-down hero arena games. It is not affiliated with, endorsed by, or produced by Supercell. Brawl Stars and related names belong to their respective owners.
