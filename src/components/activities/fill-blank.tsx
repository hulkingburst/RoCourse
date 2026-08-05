"use client";

import * as React from "react";
import { Type } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface FillBlankProps {
  /** The sentence with exactly one `____` where the input is placed. */
  prompt: string;
  answer: string | string[];
  placeholder?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

/**
 * Fill in the blank. The `____` in `prompt` renders as an inline text input so
 * the learner fills the gap in the sentence itself.
 */
export function FillBlank({
  prompt,
  answer,
  placeholder = "Type here…",
  explanation,
  label = "Fill in the blank",
  alreadySolved = false,
}: FillBlankProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const { slug } = useLesson();
  const recordActivityResult = useProgressStore(
    (state) => state.recordActivityResult
  );
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  const parts = prompt.split("____");

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
    <ActivityCard
      label={label}
      icon={Type}
      status={correct ? "correct" : status}
    >
      <p className="font-medium leading-relaxed">
        {parts[0]}
        <input
          ref={inputRef}
          value={value}
          disabled={correct}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") check();
          }}
          placeholder={placeholder}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={placeholder}
          className={cn(
            "mx-1 inline-block w-32 rounded-md border-b-2 bg-transparent px-1.5 py-0.5 text-center font-mono text-[15px] outline-none transition-colors placeholder:text-muted-foreground/50 disabled:opacity-60",
            correct
              ? "border-success text-success"
              : "border-primary/60 focus:border-primary"
          )}
        />
        {parts[1] ?? ""}
      </p>
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

markActivity(FillBlank);
