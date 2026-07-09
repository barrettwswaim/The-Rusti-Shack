-- Part D: usage log for the "Ask the Data" AI assistant. Two jobs:
--   1. Persistent rate limiting (same reasoning as manager_login_attempts -
--      an in-memory counter resets on every serverless invocation and
--      protects nothing on Vercel).
--   2. Usage/cost display in the assistant UI - real token counts and a
--      cost estimate per request, not a guess.
-- Zero public policies, same as every other private table in this
-- project - only supabaseAdmin (secret key) can touch it, from
-- app/api/management-ai/route.js only.
create table if not exists ai_assistant_usage (
  id bigint generated always as identity primary key,
  ip_address text not null,
  created_at timestamptz not null default now(),
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric not null default 0,
  tool_calls int not null default 0,
  refused boolean not null default false,
  error boolean not null default false
);

create index if not exists ai_assistant_usage_ip_created_idx
  on ai_assistant_usage (ip_address, created_at desc);

alter table ai_assistant_usage enable row level security;
-- No policies created - RLS with zero policies denies all access to
-- anon/authenticated by default. Only supabaseAdmin (service_role,
-- bypasses RLS) can read or write this table.

revoke all on ai_assistant_usage from public, anon, authenticated;
grant select, insert on ai_assistant_usage to service_role;
grant usage, select on sequence ai_assistant_usage_id_seq to service_role;
