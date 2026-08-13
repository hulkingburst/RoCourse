import {
  BADGES,
  BADGE_TIER_STYLES,
  type BadgeStats,
} from "@/lib/badges";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Lock, Trophy } from "lucide-react";

/** Achievement grid. Pure presentational — safe to render in both server and
 * client components. */
export function BadgesSection({ stats }: { stats: BadgeStats }) {
  const t = useTranslations("badge");
  const labels = useTranslations("badges");
  const earnedCount = BADGES.filter((badge) => badge.earned(stats)).length;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-primary" />
          {labels("title")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {labels("earned", { earned: earnedCount, total: BADGES.length })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
        {BADGES.map((badge) => {
          const earned = badge.earned(stats);
          const Icon = badge.icon;
          const tierStyles = BADGE_TIER_STYLES[badge.tier];
          return (
            <div
              key={badge.id}
              title={`${t(`${badge.id}.name`)} — ${t(`${badge.id}.description`)}`}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                earned
                  ? "border-border bg-card shadow-sm"
                  : "border-border/60 bg-muted/30 opacity-55"
              )}
            >
              <div
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full ring-1",
                  earned
                    ? tierStyles.ring
                    : "ring-border/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    earned ? tierStyles.icon : "text-muted-foreground/70"
                  )}
                />
                {!earned && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </span>
                )}
              </div>
              <div className="text-xs font-medium leading-tight">{t(`${badge.id}.name`)}</div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                {t(`${badge.id}.description`)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
