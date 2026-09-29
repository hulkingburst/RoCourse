import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { courseSections } from "@content/course";
import { slugify } from "@/lib/utils";
import { countActivitySteps } from "@/lib/steps";
import type {
  Heading,
  Lesson,
  LessonFrontmatter,
  LessonMeta,
  SearchEntry,
} from "@/lib/types";

/**
 * Reading and deriving lesson metadata straight from `content/lessons/*.mdx`.
 *
 * This module is the only place that knows how a lesson file becomes a
 * `LessonMeta`, a heading list, or a search entry. `src/lib/lessons.ts` exposes
 * the cached, runtime-facing API on top of it, and
 * `scripts/generate-content-snapshot.mjs` reuses the very same functions to
 * bake the embedded fallback — so there is exactly one parser, never two that
 * can drift apart.
 *
 * Everything here needs a real filesystem, which Cloudflare Workers does not
 * have (OpenNext serves from a read-only bundle). Callers that may run on
 * Workers must go through `lessons.ts`, which falls back to the generated
 * snapshot when these throw.
 */

/** Absolute path to the lesson files on hosts that have a filesystem. */
const CONTENT_DIR = path.join(process.cwd(), "content", "lessons");

/** Slugs come from the URL, so keep them strictly safe for path building. */
const SAFE_SLUG_RE = /^[a-z0-9-]+$/i;

interface LessonFile {
  fileName: string;
  raw: string;
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const { data } = matter(raw);
  return data;
}

function normalizeMeta(
  data: Record<string, unknown>,
  fileName: string
): LessonFrontmatter {
  const section = courseSections.find((s) => s.id === data.sectionId);
  if (!section) {
    throw new Error(
      `Lesson "${fileName}" references unknown sectionId "${String(data.sectionId)}". ` +
        `Valid sections: ${courseSections.map((s) => s.id).join(", ")}.`
    );
  }
  if (!data.slug || !data.title) {
    throw new Error(
      `Lesson "${fileName}" is missing required frontmatter fields "slug" or "title".`
    );
  }

  return {
    slug: String(data.slug),
    title: String(data.title),
    description: String(data.description ?? ""),
    sectionId: section.id,
    order: Number(data.order ?? 0),
    difficulty: (data.difficulty as LessonMeta["difficulty"]) ?? "beginner",
    estimatedMinutes: Number(data.estimatedMinutes ?? 10),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    objectives: Array.isArray(data.objectives) ? data.objectives.map(String) : [],
    prerequisites: Array.isArray(data.prerequisites)
      ? data.prerequisites.map(String)
      : [],
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
  };
}

function stripFencedBlocks(source: string): string {
  return source.replace(/```[\s\S]*?```/g, "");
}

function extractHeadings(source: string): Heading[] {
  const stripped = stripFencedBlocks(source);
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const pattern = /^(#{1,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(stripped)) !== null) {
    const level = match[1].length;
    const rawText = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*/g, "")
      .trim();
    let id = slugify(rawText) || "section";
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    headings.push({ id, text: rawText, level });
  }

  return headings;
}

function toMeta(file: LessonFile): LessonMeta {
  const base = normalizeMeta(parseFrontmatter(file.raw), file.fileName);
  const section = courseSections.find((s) => s.id === base.sectionId)!;
  return {
    ...base,
    sectionTitle: section.title,
    sectionOrder: section.order,
    activityCount: countActivitySteps(file.raw),
  };
}

/** Course order: the section's order first, then the lesson's within it. */
function byCourseOrder(a: LessonMeta, b: LessonMeta): number {
  return a.sectionOrder === b.sectionOrder
    ? a.order - b.order
    : a.sectionOrder - b.sectionOrder;
}

/** Sorted names of every lesson file on disk. Throws when unreadable. */
export function listLessonFiles(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .sort();
}

/** Every lesson file's name and raw source, in `listLessonFiles()` order. */
function readAllLessonFiles(): LessonFile[] {
  return listLessonFiles().map((fileName) => ({
    fileName,
    raw: fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf8"),
  }));
}

/** Reads one lesson file by slug, or null when the slug is unknown/unsafe. */
function readLessonFile(slug: string): LessonFile | null {
  if (!SAFE_SLUG_RE.test(slug)) return null;
  const fileName = `${slug}.mdx`;
  const filePath = path.join(CONTENT_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return { raw: fs.readFileSync(filePath, "utf8"), fileName };
}

/** One full lesson — raw MDX, derived meta, and headings — read from disk. */
export function readLesson(slug: string): Lesson | null {
  const file = readLessonFile(slug);
  if (!file) return null;
  const { content } = matter(file.raw);
  return {
    meta: toMeta(file),
    content,
    headings: extractHeadings(file.raw),
  };
}

/** Lesson metas in course order, read from disk. */
export function readLessonMetas(): LessonMeta[] {
  return readAllLessonFiles().map(toMeta).sort(byCourseOrder);
}

/** Search entries for every lesson, read from disk, in file-name order. */
export function readSearchEntries(): SearchEntry[] {
  return readAllLessonFiles().map((file) =>
    toSearchEntry(toMeta(file), extractHeadings(file.raw))
  );
}

/** The search entry for one lesson — shared by the disk and snapshot paths. */
export function toSearchEntry(meta: LessonMeta, headings: Heading[]): SearchEntry {
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    sectionId: meta.sectionId,
    sectionTitle: meta.sectionTitle,
    difficulty: meta.difficulty,
    estimatedMinutes: meta.estimatedMinutes,
    tags: meta.tags,
    keywords: meta.keywords ?? [],
    headings: headings.map((heading) => heading.text),
  };
}

/**
 * Everything the app needs to answer content questions with no filesystem:
 * every lesson's meta plus its headings, keyed by slug. Raw MDX source is
 * deliberately excluded — the only routes that render lesson bodies
 * (`/lessons/[slug]` and `/review/[slug]`) are statically generated, so the
 * bundle never has to carry ~750 KB of lesson text.
 */
export interface ContentSnapshot {
  metas: LessonMeta[];
  /**
   * Headings per lesson slug. Search re-sorts by slug to match the on-disk
   * `listLessonFiles()` (alphabetical) order, so results rank identically on
   * both hosting targets.
   */
  headings: Record<string, Heading[]>;
}

/**
 * Builds the snapshot from the lesson files on disk. Called by the snapshot
 * generator at build time; deterministic output so regenerating without a
 * content change produces a byte-identical file.
 */
export function buildContentSnapshot(): ContentSnapshot {
  const files = readAllLessonFiles();
  const headings: Record<string, Heading[]> = {};
  for (const file of files) {
    headings[String(parseFrontmatter(file.raw).slug)] = extractHeadings(file.raw);
  }

  return { metas: files.map(toMeta).sort(byCourseOrder), headings };
}
