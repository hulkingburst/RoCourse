"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StepperContext } from "@/components/activities/activity-context";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";

/**
 * Re-renders the steps a learner answered incorrectly in a lesson, using the
 * exact same activity components and split-step content as the lesson. Each
 * step gets its own StepperContext whose `onResult` only updates the review
 * ledger — it never touches XP, counters, streaks, or lesson completion. A
 * correct answer removes the step from the ledger and from this view.
 */
export function ReviewLesson({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode[];
}) {
  const t = useTranslations("review");
  const { slug } = useLesson();
  const missedSteps = useProgressStore((state) => state.missedSteps);
  const updateMissedStep = useProgressStore((state) => state.updateMissedStep);
  const hydrated = useProgressStore((state) => state.hydrated);

  const steps = React.Children.toArray(children);
  const missed = React.useMemo(() => {
    return (missedSteps[slug] ?? [])
      .filter((index) => index >= 0 && index < steps.length)
      .sort((a, b) => a - b);
  }, [missedSteps, slug, steps.length]);

  const onResultFor = React.useCallback(
    (step: number) => (correct: boolean) => {
      updateMissedStep(slug, step, correct);
    },
    [slug, updateMissedStep]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 space-y-4">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {hydrated && missed.length > 0 && (
          <p className="text-sm font-medium">{t("count", { count: missed.length })}</p>
        )}
      </div>

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      ) : missed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <div className="space-y-1">
            <p className="font-semibold">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("allCaughtUpLesson")}</p>
          </div>
        </div>
      ) : (
        <ol className="space-y-8">
          {missed.map((step) => (
            <li key={step}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("stepLabel", { step: step + 1 })}
              </div>
              <StepperContext.Provider
                value={{
                  activeIndex: step,
                  solved: false,
                  onResult: onResultFor(step),
                }}
              >
                {steps[step]}
              </StepperContext.Provider>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}