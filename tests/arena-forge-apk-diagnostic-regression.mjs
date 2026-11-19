// Arena Forge APK diagnostic strip (2026-11-18): PR #135 (app home) +
// PR #136 (localhost fallback + load/DOMContentLoaded retry) are both
// merged, the fixed APK was verified byte-for-byte, Anthony uninstalled
// and installed it successfully — and the app home STILL does not show.
// Detection genuinely fails on-device, so guessing the URL scheme is
// done: this strip prints the ground truth (page URL, Capacitor bridge,
// #appHome built or not) on the phone itself. APK-ONLY: it is never
// created on the live website. Source-presence + behavior mirrors.
// Never uses the banned bare word.
import fs from 'fs';
const root = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const game = read('game.js');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

// --- The strip exists and is gated ONLY on the Pages host ---
check('diagnostic strip function exists', game.includes('function refreshApkDiagStrip() {'));
check('Pages host constant is ppp65isking.github.io', game.includes("const APK_DIAG_PAGES_HOST = 'ppp65isking.github.io';"));
check('strip returns early on the Pages host', game.includes('if (hostname === APK_DIAG_PAGES_HOST) return;'));
check('strip element id is apkDiagStrip and it is appended to body', game.includes("strip.id = 'apkDiagStrip';") && game.includes('body.appendChild(strip);'));

// --- Deliberately NOT gated on the broken detection ---
const fnStart = game.indexOf('function refreshApkDiagStrip() {');
const fnBoot = game.indexOf("refreshApkDiagStrip();\n    window.addEventListener('load', refreshApkDiagStrip);", fnStart);
const fnBody = fnStart !== -1 && fnBoot !== -1 ? game.slice(fnStart, fnBoot) : '';
check('strip function body found for scoping checks', fnBody.length > 0);
check('strip is NOT gated on isNativeAppMode()', !fnBody.includes('isNativeAppMode'));
check('strip is NOT gated on localhost', !fnBody.includes('localhost'));
check('strip reads appHome live from the DOM', fnBody.includes("document.getElementById('appHome')"));
check('strip probes the Capacitor bridge directly', fnBody.includes('!!window.Capacitor'));

// --- Gate mirror: shown everywhere except the Pages host ---
function stripShown(hostname) { return hostname !== 'ppp65isking.github.io'; }
check('gate: localhost -> strip shown', stripShown('localhost') === true);
check('gate: empty hostname (file://) -> strip shown', stripShown('') === true);
check('gate: any other host -> strip shown', stripShown('example.com') === true);
check('gate: ppp65isking.github.io -> strip NEVER shown', stripShown('ppp65isking.github.io') === false);

// --- Text mirror: exact format, all four combinations ---
function stripText(href, hasCapacitor, appHomeBuilt) {
    return 'URL: ' + href + ' | Capacitor: ' + (hasCapacitor ? 'yes' : 'no') + ' | appHome: ' + (appHomeBuilt ? 'built' : 'not-built');
}
check('text: localhost + bridge + shell built', stripText('https://localhost/', true, true) === 'URL: https://localhost/ | Capacitor: yes | appHome: built');
check('text: file:// + no bridge + shell not built', stripText('file:///android_asset/public/index.html', false, false) === 'URL: file:///android_asset/public/index.html | Capacitor: no | appHome: not-built');
check('text: bridge yes / shell no combination', stripText('https://localhost/', true, false) === 'URL: https://localhost/ | Capacitor: yes | appHome: not-built');
check('text: bridge no / shell yes combination', stripText('https://localhost/', false, true) === 'URL: https://localhost/ | Capacitor: no | appHome: built');
check('game.js builds the text in the same format', game.includes("strip.textContent = 'URL: ' + href + ' | Capacitor: ' + (hasCapacitor ? 'yes' : 'no') + ' | appHome: ' + (appHomeBuilt ? 'built' : 'not-built');"));

// --- URL truncation mirror: scheme + host kept, middle cut ---
function truncateHref(href) { if (href.length > 72) href = href.slice(0, 44) + '…' + href.slice(-24); return href; }
check('truncation: short URL unchanged', truncateHref('https://localhost/') === 'https://localhost/');
check('truncation: file:// URL under the cap unchanged', truncateHref('file:///android_asset/public/index.html') === 'file:///android_asset/public/index.html');
check('truncation: long URL keeps scheme + host at the front', (() => { const long = 'https://localhost/some/very/long/path/with/lots/of/segments/and/a/query?x=1&y=2&z=3'; const t = truncateHref(long); return t.startsWith('https://localhost/some/very/long/path/with/') && t.includes('…') && t.length === 69; })());
check('truncation: long URL keeps the tail', (() => { const long = 'https://localhost/some/very/long/path/with/lots/of/segments/and/a/query?x=1&y=2&z=3'; return truncateHref(long).endsWith(long.slice(-24)); })());
check('game.js truncates long URLs the same way', game.includes("if (href.length > 72) href = href.slice(0, 44) + '…' + href.slice(-24);"));

// --- Style: tiny, fixed at the very bottom, high z-index, never blocks taps ---
check('strip is fixed at the very bottom with high z-index', game.includes('position:fixed;left:0;right:0;bottom:0;z-index:9999;'));
check('strip is non-interactive (pointer-events none)', game.includes('pointer-events:none'));
check('strip is tiny monospace with a dark translucent background', game.includes('font:11px/1.5 monospace,monospace') && game.includes('background:rgba(0,0,0,.65)'));
check('strip truncates overflowing text with an ellipsis', game.includes('white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));

// --- Wiring: appended at boot AND refreshed on window load ---
check('strip refresh runs at boot', game.indexOf("refreshApkDiagStrip();") > game.indexOf("document.addEventListener('DOMContentLoaded', retryAppHomeActivation);"));
check('strip refresh runs on window load', game.includes("window.addEventListener('load', refreshApkDiagStrip);"));
check('strip refresh runs on DOMContentLoaded', game.includes("document.addEventListener('DOMContentLoaded', refreshApkDiagStrip);"));
check('strip is created only once (id lookup before create)', game.includes("document.getElementById('apkDiagStrip')"));

// --- Scope guard ---
check('no banned bare word anywhere in game.js', !/\bcluster\b/i.test(game));
check('no banned bare word in this test file', !/\bcluster\b/i.test(fs.readFileSync(new URL(import.meta.url), 'utf8')));

if (failed) { console.error(`FAIL ${failed}/${passed + failed}\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log(`PASS ${passed}/${passed + failed} arena-forge-apk-diagnostic`);
