"use client";

import * as React from "react";
import { Code2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { isAnswerCorrect, generateHint } from "@/components/activities/grading";
import { runLuau } from "@/lib/luau-runtime";
import {
  buildChecksScript,
  parseCheckResult,
  stripResultMarker,
} from "@/lib/luau-checks";

interface WriteCodeProps {
  instruction: string;
  answer: string | string[];
  /** Read-only context shown above the editor (e.g. the rest of the script). */
  starterCode?: string;
  /**
   * When true, a leading `local` keyword is required. Use when the exercise
   * specifically asks for a declaration (otherwise local is treated as optional).
   */
  requireLocal?: boolean;
  /**
   * Luau code appended after the learner's answer and run as a hidden test
   * harness. When provided, grading runs the answer in the WASM sandbox and all
   * `check()` calls must pass — instead of the tolerant string comparison.
   * `__log` holds every line the answer printed.
   *
   * Example:
   *   check(__log[1] == "Hello", "your code should print Hello")
   */
  checks?: string;
  placeholder?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

/**
 * Write one line (or a short snippet) in a small code editor. The student types
 * only the missing section; grading is a tolerant comparison against accepted
 * answers so equivalent spacing and case are fine.
 */
export function WriteCode({
  instruction,
  answer,
  starterCode,
  requireLocal = false,
  checks,
  placeholder = "local …",
  explanation,
  label,
  alreadySolved = false,
}: WriteCodeProps) {
  const t = useTranslations("activity");
  const { solved: stepSolved, onResult } = useStepper();
  const resolvedLabel = label ?? t("writeCodeLabel");
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );
  const [wrongAttempts, setWrongAttempts] = React.useState(0);
  const [checking, setChecking] = React.useState(false);
  const [hiddenOutput, setHiddenOutput] = React.useState<string | null>(null);

  const check = async () => {
    if (checking) return;
    let correct: boolean;
    const firstTry = status === "idle";

    if (checks) {
      setChecking(true);
      const result = await runLuau(buildChecksScript(value, checks));
      setChecking(false);
      const parsed = parseCheckResult(result.output);
      correct = !result.error && parsed !== null && parsed.total > 0 &&
        parsed.passed === parsed.total;
      setHiddenOutput(result.error ?? (stripResultMarker(result.output) || null));
    } else {
      correct = isAnswerCorrect(value, answer, { strictLocal: requireLocal });
    }

    setStatus(correct ? "correct" : "wrong");
    if (!correct) setWrongAttempts((count) => count + 1);
    onResult(correct, firstTry);
  };

  const reset = () => {
    setValue("");
    setStatus("idle");
    setWrongAttempts(0);
    setHiddenOutput(null);
  };

  const correct = status === "correct";
  const acceptedFirst = (Array.isArray(answer) ? answer : [answer])[0];
  const hint =
    status === "wrong" && !checks
      ? generateHint(value, answer, { strictLocal: requireLocal }, t)
      : undefined;

  return (
    <ActivityCard label={resolvedLabel} icon={Code2} status={correct ? "correct" : status}>
      <p className="font-medium">{instruction}</p>
      {starterCode && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0d1117] p-4 font-mono text-[13.5px] leading-relaxed text-zinc-200">
          <code>{starterCode}</code>
        </pre>
      )}
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
        aria-label={placeholder}
        className="mt-4 w-full resize-y rounded-lg border border-input bg-transparent p-3 font-mono text-[14px] leading-relaxed outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <ActionButtons
        onCheck={check}
        canCheck={!correct && !checking && value.trim().length > 0}
        checkLabel={checks ? t("runChecks") : t("checkAnswer")}
        onReset={status === "wrong" ? reset : undefined}
      />
      {checks && hiddenOutput !== null && (
        <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-[#0d1117] p-3 font-mono text-[13px] leading-relaxed text-zinc-300">
          {hiddenOutput}
        </pre>
      )}
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct && !checks ? acceptedFirst : undefined}
        hint={hint}
        wrongAttempts={wrongAttempts}
      />
    </ActivityCard>
  );
}

markActivity(WriteCode);
