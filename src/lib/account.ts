import { prisma } from "@/lib/prisma";

/** Cooldown between username changes: at most one every 7 days. */
export const NAME_CHANGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_NAME_LENGTH = 40;

export interface UsernameChangeInfo {
  name: string;
  canChange: boolean;
  nextChangeAt: string | null;
}

/** Whether a username change is allowed given the user's last change date. */
export function canChangeUsername(nameChangedAt: Date | null): {
  canChange: boolean;
  nextChangeAt: string | null;
} {
  if (!nameChangedAt) {
    return { canChange: true, nextChangeAt: null };
  }
  const nextAllowed = nameChangedAt.getTime() + NAME_CHANGE_INTERVAL_MS;
  if (Date.now() >= nextAllowed) {
    return { canChange: true, nextChangeAt: null };
  }
  return { canChange: false, nextChangeAt: new Date(nextAllowed).toISOString() };
}

/** Account state for the settings page. Returns null for unknown users. */
export async function getUsernameChangeInfo(
  userId: string
): Promise<UsernameChangeInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, nameChangedAt: true },
  });
  if (!user) return null;
  const { canChange, nextChangeAt } = canChangeUsername(user.nameChangedAt);
  return { name: user.name, canChange, nextChangeAt };
}