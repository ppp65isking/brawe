import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Friendly Battles — Thanksgiving Phase 8 (Custom Mutator Clash upgrade).
// Plan checklist: tests/friendly-battle-regression.mjs
//  1. Chosen map applies to the friendly match; the next normal Solo launch
//     is back on rotation (no leak into currentMapOverride either).
//  2. Friendly results award 0 coins/souls/bricks, consume no event reward,
//     and record no quest/season progress (cube-pickup funnels + match end).
//  3. powerRule 'max' => player level 11 stats + bot level 11;
//     'mine' preserves the saved level.
//  4. enemyPool 'same' spawns only the player's brawler as enemies.
//  5. Mutators selected in Friendly behave identically to Custom
//     (hyper_overdrive case).
//  6. Prop Hunt launched from Friendly still opens the role picker and pays
//     no event coins.
// Plus: setup + results screens both say
// "Friendly Battle — no rewards, no quests, no rank".

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors ----
assert.match(game, /let isFriendlyBattle = false;/, 'friendly flag must be declared, default off');
assert.match(game, /mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: \[\]/, 'friendly config must default to solo / rotation map / my power / any fighters / no mutators');
assert.match(game, /\['custom_clash',\s*'🤝',\s*'Friendly Battle'/, 'home card keeps the custom_clash id but is renamed Friendly Battle');
assert.match(game, /Friendly Battle — pick mode, map & up to 3 mutators • vs bots • no rewards/, 'home card copy must say Friendly Battle, vs bots, no rewards');
assert.match(game, /if\s*\(mode === 'custom_clash'\)\s*return 'Friendly Battle';/, 'mode label must be Friendly Battle');
assert.match(game, /custom_clash: \['Pick ANY mode and map', 'Select up to 3 active mutators', 'Friendly Battle — no rewards, no quests, no rank'/, 'mode rules must carry the no-rewards line');
assert.match(game, /🤝 Friendly Battle<\/h2>/, 'picker must be titled Friendly Battle');
assert.match(game, /Friendly Battle — no rewards, no quests, no rank/, 'picker setup screen must state no rewards, no quests, no rank');
assert.match(game, /\{ id: 'prop_hunt', name: '🫣 Prop Hunt' \}/, 'picker mode grid must include Prop Hunt');
assert.match(game, /const FRIENDLY_BATTLE_MAPS = \['Crown Collapse', 'Tidal Lock', 'Four Corners', 'Neon Labyrinth', 'Frost Circuit', 'Sunset Quarry', 'Crownspire Keep', 'Gearfall Foundry', 'Stormglass Heights', 'Voidtower Ruins'\]/, 'picker must list the 10 Showdown layouts by name');
assert.match(game, /💪 My power/, 'picker must offer the My power rule');
assert.match(game, /⚡ Everyone max/, 'picker must offer the Everyone max rule');
assert.match(game, /🎲 Any fighters/, 'picker must offer the Any fighters enemy pool');
assert.match(game, /🪞 Mirror my fighter/, 'picker must offer the Mirror my fighter enemy pool');
assert.match(game, /4\. Pick Up to 3 Mutators/, 'mutator step must be step 4 (after mode, map, rules)');
assert.match(game, /🤝 LAUNCH FRIENDLY BATTLE/, 'picker launch button must say LAUNCH FRIENDLY BATTLE');
assert.match(game, /if \(selectedMode === 'prop_hunt'\) \{\s*\/\/ Chain the Phase 1 role picker[\s\S]*?openPropHuntRolePickerUI\(\(\) => \{ friendlyBattlePendingConfig = null; \}\);/, 'Prop Hunt from Friendly must chain the role picker, and closing it must abort the armed friendly config');
assert.match(game, /matchHomeEventReward = \(isRankedMatch \|\| isFriendlyBattle\) \? null : getHomeEventRewardForMode\(showdownMode\);/, 'friendly launch must consume no home event reward');
assert.match(game, /if \(isFriendlyBattle && Number\.isInteger\(friendlyBattleConfig\.mapIndex\) && FRIENDLY_BATTLE_SHOWDOWN_MODES\.includes\(showdownMode\)\) \{/, 'friendly map choice must apply only to Showdown-family modes');
assert.match(game, /showdownMapIndex = Math\.max\(0, Math\.min\(SHOWDOWN_MAP_THEMES\.length - 1, friendlyBattleConfig\.mapIndex\)\);/, 'friendly map choice must be clamped to the 10 layouts');
assert.ok(!game.includes('currentMapOverride = friendlyBattleConfig'), 'friendly map choice must never be written to currentMapOverride');
const mapOverrideAssigns = [...game.matchAll(/currentMapOverride\s*=(?!=)\s*([^;]+);/g)].map(m => m[1].trim());
assert.deepEqual(mapOverrideAssigns.filter(v => v !== 'null' && v !== 'n'), [], `currentMapOverride must only ever be cleared (null) or debug-set (n), got: ${mapOverrideAssigns.join(', ')}`);
assert.match(game, /function progressSeasonPassQuest\(questKey, amount = 1\) \{\s*\/\/ Friendly Battles record no quest\/season progress[\s\S]*?if \(isFriendlyBattle\) return false;/, 'season-pass funnel must no-op in Friendly');
assert.match(game, /function addEventQuestProgress\(questKey, amount = 1\) \{\s*\/\/ Friendly Battles record no quest progress[\s\S]*?if \(isFriendlyBattle\) return false;/, 'event-quest funnel must no-op in Friendly');
assert.match(game, /function awardSeasonPassXp\(amount = 0\) \{\s*\/\/ Friendly Battles pay no season progress of any kind\.\s*if \(isFriendlyBattle\) return false;/, 'season-pass XP must no-op in Friendly');
assert.match(game, /const brickDelta = isFriendlyBattle \? 0 : \(isDuels/, 'friendly results must award 0 Bricks');
assert.match(game, /if \(isFriendlyBattle\) \{ rewardCoins = 0; soulReward = 0; \}/, 'friendly results must zero placement coins/souls');
assert.match(game, /friendlyNote\.textContent = '🤝 Friendly Battle — no rewards, no quests, no rank';/, 'results screen must state no rewards, no quests, no rank');
assert.match(game, /rword\.textContent = isFriendlyBattle \? 'FRIENDLY BATTLE — NO PAYOUT' : 'BATTLE PAYOUT';/, 'results payout header must say NO PAYOUT for Friendly');
assert.match(game, /isFriendlyBattle = false;\s*friendlyBattlePendingConfig = null;\s*friendlyBattleConfig = defaultFriendlyBattleConfig\(\);/, 'session reset must clear the friendly flag, pending config and map choice');
assert.match(game, /get isFriendlyBattle\(\) \{ return isFriendlyBattle; \}/, 'test API must export isFriendlyBattle');
assert.match(game, /get friendlyBattleConfig\(\) \{ return friendlyBattleConfig; \}/, 'test API must export friendlyBattleConfig');
assert.match(game, /get showdownMapIndex\(\) \{ return showdownMapIndex; \}/, 'test API must export showdownMapIndex');
assert.match(game, /get getSelectedBrawlerLevel\(\) \{ return getSelectedBrawlerLevel; \}/, 'test API must export getSelectedBrawlerLevel');
assert.match(game, /get matchHomeEventReward\(\) \{ return matchHomeEventReward; \}/, 'test API must export matchHomeEventReward');
assert.match(game, /launchFriendlyBattle,/, 'test API must export launchFriendlyBattle');
assert.match(game, /armFriendlyBattle,/, 'test API must export armFriendlyBattle');
assert.match(game, /^\s*render,$/m, 'test API must export render (drives the results settlement in the VM)');

// ---- Behavioral harness: the real game booted in a vm sandbox ----
// Same mock-DOM approach as tests/prop-hunt-regression.mjs, except the set
// trap stores assignments so the results overlay text can be read back.
const storage = new Map();
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getImageData') return () => ({ data: [] });
    if (typeof k === 'string') return t[k] !== undefined ? t[k] : (() => {});
    return undefined;
  }, set: () => true });
}
function makeEl() {
  const el = {
    style: new Proxy({}, { get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? (() => {}) : t[k]), set: (t, k, v) => { t[k] = v; return true; } }),
    children: [], dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    width: 800, height: 600, textContent: '', innerHTML: '', value: '',
    appendChild(c) { this.children.push(c); return c; }, append(...c) { this.children.push(...c); }, prepend() {}, removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [], getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600, left: 0, top: 0 }),
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
  };
  return new Proxy(el, { get: (t, k) => {
    if (k in t) return t[k];
    if (k === 'firstChild') return t.children[0] || null;
    if (k === 'lastChild') return t.children[t.children.length - 1] || null;
    if (k === 'parentNode' || k === 'parentElement' || k === 'nextSibling' || k === 'previousSibling') return null;
    if (k === 'childNodes' || k === 'children') return t.children;
    if (typeof k === 'string') return () => makeEl();
    return undefined;
  }, set: (t, k, v) => { t[k] = v; return true; } });
}
function boot(save) {
  storage.clear();
  storage.set('brawl_arena_save', JSON.stringify(save));
  const body = makeEl();
  const sandbox = {
    console, Math, JSON, Date, Map, Set, Array, Object, Number, String, Boolean, RegExp, Error, Promise, Uint8Array,
    performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body, head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
    navigator: { userAgent: 'node', maxTouchPoints: 0 }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    Image: class { constructor() { this.complete = true; } }, Audio: class { play() { return Promise.resolve(); } pause() {} },
    location: { href: 'http://localhost/', reload() {} }, alert() {}, addEventListener() {}, removeEventListener() {},
    getComputedStyle: () => ({}),
    BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(game, sandbox, { filename: 'game.js' });
  const api = sandbox.window.__pureHTMLGame;
  assert.ok(api, 'game test API must boot');
  return { api, body };
}
function frames(api, n) { for (let i = 0; i < n; i++) api.update(1 / 60); }
function collectText(el, out = []) {
  if (!el || typeof el !== 'object') return out;
  if (typeof el.textContent === 'string' && el.textContent.trim()) out.push(el.textContent.trim());
  if (typeof el.innerHTML === 'string' && el.innerHTML.trim() && !el.innerHTML.includes('<')) out.push(el.innerHTML.trim());
  for (const c of (Array.isArray(el.children) ? el.children : [])) collectText(c, out);
  return out;
}
function findLastButton(root, needle) {
  const all = [];
  (function walk(el) {
    if (!el || typeof el !== 'object') return;
    const label = `${el.textContent || ''} ${el.innerHTML || ''}`;
    if (Object.prototype.hasOwnProperty.call(el, 'onclick') && typeof el.onclick === 'function' && label.includes(needle)) all.push(el);
    for (const c of (Array.isArray(el.children) ? el.children : [])) walk(c);
  })(root);
  return all.length ? all[all.length - 1] : null;
}
function findButton(root, needle) {
  if (!root || typeof root !== 'object') return null;
  const label = `${root.textContent || ''} ${root.innerHTML || ''}`;
  // The mock returns a dummy function for any unread property, so only an
  // OWN onclick (actually assigned by the game code) counts as a button.
  if (Object.prototype.hasOwnProperty.call(root, 'onclick') && typeof root.onclick === 'function' && label.includes(needle)) return root;
  for (const c of (Array.isArray(root.children) ? root.children : [])) {
    const found = findButton(c, needle);
    if (found) return found;
  }
  return null;
}
function playMatchProgress(api) {
  const daily = Object.values(api.playerData.questBoard?.daily || {}).find(q => q.kind === 'play_match');
  const weekly = Object.values(api.playerData.questBoard?.weekly || {}).find(q => q.kind === 'play_match');
  const season = Object.values(api.playerData.seasonPass?.quests || {}).find(q => q.kind === 'play_match');
  return { daily: daily?.progress || 0, weekly: weekly?.progress || 0, season: season?.progress || 0 };
}
function launchNormalSolo(api) {
  api.showdownMode = 'solo';
  api.launchShowdownMatch();
}

const save5 = { persistent: { coins: 1000, gems: 999, selectedBrawler: 'spikey', unlockedBrawlers: { spikey: true }, brawlerProgress: { spikey: { level: 5, bricks: 0, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } };
const save11 = { persistent: { coins: 1000, gems: 999, selectedBrawler: 'spikey', unlockedBrawlers: { spikey: true }, brawlerProgress: { spikey: { level: 11, bricks: 0, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } };

// ---- Picker end-to-end: mode + map + rules + launch, through the real UI ----
{
  const { api, body } = boot(save5);
  assert.equal(api.getSelectedBrawlerLevel(), 5, 'save must load at level 5');
  api.openCustomMutatorPickerUI();
  const soloBtn = findButton(body, 'Solo Showdown');
  assert.ok(soloBtn, 'picker must show a Solo Showdown mode button');
  soloBtn.onclick();
  const mapBtn = findButton(body, 'Gearfall Foundry');
  assert.ok(mapBtn, 'picker must show a Gearfall Foundry map button for Solo');
  mapBtn.onclick();
  const launchBtn = findButton(body, 'LAUNCH FRIENDLY BATTLE');
  assert.ok(launchBtn, 'picker must show the LAUNCH FRIENDLY BATTLE button');
  launchBtn.onclick();
  assert.equal(api.isFriendlyBattle, true, 'picker launch must start a Friendly Battle');
  assert.equal(api.showdownMode, 'solo', 'picker launch must use the picked mode');
  assert.equal(api.showdownMapIndex, 7, 'picker launch must use the picked map (Gearfall Foundry = 7)');
  assert.equal(api.matchHomeEventReward, null, 'picker launch must consume no event reward');
  body.children.length = 0;
}

// ---- 1. Chosen map applies to the friendly match; the next normal Solo
//        launch is back on rotation ----
{
  const { api } = boot(save5);
  launchNormalSolo(api);
  assert.equal(api.showdownMapIndex, api.getRotatingShowdownMapIndex(), 'normal Solo must use the rotation map');
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: 7, powerRule: 'mine', enemyPool: 'any', modifiers: [] });
  assert.equal(api.isFriendlyBattle, true, 'friendly launch must set the flag');
  assert.equal(api.showdownMapIndex, 7, 'friendly launch must use the chosen map index');
  assert.equal(api.matchHomeEventReward, null, 'friendly launch must consume no event reward');
  api.clearRankedSessionState();
  launchNormalSolo(api);
  assert.equal(api.isFriendlyBattle, false, 'session reset must clear the friendly flag before the next launch');
  assert.equal(api.showdownMapIndex, api.getRotatingShowdownMapIndex(), 'the next normal Solo launch must be back on rotation, not stuck on the friendly map');
  assert.equal(api.friendlyBattleConfig.mapIndex, null, 'session reset must clear the chosen map');
}

// ---- 3. Power rule: max = level 11 for player and bots; mine = saved level ----
{
  const { api } = boot(save5);
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'max', enemyPool: 'any', modifiers: [] });
  assert.equal(api.getSelectedBrawlerLevel(), 11, 'powerRule max must yield player level 11');
  assert.ok(api.player.maxHp > 6000, `powerRule max must yield level-11 HP (got ${api.player.maxHp})`);
  assert.equal(api.bots.length, 19, 'solo lobby must be 20 fighters');
  assert.ok(api.bots.every(b => b.level === 11), 'powerRule max must force every bot to level 11');
  const maxHp = api.player.maxHp;
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: [] });
  assert.equal(api.getSelectedBrawlerLevel(), 5, 'powerRule mine must preserve the saved level 5');
  assert.ok(api.player.maxHp < maxHp, `powerRule mine must yield lower HP than max (mine ${api.player.maxHp} vs max ${maxHp})`);
  assert.ok(api.bots.every(b => b.level >= 5 && b.level <= 7), 'powerRule mine must keep bots near the player (5-7), not maxed');
}

// ---- 4. Enemy pool: same = only the player's brawler as enemies ----
{
  const { api } = boot(save5);
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'same', modifiers: [] });
  assert.ok(api.bots.length > 0, 'mirror launch must spawn bots');
  assert.ok(api.bots.every(b => b.brawler === 'spikey'), 'enemyPool same must spawn only the player brawler as enemies');
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: [] });
  assert.ok(api.bots.some(b => b.brawler !== 'spikey'), 'enemyPool any must not collapse the pool (control)');
}

// ---- 5. Mutators in Friendly behave like Custom (hyper_overdrive case) ----
// hyper_overdrive grants +4/s passive Hypercharge; the no-mutator control
// must accrue nothing over the same second.
{
  const { api } = boot(save5);
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: [] });
  api.hyperChargeCharge = 0;
  frames(api, 60);
  assert.equal(api.hyperChargeCharge, 0, 'no mutators must accrue no Hypercharge (control)');
  assert.equal(api.isHypercharged, false, 'no mutators must leave the player un-hypercharged (control)');
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: ['hyper_overdrive'] });
  api.hyperChargeCharge = 0;
  api.isHypercharged = false;
  frames(api, 60);
  assert.ok(Math.abs(api.hyperChargeCharge - 4) < 1.0, `hyper_overdrive in Friendly must accrue ~4 Hypercharge in 1s (got ${api.hyperChargeCharge})`);
}

// ---- 2. No rewards, no quests, no rank, no season progress ----
// Control first: a normal match DOES pay and DOES advance quests.
{
  const { api, body } = boot(save11);
  launchNormalSolo(api);
  assert.equal(api.addEventQuestProgress('play_match', 1), true, 'event funnel must advance in a normal match (control)');
  // Season quests were rebuilt (stage 10): the season funnel advances in a
  // normal match again (the event funnel above still advances too).
  assert.equal(api.progressSeasonPassQuest('play_match', 1), true, 'season funnel advances in a normal match now that season quests exist again (control)');
  const coinsBefore = api.playerData.coins;
  const soulsBefore = api.playerData.souls || 0;
  const bricksBefore = api.playerData.brawlers.spikey.bricks;
  const progressBefore = playMatchProgress(api);
  api.gameOver = true;
  api.render();
  assert.ok(api.playerData.coins > coinsBefore, `normal results must pay coins (before ${coinsBefore}, after ${api.playerData.coins})`);
  assert.ok(playMatchProgress(api).daily > progressBefore.daily, 'normal results must advance the play_match quest (control)');

  // Same flow, Friendly: nothing pays, nothing advances.
  const coins2 = api.playerData.coins;
  const souls2 = api.playerData.souls || 0;
  const bricks2 = api.playerData.brawlers.spikey.bricks;
  api.launchFriendlyBattle({ mode: 'solo', mapIndex: null, powerRule: 'mine', enemyPool: 'any', modifiers: [] });
  assert.equal(api.addEventQuestProgress('play_match', 1), false, 'event funnel must no-op during a Friendly Battle');
  assert.equal(api.progressSeasonPassQuest('play_match', 1), false, 'season funnel must no-op during a Friendly Battle');
  const progress2 = playMatchProgress(api);
  api.gameOver = true;
  api.render();
  assert.equal(api.playerData.coins, coins2, 'friendly results must award 0 coins');
  assert.equal(api.playerData.souls || 0, souls2, 'friendly results must award 0 souls');
  assert.equal(api.playerData.brawlers.spikey.bricks, bricks2, 'friendly results must award 0 bricks');
  assert.deepEqual(playMatchProgress(api), progress2, 'friendly results must record no quest/season progress');
  const overlayText = collectText(body).join('\n');
  assert.ok(overlayText.includes('Friendly Battle — no rewards, no quests, no rank'), 'results screen must state no rewards, no quests, no rank');
  assert.ok(overlayText.includes('FRIENDLY BATTLE — NO PAYOUT'), 'results screen must say NO PAYOUT');
  assert.ok(overlayText.includes('+0 Coins'), 'results screen must show +0 Coins');
  assert.ok(overlayText.includes('+0 Souls'), 'results screen must show +0 Souls');
  assert.ok(overlayText.includes('+0 Bricks'), 'results screen must show +0 Bricks');
}

// ---- 6. Prop Hunt from Friendly: role picker chains, no event coins ----
// The abort and play paths both go through the real Friendly picker, which
// is what wires the role picker's abort callback.
function launchFriendlyPropHuntFromPicker(api, body) {
  api.openCustomMutatorPickerUI();
  const modeBtn = findButton(body, 'Prop Hunt');
  assert.ok(modeBtn, 'picker must show a Prop Hunt mode button');
  modeBtn.onclick();
  const launchBtn = findButton(body, 'LAUNCH FRIENDLY BATTLE');
  assert.ok(launchBtn, 'picker must show the LAUNCH FRIENDLY BATTLE button');
  launchBtn.onclick();
  assert.ok(api.friendlyBattlePendingConfig, 'picker launch must arm the friendly Prop Hunt config');
}
{
  // Abort path: closing the role picker drops the armed friendly setup.
  const { api, body } = boot(save11);
  launchFriendlyPropHuntFromPicker(api, body);
  const closeBtn = findLastButton(body, '✕');
  assert.ok(closeBtn, 'role picker must show a close button');
  closeBtn.onclick();
  assert.equal(api.friendlyBattlePendingConfig, null, 'closing the role picker must abort the armed friendly config');
  assert.equal(api.isFriendlyBattle, false, 'aborted friendly setup must never set the friendly flag');
}
{
  // Play path: role picker PLAY launches the friendly Prop Hunt.
  const { api, body } = boot(save11);
  launchFriendlyPropHuntFromPicker(api, body);
  api.propHuntSelectedRole = 'hider';
  const playBtn = findButton(body, '▶ PLAY');
  assert.ok(playBtn, 'role picker must show a PLAY button');
  playBtn.onclick();
  assert.equal(api.isPropHuntMode, true, 'friendly Prop Hunt must activate Prop Hunt mode');
  assert.equal(api.isFriendlyBattle, true, 'friendly Prop Hunt must stay a Friendly Battle');
  assert.equal(api.player.propHuntRole, 'hider', 'friendly Prop Hunt must respect the picked hider role');
  assert.equal(api.matchHomeEventReward, null, 'friendly Prop Hunt must consume no event reward');
  const coinsBefore = api.playerData.coins;
  api.propHuntState.phaseEndsAt = Date.now() - 1;
  frames(api, 3);
  api.propHuntState.endsAt = Date.now() - 1;
  frames(api, 3);
  assert.equal(api.gameOver, true, 'timer expiry must end the friendly Prop Hunt match');
  api.render();
  assert.equal(api.playerData.coins, coinsBefore, 'friendly Prop Hunt results must pay 0 coins');
  const overlayText = collectText(body).join('\n');
  assert.ok(overlayText.includes('Friendly Battle — no rewards, no quests, no rank'), 'friendly Prop Hunt results must carry the no-rewards line');
}

console.log('friendly-battle-regression: all assertions passed');
process.exit(0);
