import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVerifiedCompletions } from "@/lib/completions";
import { getFeedbackResolvedCount } from "@/lib/feedback-resolved";
import { sanitizeSnapshot } from "@/lib/sanitize-snapshot";
import { getWeeklyFirstCount } from "@/lib/weekly-first";
import { MAX_WEEKLY_XP_ENTRIES, sanitizeWeeklyXp } from "@/lib/xp";
import type {
  CloudState,
  ProgressSnapshot,
  SyncPayload,
} from "@/lib/sync-types";

/** Days of weekly rows to keep per user (mirrors MAX_WEEKLY_XP_ENTRIES). */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Reads a user's cloud state: progress blob, completions, and account info. */
export async function getCloudState(userId: string): Promise<CloudState> {
  const [profile, completions, user] = await Promise.all([
    prisma.progressProfile.findUnique({ where: { userId } }),
    prisma.courseCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true },
    }),
  ]);

  return {
    hasProgress: profile !== null,
    progress: profile ? (profile.data as unknown as ProgressSnapshot) : null,
    lastUpdated: profile ? profile.updatedAt.toISOString() : null,
    completions: completions.map((completion) => ({
      courseId: completion.courseId,
      title: completion.title,
      completedAt: completion.completedAt.toISOString(),
    })),
    weeklyFirsts: await getWeeklyFirstCount(userId),
    feedbackResolved: await getFeedbackResolvedCount(userId),
    account: user
      ? {
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        }
      : null,
  };
}

/**
 * Stores a progress blob and re-derives the user's completion records from it.
 * The blob is sanitized server-side before being persisted: every field is
 * type-checked and bounded (lesson records, counters, day keys, weekly XP, and
 * a lifetime-XP cap), so a malformed or inflated payload can never poison a
 * stored profile or inflate a public one.
 *
 * Completions are never taken from the payload. The client-supplied
 * `completions` field is ignored entirely: the only thing that can create a
 * `CourseCompletion` is the capstone evidence inside the sanitized blob
 * (`getVerifiedCompletions`), so a request cannot mint a certificate for a
 * course the learner did not finish and a stored record always matches the
 * progress it came from. Rows whose evidence is gone (the learner un-completed
 * the capstone) are removed, which is what keeps the showcase gate and the
 * weekly board resting on the same server-derived truth.
 */
export async function saveCloudState(
  userId: string,
  payload: SyncPayload
): Promise<void> {
  const clean = sanitizeSnapshot(payload.progress);
  await prisma.progressProfile.upsert({
    where: { userId },
    create: { userId, data: clean as unknown as Prisma.InputJsonValue },
    update: { data: clean as unknown as Prisma.InputJsonValue },
  });

  const completions = getVerifiedCompletions(clean);
  for (const completion of completions) {
    const completedAt = new Date(completion.completedAt);
    await prisma.courseCompletion.upsert({
      where: { userId_courseId: { userId, courseId: completion.courseId } },
      create: {
        userId,
        courseId: completion.courseId,
        title: completion.title,
        completedAt,
      },
      update: { title: completion.title, completedAt },
    });
  }
  await prisma.courseCompletion.deleteMany({
    where: {
      userId,
      courseId: { notIn: completions.map((completion) => completion.courseId) },
    },
  });

  await saveWeeklyXpRows(userId, clean);
}

/**
 * Keeps the user's weekly XP leaderboard rows in sync with the progress blob.
 * Values are clamped (see sanitizeWeeklyXp) and only ever raised, never
 * lowered, so a stale device pushing an older weekly total can't erase XP that
 * was already recorded. Display names are refreshed whenever they differ.
 *
 * Incoming weeks are unioned with what is already stored: a device that only
 * knows about the current week (a fresh sign-in, a second device, a cleared
 * browser) must never delete rows another device earned. The table stays
 * bounded by the retention window alone — rows older than the weeks the
 * leaderboard still reads are dropped — so nothing that is still being
 * displayed can be pruned by the shape of the latest payload.
 */
async function saveWeeklyXpRows(
  userId: string,
  progress: ProgressSnapshot
): Promise<void> {
  const weeklyXp = sanitizeWeeklyXp(progress?.weeklyXp);
  const weeks = Object.keys(weeklyXp);
  if (weeks.length === 0) {
    // An empty bucket from a client that still reports lesson progress is a
    // stale one — its weekly totals were lost, not deliberately cleared — and
    // deleting on its word would drop the learner off the board and throw away
    // rows another device earned. The rows are left untouched; the progress
    // itself is stored either way.
    if (hasLessonProgress(progress)) return;
    // Nothing claimed and no lessons to speak of: this is the genuine wipe
    // (`resetProgress` empties `lessons` too), so drop the rows. That is what
    // still bounds the table when a learner clears their progress.
    await prisma.weeklyXp.deleteMany({ where: { userId } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return;

  // One read for every week instead of one per week. A snapshot carries several
  // buckets, and the per-week `findUnique` made a single progress push several
  // round trips deep before the first write.
  const existingRows = await prisma.weeklyXp.findMany({
    where: { userId, week: { in: weeks } },
    select: { id: true, week: true, xp: true, name: true },
  });
  const existingByWeek = new Map(existingRows.map((row) => [row.week, row]));

  for (const week of weeks) {
    const xp = weeklyXp[week];
    const existing = existingByWeek.get(week);
    if (existing) {
      if (existing.name !== user.name || xp > existing.xp) {
        await prisma.weeklyXp.update({
          where: { id: existing.id },
          data: { xp: Math.max(existing.xp, xp), name: user.name },
        });
      }
    } else {
      await prisma.weeklyXp.create({
        data: { userId, name: user.name, week, xp },
      });
    }
  }

  // Prune by the retention window only. Every week older than the window is no
  // longer read by the leaderboard, so its row is stale; weeks inside the
  // window are kept even when the payload doesn't mention them, because
  // another device may be the one that earned them.
  const oldestAllowed = new Date(Date.now() - MAX_WEEKLY_XP_ENTRIES * WEEK_MS);
  const oldestAllowedKey = oldestAllowed.toISOString().slice(0, 10);
  await prisma.weeklyXp.deleteMany({
    where: { userId, week: { lt: oldestAllowedKey } },
  });
}

/**
 * True when a snapshot still carries lesson records. A learner who reset their
 * progress has none, because `resetProgress` clears the map — which is how an
 * intentional wipe is told apart from a stale client that merely lost its
 * weekly XP totals.
 */
function hasLessonProgress(progress: ProgressSnapshot): boolean {
  const lessons = progress?.lessons;
  return !!lessons && Object.keys(lessons).length > 0;
}

/** Milliseconds of the last stored cloud update (0 when the account is fresh). */
export async function getCloudUpdatedAt(userId: string): Promise<number> {
  const profile = await prisma.progressProfile.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  return profile ? profile.updatedAt.getTime() : 0;
}
