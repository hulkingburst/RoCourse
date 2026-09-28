"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { BADGES, extractBadgeStats } from "@/lib/badges";
import { useGuestStore } from "@/lib/guest-store";
import { useNotificationsStore } from "@/lib/notification-store";
import { useProgressStore } from "@/lib/progress-store";
import { SITE_UPDATES } from "@/lib/updates";
import { POLLS, isPollRetired, type PollTally } from "@/lib/polls";
import type { NotificationState } from "@/lib/notification-types";

/**
 * Drives the notifications system from the client:
 *  - seeds one-time site-update notifications,
 *  - seeds one-time notifications for open feature polls,
 *  - runs the poll close sweep and retires notifications for polls whose grace
 *    window has passed,
 *  - fires a one-time notification whenever a badge is newly earned,
 *  - for signed-in users, pulls the server DB backup (which also runs the
 *    feedback-close sync) and idempotently pushes any local-only notifications
 *    up as a backup so nothing is lost across devices.
 */
export function useNotifications(totalLessons: number): void {
  const hydrated = useNotificationsStore((s) => s.hydrated);
  // Badge stats derive from the progress store, so we must wait for IT to
  // hydrate too — otherwise the first effect run sees an empty snapshot and the
  // baseline below would treat every loaded badge as "new".
  const progressHydrated = useProgressStore((s) => s.hydrated);
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
    // A poll whose grace window is already over must not be seeded at all —
    // otherwise a first-time visitor is handed a bell entry for a poll that
    // closed before they ever arrived, and then watches it vanish.
    useNotificationsStore
      .getState()
      .seedPolls(POLLS.filter((poll) => !isPollRetired(poll)));
  }, [hydrated]);

  // ----- fire one-time badge notifications on transitions -----
  // The stored "title" is the badge id — the bell UI localizes it via the i18n
  // badge catalog (badge.<id>.name), keeping the stored/synced data stable and
  // locale-independent.
  //
  // Celebration popups are gated behind a baseline so they only play for badges
  // actually earned (or newly synced in) during THIS session — never as a
  // replay of what was already loaded from localStorage or pulled from the
  // cloud. The bell notifications still fire once for every earned badge via
  // the persisted `earnedBadgeKeys` dedup.
  const baselineRef = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (!hydrated || !progressHydrated) return;
    const store = useNotificationsStore.getState();

    if (baselineRef.current === null) {
      baselineRef.current = new Set(earnedBadgeKeys);
    }

    for (const badgeId of earnedBadgeKeys) {
      store.awardBadge(badgeId, badgeId);
      if (baselineRef.current.has(badgeId)) continue;
      baselineRef.current.add(badgeId);
      store.enqueueCelebration(badgeId);
    }
  }, [earnedBadgeKeys, hydrated, progressHydrated]);

  // ----- poll close sweep -----
  //
  // A poll ending is a real-world event nothing local can observe, so the
  // server notices it on the next poll read and tells us which polls are done
  // (see src/lib/poll-results.ts). This is the read that makes that happen for
  // every visitor rather than only the ones who open a poll, and the response
  // is what retires the stale bell entries.
  //
  // Once per mount: a learner who leaves the tab open across a close picks it
  // up on their next visit, and the server side is idempotent either way. The
  // ref lives as long as the layout does, so client-side navigations within a
  // session don't re-fire it.
  const sweepStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || sweepStartedRef.current) return;
    sweepStartedRef.current = true;
    let cancelled = false;
    void (async () => {
      const query = new URLSearchParams({
        guestId: useGuestStore.getState().guestId,
      });
      const response = await fetch(`/api/polls?${query}`, {
        cache: "no-store",
      }).catch(() => null);
      if (cancelled || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as {
        polls?: PollTally[];
      } | null;
      if (cancelled || !data) return;
      const store = useNotificationsStore.getState();
      for (const poll of data.polls ?? []) {
        // `removeNotification` also records the id as deleted, so neither the
        // seed above nor a later server merge can bring it back.
        if (poll.retired) store.removeNotification(`poll:${poll.pollId}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

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
