import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, weekKey } from "@/lib/xp";
import { moderateName } from "@/lib/profanity";
import { getFollowingUserIds } from "@/lib/follows";
import { auth } from "@/lib/auth";

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
 *
 * `view=friends` (signed-in only) narrows the board to the accounts the viewer
 * follows plus themselves — follows are one-way, and accounts they follow must
 * have an account-linked row to appear. Only the top `ROWS_PER_PAGE` rows are
 * returned in either view.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");
  const view = searchParams.get("view") ?? "everyone";

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

  const select = {
    id: true,
    name: true,
    xp: true,
    guestId: true,
    user: { select: { handle: true } },
  } satisfies Prisma.WeeklyXpSelect;

  const orderBy: Prisma.WeeklyXpOrderByWithRelationInput[] = [
    { xp: "desc" },
    { updatedAt: "asc" },
  ];

  type LedgerRow = Prisma.WeeklyXpGetPayload<{ select: typeof select }>;
  let rows: LedgerRow[] = [];

  if (view === "friends") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const following = await getFollowingUserIds(session.user.id);
    const userIds = Array.from(new Set([session.user.id, ...following]));
    rows = await prisma.weeklyXp.findMany({
      where: { week, userId: { in: userIds } },
      orderBy,
      take: ROWS_PER_PAGE,
      select,
    });
  } else {
    rows = await prisma.weeklyXp.findMany({
      where: { week },
      orderBy,
      take: ROWS_PER_PAGE,
      select,
    });
  }

  return NextResponse.json({
    week,
    view,
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
