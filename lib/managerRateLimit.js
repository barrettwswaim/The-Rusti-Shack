// Server-only rate-limit/lockout logic for the /manager login route.
//
// Why this file exists (SECURITY.md section 6 & 7): admin login attempts
// must be rate-limited with a lockout after repeated failures, using a
// PERSISTENT store - an in-memory counter resets on every serverless
// invocation and protects nothing on Vercel. The /manager page uses a
// shared-password scheme instead of Supabase Auth (documented trade-off in
// lib/managerAuth.js), so Supabase Auth's built-in rate-limiting isn't
// available for free here; this table + module is the replacement.
//
// Only imported by app/api/manager-login/route.js. Uses supabaseAdmin (the
// secret key), which is expected and correct here: this table has zero
// public policies, so the secret key is the only way to touch it at all.
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const TABLE = 'manager_login_attempts';

// After this many failed attempts inside the failure window, the IP is
// locked out for LOCKOUT_DURATION_MS - even a correct password is rejected
// until the lockout expires. Standard lockout behavior: it also protects
// against an attacker who eventually guesses (or steals) the right
// password after a burst of failed guesses.
const MAX_FAILED_ATTEMPTS = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Fail closed: if anything about the rate-limit check itself goes wrong
// (e.g. the database is unreachable), treat the request as NOT allowed
// rather than silently letting every login through unrestricted.
const FAIL_CLOSED = { allowed: false, reason: 'unavailable' };

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// Call before checking the submitted password. Returns whether this IP is
// currently allowed to attempt a login at all.
export async function checkRateLimit(request) {
  const ip = getClientIp(request);

  const { data: row, error } = await supabaseAdmin
    .from(TABLE)
    .select('ip_address, failed_count, first_failed_at, locked_until')
    .eq('ip_address', ip)
    .maybeSingle();

  if (error) {
    console.error('Manager login rate limit: lookup failed', error.message);
    return { ...FAIL_CLOSED, ip };
  }

  if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return { allowed: false, reason: 'locked', ip };
  }

  return { allowed: true, ip };
}

// Call after a failed password check for this request's IP.
export async function recordFailedAttempt(ip) {
  const now = Date.now();

  const { data: row, error: fetchError } = await supabaseAdmin
    .from(TABLE)
    .select('failed_count, first_failed_at')
    .eq('ip_address', ip)
    .maybeSingle();

  if (fetchError) {
    console.error('Manager login rate limit: fetch before record failed', fetchError.message);
    return;
  }

  const windowExpired =
    row?.first_failed_at && now - new Date(row.first_failed_at).getTime() > FAILURE_WINDOW_MS;

  const nextFailedCount = !row || windowExpired ? 1 : row.failed_count + 1;
  const nextFirstFailedAt = !row || windowExpired ? new Date(now).toISOString() : row.first_failed_at;
  const shouldLock = nextFailedCount >= MAX_FAILED_ATTEMPTS;

  const { error: upsertError } = await supabaseAdmin.from(TABLE).upsert(
    {
      ip_address: ip,
      failed_count: nextFailedCount,
      first_failed_at: nextFirstFailedAt,
      locked_until: shouldLock ? new Date(now + LOCKOUT_DURATION_MS).toISOString() : null,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: 'ip_address' }
  );

  if (upsertError) {
    console.error('Manager login rate limit: upsert failed', upsertError.message);
  }
}

// Call after a successful login for this request's IP, so a legitimate
// login clears any accumulated failure history for that address.
export async function clearFailedAttempts(ip) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('ip_address', ip);
  if (error) {
    console.error('Manager login rate limit: clear failed', error.message);
  }
}
