"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import {
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  ListChecks,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dailyChallengeKind,
  dailyDebugChallenge,
  dailyQuestion,
} from "@/lib/daily";
import { dayKey } from "@/lib/streak";
import { useProgressStore } from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/lessons/code-block";

const OPTION_LETTERS = ["A", "B", "C", "D"];

type Phase = "intro" | "active" | "done";

function ChallengeOptions({
  options,
  answer,
  selected,
  onPick,
}: {
  options: string[];
  answer: number;
  selected: number | null;
  onPick: (index: number) => void;
}) {
  const answered = selected !== null;
  return (
    <div className="mt-4 grid gap-2">
      {options.map((option, optionIndex) => {
        const isAnswer = optionIndex === answer;
        const isSelected = optionIndex === selected;
        return (
          <button
            key={optionIndex}
            type="button"
            onClick={() => onPick(optionIndex)}
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
  );
}

export function DailyChallengeClient() {
  const recordDailyChallengeCompleted = useProgressStore(
    (state) => state.recordDailyChallengeCompleted
  );
  const dailyChallengesCompleted = useProgressStore(
    (state) => state.dailyChallengesCompleted
  );
  const lastDailyChallengeDate = useProgressStore(
    (state) => state.lastDailyChallengeDate
  );
  const streak = useProgressStore((state) => state.streak);

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [phase, setPhase] = React.useState<Phase>("intro");
  const [selected, setSelected] = React.useState<number | null>(null);
  const reportedRef = React.useRef(false);

  // The challenge is fixed per local day; compute lazily so it survives renders.
  const todayKey = React.useMemo(() => dayKey(new Date()), []);
  const kind = React.useMemo(() => dailyChallengeKind(todayKey), [todayKey]);
  const question = React.useMemo(
    () => (kind === "quiz" ? dailyQuestion(todayKey) : null),
    [kind, todayKey]
  );
  const debugChallenge = React.useMemo(
    () => (kind === "debug" ? dailyDebugChallenge(todayKey) : null),
    [kind, todayKey]
  );

  React.useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      recordDailyChallengeCompleted();
    }
  }, [phase, recordDailyChallengeCompleted]);

  if (!mounted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading today&apos;s challenge…
      </div>
    );
  }

  const pick = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
  };

  const answer = debugChallenge ? debugChallenge.answer : question?.answer ?? 0;

  const completedToday = lastDailyChallengeDate === todayKey;

  if (phase !== "done" && completedToday) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">Already done today</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          You&apos;ve completed today&apos;s challenge. Come back tomorrow for a
          fresh one — same for everyone, once a day.
        </p>
        <p className="mt-6 text-center text-sm font-semibold text-orange-500">
          <Flame className="mr-1 inline h-4 w-4 fill-current" />
          {streak} {streak === 1 ? "day" : "days"} streak
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quiz">Quick quiz</Link>
          </Button>
          <Button asChild>
            <Link href="/lessons">Back to lessons</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-center text-2xl font-bold">Daily challenge</h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          One challenge, once a day — a quick question or a broken script to
          debug. Beat it to keep your streak alive.
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            A fresh challenge every day, same for everyone.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Some days it&apos;s a question, some days it&apos;s a script to fix.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Beating it feeds your streak even without a lesson.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Daily challenges completed:{" "}
            <span className="font-semibold text-foreground">
              {dailyChallengesCompleted}
            </span>
          </li>
        </ul>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" onClick={() => setPhase("active")}>
            Take today&apos;s challenge
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Link
            href="/quiz"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to the quick quiz
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const isCorrect = selected === answer;
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">
          {isCorrect ? "Correct!" : "Not quite."}
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isCorrect
            ? "Nice — today's challenge is done."
            : `The answer was ${OPTION_LETTERS[answer]} — come back tomorrow.`}
        </p>
        {debugChallenge?.explanation ? (
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
            {debugChallenge.explanation}
          </p>
        ) : (
          question?.explanation && (
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
              {question.explanation}
            </p>
          )
        )}
        {debugChallenge && (
          <p className="mt-4 text-center text-sm">
            <Link
              href={`/lessons/${debugChallenge.lessonSlug}`}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Learn about {debugChallenge.lessonLabel} →
            </Link>
          </p>
        )}
        <p className="mt-6 text-center text-sm font-semibold text-orange-500">
          <Flame className="mr-1 inline h-4 w-4 fill-current" />
          {streak} {streak === 1 ? "day" : "days"} streak
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quiz">Quick quiz</Link>
          </Button>
          <Button asChild>
            <Link href="/lessons">Back to lessons</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span>Today&apos;s challenge</span>
      </div>
      <div className="rounded-xl border bg-card p-6">
        {debugChallenge ? (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Bug className="h-4 w-4" />
              Debug this script
            </div>
            <div className="mt-3">
              <CodeBlock>
                <code className="language-luau">{debugChallenge.code}</code>
              </CodeBlock>
            </div>
            <p className="font-medium">{debugChallenge.question}</p>
          </div>
        ) : (
          <p className="text-base font-medium leading-relaxed">
            {question?.question}
          </p>
        )}

        <ChallengeOptions
          options={debugChallenge?.options ?? question?.options ?? []}
          answer={answer}
          selected={selected}
          onPick={pick}
        />

        {selected !== null && (
          <div
            className={cn(
              "mt-4 rounded-lg border p-3 text-sm",
              selected === answer
                ? "border-success/40 bg-success/5"
                : "border-destructive/40 bg-destructive/5"
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {selected === answer ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Correct!
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 text-destructive" />
                  Not quite — the answer is {OPTION_LETTERS[answer]}.
                </>
              )}
            </div>
            {debugChallenge ? (
              <p className="mt-1 text-muted-foreground">
                {debugChallenge.explanation}{" "}
                <Link
                  href={`/lessons/${debugChallenge.lessonSlug}`}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {debugChallenge.lessonLabel}
                </Link>
                .
              </p>
            ) : (
              question?.explanation && (
                <p className="mt-1 text-muted-foreground">
                  {question.explanation}
                </p>
              )
            )}
          </div>
        )}

        {selected !== null && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setPhase("done")}>Finish</Button>
          </div>
        )}
      </div>
    </div>
  );
}
