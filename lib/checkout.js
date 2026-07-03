// Checkout form validation + data prep. Nothing in this file touches
// Supabase, localStorage, or any network request - it's pure validation
// logic and a plain-object shape ready for the next stage (Part 6.7:
// Stripe). See CheckoutForm.js for how form values stay in-memory only.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A solid, alphabetical list for the country dropdown. Not a full ISO
// list, but covers the shop's real customer base (Philippines, and the
// other countries already seen in the historical dataset) plus enough
// common destinations that most international shoppers find their own.
export const COUNTRIES = [
  'Australia',
  'Austria',
  'Belgium',
  'Brazil',
  'Canada',
  'China',
  'Denmark',
  'Finland',
  'France',
  'Germany',
  'Hong Kong',
  'India',
  'Indonesia',
  'Ireland',
  'Israel',
  'Italy',
  'Japan',
  'Malaysia',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Philippines',
  'Poland',
  'Portugal',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
];

export const emptyCheckoutFields = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  loyaltyOptIn: false,
};

// Client-side validation only, for now. Real server-side validation has
// to be added in the same phase as the real write path (Part 6.7+) - see
// SECURITY.md section 7 ("All input gets validated on the server, even
// if the browser already validated it"). There's no server code at all
// in this phase, since nothing is being saved or charged yet.
export function validateCheckoutForm(fields) {
  const errors = {};

  const requireText = (key, message) => {
    if (!fields[key] || !fields[key].trim()) {
      errors[key] = message;
    }
  };

  requireText('firstName', 'Please enter your first name.');
  requireText('lastName', 'Please enter your last name.');

  if (!fields.email || !fields.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = "That email doesn't look quite right - mind double-checking it?";
  }

  if (!fields.phone || !fields.phone.trim()) {
    errors.phone = 'Please enter a phone number, in case we need to reach you about your order.';
  } else if ((fields.phone.match(/\d/g) || []).length < 7) {
    errors.phone = 'That phone number looks incomplete - please check it.';
  }

  requireText('street', 'Please enter your street address.');
  requireText('city', 'Please enter your city.');
  requireText('region', 'Please enter your region or state.');
  requireText('postalCode', 'Please enter your postal code.');

  if (!fields.country || !fields.country.trim()) {
    errors.country = 'Please select your country.';
  }

  return errors;
}

// Shapes the validated form + current cart into what a real Stripe
// Checkout Session will need in the next stage. Deliberately carries only
// SKU and quantity for each line, never a price or total - the server
// must look up the real, current price from the products table by SKU
// before ever creating a session or charging anything (SECURITY.md
// section 5: "Never accept a price, amount, discount, or total from the
// browser. The client sends product IDs and quantities only.").
export function buildStripeCheckoutPayload(fields, cart) {
  return {
    customer: {
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
    },
    shippingAddress: {
      street: fields.street.trim(),
      city: fields.city.trim(),
      region: fields.region.trim(),
      postalCode: fields.postalCode.trim(),
      country: fields.country,
    },
    loyaltyOptIn: Boolean(fields.loyaltyOptIn),
    lineItems: cart.items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
  };
}
