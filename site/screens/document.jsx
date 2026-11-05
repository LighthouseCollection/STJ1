/* St. John the Beloved test site · Document (site/screens/document.jsx): one document of the library, by default d1,
   the weekly bulletin for Sunday, October 25: read it, see who changed it and when, compare two versions, restore an
   older one, and edit its details.
   Plenix parts: a Sticky header row (the name, VersionLabel, Time, Download with a ProgressCircle of a simulated
   download); DocumentViewer (the bulletin as text); VersionHistory (restore); VersionCompare (the text diff); a SidePanel
   with the details: MetadataEditor (inline), Time and VersionLabel. */
import { Badge, Button, DocumentViewer, Inline, MetadataEditor, PageContent, ProgressCircle, SectionHeading, SidePanel, Stack, Sticky, Text, Time, VersionCompare, VersionHistory, VersionLabel, useToast } from 'plenix-platform';
import { DOCUMENTS } from '../data.js';
import { SitePage } from '../site.jsx';
const { useState, useEffect, useRef } = React;

// the bulletin's three versions (made up)
const V1 = `St. John the Beloved Coptic Orthodox Church
Weekly bulletin · Sunday, October 25, 2026

Services this week
Saturday: Vespers and Midnight Praises, 6:00 PM
Sunday: Matins and the Divine Liturgy, 8:00 AM
Wednesday: Bible Study with Fr. Antony Wahba, 7:00 PM

Announcements
Sunday School resumes after the Divine Liturgy.
The Agape Kitchen serves lunch in the fellowship hall.
The youth trip permission forms are due Friday.`;
const V2 = V1.replace('The youth trip permission forms are due Friday.', 'The youth trip permission forms are due Friday.\nThe Food Pantry needs servants on Saturday at 9:00 AM.');
const V3 = V2.replace('Wednesday: Bible Study with Fr. Antony Wahba, 7:00 PM', 'Wednesday: Bible Study with Fr. Antony Wahba, 7:30 PM\nThursday: Hymns and Choir practice for Kiahk, 7:30 PM')
  .replace('Sunday School resumes after the Divine Liturgy.', 'Sunday School meets after the Divine Liturgy in the lower hall.');

const VERSIONS = [
  { id: 'v1', version: 1, date: 'Oct 20, 2026', dateTime: '2026-10-20T10:05', author: 'Church office', description: 'First draft', text: V1, size: '801 KB' },
  { id: 'v2', version: 2, date: 'Oct 22, 2026', dateTime: '2026-10-22T14:40', author: 'Sarah Ibrahim', description: 'Added the Food Pantry notice', text: V2, size: '822 KB' },
  { id: 'v3', version: 3, date: 'Oct 23, 2026', dateTime: '2026-10-23T16:20', author: 'Fr. Daniel Boulos', description: 'New Bible Study time, choir practice', text: V3, size: '842 KB' },
];

const FIELDS = [
  { id: 'title', label: 'Title', type: 'text', required: true },
  { id: 'folder', label: 'Folder', type: 'select', options: ['Bulletins', 'Announcements', 'Sunday School', 'Servants', 'Hymns', 'Youth'].map((f) => ({ value: f, label: f })) },
  { id: 'audience', label: 'Audience', type: 'select', options: [{ value: 'everyone', label: 'The whole parish' }, { value: 'servants', label: 'Servants' }, { value: 'clergy', label: 'Clergy and the office' }] },
  { id: 'notes', label: 'Notes', type: 'textarea' },
];

export function DocumentScreen({ screen, chrome }) {
  const toast = useToast();
  const doc = DOCUMENTS.find((d) => d.id === screen.id) || DOCUMENTS[0];
  const isBulletin = doc.id === 'd1';
  const [current, setCurrent] = useState('v3');
  const [meta, setMeta] = useState({ title: doc.name.replace(/\.[^.]+$/, ''), folder: doc.folder, audience: 'everyone', notes: isBulletin ? 'Print 250 copies for Sunday.' : '' });
  const [panelOpen, setPanelOpen] = useState(true);
  const [progress, setProgress] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const shown = VERSIONS.find((v) => v.id === current) || VERSIONS[2];
  const text = isBulletin ? shown.text : doc.name + '\n\nOwner: ' + doc.owner + '\nFolder: ' + doc.folder + '\n\nThis document is shown as a text preview in the test site.';

  // a simulated download: the ring fills, then says Downloaded
  const download = () => {
    clearInterval(timer.current);
    setProgress(0);
    timer.current = setInterval(() => setProgress((p) => { const n = Math.min(100, (p || 0) + 12); if (n >= 100) clearInterval(timer.current); return n; }), 200);
  };

  const panel = (
    <SidePanel title="Details" icon="circle-info" open={panelOpen} onOpenChange={setPanelOpen}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text variant="label">Version</Text>
          <VersionLabel version={isBulletin ? shown.version : doc.version} status={!isBulletin || current === 'v3' ? 'latest' : undefined} />
        </Stack>
        <Stack gap="xs">
          <Text variant="label">Last changed</Text>
          <Time value={isBulletin ? shown.dateTime : doc.modified} />
          <Time value={isBulletin ? shown.dateTime : doc.modified} format="relative" now={new Date('2026-10-25T09:00')} />
        </Stack>
        <Stack gap="xs">
          <Text variant="label">Owner</Text>
          <Text>{doc.owner}</Text>
        </Stack>
        <MetadataEditor fields={FIELDS} values={meta} variant="inline"
          onSave={async (patch) => { await new Promise((r) => setTimeout(r, 300)); setMeta((m) => ({ ...m, ...patch })); }} />
      </Stack>
    </SidePanel>
  );

  return (
    <SitePage chrome={chrome} page="detail" panel={panel}>
      <PageContent>
        <Stack gap="lg">
          <Sticky label="Document header">
            <Inline justify="between" wrap>
              <Inline wrap>
                <Text variant="title" as="h1">{doc.name}</Text>
                <VersionLabel version={isBulletin ? shown.version : doc.version} status={!isBulletin || current === 'v3' ? 'latest' : undefined} />
                <Text variant="secondary">Changed <Time value={isBulletin ? shown.dateTime : doc.modified} format="label" now={new Date('2026-10-25T09:00')} /></Text>
              </Inline>
              <Inline wrap>
                {progress !== null && progress < 100 ? <ProgressCircle value={progress} size="sm" label={'Downloading ' + doc.name} /> : null}
                {progress === 100 ? <Badge tone="success" icon="check">Downloaded</Badge> : null}
                <Button icon="download-tray" disabled={progress !== null && progress < 100} onClick={download}>Download</Button>
                <Button icon="arrow-left" onClick={() => screen.navigate('/documents')}>All documents</Button>
              </Inline>
            </Inline>
          </Sticky>

          <DocumentViewer kind="text" text={text} label={doc.name} />

          {isBulletin ? (
            <>
              <Stack gap="sm">
                <SectionHeading level={2}>Version history</SectionHeading>
                <VersionHistory variant="restore" currentId={current}
                  versions={VERSIONS.slice().reverse().map((v) => ({ id: v.id, version: v.version, date: v.date, dateTime: v.dateTime, author: v.author, description: v.description, preview: <Text as="p">{v.text}</Text> }))}
                  onRestore={async (v) => { await new Promise((r) => setTimeout(r, 400)); setCurrent(v.id); toast.show('Version ' + v.version + ' restored', { tone: 'success' }); }} />
              </Stack>
              <Stack gap="sm">
                <SectionHeading level={2}>Compare versions</SectionHeading>
                <VersionCompare label="Compare versions of the weekly bulletin" defaultMode="text" defaultBase="v2" defaultTarget="v3"
                  versions={VERSIONS.map((v) => ({ id: v.id, label: 'Version ' + v.version, date: v.dateTime.slice(0, 10), author: v.author, text: v.text, values: { size: v.size, author: v.author } }))}
                  attributes={[{ key: 'size', label: 'Size', kind: 'data' }, { key: 'author', label: 'Changed by' }]} />
              </Stack>
            </>
          ) : null}
        </Stack>
      </PageContent>
    </SitePage>
  );
}
