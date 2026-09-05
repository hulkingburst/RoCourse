import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, MAX_WEEKLY_XP, weekKey } from "@/lib/xp";
import { moderateGuestName } from "@/lib/profanity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guests are unauthenticated, so this is the abuse surface for the weekly
// leaderboard. The per-IP cap is generous for a single learner while keeping
// automated spam from hammering the DB, and every claimed value is clamped.
const LIMIT_PER_IP = 120;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const limitKey = (ip: string) => `guest-xp:${ip}`;

// Guests may only post to the current week or one in each direction. Without a
// window, a guest could scatter rows across arbitrary past or future weeks and
// pollute the board. The ±1 week slack is required because the client derives
// its week in *its* timezone while this check runs in the server's timezone —
// near the week boundary the two can disagree by a week either way.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const GUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
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
 * Records a guest's weekly XP for the leaderboard. Guests have no account, so
 * they identify with a client-generated anonymous id plus a self-chosen name.
 * The stored value only ever rises: a stale device pushing an older total
 * can't lower what's already on the board. The write is race-safe (create
 * collisions fall back to a raise-only update) and the display name is kept
 * fresh even when the claimed XP doesn't change.
 */
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

  const record = body as {
    guestId?: unknown;
    name?: unknown;
    week?: unknown;
    xp?: unknown;
  };

  if (typeof record.guestId !== "string" || !GUEST_ID_RE.test(record.guestId)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }
  const rawName = cleanName(record.name);
  if (!rawName) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  // Slurs and profanity never reach the board: the bad name is swapped for a
  // stable anonymous one instead of rejecting the XP post outright, so a
  // name that was already saved in a guest's browser still shows under a
  // neutral label (the row is matched by guestId, not by name).
  const name = moderateGuestName(rawName, record.guestId);
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
  await pruneRateLimits();

  return NextResponse.json({ ok: true });
}
