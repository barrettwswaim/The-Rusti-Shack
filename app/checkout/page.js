import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Checkout | The Rusti Shack',
  description: 'Online checkout for The Rusti Shack is coming soon.',
};

// Placeholder only - no payment form, no order data collected or written
// anywhere yet. Real checkout (Stripe Checkout, server-side price lookup,
// webhook-verified order confirmation) is a later build, per SECURITY.md
// section 5.
export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lagoon text-ocean"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 8v4l2.5 2.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-ink">
              Checkout Is Coming Soon
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
              We&apos;re still building online checkout for The Rusti Shack. Your cart is
              saved, so it&apos;ll be right here when checkout goes live.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/cart"
                className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
              >
                Back to Cart
              </Link>
              <Link
                href="/shop"
                className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark"
              >
                Keep Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
