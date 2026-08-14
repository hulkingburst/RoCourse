import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeSnapshot } from "@/lib/sanitize-snapshot";
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
 * Stores a progress blob and merges completion records (additive union). The
 * blob is sanitized server-side before being persisted: every field is
 * type-checked and bounded (lesson records, counters, day keys, weekly XP, and
 * a lifetime-XP cap), so a malformed or inflated payload can never poison a
 * stored profile or inflate a public one.
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

  if (Array.isArray(payload.completions)) {
    for (const completion of payload.completions) {
      if (!completion.courseId || !completion.title) continue;
      await prisma.courseCompletion.upsert({
        where: { userId_courseId: { userId, courseId: completion.courseId } },
        create: {
          userId,
          courseId: completion.courseId,
          title: completion.title,
          completedAt: safeDate(completion.completedAt),
        },
        update: { title: completion.title },
      });
    }
  }

  await saveWeeklyXpRows(userId, clean);
}

/** Parses a client-provided completion timestamp, falling back to now. */
function safeDate(value: string | undefined): Date {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Keeps the user's weekly XP leaderboard rows in sync with the progress blob.
 * Values are clamped (see sanitizeWeeklyXp) and only ever raised, never
 * lowered, so a stale device pushing an older weekly total can't erase XP that
 * was already recorded. Display names are refreshed whenever they differ, and
 * rows for weeks outside the kept window are pruned so the table can't grow
 * without bound.
 */
async function saveWeeklyXpRows(
  userId: string,
  progress: ProgressSnapshot
): Promise<void> {
  const weeklyXp = sanitizeWeeklyXp(progress?.weeklyXp);
  const weeks = Object.keys(weeklyXp);
  if (weeks.length === 0) {
    // Nothing claimed — drop any rows this user may have accumulated. This
    // bounds the table even when progress is reset or the blob is cleared.
    await prisma.weeklyXp.deleteMany({ where: { userId } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return;

  for (const week of weeks) {
    const xp = weeklyXp[week];
    const existing = await prisma.weeklyXp.findUnique({
      where: { week_userId: { week, userId } },
      select: { id: true, xp: true, name: true },
    });
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

  // Prune rows older than the oldest week we keep. Every week older than this
  // window is either no longer in the blob (superseded) or was never part of
  // the kept set, so the row is stale and safe to drop.
  const oldestKept = weeks[0];
  const oldestAllowed = new Date(Date.now() - MAX_WEEKLY_XP_ENTRIES * WEEK_MS);
  const oldestAllowedKey = oldestAllowed.toISOString().slice(0, 10);
  await prisma.weeklyXp.deleteMany({
    where: { userId, week: { lt: oldestKept < oldestAllowedKey ? oldestKept : oldestAllowedKey } },
  });
}

/** Milliseconds of the last stored cloud update (0 when the account is fresh). */
export async function getCloudUpdatedAt(userId: string): Promise<number> {
  const profile = await prisma.progressProfile.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  return profile ? profile.updatedAt.getTime() : 0;
}
