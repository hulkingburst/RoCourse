import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { RETRACTED_NOTIFICATION_IDS } from "@/lib/notification-retractions";
import { scheduleNotificationSweeps } from "@/lib/notification-sweeps";
import type { AppNotification, NotificationType } from "@/lib/notification-types";
import {
  deleteNotifications,
  getUserNotifications,
  markNotificationsRead,
  pushNotificationBackup,
} from "@/lib/notifications-api";
import { PRIVATE_JSON_HEADERS } from "@/lib/private-json";
import { isSameOriginRequest } from "@/lib/same-origin";

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
  // Retractions and the author's feedback resolutions are scheduled, not run
  // here: this endpoint is polled, and both are throttled writes/GitHub calls
  // that the read must not wait on (see src/lib/notification-sweeps.ts). The
  // bell therefore answers from the stored backup alone, and a due sweep lands
  // in a later poll rather than in this response.
  scheduleNotificationSweeps(session.user.id);
  const state = await getUserNotifications(session.user.id);
  // A retracted notification must never be shown, and that guarantee cannot
  // depend on the background sweep having run yet: the read filters them out
  // itself (no write on this path), so a poll can be early but never wrong.
  const retracted = new Set<string>(RETRACTED_NOTIFICATION_IDS);
  const notifications = state.notifications.filter((n) => !retracted.has(n.id));
  return NextResponse.json(
    {
      notifications,
      lastUpdated: notifications[0]?.createdAt ?? null,
    },
    { headers: PRIVATE_JSON_HEADERS }
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

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
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

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
