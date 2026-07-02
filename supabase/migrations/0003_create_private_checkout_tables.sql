-- The Rusti Shack: empty tables for future web checkout data.
-- Column names and capitalization match the spreadsheet tabs exactly
-- (Customers_Core, Customers_Contact, Orders, OrderLines), so every
-- identifier below is double-quoted to preserve exact case in Postgres.
--
-- Security posture (per SECURITY.md section 4, and explicit instruction):
-- RLS is enabled on all four tables with ZERO policies. Not read-only -
-- fully closed. No anon/authenticated access of any kind. Only a
-- service-role/secret-key context (never used by the website) can touch
-- these until real checkout code adds its own deliberate access rules.

-- 1. Customers_Core
create table if not exists public."Customers_Core" (
  "CustomerID"    text primary key,
  "FirstName"     text not null,
  "LastName"      text not null,
  "CustomerType"  text check ("CustomerType" in ('Local', 'Tourist', 'Shipping')),
  "JoinDate"      date not null default current_date,
  "City"          text,
  "Country"       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public."Customers_Core" enable row level security;

comment on table public."Customers_Core" is
  'Customer identity data for future web checkout. Mirrors the '
  'Customers_Core spreadsheet tab. Private: RLS enabled, no policies - '
  'no public read or write access of any kind.';

-- 2. Customers_Contact (1:1 with Customers_Core)
create table if not exists public."Customers_Contact" (
  "CustomerID"    text primary key references public."Customers_Core" ("CustomerID") on delete cascade,
  "Email"         text,
  "Phone"         text,
  "LoyaltyMember" boolean,
  "StreetAddress" text,
  "Region"        text,
  "PostalCode"    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists customers_contact_email_unique_idx
  on public."Customers_Contact" (lower("Email"))
  where "Email" is not null;

alter table public."Customers_Contact" enable row level security;

comment on table public."Customers_Contact" is
  'Contact and shipping details for future web checkout, 1:1 with '
  'Customers_Core. StreetAddress/Region/PostalCode are new fields not '
  'in the original spreadsheet, added for shipping. LoyaltyMember is '
  'boolean here vs. Yes/No text in the spreadsheet. Private: RLS '
  'enabled, no policies.';

-- 3. Orders
create table if not exists public."Orders" (
  "OrderID"        text primary key,
  "OrderDate"      date not null default current_date,
  "CustID"         text not null references public."Customers_Core" ("CustomerID"),
  "LocationID"     text check ("LocationID" in ('APO-MAIN', 'APO-DOCK', 'SHIP-INTL')),
  "SalesAssociate" text,
  "Channel"        text not null check ("Channel" in ('Walk-in', 'Shipping')),
  "ShippingFee"    numeric(10, 2) not null default 0 check ("ShippingFee" >= 0),
  "OrderTotal"     numeric(10, 2) not null check ("OrderTotal" >= 0),
  "PaymentMethod"  text check ("PaymentMethod" in ('Card', 'Cash', 'GCash', 'BankTransfer')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_custid_idx on public."Orders" ("CustID");
create index if not exists orders_orderdate_idx on public."Orders" ("OrderDate");

alter table public."Orders" enable row level security;

comment on table public."Orders" is
  'Order header data for future web checkout. LocationID/SalesAssociate '
  'would reference Stores/Employees tables that do not exist in '
  'Supabase yet, so LocationID is constrained by CHECK instead of a '
  'foreign key for now. Private: RLS enabled, no policies.';

-- 4. OrderLines
create table if not exists public."OrderLines" (
  "OrderID"                text not null references public."Orders" ("OrderID") on delete cascade,
  "LineNumber"              integer not null check ("LineNumber" > 0),
  "ProductCode"             text not null references public.products (sku),
  "Quantity"                integer not null check ("Quantity" > 0),
  "UnitPrice"               numeric(10, 2) not null check ("UnitPrice" >= 0),
  "DiscountPct"             integer not null default 0 check ("DiscountPct" between 0 and 100),
  "LineRevenue"             numeric(10, 2) generated always as (
                                "Quantity" * "UnitPrice" * (1 - "DiscountPct" / 100.0)
                              ) stored,
  "LineCost"                numeric(10, 2) check ("LineCost" is null or "LineCost" >= 0),
  "EffectiveDiscountAmount" numeric(10, 2) generated always as (
                                "Quantity" * "UnitPrice" * ("DiscountPct" / 100.0)
                              ) stored,
  created_at                timestamptz not null default now(),
  primary key ("OrderID", "LineNumber")
);

create index if not exists orderlines_productcode_idx on public."OrderLines" ("ProductCode");

alter table public."OrderLines" enable row level security;

comment on table public."OrderLines" is
  'Order line items for future web checkout. LineRevenue and '
  'EffectiveDiscountAmount are database-computed from Quantity, '
  'UnitPrice, and DiscountPct so they can never be stored '
  'inconsistently. ProductCode is a real foreign key into products.sku. '
  'Private: RLS enabled, no policies.';
