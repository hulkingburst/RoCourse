import type { Metadata } from "next";
import { QuizClient } from "@/components/quiz/quiz-client";
import { QUIZ_QUESTIONS, QUIZ_SIZE } from "@/lib/quiz-data";

export const metadata: Metadata = {
  title: "Quick quiz",
  description:
    "Test your Luau and Roblox knowledge with a quick multiple-choice quiz.",
};

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Quick quiz</h1>
      <p className="mt-2 text-muted-foreground">
        A fast way to test your Luau and Roblox knowledge. Each quiz draws{" "}
        {Math.min(QUIZ_SIZE, QUIZ_QUESTIONS.length)} random questions from a
        bank of {QUIZ_QUESTIONS.length}, and every finished quiz counts toward
        your profile.
      </p>
      <div className="mt-8">
        <QuizClient />
      </div>
    </div>
  );
}
