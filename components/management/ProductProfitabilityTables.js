// Server component (no hooks, no client interactivity) - pure formatting
// of numbers already computed in Postgres by mgmt_product_profitability
// (see migration part_c_reporting_views_and_functions). This file never
// invents a cost, a sale/rental split, or a margin - it only sorts and
// flags rows using the values it's given.

function money(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(v) {
  return v === null || v === undefined ? '-' : `${v}%`;
}

// "High sales, weak margin": a product moving above-median volume but
// converting that volume into a below-average gross margin. Both
// thresholds (median quantity, average margin) are computed from the
// exact same dataset shown in the tables above it - never a hardcoded
// number - so the flag adapts to whatever the selected year actually
// looks like.
function computeWeakMarginFlags(products) {
  const withMargin = products.filter((p) => p.grossMarginPct !== null && p.quantity > 0);
  if (withMargin.length < 3) return { flagged: [], medianQty: null, avgMargin: null };

  const sortedQty = [...withMargin].map((p) => p.quantity).sort((a, b) => a - b);
  const medianQty = sortedQty[Math.floor(sortedQty.length / 2)];
  const avgMargin = withMargin.reduce((s, p) => s + p.grossMarginPct, 0) / withMargin.length;

  const flagged = withMargin
    .filter((p) => p.quantity >= medianQty && p.grossMarginPct < avgMargin)
    .sort((a, b) => b.quantity - a.quantity);

  return { flagged, medianQty, avgMargin: Math.round(avgMargin * 10) / 10 };
}

function RankTable({ title, rows, valueLabel, valueFn, valueFormatter = money }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 pt-4">
        <h3 className="font-heading text-sm font-semibold text-ink sm:text-base">{title}</h3>
      </div>
      <table className="mt-2 min-w-full divide-y divide-black/5 text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            <th className="whitespace-nowrap px-4 py-3">#</th>
            <th className="whitespace-nowrap px-4 py-3">Product</th>
            <th className="whitespace-nowrap px-4 py-3">Category</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">{valueLabel}</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">Margin %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((p, i) => (
            <tr key={p.familyKey}>
              <td className="whitespace-nowrap px-4 py-3 text-ink/50">{i + 1}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{p.familyName}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink/70">{p.category || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{valueFormatter(valueFn(p))}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{pct(p.grossMarginPct)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ink/50">No data yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductProfitabilitySection({ products, yearLabel }) {
  const byQuantity = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const byRevenue = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const byProfit = [...products].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 10);
  const { flagged, medianQty, avgMargin } = computeWeakMarginFlags(products);

  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-ink">Product Profitability</h2>
      <p className="mt-1 text-sm text-ink/60">
        {yearLabel}. Formulas used everywhere on this page: Revenue = sum of each order line&apos;s
        revenue; Cost = sum of each line&apos;s recorded cost; Gross Profit = Revenue - Cost; Gross
        Margin % = Gross Profit / Revenue. Rentals have no cost data in the source spreadsheets, so
        rental revenue is not included in these profitability figures (see Historical Performance
        for rental revenue on its own).
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankTable title="Best-Selling by Quantity" rows={byQuantity} valueLabel="Units Sold" valueFn={(p) => p.quantity} valueFormatter={(v) => v.toLocaleString('en-US')} />
        <RankTable title="Best-Selling by Revenue" rows={byRevenue} valueLabel="Revenue" valueFn={(p) => p.revenue} />
        <RankTable title="Most Profitable by Gross Profit" rows={byProfit} valueLabel="Gross Profit" valueFn={(p) => p.grossProfit} />

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="px-4 pt-4">
            <h3 className="font-heading text-sm font-semibold text-ink sm:text-base">High-Volume, Weak-Margin Products</h3>
            <p className="mt-1 text-xs text-ink/50">
              {medianQty === null
                ? 'Not enough products with sales this period to compute this.'
                : `Products selling at or above the median volume (${medianQty} units) but below the average gross margin (${avgMargin}%) for this period.`}
            </p>
          </div>
          <table className="mt-2 min-w-full divide-y divide-black/5 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                <th className="whitespace-nowrap px-4 py-3">Product</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Units</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Revenue</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {flagged.slice(0, 10).map((p) => (
                <tr key={p.familyKey}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{p.familyName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{p.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-ink/70">{money(p.revenue)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-coral-dark">{pct(p.grossMarginPct)}</td>
                </tr>
              ))}
              {flagged.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink/50">No products flagged for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
