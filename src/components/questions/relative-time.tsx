"use client";

import * as React from "react";

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
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
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 60_000);
    return () => clearInterval(interval);
  }, []);
  return <span suppressHydrationWarning>{formatRelativeTime(date)}</span>;
}
