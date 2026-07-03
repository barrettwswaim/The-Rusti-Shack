'use client';

import Image from 'next/image';
import { useCart } from '@/lib/cartContext';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Read-only order review for the checkout page - no quantity controls or
// remove buttons here, just what's about to be ordered. Pulls everything
// live from CartContext so it can never drift from the real cart or the
// cart page's own totals.
export default function CheckoutOrderSummary() {
  const { items, subtotal, shipping, total } = useCart();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <p className="font-heading text-lg font-semibold tracking-tight text-ink">Order Summary</p>

      <ul className="mt-4 space-y-4">
        {items.map((item) => {
          const variantLabel = [item.color, item.size].filter(Boolean).join(' · ');
          return (
            <li key={item.sku} className="flex items-center gap-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-sand-deep ring-1 ring-black/5">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="text-xs text-ink/60">
                  {variantLabel && `${variantLabel} · `}Qty {item.quantity}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-semibold text-ocean-dark">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          );
        })}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-sand-deep pt-4 text-sm">
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
          <dd className="font-heading font-semibold text-ocean-dark">{formatPrice(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
