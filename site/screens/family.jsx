/* St. John the Beloved test site · Household (site/screens/family.jsx): one family of the parish. A DetailPage (its
   "On this page" pane links the sections): Breadcrumbs, an Arabic note with the household's file number as an Isolate, and the household's people as Persona rows with a RoleLabel each;
   the Household section is a Tree of the home (parents, children; choosing a person shows them), Family ties a
   NetworkGraph of the household and the related families in the parish, and Members a static Table. Edit address opens
   a FormFlow in a drawer (edit mode, guarded while it has changes). */
import { Badge, Breadcrumbs, Button, DetailPage, EmptyState, Field, FormFlow, Inline, Input, Isolate, NetworkGraph, PageContent, Persona, RoleLabel, Stack, Table, Text, Tree } from 'plenix-platform';
import { FAMILIES, MEMBER_STATUS, familyById, membersOf, CHURCHCRM } from '../data.js';
import { ChurchCrmNotice, SitePage } from '../site.jsx';
import { STATUS_LOOK } from './members.jsx';
const { useState } = React;

const ROLE = { 'Head of household': { icon: 'home', category: 'blue' }, Spouse: { icon: 'person', category: 'purple' }, Child: { icon: 'person', category: 'green' } };
const roleLabel = (r) => <RoleLabel role="custom" label={r} icon={(ROLE[r] || {}).icon || 'person'} category={(ROLE[r] || {}).category} />;

export function FamilyScreen({ screen, chrome }) {
  const fam = familyById(screen.id);
  const [chosen, setChosen] = useState(null);
  const [editing, setEditing] = useState(false);
  const [, setVersion] = useState(0);
  if (!fam) {
    return <SitePage chrome={chrome} page="detail"><PageContent><EmptyState kind="not-found" title="This household is not in the parish list"
      action={<Button onClick={() => screen.navigate('/families')}>Go to families</Button>}>It may have been merged with another household.</EmptyState></PageContent></SitePage>;
  }
  const people = membersOf(fam.id);
  const parents = people.filter((p) => p.role !== 'Child');
  const children = people.filter((p) => p.role === 'Child');
  const related = FAMILIES.filter((f) => f.last === fam.last && f.id !== fam.id).slice(0, 3);
  const head = parents[0];
  const fileNumber = '2026' + String(fam.id.replace(/\D/g, '')).padStart(4, '0') + '-01';   // the household's file number, made up (20260001-01)
  const picked = people.find((p) => p.id === chosen);

  const nodes = [{ id: 'home', label: 'Household', icon: 'home', children: [
    { id: 'parents', label: 'Parents', icon: 'settings-users', children: parents.map((p) => ({ id: p.id, label: p.name, icon: 'person', meta: roleLabel(p.role) })) },
    ...(children.length ? [{ id: 'children', label: 'Children', icon: 'settings-users', children: children.map((p) => ({ id: p.id, label: p.name, icon: 'person', meta: <Text variant="data">{p.born.slice(0, 4)}</Text> })) }] : []),
  ] }];
  const graphNodes = people.map((p) => ({ id: p.id, label: p.first, group: 'household' })).concat(related.map((f) => ({ id: f.id, label: f.last + ' · ' + f.address.city, group: 'related' })));
  const edges = [];
  if (parents[1]) edges.push({ source: parents[0].id, target: parents[1].id, label: 'spouse' });
  parents.forEach((p) => children.forEach((c) => edges.push({ source: p.id, target: c.id, label: 'parent of' })));
  if (head) related.forEach((f) => edges.push({ source: head.id, target: f.id, label: 'related', kind: 'dashed' }));

  const sections = [
    { id: 'household', title: 'Household', content: <Stack gap="md">
      <Tree label={'People of ' + fam.name} nodes={nodes} selected={chosen} onSelect={(id) => setChosen(people.some((p) => p.id === id) ? id : null)} defaultExpanded={['home', 'parents', 'children']} />
      {picked ? <Inline gap="md" justify="between"><Persona name={picked.name} secondary={picked.role + ' · ' + picked.email} size="lg" />
        <Button size="sm" icon="person" onClick={() => screen.navigate('/member/' + picked.id)}>Open {picked.first}’s record</Button></Inline>
        : <Text variant="secondary">Choose a person in the tree to see them here.</Text>}
    </Stack> },
    { id: 'ties', title: 'Family ties', content: <NetworkGraph title={'Family ties of ' + fam.name}
      description={related.length ? 'Dashed lines join the household to related ' + fam.last + ' families in the parish.' : 'No related families in the parish.'}
      nodes={graphNodes} edges={edges} directed groups={[{ id: 'household', label: 'This household' }, { id: 'related', label: 'Related families' }]}
      size="md" onSelect={({ node }) => (node.group === 'related' ? screen.navigate('/family/' + node.id) : screen.navigate('/member/' + node.id))} /> },
    { id: 'members', title: 'Members', content: <Table label={'Members of ' + fam.name} data={people} columns={[
      { title: 'Name', field: 'name', rowLabel: true, render: (p) => <Persona name={p.name} size="xs" href={'#/member/' + p.id} /> },
      { title: 'Place in the household', field: 'role', render: (p) => roleLabel(p.role) },
      { title: 'Born', field: 'born', kind: 'data', render: (p) => p.born.slice(0, 4) },
      { title: 'Status', field: 'status', render: (p) => <Badge tone={STATUS_LOOK[p.status].tone} icon={STATUS_LOOK[p.status].icon}>{MEMBER_STATUS[p.status]}</Badge> },
      { title: 'Ministries', field: 'ministries', kind: 'data', render: (p) => p.ministries.length }]} /> },
  ];

  return (
    <DetailPage {...chrome} title={fam.name} description={fam.address.line1 + ', ' + fam.address.city + ', ' + fam.address.region + ' ' + fam.address.postal + ' · ' + fam.district + ' district'}
      actions={<Inline gap="sm"><Button icon="pencil" onClick={() => setEditing(true)}>Edit address</Button>
        <Button icon="add" onClick={() => screen.navigate('/members/new')}>Add a member</Button></Inline>}
      onBack={() => screen.navigate('/families', { f: fam.id })} strings={{ sections: 'On this page' }} sections={sections}>
      <Stack gap="md">
        <ChurchCrmNotice status={CHURCHCRM} />
        <Breadcrumbs items={[{ label: 'Families and households', href: '#/families?f=' + fam.id }, { label: fam.name }]} />
        {/* the parish office writes some notes in Arabic: the household's file number sits inside the sentence as an island. kind="id" makes it read as the
            page reads (01-20260001 in right-to-left text) from the first Plenix release after 0.75.0; 0.75.0 keeps it as written. Isolate needs 0.74.0 or later */}
        <Text lang="ar" id="household-file-ar">{'رقم ملف الأسرة '}<Isolate kind="id">{fileNumber}</Isolate>{' في سجل الرعية.'}</Text>
        <Inline gap="lg" wrap>
          {people.map((p) => <Inline key={p.id} gap="sm"><Persona name={p.name} secondary={p.phone} size="sm" href={'#/member/' + p.id} />{roleLabel(p.role)}</Inline>)}
        </Inline>
      </Stack>
      <FormFlow mode="edit" surface="drawer" open={editing} title="Household address" sessionKey={fam.id}
        initialValue={{ line1: fam.address.line1, city: fam.address.city, postal: fam.address.postal, phone: fam.phone }}
        validate={(v) => (v.line1.trim() && v.city.trim() ? '' : 'Enter the street and the town.')}
        onSubmit={(v) => new Promise((resolve) => setTimeout(() => { Object.assign(fam.address, { line1: v.line1.trim(), city: v.city.trim(), postal: v.postal.trim() }); fam.phone = v.phone; resolve(); }, 300))}
        onSuccess={() => { setEditing(false); setVersion((n) => n + 1); }} onCancel={() => setEditing(false)} strings={{ saved: 'Address saved' }}>
        {({ value: v, setValue }) => <>
          <Field label="Street" required><Input autoComplete="address-line1" value={v.line1} onChange={(e) => setValue(Object.assign({}, v, { line1: e.target.value }))} /></Field>
          <Field label="Town" required><Input autoComplete="address-level2" value={v.city} onChange={(e) => setValue(Object.assign({}, v, { city: e.target.value }))} /></Field>
          <Field label="ZIP code"><Input width="xs" data inputMode="numeric" value={v.postal} onChange={(e) => setValue(Object.assign({}, v, { postal: e.target.value }))} /></Field>
          <Field label="Home phone"><Input type="tel" data value={v.phone} onChange={(e) => setValue(Object.assign({}, v, { phone: e.target.value }))} /></Field>
        </>}
      </FormFlow>
    </DetailPage>
  );
}
