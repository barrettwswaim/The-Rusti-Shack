import Image from 'next/image';

export default function AboutHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden sm:h-[48vh] sm:min-h-[360px]">
        <Image
          src="/images/products/snorkel-dive/WET-001-black-life.png"
          alt="A visitor walks onto the beach at Apo Island at golden hour, palm trees along the shore"
          fill
          priority
          sizes="100vw"
          className="animate-ken-burns object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />

        <div className="relative z-10 mx-auto flex h-full max-w-content flex-col justify-end px-4 pb-8 sm:px-6 sm:pb-12">
          <h1 className="animate-hero-in font-heading text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
            About Apo Island
          </h1>
          <p className="animate-hero-in-delay mt-3 max-w-xl text-base text-white/90 sm:mt-4 sm:text-lg">
            The reef, the boat ride over, and the shop that&apos;s grown up around both.
          </p>
        </div>
      </div>
    </section>
  );
}
