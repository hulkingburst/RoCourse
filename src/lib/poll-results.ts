import { prisma } from "@/lib/prisma";
import { GITHUB_API, feedbackRepoConfig, githubHeaders } from "@/lib/github-api";
import { getTallies } from "@/lib/poll-votes";
import {
  POLLS,
  isPollClosed,
  isPollRetired,
  pollClosesAt,
  pollOptionIds,
  type PollDef,
  type PollTally,
} from "@/lib/polls";

/**
 * What happens when a poll ends.
 *
 * A poll closes on a clock, but the site has no scheduler — a Cloudflare cron
 * trigger would need a wrangler config the OpenNext build doesn't emit a
 * handler for. So the close is noticed lazily, on the next poll read: whoever
 * opens the app first after a poll's window ends is what files the results.
 * That is fine because every step here is idempotent, and the read that
 * triggers it is one the visitor was making anyway.
 *
 * Two jobs live here:
 *  1. File the final tally as an issue in the feedback repo, so the results
 *     outlive the notification that pointed at them.
 *  2. Retire the poll's notification backup once its grace window is over.
 */

/** Stops a misconfigured token from being retried on every poll read, forever. */
const MAX_ATTEMPTS = 5;

/** Keeps a long option label from wrecking the markdown table. */
const MAX_LABEL = 80;

/** Guards one in-flight sweep per instance, so a burst of page views doesn't
 *  fan out into a burst of GitHub calls. The unique pollId is the real guard;
 *  this just keeps the common path quiet. */
let inFlight: Promise<void> | null = null;

/** The shape of the bits of the i18n catalog a report needs. */
type PollMessages = {
  poll?: {
    polls?: Record<
      string,
      { question?: string; body?: string; options?: Record<string, string> }
    >;
  };
};

/** The `PollResult` columns the sweep reads, from the table or from a claim. */
type Claim = { id: string; issueUrl: string | null; attempts: number };

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
}

/** The option with the most votes, or null on a tie-free empty poll. Ties go to
 *  the earlier authored option, so the result is stable rather than dependent
 *  on object key order. */
function pickWinner(poll: PollDef, tally: PollTally): string | null {
  if (tally.total === 0) return null;
  let winner: string | null = null;
  let best = -1;
  for (const optionId of pollOptionIds(poll)) {
    const count = tally.counts[optionId] ?? 0;
    if (count > best) {
      winner = optionId;
      best = count;
    }
  }
  return winner;
}

/** Option labels live in the message catalogs, keyed by poll id then option id,
 *  so the report reads the same words the learner saw. */
async function loadCatalogs(): Promise<{ en: PollMessages; es: PollMessages }> {
  const [en, es] = await Promise.all([
    import("@/i18n/messages/en.json").then((m) => m.default as PollMessages),
    import("@/i18n/messages/es.json").then((m) => m.default as PollMessages),
  ]);
  return { en, es };
}

/** Markdown tables break on a raw pipe, and a newline would end the row. */
function cell(value: string, fallback: string): string {
  const text = value.trim().slice(0, MAX_LABEL).replace(/\|/g, "\\|");
  return text.length > 0 ? text : fallback;
}

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** The issue body. The course is bilingual, so the report is too: the English
 *  table leads and the Spanish one collapses under a disclosure, rather than
 *  forcing a Spanish-reading maintainer to scroll past a wall of English. */
function buildBody(
  poll: PollDef,
  tally: PollTally,
  winnerId: string | null,
  catalogs: { en: PollMessages; es: PollMessages },
  closesAt: Date
): string {
  const options = pollOptionIds(poll);
  const closed = `${closesAt.toISOString().slice(0, 10)}`;

  const section = (
    messages: PollMessages,
    labels: {
      question: string;
      votes: string;
      share: string;
      winner: string;
      noVotes: string;
    }
  ): string => {
    const entry = messages.poll?.polls?.[poll.id];
    const question = cell(entry?.question ?? "", poll.id);
    const rows = options.map((optionId) => {
      const count = tally.counts[optionId] ?? 0;
      const label = cell(entry?.options?.[optionId] ?? "", optionId);
      return `| ${label} | ${count} | ${percent(count, tally.total)}% |`;
    });
    const winnerCount = winnerId ? (tally.counts[winnerId] ?? 0) : 0;
    const winnerLine = winnerId
      ? `**${labels.winner}:** ${cell(
          entry?.options?.[winnerId] ?? "",
          winnerId
        )} — ${winnerCount} (${percent(winnerCount, tally.total)}%)`
      : `_${labels.noVotes}_`;
    return [
      `### ${question}`,
      "",
      winnerLine,
      "",
      `| ${labels.question} | ${labels.votes} | ${labels.share} |`,
      `| --- | ---: | ---: |`,
      ...rows,
      "",
    ].join("\n");
  };

  return [
    section(catalogs.en, {
      question: "Option",
      votes: "Votes",
      share: "Share",
      winner: "Winner",
      noVotes: "No votes were cast.",
    }),
    "<details>",
    "<summary>Español</summary>",
    "",
    section(catalogs.es, {
      question: "Opción",
      votes: "Votos",
      share: "Porcentaje",
      winner: "Ganador",
      noVotes: "No se emitió ningún voto.",
    }).trimEnd(),
    "",
    "</details>",
    "",
    `_Opened ${poll.createdAt.slice(0, 10)} · Closed ${closed} · ${tally.total} votes._`,
    "",
    "_Filed automatically by RoCourse when the poll closed._",
  ].join("\n");
}

function buildTitle(poll: PollDef, catalogs: { en: PollMessages }): string {
  const question = catalogs.en.poll?.polls?.[poll.id]?.question?.trim();
  const label = question && question.length > 0 ? question : poll.id;
  return `[Poll results] ${label.slice(0, 100)} — ${poll.createdAt.slice(0, 10)}`;
}

/**
 * Files the results issue for one poll. Never throws: a failed report is
 * recorded as an attempt and retried by a later sweep, because losing the
 * report is strictly better than failing the read that noticed the close.
 */
async function reportOne(
  poll: PollDef,
  now: number,
  row: Claim,
  token: string,
  repo: string
): Promise<void> {
  const [tally] = await getTallies([poll], null, now);
  const winnerId = pickWinner(poll, tally);
  const closes = pollClosesAt(poll);
  if (!closes) return;

  const tallyFields = { total: tally.total, winnerId, attempts: row.attempts + 1 };
  try {
    const catalogs = await loadCatalogs();
    const response = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: buildTitle(poll, catalogs),
        body: buildBody(poll, tally, winnerId, catalogs, closes),
      }),
    });
    if (!response.ok) throw new Error(`GitHub responded ${response.status}`);
    const created = (await response.json()) as { html_url?: string };
    await prisma.pollResult.update({
      where: { id: row.id },
      data: { ...tallyFields, issueUrl: created.html_url ?? null },
    });
  } catch {
    // issueUrl stays null so a later sweep retries; `attempts` is what stops a
    // deploy with no working token from retrying on every single poll read.
    //
    // The one gap this leaves is GitHub succeeding and this write then
    // failing, which a later retry would duplicate. That is the right way
    // round: a duplicate results issue is a cosmetic problem someone closes,
    // whereas dropping the issueUrl would strand the results with no link at
    // all. The attempt cap bounds the duplicates too.
    await prisma.pollResult
      .update({ where: { id: row.id }, data: tallyFields })
      .catch(() => null);
  }
}

/**
 * Claims a poll by inserting its row BEFORE any GitHub call, so two readers
 * arriving at once can't both file the same results. Returns null when another
 * request won the race — its claim is the one that reports.
 */
async function claimPoll(
  pollId: string,
  closes: Date,
  createdAt: Date
): Promise<Claim | null> {
  try {
    const row = (await prisma.pollResult.create({
      data: { pollId, closesAt: closes, createdAt },
      select: { id: true, attempts: true },
    })) as { id: string; attempts: number };
    return { id: row.id, issueUrl: null, attempts: row.attempts };
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

async function runSweep(now: number): Promise<void> {
  // Nothing is claimed when the integration isn't configured: a dev box with no
  // token should skip this entirely rather than burn attempts it can never
  // succeed with, which would leave the poll unreportable once a token lands.
  const config = feedbackRepoConfig();
  if (!config) return;

  const candidates = POLLS.filter((poll) => isPollClosed(poll, now));
  if (candidates.length === 0) return;

  const existing = (await prisma.pollResult.findMany({
    where: { pollId: { in: candidates.map((poll) => poll.id) } },
    select: { id: true, pollId: true, issueUrl: true, attempts: true },
  })) as (Claim & { pollId: string })[];
  const byPollId = new Map(existing.map((row) => [row.pollId, row]));

  for (const poll of candidates) {
    const closes = pollClosesAt(poll);
    if (!closes) continue;

    let row: Claim | null = byPollId.get(poll.id) ?? null;
    if (!row) {
      const created = Date.parse(poll.createdAt);
      row = await claimPoll(
        poll.id,
        closes,
        Number.isFinite(created) ? new Date(created) : new Date(closes)
      );
      if (!row) continue; // another request claimed it and is reporting it
    }
    if (row.issueUrl) continue; // already filed
    if (row.attempts >= MAX_ATTEMPTS) continue;

    await reportOne(poll, now, row, config.token, config.repo);
  }
}

/**
 * Files a results issue for every closed poll that doesn't have one yet.
 * Idempotent and cheap in the steady state: once each poll is reported this
 * resolves to one indexed query and no outbound calls.
 */
export function reportClosedPolls(now: number = Date.now()): Promise<void> {
  if (!inFlight) {
    inFlight = runSweep(now)
      .catch(() => null)
      .then(() => undefined)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** pollId -> results issue URL, for the polls the client is rendering. */
export async function getResultsUrls(
  pollIds: string[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (pollIds.length === 0) return urls;
  const rows = (await prisma.pollResult.findMany({
    where: { pollId: { in: pollIds }, issueUrl: { not: null } },
    select: { pollId: true, issueUrl: true },
  })) as { pollId: string; issueUrl: string | null }[];
  for (const row of rows) {
    if (row.issueUrl) urls.set(row.pollId, row.issueUrl);
  }
  return urls;
}

/**
 * Drops the server-side notification backup for polls that closed long enough
 * ago. The tally stays readable through `GET /api/polls`; only the nudge in
 * the bell goes away, so the bell stays a list of things still worth doing.
 *
 * Deletes for every user, not just the caller — a notification that should
 * have retired for the whole site should not linger on one account.
 */
export async function pruneRetiredPollNotifications(
  polls: PollDef[],
  now: number = Date.now()
): Promise<string[]> {
  const keys = polls
    .filter((poll) => isPollRetired(poll, now))
    .map((poll) => `poll:${poll.id}`);
  if (keys.length === 0) return [];
  await prisma.notification.deleteMany({ where: { localKey: { in: keys } } });
  return keys;
}
