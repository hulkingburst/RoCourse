import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, weekKey } from "@/lib/xp";
import { moderateName } from "@/lib/profanity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const ROWS_PER_PAGE = 50;

export interface LeaderboardRow {
  id: string;
  name: string;
  xp: number;
  /** Present for account users, linking to their public profile. */
  handle: string | null;
  /** Present for guests (no account). */
  guestId: string | null;
}

/**
 * Weekly XP leaderboard. Rows come from the shared WeeklyXp table: account
 * users (written during progress sync) and guests (written via /api/guest-xp).
 * Only the top `ROWS_PER_PAGE` rows are returned.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");

  let week: string;
  if (weekParam) {
    if (!isValidWeekKey(weekParam)) {
      return NextResponse.json({ error: "Invalid week" }, { status: 400 });
    }
    week = weekParam;
  } else {
    // The leaderboard client always sends an explicit `week` derived from the
    // learner's local timezone. This default (server-local week) only serves
    // callers that omit the parameter.
    week = weekKey(new Date());
  }

  const rows = await prisma.weeklyXp.findMany({
    where: { week },
    orderBy: [{ xp: "desc" }, { updatedAt: "asc" }],
    take: ROWS_PER_PAGE,
    select: {
      id: true,
      name: true,
      xp: true,
      guestId: true,
      user: { select: { handle: true } },
    },
  });

  return NextResponse.json({
    week,
    rows: rows.map((row) => ({
      id: row.id,
      // Names are re-checked on every read so rows written before moderation
      // (or from any future bypass) can never surface a banned word.
      name: moderateName(row.name),
      xp: row.xp,
      handle: row.user?.handle ?? null,
      guestId: row.guestId,
    })),
  });
}
