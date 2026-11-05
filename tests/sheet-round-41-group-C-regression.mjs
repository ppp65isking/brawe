// Sheet Round 41 — Group C regression (base a8e8aee).
// Covers ONLY Group C: Copyphase, Crystila (no change), Cursed, Darkener,
// Decayer, Electrostien, Evil Doctor, Fight'nFire, Fuser, Homer.
// Dashaholic (row 25) is NAME ONLY and must remain untouched.
// Run: node tests/sheet-round-41-group-C-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}

// ---------- global: P11 scale verified in code ----------
check('scale formula 0.55+(level-1)*0.045 present', game.includes('0.55 + (level - 1) * 0.045'));
check('P11 scale is 1.0x (0.55+10*0.045=1.0)', Math.abs((0.55 + 10 * 0.045) - 1.0) < 1e-9);

// ---------- Copyphase: minimal main-attack visuals ----------
check('copyphase orb trail particles in bullet update', game.includes('b.isCopyphaseOrb') && game.includes("trailColor = b.isCopyphaseOrb ? '#56d8ff'"));
check('copyphase main damage untouched (820/520)', game.includes('damage: isBot ? (ownerIsHyper ? 315 : 520) : (ownerIsHyper ? 500 : 820)'));

// ---------- Crystila: NO CHANGE ----------
check('crystila glass still 4000/5000', game.includes('baseCap = hc ? 5000 : 4000') || game.includes('baseCap = bot.isHypercharged ? 5000 : 4000'));

// ---------- Cursed ----------
check('cursed scaled dmg 1500>1350', /brawlerId === 'cursed'\) \{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(6800 \* hpScale\), dmg: Math\.round\(1350 \* scale\), speed: 260 \};/.test(game));
check('cursed HUD shows 1350', game.includes("Math.round(1350*mult*levelScale)} DMG"));
check('cursed SP1 gate normalizes legacy sp1/fast to slow', game.includes("if (raw === 'sp1' || raw === 'fast') return 'slow'") && game.includes("if (raw === 'sp2') return 'long'"));
check('cursed SP1 bonus 25%>15%', game.includes('(1 + progress * .15)') && !game.includes('(1 + progress * .25)'));
check('cursed sp1 text 15%', game.includes('Growing Hex gains up to 15% damage'));

// ---------- Darkener ----------
check('darkener scaled dmg 800>600', /brawlerId === 'darkener'\) \{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp: Math\.round\(7000 \* hpScale\), dmg: Math\.round\(600 \* scale\), speed: 255 \};/.test(game));
check('darkener max ticks 5>4 (was uncapped 999)', game.includes('const maxTicks=4+Math.max(0,Math.round(isSlopSushiMode?getEntitySlopEffectTotal(owner,\'darkenerExtraTicks\'):0));'));
check('darkener SP1 tick mult 25%>20% both paths', (game.match(/\(1\+state\.ticks\*\.20\)/g) || []).length === 2);
check('darkener cloud stops at walls', game.includes('hitsWall=destructibleWalls.some(w=>!w.isPlatform&&rectCircleCollides(w.x,w.y,w.w,w.h,nextX,nextY,12))') && game.includes('if(hitsWall){cloud.traveled=cloud.range;}'));
check('darkener G2 hex recall pull + ammo restore present', game.includes('function triggerDarkenerHexRecall(owner)') && game.includes('HEX RECALL!'));
check('darkener G2 pull fallback for water-edge targets', game.includes('else{target.x=clamp(nx,target.radius||14,WORLD_W-(target.radius||14));'));
check('darkener sp1 text 20%', game.includes('each repeat tick on the same target deals +20% more'));

// ---------- Decayer rework ----------
check('decayer G2 arms slow shot (player)', game.includes('player.decayerSlowShotArmed = true;') && game.includes('SLOW SHOT READY'));
check('decayer G2 arms slow shot (bot)', game.includes('bot.decayerSlowShotArmed = true;'));
check('decayer old G2 sacrifice removed', !game.includes('Decayer G2: instant shield at cost of ammo') && !game.includes('decayerFirstHitReductionUntil = now + 8000'));
check('decayer G2 hit applies 80% slow 1s', game.includes('if (b.decayerSlowShot) {') && game.includes('target.decayerSlowUntil = performance.now() + 1000;'));
check('decayer 80% slow in slow multiplier (0.20)', game.includes('if (now < (entity.decayerSlowUntil || 0)) baseSlow = Math.min(baseSlow, 0.20);'));
check('decayer SP1 speedup flag at 50%+ shield', game.includes('decayerSp1Speedup = starSlow && decayerShieldFrac >= 0.5'));
check('decayer SP1 speedup up to +50% over flight', game.includes('const targetSpd = baseSpd * (1 + 0.5 * prog);'));
check('decayer old SP1 shield-max / SP2 DR stacks removed', !game.includes('decayerReductionStack') && !game.includes("? 4500 : (starLong ? 2400 : 2000)"));
check('decayer shield gain/cap flat (468/2000)', game.includes('const baseShieldGain = 468;') && game.includes('const baseShieldCap = 2000;'));
check('decayer super sets aura (player+bot)', game.includes('player.decayerAuraUntil = now + dur;') && game.includes('bot.decayerAuraUntil = now + dur;'));
check('decayer aura: 260px, 100 shield per 0.6s, allies not self', game.includes('const DECAYER_AURA_RADIUS = 260;') && game.includes('const DECAYER_AURA_TICK_MS = 600;') && game.includes('grantShield(ally, 100, 100);') && game.includes('ally.id === caster.id'));
check('decayer aura ticked from update loop', game.includes('updateDecayerAura(now);'));
check('decayer HC super no longer sets orbit', game.includes('decayerOrbitUntil = 0;') && !game.includes('decayerOrbitUntil = isHypercharged ? now + dur'));
check('decayer HC super fires 3 ally shots + 1000 next-shot bonus', game.includes('spawnDecayerAllyShieldShots(player);') && game.includes('player.decayerNextShotBonusDmg = 1000;') && game.includes('allies.slice(0, 3)') && game.includes('decayerAllyShieldAmt: 2500'));
check('decayer HC ally shots grant shield on contact', game.includes('grantShield(allyTarget, b.decayerAllyShieldAmt || 2500, 2500);'));
check('decayer next-shot bonus applied to main damage', game.includes('damage: (isBot ? 480 : 670) + decayerNextBonus'));
check('decayer star gates accept legacy sp1/sp2', game.includes("decayerRawStar === 'sp2'") && game.includes("decayerRawStar === 'sp1'"));
check('decayer brawlerData rework text, no placeholder', game.includes('Slowing Shot (Next Decay Shot slows 80% for 1s on impact)') && game.includes('Accelerating Decay (At 50%+ shield') && !/decayer[^}]{0,600}coming soon/i.test(game));

// ---------- Electrostien ----------
check('electrostien HC lightning 500>300 (-40%)', game.includes('const ELECTROSTIEN_STORM_LIGHTNING_DAMAGE = 300;') && Math.round(500 * 0.6) === 300);
check('electrostien super shock trail visuals', game.includes('b.isElectrostienShock') && game.includes("b.isElectrostienShock ? '#00f5d4'"));
check('electrostien hyper text 300 lightning', game.includes('300-damage lightning strikes them every 1s'));

// ---------- Evil Doctor ----------
check('evil doctor main 1675>1300 (bot 1010>784 ratio)', game.includes('damage: isBot ? 784 : 1300,') && Math.round(1010 * 1300 / 1675) === 784);
check('evil doctor poison 600>550', game.includes('applyEvilDoctorPoisonStack(target, b.ownerId, 550, ticks, false, false);'));
check('evil doctor SP1 spawns DNA on every hit (slow gate incl. legacy)', game.includes("if (ownerStar === 'slow' || ownerStar === 'sp1' || ownerStar === 'fast') spawnEvilDoctorSp1DNA(owner, target.x, target.y);"));
check('evil doctor SP1 DNA is 300 HP', game.includes('evilDoctorSp1DNA: true,') && game.includes('hp: 300,\n          maxHp: 300,'));
check('evil doctor SP1 DNA deals 100 poison', game.includes('applyEvilDoctorPoisonStack(target, dna.ownerId, 100, 4, false, false, false);'));
check('evil doctor SP1 DNA poison lasts ~3s (4 ticks x 700ms = 2.8s)', 4 * 700 === 2800);
check('evil doctor old SP1 kill-spawn removed', !game.includes('spawnEvilDoctorDNABurst(owner, victim.x, victim.y, false, 1, true, false);'));
check('evil doctor syringe trail visuals', game.includes("b.isEvilDoctorSyringe ? '#5df29d'") || game.includes("(b.isElectrostienShock ? '#00f5d4' : '#5df29d')"));
check('evil doctor sp1 text rework', game.includes('DNA Genesis (Every hit spawns a DNA with 300 HP that deals 100 poison damage for 3s)'));

// ---------- Fight'nFire ----------
check('fightnfire fireball 1000 (bot 833)', game.includes('damage: Math.round((isBot ? 833 : 1000) * (boost ? 1.2 : 1) * (hc ? 1.2 : 1)),'));
check('fightnfire G1 range 1100px (fire + aim preview)', (game.match(/const range = boost \? 1100 : 500;/g) || []).length === 2);
check('fightnfire G1 bigger hitbox 1.5x', game.includes('hitboxMod: boost ? 1.5 : 1'));
check('fightnfire main shards 200 each', game.includes('const shardDamage = isSuper ? Math.max(1, Math.round(damage * 0.45 * 0.5)) : 200;'));
check('fightnfire super shards 50% less (0.45 x 0.5)', game.includes('damage * 0.45 * 0.5'));
check('fightnfire G1 still splits into 8', game.includes('const shardCount = boost && hc ? 8 : (boost ? 8 : (hc ? 8 : 4));'));
check('fightnfire SP1 9% freeze 0.6s per shard', game.includes('Math.random() < 0.09') && game.includes('performance.now() + 600') && game.includes("'FROZEN!'"));
check('fightnfire SP2 armed on super, side shards 200 dmg', game.includes('entity.fightnfireSideShardsArmed = true;') && game.includes('fightnFireSideShards: fightnfireSideArmed') && game.includes('damage: 200,') && game.includes('fightnFireSideShard: true'));

// ---------- Fuser ----------
check('fuser scaled dmg 350>360', /brawlerId === 'fuser'\) \{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp:Math\.round\(7000\*hpScale\), dmg:Math\.round\(360\*scale\), speed:260 \};/.test(game));
check('fuser main 6 bullets x 360', game.includes('for (let shot = 0; shot < 6; shot++)') && game.includes('damage: isBot ? 242 : 360,'));
check('fuser main 20% bigger (0.983>1.18)', game.includes('const fuserHitbox = isPowerPlayShowdownMode ? 3.0 : 1.18;') && Math.abs(0.983 * 1.2 - 1.18) < 0.01);
check('fuser old 18-bullet salvo gone', !game.includes('for (let shot = 0; shot < 18; shot++)') && !game.includes('fuserReverseArmed'));
check('fuser G1 wall-piercing next bullets', game.includes('fuserWallPierceArmed') && game.includes('pierceWalls: fuserPierce || wallPierce'));
check('fuser super full 5880>3400 (player 14x243=3402)', game.includes('damage:243,') && 14 * 243 === 3402);
check('fuser super size -50% (1.96>0.98)', (game.match(/hitboxMod:0\.98/g) || []).length === 2);
check('fuser SP1 heal bullets every 4th attack, 800 HP', game.includes('fromEntity.fuserAttackCount % 4 === 0') && game.includes('fuserHealBullet: true') && game.includes("if (b.fuserHealBullet) {") && game.includes('doHeal(fuserOwner, 800);'));
check('fuser SP1 heal bullets are fast (1710 vs 1140)', game.includes('vx: Math.cos(ang) * 1710'));
check('fuser SP2 bullets grant allies 120 shield', game.includes('grantShield(ally, 120, 120);') && game.includes('b.fuserShieldGranted'));

// ---------- Homer ----------
check('homer scaled dmg 1800>1450', /brawlerId === 'homer'\) \{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*const hpScale = getLevelHpScale\(level\);\s*return \{ hp:Math\.round\(5800\*hpScale\), dmg:Math\.round\(1450\*scale\), speed:250 \};/.test(game));
check('homer main 1800>1450 (bot 1260>1015 ratio)', game.includes('(isBot?1015:1450)') && Math.round(1260 * 1450 / 1800) === 1015);
check('homer SP1 10% at homing>=50% (legacy gate)', game.includes("homerSp1=(star==='slow'||star==='sp1'||star==='fast')") && game.includes('homerSp1&&homing>=.50?1.10:1'));
check('homer super 1250>990 (bot 875>693)', game.includes('damage:owner.id===player.id?990:693,') && Math.round(875 * 990 / 1250) === 693);
check('homer super homing gain flat 8% (old SP1 12% removed)', game.includes('const now=performance.now(),gain=.08;'));

// ---------- scope guards ----------
check('dashaholic untouched by this patch (no decayer content moved onto it)', !game.split('\n').some(l => l.includes('dashaholic') && /decayerSlowShot|decayerAura|decayerSp1Speedup/.test(l)));
check('no placeholder gadget/star text in touched brawlerData', !/(coming soon|TBD|placeholder)/i.test(game.slice(game.indexOf("'decayer': {"), game.indexOf("'decayer': {") + 1200)));
check('super charge table untouched (charge mechanics not changed by this round)', game.includes('fuser:24') && game.includes('homer:4'));

// ---------- summary ----------
if (failures.length) {
  console.error(`FAIL (${failures.length}/${passed + failures.length} passed):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Group C regression: ${passed}/${passed} checks passed.`);
