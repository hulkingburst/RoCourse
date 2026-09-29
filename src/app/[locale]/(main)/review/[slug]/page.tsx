import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileLesson } from "@/lib/mdx";
import { getCourseStructure, getLesson, getLessonMeta } from "@/lib/lessons";
import { splitLessonSource } from "@/lib/steps";
import { LessonProvider } from "@/components/lessons/lesson-provider";
import { ReviewLesson } from "@/components/review/review-lesson";
import { routing } from "@/i18n/routing";

/**
 * Pre-rendered like `/lessons/[slug]`: the page renders a lesson's steps and
 * the client picks out the missed ones from local progress, so there is nothing
 * per-request about it. Staying static is also what keeps the Cloudflare build
 * working — reading lesson source at request time is impossible there (see
 * `src/lib/content-snapshot.ts`).
 */
export function generateStaticParams() {
  return getCourseStructure()
    .flatMap((section) => section.lessons)
    .flatMap((lesson) =>
      routing.locales.map((locale) => ({ locale, slug: lesson.slug }))
    );
}

export const dynamicParams = false;

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