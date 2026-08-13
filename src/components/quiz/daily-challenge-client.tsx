"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dailyChallenge");
  const quiz = useTranslations("quiz");
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

  const options = React.useMemo(() => {
    if (kind === "quiz" && question) {
      return [0, 1, 2, 3].map((i) =>
        quiz(`questions.${question.id}.options.${i}`)
      );
    }
    if (kind === "debug" && debugChallenge) {
      return [0, 1, 2, 3].map((i) =>
        t(`challenges.${debugChallenge.id}.options.${i}`)
      );
    }
    return [];
  }, [kind, question, debugChallenge, quiz, t]);

  React.useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      recordDailyChallengeCompleted();
    }
  }, [phase, recordDailyChallengeCompleted]);

  if (!mounted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("loading")}
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
        <h2 className="text-center text-2xl font-bold">{t("alreadyDone")}</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          {t("alreadyDoneBody")}
        </p>
        <p className="mt-6 text-center text-sm font-semibold text-orange-500">
          <Flame className="mr-1 inline h-4 w-4 fill-current" />
          {t("streak", { count: streak })}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quiz">{t("quickQuiz")}</Link>
          </Button>
          <Button asChild>
            <Link href="/lessons">{t("backToLessons")}</Link>
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
        <h1 className="text-center text-2xl font-bold">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground">
          {t("introBody")}
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
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t("introRuleFour", { count: dailyChallengesCompleted })}
          </li>
        </ul>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" onClick={() => setPhase("active")}>
            {t("takeChallenge")}
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Link
            href="/quiz"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("backToQuiz")}
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
          {isCorrect ? t("correct") : t("notQuite")}
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isCorrect
            ? t("doneBodyCorrect")
            : t("doneBodyWrong", { letter: OPTION_LETTERS[answer] })}
        </p>
        {debugChallenge ? (
          t.has(`challenges.${debugChallenge.id}.explanation`) && (
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
              {t(`challenges.${debugChallenge.id}.explanation`)}
            </p>
          )
        ) : (
          question &&
          quiz.has(`questions.${question.id}.explanation`) && (
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
              {quiz(`questions.${question.id}.explanation`)}
            </p>
          )
        )}
        {debugChallenge && (
          <p className="mt-4 text-center text-sm">
            <Link
              href={`/lessons/${debugChallenge.lessonSlug}`}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("learnAbout", {
                lesson: t(`challenges.${debugChallenge.id}.lessonLabel`),
              })}
            </Link>
          </p>
        )}
        <p className="mt-6 text-center text-sm font-semibold text-orange-500">
          <Flame className="mr-1 inline h-4 w-4 fill-current" />
          {t("streak", { count: streak })}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quiz">{t("quickQuiz")}</Link>
          </Button>
          <Button asChild>
            <Link href="/lessons">{t("backToLessons")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span>{t("todaysChallenge")}</span>
      </div>
      <div className="rounded-xl border bg-card p-6">
        {debugChallenge ? (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Bug className="h-4 w-4" />
              {t("debugThis")}
            </div>
            <div className="mt-3">
              <CodeBlock>
                <code className="language-luau">{debugChallenge.code}</code>
              </CodeBlock>
            </div>
            <p className="font-medium">
              {t(`challenges.${debugChallenge.id}.question`)}
            </p>
          </div>
        ) : (
          <p className="text-base font-medium leading-relaxed">
            {question && quiz(`questions.${question.id}.question`)}
          </p>
        )}

        <ChallengeOptions
          options={options}
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
                  {t("correct")}
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 text-destructive" />
                  {t("wrongAnswer", { letter: OPTION_LETTERS[answer] })}
                </>
              )}
            </div>
            {debugChallenge ? (
              <p className="mt-1 text-muted-foreground">
                {t(`challenges.${debugChallenge.id}.explanation`)}{" "}
                <Link
                  href={`/lessons/${debugChallenge.lessonSlug}`}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {t(`challenges.${debugChallenge.id}.lessonLabel`)}
                </Link>
                .
              </p>
            ) : (
              question &&
              quiz.has(`questions.${question.id}.explanation`) && (
                <p className="mt-1 text-muted-foreground">
                  {quiz(`questions.${question.id}.explanation`)}
                </p>
              )
            )}
          </div>
        )}

        {selected !== null && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setPhase("done")}>{t("finish")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
