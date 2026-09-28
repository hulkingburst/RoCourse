/**
 * Feature polls: "what should we build next?" votes.
 *
 * Polls are how the course gathers signal on a proposed feature BEFORE it is
 * built, so the tally is the point. Only the *structure* lives here — id,
 * option ids, and the open window — mirroring `quiz-data.ts`; the question and
 * option text is localized in `src/i18n/messages/*.json` under
 * `poll.polls.<id>`, so the same poll reads correctly in both languages.
 *
 * The vote counts live in the database (`PollVote`), not here: shipping a new
 * poll is a one-file change with no migration. This module is the single
 * allowlist the API validates against, so an unknown `pollId` or `optionId` is
 * rejected server-side rather than written.
 *
 * Every poll ends on its own: `durationDays` after `createdAt` it stops taking
 * votes, `src/lib/poll-results.ts` files the final tally as a GitHub issue, and
 * the notification retires one `POLL_GRACE_MS` later — late enough that a
 * learner who was away over the close still sees the result before the bell
 * entry disappears.
 *
 * Add a new poll at the TOP with a fresh `id` (use the date) and a `createdAt`
 * timestamp; learners who haven't seen it yet get a one-time "poll"
 * notification in the bell.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a poll stays open when it doesn't say. A week is long enough for a
 * learner who checks in occasionally to still weigh in, short enough that the
 * "what do we build next" loop doesn't stall for a month.
 */
export const DEFAULT_POLL_DURATION_DAYS = 7;

/**
 * How long a poll's notification survives AFTER it closes. Results stay
 * readable for this whole window, so closing a poll doesn't silently delete the
 * only thing a returning learner had to look at.
 */
export const POLL_GRACE_MS = DAY_MS;

export interface PollDef {
  /** Stable id, also the notification key (`poll:<id>`). */
  id: string;
  /** Option ids, in display order. Must match the i18n `options` keys. */
  options: string[];
  /** ISO date — controls notification ordering and dedup, and starts the clock. */
  createdAt: string;
  /**
   * How long the poll takes votes, counted from `createdAt`. Defaults to
   * `DEFAULT_POLL_DURATION_DAYS`; a poll that never closes omits it and sets
   * `closesAt: null`.
   */
  durationDays?: number | null;
  /**
   * Explicit ISO close date, which wins over `durationDays`. Use it to close a
   * poll early or to leave one open indefinitely (`null`).
   */
  closesAt?: string | null;
}

/** Polls every learner can vote on. */
const PUBLIC_POLLS: PollDef[] = [
  {
    id: "2026-09-27-next-feature",
    options: ["a", "b", "c", "d"],
    createdAt: "2026-09-27T12:00:00.000Z",
    durationDays: DEFAULT_POLL_DURATION_DAYS,
  },
];

/**
 * Dev-only timestamps are relative to now, so a restarted dev server doesn't
 * silently turn a "already closed" smoke test back into an open poll.
 */
const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

/**
 * Dev-only smoke-test poll. Gated at module scope so it can never reach a
 * production build or notification seed: `NODE_ENV` is inlined by the bundler,
 * and the server API re-validates every `pollId` against `POLLS`, so a poll
 * that isn't in this list is rejected on a POST even if a client asks for it.
 */
const DEV_POLLS: PollDef[] =
  process.env.NODE_ENV === "production"
    ? []
    : [
        // Open poll — the voting path.
        {
          id: "dev-test-poll",
          options: ["alpha", "beta", "gamma"],
          createdAt: hoursAgo(1),
          durationDays: 1,
        },
        // Closed but still inside the grace window: the tally is public, the
        // notification is still in the bell.
        {
          id: "dev-closed-poll",
          options: ["one", "two"],
          createdAt: hoursAgo(30),
          durationDays: 1,
        },
        // Closed longer ago than the grace window: the notification is retired
        // on sight, but the tally is still served.
        {
          id: "dev-expired-poll",
          options: ["red", "blue"],
          createdAt: hoursAgo(72),
          durationDays: 1,
        },
      ];

export const POLLS: PollDef[] = [...PUBLIC_POLLS, ...DEV_POLLS];

const POLL_BY_ID = new Map(POLLS.map((poll) => [poll.id, poll]));

/** The poll with this id, or null when it doesn't exist or isn't a poll. */
export function getPoll(id: string): PollDef | null {
  if (!/^[a-z0-9-]{1,64}$/i.test(id)) return null;
  return POLL_BY_ID.get(id) ?? null;
}

/**
 * When the poll stops taking votes, or null when it never closes.
 *
 * An explicit `closesAt` wins over `durationDays` so a poll can be pulled early
 * without rewriting the duration it was announced with. A duration of zero or
 * less is treated as "closes immediately" rather than silently ignored — a
 * mistyped `0` should fail closed, not leave a poll open forever.
 */
export function pollClosesAt(poll: PollDef): Date | null {
  if (poll.closesAt != null) {
    const explicit = Date.parse(poll.closesAt);
    return Number.isFinite(explicit) ? new Date(explicit) : null;
  }
  const days = poll.durationDays ?? DEFAULT_POLL_DURATION_DAYS;
  if (!Number.isFinite(days)) return null;
  const created = Date.parse(poll.createdAt);
  if (!Number.isFinite(created)) return null;
  return new Date(created + days * DAY_MS);
}

/** True once the poll's close date has passed. */
export function isPollClosed(poll: PollDef, now: number = Date.now()): boolean {
  const closes = pollClosesAt(poll);
  return closes !== null && now >= closes.getTime();
}

/** A closed poll still shows its tally, it just can't be voted on. */
export function isPollVotable(poll: PollDef, now: number = Date.now()): boolean {
  return !isPollClosed(poll, now);
}

/**
 * When the poll's notification should retire, or null when the poll never
 * closes (and so is never retired). Deliberately `null` rather than "already
 * expired" for a poll with no close date: an open poll must never be swept.
 */
export function pollRetiresAt(poll: PollDef): Date | null {
  const closes = pollClosesAt(poll);
  return closes === null ? null : new Date(closes.getTime() + POLL_GRACE_MS);
}

/**
 * True once the poll closed long enough ago that its notification should be
 * gone. The tally is still served either way — this only governs whether the
 * bell keeps asking the learner to look at it.
 */
export function isPollRetired(poll: PollDef, now: number = Date.now()): boolean {
  const retires = pollRetiresAt(poll);
  return retires !== null && now >= retires.getTime();
}

/** Option ids of a poll that are safe to render — guards authored data. */
export function pollOptionIds(poll: PollDef): string[] {
  return poll.options.filter((option) => /^[a-z0-9-]{1,32}$/i.test(option));
}

/** Shape of one poll's tally as returned by `GET /api/polls`. */
export interface PollTally {
  pollId: string;
  /** Option id -> number of votes. Every authored option is present, 0 included. */
  counts: Record<string, number>;
  total: number;
  /** The caller's own vote, or null when they haven't voted. */
  yourVote: string | null;
  /** True when the poll has closed and further votes are refused. */
  closed: boolean;
  /** When the poll closed, or null when it is still open. */
  closesAt: string | null;
  /**
   * True once the poll has been closed long enough that its notification is
   * retired. The caller is expected to drop `poll:<id>` from the bell; the
   * tally below is still valid and still served.
   */
  retired: boolean;
  /**
   * Link to the auto-filed results issue, once the poll has been reported.
   * Null before the report exists (including while the poll is still open).
   */
  resultsUrl: string | null;
}

export interface PollTalliesResponse {
  polls: PollTally[];
}
