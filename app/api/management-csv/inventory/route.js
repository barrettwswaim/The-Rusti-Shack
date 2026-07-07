import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { getInventoryStatus } from '@/lib/managementData';
import { toCsvRow, csvResponse } from '@/lib/csvUtils';

// Inventory/reorder export. Accepts the same manager-editable
// leadTimeDays/safetyStockDays assumptions the on-screen Inventory
// section uses (?leadTime= / ?safetyStock=, defaults 14 / 7) so an
// export always matches whatever the manager was looking at. See
// INVENTORY_METHOD.md for the full method and why lead time/safety
// stock are labeled assumptions rather than measured data.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'SKU', 'ProductName', 'Category', 'OnHandQty', 'SourceReorderPoint',
  'SaleUnitsTotal', 'RentalUnitsTotal', 'MonthsOfHistory', 'AvgMonthlyDemand',
  'LeadTimeDaysAssumption', 'SafetyStockDaysAssumption', 'ReorderPoint',
  'Status', 'RecommendedAction',
];

const ACTION_TEXT = {
  'Out of Stock': 'Reorder now - zero units on hand.',
  'Recommended for Reorder': 'Place a reorder soon.',
  Low: 'Watch closely - approaching reorder point.',
  OK: 'No action needed right now.',
};

export async function GET(request) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSessionCookieValue(sessionValue)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadTime = Math.max(1, Number(searchParams.get('leadTime')) || 14);
  const safetyStock = Math.max(0, Number(searchParams.get('safetyStock')) || 7);

  let items;
  try {
    items = await getInventoryStatus(leadTime, safetyStock);
  } catch (err) {
    console.error('Inventory CSV: failed to load data', err.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  let csv = toCsvRow(COLUMNS);
  for (const it of items) {
    csv += toCsvRow([
      it.sku,
      it.productName,
      it.category,
      it.onHandQty,
      it.sourceReorderPoint === null ? '' : it.sourceReorderPoint,
      it.saleUnitsTotal,
      it.rentalUnitsTotal,
      it.monthsOfHistory,
      it.avgMonthlyDemand,
      leadTime,
      safetyStock,
      it.reorderPoint,
      it.status,
      ACTION_TEXT[it.status] || '',
    ]);
  }

  return csvResponse(csv, 'rusti-shack-inventory-reorder');
}
