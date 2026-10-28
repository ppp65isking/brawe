// Training 1v1 sparring, built 2026-10-28 from Anthony's order ("Add
// training 1v1 tests like u can choose the other brawler and it can
// shoot" — read as a player-facing feature, NOT automated test files):
//  * A 1V1 SPARRING section in the training cave deck: pick any selectable
//    brawler, START SPAR, and a full-kit AI opponent fights back with the
//    standard Bots 3.0 combat AI (main attack, Super, gadgets,
//    Hypercharge) — built on the existing duel-spawner path
//    (spawnTrainingCustomEnemy with AI on), NOT a parallel AI system.
//  * Rounds + respawns: killing the bot scores YOU a round and the bot
//    respawns in the 1v1 arena after 1.5s; dying scores the OPPONENT a
//    round and the standard 1.0s training respawn walks you back to the
//    arena door. STOP clears the bot and resets the score.
//  * Dummies stay available: sparring never touches the dummy spawns, the
//    15-bot grid, or allies. The duel spawner's dummy button still works.
//  * Builder picks flagged for Anthony (NOT his words): arena face-off
//    (player 2950,1300 / bot 3100,1300), 1.5s bot respawn, bot keeps
//    super/hyper charge across rounds, START clears old custom enemies,
//    STOP resets the score, sparring bot speed from getScaledStats.
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

// ---- Source wiring checks ----
check('sparring section + controls exist in the deck HTML',
  game.includes('id="tcSparSelect"') && game.includes('id="tcStartSparBtn"') &&
  game.includes('id="tcStopSparBtn"') && game.includes('id="tcSparScore"'));
{
  const selIdx = game.indexOf('sortedSparBrawlers');
  check('sparring picker offers selectable brawlers (allBrawlers minus disabled)',
    selIdx !== -1 && game.slice(selIdx, selIdx + 600).includes('disabledBrawlers.has(b)'));
}
{
  const spawnSrc = extractFn(game, 'spawnTrainingSparringBot');
  check('sparring bot is full-kit: AI flags + gadget + hyper unlocked',
    spawnSrc.includes('isTrainingSparringBot = true') &&
    spawnSrc.includes('gadgetUnlocked = true') &&
    spawnSrc.includes('hyperchargeUnlocked = true'));
  check('sparring bot reuses the duel-spawner AI path',
    spawnSrc.includes('spawnTrainingCustomEnemy(brawlerId, true)'));
  check('sparring bot speed comes from the brawler\'s real stats',
    spawnSrc.includes('getScaledStats(brawlerId, 11)'));
}
{
  const startSrc = extractFn(game, 'startTrainingSparring');
  check('start never touches dummies, grid, or allies',
    !startSrc.includes('clearTrainingAllies') && !startSrc.includes('resetTraining15BotGrid') &&
    !startSrc.includes('spawnTraining15BotGrid') && !startSrc.includes('summonTrainingAlly'));
  check('start only accepts selectable brawlers',
    startSrc.includes('allBrawlers.includes(brawlerId)') && startSrc.includes('disabledBrawlers.has(brawlerId)'));
}
{
  const modeSrc = extractFn(game, 'updateTrainingCaveMode');
  check('training loop runs the sparring updater', modeSrc.includes('updateTrainingSparring(dt)'));
  const exitSrc = extractFn(game, 'exitTrainingModeToHome');
  check('exiting training resets sparring state', exitSrc.includes('resetTrainingSparringState()'));
  const launchSrc = extractFn(game, 'launchTrainingSandbox');
  check('entering training resets sparring state', launchSrc.includes('resetTrainingSparringState()'));
}
check('AI path reused: custom enemies with AI mode are not dummies',
  game.includes("t.isDummy = (t.customEnemyMode === 'dummy')"));
{
  const secStart = game.indexOf('1V1 SPARRING (SHOOTS BACK)');
  const secEnd = game.indexOf('<!-- 4. Quick Powers', secStart);
  const section = game.slice(secStart, secEnd);
  check('sparring UI text has no placeholders',
    secStart !== -1 && secEnd !== -1 && !/coming soon|TBD|undefined/i.test(section));
}

// ---- Behavioral checks in a vm sandbox ----
const floats = [];
let restoreCalls = 0;
const ctx = {
  bots: [],
  player: { x: 0, y: 0, vx: 0, vy: 0, hp: 5000, maxHp: 5000, id: 1 },
  isTraining: true,
  isTutorialMode: false,
  allBrawlers: ['king', 'outlit', 'fuser', 'robber'],
  disabledBrawlers: new Set(['robber']),
  brawlerData: {
    king: { name: 'King', role: 'Tank' },
    outlit: { name: 'Outlit', role: 'Damage Dealer' },
    fuser: { name: 'Fuser', role: 'Damage Dealer' },
  },
  trainingCaveCustomEnemyId: 'king',
  trainingSparringActive: false,
  trainingSparringOpponentId: 'king',
  trainingSparringPlayerScore: 0,
  trainingSparringOpponentScore: 0,
  trainingSparringBotRespawnTimer: 0,
  trainingSparringBotDeathCounted: false,
  trainingSparringPlayerDeathCounted: false,
  document: { getElementById: () => null },
  spawnFloatingText: (x, y, text) => { floats.push(text); },
  updateTrainingCaveUI: () => {},
  restoreRespawningEntity: (e, spawn) => { restoreCalls++; e.x = spawn.x; e.y = spawn.y; e.hp = e.maxHp; e.isDead = false; },
  getScaledStats: () => ({ speed: 270 }),
  spawnTrainingCustomEnemy: (id, ai) => {
    ctx.trainingCaveCustomEnemyId = id;
    const bot = { id: 99, x: 3100, y: 1300, brawler: id, isDummy: !ai, isTrainingCustomEnemy: true, team: 'enemy', hp: 7000, maxHp: 7000, speed: ai ? 180 : 0 };
    ctx.bots.push(bot);
    return bot;
  },
  clearTrainingCustomEnemies: () => {
    for (let i = ctx.bots.length - 1; i >= 0; i--) {
      if (ctx.bots[i].isTrainingCustomEnemy) ctx.bots.splice(i, 1);
    }
  },
};
vm.createContext(ctx);
for (const fn of ['resetTrainingSparringState', 'refreshTrainingSparringUI', 'spawnTrainingSparringBot', 'startTrainingSparring', 'stopTrainingSparring', 'updateTrainingSparring']) {
  vm.runInContext(extractFn(game, fn), ctx);
}
function run(code) { return vm.runInContext(code, ctx); }

// Start: face-off positions, chosen brawler, full-kit flags, real speed.
{
  const bot = run('startTrainingSparring("king")');
  check('start activates the spar', ctx.trainingSparringActive === true);
  check('start moves the player to the arena door', ctx.player.x === 2950 && ctx.player.y === 1300);
  check('start spawns the chosen brawler', bot && bot.brawler === 'king');
  check('sparring bot is flagged + full-kit', bot.isTrainingSparringBot === true &&
    bot.gadgetUnlocked === true && bot.hyperchargeUnlocked === true && bot.isDummy === false);
  check('sparring bot speed uses real stats, not the flat 180', bot.speed === 270);
  check('sparring bot spawns at the arena center', bot.x === 3100 && bot.y === 1300);
  check('start announces the matchup', floats.some(t => t.includes('SPARRING START') && t.includes('KING')));
}
// Duel-spawner id is not clobbered by a spar.
{
  ctx.trainingCaveCustomEnemyId = 'fuser';
  run('startTrainingSparring("outlit")');
  check('sparring does not clobber the duel-spawner selection', ctx.trainingCaveCustomEnemyId === 'fuser');
  check('restart switches the opponent', ctx.bots.some(b => b.isTrainingSparringBot && b.brawler === 'outlit'));
  check('restart resets the score', ctx.trainingSparringPlayerScore === 0 && ctx.trainingSparringOpponentScore === 0);
}
// Invalid picks are refused.
{
  run('startTrainingSparring("robber")');
  check('disabled brawler pick is refused', ctx.trainingSparringOpponentId === 'outlit');
  run('startTrainingSparring("nope")');
  check('unknown brawler pick is refused', ctx.trainingSparringOpponentId === 'outlit');
  ctx.isTraining = false;
  const res = run('startTrainingSparring("king")');
  check('start refuses when not in training', res === null);
  ctx.isTraining = true;
}
// Bot death: one round scored once, respawn after 1.5s at the arena.
{
  const bot = ctx.bots.find(b => b.isTrainingSparringBot);
  bot.hp = 0;
  run('updateTrainingSparring(0.5)');
  check('bot death scores YOU one round', ctx.trainingSparringPlayerScore === 1);
  run('updateTrainingSparring(0.5)');
  check('bot death is counted only once', ctx.trainingSparringPlayerScore === 1);
  run('updateTrainingSparring(0.6)');
  check('bot respawns after 1.5s', restoreCalls === 1 && bot.hp === bot.maxHp && bot.isDead === false);
  check('respawned bot is back at the arena center', bot.x === 3100 && bot.y === 1300 && bot.baseX === 3100);
  check('round flag resets after respawn', ctx.trainingSparringBotDeathCounted === false);
  check('round win announced', floats.some(t => t.includes('YOU WIN THE ROUND')));
}
// Missing bot (cleared externally) respawns while the spar is active.
{
  ctx.bots.length = 0;
  run('updateTrainingSparring(1.6)');
  check('missing sparring bot respawns', ctx.bots.some(b => b.isTrainingSparringBot && b.brawler === 'outlit'));
}
// Player death: opponent scores once, respawn walks back to the arena door.
{
  ctx.player.hp = 0;
  run('updateTrainingSparring(0.1)');
  check('player death scores the OPPONENT one round', ctx.trainingSparringOpponentScore === 1);
  ctx.player.hp = 5000;
  run('updateTrainingSparring(0.1)');
  check('respawned player returns to the arena door', ctx.player.x === 2950 && ctx.player.y === 1300);
  check('opponent round announced', floats.some(t => t.includes('OPPONENT WINS THE ROUND')));
}
// Inactive updater is a no-op; stop clears everything.
{
  run('stopTrainingSparring()');
  check('stop deactivates the spar', ctx.trainingSparringActive === false);
  check('stop removes the sparring bot', !ctx.bots.some(b => b.isTrainingSparringBot));
  check('stop resets the score', ctx.trainingSparringPlayerScore === 0 && ctx.trainingSparringOpponentScore === 0);
  const before = floats.length;
  run('updateTrainingSparring(5)');
  check('inactive updater does nothing', floats.length === before);
}

console.log(`training-1v1-regression: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log('FAIL: ' + f);
  process.exit(1);
}
process.exit(0);
