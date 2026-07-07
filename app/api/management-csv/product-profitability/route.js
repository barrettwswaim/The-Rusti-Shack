import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { getProductProfitability } from '@/lib/managementData';
import { toCsvRow, csvResponse } from '@/lib/csvUtils';

// Product profitability export - one row per product family, respects
// the dashboard's ?year= slicer. Same RPC (mgmt_product_profitability)
// backing the Product Profitability section's four cards, so the
// export can never disagree with what's on screen.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'ProductFamily', 'ProductName', 'Category', 'QuantitySold',
  'Revenue', 'Cost', 'GrossProfit', 'GrossMarginPct',
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

  let products;
  try {
    products = await getProductProfitability(Number.isInteger(year) ? year : null);
  } catch (err) {
    console.error('Product profitability CSV: failed to load data', err.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  let csv = toCsvRow(COLUMNS);
  for (const p of products) {
    csv += toCsvRow([
      p.familyKey,
      p.familyName,
      p.category,
      p.quantity,
      p.revenue.toFixed(2),
      p.cost.toFixed(2),
      p.grossProfit.toFixed(2),
      p.grossMarginPct === null ? '' : p.grossMarginPct.toFixed(2),
    ]);
  }

  const label = Number.isInteger(year) ? String(year) : 'all-years';
  return csvResponse(csv, `rusti-shack-product-profitability-${label}`);
}
