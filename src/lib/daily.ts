import { QUIZ_QUESTIONS } from "@/lib/quiz-data";

/**
 * Picks the daily challenge question deterministically from the calendar date
 * so every learner sees the same question on the same day (local timezone).
 */
export function dailyQuestionIndex(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % QUIZ_QUESTIONS.length;
}

export function dailyQuestion(dateKey: string) {
  return QUIZ_QUESTIONS[dailyQuestionIndex(dateKey)];
}
