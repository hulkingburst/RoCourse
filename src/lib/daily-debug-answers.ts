/**
 * Server-only answers for the daily "find the bug" challenges.
 *
 * Kept out of the client bundle on purpose: the daily challenge is graded by
 * POST /api/daily-challenge, and the answer must not be readable in the
 * shipped JS. Keys mirror the `id` fields in `DEBUG_CHALLENGES`
 * (src/lib/daily-debug.ts). If you add a challenge there, add its answer here
 * too — `getDebugAnswer` throws when an id is missing so drift fails loudly
 * instead of silently.
 *
 * Never import this module from a "use client" file or any file the client
 * bundle reaches.
 */
const DEBUG_CHALLENGE_ANSWERS: Record<string, number> = {
  "debug-nil-part": 1,
  "debug-arithmetic-nil": 0,
  "debug-call-nil": 2,
  "debug-undefined-global": 1,
  "debug-missing-end": 0,
  "debug-string-concat": 0,
  "debug-zero-index": 0,
  "debug-localplayer": 0,
  "debug-character-nil": 0,
  "debug-infinite-loop": 0,
  "debug-touch-event": 0,
  "debug-property-typo": 0,
};

export function getDebugAnswer(id: string): number {
  const answer = DEBUG_CHALLENGE_ANSWERS[id];
  if (answer === undefined) {
    throw new Error(`No answer registered for daily debug challenge "${id}".`);
  }
  return answer;
}
