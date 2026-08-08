import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// Defense-in-depth against injected scripts/styles. Applied only in production
// so `next dev` (which needs eval for HMR) is unaffected.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.public.blob.vercel-storage.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // The project lives inside the user's home directory, so tell Turbopack
  // where the actual project root is (avoids it scanning up to $HOME).
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
    if (process.env.NODE_ENV === "production") {
      headers[0].headers.push({ key: "Content-Security-Policy", value: cspHeader });
    }
    return headers;
  },
};

export default nextConfig;
