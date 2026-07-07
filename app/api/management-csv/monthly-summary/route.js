import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { getMonthlyPerformance } from '@/lib/managementData';
import { toCsvRow, csvResponse } from '@/lib/csvUtils';

// Monthly revenue/margin summary export - one row per month, respects
// the dashboard's ?year= slicer. Uses the same mgmt_monthly_performance
// RPC the Historical Performance charts already use, so the export and
// the on-screen charts can never disagree.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'Month', 'SalesRevenue', 'SalesCost', 'SalesGrossProfit', 'SalesGrossMarginPct',
  'RentalRevenue', 'TotalRevenue',
];

export async function GET(request) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSessionCookieValue(sessionValue)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawYear = searchParams.get('year');
  const year = rawYear && rawYear !== 'all' ? Number(rawYear) : null;

  let monthly;
  try {
    monthly = await getMonthlyPerformance(Number.isInteger(year) ? year : null);
  } catch (err) {
    console.error('Monthly summary CSV: failed to load data', err.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  let csv = toCsvRow(COLUMNS);
  for (const m of monthly) {
    csv += toCsvRow([
      m.monthStart,
      m.salesRevenue.toFixed(2),
      m.salesCost.toFixed(2),
      m.salesGrossProfit.toFixed(2),
      m.salesGrossMarginPct === null ? '' : m.salesGrossMarginPct.toFixed(2),
      m.rentalRevenue.toFixed(2),
      m.totalRevenue.toFixed(2),
    ]);
  }

  const label = Number.isInteger(year) ? String(year) : 'all-years';
  return csvResponse(csv, `rusti-shack-monthly-summary-${label}`);
}
