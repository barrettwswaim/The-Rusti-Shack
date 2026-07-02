import Image from 'next/image';

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductCard({ product }) {
  const isRentable = product.availability === 'Both';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-deep">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
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
            For Sale
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

        <div className="mt-auto" />
      </div>
    </div>
  );
}
