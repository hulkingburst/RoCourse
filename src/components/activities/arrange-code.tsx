"use client";

import * as React from "react";
import { ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import { markActivity, useStepper } from "@/components/activities/activity-context";
import { cn } from "@/lib/utils";
import {
  ActivityCard,
  ActionButtons,
  Feedback,
} from "@/components/activities/activity-shell";
import type { ActivityStatus } from "@/components/activities/activity-shell";

interface ArrangeCodeProps {
  /** The lines in the correct order (top to bottom). They are shown shuffled. */
  lines: string[];
  /** Wrong tokens mixed into the pool â€” the learner must leave them out. */
  distractors?: string[];
  instruction?: string;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

type Token = { kind: "line" | "distractor"; id: number };

function shuffle<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildPool(lineCount: number, distractorCount: number): Token[] {
  const tokens: Token[] = [
    ...Array.from({ length: lineCount }, (_, id) => ({ kind: "line" as const, id })),
    ...Array.from({ length: distractorCount }, (_, id) => ({
      kind: "distractor" as const,
      id,
    })),
  ];
  return shuffle(tokens);
}

function tokenText(token: Token, lines: string[], distractors: string[]): string {
  return token.kind === "line" ? lines[token.id] : distractors[token.id];
}

/**
 * Arrange the code. Shuffled tokens (correct lines plus any distractors) are
 * tapped in the order they should run; the learner must use exactly the right
 * lines and leave the wrong ones out.
 */
export function ArrangeCode({
  lines,
  distractors = [],
  instruction,
  explanation,
  label,
  alreadySolved = false,
}: ArrangeCodeProps) {
  const t = useTranslations("activity");
  const { solved: stepSolved, onResult } = useStepper();
  const resolvedLabel = label ?? t("arrangeCodeLabel");
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [pool, setPool] = React.useState<Token[]>(() =>
    buildPool(lines.length, distractors.length)
  );
  const [order, setOrder] = React.useState<Token[]>([]);
  const [status, setStatus] = React.useState<ActivityStatus>(() =>
    alreadySolved || stepSolved ? "correct" : "idle"
  );

  const correct = status === "correct";

  const takeToken = (poolIndex: number) => {
    if (correct) return;
    const token = pool[poolIndex];
    if (!token) return;
    setPool((current) => current.filter((_, i) => i !== poolIndex));
    setOrder((current) => [...current, token]);
  };

  const removeToken = (position: number) => {
    if (correct) return;
    const token = order[position];
    if (!token) return;
    setOrder((current) => current.filter((_, p) => p !== position));
    setPool((current) => [...current, token]);
  };

  const check = () => {
    const isRight =
      order.length === lines.length &&
      order.every(
        (token, position) => token.kind === "line" && token.id === position
      );
    const firstTry = status === "idle";
    setStatus(isRight ? "correct" : "wrong");
    onResult(isRight, firstTry);
  };

  const reset = () => {
    setOrder([]);
    setPool(buildPool(lines.length, distractors.length));
    setStatus("idle");
  };

  if (!mounted) {
    return (
      <ActivityCard label={resolvedLabel} icon={ListOrdered} status={status}>
        <div className="h-28 animate-pulse rounded-lg bg-muted/50" />
      </ActivityCard>
    );
  }

  const instructionText =
    instruction ??
    (distractors.length > 0
      ? t("arrangeWithDistractors")
      : t("arrangeSimple"));

  return (
    <ActivityCard label={resolvedLabel} icon={ListOrdered} status={correct ? "correct" : status}>
      <p className="font-medium">{instructionText}</p>

      <ol className="mt-4 space-y-1.5">
        {order.length === 0 && (
          <li className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground/70">
            {correct ? t("arrangeAllDone") : t("arrangePlaceholder")}
          </li>
        )}
        {order.map((token, position) => (
          <li
            key={`${token.kind}-${token.id}-${position}`}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[13.5px]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-xs font-bold text-primary">
              {position + 1}
            </span>
            <code className="min-w-0 flex-1 leading-relaxed">
              {tokenText(token, lines, distractors)}
            </code>
            {!correct && (
              <button
                type="button"
                onClick={() => removeToken(position)}
                aria-label={t("removeLine")}
                className="shrink-0 rounded px-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                âœ•
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {pool.map((token, poolIndex) => (
          <button
            key={`${token.kind}-${token.id}`}
            type="button"
            onClick={() => takeToken(poolIndex)}
            disabled={correct}
            className={cn(
"rounded-lg border px-3 py-1.5 font-mono text-[13.5px] transition-all duration-150 motion-reduce:transition-none active:scale-95",
                "cursor-pointer hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {tokenText(token, lines, distractors)}
          </button>
        ))}
      </div>

      <ActionButtons
        onCheck={check}
        canCheck={!correct && order.length === lines.length}
        onReset={status === "wrong" || order.length > 0 ? reset : undefined}
        checkLabel={t("checkOrder")}
      />
      <Feedback
        status={status}
        explanation={explanation}
        correctAnswer={!correct ? lines.join("\n") : undefined}
      />
    </ActivityCard>
  );
}

markActivity(ArrangeCode);
