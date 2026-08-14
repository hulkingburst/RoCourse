"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useGuestStore } from "@/lib/guest-store";
import { useProgressStore } from "@/lib/progress-store";
import { weekKey } from "@/lib/xp";

/**
 * Keeps a guest's weekly XP row on the leaderboard fresh. Guests have no
 * account, so their totals are posted to /api/guest-xp under their anonymous
 * id and chosen name. Nothing is posted until they pick a name, and posts are
 * debounced so rapid XP gains batch into one request. Signed-in users are
 * handled by the normal progress sync instead.
 */
export function useGuestXpReporter() {
  const { status } = useSession();
  const hydrated = useProgressStore((state) => state.hydrated);

  React.useEffect(() => {
    if (status === "authenticated") return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const report = () => {
      const { guestId, name } = useGuestStore.getState();
      if (!name) return;
      const week = weekKey(new Date());
      const xp = useProgressStore.getState().weeklyXp[week] ?? 0;
      if (xp <= 0) return;
      void fetch("/api/guest-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, name, week, xp }),
        cache: "no-store",
      }).catch(() => {});
    };

    // Report once on load (a returning guest re-registers their row) and on
    // any progress change, debounced so a burst of XP posts a single request.
    if (hydrated) report();

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(report, 2000);
    };

    const unsubscribeProgress = useProgressStore.subscribe((state, prev) => {
      if (state.lastUpdated === prev.lastUpdated) return;
      schedule();
    });
    const unsubscribeGuest = useGuestStore.subscribe((state, prev) => {
      if (state.name === prev.name) return;
      report();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribeProgress();
      unsubscribeGuest();
    };
  }, [status, hydrated]);
}
