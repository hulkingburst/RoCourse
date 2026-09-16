import { extractBadgeStats } from "@/lib/badges";
import { countLessons } from "@/lib/lessons";
import { prisma } from "@/lib/prisma";
import { unlockedTitleIds, type TitleContext } from "@/lib/titles";

/**
 * Gathers the trusted server-side numbers a title's eligibility is judged on:
 * the cloud-synced progress blob (lessons completed, bug-hunt challenges) plus
 * counts of the user's own contribution rows (feedback tickets, Q&A answers).
 * Never trusts anything sent by the client.
 */
export async function computeTitleContext(userId: string): Promise<TitleContext> {
  const [profile, feedbackOpened, questionAnswers] = await Promise.all([
    prisma.progressProfile.findUnique({
      where: { userId },
      select: { data: true },
    }),
    prisma.feedbackTicket.count({ where: { userId } }),
    prisma.questionAnswer.count({ where: { authorId: userId } }),
  ]);

  const stats = extractBadgeStats(profile?.data, countLessons());
  return {
    lessonsCompleted: stats.lessonsCompleted,
    challengesSolved: stats.challengesSolved,
    feedbackOpened,
    questionAnswers,
  };
}

/** Ids of the titles a user has genuinely earned, per server-side data. */
export async function getUnlockedTitleIds(userId: string): Promise<string[]> {
  return unlockedTitleIds(await computeTitleContext(userId));
}