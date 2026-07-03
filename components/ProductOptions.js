'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cartContext';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductOptions({ product }) {
  // Online checkout only ever supports buying - never rental. "Both" items
  // can be bought online AND rented in person; "Rental only" items get no
  // online cart action at all, just information. See CLAUDE.md section 4.
  const isPurchasable = product.availability === 'Sale only' || product.availability === 'Both';
  const isAlsoRentable = product.availability === 'Both';

  const hasSizes = product.sizes.length > 0;
  const hasColors = product.colors.length > 0;

  const [selectedColor, setSelectedColor] = useState(product.colors[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || null);
  const [justAdded, setJustAdded] = useState(false);

  const { addItem } = useCart();

  // The exact SKU the shopper's current size/color choice resolves to.
  // This - never the parent/family SKU - is what the cart stores.
  const resolvedVariant = product.variants.find(
    (v) => (!hasSizes || v.size === selectedSize) && (!hasColors || v.color === selectedColor)
  );

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const description = product.yearIntroduced
    ? `Part of our ${product.subcategory} lineup within ${product.category}, available at The Rusti Shack since ${product.yearIntroduced}.`
    : `Part of our ${product.subcategory} lineup within ${product.category}.`;

  function handleAddToCart() {
    if (!resolvedVariant) return;
    addItem({
      sku: resolvedVariant.sku,
      name: product.name,
      image: product.image,
      price: resolvedVariant.price,
      size: resolvedVariant.size,
      color: resolvedVariant.color,
      slug: product.slug,
      quantity: 1,
    });
    setJustAdded(true);
  }

  const displayPrice = resolvedVariant ? resolvedVariant.price : product.price;

  return (
    <div>
      <p className="text-sm font-medium text-ocean">
        {product.category} · {product.subcategory}
      </p>

      <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {product.name}
      </h1>

      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-ocean-dark">
        {!resolvedVariant && product.priceIsFrom ? 'From ' : ''}
        {formatPrice(displayPrice)}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-sand-deep px-2.5 py-1 text-xs font-medium text-ocean-dark">
          {isPurchasable ? 'For Sale' : 'Rental Only'}
        </span>
        {isAlsoRentable && (
          <span className="inline-flex items-center rounded-full bg-coral/15 px-2.5 py-1 text-xs font-medium text-coral-dark">
            Also Rentable
          </span>
        )}
      </div>

      {isAlsoRentable && (
        <p className="mt-3 rounded-xl bg-lagoon px-4 py-3 text-sm leading-relaxed text-ocean-dark">
          Also available to rent in person on Apo Island. Rentals are same-day, walk-in
          only at our Apo Island Main Shop or Dock-Side Kiosk — online orders are for
          purchase and shipping only.
        </p>
      )}

      {!isPurchasable && (
        <p className="mt-3 rounded-xl bg-lagoon px-4 py-3 text-sm leading-relaxed text-ocean-dark">
          This item is available to rent in person at our Apo Island Main Shop or
          Dock-Side Kiosk. Online ordering isn&apos;t available for rental-only gear.
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{description}</p>

      {hasColors && (
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

      {hasSizes && (
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

      {isPurchasable && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!resolvedVariant}
            aria-disabled={!resolvedVariant}
            className={`flex w-full min-h-[44px] items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors ${
              resolvedVariant
                ? 'press-scale bg-coral hover:bg-coral-dark'
                : 'cursor-not-allowed bg-coral opacity-50'
            }`}
          >
            {justAdded ? 'Added to Cart ✓' : 'Add to Cart'}
          </button>
          {!resolvedVariant && (
            <p className="mt-2 text-center text-xs text-ink/50">
              That combination isn&apos;t available - try a different size or color.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
