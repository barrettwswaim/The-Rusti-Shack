import Link from 'next/link';
import Reveal from '@/components/Reveal';

export default function ShopCTA() {
  return (
    <section className="mx-auto max-w-content px-4 py-14 text-center sm:px-6 sm:py-20">
      <Reveal>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-ocean-dark sm:text-3xl">
          Ready to Gear Up?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
          Browse the full catalog and buy online any time. Prefer to rent? Swing by
          our Apo Island shop and we&apos;ll set you up for the day.
        </p>
        <Link
          href="/shop"
          className="press-scale mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-coral px-8 py-3 text-base font-semibold tracking-tight text-white shadow-sm transition-colors hover:bg-coral-dark"
        >
          Browse the Shop
        </Link>
      </Reveal>
    </section>
  );
}
