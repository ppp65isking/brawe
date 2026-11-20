// Arena Forge fixes round 4 (2026-11-20): Anthony's two items.
//
// ITEM 1 — Web bug: "bug on web about sushi decks so fighters aren't
// loading". Root cause: PR #168 (big-changes deletions) deleted the Slop
// Sushi / Tower Powers deck-ownership system — isSlopSushiLive(),
// hasSlopSushiDeck(), playerData.slopSushi are all gone — and removed the
// fighter-browser declaration
//   const sushiDeckReady = isSlopSushiLive() && hasSlopSushiDeck(id);
// plus the sushi badge block, but left 6 reads of `sushiDeckReady` in the
// fighter-card loop (showList in the brawler-browser overlay). The first
// card render throws `ReferenceError: sushiDeckReady is not defined`
// (line 51083, the boxShadow read — the opacity read on the line above
// short-circuits for the first, unlocked, card), aborting showList() so
// ZERO fighter cards render on web. The app uses the separate
// buildAppFightersView, which is why this is web-only.
// Live jsdom proof (real index.html + game.js, desktop web viewport,
// 127.0.0.1 so isNativeAppMode() is false): BEFORE 0 cards + the
// ReferenceError + runtime recovery panel; AFTER 104 cards, 0 errors
// (108 roster entries; the other 4 — the_deleter, duck, unhitabble, dr0ne
// — have no display data and are skipped with a console warning, which is
// pre-existing intended behaviour, not this bug).
// Fix: complete the #168 deletion — drop the dead sushi-deck branches,
// keeping each expression's false-branch value (no fighter can own a deck
// anymore, so every locked card renders dimmed at 0.68 with the plain
// 'FIGHTER LOCKED' pill). slopsushi-cards.js (the 8-card deck DATA) still
// ships untouched — only the deleted ownership system is gone.
//
// ITEM 2 — Season Pass screen redesign: manage space like Brawl Stars
// does, no pop-ups. Anthony: "Remember what I said about pop ups bro look
// how brawl manges there space this is what we need" + "The 'vault' can be
// the token shop". The pass is now a FULL-SCREEN view, not a centred
// pop-up: #circuitPassOverlay fills the viewport (same id, same
// closeSeasonPassOverlay() closer, same dialog semantics / Escape / focus
// behaviour — the round-3 match-start guarantee is untouched), compact
// header (slim title row + slim level/progress/wallet row, back arrow that
// closes, ✕ kept), reward road in a horizontal row at a glance with the
// current tier scrolled into view on open, compact premium strip, tabs
// pinned to the bottom as a full-width bar: REWARD ROAD / VAULT /
// MISSIONS. VAULT is the token shop renamed (same offers, same costs).
// Layout only: 50 tiers, premium 100 gems / 11,999 coins, tier-50 Holiday
// Lights, tokens/XP, claim flow, XP bands — all unchanged.
// Live jsdom proof (same harness): pass opens full-screen (overlay fixed
// inset 0, padding 0, panel 100% wide / 100dvh, radius 0), 50 tier columns
// with tier 50 HOLIDAY LIGHTS, premium "100 Gems" / "11,999 Coins", VAULT
// tab shows the 5 token offers, back arrow closes, reopen + PLAY removes
// the pass before the match (round-3 guarantee holds live).
// Source-presence + extracted behaviour mirrors (same shape as the
// round-2/round-3 suites); the live boot numbers above are the harness
// evidence, not re-run here (no jsdom in the repo's node_modules).
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const circuitCss = read('circuit-pass.css');
const sushiCards = read('slopsushi-cards.js');
const indexHtml = read('index.html');
const passTokensSrc = read('modules/progression/pass-tokens.js');
const self = read('tests/arena-forge-fixes-round-4-regression.mjs');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a function declaration out of game.js source (same pattern as
// the results-flow / round-2 suites: string/comment aware).
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`missing ${name}`);
    const open = src.indexOf('{', start);
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (line) { if (ch === '\n') line = false; i++; continue; }
        if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
        if (inS) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++; continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i += 2; continue; }
        if (ch === '/' && nxt === '*') { block = true; i += 2; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { inS = ch; i++; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced ${name}`);
}
// Bracket-match a `const NAME = [...]` array literal out of game.js.
function extractConstArray(src, name) {
    const start = src.indexOf(`const ${name} = [`);
    if (start === -1) throw new Error(`missing ${name}`);
    const open = src.indexOf('[', start);
    let depth = 0, i = open, inS = null, esc = false, line = false, block = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (line) { if (ch === '\n') line = false; i++; continue; }
        if (block) { if (ch === '*' && nxt === '/') { block = false; i += 2; } else i++; continue; }
        if (inS) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++; continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i += 2; continue; }
        if (ch === '/' && nxt === '*') { block = true; i += 2; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { inS = ch; i++; continue; }
        if (ch === '[') depth++;
        else if (ch === ']') { depth--; if (depth === 0) return src.slice(open, i + 1); }
        i++;
    }
    throw new Error(`unbalanced ${name}`);
}
// CSS helper (same shape as the round-3 suite): strip comments + strings,
// then walk the text tracking the open @media stack; report the media
// stack at the first occurrence of a selector.
function mediaStackAt(cssText, selector) {
    const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const clean = noComments.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
    const stack = [];
    let depth = 0;
    for (let i = 0; i < clean.length; i++) {
        if (clean.startsWith('@media', i)) {
            const j = clean.indexOf('{', i);
            if (j === -1) break;
            stack.push({ query: clean.slice(i, j).trim(), depth });
            depth++;
            i = j;
            continue;
        }
        if (clean[i] === '{') depth++;
        else if (clean[i] === '}') { depth--; if (stack.length && stack[stack.length - 1].depth === depth) stack.pop(); }
        if (clean.startsWith(selector, i)) return stack.map((s) => s.query);
    }
    return null;
}
const ruleBody = (cssText, selectorStart) => {
    const s = cssText.indexOf(selectorStart);
    if (s === -1) return '';
    const open = cssText.indexOf('{', s);
    const close = cssText.indexOf('}', open);
    return close === -1 ? '' : cssText.slice(open + 1, close);
};

// ================= ITEM 1: sushi decks / fighters loading =================
const wordBoundary = (src, word) => new RegExp(`\\b${word}\\b`, 'gi');
check('item1: zero bare word-boundary "sushiDeckReady" in game.js (the ReferenceError is gone)',
    !wordBoundary(game, 'sushiDeckReady').test(game));
const deletedBrawlerWord = ['clus', 'ter'].join('');
check('item1: zero bare word-boundary deleted-brawler name in game.js + tests (deleted brawler stays deleted)',
    !wordBoundary(game, deletedBrawlerWord).test(game) && !wordBoundary(self, deletedBrawlerWord).test(self));
check('item1: no references to the deleted sushi helpers survive in game.js',
    !game.includes('isSlopSushiLive') && !game.includes('hasSlopSushiDeck') &&
    !game.includes('getActiveSlopSushiDeck') && !game.includes('ensureSlopSushiState') &&
    !game.includes('playerData.slopSushi'));
check('item1: no DECK OWNED / TOWER DECK OWNED pill copy survives (dead deck UI is gone)',
    !game.includes('DECK OWNED') && !game.includes('TOWER DECK OWNED'));
check('item1: card opacity keeps the no-deck behaviour (locked cards dimmed 0.68)',
    game.includes("card.style.opacity = (isDisabled || isLocked) ? '0.68' : '1';"));
check('item1: card boxShadow is the plain prestige glow (no teal deck-owned glow branch)',
    game.includes("card.style.boxShadow = prestige ? `0 0 0 1px rgba(255,255,255,0.08),0 0 18px ${rankAccent}55` : `0 10px 26px rgba(0,0,0,0.34)`;"));
check('item1: locked role label is plain FIGHTER LOCKED',
    game.includes("(isLocked ? 'FIGHTER LOCKED' : data.role.toUpperCase())"));
check('item1: locked pill is plain FIGHTER LOCKED + soul cost, plain colours',
    game.includes("lockedPill.textContent = `FIGHTER LOCKED • ${getSoulUnlockCostForRarity(rarity)} SOULS`;") &&
    game.includes("lockedPill.style.background = '#172942';") &&
    game.includes("lockedPill.style.border = '1px solid #6f91b8';"));
// Behaviour mirrors of the fixed card expressions (same values as the
// source pins above, evaluated over the state matrix).
{
    const opacity = (isDisabled, isLocked) => (isDisabled || isLocked) ? '0.68' : '1';
    check('item1 mirror: opacity 0.68 for disabled, locked, and disabled+locked; 1 only when unlocked',
        opacity(true, false) === '0.68' && opacity(false, true) === '0.68' &&
        opacity(true, true) === '0.68' && opacity(false, false) === '1');
    const boxShadow = (prestige, rankAccent) => prestige ? `0 0 0 1px rgba(255,255,255,0.08),0 0 18px ${rankAccent}55` : '0 10px 26px rgba(0,0,0,0.34)';
    check('item1 mirror: boxShadow is the prestige glow only with prestige, else the plain shadow',
        boxShadow(0, '#ffd166') === '0 10px 26px rgba(0,0,0,0.34)' &&
        boxShadow(2, '#ffd166').includes('#ffd166'));
    const roleLabel = (isDisabled, isLocked, role) => isDisabled ? 'DISABLED' : (isLocked ? 'FIGHTER LOCKED' : role.toUpperCase());
    check('item1 mirror: role label DISABLED / FIGHTER LOCKED / role, with no deck branch',
        roleLabel(true, false, 'tank') === 'DISABLED' && roleLabel(false, true, 'tank') === 'FIGHTER LOCKED' &&
        roleLabel(false, false, 'tank') === 'TANK');
}
// The deck DATA still ships — the fix deletes no data, only the deleted
// ownership system's orphaned reads.
check('item1: slopsushi-cards.js still ships and builds window.SLOP_SUSHI_DECKS',
    sushiCards.includes('window.SLOP_SUSHI_DECKS={};') &&
    sushiCards.includes('ids.forEach(id=>window.SLOP_SUSHI_DECKS[id]=D(id,decks[id]));'));
check('item1: index.html still loads slopsushi-cards.js before bootstrap.js',
    indexHtml.indexOf('slopsushi-cards.js') !== -1 &&
    indexHtml.indexOf('slopsushi-cards.js') < indexHtml.indexOf('bootstrap.js'));
check('item1: web fighter path is the brawler-browser showList (app uses its own fighters view)',
    game.includes("overlay.className = 'brawler-browser fighter-gallery';") &&
    game.includes('function showList()') && game.includes('buildAppFightersView'));

// ================= ITEM 2: pass full-screen redesign =================
// --- 2a. CSS: full-screen view, not a centred pop-up ---
check('item2 css: .circuit-overlay keeps the round-3 pinned prefix (fixed inset 0, z-index 1200)',
    circuitCss.includes('.circuit-overlay{position:fixed;inset:0;z-index:1200;'));
check('item2 css: overlay is a full-screen view (block, no padding, solid bg — no centring grid / dim)',
    ruleBody(circuitCss, '.circuit-overlay{').includes('display:block') &&
    ruleBody(circuitCss, '.circuit-overlay{').includes('padding:0') &&
    ruleBody(circuitCss, '.circuit-overlay{').includes('background:#070d18') &&
    !ruleBody(circuitCss, '.circuit-overlay{').includes('place-items:center'));
check('item2 css: panel fills the viewport (100% wide, 100dvh, no radius/border/shadow)',
    ruleBody(circuitCss, '.circuit-panel{').includes('width:100%') &&
    ruleBody(circuitCss, '.circuit-panel{').includes('height:100dvh') &&
    ruleBody(circuitCss, '.circuit-panel{').includes('max-height:none') &&
    ruleBody(circuitCss, '.circuit-panel{').includes('border-radius:0'));
check('item2 css: content grows so the tabs pin to the bottom',
    ruleBody(circuitCss, '.circuit-content{').includes('flex:1'));
check('item2 css: tabs are a bottom bar (top border, dark bar, safe-area padding, full-width buttons)',
    ruleBody(circuitCss, '.circuit-tabs{').includes('border-top:1px solid #29374b') &&
    ruleBody(circuitCss, '.circuit-tabs{').includes('env(safe-area-inset-bottom)') &&
    circuitCss.includes('.circuit-tabs button{flex:1;min-height:48px}'));
check('item2 css: tabs sit last (order 5) with the footer note above them (order 4)',
    circuitCss.includes('.circuit-panel .circuit-tabs{order:5}') &&
    circuitCss.includes('.circuit-panel footer{order:4}'));
check('item2 css: compact header (slim padding, smaller title)',
    ruleBody(circuitCss, '.circuit-header{').includes('padding:12px 16px') &&
    ruleBody(circuitCss, '.circuit-header h1{').includes('clamp(20px,3vw,28px)'));
check('item2 css: slim summary row (level 28px, wallet 20px)',
    ruleBody(circuitCss, '.circuit-summary{').includes('padding:10px 16px') &&
    ruleBody(circuitCss, '.circuit-level b{').includes('font-size:28px') &&
    ruleBody(circuitCss, '.circuit-wallet b{').includes('font-size:20px'));
check('item2 css: compact premium strip (less padding, less bottom margin)',
    ruleBody(circuitCss, '.circuit-premium{').includes('padding:10px 14px') &&
    ruleBody(circuitCss, '.circuit-premium{').includes('margin-bottom:12px'));
check('item2 css: small screens stay full-screen too (no padded rounded panel)',
    circuitCss.includes('@media(max-width:600px){.circuit-overlay{padding:0}') &&
    circuitCss.includes('.circuit-panel{height:100dvh;max-height:none;border-radius:0}'));
check('item2 css: pass rules stay top-level in the sheet (round-3 bundle property)',
    JSON.stringify(mediaStackAt(circuitCss, '.circuit-overlay{')) === '[]' &&
    JSON.stringify(mediaStackAt(circuitCss, '.circuit-panel{')) === '[]' &&
    JSON.stringify(mediaStackAt(circuitCss, '.circuit-premium{')) === '[]' &&
    JSON.stringify(mediaStackAt(circuitCss, '.circuit-road{')) === '[]');
check('item2 css: native-app full-bleed rules kept (round-2 pins still hold)',
    circuitCss.includes('.native-app .circuit-overlay{padding:0;') &&
    circuitCss.includes('.native-app .circuit-panel{width:100%;height:100dvh;max-height:none;border-radius:0}'));
// --- 2b. JS template: back button, Vault tabs, both close buttons ---
const openSeasonPassSrc = extractFunction(game, 'openSeasonPass');
check('item2 js: header has a back arrow that closes (plus the ✕)',
    openSeasonPassSrc.includes('class="circuit-back"') &&
    openSeasonPassSrc.includes('aria-label="Back to home"') &&
    openSeasonPassSrc.includes('>←</button>'));
check('item2 js: BOTH close buttons are bound (was only the first [data-action=close])',
    openSeasonPassSrc.includes("overlay.querySelectorAll('[data-action=\"close\"]').forEach(button=>{button.onclick=close;});"));
check('item2 js: tabs are REWARD ROAD / VAULT / MISSIONS (Vault is the token shop)',
    openSeasonPassSrc.includes('data-tab="road"') && openSeasonPassSrc.includes('data-tab="vault"') &&
    openSeasonPassSrc.includes('REWARD ROAD') && openSeasonPassSrc.includes('>VAULT<') &&
    openSeasonPassSrc.includes('>MISSIONS ↗<'));
check('item2 js: TOKEN EXCHANGE is gone from game.js (renamed, not duplicated)',
    !game.includes('TOKEN EXCHANGE') && !game.includes('data-tab="shop"'));
check('item2 js: view keeps dialog semantics + Escape/focus behaviour (round-2 smoke pin)',
    openSeasonPassSrc.includes("overlay.setAttribute('role','dialog')") &&
    openSeasonPassSrc.includes("overlay.setAttribute('aria-modal','true')") &&
    openSeasonPassSrc.includes("if(event.key === 'Escape')"));
check('item2 js: fresh open scrolls the road to the current tier (guarded — cosmetic only)',
    openSeasonPassSrc.includes("try { road.scrollLeft = scrollLeft ||") &&
    openSeasonPassSrc.includes("querySelectorAll('.circuit-tier.unlocked')") &&
    openSeasonPassSrc.includes("catch (_) { road.scrollLeft = scrollLeft; }"));
check('item2 js: road still renders every tier from the real season data + hero GET',
    openSeasonPassSrc.includes('for(const tier of getActiveSeasonPassTiers())') &&
    openSeasonPassSrc.includes("className='circuit-hero'") &&
    openSeasonPassSrc.includes('circuit-hero-get'));
check('item2 js: premium panel intact (both real prices, same confirm path)',
    openSeasonPassSrc.includes("className='circuit-premium'") &&
    openSeasonPassSrc.includes("['gems',SEASON_PREMIUM_UNLOCK_GEMS,'Gems'],['coins',SEASON_PREMIUM_UNLOCK_COINS,'Coins']"));
check('item2 js: MISSIONS still closes the pass and opens the Quest Board season tab',
    openSeasonPassSrc.includes("overlay.querySelector('[data-action=\"quests\"]').onclick=()=>{close();openQuestBoard('season');};"));
// --- 2c. Numbers unchanged (layout only) ---
check('item2 numbers: 50 tiers, premium 100 gems / 11,999 coins',
    game.includes('const SEASON_PASS_MAX_LEVEL = 50;') &&
    game.includes('const SEASON_PREMIUM_UNLOCK_GEMS = 100;') &&
    game.includes('const SEASON_PREMIUM_UNLOCK_COINS = 11999;'));
{
    const tiersSrc = extractConstArray(game, 'XPLODEMIS_PASS_TIERS');
    const tierNums = [...tiersSrc.matchAll(/tier:\s*(\d+)/g)].map((m) => Number(m[1]));
    check('item2 numbers: Xplodemis pass still has 50 tiers (1..50)',
        tierNums.length === 50 && tierNums[0] === 1 && tierNums[49] === 50);
    check('item2 numbers: tier 50 is still HOLIDAY LIGHTS, premium skin holiday-lights-freezeon',
        tiersSrc.includes("tier:50,title:'HOLIDAY LIGHTS'") &&
        tiersSrc.includes("premium:{type:'skin',id:'holiday-lights-freezeon'}"));
}
// --- 2d. Round-3 guarantee still holds (closer + match launchers) ---
check('item2 guarantee: closeSeasonPassOverlay exists and removes node + Escape listener + deep link',
    game.includes('function closeSeasonPassOverlay() {') &&
    game.includes("document.removeEventListener('keydown', seasonPassOverlayKeyboard)") &&
    game.includes("document.getElementById('circuitPassOverlay')") &&
    game.includes("setAppDeepLink('home')"));
{
    const closerCalls = (game.match(/closeSeasonPassOverlay\(\);/g) || []).length;
    check('item2 guarantee: match launchers still call closeSeasonPassOverlay() first (round-3 pin: 8 launchers + 1 stale-clear in open)',
        closerCalls === 9);
    const openFn = extractFunction(game, 'openSeasonPass');
    check('item2 guarantee: a fresh open still clears any stale overlay first (no stacking)',
        openFn.includes("if (typeof closeSeasonPassOverlay === 'function') closeSeasonPassOverlay();"));
}

// ================= ITEM 2 vm smoke: the real render, end to end =================
// Minimal fake DOM (same shape as the round-2 suite: innerHTML parses only
// what the render queries — <main>, buttons with data-action/data-tab,
// classed elements). Real overlay, real claim fn, real token module, real
// confirm helper — catches render-time throws the static pins cannot.
{
    function smokeMatches(el, sel) {
        if (sel === 'button') return el.tagName === 'BUTTON';
        if (sel === 'main') return el.tagName === 'MAIN';
        if (sel === 'button:not(:disabled)') return el.tagName === 'BUTTON' && !el.disabled;
        const attrM = sel.match(/^\[data-(action|tab)(?:="([^"]+)")?\]$/);
        if (attrM) return attrM[2] === undefined ? el.dataset[attrM[1]] !== undefined : el.dataset[attrM[1]] === attrM[2];
        if (sel.startsWith('.')) return el.className.split(' ').includes(sel.slice(1));
        if (sel.startsWith('#')) return el.id === sel.slice(1);
        return false;
    }
    class El {
        constructor(tag) {
            this.tagName = tag.toUpperCase(); this.children = []; this.style = {};
            this.dataset = {}; this.attributes = {}; this.className = ''; this.id = '';
            this._innerHTML = ''; this.textContent = ''; this.disabled = false;
            this.onclick = null; this.scrollLeft = 0; this.value = 0; this._listeners = {};
        }
        setAttribute(k, v) { this.attributes[k] = String(v); if (k.startsWith('data-')) { const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); this.dataset[key] = String(v); } }
        getAttribute(k) { return this.attributes[k]; }
        appendChild(c) { this.children.push(c); c.parent = this; return c; }
        remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); } }
        addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
        removeEventListener(t, fn) { this._listeners[t] = (this._listeners[t] || []).filter(f => f !== fn); }
        focus() {}
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
        querySelectorAll(sel) { const out = []; const walk = (el) => { for (const c of el.children) { if (smokeMatches(c, sel)) out.push(c); walk(c); } }; walk(this); return out; }
        set innerHTML(html) {
            this._innerHTML = html; this.children = [];
            const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g; let m;
            while ((m = tagRe.exec(html))) {
                const [, tag, attrs] = m;
                const el = new El(tag);
                const classM = attrs.match(/class="([^"]*)"/); if (classM) el.className = classM[1];
                const actionM = attrs.match(/data-action="([^"]*)"/); if (actionM) el.dataset.action = actionM[1];
                const tabM = attrs.match(/data-tab="([^"]*)"/); if (tabM) el.dataset.tab = tabM[1];
                const pressedM = attrs.match(/aria-pressed="([^"]*)"/); if (pressedM) el.setAttribute('aria-pressed', pressedM[1]);
                this.children.push(el); el.parent = this;
            }
        }
        get innerHTML() { return this._innerHTML; }
    }
    const smokeCollectButtons = (el) => { const out = []; const walk = (e) => { for (const c of e.children) { if (c.tagName === 'BUTTON') out.push(c); walk(c); } }; walk(el); return out; };
    // 50-tier fixture mirroring the real Xplodemis pass shape (tier 50 =
    // Holiday Lights skin on the premium track).
    const fixtureTiers = Array.from({ length: 50 }, (_, i) => {
        const tier = i + 1;
        return tier === 50
            ? { tier, title: 'HOLIDAY LIGHTS', free: { type: 'coins', amount: 5000 }, premium: { type: 'skin', id: 'holiday-lights-freezeon' } }
            : { tier, title: `TIER ${tier}`, free: { type: 'coins', amount: 100 }, premium: { type: 'gems', amount: 2 } };
    });
    const smokeBody = new El('body');
    const smokeToasts = []; let smokeOpenedBoard = null;
    const smoke = {
        document: {
            body: smokeBody, activeElement: null,
            createElement: (tag) => new El(tag),
            getElementById: (id) => (id === 'circuitPassOverlay' ? smokeBody.children.find(c => c.id === 'circuitPassOverlay') || null : null),
            addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null,
        },
        ENABLE_SEASON_PASS: true, ENABLE_SEASON_QUESTS: true,
        SEASON_PREMIUM_UNLOCK_GEMS: 100, SEASON_PREMIUM_UNLOCK_COINS: 11999, SEASON_PASS_MAX_LEVEL: 50,
        playerData: {
            coins: 10000, gems: 100, souls: 0, starrDrops: 0, superTapperCount: 0, hyperTapperCount: 0,
            presentCount: 0, ownedSkins: {}, selectedSkins: {},
            seasonPass: { level: 3, xp: 270, tokenWallet: 270, tokensEarned: 270, claimedFreeRewards: [], claimedPremiumRewards: [], premiumUnlocked: false, tokenPurchases: {}, tokenSchema: 1, premiumUnlockedWith: null },
        },
        skinsDatabase: {},
        BraweRosterVisuals: { portrait: () => '' },
        getActiveSeasonProfile: () => ({ key: 'xplodemis', seasonNumber: 6, id: 'xplodemis-arena-forge-2026-s6', name: 'Xplodemis', upperName: 'XPLODEMIS', tiers: fixtureTiers, startUtc: 0, endUtc: Date.UTC(2027, 0, 1), endLabel: 'December 31, 2026' }),
        getActiveSeasonPassTiers: () => fixtureTiers,
        isSeason3PassActive: () => true,
        ensureSeasonPassState: () => {},
        saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {},
        refreshHomeUI: () => {}, openQuestBoard: (tab) => { smokeOpenedBoard = tab; },
        showToast: (m) => { smokeToasts.push(m); },
        showAppConfirmSheet: (opts) => { smoke._lastSheet = opts; },
        isNativeAppMode: () => true,
        confirm: () => { throw new Error('native confirm must not be called in app mode'); },
        addCorePieces: () => {}, ensureSlopSushiState: () => {}, grantPinPack: () => {}, addPacketSignal: () => {},
        grantReward: (r) => {
            const p = smoke.playerData;
            if (!r || !r.type) return false;
            if (r.type === 'coins') p.coins = (p.coins || 0) + (r.amount || 0);
            else if (r.type === 'gems') p.gems = (p.gems || 0) + (r.amount || 0);
            else if (r.type === 'souls') p.souls = (p.souls || 0) + (r.amount || 0);
            else if (r.type === 'tapper') p.starrDrops = (p.starrDrops || 0) + (r.amount || 0);
            else if (r.type === 'superTapper') p.superTapperCount = (p.superTapperCount || 0) + (r.amount || 0);
            else if (r.type === 'hyperTapper') p.hyperTapperCount = (p.hyperTapperCount || 0) + (r.amount || 0);
            else if (r.type === 'present') p.presentCount = (p.presentCount || 0) + (r.amount || 0);
            else if (r.type === 'randomPiece') p.randomPieces = (p.randomPieces || 0) + (r.amount || 0);
            else if (r.type === 'skin') { p.ownedSkins = p.ownedSkins || {}; p.ownedSkins[r.id] = true; }
            return true;
        },
        PACKET_DEFS: {}, ensureSeason3State: () => ({ season: { cosmetics: [] } }),
        ensureProfileProgressionState: () => ({ bon: { unlockedBadges: [], unlockedFrames: [], unlockedBackgrounds: [] } }),
    };
    vm.createContext(smoke);
    vm.runInContext(passTokensSrc, smoke);
    for (const fn of ['ensureBrawePassTokens', 'describeCircuitReward', 'grantSeasonReward', 'claimSeasonPassTrackReward', 'unlockSeasonPremium', 'confirmCircuitPassAction', 'openSeasonPass']) {
        vm.runInContext(extractFunction(game, fn), smoke);
    }
    vm.runInContext('openSeasonPass()', smoke);
    const smokeOverlay = smokeBody.children.find(c => c.id === 'circuitPassOverlay');
    check('smoke: pass view opens with id circuitPassOverlay + dialog semantics',
        !!smokeOverlay && smokeOverlay.getAttribute('role') === 'dialog' && smokeOverlay.getAttribute('aria-modal') === 'true');
    check('smoke: header has a back button (circuit-back) and a close button',
        !!smokeOverlay?.querySelector('.circuit-back') && smokeOverlay.querySelectorAll('[data-action="close"]').length === 2);
    const smokeRoad = smokeOverlay?.querySelector('.circuit-road');
    check('smoke: road renders all 50 tier columns from the live season',
        smokeRoad?.children.length === 50);
    const t50kids = smokeRoad?.children[49]?.children || [];
    check('smoke: tier 50 column is the Holiday Lights tier',
        t50kids.some((c) => c.tagName === 'H3' && c.textContent === 'HOLIDAY LIGHTS'));
    const smokePrem = smokeCollectButtons(smokeOverlay.querySelector('.circuit-premium'));
    check('smoke: premium strip shows both real prices (100 gems / 11,999 coins)',
        smokePrem.length === 2 && smokePrem[0].textContent.includes('100') && smokePrem[1].textContent.includes('11,999'));
    const smokeTabs = smokeOverlay.querySelectorAll('[data-tab]');
    check('smoke: two switchable tabs exist (road + vault)',
        smokeTabs.length === 2 && smokeTabs[0].dataset.tab === 'road' && smokeTabs[1].dataset.tab === 'vault');
    smokeTabs[1].onclick();
    const smokeShop = smokeOverlay.querySelector('.circuit-shop');
    check('smoke: VAULT tab renders the token shop (all 5 real offers)',
        smokeShop?.children.length === 5 && !smokeOverlay.querySelector('.circuit-road'));
    smokeTabs[0].onclick();
    check('smoke: REWARD ROAD tab brings the 50-tier road back',
        smokeOverlay.querySelector('.circuit-road')?.children.length === 50);
    smokeOverlay.querySelector('.circuit-back').onclick();
    check('smoke: back arrow closes the pass view',
        !smokeBody.children.find(c => c.id === 'circuitPassOverlay'));
    vm.runInContext('openSeasonPass()', smoke);
    const reopened = smokeBody.children.find(c => c.id === 'circuitPassOverlay');
    reopened.querySelector('[data-action="quests"]').onclick();
    check('smoke: MISSIONS closes the pass and opens the Quest Board season tab',
        !smokeBody.children.find(c => c.id === 'circuitPassOverlay') && smokeOpenedBoard === 'season');
}

console.log(`arena-forge-fixes-round-4: ${passed} passed, ${failed} failed${failed ? ` — FAILURES: ${failures.join(' | ')}` : ''}`);
process.exit(failed ? 1 : 0);
