import Reveal from '@/components/Reveal';

export default function GettingThere() {
  return (
    <section className="bg-lagoon py-12 sm:py-16">
      <div className="mx-auto max-w-content px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-ocean-dark sm:text-3xl">
            Getting to the Island
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
            Most visitors reach Apo Island by bangka — the outrigger boats used up
            and down this coast — arranged from the Dumaguete area on the mainland.
            Boat trips depend on weather and sea conditions, so it&apos;s worth
            checking current conditions and arranging your crossing before you head
            out, rather than assuming a fixed schedule.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
            Once you&apos;re on the island, our Main Shop is a short walk from the
            beach, and the Dock-Side Kiosk is right by the boat landing — handy if
            you need gear on your way to or from the water.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
