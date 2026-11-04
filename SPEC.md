# Sheet Round 41 — Worker Spec (LIVE READ 2026-11-04 ~09:47)

Base: main `a8e8aee` ("Merge pull request #79"). Branch (coordinator only): `sheet-balance-fix-round-41`.
Sheet: `1DZplXipk5Is-UNO2u6BtvXvFV8EwbsJzx39sXgrUTl0`, tab Sheet1.
Columns: Name | Game ID | Super Charge Rate | (blank) | G1 Work? | G2 Work? | SP1 Work? | SP2 Work? | Balance Changes.

## RESOLVED: Dashaholic / Decayer
Anthony moved the content himself. LIVE STATE: row 25 Dashaholic = NAME ONLY (undone, DO NOT TOUCH).
Row 26 Decayer = DONE with the full rework entry below. Apply the rework to DECAYER only.
Done count = 41 (Decayer replaces Dashaholic; total unchanged).

## DONE DEFINITION
Row counts as done iff Name + Super Charge Rate + all four Work columns + Balance Changes are filled.
Rows with only a Name are NOT done — leave those brawlers' numbers EXACTLY as-is.
"Same" (Beam) and "N/A" (Upgradart) in the charge-rate column count as filled.

## GLOBAL RULES (apply to every worker)
1. Sheet numbers are POWER 11 values. Code stores BASE stats scaled by `getScaledStats`
   (scale = 0.55 + (level-1)*0.045; P11 = 1.0x base — VERIFY in code). Convert before writing;
   NEVER blindly overwrite a base value with a P11 value. Speed is NOT scaled.
   Percentages, counts, and durations are never scaled — verify each field's basis in code.
2. Any star-power gate you write MUST accept the live storage forms `'slow'` (SP1) and
   `'long'` (SP2) as well as legacy names, or it will fail live.
3. NEVER ship placeholder gadget/star-power/mode text. Implement rework text exactly as
   specified; where text is vague (e.g. "Viusals for main attack" — sheet spelling kept
   verbatim below), implement a sensible minimal treatment and FLAG it.
4. "No" fixes: make the gadget/star power work AS ORIGINALLY DESIGNED (intent from code
   comments, tooltips, tests). If intent is genuinely unclear, FLAG it — do not invent a
   new design.
5. Super Charge Rate column: VERIFY code behavior vs the sheet rate and REPORT mismatches
   flagged. Do NOT change charge mechanics unless the Balance Changes text explicitly says so.
6. Do NOT touch: Overdrive, Super Showdown, home screen, seasons, Core Surge HUD bar fix,
   God Mode warp, Voodoyou, PR #54 (Mallow G2/SP2), or any undone-row brawler.
7. Do NOT push, PR, merge, or edit the Google Sheet. Do NOT touch Nightshade's star-power
   gates (Anthony declined that fix 2026-10-28) — but DO apply her Balance numbers below.
8. Keep changes inside each brawler's own data/handler blocks. Do NOT change shared helpers
   unless unavoidable; if unavoidable, FLAG it in your report and keep it minimal.
9. Back up game.js under `.backups/` in your clone before/after (house rules: read AGENTS.md
   in your clone first).

## DONE ROWS (verbatim sheet text; row numbers are Sheet1 rows incl. header = row 0)

### GROUP A
- Row 1 Aegis | aegis | 5 hits | G1: No (DMG) | G2: Yes | SP1: Yes | SP2: Yes | Balance: --
  => FIX G1 so it works as designed (DMG-related). No number changes.
- Row 2 Amplifier | amplifier | 5 hits | all Yes | Balance: "Viusals for main attack"
  => Add sensible minimal main-attack visuals. FLAG the treatment.
- Row 3 Angel | angel | 6 hits (same) | G1: No | G2: Yes | SP1: Yes | SP2: No (Knockback) | Balance: "DMG 1600>1200. HC attack 3 shots> 2 shots"
  => FIX G1 + SP2 (Knockback) as designed; main DMG 1600>1200 (P11); HC attack 3>2 shots.
- Row 4 Anti-Royal | anti_royal | 5 hits | all Yes | Balance: "Reload speed -30%, Unload speed +40% slower"
  => Reload 30% slower; unload 40% slower. (Read: speeds reduced; verify sign convention in code and FLAG it.)
- Row 5 Awakenator | awakenator | 6 hits | all Yes | Balance: "DMG 950>1050"
- Row 6 AxeyWaxy | axeywaxy | 6 hits (same) | all Yes | Balance: "Super DMG 250>200"
- Row 7 BadBat | badbat | 7 Hits | all Yes | Balance: "Main attack now a straight telegraph and bat hp now decays."
  => Main attack becomes a straight telegraph; bat HP decays over time (pick decay numbers, FLAG them).
- Row 8 Beam | beam | Same | G1: Yes | G2: Yes | SP1: No | SP2: No | Balance: "Super can only stun 1 time now,"
  => FIX SP1 + SP2 as designed; super stun limited to 1 time (per super? per target? — verify in code, FLAG reading).
- Row 9 Beast | beast | 8 Full Hits | G1: Yes | G2: Yes | SP1: Rework | SP2: Yes | Balance: "DMG main attack 750>650, SP1 now gives a 30% decaying shield when starting beast mode, SP2 ammo gained is now 0.08-0.12"
  => Main 750>650; SP1 = 30% decaying shield on beast-mode start (decay rate = pick, FLAG); SP2 ammo gain 0.08-0.12 (verify current value + whether this is a range or a change, FLAG).
- Row 10 BlinkEye | blinkeye | 6 Hits | all Yes | Balance: "Main attack dmg 1850>1400"

### GROUP B
- Row 11 Blobert | goonbob | 6 Hits | all Yes | Balance: -- => NO CHANGE (counts as done).
- Row 12 Bolznstien | bolznstien | 7 Hits | all Yes | Balance: "Main attack dmg 1320>990, SP1 bonus dmg 25%>12.5%"
- Row 13 Boom-Arang | boom_arang | 8 Full Hits | all Yes | Balance: "1st main attack dmg 1100>1000, super pull strengh -25%"
- Row 14 Bouncin' Balls | bouncin_balls | 5 Full Hits | all Yes | Balance: "Ball dmg 285>190, balls now in sync."
  => Ball DMG 285>190; balls synchronized (verify current desync mechanism, FLAG approach).
- Row 15 Carmela & Fudge | carmela_fudge | 6 Hits | all Yes | Balance: "Main attack dmg range 1600-2500> 900-1750"
  => Main range 1600-2500 > 900-1750 (verify which field is "range" vs damage falloff, FLAG).
- Row 16 Chaird | chaird | 5 Hits | all Yes | Balance: -- => NO CHANGE.
- Row 17 Cheseypuff | cheseypuff | 7 Hits | all Yes | Balance: "SP2 now gives the third attack stage 30% more range but 20% less dmg."
- Row 18 Chickpig | chickpig | 7 Hits | all Yes | Balance: "Main attack posion 250>150, bacon dmg 1150>1000. super pig dmg 1200>600 but 30% faster hits"
- Row 19 Cinderion | cinderion | 30 Flames Hit | all Yes | Balance: "When a flame is added or removed, all others dont move to make symetrical it is smooth adding or removed when hit"
  => Flames no longer re-shift to stay symmetrical; smooth add/remove on hit. FLAG approach.
- Row 20 Classy | classy | 30 Notes Hit | all Yes | Balance: "Main attack dmg, approx 480ish > 350. Sp1 dmg up per hit is now a 3% dmg up."

### GROUP C
- Row 21 Copyphase | copyphase | 6 hits | all Yes | Balance: "Viusals for main attack" => minimal main-attack visuals, FLAG treatment.
- Row 22 Crystila | crystila | 7 Hits | all Yes | Balance: -- => NO CHANGE.
- Row 23 Cursed | cursed | 6 Hits | all Yes except SP1: No | Balance: "Main attack dmg 1500>1350, sp1 fix and 25>15% bonus dmg"
  => FIX SP1 as designed; main 1500>1350; SP1 bonus 25%>15%.
- Row 24 Darkener | darkener | 8 Hits | G1: Yes | G2: No | SP1: Yes | SP2: Yes | Balance: "Main attack dmg max ticks 5>4, dmg 800>600 per tick sp1 increasing dmg 25>20%, no more going through walls"
  => FIX G2 as designed; max ticks 5>4; tick DMG 800>600; SP1 increasing DMG 25%>20%; main no longer goes through walls.
- Row 26 Decayer | decayer | 7 Hits | G1: Yes | G2: Rework | SP1: Rework | SP2: Rework | Balance: "G2 now makes the next attack on impact slow for 80% for 1 sec. SP1, when decayer is at 50%+ shield, his shoots speed up as they travel. SP2, after decayer uses his super, he has a radius around him meduim radius that gives shield 100/0.6 sec to allies but not him. hc super rework: no longer makes extra shots after, but when using the hc super, it shoots 3 shots to allies that give them 2500 shield, and gives decayer a bonus dmg 1000 on next shot"
  => Implement all four reworks exactly. Picks to FLAG: SP1 projectile speed-up amount/curve; SP2 radius ("meduim" — pick px, FLAG); HC ally-shot behavior.
- Row 31 Electrostien | electrostien | 8 Punches/20 Chain Ticks | all Yes | Balance: "Super proj gets visuals, hc lightning -40% dmg."
  => Super projectile visuals (minimal sensible, FLAG); HC lightning DMG -40%.
- Row 32 Evil Doctor | evil_doctor | 6 Hits | G1: Yes | G2: Yes | SP1: Rework | SP2: Yes | Balance: "Main attack dmg 1675>1300, posion dmg 600>550. sp1 rework, every hit spawns a DNA with 300 hp and does 100 posion dmg for 3 sec. main attack viusals"
  => Main 1675>1300; poison 600>550; SP1: every hit spawns a DNA (300 HP) dealing 100 poison DMG for 3s (verify DNA mechanics in code or implement minimally, FLAG); main-attack visuals (FLAG treatment).
- Row 35 Fight'nFire | fightnfire | 6 Full Hits | G1: No | G2: Yes | SP1: Rework | SP2: Rework | Balance: "Main attack rework dmg, main fireball 1000 dmg, each shard does 200 dmg. Super dmg is now 50% less per shard. Sp1 rework, each shard has a 9% chance to freeze for 0.6s, and sp2 after a super your main attack shoots side shards on the side as it travels they do 200 dmg"
  => FIX G1 as designed; main fireball 1000 + shards 200 each; super 50% less per shard; SP1 9% freeze 0.6s per shard; SP2 post-super side shards 200 DMG.
- Row 39 Fuser | fuser | 30 Bullet Hits | G1: Rework | G2: Yes | SP1: Rework | SP2: Rework | Balance: "Main attack, 6 bullets now dealing 360 dmg each, 20% bigger, super fix size -50%, dmg full 5880>3400. G1 rework, next bullets go through walls, sp1, shoot 2 fast straight bullets every 4 attacks that heal 800 hp each if they hit. sp2, bullets grant allies a 120 shield"
  => Main 6 bullets x 360, 20% bigger; super size -50%, full DMG 5880>3400; G1 wall-piercing next bullets; SP1 2 fast straight bullets every 4 attacks healing 800 HP each on hit; SP2 bullets grant allies 120 shield.
- Row 42 Homer | homer | 7 Hits | G1: Yes | G2: Yes | SP1: Rework | SP2: Yes | Balance: "Main attack DMG 1800>1450, SP1 rework, Homing Shots deal 10% more dmg at homing level 50% or above. Super dmg 1250>990"
  => Main 1800>1450; super 1250>990; SP1: homing shots +10% DMG at homing level >=50%.

### GROUP D
- Row 47 JackTrade | jacktrade | 18 Cards Hit | G1: Yes | G2: Yes | SP1: Rework | SP2: Rework | Balance: "Main attack dmg 900>750 for 4 card attack. SP1 rework, after using a super your next attack has 5 cards with 750 dmg. SP2, rush order and regen are now applied to nearby teamates at 20% the strength"
  => Main 900>750 (4-card attack); SP1 post-super next attack = 5 cards at 750; SP2 rush order + regen apply to nearby teammates at 20% strength (radius = pick, FLAG).
- Row 48 Jetpack | jetpack | 6 Landings | G1: Rework | G2: Yes | SP1: Rework | SP2: Yes | Balance: "Main attack dmg range now 1100-2000 but 25% faster charging, and reload speed 20% faster. G1 now deploys a 3000 hp jet for a teamate to pick up to fly freely for 4 sec, if its destroyed no one gets it. Sp1, super flys 40% faster. super now requires a min dash where bombs dont overlap. hc rework, super bombs leave fire zones for 3 sec, main attack leaves one too"
  => Main DMG range 1100-2000 (code was 1500 min-2700 max per bomb at P11 — replace range); charging 25% faster; reload 20% faster; G1 = deployable 3000 HP jet a teammate picks up to fly freely 4s (destroyed = nobody gets it); SP1 super flies 40% faster; super requires a MINIMUM dash so bombs don't overlap (pick min distance, FLAG); HC: super bombs leave fire zones 3s + main attack leaves one too (zone DMG/radius = pick, FLAG).
- Row 49 Kage | kage | 32 Shurnkins Hit | all Yes | Balance: "Main attack cone -30% narrower, but damage -150 at all ranges. G2 nerf, -70% dmg because of 22k dmg at point blank."
  => Cone 30% NARROWER (NOT shorter — Anthony corrected this twice); DMG -150 at all ranges; G2 DMG -70%.
- Row 56 Money & Tax | money_and_tax | 4 Full Hits/8 Tax notes | all Yes | Balance: "Main attack coin full dmg 2640>2230, tax dmg (1 note) 545>1150"
- Row 57 Nightshade | nightshade | 24 Dagger Hits | all Yes | Balance: "Main attack base dmg 640>560, super dmg 1100>800, sp2 posion 20>18%"
  => Main 640>560; super 1100>800; SP2 poison 20%>18%. DO NOT touch her SP gates.
- Row 58 Oil Maker | oil_maker | 36 Flame Hits | G1: No | G2: No | SP1: Yes | SP2: Yes | Balance: "Main attack DMG 470>320, super uses, 3>2, hyper uses 5>3. SP1 enemy slow 25>15%, reload 30>18%, SP2 reload buff 25>10%, healing 200/s. reload speed base 50% slower."
  => FIX G1 + G2 as designed; main 470>320; super uses 3>2; hyper uses 5>3; SP1 slow 25%>15%, reload buff 30%>18%; SP2 reload buff 25%>10%; healing 200/s (verify what heals, FLAG); base reload 50% slower.
- Row 60 Outlit | outlit | Equalivlent to 5 point blank hits | all Yes | Balance: "Super dmg 4270>2300, point blank dmg 1880>1500"
- Row 69 Rocketeer | rocketeer | 8 Big Rocket Hits | all Yes | Balance: "Main attack big rocket dmg 2190>1400, mini rocket dmg 400 each. Super, spread out +20% more, hc super rework, it creates 6 rockets that spin around the super and expolde."
  => Big rocket 2190>1400; mini rockets 400 each; super spread +20%; HC super = 6 rockets spinning around the super that explode (rocket DMG/radius = pick, FLAG).
- Row 70 Runner | runner | 6 Hits | all Yes | Balance: -- => NO CHANGE.
- Row 89 Upgradart | upgradart | N/A | G1: Yes | G2: Rework | SP1: Yes | SP2: Yes | Balance: "Main attack dmg on stage 2-5 -150dmg each dart, hc returning darts do 15% of the og dmg now, super ONLY charges every 15s now, and lasts 30% shorter. G2 makes your next dart do no dmg but heals for 1000hp."
  => Darts stage 2-5 -150 DMG each; HC returning darts 15% of original DMG; super charges ONLY every 15s (cooldown gate, FLAG mechanics); super duration 30% shorter; G2 next dart 0 DMG, heals 1000 HP.
- Row 93 Xray | xray | 7 Hits | G1: No | G2: Rework | SP1: Yes | SP2: Yes | Balance: "main attack dmg 1700>1400, g2 now gives a 30% DR sheild for 3 sec. fix: he can see ammo again."
  => FIX G1 as designed; main 1700>1400; G2 = 30% damage-reduction shield for 3s; FIX ammo visibility (he can see ammo again — find the visibility bug, FLAG cause).
