import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGER_COOKIE_NAME } from '@/lib/managerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ManagerLoginForm from '@/components/ManagerLoginForm';
import ManagerLogoutButton from '@/components/ManagerLogoutButton';

export const metadata = {
  title: 'Manager | The Rusti Shack',
  robots: { index: false, follow: false },
};

// Never statically cache this page - it shows private business data
// and must always re-check the session cookie fresh on every request
// (SECURITY.md: never render one user's/one business's private data
// into a statically generated page; check auth on the server, on
// every request, not just once).
export const dynamic = 'force-dynamic';

const RECENT_ORDER_LIMIT = 100;

async function loadRecentSales() {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, Channel, OrderTotal, PaymentMethod')
    .order('OrderDate', { ascending: false })
    .order('OrderID', { ascending: false })
    .limit(RECENT_ORDER_LIMIT);

  if (ordersError || !orders) {
    console.error('Manager page: failed to load Orders', ordersError?.message);
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

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : '-';
}

// This page never grants access by itself - it only ever renders the
// sales table after checking, on this exact request, that the session
// cookie is present, unexpired, and correctly signed. Every other
// branch renders nothing but the login form. Not linked anywhere in
// the public nav, but per SECURITY.md that's tidiness, not the lock -
// the check below is the actual lock.
export default async function ManagerPage() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGER_COOKIE_NAME)?.value;
  const authorized = isValidSessionCookieValue(sessionValue);

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand px-4 py-16">
        <div className="w-full max-w-sm">
          <ManagerLoginForm />
        </div>
      </main>
    );
  }

  const { orders, customersById, linesByOrderId } = await loadRecentSales();
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.OrderTotal || 0), 0);

  return (
    <main className="min-h-screen bg-sand px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
              Recent Sales
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Last {orders.length} order{orders.length === 1 ? '' : 's'} - {formatMoney(totalRevenue)} total.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/manager-csv"
              className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
            >
              Download CSV
            </a>
            <ManagerLogoutButton />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="min-w-full divide-y divide-black/5 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                <th className="whitespace-nowrap px-4 py-3">Order</th>
                <th className="whitespace-nowrap px-4 py-3">Date</th>
                <th className="whitespace-nowrap px-4 py-3">Customer</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Channel</th>
                <th className="whitespace-nowrap px-4 py-3">Items</th>
                <th className="whitespace-nowrap px-4 py-3">Payment</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders.map((order) => {
                const customer = customersById.get(order.CustID);
                const lines = linesByOrderId.get(order.OrderID) || [];
                const itemsSummary = lines
                  .map((l) => `${l.ProductCode} x${l.Quantity}`)
                  .join(', ');

                return (
                  <tr key={order.OrderID}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{order.OrderID}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.OrderDate}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{customer?.name || order.CustID}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{customer?.email || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.Channel}</td>
                    <td className="px-4 py-3 text-ink/70">{itemsSummary || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.PaymentMethod || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                      {formatMoney(order.OrderTotal)}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink/50">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
