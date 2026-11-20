import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack || error.message); });
  await page.goto(`file:///${process.cwd().replace(/\\/g, '/')}/index.html`);
  await page.waitForFunction(() => !!window.__pureHTMLGame?.refreshHomeUI);
  assert.equal(await page.locator('[data-home-currency]').count(), 3, 'All currency counters render');
  assert.equal(await page.locator('.home-brawler-avatar').count(), 1, 'Selected fighter portrait renders');
  assert(await page.locator('.home-brawler-avatar').isVisible(), 'Selected fighter portrait is visible');
  assert.equal(await page.locator('.home-career-stat').count(), 4, 'Lobby progression/streak summary renders');
  assert(await page.locator('#homeSeasonPulse').innerText(), 'Lobby footer is populated');
  await page.locator('#homeMenuBtn').click();
  assert(await page.locator('#homeUtilityDetails').isVisible(), 'Tools drawer opens visibly');
  await page.locator('#homeMenuBtn').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.locator('.home-brawler-avatar').isVisible(), 'Mobile selected fighter remains visible');
  assert.equal(await page.locator('[data-home-currency]').count(), 3, 'Mobile currency counters remain populated');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#homeEventsNav').click();
  assert(await page.locator('[data-home-mode="arena_forge"]').isVisible(), 'Arena Forge is available in Events');
  assert(await page.locator('[data-home-mode="damage_filler"]').isVisible(), 'Damage Filler is not missing from Events');
  await page.locator('#homeLobbyNav').click();
  await page.locator('#startMatch').click();
  await page.waitForFunction(() => window.__pureHTMLGame?.playing === true, {}, { timeout: 5000 }).catch(() => { throw new Error('Match did not launch: ' + errors.join('; ')); });
  await page.waitForTimeout(3000);
  assert.deepEqual(errors, [], 'Home startup and actual match launch have no runtime errors');
  console.log('PASS: home currencies, portrait, streak/rank summary, tools drawer, and actual match startup.');
} finally {
  await browser.close();
}
