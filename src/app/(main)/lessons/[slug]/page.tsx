import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileLesson } from "@/lib/mdx";
import { getCourseStructure, getLesson, getLessonMeta, getPrevNext } from "@/lib/lessons";
import { splitLessonSource } from "@/lib/steps";
import { LessonProvider } from "@/components/lessons/lesson-provider";
import { LessonStepper } from "@/components/lessons/lesson-stepper";

export function generateStaticParams() {
  return getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({ slug: lesson.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLessonMeta(slug);
  if (!lesson) return {};
  return {
    title: lesson.title,
    description: lesson.description,
  };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const stepSources = splitLessonSource(lesson.content);
  const safeSteps =
    stepSources.length > 0
      ? stepSources
      : [{ source: lesson.content, hasActivity: false }];

  const compiledSteps = await Promise.all(
    safeSteps.map(async (step) => ({
      hasActivity: step.hasActivity,
      content: (await compileLesson(step.source)).content,
    }))
  );

  const { prev, next } = getPrevNext(slug);
  const isFirstLesson = getCourseStructure()[0]?.lessons[0]?.slug === slug;

  return (
    <LessonProvider slug={lesson.meta.slug} title={lesson.meta.title}>
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <LessonStepper
          title={lesson.meta.title}
          description={lesson.meta.description}
          stepMetas={compiledSteps.map((step) => ({ hasActivity: step.hasActivity }))}
          quizCount={lesson.meta.quizCount}
          isFirstLesson={isFirstLesson}
          prevSlug={prev?.slug ?? null}
          prevTitle={prev?.title ?? null}
          nextSlug={next?.slug ?? null}
          nextTitle={next?.title ?? null}
        >
          {compiledSteps.map((step, index) => (
            <div key={index} className="prose max-w-none">
              {step.content}
            </div>
          ))}
        </LessonStepper>
      </div>
    </LessonProvider>
  );
}
