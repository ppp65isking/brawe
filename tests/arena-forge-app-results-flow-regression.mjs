// Arena Forge app results flow (2026-11-19, app overhaul C): the results
// screen returns IN PLACE — no window.location.reload() — and non-tournament
// results get a PLAY AGAIN button that rematches the same mode with the same
// brawler via the existing launch path. Layout/UX/flow only: no mechanics,
// numbers, or core-kit changes; website untouched.
// Source-presence pins + VM behavior mirrors (same pattern as the bookworm
// suite: extract the helper source, run it in a sandbox with stubbed
// globals, assert every reset). Never uses the banned bare word.
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
const css = read('styles.css');
const self = fs.readFileSync(new URL(import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// Strip // and /* */ comments (string-aware) so a reload mentioned in a
// comment is never mistaken for a reload call, and vice versa.
function stripComments(src) {
    let out = '', i = 0, inS = null, esc = false;
    while (i < src.length) {
        const ch = src[i], nxt = src[i + 1];
        if (inS) {
            out += ch;
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === inS) inS = null;
            i++;
            continue;
        }
        if (ch === '/' && nxt === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (ch === '/' && nxt === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
        if (ch === "'" || ch === '"' || ch === '`') inS = ch;
        out += ch;
        i++;
    }
    return out;
}
const code = stripComments(game);

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
        if (ch === "'" || ch === '"' || ch === '`') { inS = ch; i++; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
        i++;
    }
    throw new Error(`unbalanced braces in ${name}`);
}
const returnSrc = extractFunction(game, 'returnToLobbyFromResults');
const playAgainSrc = extractFunction(game, 'playAgainFromResults');

// --- R1: no reload in the results return path ---
check('results RETURN TO LOBBY calls returnToLobbyFromResults (no inline reload)', game.includes('homeBtn.onclick = () => returnToLobbyFromResults(overlay);'));
check('exactly one reload call remains in code, and it is the Tutorial Complete button (out of scope)', (() => {
    const hits = [...code.matchAll(/window\.location\.reload\(\)/g)];
    if (hits.length !== 1) return false;
    const idx = code.indexOf('window.location.reload()');
    return code.lastIndexOf('Tutorial Complete', idx) !== -1;
})());
check('returnToLobbyFromResults is defined once, before render()', game.indexOf('function returnToLobbyFromResults(resultsOverlay) {') !== -1 && game.indexOf('function returnToLobbyFromResults(resultsOverlay) {') < game.indexOf('function render(){'));
check('return helper removes the results overlay', returnSrc.includes('if (resultsOverlay && resultsOverlay.remove) resultsOverlay.remove();'));
check('return helper keeps the original event-flag resets verbatim', ['currentMapOverride = null;', 'isHyperEvent = false;'].every((s) => returnSrc.includes(s)));
check('return helper does NOT contain a reload call', !returnSrc.includes('window.location.reload()'));

// --- R1: every replicated reset is pinned in the helper source ---
const expectedResets = [
    'playing = false;', 'gameOver = false;', 'hasHandledGameOver = false;',
    "duelRoundState = 'playing';", 'playerScore = 0;', 'botScore = 0;',
    'savedPlayerSuper = 0;', 'savedPlayerHyper = 0;', 'savedBotSuper = 0;', 'savedBotHyper = 0;',
    'clearRankedSessionState();', 'clearShowdownModifier();',
    'isTournamentMatch = false;', 'tournamentLastResult = null;', 'tournamentMatchContext = null;',
    'isDuels = false;', 'player.fusedParts = null;',
    'isDuelsMaxedMode = false;',
    'isBossFight = false;',
    'isTraining = false;', 'isTutorialMode = false;', 'isSoloTrial = false;',
    'isDuoShowdown = false;', 'isObjectiveMode = false;',
    'isTurkeyCaptureMode = false;', 'turkeyCaptureState = null;',
    'isPropHuntMode = false;', 'propHuntState = null;',
    'isBrickVaultMode = false;', 'isArenaForgeMode = false;',
    'isTrioShowdownMode = false;', 'isDamageFillerMode = false;',
    'isMirrorMode = false;',
    'isKnockDonateMode = false;',
    'isWarperEvent = false;',
];
for (const reset of expectedResets) check(`return helper resets ${reset}`, returnSrc.includes(reset));
check('return helper deliberately keeps showdownMode + selectedBrawler (home selection, not match state)', !returnSrc.includes('showdownMode =') && !returnSrc.includes('selectedBrawler ='));

// --- R1: home is shown + rebuilt in place ---
check('return helper shows home the exitTrainingModeToHome way', returnSrc.includes("if (homeScreen) homeScreen.style.display = 'flex';"));
check('return helper re-enables the brawler select', returnSrc.includes('if (brawlerSelect) brawlerSelect.disabled = false;'));
check('return helper restores the boot topbar text', returnSrc.includes("textContent = 'Arena Forge — Showdown'"));
check('return helper rebuilds the web home UI', returnSrc.includes('refreshHomeUI();'));
check('return helper resets the app tab to home and re-syncs the app shell', returnSrc.includes("setAppHomeTab('home')") && returnSrc.includes('syncAppHome();'));
check('return helper guards the home refresh so a render throw cannot strand the player', returnSrc.includes('try { refreshHomeUI(); } catch (_) {}'));

// --- R2: PLAY AGAIN on non-tournament results ---
check('PLAY AGAIN button exists only on non-tournament results', game.includes('if (!isTournamentMatch) {') && game.includes("playAgainBtn.textContent = '▶ PLAY AGAIN';"));
check('PLAY AGAIN button has its own class and routes to playAgainFromResults', game.includes("playAgainBtn.className = 'match-results-play-again';") && game.includes('playAgainBtn.onclick = () => playAgainFromResults(overlay);'));
check('PLAY AGAIN is appended before RETURN TO LOBBY (primary action first)', game.indexOf('resultCard.appendChild(playAgainBtn);') !== -1 && game.indexOf('resultCard.appendChild(playAgainBtn);') < game.indexOf('resultCard.appendChild(homeBtn);'));
check('PLAY AGAIN style exists (gold primary, same 54px geometry as RETURN TO LOBBY)', css.includes('.match-results-play-again{position:relative;z-index:1;min-height:54px;') && css.includes('background:linear-gradient(135deg,#ffd44f,#ffb347)'));
check('PLAY AGAIN keeps 48px min-height under 560px', css.includes('.match-results-play-again{min-height:48px}'));

// --- R2: PLAY AGAIN routes through the existing launch path ---
check('play-again helper refuses tournament matches (PLAY NEXT MATCH owns those)', playAgainSrc.includes('if (isTournamentMatch) return false;'));
check('play-again helper removes the overlay first', playAgainSrc.includes('if (resultsOverlay && resultsOverlay.remove) resultsOverlay.remove();'));
check('play-again duels branch mirrors the draft launch (scores + charges + re-arm)', playAgainSrc.includes('playerScore = 0;') && playAgainSrc.includes('savedPlayerSuper = 0;') && playAgainSrc.includes('hasHandledGameOver = false;') && playAgainSrc.includes('startDuelsRound();'));
check('play-again showdown branch clicks the existing PLAY button', playAgainSrc.includes("document.getElementById('startMatch')?.click();"));

// --- Tournament results behavior unchanged ---
check('tournament PLAY NEXT MATCH still launches in place via launchTournamentMatch', game.includes('if (!launchTournamentMatch()) openTournamentBracket();'));
check('tournament buttons still remove the overlay before launching', game.includes("mkTournamentBtn(`⚔ PLAY NEXT MATCH") && game.includes('overlay.remove();\n                        if (!launchTournamentMatch())'));
check('tournament results block still gated on isTournamentMatch + tournamentLastResult', game.includes('if (isTournamentMatch && tournamentLastResult) {'));
check('RETURN TO LOBBY still sits below the tournament buttons', game.indexOf('resultCard.appendChild(tBtnRow);') !== -1 && game.indexOf('resultCard.appendChild(homeBtn);') > game.indexOf('resultCard.appendChild(tBtnRow);'));

// --- VM behavior: returnToLobbyFromResults actually resets each flag ---
function makeOverlay() { let removed = false; return { el: { remove() { removed = true; } }, get removed() { return removed; } }; }
function baseSandbox() {
    const calls = [];
    const homeScreen = { style: { display: 'none' } };
    const brawlerSelect = { disabled: true };
    const topbar = { textContent: 'Arena Forge - Tournament • Gold League • Final' };
    const startBtn = { clicked: false, click() { this.clicked = true; } };
    const sandbox = {
        currentMapOverride: 3, isHyperEvent: true,
        playing: true, gameOver: true, hasHandledGameOver: true, duelRoundState: 'botDied',
        playerScore: 3, botScore: 2, savedPlayerSuper: 80, savedPlayerHyper: 55, savedBotSuper: 40, savedBotHyper: 90,
        isTournamentMatch: true, tournamentLastResult: { outcome: 'advanced' }, tournamentMatchContext: { league: 'gold' },
        isDuels: true, isDuelsMaxedMode: true,
        isBossFight: true,
        isTraining: true, isTutorialMode: true, isSoloTrial: true, isDuoShowdown: true,
        isObjectiveMode: true, isTurkeyCaptureMode: true, turkeyCaptureState: { scores: { player: 1 } },
        isPropHuntMode: true, propHuntState: { winner: 'seekers' },
        isBrickVaultMode: true, isArenaForgeMode: true, isTrioShowdownMode: true, isDamageFillerMode: true,
        isMirrorMode: true,
        isKnockDonateMode: true, isWarperEvent: true,
        showdownMode: 'lava_boss_s3', selectedBrawler: 'outlit',
        player: { fusedParts: ['a', 'b'] },
        homeScreen, brawlerSelect, topbar, startBtn, calls,
        clearRankedSessionState() { calls.push('clearRankedSessionState'); },
        clearShowdownModifier() { calls.push('clearShowdownModifier'); },
        refreshHomeUI() { calls.push('refreshHomeUI'); },
        setAppHomeTab(tab) { calls.push(`setAppHomeTab:${tab}`); },
        syncAppHome() { calls.push('syncAppHome'); },
        generateCubes() { calls.push('generateCubes'); },
        startDuelsRound() { calls.push('startDuelsRound'); },
        cubes: [1, 2], powerups: [1], amplifierToolboxes: [1], amplifierScrewZones: [1], skeleParachutes: [1], skelePortals: [1],
        WORLD_W: 2200, WORLD_H: 1800,
        document: { getElementById(id) { if (id === 'topbar') return topbar; if (id === 'startMatch') return startBtn; return null; } },
    };
    return { sandbox, homeScreen, brawlerSelect, topbar, startBtn, calls };
}
function runHelpers(sandbox) {
    vm.createContext(sandbox);
    vm.runInContext(`${returnSrc}\n${playAgainSrc}`, sandbox);
}
{
    const { sandbox, homeScreen, brawlerSelect, topbar, calls } = baseSandbox();
    runHelpers(sandbox);
    const ov = makeOverlay();
    vm.runInContext('returnToLobbyFromResults(__ov)', Object.assign(sandbox, { __ov: ov.el }));
    check('VM return: overlay removed', ov.removed);
    const falseFlags = ['isHyperEvent', 'playing', 'gameOver', 'hasHandledGameOver', 'isTournamentMatch', 'isDuels', 'isDuelsMaxedMode', 'isBossFight', 'isTraining', 'isTutorialMode', 'isSoloTrial', 'isDuoShowdown', 'isObjectiveMode', 'isTurkeyCaptureMode', 'isPropHuntMode', 'isBrickVaultMode', 'isArenaForgeMode', 'isTrioShowdownMode', 'isDamageFillerMode', 'isMirrorMode', 'isKnockDonateMode', 'isWarperEvent'];
    for (const flag of falseFlags) check(`VM return: ${flag} is false`, sandbox[flag] === false);
    const zeroFlags = ['playerScore', 'botScore', 'savedPlayerSuper', 'savedPlayerHyper', 'savedBotSuper', 'savedBotHyper'];
    for (const flag of zeroFlags) check(`VM return: ${flag} is 0`, sandbox[flag] === 0);
    check('VM return: currentMapOverride is null', sandbox.currentMapOverride === null);
    check('VM return: tournamentLastResult is null', sandbox.tournamentLastResult === null);
    check('VM return: tournamentMatchContext is null', sandbox.tournamentMatchContext === null);
    check('VM return: turkeyCaptureState is null', sandbox.turkeyCaptureState === null);
    check('VM return: propHuntState is null', sandbox.propHuntState === null);
    check('VM return: player.fusedParts is null', sandbox.player.fusedParts === null);
    check("VM return: duelRoundState is 'playing'", sandbox.duelRoundState === 'playing');
    check('VM return: home shown (display flex)', homeScreen.style.display === 'flex');
    check('VM return: brawler select re-enabled', brawlerSelect.disabled === false);
    check('VM return: topbar back to boot text', topbar.textContent === 'Arena Forge — Showdown');
    check('VM return: ranked/friendly session reset runs', calls.includes('clearRankedSessionState'));
    check('VM return: showdown modifier cleared', calls.includes('clearShowdownModifier'));
    check('VM return: home UI rebuilt', calls.includes('refreshHomeUI'));
    check('VM return: app tab reset to home', calls.includes('setAppHomeTab:home'));
    check('VM return: app shell re-synced', calls.includes('syncAppHome'));
    check('VM return: showdownMode kept (home selection, not match state)', sandbox.showdownMode === 'lava_boss_s3');
    check('VM return: selectedBrawler kept', sandbox.selectedBrawler === 'outlit');
}

// --- VM behavior: playAgainFromResults routing ---
{
    // Tournament guard: refuses, overlay stays, nothing launches.
    const t = baseSandbox();
    runHelpers(t.sandbox);
    const ov = makeOverlay();
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(t.sandbox, { __ov: ov.el }));
    check('VM play-again: tournament match returns false', ret === false);
    check('VM play-again: tournament overlay NOT removed', !ov.removed);
    check('VM play-again: tournament launches nothing', !t.calls.includes('startDuelsRound') && !t.startBtn.clicked);
}
{
    // Regular Duels: same teams, fresh scores/charges, straight into startDuelsRound.
    const d = baseSandbox();
    d.sandbox.isTournamentMatch = false;
    runHelpers(d.sandbox);
    const ov = makeOverlay();
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(d.sandbox, { __ov: ov.el }));
    check('VM play-again: duels returns true', ret === true);
    check('VM play-again: duels overlay removed', ov.removed);
    check('VM play-again: duels scores reset', d.sandbox.playerScore === 0 && d.sandbox.botScore === 0);
    check('VM play-again: duels saved charges reset', d.sandbox.savedPlayerSuper === 0 && d.sandbox.savedPlayerHyper === 0 && d.sandbox.savedBotSuper === 0 && d.sandbox.savedBotHyper === 0);
    check('VM play-again: duels results screen re-armed', d.sandbox.hasHandledGameOver === false);
    check('VM play-again: duels starts a new round', d.calls.includes('startDuelsRound'));
    check('VM play-again: duels world reset to 1000x1000 with cleared pickups', d.sandbox.WORLD_W === 1000 && d.sandbox.WORLD_H === 1000 && d.sandbox.cubes.length === 0 && d.sandbox.powerups.length === 0);
    check('VM play-again: duels topbar says Duels', d.topbar.textContent === 'Arena Forge - Duels');
    check('VM play-again: duels hides home + disables select', d.homeScreen.style.display === 'none' && d.brawlerSelect.disabled === true);
    check('VM play-again: duels does NOT click PLAY', !d.startBtn.clicked);
}
{
    // Showdown: clicks the existing PLAY button, nothing else launches.
    const s = baseSandbox();
    s.sandbox.isTournamentMatch = false;
    s.sandbox.isDuels = false;
    runHelpers(s.sandbox);
    const ov = makeOverlay();
    const ret = vm.runInContext('playAgainFromResults(__ov)', Object.assign(s.sandbox, { __ov: ov.el }));
    check('VM play-again: showdown returns true via PLAY', ret === true && s.startBtn.clicked);
    check('VM play-again: showdown does NOT call startDuelsRound', !s.calls.includes('startDuelsRound'));
    check('VM play-again: showdown overlay removed before launch', ov.removed);
}

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(self));
check('no banned bare word in styles.css', !/\bcluster\b/i.test(css));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-app-results-flow`);
