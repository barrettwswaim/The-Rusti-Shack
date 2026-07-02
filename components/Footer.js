import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-sand-deep bg-ocean-dark text-sand">
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight">The Rusti Shack</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-sand/80">
              Dive &amp; snorkel gear, sold and rented on Apo Island, Philippines.
            </p>
          </div>

          <div className="text-sm text-sand/80">
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-sand">
              Find Us
            </p>
            <ul className="mt-2 space-y-1">
              <li>Apo Island Main Shop</li>
              <li>Dock-Side Kiosk</li>
              <li>Shipping worldwide from Apo Island</li>
            </ul>
          </div>

          <div className="text-sm text-sand/80">
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-sand">
              Explore
            </p>
            <ul className="mt-2 space-y-1">
              <li><Link href="/" className="transition-colors hover:text-white">Home</Link></li>
              <li><Link href="/shop" className="transition-colors hover:text-white">Shop</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-white">About Apo Island</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-sand/10 pt-6 text-xs text-sand/60">
          &copy; {new Date().getFullYear()} The Rusti Shack. Apo Island, Negros Oriental, Philippines.
        </p>
      </div>
    </footer>
  );
}
