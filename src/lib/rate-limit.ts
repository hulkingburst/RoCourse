import { prisma } from "@/lib/prisma";

// The longest sliding window any caller uses. Rows beyond this are never
// needed again, so pruning at this boundary keeps the table bounded.
const PRUNE_WINDOW_MS = 24 * 60 * 60 * 1000;

let lastPruneAt = 0;

/**
 * True when `key` has already made `max` recorded attempts within the window.
 * Stored in the DB so limits are shared across instances and survive restarts.
 *
 * Note: the count-then-record pair (with `recordRateLimit`) has a small TOCTOU
 * gap under heavy concurrency — two near-simultaneous requests can both read
 * below the cap and both record. This is accepted: the limit is a generous
 * abuse guard, not an exact accounting mechanism, so the worst case is one or
 * two extra rows in the window, never unbounded growth.
 */
export async function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMs);
  const recent = await prisma.rateLimitEvent.count({
    where: { key, createdAt: { gte: cutoff } },
  });
  return recent >= max;
}

/** Records one attempt for `key`. */
export async function recordRateLimit(key: string): Promise<void> {
  await prisma.rateLimitEvent.create({ data: { key } });
}

/**
 * Sweeps rows past the longest window so the table can't grow without bound.
 * Throttled to run at most once per process per hour. On multi-instance
 * deployments each process may sweep independently, but `deleteMany` is
 * idempotent, so overlapping sweeps are harmless — at worst the table briefly
 * holds one extra window of rows.
 */
export async function pruneRateLimits(): Promise<void> {
  const now = Date.now();
  if (now - lastPruneAt < 60 * 60 * 1000) return;
  lastPruneAt = now;
  await prisma.rateLimitEvent.deleteMany({
    where: { createdAt: { lt: new Date(now - PRUNE_WINDOW_MS) } },
  });
}
