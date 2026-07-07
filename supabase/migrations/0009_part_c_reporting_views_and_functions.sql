-- Part C reporting layer: views + RPC functions backing /management.
-- This migration documents SQL that was originally applied directly
-- against the live database via the Supabase MCP tool in an earlier
-- session and is being mirrored into the repo now for the record - it
-- is idempotent (CREATE OR REPLACE) so re-running it is safe.
--
-- SECURITY NOTE: when these functions were first created, they were
-- left with Postgres's default PUBLIC execute grant, which meant the
-- anon/authenticated roles (i.e. anyone with the public/publishable
-- key) could call them directly via the Supabase REST API and read
-- private revenue/customer/employee data, completely bypassing the
-- /management session-cookie check. That gap was found and fixed in
-- this same session (see the REVOKE/GRANT statements at the bottom of
-- this file) - this migration reproduces the CORRECTED, locked-down
-- state, not the original vulnerable one.

-- ---------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------

create or replace view public.v_product_family as
select sku, coalesce(parent_sku, sku) as family_key, category, subcategory, availability
from products p;

create or replace view public.v_product_family_name as
select distinct on (coalesce(parent_sku, sku))
  coalesce(parent_sku, sku) as family_key,
  product_name as family_name
from products
order by coalesce(parent_sku, sku),
  case variant_type when 'Parent' then 0 when 'Standalone' then 1 else 2 end;

create or replace view public.v_sales_lines as
select
  o."OrderID", o."OrderDate", o."LocationID", o."SalesAssociate", o."Channel", o."CustID",
  ol."ProductCode", ol."Quantity", ol."UnitPrice", ol."DiscountPct", ol."LineRevenue", ol."LineCost",
  extract(year from o."OrderDate")::int as year,
  extract(month from o."OrderDate")::int as month_num,
  date_trunc('month', o."OrderDate"::timestamptz)::date as month_start,
  pf.family_key, pf.category, pf.subcategory
from "OrderLines" ol
join "Orders" o on o."OrderID" = ol."OrderID"
join v_product_family pf on pf.sku = ol."ProductCode";

create or replace view public.v_rental_lines as
select
  rt."RentalID", rt."RentalDate", rt."LocationID", rt."SalesAssociate", rt."CustID",
  rt."SKU", rt."Quantity", rt."DailyRate", rt."RentalRevenue",
  extract(year from rt."RentalDate")::int as year,
  extract(month from rt."RentalDate")::int as month_num,
  date_trunc('month', rt."RentalDate"::timestamptz)::date as month_start,
  pf.family_key, pf.category, pf.subcategory
from "RentalTransactions" rt
join v_product_family pf on pf.sku = rt."SKU";

-- ---------------------------------------------------------------
-- Functions (all STABLE SQL, all p_year integer default null = all years)
-- ---------------------------------------------------------------

create or replace function public.mgmt_available_years()
returns table(year int) language sql stable as $$
  select distinct extract(year from d)::int as year from (
    select "OrderDate" as d from public."Orders"
    union all
    select "RentalDate" as d from public."RentalTransactions"
  ) all_dates
  order by 1;
$$;

create or replace function public.mgmt_last_7_days()
returns table(order_count bigint, revenue numeric) language sql stable as $$
  select count(*)::bigint, coalesce(sum("OrderTotal"), 0)::numeric
  from public."Orders"
  where "OrderDate" >= (current_date - interval '6 days')::date;
$$;

create or replace function public.mgmt_quick_overview(p_year integer default null)
returns table(
  sales_revenue numeric, sales_cost numeric, sales_gross_profit numeric, sales_gross_margin_pct numeric,
  rental_revenue numeric, total_revenue numeric,
  best_seller_family text, best_seller_name text, best_seller_qty numeric
) language sql stable as $$
  with s as (
    select coalesce(sum("LineRevenue"), 0)::numeric as revenue, coalesce(sum("LineCost"), 0)::numeric as cost
    from public.v_sales_lines where p_year is null or year = p_year
  ),
  r as (
    select coalesce(sum("RentalRevenue"), 0)::numeric as revenue
    from public.v_rental_lines where p_year is null or year = p_year
  ),
  best as (
    select family_key, sum("Quantity") as qty
    from public.v_sales_lines where p_year is null or year = p_year
    group by family_key order by sum("Quantity") desc limit 1
  )
  select
    s.revenue, s.cost, (s.revenue - s.cost),
    case when s.revenue > 0 then round(((s.revenue - s.cost) / s.revenue * 100)::numeric, 2) else null end,
    r.revenue, (s.revenue + r.revenue),
    best.family_key, fn.family_name, best.qty
  from s, r
  left join best on true
  left join public.v_product_family_name fn on fn.family_key = best.family_key;
$$;

create or replace function public.mgmt_monthly_performance(p_year integer default null)
returns table(
  month_start date, sales_revenue numeric, sales_cost numeric, sales_gross_profit numeric,
  sales_gross_margin_pct numeric, rental_revenue numeric, total_revenue numeric
) language sql stable as $$
  with s as (
    select month_start, sum("LineRevenue")::numeric as revenue, sum("LineCost")::numeric as cost
    from public.v_sales_lines where p_year is null or year = p_year
    group by month_start
  ),
  r as (
    select month_start, sum("RentalRevenue")::numeric as revenue
    from public.v_rental_lines where p_year is null or year = p_year
    group by month_start
  )
  select
    coalesce(s.month_start, r.month_start),
    coalesce(s.revenue, 0), coalesce(s.cost, 0), coalesce(s.revenue, 0) - coalesce(s.cost, 0),
    case when coalesce(s.revenue,0) > 0 then round(((coalesce(s.revenue,0) - coalesce(s.cost,0)) / s.revenue * 100)::numeric, 2) else null end,
    coalesce(r.revenue, 0),
    coalesce(s.revenue, 0) + coalesce(r.revenue, 0)
  from s
  full outer join r on r.month_start = s.month_start
  order by 1;
$$;

create or replace function public.mgmt_category_performance(p_year integer default null)
returns table(category text, revenue numeric, cost numeric, gross_profit numeric, gross_margin_pct numeric)
language sql stable as $$
  select category, sum("LineRevenue")::numeric, sum("LineCost")::numeric,
    (sum("LineRevenue") - sum("LineCost"))::numeric,
    case when sum("LineRevenue") > 0 then round(((sum("LineRevenue") - sum("LineCost")) / sum("LineRevenue") * 100)::numeric, 2) else null end
  from public.v_sales_lines
  where p_year is null or year = p_year
  group by category
  order by sum("LineRevenue") desc;
$$;

create or replace function public.mgmt_channel_performance(p_year integer default null)
returns table(location_code text, location_name text, sales_revenue numeric, rental_revenue numeric, order_count bigint)
language sql stable as $$
  with s as (
    select "LocationID" as loc, sum("LineRevenue")::numeric as revenue, count(distinct "OrderID") as orders
    from public.v_sales_lines where p_year is null or year = p_year
    group by "LocationID"
  ),
  r as (
    select "LocationID" as loc, sum("RentalRevenue")::numeric as revenue
    from public.v_rental_lines where p_year is null or year = p_year
    group by "LocationID"
  )
  select st."LocationCode", st."LocationName", coalesce(s.revenue,0), coalesce(r.revenue,0), coalesce(s.orders,0)
  from public."Stores" st
  left join s on s.loc = st."LocationCode"
  left join r on r.loc = st."LocationCode"
  order by (coalesce(s.revenue,0) + coalesce(r.revenue,0)) desc;
$$;

create or replace function public.mgmt_product_profitability(p_year integer default null)
returns table(family_key text, family_name text, category text, quantity numeric, revenue numeric, cost numeric, gross_profit numeric, gross_margin_pct numeric)
language sql stable as $$
  select
    sl.family_key, fn.family_name, min(sl.category),
    sum(sl."Quantity")::numeric, sum(sl."LineRevenue")::numeric, sum(sl."LineCost")::numeric,
    (sum(sl."LineRevenue") - sum(sl."LineCost"))::numeric,
    case when sum(sl."LineRevenue") > 0 then round(((sum(sl."LineRevenue") - sum(sl."LineCost")) / sum(sl."LineRevenue") * 100)::numeric, 2) else null end
  from public.v_sales_lines sl
  left join public.v_product_family_name fn on fn.family_key = sl.family_key
  where p_year is null or sl.year = p_year
  group by sl.family_key, fn.family_name;
$$;

create or replace function public.mgmt_customer_type_breakdown(p_year integer default null)
returns table(customer_type text, revenue numeric, order_count bigint, customer_count bigint)
language sql stable as $$
  select c."CustomerType", sum(sl."LineRevenue")::numeric, count(distinct sl."OrderID"), count(distinct c."CustomerID")
  from public.v_sales_lines sl
  join public."Customers_Core" c on c."CustomerID" = sl."CustID"
  where p_year is null or sl.year = p_year
  group by c."CustomerType"
  order by sum(sl."LineRevenue") desc;
$$;

create or replace function public.mgmt_geography_breakdown(p_year integer default null)
returns table(country text, city text, revenue numeric, order_count bigint)
language sql stable as $$
  select c."Country", c."City", sum(sl."LineRevenue")::numeric, count(distinct sl."OrderID")
  from public.v_sales_lines sl
  join public."Customers_Core" c on c."CustomerID" = sl."CustID"
  where p_year is null or sl.year = p_year
  group by c."Country", c."City"
  order by sum(sl."LineRevenue") desc
  limit 25;
$$;

create or replace function public.mgmt_new_vs_repeat(p_year integer default null)
returns table(segment text, revenue numeric, order_count bigint, customer_count bigint)
language sql stable as $$
  with first_order as (
    select "CustID", min("OrderDate") as first_date from public."Orders" group by "CustID"
  ),
  tagged as (
    select sl.*, case when fo.first_date >= date_trunc('year', coalesce(make_date(p_year,1,1), sl."OrderDate"))
                        and (p_year is null or extract(year from fo.first_date) = p_year)
                   then 'New' else 'Repeat' end as segment
    from public.v_sales_lines sl
    join first_order fo on fo."CustID" = sl."CustID"
    where p_year is null or sl.year = p_year
  )
  select segment, sum("LineRevenue")::numeric, count(distinct "OrderID"), count(distinct "CustID")
  from tagged
  group by segment;
$$;

create or replace function public.mgmt_associate_performance(p_year integer default null)
returns table(emp_id text, employee_name text, role text, sales_revenue numeric, order_count bigint, rental_revenue numeric)
language sql stable as $$
  with s as (
    select "SalesAssociate" as emp, sum("LineRevenue")::numeric as revenue, count(distinct "OrderID") as orders
    from public.v_sales_lines where p_year is null or year = p_year
    group by "SalesAssociate"
  ),
  r as (
    select "SalesAssociate" as emp, sum("RentalRevenue")::numeric as revenue
    from public.v_rental_lines where p_year is null or year = p_year
    group by "SalesAssociate"
  )
  select e."EmpID", e."FirstName" || ' ' || e."LastName", e."Role", coalesce(s.revenue,0), coalesce(s.orders,0), coalesce(r.revenue,0)
  from public."Employees" e
  left join s on s.emp = e."EmpID"
  left join r on r.emp = e."EmpID"
  where coalesce(s.revenue,0) > 0 or coalesce(r.revenue,0) > 0
  order by (coalesce(s.revenue,0) + coalesce(r.revenue,0)) desc;
$$;

create or replace function public.mgmt_discount_impact(p_year integer default null)
returns table(segment text, revenue numeric, order_count bigint, avg_discount_pct numeric)
language sql stable as $$
  with promo_orders as (
    select distinct "OrderID" from public."OrderPromotions"
  ),
  tagged as (
    select sl.*, case
      when sl."OrderID" in (select "OrderID" from promo_orders) then 'Named Promotion'
      when sl."DiscountPct" > 0 then 'Line Discount (no named promo)'
      else 'Full Price'
    end as segment
    from public.v_sales_lines sl
    where p_year is null or sl.year = p_year
  )
  select segment, sum("LineRevenue")::numeric, count(distinct "OrderID"), round(avg("DiscountPct")::numeric, 1)
  from tagged
  group by segment
  order by sum("LineRevenue") desc;
$$;

create or replace function public.mgmt_sale_vs_rental_behavior(p_year integer default null)
returns table(family_key text, family_name text, sale_qty numeric, rental_qty numeric)
language sql stable as $$
  with s as (
    select family_key, sum("Quantity") as qty from public.v_sales_lines where p_year is null or year = p_year group by family_key
  ),
  r as (
    select family_key, sum("Quantity") as qty from public.v_rental_lines where p_year is null or year = p_year group by family_key
  )
  select coalesce(s.family_key, r.family_key), fn.family_name, coalesce(s.qty,0), coalesce(r.qty,0)
  from s
  full outer join r on r.family_key = s.family_key
  left join public.v_product_family_name fn on fn.family_key = coalesce(s.family_key, r.family_key)
  where coalesce(r.qty,0) > 0
  order by coalesce(r.qty,0) desc;
$$;

-- ---------------------------------------------------------------
-- Grants: every mgmt_* function returns private business data, so
-- only service_role (used server-side via supabaseAdmin, always
-- behind the /management session-cookie check) may call any of them.
-- ---------------------------------------------------------------

revoke execute on function public.mgmt_available_years() from public, anon, authenticated;
revoke execute on function public.mgmt_last_7_days() from public, anon, authenticated;
revoke execute on function public.mgmt_quick_overview(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_monthly_performance(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_category_performance(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_channel_performance(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_product_profitability(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_customer_type_breakdown(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_geography_breakdown(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_new_vs_repeat(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_associate_performance(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_discount_impact(integer) from public, anon, authenticated;
revoke execute on function public.mgmt_sale_vs_rental_behavior(integer) from public, anon, authenticated;

grant execute on function public.mgmt_available_years() to service_role;
grant execute on function public.mgmt_last_7_days() to service_role;
grant execute on function public.mgmt_quick_overview(integer) to service_role;
grant execute on function public.mgmt_monthly_performance(integer) to service_role;
grant execute on function public.mgmt_category_performance(integer) to service_role;
grant execute on function public.mgmt_channel_performance(integer) to service_role;
grant execute on function public.mgmt_product_profitability(integer) to service_role;
grant execute on function public.mgmt_customer_type_breakdown(integer) to service_role;
grant execute on function public.mgmt_geography_breakdown(integer) to service_role;
grant execute on function public.mgmt_new_vs_repeat(integer) to service_role;
grant execute on function public.mgmt_associate_performance(integer) to service_role;
grant execute on function public.mgmt_discount_impact(integer) to service_role;
grant execute on function public.mgmt_sale_vs_rental_behavior(integer) to service_role;
