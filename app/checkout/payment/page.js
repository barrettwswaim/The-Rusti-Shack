'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/cartContext';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Placeholder only. No payment form, no card fields, no Stripe, nothing
// that could be mistaken for a real charge. It intentionally receives no
// customer info from the checkout form - name/email/address were never
// stored anywhere to begin with, so there's nothing to pass along. Order
// total comes straight from CartContext, which isn't personal data.
export default function PaymentPlaceholderPage() {
  const { items, hydrated, total } = useCart();

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          {!hydrated && <p className="text-center text-sm text-ink/50">Loading&hellip;</p>}

          {hydrated && items.length === 0 && (
            <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
              <p className="font-heading text-lg font-semibold text-ink">Your cart is empty</p>
              <p className="mt-2 text-sm text-ink/60">There&apos;s nothing here to pay for yet.</p>
              <Link
                href="/shop"
                className="press-scale mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark"
              >
                Keep Shopping
              </Link>
            </div>
          )}

          {hydrated && items.length > 0 && (
            <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
              <span
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lagoon text-ocean"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              </span>

              <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-ink">
                Online Payment Isn&apos;t Connected Yet
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
                We&apos;re still building secure online payment for The Rusti Shack. Nothing has
                been charged, and no order has been placed.
              </p>

              <p className="mt-5 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">
                Order total: <span className="font-semibold">{formatPrice(total)}</span>
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/checkout"
                  className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
                >
                  Back to Checkout
                </Link>
                <Link
                  href="/shop"
                  className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark"
                >
                  Keep Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
