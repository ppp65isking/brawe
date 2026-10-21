import fs from 'node:fs';
import assert from 'node:assert/strict';

const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const must=(pattern,label)=>assert.match(game,pattern,label);

must(/\['headless_boss_s4', '🎃', 'Headless Bolznstien Boss'/, 'permanent event card exists (Season 4: Headless Bolznstien replaced the Bouncin boss event)');
must(/function openBouncinBossEvent\(\)/, 'difficulty ladder exists');
must(/function initBouncinBossMatch\(\)/, '3v1 match initializer exists');
must(/for\(let i=0;i<2;i\+\+\)bots\.push\(createBouncinBossAlly\(i\)\)/, 'two allied bots are spawned');
must(/BOUNCIN_BOSS_MAX_TURRETS=3/, 'turret cap is enforced');
must(/turret\.hp=Math\.max\(1,turret\.hp-750\)/, 'signature turret activation costs HP');
must(/for\(let wave=0;wave<2;wave\+\+\)/, 'signature fires two waves');
must(/RICOCHET VOLLEY/, 'ricochet volley attack exists');
must(/ELASTIC BANK/, 'wall-bank attack exists');
must(/BOUNCY HOUSE/, 'base Super attack exists');
must(/PINBALL OVERDRIVE/, 'Hyper-style boss phase exists');
must(/BOUNCIN_BOSS_MAX_BALLS=72/, 'projectile performance cap exists');
must(/ball\.damage=Math\.max\(150,Math\.round\(ball\.damage\*\.96\)\)/, 'bounce damage falloff is applied');
must(/FINAL SET • CHAOS COURT/, 'one-third HP phase transition exists');
must(/SECOND SET • TURRET FORTRESS/, 'two-thirds HP phase transition exists');
must(/boss\.defenseMult=\.48/, 'living turrets protect the boss');
must(/CORNER POCKET/, 'corner ambush attack exists');
must(/BUMPER BREAK/, 'bumper detonation attack exists');
must(/RICOCHET WALLS/, 'ricochet wall attack exists');
must(/ball\.hyper&&ball\.splitCount<2/, 'Hyper balls split after real bounces');
must(/isBouncinBossEvent \? 5\.5/, 'raid respawn pressure is longer than Lava raid');
must(/renderBouncinBossEvent\('ground'\)/, 'ground renderer is wired');
must(/renderBouncinBossEvent\('actors'\)/, 'actor renderer is wired');
must(/completeBouncinBossDifficulty\(cfg\.id\)/, 'first-clear completion is wired');
must(/bouncinBoss:\{completed:\[\],claimedRewards:\[\],extremeRevealSeen:false\}/, 'new saves include isolated boss progress');

console.log('Bouncin boss regression checks passed.');
