import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[70vh] min-h-[420px] w-full sm:h-[75vh] sm:min-h-[520px]">
        <Image
          src="/images/products/snorkel-dive/SNK-001-black-life.png"
          alt="A snorkeler swims alongside a sea turtle over a colorful reef near Apo Island"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />

        <div className="relative z-10 mx-auto flex h-full max-w-content flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-16">
          <h1 className="font-heading text-3xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
            Your Dive, Snorkel &amp; Island Gear Shop on Apo Island
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/90 sm:mt-4 sm:text-lg">
            Everything you need for a good day on the reef — sold online, or rented
            in person right here on the island.
          </p>
        </div>
      </div>
    </section>
  );
}
