import { createClient } from '@supabase/supabase-js';

// Publishable key only - safe for server and browser use. This project never
// uses a Supabase secret/service_role key; all writes to the catalog happen
// outside the website (Supabase SQL editor / migrations), never through app
// code, so a publishable-key client is all the site itself ever needs.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Set them in .env.local (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});
