-- Part C: rental transactions + the order-promotion bridge table.
-- Applied directly via the Supabase MCP (migration name
-- part_c_rental_and_promotion_tables). Mirrors that migration for the
-- repo per SECURITY.md's "schema in Git" rule.

create table public."RentalTransactions" (
  "RentalID" text primary key,
  "RentalDate" date not null,
  "CustID" text references public."Customers_Core"("CustomerID"),
  "LocationID" text references public."Stores"("LocationCode"),
  "SalesAssociate" text references public."Employees"("EmpID"),
  "SKU" text references public.products("sku"),
  "Quantity" integer not null check ("Quantity" > 0),
  "DailyRate" numeric not null check ("DailyRate" >= 0),
  "RentalRevenue" numeric generated always as ("Quantity"::numeric * "DailyRate") stored,
  "Returned" text check ("Returned" in ('Yes','No')),
  created_at timestamptz not null default now()
);
alter table public."RentalTransactions" enable row level security;
comment on table public."RentalTransactions" is 'Same-day walk-in rentals (checked out and returned the same day). Never created by the website - only Apo Island Main Shop and Dock-Side Kiosk rent gear, arranged in person (CLAUDE.md section 4). RentalRevenue is database-computed from Quantity*DailyRate. Private: RLS enabled, no policies.';

create table public."OrderPromotions" (
  "OrderID" text not null references public."Orders"("OrderID"),
  "PromoCode" text not null references public."Promotions"("PromoCode"),
  primary key ("OrderID","PromoCode")
);
alter table public."OrderPromotions" enable row level security;
comment on table public."OrderPromotions" is 'M:N bridge: which named promo code(s) applied to which order. Mirrors the OrderPromotions spreadsheet tab. Private: RLS enabled, no policies.';

-- Promotions data insert (35 remaining rows beyond the first 10 already
-- in migration 0007) omitted here for length - applied directly via
-- MCP, regenerable from the Promotions sheet if replayed from scratch.
