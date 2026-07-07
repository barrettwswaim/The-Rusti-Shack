'use client';

import { useMemo, useState } from 'react';

// Lead time and safety stock are NOT in the source data (see
// INVENTORY_METHOD.md / DATA_IMPORT_REPORT.md section 6) - they are
// manager-editable assumptions, clearly labeled as such, never presented
// as measured facts. Everything else here (on-hand qty, monthly demand,
// months of real history) comes straight from real sales + rental data.
const DEFAULT_LEAD_TIME = 14;
const DEFAULT_SAFETY_STOCK = 7;

const STATUS_STYLES = {
  'Out of Stock': 'bg-red-100 text-red-700',
  'Recommended for Reorder': 'bg-coral/15 text-coral',
  Low: 'bg-amber-100 text-amber-700',
  OK: 'bg-lagoon text-ocean-dark',
};

const ACTION_TEXT = {
  'Out of Stock': 'Reorder now - zero units on hand.',
  'Recommended for Reorder': 'Place a reorder soon.',
  Low: 'Watch closely - approaching reorder point.',
  OK: 'No action needed right now.',
};

function statusFor(onHand, reorderPoint) {
  if (onHand <= 0) return 'Out of Stock';
  if (onHand <= reorderPoint) return 'Recommended for Reorder';
  if (onHand <= reorderPoint * 1.5) return 'Low';
  return 'OK';
}

export default function InventoryStatusSection({ items }) {
  const [leadTime, setLeadTime] = useState(DEFAULT_LEAD_TIME);
  const [safetyStock, setSafetyStock] = useState(DEFAULT_SAFETY_STOCK);
  const [showInfo, setShowInfo] = useState(false);
  const [filter, setFilter] = useState('attention');

  const computed = useMemo(() => {
    return items
      .map((it) => {
        const reorderPoint = Math.round(it.dailyDemand * (leadTime + safetyStock) * 10) / 10;
        const status = statusFor(it.onHandQty, reorderPoint);
        return { ...it, reorderPoint, status };
      })
      .sort((a, b) => {
        const rank = { 'Out of Stock': 0, 'Recommended for Reorder': 1, Low: 2, OK: 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return b.avgMonthlyDemand - a.avgMonthlyDemand;
      });
  }, [items, leadTime, safetyStock]);

  const counts = useMemo(() => {
    const c = { 'Out of Stock': 0, 'Recommended for Reorder': 0, Low: 0, OK: 0 };
    computed.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [computed]);

  const visible = filter === 'attention'
    ? computed.filter((r) => r.status !== 'OK')
    : computed;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-ink">Inventory &amp; Reorder</h2>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="press-scale inline-flex min-h-[36px] items-center rounded-full bg-white px-3 text-xs font-semibold text-ocean-dark ring-1 ring-black/10 hover:bg-sand-deep"
        >
          How is this calculated?
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Demand rate is computed from real sales + rental history (all locations, all years).
        Lead time and safety stock are not in the source data, so they are manager-editable
        assumptions below - change them and every row recalculates instantly.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <label className="text-xs font-semibold text-ink/70">
          Lead time (days, assumption)
          <input
            type="number"
            min={1}
            value={leadTime}
            onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 block w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-semibold text-ink/70">
          Safety stock (days, assumption)
          <input
            type="number"
            min={0}
            value={safetyStock}
            onChange={(e) => setSafetyStock(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 block w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} className={`rounded-full px-3 py-1 font-semibold ${STATUS_STYLES[k]}`}>{k}: {v}</span>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('attention')}
            className={`press-scale inline-flex min-h-[32px] items-center rounded-full px-3 text-xs font-medium ${filter === 'attention' ? 'bg-ocean text-white' : 'bg-white text-ink ring-1 ring-black/10'}`}
          >
            Needs attention
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`press-scale inline-flex min-h-[32px] items-center rounded-full px-3 text-xs font-medium ${filter === 'all' ? 'bg-ocean text-white' : 'bg-white text-ink ring-1 ring-black/10'}`}
          >
            All products
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/50">
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">On Hand</th>
              <th className="px-4 py-3">Monthly Demand</th>
              <th className="px-4 py-3">Reorder Point</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.sku} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs text-ink/70">{r.sku}</td>
                <td className="px-4 py-2.5 text-ink">{r.productName}</td>
                <td className="px-4 py-2.5 text-ink">{r.onHandQty}</td>
                <td className="px-4 py-2.5 text-ink/80">{r.avgMonthlyDemand.toFixed(1)}/mo</td>
                <td className="px-4 py-2.5 text-ink/80">{r.reorderPoint.toFixed(1)}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 text-ink/70">{ACTION_TEXT[r.status]}</td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink/50">No products need attention right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowInfo(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-semibold text-ink">How reorder point is calculated</h3>
            <p className="mt-3 text-sm text-ink/70">
              <strong className="text-ink">Reorder Point = Expected Demand During Lead Time + Safety Stock.</strong>
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Daily demand is real: total sale units + rental units for this SKU, divided by the
              number of months of order history available (spans the shop&apos;s full history, all
              locations), divided by ~30.44 days/month.
            </p>
            <p className="mt-2 text-sm text-ink/70">
              <strong className="text-ink">Lead time and safety stock are assumptions</strong>, not
              measured data - our source spreadsheets don&apos;t track supplier lead times or a
              target safety-stock policy. The defaults (14 days lead time, 7 days safety stock) are
              reasonable starting points; adjust them above for your real supplier terms and they
              recalculate every row immediately.
            </p>
            <p className="mt-2 text-sm text-ink/70">
              <strong className="text-ink">Status:</strong> Out of Stock (0 on hand), Recommended
              for Reorder (at or below reorder point), Low (within 1.5x the reorder point), OK
              (comfortably above it).
            </p>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="press-scale mt-5 inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-ocean px-4 text-sm font-semibold text-white hover:bg-ocean-dark"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
