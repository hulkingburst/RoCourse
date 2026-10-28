"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useGuestStore } from "@/lib/guest-store";
import { requestGuestIdentity } from "@/lib/guest-identity-client";
import { useProgressStore } from "@/lib/progress-store";
import { weekKey } from "@/lib/xp";

/**
 * Keeps a guest's weekly XP row on the leaderboard fresh. Guests have no
 * account, so their totals are posted to /api/guest-xp under a server-issued
 * anonymous identity (id plus signed token) and their chosen name. Nothing is
 * posted until they pick a name, and posts are debounced so a burst of XP gains
 * batches into one request. Signed-in users are handled by the normal progress
 * sync instead.
 */

/**
 * How long a change waits before it is posted.
 *
 * Every progress change used to post, and answering lesson steps happens more
 * than two seconds apart, so an active guest wrote a row (plus a rate-limit
 * read and insert) for nearly every step. The board is a weekly tally, so a few
 * seconds of lag is invisible; eight seconds merges a working session into far
 * fewer requests. Nothing is lost if the tab closes inside the window — the
 * reporter posts the current total on the next load.
 */
const REPORT_DEBOUNCE_MS = 8000;

/** Status of a guest XP post, or null when the request never landed. */
async function postGuestXp(
  payload: { guestId: string; name: string; week: string; xp: number },
  token: string | null
): Promise<number | null> {
  try {
    const response = await fetch("/api/guest-xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, token }),
      cache: "no-store",
    });
    return response.status;
  } catch {
    return null;
  }
}

export function useGuestXpReporter() {
  const { status } = useSession();
  const hydrated = useProgressStore((state) => state.hydrated);

  React.useEffect(() => {
    if (status === "authenticated") return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const report = () => {
      void (async () => {
        const { guestId, name, token } = useGuestStore.getState();
        if (!name) return;
        const week = weekKey(new Date());
        const xp = useProgressStore.getState().weeklyXp[week] ?? 0;
        if (xp <= 0) return;

        const payload = { guestId, name, week, xp };
        const first = await postGuestXp(payload, token);
        if (first !== 401) return;
        // No token, or an expired/rotated one: get an identity and try once
        // more. The token we hold (even an expired one) is presented with the
        // id, which is what keeps this device's existing board row. A second
        // rejection is left for the next scheduled report.
        const fresh = await requestGuestIdentity(guestId, token);
        if (!fresh) return;
        await postGuestXp(
          { ...payload, guestId: useGuestStore.getState().guestId },
          fresh
        );
      })();
    };

    // Report once on load (a returning guest re-registers their row) and on
    // any progress change, debounced so a burst of XP posts a single request.
    if (hydrated) report();

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(report, REPORT_DEBOUNCE_MS);
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
