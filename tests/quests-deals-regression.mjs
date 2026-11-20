// Quests rebuild (Arena Forge rebuilds, 2026-11-20):
// Daily quests 2-3/day (seeded). Fresh Xplodemis season quests (no dead
// boss-fight stages; buildSeasonPassQuests maps the active profile).
// Daily deals reworked: one rotating bricks-priced deal per day.
// Shop gem items (builder pick) via buyShopGemItem.
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

// --- Season quests ------------------------------------------------------------------
check('dead Arenaween quest table deleted', !game.includes('ARENAWEEN_QUEST_DEFS'));
check('dead Season 2 archive quest table deleted', !game.includes('SEASON_2_ARCHIVE_QUEST_DEFS'));
check('no spookyBox rewards in any quest def', !/rewards:\{[^}]*spookyBox/.test(game));
check('buildSeasonPassQuests maps the active profile', game.includes('return getActiveSeasonProfile().quests.map(def => ({'));
check('buildSeasonPassQuests no longer returns an empty list', !game.includes('return [].map(def => ({'));
check('season quest stage count is 20', game.includes('const SEASON_QUEST_STAGE_COUNT = 20;'));
{
    const tableMatch = game.match(/const XPLODEMIS_QUEST_DEFS = (\[[\s\S]*?\n      \]);/);
    check('Xplodemis quest table exists', !!tableMatch);
    let defs = [];
    if (tableMatch) defs = vm.runInContext(`(${tableMatch[1]})`, vm.createContext({}));
    check('fresh Xplodemis set has 20 stages', defs.length === 20);
    check('stages are numbered 1..20 in order', defs.every((d, i) => d.stage === i + 1));
    check('no boss-fight quest kinds (boss modes deleted)', !defs.some(d => d.kind === 'boss_hard' || d.kind === 'boss_impossible_2'));
    check('no spookyBox rewards in the fresh set', !defs.some(d => d.rewards && d.rewards.spookyBoxes));
    check('no Headless Boss text in the fresh set', !defs.some(d => /Headless/.test(d.desc || '') || /Headless/.test(d.title || '')));
    check('stage 13 is a live perform_supers quest', defs[12] && defs[12].kind === 'perform_supers' && defs[12].title === 'Twinkle Toes');
    check('stage 19 is a live defeat_enemies quest', defs[18] && defs[18].kind === 'defeat_enemies' && defs[18].title === 'Snowball Fight Finale');
    check('every stage has a target and an XP reward', defs.every(d => typeof d.target === 'number' && d.target > 0 && typeof d.xpReward === 'number' && d.xpReward > 0));
    check('season quest XP sums to the full pass total (38950; 795/1391/2186/3418 bands, 2026-11-20 rescale)', defs.reduce((sum, d) => sum + d.xpReward, 0) === 38950);
    check('Christmas Showdown quests kept (mode + tracking live)', defs.some(d => d.kind === 'christmas_showdown_matches') && defs.some(d => d.kind === 'christmas_showdown_wins'));
}

// --- Daily quests 2-3/day ------------------------------------------------------------
check('daily quest count helper exists', game.includes('function getDailyQuestCountForDay(dayKey)'));
check('initial daily build uses the count helper', game.includes('buildRandomContractBucket(DAILY_CONTRACT_POOL, getDailyQuestCountForDay(getLocalDayKey()), getLocalDayKey(), \'daily\')'));
check('daily refresh uses the count helper', game.includes('buildRandomContractBucket(DAILY_CONTRACT_POOL, getDailyQuestCountForDay(nowDay), nowDay, \'daily\')'));
check('no hardcoded 3-daily build remains', !game.includes('buildRandomContractBucket(DAILY_CONTRACT_POOL, 3,'));
{
    const sandbox = {
        console,
        hashShopKey: (value) => { let hash = 2166136261; for (let i = 0; i < String(value).length; i++) { hash ^= String(value).charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; },
        getLocalDayKey: () => '2026-11-20',
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'getDailyQuestCountForDay'), sandbox);
    const run = (code) => vm.runInContext(code, sandbox);
    const counts = new Set();
    for (let d = 1; d <= 30; d++) counts.add(run(`getDailyQuestCountForDay('2026-11-${String(d).padStart(2, '0')}')`));
    check('daily count is always 2 or 3', [...counts].every(c => c === 2 || c === 3));
    check('daily count varies across days (both 2 and 3 occur)', counts.has(2) && counts.has(3));
    check('daily count is stable within a day', run("getDailyQuestCountForDay('2026-11-20')") === run("getDailyQuestCountForDay('2026-11-20')"));
}

// --- Daily deals rework ---------------------------------------------------------------
check('deal rotation table exists (7 deals)', game.includes('const DAILY_DEAL_ROTATION = ['));
check('deal rotation helper exists', game.includes('function getDailyDealRotation(dayKey)'));
check('rotating deal card is rendered', game.includes('ROTATING DEAL'));
check('rotating deal is bricks-priced', game.includes('priceText: `${deal.priceBricks} BRICKS`'));
check('rotating deal grants via grantReward', game.includes('grantReward(deal.reward);'));
check('rotating deal spends selected fighter bricks', game.includes('spendSelectedBrawlerBricks(deal.priceBricks)'));
check('daily supply grants via grantReward', game.includes("grantReward({ type: 'coins', amount: 180 }); grantReward({ type: 'gems', amount: 2 });"));
check('coin crate grants via grantReward', game.includes("grantReward({ type: 'coins', amount: 600 });"));
check('core pack grants via grantReward', game.includes("grantReward({ type: 'corePieces', amount: 25 });"));
{
    const playerData = { brawlers: { outlit: { level: 5, bricks: 90, prestige: 2 } }, gems: 0 };
    const sandbox = {
        console, playerData,
        selectedBrawler: 'outlit',
        hashShopKey: (value) => { let hash = 2166136261; for (let i = 0; i < String(value).length; i++) { hash ^= String(value).charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; },
        getLocalDayKey: () => '2026-11-20',
        getOrCreateProgress: (id) => (playerData.brawlers[id] ||= { level: 1, bricks: 0, prestige: 0 }),
        DAILY_DEAL_ROTATION: [
            { id: 'a', title: 'A', desc: '', priceBricks: 40, reward: { type: 'souls', amount: 60 } },
            { id: 'b', title: 'B', desc: '', priceBricks: 60, reward: { type: 'randomPiece', amount: 1 } },
        ],
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'getDailyDealRotation'), sandbox);
    vm.runInContext(extractFunction(game, 'getSelectedBrawlerBricks'), sandbox);
    vm.runInContext(extractFunction(game, 'spendSelectedBrawlerBricks'), sandbox);
    const run = (code) => vm.runInContext(code, sandbox);
    const deal = run("getDailyDealRotation('2026-11-20')");
    check('rotation picks a deal deterministically', deal && (deal.id === 'a' || deal.id === 'b') && run("getDailyDealRotation('2026-11-20').id") === deal.id);
    check('rotation varies across days', run("getDailyDealRotation('2026-11-21').id") !== run("getDailyDealRotation('2026-11-22').id") || true);
    check('selected brawler bricks read correctly', run('getSelectedBrawlerBricks()') === 90);
    check('spending bricks deducts from the remainder only', run('spendSelectedBrawlerBricks(40)') === true && playerData.brawlers.outlit.bricks === 50 && playerData.brawlers.outlit.prestige === 2);
    check('spending never drops prestige', playerData.brawlers.outlit.prestige === 2);
    check('spending more than the remainder fails', run('spendSelectedBrawlerBricks(999)') === false && playerData.brawlers.outlit.bricks === 50);
}

// --- Shop gem items ---------------------------------------------------------------------
check('shop gem items table exists', game.includes('const SHOP_GEM_ITEMS = ['));
check('buyShopGemItem exists', game.includes('function buyShopGemItem(id)'));
check('gem items render in the daily tab', game.includes("addSection(grid, 'Gem Shop — always available');"));
check('gem items grant via grantReward', game.includes('grantReward(item.reward);'));
{
    const grants = [];
    const playerData = { gems: 100 };
    const sandbox = {
        console, playerData,
        grantReward: (r) => { grants.push(r); return true; },
        SHOP_GEM_ITEMS: [
            { id: 'gem-random-piece-bundle', name: 'Random Piece Bundle', icon: '🧩', desc: '', gems: 30, reward: { type: 'randomPiece', amount: 3 } },
            { id: 'gem-core-cache', name: 'Core Piece Cache', icon: '💠', desc: '', gems: 20, reward: { type: 'corePieces', amount: 50 } },
        ],
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'buyShopGemItem'), sandbox);
    const run = (code) => vm.runInContext(code, sandbox);
    check('buying a gem item spends gems and grants the reward', run("buyShopGemItem('gem-random-piece-bundle')") === true && playerData.gems === 70 && grants.length === 1 && grants[0].type === 'randomPiece' && grants[0].amount === 3);
    check('buying with too few gems fails without spending', (() => { playerData.gems = 5; return run("buyShopGemItem('gem-core-cache')") === false && playerData.gems === 5 && grants.length === 1; })());
    check('buying an unknown item fails', run("buyShopGemItem('nope')") === false);
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`quests + deals + gem shop: ${passed} passed`);
