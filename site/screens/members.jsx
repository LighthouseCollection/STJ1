/* St. John the Beloved test site · Members (site/screens/members.jsx): the parish member list the church office works
   from. A CommandBar over a DataGrid of every member (fill mode: name, family, status as a badge with its icon, district,
   ministries as tags, age, joined date), driven by useCollectionView: the search, the Filter panel (it opens with two
   conditions: status is Active, district is North or East), a ministry QuickFilter, Sort, Group (grouped by district with
   a count and an average age in each group header), Columns, the Manage columns dialog and View. Selecting rows swaps the
   bar to the selection's commands (Escape in the bar clears them); Delete runs a DeleteFlow. Export opens the ExportDialog (it builds
   a real CSV file), Import the ImportDialog or the ImportWizard (column mapping). */
import {
  Badge, CommandBar, CommandBarButton, CommandBarSearch, ColumnsMenu, DataGrid, DeleteFlow, ExportDialog, FilterPanel, GroupPanel,
  ImportDialog, ImportWizard, ManageColumnsDialog, PageContent, QuickFilter, RecordPage, SortPanel, Tag, TagList, ViewMenu,
  useCollectionView, useCommandBar, useToast,
} from 'plenix-platform';
import { MEMBERS, MINISTRIES, MEMBER_STATUS, familyById } from '../data.js';
import { SitePage } from '../site.jsx';

const { useState, useEffect, useMemo } = React;

// a status as a badge with its icon (never a dot)
export const STATUS_LOOK = {
  active: { tone: 'success', icon: 'circle-check' },
  visitor: { tone: 'active', icon: 'person' },
  moved: { tone: 'neutral', icon: 'forward' },
  inactive: { tone: 'waiting', icon: 'snooze' },
};
// each ministry's tag color (category colors identify labels; they never mean a state)
export const MINISTRY_COLOR = { 'sunday-school': 'blue', youth: 'green', deacons: 'purple', choir: 'magenta', 'bible-study': 'teal', agape: 'orange',
  visitation: 'cyan', 'food-pantry': 'red', media: 'navy', ushers: 'olive', library: 'lavender', 'servants-prep': 'lime' };
export const ministryName = (id) => (MINISTRIES.find((x) => x.id === id) || { name: id }).name;
const ageOf = (m) => 2026 - Number(m.born.slice(0, 4));

const FIELDS = [
  { value: 'name', label: 'Name', kind: 'text' },
  { value: 'familyName', label: 'Family', kind: 'text' },
  { value: 'status', label: 'Status', kind: 'select', options: Object.keys(MEMBER_STATUS).map((k, i) => ({ value: k, label: MEMBER_STATUS[k], color: ['green', 'blue', 'grey', 'yellow'][i] })) },
  { value: 'district', label: 'District', kind: 'select', options: ['North', 'South', 'East', 'West'].map((d) => ({ value: d, label: d })) },
  { value: 'ministries', label: 'Ministries', kind: 'multi', options: MINISTRIES.map((x) => ({ value: x.id, label: x.name, color: MINISTRY_COLOR[x.id] })) },
  { value: 'age', label: 'Age', kind: 'number' },
  { value: 'joined', label: 'Joined', kind: 'date' },
];
const COLUMNS = [
  { title: 'Name', field: 'name', kind: 'name', type: 'person', summary: 'count' },
  { title: 'Family', field: 'familyName', filter: true },
  { title: 'Status', field: 'status', kind: 'center', filter: 'list', render: (m) => <Badge tone={STATUS_LOOK[m.status].tone} icon={STATUS_LOOK[m.status].icon}>{MEMBER_STATUS[m.status]}</Badge> },
  { title: 'District', field: 'district', filter: 'list' },
  { title: 'Ministries', field: 'ministries', type: 'multi', sortable: false,
    render: (m) => (m.ministries.length ? <TagList label={'Ministries of ' + m.name}>{m.ministries.map((id) => <Tag key={id} category={MINISTRY_COLOR[id]}>{ministryName(id)}</Tag>)}</TagList> : null) },
  { title: 'Age', field: 'age', type: 'number', kind: 'data', summary: 'average' },
  { title: 'Joined', field: 'joined', type: 'date', kind: 'data' },
];
const ROWS = MEMBERS.map((m) => Object.assign({}, m, { familyName: (familyById(m.family) || {}).name || '', age: ageOf(m) }));

const csvOf = (rows) => ['Name,Family,Status,District,Email,Phone,Joined'].concat(rows.map((m) =>
  [m.name, m.familyName, MEMBER_STATUS[m.status], m.district, m.email, m.phone, m.joined].map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(','))).join('\n');
// a pasted or chosen CSV file: its first line names the columns
async function readCsv(source) {
  const text = source.text || (source.files && source.files[0] ? await source.files[0].text() : '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('The file needs a heading line and at least one member.');
  const heads = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const columns = heads.map((h, i) => ({ id: 'c' + i, label: h }));
  const rows = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => ['c' + i, v.trim().replace(/^"|"$/g, '')])));
  return { columns, rows };
}

// the Export command at the bar's end: its words follow the bar's room
function ExportCommand({ onClick }) {
  const bar = useCommandBar();
  return <CommandBarButton icon="export" label={bar && bar.iconOnly ? 'Export' : 'Export members'} onClick={onClick} />;
}

export function MembersScreen({ screen, chrome }) {
  const toast = useToast();
  const [removed, setRemoved] = useState([]);
  const rows = useMemo(() => ROWS.filter((r) => removed.indexOf(r.id) < 0), [removed]);
  const v = useCollectionView(FIELDS, { data: rows, text: (m) => m.name + ' ' + m.familyName + ' ' + m.email, quick: { ministries: 'list' }, sort: [{ field: 'name', dir: 'asc' }] });
  // the office's usual view: active members of the North and East districts, grouped by district
  useEffect(() => {
    v.setFilter({ join: 'and', items: [
      { id: 'start-status', field: 'status', op: 'any', value: ['active'] },
      { id: 'start-district', field: 'district', op: 'any', value: ['North', 'East'] }] });
    v.setGroup([{ field: 'district', dir: 'asc' }]);
  }, []);
  const [sel, setSel] = useState([]);
  const [hidden, setHidden] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(null);   // 'file' | 'map'
  const [managing, setManaging] = useState(false);
  const chosen = rows.filter((r) => sel.indexOf(r.id) >= 0);
  const shown = v.count(rows);

  const exportRows = ({ format, scope }) => new Promise((resolve) => {
    const list = scope === 'selection' ? chosen : rows.filter(v.test);
    const blob = new Blob([csvOf(list)], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
    setTimeout(() => resolve({ href: URL.createObjectURL(blob), label: 'st-john-members.' + (format === 'csv' ? 'csv' : 'txt') }), 400);
  });

  return (
    <SitePage chrome={chrome} page="workspace">
      <PageContent>
        <RecordPage.Header title="Members" description="Every member and visitor of the parish. Open a member for their profile, family and serving." />
        <CommandBar label="Members" count={shown + ' members'}
          actions={[
            { id: 'new', label: 'New member', icon: 'add', primary: true, onSelect: () => screen.navigate('/members/new') },
            { id: 'import', label: 'Import', icon: 'import', items: [
              { id: 'import-file', label: 'Import a file', icon: 'upload', onSelect: () => setImporting('file') },
              { id: 'import-map', label: 'Import and map columns', icon: 'fields', onSelect: () => setImporting('map') }] },
          ]}
          find={<>
            <CommandBarSearch {...v.searchProps} placeholder="Search members" />
            <FilterPanel {...v.filterProps} />
            <QuickFilter label="Ministry" icon="settings-categories" noun="ministry" options={FIELDS[4].options} {...v.quickProps('ministries')} />
          </>}
          view={<>
            <SortPanel {...v.sortProps} />
            <GroupPanel {...v.groupProps} />
            <ColumnsMenu {...v.columnsProps} />
            <ViewMenu {...v.viewProps} gallery={false} />
          </>}
          end={<><CommandBarButton icon="fields" label="Manage columns" onClick={() => setManaging(true)} /><ExportCommand onClick={() => setExporting(true)} /></>}
          selection={{ count: sel.length, hidden, noun: 'member', onClear: () => setSel([]), actions: [
            { id: 'open', label: 'Open', icon: 'open', single: true, onSelect: () => screen.navigate('/member/' + sel[0]) },
            { id: 'email', label: 'Email', icon: 'mail', onSelect: () => toast.show('A new email to ' + sel.length + ' members is ready in Messages', { tone: 'success' }) },
            { id: 'ministry', label: 'Add to ministry', icon: 'settings-users', items: MINISTRIES.map((x) => ({ id: x.id, label: x.name,
              onSelect: () => toast.show(sel.length + ' members added to ' + x.name, { tone: 'success' }) })) },
            { id: 'export', label: 'Export', icon: 'export', onSelect: () => setExporting(true) },
            { id: 'delete', label: 'Delete', icon: 'trash', danger: true, onSelect: () => setDeleting(true) }] }} />
        <DataGrid label="Members" data={rows} columns={COLUMNS} index="id" selectable selected={sel}
          onSelectionChange={(keys, info) => { setSel(keys); setHidden((info && info.hidden) || 0); }}
          onRowClick={(m) => screen.navigate('/member/' + m.id)}
          rowMenu={[
            { label: 'Open', icon: 'open', onSelect: (m) => screen.navigate('/member/' + m.id) },
            { label: 'Edit details', icon: 'pencil', onSelect: (m) => screen.navigate('/member/' + m.id + '/edit') },
            { label: 'Open the household', icon: 'home', onSelect: (m) => screen.navigate('/family/' + m.family) },
            { separator: true },
            { label: 'Delete', icon: 'trash', danger: true, onSelect: (m) => { setSel([m.id]); setDeleting(true); } }]}
          empty="No member matches the search and filters"
          {...v.tableProps} />
      </PageContent>
      <DeleteFlow open={deleting} items={chosen.map((m) => ({ id: m.id, label: m.name }))} noun="member"
        consequence="Their gifts stay on record under their family."
        onDelete={(items) => { setRemoved(removed.concat(items.map((x) => x.id))); setSel([]); }}
        onClose={() => setDeleting(false)} />
      <ManageColumnsDialog {...v.columnsProps} trigger={null} open={managing} onOpenChange={setManaging} />
      <ExportDialog open={exporting} title="Export members" selectedCount={sel.length} onClose={() => setExporting(false)}
        formats={[{ value: 'csv', label: 'CSV (spreadsheet)' }, { value: 'txt', label: 'Plain text' }]} onExport={exportRows} />
      <ImportDialog open={importing === 'file'} title="Import members" accept=".csv,text/csv" initialMode="paste" onClose={() => setImporting(null)}
        onImport={async (source) => { const d = await readCsv(source); toast.show(d.rows.length + ' members read; the office checks them before they join the list', { tone: 'success' }); setImporting(null); }} />
      <ImportWizard open={importing === 'map'} title="Import members" onClose={() => setImporting(null)}
        fields={[{ id: 'first', label: 'First name', required: true }, { id: 'last', label: 'Last name', required: true }, { id: 'email', label: 'Email' }, { id: 'phone', label: 'Phone' }]}
        onRead={readCsv}
        onImport={({ rows: list }) => new Promise((resolve) => setTimeout(() => { toast.show(list.length + ' members imported', { tone: 'success' }); resolve(); }, 400))} />
    </SitePage>
  );
}
