// Arena Forge app overhaul round 2 — season-pass tier road (2026-11-19,
// Anthony's order: build the flagged tier-road proposal #1).
// The Circuit Pass overlay (25-tier road, free/premium tracks, token
// exchange, premium upsell) was dead code behind an early return to the
// Quest Board. This build REVIVES it (no rebuild — the dead code was
// complete and wired to the real season data) and makes it phone-first:
// full-bleed overlay under .native-app, one vertical scroller, free/premium
// cards side by side per tier, claim buttons >=44px, safe-area insets,
// Trebuchet (round-1 app font pick), app confirm sheet instead of native
// confirm(), haptics delegate, claim toasts. Entry points (season chip,
// SEASON PASS quick-row button, featured season slot, quick-row SEASON PASS
// button) now open the ROAD; the road's MISSIONS button links back to the
// Quest Board, which keeps its missions + tier ladder — two views of the
// same season-pass state, never replacements for each other.
// No new seasons, tiers, rewards, or prices: every tier/reward/price below
// comes from the existing season data (Season 5 Turkey Trouble, Season 6
// Xplodemis). No mechanics/numbers/core-kit changes; website untouched
// (all road CSS is .native-app-scoped); save whitelist not widened.
// Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const circuitCss = read('circuit-pass.css');
const passTokensSrc = read('modules/progression/pass-tokens.js');
const self = read('tests/arena-forge-round2-season-road-regression.mjs');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a function declaration out of game.js source (same pattern as
// the results-flow suite: string/comment aware).
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

// --- 1. The revive: early return gone, guard kept, road code reachable ---
const openSeasonPassSrc = extractFunction(game, 'openSeasonPass');
check('openSeasonPass no longer returns early to the Quest Board',
    !openSeasonPassSrc.includes("openQuestBoard('season');\n      return;") &&
    !openSeasonPassSrc.includes('// Season 6 update: the Pass lives ONLY in the Quests tab now.'));
check('openSeasonPass still falls back to the Quest Board only when the pass is disabled',
    openSeasonPassSrc.includes("if (!ENABLE_SEASON_PASS) { openQuestBoard(); return; }"));
check('road overlay still built with id circuitPassOverlay + dialog semantics',
    openSeasonPassSrc.includes("overlay.id = 'circuitPassOverlay'") &&
    openSeasonPassSrc.includes("overlay.setAttribute('role','dialog')"));
check('road renders all tiers from the real season data (no hardcoded 25)',
    openSeasonPassSrc.includes('for(const tier of getActiveSeasonPassTiers())'));
check('road header shows the live season name/number from the profile',
    openSeasonPassSrc.includes('seasonProfile.seasonNumber') && openSeasonPassSrc.includes('seasonProfile.upperName'));
check('road summary shows level, token wallet, tokens earned from live pass state',
    openSeasonPassSrc.includes('pass.level') && openSeasonPassSrc.includes('pass.tokenWallet') && openSeasonPassSrc.includes('pass.tokensEarned'));
check('season-ended state is honest (claims need an active season, copy says so)',
    openSeasonPassSrc.includes("active?'15 tokens per completed match") && openSeasonPassSrc.includes("'Season ended'"));

// --- 2. Claim states are derived from the real pass state ---
check('claimed state reads the claimedFree/claimedPremium arrays',
    openSeasonPassSrc.includes("pass[track==='free'?'claimedFreeRewards':'claimedPremiumRewards'].includes(tier.tier)"));
check('ready state needs active season + level reached + (free or premium unlocked)',
    openSeasonPassSrc.includes("const ready=active && pass.level>=tier.tier && (track==='free'||pass.premiumUnlocked);"));
check('claim button labels cover all four states',
    openSeasonPassSrc.includes("claimed?'✓ CLAIMED':ready?'CLAIM':track==='premium'&&!pass.premiumUnlocked?'PREMIUM LOCKED':'LEVEL '+tier.tier"));
check('claim buttons are disabled unless claimable, and claim via the real claim fn',
    openSeasonPassSrc.includes('button.disabled=claimed||!ready;') &&
    openSeasonPassSrc.includes('claimSeasonPassTrackReward(tier.tier,track)'));
check('successful tier claim toasts the granted reward',
    openSeasonPassSrc.includes("showToast('Claimed '+describeCircuitReward(tier[track]))"));
check('road keeps the MISSIONS link back to the Quest Board',
    openSeasonPassSrc.includes("overlay.querySelector('[data-action=\"quests\"]').onclick=()=>{close();openQuestBoard('season');};"));
check('road has both tabs: REWARD ROAD + VAULT (round 4: the token shop is the Vault now)',
    openSeasonPassSrc.includes('data-tab="road"') && openSeasonPassSrc.includes('data-tab="vault"') &&
    openSeasonPassSrc.includes('REWARD ROAD') && openSeasonPassSrc.includes('>VAULT<') &&
    !openSeasonPassSrc.includes('TOKEN EXCHANGE'));
check('Escape closes the road and Tab is trapped inside it',
    openSeasonPassSrc.includes("if(event.key === 'Escape')") && openSeasonPassSrc.includes("if(event.key === 'Tab')"));

// --- 3. Premium upsell: real prices, real unlock, app confirm sheet ---
check('premium prices are the rebuilt constants (100 gems / 11,999 coins, stage 4)',
    game.includes('const SEASON_PREMIUM_UNLOCK_GEMS = 100;') && game.includes('const SEASON_PREMIUM_UNLOCK_COINS = 11999;'));
check('premium upsell shows both currency buttons only while locked + active',
    openSeasonPassSrc.includes("if(!pass.premiumUnlocked && active) for(const [currency,cost,label] of [['gems',SEASON_PREMIUM_UNLOCK_GEMS,'Gems'],['coins',SEASON_PREMIUM_UNLOCK_COINS,'Coins']])"));
check('premium buttons are disabled when the player cannot afford them',
    openSeasonPassSrc.includes('button.disabled=(playerData[currency]||0)<cost;'));
check('premium unlock goes through the real unlockSeasonPremium',
    openSeasonPassSrc.includes('unlockSeasonPremium(currency)'));
check('no native confirm() left inside openSeasonPass',
    !openSeasonPassSrc.includes('if(confirm(') && !openSeasonPassSrc.includes('if(!confirm('));
check('circuit confirm helper uses the app sheet in app mode, native confirm only on web',
    game.includes('function confirmCircuitPassAction(message, onConfirm)') &&
    game.includes("if (isNativeAppMode() && typeof showAppConfirmSheet === 'function')") &&
    game.includes("showAppConfirmSheet({ title: 'SEASON PASS', message, confirmText: 'CONFIRM', cancelText: 'CANCEL', onConfirm })") &&
    game.includes("if (typeof confirm === 'function' && confirm(message)) onConfirm();"));
check('premium + token confirms both route through the helper',
    openSeasonPassSrc.includes('confirmCircuitPassAction(`Unlock Premium for') &&
    openSeasonPassSrc.includes('confirmCircuitPassAction(`Spend ${offer.cost} Pass Tokens on'));

// --- 4. Vault (token shop): real offers, guarded skin lookups, honest states ---
check('token exchange iterates the real token offers (via the ensureBrawePassTokens fallback guard — fixes round item 1)',
    openSeasonPassSrc.includes('for(const offer of ensureBrawePassTokens().offers)'));
check('skin offer lookups are guarded (a missing skin id cannot kill the tab)',
    openSeasonPassSrc.includes("const skin=offer.reward.type==='skin'?skinsDatabase[offer.reward.id]:null;") &&
    openSeasonPassSrc.includes('const owned=!!skin &&') &&
    openSeasonPassSrc.includes("typeof BraweRosterVisuals!=='undefined'") &&
    openSeasonPassSrc.includes("BraweRosterVisuals?.portrait"));
check('exchange buttons show OWNED / SOLD OUT / token cost from live state',
    openSeasonPassSrc.includes("button.textContent=owned?'OWNED':bought>=offer.limit?'SOLD OUT':'◈ '+offer.cost.toLocaleString();"));
check('exchange buttons are disabled when owned, sold out, unaffordable, or season ended',
    openSeasonPassSrc.includes('button.disabled=owned||bought>=offer.limit||pass.tokenWallet<offer.cost||!active;'));
check('exchange purchase goes through the real token purchase + grant, then toasts',
    openSeasonPassSrc.includes('BrawePassTokens.purchase(pass,offer.id,reward=>{grantSeasonReward(reward);return true;})') &&
    openSeasonPassSrc.includes("showToast('Bought '+offer.name)"));
check('exchange note states the honest rule: tokens are earned, not purchased',
    openSeasonPassSrc.includes('Tokens are earned, not purchased.'));

// --- 5. Entry points: every season entry opens the ROAD now ---
check('season chip opens the road',
    game.includes("document.getElementById('appHomeSeasonChip')?.addEventListener('click', () => { appBuzz(10); if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); });")); // web-parity rebase: tier2-systems (PR #161) added the deep-link call to both handlers — the road open is unchanged
check('SEASON PASS quick-row button opens the road (not the quest list)',
    game.includes("else if (action === 'pass') { if (typeof openSeasonPass === 'function') openSeasonPass(); setAppDeepLink('pass'); }"));
check('QUESTS quick-row button still opens the Quest Board directly',
    game.includes("if (action === 'quests') { if (typeof openQuestBoard === 'function') openQuestBoard(); }"));
check('home SEASON PASS button (with level badge) opens the road',
    game.includes("spBtn.onclick = () => openSeasonPass();"));
check('featured season slot opens the road',
    game.includes('const openSeasonSlot = () => openSeasonPass();'));
check('Quest Board season tab has NO tier ladder anymore (fixes round item 2: pass lives only in its own overlay)',
    !game.includes('Pass — Tier Track') && !game.includes('ladderBox') && !game.includes('function seasonTrackRewardText'));
check('pass badge still counts claimable tier + quest rewards',
    game.includes('getClaimableSeasonRewardCount()') &&
    game.includes("const freeReady = getActiveSeasonPassTiers().filter(t => t.tier <= level && !freeClaimed.has(t.tier)).length;"));

// --- 6. Haptics + save whitelist untouched ---
check('road buttons join the haptics delegate (phase-4 selector stays verbatim)',
    game.includes("if (event.target.closest('.brawe-shop-overlay button, #questBoardOverlay button, .app-tournament-overlay button, .brick-bon-v2-overlay button')) appBuzz(10);") &&
    game.includes("if (event.target.closest('#circuitPassOverlay button')) appBuzz(10);"));
check('season-pass save round-trip unchanged (whitelist not widened)',
    game.includes('save.persistent.seasonPass = playerData.seasonPass') &&
    game.includes('playerData.seasonPass = data.persistent.seasonPass'));

// --- 7. Phone-first CSS (circuit-pass.css, all .native-app-scoped) ---
check('app road is full-bleed (no padding, 100dvh panel, square corners)',
    circuitCss.includes('.native-app .circuit-overlay{padding:0;') &&
    circuitCss.includes('.native-app .circuit-panel{width:100%;height:100dvh;max-height:none;border-radius:0}'));
check('app road is one vertical scroller (column road, overflow visible)',
    circuitCss.includes('.native-app .circuit-road{display:flex;flex-direction:column;overflow:visible;'));
check('app tiers put free + premium cards side by side',
    circuitCss.includes('.native-app .circuit-tier-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px}'));
check('app claim buttons are >=44px (task floor is 40px)',
    circuitCss.includes('.native-app .circuit-reward button{min-height:44px;') &&
    circuitCss.includes('.native-app .circuit-tabs button{flex:1 0 auto;min-height:44px;') &&
    circuitCss.includes('.native-app .circuit-shop button{min-height:44px}'));
check('app premium buttons are >=44px too',
    circuitCss.includes('.native-app .circuit-premium button{flex:1;min-height:44px;'));
check('app overlay uses safe-area insets (header / content / footer)',
    circuitCss.includes('env(safe-area-inset-top)') && circuitCss.includes('env(safe-area-inset-bottom)') &&
    circuitCss.includes('.native-app .circuit-header{padding:calc(12px + env(safe-area-inset-top))'));
check('app road uses the round-1 app font (Trebuchet)',
    circuitCss.includes(".native-app .circuit-overlay{padding:0;font-family:'Trebuchet MS','Gill Sans','Verdana',sans-serif}"));
check('app road buttons get :active press feedback',
    circuitCss.includes('.native-app .circuit-overlay button:active{transform:scale(.97);filter:brightness(1.2)}'));
check('app token shop goes single-column under 400px',
    circuitCss.includes('@media(max-width:400px){.native-app .circuit-shop{grid-template-columns:1fr}}'));
check('desktop road CSS is untouched (horizontal scroll, 178px columns)',
    circuitCss.includes('.circuit-road{display:flex;gap:12px;overflow-x:auto;') &&
    circuitCss.includes('.circuit-tier{flex:0 0 178px;'));
const newCssBlock = circuitCss.split('Arena Forge app overhaul round 2')[1] || '';
// Brawl Space (2026-11-19): the block headed 'Brawl Space season-pass
// road' is DELIBERATELY shared web + app — the season pass overlay is
// the same on both, and the follow-up asked for the same spacious
// treatment on the website. So the no-leak check covers only the
// round-2 app block above that header, not the shared Brawl Space rules.
const round2Block = newCssBlock.split('Brawl Space season-pass road')[0] || '';
check('no app rule leaks outside .native-app in the new block',
    round2Block.length > 0 && round2Block.split('\n').filter(l => l.trim().startsWith('.')).every(l => l.trim().startsWith('.native-app')));

// --- 8. Season data: the live seasons define their roads (Xplodemis rebuilt to 50 tiers, stage 4) ---
const KNOWN_REWARD_TYPES = new Set(['coins', 'gems', 'souls', 'tapper', 'superTapper', 'hyperTapper', 'towerDrop', 'spookyBox', 'present', 'corePieces', 'skin', 'pinPack', 'packetSignal', 'profileCosmetic', 'eventTapper', 'randomPiece']);
const EXPECTED_TIER_COUNTS = { 'TURKEY_TROUBLE_PASS_TIERS': 25, 'XPLODEMIS_PASS_TIERS': 50, 'EMBER_FORGE_PASS_TIERS': 25 };
const tierSets = {};
for (const name of ['TURKEY_TROUBLE_PASS_TIERS', 'XPLODEMIS_PASS_TIERS', 'EMBER_FORGE_PASS_TIERS']) {
    const arr = vm.runInNewContext(`(${extractConstArray(game, name)})`, {});
    tierSets[name] = arr;
    check(`${name}: exactly ${EXPECTED_TIER_COUNTS[name]} tiers, numbered 1-${EXPECTED_TIER_COUNTS[name]} in order`,
        arr.length === EXPECTED_TIER_COUNTS[name] && arr.every((t, i) => t.tier === i + 1));
    check(`${name}: every tier has a non-empty title and a free + premium reward`,
        arr.every(t => typeof t.title === 'string' && t.title.length > 0 &&
            t.free && typeof t.free.type === 'string' && t.premium && typeof t.premium.type === 'string'));
    check(`${name}: every reward type is one the grant/describe code handles`,
        arr.every(t => KNOWN_REWARD_TYPES.has(t.free.type) && KNOWN_REWARD_TYPES.has(t.premium.type)));
}
check('Season 5 is Turkey Trouble (25 tiers) and Season 6 is Xplodemis (50 tiers)',
    game.includes("key:'turkey', seasonNumber:5") && game.includes("key:'xplodemis', seasonNumber:6") &&
    tierSets.XPLODEMIS_PASS_TIERS.length === 50);
check('no new season/tier data invented: the only tier arrays are the three live seasons (Arenaween + FUTURE placeholder deleted, stage 4)',
    (game.match(/_PASS_TIERS = \[/g) || []).length === 3 &&
    !game.includes('const FUTURE_SEASON_PASS_TIERS = [') &&
    !game.includes('const ARENAWEEN_PASS_TIERS = ['));

// --- 9. describeCircuitReward covers every reward type the roads use ---
{
    const sandbox = { skinsDatabase: { 'xploder-rocketeer': { name: 'Xploder Rocketeer' }, 'astral-portalo': { name: 'Astral Navigator Portalo' } } };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'describeCircuitReward'), sandbox);
    const d = (r) => vm.runInContext(`describeCircuitReward(${JSON.stringify(r)})`, sandbox);
    check('describe: coins/gems/souls render with amounts', d({ type: 'coins', amount: 250 }) === '250 Coins' && d({ type: 'gems', amount: 7 }) === '7 Gems' && d({ type: 'souls', amount: 30 }) === '30 Souls');
    check('describe: tappers / presents / core pieces render', d({ type: 'tapper', amount: 1 }) === '1 Tapper' && d({ type: 'present', amount: 2 }) === '2 Presents' && d({ type: 'corePieces', amount: 10 }) === '10 Core Pieces');
    check('describe: skin reward resolves through skinsDatabase', d({ type: 'skin', id: 'xploder-rocketeer' }) === 'Xploder Rocketeer');
    check('describe: pin pack renders with bonus gems', d({ type: 'pinPack', amount: 3, bonusGems: 5 }) === 'Pin Pack ×3 + 5 Gems');
}

// --- 10. Claim behaviour: the exact function the road buttons call ---
{
    const turkey = tierSets.TURKEY_TROUBLE_PASS_TIERS;
    const sandbox = {
        ENABLE_SEASON_QUESTS: true,
        playerData: { coins: 0, gems: 0, souls: 0, starrDrops: 0, superTapperCount: 0, hyperTapperCount: 0, presentCount: 0, ownedSkins: {}, selectedSkins: {}, seasonPass: null },
        skinsDatabase: { 'xploder-rocketeer': { id: 'xploder-rocketeer', name: 'Xploder Rocketeer', brawler: 'rocketeer' } },
        corePieces: 0,
        seasonActive: true,
        isSeason3PassActive: function () { return sandbox.seasonActive; },
        ensureSeasonPassState: function () {},
        getActiveSeasonPassTiers: function () { return turkey; },
        saveProgress: function () {}, updateEventBadge: function () {}, updateQuestBadge: function () {},
        addCorePieces: function (n) { sandbox.corePieces += n; },
        // Central grantReward (rebuild stage 1): grantSeasonReward grants
        // through it now, so the sandbox must provide it. Applies the same
        // amounts the pass used to write directly.
        grantReward: function (r) {
            const p = sandbox.playerData;
            if (!r || !r.type) return false;
            if (r.type === 'coins') p.coins = (p.coins || 0) + (r.amount || 0);
            else if (r.type === 'gems') p.gems = (p.gems || 0) + (r.amount || 0);
            else if (r.type === 'souls') p.souls = (p.souls || 0) + (r.amount || 0);
            else if (r.type === 'tapper') p.starrDrops = (p.starrDrops || 0) + (r.amount || 0);
            else if (r.type === 'superTapper') p.superTapperCount = (p.superTapperCount || 0) + (r.amount || 0);
            else if (r.type === 'hyperTapper') p.hyperTapperCount = (p.hyperTapperCount || 0) + (r.amount || 0);
            else if (r.type === 'corePieces') sandbox.corePieces = (sandbox.corePieces || 0) + (r.amount || 0);
            else if (r.type === 'present') p.presentCount = (p.presentCount || 0) + (r.amount || 0);
            else if (r.type === 'randomPiece') p.randomPieces = (p.randomPieces || 0) + (r.amount || 0);
            else if (r.type === 'skin') { p.ownedSkins = p.ownedSkins || {}; p.ownedSkins[r.id] = true; }
            return true;
        },
        ensureSlopSushiState: function () {}, grantPinPack: function () {}, addPacketSignal: function () {},
        PACKET_DEFS: {}, ensureSeason3State: function () { return { season: { cosmetics: [] } }; },
        ensureProfileProgressionState: function () { return { bon: { unlockedBadges: [], unlockedFrames: [], unlockedBackgrounds: [] } }; },
    };
    sandbox.playerData.seasonPass = { level: 5, xp: 400, tokenWallet: 0, tokensEarned: 400, claimedFreeRewards: [], claimedPremiumRewards: [], premiumUnlocked: false, tokenPurchases: {} };
    vm.createContext(sandbox);
    vm.runInContext(extractFunction(game, 'grantSeasonReward'), sandbox);
    vm.runInContext(extractFunction(game, 'claimSeasonPassTrackReward'), sandbox);
    const claim = (tier, track) => vm.runInContext(`claimSeasonPassTrackReward(${tier}, '${track}')`, sandbox);
    check('claim: free tier at/below level grants the real reward (tier 1 = 250 coins)',
        claim(1, 'free') === true && sandbox.playerData.coins === 250);
    check('claim: same tier cannot be claimed twice', claim(1, 'free') === false && sandbox.playerData.coins === 250);
    check('claim: tier above level is locked (tier 6 at level 5)',
        claim(6, 'free') === false);
    check('claim: premium tier is locked while premium is not unlocked',
        claim(2, 'premium') === false);
    sandbox.playerData.seasonPass.premiumUnlocked = true;
    check('claim: premium tier claims once premium is unlocked (tier 2 = 4 gems)',
        claim(2, 'premium') === true && sandbox.playerData.gems === 4);
    check('claim: premium tier cannot be claimed twice either', claim(2, 'premium') === false);
    sandbox.seasonActive = false;
    check('claim: nothing claims once the season has ended',
        claim(3, 'free') === false && claim(3, 'premium') === false);
    sandbox.seasonActive = true;
    sandbox.playerData.seasonPass.level = 25;
    check('claim: turkey tier 25 premium grants 15 gems',
        claim(25, 'premium') === true && sandbox.playerData.gems === 19);
    check('claim: turkey tier 25 free grants 2000 coins',
        claim(25, 'free') === true && sandbox.playerData.coins === 2250);
}

// --- 11. Token exchange backing: the real BrawePassTokens module ---
{
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(passTokensSrc, sandbox);
    const T = sandbox.BrawePassTokens;
    check('token module: 5 offers with costs, limits, and rewards',
        Array.isArray(T.offers) && T.offers.length === 5 &&
        T.offers.every(o => typeof o.id === 'string' && o.cost > 0 && o.limit >= 1 && o.reward && o.reward.type));
    // Note: tokenSchema:1 + xp/tokenWallet in sync, or normalize() treats
    // the pass as pre-migration and resets the wallet to xp (real behavior).
    const freshPass = () => ({ xp: 150, level: 1, tokenWallet: 150, tokensEarned: 150, tokenPurchases: {}, tokenSchema: 1 });
    let granted = null;
    const grant = (r) => { granted = r; return true; };
    const pass = freshPass();
    check('token purchase: affordable offer spends tokens and grants',
        T.purchase(pass, 'coin-cache', grant) === true && pass.tokenWallet === 50 && granted && granted.type === 'coins');
    check('token purchase: same offer can repeat up to its limit, then stops',
        T.purchase(pass, 'coin-cache', grant) === false); // wallet 50 < cost 100 now
    const rich = { xp: 100000, level: 1, tokenWallet: 100000, tokensEarned: 100000, tokenPurchases: {}, tokenSchema: 1 };
    for (let i = 0; i < 10; i++) T.purchase(rich, 'coin-cache', grant);
    check('token purchase: limit of 10 enforced on coin cache',
        T.purchase(rich, 'coin-cache', grant) === false && rich.tokenPurchases['coin-cache'] === 10);
    check('token purchase: unknown offer id fails without spending',
        T.purchase(rich, 'no-such-offer', grant) === false && rich.tokenWallet === 100000 - 10 * 100);
    check('token purchase: no skin offers — core cache (800) + random piece (1200) replaced them (stage 4)',
        T.offers.filter(o => o.reward.type === 'skin').length === 0 &&
        T.offers.some(o => o.id === 'core-cache' && o.cost === 800 && o.reward.type === 'corePieces' && o.reward.amount === 25) &&
        T.offers.some(o => o.id === 'random-piece' && o.cost === 1200 && o.reward.type === 'randomPiece' && o.reward.amount === 3));
}

// --- 13. DOM smoke: the real openSeasonPass render runs end to end ---
// A minimal fake DOM (innerHTML parses only what the render queries:
// <main>, buttons with data-action/data-tab, classed elements). The real
// overlay, the real claim fn, the real token module, and the real confirm
// helper all run — this catches render-time throws the static pins cannot.
{
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
    const smokeCollectButtons = (el) => { const out = []; const walk = (e) => { for (const c of e.children) { if (c.tagName === 'BUTTON') out.push(c); walk(c); } }; walk(el); return out; };
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
            seasonPass: { level: 5, xp: 450, tokenWallet: 250, tokensEarned: 450, claimedFreeRewards: [1], claimedPremiumRewards: [], premiumUnlocked: false, tokenPurchases: {}, tokenSchema: 1, premiumUnlockedWith: null },
        },
        skinsDatabase: { 'astral-portalo': { id: 'astral-portalo', name: 'Astral Navigator Portalo', brawler: 'portalo' }, 'neon-jacktrade': { id: 'neon-jacktrade', name: 'Neon Casino JackTrade', brawler: 'jacktrade' } },
        BraweRosterVisuals: { portrait: (b, s) => `<svg data-portrait="${b}/${s}"></svg>` },
        getActiveSeasonProfile: () => ({ key: 'turkey', seasonNumber: 5, id: 'turkey-trouble-arena-forge-2026-s5', name: 'Turkey Trouble', upperName: 'TURKEY TROUBLE', tiers: tierSets.TURKEY_TROUBLE_PASS_TIERS, startUtc: 0, endUtc: Date.UTC(2026, 11, 1), endLabel: 'November 30, 2026' }),
        getActiveSeasonPassTiers: () => tierSets.TURKEY_TROUBLE_PASS_TIERS,
        isSeason3PassActive: () => true,
        ensureSeasonPassState: () => {},
        saveProgress: () => {}, updateEventBadge: () => {}, updateQuestBadge: () => {},
        refreshHomeUI: () => {}, openQuestBoard: (tab) => { smokeOpenedBoard = tab; },
        showToast: (m) => { smokeToasts.push(m); },
        showAppConfirmSheet: (opts) => { smoke._lastSheet = opts; },
        isNativeAppMode: () => true,
        confirm: () => { throw new Error('native confirm must not be called in app mode'); },
        addCorePieces: () => {}, ensureSlopSushiState: () => {}, grantPinPack: () => {}, addPacketSignal: () => {},
        // Central grantReward (rebuild stage 1): grantSeasonReward grants through it now.
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
    check('smoke: road overlay is created with dialog semantics',
        !!smokeOverlay && smokeOverlay.getAttribute('role') === 'dialog' && smokeOverlay.getAttribute('aria-modal') === 'true');
    const smokeRoad = smokeOverlay?.querySelector('.circuit-road');
    check('smoke: road renders all 25 tier columns from the live season',
        smokeRoad?.children.length === 25);
    const smokeCols = smokeRoad?.children || [];
    check('smoke: tier 1 unlocked at level 5, tier 6 locked',
        smokeCols[0]?.className.includes('unlocked') && !smokeCols[5]?.className.includes('unlocked'));
    const smokeT1 = smokeCollectButtons(smokeCols[0]);
    check('smoke: tier 1 free already claimed, premium PREMIUM LOCKED (premium card first)',
        smokeT1[1]?.textContent === '✓ CLAIMED' && smokeT1[1]?.disabled === true &&
        smokeT1[0]?.textContent === 'PREMIUM LOCKED' && smokeT1[0]?.disabled === true);
    const smokeT3 = smokeCollectButtons(smokeCols[2]);
    check('smoke: tier 3 free is CLAIM at level 5', smokeT3[1]?.textContent === 'CLAIM' && smokeT3[1]?.disabled === false);
    smokeT3[1].onclick();
    check('smoke: claiming tier 3 free grants 1 tapper, toasts, and re-renders claimed',
        smoke.playerData.starrDrops === 1 && smokeToasts.some(t => t.includes('Claimed')) &&
        smokeCollectButtons(smokeOverlay.querySelector('.circuit-road').children[2])[1].textContent === '✓ CLAIMED');
    check('smoke: tier 6 free shows LEVEL 6 and is disabled',
        smokeCollectButtons(smokeCols[5])[1]?.textContent === 'LEVEL 6' && smokeCollectButtons(smokeCols[5])[1]?.disabled === true);
    const smokePrem = smokeCollectButtons(smokeOverlay.querySelector('.circuit-premium'));
    check('smoke: premium upsell shows both real prices (100 gems / 11,999 coins, rebuild stage 4)', smokePrem.length === 2 && smokePrem[0].textContent.includes('100') && smokePrem[1].textContent.includes('11,999'));
    smokePrem[0].onclick();
    check('smoke: premium gems button opens the app sheet (never native confirm)',
        smoke._lastSheet && smoke._lastSheet.message.includes('100 Gems') && typeof smoke._lastSheet.onConfirm === 'function');
    smoke._lastSheet.onConfirm();
    check('smoke: confirming premium spends 100 gems and unlocks the track',
        smoke.playerData.gems === 0 && smoke.playerData.seasonPass.premiumUnlocked === true);
    check('smoke: after unlock, tier 2 premium becomes CLAIM',
        smokeCollectButtons(smokeOverlay.querySelector('.circuit-road').children[1])[0]?.textContent === 'CLAIM');
    const smokeTabs = smokeOverlay.querySelectorAll('[data-tab]');
    check('smoke: two tabs exist (road + vault)', smokeTabs.length === 2);
    smokeTabs[1].onclick();
    const smokeShop = smokeOverlay.querySelector('.circuit-shop');
    check('smoke: vault renders all 5 real offers', smokeShop?.children.length === 5);
    const smokeOffers = smokeCollectButtons(smokeShop);
    check('smoke: Coin Cache (100 tokens) is buyable with a 250 wallet',
        smokeOffers[0]?.textContent.includes('100') && smokeOffers[0]?.disabled === false);
    smokeOffers[0].onclick();
    check('smoke: buying Coin Cache opens the app sheet', smoke._lastSheet && smoke._lastSheet.message.includes('100 Pass Tokens'));
    smoke._lastSheet.onConfirm();
    check('smoke: confirming the purchase spends 100 tokens, grants 200 coins, toasts',
        smoke.playerData.seasonPass.tokenWallet === 150 && smoke.playerData.coins === 10200 && smokeToasts.some(t => t.includes('Bought Coin Cache')));
    smokeOverlay.querySelector('[data-action="quests"]').onclick();
    check('smoke: MISSIONS closes the road and opens the Quest Board season tab',
        !smokeBody.children.find(c => c.id === 'circuitPassOverlay') && smokeOpenedBoard === 'season');
}

// --- 12. Hygiene ---
check('no banned bare word in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));

console.log(`arena-forge-round2-season-road: ${passed} passed, ${failed} failed`);
if (failed) { for (const f of failures) console.log('FAIL: ' + f); process.exit(1); }
