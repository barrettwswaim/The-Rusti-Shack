// Server-only Stripe client, using the secret key. Never import this file
// from any 'use client' component - it must only ever run in server code
// (the two Route Handlers under app/api/). The secret key must never
// reach the browser bundle, be logged, or be committed anywhere.
import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY. Set it in .env.local (see .env.example). ' +
      'Never put this value in a NEXT_PUBLIC_ variable or any client-side file.'
  );
}

const stripe = new Stripe(secretKey);

export default stripe;
