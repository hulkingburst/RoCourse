"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bookmark, CheckCircle2, Circle } from "lucide-react";
import { useLesson } from "@/components/lessons/lesson-context";
import {
  isBookmarked,
  isLessonComplete,
  useProgressStore,
} from "@/lib/progress-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bookmark + complete buttons for the lesson header. Reads progress from the
 * client store and stays hidden until hydration so SSR output matches.
 */
export function LessonActions({ slugOverride }: { slugOverride?: string }) {
  const { slug: contextSlug } = useLesson();
  const slug = slugOverride ?? contextSlug;

  const t = useTranslations("lesson");
  const labels = useTranslations("lessons");

  const hydrated = useProgressStore((state) => state.hydrated);
  const lessons = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const toggleLessonComplete = useProgressStore(
    (state) => state.toggleLessonComplete
  );
  const toggleBookmark = useProgressStore((state) => state.toggleBookmark);

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Circle className="h-4 w-4" /> {labels("markComplete")}
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label={t("bookmarkLesson")}>
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const complete = isLessonComplete(lessons, slug);
  const bookmarked = isBookmarked(bookmarks, slug);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={complete ? "success" : "default"}
        size="sm"
        onClick={() => toggleLessonComplete(slug)}
      >
        {complete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {complete ? labels("complete") : t("markComplete")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleBookmark(slug)}
        aria-label={bookmarked ? t("removeBookmark") : t("bookmarkLesson")}
        className={cn(bookmarked && "text-primary")}
      >
        <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
      </Button>
    </div>
  );
}
