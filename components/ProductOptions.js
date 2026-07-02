'use client';

import { useState } from 'react';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductOptions({ product }) {
  const isRentable = product.availability === 'Both';
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || null);

  const description = product.yearIntroduced
    ? `Part of our ${product.subcategory} lineup within ${product.category}, available at The Rusti Shack since ${product.yearIntroduced}.`
    : `Part of our ${product.subcategory} lineup within ${product.category}.`;

  return (
    <div>
      <p className="text-sm font-medium text-ocean">
        {product.category} · {product.subcategory}
      </p>

      <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {product.name}
      </h1>

      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-ocean-dark">
        {product.priceIsFrom ? 'From ' : ''}
        {formatPrice(product.price)}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-sand-deep px-2.5 py-1 text-xs font-medium text-ocean-dark">
          For Sale
        </span>
        {isRentable && (
          <span className="inline-flex items-center rounded-full bg-coral/15 px-2.5 py-1 text-xs font-medium text-coral-dark">
            Also Rentable
          </span>
        )}
      </div>

      {isRentable && (
        <p className="mt-3 rounded-xl bg-lagoon px-4 py-3 text-sm leading-relaxed text-ocean-dark">
          Also available to rent in person on Apo Island. Rentals are same-day, walk-in
          only at our Apo Island Main Shop or Dock-Side Kiosk — online orders are for
          purchase and shipping only.
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{description}</p>

      {product.colors.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">
            Color{product.colors.length > 1 ? 's' : ''}: <span className="font-normal text-ink/70">{selectedColor}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-pressed={selectedColor === color}
                className={`press-scale rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                  selectedColor === color
                    ? 'bg-ocean text-white ring-ocean'
                    : 'bg-white text-ink/80 ring-black/10 hover:bg-sand-deep'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.sizes.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">
            Size: <span className="font-normal text-ink/70">{selectedSize}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                aria-pressed={selectedSize === size}
                className={`press-scale min-w-[44px] rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                  selectedSize === size
                    ? 'bg-ocean text-white ring-ocean'
                    : 'bg-white text-ink/80 ring-black/10 hover:bg-sand-deep'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex w-full min-h-[44px] items-center justify-center rounded-full bg-coral px-6 py-3.5 text-base font-semibold text-white opacity-60 shadow-sm"
        >
          Add to Cart
        </button>
        <p className="mt-2 text-center text-xs text-ink/50">
          Online checkout isn&apos;t live yet — check back soon.
        </p>
      </div>
    </div>
  );
}
