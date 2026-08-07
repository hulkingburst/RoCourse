import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_TEXT = 2000;
const MAX_PAGE = 500;
const LIMIT_PER_IP = 5;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Lightweight in-memory rate limit. Per-instance, so it is a soft guard
// against spam rather than a hard guarantee.
const submissions = new Map<string, number[]>();

function trimIp(ip: string | null): string {
  return ip ?? "unknown";
}

export async function POST(request: Request) {
  const ip = trimIp(
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip")
  );

  // Soft rate limit: keep the private inbox usable.
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter((t) => now - t < LIMIT_WINDOW_MS);
  if (recent.length >= LIMIT_PER_IP) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  const configuredRepo =
    process.env.FEEDBACK_GITHUB_REPO || "hulkingburst/rocourse-feedback";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepo)) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const repo = configuredRepo;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const text =
    typeof (body as { text?: unknown })?.text === "string"
      ? ((body as { text: string }).text.trim())
      : "";
  const page =
    typeof (body as { page?: unknown })?.page === "string"
      ? ((body as { page: string }).page.trim())
      : "";

  if (text.length === 0 || text.length > MAX_TEXT) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (page.length > MAX_PAGE) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // The destination repo + token stay server-side; the client never sees them.
  const title = text.split("\n")[0].slice(0, 80);
  const lines = [text];
  if (page) lines.push("", `**Page:** \`${page}\``);
  lines.push("", `_Submitted ${new Date().toUTCString()} via the site feedback button._`);

  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body: lines.join("\n") }),
    }
  );

  if (!response.ok) {
    // Don't echo GitHub's body (may contain hints); a generic failure is fine.
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  submissions.set(ip, [...recent, now]);
  return NextResponse.json({ ok: true });
}
