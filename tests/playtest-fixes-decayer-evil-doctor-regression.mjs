// Playtest fixes 1 (base b0b5d01, post-PR #80).
// Covers ONLY: Decayer SP2 aura ring + SP2 gate, Evil Doctor syringe
// visuals, Evil Doctor SP1 DNA poison channel. Source assertions in the
// style of the Round 41 group suites (game.js is browser code; these
// assert the exact code paths, not a headless sim).
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
const has = (s) => game.includes(s);

// ---------- DECAYER SP2 AURA RING ----------
check('decayer aura ring draws while aura active',
  has('performance.now() < (entity.decayerAuraUntil || 0)'));
check('decayer aura ring uses DECAYER_AURA_RADIUS (260)',
  has('DECAYER_AURA_RADIUS * pulse') && has('const DECAYER_AURA_RADIUS = 260;'));
check('decayer aura ring uses Decayer green #9dff57',
  has("strokeStyle = '#9dff57'"));

// ---------- DECAYER SP2 GATE (aura was ungated: every super granted it) ----------
check('player decayer aura gated on SP2 (long/sp2)',
  has("if (selectedStar === 'long' || selectedStar === 'sp2') { player.decayerAuraUntil = now + dur; player.decayerAuraNextAt = 0; }"));
check('bot decayer aura gated on SP2 (long/sp2)',
  has("if (getEntityStarChoice(bot) === 'long' || getEntityStarChoice(bot) === 'sp2') { bot.decayerAuraUntil = now + dur; bot.decayerAuraNextAt = 0; }"));
check('no ungated decayer aura set remains',
  !game.includes('player.decayerAuraUntil = now + dur;\n      player.decayerAuraNextAt = 0;') &&
  game.split('bot.decayerAuraUntil = now + dur; bot.decayerAuraNextAt = 0;').length - 1 === 1);

// ---------- EVIL DOCTOR SYRINGE VISUALS ----------
check('syringe trail is dense (16ms, was 40ms)',
  has('if (b.isEvilDoctorSyringe)') && has('nowMs >= b.lastTrailAt + 16'));
check('syringe trail particles are bigger (4-7px, were 2-4px)',
  has('radius: 4 + Math.random() * 3, life: 0, maxLife: 0.6, color: \'#5df29d\''));
check('syringe trail has a halo particle',
  has('rgba(93, 242, 157, 0.25)'));
check('copyphase/electrostien trails unchanged (40ms, 2-4px)',
  has('if (b.isCopyphaseOrb || b.isElectrostienShock)') && has('nowMs >= b.lastTrailAt + 40'));

// ---------- EVIL DOCTOR SP1 DNA POISON (was 550 main + 100 DNA = 650/tick merged) ----------
check('SP1 DNA impact uses the separate DNA channel, not the shared stack',
  has('applyEvilDoctorDnaPoison(target, dna.ownerId);') &&
  !game.includes('applyEvilDoctorPoisonStack(target, dna.ownerId, 100, 4, false, false, false);'));
check('DNA channel deals exactly 100/tick, 4 ticks, 700ms cadence',
  has('target.dnaPoisonDamage = 100;') && has('target.dnaPoisonTicksLeft = 4;') &&
  has('target.dnaPoisonUntil = now + 2800;') && has('target.dnaPoisonTickAt = now + 700;'));
check('DNA tick block deals dnaPoisonDamage with its own green numbers',
  has('const dnaDmg = e.dnaPoisonDamage || 100;') && has("spawnDamageText(e, dnaDmg, '#5df29d');"));
check('DNA-poison kill still routes to the poison kill handler (chain behavior kept)',
  has('e.evilDoctorPoisonOwnerId = dnaSourceId;') && has('handleEvilDoctorPoisonKill(e);'));
check('main poison stacking untouched (syringe 550, shared stack still adds)',
  has('applyEvilDoctorPoisonStack(target, b.ownerId, 550, ticks, false, false);') &&
  has('target.poisonDamage = Math.min(maxPoisonDamage, (target.poisonDamage || 0) + damagePerTick);'));

// ---------- JETPACK SUPER MIN DASH (was 240px: bombs dropped ~34px apart, blast radius 66px, still stacked) ----------
check('jetpack super min dash raised to 600px',
  has('if(jd<600){const ja=jd>1?Math.atan2(jdy,jdx):(owner.dir||0);aimX=clamp(owner.x+Math.cos(ja)*600,30,WORLD_W-30);aimY=clamp(owner.y+Math.sin(ja)*600,30,WORLD_H-30);}'));
check('no 240px jetpack super min dash remains',
  !game.includes('if(jd<240)'));
check('jetpack super bomb blast radius still 66px (the math the 600px pick is based on)',
  has("function explodeJetpackBomb(x, y, owner, damage, hyperSplit=false, radius=66) {") && has("AOEDamage(x,y,radius,damage,ownerId,false);"));

// ---------- JETPACK SUPER BOMB PATTERN (true zero-overlap: old 1/7..6/7 fractions + narrow lanes stacked) ----------
check('jetpack super bombs drop across the full path (fractions i/5, not (i+1)/7)',
  has('while(f.nextBomb<6&&p>=f.nextBomb/5){') && has('pathP=i/5'));
check('jetpack super bombs use alternating +/-70px lanes',
  has('lane=(i%2===0?-70:70);'));
check('old jetpack super bomb pattern is gone',
  !game.includes('const pattern=[-1,1,-.55,.55,-.18,.18];') && !game.includes('pathP=(i+1)/7') && !game.includes('const p=(i+1)/7'));
check('jetpack super aim preview matches the new pattern (i/5 fractions, +/-70 lanes)',
  has('for(let i=0;i<6;i++){const p=i/5,bx=player.x+(landX-player.x)*p+Math.cos(perp)*(i%2===0?-70:70),by=player.y+(landY-player.y)*p+Math.sin(perp)*(i%2===0?-70:70);'));
check('jetpack super aim preview applies the 600px min dash and 850px max range',
  has('if(dist<600)dist=600;dist=Math.min(850,dist);'));

if (failures.length) {
  console.log(`PLAYTEST FIXES 1: ${passed} passed, ${failures.length} FAILED:`);
  for (const f of failures) console.log('  FAIL:', f);
  process.exit(1);
} else {
  console.log(`PLAYTEST FIXES 1: all ${passed} checks passed.`);
}
