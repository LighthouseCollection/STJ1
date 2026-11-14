/* St. John the Beloved test site · Member (site/screens/member.jsx): one member's record, as the church office keeps
   it. Breadcrumbs, the record's actions (Rename member opens a Dialog with a Form; Edit details; DuplicateAction starts a
   household member from this record; DeleteFlow), ArchiveRestore around the record, an EntityHeader (status badge, facts,
   next step) and Tabs: Profile (PropertyList with InlineEdit values, AvatarUpload, the member card with QRCode and Barcode
   and a ContextMenu), Family (Persona rows), Serving (ministry tags with Popconfirm, RoleLabel, serving sign-ups), Giving
   (PropertyList and a static Table of recent gifts) and Activity (Timeline and VersionHistory). A SecondaryPane at the end
   lists the household (collapsible, resizable; its width kept with useViewState). */
import {
  ArchiveRestore, Avatar, AvatarUpload, Barcode, Breadcrumbs, Button, Columns, ContextMenu, DeleteFlow, Dialog, DuplicateAction,
  EmptyState, EntityHeader, Field, Form, FormActions, Inline, Input, InlineEdit, MenuItem, PageContent, Panel, Persona, Popconfirm,
  PropertyList, QRCode, RecordPage, RoleLabel, SecondaryPane, Stack, StatusIcon, Table, Tabs, Tag, Text, Timeline, VersionHistory, useToast, useViewState,
} from 'plenix-platform';
import { GIFTS, FUNDS, MEMBERS, MEMBER_STATUS, SERVING_SLOTS, familyById, memberById, membersOf } from '../data.js';
import { SitePage } from '../site.jsx';
import { STATUS_LOOK, ministryName } from './members.jsx';
const { useState } = React;

const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso) => new Date(iso + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fundName = (id) => (FUNDS.find((f) => f.id === id) || { name: id }).name;

export function MemberScreen({ screen, chrome }) {
  const toast = useToast();
  const found = memberById(screen.id);
  const [rec, setRec] = useState(() => (found ? Object.assign({}, found) : null));
  const [tab, setTab] = useState(screen.params.tab || 'profile');
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState({ first: '', last: '' });
  const [renameError, setRenameError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [archived, setArchived] = useState(false);
  const [ministries, setMinistries] = useState(found ? found.ministries : []);
  const [view, updateView] = useViewState('st-john-member');   // the household pane's width, kept between visits

  if (!rec) {
    return <SitePage chrome={chrome} page="detail"><PageContent>
      <EmptyState kind="not-found" title="This member is not in the parish list" action={<Button onClick={() => screen.navigate('/members')}>Go to members</Button>}>
        The record may have been deleted or merged with another.</EmptyState></PageContent></SitePage>;
  }
  const family = familyById(rec.family) || { name: '', address: {} };
  const household = membersOf(rec.family).filter((p) => p.id !== rec.id);
  const save = (patch) => { Object.assign(found, patch); setRec(Object.assign({}, rec, patch)); };
  const look = STATUS_LOOK[rec.status];
  const gifts = GIFTS.filter((g) => g.member === rec.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const yearTotal = gifts.reduce((s, g) => s + g.amount, 0);
  const slots = SERVING_SLOTS.filter((s) => s.signed.indexOf(rec.id) >= 0);
  const number = 'STJ-' + rec.id.toUpperCase();

  const openRename = () => { setDraft({ first: rec.first, last: rec.last }); setRenameError(''); setRenaming(true); };
  const rename = (e) => {
    e.preventDefault();
    if (!draft.first.trim() || !draft.last.trim()) { setRenameError('Enter both the first and the last name.'); return; }
    save({ first: draft.first.trim(), last: draft.last.trim(), name: draft.first.trim() + ' ' + draft.last.trim() });
    setRenaming(false);
    toast.show('Renamed to ' + draft.first.trim() + ' ' + draft.last.trim(), { tone: 'success' });
  };

  const profile = (
    <Columns ratio="sidebar-end" collapseBelow="wide">
      <Stack gap="lg">
        <Panel title="Contact and details">
          <PropertyList>
            <PropertyList.Item label="Email"><InlineEdit label="Email" value={rec.email} onConfirm={(email) => save({ email })}
              validate={(x) => (/^[^@\s]+@[^@\s]+$/.test(x) ? null : 'Enter an email address, such as name@example.com')} /></PropertyList.Item>
            <PropertyList.Item label="Phone"><InlineEdit label="Phone" data value={rec.phone} onConfirm={(phone) => save({ phone })} /></PropertyList.Item>
            <PropertyList.Item label="District"><InlineEdit label="District" type="select" value={rec.district}
              options={['North', 'South', 'East', 'West'].map((d) => ({ value: d, label: d }))} onConfirm={(district) => save({ district })} /></PropertyList.Item>
            <PropertyList.Item label="Status"><InlineEdit label="Status" type="select" value={rec.status}
              options={Object.keys(MEMBER_STATUS).map((k) => ({ value: k, label: MEMBER_STATUS[k] }))} onConfirm={(status) => save({ status })} /></PropertyList.Item>
            <PropertyList.Item label="Born" data>{day(rec.born)}</PropertyList.Item>
            <PropertyList.Item label="Member since" data>{day(rec.joined)}</PropertyList.Item>
            <PropertyList.Item label="Address">{family.address.line1}, {family.address.city}, {family.address.region} {family.address.postal}</PropertyList.Item>
          </PropertyList>
        </Panel>
        <Panel title="Photo" description="Shown in the parish directory and on the member card.">
          <Field label="Profile photo" description="At least 200 × 200 pixels">
            <AvatarUpload name={rec.name} src={photo} onChange={(pic) => setPhoto(pic ? pic.url : null)} />
          </Field>
        </Panel>
      </Stack>
      <Panel title="Member card" description="Right-click the card for more. The office scans it at check-in for events.">
        <ContextMenu label="Member card actions" target={<div tabIndex={0} aria-label={'Member card of ' + rec.name}>
          <Stack gap="md" align="center">
            <Inline gap="md"><Avatar name={rec.name} src={photo} size="xl" /><Stack gap="xs"><Text variant="strong">{rec.name}</Text><Text variant="data">{number}</Text></Stack></Inline>
            <QRCode value={'https://stjohn-beloved.example/m/' + rec.id} label={'QR code: open the member page of ' + rec.name} caption="Scan to check in" showValue />
            <Barcode value={number} size="sm" />
            <StatusIcon tone="success" size="sm">Card valid through 2027</StatusIcon>
          </Stack>
        </div>}>
          <MenuItem icon="document" onSelect={() => toast.show('The member card is ready to print')}>Print the card</MenuItem>
          <MenuItem icon="ed-copy" onSelect={() => { try { navigator.clipboard.writeText(number); } catch (e) { /* no clipboard */ } toast.show('Member number copied'); }}>Copy the member number</MenuItem>
          <MenuItem icon="mail" onSelect={() => toast.show('The card is attached to a new email to ' + rec.first)}>Email the card</MenuItem>
        </ContextMenu>
      </Panel>
    </Columns>
  );

  const familyTab = (
    <Panel title={family.name} description={household.length ? household.length + ' others in the household' : 'Lives alone'}
      actions={<Button size="sm" icon="home" onClick={() => screen.navigate('/family/' + rec.family)}>Open the household</Button>}>
      <Stack gap="sm">
        <Persona name={rec.name} secondary={rec.role} role="This member" />
        {household.map((p) => <Persona key={p.id} name={p.name} secondary={p.role} href={'#/member/' + p.id} />)}
      </Stack>
    </Panel>
  );

  const serving = (
    <Stack gap="lg">
      <Panel title="Ministries" description={rec.servant ? 'Serves as a servant in these ministries.' : 'Takes part in these ministries.'}>
        {ministries.length ? <Stack gap="sm">{ministries.map((id) => (
          <Inline key={id} gap="sm" justify="between">
            <Inline gap="sm"><Tag>{ministryName(id)}</Tag>
              <RoleLabel role={rec.servant ? 'Servant' : 'Member'} icon={rec.servant ? 'star' : 'person'} /></Inline>
            <Popconfirm trigger={<Button size="xs" variant="ghost" icon="close" iconOnly label={'Remove from ' + ministryName(id)} />}
              title={'Remove ' + rec.first + ' from ' + ministryName(id) + '?'} description="The ministry lead is told." confirmLabel="Remove" tone="danger"
              onConfirm={() => { setMinistries(ministries.filter((x) => x !== id)); save({ ministries: ministries.filter((x) => x !== id) }); }} />
          </Inline>))}</Stack>
          : <Text variant="secondary">Not in a ministry yet.</Text>}
      </Panel>
      <Panel title="Serving sign-ups">
        {slots.length ? <Table label="Serving sign-ups" data={slots} columns={[
          { title: 'Role', field: 'role', rowLabel: true }, { title: 'Ministry', field: 'ministry', render: (s) => ministryName(s.ministry) },
          { title: 'Date', field: 'date', kind: 'data', render: (s) => day(s.date) }, { title: 'Time', field: 'time', kind: 'data' }]} />
          : <Text variant="secondary">No upcoming sign-ups.</Text>}
      </Panel>
    </Stack>
  );

  const giving = (
    <Stack gap="lg">
      <Panel title="This year">
        <PropertyList>
          <PropertyList.Item label="Gifts in 2026" data>{gifts.length}</PropertyList.Item>
          <PropertyList.Item label="Total given" data>{money(yearTotal)}</PropertyList.Item>
          <PropertyList.Item label="Statements">Sent by email in January</PropertyList.Item>
        </PropertyList>
      </Panel>
      <Panel title="Recent gifts">
        <Table label="Recent gifts" data={gifts.slice(0, 8)} empty="No gifts recorded this year" columns={[
          { title: 'Date', field: 'date', kind: 'data', render: (g) => day(g.date) }, { title: 'Fund', field: 'fund', render: (g) => fundName(g.fund) },
          { title: 'Method', field: 'method' }, { title: 'Amount', field: 'amount', kind: 'data', align: 'right', render: (g) => money(g.amount) }]} />
      </Panel>
    </Stack>
  );

  const activity = (
    <Columns collapseBelow="wide">
      <Panel title="History">
        <Timeline label={'History of ' + rec.name} items={[
          { id: 'joined', time: day(rec.joined), dateTime: rec.joined, title: 'Joined the parish', icon: 'home' },
          ...(ministries.length ? [{ id: 'ministry', time: 'Sep 13, 2026', dateTime: '2026-09-13', title: 'Joined ' + ministryName(ministries[0]), icon: 'settings-users' }] : []),
          ...(gifts.length ? [{ id: 'gift', time: day(gifts[0].date), dateTime: gifts[0].date, title: 'Latest gift', description: fundName(gifts[0].fund), icon: 'star' }] : []),
        ]} />
      </Panel>
      <Panel title="Record changes">
        <VersionHistory currentId="v3" onRestore={(ver) => new Promise((resolve) => setTimeout(() => { toast.show('Restored ' + ver.version, { tone: 'success' }); resolve(); }, 300))}
          versions={[
            { id: 'v3', version: 'Version 3', date: 'Oct 18, 2026', dateTime: '2026-10-18', author: 'Church office', description: 'Phone number updated' },
            { id: 'v2', version: 'Version 2', date: 'Mar 2, 2026', dateTime: '2026-03-02', author: 'Church office', description: 'Moved to the ' + rec.district + ' district' },
            { id: 'v1', version: 'Version 1', date: day(rec.joined), dateTime: rec.joined, author: 'Church office', description: 'Record created' }]} />
      </Panel>
    </Columns>
  );

  return (
    <SitePage chrome={chrome} page="master-detail">

      <PageContent>
        <RecordPage>
          <Stack gap="lg">
            <Inline gap="md" justify="between" wrap>
              <Breadcrumbs items={[{ label: 'Members', href: '#/members' }, { label: family.name, href: '#/family/' + rec.family }, { label: rec.name }]} />
              <Inline gap="sm" wrap>
                <Button icon="rename" onClick={openRename}>Rename member</Button>
                <Button icon="pencil" onClick={() => screen.navigate('/member/' + rec.id + '/edit')}>Edit details</Button>
                <DuplicateAction variant="rename" name={rec.name} noun="member" taken={MEMBERS.map((m) => m.name)}
                  trigger={<Button icon="ed-copy">Add a household member</Button>}
                  source={'The family, address and district of ' + rec.first + ' are copied'}
                  options={[{ id: 'ministries', label: 'Ministries' }, { id: 'phone', label: 'Home phone' }]}
                  onDuplicate={(name) => toast.show(name + ' is ready to complete in the household', { tone: 'success' })} />
                <DeleteFlow variant="type" items={[{ id: rec.id, label: rec.name }]} noun="member"
                  consequence="Their gifts stay on record under their family; their serving sign-ups are removed."
                  trigger={<Button variant="danger-secondary" icon="trash">Delete</Button>}
                  onDelete={() => { const i = MEMBERS.indexOf(found); if (i >= 0) MEMBERS.splice(i, 1); screen.navigate('/members'); }} />
              </Inline>
            </Inline>
            <ArchiveRestore archived={archived} strings={{ message: 'This member is archived: they no longer show in lists or the directory.' }}
              onArchive={() => new Promise((r) => setTimeout(() => { setArchived(true); r(); }, 300))}
              onRestore={() => new Promise((r) => setTimeout(() => { setArchived(false); r(); }, 300))}>
              <EntityHeader media={{ person: rec.name, src: photo, gender: rec.sex === 'f' ? 'female' : rec.sex === 'm' ? 'male' : undefined }} title={rec.name}
                subtitle={rec.role + ' · ' + family.name}
                status={{ tone: look.tone, icon: look.icon, label: MEMBER_STATUS[rec.status] }}
                facts={[{ label: 'Member since', value: rec.joined.slice(0, 4), data: true }, { label: 'District', value: rec.district },
                  { label: 'Ministries', value: ministries.length, data: true }, { label: 'Serving', value: rec.servant ? 'Servant' : 'Not serving' }]}
                next={rec.status === 'visitor' ? { title: 'Call to welcome them', detail: 'Visitation ministry · this week' } : { title: 'Invite to the parish retreat', detail: 'Nov 13–15 · Youth Meeting' }}
                actions={[{ icon: 'mail', label: 'Email ' + rec.first, onClick: () => toast.show('A new email to ' + rec.first + ' is ready in Messages') },
                  { icon: 'phone', label: 'Call ' + rec.first, onClick: () => toast.show('Calling ' + rec.phone) }]} />
              <Tabs label="Member record" value={tab} onChange={setTab} items={[
                { value: 'profile', label: 'Profile', icon: 'person', content: profile },
                { value: 'family', label: 'Family', icon: 'home', count: household.length + 1, content: familyTab },
                { value: 'serving', label: 'Serving', icon: 'settings-users', count: ministries.length, content: serving },
                { value: 'giving', label: 'Giving', icon: 'star', content: giving },
                { value: 'activity', label: 'Activity', icon: 'clock', content: activity },
              ]} />
            </ArchiveRestore>
          </Stack>
        </RecordPage>
      </PageContent>
      <SecondaryPane title="Household" icon="home" side="end" collapsible resizable size={view.householdPane} onSizeChange={(px) => updateView({ householdPane: px })}
        actions={<Button size="xs" variant="ghost" icon="open" iconOnly label="Open the household" onClick={() => screen.navigate('/family/' + rec.family)} />}>
        <Stack gap="sm">
          <Text variant="secondary">{family.address.line1}, {family.address.city}</Text>
          {household.length ? household.map((p) => <Persona key={p.id} name={p.name} secondary={p.role} size="sm" href={'#/member/' + p.id} />)
            : <Text variant="secondary">No one else lives in this household.</Text>}
        </Stack>
      </SecondaryPane>

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename member" size="sm"
        description="The new name shows everywhere: lists, the directory and the member card.">
        <Form label="Rename member" onSubmit={rename}>
          <Field label="First name" required error={renameError && !draft.first.trim() ? renameError : undefined}>
            <Input value={draft.first} autoComplete="off" onChange={(e) => setDraft(Object.assign({}, draft, { first: e.target.value }))} />
          </Field>
          <Field label="Last name" required error={renameError && !draft.last.trim() ? renameError : undefined}>
            <Input value={draft.last} autoComplete="off" onChange={(e) => setDraft(Object.assign({}, draft, { last: e.target.value }))} />
          </Field>
          <FormActions sticky={false}>
            <Button onClick={() => setRenaming(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Rename</Button>
          </FormActions>
        </Form>
      </Dialog>
    </SitePage>
  );
}
