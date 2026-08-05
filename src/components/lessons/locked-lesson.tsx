"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, LockKeyhole } from "lucide-react";

interface LockedLessonProps {
  prevSlug: string | null;
  prevTitle: string | null;
  title: string;
}

/**
 * Shown when a learner reaches a lesson that hasn't been unlocked yet. The
 * only way past is completing the previous lesson.
 */
export function LockedLesson({ prevSlug, prevTitle, title }: LockedLessonProps) {
  return (
    <div className="rounded-2xl border bg-card px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <LockKeyhole className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-bold">Lesson locked</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Complete the previous lesson first — then <span className="font-medium text-foreground">{title}</span>{" "}
        will unlock and your progress will be saved.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {prevSlug && prevTitle && (
          <Link
            href={`/lessons/${prevSlug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous lesson: {prevTitle}
          </Link>
        )}
        <Link
          href="/lessons"
          className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <BookOpen className="h-4 w-4" />
          All lessons
        </Link>
      </div>
    </div>
  );
}
