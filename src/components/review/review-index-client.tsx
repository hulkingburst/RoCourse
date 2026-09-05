"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { useProgressStore } from "@/lib/progress-store";

/**
 * Overview of the learner's outstanding review items: every lesson that has
 * at least one step answered wrong and not yet solved again. Links into
 * `/review/[slug]`, where each missed step is re-answered with the exact same
 * activity components used in the lesson.
 */
export function ReviewIndexClient({
  lessonTitles,
}: {
  lessonTitles: Record<string, string>;
}) {
  const t = useTranslations("review");
  const missedSteps = useProgressStore((state) => state.missedSteps);
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const entries = React.useMemo(() => {
    return Object.entries(missedSteps)
      .filter(([, steps]) => steps.length > 0)
      .map(([slug, steps]) => ({
        slug,
        title: lessonTitles[slug] ?? slug,
        count: steps.length,
      }))
      .sort((a, b) => {
        const aCount = lessonTitles[a.slug] ? 0 : 1;
        const bCount = lessonTitles[b.slug] ? 0 : 1;
        return aCount - bCount || b.count - a.count;
      });
  }, [missedSteps, lessonTitles]);

  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!mounted ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <div className="space-y-1">
            <p className="font-semibold">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("count", { count: total })}
          </p>
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/review/${entry.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 transition-colors hover:bg-accent/60"
                >
                  <span className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{entry.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t("lessonCount", { count: entry.count })}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}