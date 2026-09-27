import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, recordRateLimit } from "@/lib/rate-limit";
import { POLLS } from "@/lib/polls";
import {
  castVote,
  cleanGuestId,
  getTallies,
  resolveVoterKey,
} from "@/lib/poll-votes";
import type { PollTalliesResponse } from "@/lib/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anyone can vote — the course has no sign-up wall — so this is the abuse
// surface. Generous enough for a learner changing their mind a few times,
// tight enough to stop automated stuffing.
const LIMIT_PER_IP = 30;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const limitKey = (ip: string) => `poll-vote:${ip}`;

/** Tally for every poll, including which option the caller picked. */
export async function GET(request: Request) {
  // A session is optional here: the auth failure path must not reject guests,
  // so the session is resolved defensively rather than short-circuiting. A
  // guest passes their anonymous id so their own vote is highlighted; a
  // signed-in learner's session takes precedence over it.
  const session = await auth().catch(() => null);
  const guestId = cleanGuestId(new URL(request.url).searchParams.get("guestId"));
  const voterKey = resolveVoterKey(session?.user?.id, guestId);

  const polls = await getTallies(POLLS, voterKey);
  const body: PollTalliesResponse = { polls };
  return NextResponse.json(body);
}

/** Cast (or change) a vote. Returns the refreshed tally. */
export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = body as { pollId?: unknown; optionId?: unknown; guestId?: unknown };
  if (typeof record.pollId !== "string" || typeof record.optionId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const voterKey = resolveVoterKey(session?.user?.id, cleanGuestId(record.guestId));
  if (!voterKey) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await castVote(record.pollId, record.optionId, voterKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Only a vote that was actually written counts against the limit, so a
  // rejected payload can't burn a learner's quota.
  await recordRateLimit(limitKey(ip));
  return NextResponse.json({ ok: true, tally: result.tally });
}
