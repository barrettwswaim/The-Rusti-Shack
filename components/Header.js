import Link from 'next/link';
import CartIcon from '@/components/CartIcon';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'About', hrefLabelSuffix: ' Apo Island', href: '/about' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-sand-deep bg-sand/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean text-sand transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 15c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 19c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 13c2.5-3 2.5-7-1-10 3 0 6.5 2.5 6 6.5-.3 2.3-2 3.7-3 3.7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight text-ocean-dark sm:text-xl">
            The Rusti Shack
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <nav aria-label="Primary" className="flex items-center gap-4 text-sm sm:gap-7 sm:text-base">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative py-1 font-medium tracking-tight text-ink/80 transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-ocean after:transition-all after:duration-300 hover:text-ocean hover:after:w-full"
              >
                {link.label}
                {link.hrefLabelSuffix && (
                  <span className="hidden sm:inline">{link.hrefLabelSuffix}</span>
                )}
              </Link>
            ))}
          </nav>

          <CartIcon />
        </div>
      </div>
    </header>
  );
}
