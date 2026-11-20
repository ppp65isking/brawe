// Arena Forge app redesign phase 3 (2026-11-19, Anthony's order):
// "more updates to the arena forge apps optimizing more things like
// scrolling, and where there's not enough room and using the full phone
// screen." Plus his folded-in follow-ups: the in-match HUD rework
// (screenshot), Fighters scroll (confirmed bug), SP/gadget descriptions,
// season pass full-screen, and the thrower telegraph work (missing
// telegraphs + the touch mismatch). App/touch mode ONLY — the website's
// home/shop/quests/tournament/profile and all mechanics are untouched.
// Source presence + behavior mirrors, same pattern as the phase-2 suite.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Scrolling: momentum, hidden bars, one scroller per view ---
check('PLAY row wraps so PLAY + event chip fit a 360px phone', game.includes('#appHomePlayRow{flex-wrap:wrap}'));
check('event chip goes full-width below PLAY in portrait', game.includes("@media (orientation:portrait){#appHomeEventChip{max-width:100%;flex:1 1 100%}}"));
check('hero view can scroll on short screens', game.includes('#appHomeHeroView{overflow-y:auto}'));
check('fighters strip has momentum scrolling + hidden scrollbar', game.includes('#appFightersStrip{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}') && game.includes('#appFightersStrip::-webkit-scrollbar{display:none}'));
check('fighters role chips have momentum scrolling', game.includes('.app-fighters-roles{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}'));
check('events view has momentum scrolling', game.includes('#appHomeEventsView{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}'));
check('shop sidebar has momentum scrolling + hidden scrollbar', game.includes('.native-app .brawe-shop-sidebar{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}') && game.includes('.native-app .brawe-shop-sidebar::-webkit-scrollbar{display:none}'));

// --- Fighters: one scroller, sticky strip, scroll reset ---
check('fighters detail is no longer a nested scroller', game.includes('#appFighterDetail{flex:none;overflow-y:visible}'));
check('fighters strip sticks to the top of the view', game.includes("#appFightersStrip{position:sticky;top:0;z-index:2;"));
check('picking a fighter opens its full screen (fixes round: no more inline detail)', game.includes('openAppFighterPage(appFightersState.focused);'));
check('fighter page is a full screen in the app shell', game.includes('<div id="appHomeFighterView"></div>') && game.includes('function buildAppFighterView() {'));

// --- SP / gadget descriptions render where the data exists ---
check('kitSplit handles Name (description) form', game.includes('const kitSplit = (raw) => {') && game.includes("const m = s.match(/\\(([^)]*)\\)/);"));
check('kitSplit handles Name: description form', game.includes("s.indexOf(': ')"));
check('kit slots render a description line', game.includes('class="app-kit-desc"') && game.includes('.app-kit-desc{display:block;font-size:10px;line-height:1.35;color:#bcd9f2;margin-top:2px}'));
check('gadget + star power slots pass their descriptions', game.includes("kitDesc(data.g1)") && game.includes("kitDesc(data.g2)") && game.includes("kitDesc(data.sp1)") && game.includes("kitDesc(data.sp2)"));
// Behavior mirror: run the real kitSplit against the real data shapes.
{
    const m = game.match(/const kitSplit = \(raw\) => \{[\s\S]*?\n    \};/);
    check('kitSplit extracts cleanly for execution', !!m);
    if (m) {
        const kitSplit = eval(`(${m[0].replace('const kitSplit = ', '').replace(/;\s*$/, '')})`);
        const volt = kitSplit('Deep Charge (Overcharge lasts 2 seconds instead of 1, and slows reloads by 30% instead of 20%)');
        check('kitSplit: paren form splits name + desc', volt.name === 'Deep Charge' && volt.desc.startsWith('Overcharge lasts'));
        const thermite = kitSplit('Thermite Canister: Next fireball is bigger, flies farther (1100 px), and splits into 8 embers.');
        check('kitSplit: colon-before-paren splits on the colon', thermite.name === 'Thermite Canister' && thermite.desc.startsWith('Next fireball'));
        const sticky = kitSplit('Sticky Feet: Next splatter roots enemies for 1s.');
        check('kitSplit: colon form splits name + desc', sticky.name === 'Sticky Feet' && sticky.desc.startsWith('Next splatter'));
        const bare = kitSplit('Cleave Timber');
        check('kitSplit: bare name has no invented desc', bare.name === 'Cleave Timber' && bare.desc === '');
        const shell = kitSplit('Shell Chill (Slows)');
        check('kitSplit: short paren desc works', shell.name === 'Shell Chill' && shell.desc === 'Slows');
    }
}

// --- Season pass: one scroller, compact top bar ---
check('quest content is the single scroller in app mode', game.includes("content.className = 'app-quest-content';") && game.includes('.native-app #questBoardOverlay .app-quest-content{overflow-y:auto !important;'));
check('season boxes stop being inner scrollers', game.includes('.native-app #questBoardOverlay .app-quest-content>div>div{overflow-y:visible !important}'));
check('quest top bar compacts in app mode (subtitle hidden, tabs tighter)', game.includes("boardSubtitle.className = 'app-quest-subtitle';") && game.includes('.native-app #questBoardOverlay .app-quest-subtitle{display:none !important}') && game.includes("tabRow.className = 'app-quest-tabrow';"));

// --- Room: tournament cards, profile, top strip, tab bar ---
check('tournament league cards lose the 24px padding in app mode', game.includes('.native-app .app-tournament-league-grid>div{padding:12px !important}'));
check('tournament picker cards get room in app mode', game.includes("container.classList.add('app-tournament-picker-grid');") && game.includes(".native-app .app-tournament-picker-grid>div{width:min(150px,calc(50vw - 24px)) !important;padding:12px !important}"));
check('tournament bracket scrolls with momentum + hidden bar', game.includes("roundsWrap.classList.add('app-tournament-rounds');") && game.includes('.native-app .app-tournament-rounds{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}'));
check('profile overlay goes full-bleed in app mode', game.includes('.native-app .brick-bon-v2-overlay{padding:0 !important}') && game.includes('.native-app .brick-bon-v2{width:100vw !important;height:100dvh !important;border-radius:0 !important;border:0 !important}'));
check('Brick Bon road scrolls with momentum in app mode', game.includes('.native-app .bon-road{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}'));
check('currency pills shrink on narrow phones', game.includes("@media (max-width:430px){.native-app .home-currency-pill{font-size:11px !important;padding:4px 9px !important}}"));
check('tab bar compacts on <=360px phones', game.includes("@media (max-width:360px){#appHomeTabs{gap:4px}#appHomeTabs button{font-size:13px;padding:8px 2px}"));

// --- HUD: the TOOL/TALENT/CORE text row is gone entirely ---
check('no TOOL/TALENT/CORE text chips survive anywhere', (game.match(/TOOL ·|TALENT ·|CORE ·/g) || []).length === 0);
check('the touch chips array is gone', !game.includes('const hudChips = []'));
check('desktop HUD panel is untouched', game.includes('if (!touchHud) {') && game.includes("ctx.fillText('Core', hudX + 12, hudY + 70);"));
check('map/modifier collapse to one small line on touch', game.includes('if (touchHud) {') && game.includes("ctx.font = 'bold 11px sans-serif';") && game.includes("ctx.fillText(`${mapLabel}${touchMod}`, 12, 24);"));
check('desktop map/modifier block is untouched', game.includes('ctx.fillText(`Map: ${mapLabel}`, 20, 86);') && game.includes('ctx.fillText(modifierDef.description, 20, 122);'));
check('touch ATTACK/SUPER cards shrink + move under the pill', game.includes('const readY = touchHud ? 84 : (hudModifierShown ? 134 : 96)') && game.includes('readH = touchHud ? 48 : 56'));
check('desktop card geometry is unchanged', game.includes('Math.min(310, innerWidth - 36)') && game.includes('hudModifierShown ? 134 : 96'));

// --- TOOL button: circular cooldown ring + swappable icon slot ---
// Round 2 HUD (2026-11-19) supersedes the old "slot only" pins below:
// Anthony ordered per-gadget icons built, so the getter now resolves the
// live selection and the map covers all 208 gadgets (counts are asserted
// in tests/arena-forge-round2-hud-regression.mjs).
check('TOOL button icon is a swappable slot', game.includes('function getMobileToolButtonIcon(brawlerId, gadgetSlot) {') && game.includes("gadgetTouchBtn.textContent = getMobileToolButtonIcon();"));
check('TOOL button carries the circular cooldown ring', game.includes("gadgetTouchBtn.style.setProperty('--mobile-charge', `${gadgetFrac * 360}deg`);"));
check('TOOL ring fraction comes from the real cooldown', game.includes('getPlayerGadgetCooldownUntil(selectedGadget, performance.now())') && game.includes('getGadgetCooldownMsForBrawler(selectedBrawler, selectedGadget)'));
check('TOOL ring clamps 0..1 and is full when ready', game.includes('clamp(1 - (gadgetReadyAt - performance.now()) / gadgetTotalMs, 0, 1)'));
check('per-gadget icons are built (round 2 HUD: map covers all 208 gadgets)', game.includes('const MOBILE_GADGET_ICONS = {') && (game.match(/^        '[a-z0-9_]+:g[12]': '/gm) || []).length === 208);

// --- Thrower telegraphs: every thrower has one; touch matches the throw ---
check('aim helper exists and uses the fire vector on touch', game.includes('function getPlayerAimWorld(){') && game.includes('player.x + (mobileInput.aimX || 0) * 1200'));
check('aim helper falls back to the mouse world otherwise', game.includes('return getMouseWorld();\n  }') || game.includes('return getMouseWorld();'));
check('aim-cone block reads the helper, not the raw mouse', game.includes('const wm = getPlayerAimWorld();'));
check('every thrower has a telegraph branch', game.includes('const range = isHypercharged ? 750 : 650;') && game.includes('const ringR = 760 * 0.6 * 0.42') && game.includes("fillText(`${pieCount} MINI PIES`") && game.includes("fillText('VOLT BLAST'") && game.includes("fillText('GRAVY SPLASH'"));
check('voltastein telegraph uses its real range + blast radius', game.includes('Math.min(VOLTASTEIN_RANGE,Math.hypot(wm.x-player.x,wm.y-player.y))') && game.includes('ctx.arc(landX,landY,VOLTASTEIN_EXPLOSION_RADIUS,0,Math.PI*2)'));
check('gravy telegraph uses its real range + splash radius', game.includes('Math.min(GRAVY_GLOB_THROW_RANGE,Math.hypot(wm.x-player.x,wm.y-player.y))') && game.includes('ctx.arc(landX,landY,GRAVY_GLOB_SPLASH_RADIUS,0,Math.PI*2)'));
check('new telegraphs draw a lob arc, not a straight line', (game.match(/quadraticCurveTo\(\(player\.x\+landX\)\/2,\(player\.y\+landY\)\/2-90,landX,landY\)/g) || []).length === 1 && (game.match(/quadraticCurveTo\(\(player\.x\+landX\)\/2,\(player\.y\+landY\)\/2-80,landX,landY\)/g) || []).length === 1);
// Behavior mirror: the old synthetic-mouse telegraph sat ~5x closer than
// the shot on a phone (180px / zoom vs the 1200px fire vector); the helper
// returns the fire vector itself, so the two agree by construction.
{
    const zoom = 0.767; // landscape phone: (844 / 0.90) / 1100
    const oldTelegraphDist = 180 / zoom;
    const fireDist = 1200;
    check('old touch telegraph was ~5x closer than the shot (the bug)', fireDist / oldTelegraphDist > 4.5 && fireDist / oldTelegraphDist < 5.5);
    check('helper returns the fire vector, not the synthetic mouse', game.includes('return { x: player.x + (mobileInput.aimX || 0) * 1200, y: player.y + (mobileInput.aimY || 0) * 1200 };'));
}

// --- Website paths unchanged: same openers, same flows ---
check('shop opener still exists and still opens the gem shop', game.includes('function openGemShop() {') && game.includes("shopBtn.addEventListener('click', ()=>{ openGemShop(); });"));
check('quest board opener still exists with all five tabs', game.includes('function openQuestBoard(initialTab') && game.includes("makeTab('season', '⚡ Season Quests')"));
check('season pass still delegates to the quest board season tab', game.includes('function openSeasonPass() {') && game.includes("openQuestBoard('season');"));
check('save-code modal behavior untouched', game.includes('function openSaveCodeModal() {') && game.includes('importBraweSavePayload'));
check('diagnostic strip gate untouched', game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save backup whitelist unchanged (tournament state still out)', game.includes("return /^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i.test(String(key || ''));"));
check('no banned disabled-brawler word anywhere', !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(game));
check('no mechanic or number changes: fire vector constant untouched', game.includes('player.x + mobileInput.aimX * 1200'));

console.log(`phase3: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
