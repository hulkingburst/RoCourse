import { prisma } from "@/lib/prisma";

export const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const LOGIN_MAX_FAILURES = 5;
export const SIGNUP_MAX_ATTEMPTS = 10;

let lastPruneAt = 0;

/**
 * Trusted client IP. Prefer x-real-ip (set by the edge proxy, so not spoofable
 * by the client), then fall back to the rightmost x-forwarded-for entry, which
 * is the one appended by the nearest trusted proxy. The leftmost entry is
 * client-supplied and must never be trusted for rate limiting.
 */
export function trustedIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}

/** Best-effort client IP from a web Request. */
export function clientIp(request: Request): string {
  return trustedIp(request.headers);
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
