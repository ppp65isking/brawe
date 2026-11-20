// Arena Forge round 2 bottom-bar redesign (2026-11-19, Anthony's order):
// Brawl Stars-style tab bar — bigger targets, clear active state, proper
// safe-area handling, slim landscape bar, content that never sits under it.
// Layout/UX only: same four destinations, same entry points (setAppHomeTab),
// no mechanics/numbers/core-kit changes. Source-presence + behaviour mirrors.
// Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- Diagnosis pins: the flaws this build fixes ---
// D1 (was): no min-height anywhere — height was content-derived, and the
// <=360px rule shrank buttons to ~46px tall (13px emoji line + 9px label +
// 16px padding + 4px border), under the 48px touch-target floor.
check('portrait tab buttons have a 56px min-height floor',
    game.includes('#appHomeTabs button{min-height:56px;'));
check('narrow phones keep a 48px min-height floor',
    game.includes("@media (max-width:360px){#appHomeTabs button{min-height:48px}"));
// D2 (was): no landscape rule at all — the bar kept its portrait height on
// a ~360px-tall landscape screen (~17% of viewport) and each pill stretched
// to ~370px wide with ~75% dead space (Anthony's screenshot).
check('landscape bar is slimmer: 48px targets, smaller icon and label',
    game.includes("@media (orientation:landscape){#appHomeTabs{max-width:560px;padding:6px 4px 0}#appHomeTabs button{min-height:48px;padding:6px 4px 7px}#appHomeTabs .app-tab-icon{font-size:18px}#appHomeTabs button small{font-size:9px}}"));
check('bar width is capped and centred on wide screens (no stretched pills)',
    game.includes('#appHomeTabs{flex:none;align-self:center;width:100%;max-width:640px;'));
// D3 (was): bare emoji text node at 15px — small, inconsistent across
// devices. Icons now have their own sized span (same four emoji, same order).
check('each tab icon lives in a sized .app-tab-icon span',
    game.includes('<span class="app-tab-icon" aria-hidden="true">🏠</span><small>HOME</small>') &&
    game.includes('<span class="app-tab-icon" aria-hidden="true">👤</span><small>FIGHTERS</small>') &&
    game.includes('<span class="app-tab-icon" aria-hidden="true">📅</span><small>EVENTS</small>') &&
    game.includes('<span class="app-tab-icon" aria-hidden="true">🛒</span><small>SHOP</small>'));
check('tab icon is big and block-level (22px portrait, 20px narrow)',
    game.includes('#appHomeTabs .app-tab-icon{display:block;font-size:22px;line-height:1.1}') &&
    game.includes('#appHomeTabs .app-tab-icon{font-size:20px}'));
// D4 (was): active state was colour-only and the active label stayed dimmed
// (small opacity .75 even when active). Orange kept, plus depth, a
// full-opacity active label, dimmer inactive labels, and aria-current.
check('orange active treatment kept (fill + border + dark text)',
    game.includes('#appHomeTabs button.is-active{background:var(--app-season-accent,#ff9f1c);border-color:var(--app-season-accent-soft,#ffd166);color:var(--app-season-accent-ink,#231303);')); // rebase: the active tab keeps the seasonal accent vars from the tier2-feel re-skin (PR #160) instead of hardcoded orange — same orange by default, recolors per season
check('active tab has chunky depth, not just a colour swap',
    game.includes('box-shadow:0 4px 0 #b96a00,0 8px 16px rgba(255,159,28,.3)'));
check('active label is full opacity, inactive labels are dimmer',
    game.includes('#appHomeTabs button small{display:block;font-size:10px;letter-spacing:.08em;opacity:.6}') &&
    game.includes('#appHomeTabs button.is-active small{opacity:1}'));
check('active tab is announced via aria-current, not just coloured',
    game.includes("if (isCurrentTab) button.setAttribute('aria-current', 'page');") &&
    game.includes("else button.removeAttribute('aria-current');"));
check('tab buttons have a visible keyboard-focus ring',
    game.includes('#appHomeTabs button:focus-visible{outline:3px solid #ffd166;outline-offset:2px}'));
// D5 (was): no touch-action on tab buttons. Press feedback from round 1
// (polish pass) is kept byte-identical — it is pinned by that suite too.
check('tab buttons press in (round 1 press feedback kept)',
    game.includes('#appHomeTabs button:active{transform:scale(.96);filter:brightness(1.18)}'));
check('tab buttons suppress double-tap zoom delay',
    game.includes('touch-action:manipulation'));

// --- Safe area: verified working via the #appHome shell, now pinned ---
// The shell carries padding-bottom:max(8px,env(safe-area-inset-bottom)) and
// the bar is the shell's last flex child, so the inset always lands below
// the bar — it never sits under the Android gesture bar. viewport-fit=cover
// (index.html) is what makes env() live. The bar must not grow a second
// bottom inset that would double-count the shell's.
check('shell still carries the safe-area bottom inset (bar sits above it)',
    game.includes('#appHome{position:fixed;inset:0;') &&
    game.includes('padding-bottom:max(8px,env(safe-area-inset-bottom))'));
check('tab bar is the last child of the app shell (inset lands below it)',
    (() => {
        const shell = game.indexOf('id="appHomeBody"');
        const tabs = game.indexOf('id="appHomeTabs"');
        return shell !== -1 && tabs !== -1 && shell < tabs;
    })());
check('tab bar adds no second bottom safe-area inset (no double-count)',
    !/#appHomeTabs\{[^}]*env\(safe-area-inset-bottom/.test(game));
check('viewport-fit=cover is set so env() insets are live',
    read('index.html').includes('viewport-fit=cover'));

// --- Content clearance: flex layout means no overlap; last row gets air ---
check('app body is a flex-1 scroller above the bar (bar never overlaps it)',
    game.includes('#appHomeBody{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}') &&
    game.includes('#appHomeTabs{flex:none;'));
check('scroll views end 12px clear of the bar (no flush last row)',
    game.includes('#appHomeHeroView,#appHomeFightersView,#appHomeFighterView,#appHomeEventsView,#appHomeSettingsView{padding-bottom:12px}'));
// Toast sits at 84px + inset; the new bar is ~58px portrait / ~50px
// landscape plus 8px top pad plus the shell bottom gap, so 84px still clears.
check('toast still clears the taller bar (84px + safe-area)',
    game.includes('.app-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));'));

// --- Scope: same four destinations, same entry points, nothing else moves ---
check('exactly the same four destinations, in the same order',
    (game.match(/data-app-tab="/g) || []).length === 4 &&
    game.indexOf('data-app-tab="home"') < game.indexOf('data-app-tab="fighters"') &&
    game.indexOf('data-app-tab="fighters"') < game.indexOf('data-app-tab="events"') &&
    game.indexOf('data-app-tab="events"') < game.indexOf('data-app-tab="shop"'));
check('tab taps still route through setAppHomeTab with the tab name',
    game.includes("button.addEventListener('click', () => { appBuzz(10); setAppHomeTab(button.dataset.appTab); });") &&
    game.includes('function setAppHomeTab(tab) {'));
check('SHOP still opens the existing shop overlay (H1 behaviour kept)',
    game.includes("if (tab === 'shop') { if (typeof openHomeShop === 'function') openHomeShop(); return; }"));
check('old <=360px compact rule is untouched (phase 3 suite pins it)',
    game.includes("@media (max-width:360px){#appHomeTabs{gap:4px}#appHomeTabs button{font-size:13px;padding:8px 2px}#appHomeTabs button small{font-size:9px}}"));

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-round2-bottom-bar`);
