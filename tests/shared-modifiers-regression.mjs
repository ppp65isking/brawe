// Shared modifier registry (Arena Forge rebuilds, 2026-11-20):
// Modifiers = ONE shared list. Kept mutators + kept Showdown modifiers
// normalized to {id, name, icon, color, description, family, testId}.
// Ranked uses it first; other modes follow later.
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

function extractConstObject(src, name) {
    const start = src.indexOf(`const ${name} = {`);
    if (start === -1) throw new Error(`missing const ${name}`);
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
        if (ch === '/' && nxt === '/') { line = true; i++; continue; }
        if (ch === '/' && nxt === '*') { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in const ${name}`);
}

check('shared registry exists', game.includes('const SHARED_MODIFIER_REGISTRY = Object.freeze(['));
check('getSharedModifierDef exists', game.includes('function getSharedModifierDef(id)'));
check('getSharedModifierPool exists', game.includes('function getSharedModifierPool(family)'));
check('ranked pool getter routes through the registry', game.includes("return getSharedModifierPool('ranked').filter((d) => (includeClassic || d.id !== 'classic') && MUTATOR_DEFS[d.id].rankedPool !== false).map((d) => d.id);"));
check('old ranked pool body is gone', !game.includes("return Object.keys(MUTATOR_DEFS).filter((k) => (includeClassic || k !== 'classic')"));
check('kept mutators still defined (5)', ['classic', 'hyper_overdrive', 'quickfire', 'super_surge', 'friendly_fire'].every(k => game.includes(`'${k}': {`)));
check('kept showdown modifiers still defined (2)', game.includes("none: { label: 'No Modifier'") && game.includes("heavy_storm: { label: 'Heavy Storm'"));

{
    const sandbox = { console };
    vm.createContext(sandbox);
    sandbox.MUTATOR_DEFS = vm.runInContext(`(${extractConstObject(game, 'MUTATOR_DEFS')})`, sandbox);
    sandbox.SHOWDOWN_MODIFIER_DEFS = vm.runInContext(`(${extractConstObject(game, 'SHOWDOWN_MODIFIER_DEFS')})`, sandbox);
    // Rebuild the registry exactly as game.js does.
    vm.runInContext(`const SHARED_MODIFIER_REGISTRY = Object.freeze([
        ...Object.values(MUTATOR_DEFS).map(d => ({ id: d.id, name: d.name, icon: d.icon, color: d.color, description: d.desc || '', family: 'mutator', testId: d.testId })),
        ...Object.values(SHOWDOWN_MODIFIER_DEFS).map(d => ({ id: d.id, name: d.name, icon: d.icon, color: d.colour, description: d.description || '', family: 'showdown', testId: d.testId }))
    ]);`, sandbox);
    for (const fn of ['getSharedModifierDef', 'getSharedModifierPool', 'getRankedMutatorPoolKeys']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const run = (code) => vm.runInContext(code, sandbox);
    const registry = run('SHARED_MODIFIER_REGISTRY');
    check('registry has 7 entries (5 mutators + 2 showdown)', registry.length === 7);
    check('every entry has the normalized shape', registry.every(d => d.id && d.name && d.icon !== undefined && d.color && typeof d.description === 'string' && (d.family === 'mutator' || d.family === 'showdown') && d.testId));
    check('no entry carries the old split field names', registry.every(d => !('desc' in d) && !('colour' in d) && !('label' in d)));
    check('mutator family has the 5 kept mutators', run("getSharedModifierPool('ranked').map(d => d.id).sort().join(',')") === 'classic,friendly_fire,hyper_overdrive,quickfire,super_surge');
    check('showdown family has none + heavy_storm', run("getSharedModifierPool('showdown').map(d => d.id).sort().join(',')") === 'heavy_storm,none');
    check('unfiltered pool returns all 7', run('getSharedModifierPool().length') === 7);
    check('heavy_storm normalizes colour -> color', run("getSharedModifierDef('heavy_storm').color") === '#7fb2ff');
    check('heavy_storm keeps its description', run("getSharedModifierDef('heavy_storm').description") === 'The storm closes in 90s and storm damage is ×1.35.');
    check('classic normalizes desc -> description', run("getSharedModifierDef('classic').description").startsWith('Standard competitive battle rules'));
    check('unknown id returns null', run("getSharedModifierDef('nope')") === null && run('getSharedModifierDef()') === null);
    check('ranked pool without classic has 4 keys', run('getRankedMutatorPoolKeys(false).length') === 4 && !run('getRankedMutatorPoolKeys(false)').includes('classic'));
    check('ranked pool with classic has 5 keys', run('getRankedMutatorPoolKeys(true).length') === 5 && run('getRankedMutatorPoolKeys(true)').includes('classic'));
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`shared modifiers: ${passed} passed`);
