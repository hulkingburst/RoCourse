import { prisma } from "@/lib/prisma";

export const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const LOGIN_MAX_FAILURES = 5;
export const SIGNUP_MAX_ATTEMPTS = 10;

let lastPruneAt = 0;

/** Best-effort client IP from the web request (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** True when the key has already reached its attempt cap within the window. */
export async function isRateLimited(key: string, max: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - AUTH_WINDOW_MS);
  const recent = await prisma.authAttempt.count({
    where: { key, createdAt: { gte: cutoff } },
  });
  return recent >= max;
}

export async function recordAttempt(key: string): Promise<void> {
  await prisma.authAttempt.create({ data: { key } });
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.authAttempt.deleteMany({ where: { key } });
}

/**
 * Sweeps expired rows so the attempts table can't grow without bound. Throttled
 * to run at most once per process per interval.
 */
export async function pruneAttempts(): Promise<void> {
  const now = Date.now();
  if (now - lastPruneAt < AUTH_WINDOW_MS) return;
  lastPruneAt = now;
  await prisma.authAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now - AUTH_WINDOW_MS) } },
  });
}
