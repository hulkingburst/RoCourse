import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidWeekKey, weekKey } from "@/lib/xp";
import { moderateName } from "@/lib/profanity";
import { getFollowingUserIds } from "@/lib/follows";
import { auth } from "@/lib/auth";
import { provenGuestId } from "@/lib/guest-identity";
import { GUEST_TOKEN_HEADER } from "@/lib/guest-protocol";
import { PRIVATE_JSON_HEADERS } from "@/lib/private-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const ROWS_PER_PAGE = 50;

/**
 * How long the shared board may be served from cache. Every visitor used to pay
 * for the same `findMany`; the rows only ever gain XP, and the caller's own-row
 * marker is applied after the read, so a minute of staleness costs nothing. The
 * friends view is not cached — it depends on who is asking.
 */
const BOARD_REVALIDATE_SECONDS = 60;

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

/** The public board for one week, shared by every caller. */
const getPublicRows = unstable_cache(
  async (week: string): Promise<LedgerRow[]> =>
    prisma.weeklyXp.findMany({
      where: { week },
      orderBy,
      take: ROWS_PER_PAGE,
      select,
    }),
  ["leaderboard-week"],
  { revalidate: BOARD_REVALIDATE_SECONDS }
);

export interface LeaderboardRow {
  id: string;
  name: string;
  xp: number;
  /** Present for account users, linking to their public profile. */
  handle: string | null;
  /**
   * True only for the caller's own row. Rows deliberately carry no guest id:
   * the server knows which row the caller owns — the session for an account, a
   * proven guest token for a guest — and marks it here, so the marker is the
   * only ownership signal that travels back to the browser, and it is decided
   * server-side, so reading the board reveals nothing about another visitor's
   * identity.
   */
  you: boolean;
}

/**
 * Weekly XP leaderboard. Rows come from the shared WeeklyXp table: account
 * users (written during progress sync) and guests (written via /api/guest-xp).
 *
 * `view=friends` (signed-in only) narrows the board to the accounts the viewer
 * follows plus themselves — follows are one-way, and accounts they follow must
 * have an account-linked row to appear. Only the top `ROWS_PER_PAGE` rows are
 * returned in either view.
 *
 * A guest names its own id and proves it with the token it was issued
 * (`?guestId=…` plus the `x-guest-token` header); an id that is only asserted,
 * or one whose token has been seen by anyone else, marks nothing. The response
 * is personalized, so it is never cached.
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

  const session = await auth().catch(() => null);
  const sessionUserId = session?.user?.id ?? null;
  const sessionHandle = sessionUserId ? (session?.user?.handle ?? null) : null;
  // A guest is marked only for an id it can prove it owns, so naming someone
  // else's id (the only way to guess one at all, now that ids never leave the
  // server) earns nothing. The caller is told when the id it named could not be
  // recognised, so a device whose token has aged out can refresh and re-ask.
  const requestedGuestId = searchParams.get("guestId");
  const guestOwner = provenGuestId(
    requestedGuestId,
    request.headers.get(GUEST_TOKEN_HEADER)
  );

  let rows: LedgerRow[] = [];

  if (view === "friends") {
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
    rows = await getPublicRows(week);
  }

  return NextResponse.json(
    {
      week,
      view,
      rows: rows.map((row) => ({
        id: row.id,
        // Names are re-checked on every read so rows written before moderation
        // (or from any future bypass) can never surface a banned word.
        name: moderateName(row.name),
        xp: row.xp,
        handle: row.user?.handle ?? null,
        // Account rows are matched by handle and guest rows by the id the
        // caller proved — the same rule the browser used to apply locally, so
        // the rendering is unchanged. A signed-in caller is never marked on a
        // guest row, even if it also names one.
        you:
          sessionUserId !== null
            ? sessionHandle !== null && row.user?.handle === sessionHandle
            : guestOwner !== null && row.guestId === guestOwner,
      })),
      // True when the caller named a guest id the server could not match to a
      // token it issued — the signal a stale-token device refreshes on.
      guestTokenStale:
        sessionUserId === null && guestOwner === null && requestedGuestId !== null,
    },
    // The marker makes this response caller-specific: never cached, and any
    // shared cache that keeps it must key on the session cookie.
    { headers: PRIVATE_JSON_HEADERS }
  );
}
