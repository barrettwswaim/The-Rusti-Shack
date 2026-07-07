import { NextResponse } from 'next/server';
import {
  checkPassword,
  createSessionCookieValue,
  MANAGEMENT_COOKIE_NAME,
  MANAGEMENT_SESSION_DURATION_MS,
} from '@/lib/managementAuth';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '@/lib/managerRateLimit';

// Server-only. The only route that ever sets the management session
// cookie. Reuses lib/managerRateLimit.js (IP + persistent-table based,
// not tied to any particular password) rather than duplicating it -
// same fail-closed, lockout-after-5-failures-in-15-minutes behavior as
// /manager. Errors shown to the caller stay generic; detail stays in
// server logs only (SECURITY.md rule 9).
export async function POST(request) {
  const rateLimit = await checkRateLimit(request);

  if (!rateLimit.allowed) {
    console.error(
      `Management login: request blocked (${rateLimit.reason}) for ip=${rateLimit.ip}`
    );
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    console.error(`Management login: incorrect password attempt from ip=${rateLimit.ip}`);
    await recordFailedAttempt(rateLimit.ip);
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  await clearFailedAttempts(rateLimit.ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(MANAGEMENT_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(MANAGEMENT_SESSION_DURATION_MS / 1000),
  });
  return response;
}
