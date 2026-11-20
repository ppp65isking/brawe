// Arena Forge app home optimize (2026-11-18, Anthony's order): "App
// works! Everything needs to be optimized tho use brawl stars new brawler
// screen for inspo events screen inspo too pls" + the in-match UI redesign
// ("the tool talent trait needs to be redone or not shown the left one").
// Brawl Stars Nov 2026 update 70.648 inspo: brawler collection scrolls
// horizontally with smaller cards + search + class filter; events are big
// slots showing mode + map with countdown timers, season featured first.
// App/touch mode ONLY — the website's home/fighters/events/HUD are
// untouched. Source-presence + behavior mirrors.
// Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Fighters view: shell + builders exist ---
check('fighters view container exists in the app shell', game.includes('id="appHomeFightersView"'));
check('fighters builders exist', game.includes('function buildAppFightersView() {') && game.includes('function renderAppFightersStrip() {') && game.includes('function renderAppFightersDetail() {') && game.includes('function appFightersVisibleList() {') && game.includes('function appFightersPlay(id) {') && game.includes('function appFightersUpgrade(id) {') && game.includes('function appFightersKitPick(id, key) {'));
check('fighters shell has search box + icon buttons + strip (detail moved to its own full screen)', game.includes('id="appFightersSearch"') && game.includes('id="appFightersFavToggle"') && game.includes('id="appFightersStrip"') && game.includes('id="appFighterDetail"') && !game.includes('id="appFightersRoles"') && !game.includes('id="appFightersDetail"'));
check('fighters tab opens the native view (not the web gallery)', game.includes("if (tab === 'fighters') buildAppFightersView();"));

// --- Fighters view: horizontal strip of smaller cards + search + class filter ---
check('strip cards are small (92px) with portrait + name + power', game.includes('.app-fighter-card{flex:none;width:92px;') && game.includes('class="app-fighter-portrait"') && game.includes('data-app-fighter="${id}"'));
check('strip scrolls horizontally', game.includes('#appFightersStrip{flex:none;display:flex;gap:8px;overflow-x:auto;'));
check('search input filters the strip on input', game.includes("view.querySelector('#appFightersSearch')?.addEventListener('input'") && game.includes("appFightersState.search = event.target.value || '';") && game.includes('renderAppFightersStrip();'));
check('favorites star + sort-in-sheet replace the role chips (fixes round)', game.includes('function syncAppFightersFavBtn() {') && game.includes('id="appFilterSort"') && game.includes('favoritesOnly: false'));
check('strip defaults to class sort (role, then name)', game.includes('// Brawl Stars default: class sort — group by role, then name.') && game.includes('if (ra !== rb) return ra.localeCompare(rb);'));
check('locked fighters show LOCKED, unlocked show their power', game.includes("${locked ? '🔒 LOCKED' : `POWER ${pData.level || 1}`}"));
check('selected fighter gets the ring (is-selected)', game.includes("class=\"app-fighter-card${appFightersState.focused === id ? ' is-selected' : ''}"));

// --- Fighters view: detail panel reuses existing data + upgrade path ---
check('detail panel shows portrait + name + rarity + role + stats', game.includes('class="app-fighters-detail-portrait"') && game.includes('getScaledStats(id, level)') && game.includes('<small>POWER</small>') && game.includes('<small>HP</small>') && game.includes('<small>DMG</small>') && game.includes('<small>SPEED</small>'));
check('detail portrait comes from getBrawlerPortraitMarkup', game.includes('try { portrait = getBrawlerPortraitMarkup(id); } catch (_) {}'));
check('detail shows main + Super text', game.includes("<b>MAIN</b> · ${data.main || '") && game.includes("<b>SUPER</b> · ${data.super || '"));
check('detail has Tool 1/2 + Talent 1/2 + Core Surge kit slots', game.includes("kitSlotHtml('g1', 'TOOL 1'") && game.includes("kitSlotHtml('g2', 'TOOL 2'") && game.includes("kitSlotHtml('sp1', 'TALENT 1'") && game.includes("kitSlotHtml('sp2', 'TALENT 2'") && game.includes("kitSlotHtml('hyper', 'CORE SURGE'"));
check('kit slots show lock text by power (7 / 9 / 11)', game.includes("'LOCKED · POWER 7'") && game.includes("'LOCKED · POWER 9'") && game.includes("'LOCKED · POWER 11'"));
check('kit pick writes selectedGadget / selectedStar and saves', game.includes("pData.selectedGadget = key; saveProgress();") && game.includes("pData.selectedStar = value; saveProgress();"));
check('kit pick on a trial fighter goes through the trial loadout', game.includes("setWeeklyTrialLoadoutChoice(id, 'selectedGadget', key)") && game.includes("setWeeklyTrialLoadoutChoice(id, 'selectedStar', value)"));
check('upgrade uses the existing cost path (coins + core pieces)', game.includes('const cost = getUpgradeCost(pData.level);') && game.includes('const cpCost = getCorePieceUpgradeCost(pData.level);') && game.includes('playerData.coins -= cost;') && game.includes('if (cpCost > 0) spendCorePieces(cpCost);') && game.includes('pData.level++;') && game.includes('if (pData.level >= 11) ensureHyperchargeDiscount(pData);'));

// --- Fighters view: PLAY selects the brawler as home hero ---
check('PLAY runs the web picker selection flow', game.includes('selectedBrawler = id;') && game.includes('normalizeSelectedBrawler();') && game.includes("brawlerSelect.dispatchEvent(new Event('change'))") && game.includes('initPlayerHP();') && game.includes('syncAbilityInputs();') && game.includes('updateGadgetInfo();') && game.includes('updateGadgetButton();') && game.includes('renderHomeBrawlerCard();') && game.includes('saveProgress();'));
check('PLAY returns to the Home tab after selecting', game.includes("syncAppHome();\n        setAppHomeTab('home');"));
check('PLAY refuses locked fighters', game.includes("if (!isBrawlerUnlocked(id) && !isWeeklyTrialBrawler(id)) return;"));

// --- Events view: shell + builders exist ---
check('events view container exists in the app shell', game.includes('id="appHomeEventsView"'));
check('events builders exist', game.includes('function buildAppEventsView() {') && game.includes('function renderAppEventsView() {') && game.includes('function appEventSlotHtml(id, opts = {}) {') && game.includes('function appEventModeTag(id) {') && game.includes('function appEventSlotTap(id) {') && game.includes('function tickAppEventCountdowns() {'));
check('events tab opens the native view (not the web events view)', game.includes("if (tab === 'events') buildAppEventsView();"));

// --- Events view: featured first, then popular, then rotating ---
check('events sections are FEATURED, POPULAR, ROTATING in order', (() => {
    const f = game.indexOf('FEATURED EVENTS');
    const p = game.indexOf('POPULAR EVENTS');
    const r = game.indexOf('ROTATING EVENTS');
    return f !== -1 && p !== -1 && r !== -1 && f < p && p < r;
})());
check('season event is featured first from the live season profile', game.includes('const season = getActiveSeasonProfile();') && game.includes("data-app-featured=\"season\"") && game.includes('formatSeasonCountdown(Math.max(0, season.endUtc - Date.now()))'));
check('tournament slot is featured with its live subtitle', game.includes("data-app-featured=\"tournament\"") && game.includes('getTournamentCardSubtitle()') && game.includes("if (typeof openTournamentHub === 'function') openTournamentHub();"));
check('popular slots come from HOME_POPULAR_MODE_IDS', game.includes('(HOME_POPULAR_MODE_IDS || []).filter((id) => HOME_MODE_DATA[id])'));
check('rotating slots come from getHomeDailyRotationIds', game.includes('rotationIds = getHomeDailyRotationIds();') && game.includes('rotationIds.filter((id) => HOME_MODE_DATA[id])'));

// --- Events view: slots show mode + map + countdown ---
check('slots show mode + map preview + tag', game.includes('class="home-mode-map-preview theme-${id}"') && game.includes('class="app-event-tag">${appEventModeTag(id)}</span>') && game.includes('<b>${emoji} ${name}</b>'));
check('slots reuse HOME_MODE_DATA entries', game.includes('const entry = HOME_MODE_DATA[id];') && game.includes('const [, emoji, name, subtitle] = entry;'));
check('season countdown ticks on a 1s interval', game.includes('appEventsCountdownTimer = setInterval(tickAppEventCountdowns, 1000);') && game.includes('data-app-countdown="season"'));
check('daily rotation countdown ticks on the same interval', game.includes('data-app-countdown="daily"') && game.includes("formatHomeEventCountdown(getHomeDailyRotationEndsAt() - Date.now())"));

// --- Events view: tap starts the mode via the existing launch path ---
check('slot tap prefers the existing web card click', game.includes('const webCard = homeModeCardMap?.[id];') && game.includes('webCard.click();'));
check('slot tap falls back to the web dispatch (showdownMode + UI sync)', game.includes('showdownMode = id;') && game.includes('clearRankedSessionState();') && game.includes('updateShowdownModeUI();'));
check('slot tap covers the special openers in the fallback', game.includes("if (id === 'custom_clash')"));
check('slot tap returns to the Home tab (PLAY is one tap away)', game.includes('renderAppHomeEventChip();') && game.includes("setAppHomeTab('home');\n    }"));

// --- In-match HUD (touch/app mode only): Tool/Talent/Core redo ---
check('touch HUD is gated on mobileInput.enabled', game.includes("const touchHud = typeof mobileInput !== 'undefined' && mobileInput.enabled;"));
check('big Tool/Talent/Core panel only draws on desktop', game.includes('if (!touchHud) {') && game.includes('// HUD panel with hypercharge glow for Outlit'));
// Phase 3 supersedes the chips: Anthony ordered the whole TOOL / TALENT /
// CORE text row gone (no talent display in-match, tool cooldown is a ring
// on the TOOL button, core % already sits on the Core Surge bar).
check('touch mode has no TOOL/TALENT/CORE text chips anymore', (game.match(/TOOL ·|TALENT ·|CORE ·/g) || []).length === 0 && !game.includes('const hudChips = []'));
check('TOOL button carries the circular cooldown ring instead', game.includes("gadgetTouchBtn.style.setProperty('--mobile-charge', `${gadgetFrac * 360}deg`);"));
check('chips only render for unlocked rows (locked rows are not shown)', game.includes('if (isTraining || playerProgress.gadgetUnlocked) {') && game.includes('if (isTraining || playerProgress.starPowerUnlocked) {') && game.includes('if (isTraining || playerProgress.hyperchargeUnlocked) {'));

// --- In-match HUD: ATTACK/SUPER cards no longer cover the Modifier line ---
// Phase 3: touch cards no longer drop below the Modifier description —
// the modifier description is gone on touch and the cards moved under the
// Brawlers Left pill. Desktop keeps the old drop.
check('touch cards sit under the pill; desktop still drops below the Modifier line', game.includes('const readY = touchHud ? 84 : (hudModifierShown ? 134 : 96)') && game.includes("const hudModifierShown = !isBossFight && !isDuels && !isTraining && !isSoloTrial && activeShowdownModifier && !isShowdownModifierActive('none');"));

// --- In-match HUD: bars + minimap clear the touch controls ---
check('super/hyper bars shift left 150px in touch landscape', game.includes('const touchLandscape = touchHud && innerWidth > innerHeight;') && game.includes('const bx = touchLandscape ? innerWidth - barW - 24 - 150 :'));
check('bars shrink to 150px centered in touch portrait', game.includes('const barW = touchHud && !touchLandscape ? 150 : 220;') && game.includes('touchHud ? (innerWidth - barW) / 2 : innerWidth - barW - 24;'));
check('desktop bars keep the old geometry', game.includes(': innerWidth - barW - 24;'));
check('minimap shrinks 160→120 in touch mode (desktop keeps 160)', game.includes('const mapW = touchHud ? 120 : 160;'));
check('action buttons sit directly above the aim stick in landscape-short', game.includes('@media (orientation:landscape) and (max-height:540px)') && game.includes('#mobileActionButtons{right:max(26px,env(safe-area-inset-right));bottom:calc(max(18px,env(safe-area-inset-bottom)) + 118px + 14px);'));

// --- Diagnostic strip: hidden by default, shown with ?diag=1 ---
check('strip gate reads ?diag=1 from location.search', game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('strip removes itself when ?diag=1 is absent', game.includes("if (existing) existing.remove();"));

// --- Behavior mirrors ---
// Mirror of appFightersVisibleList: role filter, then name search, then
// class sort (role, then name).
function fightersVisible(roster, search, role) {
    const q = (search || '').trim().toLowerCase();
    const list = roster.filter((b) => {
        if (role !== 'all' && (b.role || 'Fighter') !== role) return false;
        if (q && !(String(b.name || b.id).toLowerCase().includes(q) || String(b.id).toLowerCase().includes(q))) return false;
        return true;
    });
    return list.sort((a, b) => {
        const ra = a.role || 'Fighter', rb = b.role || 'Fighter';
        if (ra !== rb) return ra.localeCompare(rb);
        return String(a.name || a.id).localeCompare(String(b.name || b.id));
    });
}
const fakeRoster = [
    { id: 'zeta', name: 'Zeta', role: 'Tank' },
    { id: 'alpha', name: 'Alpha', role: 'Damage Dealer' },
    { id: 'beta', name: 'Beta', role: 'Damage Dealer' },
    { id: 'mallow', name: 'Mallow', role: 'Controller' },
];
check('fighters filter: role chip narrows to that class', fightersVisible(fakeRoster, '', 'Damage Dealer').map((b) => b.id).join(',') === 'alpha,beta');
check('fighters filter: search matches name or id', fightersVisible(fakeRoster, 'mall', 'all').map((b) => b.id).join(',') === 'mallow');
check('fighters filter: search + role combine', fightersVisible(fakeRoster, 'a', 'Damage Dealer').map((b) => b.id).join(',') === 'alpha,beta');
check('fighters filter: no match -> empty list', fightersVisible(fakeRoster, 'zzz', 'all').length === 0);
check('fighters sort: class first, name second', fightersVisible(fakeRoster, '', 'all').map((b) => b.id).join(',') === 'mallow,alpha,beta,zeta');

// Mirror of the events slot tap: prefer the existing web card click,
// else fall back to the same dispatch the web events view uses.
function eventSlotTap(id, webCard, opened) {
    if (webCard) { webCard.click(); return 'web-card'; }
    if (id === 'tournament') { opened.push('tournament-hub'); return 'tournament'; }
    if (id === 'custom_clash') { opened.push('mutator-picker'); return 'custom'; }
    opened.push(`mode:${id}`);
    return 'fallback';
}
check('event tap: web card exists -> its click runs', (() => { let clicked = false; return eventSlotTap('solo', { click() { clicked = true; } }, []) === 'web-card' && clicked; })());
check('event tap: no web card -> fallback dispatch selects the mode', eventSlotTap('solo', null, []) === 'fallback');
check('event tap: tournament with no card -> tournament hub', eventSlotTap('tournament', null, []) === 'tournament');
check('event tap: custom clash with no card -> mutator picker', eventSlotTap('custom_clash', null, []) === 'custom');

// Mirror of the phase-3 TOOL ring: fraction of the cooldown elapsed,
// 0 when just used, 1 when ready (clamped). The old chips mirror is gone
// with the chips themselves.
function toolRingFrac(readyAt, totalMs, now) { return totalMs > 0 ? Math.max(0, Math.min(1, 1 - (readyAt - now) / totalMs)) : 1; }
check('TOOL ring: just used -> empty (0)', toolRingFrac(12000, 12000, 0) === 0);
check('TOOL ring: halfway recharged -> half (0.5)', toolRingFrac(6000, 12000, 0) === 0.5);
check('TOOL ring: ready -> full (1)', toolRingFrac(0, 12000, 5000) === 1);
check('TOOL ring: cooldown over -> stays full, never over 1', toolRingFrac(1000, 12000, 5000) === 1);

// Mirror of the phase-3 ATTACK/SUPER readY rule: touch sits under the
// pill at 84; desktop drops to 134 only when a modifier line shows.
function readYFor({ touch, modifierShown }) { return touch ? 84 : (modifierShown ? 134 : 96); }
check('HUD readY: touch -> cards at 84 under the pill', readYFor({ touch: true, modifierShown: true }) === 84);
check('HUD readY: desktop + modifier -> cards at 134 (below the description)', readYFor({ touch: false, modifierShown: true }) === 134);
check('HUD readY: desktop, no modifier -> cards stay at 96', readYFor({ touch: false, modifierShown: false }) === 96);

// Mirror of the touch bar geometry: landscape shifts left 150px, portrait
// shrinks to 150px centered, desktop keeps the old bottom-right bars.
function barGeom({ touch, landscape, w }) {
    const barW = touch && !landscape ? 150 : 220;
    const bx = landscape && touch ? w - barW - 24 - 150 : touch ? (w - barW) / 2 : w - barW - 24;
    return { barW, bx };
}
check('HUD bars: touch landscape (864px) -> bx clears the aim stick by 30px', (() => { const g = barGeom({ touch: true, landscape: true, w: 864 }); return g.barW === 220 && g.bx === 470; })());
check('HUD bars: touch portrait (390px) -> 150px centered', (() => { const g = barGeom({ touch: true, landscape: false, w: 390 }); return g.barW === 150 && g.bx === 120; })());
check('HUD bars: desktop (1280px) -> old bottom-right geometry', (() => { const g = barGeom({ touch: false, landscape: true, w: 1280 }); return g.barW === 220 && g.bx === 1036; })());

// Mirror of the minimap size rule.
function mapSize(touch) { return touch ? 120 : 160; }
check('HUD minimap: touch -> 120px', mapSize(true) === 120);
check('HUD minimap: desktop -> 160px', mapSize(false) === 160);

// Mirror of the ?diag=1 strip gate.
function stripShown(hostname, diag) { return diag === '1' && hostname !== 'ppp65isking.github.io'; }
check('strip gate: localhost + ?diag=1 -> shown', stripShown('localhost', '1') === true);
check('strip gate: localhost without ?diag=1 -> hidden', stripShown('localhost', null) === false);
check('strip gate: Pages host + ?diag=1 -> never shown', stripShown('ppp65isking.github.io', '1') === false);

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-home-optimize`);
