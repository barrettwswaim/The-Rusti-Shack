// Part D "Ask the Data" - the ONLY data the AI assistant is ever allowed
// to see. This is a hard allowlist, not a convenience wrapper:
//
//   - Every tool below calls one fixed, named, parameterized Postgres
//     RPC (see supabase/migrations/0009, 0010, 0011). The model never
//     supplies SQL, table names, or column names - only a few typed,
//     range-clamped arguments (year, limit, etc.), and every argument is
//     re-validated here in JS before it ever reaches the database, even
//     though the RPC layer is already parameterized.
//   - Every RPC this file calls is itself locked to `service_role` only
//     (revoked from public/anon/authenticated) - see the migration
//     files. This module uses supabaseAdmin (secret key) because the
//     caller (app/api/management-ai/route.js) checks the management
//     session cookie BEFORE any tool ever runs, on every request.
//   - Every return shape here is pre-aggregated (sums, counts, group-bys)
//     - never a raw customer row, never a name/email/phone/address. The
//     underlying mgmt_* functions/views never had customer-identifying
//     columns in their output to begin with, so de-identification is
//     structural, not a filter that could be forgotten.
//   - Every list-shaped tool result is capped at 15 rows so it fits the
//     app's chart cap (horizontal bar charts show at most ~15 bars) and
//     so a single tool call can't be used to page out an entire table.
//   - No tool here writes, updates, or deletes anything - only .rpc()
//     calls to functions that are themselves `language sql stable`
//     (read-only by construction, not just by convention).
//
// See AI_MANAGEMENT_SECURITY.md for the full guardrail write-up.

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { availableModels, runModel } from '@/lib/forecasting';

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Accepts a year or null/undefined/'all' meaning "all-time". Rejects
// anything else (including strings that aren't valid years) by
// returning null rather than passing garbage through to Postgres.
function normalizeYear(v) {
  if (v === undefined || v === null || v === '' || v === 'all') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

function normalizeQuarter(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 4) return null;
  return n;
}

async function getRevenueTrend({ year } = {}) {
  const y = normalizeYear(year);
  const { data, error } = await supabaseAdmin.rpc('mgmt_monthly_performance', { p_year: y });
  if (error) throw new Error(`getRevenueTrend: ${error.message}`);
  return {
    year: y ?? 'all-time',
    months: (data || []).map((r) => ({
      month: r.month_start,
      salesRevenue: Number(r.sales_revenue) || 0,
      rentalRevenue: Number(r.rental_revenue) || 0,
      totalRevenue: Number(r.total_revenue) || 0,
      salesGrossProfit: Number(r.sales_gross_profit) || 0,
      salesGrossMarginPct: r.sales_gross_margin_pct === null ? null : Number(r.sales_gross_margin_pct),
    })),
  };
}

async function getProductProfitability({ year, limit } = {}) {
  const y = normalizeYear(year);
  const n = clampInt(limit, 1, 15, 15);
  const { data, error } = await supabaseAdmin.rpc('mgmt_product_profitability', { p_year: y });
  if (error) throw new Error(`getProductProfitability: ${error.message}`);
  const rows = (data || []).map((r) => ({
    product: r.family_name || r.family_key,
    category: r.category,
    quantity: Number(r.quantity) || 0,
    revenue: Number(r.revenue) || 0,
    cost: Number(r.cost) || 0,
    grossProfit: Number(r.gross_profit) || 0,
    grossMarginPct: r.gross_margin_pct === null ? null : Number(r.gross_margin_pct),
  }));
  rows.sort((a, b) => b.revenue - a.revenue);
  return { year: y ?? 'all-time', products: rows.slice(0, n) };
}

async function getSalesVsRentals({ year } = {}) {
  const y = normalizeYear(year);
  const { data, error } = await supabaseAdmin.rpc('mgmt_quick_overview', { p_year: y });
  if (error) throw new Error(`getSalesVsRentals: ${error.message}`);
  const row = data?.[0];
  const salesRevenue = Number(row?.sales_revenue) || 0;
  const rentalRevenue = Number(row?.rental_revenue) || 0;
  const total = salesRevenue + rentalRevenue;
  return {
    year: y ?? 'all-time',
    salesRevenue,
    rentalRevenue,
    totalRevenue: Number(row?.total_revenue) || total,
    rentalSharePct: total > 0 ? Math.round((rentalRevenue / total) * 1000) / 10 : null,
  };
}

// Aggregated customer segmentation only: counts/revenue by customer
// type, new-vs-repeat, and country. Never a customer name, email,
// phone, or street address - the underlying mgmt_* functions never
// select those columns in the first place.
async function getCustomerSegments({ year } = {}) {
  const y = normalizeYear(year);
  const [typeRes, repeatRes, geoRes] = await Promise.all([
    supabaseAdmin.rpc('mgmt_customer_type_breakdown', { p_year: y }),
    supabaseAdmin.rpc('mgmt_new_vs_repeat', { p_year: y }),
    supabaseAdmin.rpc('mgmt_geography_breakdown', { p_year: y }),
  ]);
  if (typeRes.error) throw new Error(`getCustomerSegments (type): ${typeRes.error.message}`);
  if (repeatRes.error) throw new Error(`getCustomerSegments (repeat): ${repeatRes.error.message}`);
  if (geoRes.error) throw new Error(`getCustomerSegments (geo): ${geoRes.error.message}`);

  const byCountry = (geoRes.data || [])
    .map((r) => ({ country: r.country, revenue: Number(r.revenue) || 0, orderCount: Number(r.order_count) || 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  return {
    year: y ?? 'all-time',
    byCustomerType: (typeRes.data || []).map((r) => ({
      customerType: r.customer_type,
      revenue: Number(r.revenue) || 0,
      orderCount: Number(r.order_count) || 0,
      customerCount: Number(r.customer_count) || 0,
    })),
    newVsRepeat: (repeatRes.data || []).map((r) => ({
      segment: r.segment,
      revenue: Number(r.revenue) || 0,
      orderCount: Number(r.order_count) || 0,
      customerCount: Number(r.customer_count) || 0,
    })),
    byCountry,
  };
}

async function getBasketAnalysis({ year, limit } = {}) {
  const y = normalizeYear(year);
  const n = clampInt(limit, 1, 15, 15);
  const { data, error } = await supabaseAdmin.rpc('mgmt_basket_analysis', { p_year: y, p_limit: n });
  if (error) throw new Error(`getBasketAnalysis: ${error.message}`);
  return {
    year: y ?? 'all-time',
    pairs: (data || []).map((r) => ({
      productA: r.family_name_a || r.family_key_a,
      productB: r.family_name_b || r.family_key_b,
      ordersTogether: Number(r.order_count) || 0,
    })),
  };
}

async function getSeasonComparison({ yearA, quarterA, yearB, quarterB } = {}) {
  const yA = normalizeYear(yearA);
  const yB = normalizeYear(yearB);
  const qA = normalizeQuarter(quarterA);
  const qB = normalizeQuarter(quarterB);
  if (!yA || !yB || !qA || !qB) {
    throw new Error(
      'getSeasonComparison: yearA, quarterA, yearB, and quarterB are all required (quarter must be 1-4, year must be a real calendar year).'
    );
  }
  const { data, error } = await supabaseAdmin.rpc('mgmt_season_comparison', {
    p_year_a: yA,
    p_quarter_a: qA,
    p_year_b: yB,
    p_quarter_b: qB,
  });
  if (error) throw new Error(`getSeasonComparison: ${error.message}`);
  return {
    seasons: (data || []).map((r) => ({
      label: r.season_label,
      salesRevenue: Number(r.sales_revenue) || 0,
      salesCost: Number(r.sales_cost) || 0,
      grossProfit: Number(r.gross_profit) || 0,
      grossMarginPct: r.gross_margin_pct === null ? null : Number(r.gross_margin_pct),
      rentalRevenue: Number(r.rental_revenue) || 0,
      totalRevenue: Number(r.total_revenue) || 0,
      orderCount: Number(r.order_count) || 0,
      topCategory: r.top_category,
      topCategoryRevenue: r.top_category_revenue === null ? null : Number(r.top_category_revenue),
    })),
  };
}

async function getInventorySummary({ leadTimeDays, safetyStockDays, limit } = {}) {
  const lt = clampInt(leadTimeDays, 1, 90, 14);
  const ss = clampInt(safetyStockDays, 0, 60, 7);
  const n = clampInt(limit, 1, 15, 15);
  const { data, error } = await supabaseAdmin.rpc('mgmt_inventory_status', {
    p_lead_time_days: lt,
    p_safety_stock_days: ss,
  });
  if (error) throw new Error(`getInventorySummary: ${error.message}`);
  const rows = data || [];
  const counts = { 'Out of Stock': 0, 'Recommended for Reorder': 0, Low: 0, OK: 0 };
  for (const r of rows) {
    if (counts[r.status] !== undefined) counts[r.status] += 1;
  }
  const priority = { 'Out of Stock': 0, 'Recommended for Reorder': 1, Low: 2, OK: 3 };
  const topConcerns = [...rows]
    .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
    .slice(0, n)
    .map((r) => ({
      product: r.product_name || r.sku,
      category: r.category,
      onHandQty: Number(r.on_hand_qty) || 0,
      reorderPoint: Number(r.reorder_point) || 0,
      status: r.status,
    }));
  return { leadTimeDays: lt, safetyStockDays: ss, statusCounts: counts, topConcerns };
}

// Reuses the exact same forecasting math the human-facing Forecasting
// section on /management uses (lib/forecasting.js) - the AI assistant
// never runs its own, different forecast logic. Defaults to the most
// sophisticated model the available history supports, same as the UI's
// default selection.
async function getForecastSummary({ horizonMonths } = {}) {
  const horizon = clampInt(horizonMonths, 1, 12, 6);
  const { data, error } = await supabaseAdmin.rpc('mgmt_monthly_performance', { p_year: null });
  if (error) throw new Error(`getForecastSummary: ${error.message}`);
  const monthly = (data || []).map((r) => ({ month: r.month_start, totalRevenue: Number(r.total_revenue) || 0 }));
  const values = monthly.map((m) => m.totalRevenue);
  const options = availableModels(values.length);
  if (!options.length) {
    return {
      available: false,
      monthsOfHistory: values.length,
      message: `Not enough monthly history yet to forecast (need at least 6 months; currently have ${values.length}).`,
    };
  }
  const modelKey = options[options.length - 1];
  const result = runModel(modelKey, values, horizon);
  return {
    available: true,
    modelName: result.name,
    monthsOfHistory: values.length,
    lastActualMonth: monthly[monthly.length - 1]?.month ?? null,
    horizonMonths: horizon,
    forecast: result.forecast.map((f) => ({
      monthsAhead: f.h,
      projectedRevenue: Math.max(0, Math.round(f.point)),
      lowEstimate: Math.max(0, Math.round(f.lo)),
      highEstimate: Math.max(0, Math.round(f.hi)),
    })),
    fitAccuracy: {
      mae: result.mae === null ? null : Math.round(result.mae),
      rmse: result.rmse === null ? null : Math.round(result.rmse),
      mapePct: result.mape === null ? null : Math.round(result.mape * 10) / 10,
    },
  };
}

// ---------------------------------------------------------------------
// Registry: the single source of truth for (a) what Gemini is told it
// can call (description + parameter schema) and (b) what actually runs.
// app/api/management-ai/route.js builds the Gemini `functionDeclarations`
// list from this object and dispatches by name ONLY if the name is a key
// here - there is no other code path that can reach these functions from
// model output, and no code path anywhere passes a model-supplied string
// into a SQL statement.
// ---------------------------------------------------------------------
export const AI_TOOLS = {
  getRevenueTrend: {
    description:
      "Monthly revenue trend: sales revenue, rental revenue, total revenue, gross profit and margin, one row per month. Optionally filtered to a single calendar year. Use for questions about revenue over time, growth, month-over-month change, or 'how did we do in <year>'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        year: { type: 'INTEGER', description: 'Optional calendar year, e.g. 2025. Omit for all-time monthly history.' },
      },
    },
    handler: getRevenueTrend,
  },
  getProductProfitability: {
    description:
      'Per-product revenue, cost, gross profit and gross margin percent, ranked highest revenue first, capped at 15 products. Optionally filtered to one calendar year. Use for best/worst sellers, most profitable products, or margin-by-product questions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        year: { type: 'INTEGER', description: 'Optional calendar year. Omit for all-time.' },
        limit: { type: 'INTEGER', description: 'Max products to return, 1-15. Defaults to 15.' },
      },
    },
    handler: getProductProfitability,
  },
  getSalesVsRentals: {
    description:
      'Total sales revenue vs. total rental revenue (and the rental share of total revenue) for a year or all-time. Use for questions comparing buying vs. renting.',
    parameters: {
      type: 'OBJECT',
      properties: {
        year: { type: 'INTEGER', description: 'Optional calendar year. Omit for all-time.' },
      },
    },
    handler: getSalesVsRentals,
  },
  getCustomerSegments: {
    description:
      'Aggregated customer segmentation: revenue/order/customer counts by customer type (e.g. local, tourist, international), by new-vs-repeat, and revenue by country (top 15). Group counts and totals only - never individual customer names, emails, phone numbers, or addresses.',
    parameters: {
      type: 'OBJECT',
      properties: {
        year: { type: 'INTEGER', description: 'Optional calendar year. Omit for all-time.' },
      },
    },
    handler: getCustomerSegments,
  },
  getBasketAnalysis: {
    description:
      'Which product families are most often bought together in the same order, ranked by number of orders containing both, capped at 15 pairs. Use for cross-sell / "what do people buy together" questions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        year: { type: 'INTEGER', description: 'Optional calendar year. Omit for all-time.' },
        limit: { type: 'INTEGER', description: 'Max pairs to return, 1-15. Defaults to 15.' },
      },
    },
    handler: getBasketAnalysis,
  },
  getSeasonComparison: {
    description:
      'Side-by-side comparison of two calendar-quarter "seasons" (e.g. Q2 2025 vs Q2 2026): sales revenue, cost, gross profit/margin, rental revenue, total revenue, order count, and top category for each. All four parameters are required.',
    parameters: {
      type: 'OBJECT',
      properties: {
        yearA: { type: 'INTEGER', description: 'Calendar year for season A, e.g. 2025.' },
        quarterA: { type: 'INTEGER', description: 'Quarter for season A, 1-4.' },
        yearB: { type: 'INTEGER', description: 'Calendar year for season B, e.g. 2026.' },
        quarterB: { type: 'INTEGER', description: 'Quarter for season B, 1-4.' },
      },
      required: ['yearA', 'quarterA', 'yearB', 'quarterB'],
    },
    handler: getSeasonComparison,
  },
  getInventorySummary: {
    description:
      'Current inventory status: counts of products by status (Out of Stock, Recommended for Reorder, Low, OK) and the top 15 products needing the most attention, with on-hand quantity and reorder point. Lead time and safety stock days are optional manager assumptions (defaults 14 and 7).',
    parameters: {
      type: 'OBJECT',
      properties: {
        leadTimeDays: { type: 'INTEGER', description: 'Assumed supplier lead time in days. Defaults to 14.' },
        safetyStockDays: { type: 'INTEGER', description: 'Assumed safety stock buffer in days. Defaults to 7.' },
        limit: { type: 'INTEGER', description: 'Max products to return in topConcerns, 1-15. Defaults to 15.' },
      },
    },
    handler: getInventorySummary,
  },
  getForecastSummary: {
    description:
      'Revenue forecast for the next N months using the same statistical model (Seasonal Naive, Holt Linear Trend, or Holt-Winters, whichever the data supports) shown on the /management Forecasting chart. Includes fit accuracy (MAE/RMSE/MAPE) so the manager can judge how much to trust it. Never invents a forecast - reports if there is not enough history yet.',
    parameters: {
      type: 'OBJECT',
      properties: {
        horizonMonths: { type: 'INTEGER', description: 'How many months ahead to forecast, 1-12. Defaults to 6.' },
      },
    },
    handler: getForecastSummary,
  },
};

export const TOOL_DECLARATIONS = Object.entries(AI_TOOLS).map(([name, def]) => ({
  name,
  description: def.description,
  parameters: def.parameters,
}));

// The ONLY function the API route calls to run a tool. Structurally
// cannot execute anything not in AI_TOOLS above - `name` is checked
// against the object's own keys, never used to build a query or import
// path, and args are always destructured/validated inside the handler
// itself before touching the database.
export async function executeAiTool(name, args) {
  const tool = AI_TOOLS[name];
  if (!tool) {
    throw new Error(`Unknown tool "${name}" - not in the allowlist.`);
  }
  return tool.handler(args || {});
}
