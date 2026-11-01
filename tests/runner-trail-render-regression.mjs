// Runner trail render: renderRunnerEffects must receive the canvas context.
// Regression test for the post-#71 crash: render() called it with no argument,
// so ctx was undefined and the first live trail segment threw
// "TypeError: Cannot read properties of undefined (reading 'save')" on
// ctx.save(), pausing any match the moment a Runner shoe was fired.
// Source-presence checks. No DOM/match runtime needed.
import fs from 'fs';
const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
let passed = 0, failed = 0;
const failures = [];
function check(name, cond) { if (cond) passed++; else { failed++; failures.push(name); } }

check('renderRunnerEffects is defined with a ctx parameter', game.includes('function renderRunnerEffects(ctx)'));
check('render() passes ctx to renderRunnerEffects', game.includes('renderRunnerEffects(ctx);'));
check('no bare renderRunnerEffects() call remains', !game.includes('renderRunnerEffects();'));
check('trail renderer still draws via ctx.save (fix is at the call site, not a render delete)', (() => {
  const body = game.slice(game.indexOf('function renderRunnerEffects(ctx)'), game.indexOf('function renderRunnerEffects(ctx)') + 1200);
  return body.includes('ctx.save();');
})());
check('drawRunnerShoe call still passes ctx (sibling call-site guard)', game.includes('drawRunnerShoe(ctx, b)'));
check('drawPlayerCcTreatment call still passes ctx (sibling call-site guard)', game.includes('drawPlayerCcTreatment(ctx, player'));

console.log(`runner-trail-render: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:', failures.join(' | ')); process.exit(1); }
