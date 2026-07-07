import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  isValidSessionCookieValue,
  MANAGEMENT_COOKIE_NAME,
} from '@/lib/managementAuth';
import {
  getAvailableYears,
  getLast7Days,
  getQuickOverview,
  getRecentOrders,
} from '@/lib/managementData';
import ManagementLoginForm from '@/components/ManagementLoginForm';
import ManagementLogoutButton from '@/components/ManagementLogoutButton';

export const metadata = {
  title: 'Back Office | The Rusti Shack',
  robots: { index: false, follow: false },
};

// Never statically cache this page - it shows private business data and
// must re-check the session cookie fresh on every request (SECURITY.md:
// admin pages check auth on the server, on every request).
export const dynamic = 'force-dynamic';

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
}

function formatPct(value) {
  return value === null || value === undefined ? '-' : `${value}%`;
}

// A short, plain-language takeaway sentence built from the same numbers
// already on the page - never a separate/invented figure.
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

export default async function ManagementPage({ searchParams }) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  const authorized = isValidSessionCookieValue(sessionValue);

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand px-4 py-16">
        <div className="w-full max-w-sm">
          <ManagementLoginForm />
        </div>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const rawYear = resolvedSearchParams?.year;
  const selectedYear = rawYear && rawYear !== 'all' ? Number(rawYear) : null;
  const yearLabel = selectedYear ? String(selectedYear) : 'All Years';

  const [availableYears, last7, overview, recentOrders] = await Promise.all([
    getAvailableYears(),
    getLast7Days(),
    getQuickOverview(selectedYear),
    getRecentOrders(50),
  ]);

  const insight = buildInsight({ overview, yearLabel });

  return (
    <main className="min-h-screen bg-sand px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
              Back Office
            </h1>
            <p className="text-sm text-ink/60">The Rusti Shack - management dashboard</p>
          </div>
          <ManagementLogoutButton />
        </div>

        {/* Global year slicer - every KPI/chart/table on this page reads
            this same `year` query param, so changing it here updates
            everything downstream in one place. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Year:</span>
          <Link
            href="/management"
            className={`press-scale inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium transition-colors ${
              !selectedYear ? 'bg-ocean text-white' : 'bg-white text-ink ring-1 ring-black/10 hover:bg-sand-deep'
            }`}
          >
            All Years
          </Link>
          {availableYears.map((y) => (
            <Link
              key={y}
              href={`/management?year=${y}`}
              className={`press-scale inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium transition-colors ${
                selectedYear === y ? 'bg-ocean text-white' : 'bg-white text-ink ring-1 ring-black/10 hover:bg-sand-deep'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>

        {/* Quick Overview */}
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

        {/* Part B parity: CSV exports, unchanged shape from the original
            /manager page's downloads, just re-hosted here under the new
            management auth. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="/api/management-csv"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
          >
            Download sales (CSV)
          </a>
        </div>

        {/* Part B parity: recent orders table */}
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="min-w-full divide-y divide-black/5 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                <th className="whitespace-nowrap px-4 py-3">Order</th>
                <th className="whitespace-nowrap px-4 py-3">Date</th>
                <th className="whitespace-nowrap px-4 py-3">Customer</th>
                <th className="whitespace-nowrap px-4 py-3">Country</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {recentOrders.map((order) => (
                <tr key={order.OrderID}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{order.OrderID}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.OrderDate}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.customerCountry}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                    {formatMoney(order.OrderTotal)}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-ink/40">
          More sections (Historical Performance, Product Profitability, Customer &amp; Operations
          Insights, Forecasting, Inventory) are being built out below this milestone.
        </p>
      </div>
    </main>
  );
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
