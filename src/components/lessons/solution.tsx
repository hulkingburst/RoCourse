"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";

interface SolutionProps {
  label?: string;
  children: React.ReactNode;
}

/**
 * A collapsible "one possible solution" block. Encourage learners to attempt
 * the challenge first, then reveal. The "I solved it" toggle records challenge
 * completion in the progress store.
 */
export function Solution({
  label = "One possible solution",
  children,
}: SolutionProps) {
  const { slug } = useLesson();
  const recordChallengeResult = useProgressStore(
    (state) => state.recordChallengeResult
  );
  const [open, setOpen] = React.useState(false);
  const [solved, setSolved] = React.useState(false);

  const toggleSolved = () => {
    const next = !solved;
    setSolved(next);
    recordChallengeResult(slug, next);
  };

  return (
    <div className="my-6 rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
        <span className="text-sm font-semibold">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          {open ? "Hide" : "Show solution"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={toggleSolved}
          className={cn(
            "flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            solved
              ? "border-success/40 bg-success/10 text-success"
              : "hover:bg-accent"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {solved ? "I solved it" : "Mark as solved"}
        </button>
      </div>
      {open && <div className="p-5 pt-4">{children}</div>}
    </div>
  );
}
