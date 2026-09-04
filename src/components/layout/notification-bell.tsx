"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, MessageSquareText, PartyPopper, Sparkles, LifeBuoy } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BADGES } from "@/lib/badges";
import {
  useNotificationsStore,
  unreadCount,
} from "@/lib/notification-store";
import type { AppNotification, NotificationType } from "@/lib/notification-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  update: Sparkles,
  badge: PartyPopper,
  feedback_received: MessageSquareText,
  feedback_closed: LifeBuoy,
};

function relativeTime(iso: string, now: number): string {
  const diff = now - Date.parse(iso);
  if (!Number.isFinite(diff)) return "";
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 60) return "<1m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const badgeT = useTranslations("badge");
  const router = useRouter();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [open, setOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  const notifications = useNotificationsStore((s) => s.notifications);
  const hydrated = useNotificationsStore((s) => s.hydrated);
  const unread = unreadCount({ notifications });

  // Refresh relative timestamps occasionally while open.
  React.useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [open]);

  const titleFor = (n: AppNotification): string => {
    if (n.type === "badge") {
      // Stored title is the badge id — localize from the badge catalog, with a
      // graceful fallback to the stored text if the id is unknown.
      const known = BADGES.some((b) => b.id === n.title);
      return known ? badgeT(`${n.title}.name`) : n.title;
    }
    switch (n.type) {
      case "feedback_received":
        return t("feedbackReceived");
      case "feedback_closed":
        return t("feedbackClosed");
      case "update":
        return t("siteUpdate");
      default:
        return n.title;
    }
  };

  const openNotification = (n: AppNotification) => {
    if (!n.read) useNotificationsStore.getState().markRead(n.id);
    const url = n.link || null;
    setOpen(false);
    if (url && url.startsWith("/")) {
      router.push(url);
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    useNotificationsStore.getState().markAllRead();
    if (signedIn && ids.length > 0) {
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markRead: ids }),
      }).catch(() => null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("ariaLabel")}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4" />
          {hydrated && unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell;
                const unreadItem = !n.read;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                        unreadItem ? "bg-accent/30" : ""
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          unreadItem ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              unreadItem ? "" : "text-muted-foreground"
                            )}
                          >
                            {titleFor(n)}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(n.createdAt, now)}
                          </span>
                        </span>
                        {n.body ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                            {n.body}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
