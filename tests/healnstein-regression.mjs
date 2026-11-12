// Healnstein (Epic Support) + Voltastein hyper wall-bounce + Spikey Super bounce.
// Source-presence + behavior mirrors. No DOM/match runtime needed.
// Roster portrait/draw are exercised live at the bottom via a stub canvas ctx.
// traceLobLeg is exercised live by extracting + eval'ing it with fake walls.
import fs from 'fs';
import '../modules/visuals/roster-2p5d.js';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const num = (re) => { const m = game.match(re); return m ? Number(m[1]) : NaN; };
const scale = (lv) => 0.55 + (lv - 1) * 0.045;
const hpScale = (lv) => 0.40 + (lv - 1) * 0.06;
const allBrawlers = () => [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const DISABLED = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];

// --- Registration: Healnstein ---
check('brawlerData.healnstein exists, Epic Support, green', game.includes("'healnstein': {") && game.includes("name: 'Healnstein', role: 'Support', rarity: 'Epic', color: '#4ade80'"));
check('kit copy is real (no coming-soon placeholders)', (() => {
  const h = game.slice(game.indexOf("'healnstein': {"), game.indexOf("'healnstein': {") + 2600);
  return h.includes('Bouncing Remedy') && h.includes('Healing Poison') && h.includes('Extra Bounce') && h.includes('Antidote Shield') && h.includes('Bigger Bounces') && h.includes('Lingering Toxin') && !h.includes('coming soon');
})());
check('getScaledStats healnstein branch: 6200 HP / 750 dmg / 280 speed', game.includes("if (brawlerId === 'healnstein') {") && game.includes('hp: Math.round(6200 * hpScale), dmg: Math.round(750 * scale), speed: 280'));
check('power scaling mirrors (HP curve): P1 2480/413, P12 6572/784', Math.round(6200 * hpScale(1)) === 2480 && Math.round(750 * scale(1)) === 413 && Math.round(6200 * hpScale(12)) === 6572 && Math.round(750 * scale(12)) === 784);
check('allBrawlers has healnstein; 108 ids total', (() => { const all = allBrawlers(); return all.includes('healnstein') && all.length === 108; })());
check('selectable is 100 (108 minus the 8 disabled, healnstein not disabled)', (() => {
  const all = allBrawlers();
  return all.filter(id => !DISABLED.includes(id)).length === 100 && !game.match(/const disabledBrawlers = new Set\(([\s\S]*?)\)\)/)[1].includes('healnstein');
})());
check('rarity maps: healnstein Epic (170 souls)', game.includes("healnstein: 'Epic'") && game.includes('Epic: 170'));
check('primary role: healnstein Support', game.includes("healnstein:'Support'"));
check('portrait icon: healnstein', game.includes("healnstein: '💚🩹'"));
check('reload/fire-delay/super-charge/gadget cooldowns', game.includes('healnstein: 1600,') && game.includes('healnstein: 300,') && game.includes('healnstein: 6') && game.includes('healnstein: { g1: 15000, g2: 15000 }'));
check('1 ammo: getNativeAmmoCapacity lists healnstein in the 1-ammo return', game.includes("brawlerId==='healnstein')return 1;") || game.includes("||brawlerId==='healnstein')return 1;"));
check('no skins for healnstein (none ordered)', (() => {
  const skinsBlock = roster.slice(roster.indexOf('const skins = {'), roster.indexOf('const skins = {') + 4000);
  return !skinsBlock.includes('healnstein');
})());

// --- Healnstein constants ---
check('main constants: 650 speed, 700 range, 750 dmg, heal 800, radii 100/130/160, hop 180', num(/const HEALNSTEIN_BULLET_SPEED = (\d+);/) === 650 && num(/const HEALNSTEIN_RANGE = (\d+);/) === 700 && num(/const HEALNSTEIN_MAIN_DMG = (\d+);/) === 750 && num(/const HEALNSTEIN_HEAL_PER_HIT = (\d+);/) === 800 && game.includes('const HEALNSTEIN_BOUNCE_RADII = [100, 130, 160];') && num(/const HEALNSTEIN_BOUNCE_HOP = (\d+);/) === 180);
check('needle constants: heal 3000, speed 1000, range 900, aim radius 160', num(/const HEALNSTEIN_NEEDLE_HEAL = (\d+);/) === 3000 && num(/const HEALNSTEIN_NEEDLE_SPEED = (\d+);/) === 1000 && num(/const HEALNSTEIN_NEEDLE_RANGE = (\d+);/) === 900 && num(/const HEALNSTEIN_NEEDLE_AIM_RADIUS = (\d+);/) === 160);
check('poison constants: 2 stacks of 300, 500ms tick, 4000ms damage window, 6s buff (8s SP2)', num(/const HEALNSTEIN_POISON_STACKS = (\d+);/) === 2 && num(/const HEALNSTEIN_POISON_PER_STACK = (\d+);/) === 300 && num(/const HEALNSTEIN_POISON_TICK_MS = (\d+);/) === 500 && num(/const HEALNSTEIN_POISON_DMG_MS = (\d+);/) === 4000 && num(/const HEALNSTEIN_POISON_BUFF_MS = (\d+);/) === 6000 && num(/const HEALNSTEIN_POISON_BUFF_SP2_MS = (\d+);/) === 8000 && 300 / (4000 / 500) === 37.5);
check('G2 shield 1000 for 5000ms; SP1 +20% radius / +200 heal; hyper 3 darts', num(/const HEALNSTEIN_G2_SHIELD = (\d+);/) === 1000 && num(/const HEALNSTEIN_G2_SHIELD_MS = (\d+);/) === 5000 && num(/const HEALNSTEIN_SP1_RADIUS_MULT = ([\d.]+);/) === 1.2 && num(/const HEALNSTEIN_SP1_HEAL_BONUS = (\d+);/) === 200 && num(/const HEALNSTEIN_HYPER_DARTS = (\d+);/) === 3);

// --- Healnstein systems functions ---
for (const fn of ['function traceLobLeg', 'function isHealnsteinEntity', 'function healnsteinHasSP1', 'function healnsteinHasSP2', 'function getHealnsteinBounceRadius', 'function getHealnsteinHealPerHit', 'function getHealnsteinPoisonBuffMs', 'function spawnHealnsteinRemedyOrb', 'function fireHealnsteinMain', 'function healnsteinRemedyExplode', 'function healnsteinPickNeedleTarget', 'function healnsteinPickBotNeedleTarget', 'function fireHealnsteinNeedle', 'function applyHealnsteinNeedleEffect', 'function healnsteinIsFighterTarget', 'function applyHealnsteinPoisonHit', 'function updateHealnsteinSystems', 'function castHealnsteinSuper', 'function executeHealnsteinG1', 'function executeHealnsteinG2']) {
  check(`systems function present: ${fn}`, game.includes(fn));
}
check('Healnstein SP gates accept LIVE values slow/long', game.slice(game.indexOf('function healnsteinHasSP1'), game.indexOf('function healnsteinHasSP1') + 160).includes("'slow'") && game.slice(game.indexOf('function healnsteinHasSP2'), game.indexOf('function healnsteinHasSP2') + 160).includes("'long'"));

// --- Main attack: 3 impacts, growing radius, heal + damage, wall bounce ---
check('fireHealnsteinMain: TRUE lobbed remedy — land point capped at range, flight-time maxLife, lob flag, 2 bounces (+1 G1)', game.includes("} else if (brawler === 'healnstein') {") && game.includes('isHealnsteinRemedy: true') && game.includes('pierceWalls: true') && game.includes('healnsteinLob: true') && game.includes('healnsteinLandX') && game.includes('healnsteinLandY') && game.includes('const throwDistance = Math.min(HEALNSTEIN_RANGE, Math.hypot(targetX - fromEntity.x, targetY - fromEntity.y));') && game.includes('maxLife: Math.max(.05, flightDistance / HEALNSTEIN_BULLET_SPEED)') && game.includes('const bouncesLeft = 2 + (fromEntity.healnsteinExtraBounceNext ? 1 : 0);'));
check('remedy expiry hook detonates at the landing point (Volt pattern)', game.includes('if (b.isHealnsteinRemedy && b.life >= b.maxLife && !b._healnsteinExploded)') && game.includes('healnsteinRemedyExplode(remedyOwner, b.healnsteinLob ? (b.healnsteinLandX ?? b.x) : b.x, b.healnsteinLob ? (b.healnsteinLandY ?? b.y) : b.y, b)'));
check('remedy orbs skip wall/unit collision while airborne (lob exemption, both sites)', (game.match(/isHealnsteinRemedy && b\.healnsteinLob\)\) continue;/g) || []).length === 2);
check('explode: enemies take P11 750, allies heal 800, caster never heals himself, no structures', game.includes('checkHit(target, { ownerBrawler: \'healnstein\', ownerId: owner.id, damage: stats.dmg, pierce: true, hitIds: {}, isHealnsteinRemedy: true }, -1);') && game.includes('doHeal(target, healAmt);') && game.includes('if (target.id !== owner.id)') && game.includes('if (target.isArenaForgeTower || target.isArenaForgeCore) continue;'));
check('re-heal: explode has no per-ally hit tracking — the same ally heals again on a later bounce', (() => {
  const fn = game.slice(game.indexOf('function healnsteinRemedyExplode'), game.indexOf('function healnsteinPickNeedleTarget'));
  return fn.includes('doHeal(target, healAmt)') && !fn.includes('healnsteinHealHitIds') && !fn.includes('hitIds[target.id]');
})());
check('bounce chain: explode spawns the forward continuation with the wall-reflected angle', game.includes('spawnHealnsteinRemedyOrb(owner, x, y, bullet.healnsteinAng || 0, HEALNSTEIN_BOUNCE_HOP, bullet.healnsteinBouncesLeft - 1, bounceIndex + 1, hyper, true);'));
check('bounce legs trace walls (spawnHealnsteinRemedyOrb uses traceLobLeg)', game.includes('const leg = traceLobLeg(fromX, fromY, ang, dist, (lx, ly) => isCircleBlockedByTerrain(owner, lx, ly, 12));'));
check('hyper main split: twin forks at the first impact (+0.45 rad, mirrors the continuation)', game.includes('if (hyper && bounceIndex === 0 && !bullet._healnsteinSplitDone)') && game.includes('spawnHealnsteinRemedyOrb(owner, x, y, (bullet.healnsteinAng || 0) + 0.45, HEALNSTEIN_BOUNCE_HOP, Math.max(0, (bullet.healnsteinBouncesLeft || 0) - 1), bounceIndex + 1, true, true);'));
check('remedy render + explosion render exist (green orb, healnsteinRemedy fxKind)', game.includes('if (b.isHealnsteinRemedy) {') && game.includes("if (ex.fxKind === 'healnsteinRemedy') {"));

// --- Super: needle skillshot ---
check('needle steer block: locks to the aim-chosen teammate, applies on contact (Decayer pattern)', game.includes('if (b.isHealnsteinNeedle) {') && game.includes('applyHealnsteinNeedleEffect(getEntityById(b.ownerId), needleTarget, b);') && game.includes('const hasNeedleTarget = b.healnsteinNeedleTargetId !== null && b.healnsteinNeedleTargetId !== undefined;'));
check('player needle lock: ally nearest the aim point within 160px; bots pick lowest-HP% ally in range', game.includes('if (d <= HEALNSTEIN_NEEDLE_AIM_RADIUS && d < bestD) { best = ally; bestD = d; }') && game.includes('if (Math.hypot(ally.x - entity.x, ally.y - entity.y) > HEALNSTEIN_NEEDLE_RANGE) continue;'));
check('needle effect: instant 3000 heal + 6s poison buff (8s SP2) + G2 shield (no sky strike)', game.includes('doHeal(target, HEALNSTEIN_NEEDLE_HEAL);') && game.includes('target.healnsteinPoisonUntil = now + getHealnsteinPoisonBuffMs(owner);') && game.includes('grantShield(target, HEALNSTEIN_G2_SHIELD, Math.max(HEALNSTEIN_G2_SHIELD, target.shieldMax || 0));') && !game.includes('isHealnsteinFamilyStrike'));
check('hyper Super: 3 darts at up to 3 different teammates + self-application', game.includes('const dartTargets = allies.slice(0, HEALNSTEIN_HYPER_DARTS);') && game.includes('for (const ally of dartTargets) fireHealnsteinNeedle(entity, ally);') && game.includes('applyHealnsteinNeedleEffect(entity, entity, null);'));
check('poison application: buffed attacks apply 2 fresh stacks (checkHit hook, tick-guarded, no structures)', game.includes('if (owner && target) applyHealnsteinPoisonHit(target, owner, b);') && game.includes('if (b && b.healnsteinPoisonTick) return false;') && game.includes('target.healnsteinPoisonStacks = stacks;') && game.includes('!target.isStructure && (!target.isPet || target.isTowerDefenseMinion)'));
check('poison ticks: 8 ticks, last tick takes the remainder so each stack totals exactly 300', game.includes('if (st.ticksLeft <= 1) tickDmg = Math.max(0, HEALNSTEIN_POISON_PER_STACK - (st.dealt || 0));') && game.includes('checkHit(target, { ownerBrawler: \'healnstein\', ownerId: st.ownerId, damage: tickDmg, pierce: true, super: true, hitIds: {}, healnsteinPoisonTick: true }, -1);') && game.includes('updateHealnsteinSystems(now);'));
check('G2 shield expires after 5s (Charmer G2 pattern)', game.includes('if ((e.healnsteinAntidoteShieldGranted || 0) > 0 && now >= (e.healnsteinAntidoteShieldExpiresAt || 0)) {') && game.includes('e.shield = Math.max(0, (e.shield || 0) - e.healnsteinAntidoteShieldGranted);'));
check('gadgets: G1 arms an extra bounce, G2 arms the antidote shield (first dart when hyper)', game.includes('entity.healnsteinExtraBounceNext = true;') && game.includes('entity.healnsteinAntidoteShieldNext = true;') && game.includes('const shielded = !!entity.healnsteinAntidoteShieldNext;'));
check('dispatch: player + bot super, player + bot gadgets, bot range 700', game.includes('castHealnsteinSuper(player, !!isHypercharged') && game.includes('castHealnsteinSuper(bot, isHyper') && game.includes('executeHealnsteinG1(player)') && game.includes('executeHealnsteinG2(player)') && game.includes('executeHealnsteinG1(bot)') && game.includes('executeHealnsteinG2(bot)') && game.includes("t.brawler === 'healnstein'") && game.includes('wantToShoot = distToTarget <= HEALNSTEIN_RANGE;'));

// --- Signature REMOVED (Family Circuit is Electrostien-only now) ---
check('NO signature for healnstein: no def, no state/activate/grant fns, no armed flag, no strike const, no win counter', !game.includes("healnstein: {\n          type: 'signature',") && !game.includes('Healnstein Signature Piece') && !game.includes('function getHealnsteinSignatureState') && !game.includes('function grantHealnsteinSignatureWin') && !game.includes('healnsteinFamilyCircuitArmed') && !game.includes('HEALNSTEIN_FAMILY_STRIKE_DMG') && !game.includes('playerData.healnsteinSignatureWins'));
check('NO signature wiring for healnstein: no button list/state/cost text, no win-grant call site', !game.includes("selectedBrawler === 'healnstein'") && !game.includes('getHealnsteinSignatureState(player)') && !game.includes('your next Healing Poison needle also calls a family sky strike') && !game.includes("completedMatchFighter === 'healnstein') grantHealnsteinSignatureWin();"));

// --- traceLobLeg, live (extracted + eval'd with fake walls) ---
function extractFn(src, name) {
  const start = src.indexOf('function ' + name);
  if (start < 0) return null;
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
const traceSrc = extractFn(game, 'traceLobLeg');
check('traceLobLeg extracts cleanly', typeof traceSrc === 'string' && traceSrc.includes('reflectAt'));
const traceLobLeg = traceSrc ? eval('(' + traceSrc.replace(/^function traceLobLeg/, 'function') + ')') : null;
check('traceLobLeg live: no wall — lands at full range, angle unchanged', (() => {
  if (!traceLobLeg) return false;
  const r = traceLobLeg(0, 0, 0, 100, () => false);
  return r.landX === 100 && r.landY === 0 && r.hitWall === false && r.traveled === 100 && r.angle === 0;
})());
check('traceLobLeg live: vertical wall at x=50 — lands at the face (48), reflects to PI', (() => {
  if (!traceLobLeg) return false;
  const r = traceLobLeg(0, 0, 0, 100, (x) => x >= 50);
  return r.landX === 48 && r.landY === 0 && r.hitWall === true && r.traveled === 48 && Math.abs(r.angle - Math.PI) < 1e-9;
})());
check('traceLobLeg live: horizontal wall at y=50, heading down — lands at (0,48), reflects to -PI/2', (() => {
  if (!traceLobLeg) return false;
  const r = traceLobLeg(0, 0, Math.PI / 2, 100, (x, y) => y >= 50);
  return Math.abs(r.landX) < 1e-9 && r.landY === 48 && r.hitWall === true && r.traveled === 48 && Math.abs(r.angle - (-Math.PI / 2)) < 1e-9;
})());
check('traceLobLeg live: corner (both axes blocked) — reverses', (() => {
  if (!traceLobLeg) return false;
  const r = traceLobLeg(0, 0, Math.PI / 4, 100, (x, y) => x >= 50 || y >= 50);
  return r.hitWall === true && Math.abs(r.angle - (Math.PI / 4 + Math.PI)) < 1e-9;
})());
check('traceLobLeg live: partial final step — endpoint inside the wall still bounces', (() => {
  if (!traceLobLeg) return false;
  const r = traceLobLeg(0, 0, 0, 100, (x) => x >= 100);
  return r.landX === 96 && r.hitWall === true && r.traveled === 96;
})());

// --- BUILD 2: Voltastein hyper wall-bounce ---
check('Volta hyper split legs trace walls (one reflection, then the reflected landing)', game.includes('const leg = traceLobLeg(x, y, a, VOLTASTEIN_HYPER_SPLIT_RANGE, (lx, ly) => isCircleBlockedByTerrain(owner, lx, ly, 12));') && game.includes('const leg2 = traceLobLeg(leg.landX, leg.landY, leg.angle, remaining, (lx, ly) => isCircleBlockedByTerrain(owner, lx, ly, 12));') && game.includes('const childFlyDist = Math.hypot(childLandX - x, childLandY - y);') && game.includes('maxLife: Math.max(.05, childFlyDist / VOLTASTEIN_BULLET_SPEED)'));
check('Volta hyper split still forks 2 children at +/-0.45 rad, 70% dmg, 100px, 300 range', game.includes('for (const off of [-0.45, 0.45]) {') && game.includes('VOLTASTEIN_HYPER_SPLIT_DMG_MULT') && game.includes('voltRadius: VOLTASTEIN_HYPER_SPLIT_RADIUS'));

// --- BUILD 3: Spikey Super bounce ---
check('Spikey growth constants: +20% radius, +150 damage per bounce', num(/const SPIKEY_SLAM_RADIUS_GROWTH = ([\d.]+);/) === 1.2 && num(/const SPIKEY_SLAM_DMG_GROWTH = (\d+);/) === 150);
check('Spikey slams still 1750 base per slam at P11 (superDmg 1750)', (() => {
  const sp = game.slice(game.indexOf("if (brawlerId === 'spikey') {"), game.indexOf("if (brawlerId === 'spikey') {") + 300);
  return sp.includes('superDmg: Math.round(1750 * scale)');
})());
check('Spikey slam math: radii 130/156/187, damage 1750/1900/2050 at P11', Math.round(130 * Math.pow(1.2, 0)) === 130 && Math.round(130 * Math.pow(1.2, 1)) === 156 && Math.round(130 * Math.pow(1.2, 2)) === 187 && 1750 + 0 === 1750 && 1750 + 150 === 1900 && 1750 + 300 === 2050);
check('castSpikeySuper: sequential slam legs trace walls + store per-slam radius/dmgBonus', game.includes('const leg = traceLobLeg(sx, sy, sAng, legDist, (lx, ly) => isCircleBlockedByTerrain(entity, lx, ly, 12));') && game.includes('radius: Math.round(SPIKEY_SUPER_RADIUS * Math.pow(SPIKEY_SLAM_RADIUS_GROWTH, s)), dmgBonus: s * SPIKEY_SLAM_DMG_GROWTH'));
check('resolveSpikeySlam: uses the per-slam radius + damage bonus (base fallback intact)', game.includes('const slamRadius = slam.radius || SPIKEY_SUPER_RADIUS;') && game.includes('const slamDmg = stats.superDmg + (slam.dmgBonus || 0);') && game.includes('AOEDamage(slam.x, slam.y, slamRadius, slamDmg, slam.ownerId, false);'));
check('Spikey hyper side balls unchanged: 2 balls, 500 dmg, 80px', game.includes('AOEDamage(sx, sy, SPIKEY_SIDE_BALL_RADIUS, SPIKEY_SIDE_BALL_DMG, slam.ownerId, false);') && num(/const SPIKEY_SIDE_BALL_DMG = (\d+);/) === 500 && num(/const SPIKEY_SIDE_BALL_RADIUS = (\d+);/) === 80);
check('Spikey vaulted traveling super NOT touched (still vaulted)', game.includes('function spikeySuperBounce(mega) {') && game.includes('SPIKEY_TRAVELING_SUPER_ENABLED = false'));

// --- Roster visuals (source + live) ---
check('roster visuals: healnstein look + identity', roster.includes("healnstein:['robot','#4ade80','#b6ff5e']") && roster.includes("healnstein:'heal_helm|remedy_needle|toxin_mark|robe'"));
check('roster live: portrait() returns truthy SVG for healnstein', (() => {
  const V = globalThis.BraweRosterVisuals;
  const p = V.portrait('healnstein');
  return typeof p === 'string' && p.length > 100 && p.includes('<svg');
})());
check('roster live: draw() returns true for healnstein with a stub ctx', (() => {
  const V = globalThis.BraweRosterVisuals;
  const stub = new Proxy({}, { get: (t, k) => { if (k === 'canvas') return {}; return () => {}; }, set: () => true });
  const e = { x: 100, y: 100, radius: 14 };
  return V.draw(stub, e, 100, 'healnstein', null, 0, false) === true && V.has('healnstein');
})());

// --- Untouched guards: Voltastein / Staticstein / Decayer / Aura Charmer ---
check('Voltastein NOT touched: 5800/900/280, volt 650/700/120, hyper split 0.70/100/300', game.includes('hp: Math.round(5800 * hpScale), dmg: Math.round(900 * scale), speed: 280') && game.includes('const VOLTASTEIN_BULLET_SPEED = 650;') && game.includes('const VOLTASTEIN_HYPER_SPLIT_DMG_MULT = 0.70;'));
check('Staticstein NOT touched: 6200/800/290, 12-donor registry intact', game.includes('hp: Math.round(6200 * hpScale), dmg: Math.round(800 * scale), speed: 290') && game.includes('const STATICSTEIN_DONOR_SHOTS = { fuser: fireFuserMain, runner: fireRunnerMain, nightshade: fireNightshadeMain, mallow: fireMallowMain, evil_doctor: fireEvilDoctorMain, mageny: fireMagenyMain, upiedown: fireUpiedownMain, bowlin_rida: fireBowlinRidaMain, rocketeer: fireRocketeerMain, scuba_diver: fireScubaDiverMain, jetpack: fireJetpackDonorBomb, outlit: fireOutlitMain };'));
check('Decayer NOT touched: radius 260, pulse render intact', game.includes('const DECAYER_AURA_RADIUS = 260;') && game.includes('DECAYER_AURA_RADIUS * pulse') && game.includes('DECAYER_AURA_RADIUS * (2 - pulse)'));
check('Aura Charmer NOT touched: radius still Decayer/2, update still wired', game.includes('const AURA_CHARMER_RADIUS = DECAYER_AURA_RADIUS / 2;') && game.includes('updateAuraCharmerAura(now);') && game.includes('function auraCharmerSlam(owner)'));

console.log(`healnstein: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
