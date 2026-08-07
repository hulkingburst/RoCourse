"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, RotateCcw } from "lucide-react";

/**
 * Next.js maintains scroll position across client-side navigations, so a
 * "Next lesson" click from the bottom of a long lesson would land readers at
 * the bottom of the new one. Scroll to the top before the navigation starts.
 */
function scrollToTop() {
  window.scrollTo({ top: 0, left: 0 });
}

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  };
}

const CONFETTI_COLORS = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#8b5cf6"];

interface ConfettiProps {
  seed: string;
}

function Confetti({ seed }: ConfettiProps) {
  const rand = React.useMemo(() => seededRandom(seed), [seed]);
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 36 }, (_, id) => ({
        id,
        left: rand() * 100,
        delay: rand() * 0.6,
        duration: 2.2 + rand() * 1.8,
        drift: (rand() - 0.5) * 180,
        size: 6 + rand() * 8,
        color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece absolute rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            top: "-2rem",
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--drift" as string]: `${piece.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

interface StepCompletionProps {
  slug: string;
  title: string;
  nextSlug: string | null;
  nextTitle: string | null;
  onReplay: () => void;
}

/**
 * End-of-lesson celebration: animated checkmark, confetti, and a clear path to
 * the next lesson.
 */
export function StepCompletion({
  slug,
  title,
  nextSlug,
  nextTitle,
  onReplay,
}: StepCompletionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center shadow-sm">
      <Confetti seed={slug} />
      <div className="relative">
        <div className="check-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="check-draw h-12 w-12 text-success" />
        </div>
        <h2 className="pop-in mt-6 text-2xl font-bold">Lesson complete!</h2>
        <p className="pop-in mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Nice work finishing <span className="font-medium text-foreground">{title}</span>.
          Your progress was saved automatically.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {nextSlug && nextTitle ? (
            <Link
              href={`/lessons/${nextSlug}`}
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Next lesson: {nextTitle}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/lessons"
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              You finished the course!
              <BookOpen className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/lessons"
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            All lessons
          </Link>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Replay
          </button>
        </div>
      </div>
    </div>
  );
}
