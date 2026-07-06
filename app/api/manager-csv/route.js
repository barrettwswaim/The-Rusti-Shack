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

// A slightly wider window than the on-page table (which is meant for
// a quick glance) since this is the actual record-keeping export.
const CSV_ORDER_LIMIT = 1000;

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
    .select('OrderID, OrderDate, CustID, Channel, OrderTotal, PaymentMethod')
    .order('OrderDate', { ascending: false })
    .order('OrderID', { ascending: false })
    .limit(CSV_ORDER_LIMIT);

  if (ordersError || !orders) {
    console.error('Manager CSV: failed to load Orders', ordersError?.message);
    return { orders: [], customersById: new Map(), linesByOrderId: new Map() };
  }

  const custIds = [...new Set(orders.map((o) => o.CustID).filter(Boolean))];
  const orderIds = orders.map((o) => o.OrderID);

  const [{ data: core }, { data: contact }, { data: lines }] = await Promise.all([
    custIds.length
      ? supabaseAdmin.from('Customers_Core').select('CustomerID, FirstName, LastName').in('CustomerID', custIds)
      : Promise.resolve({ data: [] }),
    custIds.length
      ? supabaseAdmin.from('Customers_Contact').select('CustomerID, Email').in('CustomerID', custIds)
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
    customersById.set(row.CustomerID, { name: `${row.FirstName} ${row.LastName}`.trim(), email: null });
  }
  for (const row of contact || []) {
    const existing = customersById.get(row.CustomerID) || { name: null, email: null };
    existing.email = row.Email;
    customersById.set(row.CustomerID, existing);
  }

  const linesByOrderId = new Map();
  for (const line of lines || []) {
    const existing = linesByOrderId.get(line.OrderID) || [];
    existing.push(line);
    linesByOrderId.set(line.OrderID, existing);
  }

  return { orders, customersById, linesByOrderId };
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGER_COOKIE_NAME)?.value;

  if (!isValidSessionCookieValue(sessionValue)) {
    // Fail closed - vague to the caller, nothing about why.
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { orders, customersById, linesByOrderId } = await loadSalesForExport();

  let csv = toCsvRow([
    'OrderID',
    'OrderDate',
    'CustomerName',
    'CustomerEmail',
    'Channel',
    'PaymentMethod',
    'OrderTotal',
    'LineNumber',
    'ProductCode',
    'Quantity',
    'UnitPrice',
    'LineRevenue',
  ]);

  for (const order of orders) {
    const customer = customersById.get(order.CustID);
    const lines = linesByOrderId.get(order.OrderID) || [];
    const rows = lines.length ? lines : [null];

    for (const line of rows) {
      csv += toCsvRow([
        order.OrderID,
        order.OrderDate,
        customer?.name || order.CustID,
        customer?.email || '',
        order.Channel,
        order.PaymentMethod || '',
        order.OrderTotal,
        line?.LineNumber ?? '',
        line?.ProductCode ?? '',
        line?.Quantity ?? '',
        line?.UnitPrice ?? '',
        line?.LineRevenue ?? '',
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
