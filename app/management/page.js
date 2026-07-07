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
  getMonthlyPerformance,
  getCategoryPerformance,
  getChannelPerformance,
  getProductProfitability,
  getCustomerTypeBreakdown,
  getGeographyBreakdown,
  getNewVsRepeat,
  getAssociatePerformance,
  getDiscountImpact,
  getSaleVsRentalBehavior,
} from '@/lib/managementData';
import ManagementLoginForm from '@/components/ManagementLoginForm';
import ManagementLogoutButton from '@/components/ManagementLogoutButton';
import {
  RevenueProfitChart,
  MarginChart,
  SalesVsRentalChart,
  CategoryChart,
  ChannelTable,
  buildSeasonalityInsight,
} from '@/components/management/HistoricalPerformanceCharts';
import ProductProfitabilitySection from '@/components/management/ProductProfitabilityTables';
import CustomerOperationsInsights from '@/components/management/CustomerOperationsInsights';
import QuickOverview from '@/components/management/QuickOverview';
import RecentOrdersTable from '@/components/management/RecentOrdersTable';

export const metadata = {
  title: 'Back Office | The Rusti Shack',
  robots: { index: false, follow: false },
};

// Never statically cache this page - it shows private business data and
// must re-check the session cookie fresh on every request (SECURITY.md:
// admin pages check auth on the server, on every request).
export const dynamic = 'force-dynamic';

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

  const [
    availableYears,
    last7,
    overview,
    recentOrders,
    monthly,
    categoryPerf,
    channelPerf,
    productProfitability,
    customerType,
    geography,
    newVsRepeat,
    associates,
    discounts,
    saleVsRental,
  ] = await Promise.all([
    getAvailableYears(),
    getLast7Days(),
    getQuickOverview(selectedYear),
    getRecentOrders(50),
    getMonthlyPerformance(selectedYear),
    getCategoryPerformance(selectedYear),
    getChannelPerformance(selectedYear),
    getProductProfitability(selectedYear),
    getCustomerTypeBreakdown(selectedYear),
    getGeographyBreakdown(selectedYear),
    getNewVsRepeat(selectedYear),
    getAssociatePerformance(selectedYear),
    getDiscountImpact(selectedYear),
    getSaleVsRentalBehavior(selectedYear),
  ]);

  const seasonalityInsight = buildSeasonalityInsight(monthly);

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

        <QuickOverview last7={last7} overview={overview} yearLabel={yearLabel} />

        <RecentOrdersTable recentOrders={recentOrders} />

        {/* Historical Performance */}
        <section className="mt-10">
          <h2 className="font-heading text-lg font-semibold text-ink">Historical Performance</h2>
          <p className="mt-1 text-sm text-ink/60">
            Monthly trends for {yearLabel}. Revenue = sum of line revenue (sales) plus rental
            revenue. Gross profit and margin are calculated for sales only - see Product
            Profitability below for the formula in full.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueProfitChart monthly={monthly} yearLabel={yearLabel} />
            <MarginChart monthly={monthly} yearLabel={yearLabel} />
            <SalesVsRentalChart monthly={monthly} yearLabel={yearLabel} />
            <CategoryChart categoryData={categoryPerf} yearLabel={yearLabel} />
          </div>
          <p className="mt-4 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">{seasonalityInsight}</p>
          <ChannelTable channelPerf={channelPerf} />
        </section>

        <ProductProfitabilitySection products={productProfitability} yearLabel={yearLabel} />

        <CustomerOperationsInsights
          customerType={customerType}
          geography={geography}
          newVsRepeat={newVsRepeat}
          associates={associates}
          discounts={discounts}
          saleVsRental={saleVsRental}
          yearLabel={yearLabel}
        />

        <p className="mt-10 text-xs text-ink/40">
          More sections (Forecasting, Inventory) are being built out below this milestone.
        </p>
      </div>
    </main>
  );
}
