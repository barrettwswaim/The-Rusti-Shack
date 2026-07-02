import Image from 'next/image';
import Reveal from '@/components/Reveal';
import { categories } from '@/lib/categories';

export default function CategoryPreview() {
  return (
    <section className="bg-lagoon py-12 sm:py-16">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-ocean-dark sm:text-3xl">
            Gear for Every Day on the Water
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink/70 sm:text-lg">
            A look at what&apos;s in the shop, grouped the way you&apos;d browse it in person.
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Reveal key={category.slug} delay={index * 90}>
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg">
                <div className="relative h-48 w-full overflow-hidden sm:h-56">
                  <Image
                    src={category.image}
                    alt={`${category.name} gear from The Rusti Shack`}
                    fill
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-active:scale-110"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-heading text-lg font-semibold tracking-tight text-ink">
                      {category.name}
                    </h3>
                    <span className="whitespace-nowrap text-xs font-medium text-ocean">
                      {category.itemCount} products
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{category.blurb}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
