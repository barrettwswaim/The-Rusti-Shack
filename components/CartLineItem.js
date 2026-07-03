'use client';

import Image from 'next/image';
import Link from 'next/link';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CartLineItem({ item, onUpdateQuantity, onRemove }) {
  const variantLabel = [item.color, item.size].filter(Boolean).join(' · ');
  const lineTotal = item.price * item.quantity;

  return (
    <div className="flex flex-col gap-4 border-b border-sand-deep py-5 last:border-b-0 sm:flex-row sm:items-center">
      <Link
        href={`/shop/${item.slug}`}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-sand-deep ring-1 ring-black/5 sm:h-20 sm:w-20"
      >
        {item.image && (
          <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/shop/${item.slug}`}
          className="font-heading text-base font-semibold tracking-tight text-ink hover:text-ocean"
        >
          {item.name}
        </Link>
        {variantLabel && <p className="mt-0.5 text-sm text-ink/60">{variantLabel}</p>}
        <p className="mt-0.5 text-xs text-ink/40">SKU: {item.sku}</p>

        <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
          <QuantityStepper
            quantity={item.quantity}
            onChange={(qty) => onUpdateQuantity(item.sku, qty)}
          />
          <button
            type="button"
            onClick={() => onRemove(item.sku)}
            className="press-scale flex min-h-[44px] items-center px-2 text-sm font-medium text-ink/50 underline-offset-2 hover:text-coral-dark hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="hidden items-center gap-6 sm:flex">
        <p className="w-20 text-right text-sm text-ink/70">{formatPrice(item.price)}</p>
        <QuantityStepper
          quantity={item.quantity}
          onChange={(qty) => onUpdateQuantity(item.sku, qty)}
        />
        <p className="w-24 text-right font-heading text-base font-semibold text-ocean-dark">
          {formatPrice(lineTotal)}
        </p>
        <button
          type="button"
          onClick={() => onRemove(item.sku)}
          aria-label={`Remove ${item.name} from cart`}
          className="press-scale flex h-11 w-11 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-sand-deep hover:text-coral-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between sm:hidden">
        <p className="text-sm text-ink/60">{formatPrice(item.price)} each</p>
        <p className="font-heading text-base font-semibold text-ocean-dark">
          {formatPrice(lineTotal)}
        </p>
      </div>
    </div>
  );
}

function QuantityStepper({ quantity, onChange }) {
  return (
    <div className="flex items-center rounded-full ring-1 ring-black/10">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label="Decrease quantity"
        className="press-scale flex h-11 w-11 items-center justify-center rounded-full text-lg font-medium text-ink/70 hover:bg-sand-deep"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium text-ink" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        className="press-scale flex h-11 w-11 items-center justify-center rounded-full text-lg font-medium text-ink/70 hover:bg-sand-deep"
      >
        +
      </button>
    </div>
  );
}
