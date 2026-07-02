import Reveal from '@/components/Reveal';
import ProductCard from '@/components/ProductCard';

export default function CategorySection({ category, products, tinted }) {
  return (
    <section
      id={category.slug}
      className={`scroll-mt-[120px] py-10 sm:py-14 ${tinted ? 'bg-lagoon' : 'bg-sand'}`}
    >
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-ocean-dark sm:text-2xl">
              {category.name}
            </h2>
            <p className="mt-1 text-sm text-ink/70 sm:text-base">{category.blurb}</p>
          </div>
          <span className="text-xs font-medium text-ocean sm:text-sm">
            {products.length} products
          </span>
        </Reveal>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.sku} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
