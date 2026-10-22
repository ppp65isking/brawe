import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// The persistent save format (brawl_arena_save) serializes each brawler's
// progress from a fixed field list. The Power 12 fields must be in the writer,
// or a bought Core Perk slot is forgotten on reload.
const saveBlock = source.slice(source.indexOf('save.persistent.brawlerProgress[bid] = {'), source.indexOf('save.persistent.brawlerProgress[bid] = {') + 900);
assert.match(saveBlock, /corePerkUnlocked:\s*!!progress\.corePerkUnlocked/, 'save writer must persist corePerkUnlocked');
assert.match(saveBlock, /corePerk:\s*progress\.corePerk \|\| null/, 'save writer must persist the chosen corePerk');

// The matching load path rebuilds each brawler from the same kind of fixed
// list; it must restore the perk fields too.
const loadBlock = source.slice(source.indexOf('playerData.brawlers[bid] = {', source.indexOf('data.persistent.brawlerProgress')), source.indexOf('ensureProgressTrinkets(playerData.brawlers[bid]);', source.indexOf('data.persistent.brawlerProgress')));
assert.match(loadBlock, /corePerkUnlocked:\s*!!progress\.corePerkUnlocked/, 'load reader must restore corePerkUnlocked');
assert.match(loadBlock, /corePerk:\s*progress\.corePerk \|\| null/, 'load reader must restore the chosen corePerk');

// Post-load normalization rebuilds progress objects again; it must carry the
// perk fields explicitly instead of relying on the spread.
assert.match(source, /corePerkUnlocked:\s*!!existing\.corePerkUnlocked/, 'normalization must carry corePerkUnlocked');
assert.match(source, /corePerk:\s*existing\.corePerk \|\| null/, 'normalization must carry the chosen corePerk');

// Level 12 itself must survive the roundtrip: the level clamps on both load
// paths use MAX_POWER_LEVEL, never a hardcoded 11.
assert.match(source, /level: Math\.max\(1, Math\.min\(MAX_POWER_LEVEL, Math\.floor\(progress\.level \|\| 1\)\)\)/, 'persistent load clamp must use MAX_POWER_LEVEL');
assert.match(source, /level: Math\.max\(1, Math\.min\(MAX_POWER_LEVEL, Math\.floor\(existing\.level \|\| 1\)\)\)/, 'normalization clamp must use MAX_POWER_LEVEL');

// Weekly-trial fighters use a temporary progress copy: the details-screen
// upgrade button must never charge real coins/Core Pieces for them.
assert.match(source, /if \(isWeeklyTrialBrawler\(id\)\) \{\s*\n\s*upgBtn\.textContent = 'WEEKLY TRIAL — TEMPORARY LOADOUT';/, 'trial fighters must get a disabled upgrade button');

console.log('Power 12 perk persistence regression checks passed.');
