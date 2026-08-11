import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Content Security Policy applied to HTML responses. It uses a per-request
// nonce (Next.js applies it to its inline scripts/styles automatically) plus
// 'strict-dynamic', so 'unsafe-inline' is never needed in script-src. In
// development React needs 'unsafe-eval' for enhanced debugging.
const buildCsp = (nonce: string): string => {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
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
};

// next-intl resolves the request locale and either rewrites it into the
// `[locale]` segment or redirects (e.g. missing locale prefix).
const intlMiddleware = createIntlMiddleware(routing);

// Every page view gets a fresh nonce. Next.js reads it from the x-nonce
// request header and stamps it onto the inline scripts and styles it emits.
export async function proxy(request: NextRequest) {
  // Let next-intl handle locale detection/rewriting first.
  const intlResponse = await intlMiddleware(request);
  if (intlResponse) return intlResponse;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Vercel Analytics internals)
     * - favicon.ico (favicon file)
     * - anything containing a dot (static assets in /public, e.g. the
     *   Luau engine files at /luau/*.js and /luau/*.wasm — these must be
     *   served verbatim, not passed through the intl middleware, or they 404)
     */
    {
      source: "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
