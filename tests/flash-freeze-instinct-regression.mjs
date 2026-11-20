import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// 1. Verify Special Ability Definition
assert.match(game, /fightnfire:\s*\{[\s\S]*?type:\s*'instinct'/, 'FightnFire has registered Instinct ability');
assert.match(game, /name:\s*'Flash Freeze'/, 'Instinct name is Flash Freeze');
assert.match(game, /pieceName:\s*"Fight'n'Fire Instinct Piece"/, 'Piece name is FightnFire Instinct Piece');
assert.match(game, /Sub-Zero Ice Cores that encase enemies in a solid Block of Ice for 1\.3s/, 'Short description includes stasis mechanic');


// 3. Verify Combat Mechanics & Super Alternation
assert.match(game, /entity\.fightnfireSuperCount\s*=\s*\(entity\.fightnfireSuperCount\s*\|\|\s*0\)\s*\+\s*1/, 'Tracks Super casts');
assert.match(game, /const isFlashFreeze = hasInstinct && \(entity\.fightnfireSuperCount % 2 === 1\)/, 'Flash Freeze triggers every other Super cast');
assert.match(game, /isFightnfireIceProj:\s*isFlashFreeze/, 'Spit projectile marked as ice proj when Flash Freeze is active');

// 4. Verify 50% Sub-Zero Ice Core Shards in Impact
assert.match(game, /const isIceShard = isFlashFreezeBurst && \(i % 2 === 0\)/, '50% of radial shards convert to ice projectiles on Flash Freeze');

// 5. Verify Ice Block Stasis 100% DR & Freeze Mechanics
assert.match(game, /target\.iceBlockUntil\s*&&\s*target\.iceBlockUntil\s*>\s*performance\.now\(\)/, 'Ice Block Stasis 100% damage reduction in checkHit');
assert.match(game, /target\.iceBlockUntil\s*=\s*now\s*\+\s*1300/, 'Encases target in Ice Block for 1.3s');
assert.match(game, /target\.iceBlockImmuneUntil\s*=\s*target\.iceBlockUntil\s*\+\s*2000/, '2s anti-chain freeze immunity window');
assert.match(game, /target\.stunUntil\s*=\s*Math\.max\(target\.stunUntil\s*\|\|\s*0,\s*target\.iceBlockUntil\)/, 'Target is stunned/rooted/silenced during Ice Block');

// 6. Verify Visuals & HUD
assert.match(game, /chips\.push\(\{\s*t:\s*'ICE',\s*c:\s*'#48dbfb'\s*\}\)/, 'Status chip includes ICE tag');
assert.match(game, /function drawIceBlockStasis/, 'Draws 3D crystalline Ice Block stasis');
assert.match(game, /selectedBrawler === 'fightnfire'[\s\S]*?INSTINCT - FLASH FREEZE PRIMED/, 'Mechanic HUD indicates Flash Freeze readiness');

// 7. Verify Purple Hypercharge Visuals for Fight'n'Fire
assert.match(game, /rgba\(238, 0, 255, 0\.95\)/, 'Hypercharge projectile uses electric neon purple');
assert.match(game, /ctx\.strokeStyle = '#ba00d6'/, 'Hypercharge stroke uses vibrant purple/magenta');
assert.match(game, /e\.fightnFireSuperHyper[\s\S]*?rgba\(238, 0, 255, 0\.9\)/, 'Super hyper cast ring uses purple');

// 8. Verify Reworked Ice Projectile & Shard Visuals
assert.match(game, /Crystalline Sub-Zero Comet/, 'Reworked ice projectile rendering present');
assert.match(game, /REWORKED: Faceted Crystalline Ice Icicle Dagger/, 'Reworked faceted ice shard rendering present');

console.log('✅ All Flash Freeze Instinct regression tests passed!');



