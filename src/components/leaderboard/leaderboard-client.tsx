"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Pencil,
  Zap,
} from "lucide-react";
import type { LeaderboardRow } from "@/app/api/leaderboard/route";
import { Link } from "@/i18n/navigation";
import { useGuestStore } from "@/lib/guest-store";
import { useProgressStore } from "@/lib/progress-store";
import { weekKey } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RANK_COLORS = [
  "text-yellow-600 bg-yellow-500/10 ring-yellow-500/30",
  "text-slate-400 bg-slate-400/10 ring-slate-400/30",
  "text-amber-700 bg-amber-500/10 ring-amber-500/30",
];

function shiftWeek(week: string, offset: number): string {
  const [y, m, d] = week.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset * 7);
  return weekKey(date);
}

export function LeaderboardClient() {
  const t = useTranslations("leaderboard");
  const { data: session, status } = useSession();
  const guestId = useGuestStore((state) => state.guestId);
  const guestName = useGuestStore((state) => state.name);
  const setName = useGuestStore((state) => state.setName);
  const myWeeklyXp = useProgressStore((state) => state.weeklyXp[weekKey(new Date())] ?? 0);

  const currentWeek = React.useMemo(() => weekKey(new Date()), []);
  const [week, setWeek] = React.useState(currentWeek);
  const [data, setData] = React.useState<{
    week: string;
    rows: LeaderboardRow[];
  } | null>(null);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const [nameInput, setNameInput] = React.useState(guestName);
  const [editing, setEditing] = React.useState(!guestName);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?week=${week}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((next: { rows: LeaderboardRow[] }) => {
        if (cancelled) return;
        setData({ week, rows: next.rows });
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [week, retry]);

  const loading = !error && (data === null || data.week !== week);
  const rows = data?.week === week ? data.rows : [];

  const isMe = (row: LeaderboardRow) =>
    status === "authenticated"
      ? row.handle === session?.user?.handle
      : status === "unauthenticated" && row.guestId === guestId;

  const saveName = () => {
    const name = nameInput.trim();
    if (!name) return;
    setName(name);
    setEditing(false);
  };

  const weekLabel = (() => {
    const [y, m, d] = week.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("thisWeek")}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeek(shiftWeek(week, -1))}
              aria-label={t("prevWeek")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-40 text-center text-sm font-medium">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeek(shiftWeek(week, 1))}
              disabled={week === currentWeek}
              aria-label={t("nextWeek")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {myWeeklyXp > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {t("yourXp", { xp: myWeeklyXp })}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
            <Button variant="outline" size="sm" onClick={() => setRetry((r) => r + 1)}>
              {t("retry")}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  isMe(row) && "border-primary/50 bg-accent/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1",
                    index < 3
                      ? RANK_COLORS[index]
                      : "text-muted-foreground ring-transparent"
                  )}
                >
                  {index < 3 ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {row.handle ? (
                    <Link
                      href={`/u/${row.handle}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                </span>
                {isMe(row) && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {t("you")}
                  </span>
                )}
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  {row.xp}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {status === "unauthenticated" && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("guestNameLabel")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("guestNameHint")}</p>
          {editing ? (
            <div className="mt-3 flex gap-2">
              <Input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder={t("guestNamePlaceholder")}
                maxLength={24}
                className="max-w-xs"
              />
              <Button onClick={saveName} disabled={!nameInput.trim()}>
                {t("saveName")}
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span>
                {t("playingAs")} <span className="font-semibold">{guestName}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNameInput(guestName);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("editName")}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
