import type { FinishedPath, LessonRecord } from "@/lib/progress-store";

/**
 * The serializable slice of the progress store that gets synced to the cloud.
 * Shape is shared between the client sync engine and the server API.
 */
export interface ProgressSnapshot {
  lessons: Record<string, LessonRecord>;
  bookmarks: string[];
  recentlyViewed: string[];
  lastLesson: string | null;
  finishedPath: FinishedPath | null;
  lastUpdated: string | null;
}

export interface CompletionRecord {
  courseId: string;
  title: string;
  completedAt: string;
}

export interface SyncPayload {
  progress: ProgressSnapshot;
  lastUpdated: string | null;
  completions: CompletionRecord[];
  /** When true (user explicitly chose), skip the newer-cloud conflict check. */
  force?: boolean;
}

export interface CloudState {
  hasProgress: boolean;
  progress: ProgressSnapshot | null;
  lastUpdated: string | null;
  completions: CompletionRecord[];
  account?: { name: string; email: string; createdAt: string } | null;
}

/** Cloud is considered "newer" only when it exceeds this tolerance in ms. */
export const CONFLICT_TOLERANCE_MS = 5000;
