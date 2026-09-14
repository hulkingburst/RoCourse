"use server";

import { auth, unstable_update } from "@/lib/auth";
import { MAX_NAME_LENGTH, NAME_CHANGE_INTERVAL_MS } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { containsBadWord } from "@/lib/profanity";

export interface ChangeUsernameResult {
  /** i18n key suffix under the `settings` namespace when the change fails. */
  error?:
    | "unauthorized"
    | "required"
    | "tooLong"
    | "badWord"
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
  if (containsBadWord(name)) {
    return { error: "badWord" };
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