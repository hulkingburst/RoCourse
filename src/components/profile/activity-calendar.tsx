"use client";

import * as React from "react";
import { dayKey } from "@/lib/streak";
import { cn } from "@/lib/utils";

const WEEK_ABBREV = ["S", "M", "T", "W", "T", "F", "S"];

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const CELL_COLORS = [
  "bg-muted",
  "bg-orange-200 dark:bg-orange-500/30",
  "bg-orange-300 dark:bg-orange-500/50",
  "bg-orange-400 dark:bg-orange-500/70",
  "bg-orange-500",
];

/** The last 7 days, oldest first. */
function buildWeek(): { date: Date; key: string }[] {
  const days: { date: Date; key: string }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    days.push({ date, key: dayKey(date) });
  }
  return days;
}

/** A compact strip of the last week, shaded by activity per day. */
export function ActivityCalendar({
  activityDays,
}: {
  activityDays: Record<string, number>;
}) {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const week = React.useMemo(() => buildWeek(), []);
  const lookup = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, count] of Object.entries(activityDays)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) map.set(key, count);
    }
    return map;
  }, [activityDays]);

  if (!mounted) return null;

  const todayKey = dayKey(new Date());

  return (
    <div>
      <div className="flex items-end justify-between">
        {week.map((cell) => {
          const count = lookup.get(cell.key) ?? 0;
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key}
              className="flex w-10 flex-col items-center gap-1.5"
              title={`${cell.date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}${count > 0 ? ` — ${count} ${count === 1 ? "activity" : "activities"}` : " — no activity"}`}
            >
              <span className="text-xs text-muted-foreground">
                {WEEK_ABBREV[cell.date.getDay()]}
              </span>
              <span
                className={cn(
                  "h-8 w-8 rounded-lg",
                  CELL_COLORS[level(count)],
                  isToday && "ring-1 ring-ring"
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        {CELL_COLORS.map((color, index) => (
          <span key={index} className={cn("h-2 w-2 rounded-[2px]", color)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
