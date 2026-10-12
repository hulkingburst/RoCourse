"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useGuestStore } from "@/lib/guest-store";
import { useProgressStore } from "@/lib/progress-store";
import { weekKey } from "@/lib/xp";

/**
 * Keeps a guest's weekly XP row on the leaderboard fresh. Guests have no
 * account, so their totals are posted to /api/guest-xp under a server-issued
 * anonymous identity (id plus signed token) and their chosen name. Nothing is
 * posted until they pick a name, and posts are debounced so rapid XP gains
 * batch into one request. Signed-in users are handled by the normal progress
 * sync instead.
 */

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

/**
 * Asks the server for an identity token, caching whatever it answers with.
 * Called once per token lifetime for a real device (the token is persisted),
 * and only after a rejected post, so it stays off the common path.
 */
async function requestGuestIdentity(guestId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/guest-xp?guestId=${encodeURIComponent(guestId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { guestId?: unknown; token?: unknown };
    if (typeof payload.token !== "string") return null;
    const identity =
      typeof payload.guestId === "string" && payload.guestId.length > 0
        ? payload.guestId
        : guestId;
    useGuestStore.getState().setIdentity(identity, payload.token);
    return payload.token;
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
        // more. A second rejection is left for the next scheduled report.
        const fresh = await requestGuestIdentity(guestId);
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
