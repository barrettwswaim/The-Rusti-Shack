// Server-only Supabase client using the SECRET key - this is the only
// place in the whole project that key is ever used. It bypasses Row
// Level Security entirely, which is exactly why it's confined to two
// server-only files that import it: app/api/checkout/route.js and
// app/api/stripe-webhook/route.js. Never import this from a 'use client'
// component, and never let this key reach the browser bundle.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in ' +
      '.env.local (see .env.example). SUPABASE_SECRET_KEY must never be ' +
      'prefixed with NEXT_PUBLIC_ or used in any client-side file.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false },
});
