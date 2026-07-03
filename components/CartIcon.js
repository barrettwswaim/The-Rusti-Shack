'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cartContext';

export default function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Cart, empty'}
      className="press-scale relative flex h-11 w-11 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-sand-deep hover:text-ocean"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h8.3a2 2 0 0 0 2-1.6L20 8H6.2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="19.5" r="1.4" fill="currentColor" />
        <circle cx="17.5" cy="19.5" r="1.4" fill="currentColor" />
      </svg>

      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-sand">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
