import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionCookieValue, MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';
import { getMonthlyPerformance } from '@/lib/managementData';
import { availableModels, runModel } from '@/lib/forecasting';
import { toCsvRow, csvResponse } from '@/lib/csvUtils';

// Forecast output export. Runs the exact same pure-JS models
// (lib/forecasting.js) the on-screen Forecasting chart uses, using all
// years of history (a forecast needs as much history as possible - see
// FORECASTING_METHODS.md). Accepts ?model= (seasonal-naive/holt-linear/
// holt-winters, defaults to the most advanced one the data supports)
// and ?horizon= (months ahead, default 6).
export const dynamic = 'force-dynamic';

const COLUMNS = ['Type', 'Month', 'Value', 'LowerBound', 'UpperBound'];

function addMonths(monthStart, n) {
  const d = new Date(`${monthStart}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSessionCookieValue(sessionValue)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const horizon = Math.max(1, Math.min(24, Number(searchParams.get('horizon')) || 6));
  const requestedModel = searchParams.get('model');

  let monthly;
  try {
    monthly = await getMonthlyPerformance(null);
  } catch (err) {
    console.error('Forecast CSV: failed to load data', err.message);
    return NextResponse.json({ error: 'Could not build export.' }, { status: 500 });
  }

  const values = monthly.map((m) => m.totalRevenue);
  const options = availableModels(values.length);
  if (!options.length) {
    return NextResponse.json({ error: 'Not enough monthly history to forecast yet.' }, { status: 400 });
  }
  const modelKey = options.includes(requestedModel) ? requestedModel : options[options.length - 1];
  const result = runModel(modelKey, values, horizon);

  let csv = toCsvRow(COLUMNS);
  monthly.forEach((m, i) => {
    csv += toCsvRow(['Actual', m.monthStart, m.totalRevenue.toFixed(2), '', '']);
  });
  result.forecast.forEach((f) => {
    const monthDate = addMonths(monthly[monthly.length - 1].monthStart, f.h);
    csv += toCsvRow([
      `Forecast (${result.name})`,
      monthDate,
      Math.max(0, f.point).toFixed(2),
      Math.max(0, f.lo).toFixed(2),
      Math.max(0, f.hi).toFixed(2),
    ]);
  });

  return csvResponse(csv, `rusti-shack-forecast-${modelKey}`);
}
