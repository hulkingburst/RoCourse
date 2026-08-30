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
  dailyDebugChallengeId,
  dailyQuestionId,
} from "@/lib/daily";
import { DEBUG_CHALLENGES } from "@/lib/daily-debug";
import { dayKey } from "@/lib/streak";
import { useProgressStore } from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/lessons/code-block";

const OPTION_LETTERS = ["A", "B", "C", "D"];

type Phase = "intro" | "active" | "done";

function ChallengeOptions({
  options,
  result,
  selected,
  onPick,
  disabled,
}: {
  options: string[];
  result: boolean | null;
  selected: number | null;
  onPick: (index: number) => void;
  disabled?: boolean;
}) {
  const revealed = result !== null;
  return (
    <div className="mt-4 grid gap-2">
      {options.map((option, optionIndex) => {
        const isSelected = optionIndex === selected;
        const isCorrectPick = revealed && isSelected && result === true;
        const isWrongPick = revealed && isSelected && result === false;
        return (
          <button
            key={optionIndex}
            type="button"
            onClick={() => onPick(optionIndex)}
            disabled={disabled || revealed}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-150 motion-reduce:transition-none active:scale-[0.99]",
              !revealed && !disabled &&
                "cursor-pointer hover:border-primary/50 hover:bg-accent",
              revealed &&
                isCorrectPick &&
                "border-success/60 bg-success/10",
              revealed &&
                isWrongPick &&
                "border-destructive/60 bg-destructive/10",
              revealed && !isSelected && "opacity-50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                revealed &&
                  isCorrectPick &&
                  "border-success/60 text-success",
                revealed &&
                  isWrongPick &&
                  "border-destructive/60 text-destructive"
              )}
            >
              {revealed && isSelected ? (
                result === true ? (
                  <CheckCircle2 className="h-3.5 w-3.5 -translate-y-px" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 -translate-y-px" />
                )
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
  const [result, setResult] = React.useState<boolean | null>(null);
  const [grading, setGrading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const reportedRef = React.useRef(false);

  // The challenge is fixed per local day; compute lazily so it survives renders.
  const todayKey = React.useMemo(() => dayKey(new Date()), []);
  const kind = React.useMemo(() => dailyChallengeKind(todayKey), [todayKey]);
  const questionId = React.useMemo(
    () => (kind === "quiz" ? dailyQuestionId(todayKey) : null),
    [kind, todayKey]
  );
  const debugChallenge = React.useMemo(() => {
    if (kind !== "debug") return null;
    return (
      DEBUG_CHALLENGES.find((c) => c.id === dailyDebugChallengeId(todayKey)) ??
      null
    );
  }, [kind, todayKey]);

  const options = React.useMemo(() => {
    if (kind === "quiz" && questionId) {
      return [0, 1, 2, 3].map((i) =>
        quiz(`questions.${questionId}.options.${i}`)
      );
    }
    if (kind === "debug" && debugChallenge) {
      return [0, 1, 2, 3].map((i) =>
        t(`challenges.${debugChallenge.id}.options.${i}`)
      );
    }
    return [];
  }, [kind, questionId, debugChallenge, quiz, t]);

  // XP is only earned for getting the challenge right. The store itself guards
  // against double-awarding on the same day, so recording on the way to the
  // "done" phase is safe even across renders.
  React.useEffect(() => {
    if (phase === "done" && result === true && !reportedRef.current) {
      reportedRef.current = true;
      recordDailyChallengeCompleted();
    }
  }, [phase, result, recordDailyChallengeCompleted]);

  if (!mounted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  const pick = async (optionIndex: number) => {
    if (result !== null || grading) return;
    setSelected(optionIndex);
    setGrading(true);
    setError(false);
    try {
      const response = await fetch("/api/daily-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: todayKey, option: optionIndex }),
      });
      if (!response.ok) throw new Error("grading failed");
      const data = (await response.json()) as { correct: boolean };
      setResult(data.correct === true);
    } catch {
      // Allow the learner to retry without losing their pick.
      setSelected(null);
      setError(true);
    } finally {
      setGrading(false);
    }
  };

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
    const isCorrect = result === true;
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ListChecks className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-center text-2xl font-bold">
          {isCorrect ? t("correct") : t("notQuite")}
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isCorrect ? t("doneBodyCorrect") : t("doneBodyWrong")}
        </p>
        {debugChallenge ? (
          t.has(`challenges.${debugChallenge.id}.explanation`) && (
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
              {t(`challenges.${debugChallenge.id}.explanation`)}
            </p>
          )
        ) : (
          questionId &&
          quiz.has(`questions.${questionId}.explanation`) && (
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
              {quiz(`questions.${questionId}.explanation`)}
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
            {questionId && quiz(`questions.${questionId}.question`)}
          </p>
        )}

        <ChallengeOptions
          options={options}
          result={result}
          selected={selected}
          onPick={pick}
          disabled={grading}
        />

        {grading && (
          <p className="mt-4 text-sm text-muted-foreground">{t("checking")}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive">{t("checkError")}</p>
        )}

        {result !== null && (
          <div
            className={cn(
              "mt-4 rounded-lg border p-3 text-sm",
              result
                ? "border-success/40 bg-success/5"
                : "border-destructive/40 bg-destructive/5"
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {result ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t("correct")}
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 text-destructive" />
                  {t("wrongAnswer")}
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
              questionId &&
              quiz.has(`questions.${questionId}.explanation`) && (
                <p className="mt-1 text-muted-foreground">
                  {quiz(`questions.${questionId}.explanation`)}
                </p>
              )
            )}
          </div>
        )}

        {result !== null && (
          <div className="mt-4 flex justify-end">
            {result ? (
              <Button onClick={() => setPhase("done")}>{t("finish")}</Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setResult(null);
                  setError(false);
                }}
              >
                {t("tryAgain")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
