"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { runLuau, type LuauRunResult } from "@/lib/luau-runtime";
import {
  buildChecksScript,
  parseCheckResult,
  stripResultMarker,
} from "@/lib/luau-checks";

interface RunCodeProps {
  instruction: string;
  /** Code the learner starts with and can edit before running. */
  starterCode?: string;
  /**
   * Luau code appended after the learner's code, run as a hidden test harness.
   * Each test calls `check(condition, message)`. The learner's code runs first,
   * so it can define functions the checks call. `__log` holds every line the
   * learner printed (via `print`), handy for output assertions.
   *
   * Example checks:
   *   check(double(4) == 8, "double(4) should be 8")
   *   check(__log[1] == "Hello", "your code should print Hello")
   */
  checks: string;
  /** A spoiler-free nudge shown dimmed under the instruction. */
  hint?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

/**
 * "Write real Luau and it actually runs" — the learner edits a script which is
 * executed in the in-browser Luau WASM sandbox against hidden `check()` calls.
 * All checks must pass to unlock the step. This is the one activity that
 * exercises the true runtime rather than string comparison.
 */
export function RunCode({
  instruction,
  starterCode = "",
  checks,
  hint,
  explanation,
  label = "Run the code",
  alreadySolved = false,
}: RunCodeProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const [value, setValue] = React.useState(starterCode);
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );
  const [running, setRunning] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);
  const [resultCounts, setResultCounts] = React.useState<{
    passed: number;
    total: number;
  } | null>(null);

  const run = async () => {
    if (running) return;
    const firstTry = status === "idle";
    setRunning(true);
    setStatus("idle");
    setResultCounts(null);
    const result = await runLuau(buildChecksScript(value, checks));
    setRunning(false);

    const parsed = parseCheckResult(result.output);
    const correct =
      !result.error && parsed !== null && parsed.total > 0 &&
      parsed.passed === parsed.total;

    setOutput(displayOutput(result));
    setResultCounts(correct || result.error ? null : parsed);
    setStatus(correct ? "correct" : "wrong");
    onResult(correct, firstTry);
  };

  const reset = () => {
    setValue(starterCode);
    setOutput(null);
    setResultCounts(null);
    setStatus("idle");
  };

  const correct = status === "correct";

  return (
    <ActivityCard label={label} icon={Play} status={correct ? "correct" : status}>
      <p className="font-medium">{instruction}</p>
      {hint && (
        <p className="mt-2 text-sm text-muted-foreground">Hint: {hint}</p>
      )}
      <textarea
        value={value}
        disabled={correct}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") run();
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={7}
        aria-label={label}
        className="mt-4 w-full resize-y rounded-lg border border-white/10 bg-[#0d1117] p-4 font-mono text-[13.5px] leading-relaxed text-zinc-200 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <ActionButtons
        onCheck={run}
        canCheck={!running && !correct && value.trim().length > 0}
        onReset={!running && (output !== null || status === "wrong") ? reset : undefined}
        checkLabel={running ? "Running…" : "Run"}
      />
      {resultCounts && !correct && (
        <p className="mt-3 text-sm font-medium text-destructive">
          {resultCounts.passed}/{resultCounts.total} checks passed — keep going.
        </p>
      )}
      {output !== null && (
        <div
          className={`mt-4 rounded-lg bg-[#0d1117] p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap ${
            correct ? "text-zinc-200" : "text-red-300"
          }`}
        >
          {output || "(no output)"}
        </div>
      )}
      <Feedback
        status={status}
        explanation={explanation}
      />
    </ActivityCard>
  );
}

markActivity(RunCode);

function displayOutput(result: LuauRunResult): string {
  if (result.error) return result.error;
  return stripResultMarker(result.output);
}
