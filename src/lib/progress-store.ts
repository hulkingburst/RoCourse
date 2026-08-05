"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
}

interface ProgressState {
  /** hydrated flag: prevents SSR/client mismatch on first render */
  hydrated: boolean;
  lessons: Record<string, LessonRecord>;
  bookmarks: string[];
  recentlyViewed: string[];
  lastLesson: string | null;

  setHydrated: (value: boolean) => void;
  markLessonComplete: (slug: string) => void;
  toggleLessonComplete: (slug: string) => void;
  recordView: (slug: string) => void;
  toggleBookmark: (slug: string) => void;
  recordQuizResult: (slug: string, correct: boolean) => void;
  recordChallengeResult: (slug: string, solved: boolean) => void;
  recordActivityResult: (slug: string, correct: boolean) => void;
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
    }
  );
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      lessons: {},
      bookmarks: [],
      recentlyViewed: [],
      lastLesson: null,

      setHydrated: (value) => set({ hydrated: value }),

      markLessonComplete: (slug) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                completedAt: existing.completedAt ?? new Date().toISOString(),
              },
            },
          };
        }),

      toggleLessonComplete: (slug) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
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
          };
        }),

      toggleBookmark: (slug) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(slug)
            ? state.bookmarks.filter((s) => s !== slug)
            : [...state.bookmarks, slug],
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
          };
        }),

      recordActivityResult: (slug, correct) =>
        set((state) => {
          const existing = ensureRecord(state.lessons, slug);
          return {
            lessons: {
              ...state.lessons,
              [slug]: {
                ...existing,
                activitiesAttempted: existing.activitiesAttempted + 1,
                activitiesSolved: existing.activitiesSolved + (correct ? 1 : 0),
              },
            },
          };
        }),

      resetProgress: () =>
        set({
          lessons: {},
          bookmarks: [],
          recentlyViewed: [],
          lastLesson: null,
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
