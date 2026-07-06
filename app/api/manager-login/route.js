import { NextResponse } from 'next/server';
import {
  checkPassword,
  createSessionCookieValue,
  MANAGER_COOKIE_NAME,
  MANAGER_SESSION_DURATION_MS,
} from '@/lib/managerAuth';

// Server-only. The only route that ever sets the manager session
// cookie. Errors shown to the caller stay generic ("Incorrect
// password") - never reveal whether the password field was empty,
// malformed, or simply wrong (SECURITY.md rule 9: vague to the user,
// detailed in logs).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    console.error('Manager login: incorrect password attempt');
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

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
