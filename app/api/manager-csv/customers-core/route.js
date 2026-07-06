import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGER_COOKIE_NAME } from '@/lib/managerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-only. Extra-credit raw-table export. Re-checks the manager
// session cookie independently of every other manager-csv route.
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'CustomerID',
  'FirstName',
  'LastName',
  'CustomerType',
  'JoinDate',
  'City',
  'Country',
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
    .from('Customers_Core')
    .select(COLUMNS.join(', '))
    .order('CustomerID', { ascending: true });

  if (error) {
    console.error('Manager CSV (Customers_Core): query failed', error.message);
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
      'Content-Disposition': `attachment; filename="rusti-shack-customers-core-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
