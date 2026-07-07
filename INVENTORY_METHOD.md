# Inventory & Reorder Method — Plain-Language Guide

This explains the Inventory & Reorder section of the `/management` dashboard, written so
you can explain it to your instructor without a supply-chain-management background. The
SQL lives in the `mgmt_inventory_status()` Postgres function; the UI is
`components/management/InventoryStatusSection.js`.

## The formula

**Reorder Point = Expected Demand During Lead Time + Safety Stock**

In this dashboard that becomes:

```
daily demand = (total units sold + total units rented, all-time) / months of history / 30.44
reorder point = daily demand × lead time (days)  +  daily demand × safety stock (days)
```

## What's real data vs. what's an assumption

**Real, computed from actual data (not editable):**
- **On-hand quantity** — straight from `Inventory.OnHandQty`, the shop's current count.
- **Daily/monthly demand rate** — sums real sale quantities from `OrderLines` plus real
  rental quantities from `RentalTransactions` for that exact SKU, divided by the real span
  of order history in the database (currently ~63 months). This is not estimated - it's the
  shop's actual, historical sell-through rate.
- **Months of history** — computed from the earliest to latest order/rental date on file.

**Manager-editable assumptions (clearly labeled as assumptions in the UI):**
- **Lead time (days)** — how long it takes a reorder to arrive from a supplier. The source
  spreadsheets (`The_Rusti_Shack_Dataset.xlsx` and its Apr 2026 update) do not track
  supplier lead times anywhere - this is a genuine gap in the data, already documented in
  `DATA_IMPORT_REPORT.md` section 6. Rather than invent a number and present it as real, the
  dashboard defaults to **14 days** and lets a manager change it live.
- **Safety stock (days)** — extra buffer stock to protect against demand spikes or supplier
  delays. Also not in the source data. Defaults to **7 days**, editable the same way.

Changing either input in the UI recalculates every row's reorder point and status instantly
- no server round-trip needed, since the underlying demand-rate numbers don't change, only
the lead-time/safety-stock multiplier does.

## Status labels

| Status | Meaning |
|---|---|
| **Out of Stock** | On-hand quantity is 0. |
| **Recommended for Reorder** | On-hand quantity is at or below the computed reorder point. |
| **Low** | On-hand quantity is above the reorder point but within 1.5x of it - worth watching. |
| **OK** | Comfortably above the reorder point. No action needed. |

## Why this isn't just "SourceReorderPoint" from the spreadsheet

The original inventory spreadsheet included its own `SourceReorderPoint` column - a static
number set once, with no visible method behind it. This dashboard doesn't discard that (it's
shown for comparison in the underlying data), but it doesn't rely on it either, because:

1. It doesn't update as sales/rental velocity changes over time.
2. There's no way to know what assumptions (if any) produced it.

The dashboard's reorder point is instead calculated fresh, every time, from real transaction
history plus transparent, adjustable assumptions - so a manager can trust *why* a number is
what it is, and adjust it as real supplier lead times become known.

## Known limitation

Demand is calculated per exact SKU (not grouped into product "families" the way some other
dashboard sections roll up variants), because reordering happens at the individual
variant/SKU level - you reorder the specific size/color that's low, not the product line as
a whole. If a product has very few historical sales at a specific SKU (e.g. a rarely-sold
color), its demand rate - and therefore its reorder point - will legitimately be low. This is
accurate to the real sales pattern, not a bug.
