// Server-only helper for the private /manager page.
//
// Deliberately uses ONLY Node's built-in `crypto` module - a
// timing-safe comparison and standard HMAC signing - never a
// custom-invented cryptographic scheme. This file must never be
// imported by any 'use client' component; it only ever runs on the
// server (route handlers and the /manager Server Component).
//
// Design: the session cookie is a "<expiry>.<hmac signature>" pair,
// signed with a key derived directly from MANAGER_PASSWORD. That has
// one deliberate side effect worth knowing: rotating MANAGER_PASSWORD
// immediately invalidates every existing session, everywhere, with no
// extra code - a good property for a shared-password admin page.
import crypto from 'crypto';

export const MANAGER_COOKIE_NAME = 'manager_session';
export const MANAGER_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret() {
  const secret = process.env.MANAGER_PASSWORD;
  if (!secret) {
    throw new Error(
      'Missing MANAGER_PASSWORD. Set it in .env.local (see .env.example). ' +
        'Never expose this value to the browser or prefix it with NEXT_PUBLIC_.'
    );
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

// Constant-time comparison that never throws on mismatched input
// lengths. crypto.timingSafeEqual requires equal-length buffers, so
// both sides are first hashed to a fixed 32-byte digest - this keeps
// the whole comparison timing-safe without leaking length via an
// exception or an early-exit branch.
function timingSafeStringsEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

// Checks a submitted password against MANAGER_PASSWORD. Never logs or
// echoes the submitted value either way.
export function checkPassword(submitted) {
  if (typeof submitted !== 'string' || submitted.length === 0) return false;
  return timingSafeStringsEqual(submitted, getSecret());
}

// Called only after checkPassword() has already returned true.
export function createSessionCookieValue() {
  const expires = Date.now() + MANAGER_SESSION_DURATION_MS;
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
