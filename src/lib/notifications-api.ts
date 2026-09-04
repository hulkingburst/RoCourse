import { prisma } from "@/lib/prisma";
import type {
  AppNotification,
  NotificationState,
  NotificationType,
} from "@/lib/notification-types";

const GITHUB_API = "https://api.github.com";
const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

const VALID_TYPES: NotificationType[] = [
  "update",
  "badge",
  "feedback_received",
  "feedback_closed",
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

/**
 * Checks a signed-in user's submitted feedback issues against GitHub and, for
 * any that have since been closed, records a "feedback_closed" notification
 * whose message is the author's real closing comment from the issue (falling
 * back to the issue body when there is no comment) — never auto-generated
 * boilerplate. Idempotent: a ticket is only resolved once.
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
    let issue: { state?: string; body?: string | null; html_url?: string };
    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${ticket.repo}/issues/${ticket.issueNumber}`,
        { headers: githubHeaders(token) }
      );
      if (!response.ok) continue;
      issue = (await response.json()) as typeof issue;
    } catch {
      continue;
    }
    if (issue.state !== "closed") continue;

    // Read the latest ISSUE COMMENT — the author's real resolution message.
    let message: string | null = null;
    try {
      const commentsResponse = await fetch(
        `${GITHUB_API}/repos/${ticket.repo}/issues/${ticket.issueNumber}/comments`,
        { headers: githubHeaders(token) }
      );
      if (commentsResponse.ok) {
        const comments = (await commentsResponse.json()) as { body?: string }[];
        const latest = comments[comments.length - 1];
        if (latest?.body?.trim()) message = latest.body.trim();
      }
    } catch {
      // fall through to issue body
    }
    // Fall back to the issue's own body (the reporter's submitted message) so
    // there is always real text rather than generated boilerplate.
    if (!message) message = issue.body?.trim() || ticket.title;

    await prisma.feedbackTicket.update({
      where: { id: ticket.id },
      data: {
        state: "closed",
        closedMessage: message,
        closedAt: new Date(),
      },
    });

    const id = `feedback:${ticket.issueNumber}`;
    const app: AppNotification = {
      id,
      type: "feedback_closed",
      title: "Feedback resolved",
      body: message,
      link: issue.html_url ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await prisma.notification.upsert({
      where: { userId_localKey: { userId, localKey: id } },
      create: {
        userId,
        localKey: id,
        type: "feedback_closed",
        title: app.title,
        body: message,
        link: app.link,
      },
      update: { body: message, link: app.link },
    });
    created.push(app);
  }
  return created;
}

function safeDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
