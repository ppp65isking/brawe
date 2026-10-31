import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

// ---- Static anchors: registration, constants, and the wiring points ----
assert.match(game, /\['prop_hunt', '🫣', 'Prop Hunt'/, 'Prop Hunt card must be registered in HOME_MODE_CARDS');
assert.match(game, /'capture_turkey', 'prop_hunt'\];/, 'Prop Hunt must be a permanent home mode');
assert.match(game, /prop_hunt: \{ type:'coins', amount:60, label:'\+60 Coins' \}/, 'Prop Hunt must mirror the closest event reward table (+60 coins)');
assert.match(game, /let PROP_HUNT_ENABLED = true;/, 'Kill switch PROP_HUNT_ENABLED must exist and default on');
assert.match(game, /PROP_HUNT_REMORPH_COOLDOWN_MS = 10000/, 'Re-morph cooldown must be 10 seconds');
assert.match(game, /PROP_HUNT_WRONG_GUESS_TAX = 400/, 'Wrong-guess tax must be 400 HP');
assert.match(game, /PROP_HUNT_SHELL_BREAK_DAMAGE = 500/, 'Shell-break spillover must be 500');
assert.match(game, /PROP_HUNT_HEAD_START_MS = 15000/, 'Head start must be 15 seconds');
assert.match(game, /PROP_HUNT_MATCH_SECONDS = 150/, 'Seek timer must be 150 seconds');
assert.match(game, /applyPropHuntWrongGuessTax\(owner, dw\)/, 'Bullet-vs-wall code must apply the tax');
assert.match(game, /revealPropHuntHiderFromShell\(dw\)/, 'Bullet-vs-wall code must reveal on shell break');
assert.match(game, /!isPropHuntMode && !isTraining && !isBossFight && !isSoloTrial && !isTowerDefenseEvent && !gameOver\) \{\s*stormTimer \+= dt;/, 'Storm must exclude Prop Hunt');
assert.match(game, /if \(isPropHuntMode && t\.propHuntRole\) \{ updatePropHuntBot\(t, dt, now\); continue; \}/, 'Bot loop must route Prop Hunt bots to their controller');
assert.match(game, /if \(isPropHuntMode && t\.propHuntMorphed\) continue;/, 'Render must skip morphed hiders (they render as the prop wall only)');
assert.match(game, /function canDetectMorphedHider/, 'Morph detection predicate must exist');
assert.match(game, /PROP_HUNT_MINIMAP_PING_SHOW_MS = 1000/, 'Minimap ping flash window must be 1s');
// Minimap leak (Anthony playtest, 2026-10-23): the aliveBots minimap loop must skip morphed
// hiders -- they render only as props -- flashing the dot only while an endgame ping is fresh.
const minimapBlock = game.slice(game.indexOf('ctx.translate(mapX, mapY)'));
const minimapLoopAt = minimapBlock.indexOf('for(const t of aliveBots){');
assert.ok(minimapLoopAt >= 0, 'minimap aliveBots loop must exist');
const minimapLoop = minimapBlock.slice(minimapLoopAt, minimapLoopAt + 800);
assert.match(minimapLoop, /if \(isPropHuntMode && t\.propHuntMorphed && !\(propHuntState && propHuntState\.lastPingAt > 0 && performance\.now\(\) - propHuntState\.lastPingAt < PROP_HUNT_MINIMAP_PING_SHOW_MS\)\) continue;/, 'Minimap must hide morphed hiders except during a fresh endgame ping');
assert.match(game, /let propHuntSelectedRole = 'seeker';/, 'v2 role state must exist (session-only, default seeker)');
assert.match(game, /function openPropHuntRolePickerUI/, 'Prop Hunt must open a pre-match role picker');
assert.match(game, /showdownMode === 'prop_hunt'\) \{\s*openPropHuntRolePickerUI\(\);/, 'PLAY on Prop Hunt must route through the role picker');
assert.match(game, /function tryPropHuntPlayerMorph/, 'Player hider needs an explicit morph interaction (M / MORPH)');
assert.match(game, /PROP_HUNT_FOOTPRINT_LIFE_MS = 4000/, 'Footprints must live ~4s');
assert.match(game, /PROP_HUNT_FOOTPRINT_STEP_PX = 30/, 'Footprint step must be 30px');
assert.match(game, /PROP_HUNT_FOOTPRINT_MAX = 260/, 'Footprint store must be hard-capped at 260');
assert.match(game, /propHuntFootprints\.push/, 'Footprint producer must append prints');
assert.ok(!minimapLoop.includes('propHuntFootprints'), 'Footprints must NEVER be drawn on the minimap');

// ---- Behavioral harness: the real game booted in a vm sandbox ----
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
    style: new Proxy({}, { get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? (() => {}) : t[k]), set: () => true }),
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
    if (k === 'childNodes' || k === 'children') return [];
    if (typeof k === 'string') return () => makeEl();
    return undefined;
  }, set: () => true });
}
const sandbox = {
  console, Math, JSON, Date, Map, Set, Array, Object, Number, String, Boolean, RegExp, Error, Promise, Uint8Array,
  performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  document: { createElement: () => makeEl(), createElementNS: () => makeEl(), getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: makeEl(), head: makeEl(), documentElement: makeEl(), hidden: false, visibilityState: 'visible' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  Image: class { constructor() { this.complete = true; } }, Audio: class { play() { return Promise.resolve(); } pause() {} },
  location: { href: 'http://localhost/', reload() {} }, alert() {}, addEventListener() {}, removeEventListener() {},
  getComputedStyle: () => ({}),
  BrawePassTokens: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (() => 0) : undefined) }),
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
storage.set('brawl_arena_save', JSON.stringify({ persistent: { coins: 99999, gems: 99999, selectedBrawler: 'spikey', unlockedBrawlers: { spikey: true }, brawlerProgress: { spikey: { level: 11, bricks: 9999, gadgetUnlocked: true, starPowerUnlocked: true, hyperchargeUnlocked: true, selectedStar: 'slow', selectedGadget: 'g1' } } } }));
vm.createContext(sandbox);
vm.runInContext(game, sandbox, { filename: 'game.js' });
const api = sandbox.window.__pureHTMLGame;
assert.ok(api, 'game test API must boot');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function frames(n) { for (let i = 0; i < n; i++) api.update(1 / 60); }
function launchPropHunt() {
  api.showdownMode = 'prop_hunt';
  api.launchShowdownMatch(1, 1);
  api.playing = true;
}
function parkSeekerBot() {
  const s = api.bots.find(b => b.propHuntRole === 'seeker');
  if (s) { s.x = 200; s.y = 3800; s.propHuntNextTestAt = Date.now() + 60000; }
  return s;
}

// ---- Match setup: mode registers, roles are 2 seekers / 6 hiders ----
launchPropHunt();
const p = api.player;
assert.equal(api.isPropHuntMode, true, 'prop_hunt must activate Prop Hunt mode');
assert.ok(api.propHuntState, 'prop hunt state must exist');
assert.equal(api.propHuntState.phase, 'hide', 'match must open in the hide phase');
assert.equal(api.propHuntState.endsAt - api.propHuntState.phaseEndsAt, 150000, 'seek phase must run 150s after the head start');
assert.equal(api.bots.length, 7, 'lobby must be 8 fighters: player + 7 bots');
assert.equal(api.bots.filter(b => b.propHuntRole === 'seeker').length, 1, 'exactly 1 seeker bot');
assert.equal(api.bots.filter(b => b.propHuntRole === 'hider').length, 6, 'exactly 6 hider bots');
assert.equal(p.propHuntRole, 'seeker', 'v1 solo default: the player is a seeker');
for (const type of ['barrel', 'crate', 'plant_pot', 'sign_post']) {
  assert.ok(api.destructibleWalls.some(w => w.isProp && w.propType === type), `Crown Collapse must place morph prop type ${type}`);
}
assert.equal(api.destructibleWalls.some(w => w.isPowerBox), false, 'Prop Hunt must not scatter power boxes');

// ---- Head start: seekers cannot fire or move; it ends after 15s ----
const seekerBot = parkSeekerBot();
const sbX = seekerBot.x, sbY = seekerBot.y;
api.fire(p, p.x + 300, p.y, false);
frames(30);
assert.equal(api.bullets.filter(b => b.ownerId === p.id).length, 0, 'seeker fire must be blocked during the head start');
assert.equal(Math.hypot(seekerBot.x - sbX, seekerBot.y - sbY), 0, 'seeker bot must stay frozen during the head start');
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek', 'seek phase must begin when the head start expires');

// ---- Morph: hider becomes a real prop wall with the prop type's HP ----
let hider = api.bots.find(b => b.propHuntRole === 'hider' && !b.propHuntMorphed);
hider.brawler = 'warrior'; // pin a passive-free brawler: aura brawlers (Cinderion etc.) would burn their own shell and pollute the spill measurement
const barrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
hider.x = barrel.x + barrel.w / 2 + 58; hider.y = barrel.y + barrel.h / 2; hider.propHuntRemorphAt = 0;
assert.equal(api.findPropHuntMorphSource(hider), barrel, 'nearest morph source must be the adjacent barrel');
assert.equal(api.morphPropHuntHider(hider, 'barrel'), true, 'morph must succeed next to a morph-suitable prop');
const shell = hider.propHuntWall;
assert.ok(shell && shell.isProp, 'morph must create a real prop wall (this is what renders as the prop)');
assert.equal(shell.hp, 2400, 'barrel morph shell must carry the barrel HP pool');
assert.equal(shell.propHuntHiderId, hider.id, 'shell must be flagged with the hider id');
assert.ok(api.destructibleWalls.includes(shell), 'shell must live in destructibleWalls');
assert.ok(Math.abs(shell.x + shell.w / 2 - hider.x) < 1 && Math.abs(shell.y + shell.h / 2 - hider.y) < 1, 'morph must anchor at the hider position');

// ---- Detection: 240px reveal radius, parallel to bush rules ----
assert.equal(api.canDetectMorphedHider(p, hider), false, 'a morphed hider must be undetectable from across the map');
const homeX = p.x, homeY = p.y;
p.x = hider.x + 200; p.y = hider.y;
assert.equal(api.canDetectMorphedHider(p, hider), true, 'a morphed hider inside 240px must be detectable');
p.x = homeX; p.y = homeY;

// ---- Wrong-guess tax: 400 HP for damaging a REAL prop ----
parkSeekerBot();
const crate = api.destructibleWalls.find(w => w.isProp && w.propType === 'crate' && !w.propHuntHiderId);
p.x = crate.x + crate.w / 2 + 300; p.y = crate.y + crate.h / 2;
p.hp = p.maxHp;
const hpBeforeTax = p.hp;
api.fire(p, crate.x + crate.w / 2, crate.y + crate.h / 2, false);
frames(60);
assert.equal(hpBeforeTax - p.hp, 400, `shooting a real prop must cost the seeker exactly 400 HP (lost ${hpBeforeTax - p.hp})`);
assert.ok(crate.hp < 1800, 'the real prop must still take the damage');

// ---- Correct guess: hitting a morphed hider feeds the shell, NO tax ----
await sleep(1400); // clear the player fire delay
parkSeekerBot();
p.x = shell.x + shell.w / 2 + 320; p.y = shell.y + shell.h / 2;
const hpBeforeGuess = p.hp;
api.fire(p, shell.x + shell.w / 2, shell.y + shell.h / 2, false);
frames(60);
assert.equal(p.hp, hpBeforeGuess, 'hitting a morphed hider must NOT tax the seeker');
assert.ok(shell.hp < 2400, 'the morph shell must absorb the hit first');
assert.equal(hider.propHuntMorphed, true, 'hider must stay morphed while the shell holds');

// ---- Shell break: reveal + 500 spillover + 10s re-morph cooldown ----
await sleep(1400);
shell.hp = 50;
const hiderHpBefore = hider.hp;
api.fire(p, shell.x + shell.w / 2, shell.y + shell.h / 2, false);
// Measure on the exact break frame: bot HP regen would mask the spill later.
let spillSeen = null;
let cooldownAtBreak = 0;
for (let i = 0; i < 90 && spillSeen === null; i++) {
  api.update(1 / 60);
  if (!hider.propHuntMorphed) { spillSeen = hiderHpBefore - hider.hp; cooldownAtBreak = hider.propHuntRemorphAt - Date.now(); }
}
assert.ok(spillSeen !== null, 'destroying the shell must reveal the hider');
assert.equal(spillSeen, 500, `shell break must spill exactly 500 onto the hider (lost ${spillSeen})`);
assert.ok(!api.destructibleWalls.includes(shell), 'broken shell must be removed from the world');
const cooldownLeft = cooldownAtBreak;
assert.ok(cooldownLeft > 8000 && cooldownLeft <= 10050, `re-morph cooldown must be ~10s (got ${cooldownLeft}ms)`);
assert.equal(api.morphPropHuntHider(hider, 'barrel'), false, 're-morph must be refused during the cooldown');

// ---- After the cooldown: morph again, and firing breaks it instantly ----
hider.propHuntRemorphAt = 0;
assert.equal(api.morphPropHuntHider(hider, 'barrel'), true, 'morph must work again after the cooldown');
api.fire(hider, hider.x + 100, hider.y, true);
assert.equal(hider.propHuntMorphed, false, 'firing must break the morph instantly');

// ---- Timer win for the hiders ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
api.propHuntState.endsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.winner, 'hiders', 'hiders alive at 0:00 must win');
assert.equal(api.gameOver, true, 'timer expiry must end the match');

// ---- Elimination win for the seekers ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
for (const b of api.bots) if (b.propHuntRole === 'hider') b.hp = 0;
frames(3);
assert.equal(api.propHuntState.winner, 'seekers', 'eliminating all hiders must win for the seekers');
assert.equal(api.gameOver, true, 'elimination must end the match');

// ---- Endgame anti-stall pings in the final 30s ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
let lateHider = api.bots.find(b => b.propHuntRole === 'hider' && !b.propHuntMorphed);
lateHider.brawler = 'warrior';
const lateBarrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
lateHider.x = lateBarrel.x + lateBarrel.w / 2 + 58; lateHider.y = lateBarrel.y + lateBarrel.h / 2; lateHider.propHuntRemorphAt = 0;
assert.equal(api.morphPropHuntHider(lateHider, 'barrel'), true, 'late hider must morph for the ping check');
api.propHuntState.endsAt = Date.now() + 20000; // inside the final 30s
api.propHuntState.nextPingAt = 0;
frames(3);
assert.ok(api.propHuntState.lastPingAt > 0, 'morphed hiders must emit reveal pings in the final 30s');
assert.ok(Date.now() - api.propHuntState.lastPingAt < 1000, 'a fresh ping must fall inside the 1s minimap flash window (PROP_HUNT_MINIMAP_PING_SHOW_MS)');

// ---- Minimap leak: before any endgame ping, the guard inputs keep hiders hidden ----
launchPropHunt();
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
assert.equal(api.propHuntState.lastPingAt, 0, 'no ping yet: lastPingAt must be unset so the minimap guard hides morphed hiders');

// ================= Prop Hunt v2: playable Hider, role picker, footprints =================
function launchPropHuntAs(role) {
  api.propHuntSelectedRole = role;
  launchPropHunt();
}
function parkAllSeekersFar() {
  for (const s of api.bots.filter(b => b.propHuntRole === 'seeker')) {
    s.x = 200; s.y = 3800; s.propHuntNextTestAt = Date.now() + 60000; s.brawler = 'warrior';
  }
}
function laneClear(x1, y1, x2, y2, ignore) {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    for (const w of api.destructibleWalls) {
      if (ignore && ignore.includes(w)) continue;
      if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return false;
    }
  }
  return true;
}

// ---- Seeker composition unchanged (v1 behavior via the picker) ----
launchPropHuntAs('seeker');
assert.equal(api.bots.filter(b => b.propHuntRole === 'seeker').length, 1, 'seeker player keeps exactly 1 seeker bot');
assert.equal(api.bots.filter(b => b.propHuntRole === 'hider').length, 6, 'seeker player keeps exactly 6 hider bots');
for (const b of api.bots) {
  if (b.propHuntRole === 'seeker') { assert.equal(b.team, 'player'); assert.equal(b.isTeammate, true); }
  else { assert.equal(b.team, 'enemy'); assert.equal(b.isTeammate, false); }
}

// ---- Role picker: Hider composition is player + 2 seeker bots + 5 hider bots ----
launchPropHuntAs('hider');
const hp2 = api.player;
assert.equal(hp2.propHuntRole, 'hider', 'picker choice must make the player a hider');
assert.equal(api.bots.length, 7, 'hider lobby must still be 8 fighters total');
assert.equal(api.bots.filter(b => b.propHuntRole === 'seeker').length, 2, 'player hider needs exactly 2 seeker bots');
assert.equal(api.bots.filter(b => b.propHuntRole === 'hider').length, 5, 'player hider needs exactly 5 hider bots');
for (const b of api.bots) {
  if (b.propHuntRole === 'seeker') { assert.equal(b.team, 'enemy', 'seeker bots must be the enemy team when the player hides'); assert.equal(b.isTeammate, false); }
  else { assert.equal(b.team, 'player', 'fellow hider bots must be on the player team when the player hides'); assert.equal(b.isTeammate, true); }
}

// ---- Player hider: fire is NOT holstered during the head start (role gate) ----
parkAllSeekersFar();
api.fire(hp2, hp2.x + 300, hp2.y, false);
assert.ok(api.bullets.some(b => b.ownerId === hp2.id), 'hider fire must work during the head start (only seekers are holstered)');

// ---- Player morph: toggle, cooldown, no-prop refusal ----
launchPropHuntAs('hider');
const mp = api.player;
parkAllSeekersFar();
const mBarrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
mp.x = mBarrel.x + mBarrel.w / 2 + 58; mp.y = mBarrel.y + mBarrel.h / 2; mp.propHuntRemorphAt = 0;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'morph press beside a barrel must morph the player');
assert.equal(mp.propHuntMorphed, true);
assert.ok(mp.propHuntWall && mp.propHuntWall.hp === 2400, 'player shell must carry the barrel HP pool');
assert.equal(mp.propHuntWall.propHuntHiderId, mp.id, 'player shell must be flagged with the player id');
assert.equal(api.tryPropHuntPlayerMorph(), true, 'second press must voluntarily drop the morph');
assert.equal(mp.propHuntMorphed, false);
assert.ok(mp.propHuntRemorphAt - Date.now() > 8000, 'voluntary drop must start the 10s re-morph cooldown');
assert.equal(api.tryPropHuntPlayerMorph(), false, 'morph press during the cooldown must be refused');
mp.propHuntRemorphAt = 0;
mp.x = 2000; mp.y = 2000;
let spotGuard = 0;
while (api.findPropHuntMorphSource(mp) && spotGuard++ < 60) { mp.x += 173; mp.y += 131; if (mp.x > 3600) mp.x = 300; if (mp.y > 3600) mp.y = 300; }
assert.equal(api.findPropHuntMorphSource(mp), null, 'test setup: player must be out of morph range');
assert.equal(api.tryPropHuntPlayerMorph(), false, 'morph press with no prop nearby must be refused');
assert.equal(mp.propHuntMorphed, false);

// ---- FIGHT-OR-FLEE: firing breaks the morph AND the shot damages a seeker ----
launchPropHuntAs('hider');
const fp = api.player;
parkAllSeekersFar();
const fBarrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
fp.x = fBarrel.x + fBarrel.w / 2 + 58; fp.y = fBarrel.y + fBarrel.h / 2; fp.propHuntRemorphAt = 0;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'setup: player must morph');
const victim = api.bots.find(b => b.propHuntRole === 'seeker');
victim.brawler = 'warrior';
const shellF = fp.propHuntWall;
let aim = null;
for (const [dx, dy] of [[300, 0], [-300, 0], [0, 300], [0, -300]]) {
  if (laneClear(fp.x, fp.y, fp.x + dx, fp.y + dy, [shellF])) { aim = [fp.x + dx, fp.y + dy]; break; }
}
assert.ok(aim, 'test setup: a clear firing lane must exist');
victim.x = aim[0]; victim.y = aim[1];
const victimHp0 = victim.hp;
api.fire(fp, victim.x, victim.y, false);
frames(45);
assert.equal(fp.propHuntMorphed, false, 'firing must break the player morph instantly');
assert.ok(fp.propHuntRemorphAt - Date.now() > 8000, 'firing out of a morph must start the re-morph cooldown');
assert.ok(victim.hp < victimHp0, `a hider's shot must damage a seeker (victim at ${victim.hp}/${victimHp0})`);

// ---- Shell break on the PLAYER: exactly 500 spillover; lethal spillover ends it ----
launchPropHuntAs('hider');
const sp = api.player;
parkAllSeekersFar();
const sBarrel = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
sp.x = sBarrel.x + sBarrel.w / 2 + 58; sp.y = sBarrel.y + sBarrel.h / 2; sp.propHuntRemorphAt = 0;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'setup: player must morph');
sp.hp = 2000;
const spShell = sp.propHuntWall;
api.damagePropHuntShell(sp, 99999);
assert.equal(sp.propHuntMorphed, false, 'shell destruction must reveal the player hider');
assert.equal(sp.hp, 1500, 'player shell break must spill exactly 500');
assert.ok(!api.destructibleWalls.includes(spShell), 'player shell must be removed on break');
sp.propHuntRemorphAt = 0;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'player must be able to re-morph beside the same prop');
sp.hp = 400;
api.damagePropHuntShell(sp, 99999);
frames(3);
assert.equal(api.propHuntState.winner, 'seekers', 'player-hider death must end the match for the seekers');
assert.equal(api.gameOver, true, 'player-hider death must end the match');

// ---- Timer win with the player hiding ----
launchPropHuntAs('hider');
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
api.propHuntState.endsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.winner, 'hiders', 'player hider alive at 0:00 must win for the hiders');
assert.equal(api.gameOver, true);

// ---- Seeker bot hunts a morphed player inside 240px; cannot see it from range ----
launchPropHuntAs('hider');
const hunted = api.player;
const hBarrel2 = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
hunted.x = hBarrel2.x + hBarrel2.w / 2 + 58; hunted.y = hBarrel2.y + hBarrel2.h / 2; hunted.propHuntRemorphAt = 0;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'setup: player must morph');
const shell2 = hunted.propHuntWall;
const hunter = api.bots.find(b => b.propHuntRole === 'seeker');
hunter.brawler = 'rocketeer'; // straight-line rocket: proven wall-impact path
const corners = [[200, 200], [3800, 200], [200, 3800], [3800, 3800]];
const farCorner = corners.sort((a, b) => Math.hypot(b[0] - hunted.x, b[1] - hunted.y) - Math.hypot(a[0] - hunted.x, a[1] - hunted.y))[0];
const otherSeeker = api.bots.find(b => b.propHuntRole === 'seeker' && b !== hunter);
otherSeeker.x = farCorner[0]; otherSeeker.y = farCorner[1]; otherSeeker.speed = 0; otherSeeker.propHuntNextTestAt = Date.now() + 60000;
for (const b of api.bots) if (b.propHuntRole === 'hider') { b.x = farCorner[0]; b.y = farCorner[1]; b.speed = 0; }
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(3);
assert.equal(api.propHuntState.phase, 'seek');
hunter.x = hunted.x + 1200; hunter.y = hunted.y; hunter.propHuntNextTestAt = Date.now() + 60000;
frames(30);
assert.equal(shell2.hp, 2400, 'a seeker outside detection range must not damage the morphed player shell');
hunter.x = hunted.x + 200; hunter.y = hunted.y; hunter.propHuntNextTestAt = 0;
frames(120);
assert.ok(shell2.hp < 2400 || !hunted.propHuntMorphed, 'a seeker inside 240px must shoot the morphed player shell');

// ---- Seeker target reservation: stacked seekers must not claim the same wall ----
launchPropHuntAs('hider');
const rp = api.player;
const morphSpots = api.destructibleWalls.filter(w => w.isProp && !w.propHuntHiderId);
const allHiders = [rp, ...api.bots.filter(b => b.propHuntRole === 'hider')];
allHiders.forEach((h, i) => {
  const src = morphSpots[i % morphSpots.length];
  h.x = src.x + src.w / 2 + 58; h.y = src.y + src.h / 2; h.propHuntRemorphAt = 0;
  assert.equal(api.morphPropHuntHider(h, src.propType), true, 'setup: every hider must morph');
});
const [rs1, rs2] = api.bots.filter(b => b.propHuntRole === 'seeker');
const stackCorners = [[300, 300], [3700, 300], [300, 3700], [3700, 3700]];
const stackSpot = stackCorners.sort((a, b) => {
  const dA = Math.min(...allHiders.map(h => Math.hypot(h.x - a[0], h.y - a[1])));
  const dB = Math.min(...allHiders.map(h => Math.hypot(h.x - b[0], h.y - b[1])));
  return dB - dA;
})[0];
assert.ok(Math.min(...allHiders.map(h => Math.hypot(h.x - stackSpot[0], h.y - stackSpot[1]))) > 400, 'test setup: seekers must stack outside detection range of every morphed hider');
rs1.x = stackSpot[0]; rs1.y = stackSpot[1]; rs2.x = stackSpot[0]; rs2.y = stackSpot[1];
rs1.propHuntNextTestAt = Date.now() + 60000; rs2.propHuntNextTestAt = Date.now() + 60000;
api.propHuntState.phaseEndsAt = Date.now() - 1;
frames(6);
assert.equal(api.propHuntState.phase, 'seek');
assert.ok(rs1.propHuntTargetWall && rs2.propHuntTargetWall, 'both seekers must pick a sweep target');
assert.notEqual(rs1.propHuntTargetWall, rs2.propHuntTargetWall, 'two seekers must not permanently test the same wall');

// ---- Footprints: only unmorphed moving hiders; morph none; expiry; cap ----
launchPropHuntAs('hider');
const tp = api.player;
for (const b of api.bots) { b.x = 200; b.y = 3800; b.speed = 0; if (b.propHuntRole === 'seeker') b.propHuntNextTestAt = Date.now() + 60000; }
assert.equal(api.propHuntFootprints.length, 0, 'footprint store must start empty');
tp.x = 2000; tp.y = 2000; tp.propHuntTrailPrevX = null;
for (let i = 0; i < 8; i++) { tp.x += 40; frames(1); }
assert.ok(api.propHuntFootprints.length >= 5, `moving hider must drop footprints (got ${api.propHuntFootprints.length})`);
assert.equal(api.propHuntFootprints[0].expiresAt - api.propHuntFootprints[0].bornAt, api.PROP_HUNT_FOOTPRINT_LIFE_MS, 'footprint lifetime must be the 4s constant');
const tBarrel2 = api.destructibleWalls.find(w => w.isProp && w.propType === 'barrel' && !w.propHuntHiderId);
tp.x = tBarrel2.x + tBarrel2.w / 2 + 58; tp.y = tBarrel2.y + tBarrel2.h / 2; tp.propHuntRemorphAt = 0;
const printsBeforeMorph = api.propHuntFootprints.length;
assert.equal(api.tryPropHuntPlayerMorph(), true, 'setup: player must morph');
for (let i = 0; i < 5; i++) { tp.x += 40; frames(1); }
assert.equal(api.propHuntFootprints.length, printsBeforeMorph, 'a morphed hider must leave no footprints');
api.breakPropHuntMorph(tp);
for (const f of api.propHuntFootprints) f.expiresAt = Date.now() - 1;
frames(2);
assert.equal(api.propHuntFootprints.length, 0, 'expired footprints must be pruned');
for (let i = 0; i < api.PROP_HUNT_FOOTPRINT_MAX + 40; i++) api.propHuntFootprints.push({ x: 100, y: 100, angle: 0, side: 1, bornAt: Date.now(), expiresAt: Date.now() + 60000 });
tp.propHuntTrailPrevX = null;
for (let i = 0; i < 3; i++) { tp.x += 40; frames(1); }
assert.ok(api.propHuntFootprints.length <= api.PROP_HUNT_FOOTPRINT_MAX, 'footprint store must respect the hard cap');

// ---- Footprints: the seeker leaves none (control) ----
launchPropHuntAs('seeker');
const kp = api.player;
for (let i = 0; i < 6; i++) { kp.x += 40; frames(1); }
assert.equal(api.propHuntFootprints.length, 0, 'the player as seeker must leave no footprints');
api.propHuntSelectedRole = 'seeker';

// ---- Kill switch: disabling PROP_HUNT_ENABLED falls back to solo ----
api.PROP_HUNT_ENABLED = false;
api.showdownMode = 'prop_hunt';
api.launchShowdownMatch(1, 1);
assert.equal(api.isPropHuntMode, false, 'kill switch off must refuse Prop Hunt (falls back to solo)');
api.PROP_HUNT_ENABLED = true;

console.log('prop-hunt-regression: all assertions passed');
process.exit(0);
