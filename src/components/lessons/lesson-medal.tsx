"use client";

import { Medal } from "lucide-react";
import { useProgressStore } from "@/lib/progress-store";
import { lessonMedal, medalLabel, type LessonMedal } from "@/lib/medal";
import { cn } from "@/lib/utils";

const MEDAL_COLOR: Record<LessonMedal, string> = {
  gold: "text-amber-500",
  silver: "text-slate-400",
  bronze: "text-orange-700",
};

interface LessonMedalProps {
  slug: string;
  activityCount: number;
  className?: string;
}

/**
 * Small medal badge for a lesson: gold/silver/bronze based on how many of the
 * lesson's graded activity steps were solved on the first attempt. Reads the
 * progress store by lesson slug, so it can live in server-rendered layouts.
 */
export function LessonMedalBadge({ slug, activityCount, className }: LessonMedalProps) {
  const record = useProgressStore((state) => state.lessons[slug]);
  const firstTry = record?.firstTrySolvedSteps?.length ?? 0;
  const { medal, correct, total } = lessonMedal(firstTry, activityCount);
  if (!medal) return null;

  return (
    <span
      title={`${medalLabel(medal)} medal — ${Math.min(correct, total)} of ${total} activities on the first try`}
      className={cn("inline-flex items-center", className)}
    >
      <Medal className={cn("h-4 w-4", MEDAL_COLOR[medal])} />
    </span>
  );
}
