/**
 * The GitHub REST pieces the site shares.
 *
 * Two features already talk to the same token and repo — the feedback button
 * and the feedback-close sync — and the poll close report is the third. They
 * live in different modules (one is a route handler, one is a backup helper),
 * so the auth headers and repo resolution live here rather than being copied
 * into each call site.
 *
 * The token is server-only: it must never be imported by a client component.
 */

export const GITHUB_API = "https://api.github.com";

export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Matches `owner/name` and nothing else, so the value can be safely spliced
 *  into an API path. */
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * The configured token/repo pair, or null when the feature is not set up.
 *
 * Returns null rather than throwing so callers can degrade: a deploy missing
 * the token should simply not file reports, not take down the poll page.
 */
export function feedbackRepoConfig(): { token: string; repo: string } | null {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return null;
  const repo = process.env.FEEDBACK_GITHUB_REPO || "hulkingburst/rocourse-feedback";
  if (!REPO_RE.test(repo)) return null;
  return { token, repo };
}
