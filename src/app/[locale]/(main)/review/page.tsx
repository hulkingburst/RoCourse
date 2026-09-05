import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllLessonMetas } from "@/lib/lessons";
import { ReviewIndexClient } from "@/components/review/review-index-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function ReviewPage() {
  const lessonTitles = Object.fromEntries(
    getAllLessonMetas().map((meta) => [meta.slug, meta.title])
  );
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <ReviewIndexClient lessonTitles={lessonTitles} />
    </div>
  );
}