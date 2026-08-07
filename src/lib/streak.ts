/**
 * Day-streak helpers shared across the progress store, header, and profile.
 *
 * A streak counts the learner's local calendar days (YYYY-MM-DD) on which they
 * did a qualifying action: completing a lesson or beating a quick quiz.
 * Consecutive days extend the streak; a missed day resets it to 1 on the next
 * action. Doing multiple qualifying actions in one day only counts once.
 */

export interface StreakState {
  /** Current consecutive-day streak. */
  streak: number;
  /** Longest streak ever recorded. */
  longestStreak: number;
  /** Local calendar day (YYYY-MM-DD) of the last streak-building action. */
  lastStreakDate: string | null;
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Day-key of a calendar day offset from `date` (handles month/year/DST edges). */
function shiftedKey(date: Date, offset: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + offset);
  return dayKey(copy);
}

/**
 * True when the streak is still alive: either something was done today, or the
 * streak can still be saved by acting today (last action was yesterday).
 */
export function isStreakActive(lastStreakDate: string | null): boolean {
  if (!lastStreakDate) return false;
  const now = new Date();
  return lastStreakDate === dayKey(now) || lastStreakDate === shiftedKey(now, -1);
}

/**
 * Applies the streak rules after a qualifying action. Returns the updated
 * streak fields; the current values are returned unchanged when the action is
 * a second qualifying action on the same day.
 */
export function streakAfterAction(state: StreakState): StreakState {
  const today = dayKey(new Date());
  if (state.lastStreakDate === today) {
    return {
      streak: state.streak,
      longestStreak: state.longestStreak,
      lastStreakDate: today,
    };
  }
  const streak =
    state.lastStreakDate === shiftedKey(new Date(), -1)
      ? state.streak + 1
      : 1;
  return {
    streak,
    longestStreak: Math.max(state.longestStreak, streak),
    lastStreakDate: today,
  };
}
