// Pure-JS statistical forecasting - no external stats package, no AI
// guessing. Three real, textbook models, each with an honest in-sample
// fit error (MAE/RMSE/MAPE) and a widening uncertainty band. See
// FORECASTING_METHODS.md for a beginner-friendly explanation of each.

function errorMetrics(actual, fitted) {
  const pairs = actual.map((a, i) => [a, fitted[i]]).filter(([a, f]) => f !== null && f !== undefined);
  if (!pairs.length) return { mae: null, rmse: null, mape: null };
  let sumAbs = 0, sumSq = 0, sumPct = 0, pctCount = 0;
  for (const [a, f] of pairs) {
    const err = a - f;
    sumAbs += Math.abs(err);
    sumSq += err * err;
    if (a !== 0) { sumPct += Math.abs(err / a); pctCount += 1; }
  }
  return {
    mae: sumAbs / pairs.length,
    rmse: Math.sqrt(sumSq / pairs.length),
    mape: pctCount ? (sumPct / pctCount) * 100 : null,
  };
}

function residualStdDev(actual, fitted) {
  const errs = actual.map((a, i) => (fitted[i] === null ? null : a - fitted[i])).filter((e) => e !== null);
  if (errs.length < 2) return 0;
  const mean = errs.reduce((s, e) => s + e, 0) / errs.length;
  const variance = errs.reduce((s, e) => s + (e - mean) ** 2, 0) / (errs.length - 1);
  return Math.sqrt(variance);
}

// Model 1: Seasonal Naive - forecast(t) = actual value from the same
// calendar month one year (12 periods) earlier. The simplest defensible
// baseline for data with a yearly seasonal pattern; needs at least 12
// months of history.
export function seasonalNaive(values, horizon, seasonLength = 12) {
  const fitted = values.map((_, i) => (i >= seasonLength ? values[i - seasonLength] : null));
  const { mae, rmse, mape } = errorMetrics(values, fitted);
  const sigma = residualStdDev(values, fitted);
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const idx = values.length + h - 1 - seasonLength;
    const point = idx >= 0 && idx < values.length ? values[idx] : values[values.length - 1];
    forecast.push({ h, point, lo: point - 1.645 * sigma * Math.sqrt(h), hi: point + 1.645 * sigma * Math.sqrt(h) });
  }
  return { name: 'Seasonal Naive', forecast, mae, rmse, mape, fitted };
}

// Model 2: Holt's Linear Trend (double exponential smoothing) - tracks a
// level and a trend, no seasonality. Good when there's a clear up/down
// trend but the seasonal pattern is weak or noisy.
export function holtLinear(values, horizon, alpha = 0.3, beta = 0.15) {
  if (values.length < 2) return { name: "Holt's Linear Trend", forecast: [], mae: null, rmse: null, mape: null, fitted: [] };
  let level = values[0];
  let trend = values[1] - values[0];
  const fitted = [null];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    fitted.push(level + trend);
    level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const { mae, rmse, mape } = errorMetrics(values, fitted);
  const sigma = residualStdDev(values, fitted);
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const point = level + h * trend;
    forecast.push({ h, point, lo: point - 1.645 * sigma * Math.sqrt(h), hi: point + 1.645 * sigma * Math.sqrt(h) });
  }
  return { name: "Holt's Linear Trend", forecast, mae, rmse, mape, fitted };
}

// Model 3: Holt-Winters (triple exponential smoothing, additive) - level
// + trend + repeating seasonal pattern. Needs at least 2 full years (24
// months) of history to estimate a reliable seasonal index.
export function holtWinters(values, horizon, seasonLength = 12, alpha = 0.25, beta = 0.1, gamma = 0.25) {
  if (values.length < seasonLength * 2) {
    return { name: 'Holt-Winters', forecast: [], mae: null, rmse: null, mape: null, fitted: [], insufficientData: true };
  }
  const seasons = Math.floor(values.length / seasonLength);
  const seasonAvg = [];
  for (let s = 0; s < seasons; s++) {
    const slice = values.slice(s * seasonLength, (s + 1) * seasonLength);
    seasonAvg.push(slice.reduce((a, b) => a + b, 0) / seasonLength);
  }
  let level = seasonAvg[0];
  const initialTrend = seasons > 1 ? (seasonAvg[1] - seasonAvg[0]) / seasonLength : 0;
  let trend = initialTrend;
  const seasonal = [];
  for (let i = 0; i < seasonLength; i++) seasonal.push(values[i] - seasonAvg[0]);

  const fitted = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    const seasonIdx = i % seasonLength;
    if (i >= seasonLength) fitted[i] = level + trend + seasonal[seasonIdx];
    const prevLevel = level;
    const s = seasonal[seasonIdx];
    level = alpha * (values[i] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[seasonIdx] = gamma * (values[i] - level) + (1 - gamma) * s;
  }
  const { mae, rmse, mape } = errorMetrics(values, fitted);
  const sigma = residualStdDev(values, fitted);
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const seasonIdx = (values.length + h - 1) % seasonLength;
    const point = level + h * trend + seasonal[seasonIdx];
    forecast.push({ h, point, lo: point - 1.645 * sigma * Math.sqrt(h), hi: point + 1.645 * sigma * Math.sqrt(h) });
  }
  return { name: 'Holt-Winters', forecast, mae, rmse, mape, fitted };
}

// Picks which models are even valid to show, based on how much monthly
// history actually exists - never offers a model the data can't support.
export function availableModels(monthCount) {
  const models = [];
  if (monthCount >= 12) models.push('seasonal-naive');
  if (monthCount >= 6) models.push('holt-linear');
  if (monthCount >= 24) models.push('holt-winters');
  return models;
}

export function runModel(key, values, horizon) {
  if (key === 'seasonal-naive') return seasonalNaive(values, horizon);
  if (key === 'holt-linear') return holtLinear(values, horizon);
  if (key === 'holt-winters') return holtWinters(values, horizon);
  return null;
}
