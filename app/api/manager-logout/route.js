import { NextResponse } from 'next/server';
import { MANAGER_COOKIE_NAME } from '@/lib/managerAuth';

// State-changing action, so POST only (SECURITY.md: state-changing
// actions never live behind a GET request).
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MANAGER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
