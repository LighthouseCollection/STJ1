/* St. John the Beloved test site · the made-up data (db/generate.js), drawn from a fixed seed so every reset makes the same
   parish: 120 families, about 400 members, 10,000 gifts. Every person, family, address and gift is made up. There are no
   sacrament records, and people who serve are servants. db/seed.js writes this into PostgreSQL. */

// a small fixed random sequence (mulberry32): the same numbers on every load
function seq(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = seq(1904);
const pick = (list) => list[Math.floor(rnd() * list.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const iso = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);

const CHURCH = {
  name: 'St. John the Beloved Coptic Orthodox Church',
  short: 'St. John the Beloved',
  brand: 'ST. JOHN COPTIC ORTHODOX CHURCH',   // the name the member chose for the header and the sign-in screen (#8), as written
  address: { line1: '1200 Cedar Grove Road', city: 'Maple Hollow', region: 'NJ', postal: '07999', country: 'US' },
  phone: '(555) 010-0144',
  email: 'office@stjohn-beloved.example',
  founded: 1994,
  timeZone: 'America/New_York',
};

const CLERGY = [
  { id: 'c1', name: 'Fr. Daniel Boulos', role: 'Parish priest' },
  { id: 'c2', name: 'Fr. Antony Wahba', role: 'Associate priest' },
];

const MALE = ['Mina', 'Kirollos', 'Bishoy', 'Abanoub', 'Youssef', 'Mark', 'Peter', 'George', 'Michael', 'Andrew', 'Philopater', 'Shenouda', 'Samuel', 'Daniel', 'Antony', 'Fady', 'Hany', 'Rafik', 'Sherif', 'Ramy', 'Joseph', 'David', 'John', 'Thomas'];
const FEMALE = ['Marina', 'Mariam', 'Demiana', 'Verena', 'Irini', 'Mary', 'Christina', 'Sarah', 'Nevine', 'Monica', 'Martha', 'Rebecca', 'Sophia', 'Hanna', 'Nardine', 'Mira', 'Catherine', 'Helen', 'Elizabeth', 'Esther', 'Ruth', 'Rita'];
const FAMILY = ['Girgis', 'Habib', 'Mikhail', 'Fahmy', 'Hanna', 'Ibrahim', 'Boutros', 'Tadros', 'Wassef', 'Iskander', 'Naguib', 'Saad', 'Aziz', 'Gerges', 'Mansour', 'Youssef', 'Bishara', 'Khalil', 'Samaan', 'Rizk', 'Attia', 'Farag', 'Ghali', 'Labib', 'Morcos', 'Nashed', 'Raouf', 'Selim', 'Wahba', 'Zaki'];
const STREETS = ['Cedar Grove Road', 'Willow Lane', 'Orchard Street', 'Birch Court', 'Lakeview Drive', 'Mill Pond Road', 'Hillcrest Avenue', 'Elm Terrace', 'Chestnut Way', 'Juniper Place'];
const TOWNS = [['Maple Hollow', '07999'], ['Brookfield Park', '07998'], ['Riverbend', '07997'], ['Oak Ridge Falls', '07996']];

const MINISTRIES = [
  { id: 'sunday-school', name: 'Sunday School', icon: 'text-card', lead: 'Marina Girgis', meets: 'Sundays · 11:30 AM', group: 'Education', members: 64, servants: 18 },
  { id: 'youth', name: 'Youth Meeting', icon: 'settings-users', lead: 'Mina Habib', meets: 'Fridays · 7:00 PM', group: 'Education', members: 52, servants: 7 },
  { id: 'deacons', name: 'Deacons’ School', icon: 'audio', lead: 'Kirollos Tadros', meets: 'Saturdays · 4:00 PM', group: 'Worship', members: 31, servants: 4 },
  { id: 'choir', name: 'Hymns and Choir', icon: 'mic', lead: 'Demiana Wassef', meets: 'Thursdays · 7:30 PM', group: 'Worship', members: 26, servants: 3 },
  { id: 'bible-study', name: 'Bible Study', icon: 'document', lead: 'Fr. Antony Wahba', meets: 'Wednesdays · 7:00 PM', group: 'Education', members: 40, servants: 2 },
  { id: 'agape', name: 'Agape Kitchen', icon: 'clock', lead: 'Nevine Mikhail', meets: 'After the Divine Liturgy', group: 'Fellowship', members: 22, servants: 22 },
  { id: 'visitation', name: 'Visitation', icon: 'home', lead: 'Hany Fahmy', meets: 'By appointment', group: 'Care', members: 14, servants: 14 },
  { id: 'food-pantry', name: 'Food Pantry', icon: 'briefcase', lead: 'Sarah Ibrahim', meets: 'Saturdays · 9:00 AM', group: 'Outreach', members: 30, servants: 30 },
  { id: 'media', name: 'Media and Sound', icon: 'settings-camera', lead: 'Fady Iskander', meets: 'Every service', group: 'Worship', members: 9, servants: 9 },
  { id: 'ushers', name: 'Ushers', icon: 'person', lead: 'George Naguib', meets: 'Every service', group: 'Worship', members: 16, servants: 16 },
  { id: 'library', name: 'Library and Bookstore', icon: 'bookmark', lead: 'Monica Saad', meets: 'Sundays · after the Liturgy', group: 'Fellowship', members: 6, servants: 6 },
  { id: 'servants-prep', name: 'Servants’ Preparation', icon: 'checklist', lead: 'Fr. Daniel Boulos', meets: 'Tuesdays · 8:00 PM', group: 'Education', members: 21, servants: 2 },
];

const MEMBER_STATUS = { active: 'Active', visitor: 'Visitor', moved: 'Moved away', inactive: 'Inactive' };

// families and their members: 120 households
const FAMILIES = [];
const MEMBERS = [];
for (let i = 0; i < 120; i++) {
  const last = FAMILY[i % FAMILY.length];
  const [town, postal] = pick(TOWNS);
  const fam = { id: 'f' + (i + 1), name: 'The ' + last + ' family', last, address: { line1: int(10, 980) + ' ' + pick(STREETS), city: town, region: 'NJ', postal, country: 'US' },
    phone: '(555) 01' + pad(int(0, 9), 1) + '-' + pad(int(1000, 9999), 4), since: 1994 + int(0, 31), members: [], district: pick(['North', 'South', 'East', 'West']) };
  const head = { first: pick(MALE), sex: 'm', role: 'Head of household', born: 1958 + int(0, 30) };
  const spouse = rnd() < 0.85 ? { first: pick(FEMALE), sex: 'f', role: 'Spouse', born: head.born + int(-3, 4) } : null;
  const kids = Array.from({ length: int(0, 4) }, () => { const f = rnd() < 0.5; return { first: pick(f ? FEMALE : MALE), sex: f ? 'f' : 'm', role: 'Child', born: Math.max(head.born + 24, 1990) + int(0, 20) }; });
  [head, spouse].concat(kids).filter(Boolean).forEach((p) => {
    const id = 'm' + (MEMBERS.length + 1);
    const status = rnd() < 0.82 ? 'active' : pick(['visitor', 'moved', 'inactive']);
    const m = { id, family: fam.id, name: p.first + ' ' + last, first: p.first, last, sex: p.sex, role: p.role, born: iso(Math.min(p.born, 2024), int(1, 12), int(1, 28)),
      email: (p.first + '.' + last + int(1, 99)).toLowerCase() + '@example.com', phone: '(555) 01' + int(0, 9) + '-' + int(1000, 9999),
      status, joined: iso(Math.max(fam.since, 1994), int(1, 12), int(1, 28)), ministries: MINISTRIES.filter(() => rnd() < 0.12).map((x) => x.id),
      servant: rnd() < 0.3, district: fam.district, giving: int(0, 1) ? int(200, 6000) : 0 };
    MEMBERS.push(m); fam.members.push(id);
  });
  FAMILIES.push(fam);
}

// services and the liturgical calendar (2026–2027); feasts are Coptic feasts, dates by the Gregorian calendar
const SERVICES = [
  { id: 's1', title: 'Divine Liturgy', day: 'Sunday', time: '08:00', end: '11:00', place: 'Church' },
  { id: 's2', title: 'Vespers and Midnight Praises', day: 'Saturday', time: '18:00', end: '20:30', place: 'Church' },
  { id: 's3', title: 'Divine Liturgy', day: 'Wednesday', time: '07:00', end: '09:00', place: 'Church' },
  { id: 's4', title: 'Bible Study', day: 'Wednesday', time: '19:00', end: '20:30', place: 'Fellowship hall' },
  { id: 's5', title: 'Youth Meeting', day: 'Friday', time: '19:00', end: '21:00', place: 'Youth room' },
];
const FEASTS = [
  { id: 'nayrouz', title: 'Feast of the Nayrouz (Coptic New Year)', date: '2026-09-11', kind: 'feast' },
  { id: 'cross', title: 'Feast of the Cross', date: '2026-09-27', kind: 'feast' },
  { id: 'nativity-fast', title: 'The Nativity Fast begins', date: '2026-11-25', kind: 'fast' },
  { id: 'kiahk', title: 'The month of Kiahk begins', date: '2026-12-10', kind: 'season' },
  { id: 'nativity', title: 'Feast of the Nativity', date: '2027-01-07', kind: 'feast' },
  { id: 'patron', title: 'Feast of St. John the Beloved', date: '2027-01-12', kind: 'patron' },
  { id: 'theophany', title: 'Feast of the Theophany', date: '2027-01-19', kind: 'feast' },
];
const EVENTS = [
  { id: 'e1', title: 'Divine Liturgy', start: '2026-10-25T08:00', end: '2026-10-25T11:00', place: 'Church', ministry: null, color: 'blue', rsvp: 0 },
  { id: 'e2', title: 'Agape meal', start: '2026-10-25T11:15', end: '2026-10-25T12:30', place: 'Fellowship hall', ministry: 'agape', color: 'orange', rsvp: 118 },
  { id: 'e3', title: 'Sunday School', start: '2026-10-25T11:30', end: '2026-10-25T12:30', place: 'Classrooms', ministry: 'sunday-school', color: 'green', rsvp: 0 },
  { id: 'e4', title: 'Servants’ Preparation', start: '2026-10-27T20:00', end: '2026-10-27T21:30', place: 'Library', ministry: 'servants-prep', color: 'purple', rsvp: 19 },
  { id: 'e5', title: 'Bible Study: the Gospel of St. John', start: '2026-10-28T19:00', end: '2026-10-28T20:30', place: 'Fellowship hall', ministry: 'bible-study', color: 'teal', rsvp: 34 },
  { id: 'e6', title: 'Youth Meeting', start: '2026-10-30T19:00', end: '2026-10-30T21:00', place: 'Youth room', ministry: 'youth', color: 'green', rsvp: 41 },
  { id: 'e7', title: 'Food Pantry', start: '2026-10-31T09:00', end: '2026-10-31T12:00', place: 'Parish hall', ministry: 'food-pantry', color: 'red', rsvp: 26 },
  { id: 'e8', title: 'Vespers and Midnight Praises', start: '2026-10-31T18:00', end: '2026-10-31T20:30', place: 'Church', ministry: null, color: 'blue', rsvp: 0 },
  { id: 'e9', title: 'Parish retreat', start: '2026-11-13T17:00', end: '2026-11-15T13:00', place: 'Camp St. Mark', ministry: 'youth', color: 'purple', rsvp: 72 },
  { id: 'e10', title: 'Feast of St. John the Beloved: parish festival', start: '2027-01-12T17:00', end: '2027-01-12T21:00', place: 'Parish hall', ministry: null, color: 'orange', rsvp: 240 },
];

// giving: funds, pledges, and 10,000 gifts (the virtual list of the giving history)
const FUNDS = [
  { id: 'general', name: 'General fund', goal: 420000, raised: 311250 },
  { id: 'building', name: 'Fellowship hall building fund', goal: 1200000, raised: 684300 },
  { id: 'pantry', name: 'Food pantry', goal: 36000, raised: 29410 },
  { id: 'youth-trip', name: 'Youth trip', goal: 18000, raised: 9850 },
  { id: 'feast', name: 'Feast agape', goal: 12000, raised: 12640 },
];
const METHODS = ['Card', 'Check', 'Cash', 'Bank transfer', 'Online'];
const GIFTS = Array.from({ length: 10000 }, (_, i) => {
  const m = MEMBERS[Math.floor(rnd() * MEMBERS.length)];
  const month = 1 + (i % 10), day = 1 + Math.floor(rnd() * 28);
  return { id: 'G-' + pad(10000 + i, 5), member: m.id, name: m.name, fund: pick(FUNDS).id, amount: Math.round((20 + rnd() * 480) * 100) / 100, method: pick(METHODS), date: iso(2026, month, day) };
});
const PLEDGES = MEMBERS.filter((m) => m.giving > 3000).slice(0, 40).map((m, i) => ({ id: 'P-' + pad(200 + i, 3), member: m.id, name: m.name, fund: i % 3 ? 'building' : 'general',
  amount: Math.round(m.giving / 100) * 100, paid: Math.round(m.giving * (0.2 + rnd() * 0.8) / 100) * 100, frequency: pick(['Monthly', 'Quarterly', 'Yearly']), status: pick(['On track', 'On track', 'Behind', 'Complete']) }));
const GIVING_BY_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((label, i) => ({ label, month: i + 1,
  general: 26000 + Math.round(rnd() * 9000), building: 48000 + Math.round(rnd() * 30000), pantry: 2200 + Math.round(rnd() * 1400) }));

// servants and serving sign-ups
const SERVING_SLOTS = [
  { id: 'sl1', role: 'Usher', ministry: 'ushers', date: '2026-11-01', time: '07:45', needed: 4, signed: ['m3', 'm9', 'm14'] },
  { id: 'sl2', role: 'Reader (Epistle)', ministry: 'deacons', date: '2026-11-01', time: '08:00', needed: 2, signed: ['m21'] },
  { id: 'sl3', role: 'Agape kitchen', ministry: 'agape', date: '2026-11-01', time: '10:30', needed: 6, signed: ['m4', 'm8', 'm30', 'm41', 'm52', 'm66'] },
  { id: 'sl4', role: 'Sunday School: Grade 3', ministry: 'sunday-school', date: '2026-11-01', time: '11:30', needed: 2, signed: ['m12', 'm19'] },
  { id: 'sl5', role: 'Sound desk', ministry: 'media', date: '2026-11-01', time: '07:30', needed: 1, signed: [] },
  { id: 'sl6', role: 'Food pantry: sorting', ministry: 'food-pantry', date: '2026-10-31', time: '09:00', needed: 8, signed: ['m5', 'm7', 'm11', 'm23', 'm28'] },
  { id: 'sl7', role: 'Visitation: hospital', ministry: 'visitation', date: '2026-11-03', time: '14:00', needed: 2, signed: ['m33'] },
];

// announcements, documents and media
const ANNOUNCEMENTS = [
  { id: 'a1', title: 'The Nativity Fast begins on November 25', body: 'The fast runs until the Feast of the Nativity on January 7. A fasting menu is posted in the documents.', author: 'Fr. Daniel Boulos', date: '2026-10-24', status: 'Published', audience: 'Everyone' },
  { id: 'a2', title: 'Servants needed for the parish festival', body: 'Sign up for the Feast of St. John the Beloved festival on January 12: setup, kitchen, games and cleanup.', author: 'Mina Habib', date: '2026-10-22', status: 'Published', audience: 'Servants' },
  { id: 'a3', title: 'Fellowship hall: the next building milestone', body: 'The foundation is complete. Thank you to every family that has given to the building fund.', author: 'Parish council', date: '2026-10-18', status: 'Draft', audience: 'Everyone' },
  { id: 'a4', title: 'Kiahk Midnight Praises schedule', body: 'Every Saturday of Kiahk, the Midnight Praises begin at 8:00 PM after Vespers.', author: 'Kirollos Tadros', date: '2026-10-15', status: 'Scheduled', audience: 'Everyone' },
];
const DOCUMENTS = [
  { id: 'd1', name: 'Weekly bulletin 2026-10-25.pdf', folder: 'Bulletins', size: 842113, modified: '2026-10-23T16:20', owner: 'Church office', version: 3 },
  { id: 'd2', name: 'Nativity Fast menu.pdf', folder: 'Announcements', size: 311402, modified: '2026-10-20T09:12', owner: 'Agape Kitchen', version: 1 },
  { id: 'd3', name: 'Sunday School curriculum 2026.docx', folder: 'Sunday School', size: 1203990, modified: '2026-09-02T18:44', owner: 'Marina Girgis', version: 7 },
  { id: 'd4', name: 'Servant guidelines.pdf', folder: 'Servants', size: 512004, modified: '2026-08-14T11:05', owner: 'Fr. Daniel Boulos', version: 2 },
  { id: 'd5', name: 'Building fund report Q3.xlsx', folder: 'Finance', size: 88210, modified: '2026-10-05T14:30', owner: 'Parish council', version: 4 },
  { id: 'd6', name: 'Festival floor plan.png', folder: 'Events', size: 2304551, modified: '2026-10-21T20:02', owner: 'Mina Habib', version: 2 },
  { id: 'd7', name: 'Hymns of Kiahk.pdf', folder: 'Hymns', size: 4410222, modified: '2026-10-12T08:00', owner: 'Deacons’ School', version: 1 },
  { id: 'd8', name: 'Youth trip permission form.pdf', folder: 'Youth', size: 203110, modified: '2026-10-01T12:00', owner: 'Mina Habib', version: 1 },
];
const MEDIA = [
  { id: 'v1', title: 'Sermon: "Little children, love one another"', kind: 'audio', speaker: 'Fr. Daniel Boulos', date: '2026-10-18', duration: 1712 },
  { id: 'v2', title: 'Sermon: the Good Shepherd', kind: 'audio', speaker: 'Fr. Antony Wahba', date: '2026-10-11', duration: 1488 },
  { id: 'v3', title: 'Hymn: Tenen (We worship You)', kind: 'audio', speaker: 'Hymns and Choir', date: '2026-10-04', duration: 312 },
  { id: 'v4', title: 'Feast of the Cross procession', kind: 'video', speaker: 'Media and Sound', date: '2026-09-27', duration: 845 },
  { id: 'v5', title: 'Nayrouz celebration', kind: 'image', speaker: 'Media and Sound', date: '2026-09-11', duration: 0 },
];
const BOOKSTORE = [
  { id: 'b1', name: 'The Agpeya (Book of Hours)', price: 18, category: 'Prayer books', stock: 42 },
  { id: 'b2', name: 'Coptic Orthodox hymns: Kiahk', price: 12, category: 'Hymns', stock: 18 },
  { id: 'b3', name: 'Icon of St. John the Beloved (print)', price: 25, category: 'Icons', stock: 9 },
  { id: 'b4', name: 'Children’s Bible stories', price: 15, category: 'Children', stock: 30 },
  { id: 'b5', name: 'Hand-carved wooden cross', price: 22, category: 'Gifts', stock: 14 },
  { id: 'b6', name: 'Lives of the Saints: Tobi', price: 16, category: 'Books', stock: 0 },
];

// the signed-in person (made up)
const ME = { id: 'm1', name: MEMBERS[0].name, email: 'office@stjohn-beloved.example', role: 'Church office administrator' };

module.exports = { CHURCH, CLERGY, MINISTRIES, MEMBER_STATUS, FAMILIES, MEMBERS, SERVICES, FEASTS, EVENTS, FUNDS, GIFTS, PLEDGES, GIVING_BY_MONTH, SERVING_SLOTS, ANNOUNCEMENTS, DOCUMENTS, MEDIA, BOOKSTORE, ME };
