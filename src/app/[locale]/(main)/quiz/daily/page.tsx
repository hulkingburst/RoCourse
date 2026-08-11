import type { Metadata } from "next";
import { DailyChallengeClient } from "@/components/quiz/daily-challenge-client";

export const metadata: Metadata = {
  title: "Daily Luau Challenge — One Challenge a Day",
  description:
    "A new Luau challenge every day — a quick question or a broken script to debug. Beat it to keep your streak alive.",
  alternates: { canonical: "/quiz/daily" },
};

export default function DailyChallengePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <DailyChallengeClient />
    </div>
  );
}
