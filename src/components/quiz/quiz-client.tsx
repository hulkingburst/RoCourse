"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  ListChecks,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QUIZ_QUESTIONS, QUIZ_SIZE } from "@/lib/quiz-data";
import type { QuizQuestion } from "@/lib/quiz-data";
import { useProgressStore } from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const OPTION_LETTERS = ["A", "B", "C", "D"];

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

/** Draws a fresh quiz: random questions with shuffled option positions. */
function drawQuestions(): DrawnQuestion[] {
  const picked = shuffle(QUIZ_QUESTIONS).slice(
    0,
    Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length)
  );
  return picked.map((question) => ({
    ...question,
    order: shuffle([0, 1, 2, 3]),
  }));
}

type Phase = "intro" | "active" | "done";

export function QuizClient() {
  const t = useTranslations("quiz");
  const quickQuizzesCompleted = useProgressStore(
    (state) => state.quickQuizzesCompleted
  );
  const recordQuickQuizCompleted = useProgressStore(
    (state) => state.recordQuickQuizCompleted
  );
  const streak = useProgressStore((state) => state.streak);

  const [phase, setPhase] = React.useState<Phase>("intro");
  const [questions, setQuestions] = React.useState<DrawnQuestion[]>([]);
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [answered, setAnswered] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const reportedRef = React.useRef(false);

  React.useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      recordQuickQuizCompleted();
    }
  }, [phase, recordQuickQuizCompleted]);

  const startQuiz = () => {
    setQuestions(drawQuestions());
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    reportedRef.current = false;
    setPhase("active");
  };

  const pick = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    setAnswered(true);
    const current = questions[index];
    if (current && optionIndex === current.order.indexOf(current.answer)) {
      setCorrectCount((count) => count + 1);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setPhase("done");
    } else {
      setIndex((value) => value + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (phase === "intro") {
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-xl font-bold">{t("title")}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("introCount", {
            bank: QUIZ_QUESTIONS.length,
            size: Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length),
          })}
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
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={startQuiz}>
            {t("start")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href="/quiz/daily"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <CalendarDays className="h-4 w-4" />
            {t("dailyLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const total = questions.length;
    const percent =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const messageKey =
      percent === 100
        ? "resultPerfect"
        : percent >= 70
          ? "resultGreat"
          : percent >= 40
            ? "resultDecent"
            : "resultLow";

    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">
          {t("result", { correct: correctCount, total })}
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {percent}% · {t(messageKey)}
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={startQuiz}>
            <RotateCcw className="h-4 w-4" />
            {t("playAgain")}
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("miniQuizzesCompleted")}{" "}
          <span className="font-semibold text-foreground">
            {quickQuizzesCompleted}
          </span>
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

  const question = questions[index];
  if (!question) return null;

  const correctDisplay = question.order.indexOf(question.answer);
  const isCorrect = selected === correctDisplay;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("questionProgress", {
            current: index + 1,
            total: questions.length,
          })}
        </span>
        <span className="font-medium text-primary">
          {t("correctCount", { count: correctCount })}
        </span>
      </div>
      <Progress value={(index / questions.length) * 100} />

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
                  <HelpCircle className="h-4 w-4 text-destructive" />
                  {t("wrongAnswer", {
                    letter: OPTION_LETTERS[correctDisplay],
                  })}
                </>
              )}
            </div>
            {t.has(`questions.${question.id}.explanation`) && (
              <p className="mt-1 text-muted-foreground">
                {t(`questions.${question.id}.explanation`)}
              </p>
            )}
          </div>
        )}

        {answered && (
          <div className="mt-4 flex justify-end">
            <Button onClick={next}>
              {index + 1 >= questions.length
                ? t("seeResults")
                : t("nextQuestion")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
