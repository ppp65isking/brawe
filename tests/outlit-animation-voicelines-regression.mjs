// Outlit animated 2.5D model + voice lines (Anthony's order 2026-11-05).
// Source-presence + live behavior mirrors. No DOM/match runtime needed.
// Animation states are exercised live via BraweRosterVisuals.animationState
// + draw() with a stub canvas ctx; voice playback is exercised live in a vm
// without Audio (must degrade to silent false, never throw).
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.dirname(fileURLToPath(new URL('../game.js', import.meta.url)));
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const rosterCode = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
const voiceCode = fs.readFileSync(new URL('../modules/audio/outlit-voicelines.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Load the two modules in a vm (no DOM, no Audio) ---
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(rosterCode, ctx);
vm.runInContext(voiceCode, ctx);
const V = ctx.globalThis.BraweRosterVisuals;
const VOICE = ctx.globalThis.BraweOutlitVoice;
check('roster module exposes BraweRosterVisuals with animationState', !!V && typeof V.animationState === 'function' && typeof V.draw === 'function');
check('voice module exposes BraweOutlitVoice', !!VOICE && typeof VOICE.play === 'function');

// --- Voice lines: map, text, files on disk ---
const EXPECTED_TEXT = {
  'spawn-1.mp3': "Lights on. Let's go.",
  'spawn-2.mp3': "Outlit's in the arena. Try and keep up.",
  'spawn-3.mp3': 'Locked, loaded, and lit.',
  'attack-1.mp3': 'Eat buckshot!',
  'attack-2.mp3': 'Point blank!',
  'attack-3.mp3': 'Scatter!',
  'attack-4.mp3': 'Pump it up!',
  'super-1.mp3': 'Boom Break!',
  'super-2.mp3': 'Lights out!',
  'super-3.mp3': 'Three shots. No survivors.',
  'kill-1.mp3': 'Lights out for you.',
  'kill-2.mp3': "Down. Who's next?",
  'kill-3.mp3': 'Point blank. Ouch.',
  'hurt-1.mp3': 'Hey! Watch the lamp!',
  'hurt-2.mp3': 'Ow! That actually hurt!',
  'hurt-3.mp3': 'You scratched the paint!',
  'death-1.mp3': 'Lights... fading...',
  'death-2.mp3': 'Tell the lamp... I tried.',
  'death-3.mp3': 'Out... lit...',
  'win-1.mp3': "And that's why I'm the OG.",
  'win-2.mp3': 'Still lit. Still standing.',
  'win-3.mp3': 'Day one, and still number one.',
  'idle-1.mp3': 'Hello? Anyone still out there?',
  'idle-2.mp3': "My lamp's getting bored."
};
const TRIGGERS = ['spawn', 'attack', 'super', 'kill', 'hurt', 'death', 'win', 'idle'];
check('voice map covers all 8 triggers', TRIGGERS.every(t => Array.isArray(VOICE.lines[t]) && VOICE.lines[t].length > 0));
check('voice map has exactly 24 clips', VOICE.fileCount() === 24 && Object.values(VOICE.lines).flat().length === 24);
check('voice text map matches the SPEC line list exactly', JSON.stringify(VOICE.text) === JSON.stringify(EXPECTED_TEXT));
check('voice is Twenty (avocado_v2:Twenty), the flagged builder pick', VOICE.voiceId === 'avocado_v2:Twenty' && VOICE.voiceName === 'Twenty');
check('voice cooldowns: attack 4500 / hurt 2500 / kill 1200 / idle 20000, rare triggers unthrottled',
  VOICE.cooldowns.attack === 4500 && VOICE.cooldowns.hurt === 2500 && VOICE.cooldowns.kill === 1200 && VOICE.cooldowns.idle === 20000 &&
  VOICE.cooldowns.spawn === 0 && VOICE.cooldowns.super === 0 && VOICE.cooldowns.death === 0 && VOICE.cooldowns.win === 0);

let audioBytes = 0, audioOk = true;
for (const [file, text] of Object.entries(EXPECTED_TEXT)) {
  const p = path.join(repo, 'assets/voice/outlit', file);
  if (!fs.existsSync(p)) { audioOk = false; break; }
  const buf = fs.readFileSync(p);
  audioBytes += buf.length;
  // Real MP3: ID3 tag or MPEG frame sync.
  const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
  if (!isMp3 || buf.length < 5000) { audioOk = false; break; }
}
check('all 24 audio files exist on disk and are real MP3s', audioOk);
check('total audio size is reasonable (< 1 MB)', audioBytes > 100000 && audioBytes < 1024 * 1024);
console.log(`  (audio total: ${(audioBytes / 1024).toFixed(0)} KB across 24 clips)`);

// --- Voice playback degrades silently without Audio/DOM ---
check('play() returns false (never throws) with no Audio in the environment', VOICE.play('spawn') === false && VOICE.play('attack') === false);
check('play() returns false for an unknown trigger', VOICE.play('nope') === false);
check('setEnabled(false) silences play(); setEnabled(true) restores the attempt path', (() => {
  VOICE.setEnabled(false);
  const off = VOICE.play('spawn') === false && VOICE.isEnabled() === false;
  VOICE.setEnabled(true);
  return off && VOICE.isEnabled() === true;
})());

// --- Animation states: resolution + priority, live ---
const base = { x: 100, y: 100, radius: 14, hp: 100, maxHp: 100, vx: 0, vy: 0 };
const stateCases = [
  ['idle', { ...base }, 1000],
  ['walk', { ...base, vx: 200, vy: 50 }, 1000],
  ['attack', { ...base, visualAttackAt: 1000, visualAimAngle: 0.5 }, 1050],
  ['super', { ...base, visualSuperAt: 1000 }, 1100],
  ['hurt', { ...base, outlitHurtAt: 1000 }, 1100],
  ['death', { ...base, hp: 0, outlitDeathAt: 1000 }, 1100],
  ['win', { ...base, outlitWinAt: 500 }, 1000]
];
for (const [want, ent, now] of stateCases) {
  check(`animationState resolves '${want}'`, V.animationState(ent, now) === want);
}
check('priority: death beats win', V.animationState({ ...base, hp: 0, outlitWinAt: 500, outlitDeathAt: 1000 }, 1100) === 'death');
check('priority: win beats hurt', V.animationState({ ...base, outlitWinAt: 500, outlitHurtAt: 1000 }, 1100) === 'win');
check('priority: hurt beats super', V.animationState({ ...base, visualSuperAt: 1000, outlitHurtAt: 1000 }, 1100) === 'hurt');
check('priority: super beats attack', V.animationState({ ...base, visualAttackAt: 1000, visualSuperAt: 1000 }, 1050) === 'super');
check('priority: attack beats walk', V.animationState({ ...base, vx: 200, visualAttackAt: 1000 }, 1050) === 'attack');
check('stale attack falls back to walk/idle (attack window is 180ms)', V.animationState({ ...base, visualAttackAt: 1000 }, 1300) === 'idle' && V.animationState({ ...base, vx: 200, visualAttackAt: 1000 }, 1300) === 'walk');
check('stale hurt falls back to idle (hurt window is 260ms)', V.animationState({ ...base, outlitHurtAt: 1000 }, 1400) === 'idle');

const stub = new Proxy({}, { get: (t, k) => { if (k === 'canvas') return {}; return () => {}; }, set: () => true });
for (const [want, ent, now] of stateCases) {
  check(`draw() returns true in '${want}' state (stub ctx)`, V.draw(stub, ent, 100, 'outlit', null, now, false) === true);
}
check('draw() still works for a non-Outlit fighter in every state', stateCases.every(([ , ent, now]) => V.draw(stub, ent, 100, 'fuser', null, now, false) === true));
check('Outlit portrait + identity untouched (robot look, signal_lamp identity)',
  rosterCode.includes("outlit:['robot','#ffc52f','#20e7ef']") && rosterCode.includes("outlit:'signal_lamp|light_caster|power_cell|lean'"));

// --- game.js hooks: every trigger is actually wired ---
check('bootstrap loads the voice module after the roster visuals',
  fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8').includes("'./modules/audio/outlit-voicelines.js'"));
check('attack voice hook in fire() (player Outlit only)',
  game.includes("if (!isBot && fromEntity === player && selectedBrawler === 'outlit') { try { window.BraweOutlitVoice?.play('attack'); } catch (e) {} }"));
check('super voice hook in fireSuper()', game.includes("if (selectedBrawler === 'outlit') { try { window.BraweOutlitVoice?.play('super'); } catch (e) {} }"));
check('kill voice hook in handleTrinketDamageDealt',
  game.includes("if (selectedBrawler === 'outlit') { try { window.BraweOutlitVoice?.play('kill'); } catch (e) {} }"));
check('hurt/death stamps in checkHit (Outlit targets only, structures excluded)',
  game.includes("const outlitStampBrawler = target === player ? selectedBrawler : target.brawler;") &&
  game.includes("if (outlitStampBrawler === 'outlit') {") &&
  game.includes("target.outlitHurtAt = performance.now();") &&
  game.includes("if (target.hp <= 0) target.outlitDeathAt = performance.now();"));
check('voice state watcher defined + called from loop() after update()',
  game.includes('function updateOutlitVoiceState()') && game.includes('update(dt);\n        updateOutlitVoiceState();'));
check('watcher plays spawn on match start', game.includes("if (isOutlit) window.BraweOutlitVoice?.play('spawn');"));
check('watcher plays win/death on gameOver transition + stamps outlitWinAt/outlitDeathAt',
  game.includes("player.outlitWinAt = now;") && game.includes("window.BraweOutlitVoice?.play('win');") &&
  game.includes("player.outlitDeathAt = now;") && game.includes("window.BraweOutlitVoice?.play('death');"));
check('watcher plays hurt on player HP drop', game.includes("window.BraweOutlitVoice?.play('hurt');"));
check('watcher plays idle after 20s still + 25s gap', game.includes("window.BraweOutlitVoice?.play('idle');") && game.includes('now - outlitVoiceLastActionAt > 20000'));
check('death burst FX pushed on Outlit death + rendered', game.includes("fxKind: 'outlitDeathBurst'") && game.includes("if (ex.fxKind === 'outlitDeathBurst') {"));
check('nightmare-outlit bespoke branch gets hurt/death/win states',
  game.includes("else if (brawlerId === 'outlit' && getActiveSkinForBrawler('outlit')?.id === 'nightmare-outlit') {") &&
  game.includes("if (entity.hp <= 0 && Number.isFinite(entity.outlitDeathAt))") &&
  game.includes("else if ((entity.outlitWinAt || 0) > 0) ctx.translate(0, -Math.abs(Math.sin(now / 240)) * 5);"));

// --- Outlit kit untouched (this PR is animation + voice only) ---
check('Outlit kit pins unchanged (brawlerData, pellets, damage, range, mutation)',
  game.includes("'outlit': { name: 'Outlit', role: 'Close-range', desc: 'Shotgun blast with strong point-blank damage.', color: '#ff9b42'") &&
  game.includes('const pellets = (isBot ? 6 : 8) + outlitExtraPellets;') &&
  game.includes('const outlitDamage = Math.round((isBot ? 146 : 188) * damageMult);') &&
  game.includes('const outlitBaseRange = 256.5;') &&
  game.includes('Every 8 main attacks, the next 4 Scatter Pumps get +100% range and 50% faster unload.'));
check('no 3D engine work in this PR (no three.js / webgl / 3D imports)',
  !/three\.js|from 'three'|webgl|WebGLRenderer/i.test(game.slice(game.indexOf('function updateOutlitVoiceState'))) &&
  !/three\.js|webgl/i.test(rosterCode) && !/three\.js|webgl/i.test(voiceCode));

console.log(`outlit-animation-voicelines: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
