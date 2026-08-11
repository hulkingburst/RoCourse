"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Bookmark,
  Clock,
  Layers,
  PlayCircle,
} from "lucide-react";
import {
  isLessonComplete,
  useProgressStore,
} from "@/lib/progress-store";
import type { CourseSection } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function CourseOverview({ sections }: { sections: CourseSection[] }) {
  const t = useTranslations("course");
  const hydrated = useProgressStore((state) => state.hydrated);
  const lessonsRecord = useProgressStore((state) => state.lessons);
  const lastLesson = useProgressStore((state) => state.lastLesson);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const recentlyViewed = useProgressStore((state) => state.recentlyViewed);

  const allLessons = sections.flatMap((section) => section.lessons);
  const completed = allLessons.filter((lesson) =>
    isLessonComplete(lessonsRecord, lesson.slug)
  ).length;
  const total = allLessons.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const continueLesson = lastLesson
    ? allLessons.find((lesson) => lesson.slug === lastLesson)
    : undefined;

  const recentEntries = recentlyViewed
    .map((slug) => allLessons.find((lesson) => lesson.slug === slug))
    .filter((lesson) => lesson != null)
    .slice(0, 4);
  const bookmarkEntries = bookmarks
    .map((slug) => allLessons.find((lesson) => lesson.slug === slug))
    .filter((lesson) => lesson != null)
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {total > 0 && (
        <section className="rounded-2xl border bg-card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t("yourProgress")}</h2>
            <span className="font-mono text-sm text-muted-foreground">
              {hydrated
                ? t("ofLessons", { completed, total })
                : t("ofLessons", { completed: "—", total })}
            </span>
          </div>
          <Progress value={percent} className="h-2" />
          {continueLesson ? (
            <Link
              href={`/lessons/${continueLesson.slug}`}
              className="group mt-5 flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <PlayCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  {t("continueLearning")}
                </span>
                <span className="block truncate font-medium">
                  {continueLesson.title}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {hydrated ? t("noProgress") : t("startFirstLesson")}
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("courseSections")}</h2>
        <div className="grid gap-4">
          {sections.map((section) => {
            const sectionCompleted = section.lessons.filter((lesson) =>
              isLessonComplete(lessonsRecord, lesson.slug)
            ).length;
            const sectionPercent =
              section.lessons.length === 0
                ? 0
                : Math.round((sectionCompleted / section.lessons.length) * 100);
            return (
              <Link
                key={section.id}
                href={`/lessons#${section.id}`}
                className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold group-hover:text-primary">
                    {section.title}
                  </h3>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {t("lessonsCount", { count: section.lessons.length })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {section.description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={sectionPercent} className="flex-1" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {hydrated ? `${sectionCompleted}/${section.lessons.length}` : "–/–"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {(recentEntries.length > 0 || bookmarkEntries.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-2">
          {recentEntries.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("recentlyViewed")}
              </h2>
              <ul className="space-y-1">
                {recentEntries.map((lesson) => (
                  <li key={lesson.slug}>
                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="text-muted-foreground">{lesson.sectionTitle} ·</span>{" "}
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bookmarkEntries.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                {t("bookmarked")}
              </h2>
              <ul className="space-y-1">
                {bookmarkEntries.map((lesson) => (
                  <li key={lesson.slug}>
                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="text-muted-foreground">{lesson.sectionTitle} ·</span>{" "}
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border-2 border-dashed p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-primary" />
          {t("finalProject")}
        </div>
        <p className="text-[15px] text-muted-foreground">
          {t("finalProjectBody")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{t("badgeGui")}</Badge>
          <Badge variant="outline">{t("badgeCurrency")}</Badge>
          <Badge variant="outline">{t("badgeSaving")}</Badge>
          <Badge variant="outline">{t("badgeClientServer")}</Badge>
          <Badge variant="outline">{t("badgeLeaderstats")}</Badge>
        </div>
      </section>
    </div>
  );
}
