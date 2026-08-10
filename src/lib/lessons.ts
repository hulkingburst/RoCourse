import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { courseSections } from "@content/course";
import { slugify } from "@/lib/utils";
import { countActivitySteps } from "@/lib/steps";
import type {
  CourseSection,
  Heading,
  Lesson,
  LessonFrontmatter,
  LessonMeta,
  SearchEntry,
} from "@/lib/types";

const CONTENT_DIR = path.join(process.cwd(), "content", "lessons");

const cache = new Map<string, unknown>();

function listLessonFiles(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .sort();
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const { data } = matter(raw);
  return data;
}

function normalizeMeta(data: Record<string, unknown>, fileName: string): LessonFrontmatter {
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

function readLessonFile(slug: string): { raw: string; fileName: string } | null {
  // Slugs come from the URL; keep them strictly safe so a crafted value can
  // never escape CONTENT_DIR (defense-in-depth beyond dynamicParams = false).
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const fileName = `${slug}.mdx`;
  const filePath = path.join(CONTENT_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return { raw: fs.readFileSync(filePath, "utf8"), fileName };
}

function stripFencedBlocks(source: string): string {
  return source.replace(/```[\s\S]*?```/g, "");
}

export function extractHeadings(source: string): Heading[] {
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

function toMeta(
  data: Record<string, unknown>,
  fileName: string,
  source: string
): LessonMeta {
  const base = normalizeMeta(data, fileName);
  const section = courseSections.find((s) => s.id === base.sectionId)!;
  return {
    ...base,
    sectionTitle: section.title,
    sectionOrder: section.order,
    activityCount: countActivitySteps(source),
  };
}

export function getLessonMeta(slug: string): LessonMeta | null {
  const cached = cache.get(`meta:${slug}`);
  if (cached !== undefined) return cached as LessonMeta | null;

  const file = readLessonFile(slug);
  if (!file) {
    cache.set(`meta:${slug}`, null);
    return null;
  }
  const meta = toMeta(parseFrontmatter(file.raw), file.fileName, file.raw);
  cache.set(`meta:${slug}`, meta);
  return meta;
}

export function getAllLessonMetas(): LessonMeta[] {
  const cached = cache.get("all:metas");
  if (cached) return cached as LessonMeta[];

  const metas = listLessonFiles()
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf8");
      return toMeta(parseFrontmatter(raw), fileName, raw);
    })
    .sort((a, b) =>
      a.sectionOrder === b.sectionOrder ? a.order - b.order : a.sectionOrder - b.sectionOrder
    );

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

export function getLesson(slug: string): Lesson | null {
  const cached = cache.get(`lesson:${slug}`);
  if (cached !== undefined) return cached as Lesson | null;

  const file = readLessonFile(slug);
  if (!file) {
    cache.set(`lesson:${slug}`, null);
    return null;
  }

  const { content } = matter(file.raw);
  const meta = toMeta(parseFrontmatter(file.raw), file.fileName, file.raw);
  const lesson: Lesson = {
    meta,
    content,
    headings: extractHeadings(file.raw),
  };
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

  const entries = listLessonFiles().map((fileName) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf8");
    const meta = toMeta(parseFrontmatter(raw), fileName, raw);
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
      headings: extractHeadings(raw).map((h) => h.text),
    } satisfies SearchEntry;
  });

  cache.set("all:search", entries);
  return entries;
}

export function countLessons(): number {
  return getAllLessonMetas().length;
}
