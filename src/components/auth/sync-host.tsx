"use client";

import { useSession } from "next-auth/react";
import * as React from "react";

import { useProgressStore } from "@/lib/progress-store";
import {
  applySnapshot,
  cloudIsNewer,
  getCompletions,
  getSnapshot,
  hasAnyProgress,
  mergeSnapshots,
  pullCloud,
  pushCloud,
  waitForHydration,
} from "@/lib/sync";
import type { ProgressSnapshot } from "@/lib/sync-types";
import { AuthDialog } from "@/components/auth/auth-dialog";

/**
 * Owns the lifecycle of cloud sync: pull on sign-in, debounced push on every
 * local change, and a full flush before sign-out. When both the device and the
 * cloud changed, the newer (cloud) snapshot is merged in automatically instead
 * of asking the user to pick one.
 */
export function SyncHost() {
  const { status } = useSession();
  const resolvedRef = React.useRef(false);

  const resolveOnLogin = async () => {
    await waitForHydration();
    const cloud = await pullCloud();
    if (!cloud) return;

    const local = getSnapshot();
    const localHasProgress = hasAnyProgress(local);

    // Both sides changed: merge instead of prompting. The cloud is newer, so
    // its counters win while local-only entries are preserved.
    if (
      cloudIsNewer(cloud, local) &&
      localHasProgress &&
      hasAnyProgress(cloud.progress ?? emptySnapshot())
    ) {
      applySnapshot(
        mergeSnapshots(cloud.progress ?? emptySnapshot(), local),
        cloud.lastUpdated
      );
      return;
    }

    // Fresh device (or empty account): pull the cloud state down.
    if (!localHasProgress) {
      applySnapshot(cloud.progress ?? emptySnapshot(), cloud.lastUpdated);
      return;
    }

    await pushCloud(local, getCompletions(local));
  };

  // Resolve state on sign-in / sign-out.
  React.useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      void resolveOnLogin();
    } else {
      resolvedRef.current = false;
    }
  }, [status]);

  // Debounced push on local changes while signed in.
  const lastPushRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (status !== "authenticated") return;
    const { subscribe } = useProgressStore;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribe((state, prev) => {
      if (state.lastUpdated === prev.lastUpdated) return;
      if (lastPushRef.current === state.lastUpdated) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lastPushRef.current = state.lastUpdated;
        void pushCloud(getSnapshot(), getCompletions(getSnapshot()));
      }, 1500);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [status]);

  return <AuthDialog />;
}

function emptySnapshot(): ProgressSnapshot {
  return {
    lessons: {},
    bookmarks: [],
    recentlyViewed: [],
    lastLesson: null,
    finishedPath: null,
    quickQuizzesCompleted: 0,
    dailyChallengesCompleted: 0,
    lastDailyChallengeDate: null,
    activityDays: {},
    streak: 0,
    longestStreak: 0,
    lastStreakDate: null,
    lastUpdated: null,
  };
}
