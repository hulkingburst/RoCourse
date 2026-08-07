"use client";

import * as React from "react";
import { dayKey } from "@/lib/streak";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["M", "", "W", "", "F", "", ""];
const WEEKS = 16;

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

interface DayCell {
  date: Date;
  key: string;
}

/** Builds trailing weeks as Monday-aligned columns, ending on/around today. */
function buildWeeks(): DayCell[][] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const weeks: DayCell[][] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week: DayCell[] = [];
    for (let day = 0; day < 7; day++) {
      week.push({ date: new Date(cursor), key: dayKey(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * GitHub-style activity heatmap for the trailing 16 weeks: one cell per day,
 * shaded by how many lessons/quizzes/challenges were finished that day.
 */
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

  const weeks = React.useMemo(() => buildWeeks(), []);
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
      <div className="flex gap-1.5">
        <div className="mr-0.5 flex flex-col gap-[3px] pr-1">
          {WEEK_DAYS.map((label, index) => (
            <span
              key={index}
              className="flex h-[10px] w-2 items-center text-[9px] text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((cell) => {
                const count = lookup.get(cell.key) ?? 0;
                const isToday = cell.key === todayKey;
                return (
                  <span
                    key={cell.key}
                    title={`${cell.date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}${count > 0 ? ` — ${count} ${count === 1 ? "activity" : "activities"}` : " — no activity"}`}
                    className={cn(
                      "h-[10px] w-[10px] rounded-[2px]",
                      CELL_COLORS[level(count)],
                      isToday && "ring-1 ring-ring"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
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
