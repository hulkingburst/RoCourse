"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityStatus = "idle" | "correct" | "wrong";

export function ActivityCard({
  label,
  icon: Icon,
  status,
  children,
}: {
  label: string;
  icon: LucideIcon;
  status: ActivityStatus;
  children: React.ReactNode;
}) {
  const t = useTranslations("activity");
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{label}</span>
        <span className="ml-auto">
          {status === "correct" && (
            <span className="flex items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> {t("correct")}
            </span>
          )}
          {status === "wrong" && (
            <span className="flex items-center gap-1 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" /> {t("notQuite")}
            </span>
          )}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Feedback({
  status,
  explanation,
  correctAnswer,
  hint,
  wrongAttempts,
}: {
  status: ActivityStatus;
  explanation?: string;
  /** Shown alongside the explanation when the answer was wrong. */
  correctAnswer?: string;
  /** Spoiler-free nudge explaining what's wrong. Shown on wrong attempts. */
  hint?: string | null;
  /**
   * When provided, the hint/explanation/answer are withheld until the 2nd wrong
   * attempt. Omit to keep the old show-on-first-wrong behavior.
   */
  wrongAttempts?: number;
}) {
  if (status === "idle") return null;

  if (status === "correct") {
    if (!explanation) return null;
    return (
      <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm leading-relaxed">
        <p className="text-foreground/90">{explanation}</p>
      </div>
    );
  }

  const gated = typeof wrongAttempts === "number";
  if (gated && wrongAttempts! < 2) return null;

  return (
    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed">
      {hint && (
        <p className="flex items-start gap-1.5 font-medium text-foreground/90">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}
      {explanation && (
        <p className={cn("text-foreground/75", hint && "mt-1.5")}>{explanation}</p>
      )}
      {correctAnswer && <AnswerSpoiler answer={correctAnswer} />}
    </div>
  );
}

/**
 * A click-to-reveal box for the correct answer. Hides the answer until the
 * learner chooses to reveal it, so the explanation above it stays a hint.
 */
export function AnswerSpoiler({ answer }: { answer: string }) {
  const t = useTranslations("activity");
  const [revealed, setRevealed] = React.useState(false);
  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setRevealed((visible) => !visible)}
        aria-expanded={revealed}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        {revealed ? t("hideAnswer") : t("revealAnswer")}
      </button>
      {revealed && (
        <div className="mt-2">
          <p className="text-[13px] text-foreground/80">{t("correctAnswer")}</p>
          <code className="mt-1 block whitespace-pre-wrap rounded-md bg-muted px-2.5 py-1.5 font-mono text-[13px]">
            {answer}
          </code>
        </div>
      )}
    </div>
  );
}

export function ActionButtons({
  onCheck,
  canCheck,
  onReset,
  checkLabel,
}: {
  onCheck: () => void;
  canCheck: boolean;
  onReset?: () => void;
  checkLabel?: string;
}) {
  const t = useTranslations("activity");
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        onClick={onCheck}
        disabled={!canCheck}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {checkLabel ?? t("checkAnswer")}
      </button>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("reset")}
        </button>
      )}
    </div>
  );
}
