import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Gamepad2, Trophy } from "lucide-react";
import { getLearnerShowcase } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learner Showcase — RoCourse Graduates",
  description:
    "Learners who finished the RoCourse and built a complete Roblox game. Join them — the course is free.",
  alternates: { canonical: "/showcase" },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ShowcasePage() {
  const t = await getTranslations("showcase");
  const entries = await getLearnerShowcase();
  const projectLabel: Record<string, string> = {
    tycoon: t("projectTycoon"),
    collector: t("projectCollector"),
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
          {t("wallOfFame")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>
        <Link
          href="/leaderboard"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <Trophy className="h-3.5 w-3.5" />
          {t("seeLeaderboard")}
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
          <Link
            href="/lessons/welcome"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("startCourse")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={`${entry.handle}-${entry.completedAt}`}
              href={`/u/${entry.handle}`}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-border hover:bg-accent/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {entry.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{entry.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t("finishedLine", {
                    courseTitle: entry.courseTitle,
                    date: formatDate(entry.completedAt),
                  })}
                </span>
              </span>
              {entry.project && (
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:flex">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  {t("builtLine", {
                    project: projectLabel[entry.project] ?? entry.project,
                  })}
                </span>
              )}
              <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-success sm:block" />
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" />
        {t("footerNote")}
      </p>
    </div>
  );
}
