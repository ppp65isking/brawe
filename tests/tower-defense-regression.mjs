// Tower Defense solo mode regression (ordered 2026-10-30):
//  * Mode card + real rules text + color + SOLO tag + pre-match picker
//    (difficulty rows + God Mode toggle, no unlock) + launch/tick/results
//    wiring, with NO date gate (permanent mode).
//  * Difficulty table: kill targets 50/100/150/250, wave sizes and
//    multipliers strictly ordered Extreme > Hard > Normal > Easy.
//  * Waves every 30s; win exactly at the kill target; loss at tower HP 0;
//    tower HP never increases; God Mode makes player + tower invulnerable
//    and halves the win reward; player respawns 3s after death while the
//    tower stands.
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
function extractBlock(src, startIdx) {
  let i = src.indexOf('{', startIdx);
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
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(startIdx, i + 1); }
  }
  throw new Error('unbalanced block');
}
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  return extractBlock(src, start);
}

// ---------- source wiring ----------
check('mode card exists', game.includes("['tower_defense', '🧱', 'Tower Defense'"));
check('rules text exists and is real (kill targets + 30s waves)', game.includes('tower_defense: [') && game.includes('kill target: Easy 50, Normal 100, Hard 150, Extreme 250') && game.includes('every 30 seconds'));
check('mode color exists', game.includes("tower_defense: '#f5a623'"));
check('SOLO tag includes tower_defense', game.includes("|| id === 'tower_defense') tag = 'SOLO'"));
check('card click opens picker', game.includes("if (id === 'tower_defense') {\n                  openTowerDefenseEvent();"));
check('picker function exists with God Mode toggle', game.includes('function openTowerDefenseEvent()') && game.includes('GOD MODE') && game.includes('no unlock needed'));
check('launch flag set', game.includes("isTowerDefenseEvent = showdownMode === 'tower_defense'"));
check('launch init wired', game.includes('if (isTowerDefenseEvent) initTowerDefenseMatch();'));
check('tick hook wired', game.includes('if (isTowerDefenseEvent) updateTowerDefenseEvent(now, dt);'));
check('results branch wired', game.includes('} else if (isTowerDefenseEvent) {') && game.includes("matchText = won ? 'TOWER DEFENDED!' : 'YOUR TOWER FELL!'"));
check('reward line wired', game.includes('if (isTowerDefenseEvent && won) rewardCoins = getTowerDefenseRewardCoins();'));
check('HUD block wired', game.includes('TOWER DEFENSE •') && game.includes('NEXT WAVE'));
check('NO date gate for tower_defense', !game.includes("id !== 'tower_defense'"));
check('generic solo game-over guard excludes tower defense', game.includes('!isTowerDefenseEvent && (player.hp <= 0 || aliveBots.length === 0)'));
check('tower HP never increases in TD code', (() => {
  const upd = extractFn(game, 'updateTowerDefenseEvent');
  return !upd.includes('tower.hp +=') && !upd.includes('tower.hp = tower.maxHp') && upd.includes('tower.hp = Math.max(0, tower.hp -');
})());

// ---------- live simulation harness ----------
const sandbox = {
  console,
  Math,
  WORLD_W: 2400,
  WORLD_H: 2200,
  nextId: 1,
  bots: [],
  player: { x: 1200, y: 1940, hp: 5000, maxHp: 5000, isDead: false, team: 'player', radius: 14 },
  isTowerDefenseEvent: true,
  towerDefenseRuntime: null,
  towerDefenseDifficulty: 'normal',
  towerDefenseGodMode: false,
  playing: true,
  gameOver: false,
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  spawnFloatingText: () => {},
  getBotSteeredStep: (e, dx, dy, speed, dt) => {
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, speed * dt);
    return { moved: true, x: e.x + (dx / dist) * step, y: e.y + (dy / dist) * step, vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  },
};
vm.createContext(sandbox);
const constSrc = [...game.matchAll(/const (TOWER_DEFENSE_[A-Z_]+) = ([^;]+);/g)]
  .map((m) => `const ${m[1]} = ${m[2]};`).join('\n');
vm.runInContext(constSrc + '\n' + [
  'getTowerDefenseDifficulty',
  'getTowerDefenseWaveSize',
  'getTowerDefenseRewardCoins',
  'spawnTowerDefenseWave',
  'updateTowerDefenseEvent',
].map((f) => extractFn(game, f)).join('\n'), sandbox);
const run = (now, dt) => vm.runInContext(`updateTowerDefenseEvent(${now}, ${dt});`, sandbox);
const setRt = (rt) => { sandbox.towerDefenseRuntime = rt; };
const tower = () => sandbox.bots.find((b) => b && b.isTowerDefenseTower);
const mkTower = (hp) => {
  sandbox.bots.push({ id: 9001, x: 1200, y: 1100, hp, maxHp: 20000, radius: 30, speed: 0, brawler: 'tower_core', isDead: false, isStructure: true, isTowerDefenseTower: true, team: 'player' });
};
const mkMinion = (x, y, hp, hitAt) => {
  const m = { id: 9100 + sandbox.bots.length, x, y, hp, maxHp: hp, radius: 13, speed: 175, team: 'tower_defense_enemy', isPet: true, isSummon: true, isTowerDefenseMinion: true, noRespawn: true, towerDefenseHitAt: hitAt || 0, towerDefenseCounted: false, isDead: false };
  sandbox.bots.push(m);
  return m;
};
const reset = () => {
  sandbox.bots = [];
  sandbox.player = { x: 1200, y: 1940, hp: 5000, maxHp: 5000, isDead: false, team: 'player', radius: 14 };
  sandbox.gameOver = false;
  sandbox.playing = true;
};

// ---------- difficulty table, evaluated for real ----------
const D = vm.runInContext('TOWER_DEFENSE_DIFFICULTIES', sandbox);
check('kill targets 50/100/150/250', D.easy.killTarget === 50 && D.normal.killTarget === 100 && D.hard.killTarget === 150 && D.extreme.killTarget === 250);
check('wave sizes ordered extreme > hard > normal > easy', D.extreme.baseWaveSize > D.hard.baseWaveSize && D.hard.baseWaveSize > D.normal.baseWaveSize && D.normal.baseWaveSize > D.easy.baseWaveSize);
check('hp/speed/damage mults ordered extreme > hard > normal > easy',
  D.extreme.hpMult > D.hard.hpMult && D.hard.hpMult > D.normal.hpMult && D.normal.hpMult > D.easy.hpMult &&
  D.extreme.speedMult > D.hard.speedMult && D.hard.speedMult > D.normal.speedMult &&
  D.extreme.damageMult > D.hard.damageMult && D.hard.damageMult > D.normal.damageMult);
check('rewards 60/100/150/250', D.easy.rewardCoins === 60 && D.normal.rewardCoins === 100 && D.hard.rewardCoins === 150 && D.extreme.rewardCoins === 250);
check('wave size escalates with wave number', vm.runInContext('getTowerDefenseWaveSize(TOWER_DEFENSE_DIFFICULTIES.normal, 5)', sandbox) > vm.runInContext('getTowerDefenseWaveSize(TOWER_DEFENSE_DIFFICULTIES.normal, 1)', sandbox));
check('wave interval is 30s', vm.runInContext('TOWER_DEFENSE_WAVE_INTERVAL_MS', sandbox) === 30000);
check('tower HP is 20000', vm.runInContext('TOWER_DEFENSE_TOWER_HP', sandbox) === 20000);
check('god mode halves rewards', (() => {
  setRt({ difficulty: 'extreme', godMode: true });
  const half = vm.runInContext('getTowerDefenseRewardCoins()', sandbox);
  setRt({ difficulty: 'extreme', godMode: false });
  const full = vm.runInContext('getTowerDefenseRewardCoins()', sandbox);
  return half === 125 && full === 250;
})());

// ---------- wave timer ----------
reset();
mkTower(20000);
setRt({ difficulty: 'normal', godMode: false, wave: 0, kills: 0, won: false, nextWaveAt: 130000, playerRespawnAt: 0, startedAt: 100000 });
run(129999, 1);
check('no wave before 30s timer', sandbox.towerDefenseRuntime.wave === 0);
run(130000, 1);
check('wave fires exactly at 30s timer', sandbox.towerDefenseRuntime.wave === 1);
check('wave 1 spawns normal base size (6)', sandbox.bots.filter((b) => b.isTowerDefenseMinion).length === 6);
check('next wave scheduled exactly +30s', sandbox.towerDefenseRuntime.nextWaveAt === 160000);
check('spawned minions are edge ground minions (skeletrooper, pet/summon, enemy team)',
  sandbox.bots.filter((b) => b.isTowerDefenseMinion).every((m) => m.brawler === 'skeletrooper' && m.isPet && m.isSummon && m.team === 'tower_defense_enemy'));

// ---------- movement toward tower ----------
reset();
mkTower(20000);
setRt({ difficulty: 'normal', godMode: false, wave: 1, kills: 0, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
const mover = mkMinion(200, 200, 900, 0);
const d0 = Math.hypot(mover.x - 1200, mover.y - 1100);
run(200000, 1);
const d1 = Math.hypot(mover.x - 1200, mover.y - 1100);
check('minion steers toward tower', d1 < d0);

// ---------- contact damage + cooldown + tower never gains HP ----------
reset();
mkTower(20000);
setRt({ difficulty: 'normal', godMode: false, wave: 1, kills: 0, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
mkMinion(1200, 1100 + 30 + 13 + 4, 900, 0);
run(200000, 1);
check('contact hit deals 220 (normal)', tower().hp === 20000 - 220);
run(200000, 1);
check('hit cooldown blocks a second instant hit', tower().hp === 20000 - 220);
run(200900, 1);
check('hit lands again after 900ms cooldown', tower().hp === 20000 - 440);

// ---------- kill counting + win exactly at target ----------
reset();
mkTower(20000);
setRt({ difficulty: 'normal', godMode: false, wave: 3, kills: 99, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
const dying = mkMinion(500, 500, 0, 0);
run(200000, 1);
check('dead minion counted once toward kills', sandbox.towerDefenseRuntime.kills === 100 && dying.towerDefenseCounted === true);
check('win triggers exactly at kill target', sandbox.towerDefenseRuntime.won === true && sandbox.gameOver === true);
sandbox.gameOver = false;
run(200001, 1);
check('kill not double-counted', sandbox.towerDefenseRuntime.kills === 100);

// ---------- loss at tower HP 0 ----------
reset();
mkTower(200);
setRt({ difficulty: 'normal', godMode: false, wave: 2, kills: 10, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
mkMinion(1200, 1100 + 30 + 13 + 4, 900, 0);
run(200000, 1);
check('tower HP floored at 0, loss triggers, won stays false', tower().hp === 0 && sandbox.gameOver === true && sandbox.towerDefenseRuntime.won === false);

// ---------- god mode ----------
reset();
mkTower(20000);
setRt({ difficulty: 'extreme', godMode: true, wave: 1, kills: 0, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
mkMinion(1200, 1100 + 30 + 13 + 4, 900, 0);
sandbox.player.hp = 100;
run(200000, 1);
check('god mode: tower takes no contact damage', tower().hp === 20000);
check('god mode: player HP topped back to full', sandbox.player.hp === 5000);
sandbox.player.hp = 0;
run(200001, 1);
check('god mode: player death instantly restored', sandbox.player.hp === 5000 && sandbox.gameOver === false);

// ---------- player respawn (non-god) ----------
reset();
mkTower(20000);
setRt({ difficulty: 'normal', godMode: false, wave: 1, kills: 0, won: false, nextWaveAt: 999999, playerRespawnAt: 0, startedAt: 0 });
sandbox.player.hp = 0;
run(200000, 1);
check('death starts 3s respawn timer, match continues', sandbox.towerDefenseRuntime.playerRespawnAt === 203000 && sandbox.gameOver === false);
run(203000, 1);
check('player respawns at full HP after 3s', sandbox.player.hp === 5000 && sandbox.towerDefenseRuntime.playerRespawnAt === 0);

if (failures.length) {
  console.error(`tower-defense: ${passed} passed, ${failures.length} FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`tower-defense: all ${passed} checks passed`);
