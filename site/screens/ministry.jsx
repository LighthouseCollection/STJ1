/* St. John the Beloved test site · one ministry (site/screens/ministry.jsx), opened at #/ministry/<id> (Sunday School
   by default): its header (the ministry's kind as an IconTile, the documented media of a record header), the servants it
   still needs (ProgressBar, Count, ContextualHelp), the meeting details (Popover, Tooltip), the order of its classes
   (SortableList) and of this Sunday's lesson plan (useSortable with a DragHandle per row), this month's lessons
   (CollapsibleSection with ShowMore), the servants' vote on a motion (VoteTally), the ministry's actions in a row that folds what does not fit
   into a "…" menu (OverflowList) and how classes are grouped (Details).
   Plenix parts: SitePage, PageContent, RecordPage, IconTile, Panel, ProgressBar, Count, ContextualHelp, Popover, Tooltip,
   Button, SortableList, DragHandle, useSortable, CollapsibleSection, ShowMore, Details, List, Columns, Stack, Inline, Text,
   EmptyState, Link, VoteTally (Plenix 0.74.0 and later), OverflowList (the Plenix that follows 0.79.0). */
import { Button, CollapsibleSection, Columns, ContextualHelp, Count, Details, DragHandle, EmptyState, IconTile, Inline, Link, List,
  OverflowList, PageContent, Panel, Popover, ProgressBar, RecordPage, ShowMore, SortableList, Stack, Text, Tooltip, VoteTally, useSortable, useToast } from 'plenix-platform';
import { MINISTRIES, SERVING_SLOTS } from '../data.js';
import { SitePage } from '../site.jsx';
const { useState } = React;

// Sunday School's classes (made up); the other ministries show one class
const CLASS_LIST = {
  'sunday-school': [
    { id: 'k', name: 'Kindergarten', detail: 'Ages 4–5 · Room 101', servants: 3, needed: 3 },
    { id: 'g12', name: 'Grades 1–2', detail: 'Ages 6–7 · Room 102', servants: 3, needed: 4 },
    { id: 'g34', name: 'Grades 3–4', detail: 'Ages 8–9 · Room 103', servants: 2, needed: 4 },
    { id: 'g56', name: 'Grades 5–6', detail: 'Ages 10–11 · Room 104', servants: 4, needed: 4 },
    { id: 'ms', name: 'Middle school', detail: 'Grades 7–8 · Library', servants: 3, needed: 4 },
    { id: 'hs', name: 'High school', detail: 'Grades 9–12 · Youth room', servants: 3, needed: 5 },
  ],
};
const LESSONS = [
  { id: 'l1', date: 'Nov 1', title: 'St. John the Beloved at the Last Supper' },
  { id: 'l2', date: 'Nov 8', title: 'The wedding at Cana' },
  { id: 'l3', date: 'Nov 15', title: 'The Good Shepherd' },
  { id: 'l4', date: 'Nov 22', title: 'Getting ready for the Nativity Fast' },
  { id: 'l5', date: 'Nov 29', title: 'The prophets who waited' },
  { id: 'l6', date: 'Dec 6', title: 'Hymns of Kiahk: the Theotokia' },
];
// the servants' vote on one motion (made up): one member is recused, one is absent
const VOTERS = [
  { memberId: 'v1', name: 'Marina Girgis', role: 'Ministry lead', vote: 'approve' },
  { memberId: 'v2', name: 'Peter Nasr', role: 'Servant', vote: null },
  { memberId: 'v3', name: 'Mariam Saad', role: 'Servant', vote: 'approve' },
  { memberId: 'v4', name: 'Kyrillos Fahmy', role: 'Servant', vote: 'deny' },
  { memberId: 'v5', name: 'Abanoub Tawfik', role: 'Servant', disabledReason: 'Recused' },
  { memberId: 'v6', name: 'Verena Ibrahim', role: 'Servant', disabledReason: 'Absent' },
];
const PLAN = [
  { id: 'p1', name: 'Opening prayer from the Agpeya' },
  { id: 'p2', name: 'Hymn practice' },
  { id: 'p3', name: 'The lesson' },
  { id: 'p4', name: 'Craft: a paper icon' },
  { id: 'p5', name: 'Closing prayer and snack' },
];

export function MinistryScreen({ screen, chrome }) {
  const m = MINISTRIES.find((x) => x.id === (screen.id || 'sunday-school'));
  const toast = useToast();
  const [classes, setClasses] = useState(() => CLASS_LIST[m ? m.id : ''] || (m ? [{ id: 'all', name: m.name, detail: m.meets, servants: m.servants, needed: m.servants }] : []));
  const [plan, setPlan] = useState(PLAN);
  const [voters, setVoters] = useState(VOTERS);
  const [allLessons, setAllLessons] = useState(false);
  const sortable = useSortable({ items: plan, onReorder: (next) => setPlan(next), getName: (x) => x.name, label: 'This Sunday’s plan' });

  if (!m) {
    return <SitePage chrome={chrome} page="detail"><PageContent>
      <EmptyState size="page" kind="not-found" title="This ministry is not in the parish list"
        action={<Button onClick={() => screen.navigate('/ministries')}>Every ministry</Button>}>Choose one from the ministries page.</EmptyState>
    </PageContent></SitePage>;
  }
  const have = classes.reduce((n, c) => n + c.servants, 0), need = classes.reduce((n, c) => n + c.needed, 0);
  const open = SERVING_SLOTS.filter((s) => s.ministry === m.id);
  const lessons = allLessons ? LESSONS : LESSONS.slice(0, 3);

  return (
    <SitePage chrome={chrome} page="detail">
      <PageContent>
        <RecordPage
          header={<RecordPage.Header title={m.name} media={<IconTile icon={m.icon} hue="green" size="lg" />}
            description={'Led by ' + m.lead + '. Meets ' + m.meets + '.'}
            meta={<Inline gap="sm"><Text variant="secondary">{m.group}</Text>
              <Inline gap="xs"><Count value={m.members} label={m.members + ' members'} /><Text variant="secondary">members</Text></Inline></Inline>}
            actions={<Inline gap="sm">
              <Popover title="Meeting details" closeButton trigger={<Button icon="clock" caret>Meeting details</Button>}>
                <Stack gap="xs">
                  <Text>{m.meets}</Text>
                  <Text variant="secondary">After the Divine Liturgy, in the classrooms of the education wing.</Text>
                  <Text variant="secondary">Questions: write to {m.lead} through the church office.</Text>
                </Stack>
              </Popover>
              <Tooltip content="Send a reminder to every servant of this ministry"><Button icon="mail" onClick={() => toast.show('Reminder sent to the ' + m.name + ' servants', { tone: 'success' })}>Remind servants</Button></Tooltip>
            </Inline>} />}
          aside={
            <Panel title="Open places" description="Sign-ups that still need servants.">
              {open.length ? <List items={open.map((s) => ({ icon: 'checklist', children: s.role + ' · ' + s.date + ' · ' + s.signed.length + ' of ' + s.needed }))} />
                : <Text variant="secondary">Every place is taken.</Text>}
              <Link href="#/servants">See every sign-up</Link>
            </Panel>}>
          <Stack gap="lg">
            <Panel title="Servants" actions={<ContextualHelp title="Servants needed">Each class keeps one servant for every six children, and never fewer than two in the room.</ContextualHelp>}>
              <Stack gap="sm">
                <ProgressBar value={have} max={need} label="Servants for this year" showValue tone={have >= need ? 'success' : 'warning'} />
                <Inline gap="xs"><Count value={need - have} label={(need - have) + ' servants still needed'} /><Text variant="secondary">servants still needed across {classes.length} classes</Text></Inline>
              </Stack>
            </Panel>

            <Columns count={2} collapseBelow="wide">
              <Panel title="Class order" description="The order the classes are listed in the bulletin and on the sign-up sheet.">
                <SortableList label="Classes" items={classes} onReorder={(next) => setClasses(next)}
                  renderItem={(c) => <Stack gap="none"><Text variant="strong">{c.name}</Text><Text variant="secondary">{c.detail} · {c.servants} of {c.needed} servants</Text></Stack>} />
              </Panel>
              <Panel title="This Sunday’s plan" description="Drag a part by its handle, or press Space on the handle and use the arrow keys.">
                <Stack as="ol" gap="xs" {...sortable.listProps} aria-label="This Sunday’s plan">
                  {plan.map((p, i) => (
                    <Inline as="li" key={p.id} gap="sm" {...sortable.itemProps(i)}>
                      <DragHandle dnd={sortable.handleProps(i)} label={'Move ' + p.name} />
                      <Text>{i + 1}. {p.name}</Text>
                    </Inline>
                  ))}
                </Stack>
              </Panel>
            </Columns>

            <Panel title="Ministry actions" description="The row keeps what fits; the rest is under the … button.">
              <OverflowList label="Ministry actions" items={[
                { id: 'remind', label: 'Send a reminder', icon: 'mail', onSelect: () => toast.show('Reminder sent to the ' + m.name + ' servants.') },
                { id: 'schedule', label: 'Open the schedule', icon: 'calendar', onSelect: () => toast.show('Schedule opened.') },
                { id: 'servants', label: 'See the servants', icon: 'settings-users', onSelect: () => toast.show('Servants listed.') },
                { id: 'meeting', label: 'Meeting time', icon: 'clock', onSelect: () => toast.show('Meets ' + m.meets + '.') },
                { id: 'lead', label: 'Contact the lead', icon: 'person', onSelect: () => toast.show('Message to ' + m.lead + ' started.') }]} />
            </Panel>

            <Panel title="Servants’ vote" description="Motion 3: hold the Kiahk retreat on December 12.">
              <VoteTally label="Motion 3: hold the Kiahk retreat on December 12" members={voters}
                onVote={(memberId, option) => setVoters((all) => all.map((v) => (v.memberId === memberId ? { ...v, vote: option } : v)))} />
            </Panel>

            <CollapsibleSection title="Lessons this month" icon="text-card">
              <Stack gap="xs">
                <List items={lessons.map((l) => ({ icon: 'calendar', children: l.date + ': ' + l.title }))} />
                <ShowMore expanded={allLessons} count={LESSONS.length - 3} onToggle={(next) => setAllLessons(next)} />
              </Stack>
            </CollapsibleSection>

            <Details summary="How are the classes grouped?">
              Children are placed by their school grade in September. Each class splits into two groups named for saints when it
              has more than twelve children, so every child is known by name.
            </Details>
          </Stack>
        </RecordPage>
      </PageContent>
    </SitePage>
  );
}
