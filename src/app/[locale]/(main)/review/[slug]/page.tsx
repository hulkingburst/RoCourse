import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileLesson } from "@/lib/mdx";
import { getLesson, getLessonMeta } from "@/lib/lessons";
import { splitLessonSource } from "@/lib/steps";
import { LessonProvider } from "@/components/lessons/lesson-provider";
import { ReviewLesson } from "@/components/review/review-lesson";

type ReviewLessonParams = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: ReviewLessonParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLessonMeta(slug);
  if (!lesson) return {};
  return {
    title: `Review — ${lesson.title}`,
    description: lesson.description,
  };
}

export default async function ReviewLessonPage({
  params,
}: {
  params: ReviewLessonParams;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const stepSources = splitLessonSource(lesson.content);
  const safeSteps =
    stepSources.length > 0
      ? stepSources
      : [{ source: lesson.content, hasActivity: false }];

  const compiledSteps = (
    await Promise.all(
      safeSteps.map(async (step) => (await compileLesson(step.source)).content)
    )
  ).map((content, index) => (
    <div key={index} className="prose max-w-none">
      {content}
    </div>
  ));

  return (
    <LessonProvider slug={lesson.meta.slug} title={lesson.meta.title}>
      <ReviewLesson title={lesson.meta.title}>{compiledSteps}</ReviewLesson>
    </LessonProvider>
  );
}