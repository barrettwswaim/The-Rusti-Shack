// Server-only data layer for /management. Every function here uses
// supabaseAdmin (the secret key, bypasses RLS) - that's correct and
// expected because every caller (app/management/page.js and the
// app/api/management-* routes) checks the management session cookie
// BEFORE calling any of these, never after. All aggregation itself
// happens in Postgres (see migration part_c_reporting_views_and_functions)
// so "Revenue = sum(LineRevenue)", "Cost = sum(LineCost)", etc. are
// real, auditable SQL, not numbers assembled in JavaScript.
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function normalizeYear(year) {
  if (year === undefined || year === null || year === 'all' || year === '') return null;
  const n = Number(year);
  return Number.isInteger(n) ? n : null;
}

export async function getAvailableYears() {
  const { data, error } = await supabaseAdmin.rpc('mgmt_available_years');
  if (error) throw new Error(`getAvailableYears: ${error.message}`);
  return (data || []).map((r) => r.year).sort((a, b) => b - a);
}

export async function getLast7Days() {
  const { data, error } = await supabaseAdmin.rpc('mgmt_last_7_days');
  if (error) throw new Error(`getLast7Days: ${error.message}`);
  const row = data?.[0] || { order_count: 0, revenue: 0 };
  return { orderCount: Number(row.order_count) || 0, revenue: Number(row.revenue) || 0 };
}

export async function getQuickOverview(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_quick_overview', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getQuickOverview: ${error.message}`);
  const row = data?.[0];
  if (!row) {
    return {
      salesRevenue: 0, salesCost: 0, salesGrossProfit: 0, salesGrossMarginPct: null,
      rentalRevenue: 0, totalRevenue: 0, bestSeller: null,
    };
  }
  return {
    salesRevenue: Number(row.sales_revenue) || 0,
    salesCost: Number(row.sales_cost) || 0,
    salesGrossProfit: Number(row.sales_gross_profit) || 0,
    salesGrossMarginPct: row.sales_gross_margin_pct === null ? null : Number(row.sales_gross_margin_pct),
    rentalRevenue: Number(row.rental_revenue) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    bestSeller: row.best_seller_family
      ? { family: row.best_seller_family, name: row.best_seller_name, quantity: Number(row.best_seller_qty) }
      : null,
  };
}

export async function getMonthlyPerformance(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_monthly_performance', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getMonthlyPerformance: ${error.message}`);
  return (data || []).map((r) => ({
    monthStart: r.month_start,
    salesRevenue: Number(r.sales_revenue) || 0,
    salesCost: Number(r.sales_cost) || 0,
    salesGrossProfit: Number(r.sales_gross_profit) || 0,
    salesGrossMarginPct: r.sales_gross_margin_pct === null ? null : Number(r.sales_gross_margin_pct),
    rentalRevenue: Number(r.rental_revenue) || 0,
    totalRevenue: Number(r.total_revenue) || 0,
  }));
}

export async function getCategoryPerformance(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_category_performance', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getCategoryPerformance: ${error.message}`);
  return (data || []).map((r) => ({
    category: r.category,
    revenue: Number(r.revenue) || 0,
    cost: Number(r.cost) || 0,
    grossProfit: Number(r.gross_profit) || 0,
    grossMarginPct: r.gross_margin_pct === null ? null : Number(r.gross_margin_pct),
  }));
}

export async function getChannelPerformance(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_channel_performance', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getChannelPerformance: ${error.message}`);
  return (data || []).map((r) => ({
    locationCode: r.location_code,
    locationName: r.location_name,
    salesRevenue: Number(r.sales_revenue) || 0,
    rentalRevenue: Number(r.rental_revenue) || 0,
    orderCount: Number(r.order_count) || 0,
  }));
}

export async function getProductProfitability(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_product_profitability', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getProductProfitability: ${error.message}`);
  return (data || []).map((r) => ({
    familyKey: r.family_key,
    familyName: r.family_name || r.family_key,
    category: r.category,
    quantity: Number(r.quantity) || 0,
    revenue: Number(r.revenue) || 0,
    cost: Number(r.cost) || 0,
    grossProfit: Number(r.gross_profit) || 0,
    grossMarginPct: r.gross_margin_pct === null ? null : Number(r.gross_margin_pct),
  }));
}

export async function getCustomerTypeBreakdown(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_customer_type_breakdown', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getCustomerTypeBreakdown: ${error.message}`);
  return (data || []).map((r) => ({
    customerType: r.customer_type,
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    customerCount: Number(r.customer_count) || 0,
  }));
}

export async function getGeographyBreakdown(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_geography_breakdown', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getGeographyBreakdown: ${error.message}`);
  return (data || []).map((r) => ({
    country: r.country,
    city: r.city,
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
  }));
}

export async function getNewVsRepeat(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_new_vs_repeat', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getNewVsRepeat: ${error.message}`);
  return (data || []).map((r) => ({
    segment: r.segment,
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    customerCount: Number(r.customer_count) || 0,
  }));
}

export async function getAssociatePerformance(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_associate_performance', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getAssociatePerformance: ${error.message}`);
  return (data || []).map((r) => ({
    empId: r.emp_id,
    employeeName: r.employee_name,
    role: r.role,
    salesRevenue: Number(r.sales_revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    rentalRevenue: Number(r.rental_revenue) || 0,
  }));
}

export async function getDiscountImpact(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_discount_impact', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getDiscountImpact: ${error.message}`);
  return (data || []).map((r) => ({
    segment: r.segment,
    revenue: Number(r.revenue) || 0,
    orderCount: Number(r.order_count) || 0,
    avgDiscountPct: r.avg_discount_pct === null ? null : Number(r.avg_discount_pct),
  }));
}

export async function getSaleVsRentalBehavior(year) {
  const { data, error } = await supabaseAdmin.rpc('mgmt_sale_vs_rental_behavior', {
    p_year: normalizeYear(year),
  });
  if (error) throw new Error(`getSaleVsRentalBehavior: ${error.message}`);
  return (data || []).map((r) => ({
    familyKey: r.family_key,
    familyName: r.family_name || r.family_key,
    saleQty: Number(r.sale_qty) || 0,
    rentalQty: Number(r.rental_qty) || 0,
  }));
}

// Part B parity: recent orders table (same shape as the old /manager
// page), independent of the year slicer since it's always "recent."
export async function getRecentOrders(limit = 50) {
  const { data: recentOrders, error } = await supabaseAdmin
    .from('Orders')
    .select('OrderID, OrderDate, CustID, OrderTotal')
    .order('OrderDate', { ascending: false })
    .order('OrderID', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentOrders: ${error.message}`);

  const custIds = [...new Set((recentOrders || []).map((o) => o.CustID).filter(Boolean))];
  const { data: customers } = custIds.length
    ? await supabaseAdmin.from('Customers_Core').select('CustomerID, FirstName, LastName, Country').in('CustomerID', custIds)
    : { data: [] };

  const customersById = new Map();
  for (const row of customers || []) {
    customersById.set(row.CustomerID, { name: `${row.FirstName} ${row.LastName}`.trim(), country: row.Country || '-' });
  }

  return (recentOrders || []).map((order) => ({
    ...order,
    customerName: customersById.get(order.CustID)?.name || order.CustID,
    customerCountry: customersById.get(order.CustID)?.country || '-',
  }));
}
