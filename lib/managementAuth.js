// Server-only helper for the private /management back office (Part C).
// Deliberately separate from lib/managerAuth.js (the older /manager
// page) rather than sharing it - the instructor's password is only
// ever meant to work here, and the two pages should not silently share
// a session cookie or a secret. Same pattern as lib/managerAuth.js
// otherwise: Node's built-in `crypto` only, timing-safe comparison,
// HMAC-signed cookie derived from the password itself. Never import
// this file from any 'use client' component; it only ever runs on the
// server (route handlers and the /management Server Component).
import crypto from 'crypto';

export const MANAGEMENT_COOKIE_NAME = 'management_session';
export const MANAGEMENT_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret() {
  const secret = process.env.MANAGEMENT_PASSWORD;
  if (!secret) {
    throw new Error(
      'Missing MANAGEMENT_PASSWORD. Set it in .env.local (see .env.example). ' +
        'Never expose this value to the browser or prefix it with NEXT_PUBLIC_.'
    );
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

// Constant-time comparison that never throws on mismatched input
// lengths - both sides are first hashed to a fixed 32-byte digest so
// the comparison stays timing-safe without leaking length via an
// exception or an early-exit branch.
function timingSafeStringsEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

// Checks a submitted password against MANAGEMENT_PASSWORD. Never logs
// or echoes the submitted value either way.
export function checkPassword(submitted) {
  if (typeof submitted !== 'string' || submitted.length === 0) return false;
  return timingSafeStringsEqual(submitted, getSecret());
}

// Called only after checkPassword() has already returned true.
export function createSessionCookieValue() {
  const expires = Date.now() + MANAGEMENT_SESSION_DURATION_MS;
  const signature = sign(String(expires));
  return `${expires}.${signature}`;
}

// Verifies a cookie value came from createSessionCookieValue() above,
// has not expired, and has not been tampered with. Malformed input
// (missing cookie, wrong shape, garbage) fails closed - returns false,
// never throws, and never partially trusts the input.
export function isValidSessionCookieValue(cookieValue) {
  if (typeof cookieValue !== 'string' || !cookieValue.includes('.')) return false;

  const [expiresStr, signature] = cookieValue.split('.');
  const expires = Number(expiresStr);

  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  if (!/^[a-f0-9]{64}$/.test(signature || '')) return false;

  const expected = sign(expiresStr);
  return timingSafeStringsEqual(signature, expected);
}
