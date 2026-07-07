'use client';

// Client component - recharts needs the browser. All numbers passed in as
// props are already computed server-side in Postgres (see
// lib/managementData.js / migration part_c_reporting_views_and_functions);
// this file only formats and draws them, it never calculates revenue,
// cost, or margin itself.
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const OCEAN = '#1C7A8C';
const OCEAN_DARK = '#12525F';
const CORAL = '#F2734A';
const OCEAN_LIGHT = '#5FA8B8';

const CATEGORY_COLORS = [OCEAN, CORAL, OCEAN_LIGHT, '#8CBBAA', OCEAN_DARK, '#D9A441', '#7C6FA3', '#C97B8A'];

function monthLabel(monthStart) {
  const d = new Date(`${monthStart}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function money(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function moneyFull(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Builds the dynamic, data-driven takeaway title for the revenue/profit
// chart - never a hardcoded string, always computed from the same
// `monthly` array the chart itself renders.
export function buildRevenueChartTitle(monthly, yearLabel) {
  if (!monthly.length) return `Monthly Revenue & Gross Profit - ${yearLabel}`;
  const peak = monthly.reduce((a, b) => (b.totalRevenue > a.totalRevenue ? b : a), monthly[0]);
  if (peak.totalRevenue === 0) return `No Revenue Recorded Yet - ${yearLabel}`;
  const label = new Date(`${peak.monthStart}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return `Revenue Peaked in ${label} at ${money(peak.totalRevenue)}`;
}

export function buildMarginChartTitle(monthly, yearLabel) {
  const withMargin = monthly.filter((m) => m.salesGrossMarginPct !== null);
  if (!withMargin.length) return `Sales Gross Margin % by Month - ${yearLabel}`;
  const best = withMargin.reduce((a, b) => (b.salesGrossMarginPct > a.salesGrossMarginPct ? b : a));
  const worst = withMargin.reduce((a, b) => (b.salesGrossMarginPct < a.salesGrossMarginPct ? b : a));
  const bestLabel = new Date(`${best.monthStart}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const worstLabel = new Date(`${worst.monthStart}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (best.monthStart === worst.monthStart) return `Sales Gross Margin Held Steady at ${best.salesGrossMarginPct}%`;
  return `Sales Margin Ranged ${worst.salesGrossMarginPct}% (${worstLabel}) to ${best.salesGrossMarginPct}% (${bestLabel})`;
}

export function buildSalesVsRentalTitle(monthly, yearLabel) {
  const totalSales = monthly.reduce((s, m) => s + m.salesRevenue, 0);
  const totalRental = monthly.reduce((s, m) => s + m.rentalRevenue, 0);
  const total = totalSales + totalRental;
  if (total === 0) return `Sales vs. Rental Revenue - ${yearLabel}`;
  const rentalShare = Math.round((totalRental / total) * 100);
  return `Rentals Made Up ${rentalShare}% of Revenue in ${yearLabel}`;
}

export function buildCategoryChartTitle(categoryData, yearLabel) {
  if (!categoryData.length) return `Revenue & Profit by Category - ${yearLabel}`;
  const top = categoryData.reduce((a, b) => (b.revenue > a.revenue ? b : a), categoryData[0]);
  if (top.revenue === 0) return `No Category Sales Recorded Yet - ${yearLabel}`;
  return `${top.category} Led All Categories at ${money(top.revenue)} in ${yearLabel}`;
}

// NOTE: buildSeasonalityInsight used to live here, but this file is
// 'use client' (recharts needs the browser) and app/management/page.js
// is a Server Component that calls it as a plain function, not JSX -
// that combination throws at runtime ("not possible to invoke a client
// function from the server"). Moved to lib/managementInsights.js,
// which has no React/browser dependency, so the server can call it
// directly. See that file for the implementation.

function ChartCard({ title, children, height = 280 }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      <h3 className="font-heading text-sm font-semibold text-ink sm:text-base">{title}</h3>
      <div style={{ width: '100%', height }} className="mt-3">
        {children}
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  fontSize: 13,
};

export function RevenueProfitChart({ monthly, yearLabel }) {
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.monthStart) }));
  return (
    <ChartCard title={buildRevenueChartTitle(monthly, yearLabel)}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} />
          <YAxis tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={money} width={56} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => moneyFull(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="totalRevenue" name="Total Revenue" fill={OCEAN_LIGHT} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="salesGrossProfit" name="Gross Profit (Sales)" stroke={CORAL} strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MarginChart({ monthly, yearLabel }) {
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.monthStart) }));
  return (
    <ChartCard title={buildMarginChartTitle(monthly, yearLabel)}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} />
          <YAxis tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={(v) => `${v}%`} width={44} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => (v === null ? 'n/a' : `${v}%`)} />
          <Line type="monotone" dataKey="salesGrossMarginPct" name="Gross Margin % (Sales)" stroke={OCEAN_DARK} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SalesVsRentalChart({ monthly, yearLabel }) {
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.monthStart) }));
  return (
    <ChartCard title={buildSalesVsRentalTitle(monthly, yearLabel)}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} />
          <YAxis tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={money} width={56} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => moneyFull(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="salesRevenue" name="Sales Revenue" stackId="rev" fill={OCEAN} radius={[0, 0, 0, 0]} />
          <Bar dataKey="rentalRevenue" name="Rental Revenue" stackId="rev" fill={CORAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategoryChart({ categoryData, yearLabel }) {
  const data = [...categoryData].sort((a, b) => b.revenue - a.revenue);
  return (
    <ChartCard title={buildCategoryChartTitle(categoryData, yearLabel)} height={Math.max(220, data.length * 44)}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={money} />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#22333B' }} width={110} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => moneyFull(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill={OCEAN} radius={[0, 4, 4, 0]} />
          <Bar dataKey="grossProfit" name="Gross Profit" fill={CORAL} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ChannelTable({ channelPerf }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="min-w-full divide-y divide-black/5 text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            <th className="whitespace-nowrap px-4 py-3">Location</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">Sales Revenue</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">Rental Revenue</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">Orders</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {channelPerf.map((c) => (
            <tr key={c.locationCode}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{c.locationName || c.locationCode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{moneyFull(c.salesRevenue)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{moneyFull(c.rentalRevenue)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{c.orderCount}</td>
            </tr>
          ))}
          {channelPerf.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-ink/50">No channel data yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { CATEGORY_COLORS, monthLabel, money, moneyFull };
// buildSeasonalityInsight is no longer exported from here - import it
// from '@/lib/managementInsights' instead (server-safe).
