// The /manager page is already gated by a server-checked session cookie
// and its own per-page `robots: { index: false }` metadata (see
// app/manager/page.js) - this file is a second, belt-and-suspenders layer
// for well-behaved crawlers, never the actual protection.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/manager', '/api/'],
    },
  };
}
