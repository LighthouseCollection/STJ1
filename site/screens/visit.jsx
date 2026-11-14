/* St. John the Beloved test site · Visit us (#/visit): the parish's public page, without the site header or navigation
   (its chrome is null). A LandingPage: the parish's own top navigation (MegaMenus of links; on a narrow window a Menu
   button that opens BottomSheetNav instead, Show / Hide), the service times at a reading width (Center), a map of the
   parish's districts with the church marked (GeoMap, reaching the edges of its card with Bleed), the feasts ahead, what
   to expect on a first visit, the ministries to join (the template's feature cards), a link to sign in and the
   "powered by" line with the Plenix logo (BrandMark). An "On this page" list (Anchor) jumps to each section and marks the
   one in view. BackToTop floats once the page has scrolled. The location is made up. */
import { Anchor, BackToTop, Badge, Bleed, BottomSheetNav, BrandMark, Button, Center, GeoMap, Hide, Inline, LandingPage, Link, List, MegaMenu, Panel, Show,
  Stack, Text } from 'plenix-platform';
import { CHURCH, CLERGY, FAMILIES, FEASTS, SERVICES } from '../data.js';
const { useState } = React;

const TODAY = '2026-10-25';
const clock = (hm) => { const [h, m] = hm.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM'); };
const longDate = (iso) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso + 'T12:00'));

// the parish's four districts (made-up shapes around a made-up church)
const box = (id, name, w, s, e, n) => ({ type: 'Feature', id, properties: { name }, geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } });
const DISTRICTS = { type: 'FeatureCollection', features: [
  box('West', 'West district', -74.68, 40.76, -74.64, 40.84),
  box('North', 'North district', -74.64, 40.80, -74.56, 40.84),
  box('South', 'South district', -74.64, 40.76, -74.56, 40.80),
  box('East', 'East district', -74.56, 40.76, -74.52, 40.84),
] };
const PER_DISTRICT = FAMILIES.reduce((o, f) => ({ ...o, [f.district]: (o[f.district] || 0) + 1 }), {});

const MENUS = [
  { label: 'Worship', groups: [
    { title: 'Services', links: [{ label: 'Divine Liturgy', href: '#/calendar', description: 'Sundays at 8:00 AM, Wednesdays at 7:00 AM' }, { label: 'Vespers and Midnight Praises', href: '#/calendar', description: 'Saturdays at 6:00 PM' }] },
    { title: 'Prayer', links: [{ label: 'Readings and hymns', href: '#/readings', description: 'The day’s readings and the hymns of the season' }, { label: 'Sermons', href: '#/media' }] },
  ] },
  { label: 'Parish life', groups: [
    { title: 'Learn', links: [{ label: 'Sunday School', href: '#/ministry/sunday-school' }, { label: 'Bible Study', href: '#/ministry/bible-study' }, { label: 'Youth Meeting', href: '#/ministry/youth' }] },
    { title: 'Serve', links: [{ label: 'Food Pantry', href: '#/ministry/food-pantry', description: 'Saturdays at 9:00 AM' }, { label: 'Agape Kitchen', href: '#/ministry/agape' }] },
  ] },
  { label: 'Give', groups: [{ title: 'Support the parish', links: [{ label: 'Give online', href: '#/give' }, { label: 'Bookstore', href: '#/bookstore' }] }] },
];
const SHEET = MENUS.map((m) => ({ heading: m.label, items: m.groups.flatMap((g) => g.links).map((l) => ({ id: m.label + l.label, label: l.label, href: l.href })) }));
// the page's sections, for the "On this page" list (Anchor): each id is the id of its Panel
const SECTIONS = [{ id: 'visit-times', label: 'Service times' }, { id: 'visit-find', label: 'Find us' }, { id: 'visit-feasts', label: 'Feasts ahead' }, { id: 'visit-first', label: 'Your first visit' }];
const JOIN = [
  { id: 'sunday-school', title: 'Sunday School', description: 'Grades 1–12, after the Divine Liturgy at 11:30 AM.', icon: 'text-card', href: '#/ministry/sunday-school' },
  { id: 'youth', title: 'Youth Meeting', description: 'High school and college, Fridays at 7:00 PM.', icon: 'settings-users', href: '#/ministry/youth' },
  { id: 'bible-study', title: 'Bible Study', description: 'The Gospel of St. John, Wednesdays at 7:00 PM.', icon: 'document', href: '#/ministry/bible-study' },
  { id: 'agape', title: 'Agape meal', description: 'Every Sunday in the fellowship hall. Everyone is welcome.', icon: 'clock', href: '#/ministry/agape' },
];

export function VisitScreen({ chrome }) {
  const [menu, setMenu] = useState(false);
  const feasts = FEASTS.filter((f) => f.date >= TODAY).slice(0, 3);
  return (
    <LandingPage {...chrome} title={CHURCH.name} description={'A Coptic Orthodox parish in ' + CHURCH.address.city + ', ' + CHURCH.address.region + ', since ' + CHURCH.founded + '. You are welcome.'}
      actions={<Link href="#/sign-in" variant="standalone">Parish office sign-in</Link>} items={JOIN}>
      <BackToTop />
      <Inline as="nav" aria-label="Parish" gap="sm" wrap>
        <Hide below="medium" fallback={<Button icon="menu-lines" onClick={() => setMenu(true)}>Menu</Button>}>
          {MENUS.map((m) => <MegaMenu key={m.label} label={m.label} groups={m.groups} />)}
        </Hide>
        <Show below="medium"><Button icon="phone" href={'tel:' + CHURCH.phone.replace(/\D/g, '')}>Call the office</Button></Show>
      </Inline>
      <BottomSheetNav open={menu} onClose={() => setMenu(false)} title="St. John the Beloved" groups={SHEET} />
      <Anchor items={SECTIONS} />
      <Center maxWidth="lg">
        <Panel id="visit-times" icon="clock" title="Service times" description="All services are in English, Arabic and Coptic.">
          <List items={SERVICES.map((s) => ({ icon: 'calendar', children: s.day + ' · ' + clock(s.time) + '–' + clock(s.end) + ' · ' + s.title + ' (' + s.place + ')' }))} />
        </Panel>
      </Center>
      <Panel id="visit-find" icon="home" title="Find us" description={CHURCH.address.line1 + ', ' + CHURCH.address.city + ', ' + CHURCH.address.region + ' ' + CHURCH.address.postal} flush>
        <Stack inset="md" gap="md">
          <Bleed space="md">
            <GeoMap title="The parish and its districts" description={'Families in each district; the church is at the center. ' + FAMILIES.length + ' families in all.'}
              features={DISTRICTS} values={PER_DISTRICT} valueTitle="Families" format={(v) => String(Math.round(v))} markers={[{ id: 'church', label: CHURCH.short, lon: -74.6, lat: 40.8 }]} size="md" />
          </Bleed>
          <Text as="p">Parking is behind the church and in the school lot across Cedar Grove Road. The fellowship hall entrance has no steps.</Text>
        </Stack>
      </Panel>
      <Panel id="visit-feasts" icon="star" title="Feasts ahead">
        <Stack gap="sm">
          {feasts.map((f) => (
            <Inline key={f.id} justify="between" gap="sm" wrap>
              <Stack gap="none"><Text variant="strong">{f.title}</Text><Text variant="secondary">{longDate(f.date)}</Text></Stack>
              {f.kind === 'fast' ? <Badge tone="waiting" icon="clock">Fast</Badge> : f.kind === 'season' ? <Badge icon="calendar">Season</Badge> : <Badge tone="active" icon="star">Feast</Badge>}
            </Inline>
          ))}
        </Stack>
      </Panel>
      <Panel id="visit-first" icon="person" title="Your first visit">
        <List variant="bullets" items={[
          { children: 'Come as you are. The ushers at the door will help you find a seat and a service book.' },
          { children: 'The Divine Liturgy lasts about three hours; you may come and go quietly.' },
          { children: 'Stay for the Agape meal after the Liturgy and meet ' + CLERGY[0].name + ' and the parish.' },
          { children: 'Fill in a visitor card at the welcome desk if you would like a call or a visit.' },
        ]} />
      </Panel>
      <Inline justify="between" wrap gap="md">
        <Text variant="secondary">{CHURCH.phone} · <Link href={'mailto:' + CHURCH.email} variant="subtle">{CHURCH.email}</Link></Text>
        <Inline gap="sm"><Text variant="caption">Powered by</Text><BrandMark kind="logo" size="sm" /></Inline>
      </Inline>
    </LandingPage>
  );
}
