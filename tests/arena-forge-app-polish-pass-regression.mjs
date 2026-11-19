// Arena Forge app polish pass (2026-11-19, Anthony's order: overhaul the
// app from the ground up):
// X4 one font (Trebuchet stack, matching #appHome) across all app screens,
// X6 :active press feedback, X7 results buttons join the haptics delegate,
// X5 safe-area insets on tournament / save modal / help overlay,
// H1 shop tab highlight is honest + resets on close,
// H2 cold-start fallback so a hero-render throw can't leave a blank home,
// H5 Brick Rush button text can't overflow its quick-row slot on 360px,
// P2 quest-board tabs scroll horizontally, P3 season claim buttons get the
// 40px min-height, P4 one board name ("Quest Board"),
// S1 shop cards go single-column under 400px,
// SE2 one named version constant, SE3 honest haptics copy,
// save modal gains an Escape-key closer like profile / quest board.
// Text/layout only: no mechanics, numbers, or core-kit changes; website
// untouched (shared overlays are restyled through .native-app rules, never
// by editing their inline styles); no banned disabled-brawler word anywhere.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const styles = read('styles.css');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- X4: one font — Trebuchet stack, matching #appHome ---
check('home shell is Trebuchet (the pick)', game.includes("font-family:'Trebuchet MS','Gill Sans','Verdana',sans-serif;color:#fff;background:linear-gradient(160deg,#06101f"));
check('app-mode font override covers shop + quest board + tournament + save modal + solo panel',
    game.includes(".native-app .brawe-shop-overlay,.native-app #questBoardOverlay,.native-app .app-tournament-overlay,.native-app #saveCodeModal,.native-app #solo-td-panel{font-family:'Trebuchet MS','Gill Sans','Verdana',sans-serif !important}"));
check('touch HUD root already falls back to Trebuchet (second in its stack, so no app override is needed there)',
    game.includes("#mobileControlsRoot{z-index:120;font-family:'Outfit','Trebuchet MS',sans-serif}"));
check('no app-scoped rule touches the touch HUD root (the mobile-app suite forbids it — the sticks must never be hidden)',
    !game.includes('.native-app #mobileControlsRoot'));
check('results overlay is Trebuchet in styles.css',
    styles.includes(".match-results-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:18px;box-sizing:border-box;overflow:auto;background:var(--af-overlay-backdrop);color:#fff;font-family:Trebuchet MS,Arial,sans-serif}"));
check('save modal panel is Trebuchet',
    game.includes("font-family:'Trebuchet MS','Gill Sans','Verdana',sans-serif\">"));
check('website fonts left alone: shop inline font still Outfit, app override wins only in app mode',
    game.includes("font-family:'Outfit',sans-serif;user-select:none;padding:14px"));

// --- X6: :active press feedback (transform/brightness, CSS-only) ---
check('tab buttons press in', game.includes("#appHomeTabs button:active{transform:scale(.96);filter:brightness(1.18)}"));
check('quick buttons press in', game.includes(".app-quick-btn:active{transform:scale(.96);filter:brightness(1.22)}"));
check('kit slots press in', game.includes(".app-kit-slot:active{transform:scale(.97);filter:brightness(1.25)}"));
check('event slots press in', game.includes(".app-event-slot:active{transform:scale(.98);filter:brightness(1.2)}"));
check('shop cards press in (app mode)', game.includes(".native-app .brawe-shop-card:active{transform:scale(.98);filter:brightness(1.22)}"));

// --- X7: results buttons join the phase-4 haptics delegate ---
check('results buttons buzz through the delegate',
    game.includes("if (event.target.closest('.match-results-overlay button')) appBuzz(10);"));
check('phase-4 delegate selector stays verbatim',
    game.includes("if (event.target.closest('.brawe-shop-overlay button, #questBoardOverlay button, .app-tournament-overlay button, .brick-bon-v2-overlay button')) appBuzz(10);"));

// --- X5: safe-area insets on the overlays that lacked them ---
check('tournament overlay padding uses safe-area insets',
    game.includes(".native-app .app-tournament-overlay{padding:max(14px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left)) !important}"));
check('save modal padding uses safe-area insets',
    game.includes("padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box'"));
check('help overlay padding uses safe-area insets',
    game.includes("padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:rgba(2,8,18,.82)"));

// --- H1: shop tab highlight is honest, resets when the shop closes ---
check('opening shop sets the tab state honestly',
    game.includes("if (tab === 'shop') { appHomeTab = tab; syncAppHome(); watchAppShopClose(); }") &&
    game.includes("if (tab === 'shop') { if (typeof openHomeShop === 'function') openHomeShop(); return; }"));
check('shop close is watched and hands the tab back to home',
    game.includes("function watchAppShopClose() {") &&
    game.includes("new MutationObserver(() => {") &&
    game.includes("if (appHomeTab === 'shop') { appHomeTab = 'home'; syncAppHome(); }") &&
    game.includes("appShopCloseObserver.observe(document.body, { childList: true, subtree: false });"));

// --- H2: cold-start fallback ---
check('first sync is still deferred past initial evaluation',
    game.includes("if (typeof setTimeout === 'function') setTimeout(syncAppHome, 0);")); // syncAppHome itself is guarded below, so the deferred call can't throw out
check('hero render is try/caught with a fallback tile',
    game.includes("try { renderAppHomeHero(); } catch (_) { try { renderAppHomeHeroFallback(); } catch (_) {} }") &&
    game.includes("function renderAppHomeHeroFallback() {") &&
    game.includes('hero.innerHTML = `<div class="app-hero-portrait app-hero-fallback">'));
check('top + event-chip renders are guarded too',
    game.includes("try { renderAppHomeTop(); } catch (_) {}") &&
    game.includes("try { renderAppHomeEventChip(); } catch (_) {}"));

// --- H5: Brick Rush button text can't overflow on a 360px phone ---
check('Brick Rush quick-row button clips with an ellipsis',
    game.includes(".native-app #appHomeQuickRow #dailyBrickRushBtn{flex:1 1 0;min-width:96px;padding:10px 8px !important;border-radius:12px !important;font-size:13px !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important}"));
check('quick-row buttons still wrap as a row',
    game.includes("#appHomeQuickRow{flex:none;display:flex;gap:8px;padding:8px 2px 0;flex-wrap:wrap}"));

// --- P2: quest-board tabs scroll horizontally ---
check('quest tab row no longer wraps, scrolls on x',
    game.includes("tabRow.style.flexWrap = 'nowrap';") &&
    game.includes("tabRow.style.overflowX = 'auto';"));
check('app-mode tab row scrolls with hidden scrollbar, buttons stay put',
    game.includes(".native-app #questBoardOverlay .app-quest-tabrow{flex-wrap:nowrap !important;overflow-x:auto !important;") &&
    game.includes(".native-app #questBoardOverlay .app-quest-tabrow button{flex:none !important}"));

// --- P3: season claim buttons match the 40px core claim buttons ---
check('season quest claim button has the 40px min-height',
    game.includes("claimBtn.style.minHeight = '40px';"));
check('core quest claim button still 40px min-height',
    game.includes("min-height:40px;border:none;border-radius:8px;font-weight:900;"));

// --- P4: one name for the quest board — "Quest Board" ---
check('panel title is Quest Board', game.includes("title.textContent = 'Quest Board';"));
check('board aria-label is Quest Board', game.includes("overlay.setAttribute('aria-label', 'Quest Board');"));
check('quick-row button names the board', game.includes('📜 QUESTS<small>QUEST BOARD</small>'));
check('subtitle says quests, not contracts', game.includes("boardSubtitle.textContent = 'Complete quests, claim rewards, and climb the Season Pass.';"));
check('old Contract Board name is gone', !game.includes('Contract Board'));
check('season tab is named Season Pass, like everywhere else (round 2: Core Circuit Pass renamed)',
    game.includes("makeTab('season', '⚡ Season Pass')"));
check('no Core Circuit Pass user-facing string remains', !game.includes('Core Circuit Pass'));

// --- S1: shop cards single-column under 400px ---
check('shop cards go single-column under 400px with a tighter header',
    game.includes("@media (max-width:400px){.native-app .brawe-shop-content>div{grid-template-columns:1fr !important}.native-app .brawe-shop-title{font-size:16px !important}.native-app .brawe-shop-header{padding:10px !important;gap:6px}}"));
check('wider shop grid still two-plus columns (160px min)',
    game.includes(".native-app .brawe-shop-content>div{grid-template-columns:repeat(auto-fill,minmax(160px,1fr)) !important}"));
check('shop header still wraps on desktop widths',
    game.includes(".native-app .brawe-shop-header{padding:12px !important;flex-wrap:wrap !important;gap:8px}"));

// --- SE2: one named version constant ---
check('version is a single named constant',
    game.includes("const APP_VERSION_LABEL = 'APK v1.0';") &&
    game.includes("Arena Forge · ${APP_VERSION_LABEL}<br>"));
check('version string appears exactly once in game.js (the constant)',
    game.split('APK v1.0').length - 1 === 1);

// --- SE3: honest haptics copy ---
check('haptics label covers all app taps, not just in-match buttons',
    game.includes('Small vibration when you tap buttons, in the app and in matches.'));
check('old in-match-only haptics copy is gone', !game.includes('in-match buttons'));

// --- Save modal: Escape-key closer ---
check('save modal closes on Escape like profile / quest board',
    game.includes("const saveCodeEscape = (event) => { if (event.key === 'Escape' && modal.style.display !== 'none') { event.stopPropagation(); closeSaveCodeModal(); } };") &&
    game.includes("document.addEventListener('keydown', saveCodeEscape);"));
check('save modal backdrop click still closes it',
    game.includes("modal.addEventListener('click', (event) => { if (event.target === modal) closeSaveCodeModal(); });"));

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-polish-pass`);
