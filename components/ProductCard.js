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

export default function ProductCard({ product }) {
  // Mirrors ProductOptions.js on the detail page: every product must
  // clearly state whether it's for sale, rental only, or both (CLAUDE.md
  // section 4). No current SKU is "Rental only", but the badge must still
  // be correct if one is ever added - never show "For Sale" for an item
  // that can't actually be bought online.
  const isPurchasable = product.availability === 'Sale only' || product.availability === 'Both';
  const isRentable = product.availability === 'Both';

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="press-scale group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-deep">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-active:scale-110"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-base font-semibold tracking-tight text-ink">
          {product.name}
        </h3>

        <p className="mt-1 font-heading text-lg font-semibold tracking-tight text-ocean-dark">
          {product.priceIsFrom ? 'From ' : ''}
          {formatPrice(product.price)}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-sand-deep px-2.5 py-1 text-xs font-medium text-ocean-dark">
            {isPurchasable ? 'For Sale' : 'Rental Only'}
          </span>
          {isRentable && (
            <span className="inline-flex items-center rounded-full bg-coral/15 px-2.5 py-1 text-xs font-medium text-coral-dark">
              Also Rentable
            </span>
          )}
        </div>

        {isRentable && (
          <p className="mt-2 text-xs leading-relaxed text-ink/60">
            Also available to rent in person on Apo Island.
          </p>
        )}

        {!isPurchasable && (
          <p className="mt-2 text-xs leading-relaxed text-ink/60">
            Available to rent in person at our Apo Island shop - not sold online.
          </p>
        )}

        <div className="mt-auto" />
      </div>
    </Link>
  );
}
