/**
 * XP + level helpers shared by the progress store, sync engine, and UI.
 *
 * Levels are derived purely from lifetime XP. Reaching level L requires
 * 100 * (1 + 2 + ... + (L - 1)) cumulative XP (level 1 at 0 XP), so the
 * amount needed to advance grows linearly with level.
 */

/** XP for completing a lesson the first time. */
export const XP_LESSON = 30;
/** XP per correct answer in an in-lesson quiz. */
export const XP_QUIZ_CORRECT = 5;
/** XP for finishing a standalone quick quiz. */
export const XP_QUICK_QUIZ = 15;
/** XP for getting the daily challenge right (once per day). */
export const XP_DAILY_CHALLENGE = 20;
/** XP for solving an activity step on the first pick (once per step). */
export const XP_ACTIVITY_FIRST_TRY = 10;
/** XP for solving a debug challenge. */
export const XP_CHALLENGE = 5;
/** XP for finishing one 60-second drill. */
export const XP_DRILL = 10;

/** Hard server-side ceiling on claimed weekly XP (per user or guest). */
export const MAX_WEEKLY_XP = 5000;

/** Number of week keys kept in the progress blob to bound its size. */
export const MAX_WEEKLY_XP_ENTRIES = 26;

/** Cumulative XP required to reach `level` (1-indexed). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 50 * n * (n - 1);
}

/** The level a learner is at after accumulating `xp` total XP. */
export function levelFromXp(xp: number): number {
  const value = Math.max(0, Math.floor(xp));
  return Math.floor((1 + Math.sqrt(1 + (4 * value) / 50)) / 2);
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  /** 0..1 fraction of the way from this level to the next. */
  progress: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const xpForNextLevel = xpForLevel(level + 1) - base;
  const xpIntoLevel = Math.max(0, Math.floor(xp) - base);
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1,
  };
}

/**
 * Local calendar week key: the Monday (YYYY-MM-DD) of the week containing
 * `date`. Used as the leaderboard's weekly bucket, consistent with the
 * local-time philosophy of the streak helpers.
 */
export function weekKey(date: Date): string {
  const copy = new Date(date);
  const dayOfWeek = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - dayOfWeek);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, "0");
  const d = String(copy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `key` is a Monday calendar date like 2026-08-10. */
export function isValidWeekKey(key: string): boolean {
  if (!WEEK_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d &&
    date.getUTCDay() === 1
  );
}

/**
 * Bounds a week-keyed XP map: valid Monday keys, non-negative ints capped at
 * MAX_WEEKLY_XP, newest entries kept. Used both client-side (storage hygiene)
 * and server-side (untrusted payloads).
 */
export function sanitizeWeeklyXp(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries: [string, number][] = [];
  for (const [key, count] of Object.entries(value)) {
    if (!isValidWeekKey(key)) continue;
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
      continue;
    }
    entries.push([key, Math.min(MAX_WEEKLY_XP, Math.floor(count))]);
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return Object.fromEntries(entries.slice(-MAX_WEEKLY_XP_ENTRIES));
}
