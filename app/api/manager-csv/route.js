import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGER_COOKIE_NAME } from '@/lib/managerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-only. Re-checks the manager session cookie independently of
// the /manager page - a direct request to this URL with no valid
// cookie must fail the exact same way the page would (SECURITY.md:
// every admin route checks who you are on the server, on every
// request; never rely on a page-level check alone to protect a
// separate route).
export const dynamic = 'force-dynamic';

// Full order history, not just a recent window - this is the actual
// record-keeping export, distinct from the on-page 7-day snapshot.
// Web order volume is small (started at ORD900001), so a generous cap
// is just headroom, not a real limit in practice.
const CSV_ORDER_LIMIT = 5000;

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

async function loadSalesForExport() {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, OrderTotal, ShippingFee, PaymentMethod')
    .order('OrderDate', { ascending: false })
    .order('OrderID', { ascending: false })
    .limit(CSV_ORDER_LIMIT);

  if (ordersError || !orders) {
    console.error('Manager CSV: failed to load Orders', ordersError?.message);
    return { orders: [], customersById: new Map(), linesByOrderId: new Map(), productNamesBySku: new Map() };
  }

  const custIds = [...new Set(orders.map((o) => o.CustID).filter(Boolean))];
  const orderIds = orders.map((o) => o.OrderID);

  const [{ data: core }, { data: lines }] = await Promise.all([
    custIds.length
      ? supabaseAdmin.from('Customers_Core').select('CustomerID, FirstName, LastName, Country').in('CustomerID', custIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? supabaseAdmin
          .from('OrderLines')
          .select('OrderID, LineNumber, ProductCode, Quantity, UnitPrice, LineRevenue')
          .in('OrderID', orderIds)
          .order('LineNumber', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const customersById = new Map();
  for (const row of core || []) {
    customersById.set(row.CustomerID, {
      firstName: row.FirstName,
      lastName: row.LastName,
      country: row.Country,
    });
  }

  const linesByOrderId = new Map();
  const skus = new Set();
  for (const line of lines || []) {
    const existing = linesByOrderId.get(line.OrderID) || [];
    existing.push(line);
    linesByOrderId.set(line.OrderID, existing);
    skus.add(line.ProductCode);
  }

  const { data: products } = skus.size
    ? await supabaseAdmin.from('products').select('sku, product_name').in('sku', [...skus])
    : { data: [] };

  const productNamesBySku = new Map((products || []).map((p) => [p.sku, p.product_name]));

  return { orders, customersById, linesByOrderId, productNamesBySku };
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGER_COOKIE_NAME)?.value;

  if (!isValidSessionCookieValue(sessionValue)) {
    // Fail closed - vague to the caller, nothing about why.
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { orders, customersById, linesByOrderId, productNamesBySku } = await loadSalesForExport();

  // Exact column set and order as specified - one row per item sold.
  let csv = toCsvRow([
    'OrderID',
    'OrderDate',
    'FirstName',
    'LastName',
    'Country',
    'ProductCode',
    'ProductName',
    'Quantity',
    'UnitPrice',
    'LineRevenue',
    'ShippingFee',
    'OrderTotal',
    'PaymentMethod',
  ]);

  for (const order of orders) {
    const customer = customersById.get(order.CustID);
    const lines = linesByOrderId.get(order.OrderID) || [];

    for (const line of lines) {
      csv += toCsvRow([
        order.OrderID,
        order.OrderDate,
        customer?.firstName || '',
        customer?.lastName || '',
        customer?.country || '',
        line.ProductCode,
        productNamesBySku.get(line.ProductCode) || '',
        line.Quantity,
        line.UnitPrice,
        line.LineRevenue,
        order.ShippingFee,
        order.OrderTotal,
        order.PaymentMethod || '',
      ]);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rusti-shack-sales-${today}.csv"`,
      // Private business data - never cache this response anywhere.
      'Cache-Control': 'no-store',
    },
  });
}
