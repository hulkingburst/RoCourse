import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureHandle } from "@/lib/users";
import { ensureShowcaseLabels } from "@/lib/showcase";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { MAX_GAME_DESCRIPTION, MAX_GAME_NAME, MAX_GAME_URL } from "@/lib/showcase-shared";

export const runtime = "nodejs";
export const maxDuration = 15;

// Generous abuse guard for the review queue, not exact accounting.
const LIMIT_PER_USER = 10;
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const limitKey = (userId: string) => `showcase-submit:${userId}`;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const cleanLine = (value: unknown): string => clean(value).replace(/[\r\n]+/g, " ").replace(/-->/g, "");

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "not-signed-in" }, { status: 401 });
  }

  const key = limitKey(session.user.id);
  if (await isRateLimited(key, LIMIT_PER_USER, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "rate-limit" }, { status: 429 });
  }

  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  const repo = process.env.RESOURCES_GITHUB_REPO || "hulkingburst/rocourse-feedback";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const fields = body as { name?: unknown; description?: unknown; url?: unknown };
  const name = cleanLine(fields.name);
  const description = clean(fields.description);
  const url = clean(fields.url);

  if (name.length === 0 || name.length > MAX_GAME_NAME) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (description.length === 0 || description.length > MAX_GAME_DESCRIPTION) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (url.length > MAX_GAME_URL) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (url.length > 0) {
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (protocol !== "http:" && protocol !== "https:") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
  }

  // Only students who actually finished the course can submit — the showcase
  // exists to demonstrate what completing the course makes possible.
  const completed = await prisma.courseCompletion.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!completed) {
    return NextResponse.json({ ok: false, error: "not-finished" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, handle: true },
  });
  const displayName = user?.name || "Learner";
  const handle = user?.handle ?? (await ensureHandle(session.user.id));

  const lines: string[] = [];
  lines.push(`<!-- SC:NAME:${displayName} -->`);
  if (handle) lines.push(`<!-- SC:HANDLE:${handle} -->`);
  lines.push("<!-- SC:DESC_START -->", description, "<!-- SC:DESC_END -->");
  if (url) lines.push(`<!-- SC:URL:${url} -->`);
  lines.push(
    "",
    `_Submitted by ${displayName}${handle ? ` (@${handle})` : ""} via the site._`
  );

  const labelsReady = await ensureShowcaseLabels();
  if (!labelsReady) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[Showcase] ${name}`,
      body: lines.join("\n"),
      labels: ["showcase", "needs-review"],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  await recordRateLimit(key);
  await pruneRateLimits();
  return NextResponse.json({ ok: true });
}