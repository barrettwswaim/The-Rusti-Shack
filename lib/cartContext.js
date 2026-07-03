'use client';

// Client-side shopping cart. Everything here lives in the browser only -
// React state mirrored to localStorage - and never touches Supabase. No
// customer, order, address, or payment data is written anywhere by this
// file. When real checkout gets built later, the server must still look
// up every price fresh from the products table by SKU before charging
// anything; the price stored here is a display cache for the cart page,
// not a source of truth for money (see SECURITY.md section 5).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'rusti-shack-cart-v1';
const FLAT_SHIPPING_RATE = 12;

function readStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Load whatever was saved from a previous visit, once, on mount. This
  // (plus the effect below) is what makes the cart survive a refresh or
  // navigating between pages - it's read back from localStorage every
  // time the app starts up in the browser.
  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  // Mirror every change back to localStorage. Skips the very first render
  // so we don't stomp a saved cart with an empty array before the load
  // effect above has had a chance to run.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can fail (private browsing, full quota) - the cart still
      // works for the current tab, it just won't survive a refresh.
    }
  }, [items, hydrated]);

  // `line` must carry the exact variant SKU the shopper selected, never a
  // parent/family SKU - see lib/products.js and ProductOptions.js.
  const addItem = useCallback((line) => {
    setItems((current) => {
      const existing = current.find((i) => i.sku === line.sku);
      if (existing) {
        return current.map((i) =>
          i.sku === line.sku ? { ...i, quantity: i.quantity + (line.quantity || 1) } : i
        );
      }
      return [...current, { ...line, quantity: line.quantity || 1 }];
    });
  }, []);

  const updateQuantity = useCallback((sku, quantity) => {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((i) => i.sku !== sku);
      }
      return current.map((i) => (i.sku === sku ? { ...i, quantity } : i));
    });
  }, []);

  const removeItem = useCallback((sku) => {
    setItems((current) => current.filter((i) => i.sku !== sku));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.quantity * i.price, 0), [items]);
  const shipping = items.length > 0 ? FLAT_SHIPPING_RATE : 0;
  const total = subtotal + shipping;

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotal,
      shipping,
      total,
    }),
    [items, hydrated, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal, shipping, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
