import { courseSections } from "@content/course";
import { CONTENT_SNAPSHOT } from "@/lib/content-snapshot";
import {
  listLessonFiles,
  readLesson,
  readLessonMetas,
  readSearchEntries,
  toSearchEntry,
} from "@/lib/lesson-content";
import type { CourseSection, Lesson, LessonMeta, SearchEntry } from "@/lib/types";

/**
 * The course content API. Everything the app asks about lessons comes through
 * here, and it answers from one of two sources:
 *
 * - the lesson files on disk, which is what Vercel, `next dev` and
 *   `next start` use; or
 * - the snapshot baked into the bundle at build time, which is the only option
 *   on Cloudflare Workers (OpenNext serves a read-only bundle, so `content/`
 *   is simply not there and every disk read fails).
 *
 * The filesystem is preferred wherever it exists, so editing a lesson is picked
 * up immediately and the committed snapshot can never serve stale content.
 * See `src/lib/content-snapshot.ts`.
 *
 * All parsing lives in `src/lib/lesson-content.ts` — both sources derive from
 * the same functions, so they cannot drift apart.
 */
const cache = new Map<string, unknown>();

/**
 * Whether the lesson files are readable from this runtime. Probed once: on
 * Workers the read throws (no filesystem), and a directory that exists but
 * holds no `.mdx` files is treated the same way rather than reporting zero
 * lessons.
 */
const hasLessonFiles = detectLessonFiles();

function detectLessonFiles(): boolean {
  try {
    if (listLessonFiles().length > 0) return true;
    console.warn(
      "[lessons] no lesson files on disk; serving the content snapshot baked at build time."
    );
  } catch (error) {
    // Expected on Cloudflare, where the bundle carries no readable filesystem.
    // Logged once per isolate so an operator can tell which source is live.
    console.warn(
      "[lessons] lesson files are unreadable in this runtime; serving the " +
        "content snapshot baked at build time:",
      error instanceof Error ? error.message : error
    );
  }
  return false;
}

export function getLessonMeta(slug: string): LessonMeta | null {
  const cached = cache.get(`meta:${slug}`);
  if (cached !== undefined) return cached as LessonMeta | null;

  const meta = getAllLessonMetas().find((entry) => entry.slug === slug) ?? null;
  cache.set(`meta:${slug}`, meta);
  return meta;
}

export function getAllLessonMetas(): LessonMeta[] {
  const cached = cache.get("all:metas");
  if (cached) return cached as LessonMeta[];

  const metas = hasLessonFiles ? readLessonMetas() : CONTENT_SNAPSHOT.metas;
  cache.set("all:metas", metas);
  return metas;
}

export function getCourseStructure(): CourseSection[] {
  const cached = cache.get("all:structure");
  if (cached) return cached as CourseSection[];

  const metas = getAllLessonMetas();
  const structure = courseSections
    .map((section) => ({
      ...section,
      lessons: metas
        .filter((meta) => meta.sectionId === section.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((section) => section.lessons.length > 0);

  cache.set("all:structure", structure);
  return structure;
}

/**
 * One lesson's raw MDX, meta, and headings. Only statically generated routes
 * may call this: it needs the lesson source, which the Cloudflare bundle does
 * not carry (see the `ContentSnapshot` note on why raw MDX is excluded).
 */
export function getLesson(slug: string): Lesson | null {
  if (!hasLessonFiles) {
    throw new Error(
      `Lesson source for "${slug}" is unavailable: this runtime has no lesson ` +
        `files (Cloudflare serves a read-only bundle). Routes that render lesson ` +
        `bodies must be statically generated — see src/lib/content-snapshot.ts.`
    );
  }

  const cached = cache.get(`lesson:${slug}`);
  if (cached !== undefined) return cached as Lesson | null;

  const lesson = readLesson(slug);
  cache.set(`lesson:${slug}`, lesson);
  return lesson;
}

export function getPrevNext(
  slug: string
): { prev: LessonMeta | null; next: LessonMeta | null } {
  const all = getAllLessonMetas();
  const index = all.findIndex((meta) => meta.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  };
}

export function getSearchIndex(): SearchEntry[] {
  const cached = cache.get("all:search");
  if (cached) return cached as SearchEntry[];

  // The disk path yields entries in file-name order; the snapshot path sorts by
  // slug to match (a lesson's file is always `<slug>.mdx`), so search ranks
  // results identically on both hosting targets.
  const entries = hasLessonFiles
    ? readSearchEntries()
    : [...CONTENT_SNAPSHOT.metas]
        .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
        .map((meta) => toSearchEntry(meta, CONTENT_SNAPSHOT.headings[meta.slug] ?? []));

  cache.set("all:search", entries);
  return entries;
}

export function countLessons(): number {
  return getAllLessonMetas().length;
}
