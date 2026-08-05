"use client";

import * as React from "react";
import { Brain } from "lucide-react";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";
import { Mcq } from "@/components/activities/mcq";
import { isAnswerMatch } from "@/components/activities/grading";

interface PredictOutputProps {
  /** What the code prints / does. Accepts several equivalent phrasings. */
  answer: string | string[];
  /** When provided, prediction is multiple-choice instead of typed. */
  options?: string[];
  /** Index of the correct option. Required when `options` is set. */
  answerIndex?: number;
  explanation?: string;
  label?: string;
  /** The code the learner is predicting on. */
  children: React.ReactNode;
  alreadySolved?: boolean;
}

/**
 * "What does this code print?" — the code is shown, then the learner commits to
 * an output. With `options` it is graded multiple-choice; otherwise they type
 * the output and it is matched tolerantly.
 */
export function PredictOutput({
  answer,
  options,
  answerIndex,
  explanation,
  label = "Predict the output",
  children,
  alreadySolved = false,
}: PredictOutputProps) {
  if (options) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
        <Mcq
          question="What does this code output?"
          options={options}
          answer={answerIndex ?? 0}
          explanation={explanation}
          label={label}
          alreadySolved={alreadySolved}
        />
      </div>
    );
  }

  return (
    <FreeTextPredict
      answer={answer}
      explanation={explanation}
      label={label}
      alreadySolved={alreadySolved}
    >
      {children}
    </FreeTextPredict>
  );
}

function FreeTextPredict({
  answer,
  explanation,
  label = "Predict the output",
  alreadySolved,
  children,
}: Omit<PredictOutputProps, "options" | "answerIndex">) {
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
    const correct = isAnswerMatch(value, answer);
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
    <ActivityCard label={label} icon={Brain} status={correct ? "correct" : status}>
      <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
      <input
        value={value}
        disabled={correct}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") check();
        }}
        placeholder="Type the output…"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Type the output"
        className="mt-4 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 font-mono text-[14px] outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <ActionButtons
        onCheck={check}
        canCheck={!correct && value.trim().length > 0}
        onReset={status === "wrong" ? reset : undefined}
        checkLabel="Check"
      />
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct ? acceptedFirst : undefined}
      />
    </ActivityCard>
  );
}

markActivity(PredictOutput);
