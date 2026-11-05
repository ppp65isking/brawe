// Fuser voice lines + Outlit mutation lines/SFX (Anthony's order 2026-11-05).
// Source-presence + live behavior mirrors. No DOM/match runtime needed.
// Voice/SFX playback is exercised live in a vm without Audio (must degrade
// to silent false, never throw).
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.dirname(fileURLToPath(new URL('../game.js', import.meta.url)));
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const fuserCode = fs.readFileSync(new URL('../modules/audio/fuser-voicelines.js', import.meta.url), 'utf8');
const outlitCode = fs.readFileSync(new URL('../modules/audio/outlit-voicelines.js', import.meta.url), 'utf8');
// Hypercharge SFX lives in modules/audio/hypercharge-sfx.js — covered in full by
// tests/hypercharge-sfx-regression.mjs (97 stings, map, hook, silent failure).
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Load the three modules in a vm (no DOM, no Audio) ---
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(fuserCode, ctx);
vm.runInContext(outlitCode, ctx);

const FUSER = ctx.globalThis.BraweFuserVoice;
const OUTLIT = ctx.globalThis.BraweOutlitVoice;
check('fuser module exposes BraweFuserVoice', !!FUSER && typeof FUSER.play === 'function');
check('outlit module still exposes BraweOutlitVoice', !!OUTLIT && typeof OUTLIT.play === 'function');

// --- Fuser voice lines: map, text, files on disk ---
const FUSER_TEXT = {
  'spawn-1.mp3': "Fuser online. Try to keep up, twin.",
  'spawn-2.mp3': "Reactor's roaring. Outlit, watch and learn!",
  'spawn-3.mp3': "Reactor's hot. Let's fuse some fools.",
  'attack-1.mp3': "Coming in hot!",
  'attack-2.mp3': "Double trouble, twin!",
  'attack-3.mp3': "Fuse lit!",
  'attack-4.mp3': "Eat plasma!",
  'super-1.mp3': "Wall-Fuser Barrage!",
  'super-2.mp3': "Fuser unleashed!",
  'super-3.mp3': "Reactor at full blast!",
  'kill-1.mp3': "Fused. Next!",
  'kill-2.mp3': "You're short-circuited.",
  'kill-3.mp3': "Twin beats twin. Every time.",
  'hurt-1.mp3': "Hey! My reactor's sensitive!",
  'hurt-2.mp3': "Ow! System shock!",
  'hurt-3.mp3': "You dented the suit!",
  'death-1.mp3': "Reactor... failing...",
  'death-2.mp3': "Tell Outlit... he got lucky...",
  'death-3.mp3': "Fusing... out...",
  'win-1.mp3': "Fuser wins. The twin takes the crown.",
  'win-2.mp3': "One twin standing. Me.",
  'win-3.mp3': "Outlit who? I'm the upgrade.",
  'idle-1.mp3': "Hello? Did everyone fuse out?",
  'idle-2.mp3': "My reactor's getting bored."
};
const TRIGGERS = ['spawn', 'attack', 'super', 'kill', 'hurt', 'death', 'win', 'idle'];
check('fuser map covers all 8 triggers', TRIGGERS.every(t => Array.isArray(FUSER.lines[t]) && FUSER.lines[t].length > 0));
check('fuser map has exactly 24 clips', FUSER.fileCount() === 24 && Object.values(FUSER.lines).flat().length === 24);
check('fuser text map matches the SPEC line list exactly', JSON.stringify(FUSER.text) === JSON.stringify(FUSER_TEXT));
check('fuser voice is Speedy Scooter, the flagged builder pick', FUSER.voiceId === 'avocado_v2:vd2_r82_rep5k_0048_v068_28k_g5k' && FUSER.voiceName === 'Speedy Scooter');
check('fuser cooldowns mirror Outlit: attack 4500 / hurt 2500 / kill 1200 / idle 20000, rare triggers unthrottled',
  FUSER.cooldowns.attack === 4500 && FUSER.cooldowns.hurt === 2500 && FUSER.cooldowns.kill === 1200 && FUSER.cooldowns.idle === 20000 &&
  FUSER.cooldowns.spawn === 0 && FUSER.cooldowns.super === 0 && FUSER.cooldowns.death === 0 && FUSER.cooldowns.win === 0);

function isMp3(buf) {
  return (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
}
let fuserBytes = 0, fuserOk = true;
const fuserHashes = new Set();
for (const [file] of Object.entries(FUSER_TEXT)) {
  const p = path.join(repo, 'assets/voice/fuser', file);
  if (!fs.existsSync(p)) { fuserOk = false; break; }
  const buf = fs.readFileSync(p);
  fuserBytes += buf.length;
  fuserHashes.add(crypto.createHash('md5').update(buf).digest('hex'));
  if (!isMp3(buf) || buf.length < 5000) { fuserOk = false; break; }
}
check('all 24 Fuser audio files exist on disk and are real MP3s', fuserOk);
check('all 24 Fuser clips are distinct renders (unique md5s)', fuserHashes.size === 24);
check('Fuser audio total is reasonable (< 1 MB)', fuserBytes > 100000 && fuserBytes < 1024 * 1024);
console.log(`  (fuser audio total: ${(fuserBytes / 1024).toFixed(0)} KB across 24 clips)`);

// --- Fuser playback degrades silently without Audio/DOM ---
check('Fuser play() returns false (never throws) with no Audio', FUSER.play('spawn') === false && FUSER.play('attack') === false);
check('Fuser play() returns false for an unknown trigger', FUSER.play('nope') === false);
check('Fuser setEnabled(false) silences play(); setEnabled(true) restores the attempt path', (() => {
  FUSER.setEnabled(false);
  const off = FUSER.play('spawn') === false && FUSER.isEnabled() === false;
  FUSER.setEnabled(true);
  return off && FUSER.isEnabled() === true;
})());

// --- Outlit mutation trigger (3 lines + baked-in SFX) ---
const MUTATION_TEXT = {
  'mutation-1.mp3': "Overpressure! Light it up!",
  'mutation-2.mp3': "Pressure's peaking, time to blow this wide open!",
  'mutation-3.mp3': "Full pressure! Nobody's safe now!"
};
check('outlit module has the mutation trigger with 3 clips', Array.isArray(OUTLIT.lines.mutation) && OUTLIT.lines.mutation.length === 3);
check('outlit voice fileCount is now 27 (24 + 3 mutation)', OUTLIT.fileCount() === 27);
check('outlit mutation text matches the SPEC line list exactly',
  MUTATION_TEXT['mutation-1.mp3'] === OUTLIT.text['mutation-1.mp3'] &&
  MUTATION_TEXT['mutation-2.mp3'] === OUTLIT.text['mutation-2.mp3'] &&
  MUTATION_TEXT['mutation-3.mp3'] === OUTLIT.text['mutation-3.mp3']);
check('mutation trigger is unthrottled (arming cadence is the throttle)', OUTLIT.cooldowns.mutation === 0);
let mutOk = true, mutBytes = 0;
const mutHashes = new Set();
for (const file of Object.keys(MUTATION_TEXT)) {
  const p = path.join(repo, 'assets/voice/outlit', file);
  if (!fs.existsSync(p)) { mutOk = false; break; }
  const buf = fs.readFileSync(p);
  mutBytes += buf.length;
  mutHashes.add(crypto.createHash('md5').update(buf).digest('hex'));
  // Mixed line + SFX bed: real MP3, longer than a bare short line.
  if (!isMp3(buf) || buf.length < 20000) { mutOk = false; break; }
}
check('all 3 mutation clips exist, are real MP3s, and carry the SFX mix (size >= 20 KB)', mutOk);
check('all 3 mutation clips are distinct renders (unique md5s)', mutHashes.size === 3);
console.log(`  (mutation audio total: ${(mutBytes / 1024).toFixed(0)} KB across 3 clips)`);

// --- Hypercharge SFX: now one unique sting per playable brawler ---
// (was Outlit-only sting + quiet pulse — pulse dropped, see SPEC §4).
// Covered in tests/hypercharge-sfx-regression.mjs; here only the wiring:
check('no Outlit-only SFX module or pulse remains (BraweOutlitSfx / tickHyper gone)',
  !game.includes('BraweOutlitSfx') && !game.includes('tickHyper') && !fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8').includes('tickHyper'));


// --- bootstrap loads the new modules after the Outlit voice module ---
const bootstrap = fs.readFileSync(new URL('../bootstrap.js', import.meta.url), 'utf8');
check('bootstrap loads fuser-voicelines.js + hypercharge-sfx.js after outlit-voicelines.js',
  bootstrap.indexOf("'./modules/audio/outlit-voicelines.js'") > 0 &&
  bootstrap.indexOf("'./modules/audio/fuser-voicelines.js'") > bootstrap.indexOf("'./modules/audio/outlit-voicelines.js'") &&
  bootstrap.indexOf("'./modules/audio/hypercharge-sfx.js'") > bootstrap.indexOf("'./modules/audio/outlit-voicelines.js'"));

// --- game.js hooks: every trigger is actually wired ---
check('Fuser attack voice hook in fire() (player Fuser only)',
  game.includes("if (!isBot && fromEntity === player && selectedBrawler === 'fuser') { try { window.BraweFuserVoice?.play('attack'); } catch (e) {} }"));
check('Fuser super voice hook in fireSuper()',
  game.includes("if (selectedBrawler === 'fuser') { try { window.BraweFuserVoice?.play('super'); } catch (e) {} }"));
check('Fuser kill voice hook in handleTrinketDamageDealt',
  game.includes("if (selectedBrawler === 'fuser') { try { window.BraweFuserVoice?.play('kill'); } catch (e) {} }"));
check('Fuser voice state watcher defined + called from loop() after the Outlit watcher',
  game.includes('function updateFuserVoiceState()') && game.includes('updateOutlitVoiceState();\n        updateFuserVoiceState();'));
check('Fuser watcher plays spawn/win/death/hurt/idle',
  game.includes("if (isFuser) window.BraweFuserVoice?.play('spawn');") &&
  game.includes("window.BraweFuserVoice?.play('win');") &&
  game.includes("window.BraweFuserVoice?.play('death');") &&
  game.includes("window.BraweFuserVoice?.play('hurt');") &&
  game.includes("window.BraweFuserVoice?.play('idle');"));
check('mutation voice hook in recordOutlitMutationShot (player only, when charges arm)',
  game.includes("if (entity.id === player.id) { try { window.BraweOutlitVoice?.play('mutation'); } catch (e) {} }") &&
  game.includes('entity.outlitMutationCharges = 4;'));
check('HC activation SFX hook in activateHypercharge() (per-brawler, player only)',
  game.includes("window.BraweHyperchargeSfx?.playActivation(selectedBrawler);"));
check('no while-hypercharged pulse tick remains anywhere in game.js',
  !game.includes('tickHyper'));

// --- Kit pins: nothing about Fuser's or Outlit's kit changed in this PR ---
check('Fuser kit pins unchanged (brawlerData desc/attack/super/hyper/gadgets/star powers)',
  game.includes("'fuser': { name:'Fuser', role:'Damage Dealer', desc:'Outlit\\'s evil twin fires a rapid six-round burst down two parallel firing lanes.', color:'#ff4d6d', attack:'Six-Fuse Salvo'") &&
  game.includes("super:'Wall-Fuser Barrage'") &&
  game.includes("hyper:'Return to Sender: Super bullets return.") &&
  game.includes("g1:'Wall Fuse (Next attack bullets go through walls)', g2:'Spare Magazine (Instantly reload 2 ammo)', sp1:'Healing Fuse (Every 4th attack shoots 2 fast straight bullets that heal 800 HP each on hit)', sp2:'Family Shield (Bullets grant allies a 120 shield)'"));
check('Fuser main-attack numbers pinned (6 shots, 360 player / 242 bot, delay 96 normal / 41 hyper)',
  game.includes('for (let shot = 0; shot < 6; shot++) setTimeout(() => {') &&
  game.includes('const delay = hyper ? 41 : 96; // +50% faster unload (was 62 / 144)') &&
  game.includes('damage: Math.round((isBot ? 242 : 360) * damageMult)'));
check('Outlit Overpressure def + trigger numbers unchanged (8 attacks -> 4 charges)',
  game.includes('Every 8 main attacks, the next 4 Scatter Pumps get +100% range and 50% faster unload.') &&
  game.includes('if (entity.outlitMutationShotCounter >= 8) {') &&
  game.includes('entity.outlitMutationCharges = 4;') &&
  game.includes("'OVERPRESSURE READY'"));
check('no 3D engine work in this PR (no three.js / webgl imports)',
  !/three\.js|from 'three'|webgl|WebGLRenderer/i.test(fuserCode) &&
  !/three\.js|webgl/i.test(fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8')));

console.log(`fuser-voicelines-outlit-sfx: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
