"use client";

import * as React from "react";
import { useLesson } from "@/components/lessons/lesson-context";
import {
  isLessonComplete,
  useProgressStore,
} from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * Bottom-of-lesson completion bar so learners can mark progress after
 * finishing the reading.
 */
export function MarkCompleteBar() {
  const { slug } = useLesson();
  const hydrated = useProgressStore((state) => state.hydrated);
  const lessons = useProgressStore((state) => state.lessons);
  const toggleLessonComplete = useProgressStore(
    (state) => state.toggleLessonComplete
  );

  if (!hydrated) return null;

  const complete = isLessonComplete(lessons, slug);

  return (
    <div className="mt-10 rounded-xl border bg-card p-5 text-center">
      <p className="mb-3 text-sm text-muted-foreground">
        Finished this lesson? Mark it complete to track your progress.
      </p>
      <Button
        variant={complete ? "success" : "default"}
        onClick={() => toggleLessonComplete(slug)}
      >
        {complete ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Completed — nice work!
          </>
        ) : (
          <>
            <Circle className="h-4 w-4" /> Mark lesson as complete
          </>
        )}
      </Button>
    </div>
  );
}
