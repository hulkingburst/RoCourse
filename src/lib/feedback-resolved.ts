import { prisma } from "@/lib/prisma";

/**
 * Number of feedback tickets a user has submitted that were later resolved —
 * the GitHub issue was closed, whether or not the owner left a closing
 * comment. Server-sourced badge input for `successful-feedback`.
 */
export async function getFeedbackResolvedCount(userId: string): Promise<number> {
  return prisma.feedbackTicket.count({ where: { userId, state: "closed" } });
}
