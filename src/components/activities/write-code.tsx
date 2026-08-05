"use client";

import * as React from "react";
import { Code2 } from "lucide-react";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { isAnswerCorrect } from "@/components/activities/grading";

interface WriteCodeProps {
  instruction: string;
  answer: string | string[];
  /** Read-only context shown above the editor (e.g. the rest of the script). */
  starterCode?: string;
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
  placeholder = "local …",
  explanation,
  label = "Write the code",
  alreadySolved = false,
}: WriteCodeProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const { slug } = useLesson();
  const recordActivityResult = useProgressStore(
    (state) => state.recordActivityResult
  );
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );

  const check = () => {
    const correct = isAnswerCorrect(value, answer);
    setStatus(correct ? "correct" : "wrong");
    onResult(correct);
    recordActivityResult(slug, correct);
  };

  const reset = () => {
    setValue("");
    setStatus("idle");
  };

  const correct = status === "correct";
  const acceptedFirst = (Array.isArray(answer) ? answer : [answer])[0];

  return (
    <ActivityCard label={label} icon={Code2} status={correct ? "correct" : status}>
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
        canCheck={!correct && value.trim().length > 0}
        onReset={status === "wrong" ? reset : undefined}
        checkLabel="Check answer"
      />
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct ? acceptedFirst : undefined}
      />
    </ActivityCard>
  );
}

markActivity(WriteCode);
