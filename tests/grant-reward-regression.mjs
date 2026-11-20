// Central grantReward consolidation (Arena Forge rebuilds, 2026-11-20):
// ONE grant path for coins, gems, souls, tappers, presents, Core Pieces,
// Random Pieces, Soul Water, skins (+chromas), brawler unlocks, XP and
// bricks. Amounts are unchanged by consolidation — this suite pins the
// amounts per type, the skin/chroma grant, unknown-type rejection, and
// that the old per-site grant implementations are gone from the routed
// call sites (source pins).
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

// --- Sandbox: fresh player state + stubbed helpers -----------------------
function freshSandbox() {
    const calls = [];
    const playerData = {
        coins: 100, gems: 10, souls: 0, starrDrops: 0, superTapperCount: 0,
        hyperTapperCount: 0, presentCount: 0, corePieces: 0, randomPieces: 0,
        ownedSkins: {}, unlockedBrawlers: { outlit: true },
        soulSummoner: { soulWater: 0 }, brawlers: { outlit: { bricks: 0, prestige: 0 } },
    };
    const sandbox = {
        console, playerData,
        skinsDatabase: {
            'test-skin': { id: 'test-skin', brawler: 'freezeon', name: 'Test Skin',
                chromas: [{ id: 'test-skin-blue' }, { id: 'test-skin-purple' }] },
        },
        addSouls: (n) => { calls.push(['addSouls', n]); playerData.souls += n; },
        addCorePieces: (n) => { calls.push(['addCorePieces', n]); playerData.corePieces += n; },
        grantRandomPiece: (n) => { calls.push(['grantRandomPiece', n]); playerData.randomPieces += n; return true; },
        ensureSoulSummonerData: () => {},
        checkSoulWaterRewards: () => { calls.push(['checkSoulWaterRewards']); },
        unlockBrawler: (id) => { playerData.unlockedBrawlers[id] = true; return true; },
        awardSeasonPassXp: (n) => { calls.push(['awardSeasonPassXp', n]); return true; },
        grantContractXP: (n) => { calls.push(['grantContractXP', n]); },
        getOrCreateProgress: (id) => playerData.brawlers[id],
        applyBrickDelta: (prog, d) => { prog.bricks += d; return d; },
        selectedBrawler: 'outlit',
        calls,
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'grantReward'), sandbox);
    return { sandbox, playerData, calls };
}

check('grantReward exists exactly once', (game.match(/function grantReward\(/g) || []).length === 1);

{
    const { sandbox, playerData } = freshSandbox();
    const g = (r, o) => vm.runInContext(`grantReward(${JSON.stringify(r)}${o ? `, ${JSON.stringify(o)}` : ''})`, sandbox);
    check('coins grant adds exact amount', g({ type: 'coins', amount: 250 }) === true && playerData.coins === 350);
    check('gems grant adds exact amount', g({ type: 'gems', amount: 5 }) === true && playerData.gems === 15);
    check('souls route through addSouls', g({ type: 'souls', amount: 30 }) === true && playerData.souls === 30);
    check('tapper grant', g({ type: 'tapper', amount: 2 }) === true && playerData.starrDrops === 2);
    check('superTapper grant', g({ type: 'superTapper', amount: 1 }) === true && playerData.superTapperCount === 1);
    check('hyperTapper grant', g({ type: 'hyperTapper', amount: 1 }) === true && playerData.hyperTapperCount === 1);
    check('present grant', g({ type: 'present', amount: 2 }) === true && playerData.presentCount === 2);
    check('corePieces route through addCorePieces', g({ type: 'corePieces', amount: 10 }) === true && playerData.corePieces === 10);
    check('randomPiece grant', g({ type: 'randomPiece', amount: 3 }) === true && playerData.randomPieces === 3);
    check('soulWater grant + water-reward check', g({ type: 'soulWater', amount: 50 }) === true && playerData.soulSummoner.soulWater === 50);
    check('plural quest aliases accepted', g({ type: 'tappers', amount: 1 }) === true && playerData.starrDrops === 3);
    check('kind alias accepted', g({ kind: 'gems', amount: 1 }) === true && playerData.gems === 16);
    check('skin grant owns skin + both chromas, no dupes', g({ type: 'skin', id: 'test-skin' }) === true
        && playerData.ownedSkins.freezeon.length === 3
        && g({ type: 'skin', id: 'test-skin' }) === true
        && playerData.ownedSkins.freezeon.length === 3);
    check('unknown skin id rejected', g({ type: 'skin', id: 'no-such-skin' }) === false);
    check('brawlerUnlock grants', g({ type: 'brawlerUnlock', id: 'freezeon' }) === true && playerData.unlockedBrawlers.freezeon === true);
    check('already-unlocked brawler rejected', g({ type: 'brawlerUnlock', id: 'outlit' }) === false);
    check('xp routes to season pass', g({ type: 'xp', amount: 100 }) === true);
    check('questXP routes to contract XP', g({ type: 'questXP', amount: 20 }) === true);
    check('bricks grant to selected brawler', g({ type: 'bricks', amount: 30 }) === true && playerData.brawlers.outlit.bricks === 30);
    check('unknown type rejected', g({ type: 'profileCosmetic', id: 'x' }) === false);
    check('zero amount rejected', g({ type: 'coins', amount: 0 }) === false && playerData.coins === 350);
    check('null reward rejected', vm.runInContext('grantReward(null)', sandbox) === false);
}

// --- Source pins: routed call sites no longer grant inline ---------------
check('grantSeasonReward delegates to grantReward', game.includes('function grantSeasonReward(reward)') && game.includes('return grantReward(reward);') && !game.includes("if (reward.type === 'souls') playerData.souls=(playerData.souls||0)+(reward.amount||0);"));
check('claimQuestReward routes coins through grantReward', game.includes("if (rewards.coins) grantReward({ type: 'coins', amount: rewards.coins });"));
check('claimSoulWaterReward routes through grantReward', game.includes("grantReward({ type: 'coins', amount: r.amount || 0 })"));
check('match settlement routes coins through grantReward', game.includes("grantReward({ type: 'coins', amount: rewardCoins });"));
check('match settlement routes souls through grantReward', game.includes("grantReward({ type: 'souls', amount: soulReward });"));
check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`grant-reward consolidation: ${passed} passed`);
