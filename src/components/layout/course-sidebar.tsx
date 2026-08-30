"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Bookmark,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Gamepad2,
  ListChecks,
  LockKeyhole,
  MessageCircleQuestion,
  PlayCircle,
  RotateCcw,
  Terminal,
  Timer,
  Zap,
  Package,
} from "lucide-react";
import * as React from "react";
import type { CourseSection, LessonMeta } from "@/lib/types";
import {
  isLessonComplete,
  isLessonLocked,
  useProgressStore,
} from "@/lib/progress-store";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LessonMedalBadge } from "@/components/lessons/lesson-medal";

function LessonRow({
  lesson,
  current,
  complete,
  locked,
  bookmarked,
}: {
  lesson: LessonMeta;
  current: boolean;
  complete: boolean;
  locked: boolean;
  bookmarked: boolean;
}) {
  return (
    <Link
      href={`/lessons/${lesson.slug}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] leading-snug transition-all duration-150 motion-reduce:transition-none",
        current
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        locked && !current && "opacity-70"
      )}
    >
      {complete ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : locked ? (
        <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
      )}
      <span className="flex-1">{lesson.title}</span>
      <LessonMedalBadge slug={lesson.slug} activityCount={lesson.activityCount} className="h-3.5 w-3.5 shrink-0" />
      {bookmarked && <Bookmark className="h-3 w-3 shrink-0 fill-primary text-primary" />}
    </Link>
  );
}

function SidebarSection({
  section,
  currentSlug,
  lessonsRecord,
  bookmarks,
  isLocked,
  open,
  onToggle,
}: {
  section: CourseSection;
  currentSlug: string | null;
  lessonsRecord: ReturnType<typeof useProgressStore.getState>["lessons"];
  bookmarks: string[];
  isLocked: (slug: string) => boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const total = section.lessons.length;
  const completed = section.lessons.filter((lesson) =>
    isLessonComplete(lessonsRecord, lesson.slug)
  ).length;

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold transition-all duration-200 hover:bg-accent/60 motion-reduce:transition-none"
      >
        <span className="flex-1">{section.title}</span>
        <span className="font-mono text-[11px] font-normal text-muted-foreground">
          {completed}/{total}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-3">
            {section.lessons.map((lesson) => (
              <LessonRow
                key={lesson.slug}
                lesson={lesson}
                current={lesson.slug === currentSlug}
                complete={isLessonComplete(lessonsRecord, lesson.slug)}
                locked={isLocked(lesson.slug)}
                bookmarked={bookmarks.includes(lesson.slug)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({ sections }: { sections: CourseSection[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const hydrated = useProgressStore((state) => state.hydrated);
  const lessonsRecord = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const lastLesson = useProgressStore((state) => state.lastLesson);
  const finishedPath = useProgressStore((state) => state.finishedPath);
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const setFinishedPath = useProgressStore((state) => state.setFinishedPath);
  const toggleLessonComplete = useProgressStore((state) => state.toggleLessonComplete);

  const currentSlug = pathname?.startsWith("/lessons/")
    ? pathname.split("/")[2] ?? null
    : null;

  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, true]))
  );
  const [toolsOpen, setToolsOpen] = React.useState(false);

  const allLessons = sections.flatMap((section) => section.lessons);
  const slugIndex = new Map(allLessons.map((lesson, index) => [lesson.slug, index]));
  const isLocked = (slug: string) => {
    const index = slugIndex.get(slug);
    return index === undefined ? false : isLessonLocked(lessonsRecord, allLessons, index);
  };
  const completed = allLessons.filter((lesson) =>
    isLessonComplete(lessonsRecord, lesson.slug)
  ).length;
  const total = allLessons.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const lastLessonMeta = lastLesson
    ? allLessons.find((lesson) => lesson.slug === lastLesson)
    : undefined;

  const handleReset = () => {
    if (window.confirm(t("resetConfirm"))) {
      resetProgress();
    }
  };

  const handleSwitchProject = () => {
    const state = useProgressStore.getState();
    if (isLessonComplete(state.lessons, "final-project")) {
      toggleLessonComplete("final-project");
    }
    if (state.finishedPath != null) {
      setFinishedPath(null);
    }
    router.push("/lessons/final-project");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-4 pt-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <Image
            src="/rocourse-icon.png"
            alt="RoCourse"
            width={32}
            height={32}
            className="h-full w-full object-contain"
          />
        </div>
        <Link href="/" className="text-sm font-bold leading-tight">
          {process.env.NEXT_PUBLIC_COURSE_NAME ?? "RoCourse"}
        </Link>
      </div>

      {lastLessonMeta && (
        <div className="px-4 pb-3">
<Link
        href={`/lessons/${lastLessonMeta.slug}`}
        className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 transition-all duration-200 hover:bg-accent/60 motion-reduce:transition-none"
      >
        <PlayCircle className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("continueLearning")}
              </div>
              <div className="truncate text-[13px] font-medium">{lastLessonMeta.title}</div>
            </div>
          </Link>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{t("overallProgress")}</span>
          <span className="font-mono font-medium">
            {hydrated ? `${completed}/${total}` : "â€“/â€“"}
          </span>
        </div>
        <Progress value={percent} />
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4 [scrollbar-gutter:stable]">
        {sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            currentSlug={currentSlug}
            lessonsRecord={lessonsRecord}
            bookmarks={bookmarks}
            isLocked={isLocked}
            open={open[section.id] ?? true}
            onToggle={() =>
              setOpen((state) => ({ ...state, [section.id]: !state[section.id] }))
            }
          />
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <button
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          aria-expanded={toolsOpen}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-accent/60 motion-reduce:transition-none lg:hidden"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              toolsOpen && "rotate-180"
            )}
          />
          {t("moreTools")}
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            toolsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            "lg:grid-rows-[1fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="max-h-[30vh] space-y-1 overflow-y-auto pr-1 pt-2 [scrollbar-gutter:stable] lg:pt-3">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/quiz/daily">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t("dailyChallenge")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/quiz">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t("quickQuiz")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/quiz/drills">
                  <Timer className="h-3.5 w-3.5" />
                  {t("drills")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/questions">
                  <MessageCircleQuestion className="h-3.5 w-3.5" />
                  {t("questions")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/playground">
                  <Terminal className="h-3.5 w-3.5" />
                  {t("playground")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/reference">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  {t("reference")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/resources">
                  <Package className="h-3.5 w-3.5" />
                  {t("resources")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full justify-start text-muted-foreground"
              >
                <Link href="/leaderboard">
                  <Zap className="h-3.5 w-3.5" />
                  {t("leaderboard")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={handleSwitchProject}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                {finishedPath
                  ? `${t("switchFinalProject")} (${finishedPath === "tycoon" ? t("finalProjectTycoon") : t("finalProjectCollector")})`
                  : t("chooseFinalProject")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("resetProgress")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
