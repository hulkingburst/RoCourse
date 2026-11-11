"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { BADGES, extractBadgeStats } from "@/lib/badges";
import { useGuestStore } from "@/lib/guest-store";
import { useNotificationsStore } from "@/lib/notification-store";
import { RETRACTED_NOTIFICATION_IDS } from "@/lib/notification-retractions";
import { useProgressStore } from "@/lib/progress-store";
import { SITE_UPDATES } from "@/lib/updates";
import { POLLS, isPollRetired, type PollTally } from "@/lib/polls";
import type { NotificationState } from "@/lib/notification-types";

/**
 * Drives the notifications system from the client:
 *  - unsends retracted notifications (see `src/lib/notification-retractions.ts`),
 *  - seeds one-time site-update notifications,
 *  - seeds one-time notifications for open feature polls,
 *  - runs the poll close sweep and retires notifications for polls whose grace
 *    window has passed,
 *  - fires a one-time notification whenever a badge is newly earned,
 *  - for signed-in users, pulls the server DB backup (which also runs the
 *    feedback-close sync) and the server-only resolved-feedback count, and
 *    idempotently pushes any local-only notifications up as a backup so
 *    nothing is lost across devices.
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

  // Resolved feedback tickets are server-derived (GitHub issue state), so the
  // progress store has no view of them and `extractBadgeStats` leaves the count
  // at zero. The bell read below is what supplies it; without it the
  // `successful-feedback` badge could never be awarded.
  const [feedbackResolved, setFeedbackResolved] = React.useState(0);
  // Whether that server read has settled. The celebration baseline below must
  // not be captured before it lands: the count arrives after mount as a 0 -> N
  // change, so a baseline taken at mount would read an already-earned
  // `successful-feedback` as newly earned and replay it on every refresh.
  const [serverBadgeStatsLoaded, setServerBadgeStatsLoaded] = React.useState(false);

  const badgeStats = React.useMemo(() => {
    const stats = extractBadgeStats(
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
    );
    stats.feedbackResolved = feedbackResolved;
    return stats;
  }, [
    lessons,
    bookmarks,
    streak,
    longestStreak,
    dailyChallengesCompleted,
    quickQuizzesCompleted,
    finishedPath,
    totalLessons,
    feedbackResolved,
  ]);

  const earnedBadgeKeys = React.useMemo(
    () => BADGES.filter((b) => b.earned(badgeStats)).map((b) => b.id),
    [badgeStats]
  );

  // A celebration is only for a badge earned while this page is open, so the
  // baseline separating "already earned" from "earned just now" has to know the
  // server-side counts too — and those arrive from a fetch, not localStorage.
  // Guests have no server badge state, so only the session check can hold them.
  const badgeBaselineReady =
    status !== "loading" && (!signedIn || serverBadgeStatsLoaded);

  // ----- run the side effects only after the local store hydrates -----
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || hydratedRef.current) return;
    hydratedRef.current = true;
    // Retractions come off the bell before anything is seeded, so a withdrawn
    // announcement is gone for guests and signed-in learners alike — and marked
    // as deleted, which is what keeps it gone across reloads and server merges.
    useNotificationsStore
      .getState()
      .retractNotifications(RETRACTED_NOTIFICATION_IDS);
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
  // The bell entry is deduped by the persisted `earnedBadgeKeys`, so it fires
  // once per badge whether or not this session sees the transition.
  React.useEffect(() => {
    if (!hydrated || !progressHydrated) return;
    const store = useNotificationsStore.getState();
    for (const badgeId of earnedBadgeKeys) {
      store.awardBadge(badgeId, badgeId);
    }
  }, [earnedBadgeKeys, hydrated, progressHydrated]);

  // ----- celebrate badges earned during THIS session -----
  // Celebration popups are gated behind a baseline so they only play for badges
  // actually earned during this session — never as a replay of what was already
  // loaded from localStorage or pulled from the cloud.
  //
  // The baseline must wait for the server-derived badge input. `feedbackResolved`
  // arrives after mount as a 0 -> N change, so a baseline captured at mount
  // counted an already-earned `successful-feedback` as "not yet earned" and
  // replayed its celebration on every refresh.
  const baselineRef = React.useRef<{
    signedIn: boolean;
    earned: Set<string>;
  } | null>(null);
  React.useEffect(() => {
    if (!hydrated || !progressHydrated || !badgeBaselineReady) return;
    const store = useNotificationsStore.getState();

    // A new identity (signing in mid-session) brings server-side badge state
    // that was earned long before this page opened: capture it, don't celebrate.
    const baseline =
      baselineRef.current?.signedIn === signedIn
        ? baselineRef.current
        : { signedIn, earned: new Set(earnedBadgeKeys) };
    baselineRef.current = baseline;

    for (const badgeId of earnedBadgeKeys) {
      if (baseline.earned.has(badgeId)) continue;
      baseline.earned.add(badgeId);
      store.enqueueCelebration(badgeId);
    }
  }, [earnedBadgeKeys, hydrated, progressHydrated, badgeBaselineReady, signedIn]);

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
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (cancelled || !response.ok) return;
        const data = (await response.json()) as NotificationState & {
          badgeStats?: { feedbackResolved?: number };
        };
        if (cancelled) return;
        useNotificationsStore.getState().mergeServer(data.notifications);
        const resolved = data.badgeStats?.feedbackResolved;
        setFeedbackResolved(
          typeof resolved === "number" && Number.isFinite(resolved)
            ? Math.max(0, Math.floor(resolved))
            : 0
        );
      } catch {
        // An unavailable read leaves the count at zero; the wait below still
        // ends so a broken request can't suppress celebrations all session.
      } finally {
        if (!cancelled) setServerBadgeStatsLoaded(true);
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
