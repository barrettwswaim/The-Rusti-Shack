import Reveal from '@/components/Reveal';

export default function Intro() {
  return (
    <section className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-ocean-dark sm:text-3xl">
          Hi, We&apos;re The Rusti Shack
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
          We&apos;ve been kitting out divers, snorkelers, surfers, and beach-goers
          right here on Apo Island for years — one of the best little reefs in the
          Philippines. Tell us what kind of day you&apos;re planning and we&apos;ll help you
          find gear that fits, whether you&apos;re stopping by the shop or having it
          shipped to your door.
        </p>
      </Reveal>
    </section>
  );
}
