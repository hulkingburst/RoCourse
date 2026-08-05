import Link from "next/link";
import { ChevronRight, Clock, Target } from "lucide-react";
import type { LessonMeta } from "@/lib/types";
import { DifficultyBadge } from "@/components/lessons/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { LessonActions } from "@/components/lessons/lesson-actions";

export function LessonHeader({ lesson }: { lesson: LessonMeta }) {
  return (
    <header className="mb-10">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href={`/lessons#${lesson.sectionId}`}
          className="transition-colors hover:text-foreground"
        >
          {lesson.sectionTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{lesson.title}</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {lesson.title}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{lesson.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={lesson.difficulty} />
        <Badge variant="muted">
          <Clock className="h-3 w-3" />
          {lesson.estimatedMinutes} min
        </Badge>
        {lesson.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-muted-foreground">
            {tag}
          </Badge>
        ))}
        <div className="ml-auto">
          <LessonActions slugOverride={lesson.slug} />
        </div>
      </div>

      {lesson.objectives.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            What you&apos;ll understand by the end
          </div>
          <ul className="space-y-1.5">
            {lesson.objectives.map((objective) => (
              <li
                key={objective}
                className="flex items-start gap-2.5 text-[15px] text-muted-foreground"
              >
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {objective}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
