-- Part D: two new read-only aggregate functions for the "Ask the Data"
-- AI assistant. Same pattern as every other mgmt_* function: SQL only,
-- STABLE, aggregated output only (never raw customer/order rows),
-- locked to service_role. These are never called with model-generated
-- SQL - only the server calls them, with server-validated parameters.

-- Basket analysis: which product families are most often bought
-- together in the same order. Self-joins OrderLines by OrderID,
-- pairs family_key with a "greater" partner family_key within the
-- same order to avoid duplicate/reversed pairs and self-pairs, counts
-- distinct co-occurring orders. No customer or order-identifying data
-- returned - only product-family pairs and counts.
create or replace function public.mgmt_basket_analysis(p_year integer default null, p_limit integer default 15)
returns table (
  family_key_a text,
  family_name_a text,
  family_key_b text,
  family_name_b text,
  order_count bigint
)
language sql stable
as $$
  with lines as (
    select distinct sl."OrderID", sl.family_key
    from public.v_sales_lines sl
    where p_year is null or sl.year = p_year
  ),
  pairs as (
    select a."OrderID", a.family_key as fa, b.family_key as fb
    from lines a
    join lines b on b."OrderID" = a."OrderID" and b.family_key > a.family_key
  )
  select
    p.fa, fn_a.family_name,
    p.fb, fn_b.family_name,
    count(distinct p."OrderID")::bigint as order_count
  from pairs p
  left join public.v_product_family_name fn_a on fn_a.family_key = p.fa
  left join public.v_product_family_name fn_b on fn_b.family_key = p.fb
  group by p.fa, fn_a.family_name, p.fb, fn_b.family_name
  order by count(distinct p."OrderID") desc
  limit greatest(1, least(coalesce(p_limit, 15), 15));
$$;

-- Season comparison: revenue/cost/margin/orders/top-category for two
-- calendar-quarter "seasons" (year + quarter number 1-4 each),
-- side by side. Aggregated only.
create or replace function public.mgmt_season_comparison(
  p_year_a integer, p_quarter_a integer,
  p_year_b integer, p_quarter_b integer
)
returns table (
  season_label text,
  sales_revenue numeric,
  sales_cost numeric,
  gross_profit numeric,
  gross_margin_pct numeric,
  rental_revenue numeric,
  total_revenue numeric,
  order_count bigint,
  top_category text,
  top_category_revenue numeric
)
language sql stable
as $$
  with seasons as (
    select p_year_a as yr, p_quarter_a as q, 'A' as label
    union all
    select p_year_b, p_quarter_b, 'B'
  ),
  bounds as (
    select
      label,
      make_date(yr, (q - 1) * 3 + 1, 1) as start_date,
      (make_date(yr, (q - 1) * 3 + 1, 1) + interval '3 months')::date as end_date
    from seasons
  ),
  s as (
    select b.label,
      sum(sl."LineRevenue")::numeric as revenue,
      sum(sl."LineCost")::numeric as cost,
      count(distinct sl."OrderID")::bigint as orders
    from bounds b
    left join public.v_sales_lines sl
      on sl."OrderDate" >= b.start_date and sl."OrderDate" < b.end_date
    group by b.label
  ),
  r as (
    select b.label,
      coalesce(sum(rl."RentalRevenue"), 0)::numeric as rental_revenue
    from bounds b
    left join public.v_rental_lines rl
      on rl."RentalDate" >= b.start_date and rl."RentalDate" < b.end_date
    group by b.label
  ),
  cat as (
    select distinct on (b.label) b.label, sl.category, sum(sl."LineRevenue") over (partition by b.label, sl.category) as cat_revenue
    from bounds b
    left join public.v_sales_lines sl
      on sl."OrderDate" >= b.start_date and sl."OrderDate" < b.end_date
    order by b.label, cat_revenue desc nulls last
  )
  select
    b.label || ' (' || seasons.yr || ' Q' || seasons.q || ')',
    coalesce(s.revenue, 0),
    coalesce(s.cost, 0),
    coalesce(s.revenue, 0) - coalesce(s.cost, 0),
    case when coalesce(s.revenue,0) > 0 then round(((s.revenue - s.cost) / s.revenue * 100)::numeric, 2) else null end,
    coalesce(r.rental_revenue, 0),
    coalesce(s.revenue, 0) + coalesce(r.rental_revenue, 0),
    coalesce(s.orders, 0),
    cat.category,
    cat.cat_revenue
  from bounds b
  join seasons on seasons.label = b.label
  left join s on s.label = b.label
  left join r on r.label = b.label
  left join cat on cat.label = b.label
  order by b.label;
$$;

revoke execute on function public.mgmt_basket_analysis(integer, integer) from public, anon, authenticated;
revoke execute on function public.mgmt_season_comparison(integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.mgmt_basket_analysis(integer, integer) to service_role;
grant execute on function public.mgmt_season_comparison(integer, integer, integer, integer) to service_role;
