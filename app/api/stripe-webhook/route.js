import { NextResponse } from 'next/server';
import stripe from '@/lib/stripeClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Server-side only. Stripe calls this endpoint directly, server-to-server,
// once a payment actually completes - it is the only place in the whole
// project that creates or changes Customers_Core, Customers_Contact,
// Orders, or OrderLines. Nothing here is trusted until the signature
// verifies (SECURITY.md section 5: "Confirm orders only from a webhook,
// never from the success page URL alone").

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge anything we don't act on, so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;

  if (session.payment_status !== 'paid') {
    // e.g. an async payment method still settling - nothing to record
    // yet; Stripe sends another event once it resolves.
    return NextResponse.json({ received: true });
  }

  // Idempotency: has this exact session already produced an order? Stripe
  // can and does redeliver the same event more than once - this is what
  // makes that (and a refreshed confirmation page) harmless.
  const { data: existingOrder } = await supabaseAdmin
    .from('Orders')
    .select('OrderID')
    .eq('StripeSessionID', session.id)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ received: true, orderId: existingOrder.OrderID });
  }

  const metadata = session.metadata || {};

  let lineItems;
  try {
    lineItems = JSON.parse(metadata.line_items || '[]');
  } catch {
    console.error('Stripe webhook: unparsable line_items metadata, session', session.id);
    return NextResponse.json({ error: 'Malformed order metadata.' }, { status: 400 });
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    console.error('Stripe webhook: empty line_items metadata, session', session.id);
    return NextResponse.json({ error: 'Malformed order metadata.' }, { status: 400 });
  }

  const email = (metadata.email || session.customer_details?.email || '').trim().toLowerCase();
  if (!email) {
    console.error('Stripe webhook: no customer email available, session', session.id);
    return NextResponse.json({ error: 'Missing customer email.' }, { status: 400 });
  }

  // --- Returning customer: reuse their CustomerID. New customer: create
  // one in the web-reserved range. ---
  const { data: existingContact } = await supabaseAdmin
    .from('Customers_Contact')
    .select('CustomerID')
    .ilike('Email', email)
    .maybeSingle();

  let customerId;

  if (existingContact) {
    customerId = existingContact.CustomerID;

    // Refresh contact/address details with what they entered this time -
    // people move, numbers change. Loyalty status only ever gets turned
    // on here, never silently turned off by forgetting to re-check the
    // box on a later order.
    const contactUpdate = {
      Phone: metadata.phone,
      StreetAddress: metadata.street,
      Region: metadata.region,
      PostalCode: metadata.postal_code,
    };
    if (metadata.loyalty_opt_in === 'true') {
      contactUpdate.LoyaltyMember = true;
    }
    await supabaseAdmin.from('Customers_Contact').update(contactUpdate).eq('CustomerID', customerId);
  } else {
    const { data: newCustomerId, error: idError } = await supabaseAdmin.rpc('next_web_customer_id');
    if (idError || !newCustomerId) {
      console.error('Stripe webhook: could not generate CustomerID, session', session.id, idError?.message);
      return NextResponse.json({ error: 'Could not create customer record.' }, { status: 500 });
    }
    customerId = newCustomerId;

    const { error: coreError } = await supabaseAdmin.from('Customers_Core').insert({
      CustomerID: customerId,
      FirstName: metadata.first_name,
      LastName: metadata.last_name,
      CustomerType: 'Shipping',
      City: metadata.city,
      Country: metadata.country,
    });
    if (coreError) {
      console.error('Stripe webhook: Customers_Core insert failed, session', session.id, coreError.message);
      return NextResponse.json({ error: 'Could not create customer record.' }, { status: 500 });
    }

    const { error: contactError } = await supabaseAdmin.from('Customers_Contact').insert({
      CustomerID: customerId,
      Email: email,
      Phone: metadata.phone,
      LoyaltyMember: metadata.loyalty_opt_in === 'true',
      StreetAddress: metadata.street,
      Region: metadata.region,
      PostalCode: metadata.postal_code,
    });
    if (contactError) {
      console.error('Stripe webhook: Customers_Contact insert failed, session', session.id, contactError.message);
      return NextResponse.json({ error: 'Could not create customer record.' }, { status: 500 });
    }
  }

  // --- Order total, recomputed from the same server-verified numbers the
  // checkout route used to build the Stripe session in the first place -
  // never derived from anything a request to this endpoint could supply. ---
  const shippingFee = 12;
  const orderTotal = lineItems.reduce((sum, l) => sum + l.q * l.p, 0) + shippingFee;

  const { data: newOrderId, error: orderIdError } = await supabaseAdmin.rpc('next_web_order_id');
  if (orderIdError || !newOrderId) {
    console.error('Stripe webhook: could not generate OrderID, session', session.id, orderIdError?.message);
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }

  const { error: orderInsertError } = await supabaseAdmin.from('Orders').insert({
    OrderID: newOrderId,
    OrderDate: new Date().toISOString().slice(0, 10),
    CustID: customerId,
    LocationID: 'SHIP-INTL',
    SalesAssociate: 'WEB',
    Channel: 'Shipping',
    ShippingFee: shippingFee,
    OrderTotal: orderTotal,
    PaymentMethod: 'Card',
    StripeSessionID: session.id,
  });

  if (orderInsertError) {
    // Unique-violation on StripeSessionID means a concurrent webhook
    // delivery won the race and already created this order - not a real
    // error, just the idempotency guard doing its job.
    if (orderInsertError.code === '23505') {
      const { data: raceOrder } = await supabaseAdmin
        .from('Orders')
        .select('OrderID')
        .eq('StripeSessionID', session.id)
        .maybeSingle();
      return NextResponse.json({ received: true, orderId: raceOrder?.OrderID });
    }
    console.error('Stripe webhook: Orders insert failed, session', session.id, orderInsertError.message);
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }

  const orderLinesRows = lineItems.map((l, index) => ({
    OrderID: newOrderId,
    LineNumber: index + 1,
    ProductCode: l.s,
    Quantity: l.q,
    UnitPrice: l.p,
    DiscountPct: 0,
    LineCost: l.c === null || l.c === undefined ? null : l.c * l.q,
  }));

  const { error: linesError } = await supabaseAdmin.from('OrderLines').insert(orderLinesRows);
  if (linesError) {
    console.error('Stripe webhook: OrderLines insert failed, session', session.id, linesError.message);
    return NextResponse.json({ error: 'Order created but line items failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true, orderId: newOrderId });
}
