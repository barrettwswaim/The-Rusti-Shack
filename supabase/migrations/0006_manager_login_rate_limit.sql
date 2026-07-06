-- The Rusti Shack: persistent rate-limit store for /manager login attempts.
--
-- Why this table exists (SECURITY.md section 6 + section 7):
--   Section 6 requires admin login attempts to be rate-limited with a
--   lockout after repeated failures. The /manager page deliberately uses a
--   shared-password + signed-cookie scheme instead of Supabase Auth (a
--   documented trade-off), so Supabase Auth's built-in rate-limiting is not
--   available here for free - this table is the persistent store that
--   replaces it. Section 7 explicitly warns that "an in-memory counter
--   resets on every serverless invocation and protects nothing," which
--   rules out a plain JS variable/module-level counter on Vercel.
--
-- Security posture (per SECURITY.md section 4, same pattern as every other
-- private table in this project): RLS is enabled with ZERO policies. Only
-- a service-role/secret-key context (lib/supabaseAdmin.js, used only by
-- app/api/manager-login/route.js) can read or write this table. It is
-- never reachable with the public publishable key.

create table if not exists public.manager_login_attempts (
  ip_address       text primary key,
  failed_count     integer not null default 0 check (failed_count >= 0),
  first_failed_at  timestamptz not null default now(),
  locked_until     timestamptz,
  updated_at       timestamptz not null default now()
);

alter table public.manager_login_attempts enable row level security;

comment on table public.manager_login_attempts is
  'Tracks failed /manager login attempts per IP address, for the '
  'rate-limit/lockout logic in app/api/manager-login/route.js. Not '
  'customer or order data - operational security data only. Private: '
  'RLS enabled, no policies - no public read or write access of any kind.';
