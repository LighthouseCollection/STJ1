/* St. John the Beloved test site · Parish settings (#/settings/<section>): the church office's settings, one section per
   page (general, people, giving, roles, notifications, appearance, security, audit) in a SettingsLayout with its NavList.
   Every section is a SettingsSection card, static or collapsible, its rows SettingsRows. It shows: the parish's details
   and regional settings (TimeZoneSelect), the hosting plan (TrialUpgrade), the keyboard shortcuts (useHotkeyList,
   ShortcutsDialog); member records and who can see the directory (PermissionSummary);
   the online giving provider (ConnectedAccount) and the funds (a new fund
   through PromptDialog); the office roles (RoleManager); email, connected calendars (ConnectedAccounts) and the welcome
   email template (CodeEditor; Restore the default asks with ConfirmDialog); the theme and density (ThemeProvider,
   useTheme, useDensity) and the fellowship hall display in dark (ThemeZone); sign-out after inactivity (useSessionTimeout,
   SessionTimeout) and closing an office account (Offboarding); the settings history (AuditLog, a Scrim while older
   entries load). "View as a parish council member" turns the page read-only (ReadOnlyProvider, ReadOnly). */
import { AuditLog, Badge, Button, CodeEditor, ConfirmDialog, ConnectedAccount, ConnectedAccounts, Field,
  Inline, Input, NavList, Offboarding, PermissionSummary, PromptDialog, RadioGroup, ReadOnly, ReadOnlyProvider, RoleManager, Scrim, Select,
  SessionTimeout, SettingsLayout, SettingsRow, SettingsSection, ShortcutsDialog, Stack, Switch, Text, ThemeProvider, ThemeZone, TimeZoneSelect,
  TrialUpgrade, useDensity, useHotkeyList, useSessionTimeout, useTheme, useToast } from 'plenix-platform';
import { SitePage } from '../site.jsx';
import { CHURCH, CLERGY, FUNDS, MEMBERS, ME } from '../data.js';
const { useState } = React;

const SECTIONS = [
  { id: 'general', label: 'General', icon: 'settings-general' },
  { id: 'people', label: 'People and directory', icon: 'settings-users' },
  { id: 'giving', label: 'Giving', icon: 'field-currency' },
  { id: 'roles', label: 'Roles and access', icon: 'settings-permissions' },
  { id: 'notifications', label: 'Notifications', icon: 'settings-email' },
  { id: 'appearance', label: 'Appearance', icon: 'settings-customize' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'audit', label: 'Settings history', icon: 'list-lines' },
];
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// the office roles (made up)
const PERMISSIONS = [
  { id: 'members.view', label: 'View member records', group: 'People' },
  { id: 'members.edit', label: 'Add and edit members', group: 'People' },
  { id: 'directory.print', label: 'Print the directory', group: 'People' },
  { id: 'giving.view', label: 'View gifts and pledges', group: 'Giving' },
  { id: 'giving.record', label: 'Record gifts', group: 'Giving' },
  { id: 'giving.statements', label: 'Send giving statements', group: 'Giving' },
  { id: 'serving.manage', label: 'Manage servant sign-ups', group: 'Serving' },
  { id: 'announce.publish', label: 'Publish announcements', group: 'Communication' },
  { id: 'settings.manage', label: 'Change parish settings', group: 'Administration' },
];
const ALL = PERMISSIONS.map((p) => p.id);
const PEOPLE = CLERGY.map((c) => ({ value: c.id, label: c.name, description: c.role }))
  .concat(MEMBERS.filter((m) => m.servant && m.role !== 'Child').slice(0, 14).map((m) => ({ value: m.id, label: m.name, description: m.email })));
const ROLES = [
  { id: 'owner', name: 'Parish priest', builtIn: 'owner', description: 'Everything, including roles and parish settings.', permissions: ALL, members: ['c1'], required: true },
  { id: 'office', name: 'Church office', builtIn: 'editor', description: 'Keeps the records: members, gifts, sign-ups and announcements.', permissions: ALL.filter((p) => p !== 'settings.manage'), members: ['c2', PEOPLE[2].value] },
  { id: 'council', name: 'Parish council', builtIn: 'viewer', description: 'Reads the records and the giving reports.', permissions: ['members.view', 'giving.view'], members: [PEOPLE[3].value, PEOPLE[4].value, PEOPLE[5].value] },
  { id: 'ministry-lead', name: 'Ministry lead', category: 'green', description: 'Manages the servants and sign-ups of a ministry.', permissions: ['members.view', 'serving.manage', 'announce.publish'], members: [PEOPLE[6].value, PEOPLE[7].value] },
  { id: 'treasurer', name: 'Treasurer', category: 'blue', description: 'Records gifts and sends the giving statements.', permissions: ['giving.view', 'giving.record', 'giving.statements'], members: [PEOPLE[8].value] },
];
const AUDIT = [
  { id: 'a1', actor: { name: ME.name }, at: '2026-10-24T16:40:00', action: 'Changed', target: 'Welcome email template', changes: [{ field: 'Subject', before: 'Welcome to St. John', after: 'Welcome to St. John the Beloved' }] },
  { id: 'a2', actor: { name: 'Fr. Daniel Boulos' }, at: '2026-10-22T09:12:00', action: 'Added a member to', target: 'Ministry lead', changes: [{ field: 'Members', before: '1', after: '2' }] },
  { id: 'a3', actor: { name: ME.name }, at: '2026-10-20T11:05:00', action: 'Connected', target: 'Parish Giving Online', changes: [{ field: 'Status', before: 'Not connected', after: 'Connected' }] },
  { id: 'a4', actor: { name: 'Fr. Antony Wahba' }, at: '2026-10-18T19:30:00', action: 'Changed', target: 'Sign out after inactivity', changes: [{ field: 'Minutes', before: '60', after: '30' }] },
  { id: 'a5', actor: { name: ME.name }, at: '2026-10-15T14:22:00', action: 'Changed', target: 'Parish details', changes: [{ field: 'Phone', before: '(555) 010-1000', after: '(555) 010-1001' }] },
];
const OLDER = [
  { id: 'a6', actor: { name: 'Fr. Daniel Boulos' }, at: '2026-09-30T10:00:00', action: 'Created', target: 'Treasurer', changes: [] },
  { id: 'a7', actor: { name: ME.name }, at: '2026-09-11T08:30:00', action: 'Changed', target: 'Parish time zone', changes: [{ field: 'Time zone', before: 'UTC', after: 'America/New_York' }] },
];
const TEMPLATE = '<h1>Welcome to St. John the Beloved</h1>\n<p>Dear {first_name},</p>\n<p>Thank you for worshiping with us. The Divine Liturgy is every Sunday at 8:00 AM,\n  and the Agape meal follows in the fellowship hall.</p>\n<p>Fr. Daniel Boulos and the church office</p>\n';
const OFFICE_ACCOUNTS = [
  { id: 'u1', name: 'Rafik Morcos', account: 'rafik.morcos', role: 'Former office secretary', last: 'Last signed in Aug 2, 2026' },
  { id: 'u2', name: 'Monica Saad', account: 'monica.saad', role: 'Library and Bookstore', last: 'Last signed in Oct 19, 2026' },
];
const PLANS = [
  { id: 'trial', title: 'Trial', meta: 'Until Nov 30, 2026', values: { members: '500', storage: '5 GB', admins: '3', support: 'Email' } },
  { id: 'parish', title: 'Parish', meta: 'Billed yearly', values: { members: '1,500', storage: '50 GB', admins: '10', support: 'Email' } },
  { id: 'diocese', title: 'Diocese', meta: 'Billed yearly', values: { members: 'No limit', storage: '500 GB', admins: 'No limit', support: 'Phone and email' } },
];
const PLAN_ROWS = [{ key: 'members', label: 'Members', kind: 'data' }, { key: 'storage', label: 'Storage', kind: 'data' }, { key: 'admins', label: 'Office accounts', kind: 'data' }, { key: 'support', label: 'Support' }];

export function SettingsScreen({ screen, chrome }) {
  return (
    <ThemeProvider>
      <SitePage chrome={chrome} page="settings">
        <ParishSettings screen={screen} />
      </SitePage>
    </ThemeProvider>
  );
}

function ParishSettings({ screen }) {
  const section = SECTIONS.some((s) => s.id === screen.id) ? screen.id : 'general';
  const [council, setCouncil] = useState(false);
  const Body = { general: General, people: People, giving: Giving, roles: Roles, notifications: Notifications, appearance: Appearance, security: Security, audit: Audit }[section];
  return (
    <SettingsLayout nav={<NavList label="Parish settings" value={section} items={SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, href: '#/settings/' + s.id }))} />}>
      <Stack gap="md">
        <SettingsSection title="Viewing as" description="Check what the parish council sees before you share these settings.">
          <SettingsRow label="View as a parish council member" description="Council members can read every setting but not change it.">
            <Switch labelHidden label="View as a parish council member" checked={council} onChange={(e) => setCouncil(e.target.checked)} />
          </SettingsRow>
        </SettingsSection>
        <ReadOnlyProvider readOnly={council}>
          <ReadOnly readOnly={council} reason={council ? 'Set by the church office: council members can read these settings.' : undefined}>
            <Stack gap="md"><Body council={council} screen={screen} /></Stack>
          </ReadOnly>
        </ReadOnlyProvider>
      </Stack>
    </SettingsLayout>
  );
}

function General({ council }) {
  const toast = useToast();
  const [name, setName] = useState(CHURCH.name);
  const [email, setEmail] = useState(CHURCH.email);
  const [zone, setZone] = useState(CHURCH.timeZone);
  const [coptic, setCoptic] = useState(true);
  const [dateFormat, setDateFormat] = useState('mdy');
  const [shortcuts, setShortcuts] = useState(false);
  const hotkeys = useHotkeyList();
  const nameError = name.trim() ? '' : 'Enter the parish’s name.';
  return (
    <>
      <SettingsSection title="Parish" description="How the parish is named on bulletins, statements and emails."
        actions={council ? null : <Button variant="primary" onClick={() => (nameError ? toast.show(nameError, { tone: 'danger' }) : toast.show('Parish details saved', { tone: 'success' }))}>Save</Button>}>
        <Field label="Parish name" layout="row" required error={nameError}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Office email" layout="row" description="Replies to every email the site sends come here."><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <SettingsRow label="Office phone" description="Shown on the Visit us page."><Text variant="data">{CHURCH.phone}</Text></SettingsRow>
      </SettingsSection>
      <SettingsSection title="Regional" description="Dates, times and the church calendar." collapsible defaultExpanded remember={false}>
        <SettingsRow label="Time zone" description="Service times and reminders use it." htmlFor="parish-time-zone">
          <TimeZoneSelect id="parish-time-zone" value={zone} onChange={setZone} zones={['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Africa/Cairo', 'Europe/London']} />
        </SettingsRow>
        <SettingsRow label="Date format" htmlFor="parish-date-format">
          <Select id="parish-date-format" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} options={[{ value: 'mdy', label: 'Oct 25, 2026' }, { value: 'iso', label: '2026-10-25' }, { value: 'dmy', label: '25 Oct 2026' }]} />
        </SettingsRow>
        <SettingsRow label="Show the Coptic date" description="Beside the date on the calendar and the bulletin (15 Paopi 1743).">
          <Switch labelHidden label="Show the Coptic date" checked={coptic} onChange={(e) => setCoptic(e.target.checked)} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Hosting plan" description="The parish site is hosted on Plenix.">
        <TrialUpgrade message="The parish is on the free trial until November 30, 2026: 500 members and 3 office accounts." plans={PLANS} attributes={PLAN_ROWS}
          onUpgrade={async (id) => { await wait(600); toast.show('The parish moved to the ' + PLANS.find((p) => p.id === id).title + ' plan', { tone: 'success' }); }} />
      </SettingsSection>
      <SettingsSection title="Keyboard shortcuts" description="Shortcuts the office uses every day." collapsible defaultExpanded={false}>
        <SettingsRow label="Shortcuts on this site" description={hotkeys.length + ' shortcuts, such as N for a new member and G then M for the members list.'}>
          <Button icon="code" onClick={() => setShortcuts(true)}>Show all shortcuts</Button>
        </SettingsRow>
      </SettingsSection>
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </>
  );
}

function People() {
  const [district, setDistrict] = useState(true);
  const [visibility, setVisibility] = useState('members');
  const active = MEMBERS.filter((m) => m.status === 'active').length;
  return (
    <>
      <SettingsSection title="Member records" description="What the office asks for on the member form.">
        <SettingsRow label="Ask for a district" description="North, South, East or West: the visitation servants plan by district.">
          <Switch labelHidden label="Ask for a district" checked={district} onChange={(e) => setDistrict(e.target.checked)} />
        </SettingsRow>
        <RadioGroup label="Who can see the directory" value={visibility} onChange={setVisibility} options={[
          { value: 'members', label: 'Members of the parish', description: 'Names, families and phone numbers; never giving.' },
          { value: 'servants', label: 'Servants only', description: 'For ministries that call families.' },
          { value: 'office', label: 'The church office only' }]} />
      </SettingsSection>
      <SettingsSection title="Directory access" description="What that choice allows.">
        <PermissionSummary icon="settings-users" access={visibility === 'members' ? 'Members of the parish can view the directory' : visibility === 'servants' ? 'Servants can view the directory' : 'Only the church office can view the directory'}
          detail={'The online and printed directory · ' + active + ' active members'} can={['View names and families', 'Call or email a family', 'Print their own household']}
          cannot={['See giving', 'Edit another household', 'Export the directory']} live />
      </SettingsSection>
    </>
  );
}

function Giving({ council }) {
  const toast = useToast();
  const [provider, setProvider] = useState({ id: 'giving', service: 'Parish Giving Online', icon: 'field-currency', description: 'Card and bank gifts from the Give online page.',
    status: 'connected', account: 'stjohn-beloved', connectedAt: '2026-10-20', scopes: ['Receive gifts into the parish account', 'Send each giver a receipt'],
    loses: 'The Give online page stops taking gifts until it is connected again.' });
  const [funds, setFunds] = useState(FUNDS);
  const [adding, setAdding] = useState(false);
  const [statements, setStatements] = useState(true);
  const link = (status) => async () => { setProvider((p) => ({ ...p, busy: true })); await wait(700); setProvider((p) => ({ ...p, busy: false, status, connectedAt: status === 'connected' ? '2026-10-25' : undefined })); };
  return (
    <>
      <SettingsSection title="Online giving" description="The service that takes gifts on the Give online page.">
        <ConnectedAccount account={provider} onConnect={link('connected')} onDisconnect={link('disconnected')} onReconnect={link('connected')} />
      </SettingsSection>
      <SettingsSection title="Funds" description="Where gifts can go. A fund that reached its goal stays open until the council closes it."
        actions={council ? null : <Button icon="add" onClick={() => setAdding(true)}>Add a fund</Button>}>
        {funds.map((f) => (
          <SettingsRow key={f.id} label={f.name} description={money(f.raised) + ' of ' + money(f.goal)}>
            {f.raised >= f.goal ? <Badge tone="success" icon="check">Goal reached</Badge> : <Badge tone="active" icon="progress">{Math.round(f.raised / f.goal * 100) + '%'}</Badge>}
          </SettingsRow>
        ))}
      </SettingsSection>
      <SettingsSection title="Giving statements" description="The yearly statement each family receives for its records.">
        <SettingsRow label="Email the statements in January" description="Families without an email get a printed copy.">
          <Switch labelHidden label="Email the statements in January" checked={statements} onChange={(e) => setStatements(e.target.checked)} />
        </SettingsRow>
      </SettingsSection>
      <PromptDialog open={adding} title="Add a fund" label="Fund name" placeholder="Iconography fund" description="Givers see this name on the Give online page." confirmLabel="Add fund"
        validate={(v) => (!v.trim() ? 'Enter a name for the fund.' : funds.some((f) => f.name.toLowerCase() === v.trim().toLowerCase()) ? 'A fund with this name already exists.' : '')}
        onSubmit={(v) => { setFunds((x) => x.concat({ id: 'fund-' + x.length, name: v.trim(), goal: 10000, raised: 0 })); setAdding(false); toast.show(v.trim() + ' added', { tone: 'success' }); }}
        onCancel={() => setAdding(false)} />
    </>
  );
}

function Roles({ council }) {
  const toast = useToast();
  const [roles, setRoles] = useState(ROLES);
  return (
    <>
      <SettingsSection title="Roles" description="What each person in the office may do. Every change is kept in the settings history.">
        <RoleManager label="Office roles" roles={roles} permissions={PERMISSIONS} people={PEOPLE} readOnly={council}
          onChange={(next, change) => { setRoles(next); if (change && change.type === 'create') toast.show('Role created', { tone: 'success' }); }} />
      </SettingsSection>
      <SettingsSection title="Your access" description="What you can do as the church office administrator.">
        <PermissionSummary variant="compact" icon="person" access="You can manage the parish records" detail="Church office role"
          can={['view members', 'record gifts', 'publish announcements']} cannot={['change roles', 'close the parish account']} />
      </SettingsSection>
    </>
  );
}

function Notifications({ council }) {
  const toast = useToast();
  const [mail, setMail] = useState({ visitor: true, signups: true, weekly: false });
  const [calendars, setCalendars] = useState([
    { id: 'gcal', service: 'Google Calendar', icon: 'calendar', description: 'Puts the services and feasts on the parish’s shared calendar.', status: 'connected',
      account: 'office@stjohn-beloved.example', connectedAt: '2026-09-02', scopes: ['Add and update the parish’s events'], loses: 'New events stop reaching the shared calendar.' },
    { id: 'outlook', service: 'Outlook calendar', icon: 'calendar', description: 'For the clergy’s own calendars.', status: 'error', account: 'fr.daniel', error: 'Access expired on Oct 12. Reconnect to keep the clergy’s calendars current.' },
    { id: 'ical', service: 'Calendar feed', icon: 'link', description: 'A link members add to their phone’s calendar.', status: 'disconnected', scopes: ['Publish the public services and feasts'] },
  ]);
  const [template, setTemplate] = useState(TEMPLATE);
  const [restore, setRestore] = useState(false);
  const set = (id, status) => setCalendars((list) => list.map((a) => (a.id === id ? { ...a, status, error: undefined, connectedAt: status === 'connected' ? '2026-10-25' : a.connectedAt } : a)));
  const toggle = (key, label) => (
    <SettingsRow label={label}><Switch labelHidden label={label} checked={mail[key]} onChange={(e) => setMail((m) => ({ ...m, [key]: e.target.checked }))} /></SettingsRow>
  );
  return (
    <>
      <SettingsSection title="Email the office when" description="Sent to the office email.">
        {toggle('visitor', 'A visitor card is filled in')}
        {toggle('signups', 'A servant signs up or cancels')}
        {toggle('weekly', 'The weekly giving summary is ready')}
      </SettingsSection>
      <SettingsSection title="Connected calendars" description="Calendars the parish’s events are shared with.">
        <ConnectedAccounts label="Connected calendars" accounts={calendars} onConnect={(a) => set(a.id, 'connected')} onDisconnect={(a) => set(a.id, 'disconnected')} onReconnect={(a) => set(a.id, 'connected')} />
      </SettingsSection>
      <SettingsSection title="Welcome email" description="Sent to each new member. {first_name} is filled in for each person." collapsible
        actions={council ? null : <><Button onClick={() => setRestore(true)}>Restore the default</Button><Button variant="primary" onClick={() => toast.show('Welcome email saved', { tone: 'success' })}>Save template</Button></>}>
        <Field label="Template (HTML)"><CodeEditor language="html" value={template} onChange={setTemplate} lineNumbers height="md" /></Field>
      </SettingsSection>
      <ConfirmDialog open={restore} title="Restore the default welcome email?" message="Your changes to the template will be replaced by the parish’s default text." confirmLabel="Restore" destructive
        onConfirm={() => { setTemplate(TEMPLATE); setRestore(false); toast.show('The default welcome email is back'); }} onCancel={() => setRestore(false)} />
    </>
  );
}

function Appearance() {
  const { theme, mode, setTheme, themes } = useTheme();
  const [density, setDensity] = useDensity();
  return (
    <>
      <SettingsSection title="Theme and density" description="For this browser: each person chooses their own.">
        <SettingsRow label="Theme" description={'Currently ' + mode + ' mode'} htmlFor="parish-theme">
          <Select id="parish-theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={themes.map((t) => ({ value: t.name, label: t.label }))} />
        </SettingsRow>
        <SettingsRow label="Density" description="Compact fits more rows of members and gifts on the screen." htmlFor="parish-density">
          <Select id="parish-density" value={density} onChange={(e) => setDensity(e.target.value)} options={[{ value: 'compact', label: 'Compact' }, { value: 'standard', label: 'Standard' }, { value: 'comfortable', label: 'Comfortable' }]} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Fellowship hall display" description="The screen in the hall shows the day in dark, so it is easy to read across the room." collapsible>
        <ThemeZone mode="dark" surface="default" as="section" label="Fellowship hall display preview">
          <Stack inset="md" gap="sm">
            <Text variant="eyebrow">Today at St. John the Beloved</Text>
            <Text variant="title" as="p">Agape meal · 11:15 AM</Text>
            <Text variant="secondary">Sunday School begins at 11:30 AM in the classrooms.</Text>
            <Inline gap="sm"><Badge tone="active" icon="calendar">Kiahk begins Dec 10</Badge><Badge tone="waiting" icon="clock">Nativity Fast begins Nov 25</Badge></Inline>
          </Stack>
        </ThemeZone>
      </SettingsSection>
    </>
  );
}

function Security({ council, screen }) {
  const toast = useToast();
  const [minutes, setMinutes] = useState(30);
  const [preview, setPreview] = useState(false);
  const [mfa, setMfa] = useState(true);
  const [closing, setClosing] = useState(null);
  const session = useSessionTimeout({ timeout: minutes * 60, warnBefore: 120, onTimeout: () => screen.navigate('/sign-in') });
  return (
    <>
      <SettingsSection title="Sessions" description="Office computers are shared: sign out people who walk away.">
        <SettingsRow label="Sign out after inactivity" description="A warning comes two minutes before." htmlFor="parish-timeout">
          <Select id="parish-timeout" value={String(minutes)} onChange={(e) => setMinutes(Number(e.target.value))} options={[{ value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }]} />
        </SettingsRow>
        <SettingsRow label="The warning" description="What people see before they are signed out.">
          <Button onClick={() => setPreview(true)}>Preview the warning</Button>
        </SettingsRow>
        <SettingsRow label="Require two-step verification" description="Everyone with an office account confirms each sign-in with a code.">
          <Switch labelHidden label="Require two-step verification" checked={mfa} onChange={(e) => setMfa(e.target.checked)} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Office accounts" description="Close the account of someone who no longer serves in the office. Their member record stays.">
        {OFFICE_ACCOUNTS.map((u) => (
          <SettingsRow key={u.id} label={u.name} description={u.role + ' · ' + u.last}>
            {council ? <Text variant="data">{u.account}</Text> : <Button variant="danger-secondary" onClick={() => setClosing(u)}>Close account</Button>}
          </SettingsRow>
        ))}
      </SettingsSection>
      <SessionTimeout state={preview ? 'warning' : session.state} remaining={preview ? 120 : undefined} expiresAt={preview ? undefined : session.expiresAt} idleMinutes={minutes}
        onStay={() => { setPreview(false); session.stay(); }} onSignOut={() => { setPreview(false); session.signOut(); }} onExpire={() => setPreview(false)}
        onSignIn={() => screen.navigate('/sign-in')} />
      <Offboarding open={!!closing} onClose={() => setClosing(null)} accountName={closing ? closing.account : ''} action="delete" strings={{ title: 'Close an office account', complete: 'Close account', cancel: 'Keep the account' }}
        formats={[{ value: 'csv', label: 'CSV (a spreadsheet)' }, { value: 'pdf', label: 'PDF' }]}
        onExport={async () => { await wait(500); toast.show('The account’s notes and sign-ups were exported', { tone: 'success' }); }}
        onConfirm={async () => { await wait(600); toast.show((closing ? closing.name : 'The') + '’s office account was closed', { tone: 'success' }); }}>
        <Text as="p">{closing ? closing.name : ''} will no longer sign in. Their member record, family and giving stay as they are.</Text>
      </Offboarding>
    </>
  );
}

function Audit() {
  const [entries, setEntries] = useState(AUDIT);
  const [loading, setLoading] = useState(false);
  const older = async () => { setLoading(true); await wait(900); setEntries((e) => e.concat(OLDER)); setLoading(false); };
  return (
    <SettingsSection title="Settings history" description="Every change to the parish settings, newest first. The history cannot be changed."
      actions={entries.length < AUDIT.length + OLDER.length ? <Button loading={loading} onClick={older}>Load older entries</Button> : null}>
      <Stack gap="sm">
        <AuditLog entries={entries} variant="diff" label="Settings history" />
        {loading ? <Scrim variant="inverse" contained /> : null}
      </Stack>
    </SettingsSection>
  );
}
