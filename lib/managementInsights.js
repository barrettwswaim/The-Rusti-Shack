// Plain server-safe helper functions for /management. Deliberately NOT
// in components/management/HistoricalPerformanceCharts.js (which is
// 'use client', for recharts) - a Server Component can render a
// Client Component's JSX, but it cannot call a plain function exported
// from a 'use client' module directly (that throws at runtime: "It's
// not possible to invoke a client function from the server"). This
// file has no React/browser dependency, so it's safe to import and
// call straight from app/management/page.js's server code.

// Plain-language seasonality note built from monthly data, grouped by
// calendar quarter (Q1-Q4) rather than assuming a specific "dive
// season" the source data doesn't actually label.
export function buildSeasonalityInsight(monthly) {
  if (!monthly.length) return 'Not enough monthly data yet to identify a seasonal pattern.';
  const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const m of monthly) {
    const month = new Date(`${m.monthStart}T00:00:00`).getMonth();
    const q = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
    quarters[q] += m.totalRevenue;
  }
  const total = Object.values(quarters).reduce((a, b) => a + b, 0);
  if (total === 0) return 'No revenue recorded yet - a seasonal pattern will show once orders come in.';
  const [topQ, topRevenue] = Object.entries(quarters).reduce((a, b) => (b[1] > a[1] ? b : a));
  const share = Math.round((topRevenue / total) * 100);
  const qLabel = { Q1: 'January-March', Q2: 'April-June', Q3: 'July-September', Q4: 'October-December' }[topQ];
  return `${topQ} (${qLabel}) is the strongest quarter across the selected period, bringing in ${share}% of total revenue.`;
}
