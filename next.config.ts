import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

// Signals a Cloudflare build (set NEXT_PUBLIC_ANALYTICS=cloudflare on the CF
// side). Default builds keep Vercel Analytics hosts; the CF build swaps in the
// Cloudflare Web Analytics hosts and disables the next/image optimizer (the
// site only uses next/image on two local logos, so unoptimized URLs are fine
// and avoid needing the paid Cloudflare Images binding).
const isCloudflareBuild = process.env.NEXT_PUBLIC_ANALYTICS === "cloudflare";
const analyticsScriptSrc = isCloudflareBuild
  ? "https://static.cloudflareinsights.com"
  : "https://va.vercel-scripts.com";
const analyticsConnectSrc = isCloudflareBuild
  ? "https://cloudflareinsights.com"
  : "https://va.vercel-scripts.com https://vitals.vercel-insights.com";

// Static, build-time CSP. No per-request nonce: by keeping the header here the
// content pages stay statically rendered (a nonce-based policy forces every
// page to re-render per request, which burns Fluid Compute). 'unsafe-inline'
// for script-src is required for Next's inline hydration bootstrap and the
// next-themes theme script, and allows no third-party scripts — everything
// else remains strict. In development React needs 'unsafe-eval'.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${analyticsScriptSrc}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // Lesson narration: the cached MP3 is served from the public Vercel Blob
  // store the resource uploads already use (plus the silent unlock clip and
  // object URLs, which stay in the page).
  "media-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://vercel.com https://*.public.blob.vercel-storage.com " +
    `${analyticsConnectSrc} https://*.r2.cloudflarestorage.com https://*.r2.dev`,
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  ...(isCloudflareBuild ? { images: { unoptimized: true } } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
