import { NextResponse } from 'next/server';
import stripe from '@/lib/stripeClient';
import { supabase } from '@/lib/supabaseClient';

// Server-side only. Creates a Stripe-hosted Checkout Session. The browser
// sends product IDs (SKUs) and quantities only - every price here comes
// fresh from Supabase, never from the request body, matching SECURITY.md
// section 5 ("the client sends product IDs and quantities only").

const FLAT_SHIPPING_CENTS = 1200; // $12.00 - a server-side constant, never client-supplied.
const MAX_QUANTITY_PER_LINE = 20;
const MAX_METADATA_VALUE_LENGTH = 450; // Stripe's real cap is 500 chars; leave a safety margin.

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { customer, shippingAddress, loyaltyOptIn, lineItems } = body || {};

  // Server-side validation. The browser already validated this form, but
  // SECURITY.md requires validating again on the server regardless.
  if (
    !customer ||
    !isNonEmptyString(customer.firstName) ||
    !isNonEmptyString(customer.lastName) ||
    !isNonEmptyString(customer.email) ||
    !isNonEmptyString(customer.phone)
  ) {
    return NextResponse.json({ error: 'Missing or invalid customer information.' }, { status: 400 });
  }

  if (
    !shippingAddress ||
    !isNonEmptyString(shippingAddress.street) ||
    !isNonEmptyString(shippingAddress.city) ||
    !isNonEmptyString(shippingAddress.region) ||
    !isNonEmptyString(shippingAddress.postalCode) ||
    !isNonEmptyString(shippingAddress.country)
  ) {
    return NextResponse.json({ error: 'Missing or invalid shipping address.' }, { status: 400 });
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  for (const line of lineItems) {
    if (
      !isNonEmptyString(line?.sku) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_QUANTITY_PER_LINE
    ) {
      return NextResponse.json({ error: 'One or more cart items are invalid.' }, { status: 400 });
    }
  }

  // The whole point: look up real prices from Supabase by SKU. Nothing
  // the browser sent about price is read or trusted past this point.
  const skus = lineItems.map((l) => l.sku);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('sku, product_name, unit_price, unit_cost, availability')
    .in('sku', skus);

  if (productsError) {
    console.error('Checkout: failed to look up products:', productsError.message);
    return NextResponse.json({ error: 'Could not verify your order. Please try again.' }, { status: 500 });
  }

  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const verifiedLines = [];

  for (const line of lineItems) {
    const product = productBySku.get(line.sku);
    if (!product) {
      return NextResponse.json(
        { error: `One item in your cart is no longer available (${line.sku}). Please review your cart.` },
        { status: 400 }
      );
    }
    if (product.availability === 'Rental only') {
      return NextResponse.json(
        { error: `${product.product_name} is only available to rent in person and can't be ordered online.` },
        { status: 400 }
      );
    }

    // Defense in depth: a null/zero/negative price in Supabase should
    // never silently become a free or negative-cost line item. Fail
    // loudly and refuse checkout instead of trusting the DB blindly.
    const unitPrice = Number(product.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      console.error('Checkout: product has invalid unit_price, refusing to checkout', product.sku, product.unit_price);
      return NextResponse.json(
        { error: `${product.product_name} isn't available to purchase right now. Please try again later.` },
        { status: 400 }
      );
    }

    verifiedLines.push({
      sku: product.sku,
      name: product.product_name,
      quantity: line.quantity,
      unitPrice,
      unitCost: product.unit_cost === null ? null : Number(product.unit_cost),
    });
  }

  const subtotalCents = verifiedLines.reduce(
    (sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity,
    0
  );
  const totalCents = subtotalCents + FLAT_SHIPPING_CENTS;

  // Everything the webhook needs to finalize the order once payment is
  // actually confirmed - kept compact since Stripe caps each metadata
  // value at 500 characters.
  const lineItemsMetadata = JSON.stringify(
    verifiedLines.map((l) => ({ s: l.sku, q: l.quantity, p: l.unitPrice, c: l.unitCost }))
  );

  if (lineItemsMetadata.length > MAX_METADATA_VALUE_LENGTH) {
    return NextResponse.json(
      {
        error:
          'Your cart has too many different items to check out at once. Please split it into smaller orders.',
      },
      { status: 400 }
    );
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email.trim(),
      line_items: [
        ...verifiedLines.map((l) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: l.name },
            unit_amount: Math.round(l.unitPrice * 100),
          },
          quantity: l.quantity,
        })),
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Shipping' },
            unit_amount: FLAT_SHIPPING_CENTS,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        line_items: lineItemsMetadata,
        first_name: customer.firstName.trim(),
        last_name: customer.lastName.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        street: shippingAddress.street.trim(),
        city: shippingAddress.city.trim(),
        region: shippingAddress.region.trim(),
        postal_code: shippingAddress.postalCode.trim(),
        country: shippingAddress.country,
        loyalty_opt_in: String(Boolean(loyaltyOptIn)),
        shipping_fee_cents: String(FLAT_SHIPPING_CENTS),
        order_total_cents: String(totalCents),
      },
    });
  } catch (err) {
    // Detailed error stays server-side only (SECURITY.md rule 9: vague to
    // the caller, detailed in logs).
    console.error('Stripe session creation failed:', err.message);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
