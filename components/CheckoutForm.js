'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cartContext';
import {
  COUNTRIES,
  emptyCheckoutFields,
  validateCheckoutForm,
  buildStripeCheckoutPayload,
} from '@/lib/checkout';

const FIELD_ORDER = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'street',
  'city',
  'region',
  'postalCode',
  'country',
];

export default function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();

  const [fields, setFields] = useState(emptyCheckoutFields);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const fieldRefs = useRef({});

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
      const firstErrorKey = FIELD_ORDER.find((key) => nextErrors[key]);
      const node = firstErrorKey && fieldRefs.current[firstErrorKey];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.focus({ preventScroll: true });
      }
      return;
    }

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
            inputRef={(el) => (fieldRefs.current.firstName = el)}
          />
          <TextField
            label="Last Name"
            value={fields.lastName}
            onChange={(v) => updateField('lastName', v)}
            error={errors.lastName}
            autoComplete="family-name"
            inputRef={(el) => (fieldRefs.current.lastName = el)}
          />
          <TextField
            label="Email"
            type="email"
            value={fields.email}
            onChange={(v) => updateField('email', v)}
            error={errors.email}
            autoComplete="email"
            inputRef={(el) => (fieldRefs.current.email = el)}
          />
          <TextField
            label="Phone"
            type="tel"
            value={fields.phone}
            onChange={(v) => updateField('phone', v)}
            error={errors.phone}
            autoComplete="tel"
            inputRef={(el) => (fieldRefs.current.phone = el)}
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
              inputRef={(el) => (fieldRefs.current.street = el)}
            />
          </div>
          <TextField
            label="City"
            value={fields.city}
            onChange={(v) => updateField('city', v)}
            error={errors.city}
            autoComplete="address-level2"
            inputRef={(el) => (fieldRefs.current.city = el)}
          />
          <TextField
            label="Region / State"
            value={fields.region}
            onChange={(v) => updateField('region', v)}
            error={errors.region}
            autoComplete="address-level1"
            inputRef={(el) => (fieldRefs.current.region = el)}
          />
          <TextField
            label="Postal Code"
            value={fields.postalCode}
            onChange={(v) => updateField('postalCode', v)}
            error={errors.postalCode}
            autoComplete="postal-code"
            inputRef={(el) => (fieldRefs.current.postalCode = el)}
          />

          <div>
            <label htmlFor="country" className="text-sm font-medium text-ink">
              Country
            </label>
            <select
              id="country"
              ref={(el) => (fieldRefs.current.country = el)}
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
          Sign me up for the loyalty list, first dibs on new gear and returning-customer perks.
        </span>
      </label>

      <button
        type="submit"
        className="press-scale mt-8 flex min-h-[44px] w-full items-center justify-center rounded-full bg-coral px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-coral-dark"
      >
        Continue to Payment
      </button>
      <p className="mt-2 text-center text-xs text-ink/50">
        You will not be charged yet, online payment is not connected yet.
      </p>
    </form>
  );
}

function TextField({ label, value, onChange, error, type = 'text', autoComplete, inputRef }) {
  const id = `checkout-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
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
