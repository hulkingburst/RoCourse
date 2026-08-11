import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseStructure } from "@/lib/lessons";
import { getQuestionDetail } from "@/lib/questions";
import { QuestionDetailView } from "@/components/questions/question-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = await getQuestionDetail(id);
  if (!question) {
    return { title: "Question not found" };
  }
  return {
    title: `${question.title} — RoCourse Questions`,
    description: `${question.body.slice(0, 150)}…`,
  };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestionDetail(id);
  if (!question) notFound();

  const lessonTitle = question.lessonSlug
    ? getCourseStructure()
        .flatMap((section) => section.lessons)
        .find((lesson) => lesson.slug === question.lessonSlug)?.title
    : undefined;

  return <QuestionDetailView initialQuestion={question} lessonTitle={lessonTitle} />;
}
