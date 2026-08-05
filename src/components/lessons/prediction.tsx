"use client";

import * as React from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";

interface PredictionProps {
  /** What the code actually prints / does. Revealed on click. */
  answer: string;
  explanation?: string;
  children: React.ReactNode;
}

/**
 * "What do you think this prints?" — the code is shown first; the answer stays
 * hidden until the learner commits to a guess and clicks reveal.
 */
export function Prediction({ answer, explanation, children }: PredictionProps) {
  const { slug } = useLesson();
  const recordQuizResult = useProgressStore((state) => state.recordQuizResult);
  const [revealed, setRevealed] = React.useState(false);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    recordQuizResult(slug, true);
  };

  return (
    <div className="my-6 rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">What do you think this does?</span>
        {revealed && (
          <span className="ml-auto text-xs text-muted-foreground">
            Prediction recorded
          </span>
        )}
      </div>
      <div className="p-5 pt-4">
        <div className="rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            Reveal the answer
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
              <span className="mt-0.5 font-mono text-sm font-semibold text-success">
                {answer}
              </span>
            </div>
            {explanation && (
              <p className="text-sm text-muted-foreground">{explanation}</p>
            )}
            <button
              type="button"
              onClick={() => setRevealed(false)}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              <EyeOff className="mr-1 inline h-3 w-3" />
              Hide again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
