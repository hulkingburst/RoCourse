"use client";

import * as React from "react";
import { Bug } from "lucide-react";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { isAnswerMatch } from "@/components/activities/grading";
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
  placeholder = "local …",
  explanation,
  label = "Fix the bug",
  alreadySolved = false,
}: FixBugProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );

  const isTypeMode = fix !== undefined;

  const check = () => {
    const correct = isAnswerMatch(value, fix!);
    const firstTry = status === "idle";
    setStatus(correct ? "correct" : "wrong");
    onResult(correct, firstTry);
  };

  const reset = () => {
    setValue("");
    setStatus("idle");
  };

  const correct = status === "correct";
  const acceptedFirst = Array.isArray(fix) ? fix[0] : fix;

  if (!isTypeMode) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
        <Mcq
          question={question}
          options={options ?? []}
          answer={answer ?? 0}
          explanation={explanation}
          label={label}
          alreadySolved={alreadySolved}
        />
      </div>
    );
  }

  return (
    <ActivityCard label={label} icon={Bug} status={correct ? "correct" : status}>
      <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
      <p className="mt-4 font-medium">{instruction}</p>
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
        aria-label={instruction}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-transparent p-3 font-mono text-[14px] leading-relaxed outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <ActionButtons
        onCheck={check}
        canCheck={!correct && value.trim().length > 0}
        onReset={status === "wrong" ? reset : undefined}
        checkLabel="Check fix"
      />
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct ? acceptedFirst : undefined}
      />
    </ActivityCard>
  );
}

markActivity(FixBug);
