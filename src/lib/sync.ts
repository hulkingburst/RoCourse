"use client";

import type { FinishedPath, LessonRecord } from "@/lib/progress-store";
import { useProgressStore } from "@/lib/progress-store";
import { CONFLICT_TOLERANCE_MS } from "@/lib/sync-types";
import type {
  CloudState,
  CompletionRecord,
  ProgressSnapshot,
} from "@/lib/sync-types";

/** Reads the current serializable progress snapshot off the store. */
export function getSnapshot(): ProgressSnapshot {
  const state = useProgressStore.getState();
  return {
    lessons: state.lessons,
    bookmarks: state.bookmarks,
    recentlyViewed: state.recentlyViewed,
    lastLesson: state.lastLesson,
    finishedPath: state.finishedPath,
    quickQuizzesCompleted: state.quickQuizzesCompleted,
    dailyChallengesCompleted: state.dailyChallengesCompleted,
    activityDays: state.activityDays,
    streak: state.streak,
    longestStreak: state.longestStreak,
    lastStreakDate: state.lastStreakDate,
    lastUpdated: state.lastUpdated,
  };
}

export function hasAnyProgress(snapshot: ProgressSnapshot): boolean {
  return (
    snapshot.lastUpdated != null ||
    Object.keys(snapshot.lessons).length > 0 ||
    snapshot.bookmarks.length > 0 ||
    snapshot.recentlyViewed.length > 0 ||
    snapshot.lastLesson != null ||
    snapshot.finishedPath != null ||
    snapshot.quickQuizzesCompleted > 0 ||
    snapshot.dailyChallengesCompleted > 0 ||
    Object.keys(snapshot.activityDays).length > 0 ||
    snapshot.streak > 0
  );
}

/**
 * Derives the courses a learner has finished from their progress. Today that
 * is the single capstone lesson, named by the chosen project path. This is the
 * seam where future courses (clicker, tycoon, collector, obby, zombie survival)
 * plug in.
 */
export function getCompletions(snapshot: ProgressSnapshot): CompletionRecord[] {
  const record = snapshot.lessons["final-project"];
  if (!record?.completedAt) return [];

  const base = { completedAt: record.completedAt };
  if (snapshot.finishedPath === "tycoon") {
    return [{ courseId: "rocourse-coin-tycoon", title: "Coin Tycoon", ...base }];
  }
  if (snapshot.finishedPath === "collector") {
    return [{ courseId: "rocourse-collector", title: "The Collector", ...base }];
  }
  return [{ courseId: "rocourse", title: "RoCourse", ...base }];
}

export function applySnapshot(
  snapshot: ProgressSnapshot,
  lastUpdated?: string | null
): void {
  const clean = sanitizeSnapshot(snapshot);
  useProgressStore.setState({
    lessons: clean.lessons,
    bookmarks: clean.bookmarks,
    recentlyViewed: clean.recentlyViewed,
    lastLesson: clean.lastLesson,
    finishedPath: clean.finishedPath,
    quickQuizzesCompleted: clean.quickQuizzesCompleted,
    dailyChallengesCompleted: clean.dailyChallengesCompleted,
    activityDays: clean.activityDays,
    streak: clean.streak,
    longestStreak: clean.longestStreak,
    lastStreakDate: clean.lastStreakDate,
    lastUpdated: lastUpdated ?? clean.lastUpdated,
  });
}

/**
 * Coerces an untrusted progress object (e.g. stored cloud data) into a safe
 * snapshot. Fields that are missing, wrong-typed, or out of range fall back to
 * defaults so a malformed record can never crash a page or poison the store.
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
    activityDays: sanitizeActivityDays(snapshot?.activityDays),
    streak: sanitizeCount(snapshot?.streak),
    longestStreak: sanitizeCount(snapshot?.longestStreak),
    lastStreakDate: sanitizeDayKey(snapshot?.lastStreakDate),
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

export async function pullCloud(): Promise<CloudState | null> {
  try {
    const response = await fetch("/api/sync", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as CloudState;
  } catch {
    return null;
  }
}

export type PushResult =
  | { status: "ok"; cloud: CloudState }
  | { status: "conflict"; cloud: CloudState }
  | { status: "error" };

export async function pushCloud(
  snapshot: ProgressSnapshot,
  completions: CompletionRecord[],
  force = false
): Promise<PushResult> {
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: snapshot,
        lastUpdated: snapshot.lastUpdated,
        completions,
        force,
      }),
      cache: "no-store",
    });

    if (response.status === 409) {
      const body = (await response.json()) as { cloud: CloudState };
      return { status: "conflict", cloud: body.cloud };
    }
    if (!response.ok) return { status: "error" };
    const body = (await response.json()) as { cloud: CloudState };
    return { status: "ok", cloud: body.cloud };
  } catch {
    return { status: "error" };
  }
}

/** Waits for the progress store to finish rehydrating from localStorage. */
export function waitForHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useProgressStore.getState().hydrated) {
      resolve();
      return;
    }
    const check = () => {
      if (useProgressStore.getState().hydrated) {
        unsubscribe();
        resolve();
      }
    };
    const unsubscribe = useProgressStore.subscribe(check);
    // Safety net in case hydration never fires (e.g. storage blocked).
    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 1000);
  });
}

/** True when the cloud side is clearly newer than the local snapshot. */
export function cloudIsNewer(cloud: CloudState, local: ProgressSnapshot): boolean {
  const localTime = local.lastUpdated ? Date.parse(local.lastUpdated) : 0;
  const cloudTime = cloud.lastUpdated ? Date.parse(cloud.lastUpdated) : 0;
  return cloudTime > localTime + CONFLICT_TOLERANCE_MS;
}

/** True when the local snapshot is clearly newer than the cloud side. */
export function localIsNewer(cloud: CloudState, local: ProgressSnapshot): boolean {
  const localTime = local.lastUpdated ? Date.parse(local.lastUpdated) : 0;
  const cloudTime = cloud.lastUpdated ? Date.parse(cloud.lastUpdated) : 0;
  return localTime > cloudTime + CONFLICT_TOLERANCE_MS;
}

/**
 * Merges two snapshots when both sides have progress. The newer (cloud) side
 * is authoritative for counters and timestamps — every prior local change was
 * already pushed into it — while anything present only on the local side
 * (lessons, bookmarks, recently viewed, activity days) is kept so no progress
 * is lost. Replaces the old "pick local or cloud" prompt.
 */
export function mergeSnapshots(
  cloud: ProgressSnapshot,
  local: ProgressSnapshot
): ProgressSnapshot {
  return {
    lessons: { ...local.lessons, ...cloud.lessons },
    bookmarks: unionStrings(cloud.bookmarks, local.bookmarks),
    recentlyViewed: unionStrings(cloud.recentlyViewed, local.recentlyViewed).slice(0, 10),
    lastLesson: cloud.lastLesson ?? local.lastLesson,
    finishedPath: cloud.finishedPath ?? local.finishedPath,
    quickQuizzesCompleted: cloud.quickQuizzesCompleted,
    dailyChallengesCompleted: cloud.dailyChallengesCompleted,
    activityDays: { ...local.activityDays, ...cloud.activityDays },
    streak: cloud.streak,
    longestStreak: cloud.longestStreak,
    lastStreakDate: cloud.lastStreakDate,
    lastUpdated: cloud.lastUpdated,
  };
}

function unionStrings(...arrays: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const array of arrays) {
    for (const item of array) {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

/**
 * Best-effort push of the current local state. Used before sign-out so the
 * cloud stays up to date with the device's latest progress.
 */
export async function flushSync(): Promise<PushResult | null> {
  const snapshot = getSnapshot();
  if (!hasAnyProgress(snapshot)) return null;
  return pushCloud(snapshot, getCompletions(snapshot));
}
