"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { dayKey, recordActivity } from "@/lib/streak";
import type { ProgressSnapshot } from "@/lib/sync-types";

/**
 * Per-lesson progress record.
 *
 * This store is the single source of truth for learner progress. It currently
 * persists to localStorage. When accounts land, swap the persistence layer for
 * a server-backed one (the shape of `lessons`, `bookmarks`, and `recentlyViewed`
 * is deliberately kept server-friendly so a future API can serialize it as-is).
 */
export interface LessonRecord {
  completedAt: string | null;
  lastVisitedAt: string;
  quizCorrect: number;
  quizAttempted: number;
  challengesSolved: number;
  challengesAttempted: number;
  activitiesSolved: number;
  activitiesAttempted: number;
  /** Step indices whose question was solved on the first pick (medal basis). */
  firstTrySolvedSteps: string[];
}

/** Which final-project game the learner chose to build as their capstone. */
export type FinishedPath = "tycoon" | "collector";

export const FINISHED_PATHS: FinishedPath[] = ["tycoon", "collector"];

const nowIso = () => new Date().toISOString();

interface ProgressState {
  /** hydrated flag: prevents SSR/client mismatch on first render */
  hydrated: boolean;
  lessons: Record<string, LessonRecord>;
  bookmarks: string[];
  recentlyViewed: string[];
  lastLesson: string | null;
  /** The learner's chosen final-project path, null until they pick one. */
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
  /**
   * ISO timestamp of the last local mutation. Drives cloud conflict
   * resolution: whichever side (device or cloud) is newest wins.
   */
  lastUpdated: string | null;
  streak: number;
  longestStreak: number;
  lastStreakDate: string | null;

  setHydrated: (value: boolean) => void;
  recordQuickQuizCompleted: () => void;
  recordDailyChallengeCompleted: () => void;
  /** Records a finished drill with its correct-answer count. */
  recordDrillCompleted: (correct: number) => void;
  markLessonComplete: (slug: string) => void;
  toggleLessonComplete: (slug: string) => void;
  recordView: (slug: string) => void;
  toggleBookmark: (slug: string) => void;
  recordQuizResult: (slug: string, correct: boolean) => void;
  recordChallengeResult: (slug: string, solved: boolean) => void;
  recordActivityResult: (
    slug: string,
    correct: boolean,
    firstTryStep?: string | null
  ) => void;
  setFinishedPath: (path: FinishedPath | null) => void;
  restoreProgress: (snapshot: ProgressSnapshot) => void;
  resetProgress: () => void;
}

function ensureRecord(lessons: ProgressState["lessons"], slug: string): LessonRecord {
  return (
    lessons[slug] ?? {
      completedAt: null,
      lastVisitedAt: new Date().toISOString(),
      quizCorrect: 0,
      quizAttempted: 0,
      challengesSolved: 0,
      challengesAttempted: 0,
      activitiesSolved: 0,
      activitiesAttempted: 0,
      firstTrySolvedSteps: [],
    }
  );
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      hydrated: false,
      lessons: {},
      bookmarks: [],
      recentlyViewed: [],
      lastLesson: null,
      finishedPath: null,
      quickQuizzesCompleted: 0,
      dailyChallengesCompleted: 0,
      drillsPlayed: 0,
      drillHighScore: 0,
      lastDailyChallengeDate: null,
      activityDays: {},
      lastUpdated: null,
      streak: 0,
      longestStreak: 0,
      lastStreakDate: null,

      setHydrated: (value) => set({ hydrated: value }),

      recordQuickQuizCompleted: () =>
        set((state) => ({
          quickQuizzesCompleted: state.quickQuizzesCompleted + 1,
          ...recordActivity(state),
          lastUpdated: nowIso(),
        })),

      recordDailyChallengeCompleted: () =>
        set((state) => {
          const today = dayKey(new Date());
          if (state.lastDailyChallengeDate === today) return state;
          return {
            dailyChallengesCompleted: state.dailyChallengesCompleted + 1,
            lastDailyChallengeDate: today,
            ...recordActivity(state),
            lastUpdated: nowIso(),
          };
        }),

      recordDrillCompleted: (correct) =>
        set((state) => ({
          drillsPlayed: state.drillsPlayed + 1,
          drillHighScore: Math.max(state.drillHighScore, correct),
          ...recordActivity(state),
          lastUpdated: nowIso(),
        })),

      markLessonComplete: (slug) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          const completing = existing.completedAt == null;
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                completedAt: existing.completedAt ?? new Date().toISOString(),
              },
            },
            ...(completing ? recordActivity(state) : {}),
            lastUpdated: nowIso(),
          };
        }),

      toggleLessonComplete: (slug) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          const completing = existing.completedAt == null;
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                completedAt: existing.completedAt
                  ? null
                  : new Date().toISOString(),
              },
            },
            ...(completing ? recordActivity(state) : {}),
            lastUpdated: nowIso(),
          };
        }),

      recordView: (slug) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          return {
            lessons: {
              ...state.lessons,
              [slug]: { ...existing, lastVisitedAt: new Date().toISOString() },
            },
            recentlyViewed: [
              slug,
              ...state.recentlyViewed.filter((s) => s !== slug),
            ].slice(0, 20),
            lastLesson: slug,
            lastUpdated: nowIso(),
          };
        }),

      toggleBookmark: (slug) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(slug)
            ? state.bookmarks.filter((s) => s !== slug)
            : [...state.bookmarks, slug],
          lastUpdated: nowIso(),
        })),

      recordQuizResult: (slug, correct) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                quizAttempted: existing.quizAttempted + 1,
                quizCorrect: existing.quizCorrect + (correct ? 1 : 0),
              },
            },
            lastUpdated: nowIso(),
          };
        }),

      recordChallengeResult: (slug, solved) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                challengesAttempted: existing.challengesAttempted + 1,
                challengesSolved: existing.challengesSolved + (solved ? 1 : 0),
              },
            },
            lastUpdated: nowIso(),
          };
        }),

      recordActivityResult: (slug, correct, firstTryStep) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          const solvedSteps = existing.firstTrySolvedSteps ?? [];
          const firstTrySolvedSteps =
            correct && firstTryStep && !solvedSteps.includes(firstTryStep)
              ? [...solvedSteps, firstTryStep]
              : solvedSteps;
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                activitiesAttempted: existing.activitiesAttempted + 1,
                activitiesSolved: existing.activitiesSolved + (correct ? 1 : 0),
                firstTrySolvedSteps,
              },
            },
            lastUpdated: nowIso(),
          };
        }),

      setFinishedPath: (finishedPath) => set({ finishedPath, lastUpdated: nowIso() }),

      restoreProgress: (snapshot) =>
        set((state) => ({
          ...snapshot,
          quickQuizzesCompleted: snapshot.quickQuizzesCompleted ?? state.quickQuizzesCompleted,
          dailyChallengesCompleted:
            snapshot.dailyChallengesCompleted ?? state.dailyChallengesCompleted,
          drillsPlayed: snapshot.drillsPlayed ?? state.drillsPlayed,
          drillHighScore: snapshot.drillHighScore ?? state.drillHighScore,
          lastDailyChallengeDate:
            snapshot.lastDailyChallengeDate ?? state.lastDailyChallengeDate,
          activityDays: snapshot.activityDays ?? state.activityDays,
          streak: snapshot.streak ?? state.streak,
          longestStreak: snapshot.longestStreak ?? state.longestStreak,
          lastStreakDate: snapshot.lastStreakDate ?? state.lastStreakDate,
        })),

      resetProgress: () =>
        set({
          lessons: {},
          bookmarks: [],
          recentlyViewed: [],
          lastLesson: null,
          finishedPath: null,
          quickQuizzesCompleted: 0,
          dailyChallengesCompleted: 0,
          drillsPlayed: 0,
          drillHighScore: 0,
          lastDailyChallengeDate: null,
          activityDays: {},
          lastUpdated: null,
          streak: 0,
          longestStreak: 0,
          lastStreakDate: null,
        }),
    }),
    {
      name: "luau-learn:progress:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lessons: state.lessons,
        bookmarks: state.bookmarks,
        recentlyViewed: state.recentlyViewed,
        lastLesson: state.lastLesson,
        finishedPath: state.finishedPath,
        quickQuizzesCompleted: state.quickQuizzesCompleted,
        dailyChallengesCompleted: state.dailyChallengesCompleted,
        drillsPlayed: state.drillsPlayed,
        drillHighScore: state.drillHighScore,
        lastDailyChallengeDate: state.lastDailyChallengeDate,
        activityDays: state.activityDays,
        lastUpdated: state.lastUpdated,
        streak: state.streak,
        longestStreak: state.longestStreak,
        lastStreakDate: state.lastStreakDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export function isLessonComplete(
  lessons: Record<string, LessonRecord>,
  slug: string
): boolean {
  return lessons[slug]?.completedAt != null;
}

/**
 * A lesson is locked unless it is the first lesson in the course or the
 * previous lesson in reading order has been completed.
 */
export function isLessonLocked(
  lessons: Record<string, LessonRecord>,
  orderedLessons: { slug: string }[],
  index: number
): boolean {
  if (index <= 0) return false;
  const prev = orderedLessons[index - 1];
  if (!prev) return false;
  return !isLessonComplete(lessons, prev.slug);
}

export function isBookmarked(bookmarks: string[], slug: string): boolean {
  return bookmarks.includes(slug);
}
