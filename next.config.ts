import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  // Report-only only: avoid breaking Supabase, Vercel, Twilio, or Google sign-in.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app https://vercel.live https://accounts.google.com https://api.twilio.com https://*.twilio.com",
      "frame-src 'self' https://accounts.google.com https://vercel.live",
      "form-action 'self' https://accounts.google.com",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Playwright QA and curl use 127.0.0.1; Next blocks that host from dev assets by default.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
