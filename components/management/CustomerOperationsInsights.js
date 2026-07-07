// Server component - only aggregated figures ever land here (customer
// type, city/country, associate, discount code, product family). No
// individual name/email/phone/address is queried or rendered by this
// section, per SECURITY.md and the assignment's privacy requirement.

function money(v) {
  const n = Number(v) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(v) {
  return v === null || v === undefined ? '-' : `${v}%`;
}

function Card({ title, note, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 pt-4">
        <h3 className="font-heading text-sm font-semibold text-ink sm:text-base">{title}</h3>
        {note && <p className="mt-1 text-xs text-ink/50">{note}</p>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SimpleTable({ columns, rows }) {
  return (
    <table className="min-w-full divide-y divide-black/5 text-left text-sm">
      <thead>
        <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          {columns.map((c) => (
            <th key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.right ? 'text-right' : ''}`}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.right ? 'text-right text-ink/70' : c.emphasize ? 'font-medium text-ink' : 'text-ink/70'}`}>
                {c.format ? c.format(row[c.key]) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-ink/50">No data yet.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function buildNewVsRepeatInsight(newVsRepeat) {
  const total = newVsRepeat.reduce((s, r) => s + r.revenue, 0);
  if (total === 0) return 'Not enough order history yet to compare new vs. repeat customers.';
  const repeat = newVsRepeat.find((r) => /repeat/i.test(r.segment));
  if (!repeat) return 'Not enough data to split new vs. repeat customers for this period.';
  const share = Math.round((repeat.revenue / total) * 100);
  return `Repeat customers accounted for ${share}% of revenue in this period (${repeat.customerCount} customers, ${repeat.orderCount} orders).`;
}

export default function CustomerOperationsInsights({
  customerType,
  geography,
  newVsRepeat,
  associates,
  discounts,
  saleVsRental,
  yearLabel,
}) {
  const topGeography = [...geography].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topAssociates = [...associates].sort((a, b) => (b.salesRevenue + b.rentalRevenue) - (a.salesRevenue + a.rentalRevenue));
  const topSaleVsRental = [...saleVsRental]
    .filter((p) => p.saleQty > 0 && p.rentalQty > 0)
    .sort((a, b) => (b.saleQty + b.rentalQty) - (a.saleQty + a.rentalQty))
    .slice(0, 10);

  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-ink">Customer &amp; Operations Insights</h2>
      <p className="mt-1 text-sm text-ink/60">
        {yearLabel}. Aggregated figures only - no individual customer name, email, phone, or
        address is shown anywhere on this page.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Customer Type">
          <SimpleTable
            columns={[
              { key: 'customerType', label: 'Type', emphasize: true },
              { key: 'customerCount', label: 'Customers', right: true },
              { key: 'orderCount', label: 'Orders', right: true },
              { key: 'revenue', label: 'Revenue', right: true, format: money },
            ]}
            rows={customerType}
          />
        </Card>

        <Card title="New vs. Repeat Customers" note={buildNewVsRepeatInsight(newVsRepeat)}>
          <SimpleTable
            columns={[
              { key: 'segment', label: 'Segment', emphasize: true },
              { key: 'customerCount', label: 'Customers', right: true },
              { key: 'orderCount', label: 'Orders', right: true },
              { key: 'revenue', label: 'Revenue', right: true, format: money },
            ]}
            rows={newVsRepeat}
          />
        </Card>

        <Card title="Top Geography by Revenue" note="Country / city, top 10 by revenue.">
          <SimpleTable
            columns={[
              { key: 'country', label: 'Country', emphasize: true },
              { key: 'city', label: 'City' },
              { key: 'orderCount', label: 'Orders', right: true },
              { key: 'revenue', label: 'Revenue', right: true, format: money },
            ]}
            rows={topGeography}
          />
        </Card>

        <Card title="Sales Associate Performance">
          <SimpleTable
            columns={[
              { key: 'employeeName', label: 'Associate', emphasize: true },
              { key: 'role', label: 'Role' },
              { key: 'orderCount', label: 'Orders', right: true },
              { key: 'salesRevenue', label: 'Sales Revenue', right: true, format: money },
              { key: 'rentalRevenue', label: 'Rental Revenue', right: true, format: money },
            ]}
            rows={topAssociates}
          />
        </Card>

        <Card title="Discount / Promotion Impact" note="Average discount % applied and resulting revenue, by segment.">
          <SimpleTable
            columns={[
              { key: 'segment', label: 'Segment', emphasize: true },
              { key: 'orderCount', label: 'Orders', right: true },
              { key: 'avgDiscountPct', label: 'Avg. Discount', right: true, format: pct },
              { key: 'revenue', label: 'Revenue', right: true, format: money },
            ]}
            rows={discounts}
          />
        </Card>

        <Card title="Rented Before Buying (or Vice Versa)" note="Products bought and rented by enough customers to show a pattern - top 10 by combined volume.">
          <SimpleTable
            columns={[
              { key: 'familyName', label: 'Product', emphasize: true },
              { key: 'saleQty', label: 'Units Sold', right: true },
              { key: 'rentalQty', label: 'Units Rented', right: true },
            ]}
            rows={topSaleVsRental}
          />
        </Card>
      </div>
    </section>
  );
}
