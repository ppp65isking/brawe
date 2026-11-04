// Home screen redesign (ordered 2026-11-03, chunky mobile-game home layout):
//  * index.html restructures the home screen into top bar / left rail /
//    center brawler stage / right rail / bottom bar with a large PLAY
//    button, keeping every existing home element ID and JS wiring intact.
//    The unreferenced wrappers (homeMain, homePlaySection,
//    homePersonalPanel) are gone; no JS referenced them.
//  * home-brawl-style.css (loaded last) owns the reskin + mobile fill
//    (dynamic viewport units + safe-area insets, responsive breakpoints).
//    It never sets #homeScreen display — match code hides the home screen
//    by toggling its inline display, and that must keep working.
//  * Fullscreen persistence: the choice is stored in localStorage and
//    re-requested on the first tap/keypress after a reload (browsers drop
//    fullscreen on reload and require a gesture). In-app navigation never
//    exits fullscreen by itself: exitFullscreen lives only in
//    toggleGameFullscreen. The silent restore path never alerts (iPhones
//    have no fullscreen API; the button's Add-to-Home-Screen fallback
//    messaging stays the iPhone path).
//  * No imported terms: neither new file may contain the phrase
//    "Brawl Stars" (visual layout inspiration only).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../home-brawl-style.css', import.meta.url), 'utf8');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) passed++;
  else failures.push(name);
}
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' not found');
  let i = src.indexOf('{', start);
  let depth = 0;
  let inS = null;
  let esc = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nxt === '/') { blockComment = false; i++; } continue; }
    if (inS) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inS) inS = null;
      continue;
    }
    if (ch === '/' && nxt === '/') { lineComment = true; continue; }
    if (ch === '/' && nxt === '*') { blockComment = true; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced ' + name);
}
const idCount = (id) => (html.match(new RegExp('id="' + id + '"', 'g')) || []).length;

// ---------- (a) stylesheet wired last + zones exist ----------
check('home-brawl-style.css linked from index.html', html.includes('home-brawl-style.css'));
check('stylesheet link comes after kit-redesign.css (last in cascade)',
  html.indexOf('home-brawl-style.css') > html.indexOf('kit-redesign.css'));
for (const id of ['homeBsLeft', 'homeBsCenter', 'homeBsRight', 'homeBsBottom']) {
  check('new zone present exactly once: ' + id, idCount(id) === 1);
}

// ---------- (b) every preserved home ID present exactly once ----------
const preserved = ['homeScreen', 'homePanel', 'homeHeader', 'homeMenuBtn', 'homeTitle',
  'homeWelcomeLine', 'homeProfileChip', 'homeProfileChipName', 'homeCurrencyBar',
  'fullscreenBtn', 'homeLobbyNav', 'homeCollectionNav', 'homeEventsNav', 'homeShopNav',
  'homeActionRow', 'brawlerBtn', 'homeLobbyView', 'homeBrawlerCard', 'homeEventsView',
  'homeModesSection', 'homeModeCompactRow', 'showdownModeRow', 'homeSeasonPulse',
  'homeFeaturedOffer', 'homeCareerSnapshot', 'homeRankCard', 'homeGreeting',
  'homeDailyBrief', 'homeSelectedEventCard', 'homeSelectedEventIcon',
  'homeSelectedEventName', 'homeSelectedEventRule', 'homeProgressDock',
  'homeQuickActions', 'startMatch', 'homePersonalPanel', 'homeUtilityDetails', 'homeUtilityRow',
  'homeMobileNav', 'homeMobileLobby', 'homeMobileFighters', 'homeMobileEvents',
  'homeMobileShop', 'homeMobileMore'];
for (const id of preserved) check('preserved id exactly once: ' + id, idCount(id) === 1);
for (const id of ['homeMain', 'homePlaySection']) {
  check('dropped unreferenced wrapper gone: ' + id, idCount(id) === 0);
}
check('homeScreen keeps its inline display:flex (match hide toggles it)',
  html.includes('id="homeScreen" style="position:fixed;inset:0;display:flex'));

// ---------- (c) reskin + mobile fill in the new stylesheet ----------
check('panel grid areas cover top/strip/left/center/right/bottom/tools',
  css.includes('"top top top"') && css.includes('"left center right"') && css.includes('"bottom bottom bottom"'));
check('dynamic viewport units used', css.includes('100dvh'));
check('safe-area insets used', css.includes('env(safe-area-inset-'));
check('PLAY is in-flow (not absolute) in the bottom bar',
  css.includes('#startMatch') && /#homeScreen #startMatch \{[^}]*position: static !important/s.test(css));
check('ranked card explicitly re-shown in the bottom bar',
  /#homeScreen #homeBsBottom #homeRankCard \{[^}]*display: block !important/s.test(css));
check('medium breakpoint present', css.includes('@media (max-width: 980px)'));
check('phone breakpoint present', css.includes('@media (max-width: 700px)'));
check('short landscape breakpoint present',
  css.includes('@media (pointer: coarse) and (orientation: landscape) and (max-height: 540px)'));
check('stylesheet never sets #homeScreen display',
  !/#homeScreen \{[^}]*display\s*:/s.test(css));

// ---------- (d) fullscreen persistence wiring ----------
check('pref key defined', game.includes("const FULLSCREEN_PREF_KEY = 'arenaForgeFullscreenPref';"));
for (const fn of ['setFullscreenPref', 'wantsFullscreenRestore', 'requestGameFullscreenSilent', 'armFullscreenRestoreOnGesture']) {
  check('pref helper defined: ' + fn, game.includes('function ' + fn + '('));
}
check('toggle enter stores the preference', game.includes('setFullscreenPref(true);'));
check('toggle exit clears the preference', game.includes('setFullscreenPref(false);'));
check('fullscreenchange + webkitfullscreenchange listeners present',
  game.includes("document.addEventListener('fullscreenchange'") &&
  game.includes("document.addEventListener('webkitfullscreenchange'"));
check('restore armed at boot', game.includes('armFullscreenRestoreOnGesture();'));
check('restore skips taps on the fullscreen buttons',
  game.includes("closest('#fullscreenBtn, #mobileFullscreenBtn')"));
check('silent restore path never alerts',
  !extractFn(game, 'requestGameFullscreenSilent').includes('alert(') &&
  !extractFn(game, 'armFullscreenRestoreOnGesture').includes('alert('));
check('profile chip opens the existing profile',
  game.includes("getElementById('homeProfileChip')?.addEventListener('click', () => openPlayerProfile())"));
check('chip name synced in refreshPersonalizedHome',
  game.includes("getElementById('homeProfileChipName')"));

// ---------- (e) exitFullscreen lives ONLY in toggleGameFullscreen ----------
const toggleSrc = extractFn(game, 'toggleGameFullscreen');
const countIn = (src, re) => (src.match(re) || []).length;
check('no exitFullscreen outside toggleGameFullscreen',
  countIn(game, /exitFullscreen/g) === countIn(toggleSrc, /exitFullscreen/g) &&
  countIn(game, /webkitExitFullscreen/g) === countIn(toggleSrc, /webkitExitFullscreen/g) &&
  countIn(game, /exitFullscreen/g) > 0);

// ---------- (f) pref helpers behave (evaluated with a stub store) ----------
{
  const store = new Map();
  const sandbox = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext("const FULLSCREEN_PREF_KEY = 'arenaForgeFullscreenPref';" + extractFn(game, 'setFullscreenPref') + ';' + extractFn(game, 'wantsFullscreenRestore') + ';', sandbox);
  check('pref: empty store means no restore', vm.runInContext('wantsFullscreenRestore();', sandbox) === false);
  vm.runInContext('setFullscreenPref(true);', sandbox);
  check('pref: set(true) stores 1 and wants restore', store.get('arenaForgeFullscreenPref') === '1' && vm.runInContext('wantsFullscreenRestore();', sandbox) === true);
  vm.runInContext('setFullscreenPref(false);', sandbox);
  check('pref: set(false) clears and wants no restore', !store.has('arenaForgeFullscreenPref') && vm.runInContext('wantsFullscreenRestore();', sandbox) === false);
}

// ---------- (g) wording: no imported terms in the new files ----------
check('no "Brawl Stars" phrase in index.html', !/Brawl Stars/i.test(html));
check('no "Brawl Stars" phrase in new stylesheet', !/Brawl Stars/i.test(css));


// ---------- (h) HOTFIX 2026-11-04: dead home buttons + clipped layout ----------
// Root cause: PR #75 dropped #homePanel's inline pointer-events:auto and
// no stylesheet restored it, so every in-panel button inherited
// pointer-events:none from #homeScreen. These checks pin the repair.
check('hotfix: panel re-enables pointer events', /#homeScreen\s+#homePanel\s*\{[^}]*pointer-events:\s*auto/.test(css));
check('hotfix: wrapper still pointer-events:none (canvas show-through kept)', /id="homeScreen"[^>]*pointer-events:none/.test(html));
check('hotfix: title wrapper re-shown', /#homeScreen\s+#homeHeader\s+\.home-brand-lockup\s*>\s*div\s*\{[^}]*display:\s*block/.test(css));
check('hotfix: action row back in-flow (no absolute float over header)', /#homeScreen\s+#homeBsLeft\s+#homeActionRow\s*\{[^}]*position:\s*static/.test(css));
check('hotfix: events view is flex column again (scrolls on desktop)', /#homeScreen\s+#homeEventsView\.is-active\s*\{[^}]*display:\s*flex/.test(css));
check('hotfix: card pseudo-elements never eat clicks', /#homeBrawlerCard::after\s*\{[^}]*pointer-events:\s*none/.test(css));
check('hotfix: desktop panel fits screen (height auto, overflow visible)', /@media\s*\(min-width:\s*981px\)/.test(css) && /#homePanel\.home-bs-panel\s*\{[^}]*height:\s*auto/.test(css) && /#homePanel\.home-bs-panel\s*\{[^}]*overflow:\s*visible/.test(css));
check('hotfix: desktop screen scrolls', /@media\s*\(min-width:\s*981px\)[\s\S]*?#homeScreen\s*\{[^}]*overflow-y:\s*auto/.test(css));
check('hotfix: desktop fullscreen button shows text label', /#homeScreen\s+#fullscreenBtn\s*\{[^}]*text-indent:\s*0/.test(css) && /#fullscreenBtn::after\s*\{[^}]*content:\s*none/.test(css));
check('hotfix: home stylesheet cache-buster bumped', html.includes('home-brawl-style.css?v=20261104-home-cleanup1') && !html.includes('20261103-home-bs1') && !html.includes('20261104-home-hotfix1'));
{
  const restoreFn = extractFn(game, 'armFullscreenRestoreOnGesture');
  check('hotfix: fullscreen restore skips real in-match button id', restoreFn.includes('#mobileFullscreenBtn') && !restoreFn.includes('#matchFullscreenBtn'));
}

// ---------- (i) CLEANUP 2026-11-04: smarter home screen ----------
// Drawer toggle restored, 44px tap floor, dead strip row gone, and a
// phone path for every shortcut that used to die with a hidden zone.
// (The coordinator's brief said Ranked/Duels/Brawler Lab/Training/
// Tutorial live in #homeQuickActions; verified in code they actually
// live in #homeActionRow inside the hidden left rail — so the phone
// path covers BOTH the dock and the rail, not just the dock.)
const mediaBlock = (startMarker) => {
  const start = css.indexOf(startMarker);
  assert.notEqual(start, -1, startMarker + ' not found');
  const next = css.indexOf('@media', start + startMarker.length);
  return next === -1 ? css.slice(start) : css.slice(start, next);
};
check('cleanup: drawer summary restored as a visible toggle',
  /#homeScreen\s+#homeUtilityDetails\s*>\s*summary\s*\{[^}]*display:\s*flex/.test(css) &&
  css.includes('#homeUtilityDetails > summary::after'));
check('cleanup: drawer defaults to collapsed (no open attr, boot closes it)',
  !/id="homeUtilityDetails"[^>]*\bopen\b/.test(html) &&
  game.includes('homeUtilityDetails.open = false'));
check('cleanup: menu + MORE still toggle the drawer',
  game.includes("getElementById('homeMenuBtn')?.addEventListener('click',toggleHomeTools)") &&
  game.includes("getElementById('homeMobileMore')?.addEventListener('click',toggleHomeTools)"));
check('cleanup: 44px floor on quick-action buttons',
  /#homeScreen\s+#homeQuickActions\s+(button|a)[^}]*min-height:\s*44px/.test(css));
check('cleanup: 44px floor on utility-drawer buttons',
  /#homeScreen\s+#homeUtilityRow\s+(button|a)[^}]*min-height:\s*44px/.test(css));
check('cleanup: 44px floor on mobile-nav buttons',
  /#homeMobileNav\s+button\s*\{[^}]*min-height:\s*44px/.test(css));
check('cleanup: mode-info close button is 44x44 (overlay lives on body, unprefixed rule)',
  /\.home-mode-info-close\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/.test(css));
check('cleanup: no absolute float left on the action row in this sheet',
  !/#homeActionRow[^}]*position:\s*absolute/.test(css));
{
  const stripBlock = mediaBlock('@media (max-width: 850px)');
  check('cleanup: dead strip row gone at ≤850px (strip hidden AND no strip grid row)',
    stripBlock.includes('.home-command-strip { display: none') && !stripBlock.includes('"strip'));
}
{
  const phoneBlock = mediaBlock('@media (max-width: 700px)');
  check('cleanup: phone path — progression dock visible in the bottom bar, not hidden',
    phoneBlock.includes('#homeProgressDock { display: flex') && !phoneBlock.includes('#homeProgressDock { display: none'));
  check('cleanup: phone path — left rail becomes an action strip (nav stays hidden, action row shown)',
    phoneBlock.includes('#homeBsLeft #homeActionRow') && phoneBlock.includes('#homeBsLeft .home-top-nav { display: none') && !phoneBlock.includes('#homeBsLeft { display: none'));
  check('cleanup: phone grid keeps a row for the action strip',
    phoneBlock.includes('"left"'));
}
{
  const landscapeBlock = mediaBlock('@media (pointer: coarse)');
  check('cleanup: landscape phone path — dock spans a full bottom row, action strip row present',
    landscapeBlock.includes('"left left"') && landscapeBlock.includes('grid-column: 1 / -1'));
}
check('cleanup: empty right-rail zones collapse instead of blank boxes',
  /#homeScreen\s+#homeBsRight\s+\.home-season-pulse:empty[^}]*display:\s*none/.test(css) &&
  /#homeScreen\s+#homeBsRight\s+\.home-career-snapshot:empty[^}]*display:\s*none/.test(css));
for (const id of ['brickBonBtn', 'playerProfileBtn', 'pinsHubBtn', 'brickRoadBtn',
  'soulSummonerBtn', 'gemShopBtn', 'downloadSaveBtn', 'importSaveBtn',
  'dailyBrickRushBtn', 'eventHubBtn', 'seasonPassBtn', 'dailyWeeklyQuestBtn']) {
  const assigns = game.match(new RegExp("\\.id\\s*=\\s*['\"]" + id + "['\"]", 'g')) || [];
  check('cleanup: JS home button created exactly once: ' + id, assigns.length === 1);
}
check('cleanup: no "Brawl Stars" phrase in cleanup rules', !/Brawl Stars/i.test(css));

console.log(`home-screen-brawl-style: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
