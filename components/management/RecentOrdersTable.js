import { formatMoney } from '@/components/management/QuickOverview';

// Part B parity: same recent-orders table shape as the old /manager page,
// independent of the year slicer since it's always "recent."
export default function RecentOrdersTable({ recentOrders }) {
  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href="/api/management-csv"
          className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
        >
          Download sales (CSV)
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
            {recentOrders.map((order) => (
              <tr key={order.OrderID}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{order.OrderID}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.OrderDate}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.customerName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink/70">{order.customerCountry}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                  {formatMoney(order.OrderTotal)}
                </td>
              </tr>
            ))}
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
    </>
  );
}
