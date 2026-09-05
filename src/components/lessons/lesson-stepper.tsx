"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepperContext } from "@/components/activities/activity-context";
import { useLesson } from "@/components/lessons/lesson-context";
import {
  isBookmarked,
  isLessonComplete,
  useProgressStore,
} from "@/lib/progress-store";
import { LockedLesson } from "@/components/lessons/locked-lesson";
import { StepCompletion } from "@/components/lessons/step-completion";
import { LessonMedalBadge } from "@/components/lessons/lesson-medal";

interface StepMeta {
  hasActivity: boolean;
}
interface LessonStepperProps {
  title: string;
  description: string;
  stepMetas: StepMeta[];
  activityCount: number;
  isFirstLesson: boolean;
  prevSlug: string | null;
  prevTitle: string | null;
  nextSlug: string | null;
  nextTitle: string | null;
  children: React.ReactNode;
}

/**
 * Renders a lesson one step at a time. Every step stays mounted (hidden) so
 * activity state survives moving back and forth. A step containing an activity
 * must be solved before "Continue" unlocks; the final step hands off to the
 * completion screen, which marks the lesson complete.
 */
export function LessonStepper({
  title,
  description,
  stepMetas,
  activityCount,
  isFirstLesson,
  prevSlug,
  prevTitle,
  nextSlug,
  nextTitle,
  children,
}: LessonStepperProps) {
  const { slug } = useLesson();
  const t = useTranslations("lesson");
  const lessons = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const recordView = useProgressStore((state) => state.recordView);
  const recordActivityResult = useProgressStore((state) => state.recordActivityResult);
  const updateMissedStep = useProgressStore((state) => state.updateMissedStep);
  const markLessonComplete = useProgressStore((state) => state.markLessonComplete);
  const toggleBookmark = useProgressStore((state) => state.toggleBookmark);
  const finishedPath = useProgressStore((state) => state.finishedPath);

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [active, setActive] = React.useState(0);
  const [maxActive, setMaxActive] = React.useState(0);
  const [solvedSteps, setSolvedSteps] = React.useState<Record<number, boolean>>({});
  const [phase, setPhase] = React.useState<"steps" | "done">("steps");
  const topRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    recordView(slug);
  }, [slug, recordView]);

  const complete = isLessonComplete(lessons, slug);
  const prevComplete = prevSlug ? isLessonComplete(lessons, prevSlug) : true;
  const locked = mounted && !complete && !isFirstLesson && !prevComplete;

  const total = stepMetas.length;
  const currentMeta = stepMetas[active] ?? { hasActivity: false };
  const canContinue = !currentMeta.hasActivity || complete || Boolean(solvedSteps[active]);
  const isLast = active === total - 1;

  const onResult = React.useCallback(
    (correct: boolean, firstTry?: boolean) => {
      recordActivityResult(slug, correct, correct && firstTry ? String(active) : null);
      // Keep the review ledger in sync: a wrong answer queues this step,
      // a correct answer resolves it.
      updateMissedStep(slug, active, correct);
      if (correct) {
        setSolvedSteps((current) => ({ ...current, [active]: true }));
      }
    },
    [slug, recordActivityResult, updateMissedStep, active]
  );

  const goTo = (index: number) => {
    if (index < 0 || index >= total) return;
    setActive(index);
    setMaxActive((current) => Math.max(current, index));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = () => {
    if (isLast) {
      markLessonComplete(slug);
      setPhase("done");
    } else {
      goTo(active + 1);
    }
  };

  const back = () => goTo(active - 1);

  const replay = React.useCallback(() => {
    setActive(0);
    setMaxActive(0);
    setSolvedSteps({});
    setPhase("steps");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /**
   * When the learner switches their final-project build (finishedPath goes
   * from a value back to null), restart the lesson from the choose step so the
   * new build is tackled fresh.
   */
  const prevFinishedPath = React.useRef(finishedPath);
  React.useEffect(() => {
    const prev = prevFinishedPath.current;
    prevFinishedPath.current = finishedPath;
    if (prev != null && finishedPath == null) {
      replay();
    }
  }, [finishedPath, replay]);

  const contextValue = React.useMemo<React.ComponentProps<typeof StepperContext.Provider>["value"]>(
    () => ({
      activeIndex: active,
      solved: complete || Boolean(solvedSteps[active]),
      onResult,
    }),
    [active, complete, solvedSteps, onResult]
  );

  if (locked) {
    return <LockedLesson prevSlug={prevSlug} prevTitle={prevTitle} title={title} />;
  }

  const bookmarked = isBookmarked(bookmarks, slug);

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LessonMedalBadge slug={slug} activityCount={activityCount} className="h-5 w-5" />
            {mounted && (
              <button
                type="button"
                onClick={() => toggleBookmark(slug)}
                aria-label={bookmarked ? t("removeBookmark") : t("bookmarkLesson")}
                className={cn(
                  "shrink-0 rounded-lg border p-2 transition-all duration-200 motion-reduce:transition-none active:scale-90 hover:scale-105",
                  bookmarked
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
              </button>
            )}
          </div>
        </div>

        {total > 1 && (
          <div className="mb-2 flex items-center gap-1.5">
            {stepMetas.map((meta, index) => {
              const stepDone = meta.hasActivity
                ? Boolean(solvedSteps[index]) || complete
                : index < active || complete;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => index <= maxActive && goTo(index)}
                  disabled={index > maxActive}
                  aria-label={t("goToStep", { step: index + 1 })}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300 motion-reduce:transition-none",
                    stepDone
                      ? "bg-success"
                      : index <= active
                        ? "bg-primary"
                        : "bg-muted",
                    index <= maxActive
                      ? "cursor-pointer hover:scale-y-125 hover:opacity-80"
                      : "cursor-not-allowed opacity-40"
                  )}
                />
              );
            })}
          </div>
        )}
        <div className="mb-5 text-xs font-medium text-muted-foreground">
          {t("stepOf", { current: active + 1, total })}
          {currentMeta.hasActivity && !complete && !solvedSteps[active] && (
            <span className="ml-2">• {t("activityHint")}</span>
          )}
        </div>

        {complete && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
            {t("alreadyCompleted")}
          </div>
        )}

        {phase === "done" ? (
          <StepCompletion
            slug={slug}
            title={title}
            nextSlug={nextSlug}
            nextTitle={nextTitle}
            onReplay={replay}
          />
        ) : (
          <>
            <div className="min-h-[220px]">
              <StepperContext.Provider value={contextValue}>
                {React.Children.toArray(children).map((child, index) => (
                  <div key={index} hidden={index !== active}>
                    {child}
                  </div>
                ))}
              </StepperContext.Provider>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
              <button
                type="button"
                onClick={back}
                disabled={active === 0}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-opacity",
                  canContinue
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                {isLast ? t("finishLesson") : t("continue")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
