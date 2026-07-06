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
    // couldn't run (e.g. database unreachable). Same generic me