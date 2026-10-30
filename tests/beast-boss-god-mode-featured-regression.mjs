// Beast Boss: God Mode featured event regression (ordered 2026-10-30):
//  * Featured event 'beast_boss_god_mode' starts a Beast Boss fight with the
//    boss's dormant isGodMode flag switched on (previously never set anywhere).
//  * Date gate: available ONLY on the player's local date of October 30, 2026.
//    On any other date the card does not appear and launch falls back to solo.
//  * Rewards unchanged: the fight flows through the normal Beast Boss win path
//    (Beast Boss Token + 150 Coins).
//  * God-mode combat factors (from updateBeastBossEvent, unchanged by this PR):
//    stage-3 pulse bursts 10 vs 6, stage-2 6 vs 4, stage-1 4 vs 3;
//    pulse velocity/damage 1.6x; pulse cooldown divided by 2.5.
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

// ---------- (a) + (b): date gate, evaluated for real ----------
const gateSrc = extractFn(game, 'isBeastBossGodModeDay');
const gate = vm.runInNewContext(gateSrc + ';isBeastBossGodModeDay;', {});
check('date gate: available on local date 2026-10-30', gate(new Date(2026, 9, 30, 12)) === true);
check('date gate: NOT available on 2026-10-31', gate(new Date(2026, 9, 31, 12)) === false);
check('date gate: NOT available on 2026-10-29', gate(new Date(2026, 9, 29, 12)) === false);
check('date gate: NOT available on 2025-10-30 (year guard)', gate(new Date(2025, 9, 30, 12)) === false);
check('date gate: NOT available on 2026-11-30 (month guard)', gate(new Date(2026, 10, 30, 12)) === false);

// ---------- featured card wiring ----------
check('HOME_MODE_CARDS has beast_boss_god_mode entry', game.includes("['beast_boss_god_mode', '💀', 'Beast Boss: God Mode'"));
check('ALL EVENTS filter gates the card on the date', game.includes("(id !== 'beast_boss_god_mode' || isBeastBossGodModeDay())"));
check('featured-event-card class added to the god card', game.includes("if (id === 'beast_boss_god_mode' && card) card.classList.add('featured-event-card');"));
check('launch guard falls back to solo off-day', game.includes("if (showdownMode === 'beast_boss_god_mode' && !isBeastBossGodModeDay())"));
check('launch sets isBeastBossEvent for the featured mode', game.includes("isBeastBossEvent = showdownMode === 'beast_boss_god_mode';"));
check('isBossFight includes the Beast Boss event', game.includes('isBossFight = isLavaBossEvent || isBouncinBossEvent || isHeadlessBossEvent || isTombstoneBossEvent || isBeastBossEvent;'));
check('launch calls the god-mode match init', game.includes('if (isBeastBossEvent) initBeastBossGodModeMatch();'));
check('in-fight GOD MODE ACTIVE indicator', game.includes("ctx.fillText('💀 GOD MODE ACTIVE'"));

// ---------- (c): featured spawn sets isGodMode ----------
const initSrc = extractFn(game, 'initBeastBossGodModeMatch');
check('featured init spawns the boss with isGodMode: true', initSrc.includes('isGodMode: true'));
check('featured init spawns an Overlord boss', initSrc.includes("brawler: 'overlord'") && initSrc.includes('isBoss: true'));
check('featured init fields 5v1 (4 allies + player)', (initSrc.match(/createBeastBossGodModeAlly\(i\)/g) || []).length === 1 && initSrc.includes('for (let i = 0; i < 4; i++)'));
check('featured init uses the saved Beast Boss difficulty', initSrc.includes('getBeastBossDifficultyIndex()') && initSrc.includes('getBeastBossDifficultySettings(diffIndex)'));

// ---------- (d): god-mode factors differ from normal (shipped expression, evaluated) ----------
const pulseMatch = game.match(/const burstCount = boss\.bossStage >= 3 \? \(isGod \? 10 : 6\) : \(boss\.bossStage === 2 \? \(isGod \? 6 : 4\) : \(isGod \? 4 : 3\)\);/);
check('pulse burst ternary present in updateBeastBossEvent', pulseMatch !== null);
if (pulseMatch) {
  const burst = (stage, isGod) => vm.runInNewContext('boss = {bossStage: ' + stage + '}; isGod = ' + isGod + '; ' + pulseMatch[0].replace('const burstCount = ', 'burstCount = ') + '; burstCount;', {});
  check('stage-3 bursts: god 10 vs normal 6', burst(3, true) === 10 && burst(3, false) === 6);
  check('stage-2 bursts: god 6 vs normal 4', burst(2, true) === 6 && burst(2, false) === 4);
  check('stage-1 bursts: god 4 vs normal 3', burst(1, true) === 4 && burst(1, false) === 3);
}
check('pulse velocity factor 1.6x god / 1.0x normal', game.includes('const vFactor = isGod ? 1.6 : 1.0;'));
check('pulse damage factor 1.6x god / 1.0x normal', game.includes('const dFactor = isGod ? 1.6 : 1.0;'));
check('pulse cooldown divided by 2.5 when god', game.includes('/ (isGod ? 2.5 : 1)'));
check('normal Beast Boss win rewards untouched (token + 150 coins path intact)', game.includes("if (isBeastBossEvent && won) {") && game.includes('rewardCoins = isBeastBossEvent ? 150 :'));

console.log(`beast-boss-god-mode-featured: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
