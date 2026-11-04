import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const game=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const impact=game.slice(game.indexOf('function triggerFightnFireImpact('),game.indexOf('function getBlobertStoredLiquid('));
const rendererStart=game.indexOf('function renderUniversalSkinProjectile(');
// Only invoke the real routing preamble: dedicated effects must return before drawing.
const renderer=game.slice(rendererStart,game.indexOf('const color = effect.color',rendererStart))+'throw new Error("Unexpected generic renderer");}';
const context=vm.createContext({player:{id:'p'},bots:[],bullets:[],explosions:[],performance:{now:()=>1000},AOEDamage(){},getEntityById:()=>({id:'p'}),areAlliedEntities:()=>false,screenShakeUntil:0,screenShakeAmount:0});
vm.runInContext(impact+'\n'+renderer,context);
for(const hyper of [false,true])for(const ice of [false,true]){
 context.bullets.length=0;
 const shot={ownerId:'p',x:100,y:100,damage:100,hyperVisual:hyper,isFlashFreeze:ice,skinId:'fightn-spice',skinEffect:'spiceFlame',skinColor:'#ff2e63',skinTrailColor:'#f80',skinGlow:true};
 context.triggerFightnFireImpact(shot);
 assert.equal(context.bullets.length,4);
 for(const shard of context.bullets){
  assert.equal(shard.skinId,shot.skinId);assert.equal(shard.skinColor,shot.skinColor);
  assert.equal(shard.hyperVisual,hyper);assert.equal(shard.damage,200);
  assert.equal(context.renderUniversalSkinProjectile(shard,{attackEffect:{color:'#f00'},brawler:'fightnfire'}),false);
 }
 assert.equal(context.renderUniversalSkinProjectile({...shot,isFightnFireShot:true},{attackEffect:{color:'#f00'}}),false);
}
vm.runInContext(fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js',import.meta.url),'utf8'),context);
const normal=context.BraweRosterVisuals.portrait('fightnfire');
const spice=context.BraweRosterVisuals.portrait('fightnfire','fightn-spice');
assert(normal.includes('<svg'));assert.notEqual(normal,spice);assert(!normal.includes('undefined'));
console.log('Fight’nFire visuals passed: dedicated routing, 4 fire/ice/Hyper combinations, shard metadata, 200-damage shards, distinct portraits.');
