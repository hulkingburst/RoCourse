"use client";

import * as React from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markActivity,
  useStepper,
} from "@/components/activities/activity-context";
import { ActivityCard, Feedback } from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

interface McqProps {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  label?: string;
  /** Callers that already know they are solved (e.g. returning to a finished step). */
  alreadySolved?: boolean;
}

/**
 * Multiple-choice grading engine with retry-until-correct. A wrong pick shows
 * feedback and allows another attempt; a correct pick locks the question and
 * reports the result up to the stepper.
 */
export function Mcq({
  question,
  options,
  answer,
  explanation,
  label = "Quick check",
  alreadySolved = false,
}: McqProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );

  const isCorrect = status === "correct";

  const pick = (index: number) => {
    if (isCorrect) return;
    if (selected === index && status === "wrong") return;
    const firstTry = status === "idle";
    setSelected(index);
    if (index === answer) {
      setStatus("correct");
      onResult(true, firstTry);
    } else {
      setStatus("wrong");
      onResult(false, firstTry);
    }
  };

  return (
    <ActivityCard
      label={label}
      icon={HelpCircle}
      status={isCorrect ? "correct" : status}
    >
      <p className="font-medium">{question}</p>
      <div className="mt-4 grid gap-2">
        {options.map((option, index) => {
          const isAnswer = index === answer;
          const isSelected = index === selected;
          const showState = status !== "idle";
          return (
            <button
              key={index}
              type="button"
              onClick={() => pick(index)}
              disabled={isCorrect}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                !showState && "cursor-pointer hover:border-primary/50 hover:bg-accent",
                showState && isAnswer && "border-success/60 bg-success/10",
                showState && isSelected && !isAnswer && "border-destructive/60 bg-destructive/10",
                showState && !isSelected && !isAnswer && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                  showState && isAnswer && "border-success/60 text-success",
                  showState && isSelected && !isAnswer && "border-destructive/60 text-destructive"
                )}
              >
                {showState && isAnswer ? (
                  <CheckCircle2 className="h-3.5 w-3.5 -translate-y-px" />
                ) : showState && isSelected && !isAnswer ? (
                  <XCircle className="h-3.5 w-3.5 -translate-y-px" />
                ) : (
                  OPTION_LETTERS[index]
                )}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={isCorrect ? undefined : options[answer]}
      />
    </ActivityCard>
  );
}

markActivity(Mcq);
