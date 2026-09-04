"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { BADGES, extractBadgeStats } from "@/lib/badges";
import { useNotificationsStore } from "@/lib/notification-store";
import { useProgressStore } from "@/lib/progress-store";
import { SITE_UPDATES } from "@/lib/updates";
import type { NotificationState } from "@/lib/notification-types";

/**
 * Drives the notifications system from the client:
 *  - seeds one-time site-update notifications,
 *  - fires a one-time notification whenever a badge is newly earned,
 *  - for signed-in users, pulls the server DB backup (which also runs the
 *    feedback-close sync) and idempotently pushes any local-only notifications
 *    up as a backup so nothing is lost across devices.
 */
export function useNotifications(totalLessons: number): void {
  const hydrated = useNotificationsStore((s) => s.hydrated);
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && !!session?.user?.id;

  // ----- badge stats derived from the progress store -----
  const lessons = useProgressStore((s) => s.lessons);
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const streak = useProgressStore((s) => s.streak);
  const longestStreak = useProgressStore((s) => s.longestStreak);
  const dailyChallengesCompleted = useProgressStore((s) => s.dailyChallengesCompleted);
  const quickQuizzesCompleted = useProgressStore((s) => s.quickQuizzesCompleted);
  const finishedPath = useProgressStore((s) => s.finishedPath);

  const badgeStats = React.useMemo(
    () =>
      extractBadgeStats(
        {
          lessons,
          bookmarks,
          streak,
          longestStreak,
          dailyChallengesCompleted,
          quickQuizzesCompleted,
          finishedPath,
        },
        totalLessons
      ),
    [
      lessons,
      bookmarks,
      streak,
      longestStreak,
      dailyChallengesCompleted,
      quickQuizzesCompleted,
      finishedPath,
      totalLessons,
    ]
  );

  const earnedBadgeKeys = React.useMemo(
    () => BADGES.filter((b) => b.earned(badgeStats)).map((b) => b.id),
    [badgeStats]
  );

  // ----- run the side effects only after the local store hydrates -----
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || hydratedRef.current) return;
    hydratedRef.current = true;
    useNotificationsStore.getState().seedUpdates(SITE_UPDATES);
  }, [hydrated]);

  // ----- fire one-time badge notifications on transitions -----
  // The stored "title" is the badge id — the bell UI localizes it via the i18n
  // badge catalog (badge.<id>.name), keeping the stored/synced data stable and
  // locale-independent.
  React.useEffect(() => {
    if (!hydrated) return;
    const store = useNotificationsStore.getState();
    for (const badgeId of earnedBadgeKeys) {
      store.awardBadge(badgeId, badgeId);
    }
  }, [earnedBadgeKeys, hydrated]);

  // ----- server backup for signed-in users -----

  // Pull the server DB backup (also runs the feedback-close sync) once when
  // signed in + hydrated.
  React.useEffect(() => {
    if (!signedIn || !hydrated) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (cancelled || !response.ok) return;
      const data = (await response.json()) as NotificationState;
      if (!cancelled) {
        useNotificationsStore.getState().mergeServer(data.notifications);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, hydrated]);

  // Push any newly-created local notifications (badges, site updates) up to
  // the server backup whenever the local list grows; the server upserts by
  // localKey so this is idempotent.
  const backupableCount = useNotificationsStore((s) =>
    s.hydrated ? s.notifications.length : 0
  );
  React.useEffect(() => {
    if (!signedIn || !hydrated) return;
    const store = useNotificationsStore.getState();
    const pending = store.notifications.filter(
      (n) => !store.backedUpIds.includes(n.id)
    );
    if (pending.length === 0) return;
    const labels = pending.map((n) => n.id);
    void (async () => {
      const post = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: pending }),
      }).catch(() => null);
      // Only mark as backed up if the server acknowledged the write,
      // otherwise we retry on the next change.
      if (post?.ok) {
        useNotificationsStore.getState().markBackedUp(labels);
      }
    })();
  }, [signedIn, hydrated, backupableCount]);
}
