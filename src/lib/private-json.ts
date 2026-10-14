/**
 * Response headers for a JSON body that depends on who is asking.
 *
 * Anything personalized — a progress blob, a leaderboard with the caller's own
 * row marked, a guest identity token, a notification bell — must never be
 * stored by a browser cache, a CDN, or a proxy shared with other visitors.
 * `no-store` forbids storing it anywhere, and `Vary: Cookie` tells any shared
 * cache that did keep a copy that the session cookie changes the answer (so a
 * response can never be served to a different visitor). `max-age=0` matches the
 * narration route's existing header for the same reason.
 */
export const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, max-age=0, no-store",
  Vary: "Cookie",
} as const;
