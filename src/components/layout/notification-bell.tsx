"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Bell, BellRing, CheckCheck, ExternalLink, MessageSquareText, PartyPopper, Sparkles, LifeBuoy, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selected, setSelected] = React.useState<AppNotification | null>(null);
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

  const descriptionFor = (n: AppNotification): string | null => {
    if (n.type === "badge") {
      const known = BADGES.some((b) => b.id === n.title);
      return known ? badgeT(`${n.title}.description`) : (n.body ?? null);
    }
    return n.body ?? null;
  };

  const openReader = (n: AppNotification) => {
    if (!n.read) useNotificationsStore.getState().markRead(n.id);
    setOpen(false);
    setSelected(n);
  };

  const closeReader = () => setSelected(null);

  const viewLink = (n: AppNotification) => {
    const url = n.link;
    if (!url) return;
    setSelected(null);
    if (url.startsWith("/")) {
      router.push(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const deleteNotification = (id: string) => {
    useNotificationsStore.getState().removeNotification(id);
    if (signedIn) {
      void fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      }).catch(() => null);
    }
    setSelected(null);
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
    <>
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
                    <li key={n.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => openReader(n)}
                        className={cn(
                          "flex w-full items-start gap-3 py-3 pl-4 pr-10 text-left transition-colors hover:bg-accent/60",
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
                      <button
                        type="button"
                        aria-label={t("delete")}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:flex group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={selected !== null} onOpenChange={(next) => { if (!next) closeReader(); }}>
        <DialogContent className="sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  {(() => {
                    const Icon = TYPE_ICONS[selected.type] ?? Bell;
                    return <Icon className="h-5 w-5 shrink-0 text-primary" />;
                  })()}
                  <span className="min-w-0 break-words">{titleFor(selected)}</span>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1 pt-1">
                  <BellRing className="h-3.5 w-3.5" />
                  {relativeTime(selected.createdAt, now)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[45vh] overflow-y-auto">
                {descriptionFor(selected) ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {descriptionFor(selected)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noBody")}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(selected.id)}
                >
                  <X className="h-4 w-4" />
                  {t("delete")}
                </Button>
                {selected.link ? (
                  <Button size="sm" onClick={() => viewLink(selected)}>
                    <ExternalLink className="h-4 w-4" />
                    {t("view")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void deleteNotification(selected.id)}>
                    {t("done")}
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
