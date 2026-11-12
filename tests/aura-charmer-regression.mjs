// Aura Charmer (Mythic Support) + Aura Farmer Hypercharge skin.
// Source-presence + behavior mirrors. No DOM/match runtime needed.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }
const num = (re) => { const m = game.match(re); return m ? Number(m[1]) : NaN; };

// --- Registration ---
check('brawlerData.aura_charmer exists, Mythic Support, violet color', game.includes("'aura_charmer': {") && game.includes("name: 'Aura Charmer', role: 'Support', rarity: 'Mythic', color: '#c084fc'"));
check('kit copy is real (no coming-soon placeholders)', (() => {
  const entry = game.slice(game.indexOf("'aura_charmer': {"), game.indexOf("'aura_charmer': {") + 2200);
  return entry.includes('Charm Slam') && entry.includes('Aura Charma') && entry.includes('Irresistible Pull') && entry.includes('Guardian Glow') && entry.includes('Growing Charm') && entry.includes('Stinging Aura') && !entry.includes('coming soon');
})());
check('getScaledStats aura_charmer branch: 6400 HP / 1050 dmg / 280 speed', game.includes("if (brawlerId === 'aura_charmer') {") && game.includes("hp: Math.round(6400 * hpScale), dmg: Math.round(1050 * scale), speed: 280"));
check('power scaling mirrors (HP curve): P1 2560/578, P11 6400/1050, P12 6784/1097', (() => {
  const scale = (lv) => 0.55 + (lv - 1) * 0.045;
  const hpScale = (lv) => 0.40 + (lv - 1) * 0.06;
  return Math.round(6400 * hpScale(1)) === 2560 && Math.round(1050 * scale(1)) === 578 && Math.round(6400 * hpScale(11)) === 6400 && Math.round(1050 * scale(11)) === 1050 && Math.round(6400 * hpScale(12)) === 6784 && Math.round(1050 * scale(12)) === 1097;
})());
check('allBrawlers has aura_charmer; 107 ids total (102 + Voltastein + Staticstein + Healnstein + Voodoyou + Pandy)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  return all.includes('aura_charmer') && all.length === 107;
})());
check('selectable is 99 (107 minus the 8 disabled, aura_charmer not disabled)', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const disabled = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];
  return all.filter(id => !disabled.includes(id)).length === 99 && !game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\)/)[1].includes('aura_charmer');
})());
check('rarity map aura_charmer Mythic (270 souls)', game.includes("aura_charmer: 'Mythic'") && game.includes('Mythic: 270'));
check('primary role aura_charmer Support', game.includes("aura_charmer:'Support'"));
check('portrait icon aura_charmer sparkle', game.includes("aura_charmer: '✨'"));
check('reload 1500ms, fire delay 300ms, super-charge hits 6', game.includes('aura_charmer: 1500,') && game.includes('aura_charmer: 300,') && game.includes('aura_charmer: 6'));
check('gadget cooldowns aura_charmer g1/g2 15000', game.includes('aura_charmer: { g1: 15000, g2: 15000 }'));

// --- Kit constants ---
check('aura radius is exactly half Decayer code radius (260/2 = 130)', game.includes('const AURA_CHARMER_RADIUS = DECAYER_AURA_RADIUS / 2;') && num(/const DECAYER_AURA_RADIUS = (\d+);/) === 260 && 260 / 2 === 130);
check('tick 900ms, heal 450, +60 max HP/tick, cap +600', num(/const AURA_CHARMER_TICK_MS = (\d+);/) === 900 && num(/const AURA_CHARMER_HEAL = (\d+);/) === 450 && num(/const AURA_CHARMER_MAX_HP_PER_TICK = (\d+);/) === 60 && num(/const AURA_CHARMER_MAX_HP_BONUS_CAP = (\d+);/) === 600);
check('max-HP cap is 10 ticks of +60', 600 / 60 === 10);
check('SP2 120/tick, SP1 growth 0.10/s cap 0.80', num(/const AURA_CHARMER_SP2_TICK_DMG = (\d+);/) === 120 && num(/const AURA_CHARMER_SP1_GROWTH_PER_SEC = ([\d.]+);/) === 0.10 && num(/const AURA_CHARMER_SP1_GROWTH_CAP = ([\d.]+);/) === 0.80);
check('SP1 growth per 900ms tick is 0.09 per teammate', Math.abs(0.10 * (900 / 1000) - 0.09) < 1e-9);
check('mark 4000ms x1.30, hyper scan x2.0, chase speed x1.80', num(/const AURA_CHARMER_MARK_MS = (\d+);/) === 4000 && num(/const AURA_CHARMER_MARK_DMG_MULT = ([\d.]+);/) === 1.30 && num(/const AURA_CHARMER_HYPER_SCAN_MULT = ([\d.]+);/) === 2.0 && num(/const AURA_CHARMER_CHASE_SPEED_MULT = ([\d.]+);/) === 1.80);
check('mark mirrors: 1050 slam -> 1365 on marked target; hyper scan 130 -> 260', Math.round(1050 * 1.30) === 1365 && 130 * 2.0 === 260);
check('hyper double-slam delay 350ms, chase 280 -> 504 speed', num(/const AURA_CHARMER_HYPER_DOUBLE_SLAM_DELAY_MS = (\d+);/) === 350 && Math.round(280 * 1.80) === 504);
check('G1 pull 100px / slow 0.70 / 2000ms, G2 shield 1200 / 5000ms', num(/const AURA_CHARMER_G1_PULL_PX = (\d+);/) === 100 && num(/const AURA_CHARMER_G1_SLOW_MULT = ([\d.]+);/) === 0.70 && num(/const AURA_CHARMER_G1_SLOW_MS = (\d+);/) === 2000 && num(/const AURA_CHARMER_G2_SHIELD = (\d+);/) === 1200 && num(/const AURA_CHARMER_G2_SHIELD_MS = (\d+);/) === 5000);

// --- Systems functions ---
for (const fn of ['function isAuraCharmerEntity', 'function auraCharmerHasSP1', 'function auraCharmerHasSP2', 'function getAuraCharmerRadius', 'function auraCharmerIsHidden', 'function auraCharmerWearsAuraFarmer', 'function auraCharmerSlam', 'function castAuraCharmerSuper', 'function executeAuraCharmerG1', 'function executeAuraCharmerG2', 'function getAuraCharmerChaseSpeedMult', 'function updateAuraCharmerAura']) {
  check(`systems function present: ${fn}`, game.includes(fn));
}
check('SP gates accept LIVE values slow/long', game.slice(game.indexOf('function auraCharmerHasSP1'), game.indexOf('function auraCharmerHasSP1') + 200).includes("'slow'") && game.slice(game.indexOf('function auraCharmerHasSP2'), game.indexOf('function auraCharmerHasSP2') + 200).includes("'long'"));

// --- Dispatch: fire / super / gadget / bot shooting ---
check('fire() aura_charmer branch: slam + hyper double slam after delay', game.includes("} else if (brawler === 'aura_charmer') {") && game.includes('auraCharmerSlam(fromEntity)') && game.includes('AURA_CHARMER_HYPER_DOUBLE_SLAM_DELAY_MS'));
check('player + bot super dispatch call castAuraCharmerSuper', game.includes("castAuraCharmerSuper(player, !!isHypercharged") && game.includes('castAuraCharmerSuper(bot, isHyper'));
check('player + bot gadget dispatch call executeAuraCharmerG1/G2', game.includes('executeAuraCharmerG1(player)') && game.includes('executeAuraCharmerG2(player)') && game.includes('executeAuraCharmerG1(bot)') && game.includes('executeAuraCharmerG2(bot)'));
check('bot shooting range is aura radius + target radius', game.includes("t.brawler === 'aura_charmer'") && game.includes('getAuraCharmerRadius(t, nowTarget) + (target.radius || 14)'));
check('update loop calls updateAuraCharmerAura next to updateDecayerAura', game.includes('updateDecayerAura(now);\n        updateAuraCharmerAura(now);'));

// --- checkHit / slow / speed hooks ---
check('checkHit mark hook multiplies marked damage x1.30', game.includes('target.auraCharmerMarkUntil') && game.includes('b.damage = Math.round(b.damage * AURA_CHARMER_MARK_DMG_MULT);'));
check('slow hook: auraCharmerSlowUntil x0.70', game.includes('entity.auraCharmerSlowUntil') && game.includes('Math.min(baseSlow, AURA_CHARMER_G1_SLOW_MULT)'));
check('player + bot speed lines multiply chase speed', game.includes('getRunnerTrailSpeedMult(player, now) * getAuraCharmerChaseSpeedMult(player, now)') && game.includes('getRunnerTrailSpeedMult(t, now) * getAuraCharmerChaseSpeedMult(t, now)'));

// --- Slam / super / aura rules ---
check('slam heals allies 450, damages enemy structures, skips allied structures', (() => {
  const slam = game.slice(game.indexOf('function auraCharmerSlam'), game.indexOf('function auraCharmerSlam') + 4600);
  return slam.includes('doHeal(target, AURA_CHARMER_HEAL)') && slam.includes("if ((target.isArenaForgeTower || target.isArenaForgeCore) && areAlliedEntities(owner, target)) continue;") && slam.includes('if (pull && !target.isArenaForgeTower && !target.isArenaForgeCore && !isEntityCcImmune(target, now)) {');
})());
check('SP2 tick damages enemy structures (no tower/Core skip left in the aura tick)', (() => {
  const aura = game.slice(game.indexOf('function updateAuraCharmerAura'), game.indexOf('function updateAuraCharmerAura') + 4200);
  return !aura.includes('if (target.isArenaForgeTower || target.isArenaForgeCore) continue;');
})());
check('max-HP ally loop skips structures (towers never gain HP, PR #42)', game.includes("if (ally.isArenaForgeTower || ally.isArenaForgeCore) continue;"));
check('slam breaks power boxes in aura via the standard box-damage path', (() => {
  const slam = game.slice(game.indexOf('function auraCharmerSlam'), game.indexOf('function auraCharmerSlam') + 4600);
  return slam.includes('destructibleWalls') && slam.includes('isHeaterLockableBox(wall)') && slam.includes('rectCircleCollides(wall.x, wall.y, wall.w, wall.h, owner.x, owner.y, radius)') && slam.includes('applyHeaterBoxDamage(owner, wall, dmg)');
})());
check('slam box loop skips dead/non-box walls; old brawlers-only comment gone', game.includes('if (!wall || wall.hp <= 0 || !isHeaterLockableBox(wall)) continue;') && !game.includes('Never touches towers/Core/walls (brawlers only)'));
check('slam grants super charge per non-pet enemy hit', game.includes('if (!target.isPet) grantMainAttackCharge(owner,'));
check('super marks hidden-only when not hyper; hyper marks anyone', game.includes('if (!isHyper && !auraCharmerIsHidden(target, now)) continue;'));
check('super fallback sets next-slam boost when nothing marked', game.includes('if (marked === 0) {') && game.includes('entity.auraCharmerNextAttackBoost = true;'));
check('max-HP bonus resets on death; G2 shield expires', game.includes('(e.auraCharmerBonusMaxHp || 0) > 0 && (e.hp <= 0 || e.isDead)') && game.includes('e.auraCharmerShieldExpiresAt'));
check('aura render is a STEADY ring (explicitly not pulsing)', game.includes('Steady ring on purpose') && game.includes('isAuraCharmerEntity(entity)'));
check('visuals fix: Decayer aura block closes BEFORE the Charmer ring opens (not nested)', game.includes("ctx.setLineDash([]); ctx.restore();\n        }\n        if (entity && entity.hp > 0 && isAuraCharmerEntity(entity)) {"));
check('visuals fix: old nested adjacency is gone', !game.includes("ctx.setLineDash([]); ctx.restore();\n        if (entity && entity.hp > 0 && isAuraCharmerEntity(entity)) {"));
check('visuals fix: sweep block flows straight into chickpig block (no stray brace)', game.includes("ctx.globalAlpha = 0.25; ctx.stroke(); ctx.restore();\n        }\n        if (entity && entity.hp > 0 && performance.now() < (entity.chickpigChickenUntil||0)) {"));
check('marked enemies get a gold ring; sweep hand visual exists', game.includes('entity.auraCharmerMarkUntil') && game.includes('entity.auraCharmerSweepUntil'));

// --- Decayer untouched ---
check('Decayer NOT touched: radius still 260, pulse render intact', game.includes('const DECAYER_AURA_RADIUS = 260;') && game.includes('DECAYER_AURA_RADIUS * pulse') && game.includes('DECAYER_AURA_RADIUS * (2 - pulse)'));
check('no decayer pulse fix smuggled in: updateDecayerAura body unchanged shape', game.includes('function updateDecayerAura(now) {') && game.includes('grantShield(ally, 100, 100);'));

// --- Aura Farmer Hypercharge skin ---
check('skinsDatabase aura-farmer entry: hypercharge rarity + hyperTransform + isHyperchargeSkin', game.includes("'aura-farmer-aura-charmer'") && game.includes("rarity: 'hypercharge'") && game.includes('hyperTransform: true') && game.includes('isHyperchargeSkin: true'));
check('Aura Farmer copy names the hyper transform', (() => {
  const entry = game.slice(game.indexOf("'aura-farmer-aura-charmer'"), game.indexOf("'aura-farmer-aura-charmer'") + 1200);
  return entry.includes('Aura Farmer') && entry.includes('Transfigures during Hypercharge');
})());
check('roster visuals: aura_charmer look + identity + aura-farmer skin', roster.includes("aura_charmer:['hood','#c084fc','#ffd76b']") && roster.includes("aura_charmer:'charm_hood|aura_orb|charm_sigil|robe'") && roster.includes("'aura-farmer-aura-charmer':['farmer','#f5c542','#7ec850']"));

// --- Art batch: Doug-like slam, harvest takedown, purple HC, farmer + sovereign models ---
check('slam animation: slam sets visualAttackAt for the recoil beat', game.includes('owner.visualAttackAt = now;'));
check('slam animation: Doug-like rolling wave + outward motes', game.includes("fxKind: 'auraCharmerSlamWave'") && game.includes("fxKind: 'auraCharmerSlamMote'") && game.includes('moteIndex'));
check('slam colors: hyper purple, farmer gold, base violet', game.includes("slamHyper ? 'rgba(168,85,247,.70)'") && game.includes("slamFarmer ? 'rgba(245,197,66,.70)'"));
check('takedown: farmer gets a custom harvest takedown, not the generic burst', game.includes("kind === 'takedown' && skin.id === 'aura-farmer-aura-charmer'") && game.includes("fxKind: 'harvestReaping'") && game.includes("fxKind: 'harvestReapingArc'"));
check('HC purple: hyper ring is purple, farmer gold only off-hyper', game.includes("hyper ? '#a855f7'") && game.includes("farmer ? '#f5c542' : '#c084fc'"));
check('HC purple: farmer callout is purple on hyper', game.includes("'🌾 AURA FARMER!', '#a855f7'"));
check('farmer model: roster module draws farmer geometry', roster.includes("if(type==='farmer')") && roster.includes('ellipse(50,22,34,7,coat)') && roster.includes('rect(30,62,40,18,accent)'));
check('sovereign model: hyper variant + crown/halo geometry + draw swap', roster.includes("if(type==='sovereign')") && roster.includes("'aura-farmer-hyper-aura-charmer':['sovereign','#a855f7','#e9d5ff']") && game.includes("visualSkin = 'aura-farmer-hyper-aura-charmer'"));
check('skin description promises a purple hyper form', game.includes('radiant purple harvest sovereign'));

console.log(`aura-charmer: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
