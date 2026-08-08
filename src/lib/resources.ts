import type { Resource, ResourceKind } from "@/lib/resources-shared";

/**
 * Submissions are filed as GitHub issues in the private feedback repo (one
 * inbox for both feedback and resource submissions, distinguished by labels).
 * An issue is "published" when the course author closes it with the
 * `accepted` label. The Resources page reads those issues back through the
 * same server-side token — no extra repo, token, or webhook needed.
 */
export const RESOURCES_REPO =
  process.env.RESOURCES_GITHUB_REPO || "hulkingburst/rocourse-feedback";

export const RESOURCE_LABELS = ["resource", "needs-review", "accepted", "rejected"] as const;

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
 * submission). `accepted` is created up front too so the author always has it
 * available when reviewing.
 */
export async function ensureResourceLabels(): Promise<boolean> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return false;
  try {
    const response = await fetch(`${GITHUB_API}/repos/${RESOURCES_REPO}/labels`, { headers: headers(token) });
    if (!response.ok) return false;
    const existing = new Set((await response.json() as { name?: string }[]).map((label) => label.name));
    for (const name of RESOURCE_LABELS) {
      if (existing.has(name)) continue;
      const created = await fetch(`${GITHUB_API}/repos/${RESOURCES_REPO}/labels`, {
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

const TYPE_RE = /<!--\s*RC:TYPE:([a-z-]+)\s*-->/;
const AUTHOR_RE = /<!--\s*RC:AUTHOR:([^\n]*)\s*-->/;
const FILE_RE = /<!--\s*RC:FILE:(\S+)\s*-->/;
const URL_RE = /<!--\s*RC:URL:(\S+)\s*-->/;
const CODE_LANG_RE = /<!--\s*RC:CODE:([a-z]+)\s*-->/;
const DESC_START_RE = /<!--\s*RC:DESC_START\s*-->/;
const DESC_END_RE = /<!--\s*RC:DESC_END\s*-->/;
const CODE_START_RE = /<!--\s*RC:CODE_START\s*-->/;
const CODE_END_RE = /<!--\s*RC:CODE_END\s*-->/;

function between(text: string, start: RegExp, end: RegExp): string | null {
  const startMatch = text.match(start);
  if (!startMatch || startMatch.index === undefined) return null;
  const rest = text.slice(startMatch.index + startMatch[0].length);
  const endMatch = rest.match(end);
  if (!endMatch || endMatch.index === undefined) return null;
  return rest.slice(0, endMatch.index).trim();
}

function parseResource(issue: {
  title?: string;
  body?: string | null;
  state?: string;
  closed_at?: string | null;
  html_url?: string;
}): Resource | null {
  const body = issue.body ?? "";
  const typeMatch = body.match(TYPE_RE);
  if (!typeMatch) return null;
  const kind = typeMatch[1] as ResourceKind;
  if (
    !["plugin", "script", "asset-pack", "ui-module", "model", "website", "other"].includes(kind)
  ) {
    return null;
  }

  const description = between(body, DESC_START_RE, DESC_END_RE);
  if (!description) return null;

  const fileMatch = body.match(FILE_RE);
  const codeLangMatch = body.match(CODE_LANG_RE);
  const urlMatch = body.match(URL_RE);
  const contentCount =
    (fileMatch ? 1 : 0) + (codeLangMatch ? 1 : 0) + (urlMatch ? 1 : 0);
  if (contentCount !== 1) return null;

  let fileUrl: string | null = null;
  let url: string | null = null;
  let code: string | null = null;
  let codeLang = "";
  if (fileMatch) {
    fileUrl = fileMatch[1];
  } else if (urlMatch) {
    url = urlMatch[1];
  } else {
    code = between(body, CODE_START_RE, CODE_END_RE);
    if (!code) return null;
    codeLang = codeLangMatch?.[1] ?? "";
  }

  // Re-validate links at read time, so an edited issue body or a compromised
  // token can never slip a non-http(s) URL or a foreign file URL into the
  // catalog.
  if (fileUrl) {
    let hostname: string;
    try {
      hostname = new URL(fileUrl).hostname;
    } catch {
      return null;
    }
    if (!/(^|\.)public\.blob\.vercel-storage\.com$/.test(hostname)) return null;
  }
  if (url) {
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      return null;
    }
    if (protocol !== "http:" && protocol !== "https:") return null;
  }

  const authorMatch = body.match(AUTHOR_RE);
  const author = authorMatch ? authorMatch[1].trim() || null : null;

  return {
    title: (issue.title ?? "").replace(/^\[Resource\]\s*/i, ""),
    kind,
    author,
    description,
    fileUrl,
    url,
    code,
    codeLang,
    acceptedAt: issue.closed_at ?? "",
  };
}

/**
 * Loads every accepted resource. Called by the ISR /resources page and cached
 * for 60 seconds, so "closing an issue as accepted" surfaces on the site
 * within about a minute. Returns [] on any failure so the page degrades to an
 * empty state instead of erroring.
 */
export async function getAcceptedResources(): Promise<Resource[]> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return [];

  const url = `https://api.github.com/repos/${RESOURCES_REPO}/issues?labels=accepted&state=all&per_page=100&sort=created&direction=desc`;
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
      title?: string;
      body?: string | null;
      state?: string;
      closed_at?: string | null;
      html_url?: string;
    }[];
    return issues
      .filter((issue) => issue.state === "closed")
      .map(parseResource)
      .filter((resource): resource is Resource => resource !== null);
  } catch {
    return [];
  }
}
