// Save code (copy-paste transfer, 2026-11-18): the same BRAWE_SAVE_BACKUP
// payload as the file download, minified + base64url-encoded. The pure
// helpers are extracted from game.js and executed for real (not mirrored),
// with a stub localStorage. No DOM/match runtime needed.
// Never uses the banned bare word.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// --- extract a top-level `function NAME(...) {...}` by brace counting ---
function extractFunction(src, name) {
    const start = src.indexOf(`function ${name}(`);
    assert.ok(start !== -1, `${name} exists in game.js`);
    const brace = src.indexOf('{', start);
    assert.ok(brace !== -1, `${name} has a body`);
    let depth = 0;
    let i = brace;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    for (; i < src.length; i++) {
        const ch = src[i];
        const next = src[i + 1];
        if (lineComment) { if (ch === '\n') lineComment = false; continue; }
        if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
        if (quote) {
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === quote) quote = null;
            continue;
        }
        if (ch === '/' && next === '/') { lineComment = true; continue; }
        if (ch === '/' && next === '*') { blockComment = true; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    throw new Error(`could not extract ${name}: unbalanced braces`);
}

class StubStorage {
    constructor() { this.map = new Map(); }
    get length() { return this.map.size; }
    key(index) { return [...this.map.keys()][index] ?? null; }
    getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
    setItem(k, v) { this.map.set(k, String(v)); }
    removeItem(k) { this.map.delete(k); }
    clear() { this.map.clear(); }
}

const extracted = [
    extractFunction(game, 'isBraweBackupStorageKey'),
    extractFunction(game, 'braweSaveCodeEncode'),
    extractFunction(game, 'braweSaveCodeDecode'),
    extractFunction(game, 'importBraweSavePayload'),
].join('\n');
const factory = new Function(
    'localStorage', 'btoa', 'atob', 'TextEncoder', 'TextDecoder',
    `${extracted}\nreturn { isBraweBackupStorageKey, braweSaveCodeEncode, braweSaveCodeDecode, importBraweSavePayload };`,
);
const storage = new StubStorage();
const { isBraweBackupStorageKey, braweSaveCodeEncode, braweSaveCodeDecode, importBraweSavePayload } =
    factory(storage, btoa, atob, TextEncoder, TextDecoder);

let passed = 0;
let failed = 0;
const failures = [];
function check(name, cond) {
    if (cond) passed++;
    else { failed++; failures.push(name); }
}

// --- source presence: the UI wiring ---
check('exportBraweSaveCode builds the code from the shared payload builder',
    game.includes('function exportBraweSaveCode()') &&
    game.includes('return braweSaveCodeEncode(buildBraweSaveBackupPayload());'));
check('importBraweSaveCode feeds the code through the shared importer',
    game.includes('function importBraweSaveCode(code)') &&
    game.includes('return importBraweSavePayload(braweSaveCodeDecode(code));'));
check('download still uses the shared payload builder (same file format)',
    game.includes('function downloadBraweSaveBackup()') &&
    game.includes('const payload = buildBraweSaveBackupPayload();'));
check('file importer delegates to the shared importer (no duplicated validation)',
    game.includes('function importBraweSaveBackup(file)') &&
    game.includes('importBraweSavePayload(payload);'));
check('web COPY SAVE CODE button sits next to DOWNLOAD/IMPORT SAVE',
    game.includes("copySaveCodeBtn.textContent = 'COPY SAVE CODE'") &&
    game.includes('homeUtilityRow.appendChild(copySaveCodeBtn);'));
check('app top strip has a save button wired to the same modal',
    game.includes('id="appHomeSaveBtn"') &&
    // Phase 4: the handler also buzzes (appBuzz) — same modal, same wiring.
    game.includes("document.getElementById('appHomeSaveBtn')?.addEventListener('click', () => { appBuzz(10); openSaveCodeModal(); });"));
check('modal has export textarea + COPY and import textarea + IMPORT',
    game.includes('id="saveCodeExport"') && game.includes('id="saveCodeCopyBtn"') &&
    game.includes('id="saveCodeImport"') && game.includes('id="saveCodeImportBtn"'));
check('import asks for confirmation before replacing progress',
    // 2026-11-19 (app toast + confirm sheet): the native confirm() is now
    // the app-styled sheet — same message, and the import only runs inside
    // the sheet's onConfirm, so cancelling still replaces nothing.
    game.includes("message: 'Import this save code? Your current progress will be replaced.'") &&
    game.includes('onConfirm: () => {') &&
    game.includes('importBraweSaveCode(rawCode);'));
check('modal refreshes the export code fresh on every open',
    game.includes('const code = exportBraweSaveCode();') &&
    game.includes("if (exportTa) exportTa.value = code;"));
check('app save button has a style rule',
    game.includes('#appHomeSaveBtn{'));

// --- whitelist behavior (shared by file + code import) ---
check('whitelist keeps the two main saves', isBraweBackupStorageKey('brawl_arena_save') && isBraweBackupStorageKey('brawlGameProgress'));
check('whitelist keeps prefs + season keys', isBraweBackupStorageKey('brawl_arena_favorites') && isBraweBackupStorageKey('season_05'));
check('whitelist REJECTS arenaForgeTournamentV1 (known gap: tournament runs do not transfer)',
    !isBraweBackupStorageKey('arenaForgeTournamentV1'));
check('whitelist rejects unrelated keys', !isBraweBackupStorageKey('arenaForgeFullscreenPref') && !isBraweBackupStorageKey('playerName'));

// --- round-trip: export -> import restores the exact whitelisted keys ---
function makePayload() {
    return {
        format: 'BRAWE_SAVE_BACKUP',
        version: 1,
        exportedAt: '2026-11-18T00:00:00.000Z',
        storage: {
            brawl_arena_save: JSON.stringify({ persistent: { coins: 12345, gems: 320, souls: 1500, playerName: 'Anthony 💜' } }),
            brawlGameProgress: JSON.stringify({ selectedBrawler: 'outlit', coins: 999 }),
            brawl_arena_favorites: JSON.stringify(['outlit', 'fuser']),
            season_05: JSON.stringify({ claimed: [1, 2] }),
            arenaForgeTournamentV1: JSON.stringify({ league: 'gold', round: 3 }),
            arenaForgeFullscreenPref: '1',
            brawl_arena_save_backup: 'not-a-string-should-not-happen',
        },
    };
}
storage.clear();
const payload = makePayload();
const code = braweSaveCodeEncode(payload);
check('code uses only the URL-safe base64 alphabet (no + / or =)', /^[A-Za-z0-9_-]+$/.test(code));
check('code decodes back to the identical payload', JSON.stringify(braweSaveCodeDecode(code)) === JSON.stringify(payload));
const imported = importBraweSavePayload(braweSaveCodeDecode(code));
check('round-trip imports the whitelisted keys',
    imported === 5 &&
    storage.getItem('brawl_arena_save') === payload.storage.brawl_arena_save &&
    storage.getItem('brawlGameProgress') === payload.storage.brawlGameProgress &&
    storage.getItem('brawl_arena_favorites') === payload.storage.brawl_arena_favorites &&
    storage.getItem('season_05') === payload.storage.season_05 &&
    storage.getItem('brawl_arena_save_backup') === 'not-a-string-should-not-happen');
check('round-trip does NOT write the non-whitelisted tournament key',
    storage.getItem('arenaForgeTournamentV1') === null &&
    storage.getItem('arenaForgeFullscreenPref') === null);
check('unicode survives the round-trip (player name with emoji)',
    JSON.parse(storage.getItem('brawl_arena_save')).persistent.playerName === 'Anthony 💜');

// Non-string values in storage are skipped, not errors.
storage.clear();
check('non-string storage values are skipped',
    importBraweSavePayload({ format: 'BRAWE_SAVE_BACKUP', storage: { brawl_arena_save: 42, brawlGameProgress: JSON.stringify({ ok: 1 }) } }) === 1 &&
    storage.getItem('brawl_arena_save') === null &&
    storage.getItem('brawlGameProgress') === JSON.stringify({ ok: 1 }));

// --- corrupted / truncated / wrong-format codes change NOTHING ---
function assertUnchanged(name, fn) {
    storage.clear();
    storage.setItem('brawl_arena_save', 'KEEP-ME');
    const before = storage.getItem('brawl_arena_save');
    let threw = false;
    try { fn(); } catch (_) { threw = true; }
    check(name, threw && storage.getItem('brawl_arena_save') === before && storage.length === 1);
}
assertUnchanged('truncated code is rejected and changes nothing', () => importBraweSavePayload(braweSaveCodeDecode(code.slice(0, Math.floor(code.length / 2)))));
assertUnchanged('code with a flipped character is rejected and changes nothing', () => {
    const bad = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
    importBraweSavePayload(braweSaveCodeDecode(bad));
});
assertUnchanged('empty code is rejected and changes nothing', () => importBraweSavePayload(braweSaveCodeDecode('   ')));
assertUnchanged('code with characters outside the alphabet is rejected', () => importBraweSavePayload(braweSaveCodeDecode(code + '!!!')));
assertUnchanged('valid base64 of non-JSON is rejected', () => importBraweSavePayload(braweSaveCodeDecode(btoa('hello world'))));
assertUnchanged('valid JSON with a non-BRAWE format is rejected', () => importBraweSavePayload(braweSaveCodeDecode(braweSaveCodeEncode({ format: 'OTHER', storage: { brawl_arena_save: 'X' } }))));
assertUnchanged('empty storage object is rejected', () => importBraweSavePayload(braweSaveCodeDecode(braweSaveCodeEncode({ format: 'BRAWE_SAVE_BACKUP', storage: {} }))));
assertUnchanged('null payload is rejected', () => importBraweSavePayload(null));

// Tolerant reading: pasted codes with line breaks / trailing padding still work.
storage.clear();
const prettyCode = code.slice(0, 20) + '\n  ' + code.slice(20) + '==';
check('code pasted with line breaks and trailing padding still imports',
    importBraweSavePayload(braweSaveCodeDecode(prettyCode)) === 5);

// --- legacy shapes still work through the shared importer ---
storage.clear();
check('legacy persistent shape still imports',
    importBraweSavePayload({ persistent: { coins: 7 } }) === 1 &&
    JSON.parse(storage.getItem('brawl_arena_save')).persistent.coins === 7);
storage.clear();
check('legacy brawlers shape still imports',
    importBraweSavePayload({ brawlers: { outlit: { level: 5 } } }) === 1 &&
    JSON.parse(storage.getItem('brawlGameProgress')).brawlers.outlit.level === 5);

// --- realistic size: a full save (104 brawlers) as a code ---
function realisticSaveCodeLength() {
    const brawlerProgress = {};
    const ids = ['outlit', 'fuser', 'nightshade', 'aegis', 'voodoyou', 'bookworm', 'freezeon', 'driller', 'pandy', 'snipa', 'voltastein', 'staticstein', 'healnstein', 'bolznstien', 'electrostien', 'gravy', 'mallow'];
    for (let i = 0; i < 104; i++) {
        const id = ids[i] || `brawler_${String(i).padStart(3, '0')}`;
        brawlerProgress[id] = {
            level: 1 + (i % 12), bricks: (i * 37) % 900, prestige: i % 3,
            gadgetUnlocked: i % 2 === 0, starPowerUnlocked: i % 3 === 0,
            hyperchargeUnlocked: i % 4 === 0, selectedStar: i % 2 ? 'slow' : 'long',
            selectedGadget: 'g1', ownedTrinkets: [], equippedTrinkets: [],
        };
    }
    const full = {
        format: 'BRAWE_SAVE_BACKUP', version: 1, exportedAt: '2026-11-18T00:00:00.000Z',
        storage: {
            brawl_arena_save: JSON.stringify({
                persistent: {
                    coins: 48210, gems: 640, souls: 3200, winStreak: 7, bestWinStreak: 14,
                    ownedSkins: { outlit: ['gold'] }, selectedSkins: { outlit: 'gold' },
                    seasonPass: { season: 5, tier: 18 }, brawlerProgress,
                },
            }),
            brawlGameProgress: JSON.stringify({ selectedBrawler: 'outlit', coins: 48210 }),
            brawl_arena_favorites: JSON.stringify(['outlit', 'fuser', 'voltastein']),
            brawl_arena_brawler_sort: JSON.stringify('power'),
            season_05: JSON.stringify({ claimed: [1, 2, 3] }),
            arena_forge_daily_brick_rush_v1: JSON.stringify({ date: '2026-11-18', claimed: true }),
        },
    };
    return braweSaveCodeEncode(full).length;
}
const realisticLen = realisticSaveCodeLength();
console.log(`Realistic full-save code length: ${realisticLen} chars (${(realisticLen / 1024).toFixed(1)} KB)`);
check('realistic full-save code stays under 200 KB (pasteable)', realisticLen < 200 * 1024);

if (failed) {
    console.error(`FAIL ${failed}/${passed + failed}: ${failures.join('; ')}`);
    process.exit(1);
}
console.log(`Save code regression: ${passed}/${passed + failed} checks passed.`);
