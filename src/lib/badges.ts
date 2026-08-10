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
}

export type BadgeTier = "bronze" | "silver" | "gold";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
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
  };
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "first-steps",
    name: "First steps",
    description: "Complete 1 lesson",
    icon: Target,
    tier: "bronze",
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "lesson-10",
    name: "Rising student",
    description: "Complete 10 lessons",
    icon: GraduationCap,
    tier: "bronze",
    earned: (s) => s.lessonsCompleted >= 10,
  },
  {
    id: "lesson-25",
    name: "Dedicated learner",
    description: "Complete 25 lessons",
    icon: BookOpenCheck,
    tier: "silver",
    earned: (s) => s.lessonsCompleted >= 25,
  },
  {
    id: "lesson-50",
    name: "Scholarly",
    description: "Complete 50 lessons",
    icon: Crown,
    tier: "gold",
    earned: (s) => s.lessonsCompleted >= 50,
  },
  {
    id: "course-complete",
    name: "Course champion",
    description: "Complete every lesson in the course",
    icon: Trophy,
    tier: "gold",
    earned: (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons,
  },
  {
    id: "streak-3",
    name: "Getting warm",
    description: "Reach a 3-day streak",
    icon: Flame,
    tier: "bronze",
    earned: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    name: "Weekly rhythm",
    description: "Reach a 7-day streak",
    icon: Flame,
    tier: "silver",
    earned: (s) => s.streak >= 7,
  },
  {
    id: "streak-30",
    name: "Unstoppable",
    description: "Reach a 30-day streak",
    icon: Flame,
    tier: "gold",
    earned: (s) => s.streak >= 30,
  },
  {
    id: "daily-1",
    name: "Daily habit",
    description: "Finish 1 daily challenge",
    icon: CalendarCheck2,
    tier: "bronze",
    earned: (s) => s.dailyChallengesCompleted >= 1,
  },
  {
    id: "daily-10",
    name: "Daily regular",
    description: "Finish 10 daily challenges",
    icon: CalendarCheck2,
    tier: "silver",
    earned: (s) => s.dailyChallengesCompleted >= 10,
  },
  {
    id: "daily-30",
    name: "Daily veteran",
    description: "Finish 30 daily challenges",
    icon: CalendarCheck2,
    tier: "gold",
    earned: (s) => s.dailyChallengesCompleted >= 30,
  },
  {
    id: "quiz-1",
    name: "Quiz rookie",
    description: "Finish 1 quick quiz",
    icon: ListChecks,
    tier: "bronze",
    earned: (s) => s.quickQuizzesCompleted >= 1,
  },
  {
    id: "quiz-10",
    name: "Quiz enthusiast",
    description: "Finish 10 quick quizzes",
    icon: ListChecks,
    tier: "silver",
    earned: (s) => s.quickQuizzesCompleted >= 10,
  },
  {
    id: "quiz-25",
    name: "Quiz master",
    description: "Finish 25 quick quizzes",
    icon: Zap,
    tier: "gold",
    earned: (s) => s.quickQuizzesCompleted >= 25,
  },
  {
    id: "bookmark-5",
    name: "Building a library",
    description: "Bookmark 5 lessons",
    icon: Bookmark,
    tier: "bronze",
    earned: (s) => s.bookmarks >= 5,
  },
  {
    id: "bookmark-15",
    name: "Collector",
    description: "Bookmark 15 lessons",
    icon: Bookmark,
    tier: "silver",
    earned: (s) => s.bookmarks >= 15,
  },
  {
    id: "medal-10",
    name: "Sharp instincts",
    description: "Solve 10 activities on the first try",
    icon: Medal,
    tier: "silver",
    earned: (s) => s.medals >= 10,
  },
  {
    id: "medal-25",
    name: "Medal haul",
    description: "Solve 25 activities on the first try",
    icon: Medal,
    tier: "gold",
    earned: (s) => s.medals >= 25,
  },
  {
    id: "medal-50",
    name: "Flawless",
    description: "Solve 50 activities on the first try",
    icon: Award,
    tier: "gold",
    earned: (s) => s.medals >= 50,
  },
  {
    id: "bug-hunter",
    name: "Bug hunter",
    description: "Solve 5 coding challenges",
    icon: Bug,
    tier: "silver",
    earned: (s) => s.challengesSolved >= 5,
  },
  {
    id: "challenge-20",
    name: "Challenge crusher",
    description: "Solve 20 coding challenges",
    icon: Puzzle,
    tier: "gold",
    earned: (s) => s.challengesSolved >= 20,
  },
  {
    id: "final-project",
    name: "Builder",
    description: "Choose and build your final project",
    icon: Rocket,
    tier: "gold",
    earned: (s) => s.finishedPath != null,
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
