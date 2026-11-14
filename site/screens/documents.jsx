/* St. John the Beloved test site · Documents (site/screens/documents.jsx): the parish document library, where the
   church office keeps the weekly bulletins, the Sunday School curriculum, the servant guidelines and the hymns.
   Plenix parts: EntityHeader; FileBrowser (the folders, its tree and its list) inside a LoadingOverlay while files move, with
   Skeleton and Spinner while a folder opens; a Menu (MenuGroup, MenuItem, MenuDivider, MenuRadioGroup for the order,
   MenuSub to open a folder); a FileList of recent files; a FileRowList of FileRows sent in for review; File chips for
   Sunday; RenameAction (dialog); UploadManager with useUploadQueue (simulated uploads), a DropZone and a FileInput;
   ShareDialog; PermissionsEditor; AttachmentPicker and FilePicker for an email to the servants; DownloadManager;
   AccessRequest for the parish council folder; a MenuBar (File, Edit, View, Help, each a MenuBarMenu) over the library (the Plenix that follows 0.79.0). */
import {
  AccessRequest, AttachmentPicker, Badge, Button, DownloadManager, DropZone, EntityHeader, Field, File, FileBrowser, FileInput,
  FileList, FilePicker, FileRow, FileRowList, Inline, LoadingOverlay, Menu, MenuDivider, MenuGroup, MenuItem, MenuRadioGroup,
  MenuBar, MenuBarMenu, MenuSub, PageContent, Panel, PermissionsEditor, RenameAction, SectionHeading, ShareDialog, Skeleton, Spinner, Stack, Text,
  UploadManager, useToast, useUploadQueue, Columns,
} from 'plenix-platform';
import { CLERGY, DOCUMENTS, MINISTRIES } from '../data.js';
import { SitePage } from '../site.jsx';
const { useState, useEffect, useRef } = React;

// the library's folders (made up), each a folder of the FileBrowser
const FOLDERS = [
  { id: 'bulletins', name: 'Bulletins' }, { id: 'announcements', name: 'Announcements' }, { id: 'sunday-school', name: 'Sunday School' },
  { id: 'servants', name: 'Servants' }, { id: 'finance', name: 'Finance' }, { id: 'events', name: 'Events' },
  { id: 'hymns', name: 'Hymns' }, { id: 'youth', name: 'Youth' },
];
const folderOf = (name) => (FOLDERS.find((f) => f.name === name) || FOLDERS[0]).id;
const TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', png: 'image/png' };
const typeOf = (name) => TYPES[String(name).split('.').pop()] || '';
// more made-up files, so the folders are not empty
const MORE = [
  { id: 'd9', name: 'Weekly bulletin 2026-10-18.pdf', folder: 'Bulletins', size: 790411, modified: '2026-10-16', owner: 'Church office' },
  { id: 'd10', name: 'Weekly bulletin 2026-10-11.pdf', folder: 'Bulletins', size: 812300, modified: '2026-10-09', owner: 'Church office' },
  { id: 'd11', name: 'Kindergarten lessons - Tout.docx', folder: 'Sunday School', size: 402200, modified: '2026-09-20', owner: 'Marina Girgis' },
  { id: 'd12', name: 'Agpeya prayer schedule.pdf', folder: 'Hymns', size: 120400, modified: '2026-09-28', owner: 'Deacons’ School' },
  { id: 'd13', name: 'Servants retreat agenda.docx', folder: 'Servants', size: 64000, modified: '2026-10-03', owner: 'Fr. Daniel Boulos' },
];
const START = FOLDERS.map((f) => ({ id: f.id, name: f.name, kind: 'folder', parent: null }))
  .concat(DOCUMENTS.concat(MORE).map((d) => ({ id: d.id, name: d.name, kind: 'file', parent: folderOf(d.folder), size: d.size, modified: d.modified.slice(0, 10), owner: d.owner, type: typeOf(d.name) })));

// people the office shares with (EntityPicker options)
const PEOPLE = CLERGY.map((c) => ({ value: c.id, label: c.name, description: c.role }))
  .concat(MINISTRIES.map((m) => ({ value: 'lead-' + m.id, label: m.lead, description: m.name + ' lead' })).filter((p) => !/^Fr\./.test(p.label)));

// who may do what in the library (PermissionsEditor)
const ROLES = [{ id: 'clergy', label: 'Clergy', locked: true }, { id: 'office', label: 'Church office' }, { id: 'servants', label: 'Servants' }, { id: 'deacons', label: 'Deacons' }, { id: 'members', label: 'Members' }];
const RIGHTS = [{ id: 'view', label: 'View' }, { id: 'upload', label: 'Upload' }, { id: 'edit', label: 'Edit' }, { id: 'share', label: 'Share' }, { id: 'delete', label: 'Delete' }];
const START_RIGHTS = { clergy: ['view', 'upload', 'edit', 'share', 'delete'], office: ['view', 'upload', 'edit', 'share', 'delete'], servants: ['view', 'upload'], deacons: ['view', 'upload'], members: ['view'] };

// files sent in by servants, waiting for the office to look at them
const REVIEW = [
  { id: 'r1', file: { name: 'Youth trip permission - Habib.pdf', size: 188000, modified: '2026-10-24' }, owner: 'Mina Habib', status: { tone: 'waiting', icon: 'clock', label: 'To review' } },
  { id: 'r2', file: { name: 'Agape menu - Nativity Fast.docx', size: 54000, modified: '2026-10-23' }, owner: 'Nevine Mikhail', status: { tone: 'success', icon: 'check', label: 'Approved' } },
  { id: 'r3', file: { name: 'Food pantry sign-up sheet.pdf', size: 96000, modified: '2026-10-22' }, owner: 'Sarah Ibrahim', error: 'The file could not be opened. Ask the sender to send it again.' },
];

// a simulated upload: the percent climbs, Cancel stops it
function fakeUpload(file, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    let p = 0;
    const timer = setInterval(() => { p = Math.min(100, p + 10 + Math.round(Math.random() * 15)); onProgress(p); if (p >= 100) { clearInterval(timer); resolve(); } }, 250);
    if (signal) signal.addEventListener('abort', () => { clearInterval(timer); const e = new Error('Canceled'); e.name = 'AbortError'; reject(e); });
  });
}
const later = (ms) => new Promise((r) => setTimeout(r, ms));

export function DocumentsScreen({ screen, chrome }) {
  const toast = useToast();
  const [items, setItems] = useState(START);
  const [folder, setFolder] = useState(null);
  const [opening, setOpening] = useState(true);
  const [moving, setMoving] = useState(false);
  const [sizes, setSizes] = useState(true);   // the library menu bar's View > Show file sizes (a check item)
  const [sort, setSort] = useState({ field: 'modified', dir: 'desc' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [grants, setGrants] = useState([{ person: 'c1', role: 'editor' }, { person: 'lead-sunday-school', role: 'viewer' }]);
  const [renaming, setRenaming] = useState(false);
  const [rights, setRights] = useState(START_RIGHTS);
  const [attachments, setAttachments] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const [bulletinFiles, setBulletinFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [downloads, setDownloads] = useState([
    { id: 'dl1', file: { name: 'Hymns of Kiahk.pdf', size: 4410222 }, status: 'ready', href: '#/document/d7' },
    { id: 'dl2', file: { name: 'Building fund report Q3.xlsx', size: 88210 }, status: 'failed', error: 'The connection was lost.' },
  ]);
  const [access, setAccess] = useState('request');
  const [review, setReview] = useState(REVIEW);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const queue = useUploadQueue({ upload: fakeUpload, accept: '.pdf,.docx,.xlsx,.png,.jpg', maxSize: 50e6 });

  // a folder "loads" for a moment: Skeleton and Spinner in its place
  useEffect(() => { setOpening(true); const t = setTimeout(() => setOpening(false), 600); return () => clearTimeout(t); }, [folder]);

  const files = items.filter((i) => i.kind === 'file');
  const bulletin = items.find((i) => i.id === 'd1');
  const recent = files.slice().sort((a, b) => (a.modified < b.modified ? 1 : -1)).slice(0, 6);
  const namesIn = (parent, except) => items.filter((i) => i.parent === parent && i.id !== except).map((i) => i.name);

  const addFiles = (list, parent) => {
    queue.add(list);
    const now = new Date().toISOString().slice(0, 10);
    setItems((all) => all.concat(Array.from(list).map((f, n) => ({ id: 'u' + Date.now() + n, name: f.name, kind: 'file', parent: parent || 'bulletins', size: f.size, modified: now, owner: 'Church office', type: f.type }))));
  };
  const move = async (list, to) => {
    setMoving(true);
    await later(900);
    const ids = list.map((x) => x.id);
    setItems((all) => all.map((i) => (ids.includes(i.id) ? { ...i, parent: to } : i)));
    setMoving(false);
    toast.show(list.length === 1 ? list[0].name + ' moved' : list.length + ' items moved', { tone: 'success' });
  };
  // a simulated download: the row's bar climbs, then the file is ready
  const startDownload = (list) => {
    list.filter((x) => x.kind === 'file').forEach((x) => {
      const id = 'dl' + Date.now() + x.id;
      setDownloads((all) => [{ id, file: { name: x.name, size: x.size }, status: 'progress', progress: 0 }].concat(all));
      const t = setInterval(() => setDownloads((all) => all.map((d) => {
        if (d.id !== id || d.status !== 'progress') return d;
        const p = Math.min(100, d.progress + 20);
        if (p >= 100) clearInterval(t);
        return p >= 100 ? { ...d, status: 'ready', progress: 100, href: '#/document/' + x.id } : { ...d, progress: p };
      })), 300);
      timers.current.push(t);
    });
  };

  const libraryMenu = (
    <Menu label="Library" trigger={<Button caret icon="folder">Library</Button>}>
      <MenuGroup label="Add">
        <MenuItem icon="upload" onSelect={() => setUploadOpen(true)}>Upload files…</MenuItem>
        <MenuItem icon="share" onSelect={() => setShareOpen(true)}>Share the Bulletins folder…</MenuItem>
        <MenuItem icon="rename" onSelect={() => setRenaming(true)}>Rename this week’s bulletin…</MenuItem>
      </MenuGroup>
      <MenuDivider />
      <MenuSub label="Open a folder" icon="folder-open">
        {FOLDERS.map((f) => <MenuItem key={f.id} onSelect={() => setFolder(f.id)}>{f.name}</MenuItem>)}
      </MenuSub>
      <MenuDivider />
      <MenuRadioGroup label="Recent files by" value={sort.field} onChange={(field) => setSort({ field, dir: field === 'name' ? 'asc' : 'desc' })}>
        <MenuItem value="modified">Date modified</MenuItem>
        <MenuItem value="name">Name</MenuItem>
        <MenuItem value="size">Size</MenuItem>
        <MenuItem value="owner">Owner</MenuItem>
      </MenuRadioGroup>
    </Menu>
  );

  return (
    <SitePage chrome={chrome} page="workspace">
      <PageContent>
        <Stack gap="lg">
          <EntityHeader media={{ icon: 'folder', hue: 'blue' }} title="Documents" subtitle="Bulletins, curriculum, servant guidelines and hymns"
            facts={[{ label: 'Files', value: files.length, data: true }, { label: 'Folders', value: FOLDERS.length, data: true }, { label: 'This week’s bulletin', value: bulletin ? bulletin.name : '—', data: true }]}
            next={{ title: 'Send in the bulletin for Sunday', detail: 'Due Friday · Church office' }}
            actions={[{ icon: 'upload', label: 'Upload files', onClick: () => setUploadOpen(true) }, { icon: 'share', label: 'Share', onClick: () => setShareOpen(true) }]} />

          <MenuBar label="Library">
            <MenuBarMenu label="File">
              <MenuItem icon="upload" onSelect={() => setUploadOpen(true)}>Upload files…</MenuItem>
              <MenuItem icon="share" onSelect={() => setShareOpen(true)}>Share the library…</MenuItem>
              <MenuSub label="Open a folder">
                {FOLDERS.slice(0, 4).map((f) => <MenuItem key={f.id} onSelect={() => setFolder(f.id)}>{f.name}</MenuItem>)}
              </MenuSub>
            </MenuBarMenu>
            <MenuBarMenu label="Edit">
              <MenuItem onSelect={() => toast.show('All files in this folder selected')}>Select all</MenuItem>
              <MenuItem onSelect={() => toast.show('Selection cleared')}>Clear the selection</MenuItem>
            </MenuBarMenu>
            <MenuBarMenu label="View">
              <MenuItem checked={sizes} onSelect={() => { setSizes(!sizes); toast.show(sizes ? 'File sizes hidden' : 'File sizes shown'); }}>Show file sizes</MenuItem>
              <MenuDivider />
              <MenuItem onSelect={() => setFolder(null)}>Back to the library</MenuItem>
            </MenuBarMenu>
            <MenuBarMenu label="Help">
              <MenuItem onSelect={() => toast.show('The church office keeps the library. Ask them for a folder you cannot see.')}>About the library</MenuItem>
            </MenuBarMenu>
          </MenuBar>

          <Inline justify="between" wrap>
            <SectionHeading level={2}>Library</SectionHeading>
            {libraryMenu}
          </Inline>
          {opening ? (
            <Stack gap="sm" aria-label="Opening the folder">
              <Inline><Spinner size="sm" label="Opening the folder" /><Text variant="secondary">Opening the folder…</Text></Inline>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="32px" />)}
            </Stack>
          ) : (
            <LoadingOverlay active={moving} message="Moving files">
              <FileBrowser label="Parish documents" root={{ name: 'Library' }} items={items} folder={folder} onFolderChange={setFolder} tree
                onOpenFile={(f) => screen.navigate('/document/' + f.id)}
                onCreateFolder={(name, parent) => setItems((all) => all.concat([{ id: 'fo' + Date.now(), name, kind: 'folder', parent }]))}
                onUpload={(list, parent) => addFiles(list, parent)}
                onRename={(item, name) => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, name } : i)))}
                onDelete={(list) => { const ids = list.map((x) => x.id); setItems((all) => all.filter((i) => !ids.includes(i.id) && !ids.includes(i.parent))); }}
                onMove={move} onDownload={startDownload} />
            </LoadingOverlay>
          )}

          <Stack gap="lg">
            <Stack gap="sm">
              <SectionHeading level={2}>Recent files</SectionHeading>
              <FileList label="Recent files" files={recent} sort={sort} onSortChange={setSort} columns={['size', 'modified', 'owner']}
                onOpen={(f) => screen.navigate('/document/' + f.id)} onDownload={(f) => startDownload([f])} />
            </Stack>
            <Stack gap="sm">
              <SectionHeading level={2}>Sent in for review</SectionHeading>
              <FileRowList label="Sent in for review">
                {review.map((r) => (
                  <FileRow key={r.id} as="li" file={r.file} owner={r.owner} status={r.status ? <Badge tone={r.status.tone} icon={r.status.icon}>{r.status.label}</Badge> : undefined} error={r.error}
                    onRetry={r.error ? () => setReview((all) => all.map((x) => (x.id === r.id ? { ...x, error: undefined, status: { tone: 'waiting', icon: 'clock', label: 'To review' } } : x))) : undefined}
                    onDownload={r.error ? undefined : () => startDownload([{ kind: 'file', id: r.id, ...r.file }])}
                    onRename={(name) => setReview((all) => all.map((x) => (x.id === r.id ? { ...x, file: { ...x.file, name } } : x)))}
                    names={review.filter((x) => x.id !== r.id).map((x) => x.file.name)}
                    onDelete={() => setReview((all) => all.filter((x) => x.id !== r.id))} />
                ))}
              </FileRowList>
              <Text variant="label">For this Sunday</Text>
              <Inline wrap>
                {files.filter((f) => ['d1', 'd2', 'd7'].includes(f.id)).map((f) => <File key={f.id} name={f.name} size={f.size} modified={f.modified} appearance="chip" onOpen={() => screen.navigate('/document/' + f.id)} />)}
              </Inline>
            </Stack>
          </Stack>

          <Columns collapseBelow="wide">
            <Panel icon="upload" title="Send in this week’s bulletin" description="The office prints it on Saturday morning.">
              <Stack gap="md">
                <DropZone active={dragging} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const list = Array.from(e.dataTransfer.files || []); if (list.length) { setBulletinFiles(list); addFiles(list, 'bulletins'); } }}>
                  Drop the bulletin here
                </DropZone>
                <Field label="Or choose the file" description="PDF, up to 50 MB">
                  <FileInput accept=".pdf" onChange={(list) => { setBulletinFiles(list); if (list.length) addFiles(list, 'bulletins'); }} />
                </Field>
                {bulletinFiles.length ? <Text variant="secondary">Sent to the Bulletins folder: {bulletinFiles.map((f) => f.name).join(', ')}</Text> : null}
              </Stack>
            </Panel>
            <Panel icon="mail" title="Email the Sunday School servants" description="Attach files from this computer or from the library.">
              <Stack gap="md">
                <AttachmentPicker value={attachments} onChange={setAttachments} accept=".pdf,.docx" maxFiles={5} maxSize={20e6} variant="chips" />
                <Inline wrap>
                  <Button icon="folder-open" onClick={() => setPickerOpen(true)}>Add from the library</Button>
                  {picked.map((f) => <File key={f.id} name={f.name} size={f.size} appearance="chip" />)}
                </Inline>
                <Inline justify="end">
                  <Button variant="primary" icon="mail" disabled={!attachments.length && !picked.length}
                    onClick={() => { toast.show('Email sent to 18 Sunday School servants', { tone: 'success' }); setAttachments([]); setPicked([]); }}>Send</Button>
                </Inline>
              </Stack>
            </Panel>
          </Columns>

          <DownloadManager title="Downloads" items={downloads}
            onCancel={async (d) => setDownloads((all) => all.filter((x) => x.id !== d.id))}
            onRetry={async (d) => { setDownloads((all) => all.filter((x) => x.id !== d.id)); startDownload([{ kind: 'file', id: d.id, name: d.file.name, size: d.file.size }]); }}
            onDownload={async (d) => toast.show(d.file.name + ' saved to Downloads')} />

          <Stack gap="sm">
            <SectionHeading level={2}>Who can do what in the library</SectionHeading>
            <PermissionsEditor subjects={ROLES} capabilities={RIGHTS} value={rights} onChange={setRights}
              onSave={async (next) => { await later(500); setRights(next); toast.show('Library permissions saved', { tone: 'success' }); }} />
          </Stack>

          <Stack gap="sm">
            <SectionHeading level={2}>Parish council folder</SectionHeading>
            <AccessRequest status={access}
              onRequest={async () => { await later(500); setAccess('pending'); setTimeout(() => setAccess('approved'), 3000); }}
              onOpen={() => setFolder('finance')}
              strings={{ title: 'The Finance folder is for the parish council', description: 'Ask Fr. Daniel Boulos for access to the council’s reports.' }} />
          </Stack>
        </Stack>
      </PageContent>

      <UploadManager queue={queue} variant="dialog" open={uploadOpen} onClose={() => setUploadOpen(false)} hint="PDF, Word, Excel, PNG or JPG, up to 50 MB each." title="Upload to the library" />
      {!uploadOpen && queue.items.length ? <UploadManager queue={queue} variant="panel" docked onClose={() => queue.clear()} /> : null}

      <ShareDialog open={shareOpen} title="Share the Bulletins folder" onClose={() => setShareOpen(false)} people={PEOPLE} grants={grants}
        url="https://stjohn-beloved.example/library/bulletins" onSave={async ({ grants: next }) => { await later(400); setGrants(next); toast.show('Sharing saved', { tone: 'success' }); }} />

      {bulletin ? <RenameAction variant="dialog" open={renaming} onClose={() => setRenaming(false)} value={bulletin.name} names={namesIn(bulletin.parent, bulletin.id)} extension label="File name"
        onRename={(name) => setItems((all) => all.map((i) => (i.id === 'd1' ? { ...i, name } : i)))} /> : null}

      <FilePicker open={pickerOpen} onClose={() => setPickerOpen(false)} multiple
        items={files.map((f) => ({ id: f.id, name: f.name, kind: 'file', type: f.type, folderId: f.parent, size: f.size }))}
        folders={FOLDERS.map((f) => ({ id: f.id, label: f.name, icon: 'folder' }))}
        onPick={async (list) => { setPicked(list); }} />
    </SitePage>
  );
}
