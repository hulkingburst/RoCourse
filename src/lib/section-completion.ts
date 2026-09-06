import type { LessonRecord } from "@/lib/progress-store";

/**
 * Figures out the latest completion timestamp for a set of lesson slugs from a
 * progress blob. A section counts as complete only when every one of its
 * lessons has a completion date; the section's date is the latest of them.
 *
 * Pure and client-safe (no filesystem or database access) so both the server
 * certificate logic and the client profile UI can share it.
 */
export function computeSectionCompletion(
  slugs: readonly string[],
  lessons: Record<string, LessonRecord> | null | undefined
): string | null {
  if (!lessons || slugs.length === 0) return null;
  let latest: string | null = null;
  for (const slug of slugs) {
    const record = lessons[slug];
    if (!record || !record.completedAt) return null;
    if (latest === null || record.completedAt > latest) {
      latest = record.completedAt;
    }
  }
  return latest;
}

export interface CompletedSection {
  sectionId: string;
  title: string;
  completedAt: string;
}

export interface SectionSlugList {
  id: string;
  title: string;
  slugs: readonly string[];
}

/** Returns the sections whose lessons are all complete, in course order. */
export function collectCompletedSections(
  sections: readonly SectionSlugList[],
  lessons: Record<string, LessonRecord> | null | undefined
): CompletedSection[] {
  const completed: CompletedSection[] = [];
  for (const section of sections) {
    const completedAt = computeSectionCompletion(section.slugs, lessons);
    if (completedAt !== null) {
      completed.push({
        sectionId: section.id,
        title: section.title,
        completedAt,
      });
    }
  }
  return completed;
}