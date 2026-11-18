// Tournament mode (32-player bracket, leagues Bronze-Diamond) regression.
// Anthony 2026-11-18: "32 ppl 1 [you] 31 bots ... u choose one brawler
// then u dual in the bracket ... if you win the tournament then u go to
// the silver league tournament, then gold, then diamond. With rewards".
//   Design: reuses the Duels battle engine (startDuelsRound, first to 3
//   rounds, Power 12 maxed loadouts). One brawler locked per entrant for
//   the whole run; bot-vs-bot matches are simulated instantly, weighted by
//   skill tier. Leagues Bronze -> Silver -> Gold -> Diamond; winning a
//   league pays the champion prize and unlocks the next. Progress persists
//   in localStorage under 'arenaForgeTournamentV1'.
//   Difficulty (existing levers only): bot Power level per tier
//   (ROOKIE 9 / CONTENDER 11 / CHAMPION 12, via a tournamentBotLevel
//   override in startDuelsRound) + fire cadence multiplier per tier
//   (ROOKIE 1.4x slower / CONTENDER 1.0 / CHAMPION 0.85x faster, via
//   bot.tournamentCadenceMult in shouldBotShootTarget).
//   Tournament matches pay NO per-match coins — the league champion
//   prize is the payout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- extract the tournament section (between its markers) --------------
const SECTION_START = '  // ---- Tournament mode';
const SECTION_END = '  // ---- End Tournament mode ----';
const secStart = game.indexOf(SECTION_START);
const secEnd = game.indexOf(SECTION_END);
assert.ok(secStart >= 0, 'tournament section start marker exists');
assert.ok(secEnd > secStart, 'tournament section end marker exists');
const section = game.slice(secStart, secEnd + SECTION_END.length);

// ================= 1. source pins =======================================
assert.doesNotMatch(game, /\bcluster\b/i, 'no banned bare word anywhere in game.js');
assert.doesNotMatch(section, /\bcluster\b/i, 'no banned bare word in the tournament section');

// League config: 4 leagues, escalating champion prizes (builder picks).
assert.match(section, /\{ id: 'bronze', name: 'Bronze', emoji: '🥉', color: '#cd7f32', rewardCoins: 500, rewardSouls: 50, tierMix: \{ rookie: 22, contender: 8, champion: 1 \} \}/, 'Bronze league: 500 coins + 50 souls, mix 22/8/1');
assert.match(section, /\{ id: 'silver', name: 'Silver', emoji: '🥈', color: '#c0c0c0', rewardCoins: 1000, rewardSouls: 100, tierMix: \{ rookie: 12, contender: 15, champion: 4 \} \}/, 'Silver league: 1000 coins + 100 souls, mix 12/15/4');
assert.match(section, /\{ id: 'gold', name: 'Gold', emoji: '🥇', color: '#ffd700', rewardCoins: 2000, rewardSouls: 200, tierMix: \{ rookie: 5, contender: 16, champion: 10 \} \}/, 'Gold league: 2000 coins + 200 souls, mix 5/16/10');
assert.match(section, /\{ id: 'diamond', name: 'Diamond', emoji: '💎', color: '#7ee7ff', rewardCoins: 4000, rewardSouls: 400, tierMix: \{ rookie: 0, contender: 13, champion: 18 \} \}/, 'Diamond league: 4000 coins + 400 souls, mix 0/13/18');
assert.match(section, /const TOURNAMENT_DUELS_WIN_SCORE = 3;/, 'bracket matches are first to 3 rounds');
assert.match(section, /const TOURNAMENT_STORAGE_KEY = 'arenaForgeTournamentV1';/, 'persistence key is arenaForgeTournamentV1');

// Tier difficulty mechanism (existing levers).
assert.match(section, /rookie: \{ label: 'ROOKIE', color: '#5df2c2', botLevel: 9, cadenceMult: 1\.4, strength: 1 \}/, 'ROOKIE tier: Power 9, 1.4x cadence, strength 1');
assert.match(section, /contender: \{ label: 'CONTENDER', color: '#ffd166', botLevel: 11, cadenceMult: 1\.0, strength: 2 \}/, 'CONTENDER tier: Power 11, 1.0x cadence, strength 2');
assert.match(section, /champion: \{ label: 'CHAMPION', color: '#ff6b81', botLevel: 12, cadenceMult: 0\.85, strength: 3 \}/, 'CHAMPION tier: Power 12, 0.85x cadence, strength 3');

// Engine hooks.
assert.match(game, /if \(isTournamentMatch\) return TOURNAMENT_DUELS_WIN_SCORE;/, 'getDuelsWinScore returns 3 for tournament matches');
assert.match(game, /const botLevel = isDuelsMaxedMode \? 12 : \(isTowerDuelEvent \? 11 : getBotLevelNearPlayer\(\)\);/, 'startDuelsRound bot level line is untouched');
assert.match(game, /const duelBotLevel = isTournamentMatch \? tournamentBotLevel : botLevel;/, 'tournament bot level overrides via duelBotLevel');
assert.match(game, /tournamentCadenceMult: isTournamentMatch \? tournamentBotCadenceMult : 1,/, 'bot entity carries its tournament cadence multiplier');
assert.match(game, /if \(bot\.tournamentCadenceMult\) cadence \*= bot\.tournamentCadenceMult;/, 'shouldBotShootTarget applies the tournament cadence multiplier');
assert.equal(game.split('\n').filter((l) => l.trim().startsWith('isTournamentMatch = false;')).length, 4, 'isTournamentMatch is reset in all 4 non-tournament Duels launch paths');

// Home screen entry.
assert.match(game, /\['tournament', '🏆', 'Tournament', '32-player bracket • Bronze → Diamond leagues'\]/, 'Tournament mode card exists');
assert.match(game, /const HOME_PERMANENT_MODE_IDS = \['tournament', 'blink_eye_dodge'/, 'Tournament is first in the permanent mode list');
assert.match(game, /'custom_clash', 'tournament'\]/, 'Tournament is in the popular mode list');
assert.match(game, /tournament: '#ffd166',/, 'Tournament mode color exists');
assert.match(game, /else if \(id === 'tournament'\) tag = '32P';/, 'Tournament card tag is 32P');
assert.match(game, /if \(id === 'tournament'\) \{\n\s+openTournamentHub\(\);/, 'mode card click opens the tournament hub');
assert.match(game, /if \(mode === 'tournament'\) \{\n\s+close\(\);\n\s+openTournamentHub\(\);/, 'info-modal PLAY opens the tournament hub');
assert.match(game, /if \(modeId === 'tournament'\) card\.dataset\.baseSubtitle = getTournamentCardSubtitle\(\);/, 'home card subtitle is live tournament state');

// End screen + rewards.
assert.match(game, /if \(isTournamentMatch\) \{\n\s+const tournamentResult = recordTournamentMatchResult\(won\);/, 'end screen records the tournament result');
assert.match(game, /if \(isDuels && won\) rewardCoins = isTournamentMatch \? 0 : 50;/, 'no per-match Duels coin payout in tournament matches');
assert.match(game, /if \(isTournamentMatch\) rewardCoins = 0; \/\/ Tournament matches pay no per-match coins/, 'all per-match coin sources are zeroed before the grant');
assert.match(game, /if \(won && !isTournamentMatch && \(streakBonusCoins > 0/, 'no streak-coins line on tournament result screens');
assert.match(game, /const duelsLine = isTournamentMatch && tournamentMatchContext/, 'in-match HUD shows the tournament line');

// ================= 2. vm harness ========================================
function rngFactory(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function makeBox() {
    const store = {};
    const box = {
        console,
        playerData: { coins: 0, souls: 0 },
        soulsAdded: 0,
        playerScore: 0,
        botScore: 0,
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; },
        },
        safeJsonParse: (raw, fallback) => { try { return JSON.parse(raw); } catch { return fallback; } },
        getBotBrawlerPool: () => ['outlit', 'shelly', 'colt', 'bull', 'nita', 'spike'],
        getUnlockedBrawlerPool: () => ['outlit', 'shelly', 'colt'],
        addSouls: (n) => { box.soulsAdded += n; box.playerData.souls += n; },
        rngFactory,
        _store: store,
    };
    box.addSouls = (n) => { box.soulsAdded += n; box.playerData.souls += n; };
    vm.createContext(box);
    vm.runInContext(section, box);
    return box;
}
function vmEval(box, code) { return vm.runInContext(code, box); }
// Values built inside the vm carry the vm realm's prototypes, so
// deepStrictEqual rejects them against outer-realm literals — normalize
// plain data through JSON first.
const plain = (x) => JSON.parse(JSON.stringify(x));

// ================= 3. vm: config ========================================
{
    const box = makeBox();
    const leagues = vmEval(box, 'TOURNAMENT_LEAGUES');
    assert.equal(leagues.length, 4, '4 leagues');
    assert.deepEqual(plain(leagues.map((l) => l.id)), ['bronze', 'silver', 'gold', 'diamond'], 'league order is Bronze -> Silver -> Gold -> Diamond');
    const coins = leagues.map((l) => l.rewardCoins);
    const souls = leagues.map((l) => l.rewardSouls);
    assert.deepEqual(plain(coins), [500, 1000, 2000, 4000], 'coin prizes escalate Bronze < Silver < Gold < Diamond');
    assert.deepEqual(plain(souls), [50, 100, 200, 400], 'soul prizes escalate Bronze < Silver < Gold < Diamond');
    for (const league of leagues) {
        const total = Object.values(league.tierMix).reduce((a, b) => a + b, 0);
        assert.equal(total, 31, `${league.id} tier mix sums to 31 bots (got ${total})`);
    }
    const names = vmEval(box, 'TOURNAMENT_BOT_NAMES');
    assert.equal(names.length, 31, '31 bot names');
    assert.equal(new Set(names).size, 31, 'bot names are unique');
    for (const name of names) {
        assert.equal(typeof name, 'string', 'bot name is a string');
        assert.ok(name.length > 0, 'bot name is non-empty');
        assert.ok(!/^Bot\b/i.test(name), `bot name ${name} is a real name, not "Bot N"`);
    }
    const tiers = vmEval(box, 'TOURNAMENT_TIERS');
    assert.deepEqual(Object.keys(tiers).sort(), ['champion', 'contender', 'rookie'], 'exactly 3 skill tiers');
}

// ================= 4. vm: bracket generation ============================
function freshBracket(box, leagueId = 'bronze', brawler = 'outlit', seed = 42) {
    vmEval(box, `tournamentStateCache = null;`);
    return vmEval(box, `generateTournamentBracket('${leagueId}', '${brawler}', rngFactory(${seed}))`);
}
{
    const box = makeBox();
    const active = freshBracket(box);
    assert.equal(active.league, 'bronze', 'bracket is for the Bronze league');
    assert.equal(active.playerBrawler, 'outlit', 'player brawler is recorded');
    assert.equal(active.entrants.length, 32, '32 entrants');
    const players = active.entrants.filter((e) => e.isPlayer);
    assert.equal(players.length, 1, 'exactly one player entrant');
    assert.equal(players[0].brawler, 'outlit', 'player entrant plays the picked brawler');
    const bots = active.entrants.filter((e) => !e.isPlayer);
    assert.equal(bots.length, 31, '31 bot entrants');
    for (const bot of bots) {
        assert.ok(['rookie', 'contender', 'champion'].includes(bot.tier), `bot ${bot.name} has a skill tier`);
        assert.ok(typeof bot.brawler === 'string' && bot.brawler.length > 0, `bot ${bot.name} has a locked brawler`);
    }
    // Bronze tier mix is honored.
    const mix = { rookie: 0, contender: 0, champion: 0 };
    for (const bot of bots) mix[bot.tier]++;
    assert.deepEqual(plain(mix), { rookie: 22, contender: 8, champion: 1 }, 'Bronze bot tier mix is 22/8/1');
    // Round 0: 16 matches, only the player's match undecided.
    assert.equal(active.rounds.length, 1, 'only round 0 exists at generation');
    assert.equal(active.rounds[0].length, 16, 'round of 32 has 16 matches');
    const undecided = active.rounds[0].filter((m) => m.winner == null);
    assert.equal(undecided.length, 1, 'exactly one undecided match in round 0 (the player\'s)');
    const playerIndex = active.entrants.findIndex((e) => e.isPlayer);
    assert.ok(undecided[0].a === playerIndex || undecided[0].b === playerIndex, 'the undecided match is the player\'s');
    assert.equal(active.currentRound, 0, 'current round is 0');
    assert.equal(active.status, 'active', 'bracket status is active');
    // The player's opponent is a named bot with a tier and a brawler.
    const opponent = vmEval(box, `getTournamentOpponent(${JSON.stringify(active)})`);
    assert.ok(opponent && !opponent.isPlayer, 'opponent is a bot');
    assert.ok(opponent.name && opponent.tier && opponent.brawler, 'opponent has name, tier and brawler');
}

// ================= 5. vm: bot-match simulation ==========================
{
    const box = makeBox();
    // Tier objects live in the box so the vm returns the SAME references.
    box.rookie = { name: 'R', tier: 'rookie' };
    box.contender = { name: 'C', tier: 'contender' };
    box.champion = { name: 'H', tier: 'champion' };
    // rng 0.0 always favors the stronger tier; rng ~1.0 always the weaker.
    assert.equal(vmEval(box, 'simulateTournamentBotMatch(champion, rookie, () => 0)'), box.champion, 'champion beats rookie at rng 0');
    assert.equal(vmEval(box, 'simulateTournamentBotMatch(champion, rookie, () => 0.999)'), box.rookie, 'rookie can upset champion at rng ~1');
    assert.equal(vmEval(box, 'simulateTournamentBotMatch(contender, rookie, () => 0)'), box.contender, 'contender beats rookie at rng 0');
    assert.equal(vmEval(box, 'simulateTournamentBotMatch(rookie, rookie, () => 0.5)'), box.rookie, 'equal tiers: first entrant wins at rng 0.5');
}

// ================= 6. vm: advance + brawler lock ========================
{
    const box = makeBox();
    const active = freshBracket(box);
    const before = active.entrants.map((e) => e.brawler);
    const playerIndex = active.entrants.findIndex((e) => e.isPlayer);
    const match = active.rounds[0].find((m) => m.a === playerIndex || m.b === playerIndex);
    match.winner = playerIndex; // player wins the Round of 32
    // Share the reference with the vm (JSON would copy it and hide mutations).
    box.active = active;
    vmEval(box, 'advanceTournamentAfterWin(active, rngFactory(7))');
    assert.equal(active.currentRound, 1, 'advanced to round 1');
    assert.equal(active.rounds.length, 2, 'round 1 was built');
    assert.equal(active.rounds[1].length, 8, 'round of 16 has 8 matches');
    const undecided = active.rounds[1].filter((m) => m.winner == null);
    assert.equal(undecided.length, 1, 'exactly one undecided match in round 1 (the player\'s)');
    assert.deepEqual(plain(active.entrants.map((e) => e.brawler)), plain(before), 'no entrant brawler changed after advancing (lock holds)');
    // Winning with an unfinished round does not advance.
    const stuck = freshBracket(box, 'bronze', 'outlit', 99);
    const pIdx = stuck.entrants.findIndex((e) => e.isPlayer);
    const m = stuck.rounds[0].find((x) => x.a === pIdx || x.b === pIdx);
    m.winner = pIdx;
    stuck.rounds[0][0].winner = null; // sabotage: one bot match undecided
    if (stuck.rounds[0][0] === m) stuck.rounds[0][1].winner = null;
    box.stuck = stuck;
    vmEval(box, 'advanceTournamentAfterWin(stuck, rngFactory(7))');
    assert.equal(stuck.currentRound, 0, 'does not advance while the round is unfinished');
}

// ================= 7. vm: full championship run =========================
{
    const box = makeBox();
    const active = freshBracket(box, 'bronze', 'shelly', 1234);
    vmEval(box, `setTournamentState({ unlocked: ['bronze'], wins: {}, active: ${JSON.stringify(active)} })`);
    const outcomes = [];
    for (let round = 0; round < 5; round++) {
        box.playerScore = 3; box.botScore = 1;
        const result = vmEval(box, `recordTournamentMatchResult(true)`);
        outcomes.push(result.outcome);
        assert.ok(result.matchText.length > 0, 'result has match text');
        assert.ok(result.rankText.length > 0, 'result has rank text');
    }
    assert.deepEqual(plain(outcomes), ['advanced', 'advanced', 'advanced', 'advanced', 'champion'], 'five wins: 4 advances then champion');
    const state = vmEval(box, 'getTournamentState()');
    assert.deepEqual(plain(state.unlocked), ['bronze', 'silver'], 'winning Bronze unlocks Silver');
    assert.equal(state.wins.bronze, 1, 'Bronze win counted');
    assert.equal(state.active, null, 'no active tournament after winning');
    assert.equal(box.playerData.coins, 500, 'champion prize pays 500 coins');
    assert.equal(box.soulsAdded, 50, 'champion prize pays 50 souls');
    // Persistence: the stored JSON round-trips with the unlock.
    const stored = JSON.parse(box._store['arenaForgeTournamentV1']);
    assert.deepEqual(stored.unlocked, ['bronze', 'silver'], 'unlock persisted to localStorage');
    assert.equal(stored.wins.bronze, 1, 'win count persisted to localStorage');
    assert.equal(stored.active, null, 'finished run persisted as no active tournament');
    // A fresh load from storage sees the same state.
    vmEval(box, 'tournamentStateCache = null;');
    const reloaded = vmEval(box, 'getTournamentState()');
    assert.deepEqual(plain(reloaded.unlocked), ['bronze', 'silver'], 'unlock survives a reload');
    // Silver run unlocks Gold next (chain, not just Bronze -> Silver).
    const silver = freshBracket(box, 'silver', 'shelly', 555);
    vmEval(box, `setTournamentState({ unlocked: ['bronze', 'silver'], wins: { bronze: 1 }, active: ${JSON.stringify(silver)} })`);
    for (let round = 0; round < 5; round++) {
        box.playerScore = 3; box.botScore = 0;
        vmEval(box, 'recordTournamentMatchResult(true)');
    }
    const state2 = vmEval(box, 'getTournamentState()');
    assert.deepEqual(plain(state2.unlocked), ['bronze', 'silver', 'gold'], 'winning Silver unlocks Gold');
    assert.equal(box.playerData.coins, 1500, 'Silver prize adds 1000 coins (500 + 1000)');
    assert.equal(box.soulsAdded, 150, 'Silver prize adds 100 souls (50 + 100)');
}

// ================= 8. vm: elimination ===================================
{
    const box = makeBox();
    const active = freshBracket(box, 'bronze', 'outlit', 77);
    vmEval(box, `setTournamentState({ unlocked: ['bronze'], wins: {}, active: ${JSON.stringify(active)} })`);
    box.playerScore = 1; box.botScore = 3;
    const result = vmEval(box, 'recordTournamentMatchResult(false)');
    assert.equal(result.outcome, 'eliminated', 'a loss eliminates the player');
    assert.match(result.matchText, /ELIMINATED/, 'elimination match text');
    const state = vmEval(box, 'getTournamentState()');
    assert.equal(state.active, null, 'eliminated run is cleared');
    assert.deepEqual(plain(state.unlocked), ['bronze'], 'no league unlocked on a loss');
    assert.equal(box.playerData.coins, 0, 'no prize coins on a loss');
    assert.equal(box.soulsAdded, 0, 'no prize souls on a loss');
    // No active tournament: recording again is a no-op, not a crash.
    const noop = vmEval(box, 'recordTournamentMatchResult(true)');
    assert.equal(noop.outcome, 'none', 'recording with no active tournament is a no-op');
}

// ================= 9. vm: card subtitle + corrupt storage ================
{
    const box = makeBox();
    vmEval(box, `setTournamentState({ unlocked: ['bronze'], wins: {}, active: null })`);
    assert.match(vmEval(box, 'getTournamentCardSubtitle()'), /32-player bracket/, 'idle subtitle names the bracket');
    const active = freshBracket(box, 'bronze', 'outlit', 31);
    vmEval(box, `setTournamentState({ unlocked: ['bronze'], wins: {}, active: ${JSON.stringify(active)} })`);
    assert.match(vmEval(box, 'getTournamentCardSubtitle()'), /IN PROGRESS • Bronze • Round of 32 vs /, 'active subtitle shows league, round and opponent');
    // Corrupt / missing storage falls back to a fresh default state.
    box._store['arenaForgeTournamentV1'] = 'not json at all {{{';
    vmEval(box, 'tournamentStateCache = null;');
    const fallback = vmEval(box, 'getTournamentState()');
    assert.deepEqual(plain(fallback.unlocked), ['bronze'], 'corrupt storage falls back to Bronze unlocked');
    assert.equal(fallback.active, null, 'corrupt storage falls back to no active run');
    // A stored active bracket with the wrong entrant count is discarded.
    box._store['arenaForgeTournamentV1'] = JSON.stringify({ unlocked: ['bronze'], wins: {}, active: { league: 'bronze', entrants: [{}, {}], rounds: [] } });
    vmEval(box, 'tournamentStateCache = null;');
    assert.equal(vmEval(box, 'getTournamentState()').active, null, 'malformed active bracket is discarded');
}

console.log('tournament-mode-regression: all assertions passed');
