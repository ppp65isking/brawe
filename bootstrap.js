const hud = document.getElementById('hud');
const homeScreen = document.getElementById('homeScreen');
const legacyCanvas = document.getElementById('gameCanvas');
const appRoot = document.getElementById('app');

window.addEventListener('error', (event) => {
  const message = String(event?.message || '');
  // Browsers deliberately reduce cross-origin/extension failures to the opaque
  // text "Script error." with no file, line, or Error object. Do not present
  // those unrelated failures as a BRAWE runtime crash. Real local game errors
  // still include actionable source information and continue to appear below.
  const isOpaqueExternalError = /^script error\.?$/i.test(message.trim())
    && !event?.filename
    && !event?.error
    && !(event?.lineno > 0);
  if (isOpaqueExternalError) return;
  if (homeScreen) homeScreen.style.display = '';
  let panel = document.getElementById('runtimeRecoveryPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'runtimeRecoveryPanel';
    panel.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:9999;max-width:min(680px,calc(100vw - 36px));padding:14px 16px;border:2px solid #ff6b81;border-radius:12px;background:#170b18;color:#ffe8ee;font:700 13px/1.4 monospace;box-shadow:0 12px 36px #0009;';
    document.body.appendChild(panel);
  }
  panel.textContent = `Runtime error: ${message || event?.error?.message || 'Unknown error'}${event.filename ? ` • ${event.filename.split('/').pop()}:${event.lineno || '?'}` : ''}`;
});

// The legacy canvas game is still the active runtime. Keeping this setup in
// its own entry point makes index.html responsible for markup only.
if (appRoot) appRoot.style.display = 'none';
if (legacyCanvas) legacyCanvas.style.display = 'block';
if (hud) hud.style.display = 'none';
if (homeScreen) homeScreen.style.display = '';

const RELEASE_TOKEN = '20260921-dash-hyper3';

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=${RELEASE_TOKEN}`;
    script.addEventListener('load', () => resolve(src));
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

function installPassTokenFallback() {
  if (window.BrawePassTokens) return;
  const integer = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const offers = Object.freeze([
    { id: 'coin-cache', name: 'Coin Cache', icon: '🪙', cost: 100, limit: 10, reward: { type: 'coins', amount: 200 } },
    { id: 'soul-cache', name: 'Soul Cache', icon: '✦', cost: 200, limit: 5, reward: { type: 'souls', amount: 30 } },
    { id: 'super-tapper', name: 'Super Tapper', icon: '🎁', cost: 400, limit: 3, reward: { type: 'superTapper', amount: 1 } },
    { id: 'astral-portalo', name: 'Astral Navigator Portalo', icon: '🪐', cost: 1600, limit: 1, reward: { type: 'skin', id: 'astral-portalo' } },
    { id: 'neon-jacktrade', name: 'Neon Casino JackTrade', icon: '♠', cost: 1600, limit: 1, reward: { type: 'skin', id: 'neon-jacktrade' } }
  ]);
  function normalize(pass, maxLevel = 25) {
    pass.xp = integer(pass.xp);
    pass.level = Math.min(maxLevel, Math.max(1, integer(pass.level), Math.floor(pass.xp / 100) + 1));
    if (pass.tokenSchema !== 1) {
      pass.tokensEarned = pass.xp;
      pass.tokenWallet = pass.xp;
      pass.tokenPurchases = {};
      pass.tokenSchema = 1;
    }
    pass.tokensEarned = integer(pass.tokensEarned);
    pass.tokenWallet = Math.min(pass.tokensEarned, integer(pass.tokenWallet));
    if (!pass.tokenPurchases || typeof pass.tokenPurchases !== 'object') pass.tokenPurchases = {};
    return pass;
  }
  function earn(pass, amount, maxLevel = 25) {
    normalize(pass, maxLevel);
    amount = integer(amount);
    if (!amount) return false;
    pass.xp += amount;
    pass.tokensEarned += amount;
    pass.tokenWallet += amount;
    normalize(pass, maxLevel);
    return true;
  }
  function purchase(pass, id, grant) {
    normalize(pass);
    const offer = offers.find(entry => entry.id === id);
    if (!offer || pass.tokenWallet < offer.cost || integer(pass.tokenPurchases[id]) >= offer.limit) return false;
    if (grant(offer.reward) === false) return false;
    pass.tokenWallet -= offer.cost;
    pass.tokenPurchases[id] = integer(pass.tokenPurchases[id]) + 1;
    return true;
  }
  window.BrawePassTokens = Object.freeze({ normalize, earn, purchase, offers });
}

async function startLegacyRuntime() {
  // These are classic scripts rather than ES modules so local file downloads
  // continue working on mobile browsers without a web server.
  // Pass Tokens are optional at boot because older GitHub Pages deployments
  // did not contain this newly added file. Keep the exact API available so a
  // stale/missing optional asset cannot prevent game.js or Soul Summoner from
  // loading. New deployments still use the standalone module when present.
  try {
    await loadClassicScript('./modules/progression/pass-tokens.js');
    window.ArenaForgeModules?.loadedFiles.push('./modules/progression/pass-tokens.js');
  } catch (error) {
    console.warn('Pass Token module unavailable; using bundled fallback.', error);
    installPassTokenFallback();
  }
  if (!window.BrawePassTokens) installPassTokenFallback();

  const moduleFiles = [
    './modules/visuals/roster-2p5d.js',
    './modules/audio/outlit-voicelines.js',
    './modules/audio/fuser-voicelines.js',
    './modules/audio/hypercharge-sfx.js',
    './modules/core/registry.js',
    './modules/brawlers/common/roster.js',
    './modules/brawlers/common/outlit.js',
    './modules/brawlers/rare/roster.js',
    './modules/brawlers/super-rare/roster.js',
    './modules/brawlers/epic/roster.js',
    './modules/brawlers/mythic/roster.js',
    './modules/brawlers/legendary/roster.js',
    './modules/brawlers/exotic/roster.js',
    './modules/brawlers/anomaly/roster.js'
  ];

  for (const file of moduleFiles) {
    await loadClassicScript(file);
    window.ArenaForgeModules?.loadedFiles.push(file);
  }

  await loadClassicScript('./game.js');
  if (homeScreen) homeScreen.style.display = '';
}

startLegacyRuntime().catch((error) => {
  if (homeScreen) homeScreen.style.display = '';
  homeScreen?.insertAdjacentHTML('afterbegin', `<div style="padding:10px;border:2px solid #ff6b81;border-radius:10px;background:#260d19;color:#ffe8ee;font-weight:900">${error.message}. Refresh this page once.</div>`);
});
