// Aegis (shield/bubble brawler) regression, built 2026-10-28 from Anthony's
// orders ("Make it"):
//  * Main attack Bulwark Throw: a WIDE shield projectile at MEDIUM range.
//    On hit, the enemy LOSES 300 max HP. The loss RESETS ON DEATH
//    (user-confirmed): base max HP is stored on first shred and restored
//    in restoreRespawningEntity / resetEntityForRound.
//  * Super Blockshot: a DEVICE inside a wide 3D bubble. No projectile can
//    get in unless it tears that bubble segment open — and then it still
//    has to destroy the device. The device can be damaged by EVERYONE
//    except its own owner (owner exemption avoids spawn-overlap self-hits;
//    allies and enemies can both damage it — flagged for Anthony).
//  * Star Power Wound Weave: the bubble regrows 40 HP per segment/sec.
//  * Hypercharge: Bulwark Throw gains Crystila's reflective glass (the
//    flying shield reflects enemy projectiles), and Blockshot gains a
//    SECOND bubble layer (both layers must be torn at an angle first).
//  * Builder picks flagged for Anthony (NOT his words): name Aegis, Mythic
//    Controller, 7400 HP / 900 dmg / 270 speed, range 480px, speed 800,
//    bubble 180px / 8 segments x 250 HP, device 2200 HP, G1 Shield Charge,
//    G2 Sunder Plate, SP2 Sundered Guard, bubble blocks ALL outside
//    projectiles (even allies) while inside shots exit freely, entities
//    walk through the bubble freely, shred is brawlers-only (no structures).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced ' + name);
}

// ---------- static wiring checks ----------
check('allBrawlers includes aegis', game.includes("'aegis'") && /'mallow', 'nightshade', 'aegis'/.test(game));
const aegisEntry = game.slice(game.indexOf("'aegis': {"), game.indexOf("'aegis': {") + 2000);
for (const field of ['name:', 'role:', 'rarity:', 'color:', 'desc:', 'attack:', 'attackDesc:', 'super:', 'superDesc:', 'hyper:', 'g1:', 'g2:', 'sp1:', 'sp2:']) {
  check('brawlerData.aegis has ' + field, aegisEntry.includes(field));
}
check('aegis entry has no placeholder text', !/coming soon|TBD|undefined/i.test(aegisEntry));
check('aegis rarity Mythic in brawlerData', aegisEntry.includes("rarity: 'Mythic'"));
check('brawlerRarities.aegis is Mythic', /aegis: 'Mythic'/.test(game));
check('getScaledStats aegis 7400/900/270', /brawlerId === 'aegis'\) \{\s*const scale = 0\.55 \+ \(level - 1\) \* 0\.045;\s*return \{ hp: Math\.round\(7400 \* scale\), dmg: Math\.round\(900 \* scale\), speed: 270 \};/.test(game));
check('NO stray aegis in SPECIAL_ABILITY_DEFS (PR #60 lesson)', !/SPECIAL_ABILITY_DEFS[\s\S]{0,4000}'aegis'/.test(game.slice(0, game.indexOf('function toBraweTerms'))));
check('fire branch spawns aegis shield bullet', game.includes("isAegisShield: true") && game.includes("aegisHyperReflect: aegisHyper"));
check('hit handler applies shred', game.includes('if (b.isAegisShield && owner && target) applyAegisMaxHpShred(target, owner, b);'));
check('SP2 hook in checkHit', game.includes('projectileOwner.aegisShredded && projectileOwner.aegisShredSp2'));
check('player super dispatch', game.includes("combatBrawler === 'aegis'"));
check('bot super dispatch', game.includes("botCombatBrawler === 'aegis'"));
check('player gadget dispatch g1+g2', game.includes("curBrawler === 'aegis' && curGadget === 'g1'") && game.includes("curBrawler === 'aegis' && curGadget === 'g2'"));
check('bot gadget dispatch g1+g2', game.includes("bot.brawler === 'aegis' && g === 'g1'") && game.includes("bot.brawler === 'aegis' && g === 'g2'"));
check('bullet loop bubble hook', game.includes('if (aegisBubbleBlocks(b))'));
check('bullet loop reflect hook', game.includes('if (b.isAegisShield && b.aegisHyperReflect) aegisReflectEnemyBullets(b);'));
check('update loop calls updateAegisSystems', game.includes('updateAegisSystems(dt)'));
check('render draws shield + bubbles', game.includes('drawAegisShield(ctx, b)') && game.includes('drawAegisBubbles(ctx);'));
check('respawn restores shredded max HP', game.includes('if (entity.aegisBaseMaxHp) { entity.maxHp = entity.aegisBaseMaxHp; entity.aegisBaseMaxHp = null; }'));
check('world reset clears bubbles', game.includes('aegisBubbles.length = 0;'));

// ---------- behavioral checks via vm ----------
let starChoice = 'none';
const entitiesById = new Map();
const sandbox = {
  console,
  performance: globalThis.performance,
  AEGIS_ENABLED: true,
  AEGIS_SHIELD_RANGE: 480,
  AEGIS_SHIELD_SPEED: 800,
  AEGIS_SHIELD_HITBOX_MOD: 2.2,
  AEGIS_MAX_HP_SHRED: 300,
  AEGIS_MAX_HP_SHRED_EMPOWERED: 600,
  AEGIS_BUBBLE_RADIUS: 180,
  AEGIS_BUBBLE_SEGMENTS: 8,
  AEGIS_BUBBLE_SEGMENT_HP: 250,
  AEGIS_DEVICE_HP: 2200,
  AEGIS_DEVICE_RADIUS: 26,
  AEGIS_BUBBLE_REGEN_PER_SEC: 40,
  AEGIS_GADGET1_DASH_DISTANCE: 240,
  AEGIS_GADGET1_DASH_DURATION_MS: 200,
  AEGIS_GADGET1_DAMAGE: 900,
  AEGIS_GADGET1_SHIELD: 1500,
  AEGIS_GADGET2_DAMAGE_MULT: 1.5,
  AEGIS_SP2_DAMAGE_MULT: 0.9,
  aegisBubbles: [],
  bullets: [],
  explosions: [],
  player: null,
  bots: [],
  WORLD_W: 2000,
  WORLD_H: 2000,
  getEntityStarChoice: () => starChoice,
  getEntityById: (id) => entitiesById.get(id) || null,
  areAlliedEntities: (a, b) => !!a && !!b && a.team === b.team,
  spawnFloatingText: () => {},
  findNearestOpenSpot: (x, y) => ({ x, y }),
  checkHit: () => {},
  grantShield: () => {},
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
};
vm.createContext(sandbox);
for (const fn of ['aegisStarChoice', 'aegisHasSP1', 'aegisHasSP2', 'aegisIsFighterTarget', 'applyAegisMaxHpShred', 'aegisBubbleSegmentIndex', 'aegisMakeLayer', 'createAegisBubble', 'castAegisSuper', 'aegisBubbleSegmentAt', 'aegisBubbleBlocks', 'aegisReflectEnemyBullets', 'executeAegisG1', 'updateAegisDash', 'executeAegisG2', 'updateAegisSystems']) {
  vm.runInContext(extractFn(game, fn), sandbox);
}

// Shred: stacks within one life, empowered hits harder, guards hold.
{
  // Direct calls through the context (clearer than string eval for objects).
  const owner = { id: 1, team: 'player' };
  const foe = { id: 2, team: 'enemy', hp: 7400, maxHp: 7400 };
  sandbox.owner = owner; sandbox.foe = foe;
  vm.runInContext('this.shredResult1 = applyAegisMaxHpShred(this.foe, this.owner, {});', sandbox);
  check('shred applies: 7400 -> 7100, hp clamped', foe.maxHp === 7100 && foe.hp === 7100 && foe.aegisBaseMaxHp === 7400);
  vm.runInContext('this.shredResult2 = applyAegisMaxHpShred(this.foe, this.owner, {});', sandbox);
  check('shred stacks within one life: 7100 -> 6800', foe.maxHp === 6800);
  vm.runInContext('this.shredResult3 = applyAegisMaxHpShred(this.foe, this.owner, { aegisEmpowered: true });', sandbox);
  check('empowered shred takes 600: 6800 -> 6200', foe.maxHp === 6200);
  const tower = { id: 9, team: 'enemy', hp: 72000, maxHp: 72000, isStructure: true };
  sandbox.tower = tower;
  vm.runInContext('this.shredTower = applyAegisMaxHpShred(this.tower, this.owner, {});', sandbox);
  check('shred refuses structures', sandbox.shredTower === false && tower.maxHp === 72000);
  const pet = { id: 10, team: 'enemy', hp: 1000, maxHp: 1000, isPet: true };
  sandbox.pet = pet;
  vm.runInContext('this.shredPet = applyAegisMaxHpShred(this.pet, this.owner, {});', sandbox);
  check('shred refuses pets', sandbox.shredPet === false && pet.maxHp === 1000);
  const dummy = { id: 11, team: 'enemy', hp: 1000, maxHp: 1000, isDummy: true };
  sandbox.dummy = dummy;
  vm.runInContext('this.shredDummy = applyAegisMaxHpShred(this.dummy, this.owner, {});', sandbox);
  check('shred ALLOWED on training dummies (fighter stand-ins, reset hook covers them)', sandbox.shredDummy === true && dummy.maxHp === 700);
  const dead = { id: 12, team: 'enemy', hp: 0, maxHp: 7400 };
  sandbox.dead = dead;
  vm.runInContext('this.shredDead = applyAegisMaxHpShred(this.dead, this.owner, {});', sandbox);
  check('shred refuses the dead', sandbox.shredDead === false);
  // SP2 flag follows the shredder's star choice.
  starChoice = 'sp2';
  const foe2 = { id: 13, team: 'enemy', hp: 7400, maxHp: 7400 };
  sandbox.foe2 = foe2;
  vm.runInContext('applyAegisMaxHpShred(this.foe2, this.owner, {});', sandbox);
  check('SP2 shredder marks target aegisShredSp2', foe2.aegisShredded === true && foe2.aegisShredSp2 === true);
  starChoice = 'none';
  const foe3 = { id: 14, team: 'enemy', hp: 7400, maxHp: 7400 };
  sandbox.foe3 = foe3;
  vm.runInContext('applyAegisMaxHpShred(this.foe3, this.owner, {});', sandbox);
  check('non-SP2 shredder leaves aegisShredSp2 false', foe3.aegisShredSp2 === false);
}

// Bubble segments: tearing is per-segment, hyper adds a second layer.
{
  const owner = { id: 1, team: 'player', hp: 7400 };
  sandbox.player = owner; sandbox.bots = [];
  vm.runInContext('this.bub = createAegisBubble({ id: 1 }, 1000, 1000, false);', sandbox);
  const bub = sandbox.bub;
  check('normal bubble has 1 layer of 8 x 250', bub.layers.length === 1 && bub.layers[0].length === 8 && bub.layers[0].every((v) => v === 250));
  check('device starts at 2200', bub.deviceHp === 2200);
  vm.runInContext('this.bubH = createAegisBubble({ id: 1 }, 1000, 1000, true);', sandbox);
  check('hyper bubble has 2 layers', sandbox.bubH.layers.length === 2);
  vm.runInContext('this.seg0 = aegisBubbleSegmentIndex(this.bub, 0); this.segPi = aegisBubbleSegmentIndex(this.bub, Math.PI); this.segNeg = aegisBubbleSegmentIndex(this.bub, -0.1);', sandbox);
  check('segment index: 0 -> 0, pi -> 4, negative wraps', sandbox.seg0 === 0 && sandbox.segPi === 4 && sandbox.segNeg === 7);
}

// Bubble blocking end-to-end (single layer).
{
  sandbox.aegisBubbles.length = 0;
  const owner = { id: 1, team: 'player', hp: 7400 };
  sandbox.player = owner; sandbox.bots = [];
  vm.runInContext('aegisBubbles.push(createAegisBubble({ id: 1 }, 1000, 1000, false));', sandbox);
  const bub = sandbox.aegisBubbles[0];
  // Enemy bullet approaching from the east (angle 0), 300 damage.
  sandbox.bullet = { x: 1000 + 180 + 10, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.blocked1 = aegisBubbleBlocks(this.bullet);', sandbox);
  check('outside bullet is blocked and tears its segment', sandbox.blocked1 === true && bub.layers[0][0] === 0);
  // Same angle again: segment is open, bullet passes.
  sandbox.bullet2 = { x: 1000 + 180 + 10, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.blocked2 = aegisBubbleBlocks(this.bullet2);', sandbox);
  check('torn segment lets the next bullet pass', sandbox.blocked2 === false);
  // A different angle is still walled.
  sandbox.bullet3 = { x: 1000, y: 1000 - 180 - 10, vx: 0, vy: 800, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.blocked3 = aegisBubbleBlocks(this.bullet3);', sandbox);
  check('untorn segment still blocks', sandbox.blocked3 === true);
  // Device hit: bullet inside, through the torn east gap, near the center.
  sandbox.bullet4 = { x: 1000 + 20, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.blocked4 = aegisBubbleBlocks(this.bullet4);', sandbox);
  check('device takes damage through a torn segment', sandbox.blocked4 === true && bub.deviceHp === 1900);
  // Owner's own bullet near the device does NOT damage it.
  sandbox.bullet5 = { x: 1000 + 20, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 1, life: 0.5 };
  vm.runInContext('this.blocked5 = aegisBubbleBlocks(this.bullet5);', sandbox);
  check('owner bullets cannot damage own device', sandbox.blocked5 === false && bub.deviceHp === 1900);
  // Ally bullet through the torn gap CAN damage the device.
  sandbox.bullet6 = { x: 1000 + 20, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 3, life: 0.5 };
  vm.runInContext('this.blocked6 = aegisBubbleBlocks(this.bullet6);', sandbox);
  check('ally bullets CAN damage the device', sandbox.blocked6 === true && bub.deviceHp === 1600);
  // Device destruction pops the whole bubble.
  sandbox.bullet7 = { x: 1000 + 20, y: 1000, vx: -800, vy: 0, damage: 2000, ownerId: 2, life: 0.5 };
  vm.runInContext('this.blocked7 = aegisBubbleBlocks(this.bullet7);', sandbox);
  check('device at 0 HP pops the bubble', sandbox.blocked7 === true && sandbox.aegisBubbles.length === 0);
}

// Hyper double layer: both layers must be torn at an angle.
{
  sandbox.aegisBubbles.length = 0;
  sandbox.player = { id: 1, team: 'player', hp: 7400 }; sandbox.bots = [];
  vm.runInContext('aegisBubbles.push(createAegisBubble({ id: 1 }, 1000, 1000, true));', sandbox);
  const bub = sandbox.aegisBubbles[0];
  sandbox.hb1 = { x: 1000 + 190, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.hblocked1 = aegisBubbleBlocks(this.hb1);', sandbox);
  check('hyper: first bullet tears OUTER layer only', sandbox.hblocked1 === true && bub.layers[0][0] === 0 && bub.layers[1][0] === 250);
  sandbox.hb2 = { x: 1000 + 190, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.hblocked2 = aegisBubbleBlocks(this.hb2);', sandbox);
  check('hyper: second bullet tears INNER layer', sandbox.hblocked2 === true && bub.layers[1][0] === 0);
  sandbox.hb3 = { x: 1000 + 190, y: 1000, vx: -800, vy: 0, damage: 300, ownerId: 2, life: 0.5 };
  vm.runInContext('this.hblocked3 = aegisBubbleBlocks(this.hb3);', sandbox);
  check('hyper: third bullet passes both torn layers', sandbox.hblocked3 === false);
}

// Hyper reflect: flying shield turns enemy bullets around.
{
  entitiesById.clear();
  entitiesById.set(1, { id: 1, team: 'player' });
  entitiesById.set(2, { id: 2, team: 'enemy' });
  entitiesById.set(3, { id: 3, team: 'player' });
  sandbox.bullets.length = 0;
  const shield = { x: 500, y: 500, vx: 800, vy: 0, ownerId: 1, aegisHyperReflect: true, aegisReflectRadius: 30, isAegisShield: true };
  const enemyBullet = { x: 515, y: 500, vx: -600, vy: 0, ownerId: 2, damage: 500, hitIds: {} };
  const allyBullet = { x: 515, y: 505, vx: -600, vy: 0, ownerId: 3, damage: 500, hitIds: {} };
  const farBullet = { x: 900, y: 900, vx: -600, vy: 0, ownerId: 2, damage: 500, hitIds: {} };
  sandbox.bullets.push(shield, enemyBullet, allyBullet, farBullet);
  sandbox.shield = shield;
  vm.runInContext('aegisReflectEnemyBullets(this.shield);', sandbox);
  check('enemy bullet is reflected to the shield owner', enemyBullet.ownerId === 1 && enemyBullet.aegisReflected === true && enemyBullet.vx > 0);
  check('reflected bullet hitIds reset (owner excluded)', enemyBullet.hitIds[1] === true && Object.keys(enemyBullet.hitIds).length === 1);
  check('ally bullet untouched', allyBullet.ownerId === 3 && !allyBullet.aegisReflected);
  check('out-of-range bullet untouched', farBullet.ownerId === 2 && !farBullet.aegisReflected);
}

// Super cast: one bubble per Aegis, second cast replaces.
{
  sandbox.aegisBubbles.length = 0;
  sandbox.player = { id: 1, team: 'player', hp: 7400 };
  vm.runInContext('this.cast1 = castAegisSuper(this.player, false, 1200, 1200);', sandbox);
  check('super cast creates a bubble', sandbox.cast1 === true && sandbox.aegisBubbles.length === 1);
  vm.runInContext('this.cast2 = castAegisSuper(this.player, false, 1300, 1300);', sandbox);
  check('second cast replaces the old bubble', sandbox.aegisBubbles.length === 1 && sandbox.aegisBubbles[0].x === 1300);
  vm.runInContext('this.castDead = castAegisSuper({ id: 9, hp: 0 }, false, 0, 0);', sandbox);
  check('dead caster cannot cast', sandbox.castDead === false && sandbox.aegisBubbles.length === 1);
}

// SP1 regen: torn segments regrow only for an SP1 owner.
{
  sandbox.aegisBubbles.length = 0;
  const owner = { id: 1, team: 'player', hp: 7400 };
  sandbox.player = owner; sandbox.bots = [];
  vm.runInContext('aegisBubbles.push(createAegisBubble({ id: 1 }, 1000, 1000, false));', sandbox);
  const bub = sandbox.aegisBubbles[0];
  bub.layers[0][0] = 0;
  starChoice = 'sp1';
  vm.runInContext('updateAegisSystems(1.0);', sandbox);
  check('SP1 regrows 40 HP in 1s', bub.layers[0][0] === 40);
  starChoice = 'none';
  vm.runInContext('updateAegisSystems(1.0);', sandbox);
  check('no regen without SP1', bub.layers[0][0] === 40);
  // Regen caps at segment max.
  bub.layers[0][0] = 240;
  starChoice = 'sp1';
  vm.runInContext('updateAegisSystems(1.0);', sandbox);
  check('regen caps at 250', bub.layers[0][0] === 250);
  starChoice = 'none';
}

// Gadgets: G1 arms a dash state, G2 arms the next shield.
{
  const ent = { id: 1, team: 'player', hp: 7400, x: 1000, y: 1000, radius: 14 };
  sandbox.ent = ent;
  vm.runInContext('executeAegisG1(this.ent, 1300, 1000);', sandbox);
  check('G1 creates a dash toward the target', !!ent.aegisDash && ent.aegisDash.targetX > ent.x);
  vm.runInContext('executeAegisG2(this.ent);', sandbox);
  check('G2 arms the empowered next shield', ent.aegisNextShieldEmpowered === true);
}

console.log(`aegis-shield-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
process.exit(0);
