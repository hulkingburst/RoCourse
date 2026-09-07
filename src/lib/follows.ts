import { prisma } from "@/lib/prisma";

export type FollowOutcome =
  | { ok: true }
  | { ok: false; reason: "not-found" | "self" };

export type ProfileViewer =
  | { status: "guest" }
  | { status: "self" }
  | { status: "visitor"; isFollowing: boolean };

/** Server-side handle validation — the client never picks the target identity. */
export function isValidHandle(handle: unknown): handle is string {
  return (
    typeof handle === "string" &&
    handle.length > 0 &&
    handle.length <= 64 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(handle)
  );
}

export async function resolveUserByHandle(
  handle: string
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({ where: { handle }, select: { id: true } });
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followedId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

/** Whether `followerId` already follows `followedId`. */
export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  return (
    (await prisma.follow.findUnique({
      where: { followerId_followedId: { followerId, followedId } },
      select: { id: true },
    })) !== null
  );
}

/**
 * Who is the current viewer on a public profile? Guests are anonymous (no
 * follow state), self is the profile owner, and visitors get whether they
 * already follow the profile owner.
 */
export async function getProfileViewer(
  viewerId: string | undefined,
  targetHandle: string
): Promise<ProfileViewer> {
  if (!viewerId) return { status: "guest" };
  const target = await resolveUserByHandle(targetHandle);
  if (!target) return { status: "guest" };
  if (target.id === viewerId) return { status: "self" };
  return { status: "visitor", isFollowing: await isFollowing(viewerId, target.id) };
}

/** Follows `handle` as `followerId`. Idempotent; self-follow is rejected. */
export async function followUser(
  followerId: string,
  handle: string
): Promise<FollowOutcome> {
  const target = await resolveUserByHandle(handle);
  if (!target) return { ok: false, reason: "not-found" };
  if (target.id === followerId) return { ok: false, reason: "self" };
  try {
    await prisma.follow.create({ data: { followerId, followedId: target.id } });
  } catch (error) {
    // The pair already exists (unique constraint) — treat as success. Any
    // self-follow the DB-level CHECK constraint still rejects would have been
    // caught above, so a P2002 here is by definition a duplicate follow.
    if ((error as { code?: string }).code === "P2002") return { ok: true };
    throw error;
  }
  return { ok: true };
}

/** Removes a follow. Idempotent — unfollowing without a row is a no-op. */
export async function unfollowUser(
  followerId: string,
  handle: string
): Promise<FollowOutcome> {
  const target = await resolveUserByHandle(handle);
  if (!target) return { ok: false, reason: "not-found" };
  if (target.id === followerId) return { ok: false, reason: "self" };
  await prisma.follow.deleteMany({
    where: { followerId, followedId: target.id },
  });
  return { ok: true };
}

/** Ids the user follows — the account set behind the friends leaderboard. */
export async function getFollowingUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followedId: true },
  });
  return rows.map((row) => row.followedId);
}