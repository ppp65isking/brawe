// Voltastein buffs (2026-11-18, Anthony's order): G1 Arc Leap arcs to up to
// 7 enemies (was 1); SP2 Feedback Loop reloads 50% faster during Power
// Outage (was 30%). Source-presence + behavior mirror of the arc chain.
// No DOM/match runtime needed. Never uses the banned bare word.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- G1: old value was a single leap (boolean flag, no cap) ---
check('G1 OLD single-leap flag is gone', !game.includes('voltasteinArcLeapNext'));
check('G1 cap constant is 7', game.includes('const VOLTASTEIN_G1_MAX_ARCS = 7;'));
check('G1 arms a 7-arc counter (not a boolean)', game.includes('entity.voltasteinArcLeapsLeft = VOLTASTEIN_G1_MAX_ARCS;') && game.includes('entity.voltasteinArcHitIds = {};'));
check('G1 explosion spends one arc per leap (hyper mode does not spend G1 arcs)', game.includes('if (hyperArc || (owner.voltasteinArcLeapsLeft || 0) > 0) {') && game.includes('owner.voltasteinArcLeapsLeft -= 1;'));
check('G1 never arcs to the same enemy twice (hyper mode only revisits when no fresh target is in range)', game.includes('if (arcHitIds[target.id]) {') && game.includes('arcHitIds[picked.id] = true;') && game.includes('const picked = best || bestRevisit;') && game.includes('if (hyperArc && d < bestRevisitD) { bestRevisit = target; bestRevisitD = d; }'));
check('G1 chain ends when no enemy is in range (remaining arcs fizzle, no carry-over volt)', game.includes('owner.voltasteinArcLeapsLeft = 0;') && game.includes('// No enemy in arc range: the chain ends, remaining arcs fizzle.'));
check('G1 arc range / mini damage unchanged (250px, 50%)', game.includes('const VOLTASTEIN_G1_ARC_RADIUS = 250;') && game.includes('const VOLTASTEIN_G1_MINI_DMG_MULT = 0.5;'));
check('G1 card copy says up to 7', game.includes("g1: 'Arc Leap (Your next volt arcs to up to 7 nearby enemies on impact — each a mini explosion plus the overcharge)'"));

// --- SP2: old value was 30% faster reload (/ 1.30) ---
check('SP2 OLD 30% divisor is gone from both reload hooks', !game.includes('voltasteinHasSP2(player)) currentReloadTime /= 1.30') && !game.includes('voltasteinHasSP2(fromEntity)) fireDelay /= 1.30'));
check('SP2 reload divisor constant is 1.50 (50% faster)', game.includes('const VOLTASTEIN_SP2_RELOAD_MULT = 1.50;'));
check('SP2 applies the 50% reload buff on player + bot while an Outage is active', game.includes('isAnyVoltasteinOutageActive(player, now) && voltasteinHasSP2(player)) currentReloadTime /= VOLTASTEIN_SP2_RELOAD_MULT;') && game.includes("isAnyVoltasteinOutageActive(fromEntity, now) && voltasteinHasSP2(fromEntity)) fireDelay /= VOLTASTEIN_SP2_RELOAD_MULT;"));
check('SP2 gate still only feeds the two reload hooks (definition + player + bot, no other SP2 call sites)', (game.match(/voltasteinHasSP2\(/g) || []).length === 3);
check('SP2 card copy says 50% faster reload', game.includes("sp2: 'Feedback Loop (While Power Outage is active on any enemy, the main attack reloads 50% faster)'"));

// --- Behavior mirror: the arc-chain target picker, faithfully re-implemented ---
// Mirrors voltasteinVoltExplode's G1 block: nearest enemy within 250px of the
// blast that has not been arced to yet, one arc spent per leap, chain stops
// when no target is in range or arcs run out.
function simulateArcChain(owner, enemies, excludeId, arcRadius = 250, maxArcs = 7) {
    let leapsLeft = maxArcs;
    const arcHitIds = {};
    const visited = [];
    let x = 0, y = 0; // blast point; each leap lands on its target, chain walks on
    while (leapsLeft > 0) {
        let best = null, bestD = Infinity;
        for (const t of enemies) {
            if (!t || t.hp <= 0) continue;
            if (excludeId && t.id === excludeId) continue;
            if (arcHitIds[t.id]) continue;
            const d = Math.hypot(t.x - x, t.y - y);
            if (d <= arcRadius && d < bestD) { best = t; bestD = d; }
        }
        if (!best) { leapsLeft = 0; break; }
        leapsLeft -= 1;
        arcHitIds[best.id] = true;
        visited.push(best.id);
        x = best.x; y = best.y;
    }
    return visited;
}
const line = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, hp: 100, x: (i + 1) * 100, y: 0 }));
check('chain visits at most 7 enemies with 9 in range', simulateArcChain({}, line(9), null).length === 7);
check('chain visits all 7 distinct enemies (no repeats, no ping-pong)', (() => { const v = simulateArcChain({}, line(9), null); return new Set(v).size === v.length && v.join(',') === '1,2,3,4,5,6,7'; })());
check('chain stops early when fewer enemies are in range', simulateArcChain({}, line(3), null).length === 3);
check('chain stops at a gap: enemies past 250px from the last leap are never reached', (() => {
    const enemies = [{ id: 1, hp: 100, x: 100, y: 0 }, { id: 2, hp: 100, x: 200, y: 0 }, { id: 3, hp: 100, x: 900, y: 0 }];
    const v = simulateArcChain({}, enemies, null);
    return v.join(',') === '1,2';
})());
check('chain never re-arcs the primary target', simulateArcChain({}, [{ id: 9, hp: 100, x: 50, y: 0 }, ...line(3)], 9).join(',') === '1,2,3');
check('SP2 reload math: 1600ms base reload becomes ~1067ms at 50% faster (was ~1231ms at 30%)', Math.round(1600 / 1.50) === 1067 && Math.round(1600 / 1.30) === 1231);

// --- Hyper Arc (2026-11-18 buff, Anthony's order): while Core Surged,
// EVERY volt explosion chains — 500px range, no 7-arc cap, revisits
// allowed (back and forth), hard total-leap failsafe of 30 ---
check('Hyper Arc constants are 500px range / 30-leap failsafe', game.includes('const VOLTASTEIN_HYPER_ARC_RADIUS = 500;') && game.includes('const VOLTASTEIN_HYPER_ARC_MAX_LEAPS = 30;'));
check('Hyper Arc keys off the standard hypercharged state (player + bots)', game.includes('const hyperArc = isEntityHyperchargedNow(owner, now);'));
check('Hyper Arc picks 500px when surged, 250px otherwise (one chain implementation)', game.includes('const arcRadius = hyperArc ? VOLTASTEIN_HYPER_ARC_RADIUS : VOLTASTEIN_G1_ARC_RADIUS;'));
check('Hyper Arc chain runs on every surged explosion, not just an armed G1 volt', game.includes('if (hyperArc || (owner.voltasteinArcLeapsLeft || 0) > 0) {'));
check('Hyper Arc failsafe gates the chain on total leaps', game.includes('if (!hyperArc || hyperLeaps < VOLTASTEIN_HYPER_ARC_MAX_LEAPS) {'));
check('Hyper Arc counter increments per leap', game.includes('owner.voltasteinHyperArcLeaps = hyperLeaps + 1;'));
check('Fresh surged volt starts a new hyper chain and spends any armed G1 charge', game.includes('if (hyperArc && !bullet.voltasteinChild) {') && game.includes('owner.voltasteinHyperArcLeaps = 0;') && game.includes('owner.voltasteinArcLeapsLeft = 0;'));
check('Hyper Arc never re-arcs the enemy it just came from (distance-0 trap)', game.includes('if (hyperArc && target.id === owner.voltasteinHyperArcLastId) continue;') && game.includes('owner.voltasteinHyperArcLastId = picked.id;'));
check('Hyper Arc prefers fresh enemies, revisits only when no fresh target is in range', game.includes('let bestRevisit = null, bestRevisitD = Infinity;') && game.includes('const picked = best || bestRevisit;'));
check('Hyper Arc gap end resets the hyper counter (next volt chains fresh)', game.includes('if (hyperArc) { owner.voltasteinHyperArcLeaps = 0; owner.voltasteinHyperArcLastId = 0; }'));
check('Hyper card copy mentions the arc (500px, no limit, back and forth)', game.includes('While Core Surged, every volt explosion also arcs to nearby enemies (500px range, no limit, and it can bounce back and forth between enemies).'));
check('Hyper split still only forks a surged non-child volt (untouched)', game.includes('if (bullet.voltasteinHyper && !bullet.voltasteinChild && !bullet._voltSplitDone) {'));

// --- Behavior mirror: the Hyper Arc chain, faithfully re-implemented ---
// Mirrors voltasteinVoltExplode's arc block in hyper mode: nearest enemy
// within 500px of the blast, fresh enemies preferred, revisits only when
// no fresh target is in range (and never the enemy the chain just came
// from — it sits at distance 0 from the blast point), one leap spent
// per arc, chain stops when no target is in range or the 30-leap
// failsafe hits.
function simulateHyperArcChain(enemies, excludeId, arcRadius = 500, maxLeaps = 30) {
    let leaps = 0;
    const visited = [];
    const visitedIds = {};
    let x = 0, y = 0; // blast point; each leap lands on its target, chain walks on
    let lastId = 0;
    while (leaps < maxLeaps) {
        let best = null, bestD = Infinity;
        let bestRevisit = null, bestRevisitD = Infinity;
        for (const t of enemies) {
            if (!t || t.hp <= 0) continue;
            if (excludeId && t.id === excludeId) continue;
            if (t.id === lastId) continue;
            const d = Math.hypot(t.x - x, t.y - y);
            if (d > arcRadius) continue;
            if (visitedIds[t.id]) { if (d < bestRevisitD) { bestRevisit = t; bestRevisitD = d; } continue; }
            if (d < bestD) { best = t; bestD = d; }
        }
        const picked = best || bestRevisit;
        if (!picked) break;
        leaps += 1;
        visited.push(picked.id);
        visitedIds[picked.id] = true;
        lastId = picked.id;
        x = picked.x; y = picked.y;
    }
    return visited;
}
check('hyper chain visits MORE than 7 distinct enemies when 9 are in range (no cap)', (() => {
    const v = simulateHyperArcChain(line(9), null);
    return new Set(v.slice(0, 9)).size === 9 && v.slice(0, 9).join(',') === '1,2,3,4,5,6,7,8,9';
})());
check('hyper chain reaches across 400px gaps (G1 at 250px would stop)', (() => {
    const enemies = [{ id: 1, hp: 100, x: 400, y: 0 }, { id: 2, hp: 100, x: 800, y: 0 }, { id: 3, hp: 100, x: 1200, y: 0 }];
    const v = simulateHyperArcChain(enemies, null);
    return v.slice(0, 3).join(',') === '1,2,3' && v.includes(3);
})());
check('G1 chain cannot cross a 400px gap (range is still 250px when not surged)', simulateArcChain({}, [{ id: 1, hp: 100, x: 400, y: 0 }], null).length === 0);
check('hyper chain revisits enemies: two foes ping-pong A→B→A', (() => {
    const enemies = [{ id: 1, hp: 100, x: 100, y: 0 }, { id: 2, hp: 100, x: 200, y: 0 }];
    const v = simulateHyperArcChain(enemies, null);
    return v.slice(0, 3).join(',') === '1,2,1' && new Set(v).size === 2;
})());
check('hyper chain terminates at the 30-leap failsafe (two foes, exactly 30 leaps)', (() => {
    const enemies = [{ id: 1, hp: 100, x: 100, y: 0 }, { id: 2, hp: 100, x: 200, y: 0 }];
    return simulateHyperArcChain(enemies, null).length === 30;
})());
check('hyper chain ends at a gap: enemies past 500px from the last leap are never reached', (() => {
    const enemies = [{ id: 1, hp: 100, x: 100, y: 0 }, { id: 2, hp: 100, x: 200, y: 0 }, { id: 3, hp: 100, x: 900, y: 0 }];
    const v = simulateHyperArcChain(enemies, null);
    return v.join(',').startsWith('1,2') && !v.includes(3);
})());
check('hyper chain never re-arcs the primary target (excludeId still applies)', (() => {
    const v = simulateHyperArcChain([{ id: 9, hp: 100, x: 50, y: 0 }, ...line(3)], 9);
    return v.slice(0, 3).join(',') === '1,2,3' && !v.includes(9);
})());
check('hyper chain with 10 enemies on the field still hits all 10 (failsafe caps leaps, not distinct enemies)', simulateHyperArcChain(line(10), null).slice(0, 10).join(',') === '1,2,3,4,5,6,7,8,9,10');

// --- Scope guard: nothing else about Voltastein moved ---
check('Super Power Outage untouched: 10s max, no new cap', game.includes('const VOLTASTEIN_CHAIN_MAX_MS = 10000;') && game.includes('target.powerOutageUntil = now + VOLTASTEIN_CHAIN_MAX_MS;'));
check('G2 / SP1 / main-attack numbers untouched', game.includes('const VOLTASTEIN_G2_FIELD_RADIUS = 150;') && game.includes('const VOLTASTEIN_OVERCHARGE_SP1_MS = 2000;') && game.includes('const VOLTASTEIN_OVERCHARGE_SP1_MULT = 1.43;'));
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} voltastein-buffs`);
