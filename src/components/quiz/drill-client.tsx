"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  ListChecks,
  RotateCcw,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DRILL_QUESTIONS, DRILL_TIME_SECONDS } from "@/lib/quiz-data";
import type { QuizQuestion } from "@/lib/quiz-data";
import { useProgressStore } from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const OPTION_LETTERS = ["A", "B", "C", "D"];
/** How long the correct/incorrect feedback shows before auto-advancing. */
const ADVANCE_DELAY_MS = 700;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A drawn question plus the order its options should display in. */
type DrawnQuestion = QuizQuestion & { order: number[] };

/** A shuffled pool of drill questions. Refilled whenever the deck runs out. */
function drawPool(): DrawnQuestion[] {
  return shuffle(DRILL_QUESTIONS).map((question) => ({
    ...question,
    order: shuffle([0, 1, 2, 3]),
  }));
}

type Phase = "intro" | "active" | "done";

export function DrillClient() {
  const t = useTranslations("drill");
  const drillsPlayed = useProgressStore((state) => state.drillsPlayed);
  const drillHighScore = useProgressStore((state) => state.drillHighScore);
  const recordDrillCompleted = useProgressStore(
    (state) => state.recordDrillCompleted
  );
  const streak = useProgressStore((state) => state.streak);

  const [phase, setPhase] = React.useState<Phase>("intro");
  const [queue, setQueue] = React.useState<DrawnQuestion[]>([]);
  const [timeLeft, setTimeLeft] = React.useState(DRILL_TIME_SECONDS);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [answered, setAnswered] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [isNewBest, setIsNewBest] = React.useState(false);

  const endTimeRef = React.useRef(0);
  const correctRef = React.useRef(0);
  const advanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const finishedRef = React.useRef(false);
  const reportedRef = React.useRef(false);

  const finish = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    const previousBest = useProgressStore.getState().drillHighScore;
    setIsNewBest(correctRef.current > previousBest);
    setPhase("done");
  }, []);

  React.useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) finish();
    }, 200);
    return () => clearInterval(interval);
  }, [phase, finish]);

  React.useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      recordDrillCompleted(correctRef.current);
    }
  }, [phase, recordDrillCompleted]);

  React.useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const startDrill = () => {
    finishedRef.current = false;
    reportedRef.current = false;
    setQueue(drawPool());
    setTimeLeft(DRILL_TIME_SECONDS);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    correctRef.current = 0;
    setIsNewBest(false);
    endTimeRef.current = Date.now() + DRILL_TIME_SECONDS * 1000;
    setPhase("active");
  };

  const advance = () => {
    setQueue((current) => {
      const [, ...rest] = current;
      return rest.length > 0 ? rest : drawPool();
    });
    setSelected(null);
    setAnswered(false);
  };

  const pick = (optionIndex: number) => {
    if (answered || finishedRef.current) return;
    const current = queue[0];
    setSelected(optionIndex);
    setAnswered(true);
    if (current && optionIndex === current.order.indexOf(current.answer)) {
      setCorrectCount((count) => count + 1);
      correctRef.current += 1;
    }
    advanceTimerRef.current = setTimeout(advance, ADVANCE_DELAY_MS);
  };

  if (phase === "intro") {
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Timer className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-xl font-bold">{t("title")}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("introCount", { bank: DRILL_QUESTIONS.length })}
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t("introRuleOne")}
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t("introRuleTwo")}
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t("introRuleThree")}
          </li>
        </ul>
        <p className="mt-6 text-center text-sm">
          <Trophy className="mr-1 inline h-4 w-4 text-yellow-500" />
          {t("bestScore", { count: drillHighScore })}
        </p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={startDrill}>
            {t("start")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            <ListChecks className="h-4 w-4" />
            {t("quickQuizLink")}
          </Link>
          <Link
            href="/quiz/daily"
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            <CalendarDays className="h-4 w-4" />
            {t("dailyLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const messageKey =
      correctCount >= 15
        ? "resultElite"
        : correctCount >= 10
          ? "resultSolid"
          : "resultPractice";
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">
          {t("result", { count: correctCount })}
        </h2>
        {isNewBest ? (
          <p className="mt-2 text-center text-sm font-medium text-yellow-600 dark:text-yellow-400">
            <Trophy className="mr-1 inline h-4 w-4" />
            {t("resultNewBest")}
          </p>
        ) : (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t("bestScore", { count: drillHighScore })}
          </p>
        )}
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {t(messageKey)}
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={startDrill}>
            <RotateCcw className="h-4 w-4" />
            {t("playAgain")}
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("drillsPlayed")}{" "}
          <span className="font-semibold text-foreground">{drillsPlayed}</span>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Flame className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
          {t("dayStreak")}{" "}
          <span className="font-semibold text-foreground">
            {t("day", { count: streak })}
          </span>
        </p>
      </div>
    );
  }

  const question = queue[0];
  if (!question) return null;

  const correctDisplay = question.order.indexOf(question.answer);
  const isCorrect = selected === correctDisplay;
  const lowTime = timeLeft <= 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span
          aria-label={t("timeLeft")}
          className={cn(
            "inline-flex items-center gap-1.5 font-medium tabular-nums",
            lowTime ? "text-destructive" : "text-primary"
          )}
        >
          <Timer className="h-4 w-4" />
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </span>
        <span className="font-medium text-primary tabular-nums">
          {t("correctCount", { count: correctCount })}
        </span>
      </div>
      <Progress
        value={(timeLeft / DRILL_TIME_SECONDS) * 100}
        className={cn(lowTime && "[&>div]:bg-destructive")}
      />

      <div className="rounded-xl border bg-card p-6">
        <p className="text-base font-medium leading-relaxed">
          {t(`questions.${question.id}.question`)}
        </p>
        <div className="mt-4 grid gap-2">
          {question.order.map((originalIndex, optionIndex) => {
            const option = t(
              `questions.${question.id}.options.${originalIndex}`
            );
            const isAnswer = optionIndex === correctDisplay;
            const isSelected = optionIndex === selected;
            return (
              <button
                key={optionIndex}
                type="button"
                onClick={() => pick(optionIndex)}
                disabled={answered}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  !answered &&
                    "cursor-pointer hover:border-primary/50 hover:bg-accent",
                  answered &&
                    isAnswer &&
                    "border-success/60 bg-success/10",
                  answered &&
                    isSelected &&
                    !isAnswer &&
                    "border-destructive/60 bg-destructive/10",
                  answered && !isAnswer && !isSelected && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                    answered &&
                      isAnswer &&
                      "border-success/60 text-success",
                    answered &&
                      isSelected &&
                      !isAnswer &&
                      "border-destructive/60 text-destructive"
                  )}
                >
                  {answered && isAnswer ? (
                    <CheckCircle2 className="h-3.5 w-3.5 -translate-y-px" />
                  ) : answered && isSelected && !isAnswer ? (
                    <XCircle className="h-3.5 w-3.5 -translate-y-px" />
                  ) : (
                    OPTION_LETTERS[optionIndex]
                  )}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={cn(
              "mt-4 rounded-lg border p-3 text-sm",
              isCorrect
                ? "border-success/40 bg-success/5"
                : "border-destructive/40 bg-destructive/5"
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t("correct")}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  {t("wrongAnswer", {
                    letter: OPTION_LETTERS[correctDisplay],
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
