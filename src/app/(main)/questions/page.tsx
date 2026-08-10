import type { Metadata } from "next";
import { getCourseStructure } from "@/lib/lessons";
import { listQuestions } from "@/lib/questions";
import { QuestionsClient } from "@/components/questions/questions-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questions — Get Help Learning Luau & Roblox",
  description:
    "Ask questions about Luau, Roblox Studio, activities, and your final project. The RoCourse community is here to help.",
  alternates: { canonical: "/questions" },
};

export default async function QuestionsPage() {
  const lessons = getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({ slug: lesson.slug, title: lesson.title }));

  const [questions] = await Promise.all([
    listQuestions({ limit: 100 }),
    Promise.resolve(lessons),
  ]);

  return <QuestionsClient initialQuestions={questions} lessons={lessons} />;
}
