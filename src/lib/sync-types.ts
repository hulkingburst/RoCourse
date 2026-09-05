import type { FinishedPath, LessonRecord } from "@/lib/progress-store";

/**
 * The serializable slice of the progress store that gets synced to the cloud.
 * Shape is shared between the client sync engine and the server API.
 */
export interface ProgressSnapshot {
  lessons: Record<string, LessonRecord>;
  bookmarks: string[];
  recentlyViewed: string[];
  lastLesson: string | null;
  finishedPath: FinishedPath | null;
  /** Lifetime count of completed quick quizzes. */
  quickQuizzesCompleted: number;
  /** Lifetime count of completed daily challenges. */
  dailyChallengesCompleted: number;
  /** Lifetime count of finished 60-second drills. */
  drillsPlayed: number;
  /** Best number of correct answers in a single 60-second drill. */
  drillHighScore: number;
  /** Local day (YYYY-MM-DD) of the most recently completed daily challenge. */
  lastDailyChallengeDate: string | null;
  /** Local day (YYYY-MM-DD) → qualifying-action count (activity calendar). */
  activityDays: Record<string, number>;
  /** Current consecutive-day learning streak. */
  streak: number;
  /** Longest streak ever recorded. */
  longestStreak: number;
  /** Local calendar day (YYYY-MM-DD) of the last streak-building action. */
  lastStreakDate: string | null;
  /** Lifetime total XP, source of the learner's level. */
  xp: number;
  /** Local Monday-week key (YYYY-MM-DD) → XP gained that week. */
  weeklyXp: Record<string, number>;
  /**
   * Lesson slug → step indices (within that lesson's `<Step>` list) answered
   * incorrectly at least once and not yet solved again. The review surface
   * re-renders exactly those steps so nothing else needs to be duplicated.
   */
  missedSteps: Record<string, number[]>;
  lastUpdated: string | null;
}

export interface CompletionRecord {
  courseId: string;
  title: string;
  completedAt: string;
}

export interface SyncPayload {
  progress: ProgressSnapshot;
  lastUpdated: string | null;
  completions: CompletionRecord[];
  /** When true (user explicitly chose), skip the newer-cloud conflict check. */
  force?: boolean;
}

export interface CloudState {
  hasProgress: boolean;
  progress: ProgressSnapshot | null;
  lastUpdated: string | null;
  completions: CompletionRecord[];
  /** Weekly leaderboards this user has finished at #1 (server-sourced). */
  weeklyFirsts: number;
  account?: { name: string; email: string; createdAt: string } | null;
}

/** Cloud is considered "newer" only when it exceeds this tolerance in ms. */
export const CONFLICT_TOLERANCE_MS = 5000;

/**
 * Version of the exported progress file. Bump only when the export shape
 * changes in a way a future importer must branch on.
 */
export const PROGRESS_SCHEMA_VERSION = 1;

/**
 * The learner-owned progress file produced by the "Download my progress"
 * action. Deliberately a superset of the synced snapshot plus a version and
 * export timestamp — and nothing else: no email, handle, password, or private
 * account data ever reaches it.
 */
export interface ProgressExport {
  schemaVersion: number;
  exportedAt: string;
  progress: ProgressSnapshot;
  completions: CompletionRecord[];
}
