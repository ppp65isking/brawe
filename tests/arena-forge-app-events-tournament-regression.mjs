// Arena Forge app Events + Tournament (2026-11-19, app overhaul build D):
// tournament picker cards show portrait + role + power, event slots show
// a real map name and a per-slot countdown where the data has one, the
// Events 1s countdown interval stops when the view hides, and the
// bracket gets a jump-to-my-match button. Layout/UX only — no mechanics,
// numbers, or core-kit changes; website untouched.
// Source-presence + extracted-function behavior mirrors.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- T1: tournament picker cards (openTournamentBrawlerPicker) ---
const pickerStart = game.indexOf('function openTournamentBrawlerPicker(leagueId) {');
const pickerEnd = game.indexOf('function tournamentEntrantLabel(e) {', pickerStart);
const picker = pickerStart !== -1 && pickerEnd !== -1 ? game.slice(pickerStart, pickerEnd) : '';
check('picker function exists', pickerStart !== -1 && pickerEnd !== -1);
check('picker card renders a portrait via getBrawlerPortraitMarkup', picker.includes('getBrawlerPortraitMarkup(id)'));
check('picker portrait call is guarded so one bad read cannot blank the card', picker.includes("try { portrait = getBrawlerPortraitMarkup(id) || ''; } catch (_) { portrait = ''; }"));
check('picker card shows the brawler role', picker.includes("brawlerData[id].role") && picker.includes('${role}'));
check('picker card shows POWER from getEffectiveBrawlerProgress', picker.includes('getEffectiveBrawlerProgress(id)') && picker.includes('POWER ${power}'));
check('picker portrait has a sized disc wrapper + CSS so art cannot blow out the card', picker.includes('app-tournament-picker-portrait') && game.includes('.app-tournament-picker-portrait{width:84px;height:84px;') && game.includes('.app-tournament-picker-portrait svg{width:92%;height:92%;'));
check('picker still shows name + id', picker.includes('<h3>${displayName}</h3>') && picker.includes('${id.toUpperCase()}'));
// Pick / confirm flow unchanged: tap picks, label names the lock, confirm
// is disabled until a pick, confirm builds the bracket and opens it.
check('pick flow unchanged: tap sets picked + label + enables confirm', picker.includes('picked = id;') && picker.includes('Picked: ${displayName} — LOCKED for the tournament') && picker.includes('confirmBtn.disabled = false;'));
check('confirm flow unchanged: generateTournamentBracket + set + open bracket', picker.includes('generateTournamentBracket(leagueId, picked)') && picker.includes('setTournamentState(state);') && picker.includes('openTournamentBracket();'));
check('confirm still guarded by a pick and starts disabled', picker.includes('if (!picked) return;') && picker.includes('confirmBtn.disabled = true;'));
check('picker BACK still returns to the hub', picker.includes("openTournamentHub();"));

// --- E2: real map names on event slots (appEventMapName) ---
check('appEventMapName helper exists', game.includes('function appEventMapName(id) {'));
check('slot html calls appEventMapName and renders a map line', game.includes('const mapName = appEventMapName(id);') && game.includes('<span class="app-event-map">'));
check('map line has app CSS', game.includes('.app-event-slot .app-event-map{'));
check('map helper mirrors the HUD map label (showdown theme default)', game.includes('return getActiveShowdownTheme().name || null;'));
check('map helper uses the HUD named arenas (Mirror / Vault / Foundry / Knock / Damage Filler / Prop Hunt)', game.includes("if (id === 'mirror') return 'Mirror Arena';") && game.includes("if (id === 'brick_vault') return 'Vault Siege Arena';") && game.includes("return 'Three-Lane Foundry';") && game.includes("if (id === 'knock_donate') return 'Knock n Donate Arena';") && game.includes("if (id === 'damage_filler') return 'Damage Filler Arena';") && game.includes("if (id === 'prop_hunt') return 'Prop Hunt — Crown Collapse';"));
check('map helper uses the tournament Champion Ring', game.includes("if (id === 'tournament') return TOURNAMENT_MAP_NAME;"));
check('map helper labels the Duels arena and leaves friendly nameless (friendly still picks its map at launch)', game.includes("if (id === 'duels') return 'Duels Arena';") && game.includes("if (id === 'custom_clash') return null;"));

// Extract appEventMapName and run it for real with stubbed theme/map fns.
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) return null;
    const end = src.indexOf('\n    }', start);
    if (end === -1) return null;
    return src.slice(start, end + '\n    }'.length);
}
const mapFnSrc = extractFunction(game, 'appEventMapName');
check('appEventMapName source extracts cleanly', !!mapFnSrc);
let appEventMapName = null;
if (mapFnSrc) {
    const factory = new Function('getActiveShowdownTheme', 'TOURNAMENT_MAP_NAME', `${mapFnSrc}; return appEventMapName;`);
    appEventMapName = factory(() => ({ name: 'Verdant Delta' }), "Champion's Ring");
}
if (appEventMapName) {
    check('map: showdown modes use the active showdown theme name', appEventMapName('solo') === 'Verdant Delta' && appEventMapName('duo') === 'Verdant Delta' && appEventMapName('christmas_showdown') === 'Verdant Delta');
    check('map: trio uses Trio Showdown Arena, not the theme', appEventMapName('trio') === 'Trio Showdown Arena');
    check('map: arena forge uses Three-Lane Foundry', appEventMapName('arena_forge') === 'Three-Lane Foundry');
    check('map: named arenas match the HUD labels', appEventMapName('mirror') === 'Mirror Arena' && appEventMapName('damage_filler') === 'Damage Filler Arena' && appEventMapName('brick_vault') === 'Vault Siege Arena' && appEventMapName('knock_donate') === 'Knock n Donate Arena' && appEventMapName('prop_hunt') === 'Prop Hunt — Crown Collapse');
    check('map: tournament uses Champion\'s Ring', appEventMapName('tournament') === "Champion's Ring");
    check('map: duels is Duels Arena, friendly still has no map line', appEventMapName('duels') === 'Duels Arena' && appEventMapName('custom_clash') === null);
    check('map: boss + tower modes fall back to the showdown theme (HUD default)', appEventMapName('orbo_boss') === 'Verdant Delta' && appEventMapName('brawe_ball') === 'Verdant Delta' && appEventMapName('chaos_crown') === 'Verdant Delta' && appEventMapName('tower_defense') === 'Verdant Delta');
    // Every id the Events view can actually render gets a string or an
    // explicit null — never undefined, never a crash.
    const extractList = (name) => {
        const m = game.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`));
        return m ? eval(m[1]) : null; // eslint-disable-line no-eval
    };
    const popular = extractList('HOME_POPULAR_MODE_IDS');
    const pool = extractList('HOME_DAILY_ROTATION_POOL');
    const extra = ['christmas_showdown'];
    const allIds = [...new Set([...(popular || []), ...(pool || []), ...extra])];
    check('map: every popular + rotation id resolves without throwing', allIds.length > 10 && allIds.every((id) => { try { const v = appEventMapName(id); return v === null || (typeof v === 'string' && v.length > 0); } catch (_) { return false; } }));
    check('map: every popular slot shows a real map name except friendly (no single map)', (popular || []).every((id) => (id === 'custom_clash' ? appEventMapName(id) === null : typeof appEventMapName(id) === 'string')));
}

// --- E1: per-slot countdowns where the data has one ---
check('slot html renders a countdown span when opts.countdown is daily', game.includes("const countdown = opts.countdown === 'daily' ? '<span class=\"app-event-countdown\" data-app-countdown=\"daily\"></span>' : '';") && game.includes('${countdown}'));
check('rotating slots pass countdown daily (daily rotation ends at midnight)', game.includes("appEventSlotHtml(id, { countdown: 'daily' })"));
check('popular slots pass no countdown (no expiry data)', game.includes("appEventSlotHtml(id)).join('')") || game.includes('.map((id) => appEventSlotHtml(id)).join'));
check('ticker updates every data-app-countdown element in the view, so slot countdowns tick', game.includes("view.querySelectorAll('[data-app-countdown]').forEach") && game.includes("el.dataset.appCountdown === 'daily'"));
check('season featured card keeps its own countdown', game.includes('data-app-countdown="season"'));
check('rotating section header keeps its daily countdown', game.includes('data-app-countdown="daily"'));

// --- E4: countdown interval stops when the Events view hides ---
check('stop helper clears the interval and nulls it', game.includes('function stopAppEventsCountdown() {') && game.includes("if (typeof clearInterval === 'function') clearInterval(appEventsCountdownTimer);") && game.includes('appEventsCountdownTimer = null;'));
check('start helper guards double-start and arms the 1s tick', game.includes('function startAppEventsCountdown() {') && game.includes("if (typeof setInterval === 'function' && !appEventsCountdownTimer) {") && game.includes('appEventsCountdownTimer = setInterval(tickAppEventCountdowns, 1000);'));
check('buildAppEventsView re-arms the timer on every visit (outside the built-once block)', (() => {
    const start = game.indexOf('function buildAppEventsView() {');
    const builtEnd = game.indexOf('startAppEventsCountdown();', start);
    const render = game.indexOf('renderAppEventsView();', start);
    const builtBlock = game.indexOf("if (!appEventsBuilt) {", start);
    return start !== -1 && builtEnd !== -1 && render !== -1 && builtEnd < render && builtEnd > builtBlock;
})());
check('no setInterval for the countdown is armed inside the built-once block any more', !game.includes("appEventsCountdownTimer = setInterval(tickAppEventCountdowns, 1000);\n            }"));
check('setAppHomeTab stops the timer when leaving Events (home / fighters / settings)', game.includes("if (tab !== 'events') stopAppEventsCountdown();"));
check('setAppHomeTab stops the timer AFTER the shop early-return (shop overlay keeps ticking)', (() => {
    const fn = game.indexOf('function setAppHomeTab(tab) {');
    const shop = game.indexOf("if (tab === 'shop')", fn);
    const stop = game.indexOf("if (tab !== 'events') stopAppEventsCountdown();", fn);
    return fn !== -1 && shop !== -1 && stop !== -1 && stop > shop;
})());
// Mirror of the lifecycle: start once, stop on hide, restart on return.
function lifecycleMirror() {
    let timer = null, cleared = [];
    const start = () => { if (!timer) timer = 't1'; };
    const stop = () => { if (timer) { cleared.push(timer); timer = null; } };
    start(); start(); // double visit-start must not double-arm
    const armedOnce = timer === 't1' && cleared.length === 0;
    stop(); // hide the view
    const stopped = timer === null && cleared.length === 1;
    start(); // return to Events
    const rearmed = timer === 't1';
    stop();
    return armedOnce && stopped && rearmed && cleared.length === 2;
}
check('lifecycle mirror: arm once, clear on hide, re-arm on return', lifecycleMirror());

// --- T2: jump to my match ---
check('bracket tracks the player next-match box', game.includes('let playerMatchBox = null;') && game.includes('if (isNext) playerMatchBox = box;'));
check('bracket has a JUMP TO MY MATCH button only when a next match exists', game.includes("if (playerMatch && playerMatchBox) {") && game.includes("jumpBtn.textContent = '◎ JUMP TO MY MATCH';"));
check('jump scrolls the match box into the center of the strip', game.includes("playerMatchBox.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });"));
check('jump has a plain scrollIntoView fallback', game.includes('playerMatchBox.scrollIntoView();'));
check('jump button sits above the rounds strip', (() => {
    const jump = game.indexOf("jumpBtn.textContent = '◎ JUMP TO MY MATCH';");
    const append = game.indexOf('overlay.appendChild(roundsWrap);', jump);
    return jump !== -1 && append !== -1;
})());
check('bracket strip keeps its five round columns + sideways scroll', game.includes("for (let ri = 0; ri < 5; ri++)") && game.includes("col.style.minWidth = '190px';") && game.includes("roundsWrap.style.overflowX = 'auto';"));

// --- Scope guards ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-events-tournament`);
