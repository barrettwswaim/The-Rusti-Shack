import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGER_COOKIE_NAME } from '@/lib/managerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-only. Extra-credit raw-table export. Re-checks the manager
// session cookie independently of the /manager page and of every
// other manager-csv route - each route is its own lock.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'OrderID',
  'OrderDate',
  'CustID',
  'LocationID',
  'SalesAssociate',
  'Channel',
  'ShippingFee',
  'OrderTotal',
  'PaymentMethod',
  'StripeSessionID',
  'created_at',
  'updated_at',
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
  const sessionValue = cookieStore.get(MANAGER_COOKIE_NAME)?.value;

  if (!isValidSessionCookieValue(sessionValue)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('Orders')
    .select(COLUMNS.join(', '))
    .order('OrderID', { ascending: true });

  if (error) {
    console.error('Manager CSV (Orders): query failed', error.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  let csv = toCsvRow(COLUMNS);
  for (const row of rows || []) {
    csv += toCsvRow(COLUMNS.map((c) => row[c]));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rusti-shack-orders-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
