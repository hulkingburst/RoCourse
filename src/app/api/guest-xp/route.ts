import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import {
  GUEST_ID_RE,
  issueGuestToken,
  newGuestId,
  provenGuestId,
  verifyGuestToken,
} from "@/lib/guest-identity";
import { GUEST_TOKEN_HEADER } from "@/lib/guest-protocol";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, MAX_WEEKLY_XP, weekKey } from "@/lib/xp";
import { guestFallbackName } from "@/lib/profanity";
import { moderatePublicText } from "@/lib/moderation";
import { PRIVATE_JSON_HEADERS } from "@/lib/private-json";
import { isSameOriginRequest } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guests are unauthenticated, so this is the abuse surface for the weekly
// leaderboard. Posting is still generous for a single learner (a device posts
// whenever XP changes); the real ceiling is identity issuance below, because a
// fake learner needs a token before it can post at all. Every claimed value is
// clamped.
const LIMIT_PER_IP = 120;
/** Per-identity budget, so one id can't be hammered as a free posting slot. */
const LIMIT_PER_GUEST = 60;
/** Identity issuance: how many new learners one address may mint per hour. */
const LIMIT_ISSUE_PER_IP = 6;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const limitKey = (ip: string) => `guest-xp:${ip}`;
const guestLimitKey = (guestId: string) => `guest-xp-id:${guestId}`;
const issueLimitKey = (ip: string) => `guest-xp-issue:${ip}`;

// Guests may only post to the current week or one in each direction. Without a
// window, a guest could scatter rows across arbitrary past or future weeks and
// pollute the board. The ±1 week slack is required because the client derives
// its week in *its* timezone while this check runs in the server's timezone —
// near the week boundary the two can disagree by a week either way.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const MAX_NAME_LENGTH = 24;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

/** True when `week` is the current leaderboard week or one week on either side. */
function isRecentWeek(week: string): boolean {
  const current = weekKey(new Date());
  const previous = weekKey(new Date(Date.now() - WEEK_MS));
  const next = weekKey(new Date(Date.now() + WEEK_MS));
  return week === current || week === previous || week === next;
}

/**
 * Issues (or re-confirms) an anonymous identity for a device, returning the
 * signed token that posting requires.
 *
 * The caller presents the id it already has — and, in the `x-guest-token`
 * header, the token that came with it — so a returning guest keeps the same row
 * on the board. The proof is demanded only for an id that has something to
 * lose; see `resolveGuestId`. Issuance is the budget that limits how many
 * learners one address can create in an hour.
 */
export async function GET(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(issueLimitKey(ip), LIMIT_ISSUE_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const requested = new URL(request.url).searchParams.get("guestId") ?? "";
  const guestId = await resolveGuestId(
    requested,
    request.headers.get(GUEST_TOKEN_HEADER)
  );
  await recordRateLimit(issueLimitKey(ip));
  await pruneRateLimits();
  return NextResponse.json(
    { ok: true, guestId, token: issueGuestToken(guestId) },
    // A bearer credential for this device alone: never cacheable.
    { headers: PRIVATE_JSON_HEADERS }
  );
}

/**
 * The identity this request is allowed to use.
 *
 * An id nobody has posted for is adopted just as it is, so a first-time guest
 * — or a device that cleared its storage and asks again — needs no proof at
 * all. An id that already has board rows belongs to whoever created it, so it
 * is only re-signed for a caller holding a token this server issued for it; a
 * caller that merely names a live id is handed a fresh server-generated one
 * instead, which leaves the real owner's row untouched.
 */
async function resolveGuestId(
  requested: string,
  token: string | null
): Promise<string> {
  if (!GUEST_ID_RE.test(requested)) return newGuestId();
  // The common returning-device path: proof already in hand, no query needed.
  if (provenGuestId(requested, token)) return requested;
  const claimed = await prisma.weeklyXp.findFirst({
    where: { guestId: requested },
    select: { id: true },
  });
  return claimed ? newGuestId() : requested;
}

/**
 * Records a guest's weekly XP for the leaderboard. Guests have no account, so
 * they identify with a server-issued anonymous id plus a self-chosen name, and
 * only a live signed token for that id is accepted — a caller cannot invent a
 * learner or post as someone else's. The stored value only ever rises: a stale
 * device pushing an older total can't lower what's already on the board. The
 * write is race-safe (create collisions fall back to a raise-only update) and
 * the display name is kept fresh even when the claimed XP doesn't change.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

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

  const record = body as {
    guestId?: unknown;
    token?: unknown;
    name?: unknown;
    week?: unknown;
    xp?: unknown;
  };

  if (typeof record.guestId !== "string" || !GUEST_ID_RE.test(record.guestId)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }
  // No token, a token for another id, an expired one, or a token we never
  // issued: nothing is written. The client asks GET for a fresh identity.
  if (!verifyGuestToken(record.guestId, record.token)) {
    return NextResponse.json({ error: "Invalid guest token" }, { status: 401 });
  }
  const rawName = cleanName(record.name);
  if (!rawName) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  // Slurs and profanity never reach the board: the bad name is swapped for a
  // stable anonymous one instead of rejecting the XP post outright, so a
  // name that was already saved in a guest's browser still shows under a
  // neutral label (the row is matched by guestId, not by name). The check runs
  // through the API-backed gate as well, so terms beyond the local list count.
  const name =
    (await moderatePublicText(rawName)) === null
      ? rawName
      : guestFallbackName(record.guestId);
  if (typeof record.week !== "string" || !isValidWeekKey(record.week)) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }
  if (!isRecentWeek(record.week)) {
    return NextResponse.json({ error: "Week out of range" }, { status: 400 });
  }
  if (
    typeof record.xp !== "number" ||
    !Number.isFinite(record.xp) ||
    !Number.isInteger(record.xp) ||
    record.xp < 0 ||
    record.xp > MAX_WEEKLY_XP
  ) {
    return NextResponse.json({ error: "Invalid xp" }, { status: 400 });
  }

  const guestId = record.guestId;
  if (await isRateLimited(guestLimitKey(guestId), LIMIT_PER_GUEST, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const where = { week_guestId: { week: record.week, guestId } };

  const existing = await prisma.weeklyXp.findUnique({
    where,
    select: { id: true, xp: true, name: true },
  });

  if (existing) {
    const raise = record.xp > existing.xp;
    if (raise || existing.name !== name) {
      await prisma.weeklyXp.update({
        where: { id: existing.id },
        data: {
          xp: raise ? record.xp : existing.xp,
          name,
        },
      });
    }
  } else {
    try {
      await prisma.weeklyXp.create({
        data: { guestId, name, week: record.week, xp: record.xp },
      });
    } catch (err) {
      // Lost a create race — another request for this guest+week just landed.
      // Re-read and apply the raise-only rule so the newer request wins.
      const isDuplicate =
        err instanceof Error &&
        "code" in err &&
        (err as { code?: string }).code === "P2002";
      if (!isDuplicate) throw err;
      const raced = await prisma.weeklyXp.findUnique({
        where,
        select: { id: true, xp: true, name: true },
      });
      if (raced) {
        const raise = record.xp > raced.xp;
        if (raise || raced.name !== name) {
          await prisma.weeklyXp.update({
            where: { id: raced.id },
            data: { xp: raise ? record.xp : raced.xp, name },
          });
        }
      }
    }
  }

  await recordRateLimit(limitKey(ip));
  await recordRateLimit(guestLimitKey(guestId));
  await pruneRateLimits();

  return NextResponse.json({ ok: true });
}
