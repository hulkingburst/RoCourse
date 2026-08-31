import { prisma } from "@/lib/prisma";
import { weekKey } from "@/lib/xp";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The most recently completed leaderboard week. A week keyed by its Monday
 * `YYYY-MM-DD` is considered over once we've reached the following Monday.
 * Only completed weeks are ever awarded, so the badge reflects final standings.
 */
function latestCompletedWeek(now = new Date()): string {
  return weekKey(new Date(now.getTime() - WEEK_MS));
}

/**
 * Settles the most recent completed leaderboard week (if it hasn't been
 * already): the account-user ranked #1 that week is recorded permanently.
 *
 * Idempotent & cheap in steady state — a single unique lookup on `week` short
 * circuits before any leaderboard scan. Only rows with a userId are eligible
 * (guests have no profile to hold a lasting badge). Ties resolve the same way
 * the leaderboard does: highest XP, then earliest updated row.
 */
export async function settleCompletedWeeks(now = new Date()): Promise<void> {
  const week = latestCompletedWeek(now);

  const settled = await prisma.weeklyFirst.findUnique({ where: { week } });
  if (settled) return;

  const top = await prisma.weeklyXp.findFirst({
    where: { week, userId: { not: null } },
    orderBy: [{ xp: "desc" }, { updatedAt: "asc" }],
    select: { userId: true },
  });
  if (!top?.userId) return;

  try {
    await prisma.weeklyFirst.create({ data: { week, userId: top.userId } });
  } catch (err) {
    // Lost a race with another request settling the same week — fine, the
    // achievement is already recorded.
    const isDuplicate =
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "P2002";
    if (!isDuplicate) throw err;
  }
}

/** Number of weekly-first placements a user has earned. Settles first so a
 * just-ended week counts the moment it's read. */
export async function getWeeklyFirstCount(userId: string): Promise<number> {
  await settleCompletedWeeks();
  return prisma.weeklyFirst.count({ where: { userId } });
}
