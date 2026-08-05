"use client";

import * as React from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";

interface QuizProps {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Multiple-choice check used throughout lessons. Answers are recorded in the
 * progress store so a learner can see their quiz scores later.
 */
export function Quiz({ question, options, answer, explanation }: QuizProps) {
  const { slug } = useLesson();
  const recordQuizResult = useProgressStore((state) => state.recordQuizResult);
  const [selected, setSelected] = React.useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    recordQuizResult(slug, index === answer);
  };

  const isCorrect = selected === answer;

  return (
    <div className="my-6 rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <HelpCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Quick check</span>
        {selected !== null && (
          <span className="ml-auto flex items-center gap-1 text-sm">
            {isCorrect ? (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" /> Correct
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" /> Not quite
              </span>
            )}
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <p className="font-medium">{question}</p>
        <div className="grid gap-2">
          {options.map((option, index) => {
            const isAnswer = index === answer;
            const isSelected = index === selected;
            const showState = selected !== null;
            return (
              <button
                key={index}
                type="button"
                disabled={selected !== null}
                onClick={() => handleSelect(index)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  !showState &&
                    "hover:border-primary/50 hover:bg-accent cursor-pointer",
                  showState && isAnswer && "border-success/60 bg-success/10 text-foreground",
                  showState &&
                    isSelected &&
                    !isAnswer &&
                    "border-destructive/60 bg-destructive/10",
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
                  {showState && isAnswer ? <CheckCircle2 className="h-3.5 w-3.5" /> : OPTION_LETTERS[index]}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {selected !== null && explanation && (
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}
