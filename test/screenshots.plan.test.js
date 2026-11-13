/* The screenshot plan (test/screenshots.js), checked without a browser: every main screen at 1440px and 320px, and the
   navigation pane with one group open at both widths. Runs on the host and in CI:  node test/screenshots.plan.test.js */
const assert = require('assert');
const { plan, loadPages } = require('./screenshots.js');

const pages = loadPages();
const shots = plan(pages);
const files = shots.map((s) => s.file);
const main = pages.filter((p) => p.nav !== false && p.chrome !== false);

assert.ok(main.length >= 5, 'the site has main screens');
for (const w of [1440, 320]) {
  for (const p of main) assert.ok(files.includes(p.id + '-' + w + '.png'), 'missing ' + p.id + ' at ' + w);
  assert.ok(files.includes('nav-open-group-' + w + '.png'), 'missing the navigation pane at ' + w);
}
assert.strictEqual(new Set(files).size, files.length, 'file names are unique');
assert.ok(!shots.some((s) => /:id/.test(s.hash)), 'no route still has an :id part');
assert.ok(!files.some((f) => /member-new|member-edit/.test(f)), 'pages hidden from the navigation are not main screens');
console.log('SCREENSHOT_PLAN_OK ' + shots.length + ' shots');
