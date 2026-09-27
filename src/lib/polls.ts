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
 * Add a new poll at the TOP with a fresh `id` (use the date) and a `createdAt`
 * timestamp; learners who haven't seen it yet get a one-time "poll"
 * notification in the bell.
 */

export interface PollDef {
  /** Stable id, also the notification key (`poll:<id>`). */
  id: string;
  /** Option ids, in display order. Must match the i18n `options` keys. */
  options: string[];
  /** ISO date — controls notification ordering and dedup. */
  createdAt: string;
  /**
   * ISO date after which the tally is final: results still display, but the
   * API refuses further votes. Omit for a poll that never closes.
   */
  closesAt?: string | null;
}

/** Polls every learner can vote on. */
const PUBLIC_POLLS: PollDef[] = [
  {
    id: "2026-09-27-next-feature",
    options: ["a", "b", "c", "d"],
    createdAt: "2026-09-27T12:00:00.000Z",
  },
];

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
        {
          id: "dev-test-poll",
          options: ["alpha", "beta", "gamma"],
          createdAt: "2026-09-27T12:30:00.000Z",
        },
      ];

export const POLLS: PollDef[] = [...PUBLIC_POLLS, ...DEV_POLLS];

const POLL_BY_ID = new Map(POLLS.map((poll) => [poll.id, poll]));

/** The poll with this id, or null when it doesn't exist or isn't a poll. */
export function getPoll(id: string): PollDef | null {
  if (!/^[a-z0-9-]{1,64}$/i.test(id)) return null;
  return POLL_BY_ID.get(id) ?? null;
}

/** True once the poll's close date has passed. */
export function isPollClosed(poll: PollDef, now: number = Date.now()): boolean {
  if (!poll.closesAt) return false;
  const closes = Date.parse(poll.closesAt);
  return Number.isFinite(closes) && now >= closes;
}

/** A closed poll still shows its tally, it just can't be voted on. */
export function isPollVotable(poll: PollDef, now: number = Date.now()): boolean {
  return !isPollClosed(poll, now);
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
}

export interface PollTalliesResponse {
  polls: PollTally[];
}
