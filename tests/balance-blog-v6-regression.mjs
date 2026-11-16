import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const start = source.indexOf('/* BALANCE_V6_GENERATED_START */');
const end = source.indexOf('/* BALANCE_V6_GENERATED_END */');
assert.ok(start >= 0 && end > start, 'generated V6 balance post is present');

const post = source.slice(start, end);
assert.match(post, /"tag": "V6 LIVE"/);
assert.match(post, /"title": "Full Roster Balance Update"/);
assert.match(post, /"grouped": true/);
assert.match(post, /"section": "Main Attack"/);
assert.match(post, /"section": "Super & Summons"/);
assert.match(post, /"section": "Star Powers"/);
assert.match(post, /"section": "Hypercharge"/);
assert.match(post, /"section": "Special Abilities"/);
assert.match(post, /"section": "Watchlist"/);

assert.doesNotMatch(post, /remain disabled and unchanged/, 'the V6 disabled-brawlers sentence is gone with the deletion');

const brawlers = [...post.matchAll(/"brawler": "([^"]+)"/g)].map((match) => match[1]);
assert.equal(brawlers.length, 83, 'all active roster recommendations are included');
assert.equal(new Set(brawlers).size, brawlers.length, 'each active fighter appears once');
assert.match(source, /if \(t === 'adjust'\).*label: 'ADJUST'/);
assert.match(source, /if \(t === 'hold'\).*label: 'HOLD'/);
assert.match(source, /if \(entry\.grouped\)/);
assert.match(source, /balanceBlogBtn\.textContent = '📊 Balance Blog'/, 'home exposes a clearly named Balance Blog button');
assert.match(source, /progressionShortcutRow\.insertBefore\(balanceBlogBtn, progressionShortcutRow\.firstChild\)/, 'Balance Blog is the first visible progression shortcut');
assert.match(source, /balanceBlogBtn\.addEventListener\('click',[\s\S]{0,180}openBalanceBlog\(\)/, 'Balance Blog button opens the patch notes');

console.log('balance blog V6 regression: ok');
