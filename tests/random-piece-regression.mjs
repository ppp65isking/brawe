// Random Piece rule (Arena Forge rebuilds, 2026-11-20):
// 3 Random Pieces = one piece toward a random signature/mutation/
// instinct you don't have fully; if every ability is fully owned,
// 3 Random Pieces convert to 50 Core Pieces instead.
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

check('grantRandomPiece exists', game.includes('function grantRandomPiece(n)'));
check('redeemRandomPieces exists', game.includes('function redeemRandomPieces()'));
check('3 pieces per redemption', game.includes('const RANDOM_PIECES_PER_REDEMPTION = 3;'));
check('conversion is 50 Core Pieces', game.includes('const RANDOM_PIECE_CORE_CONVERSION = 50;'));
check('grantReward routes randomPiece through grantRandomPiece', game.includes("if (typeof grantRandomPiece === 'function') return grantRandomPiece(amount);"));
check('electrostien excluded from the pool (earned by winning)', game.includes("if (fighterId === 'electrostien') continue;"));
check('pass tiers grant Random Pieces', game.includes("premium:{type:'randomPiece',amount:3}"));
check('token shop sells a Random Piece bundle', read('modules/progression/pass-tokens.js').includes("type: 'randomPiece'"));

{
    const playerData = { corePieces: 0, randomPieces: 0, specialAbilities: {} };
    const sandbox = {
        console, playerData,
        SPECIAL_ABILITY_TYPES: ['mutation', 'signature', 'instinct'],
        RANDOM_PIECES_PER_REDEMPTION: 3,
        RANDOM_PIECE_CORE_CONVERSION: 50,
        Math,
    };
    vm.createContext(sandbox);
    // Real SPECIAL_ABILITY_DEFS out of game.js.
    const defsStart = game.indexOf('const SPECIAL_ABILITY_DEFS = Object.freeze({');
    if (defsStart === -1) throw new Error('SPECIAL_ABILITY_DEFS not found');
    const open = game.indexOf('{', game.indexOf('Object.freeze(', defsStart));
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < game.length) {
        const ch = game[i], nxt = game[i + 1];
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
        else if (ch === '}') { depth--; if (depth === 0) break; }
        i++;
    }
    const defsText = game.slice(open, i + 1);
    sandbox.SPECIAL_ABILITY_DEFS = vm.runInContext(`Object.freeze(${defsText})`, sandbox);
    for (const fn of ['ensureSpecialAbilityState', 'getSpecialAbilityState', 'getSpecialPieceCount', 'getSpecialAbilityDef', 'addSpecialAbilityPiece', 'getCorePieces', 'addCorePieces', 'getRandomPieceIncompletePool', 'redeemRandomPieces', 'grantRandomPiece']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const run = (code) => vm.runInContext(code, sandbox);
    const abilityCount = Object.keys(sandbox.SPECIAL_ABILITY_DEFS).length;
    check('ability defs loaded for the pool', abilityCount > 5);
    check('pool excludes electrostien', !run('getRandomPieceIncompletePool()').includes('electrostien'));
    check('pool starts with every incomplete ability', run('getRandomPieceIncompletePool().length') === abilityCount - 1);

    // Grant 3 -> exactly one piece, bank empty.
    const before = run('getRandomPieceIncompletePool()');
    run('grantRandomPiece(3)');
    check('granting 3 Random Pieces redeems immediately (bank 0)', playerData.randomPieces === 0);
    const after = run('getRandomPieceIncompletePool()');
    const totalPieces = (root) => Object.values(root).flatMap(t => Object.values(t)).reduce((n, s) => n + (s.pieces || 0), 0);
    check('one piece was added to exactly one ability', totalPieces(playerData.specialAbilities) === 1);
    check('pool shrank only if that ability completed (it did not)', after.length === before.length);

    // Grant 7 -> two redemptions (6 pieces), 1 banked.
    run('grantRandomPiece(7)');
    check('granting 7 redeems twice and banks 1', playerData.randomPieces === 1 && totalPieces(playerData.specialAbilities) === 3);

    // Grant 2 with 1 banked -> bank hits 3, redeems immediately.
    run('grantRandomPiece(2)');
    check('granting 2 with 1 banked redeems the set (bank 0, 4 pieces)', playerData.randomPieces === 0 && totalPieces(playerData.specialAbilities) === 4);
    // Grant 1 -> banks 1, no redemption; redeemRandomPieces() finds nothing.
    run('grantRandomPiece(1)');
    check('granting 1 banks without redeeming', playerData.randomPieces === 1 && totalPieces(playerData.specialAbilities) === 4);
    const redemptions = run('redeemRandomPieces()');
    check('redeemRandomPieces with fewer than 3 banked does nothing', redemptions.length === 0 && playerData.randomPieces === 1);

    // All abilities fully owned -> conversion to 50 Core Pieces.
    for (const [fid, def] of Object.entries(sandbox.SPECIAL_ABILITY_DEFS)) {
        run(`getSpecialAbilityState('${def.type}', '${fid}').pieces = 3`);
        run(`getSpecialAbilityState('${def.type}', '${fid}').unlocked = true`);
    }
    check('pool is empty when all abilities are fully owned', run('getRandomPieceIncompletePool().length') === 0);
    run('grantRandomPiece(3)');
    check('all-owned converts 3 Random Pieces to 50 Core Pieces', playerData.corePieces === 50 && playerData.randomPieces === 1);
    run('grantRandomPiece(6)');
    check('conversion repeats for every set of 3', playerData.corePieces === 150);

    // A piece that completes an ability unlocks it.
    const playerData2 = { corePieces: 0, randomPieces: 0, specialAbilities: {} };
    const sandbox2 = { ...sandbox, playerData: playerData2 };
    vm.createContext(sandbox2);
    for (const fn of ['ensureSpecialAbilityState', 'getSpecialAbilityState', 'getSpecialPieceCount', 'getSpecialAbilityDef', 'addSpecialAbilityPiece', 'getCorePieces', 'addCorePieces', 'getRandomPieceIncompletePool', 'redeemRandomPieces', 'grantRandomPiece']) {
        vm.runInContext(extractFunction(game, fn), sandbox2);
    }
    const run2 = (code) => vm.runInContext(code, sandbox2);
    // Give every ability 2 pieces except one fighter with 2 pieces too — force
    // the pool to a single fighter by completing all others.
    const fighters = Object.keys(sandbox2.SPECIAL_ABILITY_DEFS).filter(f => f !== 'electrostien');
    const target = fighters[0];
    for (const fid of fighters) {
        const def = sandbox2.SPECIAL_ABILITY_DEFS[fid];
        run2(`getSpecialAbilityState('${def.type}', '${fid}').pieces = ${fid === target ? 2 : 3}`);
        run2(`getSpecialAbilityState('${def.type}', '${fid}').unlocked = ${fid === target ? false : true}`);
    }
    const r2 = run2('redeemRandomPieces()');
    // Bank is 0, so no redemption yet — grant 3 to trigger it.
    check('no redemption with an empty bank', r2.length === 0);
    run2('grantRandomPiece(3)');
    const tstate = run2(`getSpecialAbilityState('${sandbox2.SPECIAL_ABILITY_DEFS[target].type}', '${target}')`);
    check('the last piece completes and unlocks the ability', tstate.pieces === 3 && tstate.unlocked === true);
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`random piece rule: ${passed} passed`);
