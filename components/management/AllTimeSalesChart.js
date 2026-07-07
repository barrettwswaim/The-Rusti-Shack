'use client';

// All-time sales trend - deliberately NOT filtered by the dashboard's
// year slicer, unlike every chart in the Historical Performance
// section. Reuses the same all-years monthly data already fetched for
// Forecasting (see app/management/page.js's `monthlyAllYears`), so no
// extra query is needed. Numbers themselves are computed server-side
// in Postgres (mgmt_monthly_performance) - this file only formats and
// draws them.
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const OCEAN = '#1C7A8C';
const OCEAN_LIGHT = '#5FA8B8';
const CORAL = '#F2734A';

function monthLabel(monthStart) {
  const d = new Date(`${monthStart}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function monthLabelFull(monthStart) {
  const d = new Date(`${monthStart}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function money(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function moneyFull(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildInsight(monthly) {
  if (!monthly.length) return 'No sales recorded yet.';
  const total = monthly.reduce((s, m) => s + m.totalRevenue, 0);
  const peak = monthly.reduce((a, b) => (b.totalRevenue > a.totalRevenue ? b : a), monthly[0]);
  if (total === 0) return 'No sales recorded yet.';
  return `${monthly.length} months of history, ${money(total)} in total revenue. Best month: ${monthLabelFull(peak.monthStart)} at ${money(peak.totalRevenue)}.`;
}

// Skips X-axis tick labels so mobile screens don't get an unreadable
// wall of text when there are many months of history - shows roughly
// one label per 6 months regardless of total range.
function tickInterval(monthCount) {
  return Math.max(0, Math.ceil(monthCount / 12) - 1);
}

export default function AllTimeSalesChart({ monthly }) {
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.monthStart) }));

  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-ink">All-Time Sales Trend</h2>
      <p className="mt-1 text-sm text-ink/60">
        Every month of revenue on record, sales and rental combined - not affected by the
        year filter above, so you can see the whole picture in one chart.
      </p>
      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#22333B' }}
                interval={tickInterval(data.length)}
              />
              <YAxis tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={money} width={56} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 13 }}
                formatter={(v) => moneyFull(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="salesRevenue" name="Sales Revenue" stackId="rev" fill={OCEAN} radius={[0, 0, 0, 0]} />
              <Bar dataKey="rentalRevenue" name="Rental Revenue" stackId="rev" fill={OCEAN_LIGHT} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke={CORAL} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">{buildInsight(monthly)}</p>
      </div>
    </section>
  );
}
