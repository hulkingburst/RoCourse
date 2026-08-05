import { evaluate } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/content/mdx-components";
import type { LessonFrontmatter } from "@/lib/types";

export interface CompiledLesson {
  content: React.ReactNode;
  frontmatter: LessonFrontmatter;
}

export async function compileLesson(source: string): Promise<CompiledLesson> {
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

  return { content, frontmatter: frontmatter as unknown as LessonFrontmatter };
}
