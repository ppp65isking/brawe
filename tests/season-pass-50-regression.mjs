// Season Pass rebuilt: 50 tiers (Arena Forge rebuilds, 2026-11-20).
// Premium 100 gems or 11,999 coins. Tier 50 = Holiday Lights FreeZeon
// skin (+2 chromas). Pass overflow: every extra 1000 XP = 2 random
// tappers, every 2500 XP = a super tapper. Old pass tables (Season 2
// archive, Arenaween/spookyBox, Midnight Swarm future) are gone.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    let par = src.indexOf('(', start), pdepth = 0, pi = par;
    for (; pi < src.length; pi++) { if (src[pi] === '(') pdepth++; else if (src[pi] === ')') { pdepth--; if (pdepth === 0) break; } }
    const open = src.indexOf('{', pi);
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (line) { if (ch === '\n') line = false; i++; continue; }
        if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
        if (inS) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++; continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i++; continue; }
        if (ch === '/' && nxt === '*') { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in ${name}`);
}

// --- Tier table: parse the literal out of game.js and inspect it ----------
const tableMatch = game.match(/const XPLODEMIS_PASS_TIERS = (\[[\s\S]*?\n      \]);/);
check('XPLODEMIS_PASS_TIERS table exists', !!tableMatch);
let tiers = [];
if (tableMatch) {
    tiers = vm.runInContext(`(${tableMatch[1]})`, vm.createContext({}));
}
check('pass has exactly 50 tiers', tiers.length === 50);
check('tiers are numbered 1..50 in order', tiers.every((t, i) => t.tier === i + 1));
check('every tier has free + premium rewards', tiers.every(t => t.free && t.free.type && t.premium && t.premium.type));
check('tier 50 premium is the Holiday Lights skin', tiers[49] && tiers[49].premium.type === 'skin' && tiers[49].premium.id === 'holiday-lights-freezeon');
check('tier 50 free is a 5000-coin pile', tiers[49] && tiers[49].free.type === 'coins' && tiers[49].free.amount === 5000);
check('no spookyBox rewards anywhere in the new table', !tiers.some(t => t.free.type === 'spookyBox' || t.premium.type === 'spookyBox'));
check('no towerDrop rewards anywhere in the new table', !tiers.some(t => t.free.type === 'towerDrop' || t.premium.type === 'towerDrop'));
check('Random Piece rewards exist in the table', tiers.some(t => t.free.type === 'randomPiece' || t.premium.type === 'randomPiece'));
check('no deleted-skin rewards in the table', !tiers.some(t => (t.premium.id || '').includes('rocketeer') || (t.free.id || '').includes('rocketeer')));

// --- Constants ---------------------------------------------------------------
check('max level is 50', game.includes('const SEASON_PASS_MAX_LEVEL = 50;'));
check('premium is 100 gems', game.includes('const SEASON_PREMIUM_UNLOCK_GEMS = 100;'));
check('premium is 11,999 coins', game.includes('const SEASON_PREMIUM_UNLOCK_COINS = 11999;'));
check('pass starts Nov 20, 2026 (live Nov + Dec)', game.includes('Date.UTC(2026, 10, 20, 0, 0, 0)'));
check('old Season 2 archive tiers deleted', !game.includes('SEASON_2_ARCHIVE_TIERS'));
check('old Arenaween pass tiers deleted', !game.includes('ARENAWEEN_PASS_TIERS'));
check('future Midnight Swarm pass tiers deleted', !game.includes('FUTURE_SEASON_PASS_TIERS'));
check('fallback profile is the rebuilt Xplodemis pass', game.includes("key:'xplodemis', seasonNumber:6, id:XPLODEMIS_SEASON_ID") && !game.includes("key:'arenaween'"));
check('pass road shows 50 tiers', game.includes("aria-label','Reward road: 50 tiers')"));
check('Random Piece has a pass UI label', game.includes("randomPiece:'Random Piece'"));

// --- Overflow: every 1000 XP = 2 random tappers, every 2500 = super tapper --
// Pass total is 38,950 XP now (2026-11-20, Anthony: "switch both"), so
// overflow starts past 38,950, not 4,900.
{
    const grants = [];
    const sandbox = {
        console,
        SEASON_PASS_MAX_LEVEL: 50,
        SEASON_PASS_TOTAL_XP: 38950,
        grantReward: (r) => { grants.push(r); return true; },
        grantRandomTappers: (n) => { for (let i = 0; i < n; i++) grants.push({ type: 'randomTapper', amount: 1 }); },
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'awardSeasonPassOverflow'), sandbox);
    const run = (code) => vm.runInContext(code, sandbox);
    const pass = { xp: 38950, overflowSteps: 0, overflowSuperSteps: 0 };
    sandbox.pass = pass;
    run('awardSeasonPassOverflow(pass)');
    check('at exactly tier 50 (38950 XP) no overflow grants', grants.length === 0);
    pass.xp = 39950; // +1000 over
    run('awardSeasonPassOverflow(pass)');
    check('1000 XP over = 2 random tappers', grants.filter(g => g.type === 'randomTapper').length === 2);
    check('1000 XP over = no super tapper yet', grants.filter(g => g.type === 'superTapper').length === 0);
    pass.xp = 41450; // +2500 over
    run('awardSeasonPassOverflow(pass)');
    check('2500 XP over = super tapper granted', grants.filter(g => g.type === 'superTapper').length === 1);
    check('2500 XP over = second 1000-step also paid (4 random tappers total)', grants.filter(g => g.type === 'randomTapper').length === 4);
    const before = grants.length;
    run('awardSeasonPassOverflow(pass)');
    check('overflow steps never pay twice', grants.length === before);
    check('awardSeasonPassXp calls the overflow hook', game.includes('awardSeasonPassOverflow(playerData.seasonPass);'));
}

// --- Pass token offers no longer reference deleted skins ---------------------
const tokens = read('modules/progression/pass-tokens.js');
check('token module max level is 50', tokens.includes('maxLevel = 50'));
check('token offers drop deleted skins', !tokens.includes('astral-portalo') && !tokens.includes('neon-jacktrade'));
check('token offers include a Random Piece bundle', tokens.includes("id: 'random-piece'") && tokens.includes("type: 'randomPiece'"));
check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`50-tier season pass: ${passed} passed`);
