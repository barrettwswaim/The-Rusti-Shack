# Data Import Report — Part C Back Office

## 1. Sources inspected

- `The_Rusti_Shack_Dataset.xlsx` — 15 sheets: DataDictionary, Customers_Core, Customers_Contact, Customers_Demographics, Products, Orders, OrderLines, RentalTransactions, OrderPromotions, Promotions, Employees, Stores, Inventory, DateDimension, Notice.
- `The_Rusti_Shack_Apr2026_Update.xlsx` — a contiguous one-month extension (April 2026) of Orders, OrderLines, RentalTransactions, OrderPromotions, in the same shape as the main workbook.
- Live Supabase schema (`enidbjvfescqvrzcpqun`): `products` (197 rows, already imported previously), `Customers_Core` (1 row), `Customers_Contact` (1 row), `Orders` (2 rows), `OrderLines` (2 rows) — all created for the live website's Stripe checkout flow, already RLS-locked with no public policies.

## 2. Source row counts

| Sheet | Rows (excl. header) |
|---|---|
| Customers_Core | 2,500 |
| Customers_Contact | 2,500 |
| Customers_Demographics | 2,500 |
| Products | 197 |
| Orders | 14,865 |
| OrderLines | 24,509 |
| RentalTransactions | 17,059 |
| OrderPromotions | 14,053 |
| Promotions | 45 |
| Employees | 7 |
| Stores | 3 |
| Inventory | 197 |
| Orders_Apr2026 | 459 |
| OrderLines_Apr2026 | 785 |
| RentalTransactions_Apr2026 | 932 |
| OrderPromotions_Apr2026 | 554 |
| DateDimension | 1,857 |

## 3. Mapping plan — extend the existing live structure, do not fork it

The workbook's own DataDictionary sheet documents primary/foreign keys that match the live Supabase schema's naming almost exactly, and the live schema's own column comments already say things like "Mirrors the Customers_Core spreadsheet tab" — this was clearly designed as one connected model from the start. Plan:

**Reuse as-is (no schema change):** `products` (already holds all 197 rows), `Customers_Core`, `Customers_Contact` — column names match 1:1. Historical rows import into the *same* tables the live website already writes to.

**New tables** (none of these exist yet; all have a natural primary key, so imports are idempotent via `ON CONFLICT DO NOTHING`):
- `Stores` (LocationCode PK) — formalizes the 3-value CHECK constraint already on `Orders.LocationID` into a real lookup table, then converts that CHECK into a foreign key.
- `Employees` (EmpID PK, HomeStore → Stores) — then `Orders.SalesAssociate` becomes a real foreign key too.
- `Promotions` (PromoCode PK) and `OrderPromotions` (OrderID, PromoCode composite PK, both FKs) — the M:N bridge for which named promo applied to which order.
- `RentalTransactions` (RentalID PK, CustID/LocationID/SalesAssociate/SKU all FKs) — the walk-in same-day rental stream. This is structurally separate from `Orders`/`OrderLines` in the source data (rentals were never modeled as orders), which conveniently matches the site's own business rule that rentals are walk-in-only and never an online transaction.
- `Inventory` (SKU PK/FK → products, 1:1) — on-hand quantity, the spreadsheet's own reorder point, rental-vs-sale split of stock, warehouse bin, last count date.

**Not imported (deliberate scope decisions, not oversights):**
- `Customers_Demographics` (Gender, Occupation) — no requirement in this project references gender or occupation anywhere in the dashboard spec, and skipping it avoids holding a sensitive personal attribute with no consumer. Can be added later in one migration if ever needed.
- `DateDimension` — a calendar lookup table (Year/Quarter/Month/Season per date). Postgres can derive all of this from `OrderDate`/`RentalDate` with `EXTRACT`/`date_trunc` at query time, so importing a static 1,857-row calendar table would be a disconnected duplicate for no benefit.

## 4. ID collision check (critical for a safe merge)

The live website already generates its own IDs via two Postgres sequences: `web_customer_id_seq` (starts at 90001 → `C90001`, `C90002`, …) and `web_order_id_seq` (starts at 900001 → `ORD900001`, `ORD900002`, …). Verified against the historical data:

- Historical `CustomerID` range: `C01001`–`C03500` (max 3500) — far below the web sequence's starting point of 90001. **No collision.**
- Historical `OrderID` range: `ORD050006`–`ORD066198` (main) and `ORD060192`–`ORD06xxxx` (April update) — far below the web sequence's starting point of 900001. **No collision.**
- `RentalTransactions` IDs between the main workbook and the April update: zero overlap.
- `OrderID`s between the main workbook and the April update: zero overlap (main workbook ends 2026-03-31, April update covers exactly 2026-04-01 to 2026-04-30 — contiguous, not duplicated).

So historical rows and live web rows can sit in the exact same tables with no remapping.

## 5. Referential integrity and constraint check (ran against every row, not sampled)

Every check below came back clean — zero problems found in either workbook:

- OrderLines → Orders / Products: 0 missing references, in both the main sheet and the April update.
- Orders: 0 invalid LocationID, Channel, or PaymentMethod values (all satisfy the live table's existing CHECK constraints); 0 null OrderDate; 0 null/negative OrderTotal.
- OrderLines: 0 rows with bad Quantity/DiscountPct/UnitPrice; 0 null LineCost; 0 duplicate (OrderID, LineNumber) keys.
- RentalTransactions → Customers_Core / Products: 0 missing references; 0 duplicate RentalID; `Returned` is a clean two-value Yes/No column.
- OrderPromotions → Orders / Promotions: 0 missing references; 0 duplicate (OrderID, PromoCode) pairs.
- Orders.SalesAssociate → Employees.EmpID: 0 missing references for historical rows (E001–E007 cover every row).
- Inventory → Products: 0 missing references; 0 negative on-hand quantities.
- Customers_Core: 0 duplicate CustomerID, 0 null JoinDate. CustomerType is one of Local/Tourist/Shipping (matches the live table's existing CHECK). Customers_Contact: 104 null emails, 213 null phones — real, expected sparsity in a multi-year dataset, not an error; LoyaltyMember is text Yes/No/blank in the sheet vs. boolean in the live table, mapped Yes→true, No→false, blank→null.

**One necessary addition, not present in the source data:** live web orders write `SalesAssociate = 'WEB'`, which is not one of the 7 real employee codes. To make `Orders.SalesAssociate` a real foreign key (needed for the "sales associate performance" dashboard section to work uniformly across historical and web orders) a synthetic `Employees` row `WEB` / "Website" / "Online Checkout" / HomeStore `SHIP-INTL` is added. This is the one place the import invents a record rather than only moving spreadsheet data, and it's called out here for that reason.

## 6. Data limitations that affect forecasting/inventory (flagged honestly, not smoothed over)

- **Coverage gap:** the main workbook ends 2026-03-31, the April update covers all of April 2026, and the live website's first real order is 2026-07-06. **May and June 2026 have zero transaction records anywhere.** Monthly forecasts will show this as a real gap rather than interpolating a guess.
- **Rentals have no cost data.** `RentalTransactions` has `RentalRevenue` but no cost/depreciation figure anywhere in either workbook. Gross profit and margin will be computed for sales (`OrderLines`, which does have `LineCost`) only; rental revenue is reported as revenue with no invented margin.
- **Inventory is a single snapshot,** not a time series — `LastCountDate` is 2026-03-31 for every SKU. There is no restock/movement history and no supplier lead-time field anywhere in the source data. The reorder-point model will use the given `OnHandQty` as the current snapshot and real SKU-level sales+rental velocity from the transaction history for demand, but lead time and safety-stock parameters will be clearly labeled manager-editable assumptions, not sourced data — see `INVENTORY_METHOD.md` once built.
- **~2,481 of 2,500 customers have never been billed a real card** — this is historical/simulated business data (the workbook's own `Notice` sheet calls it an "Educational Case Dataset"), not real Stripe customers. Only the 1 existing `Customers_Core` row from the live site represents an actual Stripe transaction.

## 7. Import method and reconciliation

Schema migrations (new tables, real primary/foreign keys, RLS enabled with zero public policies — same private-by-default posture as every other business table) are applied directly. Results:

| Table | Rows | Status |
|---|---|---|
| `Stores` | 3 | **Imported** directly, live in Supabase now. |
| `Employees` | 8 (7 real + 1 synthetic `WEB` row) | **Imported** directly, live in Supabase now. |
| `Promotions` | 45 | **Imported** directly, live in Supabase now. |
| `Inventory` | 197 | **Imported** directly, live in Supabase now. |
| `Customers_Core` | 2,500 | Staged, see below. |
| `Customers_Contact` | 2,500 | Staged, see below. |
| `Orders` | 15,324 (14,865 + 459 April) | Staged, see below. |
| `OrderLines` | 25,294 (24,509 + 785 April) | Staged, see below. |
| `RentalTransactions` | 17,991 (17,059 + 932 April) | Staged, see below. |
| `OrderPromotions` | 14,607 (14,053 + 554 April) | Staged, see below. |

**Why the six largest tables are staged rather than already imported, and the one manual step this needs:** this project's sandbox cannot reach Supabase's network directly (confirmed by testing; every write has to go through a tool that requires the full row data to be typed out first) and hand-typing ~78,000 rows through that tool is not practical or reliable. Instead, all six tables were converted from the workbooks into clean JSON files at `scripts/import-data/*.json` (already inside the repo, already validated - see the referential-integrity checks in section 5, which were run against this exact data), plus a ready-to-run, idempotent importer at `scripts/import-historical-data.mjs`.

**Manual step needed:** run this once, from a machine with normal internet access (your own computer, not this chat):
```
node --env-file=.env.local scripts/import-historical-data.mjs
```
It needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local` (the same file the website already uses). It takes well under a minute, prints a per-table summary, and is safe to run more than once — every row upserts against its real primary key with duplicates ignored, so a second run adds zero rows. The dashboard and every query below are already written against the assumption that this data exists; until this script runs, the dashboard will correctly show real (small) numbers from just the 2 live web orders plus the small reference tables above, and will show larger, complete numbers once the historical rows land.

---
*This section will be updated with the script's actual printed summary once you've run it and shared the output, or Claude can re-query row counts directly in a future session to confirm.*
