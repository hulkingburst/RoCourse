import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const THEMES = ["github-dark"] as const;
const LANGS = [
  "luau",
  "lua",
  "typescript",
  "javascript",
  "tsx",
  "json",
  "css",
  "html",
  "bash",
  "diff",
  "markdown",
  "mdx",
] as const;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...THEMES],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  language: string,
  theme: string = "github-dark"
): Promise<string> {
  const highlighter = await getHighlighter();
  const loaded = highlighter.getLoadedLanguages();
  const lang = (loaded as readonly string[]).includes(language)
    ? language
    : language === "luau"
      ? "lua"
      : "text";
  try {
    return highlighter.codeToHtml(code, { lang: lang as never, theme: theme as never });
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
