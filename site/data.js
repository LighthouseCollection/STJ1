/* St. John the Beloved test site · the parish data (site/data.js), read from the site's database through its API
   (GET api/lists?names=…). Each screen reads only the lists it uses: screens.js asks for them in one request when the
   screen opens (build.js finds them from the names the screen imports here), and a list once read stays for the visit.
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
export const CHURCHCRM = {};   // how ChurchCRM is: { state, message }; the notice on the pilot screens reads it

// every list, by its name in the API (server.js LISTS); build.js reads this table
export const LISTS = {
  church: CHURCH, me: ME, clergy: CLERGY, ministries: MINISTRIES, families: FAMILIES, members: MEMBERS, services: SERVICES,
  feasts: FEASTS, events: EVENTS, funds: FUNDS, gifts: GIFTS, pledges: PLEDGES, givingByMonth: GIVING_BY_MONTH,
  churchcrm: CHURCHCRM, servingSlots: SERVING_SLOTS, announcements: ANNOUNCEMENTS, documents: DOCUMENTS, media: MEDIA, bookstore: BOOKSTORE,
};

export const memberById = (id) => MEMBERS.find((m) => m.id === id);
export const familyById = (id) => FAMILIES.find((f) => f.id === id);
export const membersOf = (fid) => MEMBERS.filter((m) => m.family === fid);

const fill = (into, rows) => {
  if (Array.isArray(into)) { into.length = 0; (rows || []).forEach((r) => into.push(r)); } else Object.assign(into, rows);
};
const read = new Set(), reading = {};

// reads the lists not read yet, all in one request (relative to the page, so the site works under any address);
// a list already being read is not asked for again. A failed request can be made again.
export function loadLists(names) {
  const want = [...new Set(names)].filter((n) => !read.has(n) && !reading[n]);
  if (want.length) {
    const p = fetch('api/lists?names=' + want.join(','), { headers: { Accept: 'application/json' } })
      .then((res) => { if (!res.ok) throw new Error('The parish data could not load (' + res.status + ')'); return res.json(); })
      .then((d) => { want.forEach((n) => { fill(LISTS[n], d[n]); read.add(n); }); })
      .finally(() => { want.forEach((n) => { delete reading[n]; }); });
    want.forEach((n) => { reading[n] = p; });
  }
  return Promise.all(names.map((n) => reading[n])).then(() => {});
}

// writes a change to the database: save('members', 'POST', {...}) → the answer's JSON; throws with the server's words
export async function save(where, method, body) {
  const res = await fetch('api/' + where, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body || {}) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || 'The change could not be saved (' + res.status + ')');
  return out;
}
