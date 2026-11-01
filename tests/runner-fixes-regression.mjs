// Runner fix round: SP2 visibility, damaging movement trails, hyper shoe
// pickup (option B: real pickup), seamless ribbon trails, shoe +30% width,
// gadget chains + feedback texts.
// Source-presence checks. No DOM/match runtime needed.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Damaging movement trails (overcharge / hyper burn while running) ---
check('movement trail spawn: overcharged or hypercharged Runner drops segments', game.includes('now < (e.runnerOverchargeUntil || 0) || isEntityHyperchargedNow(e, now)') && game.includes('spawnRunnerTrailSegment(e, e.x, e.y)'));
check('movement trail spawn uses a 0.15s timer', game.includes('e.runnerMoveTrailTimer = (e.runnerMoveTrailTimer || 0) + dt') && game.includes('e.runnerMoveTrailTimer >= 0.15'));
check('spawn function still derives dps from overcharge/hyper state', game.includes('const dps = overcharged ? RUNNER_OVERCHARGE_TRAIL_DPS : (hyper ? RUNNER_HYPER_TRAIL_DPS : 0)'));

// --- Seamless ribbon trails ---
check('trail render groups segments by owner', game.includes('const byOwner = new Map();'));
check('trail render strokes connected lines between close points', game.includes('Math.hypot(next.x - seg.x, next.y - seg.y) <= 200') && game.includes('ctx.lineCap = \'round\''));
check('trail ribbon width equals trail diameter', game.includes('ctx.lineWidth = seg.radius * 2;'));
check('lone segments still draw as circles', game.includes('ctx.arc(seg.x, seg.y, seg.radius, 0, Math.PI * 2); ctx.fill();'));

// --- Shoe +30% width ---
check('shoe art is 42 wide (was 32)', game.includes('ctx.roundRect(-21, -7, 42, 14, 6)'));
check('shoe stripe and toe moved to match', game.includes('ctx.fillRect(-21, 4, 42, 3)') && game.includes('ctx.arc(19, 0, 4, 0, Math.PI * 2)'));

// --- SP2 fear: visible on the victim ---
check('fear apply spawns FEARED! text', game.includes("spawnFloatingText(target.x, target.y - 30, 'FEARED!', '#c084fc')"));
check('feared bots draw a purple ring + FEARED label', game.includes("ctx.strokeText('FEARED', t.x, t.y - (t.radius || 20) - 24)"));
check('SP2 chain pinned: arm, carry, apply', game.includes('runnerFearNextAt = now + RUNNER_SP2_INTERVAL_MS') && game.includes('runnerFear: fearCarried') && game.includes('applyRunnerFear(target, owner)'));

// --- Gadget chains + feedback ---
check('G1 chain: button -> flag -> next shoe consumes it', game.includes("executeRunnerG1(player)") && game.includes('entity.runnerWallBreakNext = true') && game.includes('fromEntity.runnerWallBreakNext = false'));
check('G2 chain: button -> window -> shoe passing ally grants shield once', game.includes("executeRunnerG2(player)") && game.includes('runnerShieldWindowUntil = performance.now() + RUNNER_G2_WINDOW_MS') && game.includes('grantShield(ally, RUNNER_G2_SHIELD'));
check('G2 grant spawns SHIELDED text', game.includes("spawnFloatingText(ally.x, ally.y - 30, 'SHIELDED +800', '#5df2c2')"));
check('gadget cooldowns are 15s each', game.includes('runner: { g1: 15000, g2: 15000 }'));

// --- Hyper shoe pickup (option B: real pickup, not silent auto-grant) ---
check('hyper expiry drops a shoe pickup (no silent auto-grant)', game.includes('runnerHyperShoePickups.push({ x: b.x, y: b.y, ownerId: hyperOwner.id, until: performance.now() + RUNNER_HYPER_SHOE_PICKUP_MS, radius: 22 })'));
check('hyper expiry spawns SHOE DROPPED! text', game.includes("spawnFloatingText(b.x, b.y - 30, 'SHOE DROPPED!', '#ffd166')"));
check('pickup collection grants reload buff + text', game.includes("pkOwner.runnerReloadBuffUntil = performance.now() + RUNNER_HYPER_RELOAD_MS") && game.includes("spawnFloatingText(pkOwner.x, pkOwner.y - 30, '+20% RELOAD', '#ffd166')"));
check('pickup renders as a glowing gold-ring shoe', game.includes("ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;") && game.includes('ctx.roundRect(pk.x - 21, pk.y - 7, 42, 14, 6)'));
check('pickups expire and clear on match reset', game.includes('RUNNER_HYPER_SHOE_PICKUP_MS = 8000') && game.includes('runnerHyperShoePickups.length = 0;'));

console.log(`runner-fixes: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures.join(' | ')); process.exit(1); }
