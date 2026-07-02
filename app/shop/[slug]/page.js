import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductGallery from '@/components/ProductGallery';
import ProductOptions from '@/components/ProductOptions';
import { products } from '@/lib/products';

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

function getProduct(slug) {
  return products.find((product) => product.slug === slug);
}

export function generateMetadata({ params }) {
  const product = getProduct(params.slug);
  if (!product) {
    return { title: 'Product Not Found | The Rusti Shack' };
  }
  return {
    title: `${product.name} | The Rusti Shack`,
    description: `${product.name} - ${product.subcategory} from The Rusti Shack's ${product.category} collection. ${
      product.availability === 'Both'
        ? 'Buy online, or rent in person on Apo Island.'
        : 'Available to buy online.'
    }`,
  };
}

export default function ProductPage({ params }) {
  const product = getProduct(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />
      <main>
        <div className="mx-auto max-w-content px-4 pt-6 sm:px-6 sm:pt-8">
          <Link
            href={`/shop#${product.categorySlug}`}
            className="press-scale inline-flex items-center gap-1.5 text-sm font-medium text-ocean-dark transition-colors hover:text-ocean"
          >
            <span aria-hidden="true">&larr;</span> Back to Shop
          </Link>
        </div>

        <div className="mx-auto max-w-content px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <ProductGallery product={product} />
            <ProductOptions product={product} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
