import { prisma } from "@/lib/prisma";
import { GITHUB_API, githubHeaders } from "@/lib/github-api";
import type {
  AppNotification,
  NotificationState,
  NotificationType,
} from "@/lib/notification-types";

const VALID_TYPES: NotificationType[] = [
  "update",
  "badge",
  "feedback_received",
  "feedback_closed",
  "moderation",
];

function toApp(row: {
  localKey: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date;
  readAt: Date | null;
}): AppNotification {
  return {
    id: row.localKey,
    type: (VALID_TYPES.includes(row.type as NotificationType)
      ? row.type
      : "update") as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.createdAt.toISOString(),
    read: row.readAt != null,
  };
}

/** Idempotently backs up locally-created notifications, keyed by localKey. */
export async function pushNotificationBackup(
  userId: string,
  notifications: AppNotification[]
): Promise<void> {
  for (const n of notifications) {
    if (!n.id || !VALID_TYPES.includes(n.type)) continue;
    await prisma.notification.upsert({
      where: { userId_localKey: { userId, localKey: n.id } },
      create: {
        userId,
        localKey: n.id,
        type: n.type,
        title: n.title.slice(0, 200),
        body: n.body ? n.body.slice(0, 2000) : null,
        link: n.link ? n.link.slice(0, 1000) : null,
        createdAt: safeDate(n.createdAt),
        readAt: n.read ? new Date() : null,
      },
      update: {
        title: n.title.slice(0, 200),
        body: n.body ? n.body.slice(0, 2000) : null,
        link: n.link ? n.link.slice(0, 1000) : null,
        createdAt: safeDate(n.createdAt),
        readAt: n.read ? new Date() : null,
      },
    });
  }
}

/** Marks a set of the user's notifications as read in the DB backup. */
export async function markNotificationsRead(
  userId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { userId, localKey: { in: ids } },
    data: { readAt: new Date() },
  });
}

/** Permanently removes notifications from the DB backup (user-deleted). */
export async function deleteNotifications(
  userId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.deleteMany({
    where: { userId, localKey: { in: ids } },
  });
}

/**
 * Deletes notifications with these ids for EVERY user, not just one account —
 * the unsend for an announcement that has already gone out. Ids come from
 * `src/lib/notification-retractions.ts`; the caller is a read a learner was
 * making anyway, so a retraction reaches every account without a scheduler.
 * Idempotent, and safe when nothing matches (a poll notification was never
 * backed up in the first place).
 */
export async function unsendNotifications(
  ids: readonly string[]
): Promise<string[]> {
  if (ids.length === 0) return [];
  await prisma.notification.deleteMany({ where: { localKey: { in: [...ids] } } });
  return [...ids];
}

/** Reads the user's notification backup from the DB, newest first. */
export async function getUserNotifications(userId: string): Promise<NotificationState> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    notifications: rows.map(toApp),
    lastUpdated: rows[0] ? rows[0].createdAt.toISOString() : null,
  };
}

interface GithubIssue {
  state?: string;
  html_url?: string;
  body?: string | null;
  user?: { login?: string };
}

interface GithubComment {
  body?: string;
  user?: { login?: string };
}

/**
 * Checks a signed-in user's submitted feedback issues against GitHub and
 * resolves any that have since been closed.
 *
 * A closed issue IS a resolved report: the learner who filed it earns the
 * `successful-feedback` badge (which counts closed tickets) whether or not the
 * author left a closing message. Requiring a comment left every issue closed
 * straight from the GitHub UI permanently unresolved, so the only accounts
 * earning the badge were the ones whose issues happened to get a written
 * reply.
 *
 * Credit follows the `**Account:** @handle` line the feedback route stamps into
 * every issue filed by a signed-in reporter — the account that submitted it —
 * never the GitHub account that opened the issue, which is the site's own
 * token (the repo owner) on every report. The ticket is normally keyed to that
 * learner already; this re-reads the issue text and moves the ticket when the
 * two disagree, so a report cannot sit on the wrong account.
 *
 * The bell entry is still only written for a real closing message from the
 * issue's author: a close with no note resolves the ticket silently (the badge
 * is the recognition), and a reporter's own follow-up comment is never relayed
 * back to them as the answer. Idempotent: a ticket resolves once.
 */
export async function syncFeedbackResolutions(
  userId: string
): Promise<AppNotification[]> {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (!token) return [];

  const openTickets = await prisma.feedbackTicket.findMany({
    where: { userId, state: "open" },
    orderBy: { openedAt: "desc" },
  });
  if (openTickets.length === 0) return [];

  const created: AppNotification[] = [];
  for (const ticket of openTickets) {
    let issue: GithubIssue;
    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${ticket.repo}/issues/${ticket.issueNumber}`,
        { headers: githubHeaders(token) }
      );
      if (!response.ok) continue;
      issue = (await response.json()) as GithubIssue;
    } catch {
      continue;
    }
    if (issue.state !== "closed") continue;

    // Who the report belongs to, per the issue itself. Handles are unique and
    // never change, so this is a stable id; an unknown or absent line keeps the
    // ticket on its current account.
    const reporterId = await creditedReporter(ticket.userId, issue.body);
    const message = await closingMessage(ticket, issue, token);

    await prisma.feedbackTicket.update({
      where: { id: ticket.id },
      data: {
        userId: reporterId,
        state: "closed",
        closedMessage: message,
        closedAt: new Date(),
      },
    });

    // Nothing written to say: resolved, but there is no message to relay. The
    // badge still counts the closed ticket on the reporter's next read.
    if (!message) continue;

    const id = `feedback:${ticket.issueNumber}:closed`;
    const app: AppNotification = {
      id,
      type: "feedback_closed",
      title: "Feedback resolved",
      body: message,
      link: issue.html_url ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    // Upgrade a legacy `feedback:<n>` row (which a submission previously
    // created as "received") and keep this row typed as a resolution even if
    // it already exists — both so the bell shows the real closing message.
    await prisma.notification.upsert({
      where: { userId_localKey: { userId: reporterId, localKey: id } },
      create: {
        userId: reporterId,
        localKey: id,
        type: "feedback_closed",
        title: app.title,
        body: message,
        link: app.link,
      },
      update: {
        type: "feedback_closed",
        title: app.title,
        body: message,
        link: app.link,
      },
    });
    // Only the caller's own resolutions belong in their response; a ticket
    // moved to the account named by the issue is that account's to receive.
    if (reporterId === userId) created.push(app);
  }
  return created;
}

/**
 * The account a feedback issue belongs to: the "Account: @handle" line the
 * feedback route appends after the reporter's text, resolved to a user.
 * The LAST such line is the route's own, because it is written after anything
 * a reporter typed. Falls back to the ticket's current owner when the line is
 * missing or names an account that no longer exists.
 */
async function creditedReporter(
  ticketOwnerId: string,
  body: string | null | undefined
): Promise<string> {
  if (!body) return ticketOwnerId;
  const matches = [...body.matchAll(/Account:\*\*\s*`?@?([a-z0-9-]+)/gi)];
  const handle = matches[matches.length - 1]?.[1];
  if (!handle) return ticketOwnerId;
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  return user?.id ?? ticketOwnerId;
}

/**
 * The author's closing comment, if there is one. `issue.user.login` is the
 * account the site's GitHub token files under, so only its comments are an
 * answer — a reporter replying on the issue is not the author resolving it.
 * Returns null when the issue was closed with nothing written.
 */
async function closingMessage(
  ticket: { repo: string; issueNumber: number },
  issue: GithubIssue,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${ticket.repo}/issues/${ticket.issueNumber}/comments`,
      { headers: githubHeaders(token) }
    );
    if (!response.ok) return null;
    const comments = (await response.json()) as GithubComment[];
    const author = issue.user?.login;
    for (let index = comments.length - 1; index >= 0; index -= 1) {
      const body = comments[index]?.body?.trim();
      if (!body) continue;
      if (author && comments[index].user?.login !== author) continue;
      return body;
    }
    return null;
  } catch {
    // No comment reachable — treated as "resolved without a message".
    return null;
  }
}

function safeDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
