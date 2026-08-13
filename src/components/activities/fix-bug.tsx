"use client";

import * as React from "react";
import { Bug } from "lucide-react";
import { useTranslations } from "next-intl";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { isAnswerMatch, generateHint } from "@/components/activities/grading";
import { Mcq } from "@/components/activities/mcq";

interface FixBugProps {
  /** The buggy code. Rendered above the editor/options. */
  children: React.ReactNode;
  question?: string;
  /** MCQ mode: the wrong-pick options. */
  options?: string[];
  /** MCQ mode: index of the correct option. */
  answer?: number;
  /**
   * Type mode: the accepted fixed version(s). When provided, the learner types
   * the fix instead of picking an option.
   */
  fix?: string | string[];
  /** Type mode: the prompt shown above the editor. */
  instruction?: string;
  /**
   * Type mode: when true, a leading `local` keyword is required. Use for bugs
   * where the missing local IS the bug (otherwise local is treated as optional).
   */
  requireLocal?: boolean;
  placeholder?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

/**
 * Find the bug. Shows broken code and either asks the learner to pick what's
 * wrong (MCQ) or, when `fix` is provided, to type the corrected line(s).
 */
export function FixBug({
  children,
  question = "What's the bug?",
  options,
  answer,
  fix,
  instruction = "Type the fixed line.",
  requireLocal = false,
  placeholder = "local …",
  explanation,
  label,
  alreadySolved = false,
}: FixBugProps) {
  const t = useTranslations("activity");
  const { solved: stepSolved, onResult } = useStepper();
  const resolvedLabel = label ?? t("fixBugLabel");
  const resolvedQuestion = question === "What's the bug?" ? t("whatsTheBug") : question;
  const resolvedInstruction =
    instruction === "Type the fixed line." ? t("typeFixedLine") : instruction;
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );
  const [wrongAttempts, setWrongAttempts] = React.useState(0);

  const isTypeMode = fix !== undefined;

  const check = () => {
    const correct = isAnswerMatch(value, fix!, { strictLocal: requireLocal });
    const firstTry = status === "idle";
    setStatus(correct ? "correct" : "wrong");
    if (!correct) setWrongAttempts((count) => count + 1);
    onResult(correct, firstTry);
  };

  const reset = () => {
    setValue("");
    setStatus("idle");
    setWrongAttempts(0);
  };

  const correct = status === "correct";
  const acceptedFirst = Array.isArray(fix) ? fix[0] : fix;
  const hint =
    status === "wrong" && isTypeMode
      ? generateHint(value, fix!, { strictLocal: requireLocal }, t)
      : undefined;

  if (!isTypeMode) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
        <Mcq
          question={resolvedQuestion}
          options={options ?? []}
          answer={answer ?? 0}
          explanation={explanation}
          label={resolvedLabel}
          alreadySolved={alreadySolved}
        />
      </div>
    );
  }

  return (
    <ActivityCard label={resolvedLabel} icon={Bug} status={correct ? "correct" : status}>
      <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
      <p className="mt-4 font-medium">{resolvedInstruction}</p>
      <textarea
        value={value}
        disabled={correct}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") check();
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={2}
        aria-label={resolvedInstruction}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-transparent p-3 font-mono text-[14px] leading-relaxed outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <ActionButtons
        onCheck={check}
        canCheck={!correct && value.trim().length > 0}
        onReset={status === "wrong" ? reset : undefined}
        checkLabel={t("checkFix")}
      />
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct ? acceptedFirst : undefined}
        hint={hint}
        wrongAttempts={wrongAttempts}
      />
    </ActivityCard>
  );
}

markActivity(FixBug);
