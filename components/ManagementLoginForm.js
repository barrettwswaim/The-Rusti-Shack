'use client';

import { useState } from 'react';

// Client-only UI shell. Holds the password in memory for the length of
// one submit and never persists it anywhere (no localStorage, no
// sessionStorage) - the real check happens server-side in
// /api/management-login, which is the only thing that can actually
// grant access.
export default function ManagementLoginForm() {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/management-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Incorrect password.');
        setSubmitting(false);
        return;
      }

      // Reload so the server component re-checks the new cookie and
      // renders the real dashboard - the client never fetches or holds
      // that data itself.
      window.location.reload();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"
    >
      <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">
        Back Office Sign In
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Enter the management password to view the dashboard.
      </p>

      <label htmlFor="management-password" className="mt-6 block text-sm font-medium text-ink">
        Password
      </label>
      <input
        id="management-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-1 min-h-[44px] w-full rounded-xl bg-white px-3 text-base text-ink ring-1 transition-colors focus:outline-none focus:ring-2 ${
          error ? 'ring-coral focus:ring-coral' : 'ring-black/10 focus:ring-ocean'
        }`}
      />

      {error && (
        <p className="mt-2 text-sm text-coral-dark" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !password}
        className="press-scale mt-6 flex min-h-[44px] w-full items-center justify-center rounded-full bg-ocean px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Checking...' : 'Sign In'}
      </button>
    </form>
  );
}
