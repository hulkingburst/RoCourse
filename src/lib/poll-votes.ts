import { prisma } from "@/lib/prisma";
import {
  getPoll,
  isPollClosed,
  pollOptionIds,
  type PollDef,
  type PollTally,
} from "@/lib/polls";

/**
 * Server-side poll vote storage.
 *
 * Every poll is authored in code (`src/lib/polls.ts`); only the tally is
 * persisted, in `PollVote`. Votes are identified by a namespaced `voterKey`
 * rather than a User relation, because guests must be able to vote on a course
 * that has no sign-up wall.
 */

/** A signed-in learner votes as their account, so the vote follows them. */
export const USER_VOTER_PREFIX = "user:";
/** Everyone else votes as the client-generated anonymous guest id. */
export const GUEST_VOTER_PREFIX = "guest:";

/** Same shape the weekly XP leaderboard accepts, so the ids match. */
const GUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** Caps a crafted key so nothing unbounded can be written or matched. */
const MAX_VOTER_KEY_LENGTH = 80;

/**
 * Resolves the identity a vote is recorded under. A session always wins over a
 * supplied guest id, so a signed-in learner can't be counted twice by also
 * passing a guest id.
 */
export function resolveVoterKey(
  userId: string | null | undefined,
  guestId: string | null | undefined
): string | null {
  if (userId) return `${USER_VOTER_PREFIX}${userId.slice(0, 64)}`;
  if (typeof guestId === "string" && GUEST_ID_RE.test(guestId)) {
    return `${GUEST_VOTER_PREFIX}${guestId}`;
  }
  return null;
}

/** The guest id a client should send, or null when it isn't usable. */
export function cleanGuestId(value: unknown): string | null {
  return typeof value === "string" && GUEST_ID_RE.test(value) ? value : null;
}

/**
 * Tallies the given polls for every voter in one query.
 *
 * Rows are counted in JS rather than with `groupBy` so the read works
 * identically through Prisma and through the raw neon SQL layer used on
 * Cloudflare (which has no `groupBy`). A poll is a single question with a
 * handful of options, so the row count per poll is small.
 */
export async function getTallies(
  polls: PollDef[],
  voterKey: string | null,
  now: number = Date.now()
): Promise<PollTally[]> {
  const tallies = new Map<string, PollTally>(
    polls.map((poll) => {
      const counts: Record<string, number> = {};
      for (const optionId of pollOptionIds(poll)) counts[optionId] = 0;
      return [
        poll.id,
        {
          pollId: poll.id,
          counts,
          total: 0,
          yourVote: null,
          closed: isPollClosed(poll, now),
        },
      ];
    })
  );

  if (polls.length === 0) return [];

  const rows = (await prisma.pollVote.findMany({
    where: { pollId: { in: polls.map((poll) => poll.id) } },
    select: { pollId: true, optionId: true, voterKey: true },
  })) as { pollId: string; optionId: string; voterKey: string }[];

  for (const row of rows) {
    const tally = tallies.get(row.pollId);
    // An option that was since removed from the authored poll must not inflate
    // the total, so unknown options are dropped rather than counted.
    if (!tally || !(row.optionId in tally.counts)) continue;
    tally.counts[row.optionId] += 1;
    tally.total += 1;
    if (voterKey && row.voterKey === voterKey) tally.yourVote = row.optionId;
  }

  return polls.map((poll) => tallies.get(poll.id)!);
}

export type CastVoteResult =
  | { ok: true; tally: PollTally }
  | { ok: false; error: string; status: number };

/**
 * Records a vote (or moves an existing one to a different option) and returns
 * the refreshed tally so the caller never has to re-read.
 *
 * The unique (pollId, voterKey) index is what makes this one vote per voter;
 * a re-vote is a correction, not a second ballot. On a create race the unique
 * violation is retried as an update, matching the WeeklyXp upsert pattern.
 */
export async function castVote(
  pollId: string,
  optionId: string,
  voterKey: string
): Promise<CastVoteResult> {
  if (!voterKey || voterKey.length > MAX_VOTER_KEY_LENGTH) {
    return { ok: false, error: "Invalid voter", status: 400 };
  }

  const poll = getPoll(pollId);
  if (!poll) return { ok: false, error: "Unknown poll", status: 404 };
  if (!pollOptionIds(poll).includes(optionId)) {
    return { ok: false, error: "Unknown option", status: 400 };
  }
  if (isPollClosed(poll)) {
    return { ok: false, error: "Poll closed", status: 409 };
  }

  const where = { pollId_voterKey: { pollId: poll.id, voterKey } };
  const data = { pollId: poll.id, voterKey, optionId };

  try {
    await prisma.pollVote.upsert({
      where,
      create: data,
      update: { optionId },
    });
  } catch (err) {
    // Lost a create race — another request from the same voter landed first.
    // Re-apply as an update so the newer choice wins instead of erroring.
    const isDuplicate =
      err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
    if (!isDuplicate) throw err;
    await prisma.pollVote.update({ where, data: { optionId } });
  }

  const [tally] = await getTallies([poll], voterKey);
  return { ok: true, tally };
}
