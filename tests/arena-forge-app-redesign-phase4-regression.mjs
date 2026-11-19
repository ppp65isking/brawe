// Arena Forge app redesign phase 4 (2026-11-19, Anthony's order):
// "Continue redesigning and making updates to app and new ones like new
// fighters screen nav bar now on like smaller to have more space and
// fighters screen u can change gadget and sp now and see everything when
// u click on them." Plus section 4: "make more more more stuff that I
// didn't say for the app" + "Make it a real game app."
//
// 1. Fighters nav bar is one compact row (search + role chips share it),
//    so the cards + detail get ~40px more room, portrait and landscape.
// 2. Kit detail sheet: tapping a gadget/SP slot opens a bottom sheet
//    with name + full description + real data (gadget cooldown from the
//    per-brawler table, unlock/equipped status). The sheet's SELECT button
//    performs the pick via appFightersKitPick (PR #141 flow, verified to
//    write the live playerData progress object + saveProgress()).
//    Core Surge stays display-only. Locked slots are tappable too —
//    the sheet shows the unlock requirement instead of doing nothing.
// 3. "Real game app" polish: tap haptics on the shell (tabs, PLAY, hero,
//    chips, quick row, save button, fighter cards, role chips, event
//    slots, settings rows, kit sheet) via the existing appBuzz helper,
//    one delegated app-mode-only listener for the reused web overlays
//    (shop / quest board / tournament / profile), view-switch fade,
//    phone-keyboard dismissal when tapping chips/cards.
// Text/layout only: no mechanics, numbers, or core-kit changes; website
// untouched; save whitelist NOT widened; diag gate + save-code modal
// untouched; no banned disabled-brawler word anywhere.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- 1. Fighters nav bar: one compact row ---
check('fighters toolbar is one row (search + roles share it)',
    game.includes('.app-fighters-toolbar{flex-direction:row;align-items:center;gap:8px;padding:2px 2px 8px}'));
check('fighters search flexes with a floor, roles flex and scroll beside it',
    game.includes('.app-fighters-search{flex:1 1 150px;min-width:0;width:auto;padding:9px 12px}') &&
    game.includes('.app-fighters-roles{flex:1 1 auto;min-width:0;padding-bottom:0}'));
check('role chips tightened but still readable (12px text)',
    game.includes('.app-fighters-role{padding:6px 10px}'));
check('fighter strip padding tightened',
    game.includes('#appFightersStrip{padding:2px 2px 6px}'));
check('phase 3 strip rules intact (sticky strip, momentum scrolling)',
    game.includes("#appFightersStrip{position:sticky;top:0;z-index:2;") &&
    game.includes('#appFightersStrip{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}') &&
    game.includes('.app-fighters-roles{-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}'));
check('search input has enterkeyhint for the phone keyboard',
    game.includes('enterkeyhint="search"'));
check('tapping a role chip or fighter card dismisses the phone keyboard',
    game.includes("view.querySelector('#appFightersSearch')?.blur();"));

// --- 2. Kit detail sheet ---
check('kit sheet open/close functions exist',
    game.includes('function openAppKitSheet(id, key) {') && game.includes('function closeAppKitSheet() {'));
check('kit slot tap opens the sheet (no direct pick from the tap)',
    game.includes("if (kitBtn) { openAppKitSheet(appFightersState.focused, kitBtn.dataset.appKit); return; }"));
check('locked kit slots are tappable (no disabled attr, aria-disabled instead)',
    game.includes('aria-disabled="${isLocked ? \'true\' : \'false\'}"') &&
    !game.includes("${isLocked ? 'disabled' : ''}"));
check('sheet renders name + full description + status rows',
    game.includes("class=\"app-kit-sheet\"") && game.includes('class="app-kit-sheet-desc"') &&
    game.includes('class="app-kit-sheet-rows"'));
check('sheet shows the gadget cooldown from the real per-brawler table',
    game.includes('getGadgetCooldownMsForBrawler(id, key)') &&
    game.includes('`${Math.round(cdMs / 1000)}s`'));
check('sheet cooldown row only exists for gadgets (star powers have none)',
    game.includes('if (isGadget) {') && game.includes("rows.push({ k: 'COOLDOWN'"));
check('sheet SELECT performs the pick via appFightersKitPick, then closes',
    game.includes('appBuzz(15); appFightersKitPick(id, key); closeAppKitSheet();'));
check('sheet SELECT only exists for unlocked, unequipped gadget/star slots',
    game.includes('const canSelect = (isGadget || isStar) && unlocked && !equipped;'));
check('Core Surge sheet is display-only: full description, no SELECT',
    game.includes("name = 'Core Surge';") && game.includes('getCoreSurgeDescription(id)') &&
    game.includes('const canSelect = (isGadget || isStar)'));
check('sheet closes on backdrop tap and CLOSE button',
    game.includes("if (event.target === overlay || event.target.closest('[data-app-kit-close]')) { closeAppKitSheet(); return; }"));
check('sheet is a bottom sheet (fixed overlay, slide-up, safe-area padding)',
    game.includes('.app-kit-sheet-overlay{position:fixed;inset:0;z-index:100;') &&
    game.includes('@keyframes appKitSheetIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}') &&
    game.includes('calc(16px + env(safe-area-inset-bottom))'));
check('kitSplit is shared by the detail panel and the sheet (one definition)',
    game.includes('const kitSplit = (raw) => {') && game.includes('kitSplit(data[key]'));

// --- appFightersKitPick still writes through (PR #141 flow, verified) ---
check('kit pick writes the live progress object and saves (gadget)',
    game.includes("pData.selectedGadget = key; saveProgress();"));
check('kit pick writes the live progress object and saves (star power)',
    game.includes("pData.selectedStar = value; saveProgress();"));
check('kit pick handles weekly-trial loadouts through the trial setter',
    game.includes("setWeeklyTrialLoadoutChoice(id, 'selectedGadget', key)") &&
    game.includes("setWeeklyTrialLoadoutChoice(id, 'selectedStar', value)"));

// --- Behavior mirror: the real cooldown table drives the sheet's seconds ---
{
    const table = game.match(/const GADGET_COOLDOWN_BY_BRAWLER = \{[\s\S]*?\n  \};/);
    const fn = game.match(/function getGadgetCooldownMsForBrawler\(brawlerId, slot = 'g1'\) \{[\s\S]*?\n  \}/);
    const norm = game.match(/function normalizeGadgetSlot\(slot\) \{[\s\S]*?\n  \}/);
    check('cooldown table + getter extract cleanly for execution', !!(table && fn && norm));
    if (table && fn && norm) {
        const getCd = eval(`(() => { const GADGET_COOLDOWN_MS = 12000; ${table[0]} ${norm[0]} ${fn[0]} return getGadgetCooldownMsForBrawler; })()`);
        check('cooldown mirror: rager g1 is 15000ms (sheet shows 15s)', getCd('rager', 'g1') === 15000);
        check('cooldown mirror: outlit g2 is 15000ms (sheet shows 15s)', getCd('outlit', 'g2') === 15000);
        check('cooldown mirror: carmela_fudge g1 is 8000ms (sheet shows 8s)', getCd('carmela_fudge', 'g1') === 8000);
        check('cooldown mirror: unknown brawler falls back to the 12000ms default', getCd('nope_not_a_brawler', 'g1') === 12000);
    }
}

// --- All 416 kit slots still carry descriptions ---
{
    const start = game.indexOf('const brawlerData = {');
    const endMark = '\n  };\n\n    // Player-facing BRAWE vocabulary';
    const end = game.indexOf(endMark, start);
    check('brawlerData block extracts cleanly', start !== -1 && end !== -1);
    if (start !== -1 && end !== -1) {
        const block = game.slice(start, end);
        const fields = [...block.matchAll(/\b(g1|g2|sp1|sp2)\s*:\s*'((?:[^'\\]|\\.)*)'/g)];
        check('brawlerData still has exactly 416 kit slots (104 brawlers x 4)', fields.length === 416);
        let withDesc = 0;
        for (const [, , raw] of fields) {
            const pi = raw.indexOf('('), ci = raw.indexOf(': ');
            if (pi !== -1 || ci !== -1) withDesc++;
        }
        check('all 416 kit slots still carry a description', withDesc === 416);
    }
}

// --- 3. Tap haptics on the shell (existing appBuzz helper only) ---
check('tab bar taps buzz', game.includes("button.addEventListener('click', () => { appBuzz(10); setAppHomeTab(button.dataset.appTab); });"));
check('PLAY buzzes (12ms)', game.includes('appBuzz(12);'));
check('hero tap buzzes', game.includes("() => { appBuzz(10); setAppHomeTab('fighters'); });"));
check('event chip tap buzzes', game.includes("() => { appBuzz(10); setAppHomeTab('events'); });"));
check('player + season chips buzz', game.includes("() => { appBuzz(10); if (typeof openPlayerProfile === 'function') openPlayerProfile(); setAppDeepLink('profile'); });") && game.includes("() => { appBuzz(10); if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); });"));
check('quick row taps buzz', game.includes("const btn = event.target.closest('[data-app-quick]');\n            if (!btn) return;\n            appBuzz(10);"));
check('save button tap buzzes', game.includes("() => { appBuzz(10); openSaveCodeModal(); });"));
check('fighter strip + role chip taps buzz', game.includes("if (!card) return;\n                appBuzz(10);") && game.includes("if (!chip) return;\n                appBuzz(10);"));
check('event slots + featured cards buzz', game.includes("if (slot) { appBuzz(10); appEventSlotTap(slot.dataset.appEvent); return; }"));
check('settings rows buzz', game.includes("const btn = event.target.closest('[data-app-settings]');\n                if (!btn) return;\n                appBuzz(10);"));
check('hero side cards buzz (stopPropagation still first)', game.includes("event.stopPropagation(); appBuzz(10); setAppHomeTab('events');"));
check('kit sheet opens with a buzz, select buzzes stronger',
    game.includes("document.body.appendChild(overlay);\n        appBuzz(10);") && game.includes('appBuzz(15); appFightersKitPick(id, key);'));
check('delegated app-mode-only buzz listener covers the reused web overlays',
    game.includes("if (event.target.closest('.brawe-shop-overlay button, #questBoardOverlay button, .app-tournament-overlay button, .brick-bon-v2-overlay button')) appBuzz(10);") &&
    game.includes('if (!isNativeAppMode()) return;'));
check('exactly one navigator.vibrate call, inside the guarded appBuzz',
    (game.match(/navigator\.vibrate/g) || []).length === 1 &&
    game.includes("try { if (!appHapticsOn()) return; navigator.vibrate?.(ms); } catch (_) {}"));

// --- View transitions ---
check('switching app views fades the new view in',
    game.includes('#appHomeHeroView.is-active,#appHomeFightersView.is-active,#appHomeEventsView.is-active,#appHomeSettingsView.is-active{animation:appViewIn .16s ease-out}') &&
    game.includes('@keyframes appViewIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'));

// --- Hard limits: desktop, whitelist, diag gate, save-code modal ---
check('desktop HUD cards keep the old geometry (touch sits under the pill)',
    game.includes('const readY = touchHud ? 84 : (hudModifierShown ? 134 : 96)'));
check('desktop modifier block still renders its 3-line block',
    game.includes("const hudModifierShown = !isBossFight && !isDuels && !isTraining && !isSoloTrial && activeShowdownModifier && !isShowdownModifierActive('none');"));
check('save backup whitelist NOT widened',
    game.includes('return /^(brawl|arena_forge|super_granted|shop_|sushi_|tower_|season_)/i.test(String(key || \'\'));'));
check('diagnostic strip gate untouched',
    game.includes("new URLSearchParams(window.location.search || '').get('diag') === '1'"));
check('save-code modal untouched (same opener, same modal)',
    game.includes('function openSaveCodeModal() {'));
check('no sound toggle or progress reset invented',
    !game.includes('soundToggle') && !game.includes('resetProgress'));
check('no banned disabled-brawler word anywhere', !(new RegExp('\\b' + 'cl' + 'uster' + '\\b', 'i')).test(game));

console.log(`phase4: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); for (const f of failures) console.log(' - ' + f); process.exit(1); }
