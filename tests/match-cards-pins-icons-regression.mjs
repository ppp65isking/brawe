// Match-start profile cards, AI names, per-brawler icons, emoji migration.
// Static checks only: card/AI code is DOM + match-runtime code.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const roster = fs.readFileSync(new URL('../modules/visuals/roster-2p5d.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// AI names (§3)
check('AI pool frozen with 40 names', /const AI_NAME_POOL = Object\.freeze\(\[([\s\S]*?)\]\);/.test(game) && (game.match(/const AI_NAME_POOL = Object\.freeze\(\[([\s\S]*?)\]\);/)[1].match(/'[^']+'/g) || []).length === 40);
check('AI pool names unique', (() => { const m = game.match(/const AI_NAME_POOL = Object\.freeze\(\[([\s\S]*?)\]\);/); const names = m[1].match(/'[^']+'/g) || []; return new Set(names).size === names.length; })());
check('assignBotDisplayNames shuffles without replacement + Forge Fighter fallback', game.includes('function assignBotDisplayNames()') && game.includes('if (b.displayName) continue;') && game.includes('Forge Fighter ${k + 1}'));
check('spawnBots calls assign at end', game.includes('assignBotDisplayNames();') && game.indexOf('assignBotDisplayNames();') > game.indexOf('function spawnBots(){'));
check('displayName on all three spawnBots literals', (game.match(/displayName: null/g) || []).length === 3);

// Profile cards (§2)
check('buildMatchCard uses portrait markup + brawler color', game.includes('function buildMatchCard(entry)') && game.includes('getBrawlerPortraitMarkup(entry.brawlerId)') && game.includes("--match-card-color"));
check('roster excludes structures/pets/summons/minions', game.includes('function getMatchCardRoster()') && game.includes('!b.isStructure') && game.includes('!b.isTowerDefenseMinion') && game.includes("b.brawler !== 'tower_core'"));
check('roster never truthiness-guards ids', !/b\.id &&/.test(game.slice(game.indexOf('function getMatchCardRoster()'), game.indexOf('function getMatchCardRoster()') + 2000)));
check('intro auto-dismisses 2800ms, non-blocking', game.includes('function showMatchIntroCards()') && game.includes('}, 2800)') && css.includes('.match-intro') && css.includes('pointer-events:none'));
check('intro caps solo opponents at 9 with +N footer', game.includes('roster.enemies.slice(0, 9)') && game.includes('MORE FIGHTERS IN THE ARENA'));
check('launchShowdownMatch hooks intro at end', game.slice(game.indexOf('function launchShowdownMatch()')).includes('showMatchIntroCards();'));
check('match-card CSS present in styles.css, absent from pins.css', css.includes('.match-card.is-player') && !fs.readFileSync(new URL('../pins.css', import.meta.url), 'utf8').includes('.match-card'));

// Per-brawler icons (§4) — computed intersection, same method as the audit
check('all 14 icons present', ['beam', 'sera_eclipse', 'boom_arang', 'teether', 'fuel', 'xray', 'angel', 'demon', 'relay', 'snapper', 'kage', 'drainbow', 'draflygon', 'aegis'].every(id => new RegExp(`${id}: '[^']+'`).test(game)));
check('selectable-minus-icons is empty', (() => {
  const all = [...game.match(/const allBrawlers\s*=\s*\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const icons = game.match(/const brawlerPortraitIcons = \{([\s\S]*?)\n    \};/)[1];
  const disabled = ['robber', 'boomer', 'daggershard', 'cluster', 'witch', 'adlof', 'swimmer', 'blade_vane'];
  return all.filter(id => !disabled.includes(id)).every(id => new RegExp(`${id}:`).test(icons));
})());
check('aegis icon is shield, sir_cheeseburger untouched', game.includes("aegis: '🛡️'") && game.includes("sir_cheeseburger: '🛡️'"));

// Emoji migration (§5) — Route A
check('7 migrated looks present', ['looma', 'feathers', 'spikey', 'electrostien', 'mallow', 'nightshade', 'aegis'].every(id => new RegExp(`${id}:\\['(hood|horn|robot|round|helmet)'`).test(roster)));
check('7 migrated identities present', ['looma', 'feathers', 'spikey', 'electrostien', 'mallow', 'nightshade', 'aegis'].every(id => new RegExp(`${id}:'[^']+\\|(robe|float|round|wide)'`).test(roster)));

// Pins contract pins (already implemented — guard against regressions)
check('pin equip max 6, cooldown 3000, starters seeded', game.includes('const PIN_EQUIP_MAX = 6;') && game.includes('const PIN_SEND_COOLDOWN_MS = 3000;') && game.includes("Object.freeze(['forge_wave', 'good_game', 'ouch'])"));

console.log(`match-cards-pins-icons-regression: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failed ? 1 : 0);
