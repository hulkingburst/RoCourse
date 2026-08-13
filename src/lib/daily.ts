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
 * Daily challenge selection, shared by the client and the grading endpoint.
 *
 * Every learner sees the same challenge on the same day (local timezone). The
 * client renders a challenge using only its id; the correct answer is never
 * part of this module's client surface. Grading happens server-side in
 * POST /api/daily-challenge, which recomputes the answer for the submitted
 * date and returns only `{ correct }` — the client can't read today's answer
 * out of the shipped bundle or the endpoint response.
 *
 * Note: quiz-bank answers still ship to the client because the quick-quiz
 * feature ships the whole bank (accepted). Debug-challenge answers now live
 * only in `daily-debug-answers.ts` (server-only).
 */
export function dailyQuestionIndex(dateKey: string): number {
  return hashDate(dateKey) % QUIZ_QUESTIONS.length;
}

/** The id of today's quiz question (for the i18n keys and grading lookup). */
export function dailyQuestionId(dateKey: string): string {
  return QUIZ_QUESTIONS[dailyQuestionIndex(dateKey)].id;
}

/** What kind of challenge today is: a quick question or a script to debug. */
export type DailyChallengeKind = "quiz" | "debug";

export function dailyChallengeKind(dateKey: string): DailyChallengeKind {
  return hashDate(dateKey) % 3 === 0 ? "debug" : "quiz";
}

/** The id of today's "find the bug" challenge. */
export function dailyDebugChallengeId(dateKey: string): string {
  return DEBUG_CHALLENGES[hashDate(dateKey) % DEBUG_CHALLENGES.length].id;
}
