import type { Metadata } from "next";
import { DailyChallengeClient } from "@/components/quiz/daily-challenge-client";

export const metadata: Metadata = {
  title: "Daily challenge",
  description:
    "One question a day. Beat it to keep your streak alive.",
};

export default function DailyChallengePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <DailyChallengeClient />
    </div>
  );
}
