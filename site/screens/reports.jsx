/* St. John the Beloved test site · Reports (site/screens/reports.jsx): the parish council's reports for October 2026.
   Attendance (general counts of people at services, never anything else): LineChart by month, AreaChart of the education
   meetings, HeatMap by weekday and service, Sparkline rows per service, and one custom chart built from ChartFrame with its
   parts (Axis, GridLines, ChartLegend, ChartTooltip, DataLabel, ReferenceLine, ChartAnnotation, ChartBrush to zoom, on
   useChartInteraction). Giving: PieChart of gifts by method, Gauge of the building fund, BoxPlot of gift sizes,
   SankeyDiagram of funds to their uses. Ministries: RadarChart of ministry health, LollipopChart of servants, ScatterChart
   of members and servants, BarChart of members by district. Growth: FunnelChart from first visit to registered member,
   WordCloud of sermon topics, and ComparisonView of this year against last. Every number is made up.
   The custom chart's line takes ChartFrame's documented mark class (plx-chart__line): a custom chart's marks have no other way to take their
   color (tests/site-check.js allows ChartFrame's mark classes). */
import {
  Anchor, AreaChart, Axis, BarChart, BoxPlot, ChartAnnotation, ChartBrush, ChartFocusMark, ChartFrame, ChartLegend, ChartTooltip, Columns,
  ComparisonView, DataLabel, FunnelChart, Gauge, GridLines, Heading, HeatMap, Inline, LineChart, LollipopChart, MenuBar, MenuBarMenu, MenuDivider, MenuItem, PageContent, Panel,
  PieChart, RadarChart, ReferenceLine, SankeyDiagram, ScatterChart, Sparkline, Stack, Text, WordCloud, chartTooltipText,
  formatCurrency, formatNumber, scaleBand, scaleLinear, scalePosition, seriesColor, useChartInteraction,
} from 'plenix-platform';
import { FUNDS, GIFTS, MEMBERS, MINISTRIES } from '../data.js';
import { SitePage } from '../site.jsx';
const { useMemo } = React;

const usd = (n) => formatCurrency(n, 'USD');
const dollars = (n) => formatCurrency(n, 'USD', { decimals: 0 });   // chart axes and labels: whole dollars
// a small fixed random sequence, so the made-up numbers are the same on every load
function seq(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
const rnd = seq(2026);
const around = (v, spread) => Math.round(v + (rnd() - 0.5) * 2 * spread);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASON = [1.0, 1.06, 1.12, 1.2, 1.02, 0.94, 0.84, 0.86, 1.04, 1.08];   // Great Lent and the Resurrection up, summer down

// people at each service, the average per month
const BY_MONTH = MONTHS.map((month, i) => ({ month, liturgy: around(452 * SEASON[i], 14), vespers: around(118 * SEASON[i], 8), midweek: around(76 * SEASON[i], 6) }));
const MEETINGS = MONTHS.map((month, i) => ({ month, school: i === 6 || i === 7 ? around(22, 4) : around(148, 9), youth: around(46 * (i === 6 ? 0.7 : 1), 5), study: around(38, 4) }));

// every Sunday of 2026 so far: people at the Divine Liturgy (Great Lent and the Feast of the Resurrection on April 12)
const WEEKS = [];
for (let d = new Date(Date.UTC(2026, 0, 4)); d <= new Date(Date.UTC(2026, 9, 25)); d = new Date(d.getTime() + 7 * 864e5)) {
  const m = d.getUTCMonth(), day = d.getUTCDate(), iso = d.toISOString().slice(0, 10);
  const easter = iso === '2026-04-12', lent = iso >= '2026-02-15' && iso <= '2026-04-05';
  WEEKS.push({ id: WEEKS.length + 1, iso, label: MONTH_NAMES[m] + ' ' + day, people: easter ? 712 : around(452 * SEASON[Math.min(m, 9)] * (lent ? 1.05 : 1), 22) });
}
// ChartFrame's documented mark class for a line (system/charts.css): strokes the path in its data-viz color
const LENT = ['Feb 15', 'Apr 5'];
const EASTER = WEEKS.findIndex((w) => w.iso === '2026-04-12');
const AVERAGE = Math.round(WEEKS.reduce((s, w) => s + w.people, 0) / WEEKS.length);

// the custom chart: every Sunday's attendance, drawn from the frame and its parts; drag or Shift with the arrows to zoom
function SundayAttendance() {
  const series = [{ id: 'people', label: 'People at the Sunday Divine Liturgy' }];
  const describe = ({ c }) => chartTooltipText({ title: WEEKS[c].label, items: [{ label: 'People', value: formatNumber(WEEKS[c].people) }] });
  const ia = useChartInteraction({ rows: 1, columns: WEEKS.length, series, zoom: true, describe, labelOf: (c) => WEEKS[c].label });
  const table = { columns: [{ title: 'Sunday', field: 'label', kind: 'name', rowLabel: true }, { title: 'People', field: 'shown', kind: 'data', align: 'right' }],
    data: WEEKS.map((w) => ({ id: w.id, label: w.label, shown: formatNumber(w.people) })) };
  return (
    <ChartFrame title="Every Sunday this year" size="lg" interaction={ia} table={table}
      description={'About ' + formatNumber(AVERAGE) + ' people come to the Sunday Divine Liturgy; the Feast of the Resurrection drew the most, ' + formatNumber(WEEKS[EASTER].people) + '. Great Lent is shaded.'}
      legend={<ChartLegend items={[{ id: 'people', label: series[0].label, color: seriesColor(0), value: formatNumber(AVERAGE) + ' on average' }]} shape="line" />}>
      {({ inner, margin }) => {
        const [v0, v1] = ia.view();
        const shown = WEEKS.slice(v0, v1 + 1);
        const x = scaleBand({ domain: shown.map((w) => w.label), range: [0, inner.width] });
        const y = scaleLinear({ domain: [0, Math.max.apply(null, WEEKS.map((w) => w.people))], range: [inner.height, 0], nice: true });
        const px = (c) => scalePosition(x, WEEKS[c].label);
        const columnAt = (mx) => { let best = v0, gap = Infinity; for (let c = v0; c <= v1; c++) { const g = Math.abs(px(c) - mx); if (g < gap) { gap = g; best = c; } } return best; };
        ia.register({ nearest: (mx) => ({ r: 0, c: columnAt(mx) }), columnAt });
        const path = shown.map((w, k) => (k ? 'L' : 'M') + px(v0 + k) + ',' + y(w.people)).join(' ');
        const step = Math.max(1, Math.ceil(shown.length / 8));
        const lent = LENT.map((l) => x(l)).every((p) => p !== undefined);
        const peak = EASTER >= v0 && EASTER <= v1;
        const a = ia.active && ia.active.c >= v0 && ia.active.c <= v1 ? ia.active.c : null;
        return (
          <g>
            <GridLines scale={y} inner={inner} />
            {lent ? <ChartAnnotation kind="range" x={px(WEEKS.findIndex((w) => w.label === LENT[0]))} x2={px(WEEKS.findIndex((w) => w.label === LENT[1]))} inner={inner} label="Great Lent" /> : null}
            <path className="plx-chart__line" data-plx-dataviz={seriesColor(0)} d={path} />
            <ReferenceLine scale={y} value={AVERAGE} inner={inner} label="Average" />
            <Axis scale={y} orient="left" inner={inner} margin={margin} />
            <Axis scale={x} orient="bottom" inner={inner} margin={margin} ticks={shown.filter((w, k) => k % step === 0).map((w) => w.label)} />
            {peak ? <DataLabel x={px(EASTER)} y={y(WEEKS[EASTER].people)} value={WEEKS[EASTER].people} position="end" /> : null}
            {peak ? <ChartAnnotation x={px(EASTER)} y={y(WEEKS[EASTER].people)} inner={inner} label="Feast of the Resurrection" placement="bottom" /> : null}
            {ia.brush ? <ChartBrush x0={px(ia.brush[0])} x1={px(ia.brush[1])} inner={inner} /> : null}
            {a !== null ? <ChartFocusMark x={px(a)} y={y(WEEKS[a].people)} color={seriesColor(0)} /> : null}
            {a !== null ? <ChartTooltip x={px(a)} y={y(WEEKS[a].people)} inner={inner} title={WEEKS[a].label} titleKind="data"
              items={[{ label: 'People', value: formatNumber(WEEKS[a].people), color: seriesColor(0) }]} /> : null}
          </g>
        );
      }}
    </ChartFrame>
  );
}

// people by weekday and service: a service that is not held that day is a missing value
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KINDS = ['Divine Liturgy', 'Vespers and Midnight Praises', 'Bible Study', 'Youth Meeting', 'Agpeya prayers'];
const HEAT = [
  [458, null, null, null, 31], [null, null, null, null, 9], [null, null, null, null, 11], [74, null, 41, null, 12],
  [null, 26, null, null, 10], [null, null, null, 46, 8], [null, 117, null, null, 14],
];

const SPARK_ROWS = [
  { label: 'Sunday Divine Liturgy', values: WEEKS.slice(-12).map((w) => w.people) },
  { label: 'Saturday Vespers and Midnight Praises', values: Array.from({ length: 12 }, () => around(118, 12)) },
  { label: 'Wednesday Divine Liturgy', values: Array.from({ length: 12 }, () => around(76, 8)) },
  { label: 'Bible Study', values: Array.from({ length: 12 }, () => around(39, 6)) },
  { label: 'Youth Meeting', values: Array.from({ length: 12 }, () => around(46, 7)) },
];

const METHOD_LIST = ['Card', 'Check', 'Cash', 'Bank transfer', 'Online'];
const DISTRICTS = ['North', 'South', 'East', 'West'];
const SERMONS = [
  ['love', 48], ['repentance', 37], ['prayer', 44], ['fasting', 31], ['the Nativity', 22], ['St. John the Beloved', 27], ['humility', 25], ['the Cross', 21],
  ['forgiveness', 29], ['the Psalms', 14], ['service', 26], ['the family', 19], ['the Gospel of St. John', 9], ['hope', 17], ['the saints', 20], ['patience', 13],
  ['thanksgiving', 16], ['the Good Shepherd', 18], ['light', 11], ['the Agpeya', 12], ['peace', 15], ['faith', 33], ['charity', 23], ['the Resurrection', 28],
].map(([text, value]) => ({ text, value }));

const SECTIONS = [{ id: 'reports-attendance', label: 'Attendance' }, { id: 'reports-giving', label: 'Giving' }, { id: 'reports-ministries', label: 'Ministries' }, { id: 'reports-growth', label: 'Growth' }];

export function ReportsScreen({ chrome }) {
  const byMethod = useMemo(() => METHOD_LIST.map((m) => ({ id: m, label: m, value: Math.round(GIFTS.filter((g) => g.method === m).reduce((s, g) => s + g.amount, 0)) })), []);
  const sizes = useMemo(() => FUNDS.map((f) => ({ id: f.id, label: f.name, values: GIFTS.filter((g) => g.fund === f.id).map((g) => g.amount) })), []);
  const districts = useMemo(() => DISTRICTS.map((d) => MEMBERS.filter((m) => m.district === d)), []);
  const building = FUNDS.find((f) => f.id === 'building');
  return (
    <SitePage chrome={chrome} page="dashboard">
      <PageContent>
        <Stack gap="section">
          <Stack gap="xs">
            <Heading level={1}>Reports</Heading>
            <Text as="p" variant="secondary">For the parish council's meeting of October 28, 2026. Attendance is the number of people at each service.</Text>
          </Stack>

          <MenuBar label="Report">
            <MenuBarMenu label="File">
              <MenuItem onSelect={() => window.print()}>Print this report</MenuItem>
              <MenuDivider />
              <MenuItem onSelect={() => { location.hash = '#/print/membership-form'; }}>Open the membership form</MenuItem>
            </MenuBarMenu>
            <MenuBarMenu label="Go to">
              {SECTIONS.map((x) => <MenuItem key={x.id} onSelect={() => document.getElementById(x.id)?.scrollIntoView()}>{x.label}</MenuItem>)}
            </MenuBarMenu>
          </MenuBar>
          <Anchor items={SECTIONS} label="On this page" />

          <Stack gap="md">
            <Heading level={2} id="reports-attendance">Attendance</Heading>
            <SundayAttendance />
            <Columns count={2} collapseBelow="wide">
              <LineChart title="People at services, by month" description="Attendance rose through Great Lent and the Resurrection and dipped in the summer."
                data={BY_MONTH} x="month" yLabel="People, average per service" points
                series={[{ id: 'liturgy', label: 'Sunday Divine Liturgy' }, { id: 'vespers', label: 'Saturday Vespers' }, { id: 'midweek', label: 'Wednesday Divine Liturgy' }]} />
              <AreaChart title="The education meetings" description="Sunday School takes the summer off; the Youth Meeting and Bible Study keep meeting."
                data={MEETINGS} x="month" stack="stacked" yLabel="People, average per meeting"
                series={[{ id: 'study', label: 'Bible Study' }, { id: 'youth', label: 'Youth Meeting' }, { id: 'school', label: 'Sunday School' }]} />
            </Columns>
            <Columns count={2} collapseBelow="wide">
              <HeatMap title="People by weekday and service" description="Sunday morning gathers the most; the daily Agpeya prayers keep a faithful few."
                rows={DAYS} columns={KINDS} values={HEAT} valueLabel="People" />
              <Panel icon="chart" title="The last twelve weeks" description="Each service's attendance, oldest first.">
                <Stack gap="sm">
                  {SPARK_ROWS.map((r) => (
                    <Inline key={r.label} gap="md" justify="between">
                      <Text>{r.label}</Text>
                      <Inline gap="sm">
                        <Sparkline values={r.values} showLast label={r.label + ', people, last 12 weeks'} />
                        <Text variant="data">{formatNumber(r.values[r.values.length - 1])}</Text>
                      </Inline>
                    </Inline>
                  ))}
                </Stack>
              </Panel>
            </Columns>
          </Stack>

          <Stack gap="md">
            <Heading level={2} id="reports-giving">Giving</Heading>
            <Columns count={2} collapseBelow="wide">
              <PieChart variant="donut" title="Gifts by method" description="Cards and checks bring in most of the giving." data={byMethod} format={dollars} centerLabel="Given this year" />
              <Stack>
                <Gauge title="The fellowship hall building fund" description="How much of the building's cost has been given."
                  value={Math.round((building.raised / building.goal) * 100)} format={(v) => v + '%'} label={'of ' + usd(building.goal)} size="lg" />
              </Stack>
            </Columns>
            <BoxPlot title="Gift sizes by fund" description="Most gifts are between about 140 and 380 dollars in every fund. The box holds the middle half of the gifts."
              groups={sizes} valueLabel="Gift (USD)" format={dollars} />
            <SankeyDiagram title="Where the giving goes" description="The general fund carries clergy support and upkeep; the building fund goes to the fellowship hall."
              format={dollars}
              nodes={[{ id: 'general', label: 'General fund' }, { id: 'building', label: 'Building fund' }, { id: 'pantry', label: 'Food pantry' }, { id: 'youth', label: 'Youth trip' },
                { id: 'clergy', label: 'Clergy support' }, { id: 'upkeep', label: 'Utilities and upkeep' }, { id: 'education', label: 'Sunday School and youth' },
                { id: 'hall', label: 'Fellowship hall' }, { id: 'outreach', label: 'Outreach' }]}
              links={[{ source: 'general', target: 'clergy', value: 128000 }, { source: 'general', target: 'upkeep', value: 46400 }, { source: 'general', target: 'education', value: 18600 },
                { source: 'general', target: 'outreach', value: 12300 }, { source: 'building', target: 'hall', value: 412000 }, { source: 'pantry', target: 'outreach', value: 24800 },
                { source: 'youth', target: 'education', value: 7200 }]} />
          </Stack>

          <Stack gap="md">
            <Heading level={2} id="reports-ministries">Ministries</Heading>
            <Columns count={2} collapseBelow="wide">
              <RadarChart title="Ministry health" description="Sunday School is strong everywhere but outreach; the Agape Kitchen needs more servants."
                axes={[{ key: 'attendance', label: 'Attendance' }, { key: 'servants', label: 'Servants' }, { key: 'growth', label: 'Growth' }, { key: 'retention', label: 'Retention' }, { key: 'outreach', label: 'Outreach' }]}
                series={[{ id: 'school', label: 'Sunday School', values: { attendance: 9, servants: 8, growth: 7, retention: 9, outreach: 4 } },
                  { id: 'youth', label: 'Youth Meeting', values: { attendance: 7, servants: 5, growth: 8, retention: 6, outreach: 7 } },
                  { id: 'agape', label: 'Agape Kitchen', values: { attendance: 8, servants: 4, growth: 5, retention: 8, outreach: 9 } }]} max={10} />
              <LollipopChart title="Servants by ministry" description="The Food Pantry and the Agape Kitchen have the most servants." sort="desc" valueTitle="Servants"
                data={MINISTRIES.map((m) => ({ label: m.name, value: m.servants }))} />
            </Columns>
            <Columns count={2} collapseBelow="wide">
              <ScatterChart title="Members and servants of each ministry" description="Most ministries have one servant for every three or four members; the outreach ministries are served by all their members."
                xTitle="Members" yTitle="Servants" trend series={[{ id: 'ministries', label: 'Ministries', points: MINISTRIES.map((m) => ({ x: m.members, y: m.servants, label: m.name })) }]} />
              <BarChart title="Members by district" description="The four districts are close in size; most members in each are active."
                orientation="vertical" layout="stacked" categories={DISTRICTS} valueLabel="Members"
                series={[{ id: 'active', label: 'Active', values: districts.map((l) => l.filter((m) => m.status === 'active').length) },
                  { id: 'other', label: 'Visitors, moved away or inactive', values: districts.map((l) => l.filter((m) => m.status !== 'active').length) }]} />
            </Columns>
          </Stack>

          <Stack gap="md">
            <Heading level={2} id="reports-growth">Growth</Heading>
            <Columns count={2} collapseBelow="wide">
              <FunnelChart title="From first visit to member, 2026" description="Most visitors come back; the largest drop is before they join a ministry." valueTitle="People"
                data={[{ label: 'Visited for the first time', value: 214 }, { label: 'Came back', value: 138 }, { label: 'Met with a priest', value: 96 }, { label: 'Joined a ministry', value: 61 }, { label: 'Registered as members', value: 44 }]} />
              <WordCloud title="Sermon topics this year" description="Love, prayer and repentance were preached most often." words={SERMONS} valueLabel="Sermons" />
            </Columns>
            <Stack gap="sm">
              <Heading level={3}>This year and last</Heading>
              <ComparisonView label="This year and last" modes={['columns', 'matrix']}
                items={[{ id: '2025', title: '2025', meta: 'January to October 2025', values: { sunday: '431', families: '112', given: dollars(986400), givers: '341', servants: '118', visitors: '187' } },
                  { id: '2026', title: '2026', meta: 'January to October 2026', values: { sunday: formatNumber(AVERAGE), families: '120', given: dollars(FUNDS.reduce((s, f) => s + f.raised, 0)), givers: '362', servants: '118', visitors: '214' } }]}
                attributes={[{ key: 'sunday', label: 'People at the Sunday Divine Liturgy, on average', kind: 'data' }, { key: 'families', label: 'Households', kind: 'data' },
                  { key: 'given', label: 'Given to every fund', kind: 'data' }, { key: 'givers', label: 'Givers', kind: 'data' }, { key: 'servants', label: 'Servants', kind: 'data' },
                  { key: 'visitors', label: 'First-time visitors', kind: 'data' }]} />
            </Stack>
          </Stack>
        </Stack>
      </PageContent>
    </SitePage>
  );
}
