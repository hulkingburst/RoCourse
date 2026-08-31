import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bookmark,
  BookOpenCheck,
  Bug,
  CalendarCheck2,
  Crown,
  Flame,
  GraduationCap,
  ListChecks,
  Medal,
  Puzzle,
  Rocket,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export interface BadgeStats {
  lessonsCompleted: number;
  totalLessons: number;
  streak: number;
  longestStreak: number;
  dailyChallengesCompleted: number;
  quickQuizzesCompleted: number;
  bookmarks: number;
  finishedPath: string | null;
  /** Step indices solved on the first pick across all lessons. */
  medals: number;
  challengesSolved: number;
  /** Completed weekly leaderboards this user finished at #1 (server-sourced). */
  weeklyFirsts: number;
}

export type BadgeTier = "bronze" | "silver" | "gold";

export interface BadgeDefinition {
  id: string;
  icon: LucideIcon;
  tier: BadgeTier;
  earned: (stats: BadgeStats) => boolean;
}

/** Builds badge stats from either the zustand progress store state or the
 * cloud-synced JSON blob (ProgressProfile.data) — both share the same shape. */
export function extractBadgeStats(data: unknown, totalLessons: number): BadgeStats {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return emptyBadgeStats(totalLessons);
  }
  const d = data as Record<string, unknown>;
  const lessons =
    d.lessons && typeof d.lessons === "object" && !Array.isArray(d.lessons)
      ? (d.lessons as Record<string, Record<string, unknown>>)
      : {};

  let lessonsCompleted = 0;
  let medals = 0;
  let challengesSolved = 0;
  for (const record of Object.values(lessons)) {
    if (!record || typeof record !== "object") continue;
    if (record.completedAt != null) lessonsCompleted += 1;
    medals += Array.isArray(record.firstTrySolvedSteps)
      ? record.firstTrySolvedSteps.length
      : 0;
    challengesSolved +=
      typeof record.challengesSolved === "number" ? record.challengesSolved : 0;
  }

  const num = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

  return {
    lessonsCompleted,
    totalLessons,
    streak: num(d.streak),
    longestStreak: num(d.longestStreak),
    dailyChallengesCompleted: num(d.dailyChallengesCompleted),
    quickQuizzesCompleted: num(d.quickQuizzesCompleted),
    bookmarks: Array.isArray(d.bookmarks) ? d.bookmarks.length : 0,
    finishedPath: typeof d.finishedPath === "string" ? d.finishedPath : null,
    medals,
    challengesSolved,
    // Server-side only; the progress blob has no view of global weekly rank.
    // Callers with DB access override this with the real count.
    weeklyFirsts: 0,
  };
}

export function emptyBadgeStats(totalLessons: number): BadgeStats {
  return {
    lessonsCompleted: 0,
    totalLessons,
    streak: 0,
    longestStreak: 0,
    dailyChallengesCompleted: 0,
    quickQuizzesCompleted: 0,
    bookmarks: 0,
    finishedPath: null,
    medals: 0,
    challengesSolved: 0,
    weeklyFirsts: 0,
  };
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-steps",
    icon: Target,
    tier: "bronze",
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "lesson-10",
    icon: GraduationCap,
    tier: "bronze",
    earned: (s) => s.lessonsCompleted >= 10,
  },
  {
    id: "lesson-25",
    icon: BookOpenCheck,
    tier: "silver",
    earned: (s) => s.lessonsCompleted >= 25,
  },
  {
    id: "lesson-50",
    icon: Crown,
    tier: "gold",
    earned: (s) => s.lessonsCompleted >= 50,
  },
  {
    id: "course-complete",
    icon: Trophy,
    tier: "gold",
    earned: (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons,
  },
  {
    id: "streak-3",
    icon: Flame,
    tier: "bronze",
    earned: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    icon: Flame,
    tier: "silver",
    earned: (s) => s.streak >= 7,
  },
  {
    id: "streak-30",
    icon: Flame,
    tier: "gold",
    earned: (s) => s.streak >= 30,
  },
  {
    id: "daily-1",
    icon: CalendarCheck2,
    tier: "bronze",
    earned: (s) => s.dailyChallengesCompleted >= 1,
  },
  {
    id: "daily-10",
    icon: CalendarCheck2,
    tier: "silver",
    earned: (s) => s.dailyChallengesCompleted >= 10,
  },
  {
    id: "daily-30",
    icon: CalendarCheck2,
    tier: "gold",
    earned: (s) => s.dailyChallengesCompleted >= 30,
  },
  {
    id: "quiz-1",
    icon: ListChecks,
    tier: "bronze",
    earned: (s) => s.quickQuizzesCompleted >= 1,
  },
  {
    id: "quiz-10",
    icon: ListChecks,
    tier: "silver",
    earned: (s) => s.quickQuizzesCompleted >= 10,
  },
  {
    id: "quiz-25",
    icon: Zap,
    tier: "gold",
    earned: (s) => s.quickQuizzesCompleted >= 25,
  },
  {
    id: "bookmark-5",
    icon: Bookmark,
    tier: "bronze",
    earned: (s) => s.bookmarks >= 5,
  },
  {
    id: "bookmark-15",
    icon: Bookmark,
    tier: "silver",
    earned: (s) => s.bookmarks >= 15,
  },
  {
    id: "medal-10",
    icon: Medal,
    tier: "silver",
    earned: (s) => s.medals >= 10,
  },
  {
    id: "medal-25",
    icon: Medal,
    tier: "gold",
    earned: (s) => s.medals >= 25,
  },
  {
    id: "medal-50",
    icon: Award,
    tier: "gold",
    earned: (s) => s.medals >= 50,
  },
  {
    id: "bug-hunter",
    icon: Bug,
    tier: "silver",
    earned: (s) => s.challengesSolved >= 5,
  },
  {
    id: "challenge-20",
    icon: Puzzle,
    tier: "gold",
    earned: (s) => s.challengesSolved >= 20,
  },
  {
    id: "final-project",
    icon: Rocket,
    tier: "gold",
    earned: (s) => s.finishedPath != null,
  },
  {
    id: "weekly-top-1",
    icon: Crown,
    tier: "gold",
    earned: (s) => s.weeklyFirsts >= 1,
  },
];

export const BADGE_TIER_STYLES: Record<
  BadgeTier,
  { icon: string; ring: string }
> = {
  bronze: {
    icon: "text-amber-700 dark:text-amber-500",
    ring: "ring-amber-500/40 bg-amber-500/10",
  },
  silver: {
    icon: "text-slate-500 dark:text-slate-300",
    ring: "ring-slate-400/40 bg-slate-400/10",
  },
  gold: {
    icon: "text-yellow-600 dark:text-yellow-400",
    ring: "ring-yellow-500/50 bg-yellow-400/10",
  },
};
