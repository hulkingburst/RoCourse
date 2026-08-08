import type { Metadata } from "next";
import { DailyChallengeClient } from "@/components/quiz/daily-challenge-client";

export const metadata: Metadata = {
  title: "Daily Luau Quiz — One Question a Day",
  description: "A new Luau question every day. Beat it to keep your streak alive.",
};

export default function DailyChallengePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <DailyChallengeClient />
    </div>
  );
}
