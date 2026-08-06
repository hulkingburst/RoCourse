import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
}

/** Milliseconds of the last stored cloud update (0 when the account is fresh). */
export async function getCloudUpdatedAt(userId: string): Promise<number> {
  const profile = await prisma.progressProfile.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  return profile ? profile.updatedAt.getTime() : 0;
}
