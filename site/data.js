/* St. John the Beloved test site · the parish data (site/data.js), read from the site's database through its API
   (GET api/lists?names=…). Each screen reads only the lists it uses: screens.js asks for them in one request when the
   screen opens (build.js finds them from the names the screen imports here). A list once read stays in memory for the
   visit and shows at once when its screen opens again; refreshLists() then reads it again quietly in the background and
   says whether anything changed (screens.js refreshScreen draws the screen again from the new data).
   The lists keep the same names and shapes the screens use; changes are written back through save(). Every person,
   family, gift and address is made up (the seed, db/generate.js). No sacrament records are kept anywhere in the site;
   people who serve are "servants". */

export const CHURCH = {};
export const CLERGY = [];
export const MINISTRIES = [];
export const MEMBER_STATUS = { active: 'Active', visitor: 'Visitor', moved: 'Moved away', inactive: 'Inactive' };
export const FAMILIES = [];
export const MEMBERS = [];
export const SERVICES = [];
export const FEASTS = [];
export const EVENTS = [];
export const FUNDS = [];
export const GIFTS = [];
export const PLEDGES = [];
export const GIVING_BY_MONTH = [];
export const SERVING_SLOTS = [];
export const ANNOUNCEMENTS = [];
export const DOCUMENTS = [];
export const MEDIA = [];
export const BOOKSTORE = [];
export const ME = {};

// every list, by its name in the API (server.js LISTS); build.js reads this table
export const LISTS = {
  church: CHURCH, me: ME, clergy: CLERGY, ministries: MINISTRIES, families: FAMILIES, members: MEMBERS, services: SERVICES,
  feasts: FEASTS, events: EVENTS, funds: FUNDS, gifts: GIFTS, pledges: PLEDGES, givingByMonth: GIVING_BY_MONTH,
  servingSlots: SERVING_SLOTS, announcements: ANNOUNCEMENTS, documents: DOCUMENTS, media: MEDIA, bookstore: BOOKSTORE,
};

export const memberById = (id) => MEMBERS.find((m) => m.id === id);
export const familyById = (id) => FAMILIES.find((f) => f.id === id);
export const membersOf = (fid) => MEMBERS.filter((m) => m.family === fid);

const fill = (into, rows) => {
  if (Array.isArray(into)) { into.length = 0; (rows || []).forEach((r) => into.push(r)); } else Object.assign(into, rows);
};
const read = new Set(), reading = {}, refreshing = {}, seen = {}, at = {};
const text = (rows) => JSON.stringify(rows || null);
// a list read less than this long ago is not read again when its screen opens again (window.StJohn.freshFor, in ms)
const freshFor = () => (window.StJohn && window.StJohn.freshFor != null ? window.StJohn.freshFor : 5000);

// reads the lists not read yet, all in one request (relative to the page, so the site works under any address);
// a list already being read is not asked for again. A failed request can be made again.
export function loadLists(names) {
  const want = [...new Set(names)].filter((n) => !read.has(n) && !reading[n]);
  if (want.length) {
    const p = fetch('api/lists?names=' + want.join(','), { headers: { Accept: 'application/json' } })
      .then((res) => { if (!res.ok) throw new Error('The parish data could not load (' + res.status + ')'); return res.json(); })
      .then((d) => { want.forEach((n) => { fill(LISTS[n], d[n]); seen[n] = text(d[n]); at[n] = Date.now(); read.add(n); }); })
      .finally(() => { want.forEach((n) => { delete reading[n]; }); });
    want.forEach((n) => { reading[n] = p; });
  }
  return Promise.all(names.map((n) => reading[n])).then(() => {});
}

// reads again, in one request and without showing anything, the lists already read and not read just now; a list whose
// answer differs from the last one is filled in again. → true when any list changed. Memory only; a failure is left alone
// (the data on screen stays, the next visit asks again).
export function refreshLists(names) {
  const want = [...new Set(names)].filter((n) => read.has(n) && !refreshing[n] && Date.now() - (at[n] || 0) >= freshFor());
  if (!want.length) return Promise.resolve(false);
  want.forEach((n) => { refreshing[n] = true; });
  return fetch('api/lists?names=' + want.join(','), { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((d) => {
      let changed = false;
      want.forEach((n) => { at[n] = Date.now(); const t = text(d[n]); if (t !== seen[n]) { seen[n] = t; fill(LISTS[n], d[n]); changed = true; } });
      return changed;
    })
    .catch(() => false)
    .finally(() => { want.forEach((n) => { delete refreshing[n]; }); });
}

// writes a change to the database: save('members', 'POST', {...}) → the answer's JSON; throws with the server's words
export async function save(where, method, body) {
  const res = await fetch('api/' + where, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body || {}) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'The change could not be saved (' + res.status + ')');
  return out;
}
