// Electrostien visuals regression — Volt Knuckle punch visual, swing telegraph,
// Boltz Chain arc upgrade, punch impact burst (Anthony's order 2026-10-24).
// Static pins only: render code cannot run in the vm harness, and every change
// here is visual — gameplay numbers are pinned unchanged instead.
import fs from 'fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Kill switch
check('visuals kill switch declared', /let ELECTROSTIEN_VISUALS_ENABLED = true/.test(game));

// Punch projectile visual branch in the bullet draw loop
check('punch visual branch', /if \(b\.isElectrostienPunch && ELECTROSTIEN_VISUALS_ENABLED\)/.test(game));
check('punch visual has fist glow + trail', game.includes('Electrostien Volt Knuckle punch visual') && game.includes('ctx.translate(b.x, b.y); ctx.rotate(pang);'));
check('empowered punch is bigger', game.includes('const pR = pEmp ? 16 : 13;'));
check('hyper punch is violet', game.includes("const pGlow = pHyper ? '#c084fc' : '#00f5d4';"));

// Telegraph: store, spawn at fire time, draw + prune in renderElectrostienEffects
check('telegraph store declared', /let electrostienPunchTelegraphs = \[\];/.test(game));
check('telegraph spawn at punch fire', game.includes('electrostienPunchTelegraphs.push({x:fromEntity.x,y:fromEntity.y,ang,range,hyper,empowered,until:performance.now()+180});'));
check('telegraph draw + prune', game.includes('electrostienPunchTelegraphs = electrostienPunchTelegraphs.filter(t => t && now < t.until);') && game.includes('Volt Knuckle swing telegraphs'));
check('telegraph arc + aim line', game.includes('ctx.arc(t.x, t.y, t.range, t.ang - .6, t.ang + .6)') && game.includes('ctx.setLineDash([8, 6]);'));

// Chain arc upgrade
check('arc function takes opts', /function drawElectrostienArc\(x1, y1, x2, y2, color, opts\)/.test(game));
check('arc old path kept behind switch', game.includes('if (!ELECTROSTIEN_VISUALS_ENABLED)') && game.includes('const jitter = s === steps ? 0 : (Math.random() - 0.5) * 22;'));
check('chain tier colors', game.includes('esDist <= ELECTROSTIEN_CHAIN_TIER1_DIST') && game.includes('esDist <= ELECTROSTIEN_CHAIN_TIER2_DIST'));
check('chain near-break warning', game.includes('esDist > 300') && game.includes("esGlow = '#ff7a45';"));
check('chain expiry blink', game.includes('esEnds - now < 800'));
check('chain traveling spark', game.includes('spark: true') && game.includes('const prog = (nowA / 300) % 1;'));

// Punch impact burst
check('punch impact burst', game.includes("fxKind:'electrostienPunchHit'"));

// Gameplay unchanged: range/speed/damage/timing pins
check('punch range unchanged', /const ELECTROSTIEN_PUNCH_RANGE = 120;/.test(game));
check('punch speed unchanged', /const ELECTROSTIEN_PUNCH_SPEED = 1500;/.test(game));
check('punch still instant (no wind-up)', game.includes('maxLife:range/ELECTROSTIEN_PUNCH_SPEED,damage:stats.dmg,pierce:false'));
check('chain tiers unchanged', /const ELECTROSTIEN_CHAIN_TIER1_DIST = 120;/.test(game) && /const ELECTROSTIEN_CHAIN_TIER3_DIST = 360;/.test(game));
check('chain stick still on punch hit', game.includes('if (b.isElectrostienPunch && !b._esApplied'));

console.log(`electrostien-visuals-regression: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); }
process.exit(failed ? 1 : 0);
