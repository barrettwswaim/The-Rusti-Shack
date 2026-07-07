import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { toCsvRow, csvResponse } from '@/lib/csvUtils';

// Filtered sales detail export - same shape as the Part B parity export
// at /api/management-csv, but respects the dashboard's ?year= slicer so
// a manager can download just the year they're looking at. Re-checks
// the session cookie independently of the page (never trust page-level
// auth alone for a data-returning route).
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'OrderID', 'OrderDate', 'FirstName', 'LastName', 'Country',
  'ProductCode', 'ProductName', 'Quantity', 'UnitPrice', 'LineRevenue',
  'ShippingFee', 'OrderTotal', 'PaymentMethod',
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

  let ordersQuery = supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, ShippingFee, OrderTotal, PaymentMethod')
    .order('OrderDate', { ascending: true });

  if (Number.isInteger(year)) {
    ordersQuery = ordersQuery.gte('OrderDate', `${year}-01-01`).lt('OrderDate', `${year + 1}-01-01`);
  }

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) {
    console.error('Sales detail CSV: failed to load Orders', ordersError.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  const orderIds = (orders || []).map((o) => o.OrderID);
  const custIds = [...new Set((orders || []).map((o) => o.CustID).filter(Boolean))];

  const [{ data: lines, error: linesError }, { data: customers }, { data: products }] = await Promise.all([
    orderIds.length
      ? supabaseAdmin.from('OrderLines').select('OrderID, ProductCode, Quantity, UnitPrice, LineRevenue').in('OrderID', orderIds)
      : Promise.resolve({ data: [] }),
    custIds.length
      ? supabaseAdmin.from('Customers_Core').select('CustomerID, FirstName, LastName, Country').in('CustomerID', custIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from('products').select('sku, product_name'),
  ]);

  if (linesError) {
    console.error('Sales detail CSV: failed to load OrderLines', linesError.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  const customersById = new Map((customers || []).map((c) => [c.CustomerID, c]));
  const productNameBySku = new Map((products || []).map((p) => [p.sku, p.product_name]));
  const linesByOrder = new Map();
  for (const line of lines || []) {
    if (!linesByOrder.has(line.OrderID)) linesByOrder.set(line.OrderID, []);
    linesByOrder.get(line.OrderID).push(line);
  }

  let csv = toCsvRow(COLUMNS);
  for (const order of orders || []) {
    const customer = customersById.get(order.CustID);
    const orderLines = linesByOrder.get(order.OrderID) || [];
    for (const line of orderLines) {
      csv += toCsvRow([
        order.OrderID,
        order.OrderDate,
        customer?.FirstName || '',
        customer?.LastName || '',
        customer?.Country || '',
        line.ProductCode,
        productNameBySku.get(line.ProductCode) || line.ProductCode,
        line.Quantity,
        line.UnitPrice,
        line.LineRevenue,
        order.ShippingFee,
        order.OrderTotal,
        order.PaymentMethod,
      ]);
    }
  }

  const label = Number.isInteger(year) ? String(year) : 'all-years';
  return csvResponse(csv, `rusti-shack-sales-detail-${label}`);
}
