/* St. John the Beloved test site · Directory (site/screens/directory.jsx): the parish directory, laid out like the
   printed one. A ListingPage: a FilterBar (town, district) and a DataToolbar (Chip toggles, print); the households as a
   selectable ResourceList a page at a time (Pagination), with BulkActions for mailing labels and a Drawer quick view of a
   household (its people as DataPills); everyone A to Z in a grouped VirtualList; the newest members with LoadMore; and the
   phone list as a DataGrid in load-more mode with medium rows. A panel on the printed directory shows its EntityTitle and an
   OverflowList of its actions. */
import {
  BulkActions, Button, Chip, DataGrid, DataPill, DataToolbar, Drawer, EntityTitle, FilterBar, ListingPage, LoadMore, OverflowList, Pagination, Panel, PropertyList,
  ResourceList, Stack, StatusIcon, TagList, Text, VirtualList, useToast,
} from 'plenix-platform';
import { FAMILIES, MEMBERS, membersOf, familyById } from '../data.js';
const { useState } = React;

const PER_PAGE = 8;
const TOWNS = [...new Set(FAMILIES.map((f) => f.address.city))].sort();
const listed = MEMBERS.filter((m) => m.status === 'active' || m.status === 'visitor');
const gender = (m) => (m.sex === 'f' ? 'female' : m.sex === 'm' ? 'male' : undefined);
const PHONE_COLUMNS = [
  { title: 'Name', field: 'name', kind: 'name' },
  { title: 'Phone', field: 'phone', kind: 'data' },
  { title: 'Email', field: 'email', kind: 'data' },
  { title: 'Town', field: 'town' },
];

export function DirectoryScreen({ screen, chrome }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ town: [], district: null });
  const [servantsOnly, setServantsOnly] = useState(false);
  const [phones, setPhones] = useState(true);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState([]);
  const [quick, setQuick] = useState(null);
  const [newShown, setNewShown] = useState(6);
  const [loading, setLoading] = useState(false);

  const families = FAMILIES.filter((f) => (!filters.town.length || filters.town.indexOf(f.address.city) >= 0) && (!filters.district || f.district === filters.district)
    && (!servantsOnly || membersOf(f.id).some((m) => m.servant)));
  const pageCount = Math.max(1, Math.ceil(families.length / PER_PAGE));
  const at = Math.min(page, pageCount);
  const onPage = families.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const people = listed.filter((m) => families.some((f) => f.id === m.family) && (!servantsOnly || m.servant));
  const groups = [...new Set(people.map((m) => m.last.charAt(0)))].sort().map((l) => ({ id: l, label: l,
    items: people.filter((m) => m.last.charAt(0) === l).sort((a, b) => (a.last + a.first < b.last + b.first ? -1 : 1))
      .map((m) => ({ id: m.id, label: m.last + ', ' + m.first, description: (familyById(m.family) || {}).address.city, meta: phones ? m.phone : '', icon: 'person' })) }));
  const newest = listed.slice().sort((a, b) => (a.joined < b.joined ? 1 : -1));
  const phoneRows = people.map((m) => ({ id: m.id, name: m.name, phone: m.phone, email: m.email, town: (familyById(m.family) || {}).address.city }));
  const quickFam = quick && familyById(quick);

  const loadMore = () => { setLoading(true); setTimeout(() => { setNewShown((n) => n + 6); setLoading(false); }, 300); };

  return (
    <ListingPage {...chrome} title="Parish directory" description="Households and members who chose to be listed. The office prints it each Nayrouz."
      actions={<Button icon="document" onClick={() => toast.show('The directory is ready to print')}>Print the directory</Button>}
      empty={<Text as="p" variant="secondary">To correct a listing, or to leave the directory, ask the church office.</Text>}>
      <Stack gap="lg">
        <FilterBar label="Directory filters" onChange={(id, value) => { setFilters(Object.assign({}, filters, { [id]: value })); setPage(1); }}
          onClearAll={() => { setFilters({ town: [], district: null }); setPage(1); }}
          filters={[
            { id: 'town', label: 'Town', multiple: true, value: filters.town, options: TOWNS.map((t) => ({ value: t, label: t, count: FAMILIES.filter((f) => f.address.city === t).length })) },
            { id: 'district', label: 'District', value: filters.district, options: ['North', 'South', 'East', 'West'].map((d) => ({ value: d, label: d, count: FAMILIES.filter((f) => f.district === d).length })) }]} />
        <DataToolbar label="Directory view"
          start={<TagList label="Show"><Chip selected={servantsOnly} onClick={() => { setServantsOnly(!servantsOnly); setPage(1); }}>Servants only</Chip>
            <Chip selected={phones} onClick={() => setPhones(!phones)}>Phone numbers</Chip></TagList>}
          end={<Text variant="secondary">{families.length} households · {people.length} people</Text>} />

        <Panel title="The printed directory" description="The office prints it each Nayrouz. These actions fold into the more button when the page is narrow.">
          <Stack gap="md">
            <EntityTitle icon="document" title="Parish directory, Nayrouz 2026" subtitle="Last printed September 11, 2026" tag={{ label: 'Printed', tone: 'success', icon: 'check' }} level={3} />
            <OverflowList label="Directory actions" items={[
              { id: 'print', label: 'Print', icon: 'export', onSelect: () => window.print() },
              { id: 'form', label: 'Membership form', icon: 'document', href: '#/print/membership-form' },
              { id: 'labels', label: 'Mailing labels', icon: 'mail', onSelect: () => toast.show('The mailing labels are ready to print', { tone: 'success' }) },
              { id: 'email', label: 'Email households', icon: 'mail', onSelect: () => toast.show('A new email to the listed households is ready in Messages', { tone: 'success' }) },
              { id: 'share', label: 'Copy link', icon: 'share', onSelect: () => toast.show('The link to this page is copied') }]} />
          </Stack>
        </Panel>

        <Panel title="Households" description="Choose households to print mailing labels; open one for a quick look.">
          <Stack gap="md">
            <BulkActions count={sel.length} total={families.length} noun="household" onSelectAll={() => setSel(families.map((f) => f.id))} onClear={() => setSel([])}
              actions={[{ id: 'labels', label: 'Print mailing labels', icon: 'document', onSelect: () => toast.show(sel.length + ' mailing labels are ready to print') },
                { id: 'email', label: 'Email households', icon: 'mail', onSelect: () => toast.show('A new email to ' + sel.length + ' households is ready in Messages') }]} />
            <ResourceList label="Households" noun="household" selectable selected={sel} onSelectionChange={setSel}
              emptyState={<Text variant="secondary">No household matches the filters.</Text>}
              items={onPage.map((f) => ({ id: f.id, name: f.name, description: f.address.line1 + ', ' + f.address.city, onOpen: () => setQuick(f.id),
                avatar: { name: f.last }, meta: <DataPill icon="settings-users" data>{f.members.length}</DataPill> }))} />
            <Pagination page={at} pageCount={pageCount} onPageChange={setPage} total={families.length} perPage={PER_PAGE} label="Household pages" />
          </Stack>
        </Panel>

        <Panel title="Everyone, A to Z">
          <VirtualList label="Everyone in the directory" groups={groups} height="lg" showCount
            onItemOpen={(item) => screen.navigate('/member/' + item.id)} />
        </Panel>

        <Panel title="Newest members" description="Welcome them after the Divine Liturgy.">
          <Stack gap="md">
            <ResourceList label="Newest members" noun="member" items={newest.slice(0, newShown).map((m) => ({ id: m.id, name: m.name, href: '#/member/' + m.id,
              description: (familyById(m.family) || {}).name, avatar: { name: m.name, gender: gender(m) },
              meta: <DataPill icon="calendar" tone="green" data>{m.joined}</DataPill> }))} />
            <LoadMore onLoadMore={loadMore} loading={loading} hasMore={newShown < newest.length} shown={Math.min(newShown, newest.length)} total={newest.length} pageSize={6} />
          </Stack>
        </Panel>

        <Panel title="Phone list" flush>
          <DataGrid label="Phone list" data={phoneRows} columns={PHONE_COLUMNS} mode="load-more" pageSize={25} rowHeight="medium"
            hiddenColumns={phones ? [] : ['phone']} onRowClick={(m) => screen.navigate('/member/' + m.id)} />
        </Panel>
      </Stack>

      <Drawer open={!!quickFam} onClose={() => setQuick(null)} title={quickFam ? quickFam.name : ''} size="sm"
        footer={quickFam ? <Button variant="primary" icon="open" onClick={() => screen.navigate('/family/' + quickFam.id)}>Open the household</Button> : null}>
        {quickFam ? <Stack gap="md">
          <PropertyList layout="stacked">
            <PropertyList.Item label="Address">{quickFam.address.line1}, {quickFam.address.city}, {quickFam.address.region} {quickFam.address.postal}</PropertyList.Item>
            <PropertyList.Item label="Home phone" data>{quickFam.phone}</PropertyList.Item>
            <PropertyList.Item label="District">{quickFam.district}</PropertyList.Item>
          </PropertyList>
          <Stack gap="sm"><Text variant="label">People</Text>
            {membersOf(quickFam.id).map((m) => <DataPill key={m.id} gender={gender(m)} person>{m.name}</DataPill>)}</Stack>
          <StatusIcon tone="success" size="sm">Listed in the directory</StatusIcon>
        </Stack> : null}
      </Drawer>
    </ListingPage>
  );
}
