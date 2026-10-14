import { SITE_URL } from "@/lib/site";

/**
 * Same-origin guard for state-changing requests.
 *
 * Every mutating route runs this before it acts on its input, so a page on
 * another site cannot make a signed-in learner's browser perform an action here
 * behind their back (CSRF). It complements the session cookie rather than
 * replacing it: the cookie says who is asking, this says where the request came
 * from, and neither is sufficient alone for a state change.
 */

/**
 * Origins beyond the host the request arrived on that count as this site: the
 * published URL, whatever this deployment advertises (Vercel's deployment
 * hosts), and an explicit comma-separated `ALLOWED_ORIGINS` for anywhere else.
 */
function configuredOrigins(): Set<string> {
  const values = [
    SITE_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
  ];

  const origins = new Set<string>();
  for (const value of values) {
    const origin = toOrigin(value);
    if (origin) origins.add(origin);
  }
  return origins;
}

/** A bare host or a full URL, reduced to a lowercase origin. */
function toOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/** Same host, ignoring the scheme (a proxy may report the request as http). */
function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

/**
 * True when a state-changing request came from this site rather than from
 * somewhere else on the web.
 *
 * `Origin` is the check that matters: the browser sets it itself and script
 * running on another site cannot forge it, which is what makes it a CSRF guard.
 * `Sec-Fetch-Site` is a second, independent signal for the same thing, and it
 * is rejected first so cross-site requests are refused even on a browser too
 * old to send `Origin`.
 *
 * A request with no `Origin` at all is not a cross-site browser request — page
 * script always sets one for a non-GET — so it is left for the session check to
 * decide. A non-browser caller carries none of the learner's cookies, and
 * blocking it here would only break scripts and the mobile shell.
 *
 * The host the request arrived on is accepted alongside the configured origins
 * because behind Vercel or Cloudflare that is the public host the browser
 * asked for, whereas a list of configured origins alone would silently break
 * any deployment whose URL isn't in the environment (a preview build, the
 * Workers deployment) — the case that makes a "compare to config only" check
 * fail closed in production.
 */
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const header = request.headers.get("origin");
  if (!header) return true;

  const origin = toOrigin(header);
  if (!origin) return false;

  const requested = toOrigin(request.url);
  if (requested && sameHost(origin, requested)) return true;

  return configuredOrigins().has(origin);
}
