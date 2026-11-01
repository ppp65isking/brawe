// Runner (Mythic Controller) + CC redesign + training self-effects lab.
// Source-presence + behavior mirrors. No DOM/match runtime needed.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const num = (re) => { const m = game.match(re); return m ? Number(m[1]) : NaN; };

// --- Registration ---
check('brawlerData.runner exists, Mythic Controller, purple color', game.includes("'runner': {") && game.includes("name: 'Runner', role: 'Controller', rarity: 'Mythic', color: '#b06bff'"));
check('runner kit copy is real (no coming-soon placeholders)', (() => {
  const entry = game.slice(game.indexOf("'runner': {"), game.indexOf("'runner': {") + 1500);
  return entry.includes('Wall-Breaker Kick') && entry.includes('Team Soles') && entry.includes('Home Stretch') && entry.includes('Dreaded Sprint') && !entry.includes('coming soon');
})());
check('getScaledStats runner branch: 6600 HP / 950 dmg / 290 speed', game.includes("if (brawlerId === 'runner') {") && game.includes("hp: Math.round(6600 * scale), dmg: Math.round(950 * scale), speed: 290"));
check('power scaling mirrors: P1 3630/523, P11 6600/950, P12 6897/993', (() => {
  const scale = (lv) => 0.55 + (lv - 1) * 0.045;
  return Math.round(6600 * scale(1)) === 3630 && Math.round(950 * scale(1)) === 523 && Math.round(6600 * scale(11)) === 6600 && Math.round(950 * scale(11)) === 950 && Math.round(6600 * scale(12)) === 6897 && Math.round(950 * scale(12)) === 993;
})());
check('allBrawlers has runner; 101 ids total', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  return all.includes('runner') && all.length === 101;
})());
check('selectable is 93 (101 minus the 8 disabled, runner not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];
  return all.filter(id => !disabled.includes(id)).length === 93 && !game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].includes('runner');
})());
check('rarity map runner Mythic (270 souls via SOUL_UNLOCK_COST_BY_RARITY)', game.includes("runner: 'Mythic'") && game.includes('Mythic: 270'));
check('primary role runner Controller', game.includes("runner:'Controller'"));
check('portrait icon runner sneaker', game.includes("runner: '👟'"));
check('reload 1500ms, fire delay 300ms, super-charge hits 6', game.includes('runner: 1500,') && game.includes('runner: 300,') && game.includes('nightshade: 6, runner: 6'));
check('gadget cooldowns runner g1/g2 15000', game.includes('runner: { g1: 15000, g2: 15000 }'));

// --- Kit constants ---
check('shoe 900 px/s, range 700 px, trail radius 40, trail life 3000ms', num(/const RUNNER_SHOE_SPEED = (\d+);/) === 900 && num(/const RUNNER_SHOE_RANGE = (\d+);/) === 700 && num(/const RUNNER_TRAIL_RADIUS = (\d+);/) === 40 && num(/const RUNNER_TRAIL_LIFE_MS = (\d+);/) === 3000);
check('trail speed 1.75, slow 0.75, overcharge 1.50 with MAX stacking rule', num(/const RUNNER_TRAIL_SPEED_MULT = ([\d.]+);/) === 1.75 && num(/const RUNNER_TRAIL_SLOW_MULT = ([\d.]+);/) === 0.75 && num(/const RUNNER_OVERCHARGE_SPEED_MULT = ([\d.]+);/) === 1.50 && game.includes('Math.max(RUNNER_TRAIL_SPEED_MULT, RUNNER_OVERCHARGE_SPEED_MULT)') && Math.max(1.75, 1.50) === 1.75);
check('overcharge 4s, trail DPS 300, overcharge trail life 1000ms', num(/const RUNNER_OVERCHARGE_MS = (\d+);/) === 4000 && num(/const RUNNER_OVERCHARGE_TRAIL_DPS = (\d+);/) === 300 && num(/const RUNNER_OVERCHARGE_TRAIL_LIFE_MS = (\d+);/) === 1000);
check('super rate 1.20 for 4s, hyper rate 1.20 for 4s, hyper patch 2000ms, reload 1.20 for 2000ms', num(/const RUNNER_SUPER_RATE_MULT = ([\d.]+);/) === 1.20 && num(/const RUNNER_SUPER_RATE_MS = (\d+);/) === 4000 && num(/const RUNNER_HYPER_RATE_MULT = ([\d.]+);/) === 1.20 && num(/const RUNNER_HYPER_PATCH_MS = (\d+);/) === 2000 && num(/const RUNNER_HYPER_RELOAD_MULT = ([\d.]+);/) === 1.20 && num(/const RUNNER_HYPER_RELOAD_MS = (\d+);/) === 2000);
check('G1 500 dmg / 220px knockback, G2 800 shield / 3000ms window', num(/const RUNNER_G1_DAMAGE = (\d+);/) === 500 && num(/const RUNNER_G1_KNOCKBACK_RADIUS = (\d+);/) === 220 && num(/const RUNNER_G2_SHIELD = (\d+);/) === 800 && num(/const RUNNER_G2_WINDOW_MS = (\d+);/) === 3000);
check('SP1 5%/s, SP2 6s cadence / 0.8s fear, tick 250ms', num(/const RUNNER_SP1_CHARGE_PER_SEC = (\d+);/) === 5 && num(/const RUNNER_SP2_INTERVAL_MS = (\d+);/) === 6000 && num(/const RUNNER_FEAR_MS = (\d+);/) === 800 && num(/const RUNNER_TRAIL_TICK_MS = (\d+);/) === 250);
check('trail tick damage mirrors: 300 DPS -> 75/tick, 200 DPS -> 50/tick', Math.round(300 * 250 / 1000) === 75 && Math.round(200 * 250 / 1000) === 50);

// --- Systems functions ---
for (const fn of ['function runnerStarChoice', 'function runnerHasSP1', 'function runnerHasSP2', 'function runnerTrailPatchAt', 'function getRunnerTrailSpeedMult', 'function spawnRunnerTrailSegment', 'function applyRunnerFear', 'function grantRunnerSuperShoe', 'function castRunnerSuper', 'function executeRunnerG1', 'function executeRunnerG2', 'function applyRunnerWallBreakAoE', 'function updateRunnerSystems', 'function renderRunnerEffects', 'function drawRunnerShoe']) {
  check(`systems function present: ${fn}`, game.includes(fn));
}
check('SP gates accept LIVE values slow/long (not only sp1/sp2)', game.includes("return c === 'sp1' || c === 'slow';") && game.includes("return c === 'sp2' || c === 'long';") && game.slice(game.indexOf('function runnerHasSP1'), game.indexOf('function runnerHasSP1') + 300).includes("'slow'"));

// --- Dispatch: fire / super / gadget ---
check('fire() runner branch: wall-break flag consumed, fear carried, 1.3 hitbox', game.includes("} else if (brawler === 'runner') {") && game.includes('runnerWallBreak: wallBreak') && game.includes('runnerFear: fearCarried') && game.includes('hitboxMod: 1.3, hyperVisual: runnerHyper'));
check('G1 uses dedicated runnerWallBreakNext flag (not gadgetArmed)', game.includes('entity.runnerWallBreakNext = true') && game.includes('const wallBreak = !!fromEntity.runnerWallBreakNext'));
check('player + bot super dispatch call castRunnerSuper', game.includes("castRunnerSuper(player, !!isHypercharged") && game.includes('castRunnerSuper(bot, isHyper'));
check('player + bot gadget dispatch call executeRunnerG1/G2', game.includes('executeRunnerG1(player)') && game.includes('executeRunnerG2(player)') && game.includes('executeRunnerG1(bot)') && game.includes('executeRunnerG2(bot)'));
check('super excludes caster, grants rate + hyper fill/rate, sets overcharge', game.includes('e.id !== entity.id && areAlliedEntities(entity, e)') && game.includes('ally.runnerSuperRateUntil') && game.includes('ally.superCharge = 100') && game.includes('ally.runnerHyperRateUntil') && game.includes('entity.runnerOverchargeUntil = now + RUNNER_OVERCHARGE_MS'));
check('G2 window pattern: window + granted-set (not armed flag)', game.includes('entity.runnerShieldWindowUntil = performance.now() + RUNNER_G2_WINDOW_MS') && game.includes('entity.runnerShieldGranted = {}'));

// --- Bullet loop + checkHit ---
check('super shoes home + grant on arrival + die if target dead', game.includes('if (b.isRunnerSuperShoe) {') && game.includes('getEntityById(b.runnerSuperTargetId)') && game.includes('grantRunnerSuperShoe(shoeTarget, b.runnerSuperHyper)'));
check('main shoes lay trail every 0.15s + G2 shield grant on ally contact', game.includes('if (b.isRunnerShoe) {') && game.includes('b.runnerTrailTimer >= 0.15') && game.includes('grantShield(ally, RUNNER_G2_SHIELD'));
check('hyper expiry drops 2s patch + shoe pickup, then splices', game.includes('if (b.isRunnerShoe) {') && game.includes("spawnRunnerTrailSegment(hyperOwner, b.x, b.y, { lifeMs: RUNNER_HYPER_PATCH_MS })") && game.includes('runnerHyperShoePickups.push('));
check('checkHit hooks: fear consumed once + wall-break AoE once', game.includes("if (b.runnerFear && owner.runnerFearArmed) { applyRunnerFear(target, owner); owner.runnerFearArmed = false; }") && game.includes("if (b.runnerWallBreak && !b.runnerWallBreakAoEDone) { b.runnerWallBreakAoEDone = true; applyRunnerWallBreakAoE(b, target.x, target.y, target); }"));
check('fear respects CC immunity + stores source position (not reference)', game.includes('if (isEntityCcImmune(target, now)) return;') && game.includes('target.runnerFearFromX = owner.x; target.runnerFearFromY = owner.y;'));
check('wall-break AoE skips direct target damage but knocks back in radius', game.includes('if (directTarget && target.id === directTarget.id) continue;') && game.includes('applyKnockback(target, impactX, impactY, RUNNER_G1_KNOCKBACK_RADIUS'));

// --- Charge / reload / slow / speed / fear movement ---
check('charge hooks: super rate x1.2 + hyper rate x1.2 in grantMainAttackCharge', game.includes('if (chargeNow < (owner.runnerSuperRateUntil || 0)) gain *= RUNNER_SUPER_RATE_MULT;') && game.includes('if (chargeNow < (owner.runnerHyperRateUntil || 0)) modeHyperGain *= RUNNER_HYPER_RATE_MULT;'));
check('player reload hook in getReloadTime', game.includes("if (brawler === 'runner' && performance.now() < (player.runnerReloadBuffUntil || 0)) base /= RUNNER_HYPER_RELOAD_MULT;"));
check('bot reload hook on fireDelay in fire()', game.includes("if(isBot && brawler === 'runner' && now < (fromEntity.runnerReloadBuffUntil || 0)) fireDelay /= RUNNER_HYPER_RELOAD_MULT;"));
check('slow hook: runnerSlowUntil x0.75 after immunity gate', game.includes('if (now < (entity.runnerSlowUntil || 0)) baseSlow = Math.min(baseSlow, RUNNER_TRAIL_SLOW_MULT);'));
check('player + bot speed lines multiply getRunnerTrailSpeedMult', game.includes('getMallowSp1SpeedMult(player, now) * getRunnerTrailSpeedMult(player, now)') && game.includes('getMallowSp1SpeedMult(t, now) * getRunnerTrailSpeedMult(t, now)'));
check('player fear overrides input before stun/root zeroing', (() => {
  const fearAt = game.indexOf('player.runnerFearUntil');
  const zeroAt = game.indexOf("if (playerIsStunned || isEntityRooted(player, now)");
  return fearAt > 0 && zeroAt > fearAt;
})());
check('bot fear overrides tactical move + suppresses shooting', game.includes('t.runnerFearUntil') && game.includes('tacticalMove = { dx: fdx / flen, dy: fdy / flen, shouldMove: true') && game.includes('if (nowTarget < (t.runnerFearUntil || 0)) wantToShoot = false;'));
check('SP1 passive charge 5/s on own trail, player + bot branches', game.includes('RUNNER_SP1_CHARGE_PER_SEC * dt') && game.includes('runnerTrailPatchAt(e)'));
check('SP2 arming cadence: 6s re-arm via runnerFearNextAt', game.includes('e.runnerFearNextAt = now + RUNNER_SP2_INTERVAL_MS'));

// --- Wiring: update / render / resets ---
check('update() calls updateRunnerSystems', game.includes('if (playing && !gameOver) updateRunnerSystems(dt);'));
check('render calls renderRunnerEffects(ctx) with the canvas context', game.includes('renderRunnerEffects(ctx);'));
check('bullet draw dispatch draws runner shoes before universal skin renderer', (() => {
  const shoeAt = game.indexOf("if (b.isRunnerShoe || b.isRunnerSuperShoe) {");
  const skinAt = game.indexOf('if (renderUniversalSkinProjectile(b, earlyProjectileSkin)) continue;');
  return shoeAt > 0 && skinAt > shoeAt;
})());
check('respawn clears runner fields at both reset sites', (game.match(/entity\.runnerOverchargeUntil = 0;/g) || []).length === 2);
check('match reset clears runnerTrailSegments', game.includes('runnerTrailSegments.length = 0;'));
check('no truthiness-guard on runner ids in ally filter', !/e\.id &&/.test(game.slice(game.indexOf('function castRunnerSuper'), game.indexOf('function castRunnerSuper') + 800)));

// --- CC redesign (visuals only) ---
check('chips extended: ROT/SLP/DBT/NPS/FER', game.includes("chips.push({ t: 'ROT'") && game.includes("chips.push({ t: 'SLP'") && game.includes("chips.push({ t: 'DBT'") && game.includes("chips.push({ t: 'NPS'") && game.includes("chips.push({ t: 'FER'"));
check('existing chips untouched (ICE/STN/SLW/PSN/BRN/TAG still present)', game.includes("chips.push({ t: 'ICE'") && game.includes("chips.push({ t: 'STN'") && game.includes("chips.push({ t: 'SLW'") && game.includes("chips.push({ t: 'PSN'") && game.includes("chips.push({ t: 'BRN'") && game.includes("chips.push({ t: 'TAG'"));
check('drawPlayerCcTreatment: priority order + immunity suppression + label', game.includes('function drawPlayerCcTreatment') && game.includes('STUNNED') && game.includes('FEARED') && game.includes('if (isEntityCcImmune(entity, now)) return;'));
check('player draw calls the CC treatment', game.includes('drawPlayerCcTreatment(ctx, player, player.x, drawY, player.radius);'));

// --- Training self-effects lab ---
check('training section tcSectionSelfEffects present', game.includes('id="tcSectionSelfEffects"'));
for (const id of ['tcSelfSlowBtn', 'tcSelfStunBtn', 'tcSelfRootBtn', 'tcSelfBurnBtn', 'tcSelfPoisonBtn', 'tcSelfIceBtn', 'tcSelfSleepBtn', 'tcSelfFearBtn', 'tcSelfReloadDebuffBtn', 'tcSelfClearBtn']) {
  check(`training self-effect button present: ${id}`, game.includes(`id="${id}"`) && game.includes(`querySelector('#${id}').onclick`));
}
check('training fear uses nearest bot or fallback point', game.includes('function') && game.includes('tcSelfFearSource') && game.includes('player.y - 300'));
check('training clear wipes all effect fields incl. nightshade stacks', game.includes("p.nightshadePoisonStacks = [];") && game.includes('p.runnerFearUntil = 0;'));

// --- Roster visuals + static select ---
check('roster-2p5d looks runner visor purple', roster.includes("runner:['visor','#b06bff','#ffffff']"));
check('roster-2p5d identities runner sprint tokens', roster.includes("runner:'sprint_cap|runner_shoe|speed_streak|lean'"));
check('index.html static option runner', html.includes('<option value="runner">Runner</option>'));

console.log(`runner-regression: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failed ? 1 : 0);
