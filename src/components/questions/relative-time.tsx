"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export function formatRelativeTime(
  iso: string,
  t: ReturnType<typeof useTranslations>,
  now = Date.now()
): string {
  const diff = now - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return t("justNow");
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("weeksAgo", { count: weeks });
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Renders a relative timestamp that refreshes every minute. The server and
 * client may disagree by a second or two at hydration, so the text node is
 * explicitly excluded from hydration matching. */
export function RelativeTime({ date }: { date: string }) {
  const t = useTranslations("relativeTime");
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span suppressHydrationWarning>{formatRelativeTime(date, t)}</span>
  );
}
