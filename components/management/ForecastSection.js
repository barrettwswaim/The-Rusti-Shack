'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { availableModels, runModel } from '@/lib/forecasting';
import { MODEL_COPY, ERROR_METRIC_NOTE } from '@/lib/forecastCopy';

const OCEAN = '#1C7A8C';
const CORAL = '#F2734A';

function money(v) {
  if (v === null || v === undefined) return '-';
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

function monthLabel(monthStart) {
  return new Date(`${monthStart}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function addMonths(monthStart, n) {
  const d = new Date(`${monthStart}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d;
}

function buildForecastTitle(result, monthly, horizon) {
  if (!result || !result.forecast.length) return 'Revenue Forecast';
  const last = result.forecast[result.forecast.length - 1];
  const lastActual = monthly[monthly.length - 1]?.totalRevenue || 0;
  const dir = last.point > lastActual ? 'growing to' : last.point < lastActual ? 'declining to' : 'holding near';
  const targetDate = addMonths(monthly[monthly.length - 1].monthStart, horizon).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `${result.name}: Revenue Projected ${dir} ${money(last.point)} by ${targetDate}`;
}

export default function ForecastSection({ monthly }) {
  const values = useMemo(() => monthly.map((m) => m.totalRevenue), [monthly]);
  const options = useMemo(() => availableModels(values.length), [values.length]);
  const [modelKey, setModelKey] = useState(options[options.length - 1] || options[0]);
  const [horizon, setHorizon] = useState(6);
  const [showInfo, setShowInfo] = useState(false);

  const activeKey = options.includes(modelKey) ? modelKey : options[0];
  const result = useMemo(() => (activeKey ? runModel(activeKey, values, horizon) : null), [activeKey, values, horizon]);

  if (!activeKey || values.length < 6) {
    return (
      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold text-ink">Forecasting</h2>
        <p className="mt-2 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">
          Not enough monthly history yet to forecast (need at least 6 months; currently have {values.length}).
        </p>
      </section>
    );
  }

  const chartData = monthly.map((m) => ({ label: monthLabel(m.monthStart), actual: m.totalRevenue, forecast: null, lo: null, hi: null }));
  result.forecast.forEach((f, i) => {
    const d = addMonths(monthly[monthly.length - 1].monthStart, f.h);
    chartData.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), actual: null, forecast: Math.max(0, f.point), lo: Math.max(0, f.lo), hi: Math.max(0, f.hi) });
  });
  // Bridge the actual/forecast lines at the join point so the chart connects.
  const joinIdx = monthly.length - 1;
  if (chartData[joinIdx]) chartData[joinIdx].forecast = chartData[joinIdx].actual;

  const copy = MODEL_COPY[activeKey];
  const title = buildForecastTitle(result, monthly, horizon);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-ink">Forecasting</h2>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="press-scale inline-flex min-h-[36px] items-center rounded-full bg-white px-3 text-xs font-semibold text-ocean-dark ring-1 ring-black/10 hover:bg-sand-deep"
        >
          What does this model do?
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Uses full order history (all years), not just the year selected above - a forecast needs
        as much history as possible to be meaningful.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Model:</span>
        {options.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setModelKey(key)}
            className={`press-scale inline-flex min-h-[32px] items-center rounded-full px-3 text-xs font-medium transition-colors ${
              activeKey === key ? 'bg-ocean text-white' : 'bg-white text-ink ring-1 ring-black/10 hover:bg-sand-deep'
            }`}
          >
            {MODEL_COPY[key].label}
          </button>
        ))}
        <span className="ml-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Months ahead:</span>
        {[3, 6, 12].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={`press-scale inline-flex min-h-[32px] items-center rounded-full px-3 text-xs font-medium transition-colors ${
              horizon === h ? 'bg-coral text-white' : 'bg-white text-ink ring-1 ring-black/10 hover:bg-sand-deep'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <h3 className="font-heading text-sm font-semibold text-ink sm:text-base">{title}</h3>
        <div style={{ width: '100%', height: 320 }} className="mt-3">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#22333B' }} tickFormatter={money} width={64} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 13 }} formatter={(v) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="hi" name="Uncertainty range" stroke="none" fill={CORAL} fillOpacity={0.12} isAnimationActive={false} />
              <Area dataKey="lo" stroke="none" fill="#ffffff" fillOpacity={1} isAnimationActive={false} legendType="none" />
              <Line type="monotone" dataKey="actual" name="Actual" stroke={OCEAN} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke={CORAL} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-ink/50">{ERROR_METRIC_NOTE}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span className="text-ink/70">MAE: <strong className="text-ink">{result.mae !== null ? money(result.mae) : 'n/a'}</strong></span>
          <span className="text-ink/70">RMSE: <strong className="text-ink">{result.rmse !== null ? money(result.rmse) : 'n/a'}</strong></span>
          <span className="text-ink/70">MAPE: <strong className="text-ink">{result.mape !== null ? `${result.mape.toFixed(1)}%` : 'n/a'}</strong></span>
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowInfo(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-semibold text-ink">{copy.label}</h3>
            <p className="mt-3 text-sm text-ink/70"><strong className="text-ink">What it does: </strong>{copy.what}</p>
            <p className="mt-2 text-sm text-ink/70"><strong className="text-ink">What it assumes: </strong>{copy.assumes}</p>
            <p className="mt-2 text-sm text-ink/70"><strong className="text-ink">When to trust it: </strong>{copy.trust}</p>
            <p className="mt-2 text-sm text-ink/70"><strong className="text-ink">When not to: </strong>{copy.dontTrust}</p>
            <p className="mt-2 text-sm text-ink/70"><strong className="text-ink">Reading the uncertainty band: </strong>{copy.uncertainty}</p>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="press-scale mt-5 inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-ocean px-4 text-sm font-semibold text-white hover:bg-ocean-dark"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
