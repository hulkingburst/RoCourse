"use client";

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
    snapshot.finishedPath != null
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
  useProgressStore.setState({
    lessons: snapshot.lessons,
    bookmarks: snapshot.bookmarks,
    recentlyViewed: snapshot.recentlyViewed,
    lastLesson: snapshot.lastLesson,
    finishedPath: snapshot.finishedPath,
    lastUpdated: lastUpdated ?? snapshot.lastUpdated,
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
 * Best-effort push of the current local state. Used before sign-out so the
 * cloud stays up to date with the device's latest progress.
 */
export async function flushSync(): Promise<PushResult | null> {
  const snapshot = getSnapshot();
  if (!hasAnyProgress(snapshot)) return null;
  return pushCloud(snapshot, getCompletions(snapshot));
}
