/* St. John the Beloved test site · CI screenshots (test/screenshots.js): after the smoke test, CI runs this to save a
   picture of every main screen (a page in the navigation pane) at 1440px and 320px, plus the navigation pane with one
   group open (the group of the page being shown), into screenshots/ for upload as a workflow artifact (#53, first step of #45).
   Runs in CI only (D-0018): it starts a Chrome. The plan() helper is pure and checked by test/screenshots.plan.test.js.
     node test/screenshots.js     CHROME_PATH picks the browser; PORT (8796); OUT (screenshots) */
const path = require('path');
const fs = require('fs');

const WIDTHS = [1440, 320];
const NAV_PAGE = 'members';   // the page whose group (People) is the one open group in the navigation shots

// pages.js is plain JSON after the = sign; a main screen is a page the navigation lists and that draws the site chrome
const loadPages = () => { const t = fs.readFileSync(path.join(__dirname, '..', 'site', 'pages.js'), 'utf8'); return JSON.parse(t.slice(t.indexOf('= [') + 2).replace(/;\s*$/, '')); };

// the list of shots: { file, hash, width, kind } for each main screen at each width, then the navigation pane at each width
function plan(pages, widths = WIDTHS) {
  const main = pages.filter((p) => p.nav !== false && p.chrome !== false);
  const shots = [];
  for (const w of widths) for (const p of main) shots.push({ file: p.id + '-' + w + '.png', hash: '#' + (p.open || p.path), width: w, kind: 'screen' });
  const nav = main.find((p) => p.id === NAV_PAGE) || main[0];
  for (const w of widths) shots.push({ file: 'nav-open-group-' + w + '.png', hash: '#' + (nav.open || nav.path), width: w, kind: 'nav' });
  return shots;
}

async function run() {
  process.env.PORT = process.env.PORT || '8796';
  process.env.RESET_OPEN = '1'; process.env.RESET_HOUR = '-1'; process.env.SEED_ON_START = '1';
  const puppeteer = require('puppeteer-core');
  const { start } = require('../server/server.js');
  const BASE = 'http://127.0.0.1:' + process.env.PORT + '/';
  const out = path.resolve(process.env.OUT || 'screenshots');
  fs.mkdirSync(out, { recursive: true });
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
  const server = await start();
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  let done = 0;
  try {
    const page = await browser.newPage();
    for (const s of plan(loadPages())) {
      await page.setViewport({ width: s.width, height: 900 });
      await page.goto('about:blank');
      await page.goto(BASE + s.hash, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('main') && document.querySelector('main').innerText.trim().length > 20, { timeout: 15000 });
      const target = path.join(out, s.file);
      // the navigation shot is the pane itself when it is drawn at this width, else the visible page (the pane is folded to its rail)
      const pane = s.kind === 'nav' ? await page.$('nav') : null;
      if (pane && (await pane.boundingBox())) await pane.screenshot({ path: target });
      else await page.screenshot({ path: target, fullPage: s.kind === 'screen' });
      done++;
    }
  } finally { await browser.close(); server.close(); }
  console.log('SCREENSHOTS_OK ' + done + ' files in ' + out);
  process.exit(0);
}

module.exports = { plan, loadPages, WIDTHS };
if (require.main === module) run().catch((e) => { console.error(e); process.exit(1); });
