import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');

assert.match(game, /const GADGET_COST = 800;/, 'Tools cost 800 coins (Power 12 ladder)');
assert.match(game, /const STAR_POWER_COST = 950;/, 'Talents cost 950 coins (Power 12 ladder)');
assert.match(game, /const HYPERCHARGE_BASE_COST = 1200;/, 'Core Surge base price is 1200 coins (Power 12 ladder)');
assert.match(game, /const TRINKET_COST = 350;/, 'Trinkets cost 350 coins');

assert.match(game, /HYPERCHARGE_DISCOUNT_STEPS = Object\.freeze\(\[5, 10, 15, 20\]\)/, 'Permanent Core Surge discounts are limited to 5-20%');
assert.match(game, /if \(Math\.random\(\) < 0\.45\) return 0;/, 'A P11 fighter can permanently roll no discount');
assert.match(game, /progress\.hyperchargeDiscountPct = rollHyperchargeDiscountPct\(\)/, 'The rolled discount is stored on fighter progression');
assert.match(game, /hyperchargeDiscountPct: normalizeHyperchargeDiscountPct\(progress\.hyperchargeDiscountPct\)/, 'Discounts persist through save serialization');
assert.match(game, /Math\.round\(HYPERCHARGE_BASE_COST \* \(1 - discountPct \/ 100\)\)/, 'Core Surge checkout applies its saved percentage');

assert.match(game, /retiredHyper = countOwnedSlots\(playerData\.attachies\.hyper\)[\s\S]{0,180}refund = retiredHyper \* 100/, 'Every owned Core Surge Attachie refunds 100 coins');
assert.match(game, /hyperAttachiesRetiredRefunded = true/, 'The refund has a one-time save migration marker');
assert.match(game, /playerData\.attachies\.hyper = \{\}/, 'Retired Core Surge Attachies are cleared after migration');
assert.match(game, /function getPlayerHyperMainActive\(brawlerId\) \{ return !!isHypercharged; \}/, 'Hyper main attacks activate from Core Surge alone');
assert.doesNotMatch(game, /attachiesBtn\.id = 'attachiesBtn'/, 'No retired Attachies shortcut remains visible');

assert.match(game, /playerData\.coins -= GADGET_COST/, 'Tool checkout uses the new centralized price');
assert.match(game, /playerData\.coins -= STAR_POWER_COST/, 'Talent checkout uses the new centralized price');
assert.match(game, /playerData\.coins -= hyperPrice/, 'Core Surge checkout uses the discounted price');
assert.match(game, /playerData\.coins -= TRINKET_COST/, 'Trinket checkout uses the new centralized price');
assert.match(game, /Its Hyper main-attack upgrade activates automatically with Core Surge\./, 'Core Surge descriptions explain intrinsic Hyper main attacks');

console.log('Economy and Attachie retirement regression suite passed.');
