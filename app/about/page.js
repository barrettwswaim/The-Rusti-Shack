import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'About Apo Island | The Rusti Shack',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-content flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-ocean-dark sm:text-4xl">
          Our Apo Island Story, Coming Soon
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
          We&apos;re putting together the story of the shop, the island, and the reef
          that make it worth the trip. Check back soon.
        </p>
        <Link
          href="/"
          className="press-scale mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold tracking-tight text-white shadow-sm transition-colors hover:bg-ocean-dark"
        >
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
