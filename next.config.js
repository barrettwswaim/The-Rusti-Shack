/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers required by SECURITY.md section 8. This site loads no
  // third-party scripts, no external fonts, and no remote images - every
  // resource is same-origin - so the CSP below is deliberately tight
  // rather than a generic copy-paste policy. 'unsafe-inline' stays on
  // script-src/style-src for now (Next.js's own hydration data and
  // Tailwind's runtime both rely on inline tags); tighten to a nonce-based
  // policy if that's ever revisited.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
