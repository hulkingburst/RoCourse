import { prisma } from "@/lib/prisma";

export interface SiteStats {
  /** Total completed lessons across every synced learner. */
  lessonsCompleted: number;
  /** Lifetime XP of synced learners plus all XP guests earned via the leaderboard. */
  xpEarned: number;
  /** Total registered accounts. */
  learners: number;
}

interface ProfileTotalsRow {
  lessonsCompleted: bigint | number;
  profileXp: bigint | number;
}

/**
 * Site-wide activity counters shown on the home page. Lesson completions and
 * lifetime XP only live inside each learner's `ProgressProfile.data` JSON blob,
 * so that aggregate runs in Postgres with jsonb operators rather than pulling
 * every (potentially large) blob into the app. Guests never sync a profile, so
 * their contribution is their leaderboard XP.
 */
export async function getSiteStats(): Promise<SiteStats> {
  try {
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
    };
  } catch (error) {
    // Decorative landing-page counters should never take the page down.
    console.error("Failed to load site stats", error);
    return { lessonsCompleted: 0, xpEarned: 0, learners: 0 };
  }
}
