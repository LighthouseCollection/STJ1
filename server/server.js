/* St. John the Beloved test site · the server (server/server.js): Node 22, one library (the PostgreSQL driver).
   It serves the site's page (public/index.html with the Plenix address filled in), the built page script (public/app.js),
   the pictures (public/assets/), and a small JSON API over the parish database:
     GET  /api/bootstrap                 every list the pages draw (members, families, events, gifts, …), in one answer
     POST /api/members                   a new member (and a new family when the member starts one)
     PATCH /api/members/:id              a member's details
     PUT  /api/slots/:id/signups         the servants signed up for a serving slot: { members: [ids] }
     POST /api/events/:id/rsvps          an answer to an event: { answer: yes|maybe|no, guests }
     POST /api/reset                     back to the seed (needs the RESET_TOKEN header, or RESET_OPEN=1 for tests)
     GET  /healthz                       ok, with the counts
   Settings (environment):
     PORT (8790), DATABASE_URL (postgres://… or pglite:memory, see db/db.js),
     PLENIX_BASE: where Plenix is loaded from (default the CDN of PLENIX_VERSION:
       https://design-system.lighthouseway.org/cdn/<PLENIX_VERSION>/); the Plenix tests point it at their own build
     PLENIX_ENGINES: 1 or 0 decides whether the page loads plenix-engines.js (default: probed at startup)
     PLENIX_VERSION (from package.json "plenix"), RESET_TOKEN, RESET_OPEN, RESET_HOUR (3: the nightly reset, in TZ)
   On start it applies the migrations and, when the database is empty (or SEED_ON_START=1), seeds it. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { open } = require('../db/db.js');
const { migrate } = require('../db/migrate.js');
const { seed } = require('../db/seed.js');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = +process.env.PORT || 8790;
const VERSION = process.env.PLENIX_VERSION || require('../package.json').plenix;
const BASE = (process.env.PLENIX_BASE || 'https://design-system.lighthouseway.org/cdn/' + VERSION + '/').replace(/\/?$/, '/');
const RESET_TOKEN = process.env.RESET_TOKEN || '';
const RESET_OPEN = process.env.RESET_OPEN === '1';
const RESET_HOUR = process.env.RESET_HOUR === undefined ? 3 : +process.env.RESET_HOUR;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };

let db = null;

// ---- the answers
const send = (res, status, body, type) => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(text);
};
const readBody = (req) => new Promise((resolve, reject) => {
  let s = ''; req.on('data', (d) => { s += d; if (s.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
  req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(new Error('not JSON')); } });
});
const byNumber = (col) => 'length(' + col + '), ' + col;

// every list the pages draw, in the shapes the screens use (site/data.js)
async function bootstrap() {
  const q = async (sql) => (await db.query(sql)).rows;
  const [settings, clergy, ministries, families, members, links, services, feasts, events, funds, gifts, months, pledges, slots, signups, announcements, documents, media, books] = await Promise.all([
    q('SELECT key, value FROM settings'),
    q('SELECT id, name, role FROM clergy ORDER BY id'),
    q('SELECT id, name, icon, lead, meets, area, member_count, servant_count FROM ministries'),
    q('SELECT id, name, last_name, address, phone, since, district FROM families ORDER BY ' + byNumber('id')),
    q("SELECT id, family_id, first_name, last_name, sex, role, to_char(born, 'YYYY-MM-DD') AS born, email, phone, status, to_char(joined, 'YYYY-MM-DD') AS joined, servant, district, giving FROM members ORDER BY position"),
    q('SELECT member_id, ministry_id FROM member_ministries'),
    q('SELECT id, title, day, starts, ends, place FROM services ORDER BY id'),
    q("SELECT id, title, to_char(day, 'YYYY-MM-DD') AS day, kind FROM feasts ORDER BY day"),
    q("SELECT e.id, e.title, to_char(e.starts_at, 'YYYY-MM-DD\"T\"HH24:MI') AS start, to_char(e.ends_at, 'YYYY-MM-DD\"T\"HH24:MI') AS \"end\", e.place, e.ministry_id, e.color, e.rsvp_count + (SELECT count(*) FROM rsvps r WHERE r.event_id = e.id AND r.answer = 'yes')::int AS rsvp FROM events e ORDER BY " + byNumber('e.id')),
    q('SELECT id, name, goal, raised FROM funds'),
    q("SELECT g.id, g.member_id, m.first_name || ' ' || m.last_name AS name, g.fund_id, g.amount::float AS amount, g.method, to_char(g.given_on, 'YYYY-MM-DD') AS date FROM gifts g JOIN members m ON m.id = g.member_id ORDER BY g.position"),
    q('SELECT month, label, general, building, pantry FROM giving_months ORDER BY month'),
    q("SELECT p.id, p.member_id, m.first_name || ' ' || m.last_name AS name, p.fund_id, p.amount, p.paid, p.frequency, p.status FROM pledges p JOIN members m ON m.id = p.member_id ORDER BY p.position"),
    q("SELECT id, role, ministry_id, to_char(day, 'YYYY-MM-DD') AS day, starts, needed FROM serving_slots ORDER BY " + byNumber('id')),
    q('SELECT slot_id, member_id FROM signups ORDER BY position'),
    q("SELECT id, title, body, author, to_char(day, 'YYYY-MM-DD') AS day, status, audience FROM announcements ORDER BY " + byNumber('id')),
    q("SELECT id, name, folder, size, to_char(modified, 'YYYY-MM-DD\"T\"HH24:MI') AS modified, owner, version FROM documents ORDER BY " + byNumber('id')),
    q("SELECT id, title, kind, speaker, to_char(day, 'YYYY-MM-DD') AS day, duration FROM media ORDER BY " + byNumber('id')),
    q('SELECT id, name, price, category, stock FROM bookstore_items ORDER BY ' + byNumber('id')),
  ]);
  const setting = (k) => (settings.find((s) => s.key === k) || {}).value || {};
  const ministriesOf = {}; links.forEach((l) => { (ministriesOf[l.member_id] = ministriesOf[l.member_id] || []).push(l.ministry_id); });
  const membersOf = {}; members.forEach((m) => { (membersOf[m.family_id] = membersOf[m.family_id] || []).push(m.id); });
  const signed = {}; signups.forEach((s) => { (signed[s.slot_id] = signed[s.slot_id] || []).push(s.member_id); });
  const me = setting('me'), first = members.find((m) => m.id === me.id) || members[0] || {};
  return {
    church: setting('church'),
    clergy,
    ministries: ministries.map((m) => ({ id: m.id, name: m.name, icon: m.icon, lead: m.lead, meets: m.meets, group: m.area, members: m.member_count, servants: m.servant_count })),
    families: families.map((f) => ({ id: f.id, name: f.name, last: f.last_name, address: f.address, phone: f.phone, since: f.since, members: membersOf[f.id] || [], district: f.district })),
    members: members.map((m) => ({ id: m.id, family: m.family_id, name: m.first_name + ' ' + m.last_name, first: m.first_name, last: m.last_name, sex: m.sex, role: m.role, born: m.born, email: m.email,
      phone: m.phone, status: m.status, joined: m.joined, ministries: ministriesOf[m.id] || [], servant: m.servant, district: m.district, giving: m.giving })),
    services: services.map((s) => ({ id: s.id, title: s.title, day: s.day, time: s.starts, end: s.ends, place: s.place })),
    feasts: feasts.map((f) => ({ id: f.id, title: f.title, date: f.day, kind: f.kind })),
    events: events.map((e) => ({ id: e.id, title: e.title, start: e.start, end: e.end, place: e.place, ministry: e.ministry_id, color: e.color, rsvp: e.rsvp })),
    funds,
    gifts: gifts.map((g) => ({ id: g.id, member: g.member_id, name: g.name, fund: g.fund_id, amount: g.amount, method: g.method, date: g.date })),
    givingByMonth: months,
    pledges: pledges.map((p) => ({ id: p.id, member: p.member_id, name: p.name, fund: p.fund_id, amount: p.amount, paid: p.paid, frequency: p.frequency, status: p.status })),
    servingSlots: slots.map((s) => ({ id: s.id, role: s.role, ministry: s.ministry_id, date: s.day, time: s.starts, needed: s.needed, signed: signed[s.id] || [] })),
    announcements: announcements.map((a) => ({ id: a.id, title: a.title, body: a.body, author: a.author, date: a.day, status: a.status, audience: a.audience })),
    documents, media: media.map((m) => ({ id: m.id, title: m.title, kind: m.kind, speaker: m.speaker, date: m.day, duration: m.duration })), bookstore: books,
    me: { id: first.id, name: (first.first_name || '') + ' ' + (first.last_name || ''), email: me.email, role: me.role },
  };
}

// ---- the writes
const text = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const STATUS = ['active', 'visitor', 'moved', 'inactive'];
async function createMember(b) {
  const first = text(b.first, 80), last = text(b.last, 80);
  if (!first || !last) return [400, { error: 'A first and last name are needed' }];
  if (b.status && STATUS.indexOf(b.status) < 0) return [400, { error: 'Unknown status' }];
  return db.tx(async (q) => {
    const n = (await q("SELECT coalesce(max(substring(id from 2)::int), 0) + 1 AS n FROM members")).rows[0].n;
    let family = text(b.family, 20);
    if (!family || !(await q('SELECT 1 FROM families WHERE id = $1', [family])).rows.length) {
      const f = (await q("SELECT coalesce(max(substring(id from 2)::int), 0) + 1 AS n FROM families")).rows[0].n;
      family = 'f' + f;
      const a = b.address || {};
      await q('INSERT INTO families (id, name, last_name, address, phone, since, district) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [family, 'The ' + last + ' family', last, JSON.stringify({ line1: text(a.line1), city: text(a.city), region: text(a.region, 20), postal: text(a.postal, 20), country: text(a.country, 2) || 'US' }), text(b.phone, 40), new Date().getFullYear(), text(b.district, 20) || 'North']);
    }
    const id = 'm' + n;
    await q('INSERT INTO members (id, family_id, first_name, last_name, sex, role, born, email, phone, status, joined, servant, district, giving) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12, 0)',
      [id, family, first, last, text(b.sex, 1), text(b.role, 60) || 'Head of household', b.born || null, text(b.email, 120), text(b.phone, 40), b.status || 'active', b.joined || new Date().toISOString().slice(0, 10), text(b.district, 20) || 'North']);
    for (const x of (Array.isArray(b.ministries) ? b.ministries : []).slice(0, 20)) await q('INSERT INTO member_ministries (member_id, ministry_id) SELECT $1, id FROM ministries WHERE id = $2 ON CONFLICT DO NOTHING', [id, text(x, 40)]);
    return [201, { id, family }];
  });
}
async function updateMember(id, b) {
  const sets = [], params = [id];
  const field = (col, v) => { params.push(v); sets.push(col + ' = $' + params.length); };
  if (b.first !== undefined) field('first_name', text(b.first, 80));
  if (b.last !== undefined) field('last_name', text(b.last, 80));
  if (b.email !== undefined) field('email', text(b.email, 120));
  if (b.phone !== undefined) field('phone', text(b.phone, 40));
  if (b.role !== undefined) field('role', text(b.role, 60));
  if (b.district !== undefined) field('district', text(b.district, 20));
  if (b.status !== undefined) { if (STATUS.indexOf(b.status) < 0) return [400, { error: 'Unknown status' }]; field('status', b.status); }
  if (!sets.length) return [400, { error: 'Nothing to change' }];
  const r = await db.query('UPDATE members SET ' + sets.join(', ') + ' WHERE id = $1', params);
  return (r.rowCount || r.affectedRows) ? [200, { id }] : [404, { error: 'No such member' }];
}
async function setSignups(slot, b) {
  const ids = (Array.isArray(b.members) ? b.members : []).map((x) => text(x, 20)).slice(0, 50);
  return db.tx(async (q) => {
    if (!(await q('SELECT 1 FROM serving_slots WHERE id = $1', [slot])).rows.length) return [404, { error: 'No such slot' }];
    await q('DELETE FROM signups WHERE slot_id = $1', [slot]);
    for (const m of ids) await q('INSERT INTO signups (slot_id, member_id) SELECT $1, id FROM members WHERE id = $2 ON CONFLICT DO NOTHING', [slot, m]);
    return [200, { slot, members: ids }];
  });
}
async function addRsvp(event, b) {
  if (['yes', 'maybe', 'no'].indexOf(b.answer) < 0) return [400, { error: 'Answer yes, maybe or no' }];
  if (!(await db.query('SELECT 1 FROM events WHERE id = $1', [event])).rows.length) return [404, { error: 'No such event' }];
  await db.query('INSERT INTO rsvps (event_id, answer, guests) VALUES ($1, $2, $3)', [event, b.answer, Math.max(1, Math.min(20, +b.guests || 1))]);
  return [201, { event }];
}

// ---- the page: index.html with the Plenix address filled in
// {{ENGINES}} is plenix-engines.js (rich text, charts and PDF load through it) when this Plenix release has the file, else nothing:
// releases before the engines script have no such file. PLENIX_ENGINES=1 or 0 decides outright (the Plenix tests set it, because
// their PLENIX_BASE is a path this server's own harness serves); otherwise it is checked once at startup (probeEngines).
let ENGINES = '';
async function probeEngines() {
  const url = BASE + 'plenix-engines.js', tag = '<script src="' + url + '"></script>';
  if (process.env.PLENIX_ENGINES === '1') { ENGINES = tag; return; }
  if (process.env.PLENIX_ENGINES === '0') { ENGINES = ''; return; }
  try {
    if (/^https?:/i.test(BASE)) {
      // a redirect (a sign-in page) or an HTML answer is not the script: only a 200 that is not text/html counts
      // a web server may refuse HEAD (403, 405, 501): then the same question is asked with GET, and the body is dropped unread
      const ask = async (method) => { const r = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(5000) }); if (method === 'GET' && r.body) r.body.cancel().catch(() => {}); return r; };
      let r = await ask('HEAD');
      if ([403, 405, 501].includes(r.status)) r = await ask('GET');
      ENGINES = r.status === 200 && !/text\/html/i.test(r.headers.get('content-type') || '') ? tag : '';
    } else ENGINES = fs.existsSync(path.join(BASE.replace(/^file:\/\//, ''), 'plenix-engines.js')) ? tag : '';
  } catch (e) { ENGINES = ''; }
}
let INDEX = null;
const page = () => (INDEX = INDEX || fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8').split('{{PLENIX}}').join(BASE).split('{{VERSION}}').join(VERSION).split('{{ENGINES}}').join(ENGINES));

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (p === '/healthz') { const n = (await db.query('SELECT (SELECT count(*) FROM members)::int AS members, (SELECT count(*) FROM gifts)::int AS gifts')).rows[0]; return send(res, 200, { ok: true, db: db.kind, plenix: BASE, ...n }); }
    if (p === '/api/bootstrap' && req.method === 'GET') return send(res, 200, await bootstrap());
    if (p === '/api/members' && req.method === 'POST') { const [s, b] = await createMember(await readBody(req)); return send(res, s, b); }
    let m;
    if ((m = /^\/api\/members\/(m\d+)$/.exec(p)) && req.method === 'PATCH') { const [s, b] = await updateMember(m[1], await readBody(req)); return send(res, s, b); }
    if ((m = /^\/api\/slots\/(sl\d+)\/signups$/.exec(p)) && req.method === 'PUT') { const [s, b] = await setSignups(m[1], await readBody(req)); return send(res, s, b); }
    if ((m = /^\/api\/events\/(e\d+)\/rsvps$/.exec(p)) && req.method === 'POST') { const [s, b] = await addRsvp(m[1], await readBody(req)); return send(res, s, b); }
    if (p === '/api/reset' && req.method === 'POST') {
      if (!RESET_OPEN && !(RESET_TOKEN && req.headers['x-reset-token'] === RESET_TOKEN)) return send(res, 403, { error: 'Reset needs the reset token' });
      return send(res, 200, { reset: await seed(db) });
    }
    if (/^\/api\//.test(p)) return send(res, 404, { error: 'No such address' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
    if (p === '/' || p === '/index.html') return send(res, 200, page(), TYPES['.html']);
    // public/: app.js and assets/ (no way above the folder)
    const file = path.join(PUBLIC, path.normalize(decodeURIComponent(p)).replace(/^([\\/]\.\.)+/, ''));
    if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(p, e.message);
    send(res, 500, { error: 'Something went wrong' });
  }
}

// the nightly reset: at RESET_HOUR (local time, TZ), back to the seed
function nightly() {
  if (RESET_HOUR < 0) return;
  let last = '';
  setInterval(async () => {
    const now = new Date(), day = now.toDateString();
    if (now.getHours() === RESET_HOUR && last !== day) { last = day; try { await seed(db); console.log(now.toISOString() + ' nightly reset to the seed'); } catch (e) { console.error('nightly reset failed: ' + e.message); } }
  }, 60 * 1000).unref();
}

async function start() {
  db = await open();
  const applied = await migrate(db);
  if (applied.length) console.log('Applied migrations ' + applied.join(', '));
  const empty = !(await db.query('SELECT 1 FROM members LIMIT 1')).rows.length;
  if (empty || process.env.SEED_ON_START === '1') { const n = await seed(db); console.log('Seeded ' + n.members + ' members, ' + n.gifts + ' gifts'); }
  nightly();
  await probeEngines();
  const server = http.createServer(handle);
  await new Promise((r) => server.listen(PORT, process.env.HOST || '0.0.0.0', r));
  console.log('St. John the Beloved test site on port ' + PORT + ' · Plenix from ' + BASE + (ENGINES ? ' (with plenix-engines.js)' : '') + ' · ' + db.kind);
  return server;
}

module.exports = { start };
if (require.main === module) start().catch((e) => { console.error(e); process.exit(1); });
