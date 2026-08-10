import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // The project lives inside the user's home directory, so tell Turbopack
  // where the actual project root is (avoids it scanning up to $HOME).
  turbopack: {
    root: process.cwd(),
  },
  // The Content-Security-Policy is served from src/proxy.ts instead. It issues
  // a per-request nonce (no 'unsafe-inline'), which can only be produced in a
  // Next.js proxy because Next generates the inline scripts after build.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
