// Holiday Lights FreeZeon skin (Arena Forge rebuilds, 2026-11-20):
// first skin in the new system, first Anomaly skin (highest rarity).
// Pass-only, Nov + Dec 2026. Visual only. Chromas change ONLY attack /
// Super colors; spawn/takedown never change across chromas. No Core
// Surge transform.
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

// --- Skin definition pins --------------------------------------------------
check('skin defined in skinsDatabase', game.includes("'holiday-lights-freezeon': {"));
check('skin is for freezeon', game.includes("name: 'Holiday Lights',\n            brawler: 'freezeon',"));
check('skin rarity is Anomaly (highest)', game.includes("rarity: 'Anomaly',"));
check('skin is pass-only', game.includes('passOnly: true,'));
check('skin window is Nov + Dec 2026', game.includes("availableFrom: '2026-11-01',") && game.includes("availableTo: '2026-12-31',"));
check('no Core Surge transform on the skin', game.includes("hyperTransform: false,") && !/holiday-lights-freezeon'[\s\S]{0,600}?hyperTransform: true/.test(game));
check('main = 4 different colored light strands', game.includes("attackEffect: { type: 'holidayLightStrands', colors: ['#ff3b30', '#34c759', '#0a84ff', '#ffd60a']"));
check('Super = holiday ice rink', game.includes("superEffect: { type: 'holidayIceRink'"));
check('spawn = lights wrap', game.includes("spawnEffect: { type: 'holidayLightsWrap'"));
check('takedown = lights knot', game.includes("takedownEffect: { type: 'holidayLightsKnot'"));
check('model is holiday hat + red/green lights', game.includes("hat: 'holiday', wrap: 'red-green-lights'"));
check('two chromas: blue+yellow and purple+white', game.includes("'holiday-lights-freezeon-blue-yellow'") && game.includes("'holiday-lights-freezeon-purple-white'"));
check('chromas are color-only (isChroma + baseSkin)', (game.match(/isChroma: true,/g) || []).length === 2 && (game.match(/baseSkin: 'holiday-lights-freezeon',/g) || []).length === 2);
check('sounds picked: jingle-bell chime set, same for all chromas', (game.match(/sounds: \{ spawn: 'holiday-jingle-spawn', attack: 'holiday-jingle-pop', super: 'holiday-jingle-rink', takedown: 'holiday-jingle-burst' \}/g) || []).length === 3);
check('Anomaly rarity meta exists (no Core Surge transform)', game.includes("'Anomaly': { label: 'Anomaly'") && game.includes('no Core Surge transform'));
check('grantReward skin path grants chromas with the skin', game.includes('// Chromas ride with the skin: the tier-50 skin grants both.'));

// --- Palette: chroma changes attack/super colors only ----------------------
{
    const sandbox = {
        console,
        playerData: { selectedSkins: {} },
        getActiveSkinForBrawler: () => null,
        HOLIDAY_LIGHTS_BASE_COLORS: ['#ff3b30', '#34c759', '#0a84ff', '#ffd60a'],
    };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'getHolidayLightsPalette'), sandbox);
    const run = (code) => vm.runInContext(code, sandbox);
    check('palette defaults to base 4 colors', JSON.stringify(run('getHolidayLightsPalette()')) === JSON.stringify(['#ff3b30', '#34c759', '#0a84ff', '#ffd60a']));
    sandbox.getActiveSkinForBrawler = () => ({ id: 'holiday-lights-freezeon-blue-yellow', strandColors: ['#0a84ff', '#ffd60a', '#0a84ff', '#ffd60a'] });
    check('blue+yellow chroma palette', JSON.stringify(run('getHolidayLightsPalette()')) === JSON.stringify(['#0a84ff', '#ffd60a', '#0a84ff', '#ffd60a']));
    sandbox.getActiveSkinForBrawler = () => ({ id: 'holiday-lights-freezeon-purple-white', strandColors: ['#bf5af2', '#ffffff', '#bf5af2', '#ffffff'] });
    check('purple+white chroma palette', JSON.stringify(run('getHolidayLightsPalette()')) === JSON.stringify(['#bf5af2', '#ffffff', '#bf5af2', '#ffffff']));
}

// --- Visual wiring pins -----------------------------------------------------
check('cones stamp holidayLights at fire time', game.includes('holidayLights: !!entry.holidayLights'));
check('cone renderer draws 4 light strands', game.includes('Holiday Lights: the cone is 4 different colored detailed'));
check('rink patches stamp holidayLights', game.includes('holidayLights: !!thrown.holidayLights'));
check('rink render has holiday lighting branch', game.includes('Holiday Lights rink: dark ice with a string of holiday'));
check('Super spawn explosion has holiday branch', game.includes("ex.fxKind === 'freezeonSuperSpawn' && ex.holidayLights"));
check('spawn pulse pushes holidayLightsWrap', game.includes("fxKind: 'holidayLightsWrap'"));
check('takedown pulse pushes holidayLightsKnot', game.includes("fxKind: 'holidayLightsKnot'"));
check('spawn/takedown pulses note chromas do not change them', game.includes('Spawn/takedown never') && game.includes('Base colors on every chroma'));
check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`holiday lights skin: ${passed} passed`);
