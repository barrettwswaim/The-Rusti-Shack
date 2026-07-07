-- Inventory velocity + reorder view for the /management Inventory
-- section. See INVENTORY_METHOD.md for the full plain-language
-- explanation. Lead time and safety stock are NOT in the source data
-- (documented gap - see DATA_IMPORT_REPORT.md section 6), so they are
-- never computed here as if real - they're parameters supplied by the
-- manager-editable UI control, with sensible defaults (14 lead-time
-- days / 7 safety-stock days). Everything else (on-hand qty, real
-- sales+rental velocity, months of real history) is computed live from
-- actual transaction data.
create or replace function mgmt_inventory_status(
  p_lead_time_days int default 14,
  p_safety_stock_days int default 7
)
returns table (
  sku text,
  product_name text,
  category text,
  on_hand_qty int,
  source_reorder_point int,
  sale_units_total numeric,
  rental_units_total numeric,
  months_of_history numeric,
  avg_monthly_demand numeric,
  daily_demand numeric,
  reorder_point numeric,
  status text
)
language sql stable
as $$
  with history_range as (
    select
      least(
        (select min("OrderDate") from "Orders"),
        (select min("RentalDate") from "RentalTransactions")
      ) as min_date,
      greatest(
        (select max("OrderDate") from "Orders"),
        (select max("RentalDate") from "RentalTransactions")
      ) as max_date
  ),
  months as (
    select greatest(1, (extract(year from max_date) - extract(year from min_date)) * 12
      + (extract(month from max_date) - extract(month from min_date)) + 1) as n
    from history_range
  ),
  sales as (
    select ol."ProductCode" as sku, sum(ol."Quantity")::numeric as qty
    from "OrderLines" ol
    group by ol."ProductCode"
  ),
  rentals as (
    select rt."SKU" as sku, sum(rt."Quantity")::numeric as qty
    from "RentalTransactions" rt
    group by rt."SKU"
  )
  select
    i."SKU",
    p.product_name,
    p.category,
    i."OnHandQty",
    i."SourceReorderPoint",
    coalesce(s.qty, 0) as sale_units_total,
    coalesce(r.qty, 0) as rental_units_total,
    round(m.n, 1) as months_of_history,
    round((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n, 2) as avg_monthly_demand,
    round((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44, 3) as daily_demand,
    round(
      ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_lead_time_days
      + ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_safety_stock_days,
      1
    ) as reorder_point,
    case
      when i."OnHandQty" <= 0 then 'Out of Stock'
      when i."OnHandQty" <= (
        ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_lead_time_days
        + ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_safety_stock_days
      ) then 'Recommended for Reorder'
      when i."OnHandQty" <= (
        ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_lead_time_days
        + ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_safety_stock_days
      ) * 1.5 then 'Low'
      else 'OK'
    end as status
  from "Inventory" i
  left join products p on p.sku = i."SKU"
  left join sales s on s.sku = i."SKU"
  left join rentals r on r.sku = i."SKU"
  cross join months m
  order by
    case
      when i."OnHandQty" <= 0 then 0
      when i."OnHandQty" <= (
        ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_lead_time_days
        + ((coalesce(s.qty, 0) + coalesce(r.qty, 0)) / m.n / 30.44) * p_safety_stock_days
      ) then 1
      else 2
    end,
    coalesce(s.qty, 0) + coalesce(r.qty, 0) desc;
$$;

revoke execute on function mgmt_inventory_status(int, int) from public, anon, authenticated;
grant execute on function mgmt_inventory_status(int, int) to service_role;
