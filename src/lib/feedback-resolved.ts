import { prisma } from "@/lib/prisma";

/**
 * Number of feedback tickets a user has submitted that the repository owner
 * later resolved (GitHub issue closed with a real author comment — a bug
 * fixed or an idea added). Server-sourced badge input.
 */
export async function getFeedbackResolvedCount(userId: string): Promise<number> {
  return prisma.feedbackTicket.count({ where: { userId, state: "closed" } });
}
