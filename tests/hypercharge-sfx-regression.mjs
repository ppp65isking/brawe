// Hypercharge SFX — one unique activation sting per playable brawler (97).
// Anthony's order 2026-11-05: Brawl-Stars-style (sharp chime + low hum +
// booming electronic burst), unique per brawler, NOT an ambient pulse.
// Source-presence + live behavior mirrors. No DOM/match runtime needed.
// Playback is exercised live in a vm without Audio (must degrade to silent
// false, never throw).
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.dirname(fileURLToPath(new URL('../game.js', import.meta.url)));
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const hcCode = fs.readFileSync(new URL('../modules/audio/hypercharge-sfx.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Playable roster, parsed from game.js (never hardcoded) ---
const allM = game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/);
const allIds = [...allM[1].matchAll(/'([a-z0-9_]+)'/g)].map(x => x[1]);
const disM = game.match(/const disabledBrawlers = new Set\(\[([\s\S]*?)\]\);/);
const disabled = new Set([...disM[1].matchAll(/'([a-z0-9_]+)'/g)].map(x => x[1]));
const playable = allIds.filter(id => !disabled.has(id));
check('roster parses: 105 ids, 8 disabled, 97 playable', allIds.length === 105 && disabled.size === 8 && playable.length === 97);
check('disabled set is exactly the 8 slated for deletion',
  ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'].every(id => disabled.has(id)));

// --- Load the module in a vm (no DOM, no Audio) ---
const ctx = { globalThis: {} };
vm.createContext(ctx);
vm.runInContext(hcCode, ctx);
const HC = ctx.globalThis.BraweHyperchargeSfx;
check('module exposes BraweHyperchargeSfx with playActivation + fileFor', !!HC && typeof HC.playActivation === 'function' && typeof HC.fileFor === 'function');
check('module base path is assets/sfx/hc/', HC.basePath === 'assets/sfx/hc/');
check('module maps exactly 97 files', HC.fileCount() === 97);
check('module playableIds() matches the parsed playable roster exactly',
  JSON.stringify([...HC.playableIds()].sort()) === JSON.stringify([...playable].sort()));
check('every playable id maps to its own <id>.mp3 file', playable.every(id => HC.fileFor(id) === id + '.mp3'));
check('disabled brawlers map to nothing (no sting for doomed ids)', [...disabled].every(id => HC.fileFor(id) === undefined));
check('unknown / empty id maps to nothing', HC.fileFor('not_a_brawler') === undefined && HC.fileFor('') === undefined && HC.fileFor(undefined) === undefined);

// --- Files on disk: real MP3s, ~1s at 64kbps, all distinct ---
function isMp3(buf) {
  return (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0);
}
let ok = true, bytes = 0;
const hashes = new Set();
for (const id of playable) {
  const p = path.join(repo, 'assets/sfx/hc', id + '.mp3');
  if (!fs.existsSync(p)) { ok = false; break; }
  const buf = fs.readFileSync(p);
  bytes += buf.length;
  hashes.add(crypto.createHash('md5').update(buf).digest('hex'));
  // 1.0s at 64kbps mono = ~8 KB; allow a sane band around it.
  if (!isMp3(buf) || buf.length < 5000 || buf.length > 15000) { ok = false; break; }
}
check('all 97 HC sting files exist and are real MP3s (~1s, 64kbps mono)', ok);
check('all 97 HC stings are distinct renders (unique md5s)', hashes.size === 97);
console.log(`  (hc audio total: ${(bytes / 1024).toFixed(0)} KB across 97 stings)`);
check('no Outlit-only sting files remain (assets/sfx/outlit/ is gone)',
  !fs.existsSync(path.join(repo, 'assets/sfx/outlit')) && !fs.existsSync(path.join(repo, 'modules/audio/outlit-sfx.js')));

// --- Playback degrades silently without Audio/DOM ---
check('playActivation() returns false (never throws) with no Audio', HC.playActivation('outlit') === false && HC.playActivation('fuser') === false);
check('playActivation() returns false for unknown / disabled brawlers', HC.playActivation('not_a_brawler') === false && HC.playActivation('robber') === false);
check('setEnabled(false) silences playActivation(); setEnabled(true) restores the attempt path', (() => {
  HC.setEnabled(false);
  const off = HC.playActivation('outlit') === false && HC.isEnabled() === false;
  HC.setEnabled(true);
  return off && HC.isEnabled() === true;
})());

// --- Wiring: hook in activateHypercharge(), no pulse anywhere ---
check('HC SFX hook in activateHypercharge() passes the selected brawler',
  game.includes("window.BraweHyperchargeSfx?.playActivation(selectedBrawler);"));
check('no while-hypercharged pulse remains (no tickHyper, no hc-pulse)',
  !game.includes('tickHyper') && !game.includes('hc-pulse') && !hcCode.includes('tickHyper') && !hcCode.includes('hc-pulse'));

// --- Kit pins: the HC change touched no kit numbers ---
check('Fuser + Outlit kit pins unchanged (brawlerData desc/attack/super/hyper)',
  game.includes("'fuser': { name:'Fuser', role:'Damage Dealer', desc:'Outlit\\'s evil twin fires a rapid six-round burst down two parallel firing lanes.', color:'#ff4d6d', attack:'Six-Fuse Salvo'") &&
  game.includes("super:'Wall-Fuser Barrage'") &&
  game.includes("hyper:'Return to Sender: Super bullets return.") &&
  game.includes('Every 8 main attacks, the next 4 Scatter Pumps get +100% range and 50% faster unload.'));
check('activateHypercharge still gates on charge + availability (hook only added, logic intact)',
  game.includes('if(hyperChargeCharge < 100 || player.hp <= 0 || !hcAvailable) return;') &&
  game.includes('hyperchargeUntil = performance.now()'));

console.log(`hypercharge-sfx: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
