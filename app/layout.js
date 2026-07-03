import './globals.css';
import { CartProvider } from '@/lib/cartContext';

export const metadata = {
  title: 'The Rusti Shack | Dive, Snorkel & Island Gear on Apo Island',
  description:
    'The Rusti Shack is a family-run dive, snorkel, and island gear shop on Apo Island, Philippines. Shop online or rent gear in person on the island.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body bg-sand text-ink antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
