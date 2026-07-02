'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ProductGallery({ product }) {
  const shots = [
    { src: product.image, label: `${product.name}` },
    ...(product.lifeImage ? [{ src: product.lifeImage, label: `${product.name} on Apo Island` }] : []),
  ];
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-sand-deep ring-1 ring-black/5">
        <Image
          key={shots[active].src}
          src={shots[active].src}
          alt={shots[active].label}
          fill
          priority
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-cover"
        />
      </div>

      {shots.length > 1 && (
        <div className="mt-3 flex gap-3">
          {shots.map((shot, index) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={index === 0 ? 'Show studio photo' : 'Show lifestyle photo'}
              aria-pressed={active === index}
              className={`press-scale relative h-16 w-16 overflow-hidden rounded-xl ring-2 transition-colors sm:h-20 sm:w-20 ${
                active === index ? 'ring-ocean' : 'ring-black/5'
              }`}
            >
              <Image src={shot.src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
