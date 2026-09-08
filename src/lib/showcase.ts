import {
  MAX_GAME_DESCRIPTION,
  type ShowcaseGame,
} from "@/lib/showcase-shared";
import { moderateName } from "@/lib/profanity";

/**
 * Showcase submissions are filed as GitHub issues in the same curated inbox as
 * resource submissions (one repo, distinguished by labels). An issue is
 * "published" when the course author closes it with the `accepted` label; the
 * showcase page reads those back through the same server-side token — no extra
 * repo, token, or webhook needed. Submissions stay private until approved.
 */
export const SHOWCASE_REPO =
  process.env.RESOURCES_GITHUB_REPO || "hulkingburst/rocourse-feedback";

export const SHOWCASE_LABELS = [
  "showcase",
  "needs-review",
  "accepted",
  "rejected",
] as const;

const GITHUB_API = "https://api.github.com";
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

/**
 * GitHub does not auto-create labels on issue creation, so make sure the
 * labels this feature depends on exist (idempotent, safe to call before every
 * submission). `accepted` and `rejected` are created up front too so the
 * author always has them available when reviewing.
 */
export async function ensureShowcaseLabels(): Promise<boolean> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch(`${GITHUB_API}/repos/${SHOWCASE_REPO}/labels`, {
      headers: headers(token),
    });
    if (!response.ok) return false;
    const existing = new Set(
      (await response.json() as { name?: string }[]).map((label) => label.name)
    );
    for (const name of SHOWCASE_LABELS) {
      if (existing.has(name)) continue;
      const created = await fetch(`${GITHUB_API}/repos/${SHOWCASE_REPO}/labels`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ name, color: "5319e7" }),
      });
      if (created.status !== 201 && created.status !== 422) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const NAME_RE = /<!--\s*SC:NAME:([^\n]*)\s*-->/;
const DESC_START_RE = /<!--\s*SC:DESC_START\s*-->/;
const DESC_END_RE = /<!--\s*SC:DESC_END\s*-->/;
const HANDLE_RE = /<!--\s*SC:HANDLE:(\S+)\s*-->/;
const URL_RE = /<!--\s*SC:URL:(\S+)\s*-->/;

function between(text: string, start: RegExp, end: RegExp): string | null {
  const startMatch = text.match(start);
  if (!startMatch || startMatch.index === undefined) return null;
  const rest = text.slice(startMatch.index + startMatch[0].length);
  const endMatch = rest.match(end);
  if (!endMatch || endMatch.index === undefined) return null;
  return rest.slice(0, endMatch.index).trim();
}

function parseGame(issue: {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  closed_at?: string | null;
  labels?: { name?: string }[];
}): ShowcaseGame | null {
  const body = issue.body ?? "";

  const description = between(body, DESC_START_RE, DESC_END_RE);
  if (!description || description.length > MAX_GAME_DESCRIPTION) return null;

  const nameMatch = body.match(NAME_RE);
  const rawName = (issue.title ?? "").replace(/^\[Showcase\]\s*/i, "").trim();
  const storedName = nameMatch ? nameMatch[1].trim() : "";
  if (!rawName) return null;

  const urlMatch = body.match(URL_RE);
  let gameUrl: string | null = null;
  if (urlMatch) {
    // Re-validate links at read time, so an edited issue body or a
    // compromised token can never slip a non-http(s) URL onto the page.
    let protocol: string;
    try {
      protocol = new URL(urlMatch[1]).protocol;
    } catch {
      return null;
    }
    if (protocol !== "http:" && protocol !== "https:") return null;
    gameUrl = urlMatch[1];
  }

  const handleMatch = body.match(HANDLE_RE);
  const handle = handleMatch ? handleMatch[1].trim() || null : null;

  return {
    id: String(issue.number ?? 0),
    gameName: moderateName(rawName),
    description,
    gameUrl,
    authorName: moderateName(storedName || "Learner"),
    handle,
    acceptedAt: issue.closed_at ?? "",
  };
}

/**
 * Loads every approved showcase game. Called by the ISR /showcase page and
 * cached for 60 seconds, so "closing an issue as accepted" surfaces on the
 * site within about a minute. Returns [] on any failure so the page degrades
 * to an empty state instead of erroring.
 */
export async function getApprovedShowcase(): Promise<ShowcaseGame[]> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return [];

  const url = `${GITHUB_API}/repos/${SHOWCASE_REPO}/issues?labels=showcase,accepted&state=all&per_page=100&sort=created&direction=desc`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const issues = (await response.json()) as {
      number?: number;
      title?: string;
      body?: string | null;
      state?: string;
      closed_at?: string | null;
      labels?: { name?: string }[];
    }[];
    return issues
      .filter((issue) => issue.state === "closed")
      .map(parseGame)
      .filter((game): game is ShowcaseGame => game !== null);
  } catch {
    return [];
  }
}