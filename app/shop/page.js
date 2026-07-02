import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShopCategoryNav from '@/components/ShopCategoryNav';
import CategorySection from '@/components/CategorySection';
import Reveal from '@/components/Reveal';
import { categories } from '@/lib/categories';
import { products } from '@/lib/products';

export const metadata = {
  title: 'Shop | The Rusti Shack',
  description:
    'Browse dive, snorkel, surf, fishing, and beach gear from The Rusti Shack. Buy online, or rent select gear in person on Apo Island.',
};

export default function ShopPage() {
  return (
    <>
      <Header />
      <ShopCategoryNav />

      <main>
        <div className="mx-auto max-w-content px-4 pt-10 sm:px-6 sm:pt-14">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-ocean-dark sm:text-4xl">
              Shop The Rusti Shack
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink/70 sm:text-lg">
              Everything below can be bought online and shipped to you. Items marked
              &quot;Also Rentable&quot; can also be rented in person at our Apo Island
              shop for a same-day rental — online orders are for purchase only.
            </p>
          </Reveal>
        </div>

        {categories.map((category, index) => (
          <CategorySection
            key={category.slug}
            category={category}
            products={products.filter((p) => p.categorySlug === category.slug)}
            tinted={index % 2 === 1}
          />
        ))}
      </main>

      <Footer />
    </>
  );
}
