import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// next-intl resolves the request locale and either rewrites it into the
// `[locale]` segment or redirects (e.g. missing locale prefix).
const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  return intlMiddleware(request) ?? NextResponse.next();
}

export const config = {
  matcher: [
    {
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
       *
       * Prefetches (from next/link hover and edge routing) are also skipped:
       * the locale rewrite they need is already applied by the time they run,
       * and skipping the proxy avoids paying an edge invocation per prefetch.
       */
      source: "/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};