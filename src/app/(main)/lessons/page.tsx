import type { Metadata } from "next";
import { getCourseStructure } from "@/lib/lessons";
import { LessonList } from "@/components/home/lesson-list";

export const metadata: Metadata = {
  title: "All lessons",
  description:
    "Every lesson in the RoCourse course, organized by section.",
};

export default function LessonsPage() {
  const sections = getCourseStructure();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">All lessons</h1>
      <p className="mt-2 text-muted-foreground">
        Work through the course in order, or jump straight to a topic. Lessons
        build on each other, so following the sequence works best.
      </p>
      <div className="mt-10">
        <LessonList sections={sections} />
      </div>
    </div>
  );
}
