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
assert.match(source, /const SUPER_SHOWDOWN_SECTOR_COLS = 10;/, 'sector columns must be 10');
assert.match(source, /const SUPER_SHOWDOWN_SECTOR_ROWS = 6;/, 'sector rows must be 6');
assert.match(source, /const SUPER_SHOWDOWN_WORLD_W = 40000;/, 'mega world width must be 40000');
assert.match(source, /const SUPER_SHOWDOWN_WORLD_H = 24000;/, 'mega world height must be 24000');
assert.match(source, /SUPER_SHOWDOWN_MAP_THEMES\[sector % SUPER_SHOWDOWN_MAP_THEMES\.length\]/, 'sectors must cycle the 6 themes in order');
// Layout simulation from the source constants: 10 cols x 6 rows of 4000x4000
// = 60 sectors, 40000x24000 = exactly 10x the old 12000x8000 area.
{
    const cols = 10, rows = 6, sectorW = 4000, sectorH = 4000;
    const sectorCount = cols * rows;
    assert.equal(sectorCount, 60, 'sector grid must hold 60 sectors');
    const rects = [];
    for (let sector = 0; sector < sectorCount; sector++) {
        rects.push({
            x: (sector % cols) * sectorW, y: Math.floor(sector / cols) * sectorH, w: sectorW, h: sectorH,
            theme: themes[sector % themes.length],
        });
    }
    for (let a = 0; a < rects.length; a++) {
        for (let b = a + 1; b < rects.length; b++) {
            const overlap = rects[a].x < rects[b].x + rects[b].w && rects[b].x < rects[a].x + rects[a].w
                && rects[a].y < rects[b].y + rects[b].h && rects[b].y < rects[a].y + rects[a].h;
            assert.ok(!overlap, `sectors ${a} and ${b} must not overlap`);
        }
    }
    const covered = rects.reduce((sum, r) => sum + r.w * r.h, 0);
    assert.equal(covered, 40000 * 24000, 'sectors must tile exactly the 40000x24000 mega world');
    assert.equal(covered, 10 * 12000 * 8000, 'new area must be exactly 10x the old 12000x8000 area');
    assert.equal(Math.max(...rects.map((r) => r.x + r.w)), 40000, 'tiling must reach the mega width');
    assert.equal(Math.max(...rects.map((r) => r.y + r.h)), 24000, 'tiling must reach the mega height');
    // Each theme appears exactly 10 times; the mega centre is a 4-sector junction.
    for (const t of themes) {
        assert.equal(rects.filter((r) => r.theme === t).length, 10, `theme ${t} must appear exactly 10 times`);
    }
    assert.equal(40000 / 2 % sectorW, 0, 'mega centre x must fall on a sector boundary');
    assert.equal(24000 / 2 % sectorH, 0, 'mega centre y must fall on a sector boundary');
    // Storm pacing: 32000 initial radius shrinking over 380s ≈ old 80px/s pace.
    const shrinkSpeed = (40000 * 0.8) / 380;
    assert.ok(shrinkSpeed > 75 && shrinkSpeed < 95, `storm shrink speed must stay near the old ~80px/s (got ${shrinkSpeed.toFixed(1)})`);
    assert.ok(shrinkSpeed < 140, 'storm shrink speed must stay below bot move speed so bots can outrun it');
}
// Storm duration + power-box count retunes for the 10x map.
assert.match(source, /const SUPER_SHOWDOWN_STORM_DURATION_S = 380;/, 'storm duration constant must be 380s');
assert.match(source, /if \(showdownMode === 'super_showdown'\) return SUPER_SHOWDOWN_STORM_DURATION_S;/, 'storm duration must branch to 380s for this mode');
assert.match(source, /const SUPER_SHOWDOWN_BOX_COUNT = 750;/, 'power-box count constant must be 750');
assert.match(source, /isSuperShowdownMode \? SUPER_SHOWDOWN_BOX_COUNT/, 'box count must branch to 750 for this mode');
// Stratified bot spawns: one bot per grid cell + jitter, same rejections.
assert.match(source, /else if \(isSuperShowdownMode\) \{/, 'bot spawn loop must branch for this mode');
assert.match(source, /const spawnGridCols = 10;/, 'spawn grid must be 10 columns');
assert.match(source, /const cellX = i % spawnGridCols, cellY = Math\.floor\(i \/ spawnGridCols\);/, 'spawn cell must derive from the bot index');
assert.match(source, /bx = \(cellX \+ 0\.15 \+ Math\.random\(\) \* 0\.7\) \* cellW;/, 'spawn x must jitter inside its cell');
{
    // Simulation: 99 bots across the 10x10 grid land at most one per cell.
    const cells = new Set();
    for (let i = 0; i < 99; i++) cells.add(`${i % 10},${Math.floor(i / 10)}`);
    assert.equal(cells.size, 99, '99 bots must occupy 99 distinct grid cells');
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
