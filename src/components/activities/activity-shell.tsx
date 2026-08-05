"use client";

import * as React from "react";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
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
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{label}</span>
        <span className="ml-auto">
          {status === "correct" && (
            <span className="flex items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Correct
            </span>
          )}
          {status === "wrong" && (
            <span className="flex items-center gap-1 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4" /> Not quite
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
}: {
  status: ActivityStatus;
  explanation?: string;
  /** Shown alongside the explanation when the answer was wrong. */
  correctAnswer?: string;
}) {
  if (status === "idle" || (!explanation && !correctAnswer)) return null;

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        status === "correct"
          ? "border-success/30 bg-success/10"
          : "border-destructive/30 bg-destructive/10"
      )}
    >
      {status === "correct" && explanation && (
        <p className="text-foreground/90">{explanation}</p>
      )}
      {status === "wrong" && (
        <>
          {correctAnswer && (
            <p className="text-foreground/90">
              The correct answer:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
                {correctAnswer}
              </code>
            </p>
          )}
          {explanation && (
            <p className="mt-1.5 text-foreground/75">{explanation}</p>
          )}
        </>
      )}
    </div>
  );
}

export function ActionButtons({
  onCheck,
  canCheck,
  onReset,
  checkLabel = "Check answer",
}: {
  onCheck: () => void;
  canCheck: boolean;
  onReset?: () => void;
  checkLabel?: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        onClick={onCheck}
        disabled={!canCheck}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {checkLabel}
      </button>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}
