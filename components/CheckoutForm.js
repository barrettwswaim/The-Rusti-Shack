'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cartContext';
import {
  COUNTRIES,
  emptyCheckoutFields,
  validateCheckoutForm,
  buildStripeCheckoutPayload,
} from '@/lib/checkout';

// Every field lives in plain component state only - never localStorage,
// never Supabase, never a network request. It exists only for as long as
// this page is open, which is deliberately more conservative than asked:
// even the cart (which does persist) never gets this kind of personal
// detail added to it.
export default function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();

  const [fields, setFields] = useState(emptyCheckoutFields);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function updateField(key, value) {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (submitted) {
      setErrors(validateCheckoutForm(next));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateCheckoutForm(fields);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // Ready for the next stage (Part 6.7: Stripe). Held in a local
    // variable only - not logged, not stored, not sent anywhere yet.
    buildStripeCheckoutPayload(fields, cart);
    router.push('/checkout/payment');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
      <fieldset>
        <legend className="font-heading text-lg font-semibold tracking-tight text-ink">
          Contact Info
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="First Name"
            value={fields.firstName}
            onChange={(v) => updateField('firstName', v)}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <TextField
            label="Last Name"
            value={fields.lastName}
            onChange={(v) => updateField('lastName', v)}
            error={errors.lastName}
            autoComplete="family-name"
          />
          <TextField
            label="Email"
            type="email"
            value={fields.email}
            onChange={(v) => updateField('email', v)}
            error={errors.email}
            autoComplete="email"
          />
          <TextField
            label="Phone"
            type="tel"
            value={fields.phone}
            onChange={(v) => updateField('phone', v)}
            error={errors.phone}
            autoComplete="tel"
          />
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="font-heading text-lg font-semibold tracking-tight text-ink">
          Shipping Address
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Street Address"
              value={fields.street}
              onChange={(v) => updateField('street', v)}
              error={errors.street}
              autoComplete="street-address"
            />
          </div>
          <TextField
            label="City"
            value={fields.city}
            onChange={(v) => updateField('city', v)}
            error={errors.city}
            autoComplete="address-level2"
          />
          <TextField
            label="Region / State"
            value={fields.region}
            onChange={(v) => updateField('region', v)}
            error={errors.region}
            autoComplete="address-level1"
          />
          <TextField
            label="Postal Code"
            value={fields.postalCode}
            onChange={(v) => updateField('postalCode', v)}
            error={errors.postalCode}
            autoComplete="postal-code"
          />

          <div>
            <label htmlFor="country" className="text-sm font-medium text-ink">
              Country
            </label>
            <select
              id="country"
              value={fields.country}
              onChange={(e) => updateField('country', e.target.value)}
              autoComplete="country-name"
              aria-invalid={Boolean(errors.country)}
              className={`mt-1 min-h-[44px] w-full rounded-xl bg-white px-3 text-base text-ink ring-1 transition-colors focus:outline-none focus:ring-2 ${
                errors.country ? 'ring-coral focus:ring-coral' : 'ring-black/10 focus:ring-ocean'
              }`}
            >
              <option value="" disabled>
                Select a country
              </option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-sm text-coral-dark">{errors.country}</p>}
          </div>
        </div>
      </fieldset>

      <label className="mt-6 flex min-h-[44px] cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={fields.loyaltyOptIn}
          onChange={(e) => updateField('loyaltyOptIn', e.target.checked)}
          className="h-5 w-5 flex-shrink-0 rounded border-black/20 text-ocean focus:ring-ocean"
        />
        <span className="text-sm text-ink/80">
          Sign me up for the loyalty list — first dibs on new gear and returning-customer perks.
        </span>
      </label>

      <button
        type="submit"
        className="press-scale mt-8 flex min-h-[44px] w-full items-center justify-center rounded-full bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
      >
        Continue to Payment
      </button>
      <p className="mt-2 text-center text-xs text-ink/50">
        You won&apos;t be charged yet — online payment isn&apos;t connected yet.
      </p>
    </form>
  );
}

function TextField({ label, value, onChange, error, type = 'text', autoComplete }) {
  const id = `checkout-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={`mt-1 min-h-[44px] w-full rounded-xl bg-white px-3 text-base text-ink ring-1 transition-colors placeholder:text-ink/30 focus:outline-none focus:ring-2 ${
          error ? 'ring-coral focus:ring-coral' : 'ring-black/10 focus:ring-ocean'
        }`}
      />
      {error && <p className="mt-1 text-sm text-coral-dark">{error}</p>}
    </div>
  );
}
