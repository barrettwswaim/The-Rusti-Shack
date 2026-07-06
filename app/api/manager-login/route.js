import { NextResponse } from 'next/server';
import {
  checkPassword,
  createSessionCookieValue,
  MANAGER_COOKIE_NAME,
  MANAGER_SESSION_DURATION_MS,
} from '@/lib/managerAuth';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '@/lib/managerRateLimit';

// Server-only. The only route that ever sets the manager session
// cookie. Errors shown to the caller stay generic ("Incorrect
// password") - never reveal whether the password field was empty,
// malformed, or simply wrong (SECURITY.md rule 9: vague to the user,
// detailed in logs).
//
// SECURITY.md section 6 requires rate-limiting + lockout on admin login
// attempts, via a persistent store (an in-memory counter "resets on every
// serverless invocation and protects nothing" per section 7). The lockout
// check runs BEFORE the password is even checked, and applies regardless
// of whether the submitted password is correct - see lib/managerRateLimit.js.
export async function POST(request) {
  const rateLimit = await checkRateLimit(request);

  if (!rateLimit.allowed) {
    // Fail closed either way: locked out, or the rate-limit check itself
    // couldn't run (e.g. database unreachable). Same generic message and
    // status either way so a locked-out attacker learns nothing extra.
    console.error(
      `Manager login: request blocked (${rateLimit.reason}) for ip=${rateLimit.ip}`
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
    console.error(`Manager login: incorrect password attempt from ip=${rateLimit.ip}`);
    await recordFailedAttempt(rateLimit.ip);
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  await clearFailedAttempts(rateLimit.ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(MANAGER_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(MANAGER_SESSION_DURATION_MS / 1000),
  });
  return response;
}
