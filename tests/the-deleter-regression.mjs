import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/brawlers/exotic/roster.js', import.meta.url), 'utf8');

assert.ok(roster.includes("'the_deleter'"), 'The Deleter is in the Exotic module roster');
assert.match(game, /the_deleter:\s*'Exotic'/, 'The Deleter has Exotic rarity');
assert.match(game, /if\s*\(brawlerId === 'the_deleter'\)[\s\S]{0,150}6600[\s\S]{0,100}1750[\s\S]{0,80}260/, 'P11 stats are 6600 HP, 1750 damage and normal speed');
assert.match(game, /brawlerId==='the_deleter'[^)]*\)return 1/, 'Rewrite uses one ammo');
assert.match(game, /function launchDeleterRewrite\(/, 'Rewrite has a dedicated launch path');
assert.match(game, /function redirectDeleterVolley\([\s\S]{0,180}master\.deleterRedirected/, 'Rewrite allows a single second-stage redirect');
assert.match(game, /deleterWaitingForRelease[\s\S]{0,450}!mouse\.down && !mobileInput\.aimHeld && !mobileInput\.attackActive/, 'Rewrite waits for release before accepting the free redirect input');
assert.match(game, /const mayRedirect = isBot[\s\S]{0,220}deleterRedirectReady/, 'The redirect bypasses normal ammo checks only on a distinct second input');
assert.match(game, /projectile\.deleterTurnRate = hard \? 99 : 3\.4/, 'Normal redirects steer smoothly while Hard Redirect turns immediately');
assert.match(game, /deleterExecuteThreshold: options\.master \? \(options\.hyper \? \.35 : \.20\) : 0/, 'Master shot uses 20%/35% execute thresholds and clone shots cannot execute');
assert.match(game, /!target\.isBoss[\s\S]{0,220}!target\.isBrickVaultEntity/, 'Execute excludes bosses, pets, summons, objectives, and vaults');
assert.match(game, /function castDeleterSuper\([\s\S]{0,420}hyper \? 3 : 2[\s\S]{0,180}hyper \? \.50/, 'Super creates two 30% copies and Hyper creates three 50% copies');
assert.match(game, /function getDeleterCloneOffsets\(/, 'Copies follow The Deleter through live formation offsets');
assert.match(game, /function updateDeleterSystems\([\s\S]{0,320}entity\.hp <= 0/, 'Copy state is cleaned on death');
assert.match(game, /curBrawler === 'the_deleter' && curGadget === 'g1'/, 'Hard Redirect is wired for the player');
assert.match(game, /curBrawler === 'the_deleter' && curGadget === 'g2'/, 'Undo is wired for the player');
assert.match(game, /bot\.brawler === 'the_deleter'/, 'Bots have Deleter gadget logic');
assert.match(game, /selectedBrawler === 'the_deleter'/, 'The Deleter has a custom attack and Super aim telegraph');
assert.match(game, /ownerBrawler === 'the_deleter' && b\.isDeleterRewrite/, 'Rewrite has custom projectile rendering');

console.log('The Deleter regression suite passed.');
