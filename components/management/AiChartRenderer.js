'use client';

// Renders the four chart shapes the AI assistant is allowed to produce
// (see lib/aiCharts.js). This component ONLY draws numbers that were
// already computed server-side from a real tool result - it never
// receives or trusts anything typed directly by the model. Reuses the
// same color palette as the rest of /management for visual consistency.
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const OCEAN = '#1C7A8C';
const OCEAN_DARK = '#12525F';
const CORAL = '#F2734A';
const OCEAN_LIGHT = '#5FA8B8';
const PALETTE = [OCEAN, CORAL, OCEAN_LIGHT, '#8CBBAA', OCEAN_DARK, '#D9A441', '#7C6FA3', '#C97B8A'];

const tooltipStyle = { borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 13 };

function formatValue(v, format) {
  const n = Number(v);
  if (format === 'currency') return `$${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (format === 'percent') return v === null || v === undefined ? '-' : `${v}%`;
  if (format === 'number') return Number.isFinite(n) ? n.toLocaleString('en-US') : String(v ?? '-');
  return String(v ?? '-');
}

function ChartFrame({ title, height, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      {title && <h4 className="font-heading text-sm font-semibold text-ink">{title}</h4>}
      <div style={{ width: '100%', height }} className="mt-3">
        {children}
      </div>
    </div>
  );
}

function BarChartView({ chart }) {
  const data = chart.labels.map((label, i) => {
    const row = { label };
    chart.series.forEach((s) => {
      row[s.name] = s.data[i];
    });
    return row;
  });
  const height = Math.max(220, data.length * 40);
  return (
    <ChartFrame title={chart.title} height={height}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#22333B' }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} width={140} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} radius={[0, 4, 4, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function PieChartView({ chart }) {
  const data = chart.labels.map((label, i) => ({ name: label, value: chart.data[i] }));
  return (
    <ChartFrame title={chart.title} height={280}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function LineChartView({ chart }) {
  const data = chart.xLabels.map((label, i) => {
    const row = { label };
    chart.series.forEach((s) => {
      row[s.name] = s.data[i];
    });
    return row;
  });
  return (
    <ChartFrame title={chart.title} height={280}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,51,59,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#22333B' }} />
          <YAxis tick={{ fontSize: 11, fill: '#22333B' }} width={56} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function NumberCardsView({ chart }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      {chart.title && <h4 className="font-heading text-sm font-semibold text-ink">{chart.title}</h4>}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {chart.cards.map((c, i) => (
          <div key={i} className="rounded-xl bg-sand px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{c.label}</p>
            <p className="mt-1 font-heading text-lg font-semibold text-ocean-dark">{formatValue(c.value, c.format)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiChartRenderer({ chart }) {
  if (!chart) return null;
  if (chart.type === 'bar') return <BarChartView chart={chart} />;
  if (chart.type === 'pie') return <PieChartView chart={chart} />;
  if (chart.type === 'line') return <LineChartView chart={chart} />;
  if (chart.type === 'numberCards') return <NumberCardsView chart={chart} />;
  return null;
}
