import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, MAX_WEEKLY_XP } from "@/lib/xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guests are unauthenticated, so this is the abuse surface for the weekly
// leaderboard. The per-IP cap is generous for a single learner while keeping
// automated spam from hammering the DB, and every claimed value is clamped.
const LIMIT_PER_IP = 120;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const limitKey = (ip: string) => `guest-xp:${ip}`;

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

/**
 * Records a guest's weekly XP for the leaderboard. Guests have no account, so
 * they identify with a client-generated anonymous id plus a self-chosen name.
 * The stored value only ever rises: a stale device pushing an older total
 * can't lower what's already on the board.
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
  const name = cleanName(record.name);
  if (!name) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (typeof record.week !== "string" || !isValidWeekKey(record.week)) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
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
  const existing = await prisma.weeklyXp.findUnique({
    where: { week_guestId: { week: record.week, guestId } },
    select: { id: true, xp: true },
  });

  if (existing) {
    if (record.xp > existing.xp) {
      await prisma.weeklyXp.update({
        where: { id: existing.id },
        data: { xp: record.xp, name },
      });
    }
  } else {
    await prisma.weeklyXp.create({
      data: { guestId, name, week: record.week, xp: record.xp },
    });
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();

  return NextResponse.json({ ok: true });
}
