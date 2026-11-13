/* St. John the Beloved test site · Donations and pledges (site/screens/giving.jsx): the giving office's overview of
   the year. Key figures (Metric, Metric.Group), each fund against its goal (BulletChart), how the general fund's year
   went from its opening balance to today (WaterfallChart), gifts and givers per month (ComboChart), and the pledges in a
   DataGrid in "pages" mode that asks fetchRows for each page (a made-up server, rowHeight "medium"). The actions:
   SplitButton (Record a gift, with Record a pledge and Import gifts in its menu: each opens a Dialog that validates and
   says what it saved in a toast), DownloadButton (the year's giving statement as a CSV file) and usePrint (Print
   statement). Every gift, pledge and amount is made up. */
import {
  Badge, BulletChart, Button, ComboChart, Columns, Dialog, DataGrid, DownloadButton, Field, FileInput, Heading, Inline, Input,
  MenuItem, Metric, NumberInput, Notice, PageContent, Select, SplitButton, Stack, Text, WaterfallChart, formatCurrency,
  formatNumber, useToast, usePrint,
} from 'plenix-platform';
import { FUNDS, GIFTS, GIVING_BY_MONTH, MEMBERS, PLEDGES, memberById, CHURCHCRM } from '../data.js';
import { ChurchCrmNotice, SitePage } from '../site.jsx';
const { useState, useMemo } = React;

const usd = (n) => formatCurrency(n, 'USD');
const dollars = (n) => formatCurrency(n, 'USD', { decimals: 0 });   // chart axes and labels: whole dollars
const fundName = (id) => (FUNDS.find((f) => f.id === id) || { name: id }).name;
const MONTHS = GIVING_BY_MONTH.map((m) => m.label);

// gifts and givers per month, from the giving history
const BY_MONTH = MONTHS.map((label, i) => {
  const gifts = GIFTS.filter((g) => Number(g.date.slice(5, 7)) === i + 1);
  return { label, amount: Math.round(gifts.reduce((s, g) => s + g.amount, 0)), givers: new Set(gifts.map((g) => g.member)).size };
});

// the general fund's year: the balance carried over, the gifts by quarter, and what the parish spent (made up)
const quarter = (from, to) => GIVING_BY_MONTH.filter((m) => m.month >= from && m.month <= to).reduce((s, m) => s + m.general, 0);
const GENERAL_YEAR = [
  { label: 'Carried over from 2025', value: 48200, total: true },
  { label: 'Gifts, January to March', value: quarter(1, 3) },
  { label: 'Gifts, April to June', value: quarter(4, 6) },
  { label: 'Gifts, July to September', value: quarter(7, 9) },
  { label: 'Gifts, October', value: quarter(10, 10) },
  { label: 'Clergy support', value: -128000 },
  { label: 'Utilities and upkeep', value: -46400 },
  { label: 'Sunday School and youth', value: -18600 },
  { label: 'Outreach and the food pantry', value: -12300 },
];

const PLEDGE_TONES = { 'On track': ['active', 'progress'], Behind: ['action-required', 'alert'], Complete: ['success', 'circle-check'] };
const PLEDGE_ROWS = PLEDGES.map((p) => Object.assign({}, p, { fundName: fundName(p.fund), remaining: Math.max(0, p.amount - p.paid) }));

// a made-up server: sorts and pages the pledges, a moment later, like a request would
function fetchPledges({ page, size, sort }) {
  const rows = PLEDGE_ROWS.slice();
  (sort || []).slice().reverse().forEach(({ field, dir }) => {
    rows.sort((a, b) => { const x = a[field], y = b[field]; const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y)); return dir === 'desc' ? -c : c; });
  });
  return new Promise((resolve) => setTimeout(() => resolve({ rows: rows.slice((page - 1) * size, page * size), total: rows.length }), 160));
}

const PLEDGE_COLUMNS = [
  { title: 'Pledge', field: 'id', kind: 'data', width: '--plx-ref-size-80px' },
  { title: 'Member', field: 'name', kind: 'name' },
  { title: 'Fund', field: 'fundName' },
  { title: 'Pledged', field: 'amount', type: 'currency', align: 'right', headerAlign: 'right', render: (p) => usd(p.amount) },
  { title: 'Paid', field: 'paid', type: 'currency', align: 'right', headerAlign: 'right', render: (p) => usd(p.paid) },
  { title: 'Remaining', field: 'remaining', type: 'currency', align: 'right', headerAlign: 'right', render: (p) => usd(p.remaining) },
  { title: 'Frequency', field: 'frequency' },
  { title: 'Status', field: 'status', kind: 'center', render: (p) => <Badge tone={PLEDGE_TONES[p.status][0]} icon={PLEDGE_TONES[p.status][1]}>{p.status}</Badge> },
];

// the year's giving statement as a CSV file (one line per fund)
const STATEMENT = ['Fund,Goal,Raised'].concat(FUNDS.map((f) => '"' + f.name + '",' + f.goal + ',' + f.raised)).join('\n');
const STATEMENT_HREF = 'data:text/csv;charset=utf-8,' + encodeURIComponent(STATEMENT);

const MEMBER_OPTIONS = [{ value: '', label: 'Choose a member' }].concat(MEMBERS.filter((m) => m.status === 'active').map((m) => ({ value: m.id, label: m.name })));
const FUND_OPTIONS = FUNDS.map((f) => ({ value: f.id, label: f.name }));
const METHOD_OPTIONS = ['Card', 'Check', 'Cash', 'Bank transfer', 'Online'].map((m) => ({ value: m, label: m }));

// Record a gift and Record a pledge: one dialog, two kinds; both check the member and the amount before saving
function RecordDialog({ kind, onClose, onSaved }) {
  const pledge = kind === 'pledge';
  const [v, setV] = useState({ member: '', fund: pledge ? 'building' : 'general', amount: null, method: 'Check', frequency: 'Monthly', date: '2026-10-25' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setV(Object.assign({}, v, { [k]: e && e.target ? e.target.value : e }));
  const save = () => {
    const next = {};
    if (!v.member) next.member = 'Choose the member who gave.';
    if (!v.amount || v.amount <= 0) next.amount = 'Enter an amount above zero.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSaved(v);
  };
  return (
    <Dialog open onClose={onClose} title={pledge ? 'Record a pledge' : 'Record a gift'} size="sm"
      description={pledge ? 'A promise to give over the year. Payments are recorded as gifts.' : 'A gift received by the church office.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{pledge ? 'Save pledge' : 'Save gift'}</Button></>}>
      <Stack gap="md">
        <Field label="Member" required error={errors.member}><Select value={v.member} onChange={set('member')} options={MEMBER_OPTIONS} /></Field>
        <Field label="Fund"><Select value={v.fund} onChange={set('fund')} options={FUND_OPTIONS} /></Field>
        <Field label={pledge ? 'Amount pledged for the year' : 'Amount'} required error={errors.amount}>
          <NumberInput value={v.amount} onChange={(n) => setV(Object.assign({}, v, { amount: n }))} format="currency" currency="USD" min={0} width="sm" />
        </Field>
        {pledge
          ? <Field label="Paid"><Select value={v.frequency} onChange={set('frequency')} options={['Monthly', 'Quarterly', 'Yearly'].map((x) => ({ value: x, label: x }))} /></Field>
          : <Field label="Method"><Select value={v.method} onChange={set('method')} options={METHOD_OPTIONS} /></Field>}
        {pledge ? null : <Field label="Date received"><Input type="date" value={v.date} onChange={set('date')} /></Field>}
      </Stack>
    </Dialog>
  );
}

function ImportDialog({ onClose, onImported }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const run = () => { if (!files.length) { setError('Choose a file to import.'); return; } onImported(files[0]); };
  return (
    <Dialog open onClose={onClose} title="Import gifts" size="sm" description="Add a batch of gifts from the bank's or the giving provider's export."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={run}>Import</Button></>}>
      <Stack gap="md">
        <Field label="Gifts file" description="A CSV file with the member, fund, amount and date of each gift." error={error}>
          <FileInput accept=".csv" onChange={(f) => { setFiles(f); setError(''); }} />
        </Field>
        <Notice tone="info">Gifts that match one already recorded are skipped, so a file can be imported twice safely.</Notice>
      </Stack>
    </Dialog>
  );
}

export function GivingScreen({ chrome }) {
  const toast = useToast();
  const { print } = usePrint();
  const [dialog, setDialog] = useState(null);
  const raised = FUNDS.reduce((s, f) => s + f.raised, 0);
  const givers = useMemo(() => new Set(GIFTS.map((g) => g.member)).size, []);
  const pledged = PLEDGES.reduce((s, p) => s + p.amount, 0), paid = PLEDGES.reduce((s, p) => s + p.paid, 0);
  const saved = (v) => {
    const who = (memberById(v.member) || {}).name;
    toast.show((dialog === 'pledge' ? 'Pledge of ' : 'Gift of ') + usd(v.amount) + ' recorded for ' + who + ' (' + fundName(v.fund) + ').', { tone: 'success' });
    setDialog(null);
  };
  return (
    <SitePage chrome={chrome} page="dashboard">
      <PageContent>
        <ChurchCrmNotice status={CHURCHCRM} />
        <Stack gap="section">
          <Inline justify="between" align="start" wrap>
            <Stack gap="xs">
              <Heading level={1}>Donations and pledges</Heading>
              <Text as="p" variant="secondary">Giving to every fund of the parish, January to October 2026.</Text>
            </Stack>
            <Inline gap="sm" wrap>
              <SplitButton variant="primary" icon="add" label="Record a gift" onClick={() => setDialog('gift')} menuLabel="More ways to record giving">
                <MenuItem icon="checklist" onSelect={() => setDialog('pledge')}>Record a pledge</MenuItem>
                <MenuItem icon="import" onSelect={() => setDialog('import')}>Import gifts</MenuItem>
              </SplitButton>
              <DownloadButton href={STATEMENT_HREF} fileName="giving-statement-2026.csv" format="CSV" size={STATEMENT.length}>Giving statement</DownloadButton>
              <Button icon="document" onClick={() => print({ title: 'Giving statement 2026 · St. John the Beloved' })}>Print statement</Button>
            </Inline>
          </Inline>

          <Metric.Group label="Giving this year">
            <Metric size="lg" value={usd(raised)} label="Given to every fund" change="+6%" changeTone="success" description="Since January 1"
              trend={GIVING_BY_MONTH.map((m) => m.general + m.building + m.pantry)} trendLabel="Given per month, January to October" />
            <Metric size="lg" value={formatNumber(GIFTS.length)} label="Gifts recorded" description="Every method" />
            <Metric size="lg" value={formatNumber(givers)} label="Givers" description="Members who gave this year" />
            <Metric size="lg" value={usd(pledged)} label="Pledged" change={Math.round((paid / pledged) * 100) + '% paid'} description={formatNumber(PLEDGES.length) + ' pledges'} />
          </Metric.Group>

          <Columns count={2} collapseBelow="wide">
            <Stack>
              <BulletChart title="Funds against their goals" description="The feast agape fund passed its goal; the building fund is a little past half."
                items={FUNDS.filter((f) => f.id !== 'building').map((f) => ({ id: f.id, label: f.name, value: f.raised, target: f.goal, ranges: [f.goal * 0.5, f.goal * 0.8, f.goal * 1.2] }))}
                valueLabel="Given (USD)" format={dollars} />
              <BulletChart title="The fellowship hall building fund" description="684,300 given of the 1.2 million needed."
                items={FUNDS.filter((f) => f.id === 'building').map((f) => ({ id: f.id, label: 'Building fund', value: f.raised, target: f.goal, ranges: [f.goal * 0.4, f.goal * 0.75, f.goal] }))}
                valueLabel="Given (USD)" format={dollars} size="sm" />
            </Stack>
            <Stack>
              <WaterfallChart title="The general fund's year" description="Gifts covered clergy support and upkeep, and the balance grew."
                data={GENERAL_YEAR} endLabel="Balance today" format={dollars} yLabel="USD" />
            </Stack>
          </Columns>

          <ComboChart title="Gifts and givers per month" description="Gifts held steady through the summer; the number of givers stayed near the whole parish."
            categories={MONTHS} bars={[{ id: 'amount', label: 'Given', values: BY_MONTH.map((m) => m.amount) }]}
            lines={[{ id: 'givers', label: 'Givers', values: BY_MONTH.map((m) => m.givers) }]} axis="dual" barLabel="Given (USD)" lineLabel="Givers"
            formatBar={dollars} formatLine={formatNumber} />

          <Stack gap="sm">
            <Heading level={2}>Pledges</Heading>
            <DataGrid label="Pledges" columns={PLEDGE_COLUMNS} mode="pages" pageSize={10} pageSizes={[10, 20, 40]} fetchRows={fetchPledges} rowHeight="medium" />
          </Stack>
        </Stack>
      </PageContent>
      {dialog === 'gift' || dialog === 'pledge' ? <RecordDialog key={dialog} kind={dialog} onClose={() => setDialog(null)} onSaved={saved} /> : null}
      {dialog === 'import' ? <ImportDialog onClose={() => setDialog(null)} onImported={(f) => { toast.show(f.name + ' is being imported. The gifts appear in the history when it is done.', { tone: 'info' }); setDialog(null); }} /> : null}
    </SitePage>
  );
}
