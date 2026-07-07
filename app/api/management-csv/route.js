import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-only. Part B parity: same 13-column sales export the old
// /manager page offered, re-hosted here under the new management
// session so the instructor's RustiS2026 password (not the old
// MANAGER_PASSWORD) is what's actually required. Independently
// re-checks the session cookie - not just a page-level check.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'OrderID', 'OrderDate', 'FirstName', 'LastName', 'Country',
  'ProductCode', 'ProductName', 'Quantity', 'UnitPrice', 'LineRevenue',
  'ShippingFee', 'OrderTotal', 'PaymentMethod',
];

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields) {
  return fields.map(csvEscape).join(',') + '\r\n';
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;

  if (!isValidSessionCookieValue(sessionValue)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, ShippingFee, OrderTotal, PaymentMethod')
    .order('OrderDate', { ascending: true });

  if (ordersError) {
    console.error('Management CSV: failed to load Orders', ordersError.message);
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
    console.error('Management CSV: failed to load OrderLines', linesError.message);
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

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rusti-shack-sales-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
