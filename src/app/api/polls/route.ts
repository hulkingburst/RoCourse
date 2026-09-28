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
import {
  getResultsUrls,
  pruneRetiredPollNotifications,
  reportClosedPolls,
} from "@/lib/poll-results";
import type { PollTalliesResponse } from "@/lib/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The close sweep files a GitHub issue from this route the first time anyone
// reads a poll after it ends; the read itself never waits on more than that.
export const maxDuration = 15;

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

  // Polls end on a clock and nothing here runs on one, so the poll read is
  // where a close gets noticed: the first read after a poll's window ends files
  // its results issue and retires the notification backup. Both steps are
  // idempotent, and in the steady state they cost one indexed query each.
  // Neither is allowed to fail the read the learner actually asked for.
  await reportClosedPolls();
  await pruneRetiredPollNotifications(POLLS).catch(() => null);

  const resultsUrls = await getResultsUrls(POLLS.map((poll) => poll.id));
  const polls = await getTallies(POLLS, voterKey, Date.now(), resultsUrls);
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
