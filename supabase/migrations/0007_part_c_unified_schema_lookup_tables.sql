-- Part C: Back Office unified data model. Extends the existing live
-- schema (products/Customers_Core/Customers_Contact/Orders/OrderLines)
-- rather than forking a disconnected "historical" copy. New tables
-- mirror the source workbook's own DataDictionary 1:1. Every table is
-- private by default: RLS enabled, zero public policies, matching the
-- posture of every other business table in this project.
--
-- Applied directly via the Supabase MCP (project enidbjvfescqvrzcpqun,
-- migration name part_c_unified_schema_lookup_tables). This file mirrors
-- that migration for the repo per SECURITY.md ("keep the schema and RLS
-- policies as SQL migration files in Git").

create table public."Stores" (
  "LocationCode" text primary key,
  "LocationName" text not null,
  "StoreType" text not null check ("StoreType" in ('Walk-in','Shipping')),
  "Country" text,
  created_at timestamptz not null default now()
);
alter table public."Stores" enable row level security;
comment on table public."Stores" is 'Physical/logical locations (2 walk-in shops + the international ship-out channel). Mirrors the Stores spreadsheet tab. Private: RLS enabled, no policies.';

insert into public."Stores" ("LocationCode","LocationName","StoreType","Country") values
  ('APO-MAIN','Apo Island Main Shop','Walk-in','Philippines'),
  ('APO-DOCK','Dock-Side Kiosk','Walk-in','Philippines'),
  ('SHIP-INTL','International Ship-Out','Shipping','Various');

create table public."Employees" (
  "EmpID" text primary key,
  "FirstName" text not null,
  "LastName" text not null,
  "Role" text,
  "HireDate" date,
  "HomeStore" text references public."Stores"("LocationCode"),
  created_at timestamptz not null default now()
);
alter table public."Employees" enable row level security;
comment on table public."Employees" is 'Staff who ring up walk-in sales/rentals. Mirrors the Employees spreadsheet tab, plus one synthetic WEB row for online-checkout orders (not in the source data) so Orders.SalesAssociate can be a real foreign key for every order, historical and web alike. Private: RLS enabled, no policies.';

insert into public."Employees" ("EmpID","FirstName","LastName","Role","HireDate","HomeStore") values
  ('E001','Marisol','Dela Cruz','Owner','2021-04-01','APO-MAIN'),
  ('E002','Liwayway','Bautista','Sales','2021-08-15','APO-MAIN'),
  ('E003','Tala','Mendoza','Sales','2022-06-01','APO-DOCK'),
  ('E004','Diego','Ramos','Lead Sales','2022-12-01','APO-MAIN'),
  ('E005','Kiko','Reyes','Shipping Clerk','2023-09-15','SHIP-INTL'),
  ('E006','Bayani','Santos','Dive Specialist','2024-02-10','APO-MAIN'),
  ('E007','Dalisay','Aquino','Sales (Seasonal)','2024-11-15','APO-DOCK'),
  ('WEB','Website','(automated)','Online Checkout','2026-07-01','SHIP-INTL');

alter table public."Orders" drop constraint if exists "Orders_LocationID_check";
alter table public."Orders" add constraint "Orders_LocationID_fkey" foreign key ("LocationID") references public."Stores"("LocationCode");
alter table public."Orders" add constraint "Orders_SalesAssociate_fkey" foreign key ("SalesAssociate") references public."Employees"("EmpID");

create table public."Promotions" (
  "PromoCode" text primary key,
  "PromoName" text not null,
  "PromoType" text,
  "DiscountPct" integer check ("DiscountPct" >= 0 and "DiscountPct" <= 100),
  "StartDate" date,
  "EndDate" date,
  "Channel" text check ("Channel" in ('Walk-in','Shipping','Both')),
  created_at timestamptz not null default now()
);
alter table public."Promotions" enable row level security;
comment on table public."Promotions" is 'Named discount campaigns. Mirrors the Promotions spreadsheet tab. Private: RLS enabled, no policies (promo economics are internal, not public).';

create table public."Inventory" (
  "SKU" text primary key references public.products("sku"),
  "OnHandQty" integer not null check ("OnHandQty" >= 0),
  "SourceReorderPoint" integer check ("SourceReorderPoint" >= 0),
  "RentalUnits" integer check ("RentalUnits" >= 0),
  "AvailableForSale" integer check ("AvailableForSale" >= 0),
  "WarehouseLocation" text,
  "LastCountDate" date,
  created_at timestamptz not null default now()
);
alter table public."Inventory" enable row level security;
comment on table public."Inventory" is 'Physical inventory snapshot (single point-in-time count, not a movement history). Mirrors the Inventory spreadsheet tab (ReorderPoint renamed SourceReorderPoint to distinguish the spreadsheet''s own figure from the dashboard''s independently computed reorder point). Private: RLS enabled, no policies.';

-- Promotions (45 rows) and Inventory (197 rows) data inserts omitted
-- from this file for length - they were applied directly via MCP and
-- can be regenerated from The_Rusti_Shack_Dataset.xlsx's Promotions and
-- Inventory sheets if this migration is ever replayed from scratch.
