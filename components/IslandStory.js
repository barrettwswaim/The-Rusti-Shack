import Reveal from '@/components/Reveal';

export default function IslandStory() {
  return (
    <section className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-ocean-dark sm:text-3xl">
          A Small Island With a Big Reef
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
          Apo Island sits just off the coast of Negros Oriental, a short boat ride
          from Dumaguete. It&apos;s a small island — a fishing community first, and a
          marine sanctuary that&apos;s protected the reef ringing its coastline for
          decades. That reef, and the sea turtles that live on it, are the reason
          most people come out here: calm, clear water and a healthy reef right off
          the beach, no boat charter into open water required.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink/70 sm:text-lg">
          We&apos;re a small family shop on that same island — gear for the reef,
          sold or rented by people who are out on it every week too.
        </p>
      </Reveal>
    </section>
  );
}
