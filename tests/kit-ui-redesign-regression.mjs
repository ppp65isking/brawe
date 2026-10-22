import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../kit-redesign.css', import.meta.url), 'utf8');

// The redesign stylesheet is linked after the gallery sheet so it wins ties.
const galleryIdx = html.indexOf('fighter-gallery.css');
const kitIdx = html.indexOf('kit-redesign.css');
assert.ok(kitIdx > galleryIdx && galleryIdx !== -1, 'kit-redesign.css must be linked after fighter-gallery.css');

// showDetails() carries the class hooks the redesign layer styles.
for (const hook of [
  "title.className = 'brawler-detail__title';",
  "role.className = 'brawler-detail__role';",
  "rankBar.className = 'brawler-detail__rankbar';",
  "detailsContainer.className = 'brawler-detail__kit';",
  "charIcon.classList.add('brawler-detail__portrait');",
  "upgBtn.className = 'kit-upgrade-btn';",
  "skinBtn.className = 'kit-skin-btn';",
  "gadgetPanel.className = 'kit-panel kit-panel--gadget';",
  "starPanel.className = 'kit-panel kit-panel--star';",
  "hyperPanel.className = 'kit-panel kit-panel--hyper';",
  "perkPanel.className = 'kit-panel kit-panel--perk';",
  "trinketPanel.className = 'kit-panel kit-panel--trinket';",
]) {
  assert.ok(source.includes(hook), `missing detail hook: ${hook}`);
}

// The stylesheet actually covers both screens: roster and detail/kit.
for (const selector of [
  '.brawler-browser__header',
  '.brawler-browser__grid',
  '.brawler-card__portrait',
  '.brawler-browser__selected-open',
  '.brawler-detail__layout',
  '.brawler-upgrade-card',
  '.brawler-detail__kit',
  '.kit-panel--gadget',
  '.kit-panel--star',
  '.kit-panel--hyper',
  '.kit-panel--perk',
  '.kit-panel--trinket',
  '.kit-upgrade-btn',
]) {
  assert.ok(css.includes(selector), `kit-redesign.css must style ${selector}`);
}

// Redesign stays presentation-only: no cost or save fields were touched.
assert.match(source, /const GADGET_COST = 800/, 'gadget price must be unchanged');
assert.match(source, /const STAR_POWER_COST = 950/, 'star power price must be unchanged');

console.log('Kit UI redesign regression checks passed.');
