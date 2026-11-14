/* St. John the Beloved test site · Ministries and services (site/screens/ministries.jsx): every ministry of the
   parish as a card (Card with its icon beside the title, in a ContentGrid), the ways to get involved (FeatureCard), how the
   ministries report to the clergy (Diagram, boxes and arrows, and beside it the same as a TreeChart, left to right or top
   to bottom; owner, 2026-10-26, charts-tree-26), how many servants each ministry has (Treemap), and the
   classes and groups of every ministry to browse (MillerColumns) or choose in a form (Cascader, TreeSelect), with the
   groups you help listed under the form, one title line each (EntityTitle: the ministry's icon, the group, its ministry and
   class, the ministry's area as a tag; Plenix #803).
   Plenix parts: SitePage, PageContent, RecordPage.Header, Pictogram, ContentGrid, Card, FeatureCard, Diagram, TreeChart,
     SegmentedControl, Treemap,
   MillerColumns, Cascader, TreeSelect, EntityTitle, Panel, Field, Columns, Stack, Inline, Text, Count, Heading, Select. */
import { Card, Cascader, Columns, ContentGrid, Count, Diagram, EntityTitle, FeatureCard, Field, Heading, Inline, MillerColumns, PageContent, Panel, SegmentedControl, TreeChart,
  Pictogram, RecordPage, Select, Stack, Text, Treemap, TreeSelect } from 'plenix-platform';
import { CHURCH, CLERGY, MINISTRIES } from '../data.js';
import { SitePage } from '../site.jsx';
const { useState, useMemo } = React;

// the classes of each ministry and the groups in each class (made up); a ministry without classes meets as one group
const CLASSES = {
  'sunday-school': [['Kindergarten', 'Ages 4–5'], ['Grades 1–2', 'Ages 6–7'], ['Grades 3–4', 'Ages 8–9'], ['Grades 5–6', 'Ages 10–11'], ['Middle school', 'Grades 7–8'], ['High school', 'Grades 9–12']],
  'youth': [['Middle school youth', 'Grades 7–8'], ['High school youth', 'Grades 9–12'], ['College and young adults', 'Ages 18–30']],
  'deacons': [['Beginners', 'Learning the responses'], ['Readers', 'Epistles and the Psalm'], ['Hymn chanters', 'The hymns of the seasons']],
  'choir': [['Children’s choir', 'Ages 7–12'], ['Adult choir', 'Ages 13 and up']],
  'bible-study': [['Wednesday study', 'The Gospel of St. John'], ['Women’s study', 'The Book of Ruth']],
};
const GROUPS = {
  'sunday-school': ['St. Mary group', 'St. Mark group'],
  'youth': ['St. George group', 'St. Demiana group'],
};
const MINISTRY_TREE = MINISTRIES.map((m) => ({
  id: m.id, label: m.name, icon: m.icon, description: m.group,
  children: (CLASSES[m.id] || [['Servants', m.meets]]).map(([name, detail], i) => ({
    id: m.id + '-c' + i, label: name, description: detail,
    children: (GROUPS[m.id] || ['Main group']).map((g, j) => ({ id: m.id + '-c' + i + '-g' + j, label: g, description: name })),
  })),
}));
const findNode = (id, list = MINISTRY_TREE, trail = []) => {
  for (const n of list) {
    if (n.id === id) return { node: n, trail: trail.concat(n) };
    if (n.children) { const f = findNode(id, n.children, trail.concat(n)); if (f) return f; }
  }
  return null;
};

const AREAS = [...new Set(MINISTRIES.map((m) => m.group))];
// who each ministry reports to: education and worship to the parish priest, the rest to the associate priest
const reportsTo = (m) => (m.group === 'Education' || m.group === 'Worship' ? CLERGY[0].id : CLERGY[1].id);

export function MinistriesScreen({ chrome }) {
  const [area, setArea] = useState('all');
  const [path, setPath] = useState(['sunday-school', 'sunday-school-c2']);
  const [myClass, setMyClass] = useState('sunday-school-c2-g0');
  const [serving, setServing] = useState(['sunday-school-c2-g0', 'choir-c1-g0']);
  const shown = MINISTRIES.filter((m) => area === 'all' || m.group === area);
  const servants = MINISTRIES.reduce((n, m) => n + m.servants, 0);

  const diagram = useMemo(() => ({
    groups: [{ id: 'clergy', label: 'Clergy' }].concat(AREAS.map((a) => ({ id: a, label: a }))),
    nodes: CLERGY.map((c) => ({ id: c.id, label: c.name, detail: c.role, group: 'clergy' }))
      .concat(MINISTRIES.map((m) => ({ id: m.id, label: m.name, detail: 'Led by ' + m.lead, group: m.group }))),
    edges: MINISTRIES.map((m) => ({ source: reportsTo(m), target: m.id })),
  }), []);
  // the same as a tree: the parish, its priests, each priest's areas, their ministries (TreeChart, in the Plenix release that adds it; a
  // Plenix release without it shows the Diagram alone)
  const [treeWay, setTreeWay] = useState('left-to-right');
  const tree = useMemo(() => ({ id: 'parish', label: CHURCH.name || 'St. John the Beloved', detail: 'The parish', children: CLERGY.slice(0, 2).map((c) => ({
    id: c.id, label: c.name, detail: c.role,
    children: AREAS.filter((a) => MINISTRIES.some((m) => m.group === a && reportsTo(m) === c.id)).map((a) => {
      const ms = MINISTRIES.filter((m) => m.group === a && reportsTo(m) === c.id);
      return { id: c.id + ':' + a, label: a, detail: ms.length + (ms.length === 1 ? ' ministry' : ' ministries'), children: ms.map((m) => ({ id: m.id, label: m.name, detail: 'Led by ' + m.lead })) };
    }),
  })) }), []);
  const treemap = AREAS.map((a) => ({ label: a, children: MINISTRIES.filter((m) => m.group === a).map((m) => ({ label: m.name, value: m.servants })) }));
  const chosen = findNode(myClass);

  return (
    <SitePage chrome={chrome} page="workspace">
      <PageContent>
        <Stack gap="section">
          <RecordPage.Header title="Ministries and services" headingLevel={1}
            media={<Pictogram icon="settings-users" size="48" />}
            description={'Twelve ministries serve the parish. ' + servants + ' places are held by servants, many of whom serve in more than one ministry.'}
            actions={<Field label="Area" layout="inline"><Select value={area} onChange={(e) => setArea(e.target.value)}
              options={[{ value: 'all', label: 'Every area' }].concat(AREAS.map((a) => ({ value: a, label: a })))} /></Field>} />

          <Stack gap="sm">
            <Heading level={2}>Our ministries</Heading>
            <ContentGrid size="lg" label="Ministries">
              {shown.map((m) => (
                <Card key={m.id} icon={m.icon} title={m.name} meta={m.meets} href={'#/ministry/' + m.id}>
                  <Stack gap="xs">
                    <Text variant="secondary">Led by {m.lead} · {m.group}</Text>
                    <Inline gap="xs"><Count value={m.members} label={m.members + ' members'} /><Text variant="secondary">members</Text>
                      <Count value={m.servants} label={m.servants + ' servants'} /><Text variant="secondary">servants</Text></Inline>
                  </Stack>
                </Card>
              ))}
            </ContentGrid>
          </Stack>

          <Stack gap="sm">
            <Heading level={2}>Get involved</Heading>
            <ContentGrid size="md" label="Ways to serve">
              <FeatureCard icon="checklist" hue="green" title="Sign up to serve" description="Choose a Sunday and a place: ushers, readers, the Agape kitchen." href="#/servants" />
              <FeatureCard icon="calendar" hue="blue" title="See what is coming" description="Services, classes and feasts on the parish calendar." href="#/calendar" />
              <FeatureCard icon="schedule" hue="purple" title="Help plan the feast" description="The festival of St. John the Beloved needs servants for every part." href="#/planning" />
            </ContentGrid>
          </Stack>

          <Stack gap="lg">
            <Diagram variant="boxes" direction="right" title="How the ministries report to the clergy"
              description="Education and worship ministries report to the parish priest; fellowship, care and outreach to the associate priest."
              groups={diagram.groups} nodes={diagram.nodes} edges={diagram.edges} />
            {TreeChart ? (
              <Stack gap="sm">
                <Field label="Draw the tree" layout="inline"><SegmentedControl label="Draw the tree" value={treeWay} onChange={setTreeWay}
                  options={[{ value: 'left-to-right', label: 'Left to right' }, { value: 'top-to-bottom', label: 'Top to bottom' }]} /></Field>
                <TreeChart title="The ministries by priest and area" orientation={treeWay} data={tree}
                  description="Click a priest or an area to fold its branch away; the arrow keys move through the tree." />
              </Stack>
            ) : null}
            <Treemap title="Servants by ministry" valueTitle="Servants" data={treemap}
              description="The Food Pantry and the Agape Kitchen hold the most servants; every one of their members serves." />
          </Stack>

          <Stack gap="sm">
            <Heading level={2}>Classes and groups</Heading>
            <Text variant="secondary">Choose a ministry, then a class, to see its groups.</Text>
            <MillerColumns label="Ministries" items={MINISTRY_TREE} path={path} onPathChange={(p) => setPath(p)}
              renderPreview={(item) => {
                const f = findNode(item.id);
                return (
                  <Stack gap="xs">
                    <Text variant="strong">{item.label}</Text>
                    <Text variant="secondary">{f ? f.trail.slice(0, -1).map((n) => n.label).join(' / ') : ''}</Text>
                    <Text>Meets with the class: {item.description}</Text>
                  </Stack>
                );
              }} />
          </Stack>

          <Panel title="Where do you serve?" description="The office keeps each servant’s class and every ministry they help in.">
            <Columns count={2} collapseBelow="medium">
              <Stack gap="sm">
                <Field label="Your class" description={chosen ? chosen.trail.map((n) => n.label).join(' / ') : 'No class chosen'}>
                  <Cascader options={MINISTRY_TREE} value={myClass} onChange={(id) => setMyClass(id)} searchable />
                </Field>
              </Stack>
              <Stack gap="sm">
                <Field label="Every group you help" description={serving.length + (serving.length === 1 ? ' group' : ' groups')}>
                  <TreeSelect multiple search nodes={MINISTRY_TREE} values={serving} onChange={(ids) => setServing(ids)} width="fill" />
                </Field>
                {/* the groups you help, one title line each (EntityTitle, Plenix #803) */}
                <Stack gap="xs">
                  {serving.map((id) => {
                    const f = findNode(id);
                    if (!f) return null;
                    const ministry = f.trail[0];
                    return <EntityTitle key={id} icon={ministry.icon} title={f.node.label} subtitle={f.trail.slice(0, -1).map((n) => n.label).join(' / ')} tag={ministry.description} />;
                  })}
                </Stack>
              </Stack>
            </Columns>
          </Panel>
        </Stack>
      </PageContent>
    </SitePage>
  );
}
