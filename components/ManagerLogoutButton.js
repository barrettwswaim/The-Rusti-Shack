'use client';

import { useState } from 'react';

export default function ManagerLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/manager-logout', { method: 'POST' });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="press-scale inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-black/10 transition-colors hover:bg-sand-deep disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
