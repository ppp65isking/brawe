// Tapper bulk-open parity (2026-11-19, Anthony: bulk open does not give the
// same rewards as opening one by one).
//
// Verified in code: regular + Super bulk math MATCHES single exactly (same
// rarity rolls, coin ranges, gem formulas, soul ranges, core chances, skin
// chances) — this suite pins that parity with a fixed RNG seed. The REAL
// difference was Surge (hyper) tappers: single open gives +8 gems on EVERY
// Surge tapper (unlock, all-unlocked overflow, and the 35% overflow
// branch), while bulk used to pay +8 only on an actual unlock. The fix
// pays +8 per Surge tapper in bulk too. This suite executes the REAL
// openAllTappers / openStarrDrop / openSuperStarrDrop / openHyperStarrDrop
// (extracted from game.js, run in a vm sandbox with stubbed DOM/globals)
// across all three Surge outcomes and asserts equal gems (and equal
// souls / core pieces). NOTE: the locked-hyper candidate in these tests is
// Rocketeer — Rager cannot be used because the real ensureSoulSummonerData
// force-maxes Rager's hyper (and several others') whenever souls are
// granted, so Rager is never actually locked in a live run. It also pins the skin-vault fallback line:
// rollTapperSkinDrop grants +750 coins itself and returns {fallback:true};
// single shows the line, bulk used to drop it silently.
//
// Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a function declaration out of game.js source.
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    const open = src.indexOf('{', start);
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
        if (ch === '/' && nxt === '/') { line = true; i += 2; continue; }
        if (ch === '/' && nxt === '*') { block = true; i += 2; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced ${name}`);
}

// --- Sandbox ---
function makeEl(tag) {
    const el = {
        tagName: (tag || 'div').toUpperCase(),
        children: [],
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        appendChild(c) { this.children.push(c); return c; },
        remove() { this.removed = true; },
        addEventListener() {},
        setAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest() { return null; },
    };
    return el;
}

function freshState(overrides = {}) {
    return {
        starrDrops: 0, superTapperCount: 0, hyperTapperCount: 0,
        coins: 0, gems: 0, souls: 0, corePieces: 0,
        brawlers: {}, ownedSkins: {}, soulSummoner: {},
        ...overrides,
    };
}

function runWorld(setup) {
    const randomQueue = [];
    let randomDefault = 0.5;
    const ctx = {
        console,
        setTimeout: () => {},
        Math: {
            random: () => (randomQueue.length ? randomQueue.shift() : randomDefault),
            floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max,
            round: Math.round, sqrt: Math.sqrt, abs: Math.abs, PI: Math.PI,
        },
        playerData: freshState(),
        brawlerData: { outlit: { name: 'Outlit' }, rocketeer: { name: 'Rocketeer' } },
        allBrawlers: ['outlit', 'rocketeer'],
        disabledBrawlers: new Set(),
        skinsDatabase: {},
        selectedBrawler: 'outlit',
        saveProgress: () => {},
        refreshBrawlerList: () => {},
        updateHyperButton: () => {},
        refreshHomeUI: () => {},
        isBrawlerUnlocked: () => true,
        checkSoulWaterRewards: () => {},
        autoSpendSoulsOnTarget: () => {},
        ensureProgressTrinkets: (p) => p,
        getCorePieces: function () { return ctx.playerData.corePieces || 0; },
        document: {
            children: [],
            createElement: (tag) => makeEl(tag),
            getElementById: () => null,
            head: { appendChild: () => {} },
            body: {
                children: [],
                appendChild(el) { this.children.push(el); return el; },
                removeChild() {},
            },
        },
    };
    ctx.getCorePieces = () => ctx.playerData.corePieces || 0;
    const fns = ['rollSoulReward', 'ensureSoulSummonerData', 'addSouls', 'addCorePieces',
        'getOrCreateProgress', 'rollTapperSkinDrop', 'openAllTappers',
        'openStarrDrop', 'openSuperStarrDrop', 'openHyperStarrDrop'];
    const src = fns.map((n) => extractFunction(game, n)).join('\n');
    vm.createContext(ctx);
    vm.runInContext(src, ctx);
    const api = {
        ctx,
        setRandom(values, def = 0.5) { randomQueue.push(...values); randomDefault = def; },
        soulsTotal() {
            const s = ctx.playerData.soulSummoner || {};
            return (ctx.playerData.souls || 0) + (s.soulBank || 0) + (s.soulWater || 0);
        },
        deltas(before) {
            const p = ctx.playerData;
            return {
                coins: p.coins - before.coins,
                gems: p.gems - before.gems,
                souls: this.soulsTotal() - before.souls,
                core: (p.corePieces || 0) - before.core,
            };
        },
        snapshot() {
            const p = ctx.playerData;
            return { coins: p.coins, gems: p.gems, souls: this.soulsTotal(), core: p.corePieces || 0 };
        },
        lastOverlay() {
            const kids = ctx.document.body.children;
            return kids[kids.length - 1];
        },
        overlayHtml(overlay) {
            let out = '';
            const walk = (el) => {
                if (!el) return;
                if (typeof el.innerHTML === 'string') out += el.innerHTML;
                if (typeof el.textContent === 'string') out += el.textContent;
                (el.children || []).forEach(walk);
            };
            walk(overlay);
            return out;
        },
    };
    if (setup) setup(api, ctx);
    return api;
}

// --- Source pins: the fix itself ---
check('bulk Surge pays +8 gems per tapper (not only on unlock)',
    game.includes('totalGems += 8;\n          // Surge parity') ||
    /totalSouls \+= souls;\n\s+\/\/ Surge parity[\s\S]*?totalGems \+= 8;/.test(game));
check('bulk Surge unlock branch no longer adds its own +8 (would double-pay)',
    !game.includes('chosenProg.hyperchargeUnlocked = true;\n                  totalGems += 8;'));
check('bulk collects skin-vault fallback lines for display',
    game.includes('fallbackSkinLines.push(bulkSkin.name)') &&
    game.includes('fallbackSkinLines.push(bulkSkin2.name)') &&
    game.includes('fallbackSkinLines.join('));

// --- Single Surge: +8 gems in ALL THREE outcomes ---
{
    // (a) 65% unlock branch, a locked hyper is available.
    const w = runWorld((api, ctx) => {
        ctx.playerData.hyperTapperCount = 1;
        ctx.playerData.brawlers = {
            outlit: { hyperchargeUnlocked: true },
            rocketeer: { hyperchargeUnlocked: false },
        };
    });
    const before = w.snapshot();
    w.setRandom([0.1, 0.5, 0.0]); // isHyper, souls, chosen index
    vm.runInContext('openHyperStarrDrop()', w.ctx);
    w.lastOverlay().onclick({ preventDefault() {} });
    const d = w.deltas(before);
    check('single Surge unlock branch: +8 gems', d.gems === 8);
    check('single Surge unlock branch: +0 core pieces', d.core === 0);
    check('single Surge unlock branch: souls in [45,80]', d.souls >= 45 && d.souls <= 80);
    check('single Surge unlock branch: unlocks the locked hyper',
        w.ctx.playerData.brawlers.rocketeer.hyperchargeUnlocked === true);
}
{
    // (b) 65% branch, ALL hypers already unlocked -> +60 core +8 gems.
    const w = runWorld((api, ctx) => {
        ctx.playerData.hyperTapperCount = 1;
        ctx.playerData.brawlers = {
            outlit: { hyperchargeUnlocked: true },
            rocketeer: { hyperchargeUnlocked: true },
        };
    });
    const before = w.snapshot();
    w.setRandom([0.1, 0.5]);
    vm.runInContext('openHyperStarrDrop()', w.ctx);
    w.lastOverlay().onclick({ preventDefault() {} });
    const d = w.deltas(before);
    check('single Surge all-unlocked overflow: +8 gems', d.gems === 8);
    check('single Surge all-unlocked overflow: +60 core pieces', d.core === 60);
}
{
    // (c) 35% overflow branch.
    const w = runWorld((api, ctx) => { ctx.playerData.hyperTapperCount = 1; });
    const before = w.snapshot();
    w.setRandom([0.9, 0.5]); // isHyper false, souls
    vm.runInContext('openHyperStarrDrop()', w.ctx);
    w.lastOverlay().onclick({ preventDefault() {} });
    const d = w.deltas(before);
    check('single Surge 35% overflow: +8 gems', d.gems === 8);
    check('single Surge 35% overflow: +60 core pieces', d.core === 60);
}

// --- Bulk Surge: +8 gems per tapper in every mix ---
{
    // hyperCount=3, all unlocked: every tapper overflows -> 3x8 gems, 3x60 core.
    const w = runWorld((api, ctx) => {
        ctx.playerData.hyperTapperCount = 3;
        ctx.playerData.brawlers = {
            outlit: { hyperchargeUnlocked: true },
            rocketeer: { hyperchargeUnlocked: true },
        };
    });
    const before = w.snapshot();
    w.setRandom([0.1, 0.5, 0.1, 0.5, 0.1, 0.5]); // 3x (isHyper, souls)
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    check('bulk Surge x3 all-unlocked: +24 gems (8 each)', d.gems === 24);
    check('bulk Surge x3 all-unlocked: +180 core pieces (60 each)', d.core === 180);
}
{
    // hyperCount=3, one locked: unlock + 35% overflow + all-unlocked overflow.
    const w = runWorld((api, ctx) => {
        ctx.playerData.hyperTapperCount = 3;
        ctx.playerData.brawlers = {
            outlit: { hyperchargeUnlocked: true },
            rocketeer: { hyperchargeUnlocked: false },
        };
    });
    const before = w.snapshot();
    // i=0: isHyper 0.1, souls 0.5, chosen 0.0 -> unlock; i=1: 0.9 -> 35% branch;
    // i=2: 0.1, souls 0.5 -> all-unlocked overflow.
    w.setRandom([0.1, 0.5, 0.0, 0.9, 0.5, 0.1, 0.5]);
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    check('bulk Surge mixed x3: +24 gems (8 each)', d.gems === 24);
    check('bulk Surge mixed x3: +120 core pieces (2 overflows)', d.core === 120);
    check('bulk Surge mixed x3: unlocks the locked hyper',
        w.ctx.playerData.brawlers.rocketeer.hyperchargeUnlocked === true);
}
{
    // Single-tapper bulk, 65% branch, all unlocked (the exact reported bug:
    // pre-fix this paid +0 gems).
    const w = runWorld((api, ctx) => {
        ctx.playerData.hyperTapperCount = 1;
        ctx.playerData.brawlers = {
            outlit: { hyperchargeUnlocked: true },
            rocketeer: { hyperchargeUnlocked: true },
        };
    });
    const before = w.snapshot();
    w.setRandom([0.1, 0.5]);
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    check('bulk Surge x1 all-unlocked: +8 gems (was +0 pre-fix)', d.gems === 8);
}

// --- Regular parity: same fixed seed, single vs bulk give identical rewards ---
{
    const w = runWorld();
    w.ctx.playerData.starrDrops = 1;
    const before = w.snapshot();
    w.setRandom([], 0.5); // every roll 0.5
    vm.runInContext('openStarrDrop()', w.ctx);
    const ov = w.lastOverlay();
    for (let t = 0; t < 5; t++) ov.onpointerdown({ preventDefault() {} });
    const d = w.deltas(before);
    check('single regular (seed 0.5): 23 coins / 1 gem / 13 souls / 0 core',
        d.coins === 23 && d.gems === 1 && d.souls === 13 && d.core === 0);
}
{
    const w = runWorld();
    w.ctx.playerData.starrDrops = 1;
    const before = w.snapshot();
    w.setRandom([], 0.5);
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    check('bulk regular x1 (seed 0.5): identical 23 coins / 1 gem / 13 souls / 0 core',
        d.coins === 23 && d.gems === 1 && d.souls === 13 && d.core === 0);
}

// --- Super parity: same fixed seed, single vs bulk give identical rewards ---
{
    const w = runWorld();
    w.ctx.playerData.superTapperCount = 1;
    const before = w.snapshot();
    w.setRandom([], 0.5);
    vm.runInContext('openSuperStarrDrop()', w.ctx);
    const ov = w.lastOverlay();
    for (let t = 0; t < 6; t++) ov.onpointerdown({ preventDefault() {} });
    const d = w.deltas(before);
    check('single Super (seed 0.5): 1375 coins / 5 gems / 30 souls / 0 core',
        d.coins === 1375 && d.gems === 5 && d.souls === 30 && d.core === 0);
}
{
    const w = runWorld();
    w.ctx.playerData.superTapperCount = 1;
    const before = w.snapshot();
    w.setRandom([], 0.5);
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    check('bulk Super x1 (seed 0.5): identical 1375 coins / 5 gems / 30 souls / 0 core',
        d.coins === 1375 && d.gems === 5 && d.souls === 30 && d.core === 0);
}

// --- Skin-vault fallback line shows in bulk ---
{
    const w = runWorld((api, ctx) => { ctx.skinsDatabase = {}; }); // empty vault -> fallback
    w.ctx.playerData.starrDrops = 1;
    const before = w.snapshot();
    w.setRandom([], 0.0); // forces rarity flips + the 2% skin roll to hit
    vm.runInContext('openAllTappers()', w.ctx);
    const d = w.deltas(before);
    const html = w.overlayHtml(w.lastOverlay());
    check('bulk fallback skin: +750 coins granted (1250 total: 500 rarity + 750 fallback)',
        d.coins === 1250);
    check('bulk fallback skin: the "+750 Coins (skin vault complete!)" line is shown',
        html.includes('+750 Coins (skin vault complete!)'));
}

console.log(`tapper-bulk-parity: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures); process.exitCode = 1; }
