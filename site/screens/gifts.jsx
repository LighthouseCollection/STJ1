/* St. John the Beloved test site · Giving history (site/screens/gifts.jsx): every gift of the year. All 10,000 GIFTS in
   one VirtualList (only the rows in view are drawn; each row says its place, aria-setsize 10000; a row opens the gift in a
   Drawer); the notes givers left with online gifts in a VirtualList whose rows take their own height (mode variable); and
   the same gifts in a DataGrid in its default "fill" mode, grouped by fund with a sum of the amounts in each
   group's header (summaries), narrowed by the fund and method Selects. Every gift and amount is made up. */
import { DataGrid, Drawer, Field, Heading, Inline, PageContent, PropertyList, Select, Stack, Text, VirtualList, formatCurrency, formatDate, formatNumber } from 'plenix-platform';
import { FUNDS, GIFTS, familyById, memberById } from '../data.js';
import { SitePage } from '../site.jsx';
const { useState, useMemo } = React;

const usd = (n) => formatCurrency(n, 'USD');
const day = (iso) => formatDate(iso + 'T12:00:00');
const FUND = Object.fromEntries(FUNDS.map((f) => [f.id, f.name]));

// one row per gift for the list (label, a muted line, the amount at the end) and for the grid (the fund's name to group by)
const ITEMS = GIFTS.map((g) => ({ id: g.id, label: g.name, description: FUND[g.fund] + ' · ' + g.method + ' · ' + day(g.date), meta: usd(g.amount), icon: 'field-currency', gift: g }));
const ROWS = GIFTS.map((g) => ({ id: g.id, date: g.date, name: g.name, fund: FUND[g.fund], method: g.method, amount: g.amount }));

// the notes givers wrote with their online gifts: one to three sentences each, so every row has its own height
const NOTE_LINES = ['For the Feast of St. John the Beloved.', 'In memory of my grandmother, who served the Agape Kitchen for many years.',
  'For the youth trip.', 'Please use this for the food pantry before the Nativity Fast.', 'Thank you to the Sunday School servants.',
  'For the new fellowship hall. May the work go well.', 'For the hymns books of the Deacons’ School.'];
const NOTES = GIFTS.filter((g) => g.method === 'Online').slice(0, 2000).map((g, i) => ({ id: 'note-' + g.id, gift: g,
  text: NOTE_LINES.slice(0, 1 + (i % 3)).map((_, k) => NOTE_LINES[(i + k * 2) % NOTE_LINES.length]).join(' ') }));

const COLUMNS = [
  { title: 'Gift', field: 'id', kind: 'data', width: '--plx-ref-size-80px' },
  { title: 'Date', field: 'date', type: 'date', kind: 'data', sorter: 'date', render: (g) => day(g.date) },
  { title: 'Member', field: 'name', kind: 'name', filter: true },
  { title: 'Fund', field: 'fund', filter: 'list' },
  { title: 'Method', field: 'method', filter: 'list' },
  { title: 'Amount', field: 'amount', type: 'currency', align: 'end', summary: 'sum', render: (g) => usd(g.amount) },
];

const FUND_OPTIONS = [{ value: '', label: 'Every fund' }].concat(FUNDS.map((f) => ({ value: f.name, label: f.name })));
const METHOD_OPTIONS = [{ value: '', label: 'Every method' }].concat(['Card', 'Check', 'Cash', 'Bank transfer', 'Online'].map((m) => ({ value: m, label: m })));

export function GiftsScreen({ chrome }) {
  const [open, setOpen] = useState(null);
  const [fund, setFund] = useState('');
  const [method, setMethod] = useState('');
  const filter = useMemo(() => (fund || method ? (g) => (!fund || g.fund === fund) && (!method || g.method === method) : undefined), [fund, method]);
  const total = GIFTS.reduce((s, g) => s + g.amount, 0);
  const giver = open ? memberById(open.member) : null;
  return (
    <SitePage chrome={chrome} page="workspace">
      <PageContent>
        <Stack gap="section">
          <Stack gap="xs">
            <Heading level={1}>Giving history</Heading>
            <Text as="p" variant="secondary">{formatNumber(GIFTS.length)} gifts this year, {usd(total)} in all. Open a gift to see who gave it and how.</Text>
          </Stack>

          <Stack gap="sm">
            <Heading level={2}>Every gift</Heading>
            <VirtualList label="Every gift" items={ITEMS} showCount height="md" onItemOpen={(item) => setOpen(item.gift)} />
          </Stack>

          <Stack gap="sm">
            <Heading level={2}>Notes left with online gifts</Heading>
            <VirtualList label="Notes left with online gifts" mode="variable" items={NOTES} showCount height="sm"
              renderItem={(n) => <Stack gap="none"><Text variant="strong">{n.gift.name}</Text><Text>{n.text}</Text></Stack>} />
          </Stack>

          <Stack gap="sm">
            <Inline justify="between" align="end" wrap>
              <Heading level={2}>Gifts by fund</Heading>
              <Inline gap="sm" wrap>
                <Field label="Fund"><Select value={fund} onChange={(e) => setFund(e.target.value)} options={FUND_OPTIONS} /></Field>
                <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={METHOD_OPTIONS} /></Field>
              </Inline>
            </Inline>
            <DataGrid label="Gifts by fund" data={ROWS} columns={COLUMNS} groupBy="fund" filter={filter} sort={[{ field: 'date', dir: 'desc' }]}
              onRowDoubleClick={(row) => setOpen(GIFTS.find((g) => g.id === row.id))} />
          </Stack>
        </Stack>
      </PageContent>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? 'Gift ' + open.id : ''} size="sm">
        {open ? (
          <PropertyList>
            <PropertyList.Item label="Member">{open.name}</PropertyList.Item>
            {giver && familyById(giver.family) ? <PropertyList.Item label="Household">{familyById(giver.family).name}</PropertyList.Item> : null}
            <PropertyList.Item label="Fund">{FUND[open.fund]}</PropertyList.Item>
            <PropertyList.Item label="Amount" data>{usd(open.amount)}</PropertyList.Item>
            <PropertyList.Item label="Method">{open.method}</PropertyList.Item>
            <PropertyList.Item label="Received" data>{day(open.date)}</PropertyList.Item>
          </PropertyList>
        ) : null}
      </Drawer>
    </SitePage>
  );
}
