"use server";

import { auth, unstable_update } from "@/lib/auth";
import { MAX_NAME_LENGTH, NAME_CHANGE_INTERVAL_MS } from "@/lib/account";
import { isValidAvatar } from "@/lib/avatar";
import { isValidTitle } from "@/lib/titles";
import { getUnlockedTitleIds } from "@/lib/title-data";
import { prisma } from "@/lib/prisma";
import { prohibitedNameReason } from "@/lib/profanity";

export interface ChangeUsernameResult {
  /** i18n key suffix under the `settings` namespace when the change fails. */
  error?:
    | "unauthorized"
    | "required"
    | "tooLong"
    | "badWord"
    | "email"
    | "site"
    | "same"
    | "cooldown";
  /** ISO timestamp of when the next change is allowed, set with "cooldown". */
  nextChangeAt?: string;
}

/**
 * Changes the signed-in user's username. Mirrors the sign-up name validation
 * (trimmed, ≤40 chars, profanity-checked) and enforces a rolling 7-day
 * cooldown recorded on the user row. The denormalized weekly leaderboard name
 * is kept in sync, and the session token is re-signed so the new name shows
 * immediately without a fresh sign-in.
 */
export async function changeUsername(
  formData: FormData
): Promise<ChangeUsernameResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "unauthorized" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "required" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { error: "tooLong" };
  }
  const nameReason = prohibitedNameReason(name);
  if (nameReason) {
    return { error: nameReason === "badword" ? "badWord" : nameReason };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, nameChangedAt: true },
  });
  if (!user) {
    return { error: "unauthorized" };
  }
  if (user.name === name) {
    return { error: "same" };
  }

  if (user.nameChangedAt) {
    const nextAllowed = user.nameChangedAt.getTime() + NAME_CHANGE_INTERVAL_MS;
    if (Date.now() < nextAllowed) {
      return {
        error: "cooldown",
        nextChangeAt: new Date(nextAllowed).toISOString(),
      };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name, nameChangedAt: new Date() },
    }),
    prisma.weeklyXp.updateMany({
      where: { userId },
      data: { name },
    }),
  ]);

  await unstable_update({ user: { name } });

  return {};
}

export interface SetAvatarResult {
  /** i18n key suffix under the `settings` namespace when the change fails. */
  error?: "unauthorized" | "invalid";
  /** The stored seed (or null when removed) on success. */
  avatar?: string | null;
}

/**
 * Sets or removes the signed-in user's profile picture. Only curated seeds
 * from the allowed list are ever stored — anything else is rejected outright,
 * so the DB can never hold a user-supplied image URL or style. The session
 * token is re-signed so the new picture shows immediately.
 */
export async function setAvatar(
  seed: string | null | undefined
): Promise<SetAvatarResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "unauthorized" };
  }

  const next = seed ? (isValidAvatar(seed) ? seed : null) : null;
  if (seed && !next) {
    return { error: "invalid" };
  }

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { avatar: next },
  });
  if (result.count === 0) {
    return { error: "unauthorized" };
  }

  await unstable_update({ user: { avatar: next } });

  return { avatar: next };
}

export interface SetTitleResult {
  /** i18n key suffix under the `settings` namespace when the change fails. */
  error?: "unauthorized" | "invalid" | "locked";
  /** The stored title id (or null when removed) on success. */
  title?: string | null;
}

/**
 * Sets or removes the signed-in user's developer title. Only stable ids from
 * the title catalogue are ever stored, and a title can only ever be chosen if
 * the server-side eligibility check says it was earned — the client can never
 * grant itself a title. The session token is re-signed so the new title shows
 * immediately.
 */
export async function setTitle(
  titleId: string | null | undefined
): Promise<SetTitleResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "unauthorized" };
  }

  const next = titleId ? (isValidTitle(titleId) ? titleId : null) : null;
  if (titleId && !next) {
    return { error: "invalid" };
  }

  if (next) {
    const unlocked = await getUnlockedTitleIds(userId);
    if (!unlocked.includes(next)) {
      return { error: "locked" };
    }
  }

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { title: next },
  });
  if (result.count === 0) {
    return { error: "unauthorized" };
  }

  await unstable_update({ user: { title: next } });

  return { title: next };
}