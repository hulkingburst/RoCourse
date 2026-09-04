import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { AppNotification, NotificationType } from "@/lib/notification-types";
import {
  deleteNotifications,
  getUserNotifications,
  markNotificationsRead,
  pushNotificationBackup,
  syncFeedbackResolutions,
} from "@/lib/notifications-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: NotificationType[] = [
  "update",
  "badge",
  "feedback_received",
  "feedback_closed",
];

const MAX_BODY = 2000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  // Running the close-sync here means simply opening the app surfaces any
  // feedback that the author has since resolved.
  await syncFeedbackResolutions(session.user.id);
  const state = await getUserNotifications(session.user.id);
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Mark-seen payload: { markRead: string[] }
  if (
    typeof (body as { markRead?: unknown })?.markRead !== "undefined"
  ) {
    const markRead = (body as { markRead: unknown }).markRead;
    if (!Array.isArray(markRead) || markRead.length > 200) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const ids = markRead.filter(
      (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200
    );
    if (ids.length > 0) await markNotificationsRead(session.user.id, ids);
    return NextResponse.json({ ok: true });
  }

  // Backup-push payload: { notifications: AppNotification[] }
  const notifications = (body as { notifications?: unknown }).notifications;
  if (!Array.isArray(notifications) || notifications.length > 200) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const clean: AppNotification[] = [];
  for (const raw of notifications) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    const type = n.type;
    if (
      typeof n.id !== "string" ||
      n.id.length === 0 ||
      n.id.length > 200 ||
      !VALID_TYPES.includes(type as NotificationType) ||
      typeof n.title !== "string" ||
      n.title.length === 0 ||
      n.title.length > 200 ||
      typeof n.createdAt !== "string"
    ) {
      continue;
    }
    clean.push({
      id: n.id,
      type: type as NotificationType,
      title: n.title,
      body: typeof n.body === "string" && n.body.length > 0 ? n.body.slice(0, MAX_BODY) : null,
      link: typeof n.link === "string" && n.link.length > 0 ? n.link.slice(0, 1000) : null,
      createdAt: n.createdAt,
      read: n.read === true,
    });
  }

  await pushNotificationBackup(session.user.id, clean);
  return NextResponse.json({ ok: true, backedUp: clean.map((n) => n.id) });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length > 200) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const clean = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200
  );
  if (clean.length > 0) await deleteNotifications(session.user.id, clean);
  return NextResponse.json({ ok: true });
}
