import type { CompletionRecord, ProgressSnapshot } from "@/lib/sync-types";

/**
 * The capstone lesson whose completion is the evidence a course was finished.
 * A completion record exists only when this lesson carries a completion date in
 * the progress blob, so nothing downstream can treat a learner as complete
 * without it.
 */
export const CAPSTONE_LESSON_SLUG = "final-project";

/** Slack allowed on a claimed completion date before it is clamped to now. */
const CLOCK_SLACK_MS = 24 * 60 * 60 * 1000;

/**
 * Derives the courses a learner has finished from their progress. Today that is
 * the single capstone lesson, named by the chosen project path. This is the
 * seam where future courses (clicker, tycoon, collector, obby, zombie survival)
 * plug in.
 *
 * Pure and client-safe (no database or filesystem access) so the progress
 * export, the cloud sync, and the server-side sync API all derive completions
 * the same way instead of three implementations drifting apart.
 */
export function getCompletions(snapshot: ProgressSnapshot): CompletionRecord[] {
  const record = snapshot.lessons[CAPSTONE_LESSON_SLUG];
  if (!record?.completedAt) return [];

  const base = { completedAt: record.completedAt };
  if (snapshot.finishedPath === "tycoon") {
    return [{ courseId: "rocourse-coin-tycoon", title: "Coin Tycoon", ...base }];
  }
  if (snapshot.finishedPath === "collector") {
    return [{ courseId: "rocourse-collector", title: "The Collector", ...base }];
  }
  return [{ courseId: "rocourse", title: "RoCourse", ...base }];
}

/**
 * The server's view of the same derivation: identical evidence, but the
 * completion date is bounded so a claimed timestamp can never be a future or
 * malformed value. The database only ever stores what this returns, which is
 * what makes a stored record reproducible from the blob on every sync.
 */
export function getVerifiedCompletions(
  snapshot: ProgressSnapshot,
  now: Date = new Date()
): CompletionRecord[] {
  return getCompletions(snapshot).map((completion) => ({
    ...completion,
    completedAt: boundCompletedAt(completion.completedAt, now),
  }));
}

/** Clamps a claimed completion date to a real, past timestamp. */
function boundCompletedAt(value: string, now: Date): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime() + CLOCK_SLACK_MS) {
    return now.toISOString();
  }
  return parsed.toISOString();
}
