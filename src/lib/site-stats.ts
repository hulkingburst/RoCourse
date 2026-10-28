import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface SiteStats {
  /** Total completed lessons across every synced learner. */
  lessonsCompleted: number;
  /** Lifetime XP of synced learners plus all XP guests earned via the leaderboard. */
  xpEarned: number;
  /** Total registered accounts. */
  learners: number;
  /**
   * True when the aggregate could not be read (the database is over quota or
   * otherwise unreachable). The counters are then placeholders, and the page
   * says they are disabled rather than presenting three zeros as real numbers.
   */
  unavailable: boolean;
}

interface ProfileTotalsRow {
  lessonsCompleted: bigint | number;
  profileXp: bigint | number;
}

/**
 * How long the landing-page counters may be stale.
 *
 * These are decoration, not a live dashboard, and the aggregate behind them has
 * to walk every stored progress blob — it is the single most expensive read on
 * the site. Recomputing it once per home page request (including every crawler)
 * was the app's largest avoidable database cost, so the result is cached for
 * ten minutes instead. A number that is a few minutes old is worth it.
 */
const STATS_REVALIDATE_SECONDS = 600;

/**
 * Site-wide activity counters shown on the home page. Lesson completions and
 * lifetime XP only live inside each learner's `ProgressProfile.data` JSON blob,
 * so that aggregate runs in Postgres with jsonb operators rather than pulling
 * every (potentially large) blob into the app. Guests never sync a profile, so
 * their contribution is their leaderboard XP.
 */
async function loadSiteStats(): Promise<SiteStats> {
  const [profileTotals, guestXp, learners] = await Promise.all([
    prisma.$queryRaw<ProfileTotalsRow[]>`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN jsonb_typeof(p.data -> 'lessons') = 'object' THEN (
              SELECT COUNT(*)::bigint
              FROM jsonb_each(p.data -> 'lessons') AS lesson(key, value)
              WHERE lesson.value ->> 'completedAt' IS NOT NULL
            )
            ELSE 0
          END
        ), 0)::bigint AS "lessonsCompleted",
        COALESCE(SUM(
          CASE
            WHEN jsonb_typeof(p.data -> 'xp') = 'number' THEN (p.data ->> 'xp')::numeric
            ELSE 0
          END
        ), 0)::bigint AS "profileXp"
      FROM "ProgressProfile" p
    `,
    prisma.weeklyXp.aggregate({
      where: { userId: null },
      _sum: { xp: true },
    }),
    prisma.user.count(),
  ]);

  const totals = profileTotals[0];

  return {
    lessonsCompleted: Number(totals?.lessonsCompleted ?? 0),
    xpEarned: Number(totals?.profileXp ?? 0) + (guestXp._sum.xp ?? 0),
    learners,
    unavailable: false,
  };
}

/**
 * The cached read. The public wrapper keeps its catch outside the cache: a
 * failed read throws out of here (so nothing broken is stored) and the page
 * still renders, with the counters marked disabled, which is what keeps the
 * landing page up when the database is unreachable.
 */
const cachedSiteStats = unstable_cache(loadSiteStats, ["site-stats"], {
  revalidate: STATS_REVALIDATE_SECONDS,
});

export async function getSiteStats(): Promise<SiteStats> {
  try {
    return await cachedSiteStats();
  } catch (error) {
    // Decorative landing-page counters should never take the page down.
    console.error("Failed to load site stats", error);
    return { lessonsCompleted: 0, xpEarned: 0, learners: 0, unavailable: true };
  }
}
