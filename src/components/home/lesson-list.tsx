"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bookmark, CheckCircle2, Circle, Clock, LockKeyhole } from "lucide-react";
import type { CourseSection } from "@/lib/types";
import {
  isBookmarked,
  isLessonComplete,
  isLessonLocked,
  useProgressStore,
} from "@/lib/progress-store";
import { optionalStartSlugs } from "@/lib/course-access";
import { DifficultyBadge } from "@/components/lessons/difficulty-badge";
import { LessonMedalBadge } from "@/components/lessons/lesson-medal";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function LessonList({ sections }: { sections: CourseSection[] }) {
  const t = useTranslations("course");
  const hydrated = useProgressStore((state) => state.hydrated);
  const lessonsRecord = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);

  const allLessons = sections.flatMap((section) => section.lessons);
  const slugIndex = new Map(allLessons.map((lesson, index) => [lesson.slug, index]));
  // Optional sections open on their first lesson, so they stay reachable with
  // no progress at all.
  const openSlugs = optionalStartSlugs(sections);
  const isLocked = (slug: string) => {
    const index = slugIndex.get(slug);
    return index === undefined
      ? false
      : isLessonLocked(lessonsRecord, allLessons, index, openSlugs);
  };

  return (
    <div className="space-y-12">
      {sections.map((section, sectionIndex) => {
        const sectionCompleted = section.lessons.filter((lesson) =>
          isLessonComplete(lessonsRecord, lesson.slug)
        ).length;
        // Everything from the first optional section onward sits past the end
        // of the main path, so the divider marks where the required course
        // stops and the extras begin.
        const opensOptionalBlock =
          section.optional === true && sections[sectionIndex - 1]?.optional !== true;
        return (
          <React.Fragment key={section.id}>
            {opensOptionalBlock && (
              <div>
                <div className="flex items-center gap-4">
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("optionalTitle")}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {t("optionalBody")}
                </p>
              </div>
            )}

            <section id={section.id} className="scroll-mt-20">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  {section.title}
                  {section.optional && (
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("optionalBadge")}
                    </span>
                  )}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {hydrated
                    ? `${sectionCompleted}/${section.lessons.length}`
                    : t("lessonsCount", { count: section.lessons.length })}
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
                        "group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-md",
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
                          <LessonMedalBadge slug={lesson.slug} activityCount={lesson.activityCount} />
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
                          <span className="text-[11px] text-muted-foreground">{t("locked")}</span>
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
          </React.Fragment>
        );
      })}
    </div>
  );
}
