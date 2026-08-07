"use client";

import Link from "next/link";
import { Bookmark, CheckCircle2, Circle, Clock, LockKeyhole } from "lucide-react";
import type { CourseSection } from "@/lib/types";
import {
  isBookmarked,
  isLessonComplete,
  isLessonLocked,
  useProgressStore,
} from "@/lib/progress-store";
import { DifficultyBadge } from "@/components/lessons/difficulty-badge";
import { LessonMedalBadge } from "@/components/lessons/lesson-medal";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function LessonList({ sections }: { sections: CourseSection[] }) {
  const hydrated = useProgressStore((state) => state.hydrated);
  const lessonsRecord = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);

  const allLessons = sections.flatMap((section) => section.lessons);
  const slugIndex = new Map(allLessons.map((lesson, index) => [lesson.slug, index]));
  const isLocked = (slug: string) => {
    const index = slugIndex.get(slug);
    return index === undefined ? false : isLessonLocked(lessonsRecord, allLessons, index);
  };

  return (
    <div className="space-y-12">
      {sections.map((section) => {
        const sectionCompleted = section.lessons.filter((lesson) =>
          isLessonComplete(lessonsRecord, lesson.slug)
        ).length;
        return (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {hydrated
                  ? `${sectionCompleted}/${section.lessons.length}`
                  : `${section.lessons.length} lessons`}
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{section.description}</p>

            <div className="space-y-2">
              {section.lessons.map((lesson) => {
                const complete = isLessonComplete(lessonsRecord, lesson.slug);
                const locked = isLocked(lesson.slug);
                const bookmarked = isBookmarked(bookmarks, lesson.slug);
                return (
                  <Link
                    key={lesson.slug}
                    href={`/lessons/${lesson.slug}`}
                    aria-disabled={locked && !complete}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
                      locked && !complete
                        ? "opacity-70 hover:border-muted hover:bg-card"
                        : "hover:border-primary/40 hover:bg-accent/40"
                    )}
                  >
                    {complete ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : locked ? (
                      <LockKeyhole className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium group-hover:text-primary">
                          {lesson.title}
                        </span>
                        {bookmarked && (
                          <Bookmark className="h-3.5 w-3.5 fill-primary text-primary" />
                        )}
                        <LessonMedalBadge slug={lesson.slug} quizCount={lesson.quizCount} />
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {lesson.description}
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                      <div className="flex items-center gap-2">
                        <DifficultyBadge difficulty={lesson.difficulty} />
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {lesson.estimatedMinutes}m
                        </span>
                      </div>
                      {locked && !complete && (
                        <span className="text-[11px] text-muted-foreground">Locked</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <Progress
              value={
                section.lessons.length === 0
                  ? 0
                  : Math.round((sectionCompleted / section.lessons.length) * 100)
              }
              className="mt-4"
            />
          </section>
        );
      })}
    </div>
  );
}
