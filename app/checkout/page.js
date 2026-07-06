'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CheckoutForm from '@/components/CheckoutForm';
import CheckoutOrderSummary from '@/components/CheckoutOrderSummary';
import { useCart } from '@/lib/cartContext';

// Collects and validates customer + shipping info for the order. Nothing
// here writes to Supabase directly - CheckoutForm posts to /api/checkout,
// which re-verifies everything server-side and creates a real Stripe
// Checkout Session; Customers_Core, Customers_Contact, Orders, and
// OrderLines are only ever written by the signature-verified webhook
// after Stripe confirms payment, never by this page.
export default function CheckoutPage() {
  const { items, hydrated } = useCart();

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-ocean-dark sm:text-4xl">
            Checkout
          </h1>

          {!hydrated && <p className="mt-8 text-sm text-ink/50">Loading your cart&hellip;</p>}

          {hydrated && items.length === 0 && (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
              <p className="font-heading text-lg font-semibold text-ink">Your cart is empty</p>
              <p className="mt-2 text-sm text-ink/60">
                Add something to your cart before checking out.
              </p>
              <Link
                href="/shop"
                className="press-scale mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark"
              >
                Keep Shopping
              </Link>
            </div>
          )}

          {hydrated && items.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
              <div className="lg:col-span-2">
                <CheckoutForm />
              </div>
              <div className="lg:col-span-1">
                <CheckoutOrderSummary />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
