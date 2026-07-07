// Server component - Quick Overview KPI grid + the one-sentence dynamic
// insight built from the exact same numbers shown in the cards above it.
function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
}

function formatPct(value) {
  return value === null || value === undefined ? '-' : `${value}%`;
}

function buildInsight({ overview, yearLabel }) {
  if (overview.totalRevenue === 0) {
    return `No recorded sales or rentals for ${yearLabel} yet.`;
  }
  const rentalShare = overview.totalRevenue > 0 ? (overview.rentalRevenue / overview.totalRevenue) * 100 : 0;
  const marginNote =
    overview.salesGrossMarginPct !== null
      ? `, at a ${overview.salesGrossMarginPct}% gross margin on sales`
      : '';
  const bestSellerNote = overview.bestSeller
    ? ` ${overview.bestSeller.name} was the best-selling product by units (${overview.bestSeller.quantity}).`
    : '';
  return `${yearLabel} brought in ${formatMoney(overview.totalRevenue)} total${marginNote}, with rentals making up ${rentalShare.toFixed(0)}% of revenue.${bestSellerNote}`;
}

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-sm text-ink/60">{sub}</p>}
    </div>
  );
}

export default function QuickOverview({ last7, overview, yearLabel }) {
  const insight = buildInsight({ overview, yearLabel });
  return (
    <section className="mt-6">
      <h2 className="font-heading text-lg font-semibold text-ink">Quick Overview</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Orders, Last 7 Days" value={String(last7.orderCount)} />
        <Kpi label="Revenue, Last 7 Days" value={formatMoney(last7.revenue)} />
        <Kpi label={`${yearLabel} Revenue`} value={formatMoney(overview.totalRevenue)} />
        <Kpi label={`${yearLabel} Gross Profit (Sales)`} value={formatMoney(overview.salesGrossProfit)} />
        <Kpi label={`${yearLabel} Gross Margin % (Sales)`} value={formatPct(overview.salesGrossMarginPct)} />
        <Kpi label="Sales Revenue" value={formatMoney(overview.salesRevenue)} />
        <Kpi label="Rental Revenue" value={formatMoney(overview.rentalRevenue)} />
        <Kpi
          label="Best Seller (by units)"
          value={overview.bestSeller ? overview.bestSeller.name : 'No sales yet'}
          sub={overview.bestSeller ? `${overview.bestSeller.quantity} sold` : null}
        />
      </div>
      <p className="mt-4 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">{insight}</p>
    </section>
  );
}

export { formatMoney, formatPct };
