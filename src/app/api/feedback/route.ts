import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_TEXT = 2000;
const MAX_PAGE = 500;
const LIMIT_PER_IP = 5;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `feedback:${ip}`;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ip = trustedIp(request.headers);

  // DB-backed rate limit (shared across instances) so the inbox stays usable.
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
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

  // For signed-in users, remember the ticket and confirm with a notification
  // so a later close (with the author's real comment) can be relayed back.
  const created = (await response.json()) as { number?: number };
  if (userId && typeof created.number === "number") {
    try {
      await prisma.$transaction([
        prisma.feedbackTicket.upsert({
          where: { repo_issueNumber: { repo, issueNumber: created.number } },
          create: {
            userId,
            repo,
            issueNumber: created.number,
            title: title.slice(0, 200),
          },
          update: { title: title.slice(0, 200) },
        }),
        prisma.notification.upsert({
          where: {
            userId_localKey: {
              userId,
              localKey: `feedback:${created.number}:received`,
            },
          },
          create: {
            userId,
            localKey: `feedback:${created.number}:received`,
            type: "feedback_received",
            title: "Feedback received",
            body: text.slice(0, 2000),
            link: `https://github.com/${repo}/issues/${created.number}`,
          },
          update: {},
        }),
      ]);
    } catch {
      // A failed backup must not take down an otherwise-successful submission.
    }
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();
  return NextResponse.json({ ok: true });
}
