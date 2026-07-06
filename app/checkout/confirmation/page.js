import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import stripe from '@/lib/stripeClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ConfirmationCartClear from '@/components/ConfirmationCartClear';

export const metadata = {
  title: 'Order Confirmation | The Rusti Shack',
};

// Never statically cache this page - it shows per-visitor order status
// and must always check Stripe/Supabase fresh (SECURITY.md: never render
// one person's data into a statically generated page).
export const dynamic = 'force-dynamic';

// The webhook usually lands before the customer's browser does, but
// there's no hard guarantee. A short, bounded retry (a few seconds, not
// indefinite) covers the normal case without holding the page open long.
async function findOrderBySession(sessionId, attempts = 3, delayMs = 1000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await supabaseAdmin
      .from('Orders')
      .select('OrderID')
      .eq('StripeSessionID', sessionId)
      .maybeSingle();

    if (data) return data;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

// This page never creates or changes an order itself - it only asks
// Stripe "is this session actually paid?" and, if so, looks up the order
// the webhook already created. Visiting this URL with a fake or unpaid
// session ID shows no order number at all.
export default async function ConfirmationPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sessionId = resolvedSearchParams?.session_id;

  let verifiedPaid = false;
  let order = null;
  let statusMessage = null;

  if (!sessionId) {
    statusMessage = "We couldn't find that order. If you just paid, check your email for a receipt.";
  } else {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verifiedPaid = session.payment_status === 'paid';

      if (verifiedPaid) {
        order = await findOrderBySession(sessionId);
      } else {
        statusMessage = "This order hasn't completed payment yet.";
      }
    } catch (err) {
      console.error('Confirmation page: could not retrieve Stripe session', err.message);
      statusMessage = "We couldn't verify that order.";
    }
  }

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
            {verifiedPaid && order && (
              <>
                <span
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lagoon text-ocean"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-ink">
                  Thanks for Your Order!
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
                  Your payment went through and your order is confirmed. We&apos;ll get it packed
                  and shipped from Apo Island.
                </p>

                <p className="mt-5 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">
                  Order number: <span className="font-semibold">{order.OrderID}</span>
                </p>

                <div className="mt-6">
                  <Link
                    href="/shop"
                    className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark"
                  >
                    Keep Shopping
                  </Link>
                </div>
              </>
            )}

            {verifiedPaid && !order && (
              <>
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
                  Finishing Up Your Order
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
                  Your payment went through - we&apos;re just finishing writing up your order.
                  Refresh this page in a moment to see your order number.
                </p>
              </>
            )}

            {!verifiedPaid && (
              <>
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
                  We Couldn&apos;t Confirm This Order
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">{statusMessage}</p>
                <div className="mt-6">
                  <Link
                    href="/cart"
                    className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
                  >
                    Back to Cart
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <ConfirmationCartClear shouldClear={verifiedPaid} />
      <Footer />
    </>
  );
}
