"use client";

import * as React from "react";
import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import { useLesson } from "@/components/lessons/lesson-context";
import { useProgressStore } from "@/lib/progress-store";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";

interface ArrangeCodeProps {
  /** The lines in the correct order (top to bottom). They are shown shuffled. */
  lines: string[];
  instruction?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

function shuffle<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Arrange the code. Shuffled lines are tapped in the order they should run;
 * the learner then checks the sequence.
 */
export function ArrangeCode({
  lines,
  instruction = "Tap the lines in the order they should run.",
  explanation,
  label = "Arrange the code",
  alreadySolved = false,
}: ArrangeCodeProps) {
  const { solved: stepSolved, onResult } = useStepper();
  const { slug } = useLesson();
  const recordActivityResult = useProgressStore(
    (state) => state.recordActivityResult
  );
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [pool, setPool] = React.useState<number[]>(() =>
    shuffle(lines.map((_, index) => index))
  );
  const [order, setOrder] = React.useState<number[]>([]);
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );

  const correct = status === "correct";

  const takeLine = (index: number) => {
    if (correct) return;
    setPool((current) => current.filter((i) => i !== index));
    setOrder((current) => [...current, index]);
  };

  const removeLine = (position: number) => {
    if (correct) return;
    const index = order[position];
    if (index === undefined) return;
    setOrder((current) => current.filter((_, p) => p !== position));
    setPool((current) => [...current, index]);
  };

  const check = () => {
    const isRight =
      order.length === lines.length &&
      order.every((lineIndex, position) => lineIndex === position);
    setStatus(isRight ? "correct" : "wrong");
    onResult(isRight);
    recordActivityResult(slug, isRight);
  };

  const reset = () => {
    setOrder([]);
    setPool(shuffle(lines.map((_, index) => index)));
    setStatus("idle");
  };

  if (!mounted) {
    return (
      <ActivityCard label={label} icon={ListOrdered} status={status}>
        <div className="h-28 animate-pulse rounded-lg bg-muted/50" />
      </ActivityCard>
    );
  }

  return (
    <ActivityCard label={label} icon={ListOrdered} status={correct ? "correct" : status}>
      <p className="font-medium">{instruction}</p>

      <ol className="mt-4 space-y-1.5">
        {order.length === 0 && (
          <li className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground/70">
            {correct ? "All lines arranged." : "Your order will appear here."}
          </li>
        )}
        {order.map((lineIndex, position) => (
          <li
            key={`${lineIndex}-${position}`}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[13.5px]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-xs font-bold text-primary">
              {position + 1}
            </span>
            <code className="min-w-0 flex-1 leading-relaxed">{lines[lineIndex]}</code>
            {!correct && (
              <button
                type="button"
                onClick={() => removeLine(position)}
                aria-label="Remove line"
                className="shrink-0 rounded px-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {pool.map((lineIndex) => (
          <button
            key={lineIndex}
            type="button"
            onClick={() => takeLine(lineIndex)}
            disabled={correct}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-[13.5px] transition-colors",
              "cursor-pointer hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {lines[lineIndex]}
          </button>
        ))}
      </div>

      <ActionButtons
        onCheck={check}
        canCheck={!correct && order.length === lines.length}
        onReset={status === "wrong" || order.length > 0 ? reset : undefined}
        checkLabel="Check order"
      />
      <Feedback status={status} explanation={explanation} />
    </ActivityCard>
  );
}

markActivity(ArrangeCode);
