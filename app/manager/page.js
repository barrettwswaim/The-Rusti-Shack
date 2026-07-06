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

const RECENT_ORDERS_LIMIT = 50;

function dateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : '-';
}

async function loadDashboardData() {
  const sevenDaysAgo = dateDaysAgo(7);

  // --- Last-7-days orders + revenue, and last-7-days best-seller ---
  const { data: recentOrdersForStats, error: statsOrdersError } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderTotal')
    .gte('OrderDate', sevenDaysAgo);

  if (statsOrdersError) {
    console.error('Manager page: failed to load 7-day Orders', statsOrdersError.message);
  }

  const ordersLast7Days = recentOrdersForStats?.length || 0;
  const revenueLast7Days = (recentOrdersForStats || []).reduce(
    (sum, o) => sum + Number(o.OrderTotal || 0),
    0
  );

  let bestSeller = null;
  const statsOrderIds = (recentOrdersForStats || []).map((o) => o.OrderID);
  if (statsOrderIds.length) {
    const { data: recentLines, error: linesError } = await supabaseAdmin
      .from('OrderLines')
      .select('ProductCode, Quantity')
      .in('OrderID', statsOrderIds);

    if (linesError) {
      console.error('Manager page: failed to load 7-day OrderLines', linesError.message);
    } else if (recentLines?.length) {
      const qtyByProduct = new Map();
      for (const line of recentLines) {
        qtyByProduct.set(line.ProductCode, (qtyByProduct.get(line.ProductCode) || 0) + line.Quantity);
      }
      const [topSku, topQty] = [...qtyByProduct.entries()].sort((a, b) => b[1] - a[1])[0];

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('product_name')
        .eq('sku', topSku)
        .maybeSingle();

      bestSeller = { sku: topSku, name: product?.product_name || topSku, quantity: topQty };
    }
  }

  // --- Recent-orders table (independent of the 7-day stats window) ---
  const { data: recentOrders, error: recentOrdersError } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, OrderTotal')
    .order('OrderDate', { ascending: false })
    .order('OrderID', { ascending: false })
    .limit(RECENT_ORDERS_LIMIT);

  if (recentOrdersError) {
    console.error('Manager page: failed to load recent Orders', recentOrdersError.message);
  }

  const custIds = [...new Set((recentOrders || []).map((o) => o.CustID).filter(Boolean))];
  const { data: customers } = custIds.length
    ? await supabaseAdmin.from('Customers_Core').select('CustomerID, FirstName, LastName, Country').in('CustomerID', custIds)
    : { data: [] };

  const customersById = new Map();
  for (const row of customers || []) {
    customersById.set(row.CustomerID, {
      name: `${row.FirstName} ${row.LastName}`.trim(),
      country: row.Country || '-',
    });
  }

  return {
    ordersLast7Days,
    revenueLast7Days,
    bestSeller,
    recentOrders: recentOrders || [],
    customersById,
  };
}

// This page never grants access by itself - it only ever renders sales
// data after checking, on this exact request, that the session cookie
// is present, unexpired, and correctly signed. Every other branch
// renders nothing but the login form. Not linked anywhere in the
// public nav, but per SECURITY.md that's tidiness, not the lock - the
// check below is the actual lock, re-run on every single request.
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

  const { ordersLast7Days, revenueLast7Days, bestSeller, recentOrders, customersById } =
    await loadDashboardData();

  return (
    <main className="min-h-screen bg-sand px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
            Manager Dashboard
          </h1>
          <ManagerLogoutButton />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Orders, Last 7 Days
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-ink">{ordersLast7Days}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Revenue, Last 7 Days
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-ink">
              {formatMoney(revenueLast7Days)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Best Seller, Last 7 Days
            </p>
            <p className="mt-2 font-heading text-lg font-semibold text-ink">
              {bestSeller ? bestSeller.name : 'No sales yet'}
            </p>
            {bestSeller && <p className="text-sm text-ink/60">{bestSeller.quantity} sold</p>}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="/api/manager-csv"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
          >
            Download sales (CSV)
          </a>
          <a
            href="/api/manager-csv/orders"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
          >
            Orders (CSV)
          </a>
          <a
            href="/api/manager-csv/order-lines"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
          >
            Order Lines (CSV)
          </a>
          <a
            href="/api/manager-csv/customers-core"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
          >
            Customers Core (CSV)
          </a>
          <a
            href="/api/manager-csv/customers-contact"
            className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
          >
            Customers Contact (CSV)
          </a>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="min-w-full divide-y divide-black/5 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                <th className="whitespace-nowrap px-4 py-3">Order</th>
                <th className="whitespace-nowrap px-4 py-3">Date</th>
                <th className="whitespace-nowrap px-4 py-3">Customer</th>
                <th className="whitespace-nowrap px-4 py-3">Country</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {recentOrders.map((order) => {
                const customer = customersById.get(order.CustID);
                return (
                  <tr key={order.OrderID}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{order.OrderID}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.OrderDate}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{customer?.name || order.CustID}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{customer?.country || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                      {formatMoney(order.OrderTotal)}
                    </td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
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
