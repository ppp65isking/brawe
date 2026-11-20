// Brawler Prestige (Arena Forge rebuilds, 2026-11-20):
// 50 gems per new prestige level (match-end hook). Bricks/match drop
// after P5: 10 -> 8 -> 5 (positive placement deltas scale by rate/10;
// past P10 it stays 5 forever per brawler, gems keep coming).
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

check('prestige gem hook snapshots prestige before the award', game.includes('const prestigeBefore = {};'));
check('prestige gem hook pays 50 gems per level gained', game.includes("grantReward({ type: 'gems', amount: 50 }); prestigeGemsEarned += 50;"));
check('results screen shows prestige gems', game.includes("• 💎 +${prestigeGemsEarned} Prestige Gems"));
check('placement table untouched (30/26/22 base)', game.includes('const awards = [30, 26, 22, 18, 14, 10, 6, 2, -1, -3, -5, -7, -9, -11, -13];'));
check('solo award scales by prestige rate', game.includes('const rate = getPrestigeBricksPerMatch(progress.prestige || 0);'));
check('team award returns the actual awarded total', game.includes('return awardedTotal;'));

// --- Live behavior: rate + scaling -------------------------------------------------------
{
    const playerData = { brawlers: {} };
    const sandbox = {
        console, playerData,
        selectedBrawler: 'outlit',
        DAILY_BRICK_RUSH_BONUS_CAP: 250,
    };
    vm.createContext(sandbox);
    for (const fn of ['getLifetimeBricks', 'getBrickDeltaForPlacement', 'getPrestigeBricksPerMatch', 'applyPositiveBrickMultiplier', 'applyBrickDelta', 'awardBricksForPlacement', 'awardBricksAcrossTeam']) {
        vm.runInContext(extractFunction(game, fn), sandbox);
    }
    const run = (code) => vm.runInContext(code, sandbox);
    check('rate is 10 at P0..P5', [0, 1, 5].every(p => run(`getPrestigeBricksPerMatch(${p})`) === 10));
    check('rate is 8 at P6..P10', [6, 8, 10].every(p => run(`getPrestigeBricksPerMatch(${p})`) === 8));
    check('rate is 5 past P10, forever', [11, 20, 99].every(p => run(`getPrestigeBricksPerMatch(${p})`) === 5));
    check('negative/undefined prestige clamps to 10', run('getPrestigeBricksPerMatch(-3)') === 10 && run('getPrestigeBricksPerMatch()') === 10);

    const mkProgress = (prestige, bricks) => ({ level: 1, bricks, prestige, gadgetUnlocked: false, starPowerUnlocked: false, hyperchargeUnlocked: false, selectedStar: 'slow', selectedGadget: 'g1' });
    // lifetime = prestige*1000 + bricks
    const solo = (prestige, placement) => {
        const p = mkProgress(prestige, 0);
        sandbox.p = p;
        const delta = run(`awardBricksForPlacement(p, ${placement}, 1)`);
        return { delta, prestige: p.prestige, bricks: p.bricks };
    };
    check('P0 1st place awards 30 bricks', solo(0, 1).delta === 30);
    check('P6 1st place awards 24 bricks (30 x 0.8)', solo(6, 1).delta === 24);
    check('P11 1st place awards 15 bricks (30 x 0.5)', solo(11, 1).delta === 15);
    check('P11 4th place awards 9 bricks (18 x 0.5)', solo(11, 4).delta === 9);
    check('losses are never scaled (P11 15th place = -13)', solo(11, 15).delta === -13);
    check('prestige level rises at 1000 lifetime bricks', (() => { const r = solo(0, 1); return r.prestige === 0 && r.bricks === 30; })());
    const crossing = (() => {
        const p = mkProgress(0, 990);
        sandbox.p = p;
        run('awardBricksForPlacement(p, 1, 1)');
        return p;
    })();
    check('crossing 1000 lifetime bricks raises prestige to 1', crossing.prestige === 1 && crossing.bricks === 20);

    // Team award: each brawler scales by its own prestige.
    const team = (() => {
        playerData.brawlers = {
            a: mkProgress(0, 0),
            b: mkProgress(6, 0),
            c: mkProgress(11, 0),
        };
        return run("awardBricksAcrossTeam(['a','b','c'], 1, 1)");
    })();
    check('team award returns the actual awarded total (10+8+5 = 23)', team === 23);
    check('team P0 member gets 10 bricks', playerData.brawlers.a.bricks === 10);
    check('team P6 member gets 8 bricks', playerData.brawlers.b.bricks === 8);
    check('team P11 member gets 5 bricks', playerData.brawlers.c.bricks === 5);
    check('no banned-word hits in game.js', !new RegExp('\\b' + 'clus' + 'ter' + '\\b', 'i').test(game));
}

if (failed) { console.error(`FAIL ${failed}: ${failures.join(' | ')}`); process.exit(1); }
console.log(`brawler prestige: ${passed} passed`);
