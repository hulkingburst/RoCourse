import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuizClient } from "@/components/quiz/quiz-client";
import { QUIZ_QUESTIONS, QUIZ_SIZE } from "@/lib/quiz-data";

export const metadata: Metadata = {
  title: "Roblox Luau Quiz — Test Your Skills",
  description:
    "Test your Luau and Roblox knowledge with a quick multiple-choice quiz.",
  alternates: { canonical: "/quiz" },
};

export default async function QuizPage() {
  const t = await getTranslations("quiz");
  const quizSize = Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length);
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("pageIntro", { size: quizSize, bank: QUIZ_QUESTIONS.length })}
      </p>
      <div className="mt-8">
        <QuizClient />
      </div>
    </div>
  );
}
