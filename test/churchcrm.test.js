/* The ChurchCRM pass-through (server/churchcrm.js), checked against a fake ChurchCRM: no Chrome, no database, no real key.
     node --test test/churchcrm.test.js */
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createChurchCrm } = require('../server/churchcrm.js');

const KEY = 'test-key-not-a-secret';
const fake = () => new Promise((resolve) => {
  const seen = [];
  const s = http.createServer((req, res) => {
    seen.push({ url: req.url, key: req.headers['x-api-key'] });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers['x-api-key'] !== KEY) { res.statusCode = 401; return res.end('{"error":"nope"}'); }
    if (req.url === '/api/person/1') return res.end('{"id":1,"firstName":"Mina"}');
    if (req.url === '/api/family/2') return res.end('{"id":2,"name":"Girgis"}');
    if (req.url === '/api/persons/search/Mina%20G') return res.end('[{"id":1}]');
    res.statusCode = 404; res.end('{"error":"missing"}');
  }).listen(0, '127.0.0.1', () => resolve({ s, seen, url: 'http://127.0.0.1:' + s.address().port }));
});
const run = async (cc, path) => { const out = {}; const r = await cc.handle('GET', new URL(path, 'http://x')); return r; };

test('a person and a household come back as JSON, and the key goes only to ChurchCRM', async () => {
  const f = await fake(); const cc = createChurchCrm({ CHURCHCRM_URL: f.url, CHURCHCRM_API_KEY: KEY }, { log() {} });
  const p = await run(cc, '/api/churchcrm/person/1'); assert.deepStrictEqual([p.status, p.body.firstName], [200, 'Mina']);
  const h = await run(cc, '/api/churchcrm/family/2'); assert.deepStrictEqual([h.status, h.body.name], [200, 'Girgis']);
  const s = await run(cc, '/api/churchcrm/search/person?q=Mina%20G'); assert.strictEqual(s.status, 200);
  assert.ok(f.seen.every((x) => x.key === KEY));
  const out = JSON.stringify([p, h, s]);
  assert.ok(!out.includes(KEY) && !out.includes(f.url) && !/x-api-key/i.test(out), 'nothing of the key or the address in an answer');
  f.s.close();
});
test('with no key the site is not configured: a notice, no error, no call', async () => {
  const cc = createChurchCrm({}, { log() {} });
  assert.strictEqual(cc.configured, false);
  const r = await run(cc, '/api/churchcrm/person/1');
  assert.deepStrictEqual([r.status, r.body.error], [503, 'not-configured']); assert.match(r.body.message, /sample data/i);
  assert.deepStrictEqual(await cc.status(), { configured: false, ok: false });
});
test('a wrong key gives one clear message, and the log names the call, not the key', async () => {
  const f = await fake(); const logs = [];
  const cc = createChurchCrm({ CHURCHCRM_URL: f.url, CHURCHCRM_API_KEY: 'wrong' }, { log: (m) => logs.push(m) });
  const r = await run(cc, '/api/churchcrm/person/1');
  assert.deepStrictEqual([r.status, r.body.error], [502, 'bad-key']); assert.ok(!/stack|at /.test(r.body.message));
  assert.ok(logs.length === 1 && /GET \/api\/person\/1/.test(logs[0]) && /401/.test(logs[0]) && !logs[0].includes('wrong'), logs.join('|'));
  assert.strictEqual((await cc.status()).ok, false);
  f.s.close();
});
test('ChurchCRM down: one clear message', async () => {
  const cc = createChurchCrm({ CHURCHCRM_URL: 'http://127.0.0.1:1', CHURCHCRM_API_KEY: KEY }, { log() {} });
  const r = await run(cc, '/api/churchcrm/person/1'); assert.deepStrictEqual([r.status, r.body.error], [502, 'unreachable']);
  assert.deepStrictEqual(await cc.status(), { configured: true, ok: false });
});
test('only numbers are ids; other addresses and methods are refused', async () => {
  const cc = createChurchCrm({ CHURCHCRM_URL: 'http://127.0.0.1:1', CHURCHCRM_API_KEY: KEY }, { log() {} });
  assert.strictEqual((await run(cc, '/api/churchcrm/person/1%2F..%2Fadmin')).status, 404);
  assert.strictEqual((await run(cc, '/api/churchcrm/admin')).status, 404);
  assert.strictEqual((await cc.handle('POST', new URL('/api/churchcrm/person/1', 'http://x'))).status, 405);
  assert.strictEqual(await cc.handle('GET', new URL('/api/lists', 'http://x')), null, 'not ours: the server goes on');
});
test('status says whether ChurchCRM answered', async () => {
  const f = await fake(); const cc = createChurchCrm({ CHURCHCRM_URL: f.url, CHURCHCRM_API_KEY: KEY }, { log() {} });
  assert.deepStrictEqual(await cc.status(), { configured: true, ok: true }); f.s.close();
});
