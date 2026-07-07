// The /manager and /management pages are already gated by a
// server-checked session cookie and their own per-page
// `robots: { index: false }` metadata (see app/manager/page.js and
// app/management/page.js) - this file is a second, belt-and-suspenders
// layer for well-behaved crawlers, never the actual protection.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/manager', '/management', '/api/'],
    },
  };
}
