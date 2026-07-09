'use client';

// "Ask the Data" - Part D. Talks only to app/api/management-ai/route.js,
// which re-checks the /management session cookie on every request. This
// component never talks to Gemini directly and never sees an API key -
// it only ever sees the JSON this project's own server route returns.
import { useEffect, useRef, useState } from 'react';
import AiChartRenderer from './AiChartRenderer';

const STARTER_QUESTIONS = [
  "What's our revenue trend been over the last year?",
  'Which products are the most profitable?',
  'How does sales revenue compare to rental revenue?',
  'What do our customer segments look like?',
  'What products do people often buy together?',
  'How did this quarter compare to the same quarter last year?',
  "What's our current inventory status - anything to reorder?",
  "What's the revenue forecast for the next 6 months?",
];

function money(v) {
  const n = Number(v) || 0;
  if (n > 0 && n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AiAssistant() {
  const [status, setStatus] = useState(null);
  const [model, setModel] = useState('');
  const [messages, setMessages] = useState([]); // { role: 'user'|'model', text, charts?, isError? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch('/api/management-ai')
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setModel(data.defaultModel || data.models?.[0]?.id || '');
      })
      .catch(() => setStatus({ enabled: false, configured: false, models: [], usage: null }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function refreshUsage() {
    try {
      const r = await fetch('/api/management-ai');
      const data = await r.json();
      setStatus((prev) => ({ ...prev, usage: data.usage }));
    } catch {
      // Non-critical - the usage display just won't refresh this time.
    }
  }

  async function send(question) {
    const text = (question ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setLoading(true);

    const history = nextMessages.slice(0, -1).map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await fetch('/api/management-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, model }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'model', text: data.message || 'Something went wrong.', isError: true }]);
      } else {
        setMessages((prev) => [...prev, { role: 'model', text: data.answer, charts: data.charts || [] }]);
        setLastUsage(data.usage);
        refreshUsage();
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'Could not reach the assistant. Please try again.', isError: true }]);
    } finally {
      setLoading(false);
    }
  }

  if (status && !status.configured) {
    return (
      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold text-ink">Ask the Data</h2>
        <p className="mt-2 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">
          The AI assistant isn&apos;t set up yet - it needs a Gemini API key added to the environment. Contact your developer.
        </p>
      </section>
    );
  }

  if (status && !status.enabled) {
    return (
      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold text-ink">Ask the Data</h2>
        <p className="mt-2 rounded-xl bg-lagoon px-4 py-3 text-sm text-ocean-dark">
          The AI assistant is currently turned off.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-ink">Ask the Data</h2>
        {status?.models?.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Model:
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium normal-case text-ink ring-1 ring-black/10"
            >
              {status.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Ask a plain-English question about your own shop data - revenue, products, customers, inventory, or
        forecasts. This assistant is private to this page, read-only, and never sees customer names or contact
        details.
      </p>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="press-scale rounded-full bg-white px-3 py-2 text-xs font-medium text-ocean-dark ring-1 ring-black/10 hover:bg-sand-deep"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 max-h-[560px] space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        {messages.length === 0 && <p className="text-sm text-ink/50">Ask a question above or pick a starter question to begin.</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user' ? 'bg-ocean text-white' : m.isError ? 'bg-coral/10 text-ocean-dark ring-1 ring-coral/30' : 'bg-sand text-ink'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.charts?.length > 0 && (
                <div className="mt-3 space-y-3">
                  {m.charts.map((c, ci) => (
                    <AiChartRenderer key={ci} chart={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-sm text-ink/40">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about revenue, products, customers, inventory, or forecasts…"
          className="min-h-[44px] flex-1 rounded-full border border-black/10 px-4 text-sm focus:border-ocean focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="press-scale min-h-[44px] rounded-full bg-ocean px-5 text-sm font-semibold text-white hover:bg-ocean-dark disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      {(lastUsage || status?.usage) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/50">
          {lastUsage && (
            <span>
              Last question: {lastUsage.inputTokens + lastUsage.outputTokens} tokens (~{money(lastUsage.estimatedCostUsd)}),{' '}
              {lastUsage.requestsThisHour}/{lastUsage.requestsLimitPerHour} this hour
            </span>
          )}
          {status?.usage && (
            <span>
              Last 24h: {status.usage.requestCount} questions, ~{money(status.usage.estimatedCostUsd)} estimated
            </span>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-ink/40">
        Cost is an estimate from token counts using published Gemini pricing - check your Google AI Studio billing
        dashboard for actual charges.
      </p>
    </section>
  );
}
