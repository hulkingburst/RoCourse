"use client";

import { useProgressStore } from "@/lib/progress-store";
import { sanitizeSnapshot } from "@/lib/sanitize-snapshot";
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
    drillsPlayed: state.drillsPlayed,
    drillHighScore: state.drillHighScore,
    lastDailyChallengeDate: state.lastDailyChallengeDate,
    activityDays: state.activityDays,
    streak: state.streak,
    longestStreak: state.longestStreak,
    lastStreakDate: state.lastStreakDate,
    xp: state.xp,
    weeklyXp: state.weeklyXp,
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
    snapshot.drillsPlayed > 0 ||
    snapshot.drillHighScore > 0 ||
    Object.keys(snapshot.activityDays).length > 0 ||
    snapshot.streak > 0 ||
    snapshot.xp > 0
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
    drillsPlayed: clean.drillsPlayed,
    drillHighScore: clean.drillHighScore,
    lastDailyChallengeDate: clean.lastDailyChallengeDate,
    activityDays: clean.activityDays,
    streak: clean.streak,
    longestStreak: clean.longestStreak,
    lastStreakDate: clean.lastStreakDate,
    xp: clean.xp,
    weeklyXp: clean.weeklyXp,
    lastUpdated: lastUpdated ?? clean.lastUpdated,
  });
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
    drillsPlayed: cloud.drillsPlayed,
    // Best-score is a max across devices: neither side can "lose" a record.
    drillHighScore: Math.max(
      cloud.drillHighScore,
      local.drillHighScore
    ),
    lastDailyChallengeDate:
      cloud.lastDailyChallengeDate ?? local.lastDailyChallengeDate,
    activityDays: { ...local.activityDays, ...cloud.activityDays },
    streak: cloud.streak,
    longestStreak: cloud.longestStreak,
    lastStreakDate: cloud.lastStreakDate,
    // XP is a max rather than a copy: work done since the last push must
    // never be lost. Same per week, so each weekly bucket keeps its peak.
    xp: Math.max(cloud.xp, local.xp),
    weeklyXp: maxWeeklyXp(cloud.weeklyXp, local.weeklyXp),
    lastUpdated: cloud.lastUpdated,
  };
}

function maxWeeklyXp(
  ...maps: (Record<string, number> | undefined)[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [week, xp] of Object.entries(map)) {
      out[week] = Math.max(out[week] ?? 0, xp);
    }
  }
  return out;
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
