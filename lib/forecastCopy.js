// Beginner-friendly copy shown in the forecasting info modal. Kept as
// plain data (not JSX) so the exact same wording can be reused in
// FORECASTING_METHODS.md.
export const MODEL_COPY = {
  'seasonal-naive': {
    label: 'Seasonal Naive',
    what: 'Assumes next year repeats the same month from last year. This month’s forecast = whatever actually happened this same calendar month one year ago.',
    assumes: 'The business is stable and seasonal patterns repeat year to year, with no growth or decline factored in.',
    trust: 'A solid baseline check - if a fancier model can’t beat this, the fancier model isn’t adding value.',
    dontTrust: 'Don’t trust it if the business is growing/shrinking quickly, or if last year had something unusual (e.g. a promotion, a closure).',
    uncertainty: 'The shaded band widens further out because a whole extra year of unknowns has to happen before that month arrives.',
  },
  'holt-linear': {
    label: "Holt's Linear Trend",
    what: 'Tracks the overall up-or-down trend in revenue and extends it forward in a straight line. Ignores any repeating seasonal pattern.',
    assumes: 'Revenue is trending consistently (growing or shrinking at roughly the same rate) - no strong seasonal swings.',
    trust: 'Useful for a short-term, few-months-out view, or when the business doesn’t have a strong seasonal cycle yet.',
    dontTrust: 'Don’t trust it far into the future or for a business with big seasonal swings - it will miss the swings entirely and just draw a straight line through them.',
    uncertainty: 'Grows steadily further out, since a straight-line trend is a simplification that gets less reliable the further you project it.',
  },
  'holt-winters': {
    label: 'Holt-Winters',
    what: 'Tracks level, trend, AND a repeating seasonal pattern all at once - the most complete of the three models.',
    assumes: 'At least two full years of history (to learn the seasonal pattern) and that the season-to-season pattern stays roughly consistent.',
    trust: 'The best choice once there’s enough history - it’s the only one of the three that can both follow a trend and repeat a season.',
    dontTrust: 'Don’t trust it with under 2 years of data (the model won’t even run), or right after a big one-time shock that breaks the usual pattern.',
    uncertainty: 'Widens with distance like the others, but also reflects how consistent the seasonal pattern has actually been historically.',
  },
};

export const ERROR_METRIC_NOTE =
  'MAE, RMSE, and MAPE below measure how well each model would have predicted the actual historical months, using only the model’s own smoothed values (an "in-sample fit" check) - not a guarantee of future accuracy. Lower is better. MAPE is the average error as a percentage of actual revenue, which is usually the easiest of the three to compare across models.';
