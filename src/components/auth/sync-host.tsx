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
  pullCloud,
  pushCloud,
  waitForHydration,
} from "@/lib/sync";
import type { CloudState, ProgressSnapshot } from "@/lib/sync-types";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConflictState {
  cloud: CloudState;
  local: ProgressSnapshot;
}

/**
 * Owns the lifecycle of cloud sync: pull on sign-in, debounced push on every
 * local change, a full flush before sign-out, and a conflict dialog when both
 * sides changed.
 */
export function SyncHost() {
  const { status } = useSession();
  const resolvedRef = React.useRef(false);
  const [conflict, setConflict] = React.useState<ConflictState | null>(null);
  const [resolving, setResolving] = React.useState(false);

  const resolveOnLogin = async () => {
    await waitForHydration();
    const cloud = await pullCloud();
    if (!cloud) return;

    const local = getSnapshot();
    const localHasProgress = hasAnyProgress(local);

    // Both sides changed → let the user pick.
    if (cloudIsNewer(cloud, local) && localHasProgress) {
      setConflict({ cloud, local });
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

  const handleConflict = async (useCloud: boolean) => {
    if (!conflict) return;
    setResolving(true);
    try {
      if (useCloud) {
        applySnapshot(conflict.cloud.progress ?? emptySnapshot(), conflict.cloud.lastUpdated);
      } else {
        const result = await pushCloud(conflict.local, getCompletions(conflict.local), true);
        // Align the local timestamp with the server so future pushes don't
        // trip the conflict check again (cloud just advanced past us).
        if (result.status === "ok") {
          applySnapshot(conflict.local, result.cloud.lastUpdated);
        }
      }
    } finally {
      setConflict(null);
      setResolving(false);
    }
  };

  return (
    <>
      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Progress conflict</DialogTitle>
            <DialogDescription>
              Your progress on this device and your account&apos;s saved progress
              both changed recently. Choose which one to keep — the other is
              replaced.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              disabled={resolving}
              onClick={() => handleConflict(true)}
            >
              Use account progress
            </Button>
            <Button
              disabled={resolving}
              onClick={() => handleConflict(false)}
            >
              Use this device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AuthDialog />
    </>
  );
}

function emptySnapshot(): ProgressSnapshot {
  return {
    lessons: {},
    bookmarks: [],
    recentlyViewed: [],
    lastLesson: null,
    finishedPath: null,
    quickQuizzesCompleted: 0,
    lastUpdated: null,
  };
}
