import assert from 'node:assert/strict';
import fs from 'node:fs';

// Thanksgiving big update Phase 6 — walls & bushes render overhaul pins.
// Render-only change: these pins lock the performance contract (no
// per-frame gradients / shadowBlur / Math.random inside the new
// painters), the kill switch, the theme material coverage and the call
// sites. Behavioural geometry/hiding safety is covered by
// environment-baseline, map-sanity, fall-environment and prop-hunt.

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Kill switch + painter surface ----
assert.match(source, /let WALL_BUSH_OVERHAUL_ENABLED = true;/, 'kill switch must exist and default on');
assert.match(source, /function getWallTileSprite\(style, crack\)/, 'wall tile sprite cache must exist');
assert.match(source, /function getWallPaintStyle\(envColors, faceKey, strokeKey\)/, 'wall paint style helper must exist');
assert.match(source, /function drawChunkyWallRect\(ctx, x, y, w, h, style, hpPct\)/, 'shared chunky wall painter must exist');
assert.match(source, /function getBushTuftSprite\(variant, fill, deep\)/, 'bush tuft sprite cache must exist');
assert.match(source, /function drawBushTuftField\(ctx, zone, fill, deep, foreground\)/, 'bush tuft field painter must exist');
assert.match(source, /const WALL_TILE_PX = 48;/, 'wall tiles must follow the 48px ARENA_WALL_TILE rhythm');

// ---- Performance contract: the painter region is allocation-free ----
const painterStart = source.indexOf('let WALL_BUSH_OVERHAUL_ENABLED');
const painterEnd = source.indexOf('function drawChunkyPowerBox');
assert.ok(painterStart >= 0 && painterEnd > painterStart, 'painter region must sit above drawChunkyPowerBox');
const painters = source.slice(painterStart, painterEnd);
assert.ok(!painters.includes('Math.random'), 'painters must never call Math.random (hash/LCG only)');
assert.ok(!painters.includes('shadowBlur'), 'painters must never set shadowBlur');
assert.ok(!painters.includes('createLinearGradient') && !painters.includes('createRadialGradient'), 'painters must never build per-frame gradients');
assert.match(painters, /wallTileSpriteCache/, 'wall tiles must be pre-rendered to cached sprites');
assert.match(painters, /bushTuftSpriteCache/, 'bush tufts must be pre-rendered to cached sprites');
assert.match(painters, /drawImage\(sprite/, 'painters must blit sprites with drawImage');

// ---- Damage language pinned in the painter ----
assert.match(painters, /hpPct <= 0\.45 \? 2 : \(hpPct <= 0\.72 \? 1 : 0\)/, 'crack states must be <=72% hairline / <=45% heavy');
assert.match(painters, /if \(hpPct < 1\)/, 'HP micro-bar must only draw below 100%');

// ---- Theme materials: all 10 Showdown themes carry one ----
const themesAt = source.indexOf('const SHOWDOWN_MAP_THEMES = [');
const themesEnd = source.indexOf('];', themesAt);
const themes = source.slice(themesAt, themesEnd);
assert.equal((themes.match(/wallMaterial: '/g) || []).length, 10, 'all 10 Showdown themes must declare a wallMaterial');
for (const m of ['stone', 'wood', 'metal', 'ruin']) {
  assert.ok(themes.includes(`wallMaterial: '${m}'`), `material variant ${m} must be used by at least one theme`);
}
// The fall override tints colours but must not replace the material.
const overrideAt = source.indexOf('function getSeasonalEnvironmentOverride');
assert.ok(overrideAt >= 0, 'fall override must exist');
assert.ok(!source.slice(overrideAt, overrideAt + 1400).includes('wallMaterial'), 'fall override must tint, never set wallMaterial');

// ---- Call sites: cubes, arena walls, generic walls, bushes ----
assert.match(source, /if \(WALL_BUSH_OVERHAUL_ENABLED\) \{ drawChunkyWallRect\(ctx, c\.x \+ 2/, 'cube painter must route through the chunky painter when the switch is on');
assert.match(source, /drawChunkyWallRect\(ctx, dw\.x \+ 2, dw\.y \+ 2, Math\.max\(4, dw\.w - 4\), Math\.max\(4, dw\.h - 4\), getWallPaintStyle\(envColors, 'wallBoxFill', 'wallBoxStroke'\), hpPct\)/, 'arena + generic walls must route through the chunky painter');
assert.ok(source.includes('grad.addColorStop(0,envColors.cubeStroke'), 'the legacy cube painter must remain as the kill-switch-off fallback');
assert.ok((source.match(/drawBushTuftField\(ctx, zone/g) || []).length >= 2, 'bushes must paint tufts in the base pass and the foreground pass');
assert.match(source, /foreground foliage/, 'the player-patch foreground tuft pass must exist');
assert.match(source, /if \(BUSH_WORLD_RENDER_ENABLED && WALL_BUSH_OVERHAUL_ENABLED && player/, 'foreground pass must be gated on both render switches');

// ---- Untouched contracts: hiding logic + Prop Hunt prop rendering ----
assert.match(source, /function isEntityInsideBush/, 'hiding predicate must still exist');
assert.match(source, /function canDetectThroughBush/, 'bush detection predicate must still exist');
const propBranchAt = source.indexOf("} else if (dw.isProp) {");
assert.ok(propBranchAt >= 0, 'the isProp render branch must still exist');
const propBranchEnd = source.indexOf('        } else {', propBranchAt);
assert.ok(propBranchEnd > propBranchAt, 'the isProp render branch must be bounded by the generic branch');
const propBranch = source.slice(propBranchAt, propBranchEnd);
assert.match(propBranch, /propType === 'barrel'/, 'prop painters must be untouched (barrel)');
assert.match(propBranch, /propType === 'plant_pot'/, 'prop painters must be untouched (plant_pot)');
assert.match(source, /if \(p\.propType === 'healing_pad'\)/, 'floor-pad painter (mapProps) must be untouched');
assert.ok(!propBranch.includes('drawChunkyWallRect'), 'props must NOT be repainted by the wall overhaul');

console.log('terrain-render-overhaul-regression: all assertions passed');
