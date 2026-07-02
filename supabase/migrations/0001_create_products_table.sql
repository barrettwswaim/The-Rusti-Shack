-- The Rusti Shack: products table
-- Mirrors the Products tab of The_Rusti_Shack_Dataset.xlsx, one row per SKU
-- (including parent, standalone, and size/color/gender variant rows).
--
-- Security posture (per SECURITY.md section 4):
--   - RLS is enabled immediately, before any policy exists (default: deny all).
--   - Exactly one policy is added: public SELECT.
--   - No public INSERT/UPDATE/DELETE policy exists, so those remain denied
--     for anyone using the publishable key. Catalog writes happen only via
--     the Supabase SQL editor or a service-role context, never from the site.

create table if not exists public.products (
  sku            text primary key,
  product_name   text not null,
  category       text not null,
  subcategory    text,
  unit_cost      numeric(10, 2) check (unit_cost >= 0),
  unit_price     numeric(10, 2) not null check (unit_price >= 0),
  weight_kg      numeric(6, 2) check (weight_kg >= 0),
  supplier       text,
  rental_rate    numeric(10, 2) check (rental_rate >= 0),
  availability   text not null check (availability in ('Sale only', 'Both', 'Rental only')),
  year_introduced integer,
  parent_sku     text references public.products (sku) on delete set null,
  size           text,
  color          text,
  gender         text check (gender is null or gender in ('M', 'W', 'U')),
  variant_type   text not null check (variant_type in ('Parent', 'Variant', 'Standalone')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_parent_sku_idx on public.products (parent_sku);
create index if not exists products_category_idx on public.products (category);

-- Row Level Security: deny everything by default, then open exactly one door.
alter table public.products enable row level security;

-- Public (anon / publishable-key) reads only. No public write policy exists,
-- so insert/update/delete are denied for anyone using the publishable key.
create policy "Public products are viewable by everyone"
  on public.products
  for select
  to anon, authenticated
  using (true);

comment on table public.products is
  'Full catalog mirror of the Products tab (197 rows). Public: read-only. '
  'unit_cost and supplier are stored for the business but should never be '
  'selected by the public-facing website queries.';
