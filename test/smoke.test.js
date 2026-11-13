/* St. John the Beloved test site · the smoke test (test/smoke.test.js): the site's own check, run in its CI and before a
   deploy. It starts the server (DATABASE_URL: the CI's throwaway PostgreSQL, or pglite:memory), then in Chrome opens every
   page of site/pages.js: each must draw its main region with no page error, console error or failed request. Then the speed
   rules (hashed, compressed, long-kept scripts; one data request per page) and the API:
   a new member is saved and is there after a reload, a sign-up and an RSVP save, and a reset brings the seed back.
   (The full Plenix tests, pages, keyboard, typography and the rest, run in the Plenix repository against this site.)
     npm test        CHROME_PATH picks the browser; PORT (8795) */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

process.env.PORT = process.env.PORT || '8795';
process.env.RESET_OPEN = '1';
process.env.RESET_HOUR = '-1';
process.env.SEED_ON_START = '1';
const { start } = require('../server/server.js');
const BASE = 'http://127.0.0.1:' + process.env.PORT + '/';

const text = fs.readFileSync(path.join(__dirname, '..', 'site', 'pages.js'), 'utf8');
const PAGES = JSON.parse(text.slice(text.indexOf('= [') + 2).replace(/;\s*$/, ''));
const chrome = () => process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));

(async () => {
  const server = await start();
  const failed = [];
  const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' · ' + detail)); if (!ok) failed.push(name); };
  const api = async (p, method, body) => { const r = await fetch(BASE + 'api/' + p, { method: method || 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json() }; };
  const browser = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    let errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
    for (const p of PAGES) {
      errs = [];
      await page.goto('about:blank');
      await page.goto(BASE + '#' + (p.open || p.path), { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('main') && document.querySelector('main').innerText.trim().length > 20, { timeout: 15000 }).catch(() => errs.push('empty page'));
      check('page ' + p.id, !errs.length, errs.slice(0, 3).join(' | '));
    }

    // Plenix parts the screens added for the Plenix coverage test (#338): the servants' vote (VoteTally) and the Arabic file number (Isolate).
    // Each is first looked for where it is not drawn, so the check can see an absence; then where it is.
    const open = async (hash) => { await page.goto('about:blank'); await page.goto(BASE + hash, { waitUntil: 'networkidle0', timeout: 60000 }); await page.waitForSelector('main', { timeout: 15000 }); };
    const groups = () => page.$$eval('[role="group"][aria-label^="Vote of "]', (a) => a.map((e) => e.getAttribute('aria-label')));
    const pressed = () => page.$$eval('[role="group"][aria-label^="Vote of "] button[aria-pressed="true"]', (a) => a.length);
    await open('#/ministries');
    check('the ministries list draws no vote', (await groups()).length === 0, 'found one');
    await open('#/ministry/sunday-school');
    const names = await groups();
    check('the servants\' vote shows a choice group for each member who can vote (6 members, 2 turned off)', names.length === 4 && names.indexOf('Vote of Abanoub Tawfik') < 0, JSON.stringify(names));
    const start = await pressed();
    await page.click('[role="group"][aria-label="Vote of Peter Nasr"] button');   // the first choice is Approve
    const voted = await pressed();
    await page.click('[role="group"][aria-label="Vote of Peter Nasr"] button');   // the same choice again clears it
    const cleared = await pressed();
    check('a vote is counted, then cleared', start === 3 && voted === 4 && cleared === 3, start + ' then ' + voted + ' then ' + cleared);
    await open('#/members');
    check('the members list draws no Arabic file note', (await page.$$('#household-file-ar')).length === 0, 'found one');
    await open('#/family/f1');
    const note = await page.$eval('#household-file-ar', (e) => ({ text: e.textContent, island: [...e.querySelectorAll('.plx-isolate')].map((i) => i.textContent), lang: e.getAttribute('lang') }));
    check('the Arabic note holds the household\'s file number as one Isolate', note.lang === 'ar' && /[\u0600-\u06FF]/.test(note.text) && note.island.length === 1 && note.island[0] === '20260001-01', JSON.stringify(note));

    // the speed rules (#26): the page is checked each time; the built scripts have hashed names, go out compressed and are kept
    // for a year; a screen's code loads when it opens; a page asks for its data in one request, and never for every list
    const index = await fetch(BASE);
    const html = await index.text();
    const scripts = [...html.matchAll(/<script src="((?:app|assets\/[^"]*)\.[0-9a-f]{10}\.js)"/g)].map((m) => m[1]);
    check('the page is checked each time', /no-cache/.test(index.headers.get('cache-control')), index.headers.get('cache-control'));
    const app = await fetch(BASE + scripts.find((s) => /^app\./.test(s)), { headers: { 'Accept-Encoding': 'br, gzip' } });
    check('the built scripts have hashed names, are kept for a year and go out compressed', scripts.length === 2 && app.headers.get('cache-control') === 'public, max-age=31536000, immutable'
      && /^(br|gzip)$/.test(app.headers.get('content-encoding') || ''), JSON.stringify({ scripts, cache: app.headers.get('cache-control'), encoding: app.headers.get('content-encoding') }));
    const asked = [];
    const listen = (r) => { const u = r.url(); if (/\/api\//.test(u) || /\/screens\//.test(u)) asked.push(u.replace(BASE, '')); };
    page.on('request', listen);
    await open('#/members');
    page.off('request', listen);
    const data = asked.filter((u) => /^api\//.test(u));
    check('a page loads its own code and asks for its data in one request, not for every list', data.length === 1 && /^api\/lists\?names=/.test(data[0]) && !/gifts/.test(data[0])
      && asked.some((u) => /^screens\/members\.[0-9a-f]{10}\.js$/.test(u)) && !asked.some((u) => /^screens\/gifts\./.test(u)), JSON.stringify(asked));
    check('an unknown list is refused', (await api('lists?names=members,sacraments')).status === 400, '');

    // rule 4 (#26): a screen seen before draws at once from memory, then its lists are read again in the background and the
    // screen is drawn again when the server's answer differs (here a member added elsewhere, through the API). The Families
    // visit comes first and settles, because it refreshes the members list too (members is a core list); the member is added
    // after it, so the Members visit is the one that shows the old count and then the new one.
    await open('#/members');
    await page.waitForFunction(() => /\d+ members/.test((document.querySelector('main') || { innerText: '' }).innerText), { timeout: 15000 });
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 15000 });   // the saved view's filter has been applied
    const countOf = () => page.evaluate(() => { const m = /(\d+) members/.exec((document.querySelector('main') || { innerText: '' }).innerText); return m ? Number(m[1]) : -1; });
    const seeded = await countOf();   // the saved view's count (active members of the North and East districts)
    await page.evaluate(() => { window.StJohn.freshFor = 0; });
    // (moved by the hash, not by open(): open() reloads the page and so empties the memory this rule is about)
    await page.evaluate(() => { location.hash = '#/families'; });
    await page.waitForFunction(() => /households/i.test((document.querySelector('main') || { innerText: '' }).innerText), { timeout: 15000 });
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 15000 });   // the Families visit's own refresh has answered
    await api('members', 'POST', { first: 'Quiet', last: 'Refresh', sex: 'M', born: '1990-05-05', status: 'active', district: 'East', address: { line1: '2 Test Lane', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' } });
    const refreshed = [];
    const watch = (r) => { if (/api\/lists/.test(r.url())) refreshed.push(r.url().replace(BASE, '')); };
    page.on('request', watch);
    // the background read is held back, so "at once" is measured before it answers and not raced against it
    await page.setRequestInterception(true);
    const hold = (r) => { if (/api\/lists/.test(r.url())) setTimeout(() => r.continue().catch(() => {}), 1500); else r.continue().catch(() => {}); };
    page.on('request', hold);
    await page.evaluate(() => { location.hash = '#/members'; });
    const atOnce = await page.waitForFunction((n) => (document.querySelector('main') || { innerText: '' }).innerText.indexOf(n + ' members') >= 0, { timeout: 1200 }, String(seeded)).then(() => true, () => false);
    const shownNow = atOnce ? '' : await page.evaluate(() => ((document.querySelector('main') || { innerText: '' }).innerText || '').replace(/\s+/g, ' ').slice(0, 160));
    check('a screen seen before draws at once from memory, with the old count, before the refresh answers', atOnce, JSON.stringify({ seeded, refreshed, shownNow }));
    const now = await page.waitForFunction((n) => (document.querySelector('main') || { innerText: '' }).innerText.indexOf(n + ' members') >= 0, { timeout: 15000 }, String(seeded + 1)).then(() => true, () => false);
    page.off('request', hold);
    await page.setRequestInterception(false);
    page.off('request', watch);
    check('the same screen then refreshes quietly: one background read of its lists, the new member counted', now && refreshed.filter((u) => /members/.test(u)).length === 1, JSON.stringify({ now, refreshed }));
    // rule 4, the two edges (#26). (a) A refresh that answers while the person is typing leaves the screen alone, and the next visit
    // draws the new data. (b) Inside the freshness window a visit reads nothing; a save through the site ends that, and a read that
    // started before the save is not allowed to end it again. Each is looked at on Members, with a member added elsewhere (the API).
    const goto = (h) => page.evaluate((x) => { location.hash = x; }, h);
    const settle = async (h, re) => { await goto(h); await page.waitForFunction((s) => new RegExp(s, 'i').test((document.querySelector('main') || { innerText: '' }).innerText), { timeout: 15000 }, re); await page.waitForNetworkIdle({ idleTime: 600, timeout: 15000 }); };
    const waitCount = (n, ms) => page.waitForFunction((k) => (document.querySelector('main') || { innerText: '' }).innerText.indexOf(k + ' members') >= 0, { timeout: ms }, String(n)).then(() => true, () => false);
    const member = (first) => ({ first, last: 'Edge', sex: 'M', born: '1990-05-05', status: 'active', district: 'East', address: { line1: '3 Test Lane', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' } });
    const answered = () => page.waitForResponse((r) => /api\/lists/.test(r.url()), { timeout: 15000 });
    await page.evaluate(() => { window.StJohn.freshFor = 0; });
    await settle('#/members', '\\d+ members');
    const base = await countOf();
    await settle('#/families', 'households');
    await api('members', 'POST', member('Typing'));
    await page.setRequestInterception(true);
    page.on('request', hold);   // the same held-back route: the refresh answers 1.5 s after the visit
    await goto('#/members');
    const oldShown = await waitCount(base, 1200);
    const typing = await page.evaluate(() => { const i = document.querySelector('main input'); if (i) i.focus(); return !!i && document.activeElement === i; });
    await answered();
    await new Promise((r) => setTimeout(r, 600));   // the answer has been used (or ignored) by now
    const during = await page.evaluate(() => ({ focused: !!document.activeElement && document.activeElement.tagName === 'INPUT', text: (document.querySelector('main') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 160) }));
    check('while the person types, a refresh that brings a new member leaves the screen and the typing alone', oldShown && typing && during.focused && during.text.indexOf(base + ' members') >= 0, JSON.stringify({ base, oldShown, typing, during }));
    page.off('request', hold);
    await page.setRequestInterception(false);
    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await settle('#/families', 'households');
    await goto('#/members');
    check('the next visit draws the new member, though the lists have not changed again', await waitCount(base + 1, 15000), JSON.stringify({ base, shown: await countOf() }));
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 15000 });

    // (b) with a freshness window: the lists were read just now, so a visit inside the window reads nothing
    await page.evaluate(() => {
      window.StJohn.freshFor = 60000;
      const real = window.fetch; window.__lag = 0;   // a read can be made to arrive late; the server has answered by then, so it carries the data of its start
      window.fetch = (u, o) => { const p = real.call(window, u, o); return /api\/lists/.test(String(u)) && window.__lag ? p.then((r) => new Promise((go) => setTimeout(() => go(r), window.__lag))) : p; };
      window.__fetch = real;
    });
    refreshed.length = 0;
    page.on('request', watch);
    await api('members', 'POST', member('Elsewhere'));
    await settle('#/families', 'households');
    await settle('#/members', '\\d+ members');
    const inside = await countOf();
    check('inside the freshness window a screen seen before reads nothing again', refreshed.length === 0 && inside === base + 1, JSON.stringify({ refreshed, inside, base }));
    await page.evaluate(() => window.StJohn.require('site/data.js').save('members', 'POST', { first: 'Saved', last: 'Edge', sex: 'M', born: '1990-05-05', status: 'active', district: 'East', address: { line1: '3 Test Lane', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' } }));
    refreshed.length = 0;
    await settle('#/families', 'households');
    await goto('#/members');
    check('after a save through the site, the next visit reads the lists again, inside the window, and counts every member', await waitCount(base + 3, 15000) && refreshed.some((u) => /members/.test(u)), JSON.stringify({ refreshed, shown: await countOf(), base }));
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 15000 });

    // a read that started before a save carries data from before it: it is dropped, and does not make the lists look fresh again
    await page.evaluate(() => { window.StJohn.freshFor = 0; window.__lag = 1500; });
    const early = answered();
    await goto('#/families');
    await early;   // the server has answered with the data of this moment; the page gets it 1.5 s later
    await page.evaluate(() => window.StJohn.require('site/data.js').save('members', 'POST', { first: 'Late', last: 'Edge', sex: 'M', born: '1990-05-05', status: 'active', district: 'East', address: { line1: '3 Test Lane', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' } }));
    await new Promise((r) => setTimeout(r, 2200));   // the early answer has reached the page
    await page.evaluate(() => { window.StJohn.freshFor = 60000; window.__lag = 0; });
    refreshed.length = 0;
    await goto('#/members');
    check('a read that started before a save is ignored: the next visit still reads again and counts the new member', await waitCount(base + 4, 15000) && refreshed.some((u) => /members/.test(u)), JSON.stringify({ refreshed, shown: await countOf(), base }));
    page.off('request', watch);
    await page.evaluate(() => { window.fetch = window.__fetch; });
    await api('reset', 'POST');

    // the API: saves survive a reload; a reset brings the seed back
    const before = (await api('lists?names=members')).json.members.length;
    const made = await api('members', 'POST', { first: 'Test', last: 'Visitor', status: 'visitor', district: 'East', address: { line1: '1 Test Lane', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' } });
    const after = (await api('lists?names=members')).json.members;
    check('a new member is saved', made.status === 201 && after.length === before + 1 && after.some((m) => m.id === made.json.id && m.name === 'Test Visitor'), JSON.stringify(made));
    const edit = await api('members/' + made.json.id, 'PATCH', { phone: '(555) 010-9999' });
    check('a member is changed', edit.status === 200 && (await api('lists?names=members')).json.members.find((m) => m.id === made.json.id).phone === '(555) 010-9999', JSON.stringify(edit));
    check('a bad member is refused', (await api('members', 'POST', { first: '' })).status === 400, '');
    const sign = await api('slots/sl5/signups', 'PUT', { members: ['m3', 'm4'] });
    check('a sign-up is saved', sign.status === 200 && JSON.stringify((await api('lists?names=servingSlots')).json.servingSlots.find((s) => s.id === 'sl5').signed) === '["m3","m4"]', JSON.stringify(sign));
    const coming = (await api('lists?names=events')).json.events.find((e) => e.id === 'e10').rsvp;
    const rsvp = await api('events/e10/rsvps', 'POST', { answer: 'yes' });
    check('an RSVP is counted', rsvp.status === 201 && (await api('lists?names=events')).json.events.find((e) => e.id === 'e10').rsvp === coming + 1, JSON.stringify(rsvp));
    const reset = await api('reset', 'POST');
    check('a reset brings the seed back', reset.status === 200 && (await api('lists?names=members')).json.members.length === before, JSON.stringify(reset));
    const health = (await (await fetch(BASE + 'healthz')).json());
    check('the health check answers', health.ok && health.members === before && health.gifts === 10000, JSON.stringify(health));
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failed.length ? 'SMOKE_FAIL ' + failed.length : 'SMOKE_OK ' + (PAGES.length + 23) + ' checks');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
