"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";
import { BADGES, BADGE_TIER_STYLES, type BadgeTier } from "@/lib/badges";
import { useNotificationsStore } from "@/lib/notification-store";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 8000;
const TIER_KEYS: Record<BadgeTier, string> = {
  bronze: "tierBronze",
  silver: "tierSilver",
  gold: "tierGold",
};

const CONFETTI_COLORS = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#8b5cf6"];

/**
 * Lightweight non-blocking popup shown once for each badge earned during the
 * current session (see use-notifications for the baseline gating). Queues are
 * consumed FIFO one at a time; auto-dismiss pauses on hover. Reduced-motion
 * users see the card without entry/confetti animation.
 */
export function BadgeCelebration() {
  const t = useTranslations("badges");
  const badgeT = useTranslations("badge");
  const queue = useNotificationsStore((s) => s.celebrations);
  const [paused, setPaused] = React.useState(false);

  const currentId = queue[0] ?? null;
  const current = React.useMemo(
    () => (currentId ? BADGES.find((badge) => badge.id === currentId) : undefined),
    [currentId]
  );

  // Auto-dismiss, paused while the pointer rests on the card.
  React.useEffect(() => {
    if (!currentId || paused) return;
    const timer = window.setTimeout(() => {
      useNotificationsStore.getState().removeCelebration(currentId);
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [currentId, paused]);

  // Small celebration confetti, seeded per badge so it doesn't reshuffle
  // between renders. Globally disabled for prefers-reduced-motion.
  const pieces = React.useMemo(
    () =>
      current
        ? Array.from({ length: 14 }, (_, id) => ({
            id,
            left: (id * 37 + current.id.length * 13) % 92 + 4,
            delay: (id % 5) * 0.12,
            duration: 1.8 + (id % 3) * 0.5,
            drift: ((id % 7) - 3) * 30,
            size: 5 + (id % 4) * 2,
            color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
          }))
        : [],
    [current]
  );

  if (!current) return null;

  const tierStyle = BADGE_TIER_STYLES[current.tier];
  const TierIcon = current.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-50 w-[min(22rem,calc(100vw-2rem))]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none relative overflow-hidden rounded-2xl border bg-card p-4 shadow-lg">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {pieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece absolute rounded-[2px]"
              style={{
                left: `${piece.left}%`,
                top: "-2rem",
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                ["--drift" as string]: `${piece.drift}px`,
              }}
            />
          ))}
        </div>
        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1",
              tierStyle.ring
            )}
          >
            <TierIcon className={cn("h-6 w-6", tierStyle.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("badgeEarned")}
            </p>
            <p className="mt-0.5 truncate font-bold">
              {badgeT(`${current.id}.name`)}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                tierStyle.ring,
                tierStyle.icon
              )}
            >
              {t(TIER_KEYS[current.tier])}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              useNotificationsStore.getState().removeCelebration(currentId)
            }
            aria-label={t("close")}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="relative mt-2 line-clamp-2 text-sm text-muted-foreground">
          {badgeT(`${current.id}.description`)}
        </p>
        <div className="relative mt-3 flex justify-end">
          <Link
            href="/profile"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("viewAchievements")}
          </Link>
        </div>
      </div>
    </div>
  );
}