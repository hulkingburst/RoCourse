"use client";

import * as React from "react";
import { useGuestStore } from "@/lib/guest-store";
import type { PollTally } from "@/lib/polls";

/**
 * Client state for a single feature poll: the live tally plus the vote action.
 *
 * The tally is server-owned (it's the whole point of the poll), so nothing is
 * persisted locally — a refresh re-reads the real counts. The caller's own
 * vote is likewise resolved server-side from their session or anonymous guest
 * id, so there's no local "did I vote" flag that could drift out of sync.
 */
export interface UsePollVotes {
  tally: PollTally | null;
  loading: boolean;
  voting: boolean;
  error: string | null;
  /** Casts (or changes) a vote, then adopts the tally the server returned. */
  vote: (optionId: string) => void;
}

interface LoadedPoll {
  pollId: string;
  tally: PollTally | null;
  error: string | null;
}

export function usePollVotes(pollId: string | null): UsePollVotes {
  // The store's persist middleware rehydrates synchronously from localStorage,
  // so the id is already the persisted one by the time an effect runs. It's read
  // imperatively at request time rather than subscribed to, so a rehydrate
  // never triggers a refetch of an identical tally.
  const readGuestId = React.useCallback(() => useGuestStore.getState().guestId, []);

  const [loaded, setLoaded] = React.useState<LoadedPoll | null>(null);
  const [voting, setVoting] = React.useState(false);

  React.useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    void (async () => {
      try {
        const query = new URLSearchParams({ guestId: readGuestId() });
        const response = await fetch(`/api/polls?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load the poll");
        const data = (await response.json()) as { polls: PollTally[] };
        if (cancelled) return;
        setLoaded({
          pollId,
          tally: data.polls.find((p) => p.pollId === pollId) ?? null,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setLoaded({ pollId, tally: null, error: "Could not load the poll" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pollId, readGuestId]);

  // Results are keyed by the poll they were fetched for, so switching polls
  // never briefly shows the previous poll's tally, and `loading` falls out of
  // "we don't have this poll's result yet" instead of needing its own state.
  const isCurrent = loaded !== null && loaded.pollId === pollId;
  const tally = isCurrent ? loaded.tally : null;
  const error = isCurrent ? loaded.error : null;
  const loading = pollId !== null && !isCurrent;

  const vote = React.useCallback(
    (optionId: string) => {
      if (!pollId || voting) return;
      setVoting(true);
      void (async () => {
        try {
          const response = await fetch("/api/polls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pollId, optionId, guestId: readGuestId() }),
          });
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(body?.error ?? "Could not save your vote");
          }
          const data = (await response.json()) as { tally: PollTally };
          setLoaded({ pollId, tally: data.tally, error: null });
        } catch (err) {
          // A failed vote must not wipe a tally that already loaded.
          setLoaded({
            pollId,
            tally,
            error: err instanceof Error ? err.message : "Could not save your vote",
          });
        } finally {
          setVoting(false);
        }
      })();
    },
    [pollId, voting, readGuestId, tally]
  );

  return { tally, loading, voting, error, vote };
}
