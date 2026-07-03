'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cartContext';

// The only thing this component does: clear the cart, and only once the
// server component that renders it has already confirmed - via Stripe,
// server-side - that this specific payment genuinely went through.
// Visiting this page's URL alone never triggers this; `shouldClear` only
// becomes true after a real, verified payment.
export default function ConfirmationCartClear({ shouldClear }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (shouldClear) {
      clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldClear]);

  return null;
}
