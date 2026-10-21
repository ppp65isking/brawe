import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('game.js','utf8');
for(const token of [
  "'looma': {", "'badbat', 'looma'", "looma: 'Epic'", "looma:'Controller'",
  'function fireLoomaNeedle', 'function placeLoomaAnchor', 'function castLoomaSuper',
  'function executeLoomaG1', 'function updateLoomaEffects', 'function renderLoomaEffects',
  "combatBrawler === 'looma'", "botCombatBrawler === 'looma'", "curBrawler === 'looma'",
  'loomaThreads.length = 0', 'loomaWeaves.length = 0', 'looma:7'
]) assert.ok(source.includes(token),`Missing Looma wiring: ${token}`);

const data=source.match(/'looma': \{[\s\S]*?\n\s*\},\n\s*'blinkeye'/)?.[0]||'';
for(const field of ['Needlecast','Grand Weave','TANGLED DIMENSION','Snip Snap','Safety Stitch','Tight Stitch','Endless Spool']) assert.ok(data.includes(field),`Missing Looma kit copy: ${field}`);
assert.match(source,/return \{ hp: Math\.round\(6600 \* scale\), dmg: Math\.round\(1450 \* scale\), speed: 270 \}/);
assert.match(source,/looma: \{ g1: 14000, g2: 16000 \}/);
console.log('Looma roster, stats, attack, Super, Hypercharge, Tools, Talents, AI and cleanup wiring PASS');
