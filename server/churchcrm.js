/* St. John the Beloved test site · the ChurchCRM pass-through (server/churchcrm.js).
   The browser asks our server; our server asks ChurchCRM with the key and hands back JSON. The key (CHURCHCRM_API_KEY) and
   ChurchCRM's address (CHURCHCRM_URL) are read from the environment, are never written to a file, a log or an answer.
     GET /api/churchcrm/person/:id           one person        (ChurchCRM GET /api/person/{id})
     GET /api/churchcrm/family/:id           one household     (ChurchCRM GET /api/family/{id})
     GET /api/churchcrm/search/person?q=…    people by name    (ChurchCRM GET /api/persons/search/{query})
     the list "churchcrm" of GET /api/lists   how ChurchCRM is: { state: ok | not-configured | bad-key | unreachable | failed, message }
     GET /api/churchcrm/search/family?q=…    households        (ChurchCRM GET /api/families/search/{query})
   Without a key nothing is called: answers say "not-configured" and the screens keep the sample data (site/data.js).
   createChurchCrm(env, { log, fetch }).handle(method, url) → { status, body }, or null when the address is not ours. */
const NOTICE = 'ChurchCRM is not connected, so this screen shows sample data.';
const message = { 'not-configured': NOTICE, 'bad-key': 'ChurchCRM did not accept the site’s key. Ask the owner to check the key setting.', unreachable: 'ChurchCRM did not answer. The site shows sample data until it does.', failed: 'ChurchCRM could not answer that request.' };
const reply = (status, error, extra) => ({ status, body: { error, message: message[error], ...extra } });

function createChurchCrm(env, { log = console.error, fetch: ask = fetch } = {}) {
  const base = String(env.CHURCHCRM_URL || 'http://localhost:8081').replace(/\/+$/, '');
  const key = String(env.CHURCHCRM_API_KEY || '');
  const configured = key !== '';

  // one call to ChurchCRM → { ok, status, json } or { error }; the log names the call and the outcome, never the key
  async function call(path, wait = 8000) {
    let r;
    try { r = await ask(base + path, { headers: { 'x-api-key': key, Accept: 'application/json' }, signal: AbortSignal.timeout(wait) }); }
    catch (e) { log('ChurchCRM GET ' + path + ' failed: no answer (' + (e.cause && e.cause.code || e.name) + ')'); return { error: 'unreachable' }; }
    if (r.status === 401 || r.status === 403) { log('ChurchCRM GET ' + path + ' refused the key: ' + r.status); return { error: 'bad-key', status: r.status }; }
    if (!r.ok) { log('ChurchCRM GET ' + path + ' failed: ' + r.status); return { error: 'failed', status: r.status }; }
    try { return { ok: true, status: r.status, json: await r.json() }; }
    catch (e) { log('ChurchCRM GET ' + path + ' failed: the answer was not JSON'); return { error: 'failed', status: r.status }; }
  }

  // for /healthz: did ChurchCRM answer (any answer but a refusal or silence counts: the probe asks for something small)
  async function status() {
    if (!configured) return { configured: false, ok: false };
    const r = await call('/api/persons/latest');
    return { configured: true, ok: !!r.ok || (r.error === 'failed' && r.status < 500) };
  }

  // for the notice on the pilot screens (the list "churchcrm" of GET /api/lists): one state (ok, not-configured, bad-key, unreachable,
  // failed) and, when it is not ok, the words to show. The probe waits 2 seconds, and the answer is kept 30 seconds, so a
  // ChurchCRM that is down never slows a screen more than once in that time.
  let kept = null;
  async function state(now = Date.now()) {
    if (!configured) return { state: 'not-configured', message: message['not-configured'] };
    if (kept && now - kept.at < 30000) return kept.value;
    const r = await call('/api/persons/latest', 2000);
    const e = r.ok || (r.error === 'failed' && r.status < 500) ? 'ok' : r.error;
    kept = { at: now, value: e === 'ok' ? { state: 'ok' } : { state: e, message: message[e] } };
    return kept.value;
  }

  async function handle(method, url) {
    const p = url.pathname;
    if (p.indexOf('/api/churchcrm/') !== 0) return null;
    if (method !== 'GET') return { status: 405, body: { error: 'method', message: 'Read only.' } };
    let m, path;
    if ((m = /^\/api\/churchcrm\/(person|family)\/(\d{1,9})$/.exec(p))) path = '/api/' + m[1] + '/' + m[2];
    else if ((m = /^\/api\/churchcrm\/search\/(person|family)$/.exec(p))) {
      const term = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (!term) return { status: 400, body: { error: 'query', message: 'Give a name to look for: ?q=…' } };
      path = '/api/' + (m[1] === 'person' ? 'persons' : 'families') + '/search/' + encodeURIComponent(term);
    } else return { status: 404, body: { error: 'No such address' } };
    if (!configured) return reply(503, 'not-configured');
    const r = await call(path);
    if (r.ok) return { status: 200, body: r.json };
    return reply(r.error === 'failed' && r.status === 404 ? 404 : 502, r.error === 'failed' && r.status === 404 ? 'failed' : r.error);
  }
  return { configured, status, state, handle };
}
module.exports = { createChurchCrm };
