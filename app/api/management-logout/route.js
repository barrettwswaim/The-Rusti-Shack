import { NextResponse } from 'next/server';
import { MANAGEMENT_COOKIE_NAME } from '@/lib/managementAuth';

// State-changing action, so POST only (SECURITY.md: state-changing
// actions never live behind a GET request).
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MANAGEMENT_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
