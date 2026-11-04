import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tactical-ui.css', import.meta.url), 'utf8');

// ---------- Static contract: shared shape Worker C depends on ----------
assert.match(game, /playerData\.overdrive = \{ startAt: now, endAt: now \+ OVERDRIVE_DURATION_MS, mainTotal: 0, mainClaimed: \[\], dailyKey: getOverdriveDayKey\(now\), dailyTotal: 0, dailyClaimed: \[\], surgeDrops: 0 \}/, 'overdrive state has the exact shared shape');
assert.match(game, /const OVERDRIVE_MAIN_TIERS = \[100, 250, 500, 1000, 2500, 5000, 10000\];/, 'main tiers are [100, 250, 500, 1000, 2500, 5000, 10000]');
assert.match(game, /const OVERDRIVE_DAILY_TIERS = \[500, 1000, 2500, 5000, 11500\];/, 'daily tiers are [500, 1000, 2500, 5000, 11500]');
assert.match(game, /const OVERDRIVE_DURATION_MS = 14 \* 24 \* 60 \* 60 \* 1000;/, 'event window is 14 days');
for (const fn of ['ensureOverdriveState', 'isOverdriveActive', 'recordOverdriveActivation', 'recordOverdriveSurgedHit', 'getOverdriveMainTier', 'getOverdriveDailyTier', 'setEntityHypercharged']) {
    assert.match(game, new RegExp(`function ${fn}\\(`), `${fn} is defined`);
}
// ---------- Static hooks ----------
assert.match(game, /addEventQuestProgress\('activate_hypers'\);\s*\n\s*recordOverdriveActivation\(\);/, 'player Core Surge activation counts via activateHypercharge()');
assert.match(game, /setEntityHypercharged\(t, nowTarget \+ 5000 \+ extraHyperMs, nowTarget\);/, 'bot AI auto-activation counts');
assert.match(game, /setEntityHypercharged\(entity, now \+ 5000, now\); entity\.hyperChargeCharge = 0;/, 'tug-zone checkpoint bot activation counts');
assert.match(game, /if \(dealtDamage > 0\) recordOverdriveSurgedHit\(owner, performance\.now\(\)\);/, 'central checkHit damage application counts surged hits');
assert.doesNotMatch(game, /recordPacketEquippedDamage\(owner,dealtDamage\);\s*\n\s*recordOverdriveSurgedHit/, 'surged-hit counting does not ride the player-only packet path');
// ---------- Static event surface ----------
assert.match(game, /makeTab\('overdrive', '⚡ Core Surge Overdrive'\)/, 'Quest HQ has an Overdrive tab');
assert.match(game, /overdrive: createOverdriveView,/, 'Quest HQ routes the overdrive tab to its view');
assert.match(game, /function createOverdriveView\(\)/, 'Overdrive progress view exists');
assert.match(game, /createSection\('CORE SURGE OVERDRIVE'/, 'home events area has an Overdrive card section');
assert.match(game, /openQuestBoard\('overdrive'\)/, 'home Overdrive card opens the progress view');
assert.match(css, /\.overdrive-view\{/, 'Overdrive view has dedicated presentation');
assert.match(css, /\.overdrive-event-card\{/, 'home Overdrive card has dedicated presentation');

// ---------- Runtime harness: extract the self-contained core block ----------
const begin = game.indexOf('// === CORE SURGE OVERDRIVE (event bars) — BEGIN ===');
const end = game.indexOf('// === CORE SURGE OVERDRIVE (event bars) — END ===');
assert.ok(begin >= 0 && end > begin, 'extractable Overdrive core block markers exist');
const block = game.slice(begin, end);

function load() {
    const body = `
        let playerData = {};
        let isTraining = false;
        let isTutorialMode = false;
        let saves = 0;
        function saveProgress() { saves++; }
        ${block}
        return {
            api: { ensureOverdriveState, isOverdriveActive, recordOverdriveActivation, recordOverdriveSurgedHit, getOverdriveMainTier, getOverdriveDailyTier, setEntityHypercharged, OVERDRIVE_MAIN_TIERS, OVERDRIVE_DAILY_TIERS },
            get playerData() { return playerData; },
            setTraining(v) { isTraining = v; },
            setTutorial(v) { isTutorialMode = v; },
            get saves() { return saves; },
        };
    `;
    return new Function(body)();
}

// Window + shape
{
    const h = load();
    const od = h.api.ensureOverdriveState(1_000_000);
    assert.deepEqual(Object.keys(od).sort(), ['dailyClaimed', 'dailyKey', 'dailyTotal', 'endAt', 'mainClaimed', 'mainTotal', 'startAt', 'surgeDrops'].sort(), 'state keys match the contract');
    assert.equal(od.endAt - od.startAt, 14 * 24 * 60 * 60 * 1000, 'window is exactly 14 days from first ensure');
    assert.equal(od.mainTotal, 0, 'main bar starts at 0');
    assert.equal(od.dailyTotal, 0, 'daily bar starts at 0');
    assert.deepEqual(h.api.OVERDRIVE_MAIN_TIERS, [100, 250, 500, 1000, 2500, 5000, 10000], 'runtime main tiers');
    assert.deepEqual(h.api.OVERDRIVE_DAILY_TIERS, [500, 1000, 2500, 5000, 11500], 'runtime daily tiers');
    assert.equal(h.api.isOverdriveActive(1_000_000 + 1000), true, 'active inside the window');
    assert.equal(h.api.isOverdriveActive(1_000_000 - 1), false, 'inactive before startAt');
}

// Activation counting (player + bots share the same counter)
{
    const h = load();
    h.api.ensureOverdriveState();
    assert.equal(h.api.recordOverdriveActivation(), true, 'player activation counts');
    assert.equal(h.api.recordOverdriveActivation(), true, 'second activation counts');
    assert.equal(h.playerData.overdrive.mainTotal, 2, 'mainTotal is 2 after two activations');
    const bot = { isHypercharged: false, hyperchargeUntil: 0 };
    assert.equal(h.api.setEntityHypercharged(bot, 5000, 1000), true, 'bot transition from un-surged counts');
    assert.equal(bot.isHypercharged, true, 'bot surge state is set');
    assert.equal(bot.hyperchargeUntil, 5000, 'bot surge until is set');
    assert.equal(h.playerData.overdrive.mainTotal, 3, 'bot activation feeds the same community bar');
    assert.equal(h.api.setEntityHypercharged(bot, 6000, 2000), false, 'refresh while still surged does NOT double-count');
    assert.equal(h.playerData.overdrive.mainTotal, 3, 'mainTotal unchanged by a refresh');
    assert.equal(h.api.setEntityHypercharged(bot, 9000, 7000), true, 'activation after expiry counts again');
    assert.equal(h.playerData.overdrive.mainTotal, 4, 'mainTotal is 4');
    const permBot = { isHypercharged: true, hyperchargeUntil: 0 };
    assert.equal(h.api.setEntityHypercharged(permBot, 999999, 1000), false, 'already-surged (indefinite) entity does not recount');
}

// Training / tutorial guard
{
    const h = load();
    h.api.ensureOverdriveState();
    h.setTraining(true);
    assert.equal(h.api.recordOverdriveActivation(), false, 'training activations do not count');
    assert.equal(h.api.recordOverdriveSurgedHit({ isHypercharged: true, hyperchargeUntil: 99999 }, 1000), false, 'training surged hits do not count');
    assert.equal(h.playerData.overdrive.mainTotal, 0, 'training leaves the main bar at 0');
    assert.equal(h.playerData.overdrive.dailyTotal, 0, 'training leaves the daily bar at 0');
    h.setTraining(false);
    h.setTutorial(true);
    assert.equal(h.api.recordOverdriveActivation(), false, 'tutorial activations do not count');
}

// Surged-hit counting: per HIT, attacker must be surged
{
    const h = load();
    h.api.ensureOverdriveState();
    const surged = { isHypercharged: true, hyperchargeUntil: 99999 };
    const flat = { isHypercharged: false, hyperchargeUntil: 0 };
    const expired = { isHypercharged: true, hyperchargeUntil: 500 };
    assert.equal(h.api.recordOverdriveSurgedHit(surged, 1000), true, 'surged attacker hit counts');
    assert.equal(h.api.recordOverdriveSurgedHit(surged, 1000), true, 'second hit from the same shot sequence counts separately (per hit, not per shot)');
    assert.equal(h.api.recordOverdriveSurgedHit(surged, 1000), true, 'third hit counts');
    assert.equal(h.api.recordOverdriveSurgedHit(flat, 1000), false, 'non-surged attacker hit does not count');
    assert.equal(h.api.recordOverdriveSurgedHit(expired, 1000), false, 'expired surge hit does not count');
    assert.equal(h.api.recordOverdriveSurgedHit(null, 1000), false, 'null attacker does not count');
    assert.equal(h.playerData.overdrive.dailyTotal, 3, 'dailyTotal is 3 after three surged hits');
    assert.equal(h.playerData.overdrive.mainTotal, 0, 'surged hits do NOT feed the activation bar');
}

// Main tiers at every boundary
{
    const h = load();
    const od = h.api.ensureOverdriveState();
    const check = (total, reached, next) => {
        od.mainTotal = total;
        const t = h.api.getOverdriveMainTier();
        assert.equal(t.reached, reached, `mainTotal ${total} reaches ${reached} tiers`);
        assert.equal(t.next, next, `mainTotal ${total} next tier is ${next}`);
    };
    check(0, 0, 100); check(99, 0, 100); check(100, 1, 250); check(249, 1, 250);
    check(250, 2, 500); check(500, 3, 1000); check(1000, 4, 2500); check(2500, 5, 5000);
    check(5000, 6, 10000); check(9999, 6, 10000); check(10000, 7, null); check(99999, 7, null);
}

// Daily tiers + daily reset (main bar survives the reset)
{
    const h = load();
    const od = h.api.ensureOverdriveState();
    const check = (total, reached, next) => {
        od.dailyTotal = total;
        const t = h.api.getOverdriveDailyTier();
        assert.equal(t.reached, reached, `dailyTotal ${total} reaches ${reached} tiers`);
        assert.equal(t.next, next, `dailyTotal ${total} next tier is ${next}`);
    };
    check(0, 0, 500); check(499, 0, 500); check(500, 1, 1000); check(1000, 2, 2500);
    check(2500, 3, 5000); check(5000, 4, 11500); check(11499, 4, 11500); check(11500, 5, null);
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    od.dailyKey = yesterday;
    od.dailyTotal = 500;
    od.dailyClaimed = [0];
    od.mainTotal = 42;
    const after = h.api.ensureOverdriveState();
    assert.equal(after.dailyTotal, 0, 'daily bar resets when the local-day key changes');
    assert.deepEqual(after.dailyClaimed, [], 'daily claims reset with the day');
    assert.equal(after.dailyKey, new Date().toDateString(), 'dailyKey advances to today');
    assert.equal(after.mainTotal, 42, 'main bar survives the daily reset');
}

// Window expiry stops counting but preserves state (shop claims stay available)
{
    const h = load();
    const od = h.api.ensureOverdriveState();
    od.mainTotal = 250;
    od.mainClaimed = [0];
    od.dailyTotal = 10;
    od.endAt = Date.now() - 1;
    assert.equal(h.api.isOverdriveActive(), false, 'inactive after endAt');
    assert.equal(h.api.recordOverdriveActivation(), false, 'activations stop counting after expiry');
    assert.equal(h.api.recordOverdriveSurgedHit({ isHypercharged: true, hyperchargeUntil: 99999999 }, 1000), false, 'surged hits stop counting after expiry');
    assert.equal(h.playerData.overdrive.mainTotal, 250, 'main total preserved after expiry');
    assert.deepEqual(h.playerData.overdrive.mainClaimed, [0], 'claims preserved after expiry');
    assert.equal(h.api.getOverdriveMainTier().reached, 2, 'tier progress still readable after expiry for shop claims');
}

console.log('Core Surge Overdrive bars regression checks passed.');
