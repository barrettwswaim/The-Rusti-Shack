// Turns a raw tool result (already fetched from the real database - see
// lib/aiTools.js) into one of the four chart shapes the /management AI
// assistant is allowed to render: bar, pie, line, numberCards.
//
// This is the other half of the "the app renders charts, the model
// never draws them" rule (see AI_MANAGEMENT_SECURITY.md). The model
// only ever picks WHICH prior tool result to visualize (by index) and
// WHICH chart shape - it never supplies a single number itself. All
// actual figures plotted here come straight from the tool result object
// that lib/aiTools.js already fetched from Postgres this turn.

const CHART_CAP = 15;

// Sorts by the first series' values descending and keeps the top 15 -
// matches the "no chart shows more than ~15 bars" rule everywhere else
// in this project (see lib/aiTools.js limit clamps).
function capBar(labels, seriesArr) {
  const order = labels
    .map((_, i) => i)
    .sort((a, b) => (seriesArr[0].data[b] || 0) - (seriesArr[0].data[a] || 0))
    .slice(0, CHART_CAP);
  return {
    labels: order.map((i) => labels[i]),
    series: seriesArr.map((s) => ({ name: s.name, data: order.map((i) => s.data[i]) })),
  };
}

const FORMATTERS = {
  getRevenueTrend: {
    line: (result, title) => {
      const months = result.months || [];
      if (!months.length) return null;
      return {
        type: 'line',
        title: title || `Revenue Trend (${result.year})`,
        xLabels: months.map((m) => m.month),
        series: [
          { name: 'Total Revenue', data: months.map((m) => m.totalRevenue) },
          { name: 'Sales Revenue', data: months.map((m) => m.salesRevenue) },
          { name: 'Rental Revenue', data: months.map((m) => m.rentalRevenue) },
        ],
      };
    },
  },
  getProductProfitability: {
    bar: (result, title) => {
      const products = result.products || [];
      if (!products.length) return null;
      const capped = capBar(
        products.map((p) => p.product),
        [
          { name: 'Revenue', data: products.map((p) => p.revenue) },
          { name: 'Gross Profit', data: products.map((p) => p.grossProfit) },
        ]
      );
      return { type: 'bar', title: title || `Product Profitability (${result.year})`, ...capped };
    },
  },
  getSalesVsRentals: {
    pie: (result, title) => ({
      type: 'pie',
      title: title || `Sales vs. Rental Revenue (${result.year})`,
      labels: ['Sales', 'Rental'],
      data: [result.salesRevenue, result.rentalRevenue],
    }),
    numberCards: (result, title) => ({
      type: 'numberCards',
      title: title || `Sales vs. Rental (${result.year})`,
      cards: [
        { label: 'Sales Revenue', value: result.salesRevenue, format: 'currency' },
        { label: 'Rental Revenue', value: result.rentalRevenue, format: 'currency' },
        { label: 'Rental Share', value: result.rentalSharePct, format: 'percent' },
      ],
    }),
  },
  getCustomerSegments: {
    pie: (result, title) => {
      const rows = result.byCustomerType || [];
      if (!rows.length) return null;
      return {
        type: 'pie',
        title: title || `Revenue by Customer Type (${result.year})`,
        labels: rows.map((r) => r.customerType),
        data: rows.map((r) => r.revenue),
      };
    },
    bar: (result, title) => {
      const rows = result.byCountry || [];
      if (!rows.length) return null;
      const capped = capBar(
        rows.map((r) => r.country),
        [{ name: 'Revenue', data: rows.map((r) => r.revenue) }]
      );
      return { type: 'bar', title: title || `Revenue by Country (${result.year})`, ...capped };
    },
  },
  getBasketAnalysis: {
    bar: (result, title) => {
      const pairs = result.pairs || [];
      if (!pairs.length) return null;
      const labels = pairs.map((p) => `${p.productA} + ${p.productB}`);
      const capped = capBar(labels, [{ name: 'Orders Together', data: pairs.map((p) => p.ordersTogether) }]);
      return { type: 'bar', title: title || `Frequently Bought Together (${result.year})`, ...capped };
    },
  },
  getSeasonComparison: {
    bar: (result, title) => {
      const seasons = result.seasons || [];
      if (!seasons.length) return null;
      return {
        type: 'bar',
        title: title || 'Season Comparison',
        labels: seasons.map((s) => s.label),
        series: [
          { name: 'Sales Revenue', data: seasons.map((s) => s.salesRevenue) },
          { name: 'Rental Revenue', data: seasons.map((s) => s.rentalRevenue) },
          { name: 'Total Revenue', data: seasons.map((s) => s.totalRevenue) },
        ],
      };
    },
    numberCards: (result, title) => ({
      type: 'numberCards',
      title: title || 'Season Comparison',
      cards: (result.seasons || []).map((s) => ({ label: `${s.label} Total Revenue`, value: s.totalRevenue, format: 'currency' })),
    }),
  },
  getInventorySummary: {
    bar: (result, title) => {
      const counts = result.statusCounts || {};
      const labels = Object.keys(counts);
      if (!labels.length) return null;
      return {
        type: 'bar',
        title: title || 'Inventory Status',
        labels,
        series: [{ name: 'Products', data: labels.map((l) => counts[l]) }],
      };
    },
    numberCards: (result, title) => ({
      type: 'numberCards',
      title: title || 'Inventory Status',
      cards: Object.entries(result.statusCounts || {}).map(([label, value]) => ({ label, value, format: 'number' })),
    }),
  },
  getForecastSummary: {
    line: (result, title) => {
      if (!result.available) return null;
      return {
        type: 'line',
        title: title || `Revenue Forecast (${result.modelName})`,
        xLabels: result.forecast.map((f) => `+${f.monthsAhead}mo`),
        series: [
          { name: 'Projected Revenue', data: result.forecast.map((f) => f.projectedRevenue) },
          { name: 'Low Estimate', data: result.forecast.map((f) => f.lowEstimate) },
          { name: 'High Estimate', data: result.forecast.map((f) => f.highEstimate) },
        ],
      };
    },
    numberCards: (result, title) => {
      if (!result.available) return null;
      const last = result.forecast[result.forecast.length - 1];
      return {
        type: 'numberCards',
        title: title || 'Forecast Summary',
        cards: [
          { label: `Projected Revenue (+${last.monthsAhead}mo)`, value: last.projectedRevenue, format: 'currency' },
          { label: 'Model', value: result.modelName, format: 'text' },
          { label: 'Months of History', value: result.monthsOfHistory, format: 'number' },
        ],
      };
    },
  },
};

export function availableChartTypes(toolName) {
  return Object.keys(FORMATTERS[toolName] || {});
}

export function buildChart(toolName, chartType, result, title) {
  const formatter = FORMATTERS[toolName]?.[chartType];
  if (!formatter) return null;
  return formatter(result, title);
}
