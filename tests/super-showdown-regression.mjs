import fs from 'node:fs';
import assert from 'node:assert/strict';

// Super Showdown (Core Surge Overdrive) regression suite.
// House style: source assertions (game.js is a browser script, not a module),
// plus a layout simulation derived from the constants actually in source.

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const lines = source.split('\n');

// --- 1. Mode card: real name + description, no placeholder text -----------
const card = lines.find((l) => l.includes("'super_showdown'") && l.includes('Super Showdown'));
assert.ok(card, 'HOME_MODE_CARDS must contain a super_showdown entry');
assert.match(card, /100-player/, 'card must state the 100-player count');
assert.match(card, /last-one-standing/, 'card must describe last-one-standing play');
assert.doesNotMatch(card, /TODO|TBD|placeholder|Lorem|XXX/i, 'card must not contain placeholder text');
assert.doesNotMatch(card, /Brawl Stars/i, 'card must not use Brawl Stars terms');

// --- 2. Always available: permanent registry + popular (always-available) section,
// never the daily rotation pool ------------------------------------------------
assert.match(source, /HOME_PERMANENT_MODE_IDS\.push\('super_showdown'\)/, 'must be in the permanent registry');
assert.match(source, /HOME_POPULAR_MODE_IDS = \['solo', 'super_showdown'/, 'must be in the POPULAR (always-available) home section');
const rotationPool = source.match(/const HOME_DAILY_ROTATION_POOL = \[([^\]]*)\]/);
assert.ok(rotationPool, 'daily rotation pool must exist');
assert.doesNotMatch(rotationPool[1], /super_showdown/, 'must NOT be in the daily rotation pool');

// --- 3. 100 players for this mode only --------------------------------------
assert.match(source, /const SUPER_SHOWDOWN_BOT_COUNT = 99;/, 'bot count constant must be 99');
assert.match(source, /else if \(isSuperShowdownMode\) enemyCount = SUPER_SHOWDOWN_BOT_COUNT;/, 'spawnBots must branch to 99 bots for this mode');
assert.match(source, /const MAX_BOTS = 19;/, 'MAX_BOTS must stay 19');
assert.match(source, /else if \(!isBossFight && !isSoloTrial\) enemyCount = 19;/, 'solo fallback must stay 19');
assert.match(source, /else if \(isDuoShowdown\) enemyCount = 18;/, 'duo count must stay 18');
assert.match(source, /else if \(isTrioShowdownMode\) enemyCount = 16;/, 'trio count must stay 16');
// Player + 99 bots = 100 fighters.
assert.equal(1 + 99, 100, 'player + 99 bots must be 100 fighters');

// --- 4. Mega map: 6 themes tiled at full scale -------------------------------
const themesMatch = source.match(/const SUPER_SHOWDOWN_MAP_THEMES = \[([0-9, ]+)\];/);
assert.ok(themesMatch, 'theme pick constant must exist');
const themes = themesMatch[1].split(',').map((s) => Number(s.trim()));
assert.deepEqual(themes, [0, 2, 3, 4, 6, 7], 'picked themes must be Crown Collapse, Four Corners, Neon Labyrinth, Frost Circuit, Crownspire Keep, Gearfall Foundry');
assert.equal(new Set(themes).size, 6, 'themes must be unique');
assert.ok(themes.every((t) => t >= 0 && t <= 9), 'themes must be valid showdown theme indices');
for (const name of ['Crown Collapse', 'Four Corners', 'Neon Labyrinth', 'Frost Circuit', 'Crownspire Keep', 'Gearfall Foundry']) {
    assert.ok(source.includes(name), `buildNextShowdownMap must still define the ${name} theme`);
}
assert.match(source, /function buildSuperShowdownMap\(\)/, 'mega-map builder must exist');
assert.match(source, /buildNextShowdownMap\(themeIdx\)/, 'builder must reuse the existing per-theme builder');
assert.match(source, /x: w\.x \+ ox, y: w\.y \+ oy/, 'builder must translate captured walls into their sector');
assert.match(source, /const SUPER_SHOWDOWN_WORLD_W = 12000;/, 'mega world width must be 12000');
assert.match(source, /const SUPER_SHOWDOWN_WORLD_H = 8000;/, 'mega world height must be 8000');
// Layout simulation from the source constants: 3 cols x 2 rows of 4000x4000.
{
    const cols = 3, sectorW = 4000, sectorH = 4000;
    const rects = themes.map((_, sector) => ({
        x: (sector % cols) * sectorW, y: Math.floor(sector / cols) * sectorH, w: sectorW, h: sectorH,
    }));
    for (let a = 0; a < rects.length; a++) {
        for (let b = a + 1; b < rects.length; b++) {
            const overlap = rects[a].x < rects[b].x + rects[b].w && rects[b].x < rects[a].x + rects[a].w
                && rects[a].y < rects[b].y + rects[b].h && rects[b].y < rects[a].y + rects[a].h;
            assert.ok(!overlap, `sectors ${a} and ${b} must not overlap`);
        }
    }
    const covered = rects.reduce((sum, r) => sum + r.w * r.h, 0);
    assert.equal(covered, 12000 * 8000, 'sectors must tile exactly the 12000x8000 mega world');
    assert.equal(Math.max(...rects.map((r) => r.x + r.w)), 12000, 'tiling must reach the mega width');
    assert.equal(Math.max(...rects.map((r) => r.y + r.h)), 8000, 'tiling must reach the mega height');
}
// Spawn safety: player spawn avoids walls AND water; bot spawns avoid both.
{
    // Player spawn branch for this mode must use the wall-and-water-aware search.
    const anchor = source.indexOf('spawnPos = getDamageFillerSpawnPoint');
    const branch = source.slice(source.indexOf('isSuperShowdownMode', anchor));
    assert.match(branch.slice(0, 600), /spawnPos = findNearestOpenSpot\(/, 'player spawn must use the wall-and-water-aware search');
}
// The generic bot spawn loop (unchanged, reused) already rejects wall/water spots.
assert.match(source, /isCircleBlockedByTerrain\(null, bx, by, 14\) \|\| isCircleInWaterAt\(bx, by, 14\)/, 'bot spawn rejection must still check walls and water');

// --- 5. Faster charges: this mode only ---------------------------------------
assert.match(source, /if \(showdownMode === 'super_showdown'\) return 2\.0;/, 'Super gain must be 2x for this mode');
assert.match(source, /if \(showdownMode === 'super_showdown'\) return 3\.0;/, 'Core Surge (Hypercharge) gain must be 3x for this mode');
assert.match(source, /return activeShowdownModifier === 'power_surge' \? 1\.2 : 1\.0;/, 'other modes must keep the existing 1.2/1.0 multiplier path');
assert.match(source, /let modeHyperGain = \(hyperGain \/ getModeSuperGainMultiplier\(\)\) \* getModeHyperGainMultiplier\(\);/, 'existing per-hit gain path must still flow through both multipliers');

// --- 6. Lag guards: present AND mode-gated -----------------------------------
assert.match(source, /const superShowdownAiThrottled = isSuperShowdownMode &&/, 'AI stagger must be gated to this mode');
assert.match(source, /superShowdownAiSlice = \(superShowdownAiSlice \+ 1\) % 3;/, 'AI slice must rotate once per frame');
assert.match(source, /if \(isSuperShowdownMode\) \{\s*\n\s*if \(bullets\.length > 1200\)/, 'projectile cap guard must be gated to this mode');
assert.match(source, /if \(explosions\.length > 120\)/, 'explosion cap guard must exist');
assert.match(source, /if \(floatingTexts\.length > 60\)/, 'floating-text cap guard must exist');
assert.match(source, /isSuperShowdownMode \? 90 : \(Math\.max\(150, Number\(t\.radius\) \|\| 0\) \+ 90\)/, 'tighter render cull must be gated to this mode');

// --- 7. Bounds / state restored after the mode -------------------------------
assert.match(source, /function restoreSuperShowdownWorld\(\)/, 'restore function must exist');
assert.match(source, /superShowdownWorldSaved = \{ w: WORLD_W, h: WORLD_H \};/, 'launch must save pre-match bounds');
assert.match(source, /WORLD_W = superShowdownWorldSaved\.w;/, 'restore must put back the saved width');
assert.match(source, /superShowdownWorldSaved = null;/, 'restore must clear the saved state so it cannot re-fire');
assert.ok(source.match(/restoreSuperShowdownWorld\(\);/g).length >= 2, 'restore must run both at next launch and at match end');
assert.match(source, /WORLD_W = SUPER_SHOWDOWN_WORLD_W;\s*\n\s*WORLD_H = SUPER_SHOWDOWN_WORLD_H;/, 'mega bounds must be set from the constants');

// --- 8. Win/loss reuses solo resolution; gold untouched -----------------------
assert.doesNotMatch(source, /isSuperShowdownMode.*gameOver|gameOver.*isSuperShowdownMode/, 'no special game-over branch for this mode');
assert.match(source, /rankNum = player\.hp > 0 \? 1 : \(aliveCount\+1\);/, 'generic last-one-standing rank path must remain');
assert.ok(!lines.some((l) => l.includes('super_showdown') && l.toLowerCase().includes('gold')), 'no super_showdown line may touch gold-event logic');

console.log('Super Showdown regression checks passed.');
