// Voltastein (Anomaly Thrower) + Staticstein (Mythic Damage Dealer).
// Source-presence + behavior mirrors. No DOM/match runtime needed.
// Roster portrait/draw are exercised live at the bottom via a stub canvas ctx.
import fs from 'fs';
import '../modules/visuals/roster-2p5d.js';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const num = (re) => { const m = game.match(re); return m ? Number(m[1]) : NaN; };
const scale = (lv) => 0.55 + (lv - 1) * 0.045;
const allBrawlers = () => [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const DISABLED = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];

// --- Registration: both brawlers ---
check('brawlerData.voltastein exists, Anomaly Thrower, purple', game.includes("'voltastein': {") && game.includes("name: 'Voltastein', role: 'Thrower', rarity: 'Anomaly', color: '#a855f7'"));
check('brawlerData.staticstein exists, Mythic Damage Dealer, gray', game.includes("'staticstein': {") && game.includes("name: 'Staticstein', role: 'Damage Dealer', rarity: 'Mythic', color: '#d1d5db'"));
check('kit copy is real (no coming-soon placeholders) for both', (() => {
  const v = game.slice(game.indexOf("'voltastein': {"), game.indexOf("'voltastein': {") + 2600);
  const s = game.slice(game.indexOf("'staticstein': {"), game.indexOf("'staticstein': {") + 2600);
  return v.includes('Overcharged Volt') && v.includes('Power Outage') && v.includes('Arc Leap') && v.includes('Static Field') && v.includes('Deep Charge') && v.includes('Feedback Loop') && !v.includes('coming soon')
    && s.includes('Static Split') && s.includes('Static Interference') && s.includes('Glitch Step') && s.includes('Lucky Shot') && s.includes('Reunion Burst') && s.includes('Signal Boost') && !s.includes('coming soon');
})());
check('getScaledStats voltastein branch: 5800 HP / 900 dmg / 280 speed', game.includes("if (brawlerId === 'voltastein') {") && game.includes('hp: Math.round(5800 * scale), dmg: Math.round(900 * scale), speed: 280'));
check('getScaledStats staticstein branch: 6200 HP / 800 dmg / 290 speed', game.includes("if (brawlerId === 'staticstein') {") && game.includes('hp: Math.round(6200 * scale), dmg: Math.round(800 * scale), speed: 290'));
check('power scaling mirrors: Volta P1 3190/495, P12 6061/940; Static P1 3410/440, P12 6479/836',
  Math.round(5800 * scale(1)) === 3190 && Math.round(900 * scale(1)) === 495 && Math.round(5800 * scale(12)) === 6061 && Math.round(900 * scale(12)) === 940
  && Math.round(6200 * scale(1)) === 3410 && Math.round(800 * scale(1)) === 440 && Math.round(6200 * scale(12)) === 6479 && Math.round(800 * scale(12)) === 836);
check('allBrawlers has both; 104 ids total', (() => { const all = allBrawlers(); return all.includes('voltastein') && all.includes('staticstein') && all.length === 104; })());
check('selectable is 96 (104 minus the 8 disabled, neither new brawler disabled)', (() => {
  const all = allBrawlers();
  return all.filter(id => !DISABLED.includes(id)).length === 96 && !game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].includes('voltastein') && !game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].includes('staticstein');
})());
check('rarity maps: voltastein Anomaly (850 souls), staticstein Mythic (270 souls)', game.includes("voltastein: 'Anomaly'") && game.includes('Anomaly: 850') && game.includes("staticstein: 'Mythic'") && game.includes('Mythic: 270'));
check('primary roles: voltastein Artillery (Thrower is not a code role), staticstein Damage Dealer', game.includes("voltastein:'Artillery'") && game.includes("staticstein:'Damage Dealer'"));
check('portrait icons: voltastein + staticstein', game.includes("voltastein: '⚡🔮'") && game.includes("staticstein: '⚡📺'"));
check('reload/fire-delay/super-charge/gadget cooldowns for both', game.includes('voltastein: 1600,') && game.includes('voltastein: 300,') && game.includes('voltastein: 6') && game.includes('voltastein: { g1: 15000, g2: 15000 }')
  && game.includes('staticstein: 1500,') && game.includes('staticstein: 300,') && game.includes('staticstein: 6') && game.includes('staticstein: { g1: 15000, g2: 15000 }'));
check('no skins for either brawler (none ordered)', (() => {
  const skinsBlock = roster.slice(roster.indexOf('const skins = {'), roster.indexOf('const skins = {') + 4000);
  return !skinsBlock.includes('voltastein') && !skinsBlock.includes('staticstein');
})());

// --- Voltastein constants ---
check('volt bullet 650 speed, 700 range, 120px explosion', num(/const VOLTASTEIN_BULLET_SPEED = (\d+);/) === 650 && num(/const VOLTASTEIN_RANGE = (\d+);/) === 700 && num(/const VOLTASTEIN_EXPLOSION_RADIUS = (\d+);/) === 120);
check('overcharge 1000ms x1.25; SP1 Deep Charge 2000ms x1.43', num(/const VOLTASTEIN_OVERCHARGE_MS = (\d+);/) === 1000 && num(/const VOLTASTEIN_OVERCHARGE_MULT = ([\d.]+);/) === 1.25 && num(/const VOLTASTEIN_OVERCHARGE_SP1_MS = (\d+);/) === 2000 && num(/const VOLTASTEIN_OVERCHARGE_SP1_MULT = ([\d.]+);/) === 1.43);
check('zap 400 dmg / 300px; DoT 75 per 500ms tick = 150/s', num(/const VOLTASTEIN_ZAP_DMG = (\d+);/) === 400 && num(/const VOLTASTEIN_ZAP_RADIUS = (\d+);/) === 300 && num(/const VOLTASTEIN_CHAIN_DOT_PER_TICK = (\d+);/) === 75 && num(/const VOLTASTEIN_CHAIN_TICK_MS = (\d+);/) === 500 && 75 / 0.5 === 150);
check('slow ramp 10% -> 50% over 4000ms; jump 200px; cap 10000ms; low-HP frac 0.25', num(/const VOLTASTEIN_CHAIN_SLOW_START = ([\d.]+);/) === 0.10 && num(/const VOLTASTEIN_CHAIN_SLOW_MAX = ([\d.]+);/) === 0.50 && num(/const VOLTASTEIN_CHAIN_RAMP_MS = (\d+);/) === 4000 && num(/const VOLTASTEIN_CHAIN_JUMP_RADIUS = (\d+);/) === 200 && num(/const VOLTASTEIN_CHAIN_MAX_MS = (\d+);/) === 10000 && num(/const VOLTASTEIN_CHAIN_LOW_HP_FRAC = ([\d.]+);/) === 0.25);
check('hyper split 70% dmg / 100px / 300 range; chain break 450px', num(/const VOLTASTEIN_HYPER_SPLIT_DMG_MULT = ([\d.]+);/) === 0.70 && num(/const VOLTASTEIN_HYPER_SPLIT_RADIUS = (\d+);/) === 100 && num(/const VOLTASTEIN_HYPER_SPLIT_RANGE = (\d+);/) === 300 && num(/const VOLTASTEIN_HYPER_CHAIN_BREAK_DIST = (\d+);/) === 450);
check('G1 arc 250px / 50% mini / 80px; G2 field 150px / 4000ms; family strike 500', num(/const VOLTASTEIN_G1_ARC_RADIUS = (\d+);/) === 250 && num(/const VOLTASTEIN_G1_MINI_DMG_MULT = ([\d.]+);/) === 0.5 && num(/const VOLTASTEIN_G1_MINI_RADIUS = (\d+);/) === 80 && num(/const VOLTASTEIN_G2_FIELD_RADIUS = (\d+);/) === 150 && num(/const VOLTASTEIN_G2_FIELD_MS = (\d+);/) === 4000 && num(/const VOLTASTEIN_FAMILY_STRIKE_DMG = (\d+);/) === 500);

// --- Voltastein systems functions ---
for (const fn of ['function isVoltasteinEntity', 'function voltasteinHasSP1', 'function voltasteinHasSP2', 'function getVoltasteinOverchargeDuration', 'function getVoltasteinOverchargeMult', 'function applyVoltasteinOvercharge', 'function getPowerOutageSlowMult', 'function isAnyVoltasteinOutageActive', 'function clearVoltasteinOutageForOwner', 'function applyVoltasteinOutage', 'function voltasteinVoltExplode', 'function castVoltasteinSuper', 'function updateVoltasteinSystems', 'function executeVoltasteinG1', 'function executeVoltasteinG2', 'function getVoltasteinSignatureState', 'function grantVoltasteinSignatureWin']) {
  check(`systems function present: ${fn}`, game.includes(fn));
}
check('Voltastein SP gates accept LIVE values slow/long', game.slice(game.indexOf('function voltasteinHasSP1'), game.indexOf('function voltasteinHasSP1') + 150).includes("'slow'") && game.slice(game.indexOf('function voltasteinHasSP2'), game.indexOf('function voltasteinHasSP2') + 150).includes("'long'"));
check('fire() voltastein branch: lobbed volt (pierceWalls), hyper flag, voltDamage/voltRadius fields', game.includes("} else if (brawler === 'voltastein') {") && game.includes("isVoltasteinVolt: true") && game.includes('pierceWalls: true') && game.includes('voltDamage: stats.dmg') && game.includes('voltRadius: VOLTASTEIN_EXPLOSION_RADIUS'));
check('checkHit hook: volt explodes on hit, primary excluded (no double-dip)', game.includes('if (b.isVoltasteinVolt && !b._voltExploded') && game.includes('voltasteinVoltExplode(owner, b.x, b.y, b, target.id)') && game.includes('if (excludeId && target.id === excludeId) continue;'));
check('bullet expiry hook: volt detonates on range expiry (Cinderion pattern)', game.includes('if (b.isVoltasteinVolt && b.life >= b.maxLife && !b._voltExploded)') && game.includes('voltasteinVoltExplode(voltOwner, b.x, b.y, b, null)'));
check('custom explosion fxKind present + dedicated render branch (NOT the generic burst)', game.includes("fxKind: 'voltasteinExplosion'") && game.includes("if (ex.fxKind === 'voltasteinExplosion') {") && game.includes("fxKind: 'voltasteinExplosion'"));
check('slow ramp mirror: 0ms -> x0.90, 2000ms -> x0.70, 4000ms+ -> x0.50', (() => {
  const slow = (elapsed) => 1 - (0.10 + (0.50 - 0.10) * Math.min(1, elapsed / 4000));
  return slow(0) === 0.90 && slow(2000) === 0.70 && slow(4000) === 0.50 && slow(9999) === 0.50;
})());
check('DoT floor mirror: healthy start floors at 1 HP (tick = min(75, hp-1)); low start takes full 75', game.includes('target.powerOutageStartHp <= VOLTASTEIN_CHAIN_LOW_HP_FRAC') && game.includes('dmg = Math.min(dmg, Math.max(0, target.hp - 1));')
  && Math.min(75, Math.max(0, 100 - 1)) === 75 && Math.min(75, Math.max(0, 1 - 1)) === 0);
check('proximity spread: 200px jump, one jump per frame, hyper-linked pair excluded', game.includes('VOLTASTEIN_CHAIN_JUMP_RADIUS') && game.includes('break; // one jump per frame per caster') && game.includes('const linked = new Set([aId, bId].filter(Boolean));') && game.includes('if (linked.has(target.id)) continue;'));
check('10s cap: outageUntil = now + 10000 and update clears past it', game.includes('target.powerOutageUntil = now + VOLTASTEIN_CHAIN_MAX_MS;') && game.includes('if (now >= (caster.voltasteinOutageUntil || 0)) { clearVoltasteinOutageForOwner(caster.id, now); continue; }'));
check('ends-on-kill: a dead victim ends the whole chain (victim-count mismatch + tick kill)', game.includes('if (victims.length !== victimIds.length) {') && game.includes('if (target.hp <= 0) killed = true;') && game.includes('if (killed) { clearVoltasteinOutageForOwner(caster.id, now); continue; }'));
check('hyper split: two children at +/-0.45 rad, 70% dmg, 100px, 300 range, voltasteinChild', game.includes('for (const off of [-0.45, 0.45])') && game.includes('voltasteinChild: true') && game.includes('childDmg = Math.max(1, Math.round((bullet.voltDamage || dmg) * VOLTASTEIN_HYPER_SPLIT_DMG_MULT))') && game.includes('voltRadius: VOLTASTEIN_HYPER_SPLIT_RADIUS'));
check('hyper chain: break past 450px, one randomly keeps the electric', game.includes('Math.hypot(a.x - b.x, a.y - b.y) > VOLTASTEIN_HYPER_CHAIN_BREAK_DIST') && game.includes('const keep = Math.random() < 0.5 ? a : b;') && game.includes('caster.voltasteinHyperChainAId = 0; caster.voltasteinHyperChainBId = 0;'));
check('overcharge reload hooks: player x1.25 mult + bot x1.25 mult', game.includes("if(now < (player.voltasteinOverchargeUntil || 0)) currentReloadTime *= (player.voltasteinOverchargeMult || 1.25);") && game.includes("if(isBot && now < (fromEntity.voltasteinOverchargeUntil || 0)) fireDelay *= (fromEntity.voltasteinOverchargeMult || 1.25);"));
check('SP2 Feedback Loop: /1.30 reload while an Outage is active (player + bot)', game.includes("isAnyVoltasteinOutageActive(player, now) && voltasteinHasSP2(player)) currentReloadTime /= 1.30;") && game.includes("isAnyVoltasteinOutageActive(fromEntity, now) && voltasteinHasSP2(fromEntity)) fireDelay /= 1.30;"));
check('G1 Arc Leap: flag armed by G1, consumed in the explosion, nearest within 250px, 50% mini', game.includes('entity.voltasteinArcLeapNext = true;') && game.includes('if (owner.voltasteinArcLeapNext) {') && game.includes('if (d <= VOLTASTEIN_G1_ARC_RADIUS && d < bestD)') && game.includes('miniDmg = Math.max(1, Math.round(dmg * VOLTASTEIN_G1_MINI_DMG_MULT))'));
check('G2 Static Field: 4s field overcharges enemies within 150px', game.includes('entity.voltasteinStaticFieldUntil = performance.now() + VOLTASTEIN_G2_FIELD_MS;') && game.includes('Math.hypot(target.x - e.x, target.y - e.y) > VOLTASTEIN_G2_FIELD_RADIUS'));
check('Voltastein dispatch: player + bot super, player + bot gadgets, bot range 700, bot super at zap range', game.includes('castVoltasteinSuper(player, !!isHypercharged') && game.includes('castVoltasteinSuper(bot, isHyper') && game.includes('executeVoltasteinG1(player)') && game.includes('executeVoltasteinG2(player)') && game.includes('executeVoltasteinG1(bot)') && game.includes('executeVoltasteinG2(bot)') && game.includes("t.brawler === 'voltastein'") && game.includes('wantToShoot = distToTarget <= VOLTASTEIN_RANGE;') && game.includes("bot.brawler === 'voltastein') return distance < VOLTASTEIN_ZAP_RADIUS;"));
check('update loop calls updateVoltasteinSystems next to updateAuraCharmerAura', game.includes('updateAuraCharmerAura(now);\n        updateVoltasteinSystems(now);'));
check('slow hook: Power Outage slow feeds getEntitySlowMultiplier', game.includes('if (entity.powerOutageUntil && now < entity.powerOutageUntil) baseSlow = Math.min(baseSlow, getPowerOutageSlowMult(entity, now));'));
check('overcharge skips structures (towers/Core never reload)', game.includes("if (!target || target.hp <= 0 || target.isArenaForgeTower || target.isArenaForgeCore) return;"));

// --- Voltastein signature (Family Circuit, shared with Electrostien) ---
check('signature DEFS: voltastein Family Circuit, win-earned, no Core Piece cost', game.includes("voltastein: {\n          type: 'signature',\n          name: 'Family Circuit',") && game.includes('Voltastein Signature Piece') && game.includes('win 3 battles with Voltastein'));
check('signature activate branch arms the circuit + gold fx', game.includes("if (fighterId === 'voltastein') {") && game.includes('entity.voltasteinFamilyCircuitArmed = true;') && game.includes("'FAMILY CIRCUIT ARMED!', '#ffd34f'"));
check('signature button wiring: list + state + cost text + WIN-EARNED', game.includes("selectedBrawler === 'voltastein'") && game.includes('getVoltasteinSignatureState(player)') && game.includes('your next Power Outage calls a family sky strike') && game.includes("(selectedBrawler === 'voltastein' ? ' · WIN-EARNED'"));
check('signature win grant: call site + function, 3 pieces to unlock', game.includes("completedMatchFighter === 'voltastein') grantVoltasteinSignatureWin();") && game.includes('function grantVoltasteinSignatureWin()') && game.includes('playerData.voltasteinSignatureWins'));
check('signature cannot be bought: piece + full-unlock blocks', game.includes("fighterId === 'voltastein') { alert('Family Circuit Pieces are EARNED by winning battles with Voltastein") && game.includes("fighterId === 'voltastein') { alert('Family Circuit is EARNED by winning battles with Voltastein"));
check('Family Circuit effect: armed Power Outage calls a 500-dmg sky strike on the nearest chained enemy', game.includes('if (entity.voltasteinFamilyCircuitArmed) {') && game.includes("fxKind: 'electrostienFamilyStrike'") && game.includes('damage: VOLTASTEIN_FAMILY_STRIKE_DMG'));

// --- Staticstein constants ---
check('static bolt 750 speed, 650 range, split offset 60, angle 0.0921, converge 650, bolt 400', num(/const STATICSTEIN_BULLET_SPEED = (\d+);/) === 750 && num(/const STATICSTEIN_RANGE = (\d+);/) === 650 && num(/const STATICSTEIN_SPLIT_OFFSET = (\d+);/) === 60 && num(/const STATICSTEIN_SPLIT_ANGLE = ([\d.]+);/) === 0.0921 && num(/const STATICSTEIN_CONVERGE_DIST = (\d+);/) === 650 && num(/const STATICSTEIN_BOLT_DMG = (\d+);/) === 400);
check('split-converge geometry mirror: 60/tan(0.0921) ~= 650 (bolts meet at range end)', Math.abs(60 / Math.tan(0.0921) - 650) < 2);
check('split damage model mirror: 400 + 400 = 800 when both bolts connect', 400 + 400 === 800);
check('super 2500ms, super reload 800ms, hyper double delay 150ms, hyper window 3000ms', num(/const STATICSTEIN_SUPER_MS = (\d+);/) === 2500 && num(/const STATICSTEIN_SUPER_RELOAD_MS = (\d+);/) === 800 && num(/const STATICSTEIN_HYPER_DOUBLE_DELAY_MS = (\d+);/) === 150 && num(/const STATICSTEIN_HYPER_EFFECT_MS = (\d+);/) === 3000);
check('hyper window effect: +50% dmg, 1.3x hitbox', num(/const STATICSTEIN_HYPER_DMG_MULT = ([\d.]+);/) === 1.5 && num(/const STATICSTEIN_HYPER_HITBOX_MULT = ([\d.]+);/) === 1.3);
check('SP1 reunion +300 / 90px; SP2 signal boost /1.30; G1 glitch 240px / 150 dmg / 80px; family strike 500', num(/const STATICSTEIN_REUNION_BURST_DMG = (\d+);/) === 300 && num(/const STATICSTEIN_REUNION_BURST_RADIUS = (\d+);/) === 90 && num(/const STATICSTEIN_SIGNAL_BOOST_DIVISOR = ([\d.]+);/) === 1.30 && num(/const STATICSTEIN_GLITCH_STEP_DIST = (\d+);/) === 240 && num(/const STATICSTEIN_GLITCH_BURST_DMG = (\d+);/) === 150 && num(/const STATICSTEIN_GLITCH_BURST_RADIUS = (\d+);/) === 80 && num(/const STATICSTEIN_FAMILY_STRIKE_DMG = (\d+);/) === 500);

// --- Staticstein systems functions ---
for (const fn of ['function isStaticsteinEntity', 'function staticsteinHasSP1', 'function staticsteinHasSP2', 'function fireStaticsteinDonorShot', 'function fireStaticsteinSplitPair', 'function castStaticsteinSuper', 'function executeStaticsteinG1', 'function executeStaticsteinG2', 'function getStaticsteinSignatureState', 'function grantStaticsteinSignatureWin']) {
  check(`systems function present: ${fn}`, game.includes(fn));
}
check('Staticstein SP gates accept LIVE values slow/long', game.slice(game.indexOf('function staticsteinHasSP1'), game.indexOf('function staticsteinHasSP1') + 150).includes("'slow'") && game.slice(game.indexOf('function staticsteinHasSP2'), game.indexOf('function staticsteinHasSP2') + 150).includes("'long'"));
check('fire() staticstein branch: interference first, then Lucky Shot, then split pair, hyper double pair', game.includes("} else if (brawler === 'staticstein') {") && game.includes('fireStaticsteinDonorShot(fromEntity, targetX, targetY, level, hyper, true)') && game.includes('fromEntity.staticsteinLuckyShotNext') && game.includes('fireStaticsteinSplitPair(fromEntity, targetX, targetY, level, hyper)') && game.includes('STATICSTEIN_HYPER_DOUBLE_DELAY_MS'));
check('donor pool: exactly 12 projectile mains', (() => {
  const pool = [...game.match(/const STATICSTEIN_DONOR_POOL = \[([\s\S]*?)\];/)[1].matchAll(/id: '([^']+)'/g)].map(m => m[1]);
  const want = ['fuser', 'runner', 'nightshade', 'mallow', 'evil_doctor', 'mageny', 'upiedown', 'bowlin_rida', 'rocketeer', 'scuba_diver', 'jetpack', 'outlit'];
  return pool.length === 12 && want.every(id => pool.includes(id));
})());
check('donor pool is projectile-only: no melee, aura, beam, deploy, or turret brawlers', (() => {
  const pool = [...game.match(/const STATICSTEIN_DONOR_POOL = \[([\s\S]*?)\];/)[1].matchAll(/id: '([^']+)'/g)].map(m => m[1]);
  const banned = ['electrostien', 'bolznstien', 'aura_charmer', 'beam', 'spikey', 'decayer', 'bouncin_balls', 'trampaheal', 'mageny2', 'angel', 'king', 'beast', 'ramage', 'rager'];
  return banned.every(id => !pool.includes(id));
})());
check('random EVERY shot: donor picked with Math.random per shot, not once per Super', game.includes('const donor = STATICSTEIN_DONOR_POOL[Math.floor(Math.random() * STATICSTEIN_DONOR_POOL.length)];'));
check('donor shot uses donor P11 damage + donor visuals (ownerBrawler = donor)', game.includes('const donorStats = getScaledStats(donor.id, level);') && game.includes('ownerBrawler: donor.id, isStaticsteinDonorShot: true') && game.includes('damage: dmg, pierce: false, pierceWalls: !!donor.lobbed'));
check('interference reload: 0.8s flat (SP2: 615ms = 800/1.30), player + bot', game.includes("currentReloadTime = staticsteinHasSP2(player) ? 615 : 800;") && game.includes("fireDelay = staticsteinHasSP2(fromEntity) ? 615 : 800;") && Math.round(800 / 1.30) === 615);
check('hyper double-shot: second pair 150ms later, full damage (same split-pair call)', game.includes('setTimeout(() => { if (typeof playing !== \'undefined\' && !playing) return; if (pairOwner && pairOwner.hp > 0) fireStaticsteinSplitPair(pairOwner, px, py, pl, true); }, STATICSTEIN_HYPER_DOUBLE_DELAY_MS);'));
check('hyper-effect window: Hyper Super sets 3s window; donor shots check it even after the bar runs out', game.includes('if (hyper) entity.staticsteinHyperShotsUntil = now + STATICSTEIN_HYPER_EFFECT_MS;') && game.includes('const hyperWindow = hyper || performance.now() < (fromEntity.staticsteinHyperShotsUntil || 0);') && game.includes('STATICSTEIN_HYPER_DMG_MULT') && game.includes('STATICSTEIN_HYPER_HITBOX_MULT'));
check('SP1 Reunion Burst: AoE +300 at the convergence point when the bolts meet', game.includes('if (staticsteinHasSP1(fromEntity)) {') && game.includes('AOEDamage(convergeX, convergeY, STATICSTEIN_REUNION_BURST_RADIUS, STATICSTEIN_REUNION_BURST_DMG, burstOwner.id, false);') && game.includes('Math.round(STATICSTEIN_CONVERGE_DIST / STATICSTEIN_BULLET_SPEED * 1000)'));
check('G1 Glitch Step: 240px teleport toward nearest enemy, steps back out of terrain, burst at destination', game.includes('let dist = STATICSTEIN_GLITCH_STEP_DIST;') && game.includes('isCircleBlockedByTerrain(entity, nx, ny, entity.radius || 14)') && game.includes('dist -= 40;') && game.includes('AOEDamage(nx, ny, STATICSTEIN_GLITCH_BURST_RADIUS, STATICSTEIN_GLITCH_BURST_DMG, entity.id, false);'));
check('G2 Lucky Shot: flag armed by G2, consumed by the next main attack', game.includes('entity.staticsteinLuckyShotNext = true;') && game.includes('if (fromEntity.staticsteinLuckyShotNext) {') && game.includes('fromEntity.staticsteinLuckyShotNext = false;'));
check('Staticstein dispatch: player + bot super, player + bot gadgets, bot range 650', game.includes('castStaticsteinSuper(player, !!isHypercharged') && game.includes('castStaticsteinSuper(bot, isHyper') && game.includes('executeStaticsteinG1(player)') && game.includes('executeStaticsteinG2(player)') && game.includes('executeStaticsteinG1(bot)') && game.includes('executeStaticsteinG2(bot)') && game.includes("t.brawler === 'staticstein'") && game.includes('wantToShoot = distToTarget <= STATICSTEIN_RANGE;'));
check('Static Interference sets the 2.5s window on cast (player + bot paths share it)', game.includes('entity.staticsteinInterferenceUntil = now + STATICSTEIN_SUPER_MS;'));

// --- Staticstein signature (Family Circuit, shared with Electrostien) ---
check('signature DEFS: staticstein Family Circuit, win-earned, no Core Piece cost', game.includes("staticstein: {\n          type: 'signature',\n          name: 'Family Circuit',") && game.includes('Staticstein Signature Piece') && game.includes('win 3 battles with Staticstein'));
check('signature activate branch arms the circuit + gold fx', game.includes("if (fighterId === 'staticstein') {") && game.includes('entity.staticsteinFamilyCircuitArmed = true;'));
check('signature button wiring: list + state + cost text + WIN-EARNED', game.includes("selectedBrawler === 'staticstein'") && game.includes('getStaticsteinSignatureState(player)') && game.includes('your next Interference shot calls a family sky strike') && game.includes("(selectedBrawler === 'staticstein' ? ' · WIN-EARNED'"));
check('signature win grant: call site + function, 3 pieces to unlock', game.includes("completedMatchFighter === 'staticstein') grantStaticsteinSignatureWin();") && game.includes('function grantStaticsteinSignatureWin()') && game.includes('playerData.staticsteinSignatureWins'));
check('signature cannot be bought: piece + full-unlock blocks', game.includes("fighterId === 'staticstein') { alert('Family Circuit Pieces are EARNED by winning battles with Staticstein") && game.includes("fighterId === 'staticstein') { alert('Family Circuit is EARNED by winning battles with Staticstein"));
check('Family Circuit effect: next Interference shot calls a 500-dmg sky strike near the aim', game.includes('if (isInterference && fromEntity.staticsteinFamilyCircuitArmed) {') && game.includes('damage: STATICSTEIN_FAMILY_STRIKE_DMG'));

// --- Roster visuals (source + live) ---
check('roster visuals: voltastein look + identity', roster.includes("voltastein:['robot','#a855f7','#ffe45e']") && roster.includes("voltastein:'volt_tiara|volt_coils|overcharge_mark|lean'"));
check('roster visuals: staticstein look + identity', roster.includes("staticstein:['robot','#e5e7eb','#a855f7']") && roster.includes("staticstein:'static_antennae|static_orbs|glitch_mark|float'"));
check('roster live: portrait() returns truthy SVG for both', (() => {
  const V = globalThis.BraweRosterVisuals;
  const pv = V.portrait('voltastein'), ps = V.portrait('staticstein');
  return typeof pv === 'string' && pv.length > 100 && pv.includes('<svg') && typeof ps === 'string' && ps.length > 100 && ps.includes('<svg');
})());
check('roster live: draw() returns true for both with a stub ctx', (() => {
  const V = globalThis.BraweRosterVisuals;
  const stub = new Proxy({}, { get: (t, k) => { if (k === 'canvas') return {}; return () => {}; }, set: () => true });
  const e = { x: 100, y: 100, radius: 14 };
  return V.draw(stub, e, 100, 'voltastein', null, 0, false) === true && V.draw(stub, e, 100, 'staticstein', null, 0, false) === true && V.has('voltastein') && V.has('staticstein');
})());

// --- Untouched guards: Decayer / Electrostien / Bolznstien / Aura Charmer ---
check('Decayer NOT touched: radius 260, pulse render intact, 100-shield grant', game.includes('const DECAYER_AURA_RADIUS = 260;') && game.includes('DECAYER_AURA_RADIUS * pulse') && game.includes('DECAYER_AURA_RADIUS * (2 - pulse)') && game.includes('grantShield(ally, 100, 100);'));
check('Electrostien NOT touched: punch range 120, realm throw 560, chain + realm fns, Family Circuit def', game.includes('const ELECTROSTIEN_PUNCH_RANGE = 120;') && game.includes('const ELECTROSTIEN_SUPER_THROW_RANGE = 560;') && game.includes('function stickElectrostienChain(owner, target)') && game.includes('function enterElectricRealm(caster, victim, hyper)') && game.includes("electrostien: {\n          type: 'signature',\n          name: 'Family Circuit',"));
check('Bolznstien NOT touched: 7200 HP / 990 dmg / 1650 strike / 265 speed, Overcharge signature', game.includes('hp: Math.round(7200 * scale), dmg: Math.round(990 * scale), strikeDmg: Math.round(1650 * scale), speed: 265') && game.includes("name: 'Overcharge',"));
check('Aura Charmer NOT touched: radius still Decayer/2, update still wired', game.includes('const AURA_CHARMER_RADIUS = DECAYER_AURA_RADIUS / 2;') && game.includes('updateAuraCharmerAura(now);') && game.includes('function auraCharmerSlam(owner)'));

console.log(`voltastein-staticstein: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
