import { prisma } from "@/lib/prisma";

/**
 * Multi-write operations that must be all-or-nothing.
 *
 * The Cloudflare build talks to Postgres through the raw SQL shim in
 * `src/lib/db/neon.ts`, which has no interactive transaction: each call is its
 * own HTTP round trip, so a `BEGIN ... COMMIT` pair cannot span them. Every
 * writer here therefore expresses the whole operation as ONE statement using
 * data-modifying CTEs, which Postgres runs in a single implicit transaction —
 * a failure anywhere in the statement leaves no partial row behind.
 *
 * These run unchanged on both drivers (Prisma over `pg` on Vercel, the shim on
 * Workers), which is why the callers use `$queryRaw` instead of chaining model
 * calls.
 */

/**
 * Renames a user and refreshes the denormalized name on their weekly
 * leaderboard rows in the same statement. Without the atomic pairing a failure
 * between the two writes leaves the leaderboard showing a stale name forever.
 *
 * `openedAt`/`updatedAt` are set explicitly because raw SQL bypasses Prisma's
 * `@updatedAt`.
 */
export async function renameUserWithLeaderboardName(
  userId: string,
  name: string,
  now: Date = new Date()
): Promise<void> {
  await prisma.$queryRaw`
    WITH updated AS (
      UPDATE "User"
      SET "name" = ${name}, "nameChangedAt" = ${now}
      WHERE "id" = ${userId}
      RETURNING "id"
    ), renamed AS (
      UPDATE "WeeklyXp"
      SET "name" = ${name}, "updatedAt" = ${now}
      WHERE "userId" IN (SELECT "id" FROM updated)
      RETURNING 1
    )
    SELECT
      (SELECT count(*)::int FROM updated) AS "users",
      (SELECT count(*)::int FROM renamed) AS "rows"
  `;
}

export interface FeedbackTicketWrite {
  userId: string;
  repo: string;
  issueNumber: number;
  title: string;
  notification: {
    localKey: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
  };
}

/**
 * Records a feedback ticket and its "received" notification together. The
 * ticket row is what a later close is relayed against, so a ticket without its
 * notification (or the reverse) is a permanently inconsistent state: the
 * learner either never learns their feedback was filed, or the ticket can't be
 * matched when it is closed. Both writes therefore live in one statement.
 *
 * Both legs are upserts: the ticket keeps its original row (only the title is
 * refreshed, matching the previous `update`), and an existing notification is
 * left untouched.
 */
export async function recordFeedbackTicket(
  write: FeedbackTicketWrite,
  now: Date = new Date()
): Promise<void> {
  const ticketId = crypto.randomUUID();
  const notificationId = crypto.randomUUID();
  const { notification } = write;

  await prisma.$queryRaw`
    WITH ticket AS (
      INSERT INTO "FeedbackTicket" (
        "id", "userId", "repo", "issueNumber", "title", "openedAt"
      )
      VALUES (
        ${ticketId}, ${write.userId}, ${write.repo}, ${write.issueNumber},
        ${write.title}, ${now}
      )
      ON CONFLICT ("repo", "issueNumber") DO UPDATE SET "title" = EXCLUDED."title"
      RETURNING "id"
    ), notified AS (
      INSERT INTO "Notification" (
        "id", "userId", "localKey", "type", "title", "body", "link", "createdAt"
      )
      VALUES (
        ${notificationId}, ${write.userId}, ${notification.localKey},
        ${notification.type}, ${notification.title}, ${notification.body},
        ${notification.link}, ${now}
      )
      ON CONFLICT ("userId", "localKey") DO NOTHING
      RETURNING "id"
    )
    SELECT
      (SELECT count(*)::int FROM ticket) AS "tickets",
      (SELECT count(*)::int FROM notified) AS "notifications"
  `;
}
