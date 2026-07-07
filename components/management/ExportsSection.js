// Central download hub for every protected CSV export beyond the
// Part B parity one already on the Recent Orders table. Every link
// below points at a route that independently re-checks the management
// session cookie server-side (see each route.js under
// app/api/management-csv/*) - nothing here is reachable without being
// logged into /management first.
const LINK_STYLE =
  'press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ocean-dark shadow-sm ring-1 ring-black/10 transition-colors hover:bg-sand-deep';

export default function ExportsSection({ yearParam, yearLabel }) {
  const yq = yearParam ? `?year=${yearParam}` : '';
  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-ink">Exports</h2>
      <p className="mt-1 text-sm text-ink/60">
        Every export below is protected the same way this page is - the download route
        checks the management login session on the server before returning any data.
        Filtered exports respect the {yearLabel} selection above.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`/api/management-csv/sales-detail${yq}`} className={LINK_STYLE}>
          Sales detail ({yearLabel})
        </a>
        <a href={`/api/management-csv/monthly-summary${yq}`} className={LINK_STYLE}>
          Monthly revenue &amp; margin ({yearLabel})
        </a>
        <a href={`/api/management-csv/product-profitability${yq}`} className={LINK_STYLE}>
          Product profitability ({yearLabel})
        </a>
        <a href="/api/management-csv/inventory" className={LINK_STYLE}>
          Inventory &amp; reorder
        </a>
        <a href="/api/management-csv/forecast" className={LINK_STYLE}>
          Forecast output
        </a>
      </div>
    </section>
  );
}
