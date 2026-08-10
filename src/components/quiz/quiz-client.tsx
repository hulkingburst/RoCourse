"use client";

import * as React from "react";
import Link from "next/link";
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

/** Draws a fresh quiz: random questions with shuffled option positions. */
function drawQuestions(): QuizQuestion[] {
  const picked = shuffle(QUIZ_QUESTIONS).slice(
    0,
    Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length)
  );
  return picked.map((question) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      ...question,
      options: order.map((i) => question.options[i]) as QuizQuestion["options"],
      answer: order.indexOf(question.answer),
    };
  });
}

type Phase = "intro" | "active" | "done";

export function QuizClient() {
  const quickQuizzesCompleted = useProgressStore(
    (state) => state.quickQuizzesCompleted
  );
  const recordQuickQuizCompleted = useProgressStore(
    (state) => state.recordQuickQuizCompleted
  );
  const streak = useProgressStore((state) => state.streak);

  const [phase, setPhase] = React.useState<Phase>("intro");
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
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
    if (optionIndex === questions[index]?.answer) {
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
        <h2 className="text-center text-xl font-bold">Quick quiz</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {QUIZ_QUESTIONS.length} questions in the bank — each quiz draws{" "}
          {Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length)} random ones.
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            One question at a time, one answer — A, B, C or D.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            See the right answer instantly, with a quick explanation.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Every finished quiz counts toward your profile total.
          </li>
        </ul>
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={startQuiz}>
            Start quiz
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href="/quiz/daily"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <CalendarDays className="h-4 w-4" />
            Or try today&apos;s daily challenge
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const total = questions.length;
    const percent =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const message =
      percent === 100
        ? "Perfect score — you know your Luau."
        : percent >= 70
          ? "Great work! A couple of gaps to polish."
          : percent >= 40
            ? "Decent start — review the lessons you missed."
            : "Keep practicing — the lessons will fill these gaps.";

    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">
          {correctCount} / {total} correct
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {percent}% · {message}
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={startQuiz}>
            <RotateCcw className="h-4 w-4" />
            Play again
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Mini quizzes completed:{" "}
          <span className="font-semibold text-foreground">
            {quickQuizzesCompleted}
          </span>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Flame className="mr-1 inline h-3.5 w-3.5 text-orange-500" />
          Day streak:{" "}
          <span className="font-semibold text-foreground">
            {streak} {streak === 1 ? "day" : "days"}
          </span>
        </p>
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;

  const isCorrect = selected === question.answer;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="font-medium text-primary">
          {correctCount} correct
        </span>
      </div>
      <Progress value={(index / questions.length) * 100} />

      <div className="rounded-xl border bg-card p-6">
        <p className="text-base font-medium leading-relaxed">
          {question.question}
        </p>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, optionIndex) => {
            const isAnswer = optionIndex === question.answer;
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
                  Correct!
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 text-destructive" />
                  Not quite — the answer is {OPTION_LETTERS[question.answer]}.
                </>
              )}
            </div>
            {question.explanation && (
              <p className="mt-1 text-muted-foreground">
                {question.explanation}
              </p>
            )}
          </div>
        )}

        {answered && (
          <div className="mt-4 flex justify-end">
            <Button onClick={next}>
              {index + 1 >= questions.length ? "See results" : "Next question"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
