import { evaluate } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/content/mdx-components";
import type { LessonFrontmatter } from "@/lib/types";

export interface CompiledLesson {
  content: React.ReactNode;
  frontmatter: LessonFrontmatter;
}

// Lessons are read from disk and recompiled on every request now that the
// proxy makes all routes dynamic. Memoize the expensive compile step so a
// file is only ever parsed once per server process.
const lessonCache = new Map<string, CompiledLesson>();

export async function compileLesson(source: string): Promise<CompiledLesson> {
  const cached = lessonCache.get(source);
  if (cached) {
    return cached;
  }

  const { content, frontmatter, error } = await evaluate({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });

  if (error) {
    throw error;
  }

  const compiled: CompiledLesson = {
    content,
    frontmatter: frontmatter as unknown as LessonFrontmatter,
  };
  lessonCache.set(source, compiled);
  return compiled;
}
