import { QUIZ_QUESTIONS } from "@/lib/quiz-data";
import { DEBUG_CHALLENGES } from "@/lib/daily-debug";

/** FNV-1a hash of the date key, used to pick deterministic daily content. */
function hashDate(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Picks the daily challenge question deterministically from the calendar date
 * so every learner sees the same question on the same day (local timezone).
 *
 * Accepted trade-off: the challenge is graded in the client, so a determined
 * learner can read the correct answer from the shipped bundle (it's a
 * gamification feature, not a security boundary). Moving grading server-side
 * would require an auth-less, abuse-resistant scoring endpoint; the benefit
 * doesn't justify the complexity today.
 */
export function dailyQuestionIndex(dateKey: string): number {
  return hashDate(dateKey) % QUIZ_QUESTIONS.length;
}

export function dailyQuestion(dateKey: string) {
  return QUIZ_QUESTIONS[dailyQuestionIndex(dateKey)];
}

/** What kind of challenge today is: a quick question or a script to debug. */
export type DailyChallengeKind = "quiz" | "debug";

export function dailyChallengeKind(dateKey: string): DailyChallengeKind {
  return hashDate(dateKey) % 3 === 0 ? "debug" : "quiz";
}

export function dailyDebugChallenge(dateKey: string) {
  return DEBUG_CHALLENGES[hashDate(dateKey) % DEBUG_CHALLENGES.length];
}
