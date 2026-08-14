import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly XP Leaderboard",
  description: "Who earned the most XP on RoCourse this week.",
  alternates: { canonical: "/leaderboard" },
};

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard");
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>
      </div>
      <LeaderboardClient />
    </div>
  );
}
