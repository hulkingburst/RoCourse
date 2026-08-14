import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeWeeklyXp } from "@/lib/xp";
import type {
  CloudState,
  ProgressSnapshot,
  SyncPayload,
} from "@/lib/sync-types";

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

/** Stores a progress blob and merges completion records (additive union). */
export async function saveCloudState(
  userId: string,
  payload: SyncPayload
): Promise<void> {
  await prisma.progressProfile.upsert({
    where: { userId },
    create: { userId, data: payload.progress as unknown as Prisma.InputJsonValue },
    update: { data: payload.progress as unknown as Prisma.InputJsonValue },
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
          completedAt: new Date(completion.completedAt ?? Date.now()),
        },
        update: { title: completion.title },
      });
    }
  }

  await saveWeeklyXpRows(userId, payload.progress);
}

/**
 * Keeps the user's weekly XP leaderboard rows in sync with the progress blob.
 * Values are clamped (see sanitizeWeeklyXp) and only ever raised, never
 * lowered, so a stale device pushing an older weekly total can't erase XP that
 * was already recorded.
 */
async function saveWeeklyXpRows(
  userId: string,
  progress: ProgressSnapshot
): Promise<void> {
  const weeklyXp = sanitizeWeeklyXp(progress?.weeklyXp);
  const weeks = Object.keys(weeklyXp);
  if (weeks.length === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return;

  for (const week of weeks) {
    const xp = weeklyXp[week];
    const existing = await prisma.weeklyXp.findUnique({
      where: { week_userId: { week, userId } },
      select: { id: true, xp: true },
    });
    if (existing) {
      if (xp > existing.xp) {
        await prisma.weeklyXp.update({
          where: { id: existing.id },
          data: { xp, name: user.name },
        });
      }
    } else {
      await prisma.weeklyXp.create({
        data: { userId, name: user.name, week, xp },
      });
    }
  }
}

/** Milliseconds of the last stored cloud update (0 when the account is fresh). */
export async function getCloudUpdatedAt(userId: string): Promise<number> {
  const profile = await prisma.progressProfile.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  return profile ? profile.updatedAt.getTime() : 0;
}
