// Arena Forge round 2 Tier 2 "feel" (2026-11-19): hero voice lines on
// tap, seasonal whole-app re-skin, post-match real stats. App/touch mode
// only: the website is untouched, no mechanics / numbers / core-kit
// changes, no new art assets. Source-presence pins + VM behavior mirrors
// (same pattern as the app-results-flow suite: extract the helper source,
// run it in a sandbox with stubbed globals).
// Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Brace-match a top-level function declaration out of game.js source.
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
            i++;
            continue;
        }
        if (ch === '/' && nxt === '/') { line = true; i++; continue; }
        if (ch === '/' && nxt === '*') { block = true; i++; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in ${name}`);
}

// WCAG relative luminance + contrast ratio (season accents must be >= 4.5:1).
function lum(hex) {
    const c = hex.replace('#', '');
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(parseInt(c.slice(0, 2), 16)) + 0.7152 * f(parseInt(c.slice(2, 4), 16)) + 0.0722 * f(parseInt(c.slice(4, 6), 16));
}
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

// ---------------------------------------------------------------- voice ---
const heroVoiceSrc = extractFunction(game, 'playAppHeroVoiceLine');
const heroMutedSrc = extractFunction(game, 'appHeroMuted');

check('hero click plays the voice line AND still navigates to Fighters', game.includes("document.getElementById('appHomeHero')?.addEventListener('click', () => { appBuzz(10); setAppHomeTab('fighters'); });") && game.includes("document.getElementById('appHomeHero')?.addEventListener('click', () => { playAppHeroVoiceLine(); });"));
check('hero keyboard activation also plays the voice line', (() => {
    const kd = game.indexOf("addEventListener('keydown', (event) => {");
    return kd !== -1 && game.indexOf("playAppHeroVoiceLine(); setAppHomeTab('fighters');", kd) !== -1;
})());
check('voice wiring lives in buildAppHome (app-only builder)', game.indexOf('playAppHeroVoiceLine(); setAppHomeTab') > game.indexOf('function buildAppHome()'));
check('mute pref is the shared arenaForgeMutedV1 key, read only', heroMutedSrc.includes("localStorage.getItem('arenaForgeMutedV1')") && !game.includes("setItem('arenaForgeMutedV1'"));
check('hero voice helper resolves the brawler module by capitalized id', heroVoiceSrc.includes("'Brawe' + id.charAt(0).toUpperCase() + id.slice(1) + 'Voice'"));
check("hero voice helper plays the 'spawn' greeting line", heroVoiceSrc.includes("mod.play('spawn')"));
check('hero voice helper never references an audio file path (no mp3, no assets path)', !/\.mp3|assets\/voice/.test(heroVoiceSrc));
check('hero voice helper never toasts or alerts on failure (missing audio is silent)', !/showToast|alert\(|confirm\(/.test(heroVoiceSrc));
check('hero voice helper never throws (try/catch, false on every failure path)', heroVoiceSrc.includes('try {') && heroVoiceSrc.includes('catch (_) { return false; }'));
check('hero voice helper throttles rapid taps (1s)', heroVoiceSrc.includes('now - appHeroVoiceLastAt < 1000'));

// VM mirror: playAppHeroVoiceLine + appHeroMuted with stubbed globals.
function voiceSandbox({ brawler = 'fuser', mutedValue = null, module = null, nowMs = 5000 } = {}) {
    let now = nowMs;
    const calls = [];
    const ctx = {
        selectedBrawler: brawler,
        performance: { now: () => now },
        Date,
        window: {},
        localStorage: { getItem: (k) => (k === 'arenaForgeMutedV1' ? mutedValue : null) },
        __calls: calls,
        __setNow: (v) => { now = v; },
    };
    if (module !== undefined) ctx.window.BraweFuserVoice = module;
    ctx.window.BraweOutlitVoice = { play: (t) => { calls.push(['outlit', t]); return true; } };
    vm.createContext(ctx);
    vm.runInContext('let appHeroVoiceLastAt = 0;\n' + heroMutedSrc + '\n' + heroVoiceSrc, ctx);
    return { ctx, calls };
}
{
    const spy = { play: (t) => { spy.seen.push(t); return true; }, seen: [] };
    const { ctx, calls } = voiceSandbox({ brawler: 'fuser', module: spy });
    check('VM: fuser hero tap plays spawn via the module', vm.runInContext("playAppHeroVoiceLine()", ctx) === true && spy.seen.join() === 'spawn');
    check('VM: second immediate tap is throttled (module called once)', vm.runInContext("playAppHeroVoiceLine()", ctx) === false && spy.seen.length === 1);
    check('VM: tap after 1s plays again', (() => { ctx.__setNow(6500); return vm.runInContext("playAppHeroVoiceLine()", ctx) === true && spy.seen.length === 2; })());
}
{
    const spy = { play: () => { spy.n++; return true; }, n: 0 };
    const { ctx } = voiceSandbox({ brawler: 'fuser', mutedValue: '1', module: spy });
    check("VM: mute '1' silences the hero line", vm.runInContext("playAppHeroVoiceLine()", ctx) === false && spy.n === 0);
}
{
    const spy = { play: () => { spy.n++; return true; }, n: 0 };
    const { ctx } = voiceSandbox({ brawler: 'fuser', mutedValue: 'true', module: spy });
    check("VM: mute 'true' silences the hero line", vm.runInContext("playAppHeroVoiceLine()", ctx) === false && spy.n === 0);
}
{
    const spy = { play: () => { spy.n++; return true; }, n: 0 };
    const { ctx } = voiceSandbox({ brawler: 'fuser', mutedValue: null, module: spy });
    check('VM: absent mute key means unmuted', vm.runInContext("playAppHeroVoiceLine()", ctx) === true && spy.n === 1);
}
{
    const { ctx } = voiceSandbox({ brawler: 'outlit', module: undefined });
    // No fuser module installed; outlit module is installed in the sandbox.
    check('VM: outlit hero tap resolves the outlit module', vm.runInContext("playAppHeroVoiceLine()", ctx) === true);
}
{
    const { ctx } = voiceSandbox({ brawler: 'zzzznomodule', module: undefined });
    ctx.window.BraweOutlitVoice = undefined;
    check('VM: brawler with no voice module is a silent no-op (false, no throw)', vm.runInContext("playAppHeroVoiceLine()", ctx) === false);
}
{
    const throwing = { play: () => { throw new Error('boom'); } };
    const { ctx } = voiceSandbox({ brawler: 'fuser', module: throwing });
    check('VM: throwing voice module is swallowed (false, no throw)', vm.runInContext("playAppHeroVoiceLine()", ctx) === false);
}

// Missing-file inventory, checked against the repo at build time: the
// modules list clips; only fuser + outlit mp3s exist on disk.
function voiceInventory(id) {
    const mod = read(`modules/audio/${id}-voicelines.js`);
    const listed = [...new Set(mod.match(/[a-z]+-\d+\.mp3/g) || [])];
    const present = listed.filter((f) => fs.existsSync(new URL(`assets/voice/${id}/${f}`, root)));
    return { listed: listed.length, present: present.length, missing: listed.length - present.length };
}
{
    const fuser = voiceInventory('fuser');
    const outlit = voiceInventory('outlit');
    const pandy = voiceInventory('pandy');
    const snipa = voiceInventory('snipa');
    const voodoyou = voiceInventory('voodoyou');
    check('inventory: fuser lists 24 clips, all 24 present', fuser.listed === 24 && fuser.present === 24);
    check('inventory: outlit lists 27 clips, all 27 present', outlit.listed === 27 && outlit.present === 27);
    check('inventory: pandy lists 12 clips, 0 present (voice not rendered yet)', pandy.listed === 12 && pandy.present === 0);
    check('inventory: snipa lists 12 clips, 0 present (voice not rendered yet)', snipa.listed === 12 && snipa.present === 0);
    check('inventory: voodoyou lists 12 clips, 0 present (voice not rendered yet)', voodoyou.listed === 12 && voodoyou.present === 0);
    check('inventory: exactly 36 voice mp3s are missing across pandy/snipa/voodoyou', pandy.missing + snipa.missing + voodoyou.missing === 36);
    for (const id of ['bookworm', 'driller', 'freezeon', 'gravy']) {
        const mod = read(`modules/audio/${id}-voicelines.js`);
        check(`inventory: ${id} module references no mp3 files (silent TTS-hook no-op until Anthony picks a voice)`, !/\.mp3/.test(mod) && mod.includes('VoiceClip'));
    }
    // The fuser/outlit modules themselves mark failed files dead and stay
    // silent — the guard lives in the module, not in the hero tap.
    for (const id of ['fuser', 'outlit']) {
        const mod = read(`modules/audio/${id}-voicelines.js`);
        check(`guard: ${id} module marks failed audio dead and never throws`, mod.includes('deadFiles') && mod.includes("addEventListener('error'"));
    }
}

// -------------------------------------------------------------- season -----
const themeMapSrc = (() => {
    const start = game.indexOf('const APP_SEASON_THEMES = {');
    return game.slice(start, game.indexOf('};', start) + 2);
})();
const themeFnSrc = extractFunction(game, 'applyAppSeasonTheme');
check('season theme map covers all four season keys', ['arenaween', 'turkey', 'xplodemis', 'ember'].every((k) => themeMapSrc.includes(`${k}: {`)));
check('season theme map has accent/soft/ink/bg1/bg2 per season', (themeMapSrc.match(/accent: '#[0-9a-f]{6}', soft: '#[0-9a-f]{6}', ink: '#[0-9a-f]{6}', bg1: '#[0-9a-f]{6}', bg2: '#[0-9a-f]{6}'/g) || []).length === 4);
check('season theme uses no new art assets (hex colors only, no url/assets)', !/url\(|assets\//.test(themeMapSrc));
check('xplodemis theme is the Christmas 2026 set: gold accent on pine green', themeMapSrc.includes("xplodemis: { accent: '#ffd76b'") && themeMapSrc.includes("bg1: '#06231a', bg2: '#0a3d24'"));
check('season theme is applied on every home sync', game.includes('try { applyAppSeasonTheme(); } catch (_) {}') && game.indexOf('applyAppSeasonTheme();') > game.indexOf('function syncAppHome()'));
check('home background follows the season vars (fallbacks = today look)', game.includes(".native-app #appHome{background:linear-gradient(160deg,var(--app-season-bg1,#06101f) 0%,var(--app-season-bg2,#0a2140) 55%,#04101f 100%)}"));
check('season chip follows the season accent', game.includes('color:var(--app-season-accent,#ffd166)'));
check('active tab follows the season accent', game.includes('#appHomeTabs button.is-active{background:var(--app-season-accent,#ff9f1c);border-color:var(--app-season-accent-soft,#ffd166);color:var(--app-season-accent-ink,#231303);box-shadow:0 4px 0 #b96a00,0 8px 16px rgba(255,159,28,.3)}')); // rebase: bottom-bar redesign (PR #162) added the depth shadow to the same rule — accent vars unchanged
check('hero FIGHTERS button follows the season accent', game.includes('.app-hero-fighters{') && game.includes('background:var(--app-season-accent,#ff9f1c);color:var(--app-season-accent-ink,#231303)'));
check('season theme writes vars only in app mode', themeFnSrc.includes('if (!isNativeAppMode()) return;'));
check('season theme records the applied season on the root element', themeFnSrc.includes("root.dataset.appSeason = key || 'default'"));

// VM mirror: applyAppSeasonTheme per season.
function themeSandbox(seasonKey, native = true) {
    const written = {};
    const ctx = {
        isNativeAppMode: () => native,
        getActiveSeasonProfile: () => ({ key: seasonKey, seasonNumber: 6, name: 'X' }),
        document: { documentElement: { style: { setProperty: (k, v) => { written[k] = v; } }, dataset: {} } },
        __written: written,
    };
    vm.createContext(ctx);
    const consts = game.slice(game.indexOf('const APP_SEASON_THEMES = {'), game.indexOf('let appSeasonThemeKey = null;'));
    vm.runInContext(consts + 'let appSeasonThemeKey = null;\n' + themeFnSrc, ctx);
    return { ctx, written };
}
{
    const expected = {
        arenaween: { '--app-season-accent': '#ffa94d', '--app-season-accent-soft': '#ffd166', '--app-season-accent-ink': '#2b1503', '--app-season-bg1': '#160a2e', '--app-season-bg2': '#3a1250' },
        turkey: { '--app-season-accent': '#ff9f1c', '--app-season-accent-soft': '#ffd166', '--app-season-accent-ink': '#231303', '--app-season-bg1': '#1c1006', '--app-season-bg2': '#3a2410' },
        xplodemis: { '--app-season-accent': '#ffd76b', '--app-season-accent-soft': '#7ddba3', '--app-season-accent-ink': '#231303', '--app-season-bg1': '#06231a', '--app-season-bg2': '#0a3d24' },
        ember: { '--app-season-accent': '#ff8a3d', '--app-season-accent-soft': '#ffb347', '--app-season-accent-ink': '#2b0e02', '--app-season-bg1': '#200a04', '--app-season-bg2': '#471307' },
    };
    for (const [key, vars] of Object.entries(expected)) {
        const { ctx, written } = themeSandbox(key);
        vm.runInContext('applyAppSeasonTheme()', ctx);
        check(`VM: ${key} season sets all five theme vars`, Object.entries(vars).every(([k, v]) => written[k] === v));
        check(`VM: ${key} season tags the root element`, ctx.document.documentElement.dataset.appSeason === key);
        check(`VM: ${key} accent reads >= 4.5:1 on its background`, contrast(vars['--app-season-accent'], vars['--app-season-bg1']) >= 4.5);
        check(`VM: ${key} accent ink reads >= 4.5:1 on the accent`, contrast(vars['--app-season-accent-ink'], vars['--app-season-accent']) >= 4.5);
    }
    const { ctx, written } = themeSandbox('not-a-season');
    vm.runInContext('applyAppSeasonTheme()', ctx);
    check('VM: unknown season key falls back to today look', written['--app-season-accent'] === '#ff9f1c' && written['--app-season-bg1'] === '#06101f');
    const off = themeSandbox('xplodemis', false);
    vm.runInContext('applyAppSeasonTheme()', off.ctx);
    check('VM: theme never applies outside app mode (website untouched)', Object.keys(off.written).length === 0);
    const { ctx: ctx2, written: w2 } = themeSandbox('ember');
    vm.runInContext('applyAppSeasonTheme(); applyAppSeasonTheme();', ctx2);
    check('VM: re-applying the same season writes vars once (idempotent)', Object.keys(w2).length === 5);
}

// --------------------------------------------------------------- stats -----
const statsFnSrc = extractFunction(game, 'buildMatchResultsStats');
check('results screen builds the stats section only in app mode', game.includes('if (isNativeAppMode()) {\n                resultCard.appendChild(buildMatchResultsStats(fullOnDamageEarned));'));
// Ranked RP rework (stage 6): match damage is a real per-match ledger again.
check('stats section is fed the real per-match damage ledger', game.includes('const fullOnDamageEarned = matchDamageDealt;'));
check('stats builder shows exactly one row: Match damage', statsFnSrc.includes("dmgLabel.textContent = '💥 Match damage'") && (statsFnSrc.match(/className = 'match-results-stat-row'/g) || []).length === 1);
check('stats builder never labels the number "damage dealt" (it is the mixed match ledger)', !/damage dealt/i.test(statsFnSrc));
check('stats builder has no takedown row (no per-match takedown data exists)', !/Takedown/i.test(statsFnSrc));
check('stats builder has no healing row (no per-match healing data exists)', !/Healing/i.test(statsFnSrc));
check('stats styles are scoped under .native-app (website never sees them)', game.includes('.native-app .match-results-stats{') && game.includes('.native-app .match-results-stat-row{'));
check('a per-match takedown counter exists for the Ranked RP ledger (rebuild stage 6)', game.includes('let matchKills = 0;') && game.includes('resetMatchRpLedger();'));
check('no per-match healing counter exists anywhere in game.js', !/healingDone|healThisMatch|matchHeal|totalHealedThisMatch/i.test(game));
check('takedowns exist only as the career cumulative counter', game.includes('careerStats.eliminations += 1'));
check('healing records nothing per match (doHeal has no stats write)', (() => {
    const d = extractFunction(game, 'doHeal');
    return !/Stats|record|match/i.test(d);
})());
check('general damage path no longer feeds a Full-On Damage ledger (deleted)', (() => {
    const a = extractFunction(game, 'applyShieldDamage');
    return !a.includes('recordFullOnDamage');
})());

// VM mirror: buildMatchResultsStats with a stub document.
function statsSandbox() {
    class El {
        constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this.textContent = ''; this.attrs = {}; }
        setAttribute(k, v) { this.attrs[k] = v; }
        appendChild(c) { this.children.push(c); return c; }
    }
    const ctx = { document: { createElement: (t) => new El(t) }, Math };
    vm.createContext(ctx);
    vm.runInContext(statsFnSrc, ctx);
    return ctx;
}
{
    const ctx = statsSandbox();
    const box = vm.runInContext('buildMatchResultsStats(1234567)', ctx);
    check('VM: stats box is a MATCH STATS section with one row', box.className === 'match-results-stats' && box.children.length === 2 && box.children[0].textContent === 'MATCH STATS');
    const row = box.children[1];
    check('VM: damage value is locale-formatted', row.children[0].textContent === '💥 Match damage' && row.children[1].textContent === '1,234,567');
    const zero = vm.runInContext('buildMatchResultsStats(0)', ctx);
    check('VM: zero damage shows 0 (a real number, not a blank)', zero.children[1].children[1].textContent === '0');
    const bad = vm.runInContext('buildMatchResultsStats(undefined)', ctx);
    check('VM: missing damage total degrades to 0, never NaN', bad.children[1].children[1].textContent === '0');
    const neg = vm.runInContext('buildMatchResultsStats(-50)', ctx);
    check('VM: negative damage total clamps to 0', neg.children[1].children[1].textContent === '0');
}

// --------------------------------------------------------------- hygiene ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));
check('no new audio files were invented by this build (voice inventory is read-only)', (() => {
    // The build adds no files under assets/voice: the directory still
    // holds exactly the fuser + outlit clip sets.
    const f = fs.readdirSync(new URL('assets/voice/fuser', root));
    const o = fs.readdirSync(new URL('assets/voice/outlit', root));
    return f.length === 24 && o.length === 27;
})());

console.log(`arena-forge-round2-tier2-feel: ${passed} passed, ${failed} failed${failed ? ' — ' + failures.join(' | ') : ''}`);
process.exit(failed ? 1 : 0);
