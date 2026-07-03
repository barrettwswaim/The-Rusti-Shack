'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartLineItem from '@/components/CartLineItem';
import { useCart } from '@/lib/cartContext';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CartPage() {
  const { items, hydrated, updateQuantity, removeItem, subtotal, shipping, total } = useCart();

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-ocean-dark sm:text-4xl">
            Your Cart
          </h1>

          {!hydrated && (
            <p className="mt-8 text-sm text-ink/50">Loading your cart&hellip;</p>
          )}

          {hydrated && items.length === 0 && (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12">
              <p className="font-heading text-lg font-semibold text-ink">Your cart is empty</p>
              <p className="mt-2 text-sm text-ink/60">
                Browse the shop and add something for your next day on the water.
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
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 lg:col-span-2">
                {items.map((item) => (
                  <CartLineItem
                    key={item.sku}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="font-heading text-lg font-semibold tracking-tight text-ink">
                  Order Summary
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink/70">Subtotal</dt>
                    <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink/70">Shipping</dt>
                    <dd className="font-medium text-ink">{formatPrice(shipping)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-sand-deep pt-2 text-base">
                    <dt className="font-semibold text-ink">Total</dt>
                    <dd className="font-heading font-semibold text-ocean-dark">
                      {formatPrice(total)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/checkout"
                    className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
                  >
                    Check Out
                  </Link>
                  <Link
                    href="/shop"
                    className="press-scale flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-semibold text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep"
                  >
                    Keep Shopping
                  </Link>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-ink/50">
                  Shipping is a flat $12 on every online order. Rentals aren&apos;t booked
                  online — those are arranged in person on Apo Island.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
