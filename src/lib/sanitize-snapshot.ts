import type { FinishedPath, LessonRecord } from "@/lib/progress-store";
import type { ProgressSnapshot } from "@/lib/sync-types";
import { MAX_LIFETIME_XP, sanitizeWeeklyXp } from "@/lib/xp";

/**
 * Coerces an untrusted progress object (e.g. stored cloud data or a client
 * payload) into a safe snapshot. Fields that are missing, wrong-typed, or out
 * of range fall back to defaults so a malformed record can never crash a page,
 * poison the store, or inflate a public profile. Shared by the client sync
 * engine (`src/lib/sync.ts`) and the server API (`src/lib/sync-api.ts`) so
 * both sides enforce the same bounds.
 */
export function sanitizeSnapshot(
  snapshot: Partial<ProgressSnapshot> | null | undefined
): ProgressSnapshot {
  const rawLessons =
    snapshot?.lessons &&
    typeof snapshot.lessons === "object" &&
    !Array.isArray(snapshot.lessons)
      ? snapshot.lessons
      : {};

  const lessons: Record<string, LessonRecord> = {};
  for (const [slug, record] of Object.entries(rawLessons)) {
    lessons[slug] = sanitizeLessonRecord(record);
  }

  return {
    lessons,
    bookmarks: sanitizeStringArray(snapshot?.bookmarks),
    recentlyViewed: sanitizeStringArray(snapshot?.recentlyViewed),
    lastLesson:
      typeof snapshot?.lastLesson === "string" ? snapshot.lastLesson : null,
    finishedPath: sanitizeFinishedPath(snapshot?.finishedPath),
    quickQuizzesCompleted: sanitizeCount(snapshot?.quickQuizzesCompleted),
    dailyChallengesCompleted: sanitizeCount(snapshot?.dailyChallengesCompleted),
    drillsPlayed: sanitizeCount(snapshot?.drillsPlayed),
    drillHighScore: sanitizeCount(snapshot?.drillHighScore),
    lastDailyChallengeDate: sanitizeDayKey(snapshot?.lastDailyChallengeDate),
    activityDays: sanitizeActivityDays(snapshot?.activityDays),
    streak: sanitizeCount(snapshot?.streak),
    longestStreak: sanitizeCount(snapshot?.longestStreak),
    lastStreakDate: sanitizeDayKey(snapshot?.lastStreakDate),
    xp: Math.min(MAX_LIFETIME_XP, sanitizeCount(snapshot?.xp)),
    weeklyXp: sanitizeWeeklyXp(snapshot?.weeklyXp),
    missedSteps: sanitizeMissedSteps(snapshot?.missedSteps),
    lastUpdated:
      typeof snapshot?.lastUpdated === "string" ? snapshot.lastUpdated : null,
  };
}

function sanitizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function sanitizeDayKey(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

/** Bounds a day-keyed activity map: valid keys, non-negative ints, newest 400. */
function sanitizeActivityDays(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries: [string, number][] = [];
  for (const [key, count] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
    entries.push([key, Math.floor(count)]);
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return Object.fromEntries(entries.slice(-400));
}

function sanitizeLessonRecord(record: unknown): LessonRecord {
  const raw =
    record && typeof record === "object"
      ? (record as Record<string, unknown>)
      : {};
  const num = (value: unknown, fallback = 0): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : fallback;
  const strOrNull = (value: unknown): string | null =>
    typeof value === "string" ? value : null;

  return {
    completedAt: strOrNull(raw.completedAt),
    lastVisitedAt:
      typeof raw.lastVisitedAt === "string"
        ? raw.lastVisitedAt
        : new Date(0).toISOString(),
    quizCorrect: num(raw.quizCorrect),
    quizAttempted: num(raw.quizAttempted),
    challengesSolved: num(raw.challengesSolved),
    challengesAttempted: num(raw.challengesAttempted),
    activitiesSolved: num(raw.activitiesSolved),
    activitiesAttempted: num(raw.activitiesAttempted),
    firstTrySolvedSteps: sanitizeStringArray(raw.firstTrySolvedSteps),
  };
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeFinishedPath(value: unknown): FinishedPath | null {
  return value === "tycoon" || value === "collector" ? value : null;
}

const MAX_MISSED_STEPS_PER_LESSON = 50;
const MAX_LESSONS_WITH_MISSES = 200;

/**
 * Coerces the review ledger: valid step indices (non-negative ints), deduped,
 * sorted, and capped per lesson and in total so it can never grow unbounded.
 */
function sanitizeMissedSteps(
  value: unknown
): Record<string, number[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number[]> = {};
  const slugs = Object.keys(value)
    .filter((slug) => typeof slug === "string" && slug.length > 0 && slug.length <= 200)
    .slice(0, MAX_LESSONS_WITH_MISSES);
  for (const slug of slugs) {
    const raw = (value as Record<string, unknown>)[slug];
    if (!Array.isArray(raw)) continue;
    const steps = new Set<number>();
    for (const step of raw) {
      if (
        typeof step === "number" &&
        Number.isFinite(step) &&
        step >= 0 &&
        step < MAX_MISSED_STEPS_PER_LESSON
      ) {
        steps.add(Math.floor(step));
      }
    }
    const sorted = [...steps].sort((a, b) => a - b);
    if (sorted.length > 0) out[slug] = sorted;
  }
  return out;
}
