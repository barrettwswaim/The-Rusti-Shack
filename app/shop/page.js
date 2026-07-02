import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Shop | The Rusti Shack',
};

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-content flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="font-heading text-3xl font-semibold text-ocean-dark sm:text-4xl">
          The Shop Is Almost Ready
        </h1>
        <p className="mt-4 max-w-md text-base text-ink/70 sm:text-lg">
          We&apos;re still setting up online browsing and checkout. In the meantime,
          come see the full catalog in person at our Apo Island shop.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-ocean-dark"
        >
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
