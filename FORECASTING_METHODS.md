# Forecasting Methods — Plain-Language Guide

This explains the three forecasting models on the `/management` dashboard's Forecasting
section, written so you can explain them to your instructor without needing a statistics
background. All three are real, textbook statistical methods — nothing here is an AI guess
or a made-up number. Each is implemented in `lib/forecasting.js`.

## The big picture

Every model looks at the shop's actual monthly revenue history (all years, not just the
year selected in the dashboard's slicer — a forecast needs as much history as it can get)
and projects it forward. The dashboard always shows:

- **Actual history** as a solid line.
- **The forecast** as a dashed line.
- **A shaded uncertainty band** around the forecast that gets wider the further out you look
  — because predicting 12 months from now is genuinely less certain than predicting next
  month, and the chart is honest about that instead of pretending otherwise.
- **An error score (MAE, RMSE, MAPE)** for whichever model is selected.

None of the three models are shown unless the data can actually support them — see
"Which model runs when" below.

## 1. Seasonal Naive

**What it does:** the simplest possible forecast. Next August's forecast = whatever actually
happened last August. It just repeats the same calendar month from one year back.

**What it assumes:** the business is stable and repeats the same seasonal pattern every
year, with no real growth or decline.

**When to trust it:** as a baseline. If a fancier model can't beat this one's error score,
the fancier model isn't actually adding value — this is the bar the other two have to clear.

**When not to trust it:** if the business is growing or shrinking noticeably, or if last
year had something unusual happen (a promotion, a closure, a one-off event) — this model
will just repeat that unusual thing.

**Needs at least:** 12 months of history.

## 2. Holt's Linear Trend (double exponential smoothing)

**What it does:** tracks two things — the current "level" of revenue and the current
trend (is it generally going up or down, and how fast) — and draws that trend forward in
a straight line. It does **not** account for any repeating seasonal pattern.

**What it assumes:** revenue is trending consistently, with no strong seasonal swings that
need to be modeled separately.

**When to trust it:** short-term forecasts, or for a business that doesn't (yet) show a
strong repeating seasonal pattern.

**When not to trust it:** far into the future, or for a business with big seasonal swings
— it will draw a straight line right through the swings and miss them.

**Needs at least:** 6 months of history (works, but is more reliable with more).

## 3. Holt-Winters (triple exponential smoothing)

**What it does:** the most complete of the three. It tracks level, trend, **and** a
repeating seasonal pattern all at the same time, so it can both follow a growth/decline
trend and repeat the shop's actual seasonal ups and downs.

**What it assumes:** there's a consistent season-to-season pattern in the data (e.g.
certain months are reliably busier than others), and at least two full years of history
to learn what that pattern looks like.

**When to trust it:** once there's enough history — it's the best of the three because
it's the only one that captures both trend and seasonality together.

**When not to trust it:** with less than 2 years of data (the model literally won't run
below that), or right after a major one-time shock that breaks the shop's usual pattern
(e.g. a typhoon closure, a brand-new product line) — it takes another year or two of data
for the model to "learn" a new normal.

**Needs at least:** 24 months (2 full years) of history.

## Which model runs when

The dashboard only offers a model if the data can actually support it:

| Months of history available | Models offered |
|---|---|
| Fewer than 6 | None — dashboard shows "not enough history yet" |
| 6–11 | Holt's Linear Trend only |
| 12–23 | Seasonal Naive + Holt's Linear Trend |
| 24+ | All three, including Holt-Winters |

This project's live data currently has well over 24 months of history (spanning 2021
through mid-2026, with a documented May–June 2026 gap), so all three models are available.

## How to read the error score

MAE, RMSE, and MAPE all measure the same basic idea — "how far off was the model,
historically?" — in slightly different ways:

- **MAE (Mean Absolute Error):** the average dollar amount the model was off by, in plain
  dollars.
- **RMSE (Root Mean Squared Error):** similar to MAE but penalizes big misses more heavily
  than small ones.
- **MAPE (Mean Absolute Percentage Error):** the average error as a percentage of actual
  revenue — usually the easiest of the three to compare at a glance (e.g. "12% off on
  average").

**Important honesty note:** these scores come from checking each model against the
*same* historical months it was trained on (an "in-sample fit" check). That's a legitimate,
standard way to compare models against each other, but it is not a guarantee of future
accuracy — the future can always surprise you. The dashboard's info button repeats this
caveat next to the numbers themselves.

## How the uncertainty band is calculated

Each model's typical historical error (its residual standard deviation) is used to draw a
band around the forecast line: forecast ± 1.645 × (historical error) × √(months ahead).
The √(months ahead) term is what makes the band widen the further out you look — it's a
standard, simple way of expressing "we're less sure the further into the future we go,"
without needing a more complex confidence-interval model.
